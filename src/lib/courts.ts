export interface CourtBasic {
  id: string;
  ten: string;
}

// Danh sách sân dùng chung giữa Bàn thư ký và trang Trọng tài — tách riêng
// ra 1 nguồn để 2 trang luôn khớp courtId với nhau. Sau này có dữ liệu giải
// thật (số sân do BTC nhập ở Thiết lập giải), thay nguồn này bằng dữ liệu
// giải thật, phần còn lại của 2 trang không cần đổi gì.
export const COURTS: CourtBasic[] = [
  { id: 'c1', ten: 'Sân 1' },
  { id: 'c2', ten: 'Sân 2' },
];
