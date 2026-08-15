import { apiGet, apiPut } from './api';

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