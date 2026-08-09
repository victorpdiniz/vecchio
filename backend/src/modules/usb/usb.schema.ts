import { z } from 'zod';

export const listFoldersQuerySchema = z.object({
  path: z.string().max(1000).optional().default(''),
});

export const copyRequestSchema = z.object({
  sourcePath: z.string().min(1, 'Selecione uma pasta de origem.').max(1000),
  driveId: z.string().min(1, 'Selecione um pendrive.').max(200),
  destinationPath: z.string().max(1000).optional().default(''),
});

export const jobIdParamSchema = z.object({
  id: z.string().min(1, 'Id da cópia é obrigatório.'),
});

export type CopyRequestInput = z.infer<typeof copyRequestSchema>;
