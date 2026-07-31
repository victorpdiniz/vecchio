import { z } from 'zod';

export const updateProfileSchema = z.object({
  email: z.string().email('E-mail inválido.').optional(),
  colorTag: z.string().min(1, 'Cor obrigatória.').optional(),
  avatarIcon: z.string().min(1, 'Ícone obrigatório.').optional(),
});

export const profileIdParamSchema = z.object({
  id: z.string().min(1, 'Id do perfil é obrigatório.'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
