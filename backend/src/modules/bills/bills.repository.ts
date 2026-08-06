import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const billInclude = {
  payerProfile: true,
  attachments: true,
  agendaItem: true,
} satisfies Prisma.BillInclude;

export const billsRepository = {
  create(data: Prisma.BillUncheckedCreateInput) {
    return prisma.bill.create({ data });
  },

  findById(id: string) {
    return prisma.bill.findUnique({ where: { id } });
  },

  findByIdWithRelations(id: string) {
    return prisma.bill.findUnique({ where: { id }, include: billInclude });
  },

  findMany(filters: { from?: Date; to?: Date; status?: string; category?: string }) {
    const where: Prisma.BillWhereInput = {};
    if (filters.from || filters.to) {
      where.dueDate = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;

    return prisma.bill.findMany({ where, include: billInclude, orderBy: { dueDate: 'asc' } });
  },

  update(id: string, data: Partial<{
    description: string;
    amount: number;
    dueDate: Date;
    category: string;
    payerProfileId: string | null;
    status: string;
    paidAt: Date | null;
  }>) {
    return prisma.bill.update({ where: { id }, data });
  },

  deleteById(id: string) {
    return prisma.bill.delete({ where: { id } });
  },

  sumInRange(from: Date, to: Date) {
    return prisma.bill.aggregate({
      where: { dueDate: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
    });
  },

  sumByCategory(from: Date, to: Date) {
    return prisma.bill.groupBy({
      by: ['category'],
      where: { dueDate: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
    });
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
