import { apiGet, apiPost, apiPut, apiDelete } from './api';

export interface TrongTaiWire {
  id: string;
  hoTen: string;
  courtId: string | null;
  thuTuGiamDinh: number | null;
}

export interface TrongTaiUpsertPayload {
  hoTen: string;
  courtId: string | null;
  thuTuGiamDinh: number | null;
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
