import { api } from './client';

export interface GoogleCalendarStatus {
  configured: boolean;
  connected: boolean;
}

export async function fetchGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  const { data } = await api.get<GoogleCalendarStatus>('/api/google-calendar/status');
  return data;
}

export async function fetchGoogleAuthUrl(): Promise<string> {
  const { data } = await api.get<{ url: string }>('/api/google-calendar/auth-url');
  return data.url;
}

export async function disconnectGoogleCalendar(): Promise<void> {
  await api.delete('/api/google-calendar/connection');
}
