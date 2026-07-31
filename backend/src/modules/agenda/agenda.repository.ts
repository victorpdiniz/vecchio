import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const itemInclude = {
  ownerProfile: true,
  bill: true,
  attachments: true,
} satisfies Prisma.AgendaItemInclude;

export const agendaRepository = {
  findManyInRange(from: Date, to: Date, profileId: string | null) {
    return prisma.agendaItem.findMany({
      where: {
        startAt: { gte: from, lte: to },
        OR: [{ isPrivate: false }, { isPrivate: true, ownerProfileId: profileId ?? '__none__' }],
      },
      include: itemInclude,
      orderBy: { startAt: 'asc' },
    });
  },

  findById(id: string) {
    return prisma.agendaItem.findUnique({ where: { id }, include: itemInclude });
  },

  findFutureBySeries(recurrenceGroupId: string, from: Date) {
    return prisma.agendaItem.findMany({
      where: { recurrenceGroupId, startAt: { gte: from } },
      include: itemInclude,
    });
  },

  create(data: Prisma.AgendaItemUncheckedCreateInput) {
    return prisma.agendaItem.create({ data, include: itemInclude });
  },

  update(id: string, data: Prisma.AgendaItemUncheckedUpdateInput) {
    return prisma.agendaItem.update({ where: { id }, data, include: itemInclude });
  },

  delete(id: string) {
    return prisma.agendaItem.delete({ where: { id } });
  },

  createAttachment(data: Prisma.AttachmentUncheckedCreateInput) {
    return prisma.attachment.create({ data });
  },

  findAttachment(id: string) {
    return prisma.attachment.findUnique({ where: { id } });
  },

  deleteAttachment(id: string) {
    return prisma.attachment.delete({ where: { id } });
  },
};
