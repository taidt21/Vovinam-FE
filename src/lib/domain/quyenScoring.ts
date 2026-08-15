// 5 điểm -> bỏ cao nhất + thấp nhất -> CỘNG THẲNG 3 điểm giữa (không chia
// lại cho 3). Chỉ tính khi có ĐỦ ĐÚNG 5 điểm — thiếu/thừa đều trả về null,
// không đoán/nội suy.
export function tinhDiemQuyenTongHop(diemList: number[]): number | null {
  if (diemList.length !== 5) return null;
  const sorted = [...diemList].sort((a, b) => a - b);
  const baGiua = sorted.slice(1, 4);
  return baGiua.reduce((sum, d) => sum + d, 0);
}