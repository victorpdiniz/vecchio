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
};
