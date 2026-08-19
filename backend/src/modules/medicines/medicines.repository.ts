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
  // que fazer diff de create/update/delete individual a cada edição). Isso
  // significa que scheduleId não é estável entre edições — um MedicineDoseLog
  // registrado antes de uma edição fica órfão (cascade delete) se o remédio
  // for editado no mesmo dia.
  replaceSchedules(medicineId: string, schedules: { timeOfDay: string; daysOfWeek: string }[]) {
    return prisma.$transaction([
      prisma.medicineSchedule.deleteMany({ where: { medicineId } }),
      prisma.medicineSchedule.createMany({
        data: schedules.map((schedule) => ({ ...schedule, medicineId })),
      }),
    ]);
  },

  findScheduleById(id: string) {
    return prisma.medicineSchedule.findUnique({ where: { id } });
  },

  findDoseLog(scheduleId: string, doseDate: string) {
    return prisma.medicineDoseLog.findUnique({ where: { scheduleId_doseDate: { scheduleId, doseDate } } });
  },

  findDoseLogsForDate(doseDate: string) {
    return prisma.medicineDoseLog.findMany({ where: { doseDate } });
  },

  upsertDoseLog(data: {
    medicineId: string;
    scheduleId: string;
    doseDate: string;
    timeOfDay: string;
    takenAt: Date | null;
    markedById: string | null;
  }) {
    return prisma.medicineDoseLog.upsert({
      where: { scheduleId_doseDate: { scheduleId: data.scheduleId, doseDate: data.doseDate } },
      create: data,
      update: { takenAt: data.takenAt, markedById: data.markedById },
    });
  },
};
