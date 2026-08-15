import { apiGet } from '../api/api';

export interface CourtBasic {
  id: string;
  ten: string;
}

interface TournamentWire {
  id: string;
  ten: string;
  soSan: number;
}

// Số sân giờ lấy từ đúng "Số sân/thảm" đã cấu hình ở Thiết lập giải —
// không còn hardcode cứng nữa. Sinh ra đúng N sân theo con số đó, đặt tên
// tuần tự c1..cN / "Sân 1".."Sân N".
export async function fetchCourts(): Promise<CourtBasic[]> {
  const tournament = await apiGet<TournamentWire>('/tournament');
  const soSan = Math.max(1, tournament.soSan || 1);
  return Array.from({ length: soSan }, (_, i) => ({
    id: `c${i + 1}`,
    ten: `Sân ${i + 1}`,
  }));
}