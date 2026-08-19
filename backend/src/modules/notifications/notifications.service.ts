import cron from 'node-cron';
import { endOfDay } from 'date-fns';
import { notificationsRepository } from './notifications.repository.js';
import { profilesRepository } from '../profiles/profiles.repository.js';
import { sendReminderEmail } from './notifications.mailer.js';

// Log "inapp" é um só por lembrete (não por perfil) — o banner é
// compartilhado pela família.
const INAPP_SENT_TO = 'familia';

function hasEventPassed(item: { isAllDay: boolean; startAt: Date; endAt: Date | null }, now: Date): boolean {
  const reference = item.endAt ?? item.startAt;
  return item.isAllDay ? endOfDay(reference) < now : reference < now;
}

export const notificationsService = {
  // Roda a cada 5 min (ver startNotificationsScheduler): para cada lembrete
  // cujo horário de disparo já chegou, registra o aviso in-app (uma vez) e
  // envia email a cada perfil com email cadastrado (uma vez por perfil, via
  // NotificationLog) — pula lembretes de compromissos que já passaram (ex:
  // o servidor ficou fora do ar e perdeu a janela de disparo).
  async runScan() {
    const now = new Date();
    const dueReminders = await notificationsRepository.findDueReminders(now);
    if (dueReminders.length === 0) return;

    const profiles = await profilesRepository.findAll();

    for (const reminder of dueReminders) {
      if (hasEventPassed(reminder.agendaItem, now)) continue;

      if (!(await notificationsRepository.hasLog(reminder.id, 'inapp', INAPP_SENT_TO))) {
        await notificationsRepository.createLog({ reminderId: reminder.id, channel: 'inapp', sentTo: INAPP_SENT_TO });
      }

      for (const profile of profiles) {
        if (!profile.email) continue;
        if (await notificationsRepository.hasLog(reminder.id, 'email', profile.email)) continue;

        try {
          await sendReminderEmail(profile.email, reminder.agendaItem, reminder.label);
          await notificationsRepository.createLog({ reminderId: reminder.id, channel: 'email', sentTo: profile.email });
        } catch (error) {
          console.warn(`[notifications] falha ao enviar email para ${profile.email}:`, error);
        }
      }
    }
  },

  pending() {
    return notificationsRepository.findPending(new Date());
  },
};

// Roda logo na subida do processo (útil em dev — não é preciso esperar até
// o próximo ciclo do cron pra ver o lembrete aparecer) e depois a cada 5
// minutos: precisa de granularidade fina porque lembretes agora disparam
// num horário específico, não mais "uma vez por dia às 7h" como antes.
export function startNotificationsScheduler() {
  notificationsService.runScan().catch((error) => {
    console.error('[notifications] falha no scan inicial:', error);
  });

  cron.schedule('*/5 * * * *', () => {
    notificationsService.runScan().catch((error) => {
      console.error('[notifications] falha no scan periódico:', error);
    });
  });
}
