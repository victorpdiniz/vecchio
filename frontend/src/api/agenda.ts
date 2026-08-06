import { api } from './client';
import type { Profile } from './profiles';

export type AgendaCategory = 'consulta' | 'exame' | 'conta' | 'remedio' | 'outro';
export type RecurrenceRule = 'diaria' | 'semanal' | 'mensal' | 'anual';

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
  billId: string | null;
  agendaItemId: string | null;
  filename: string;
  storagePath: string;
  uploadedById: string;
  uploadedAt: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  description: string | null;
  category: AgendaCategory;
  location: string | null;
  startAt: string;
  endAt: string | null;
  ownerProfileId: string | null;
  ownerProfile: Profile | null;
  isPrivate: boolean;
  reminderDaysBefore: number | null;
  billId: string | null;
  bill: Bill | null;
  recurrenceRule: RecurrenceRule | null;
  recurrenceGroupId: string | null;
  recurrenceEndDate: string | null;
  googleEventId: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}

export interface AgendaItemInput {
  title: string;
  description?: string;
  category: AgendaCategory;
  location?: string;
  startAt: string;
  endAt?: string;
  isPrivate?: boolean;
  reminderDaysBefore?: number;
  amount?: number;
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

export async function uploadAttachment(agendaItemId: string, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<Attachment>(`/api/agenda/${agendaItemId}/attachments`, formData);
  return data;
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await api.delete(`/api/agenda/attachments/${attachmentId}`);
}
