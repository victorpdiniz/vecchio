import { api } from './client';

export interface UsbFolderListing {
  path: string;
  folders: string[];
}

export interface UsbDrive {
  id: string;
  name: string;
}

export interface UsbDrivesResponse {
  drives: UsbDrive[];
  message: string | null;
}

export interface UsbCopyJob {
  id: string;
  status: 'em_andamento' | 'concluido' | 'erro';
  totalFiles: number;
  copiedFiles: number;
  message: string | null;
}

export async function fetchUsbFolders(path: string): Promise<UsbFolderListing> {
  const { data } = await api.get<UsbFolderListing>('/api/usb/folders', { params: { path } });
  return data;
}

export async function fetchUsbDrives(): Promise<UsbDrivesResponse> {
  const { data } = await api.get<UsbDrivesResponse>('/api/usb/drives');
  return data;
}

export async function startUsbCopy(sourcePath: string, driveId: string): Promise<UsbCopyJob> {
  const { data } = await api.post<UsbCopyJob>('/api/usb/copy', { sourcePath, driveId });
  return data;
}

export async function fetchUsbJob(id: string): Promise<UsbCopyJob> {
  const { data } = await api.get<UsbCopyJob>(`/api/usb/jobs/${id}`);
  return data;
}
