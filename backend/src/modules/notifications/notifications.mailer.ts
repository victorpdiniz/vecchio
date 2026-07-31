import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AgendaItem } from '@prisma/client';
import { env } from '../../lib/env.js';

// Sem SMTP configurado (ex: dev sem essas variáveis no .env), o transporte
// fica nulo e o envio vira um log — lembrete por email é secundário e não
// pode derrubar o scan diário nem travar o app por falta de configuração.
const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

export async function sendReminderEmail(to: string, item: AgendaItem) {
  const dateLabel = format(item.startAt, "EEEE, dd/MM 'às' HH:mm", { locale: ptBR });
  const subject = `Lembrete: ${item.title}`;
  const text = [
    `Você tem um compromisso em breve: ${item.title}`,
    `Quando: ${dateLabel}`,
    item.location ? `Local: ${item.location}` : null,
    item.description ? `\n${item.description}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  if (!transporter) {
    console.info(`[notifications] SMTP não configurado — pulei email para ${to}: "${subject}"`);
    return;
  }

  await transporter.sendMail({ from: env.SMTP_FROM, to, subject, text });
}
