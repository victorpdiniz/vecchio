import { api } from './client';

export interface PasswordRecord {
  id: string;
  siteName: string;
  url: string | null;
  username: string;
  password: string;
  notes: string | null;
  ownerProfileId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordInput {
  siteName: string;
  url?: string;
  username: string;
  password: string;
  notes?: string;
}

export async function fetchPasswords(search?: string): Promise<PasswordRecord[]> {
  const { data } = await api.get<PasswordRecord[]>('/api/passwords', { params: { search } });
  return data;
}

export async function createPassword(input: PasswordInput): Promise<PasswordRecord> {
  const { data } = await api.post<PasswordRecord>('/api/passwords', input);
  return data;
}

export async function updatePassword(id: string, input: PasswordInput): Promise<PasswordRecord> {
  const { data } = await api.patch<PasswordRecord>(`/api/passwords/${id}`, input);
  return data;
}

export async function deletePassword(id: string): Promise<void> {
  await api.delete(`/api/passwords/${id}`);
}
