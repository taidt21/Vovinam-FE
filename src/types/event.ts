import type { EventKind, GioiTinh } from './common';

export interface CompetitionEvent {
  id: string;
  tournamentId: string;
  ten: string;
  loai: EventKind;
  gioiTinh: GioiTinh | 'ca_hai'; // song luyện/đồng đội có thể cả 2
  nhomTuoi: string; // "15-17"
  hangCanHoacBaiQuyen: string;
  soTrongTai: number;
  congThucTinhDiem: string;
}