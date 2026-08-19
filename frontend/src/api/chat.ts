import { api } from './client';
import type { AgendaItem } from './agenda';

export interface ChatMessage {
  id: string;
  profileId: string;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
  agendaItems: AgendaItem[];
}

export interface ChatAnswer {
  answer: string;
  agendaItems: AgendaItem[];
}

export async function fetchChatHistory(): Promise<ChatMessage[]> {
  const { data } = await api.get<ChatMessage[]>('/api/chat/history');
  return data;
}

export async function sendChatMessage(message: string): Promise<ChatAnswer> {
  const { data } = await api.post<ChatAnswer>('/api/chat/messages', { message });
  return data;
}
