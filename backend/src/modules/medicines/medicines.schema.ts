import { z } from 'zod';

const scheduleInputSchema = z.object({
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (use HH:mm).'),
  daysOfWeek: z
    .array(z.number().int().min(0, 'Dia da semana inválido.').max(6, 'Dia da semana inválido.'))
    .min(1, 'Selecione ao menos um dia da semana.'),
});

const baseMedicineFields = {
  name: z.string().min(1, 'O nome do remédio é obrigatório.').max(200),
  dosage: z.string().min(1, 'Informe a dosagem.').max(200),
  profileId: z.string().min(1).optional(),
  notes: z.string().max(2000).optional(),
  startDate: z.coerce.date({ errorMap: () => ({ message: 'Data de início inválida.' }) }),
  endDate: z.coerce.date().optional(),
};

export const createMedicineSchema = z
  .object({ ...baseMedicineFields, schedules: z.array(scheduleInputSchema).min(1, 'Adicione ao menos um horário.') })
  .superRefine((data, ctx) => {
    if (data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'O fim não pode ser antes do início.' });
    }
  });

export const updateMedicineSchema = createMedicineSchema;

export const medicineIdParamSchema = z.object({
  id: z.string().min(1, 'Id do remédio é obrigatório.'),
});

export const markDoseTakenSchema = z.object({
  scheduleId: z.string().min(1, 'Id do horário é obrigatório.'),
  doseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  taken: z.boolean(),
});

export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
export type MarkDoseTakenInput = z.infer<typeof markDoseTakenSchema>;
