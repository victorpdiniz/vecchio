import { api } from './client';
import type { Attachment } from './agenda';
import type { Profile } from './profiles';

export type BillCategory =
  | 'luz'
  | 'agua'
  | 'internet'
  | 'telefone'
  | 'aluguel'
  | 'saude'
  | 'mercado'
  | 'outro';
export type BillStatus = 'pendente' | 'pago';
export type RecurrenceRule = 'diaria' | 'semanal' | 'mensal' | 'anual';

export interface BillRecord {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  category: BillCategory;
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule | null;
  status: BillStatus;
  payerProfileId: string | null;
  payerProfile: Profile | null;
  paidAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}

export interface BillInput {
  description: string;
  amount: number;
  dueDate: string;
  category: BillCategory;
  payerProfileId?: string;
  recurrence?: { rule: RecurrenceRule; endDate?: string };
}

export interface BillsFilters {
  from?: Date;
  to?: Date;
  status?: BillStatus;
  category?: BillCategory;
}

export interface BillsSummary {
  total: number;
  count: number;
  byCategory: { category: string; total: number; count: number }[];
}

export async function fetchBills(filters: BillsFilters = {}): Promise<BillRecord[]> {
  const { data } = await api.get<BillRecord[]>('/api/bills', {
    params: {
      from: filters.from?.toISOString(),
      to: filters.to?.toISOString(),
      status: filters.status,
      category: filters.category,
    },
  });
  return data;
}

export async function fetchBill(id: string): Promise<BillRecord> {
  const { data } = await api.get<BillRecord>(`/api/bills/${id}`);
  return data;
}

export async function fetchBillsSummary(from: Date, to: Date): Promise<BillsSummary> {
  const { data } = await api.get<BillsSummary>('/api/bills/summary', {
    params: { from: from.toISOString(), to: to.toISOString() },
  });
  return data;
}

export async function createBill(input: BillInput): Promise<BillRecord[]> {
  const { data } = await api.post<BillRecord[]>('/api/bills', input);
  return data;
}

export async function updateBill(id: string, input: BillInput): Promise<BillRecord> {
  const { data } = await api.patch<BillRecord>(`/api/bills/${id}`, input);
  return data;
}

export async function setBillPaid(id: string, paid: boolean): Promise<BillRecord> {
  const { data } = await api.patch<BillRecord>(`/api/bills/${id}/pago`, { paid });
  return data;
}

export async function deleteBill(id: string): Promise<void> {
  await api.delete(`/api/bills/${id}`);
}

export async function uploadBillAttachment(billId: string, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<Attachment>(`/api/bills/${billId}/attachments`, formData);
  return data;
}

export async function deleteBillAttachment(attachmentId: string): Promise<void> {
  await api.delete(`/api/bills/attachments/${attachmentId}`);
}
