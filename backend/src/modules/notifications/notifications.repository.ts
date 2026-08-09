import { prisma } from '../../lib/prisma.js';

export const notificationsRepository = {
  // Compromissos com lembrete configurado que ainda não aconteceram — o
  // service filtra pelos que já entraram na janela de `reminderDaysBefore`.
  findUpcomingWithReminder(today: Date) {
    return prisma.agendaItem.findMany({
      where: { reminderDaysBefore: { not: null }, startAt: { gte: today } },
    });
  },

  hasLog(agendaItemId: string, channel: string, sentTo: string) {
    return prisma.notificationLog.findFirst({ where: { agendaItemId, channel, sentTo } });
  },

  createLog(data: { agendaItemId: string; channel: string; sentTo: string }) {
    return prisma.notificationLog.create({ data });
  },

  // Compromissos já avisados (log "inapp") que ainda não passaram — a
  // privacidade segue a mesma regra da listagem da agenda: item privado só
  // aparece para o próprio dono.
  findPending(profileId: string | null, today: Date) {
    return prisma.agendaItem.findMany({
      where: {
        startAt: { gte: today },
        notifications: { some: { channel: 'inapp' } },
        OR: [{ isPrivate: false }, { isPrivate: true, ownerProfileId: profileId ?? '__none__' }],
      },
      orderBy: { startAt: 'asc' },
    });
  },
};
