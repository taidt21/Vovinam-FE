export type MatchStatus = 'cho_thi' | 'dang_thi' | 'da_hoan_thanh';
export type LyDoKetThuc =
  | 'thang_diem'
  | 'diem_vang'
  | 'can_hang_can'
  | 'bo_cuoc'
  | 'dung_vi_y_te'
  | 'boc_tham';

export interface Match {
  id: string;
  eventId: string;
  courtId: string | null;     // null cho tới khi thư ký mở trận
  nextMatchId: string | null; // null nếu là trận chung kết
  // Người thắng trận này sẽ vào ô đỏ hay xanh của trận nextMatchId — dùng
  // để hiển thị "Thắng trận N" ở những ô chưa biết VĐV. Optional để không
  // phá các Match mẫu/tĩnh có sẵn (VD dữ liệu mẫu ở BanThuKy) không set field này.
  nextMatchSlot?: 'do' | 'xanh' | null;
  athleteRedId: string | null;
  athleteBlueId: string | null;
  vong: string; // "Vòng 16", "Tứ kết", "Bán kết", "Chung kết"
  trangThai: MatchStatus;
  lyDoKetThuc?: LyDoKetThuc;
  // ID của VĐV thắng trận — lưu thẳng ở đây thay vì chỉ suy ra qua ô đỏ/xanh
  // của nextMatchId, vì cách suy ra đó không xác định được với trận chung
  // kết (không có nextMatchId) và không cho sửa/đấu lại được. Optional +
  // cho phép null cùng lý do với nextMatchSlot ở trên: không phá dữ liệu
  // cũ/mẫu chưa từng set field này, và null nghĩa là "trận này chưa/không
  // còn xác định người thắng" (VD sau khi bấm đấu lại).
  nguoiThangId?: string | null;
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