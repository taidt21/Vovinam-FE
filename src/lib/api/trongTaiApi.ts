import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from './api';

export interface TrongTaiWire {
  id: string;
  hoTen: string;
  courtId: string | null;
  thuTuGiamDinh: number | null;
  donVi: string | null;
  anhDaiDien: string | null;
}

export interface TrongTaiUpsertPayload {
  hoTen: string;
  courtId: string | null;
  thuTuGiamDinh: number | null;
  donVi: string | null;
}

export function fetchTrongTai(): Promise<TrongTaiWire[]> {
  return apiGet<TrongTaiWire[]>('/trong-tai');
}

export function createTrongTai(payload: TrongTaiUpsertPayload): Promise<TrongTaiWire> {
  return apiPost<TrongTaiWire>('/trong-tai', payload);
}

export function updateTrongTai(id: string, payload: TrongTaiUpsertPayload): Promise<void> {
  return apiPut<void>(`/trong-tai/${id}`, payload);
}

export function deleteTrongTai(id: string): Promise<void> {
  return apiDelete(`/trong-tai/${id}`);
}

export function uploadTrongTaiAnh(id: string, file: File): Promise<TrongTaiWire> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<TrongTaiWire>(`/trong-tai/${id}/anh`, formData);
}
