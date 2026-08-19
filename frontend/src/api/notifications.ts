import { api } from './client';
import type { AgendaItem } from './agenda';

export interface PendingMedicineDose {
  id: string;
  medicineId: string;
  scheduleId: string;
  doseDate: string;
  timeOfDay: string;
  takenAt: string | null;
  medicine: { name: string; dosage: string };
  notifications: { kind: string }[];
}

export interface PendingNotifications {
  agendaItems: AgendaItem[];
  medicineDoses: PendingMedicineDose[];
}

export async function fetchPendingNotifications(): Promise<PendingNotifications> {
  const { data } = await api.get<PendingNotifications>('/api/notifications/pending');
  return data;
}
