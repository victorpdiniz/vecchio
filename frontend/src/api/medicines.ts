import { api } from './client';
import type { Profile } from './profiles';

export interface MedicineSchedule {
  id: string;
  timeOfDay: string;
  daysOfWeek: number[];
}

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  profileId: string | null;
  profile: Profile | null;
  notes: string | null;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  schedules: MedicineSchedule[];
}

export interface MedicineScheduleInput {
  timeOfDay: string;
  daysOfWeek: number[];
}

export interface MedicineInput {
  name: string;
  dosage: string;
  profileId?: string;
  notes?: string;
  startDate: string;
  endDate?: string;
  schedules: MedicineScheduleInput[];
}

export interface TodayDose {
  medicineId: string;
  scheduleId: string;
  name: string;
  dosage: string;
  profileId: string | null;
  profile: Profile | null;
  timeOfDay: string;
  taken: boolean;
}

export async function fetchMedicines(): Promise<Medicine[]> {
  const { data } = await api.get<Medicine[]>('/api/medicines');
  return data;
}

export async function fetchTodayDoses(): Promise<TodayDose[]> {
  const { data } = await api.get<TodayDose[]>('/api/medicines/today');
  return data;
}

export async function createMedicine(input: MedicineInput): Promise<Medicine> {
  const { data } = await api.post<Medicine>('/api/medicines', input);
  return data;
}

export async function updateMedicine(id: string, input: MedicineInput): Promise<Medicine> {
  const { data } = await api.patch<Medicine>(`/api/medicines/${id}`, input);
  return data;
}

export async function deleteMedicine(id: string): Promise<void> {
  await api.delete(`/api/medicines/${id}`);
}

export async function markDoseTaken(input: { scheduleId: string; doseDate: string; taken: boolean }): Promise<void> {
  await api.post('/api/medicines/doses/taken', input);
}
