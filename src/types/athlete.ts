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
}

// Dạng dữ liệu thô đúng như trong athletes.json — dùng chung cho cả
// Đoàn & VĐV lẫn Nội dung & Bốc thăm, tránh khai báo trùng 2 nơi.
export type AthleteRecord = Omit<Athlete, 'noiDung' | 'canNang'> & { eventIds: string[] };

export interface Registration {
  id: string;
  athleteId: string;
  eventId: string;
}