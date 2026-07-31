import 'dotenv/config';
import { z } from 'zod';

// Valida as variáveis de ambiente uma única vez, na inicialização do processo.
// Falhar rápido aqui evita erros confusos mais tarde (ex: SMTP undefined).
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
  PORT: z.coerce.number().int().positive().default(3333),
  GEMINI_API_KEY: z.string().optional().default(''),
  PASSWORD_ENCRYPTION_KEY: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default('Vecchio <no-reply@vecchio.local>'),
  USB_BASE_DIR: z.string().optional().default('/home'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_REDIRECT_URI: z.string().optional().default('http://localhost:3333/api/google-calendar/callback'),
  FRONTEND_URL: z.string().optional().default('http://localhost:5173'),
});

export const env = envSchema.parse(process.env);
