import type { Medicine, MedicineSchedule, Profile } from '@prisma/client';
import { NotFoundError } from '../../lib/errors.js';
import { formatBR } from '../../lib/timezone.js';
import { medicinesRepository } from './medicines.repository.js';
import type { CreateMedicineInput, MarkDoseTakenInput, UpdateMedicineInput } from './medicines.schema.js';

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

  // Doses do dia (widget "hoje" do dashboard, e usado pelo scan de
  // notificações): remédios ativos hoje cujo horário cai no dia da semana
  // atual, ordenados por horário, com o estado "tomado" já resolvido a
  // partir do MedicineDoseLog de hoje. Weekday e a chave do dia usam o fuso
  // da app (America/Sao_Paulo), não o fuso do processo (UTC no container) —
  // senão a virada do dia acontece na hora errada pra família.
  async today() {
    const now = new Date();
    const weekday = Number(formatBR(now, 'i')) % 7; // 'i' = dia ISO (1=seg..7=dom) -> 0=dom..6=sáb
    const doseDate = formatBR(now, 'yyyy-MM-dd');

    const all = await medicinesRepository.findAll();
    const active = all.filter((medicine) => medicine.startDate <= now && (!medicine.endDate || medicine.endDate >= now));

    const doseLogs = await medicinesRepository.findDoseLogsForDate(doseDate);
    const takenScheduleIds = new Set(doseLogs.filter((log) => log.takenAt).map((log) => log.scheduleId));

    const doses = active.flatMap((medicine) =>
      medicine.schedules
        .filter((schedule) => schedule.daysOfWeek.split(',').map(Number).includes(weekday))
        .map((schedule) => ({
          medicineId: medicine.id,
          scheduleId: schedule.id,
          name: medicine.name,
          dosage: medicine.dosage,
          profileId: medicine.profileId,
          profile: medicine.profile,
          timeOfDay: schedule.timeOfDay,
          taken: takenScheduleIds.has(schedule.id),
        })),
    );

    return doses.sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
  },

  async markDoseTaken(input: MarkDoseTakenInput, actorProfileId: string | null) {
    const schedule = await medicinesRepository.findScheduleById(input.scheduleId);
    if (!schedule) {
      throw new NotFoundError('Horário de remédio não encontrado.');
    }
    return medicinesRepository.upsertDoseLog({
      medicineId: schedule.medicineId,
      scheduleId: schedule.id,
      doseDate: input.doseDate,
      timeOfDay: schedule.timeOfDay,
      takenAt: input.taken ? new Date() : null,
      markedById: actorProfileId,
    });
  },
};
