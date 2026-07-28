import type { EventKind, GioiTinh } from './common';

export interface CompetitionEvent {
  id: string;
  tournamentId: string;
  ten: string;
  loai: EventKind;
  gioiTinh: GioiTinh | 'hon_hop';
  nhomTuoi: number | 'hon_hop';
  hangCan?: number; // chỉ đối kháng
  thoiGianBaiGiay?: number; // chỉ quyền
  hinhThucThi?: 'ca_nhan' | 'doi';
}

export interface Squad {
  id: string;
  eventId: string;
  ten: string;
  athleteIds: string[];
}