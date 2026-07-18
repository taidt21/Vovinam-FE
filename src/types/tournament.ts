import type { EventKind } from './common';

export type TournamentStatus = 'chuan_bi' | 'dang_thi' | 'ket_thuc';

export interface Tournament {
  id: string;
  ten: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  diaDiem: string;
  soSan: number;
  loaiThi: EventKind[];
  trangThai: TournamentStatus;
}

export interface Team {
  id: string;
  tournamentId: string;
  ten: string;
}

export interface Court {
  id: string;
  tournamentId: string;
  ten: string; // "Sân 1", "Sân 2"...
}