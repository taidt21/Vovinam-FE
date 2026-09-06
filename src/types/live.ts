import type { LyDoKetThuc } from './match';

/**
 * Trạng thái điều hành 1 trận ĐANG diễn ra tại 1 sân — dữ liệu "sống", chỉ
 * tồn tại trong lúc thi đấu. Khác với Match.trangThai (chờ_thi/đang_thi/
 * đã_hoàn_thành — dữ liệu bảng đấu lâu dài), LiveMatchState mô tả chi tiết
 * hiệp/đồng hồ/điểm đang chạy, và CHỈ do Bàn thư ký ghi (single writer) —
 * tránh việc nhiều người cùng ghi đè khi chưa có backend thật xử lý tranh
 * chấp ghi đồng thời.
 */
export type DieuHanhTrangThai =
  | 'cho_bat_dau' // đã mở vào sân, đồng hồ hiệp 1 chưa từng chạy
  | 'dang_thi' // đồng hồ đang đếm ngược, trọng tài biên được chấm điểm
  | 'tam_dung' // đang thi nhưng thư ký bấm tạm dừng — trọng tài biên bị khóa
  | 'nghi_giua_hiep' // hết giờ 1 hiệp, chờ thư ký bấm bắt đầu hiệp kế
  | 'da_ket_thuc'; // đã có kết quả chính thức

export interface LiveMatchState {
  matchId: string;
  courtId: string;

  // Thông tin hiển thị — nhúng thẳng chuỗi tên (không chỉ id) vì trang
  // Trọng tài là 1 route/thiết bị riêng, không có sẵn context tra cứu
  // event/athlete như trang Bàn thư ký.
  tenNoiDung: string;
  vong: string;
  tenDo: string;
  donViDo: string;
  anhDo?: string | null;
  tenXanh: string;
  donViXanh: string;
  anhXanh?: string | null;

  trangThai: DieuHanhTrangThai;
  hiepHienTai: number; // 0 = chưa bắt đầu, 1..tongSoHiep = hiệp chính, > tongSoHiep = hiệp Điểm vàng
  tongSoHiep: number; // mặc định 3, khóa lại sau khi bắt đầu hiệp 1

  thoiGianHiepGiay: number; // độ dài 1 hiệp — mặc định 120s, khóa sau khi bắt đầu
  thoiGianNghiGiay: number; // nghỉ giữa hiệp — mặc định 60s
  thoiGianConLaiGiay: number; // số giây còn lại TẠI capNhatDongHoLuc
  capNhatDongHoLuc: number; // epoch ms — dùng để các tab tự nội suy đồng hồ, không cần bắn broadcast mỗi giây

  // Epoch ms — đặt LẠI (Date.now() mới) mỗi khi 1 hiệp THẬT SỰ kết thúc
  // do hết giờ (cả 3 nhánh trong effect "hết giờ" của
  // DieuHanhDoiKhangTab.tsx đều set field này). Dùng làm tín hiệu RÕ
  // RÀNG cho chuông báo hết hiệp (useMatchBell) — KHÔNG suy luận qua
  // trangThai/thoiGianConLaiGiay nữa, vì 2 field đó nhận giá trị KHÁC
  // NHAU tuỳ từng nhánh (VD hết hiệp thường thì thoiGianConLaiGiay
  // được đặt THÀNH thời gian nghỉ giữa hiệp, không phải 0 — kiểm tra
  // == 0 chỉ đúng cho đúng 1 trong 3 nhánh, bỏ sót các nhánh còn lại).
  hetHiepLuc: number;

  soTrongTaiCanCo: number; // mặc định 3, thư ký chỉnh trước khi bắt đầu hiệp 1

  diemChinhThucDo: number;
  diemChinhThucXanh: number;
  diemDaChinhTay: boolean; // true nếu thư ký từng bấm +/- tay, tạm ngưng tự tính theo trọng tài biên

  // TRƯỚC ĐÂY đặt tên "canhCaoDo/Xanh" nhưng thực chất đây là "nhắc nhở"
  // (nhẹ — đủ 3 lần thì trừ 2 điểm rồi reset về 0, KHÔNG dẫn tới xử
  // thua). Đổi tên cho đúng bản chất, để dành đúng tên "canhCao" cho
  // khái niệm CẢNH CÁO thật ngay dưới đây (nặng hơn hẳn — đủ 3 lần xử
  // thua ngay lập tức, không reset).
  nhacNhoDo: number;
  nhacNhoXanh: number;

  // Cảnh cáo THẬT — mỗi lần nhắc nhở đủ 3 (xem nhacNhoDo/Xanh ở trên)
  // thì +1 vào CẢ ĐÂY LẪN soCanhCaoHiepDo/Xanh ngay dưới, cùng lúc.
  //
  // Đây là tổng CẢ TRẬN, không reset theo hiệp (chỉ reset khi "Đấu lại
  // từ đầu"). Đủ 4 (cả trận) -> xử thua ngay lập tức, BẤT KỂ mỗi hiệp
  // riêng lẻ có đủ 3 hay không (VD hiệp 1 bị 2, hiệp 2 bị thêm 2 nữa —
  // không hiệp nào riêng lẻ đủ 3, nhưng tổng 2 hiệp đã đủ 4 -> vẫn thua
  // theo đúng luật này).
  soCanhCaoDo: number;
  soCanhCaoXanh: number;

  // Cảnh cáo trong ĐÚNG hiệp hiện tại — tự reset về 0 mỗi khi bắt đầu
  // hiệp mới (khác hẳn soCanhCaoDo/Xanh ở trên, không bao giờ reset).
  // Đủ 3 TRONG CÙNG 1 HIỆP -> xử thua ngay lập tức, dù tổng cả trận
  // (soCanhCaoDo/Xanh) có khi chưa tới 4.
  soCanhCaoHiepDo: number;
  soCanhCaoHiepXanh: number;

  nguoiThang: 'do' | 'xanh' | null;
  lyDoKetThuc?: LyDoKetThuc;

  capNhatLuc: number; // epoch ms lần ghi gần nhất — hiển thị "đã đồng bộ lúc..."
}

/** Điểm của riêng 1 trọng tài biên chấm cho 1 trận — mỗi trọng tài chỉ ghi vào đúng bản ghi của chính mình. */
export interface DiemTrongTai {
  matchId: string;
  courtId: string;
  giamDinhId: string;
  tenTrongTai: string;
  diemDo: number;
  diemXanh: number;
  capNhatLuc: number;
}

/** Danh tính 1 thiết bị trọng tài biên — lưu cục bộ trên chính thiết bị đó. */
export interface RefereeIdentity {
  giamDinhId: string;
  tenTrongTai: string;
  courtId: string;
}
