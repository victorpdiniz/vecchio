import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { MultipartFile } from '@fastify/multipart';
import { AppError, NotFoundError } from '../../lib/errors.js';
import { UPLOADS_DIR, sanitizeFilename } from '../../lib/paths.js';
import { computeOccurrenceDates } from '../../lib/recurrence.js';
import { agendaRepository } from './agenda.repository.js';
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

async function removeAttachmentFile(storagePath: string) {
  await fs.rm(path.join(UPLOADS_DIR, storagePath), { force: true });
}

export const agendaService = {
  list(profileId: string | null, from: Date, to: Date) {
    return agendaRepository.findManyInRange(from, to, profileId);
  },

  async getRawById(id: string) {
    const item = await agendaRepository.findById(id);
    if (!item) {
      throw new NotFoundError('Compromisso não encontrado.');
    }
    return item;
  },

  async getById(id: string, profileId: string | null) {
    const item = await this.getRawById(id);
    if (item.isPrivate && item.ownerProfileId !== profileId) {
      throw new NotFoundError('Compromisso não encontrado.');
    }
    return item;
  },

  async create(input: CreateAgendaItemInput, actorProfileId: string | null) {
    const actor = await requireActor(actorProfileId);
    if (input.isPrivate && actor.role !== 'admin') {
      throw new AppError('Só o admin pode criar compromissos privados.', 403);
    }

    const occurrenceDates = input.recurrence
      ? computeOccurrenceDates(input.startAt, input.recurrence.rule, input.recurrence.endDate ?? null)
      : [input.startAt];

    const durationMs = input.endAt ? input.endAt.getTime() - input.startAt.getTime() : null;
    const recurrenceGroupId = input.recurrence ? randomUUID() : null;
    const ownerProfileId = input.isPrivate ? actor.id : null;
    const defaultReminder = input.category === 'consulta' ? 3 : null;

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

      let created = await agendaRepository.create({
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        location: input.location ?? null,
        startAt: occurrenceStart,
        endAt: occurrenceEnd,
        ownerProfileId,
        isPrivate: input.isPrivate ?? false,
        reminderDaysBefore: input.reminderDaysBefore ?? defaultReminder,
        billId,
        recurrenceRule: input.recurrence?.rule ?? null,
        recurrenceGroupId,
        recurrenceEndDate: input.recurrence?.endDate ?? null,
      });

      if (!created.isPrivate) {
        const googleEventId = await googleCalendarService.createEvent(created);
        if (googleEventId) {
          created = await agendaRepository.update(created.id, { googleEventId });
        }
      }

      createdItems.push(created);
    }

    return createdItems;
  },

  async update(id: string, input: UpdateAgendaItemInput, actorProfileId: string | null) {
    const existing = await this.getRawById(id);
    const actor = actorProfileId ? await profilesRepository.findById(actorProfileId) : null;

    if ((existing.isPrivate || input.isPrivate) && actor?.role !== 'admin') {
      throw new AppError('Só o admin pode editar compromissos privados.', 403);
    }

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
          createdById: actor?.id ?? existing.ownerProfileId ?? '',
        });
        billId = bill.id;
      }
    } else if (billId) {
      await detachOrDeleteBill(billId);
      billId = null;
    }

    const ownerProfileId = input.isPrivate ? (actor?.id ?? existing.ownerProfileId) : null;

    let updated = await agendaRepository.update(id, {
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      location: input.location ?? null,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      isPrivate: input.isPrivate ?? false,
      reminderDaysBefore: input.reminderDaysBefore ?? null,
      ownerProfileId,
      billId,
    });

    if (updated.isPrivate) {
      if (updated.googleEventId) {
        await googleCalendarService.deleteEvent(updated.googleEventId);
        updated = await agendaRepository.update(id, { googleEventId: null });
      }
    } else if (updated.googleEventId) {
      await googleCalendarService.updateEvent(updated);
    } else {
      const googleEventId = await googleCalendarService.createEvent(updated);
      if (googleEventId) {
        updated = await agendaRepository.update(id, { googleEventId });
      }
    }

    return updated;
  },

  async deleteItem(id: string, actorProfileId: string | null) {
    const existing = await this.getRawById(id);
    const actor = actorProfileId ? await profilesRepository.findById(actorProfileId) : null;

    if (existing.isPrivate && actor?.role !== 'admin') {
      throw new AppError('Só o admin pode remover compromissos privados.', 403);
    }

    for (const attachment of existing.attachments) {
      await removeAttachmentFile(attachment.storagePath);
    }

    if (existing.googleEventId) {
      await googleCalendarService.deleteEvent(existing.googleEventId);
    }

    await agendaRepository.delete(id);

    if (existing.billId) {
      await detachOrDeleteBill(existing.billId);
    }
  },

  async deleteSeries(recurrenceGroupId: string, actorProfileId: string | null) {
    const items = await agendaRepository.findFutureBySeries(recurrenceGroupId, new Date());
    for (const item of items) {
      await this.deleteItem(item.id, actorProfileId);
    }
    return { deleted: items.length };
  },

  async addAttachment(agendaItemId: string, file: MultipartFile, actorProfileId: string | null) {
    if (!actorProfileId) {
      throw new AppError('Selecione um perfil antes de enviar um anexo.', 400);
    }
    await this.getRawById(agendaItemId);

    const buffer = await file.toBuffer();
    const relativePath = path.join('agenda', `${Date.now()}-${sanitizeFilename(file.filename)}`);
    const fullPath = path.join(UPLOADS_DIR, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    return agendaRepository.createAttachment({
      agendaItemId,
      filename: file.filename,
      storagePath: relativePath,
      uploadedById: actorProfileId,
    });
  },

  async removeAttachment(attachmentId: string) {
    const attachment = await agendaRepository.findAttachment(attachmentId);
    if (!attachment) {
      throw new NotFoundError('Anexo não encontrado.');
    }
    await removeAttachmentFile(attachment.storagePath);
    await agendaRepository.deleteAttachment(attachmentId);
  },

  async summary(from: Date, to: Date) {
    const result = await billsRepository.sumInRange(from, to);
    return { total: result._sum.amount ?? 0, count: result._count };
  },
};
