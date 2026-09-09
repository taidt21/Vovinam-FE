import { apiGet, apiDelete, apiPut } from './api';

export interface QuyenJudgeScoreWire {
  id: string;
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
  giamKhaoId: string;
  tenGiamKhao: string;
  diem: number;
  chiTietJson: string | null;
  capNhatLuc: string;
}

export function fetchQuyenJudgeScores(): Promise<QuyenJudgeScoreWire[]> {
  return apiGet<QuyenJudgeScoreWire[]>('/quyen-judge-scores');
}

export function upsertQuyenJudgeScore(payload: {
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
  giamKhaoId: string;
  tenGiamKhao: string;
  diem: number;
  chiTietJson: string | null;
}): Promise<QuyenJudgeScoreWire> {
  return apiPut<QuyenJudgeScoreWire>('/quyen-judge-scores', payload);
}

// Xoá sạch điểm của TẤT CẢ giám định cho đúng 1 lượt — dùng khi cho thi
// lại, để điểm chấm mới không bị trộn với điểm của lần thi hỏng trước.
export function deleteQuyenJudgeScores(
  eventId: string,
  athleteId: string | null,
  teamId: string | null,
): Promise<void> {
  const params = new URLSearchParams({ eventId });
  if (athleteId) params.set('athleteId', athleteId);
  if (teamId) params.set('teamId', teamId);
  return apiDelete(`/quyen-judge-scores?${params.toString()}`);
}

export interface QuyenScoreLockWire {
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
}

// Danh sách MỌI lượt đang bị khoá — dùng cho cả màn BTK (biết lượt nào
// đã khoá để hiện đúng trạng thái nút) lẫn màn trọng tài (tự khoá màn
// nhập nếu đúng lượt đang xem bị khoá).
export function fetchQuyenScoreLocks(): Promise<QuyenScoreLockWire[]> {
  return apiGet<QuyenScoreLockWire[]>('/quyen-judge-scores/locks');
}

export function lockQuyenScore(
  eventId: string,
  athleteId: string | null,
  teamId: string | null,
): Promise<void> {
  return apiPut('/quyen-judge-scores/lock', { eventId, athleteId, teamId });
}

export function unlockQuyenScore(
  eventId: string,
  athleteId: string | null,
  teamId: string | null,
): Promise<void> {
  const params = new URLSearchParams({ eventId });
  if (athleteId) params.set('athleteId', athleteId);
  if (teamId) params.set('teamId', teamId);
  return apiDelete(`/quyen-judge-scores/lock?${params.toString()}`);
}