export interface DeductionEntry {
  moTa: string;
  diemTru: number;
}

export const DIEM_CHUAN_QUYEN = 100;

// Các lỗi hay gặp nhất, có căn cứ từ luật thi đấu Vovinam thật (Quyết định
// 304/QĐ-TCTDTT 2018) — không đầy đủ 100% mọi tiêu chí trong luật gốc (chỉ
// tra được từng phần qua tìm kiếm), nhưng đủ cho các trường hợp phổ biến.
// Lỗi không có trong danh sách này thì giám khảo tự nhập tay ở mục "Lỗi khác".
export const QUICK_DEDUCTIONS: DeductionEntry[] = [
  { moTa: 'Sai động tác rõ ràng', diemTru: 2 },
  { moTa: 'Ngập ngừng, sửa nhanh', diemTru: 2 },
  { moTa: 'Về sai vị trí kết thúc', diemTru: 2 },
  { moTa: 'Động tác chậm', diemTru: 2 },
  { moTa: 'Thiếu uy lực, thiếu mạnh mẽ', diemTru: 2 },
  { moTa: 'Biểu lộ mệt mỏi khi kết thúc', diemTru: 2 },
  { moTa: 'Vũ khí chạm thân (nhẹ)', diemTru: 2 },
  { moTa: 'Vũ khí chạm thân (nặng)', diemTru: 5 },
  { moTa: 'Vũ khí tuột tay, chụp lại kịp', diemTru: 5 },
  { moTa: 'Thiếu 1 đòn cơ bản', diemTru: 5 },
];

export function tinhDiemTuChiTiet(deductions: DeductionEntry[]): number {
  const tongTru = deductions.reduce((sum, d) => sum + d.diemTru, 0);
  return Math.max(0, DIEM_CHUAN_QUYEN - tongTru);
}