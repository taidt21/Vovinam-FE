export type MatchStatus = 'cho_thi' | 'dang_thi' | 'da_hoan_thanh';
export type LyDoKetThuc =
  | 'thang_diem'
  | 'doi_thu_khong_thi_dau'
  | 'bo_cuoc'
  | 'dung_vi_y_te'
  | 'truat_quyen';

export interface Match {
  id: string;
  eventId: string;
  courtId: string | null;     // null cho tới khi thư ký mở trận
  nextMatchId: string | null; // null nếu là trận chung kết
  athleteRedId: string | null;
  athleteBlueId: string | null;
  vong: string; // "Vòng 16", "Tứ kết", "Bán kết", "Chung kết"
  trangThai: MatchStatus;
  lyDoKetThuc?: LyDoKetThuc;
}

export interface Score {
  id: string;
  matchId: string;
  giamDinhId: string; // userId của trọng tài chấm
  diem: number;
  diemTru?: number;
}

export type ResultStatus = 'chua_co' | 'cho_xac_nhan' | 'da_xac_nhan';

export interface Result {
  id: string;
  eventId: string;
  athleteId: string;
  hang: number; // 1, 2, 3 — đối kháng có 2 người cùng hạng 3
  trangThai: ResultStatus;
  lyDoSua?: string; // bắt buộc khi sửa sau khi đã xác nhận
}