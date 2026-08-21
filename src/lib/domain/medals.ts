import type { Match } from '../../types';
import type { QuyenJudgeScoreWire } from '../api/quyenJudgeScoreApi';
import { tinhDiemQuyenTongHop } from './quyenScoring';

/* ============ Đối kháng ============ */



export interface DoiKhangMedals {
  vang: string;
  bac: string;
  dong: string[]; // 0, 1 hoặc 2 người — thua bán kết đồng hạng ba, không có trận tranh hạng 3
}

// null nghĩa là CHƯA xong (chưa có kết quả chung kết).
export function computeDoiKhangMedals(matches: Match[]): DoiKhangMedals | null {
  const final = matches.find((m) => !m.nextMatchId);
  if (!final || final.trangThai !== 'da_hoan_thanh' || !final.nguoiThangId) return null;

  const vang = final.nguoiThangId;
  const bac = final.athleteRedId === vang ? final.athleteBlueId : final.athleteRedId;
  if (!bac) return null;

  const semifinals = matches.filter((m) => m.nextMatchId === final.id);
  const dong = semifinals
    .filter((m) => m.trangThai === 'da_hoan_thanh' && m.nguoiThangId)
    .map((m) => (m.athleteRedId === m.nguoiThangId ? m.athleteBlueId : m.athleteRedId))
    .filter((id): id is string => !!id);

  return { vang, bac, dong };
}

/* ============ Quyền ============ */

export interface QuyenRankingEntry {
  athleteId: string | null;
  teamId: string | null;
  diem: number;
  hang: number; // 1 = vàng, 2 = bạc, 3 = đồng — bằng điểm tổng là ĐỒNG
  // hạng, không có hiệu số phụ nào phá hoà (giống cách đối kháng cho
  // phép đồng hạng ba).
}

// scores PHẢI đã lọc sẵn đúng 1 nội dung trước khi gọi hàm này.
export function computeQuyenRanking(
  items: { athleteId: string | null; teamId: string | null }[],
  scores: QuyenJudgeScoreWire[],
): { hoanThanh: boolean; ranking: QuyenRankingEntry[] } {
  if (items.length === 0) return { hoanThanh: false, ranking: [] };

  const withScores = items.map((item) => {
    const myScores = scores.filter(
      (s) => s.athleteId === item.athleteId && s.teamId === item.teamId,
    );
    const diemList = myScores.map((s) => s.diem);
    return {
      ...item,
      diem: tinhDiemQuyenTongHop(diemList),
      count: myScores.length,
    };
  });

  const hoanThanh = withScores.every((r) => r.count === 5);
  if (!hoanThanh) return { hoanThanh: false, ranking: [] };

  const sorted = [...withScores].sort((a, b) => (b.diem ?? 0) - (a.diem ?? 0));
  const ranking: QuyenRankingEntry[] = [];
  let hang = 1;
  sorted.forEach((r, i) => {
    const prev = sorted[i - 1];
    if (i > 0 && r.diem !== prev.diem) hang = i + 1;
    ranking.push({ athleteId: r.athleteId, teamId: r.teamId, diem: r.diem!, hang });
  });
  return { hoanThanh: true, ranking };
}
export interface MedalTally {
  teamId: string;
  vang: number;
  bac: number;
  dong: number;
  // Hệ số tạm thời để xếp hạng tổng đoàn — không phải điểm quyền/đối
  // kháng của từng VĐV, chỉ là cách quy đổi huy chương ra 1 con số duy
  // nhất để so sánh giữa các đoàn.
  diem: number;
}

// Gộp huy chương của MỌI đơn vị qua tất cả nội dung đã xong — đối kháng
// (từng mảng matches, 1 mảng/nội dung) lẫn quyền (từng cặp items+scores,
// 1 cặp/nội dung). athletes chỉ cần đúng 2 trường id/teamId để tra cứu
// đơn vị của VĐV, không cần nguyên object đầy đủ. heSo lấy từ cấu hình
// giải (Tournament.HeSoVang/Bac/Dong), BTC tự chỉnh theo quy chế — mặc
// định 50/20/10 nếu chưa cấu hình gì.
export function computeMedalTally(
  doiKhangMatchesByEvent: Match[][],
  quyenDataByEvent: {
    items: { athleteId: string | null; teamId: string | null }[];
    scores: QuyenJudgeScoreWire[];
  }[],
  athletes: { id: string; teamId: string }[],
  heSo: { vang: number; bac: number; dong: number } = { vang: 50, bac: 20, dong: 10 },
): MedalTally[] {
  const athleteTeamId = (athleteId: string) =>
    athletes.find((a) => a.id === athleteId)?.teamId ?? null;

  const tally = new Map<string, Omit<MedalTally, 'diem'>>();
  const bump = (teamId: string | null | undefined, field: 'vang' | 'bac' | 'dong') => {
    if (!teamId) return;
    if (!tally.has(teamId)) tally.set(teamId, { teamId, vang: 0, bac: 0, dong: 0 });
    tally.get(teamId)![field]++;
  };

  for (const matches of doiKhangMatchesByEvent) {
    const medals = computeDoiKhangMedals(matches);
    if (!medals) continue;
    bump(athleteTeamId(medals.vang), 'vang');
    bump(athleteTeamId(medals.bac), 'bac');
    for (const id of medals.dong) bump(athleteTeamId(id), 'dong');
  }

  for (const { items, scores } of quyenDataByEvent) {
    const { hoanThanh, ranking } = computeQuyenRanking(items, scores);
    if (!hoanThanh) continue;
    for (const r of ranking) {
      if (r.hang > 3) continue;
      // Đồng đội: mỗi nội dung chỉ sinh ra ĐÚNG 1 dòng xếp hạng cho cả
      // đội (items đã gộp theo teamId từ lúc xây, không phải 1 dòng/
      // thành viên) — nên bump() ở đây tự nhiên chỉ +1 huy chương cho
      // đoàn, dù đội có bao nhiêu người, không cần xử lý gì thêm.
      const teamId = r.athleteId ? athleteTeamId(r.athleteId) : r.teamId;
      const field = r.hang === 1 ? 'vang' : r.hang === 2 ? 'bac' : 'dong';
      bump(teamId, field);
    }
  }

  return Array.from(tally.values())
    .map((t) => ({
      ...t,
      diem: t.vang * heSo.vang + t.bac * heSo.bac + t.dong * heSo.dong,
    }))
    .sort((a, b) => b.vang - a.vang || b.bac - a.bac || b.dong - a.dong);
}