import type { EventKind, GioiTinh } from './common';

export interface CompetitionEvent {
  id: string;
  tournamentId: string;
  ten: string;
  loai: EventKind;
  gioiTinh: GioiTinh | 'ca_hai';
  nhomTuoi: number;
  hangCanHoacBaiQuyen: string;
  soTrongTai: number;
  congThucTinhDiem: string;
  hinhThucThi?: 'ca_nhan' | 'doi';
}

export interface Squad {
  id: string;
  eventId: string;
  ten: string;
  athleteIds: string[];
}