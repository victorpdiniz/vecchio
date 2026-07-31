import { api } from './client';

export type ProfileRole = 'avo' | 'avo_f' | 'pai' | 'admin';

export interface Profile {
  id: string;
  name: string;
  role: ProfileRole;
  email: string;
  colorTag: string;
  avatarIcon: string;
  createdAt: string;
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data } = await api.get<Profile[]>('/api/profiles');
  return data;
}
