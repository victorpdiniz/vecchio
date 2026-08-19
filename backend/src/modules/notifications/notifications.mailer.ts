import nodemailer from 'nodemailer';
import type { AgendaItem } from '@prisma/client';
import { env } from '../../lib/env.js';
import { formatBR } from '../../lib/timezone.js';

// Sem SMTP configurado (ex: dev sem essas variáveis no .env), o transporte
// fica nulo e o envio vira um log — lembrete por email é secundário e não
// pode derrubar o scan nem travar o app por falta de configuração.
const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

export async function sendReminderEmail(to: string, item: AgendaItem, reminderLabel: string) {
  const dateLabel = item.isAllDay ? formatBR(item.startAt, 'EEEE, dd/MM') : formatBR(item.startAt, "EEEE, dd/MM 'às' HH:mm");
  const subject = `Lembrete: ${item.title}`;
  const text = [`Você tem um compromisso em breve: ${item.title}`, `Quando: ${dateLabel}`, `Lembrete: ${reminderLabel}`].join(
    '\n',
  );

  if (!transporter) {
    console.info(`[notifications] SMTP não configurado — pulei email para ${to}: "${subject}"`);
    return;
  }

  await transporter.sendMail({ from: env.SMTP_FROM, to, subject, text });
}
