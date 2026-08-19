import { api } from './client';
import type { Profile } from './profiles';

export type AgendaCategory = 'consulta' | 'exame' | 'conta' | 'remedio' | 'viagem' | 'outro';
export type RecurrenceRule = 'diaria' | 'semanal' | 'mensal' | 'anual';
export type ReminderUnit = 'minutes' | 'hours' | 'days' | 'weeks';

export interface Bill {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  category: string;
  isRecurring: boolean;
  recurrenceRule: string | null;
  status: 'pendente' | 'pago';
  payerProfileId: string | null;
  payerProfile: Profile | null;
  paidAt: string | null;
}

export interface Attachment {
  id: string;
  billId: string;
  filename: string;
  storagePath: string;
  uploadedById: string;
  uploadedAt: string;
}

// Espelha os dois "formatos" de lembrete do backend (ver reminders.ts):
// "relative" para compromissos com hora ("30 minutos antes"), "allday" para
// compromissos de dia inteiro ("1 dia antes, às 09:00").
export interface RelativeReminderInput {
  kind: 'relative';
  amount: number;
  unit: ReminderUnit;
}

export interface AllDayReminderInput {
  kind: 'allday';
  daysBefore: number;
  atHour: number;
  atMinute: number;
}

export type ReminderInput = RelativeReminderInput | AllDayReminderInput;

export interface AgendaReminder {
  id: string;
  kind: 'relative' | 'allday';
  amount: number | null;
  unit: ReminderUnit | null;
  daysBefore: number | null;
  atHour: number | null;
  atMinute: number | null;
  triggerAt: string;
  label: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  category: AgendaCategory;
  isAllDay: boolean;
  startAt: string;
  endAt: string | null;
  billId: string | null;
  bill: Bill | null;
  recurrenceRule: RecurrenceRule | null;
  recurrenceGroupId: string | null;
  recurrenceEndDate: string | null;
  googleEventId: string | null;
  createdAt: string;
  updatedAt: string;
  reminders: AgendaReminder[];
}

export interface AgendaItemInput {
  title: string;
  category: AgendaCategory;
  isAllDay: boolean;
  startAt: string;
  endAt?: string;
  amount?: number;
  reminders: ReminderInput[];
  recurrence?: { rule: RecurrenceRule; endDate?: string };
}

export async function fetchAgendaItems(from: Date, to: Date): Promise<AgendaItem[]> {
  const { data } = await api.get<AgendaItem[]>('/api/agenda', {
    params: { from: from.toISOString(), to: to.toISOString() },
  });
  return data;
}

export async function fetchAgendaItem(id: string): Promise<AgendaItem> {
  const { data } = await api.get<AgendaItem>(`/api/agenda/${id}`);
  return data;
}

export async function fetchAgendaSummary(from: Date, to: Date): Promise<{ total: number; count: number }> {
  const { data } = await api.get<{ total: number; count: number }>('/api/agenda/summary', {
    params: { from: from.toISOString(), to: to.toISOString() },
  });
  return data;
}

export async function createAgendaItem(input: AgendaItemInput): Promise<AgendaItem[]> {
  const { data } = await api.post<AgendaItem[]>('/api/agenda', input);
  return data;
}

export async function updateAgendaItem(id: string, input: AgendaItemInput): Promise<AgendaItem> {
  const { data } = await api.patch<AgendaItem>(`/api/agenda/${id}`, input);
  return data;
}

export async function deleteAgendaItem(id: string): Promise<void> {
  await api.delete(`/api/agenda/${id}`);
}

export async function deleteAgendaSeries(recurrenceGroupId: string): Promise<{ deleted: number }> {
  const { data } = await api.delete<{ deleted: number }>(`/api/agenda/series/${recurrenceGroupId}`);
  return data;
}
