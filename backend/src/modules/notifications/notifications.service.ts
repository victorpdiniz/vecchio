import cron from 'node-cron';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { notificationsRepository } from './notifications.repository.js';
import { profilesRepository } from '../profiles/profiles.repository.js';
import { sendReminderEmail } from './notifications.mailer.js';

// Log "inapp" é um só por compromisso (não por perfil) — o banner é
// compartilhado pela família, e a visibilidade de itens privados já é
// filtrada por perfil na hora de listar (findPending), não no envio.
const INAPP_SENT_TO = 'familia';

export const notificationsService = {
  // Roda uma vez por dia (ver startScheduler): para cada compromisso com
  // reminderDaysBefore configurado que já entrou nessa janela, registra o
  // lembrete in-app (uma vez) e envia email a cada perfil-alvo (uma vez por
  // perfil, via NotificationLog) — itens privados do admin só notificam o
  // próprio admin, os demais notificam toda a família.
  async runDailyScan() {
    const today = startOfDay(new Date());
    const items = await notificationsRepository.findUpcomingWithReminder(today);
    if (items.length === 0) return;

    const profiles = await profilesRepository.findAll();

    for (const item of items) {
      if (item.reminderDaysBefore == null) continue;
      const daysUntil = differenceInCalendarDays(item.startAt, today);
      if (daysUntil > item.reminderDaysBefore) continue;

      if (!(await notificationsRepository.hasLog(item.id, 'inapp', INAPP_SENT_TO))) {
        await notificationsRepository.createLog({ agendaItemId: item.id, channel: 'inapp', sentTo: INAPP_SENT_TO });
      }

      const targetProfiles = item.isPrivate
        ? profiles.filter((profile) => profile.id === item.ownerProfileId)
        : profiles;

      for (const profile of targetProfiles) {
        if (!profile.email) continue;
        if (await notificationsRepository.hasLog(item.id, 'email', profile.email)) continue;

        try {
          await sendReminderEmail(profile.email, item);
          await notificationsRepository.createLog({ agendaItemId: item.id, channel: 'email', sentTo: profile.email });
        } catch (error) {
          console.warn(`[notifications] falha ao enviar email para ${profile.email}:`, error);
        }
      }
    }
  },

  pending(profileId: string | null) {
    const today = startOfDay(new Date());
    return notificationsRepository.findPending(profileId, today);
  },
};

// Roda logo na subida do processo (útil em dev — não é preciso esperar até
// o horário do cron pra ver o lembrete aparecer) e depois todo dia às 7h.
export function startNotificationsScheduler() {
  notificationsService.runDailyScan().catch((error) => {
    console.error('[notifications] falha no scan inicial:', error);
  });

  cron.schedule('0 7 * * *', () => {
    notificationsService.runDailyScan().catch((error) => {
      console.error('[notifications] falha no scan diário:', error);
    });
  });
}
