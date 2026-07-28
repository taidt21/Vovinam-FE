import type { Match } from '../types';
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