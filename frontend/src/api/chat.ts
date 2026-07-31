import { api } from './client';

export interface ChatMessage {
  id: string;
  profileId: string;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
}

export async function fetchChatHistory(): Promise<ChatMessage[]> {
  const { data } = await api.get<ChatMessage[]>('/api/chat/history');
  return data;
}

export async function sendChatMessage(message: string): Promise<string> {
  const { data } = await api.post<{ answer: string }>('/api/chat/messages', { message });
  return data.answer;
}
