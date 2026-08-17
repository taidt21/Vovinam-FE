import { apiGet, apiDelete, apiPost } from './api';

export interface QuyenLuotHoanThanhWire {
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
  lyDo: string;
}

export function fetchQuyenLuotHoanThanh(): Promise<QuyenLuotHoanThanhWire[]> {
  return apiGet<QuyenLuotHoanThanhWire[]>('/quyen-luot-hoan-thanh');
}

export function markQuyenLuotHoanThanh(payload: QuyenLuotHoanThanhWire): Promise<void> {
  return apiPost<void>('/quyen-luot-hoan-thanh', payload);
}

// Cho thi lại = bỏ đánh dấu "đã xong" — không thì lịch tự động vẫn coi
// lượt này đã hoàn thành, không đưa lại vào hàng chờ.
export function unmarkQuyenLuotHoanThanh(
  eventId: string,
  athleteId: string | null,
  teamId: string | null,
): Promise<void> {
  const params = new URLSearchParams({ eventId });
  if (athleteId) params.set('athleteId', athleteId);
  if (teamId) params.set('teamId', teamId);
  return apiDelete(`/quyen-luot-hoan-thanh?${params.toString()}`);
}
