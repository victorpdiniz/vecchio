import { prisma } from '../../lib/prisma.js';
import type { ProposedAction } from './chat.types.js';

export const chatRepository = {
  // Devolve a linha "model" recém-criada (não o resultado cru da transação)
  // porque o chamador precisa do id pra o front conseguir confirmar/cancelar
  // a ação proposta, se houver uma.
  async saveExchange(
    profileId: string,
    userMessage: string,
    modelAnswer: string,
    agendaItemIds: string[],
    proposedAction: ProposedAction | null,
  ) {
    const hasAction = Boolean(proposedAction && proposedAction.kind !== 'none');
    const [, modelMessage] = await prisma.$transaction([
      prisma.chatMessage.create({ data: { profileId, role: 'user', content: userMessage } }),
      prisma.chatMessage.create({
        data: {
          profileId,
          role: 'model',
          content: modelAnswer,
          agendaItemIds: agendaItemIds.length > 0 ? agendaItemIds.join(',') : null,
          proposedAction: hasAction ? JSON.stringify(proposedAction) : null,
          proposedActionStatus: hasAction ? 'pending' : null,
        },
      }),
    ]);
    return modelMessage;
  },

  // Mensagem só do sistema (sem par "user"), usada pra registrar o
  // resultado de uma ação confirmada/cancelada no histórico.
  appendSystemMessage(profileId: string, content: string) {
    return prisma.chatMessage.create({ data: { profileId, role: 'model', content } });
  },

  listByProfile(profileId: string) {
    return prisma.chatMessage.findMany({
      where: { profileId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  },

  findMessageById(id: string) {
    return prisma.chatMessage.findUnique({ where: { id } });
  },

  updateProposedActionStatus(id: string, status: 'confirmed' | 'cancelled') {
    return prisma.chatMessage.update({ where: { id }, data: { proposedActionStatus: status } });
  },

  deleteByProfile(profileId: string) {
    return prisma.chatMessage.deleteMany({ where: { profileId } });
  },
};
