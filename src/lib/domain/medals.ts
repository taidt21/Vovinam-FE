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
  hang: number; // Luôn tuần tự (1, 2, 3, 4...) — không có 2 lượt chung 1
  // số hạng, kể cả khi bằng điểm (xem diemCaoNhat bên dưới cho tiêu chí
  // phân định thứ tự).
  huyChuong: 1 | 2 | 3 | null; // 1=vàng, 2=bạc, 3=đồng, null=không có.
  // Thuần theo VỊ TRÍ, không phải theo việc có bằng điểm hay không: hạng
  // 3 luôn có HCĐ; hạng 4 có HCĐ THÊM khi giải cho phép đồng hạng ba —
  // dù hạng 4 điểm THẤP HƠN hạng 3 (không cần bằng điểm mới được tính).
}

// scores PHẢI đã lọc sẵn đúng 1 nội dung trước khi gọi hàm này.
// hoanThanhRecords = các bản ghi "kết thúc lượt" của nội dung đó (bảng
// QuyenLuotHoanThanh) — chỉ cần đúng athleteId/teamId để đối chiếu, dùng
// để biết lượt nào ĐÃ CÓ KẾT LUẬN (dù đủ 5 điểm hay dừng giữa chừng vì
// chấn thương/quên bài/rơi vũ khí...), tránh nhầm với lượt CHƯA THI.
// choPhepDongHang (mặc định true, lấy từ Tournament.ChoPhepDongHangBaQuyen):
// true = có 2 vị trí HCĐ (hạng 3 VÀ hạng 4); false = chỉ đúng 1 (hạng 3).
// Không liên quan gì tới việc 2 lượt có thật sự bằng điểm hay không —
// đây là quy định "bao nhiêu suất đồng", không phải cách phá bằng điểm.
export function computeQuyenRanking(
  items: { athleteId: string | null; teamId: string | null }[],
  scores: QuyenJudgeScoreWire[],
  hoanThanhRecords: { athleteId: string | null; teamId: string | null }[] = [],
  choPhepDongHang = true,
): { hoanThanh: boolean; ranking: QuyenRankingEntry[] } {
  if (items.length === 0) return { hoanThanh: false, ranking: [] };

  const daKetLuan = (item: { athleteId: string | null; teamId: string | null }) =>
    hoanThanhRecords.some(
      (h) => h.athleteId === item.athleteId && h.teamId === item.teamId,
    );

  const withScores = items.map((item) => {
    const myScores = scores.filter(
      (s) => s.athleteId === item.athleteId && s.teamId === item.teamId,
    );
    const diemList = myScores.map((s) => s.diem);
    return {
      ...item,
      diem: tinhDiemQuyenTongHop(diemList),
      // Hiệu số phụ — LUÔN dùng để phân định thứ tự khi bằng điểm tổng
      // (cho ra 1 thứ tự rõ ràng, ổn định), tách biệt hoàn toàn khỏi
      // việc có mấy suất đồng hạng ba (đó là chuyện của choPhepDongHang).
      diemCaoNhat: diemList.length > 0 ? Math.max(...diemList) : 0,
      count: myScores.length,
    };
  });

  // Sẵn sàng xếp hạng khi MỌI lượt đã có kết luận — hoặc đủ 5 điểm giám
  // khảo, hoặc đã có bản ghi "kết thúc lượt" (dừng giữa chừng vì bất kỳ
  // lý do gì). Trước đây bắt buộc TẤT CẢ đủ 5 điểm mới xong — 1 lượt
  // chấn thương (không bao giờ đủ 5 điểm) khiến cả nội dung không bao
  // giờ được xếp hạng, dù các lượt còn lại đã xong hết.
  const hoanThanh = withScores.every((r) => r.count === 5 || daKetLuan(r));
  if (!hoanThanh) return { hoanThanh: false, ranking: [] };

  // Chỉ xếp hạng lượt thi ĐỦ 5 điểm (hoàn thành bình thường) — lượt bị
  // dừng giữa chừng (chấn thương, quên bài, rơi vũ khí, lỗi máy...)
  // không được tính vào tranh huy chương, dù nội dung đã coi là xong.
  const rankable = withScores.filter((r) => r.count === 5);

  const sorted = [...rankable].sort(
    (a, b) => (b.diem ?? 0) - (a.diem ?? 0) || b.diemCaoNhat - a.diemCaoNhat,
  );

  const ranking: QuyenRankingEntry[] = sorted.map((r, i) => {
    const hang = i + 1;
    const huyChuong: 1 | 2 | 3 | null =
      hang === 1
        ? 1
        : hang === 2
          ? 2
          : hang === 3 || (hang === 4 && choPhepDongHang)
            ? 3
            : null;
    return { athleteId: r.athleteId, teamId: r.teamId, diem: r.diem!, hang, huyChuong };
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
    hoanThanhRecords: { athleteId: string | null; teamId: string | null }[];
  }[],
  athletes: { id: string; teamId: string }[],
  heSo: { vang: number; bac: number; dong: number } = { vang: 50, bac: 20, dong: 10 },
  choPhepDongHangQuyen = true,
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

  for (const { items, scores, hoanThanhRecords } of quyenDataByEvent) {
    const { hoanThanh, ranking } = computeQuyenRanking(
      items,
      scores,
      hoanThanhRecords,
      choPhepDongHangQuyen,
    );
    if (!hoanThanh) continue;
    for (const r of ranking) {
      if (!r.huyChuong) continue;
      // Đồng đội: mỗi nội dung chỉ sinh ra ĐÚNG 1 dòng xếp hạng cho cả
      // đội (items đã gộp theo teamId từ lúc xây, không phải 1 dòng/
      // thành viên) — nên bump() ở đây tự nhiên chỉ +1 huy chương cho
      // đoàn, dù đội có bao nhiêu người, không cần xử lý gì thêm.
      const teamId = r.athleteId ? athleteTeamId(r.athleteId) : r.teamId;
      const field = r.huyChuong === 1 ? 'vang' : r.huyChuong === 2 ? 'bac' : 'dong';
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