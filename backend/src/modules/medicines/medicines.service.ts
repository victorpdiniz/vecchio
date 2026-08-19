import type { Medicine, MedicineSchedule, Profile } from '@prisma/client';
import { NotFoundError } from '../../lib/errors.js';
import { medicinesRepository } from './medicines.repository.js';
import type { CreateMedicineInput, UpdateMedicineInput } from './medicines.schema.js';

type MedicineWithRelations = Medicine & { profile: Profile | null; schedules: MedicineSchedule[] };

function toCsv(days: number[]): string {
  return [...new Set(days)].sort((a, b) => a - b).join(',');
}

// A API expõe daysOfWeek como array de números (0-6); só o banco guarda
// como CSV, porque o SQLite não tem tipo de array nativo no Prisma.
function toPublicMedicine(medicine: MedicineWithRelations) {
  return {
    ...medicine,
    schedules: medicine.schedules.map((schedule) => ({
      id: schedule.id,
      timeOfDay: schedule.timeOfDay,
      daysOfWeek: schedule.daysOfWeek
        .split(',')
        .filter(Boolean)
        .map((value) => Number(value)),
    })),
  };
}

export const medicinesService = {
  async list() {
    const all = await medicinesRepository.findAll();
    return all.map(toPublicMedicine);
  },

  async getById(id: string) {
    const medicine = await medicinesRepository.findById(id);
    if (!medicine) {
      throw new NotFoundError('Remédio não encontrado.');
    }
    return toPublicMedicine(medicine);
  },

  async create(input: CreateMedicineInput) {
    const medicine = await medicinesRepository.create({
      name: input.name,
      dosage: input.dosage,
      profileId: input.profileId ?? null,
      notes: input.notes ?? null,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
    });
    await medicinesRepository.replaceSchedules(
      medicine.id,
      input.schedules.map((schedule) => ({ timeOfDay: schedule.timeOfDay, daysOfWeek: toCsv(schedule.daysOfWeek) })),
    );
    return this.getById(medicine.id);
  },

  async update(id: string, input: UpdateMedicineInput) {
    await this.getById(id);
    await medicinesRepository.update(id, {
      name: input.name,
      dosage: input.dosage,
      profileId: input.profileId ?? null,
      notes: input.notes ?? null,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
    });
    await medicinesRepository.replaceSchedules(
      id,
      input.schedules.map((schedule) => ({ timeOfDay: schedule.timeOfDay, daysOfWeek: toCsv(schedule.daysOfWeek) })),
    );
    return this.getById(id);
  },

  async deleteMedicine(id: string) {
    await this.getById(id);
    await medicinesRepository.deleteById(id);
  },

  // Doses do dia (widget "hoje" do dashboard): remédios ativos hoje cujo
  // horário cai no dia da semana atual, ordenados por horário.
  async today() {
    const now = new Date();
    const weekday = now.getDay();
    const all = await medicinesRepository.findAll();
    const active = all.filter((medicine) => medicine.startDate <= now && (!medicine.endDate || medicine.endDate >= now));

    const doses = active.flatMap((medicine) =>
      medicine.schedules
        .filter((schedule) => schedule.daysOfWeek.split(',').map(Number).includes(weekday))
        .map((schedule) => ({
          medicineId: medicine.id,
          name: medicine.name,
          dosage: medicine.dosage,
          profileId: medicine.profileId,
          profile: medicine.profile,
          timeOfDay: schedule.timeOfDay,
        })),
    );

    return doses.sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
  },
};
