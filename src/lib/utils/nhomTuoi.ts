export const NHOM_TUOI_OPTIONS = [1, 2, 3, 4];

// Riêng cho nội dung thi — chỉ nội dung mới được phép "hỗn hợp" nhóm
// tuổi (VD Võ nhạc trải nhiều nhóm cùng lúc). VĐV vẫn luôn thuộc đúng 1
// nhóm cụ thể, không bao giờ hỗn hợp — athlete vẫn dùng NHOM_TUOI_OPTIONS
// ở trên, không đụng gì.
export const EVENT_NHOM_TUOI_OPTIONS: (number | 'hon_hop')[] = [1, 2, 3, 4, 'hon_hop'];

export function formatEventNhomTuoi(nt: number | 'hon_hop'): string {
  return nt === 'hon_hop' ? 'Hỗn hợp' : `Nhóm tuổi ${nt}`;
}

// "hon_hop" luôn xếp cuối cùng khi sắp xếp, không tham gia phép trừ số.
export function compareNhomTuoi(a: number | 'hon_hop', b: number | 'hon_hop'): number {
  if (a === b) return 0;
  if (a === 'hon_hop') return 1;
  if (b === 'hon_hop') return -1;
  return a - b;
}

// Backend lưu nhomTuoi dạng int thuần — quy ước riêng: 0 = "hỗn hợp",
// 1-4 giữ đúng nghĩa cũ. 2 hàm dưới là ranh giới DUY NHẤT chuyển đổi qua
// lại giữa quy ước đó và 'hon_hop' dùng ở tầng giao diện.
export function nhomTuoiToWire(nt: number | 'hon_hop'): number {
  return nt === 'hon_hop' ? 0 : nt;
}

export function nhomTuoiFromWire(n: number): number | 'hon_hop' {
  return n === 0 ? 'hon_hop' : n;
}