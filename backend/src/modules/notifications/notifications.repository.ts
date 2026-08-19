import { prisma } from '../../lib/prisma.js';

export const notificationsRepository = {
  // Lembretes cujo horário de disparo já chegou — o service ainda filtra os
  // que já passaram do compromisso (ex: servidor ficou fora do ar) e os que
  // já foram enviados em cada canal (via hasLog).
  findDueReminders(now: Date) {
    return prisma.agendaReminder.findMany({
      where: { triggerAt: { lte: now } },
      include: { agendaItem: true },
    });
  },

  hasLog(reminderId: string, channel: string, sentTo: string) {
    return prisma.notificationLog.findFirst({ where: { reminderId, channel, sentTo } });
  },

  createLog(data: { reminderId: string; channel: string; sentTo: string }) {
    return prisma.notificationLog.create({ data });
  },

  // Compromissos já avisados (log "inapp") que ainda não aconteceram.
  findPending(now: Date) {
    return prisma.agendaItem.findMany({
      where: {
        startAt: { gte: now },
        reminders: { some: { notifications: { some: { channel: 'inapp' } } } },
      },
      include: { bill: { include: { payerProfile: true } }, reminders: true },
      orderBy: { startAt: 'asc' },
    });
  },

  hasDoseLog(doseLogId: string, kind: string, channel: string, sentTo: string) {
    return prisma.notificationLog.findFirst({ where: { doseLogId, kind, channel, sentTo } });
  },

  createDoseLog(data: { doseLogId: string; kind: string; channel: string; sentTo: string }) {
    return prisma.notificationLog.create({ data });
  },

  // Doses de hoje já avisadas (log "inapp") e ainda não tomadas — pro banner.
  findPendingDoses(doseDate: string) {
    return prisma.medicineDoseLog.findMany({
      where: {
        doseDate,
        takenAt: null,
        notifications: { some: { channel: 'inapp' } },
      },
      include: { medicine: true, notifications: { where: { channel: 'inapp' }, orderBy: { sentAt: 'desc' }, take: 1 } },
      orderBy: { timeOfDay: 'asc' },
    });
  },
};
