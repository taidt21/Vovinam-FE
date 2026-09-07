import type { Match } from '../../types';
import type { LiveMatchState } from '../../types/live';
import type { MatchLogEntry } from '../realtime/pressLightClient';
import { apiGet, apiPut } from './api';

export function fetchMatches(): Promise<Match[]> {
  return apiGet<Match[]>('/matches');
}

// Sửa đúng 1 trận — dùng cho mọi thao tác lúc thi đấu (bắt đầu, kết thúc,
// sửa kết quả, đấu lại). Gửi cả object Match cũng được — backend chỉ đọc
// đúng các trường nó cần (MatchUpdateDto), bỏ qua phần dư (id, eventId,
// nextMatchId...).
export function updateMatch(id: string, match: Match): Promise<void> {
  return apiPut(`/matches/${id}`, match);
}

export interface MatchReviewData {
  matchState: LiveMatchState | null;
  log: MatchLogEntry[];
}

// Dữ liệu cho tính năng "Xem lại trận đã kết thúc" — đọc thẳng từ 2
// bảng lưu lâu dài ở backend (KHÔNG qua SignalR/RAM — trận có thể đã
// kết thúc từ rất lâu, RAM của sân đó giờ đang phục vụ trận khác rồi).
export function fetchMatchReview(matchId: string): Promise<MatchReviewData> {
  return apiGet<MatchReviewData>(`/matches/${matchId}/xem-lai`);
}