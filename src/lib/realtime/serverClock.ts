import { apiGet } from '../api/api';

let offsetMs = 0;

// Ước lượng độ lệch giữa đồng hồ máy này và đồng hồ server — bù trừ độ
// trễ mạng bằng cách giả định đường đi/về mất thời gian bằng nhau (kiểu
// NTP đơn giản hoá). Gọi định kỳ để bù dần nếu đồng hồ máy trôi theo thời
// gian — máy không nối Internet để tự chỉnh giờ có thể lệch dần cả ngày
// thi đấu.
export async function calibrateServerClock(): Promise<void> {
  try {
    const t0 = Date.now();
    const serverMs = await apiGet<number>('/time');
    const t1 = Date.now();
    const roundTrip = t1 - t0;
    const serverTimeAtT1 = serverMs + roundTrip / 2;
    offsetMs = serverTimeAtT1 - t1;
  } catch {
    // Giữ nguyên offset cũ (hoặc 0 nếu chưa từng đo được) — không có
    // server để so thì thà lệch hơn là crash.
  }
}

// "Giờ hiện tại" theo ước lượng đồng hồ SERVER — dùng hàm này thay cho
// Date.now() ở MỌI nơi liên quan tới đồng hồ trận đấu, để mọi thiết bị
// (dù đồng hồ Windows riêng lệch nhau) tính ra cùng 1 kết quả.
export function serverNow(): number {
  return Date.now() + offsetMs;
}