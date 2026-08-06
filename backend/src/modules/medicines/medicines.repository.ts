import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const medicineInclude = {
  profile: true,
  schedules: true,
} satisfies Prisma.MedicineInclude;

export const medicinesRepository = {
  findAll() {
    return prisma.medicine.findMany({ include: medicineInclude, orderBy: { name: 'asc' } });
  },

  findById(id: string) {
    return prisma.medicine.findUnique({ where: { id }, include: medicineInclude });
  },

  create(data: {
    name: string;
    dosage: string;
    profileId: string | null;
    notes: string | null;
    startDate: Date;
    endDate: Date | null;
  }) {
    return prisma.medicine.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      dosage: string;
      profileId: string | null;
      notes: string | null;
      startDate: Date;
      endDate: Date | null;
    }>,
  ) {
    return prisma.medicine.update({ where: { id }, data });
  },

  deleteById(id: string) {
    return prisma.medicine.delete({ where: { id } });
  },

  // Substitui todos os horários de um remédio de uma vez (mais simples do
  // que fazer diff de create/update/delete individual a cada edição).
  replaceSchedules(medicineId: string, schedules: { timeOfDay: string; daysOfWeek: string }[]) {
    return prisma.$transaction([
      prisma.medicineSchedule.deleteMany({ where: { medicineId } }),
      prisma.medicineSchedule.createMany({
        data: schedules.map((schedule) => ({ ...schedule, medicineId })),
      }),
    ]);
  },
};
