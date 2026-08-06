import { z } from 'zod';

export const createPasswordSchema = z.object({
  siteName: z.string().min(1, 'O nome do site é obrigatório.').max(200),
  url: z.string().max(500).optional(),
  username: z.string().min(1, 'O usuário é obrigatório.').max(200),
  password: z.string().min(1, 'A senha é obrigatória.').max(500),
  notes: z.string().max(2000).optional(),
});

export const updatePasswordSchema = createPasswordSchema;

export const passwordIdParamSchema = z.object({
  id: z.string().min(1, 'Id da senha é obrigatório.'),
});

export const passwordsQuerySchema = z.object({
  search: z.string().max(200).optional(),
});

export type CreatePasswordInput = z.infer<typeof createPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
