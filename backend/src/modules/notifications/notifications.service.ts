import cron from 'node-cron';
import { endOfDay } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { notificationsRepository } from './notifications.repository.js';
import { profilesRepository } from '../profiles/profiles.repository.js';
import { medicinesRepository } from '../medicines/medicines.repository.js';
import { medicinesService } from '../medicines/medicines.service.js';
import { sendReminderEmail, sendDoseReminderEmail } from './notifications.mailer.js';
import { APP_TIME_ZONE, formatBR } from '../../lib/timezone.js';

// Log "inapp" é um só por lembrete (não por perfil) — o banner é
// compartilhado pela família.
const INAPP_SENT_TO = 'familia';
const UPCOMING_MINUTES_BEFORE = 15;

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

  // Roda no mesmo ciclo de 5 min: pra cada dose de remédio de hoje ainda não
  // tomada, avisa uma vez 15 min antes do horário ("upcoming"), e a partir do
  // horário avisa de novo a cada hora completada ("missed-0", "missed-1", …)
  // até ser marcada como tomada ou o dia acabar — cada slot de hora é uma
  // chave de dedup distinta, então o re-disparo horário e a parada no fim do
  // dia acontecem sem precisar guardar estado extra.
  async runMedicineDoseScan() {
    const now = new Date();
    const doseDate = formatBR(now, 'yyyy-MM-dd');
    const doses = await medicinesService.today();
    if (doses.length === 0) return;

    const profiles = await profilesRepository.findAll();

    for (const dose of doses) {
      if (dose.taken) continue;

      const doseTime = fromZonedTime(`${doseDate}T${dose.timeOfDay}:00`, APP_TIME_ZONE);
      const upcomingAt = new Date(doseTime.getTime() - UPCOMING_MINUTES_BEFORE * 60_000);
      const dayEnd = fromZonedTime(`${doseDate}T23:59:59`, APP_TIME_ZONE);

      let kind: string | null = null;
      if (now >= upcomingAt && now < doseTime) {
        kind = 'upcoming';
      } else if (now >= doseTime && now < dayEnd) {
        const hourlySlot = Math.floor((now.getTime() - doseTime.getTime()) / (60 * 60_000));
        kind = `missed-${hourlySlot}`;
      }
      if (!kind) continue;

      const doseLog =
        (await medicinesRepository.findDoseLog(dose.scheduleId, doseDate)) ??
        (await medicinesRepository.upsertDoseLog({
          medicineId: dose.medicineId,
          scheduleId: dose.scheduleId,
          doseDate,
          timeOfDay: dose.timeOfDay,
          takenAt: null,
          markedById: null,
        }));

      if (!(await notificationsRepository.hasDoseLog(doseLog.id, kind, 'inapp', INAPP_SENT_TO))) {
        await notificationsRepository.createDoseLog({ doseLogId: doseLog.id, kind, channel: 'inapp', sentTo: INAPP_SENT_TO });
      }

      for (const profile of profiles) {
        if (!profile.email) continue;
        if (await notificationsRepository.hasDoseLog(doseLog.id, kind, 'email', profile.email)) continue;

        try {
          await sendDoseReminderEmail(profile.email, dose, kind === 'upcoming' ? 'upcoming' : 'missed');
          await notificationsRepository.createDoseLog({ doseLogId: doseLog.id, kind, channel: 'email', sentTo: profile.email });
        } catch (error) {
          console.warn(`[notifications] falha ao enviar email de remédio para ${profile.email}:`, error);
        }
      }
    }
  },

  async pending() {
    const now = new Date();
    const doseDate = formatBR(now, 'yyyy-MM-dd');
    const [agendaItems, medicineDoses] = await Promise.all([
      notificationsRepository.findPending(now),
      notificationsRepository.findPendingDoses(doseDate),
    ]);
    return { agendaItems, medicineDoses };
  },
};

// Roda logo na subida do processo (útil em dev — não é preciso esperar até
// o próximo ciclo do cron pra ver o lembrete aparecer) e depois a cada 5
// minutos: precisa de granularidade fina porque lembretes agora disparam
// num horário específico, não mais "uma vez por dia às 7h" como antes.
export function startNotificationsScheduler() {
  function runAll() {
    notificationsService.runScan().catch((error) => {
      console.error('[notifications] falha no scan inicial:', error);
    });
    notificationsService.runMedicineDoseScan().catch((error) => {
      console.error('[notifications] falha no scan de remédios:', error);
    });
  }

  runAll();
  cron.schedule('*/5 * * * *', runAll);
}
