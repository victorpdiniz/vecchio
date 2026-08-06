import path from 'node:path';
import fs from 'node:fs/promises';
import type { MultipartFile } from '@fastify/multipart';
import { AppError, NotFoundError } from '../../lib/errors.js';
import { UPLOADS_DIR, sanitizeFilename } from '../../lib/paths.js';
import { computeOccurrenceDates } from '../../lib/recurrence.js';
import { billsRepository } from './bills.repository.js';
import { agendaRepository } from '../agenda/agenda.repository.js';
import { profilesRepository } from '../profiles/profiles.repository.js';
import { googleCalendarService } from '../google-calendar/google-calendar.service.js';
import type { BillsQuery, CreateBillInput, UpdateBillInput } from './bills.schema.js';

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

async function removeAttachmentFile(storagePath: string) {
  await fs.rm(path.join(UPLOADS_DIR, storagePath), { force: true });
}

export const billsService = {
  list(filters: BillsQuery) {
    return billsRepository.findMany(filters);
  },

  async getById(id: string) {
    const bill = await billsRepository.findByIdWithRelations(id);
    if (!bill) {
      throw new NotFoundError('Conta não encontrada.');
    }
    return bill;
  },

  // Toda conta criada aqui ganha um compromisso espelhado na agenda (categoria
  // "conta", compartilhado), simétrico ao que o módulo de Agenda já faz ao
  // criar um compromisso dessa categoria — assim a conta aparece nos dois
  // lugares independente de onde foi cadastrada.
  async create(input: CreateBillInput, actorProfileId: string | null) {
    const actor = await requireActor(actorProfileId);

    const occurrenceDates = input.recurrence
      ? computeOccurrenceDates(input.dueDate, input.recurrence.rule, input.recurrence.endDate ?? null)
      : [input.dueDate];

    const created = [];
    for (const dueDate of occurrenceDates) {
      const bill = await billsRepository.create({
        description: input.description,
        amount: input.amount,
        dueDate,
        category: input.category,
        isRecurring: Boolean(input.recurrence),
        recurrenceRule: input.recurrence?.rule ?? null,
        payerProfileId: input.payerProfileId ?? null,
        createdById: actor.id,
      });

      const agendaItem = await agendaRepository.create({
        title: input.description,
        category: 'conta',
        startAt: dueDate,
        billId: bill.id,
        reminderDaysBefore: null,
      });

      const googleEventId = await googleCalendarService.createEvent(agendaItem);
      if (googleEventId) {
        await agendaRepository.update(agendaItem.id, { googleEventId });
      }

      created.push(await billsRepository.findByIdWithRelations(bill.id));
    }

    return created;
  },

  async update(id: string, input: UpdateBillInput) {
    const existing = await this.getById(id);

    const updated = await billsRepository.update(id, {
      description: input.description,
      amount: input.amount,
      dueDate: input.dueDate,
      category: input.category,
      payerProfileId: input.payerProfileId ?? null,
    });

    if (existing.agendaItem) {
      let agendaItem = await agendaRepository.update(existing.agendaItem.id, {
        title: updated.description,
        startAt: updated.dueDate,
      });
      if (agendaItem.googleEventId) {
        await googleCalendarService.updateEvent(agendaItem);
      } else {
        const googleEventId = await googleCalendarService.createEvent(agendaItem);
        if (googleEventId) {
          agendaItem = await agendaRepository.update(agendaItem.id, { googleEventId });
        }
      }
    }

    return billsRepository.findByIdWithRelations(id);
  },

  async setPaid(id: string, paid: boolean) {
    await this.getById(id);
    return billsRepository.update(id, {
      status: paid ? 'pago' : 'pendente',
      paidAt: paid ? new Date() : null,
    });
  },

  async deleteBill(id: string) {
    const bill = await this.getById(id);

    for (const attachment of bill.attachments) {
      await removeAttachmentFile(attachment.storagePath);
    }

    if (bill.agendaItem) {
      if (bill.agendaItem.googleEventId) {
        await googleCalendarService.deleteEvent(bill.agendaItem.googleEventId);
      }
      await agendaRepository.delete(bill.agendaItem.id);
    }

    await billsRepository.deleteById(id);
  },

  async addAttachment(billId: string, file: MultipartFile, actorProfileId: string | null) {
    if (!actorProfileId) {
      throw new AppError('Selecione um perfil antes de enviar um anexo.', 400);
    }
    await this.getById(billId);

    const buffer = await file.toBuffer();
    const relativePath = path.join('bills', `${Date.now()}-${sanitizeFilename(file.filename)}`);
    const fullPath = path.join(UPLOADS_DIR, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    return billsRepository.createAttachment({
      billId,
      filename: file.filename,
      storagePath: relativePath,
      uploadedById: actorProfileId,
    });
  },

  async removeAttachment(attachmentId: string) {
    const attachment = await billsRepository.findAttachment(attachmentId);
    if (!attachment) {
      throw new NotFoundError('Anexo não encontrado.');
    }
    await removeAttachmentFile(attachment.storagePath);
    await billsRepository.deleteAttachment(attachmentId);
  },

  async summary(from: Date, to: Date) {
    const totals = await billsRepository.sumInRange(from, to);
    const byCategory = await billsRepository.sumByCategory(from, to);
    return {
      total: totals._sum.amount ?? 0,
      count: totals._count,
      byCategory: byCategory.map((row) => ({
        category: row.category,
        total: row._sum.amount ?? 0,
        count: row._count,
      })),
    };
  },
};
