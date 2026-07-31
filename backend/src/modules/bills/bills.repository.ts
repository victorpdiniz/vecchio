import { prisma } from '../../lib/prisma.js';

// Semente mínima do futuro módulo de Contas (fase 3 do plano). Por enquanto
// só o necessário para o módulo de Agenda registrar o valor de compromissos
// da categoria "conta" e somar o total gasto num período.
export const billsRepository = {
  create(data: {
    description: string;
    amount: number;
    dueDate: Date;
    category: string;
    isRecurring: boolean;
    recurrenceRule?: string | null;
    createdById: string;
  }) {
    return prisma.bill.create({ data });
  },

  findById(id: string) {
    return prisma.bill.findUnique({ where: { id } });
  },

  update(
    id: string,
    data: Partial<{ description: string; amount: number; dueDate: Date; category: string }>,
  ) {
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
};
