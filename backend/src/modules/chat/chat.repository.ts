import { prisma } from '../../lib/prisma.js';

export const chatRepository = {
  async saveExchange(profileId: string, userMessage: string, modelAnswer: string) {
    await prisma.$transaction([
      prisma.chatMessage.create({ data: { profileId, role: 'user', content: userMessage } }),
      prisma.chatMessage.create({ data: { profileId, role: 'model', content: modelAnswer } }),
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
