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