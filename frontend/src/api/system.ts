import { api } from './client';

export interface UpdateStatus {
  updateAvailable: boolean;
  currentCommit: string | null;
  remoteCommit: string | null;
  commitsBehind: number;
  remoteSummary: string | null;
  triggeredAt: string | null;
  checkError: string | null;
}

export async function fetchUpdateStatus(): Promise<UpdateStatus> {
  const { data } = await api.get<UpdateStatus>('/api/system/update-status');
  return data;
}

export async function triggerUpdate(): Promise<{ triggeredAt: string }> {
  const { data } = await api.post<{ triggeredAt: string }>('/api/system/update');
  return data;
}
