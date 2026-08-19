import { randomUUID } from 'node:crypto';
import { AppError, NotFoundError } from '../../lib/errors.js';
import { computeOccurrenceDates } from '../../lib/recurrence.js';
import { agendaRepository } from './agenda.repository.js';
import { computeReminder } from './reminders.js';
import { billsRepository } from '../bills/bills.repository.js';
import { profilesRepository } from '../profiles/profiles.repository.js';
import { googleCalendarService } from '../google-calendar/google-calendar.service.js';
import type { CreateAgendaItemInput, UpdateAgendaItemInput } from './agenda.schema.js';

async function requireActor(actorProfileId: string | null) {
  if (!actorProfileId) {
    throw new AppError('Selecione um perfil antes de continuar.', 400);
  }
  const actor = await profilesRepository.findById(actorProfileId);
  if (!actor) {
    throw new AppError('Perfil inválido.', 400);
  }
  return actor;
}

// Se a conta ainda não foi paga, remover o compromisso remove a própria
// conta (nunca chegou a existir de fato); se já foi paga, o registro
// financeiro é preservado como histórico, só perde o vínculo com a agenda.
async function detachOrDeleteBill(billId: string) {
  const bill = await billsRepository.findById(billId);
  if (bill && bill.status === 'pendente') {
    await billsRepository.deleteById(billId);
  }
}

export const agendaService = {
  list(from: Date, to: Date) {
    return agendaRepository.findManyInRange(from, to);
  },

  listByIds(ids: string[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return agendaRepository.findManyByIds(ids);
  },

  async getById(id: string) {
    const item = await agendaRepository.findById(id);
    if (!item) {
      throw new NotFoundError('Compromisso não encontrado.');
    }
    return item;
  },

  async create(input: CreateAgendaItemInput, actorProfileId: string | null) {
    const actor = await requireActor(actorProfileId);

    const occurrenceDates = input.recurrence
      ? computeOccurrenceDates(input.startAt, input.recurrence.rule, null)
      : [input.startAt];

    const durationMs = input.endAt ? input.endAt.getTime() - input.startAt.getTime() : null;
    const recurrenceGroupId = input.recurrence ? randomUUID() : null;

    const createdItems = [];
    for (const occurrenceStart of occurrenceDates) {
      const occurrenceEnd = durationMs !== null ? new Date(occurrenceStart.getTime() + durationMs) : null;

      let billId: string | null = null;
      if (input.category === 'conta') {
        const bill = await billsRepository.create({
          description: input.title,
          amount: input.amount!,
          dueDate: occurrenceStart,
          category: input.category,
          isRecurring: Boolean(input.recurrence),
          recurrenceRule: input.recurrence?.rule ?? null,
          createdById: actor.id,
        });
        billId = bill.id;
      }

      const created = await agendaRepository.create({
        title: input.title,
        category: input.category,
        isAllDay: input.isAllDay,
        startAt: occurrenceStart,
        endAt: occurrenceEnd,
        billId,
        recurrenceRule: input.recurrence?.rule ?? null,
        recurrenceGroupId,
      });

      await agendaRepository.replaceReminders(
        created.id,
        input.reminders.map((spec) => computeReminder(spec, occurrenceStart)),
      );

      const googleEventId = await googleCalendarService.createEvent(created);
      if (googleEventId) {
        await agendaRepository.update(created.id, { googleEventId });
      }

      createdItems.push((await agendaRepository.findById(created.id))!);
    }

    return createdItems;
  },

  async update(id: string, input: UpdateAgendaItemInput, actorProfileId: string | null) {
    const existing = await this.getById(id);
    const actor = actorProfileId ? await profilesRepository.findById(actorProfileId) : null;

    let billId: string | null = existing.billId;
    if (input.category === 'conta') {
      if (billId) {
        await billsRepository.update(billId, {
          description: input.title,
          amount: input.amount!,
          dueDate: input.startAt,
          category: input.category,
        });
      } else {
        const bill = await billsRepository.create({
          description: input.title,
          amount: input.amount!,
          dueDate: input.startAt,
          category: input.category,
          isRecurring: Boolean(existing.recurrenceRule),
          recurrenceRule: existing.recurrenceRule,
          createdById: actor?.id ?? '',
        });
        billId = bill.id;
      }
    } else if (billId) {
      await detachOrDeleteBill(billId);
      billId = null;
    }

    let updated = await agendaRepository.update(id, {
      title: input.title,
      category: input.category,
      isAllDay: input.isAllDay,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      billId,
    });

    await agendaRepository.replaceReminders(
      id,
      input.reminders.map((spec) => computeReminder(spec, input.startAt)),
    );

    if (updated.googleEventId) {
      await googleCalendarService.updateEvent(updated);
    } else {
      const googleEventId = await googleCalendarService.createEvent(updated);
      if (googleEventId) {
        updated = await agendaRepository.update(id, { googleEventId });
      }
    }

    return (await agendaRepository.findById(id))!;
  },

  async deleteItem(id: string) {
    const existing = await this.getById(id);

    if (existing.googleEventId) {
      await googleCalendarService.deleteEvent(existing.googleEventId);
    }

    await agendaRepository.delete(id);

    if (existing.billId) {
      await detachOrDeleteBill(existing.billId);
    }
  },

  async deleteSeries(recurrenceGroupId: string) {
    const items = await agendaRepository.findFutureBySeries(recurrenceGroupId, new Date());
    for (const item of items) {
      await this.deleteItem(item.id);
    }
    return { deleted: items.length };
  },

  async summary(from: Date, to: Date) {
    const result = await billsRepository.sumInRange(from, to);
    return { total: result._sum.amount ?? 0, count: result._count };
  },
};
