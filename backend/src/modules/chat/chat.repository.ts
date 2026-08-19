import { prisma } from '../../lib/prisma.js';

export const chatRepository = {
  async saveExchange(profileId: string, userMessage: string, modelAnswer: string, agendaItemIds: string[]) {
    await prisma.$transaction([
      prisma.chatMessage.create({ data: { profileId, role: 'user', content: userMessage } }),
      prisma.chatMessage.create({
        data: {
          profileId,
          role: 'model',
          content: modelAnswer,
          agendaItemIds: agendaItemIds.length > 0 ? agendaItemIds.join(',') : null,
        },
      }),
    ]);
  },

  listByProfile(profileId: string) {
    return prisma.chatMessage.findMany({
      where: { profileId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  },
};
