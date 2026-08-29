export type QuyenTrangThai = 'cho_bat_dau' | 'dang_thi' | 'tam_dung' | 'da_ket_thuc';

export type LyDoKetThucQuyen =
  | 'hoan_thanh'
  | 'quen_bai'
  | 'dung_bai'
  | 'roi_vu_khi'
  | 'chan_thuong'
  | 'loi_may';

// 1 thành viên trong đội hình đồng đội — kèm ảnh đại diện (không chỉ tên)
// để màn hình công khai hiện được avatar từng người khi đội ít VĐV.
export interface ThanhVienQuyen {
  hoTen: string;
  anhDaiDien: string | null;
}

export interface LiveQuyenState {
  courtId: string;
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
  eventTen: string;
  performerLabel: string;
  performerSub: string;
  photoUrl: string | null;
  // Chỉ có giá trị (khác null) với nội dung đồng đội — từng VĐV trong đội
  // hình đang thi (tên + ảnh), để cả Bàn thư ký lẫn trọng tài biết đang
  // chấm cho đúng những ai, không chỉ tên đội chung chung.
  thanhVien: ThanhVienQuyen[] | null;
  trangThai: QuyenTrangThai;
  coGioiHan: boolean;
  thoiGianGioiHanGiay: number | null;
  // Luôn đếm LÊN từ 0 — nền tảng chung cho cả 2 kiểu hiển thị (đếm ngược
  // nếu có giới hạn, đếm lên nếu không), tránh phải làm 2 field riêng.
  thoiGianDaTroiGiay: number;
  capNhatDongHoLuc: number;
  lyDoKetThuc: LyDoKetThucQuyen | null;
  capNhatLuc: number;
}