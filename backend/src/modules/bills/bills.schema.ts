import { z } from 'zod';
import { BILL_CATEGORIES, BILL_STATUSES, RECURRENCE_RULES } from '../../lib/enums.js';

const recurrenceInputSchema = z.object({
  rule: z.enum(RECURRENCE_RULES),
  endDate: z.coerce.date().optional(),
});

const baseBillFields = {
  description: z.string().min(1, 'A descrição é obrigatória.').max(200),
  amount: z.coerce.number().positive('O valor deve ser maior que zero.'),
  dueDate: z.coerce.date({ errorMap: () => ({ message: 'Data de vencimento inválida.' }) }),
  category: z.enum(BILL_CATEGORIES),
  payerProfileId: z.string().min(1).optional(),
};

export const createBillSchema = z
  .object({ ...baseBillFields, recurrence: recurrenceInputSchema.optional() })
  .superRefine((data, ctx) => {
    if (data.recurrence?.endDate && data.recurrence.endDate < data.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurrence', 'endDate'],
        message: 'A data final da recorrência não pode ser antes do vencimento.',
      });
    }
  });

export const updateBillSchema = z.object(baseBillFields);

export const markBillPaidSchema = z.object({
  paid: z.boolean(),
});

export const billIdParamSchema = z.object({
  id: z.string().min(1, 'Id da conta é obrigatório.'),
});

export const billAttachmentIdParamSchema = z.object({
  attachmentId: z.string().min(1, 'Id do anexo é obrigatório.'),
});

export const billsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.enum(BILL_STATUSES).optional(),
  category: z.enum(BILL_CATEGORIES).optional(),
});

export const billsSummaryQuerySchema = z
  .object({
    from: z.coerce.date({ errorMap: () => ({ message: 'Data inicial inválida.' }) }),
    to: z.coerce.date({ errorMap: () => ({ message: 'Data final inválida.' }) }),
  })
  .refine((data) => data.from <= data.to, {
    message: 'O intervalo de datas é inválido.',
    path: ['to'],
  });

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>;
export type BillsQuery = z.infer<typeof billsQuerySchema>;
