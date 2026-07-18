import type { GioiTinh } from './common';

export interface Athlete {
  id: string;
  hoTen: string;
  namSinh: number;
  gioiTinh: GioiTinh;
  teamId: string;
  noiDung: string[];
  canNang?: number;
  nhomTuoi: string;

}

export interface Registration {
  id: string;
  athleteId: string;
  eventId: string;
}