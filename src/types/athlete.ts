import type { GioiTinh } from './common';

export interface Athlete {
  id: string;
  hoTen: string;
  namSinh: number;
  gioiTinh: GioiTinh;
  nhomTuoi: number;
  teamId: string;
  noiDung: string[];
  canNang?: number;
  // URL ảnh đại diện VĐV. Optional vì hiện chưa có nơi nhập/upload ảnh —
  // chỉ mới có chỗ HIỂN THỊ (Bàn thư ký, Màn hình công khai) sẵn sàng dùng
  // ngay khi có dữ liệu thật. Athlete nào chưa có ảnh thì UI tự hiện avatar
  // chữ cái đầu tên (xem components/AthleteAvatar).
  anhDaiDien?: string | null;
}

// Dạng dữ liệu thô đúng như trong athletes.json — dùng chung cho cả
// Đoàn & VĐV lẫn Nội dung & Bốc thăm, tránh khai báo trùng 2 nơi.
export type AthleteRecord = Omit<Athlete, 'noiDung' | 'canNang'> & { eventIds: string[] };

export interface Registration {
  id: string;
  athleteId: string;
  eventId: string;
}