import { z } from 'zod';

export const sendMessageSchema = z.object({
  message: z.string().min(1, 'Escreva uma pergunta.').max(1000, 'Pergunta muito longa.'),
});
