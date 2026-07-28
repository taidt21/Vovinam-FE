import { apiGet, apiPut } from './api';

export interface QuyenResultWire {
  id: string;
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
  diem: number;
  diemTru: number;
  capNhatLuc: string;
}

export function fetchQuyenResults(): Promise<QuyenResultWire[]> {
  return apiGet<QuyenResultWire[]>('/quyen-results');
}

export function upsertQuyenResult(payload: {
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
  diem: number;
  diemTru: number;
}): Promise<QuyenResultWire> {
  return apiPut<QuyenResultWire>('/quyen-results', payload);
}