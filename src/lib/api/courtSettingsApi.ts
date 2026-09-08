import { apiGet, apiPut } from './api';

export interface CourtSettings {
  courtId: string;
  tongSoHiep: number;
  thoiGianHiepGiay: number;
  thoiGianNghiGiay: number;
}

// Đọc cài đặt riêng của 1 sân — backend LUÔN trả về giá trị hợp lệ
// (mặc định nếu sân đó chưa từng tuỳ chỉnh), không có trường hợp lỗi
// "chưa có gì" cần tự xử lý riêng ở đây.
export function fetchCourtSettings(courtId: string): Promise<CourtSettings> {
  return apiGet<CourtSettings>(`/court-settings/${courtId}`);
}

export function updateCourtSettings(
  courtId: string,
  settings: Omit<CourtSettings, 'courtId'>,
): Promise<void> {
  return apiPut(`/court-settings/${courtId}`, { courtId, ...settings });
}
