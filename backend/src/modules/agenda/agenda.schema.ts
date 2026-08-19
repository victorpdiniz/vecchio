import { z } from 'zod';
import { AGENDA_CATEGORIES, RECURRENCE_RULES, REMINDER_UNITS } from '../../lib/enums.js';

const relativeReminderSchema = z.object({
  kind: z.literal('relative'),
  amount: z.coerce.number().int().min(0).max(999),
  unit: z.enum(REMINDER_UNITS),
});

const allDayReminderSchema = z.object({
  kind: z.literal('allday'),
  daysBefore: z.coerce.number().int().min(0).max(60),
  atHour: z.coerce.number().int().min(0).max(23),
  atMinute: z.coerce.number().int().min(0).max(59),
});

const reminderInputSchema = z.union([relativeReminderSchema, allDayReminderSchema]);

const baseAgendaItemFields = {
  title: z.string().min(1, 'O título é obrigatório.').max(200),
  category: z.enum(AGENDA_CATEGORIES),
  isAllDay: z.boolean().optional().default(false),
  startAt: z.coerce.date({ errorMap: () => ({ message: 'Data de início inválida.' }) }),
  endAt: z.coerce.date().optional(),
  amount: z.coerce.number().positive('O valor deve ser maior que zero.').optional(),
  reminders: z.array(reminderInputSchema).max(5, 'No máximo 5 lembretes.').optional().default([]),
};

const recurrenceInputSchema = z.object({
  rule: z.enum(RECURRENCE_RULES),
});

function validateCommonAgendaFields(
  data: {
    category: string;
    amount?: number;
    startAt: Date;
    endAt?: Date;
    isAllDay: boolean;
    reminders: z.infer<typeof reminderInputSchema>[];
  },
  ctx: z.RefinementCtx,
) {
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
  const expectedKind = data.isAllDay ? 'allday' : 'relative';
  data.reminders.forEach((reminder, index) => {
    if (reminder.kind !== expectedKind) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reminders', index, 'kind'],
        message: data.isAllDay
          ? 'Compromissos de dia inteiro usam lembrete por dia/horário.'
          : 'Compromissos com horário usam lembrete por tempo antes.',
      });
    }
  });
}

export const createAgendaItemSchema = z
  .object({ ...baseAgendaItemFields, recurrence: recurrenceInputSchema.optional() })
  .superRefine(validateCommonAgendaFields);

export const updateAgendaItemSchema = z.object(baseAgendaItemFields).superRefine(validateCommonAgendaFields);

export const agendaIdParamSchema = z.object({
  id: z.string().min(1, 'Id do compromisso é obrigatório.'),
});

export const seriesParamSchema = z.object({
  recurrenceGroupId: z.string().min(1, 'Id da série é obrigatório.'),
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

export type ReminderInput = z.infer<typeof reminderInputSchema>;
export type CreateAgendaItemInput = z.infer<typeof createAgendaItemSchema>;
export type UpdateAgendaItemInput = z.infer<typeof updateAgendaItemSchema>;
