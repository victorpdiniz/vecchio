import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { ComputedReminder } from './reminders.js';

const itemInclude = {
  bill: { include: { payerProfile: true } },
  reminders: true,
} satisfies Prisma.AgendaItemInclude;

export const agendaRepository = {
  findManyInRange(from: Date, to: Date) {
    return prisma.agendaItem.findMany({
      where: {
        // Compromissos que se sobrepõem ao intervalo, não só os que começam
        // nele — sem isso, um compromisso de vários dias some da view ao
        // navegar para um dia/semana que contém apenas seu meio ou fim.
        AND: [{ startAt: { lte: to } }, { OR: [{ endAt: { gte: from } }, { endAt: null, startAt: { gte: from } }] }],
      },
      include: itemInclude,
      orderBy: { startAt: 'asc' },
    });
  },

  findById(id: string) {
    return prisma.agendaItem.findUnique({ where: { id }, include: itemInclude });
  },

  findManyByIds(ids: string[]) {
    return prisma.agendaItem.findMany({ where: { id: { in: ids } }, include: itemInclude });
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

  // Substitui todos os lembretes de um compromisso pelos recém-computados —
  // mais simples que fazer diff, e correto mesmo quando o `startAt` muda
  // (o que recalcula o `triggerAt` de todos eles).
  async replaceReminders(agendaItemId: string, reminders: ComputedReminder[]) {
    await prisma.agendaReminder.deleteMany({ where: { agendaItemId } });
    if (reminders.length === 0) return;
    await prisma.agendaReminder.createMany({
      data: reminders.map((reminder) => ({ ...reminder, agendaItemId })),
    });
  },
};
