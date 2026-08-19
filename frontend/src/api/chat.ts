import { api } from './client';
import type { AgendaItem } from './agenda';

export type ProposedActionKind = 'none' | 'mark_bill_paid' | 'create_appointment';

export interface ProposedAction {
  kind: ProposedActionKind;
  billId?: string;
  appointmentTitle?: string;
  appointmentCategory?: string;
  appointmentStartAt?: string;
  appointmentIsAllDay?: boolean;
  appointmentAmount?: number;
  confirmationPrompt?: string;
}

export interface ChatMessage {
  id: string;
  profileId: string;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
  agendaItems: AgendaItem[];
  proposedAction: ProposedAction | null;
  proposedActionStatus: 'pending' | 'confirmed' | 'cancelled' | null;
}

export interface ChatAnswer {
  answer: string;
  agendaItems: AgendaItem[];
  proposedAction: ProposedAction;
  messageId: string;
}

export async function fetchChatHistory(): Promise<ChatMessage[]> {
  const { data } = await api.get<ChatMessage[]>('/api/chat/history');
  return data;
}

export async function sendChatMessage(message: string): Promise<ChatAnswer> {
  const { data } = await api.post<ChatAnswer>('/api/chat/messages', { message });
  return data;
}

export async function confirmChatAction(messageId: string): Promise<{ resultText: string; messageId: string }> {
  const { data } = await api.post(`/api/chat/messages/${messageId}/confirm-action`);
  return data;
}

export async function cancelChatAction(messageId: string): Promise<{ cancelled: boolean }> {
  const { data } = await api.post(`/api/chat/messages/${messageId}/cancel-action`);
  return data;
}

export async function clearChatHistory(): Promise<void> {
  await api.delete('/api/chat/history');
}
