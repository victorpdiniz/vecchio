import { api } from './client';
import type { AgendaItem } from './agenda';

export async function fetchPendingNotifications(): Promise<AgendaItem[]> {
  const { data } = await api.get<AgendaItem[]>('/api/notifications/pending');
  return data;
}
