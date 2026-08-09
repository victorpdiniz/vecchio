import { z } from 'zod';
import { AGENDA_CATEGORIES, RECURRENCE_RULES } from '../../lib/enums.js';

const baseAgendaItemFields = {
  title: z.string().min(1, 'O título é obrigatório.').max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(AGENDA_CATEGORIES),
  location: z.string().max(200).optional(),
  startAt: z.coerce.date({ errorMap: () => ({ message: 'Data de início inválida.' }) }),
  endAt: z.coerce.date().optional(),
  isPrivate: z.boolean().optional().default(false),
  reminderDaysBefore: z.coerce.number().int().min(0).max(30).optional(),
  amount: z.coerce.number().positive('O valor deve ser maior que zero.').optional(),
};

const recurrenceInputSchema = z.object({
  rule: z.enum(RECURRENCE_RULES),
  endDate: z.coerce.date().optional(),
});

export const createAgendaItemSchema = z
  .object({ ...baseAgendaItemFields, recurrence: recurrenceInputSchema.optional() })
  .superRefine((data, ctx) => {
    if (data.category === 'conta' && data.amount === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amount'], message: 'Informe o valor da conta.' });
    }
    if (data.category !== 'conta' && data.amount !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: 'Valor só se aplica a compromissos da categoria "conta".',
      });
    }
    if (data.endAt && data.endAt < data.startAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'O fim não pode ser antes do início.' });
    }
    if (data.recurrence?.endDate && data.recurrence.endDate < data.startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurrence', 'endDate'],
        message: 'A data final da recorrência não pode ser antes do início.',
      });
    }
  });

export const updateAgendaItemSchema = z.object(baseAgendaItemFields).superRefine((data, ctx) => {
  if (data.category === 'conta' && data.amount === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amount'], message: 'Informe o valor da conta.' });
  }
  if (data.category !== 'conta' && data.amount !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amount'],
      message: 'Valor só se aplica a compromissos da categoria "conta".',
    });
  }
  if (data.endAt && data.endAt < data.startAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'O fim não pode ser antes do início.' });
  }
});

export const agendaIdParamSchema = z.object({
  id: z.string().min(1, 'Id do compromisso é obrigatório.'),
});

export const seriesParamSchema = z.object({
  recurrenceGroupId: z.string().min(1, 'Id da série é obrigatório.'),
});

export const attachmentIdParamSchema = z.object({
  attachmentId: z.string().min(1, 'Id do anexo é obrigatório.'),
});

export const dateRangeQuerySchema = z
  .object({
    from: z.coerce.date({ errorMap: () => ({ message: 'Data inicial inválida.' }) }),
    to: z.coerce.date({ errorMap: () => ({ message: 'Data final inválida.' }) }),
  })
  .refine((data) => data.from <= data.to, {
    message: 'O intervalo de datas é inválido.',
    path: ['to'],
  });

export type CreateAgendaItemInput = z.infer<typeof createAgendaItemSchema>;
export type UpdateAgendaItemInput = z.infer<typeof updateAgendaItemSchema>;
