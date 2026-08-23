/** @format */

// Gom dữ liệu thô (events, matches, orders, scores, athletes, teams) thành
// cấu trúc báo cáo: Lứa tuổi -> Nội dung (đánh số) -> Bảng kết quả.
// Dùng chung cho cả xuất Word và xuất PDF.

// LƯU Ý ĐƯỜNG DẪN: file này nằm ở KetQua/export/reportData.ts, tức sâu hơn
// KetQua.tsx đúng 1 cấp — nên mọi đường dẫn "../../..." của KetQua.tsx phải
// thêm 1 dấu "../" ở đây. Đặt file KHÁC chỗ này thì nhớ tự sửa lại cho khớp.
import type {
  AthleteRecord,
  CompetitionEvent,
  Match,
  Tournament,
} from "../../../types";
import type { QuyenJudgeScoreWire } from "../../../lib/api/quyenJudgeScoreApi";
import type { QuyenLuotHoanThanhWire } from "../../../lib/api/quyenLuotApi";
import { compareNhomTuoi, formatEventNhomTuoi } from "../../../lib/utils/nhomTuoi";
import { computeDoiKhangMedals, computeQuyenRanking } from "../../../lib/domain/medals";
import type { PerformanceOrderWire } from "../types";

export interface KetQuaRow {
  stt: number;
  hoTen: string;
  namSinh: string;
  donVi: string;
  thanhTich: "Vàng" | "Bạc" | "Đồng" | "";
}

export interface NoiDungReport {
  soThuTu: number;
  tenNoiDung: string;
  rows: KetQuaRow[];
  // Chỉ true cho ĐÚNG quyền đồng đội — nơi 1 "suất huy chương" thật sự
  // gồm nhiều dòng (nhiều thành viên). Đối kháng khi đồng hạng ba cũng
  // có thể ra 2 dòng CÙNG SỐ THỨ TỰ (2 người khác nhau, khác đơn vị),
  // nhưng đó KHÔNG PHẢI 1 nhóm — cờ này giúp phía xuất PDF/Word biết
  // chắc khi nào được gộp ô, không đoán qua việc trùng STT.
  laDongDoi: boolean;
}

export interface LuaTuoiReport {
  nhomTuoi: number;
  soLaMa: string; // "I", "II", "III"... theo thứ tự xuất hiện, dùng làm số mục lớn
  tieuDe: string; // "LỨA TUỔI 1", "LỨA TUỔI 2", ... (đúng số nhóm tuổi thật)
  noiDungs: NoiDungReport[];
}

export const romanOf = (n: number) =>
  ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][n - 1] ?? String(n);

export function buildReport(params: {
  events: CompetitionEvent[];
  matches: Match[];
  orders: PerformanceOrderWire[];
  scores: QuyenJudgeScoreWire[];
  quyenLuotHoanThanh: QuyenLuotHoanThanhWire[];
  athletes: AthleteRecord[];
  teams: { id: string; ten: string }[];
  tournament: Tournament | null;
}): LuaTuoiReport[] {
  const { events, matches, orders, scores, quyenLuotHoanThanh, athletes, teams, tournament } = params;

  const athleteById = new Map(athletes.map((a) => [a.id, a]));
  const teamNameById = new Map(teams.map((t) => [t.id, t.ten]));

  const athleteRow = (
    stt: number,
    athleteId: string | null,
    teamId: string | null,
    thanhTich: KetQuaRow["thanhTich"],
  ): KetQuaRow => {
    const a = athleteId ? athleteById.get(athleteId) : undefined;
    return {
      stt,
      hoTen: a?.hoTen ?? "—",
      namSinh: a?.namSinh != null ? String(a.namSinh) : "",
      donVi: teamNameById.get((a?.teamId ?? teamId) as string) ?? "—",
      thanhTich,
    };
  };

  // Đội quyền: 1 dòng/thành viên (không gộp thành 1 dòng chung) — nhưng
  // STT/Đơn vị/Thành tích giống nhau cho cả đội, để phía PDF/Word gộp ô
  // (rowSpan/verticalMerge) thay vì lặp lại — xem laDongDoi ở NoiDungReport.
  const teamRows = (
    stt: number,
    teamId: string,
    eventId: string,
    thanhTich: KetQuaRow["thanhTich"],
  ): KetQuaRow[] => {
    const members = athletes.filter(
      (a) => a.teamId === teamId && a.eventIds.includes(eventId),
    );
    if (members.length === 0) {
      return [
        {
          stt,
          hoTen: "—",
          namSinh: "",
          donVi: teamNameById.get(teamId) ?? "—",
          thanhTich,
        },
      ];
    }
    return members.map((m) => ({
      stt,
      hoTen: m.hoTen,
      namSinh: m.namSinh != null ? String(m.namSinh) : "",
      donVi: teamNameById.get(teamId) ?? "—",
      thanhTich,
    }));
  };

  // ---- Nội dung đối kháng ----
  const doiKhangEvents = events.filter(
    (e) => e.loai === "doi_khang" && matches.some((m) => m.eventId === e.id),
  );
  const doiKhangNoiDung = new Map<string, NoiDungReport>();
  for (const ev of doiKhangEvents) {
    const evMatches = matches.filter((m) => m.eventId === ev.id);
    const medals = computeDoiKhangMedals(evMatches);
    if (!medals) continue;
    const rows: KetQuaRow[] = [
      athleteRow(1, medals.vang, null, "Vàng"),
      athleteRow(2, medals.bac, null, "Bạc"),
      ...medals.dong.map((id) => athleteRow(3, id, null, "Đồng" as const)),
    ];
    doiKhangNoiDung.set(ev.id, {
      soThuTu: 0,
      tenNoiDung: ev.ten,
      rows,
      laDongDoi: false,
    });
  }

  // ---- Nội dung quyền ----
  const quyenEvents = events.filter(
    (e) => e.loai === "quyen" && orders.some((o) => o.eventId === e.id),
  );
  const quyenNoiDung = new Map<string, NoiDungReport>();
  for (const ev of quyenEvents) {
    const items = orders
      .filter((o) => o.eventId === ev.id)
      .map((o) => ({ athleteId: o.athleteId, teamId: o.teamId }));
    const hoanThanhRecords = quyenLuotHoanThanh
      .filter((h) => h.eventId === ev.id)
      .map((h) => ({ athleteId: h.athleteId, teamId: h.teamId }));
    const evScores = scores.filter((s) => s.eventId === ev.id);
    const { hoanThanh, ranking } = computeQuyenRanking(
      items,
      evScores,
      hoanThanhRecords,
      tournament?.choPhepDongHangBaQuyen ?? true,
    );
    if (!hoanThanh) continue;
    const medalRows = ranking.filter((r) => r.huyChuong !== null);
    const rows: KetQuaRow[] = medalRows.flatMap((r) => {
      const tag = r.huyChuong === 1 ? "Vàng" : r.huyChuong === 2 ? "Bạc" : "Đồng";
      if (ev.hinhThucThi === "doi" && r.teamId) {
        return teamRows(r.hang, r.teamId, ev.id, tag as KetQuaRow["thanhTich"]);
      }
      return [athleteRow(r.hang, r.athleteId, r.teamId, tag as KetQuaRow["thanhTich"])];
    });
    quyenNoiDung.set(ev.id, {
      soThuTu: 0,
      tenNoiDung: ev.ten,
      rows,
      laDongDoi: ev.hinhThucThi === "doi",
    });
  }

  // ---- Gom theo Lứa tuổi ----
  // Dùng đúng cách sắp xếp/hiển thị nhóm tuổi đã có sẵn trong code (compareNhomTuoi,
  // formatEventNhomTuoi) thay vì tự đoán cấu trúc thật của field `nhomTuoi`, để không
  // vỡ nếu nhomTuoi không phải một số đơn giản.
  const eventsWithResult = events.filter(
    (e) => quyenNoiDung.has(e.id) || doiKhangNoiDung.has(e.id),
  );
  const sortedEvents = [...eventsWithResult].sort((a, b) =>
    compareNhomTuoi(a.nhomTuoi, b.nhomTuoi),
  );

  const groupKeys: string[] = [];
  const groupedByKey = new Map<string, CompetitionEvent[]>();
  for (const ev of sortedEvents) {
    const key = formatEventNhomTuoi(ev.nhomTuoi);
    if (!groupedByKey.has(key)) {
      groupedByKey.set(key, []);
      groupKeys.push(key);
    }
    groupedByKey.get(key)!.push(ev);
  }

  return groupKeys.map((key, groupIndex) => {
    const evThisGroup = groupedByKey.get(key)!;
    const quyenList = evThisGroup.filter((e) => quyenNoiDung.has(e.id));
    const doiKhangList = evThisGroup.filter((e) => doiKhangNoiDung.has(e.id));
    const ordered = [...quyenList, ...doiKhangList];
    const noiDungs = ordered.map((ev, i) => {
      const nd = quyenNoiDung.get(ev.id) ?? doiKhangNoiDung.get(ev.id)!;
      return { ...nd, soThuTu: i + 1 };
    });
    return {
      // GHI CHÚ: `nhomTuoi` số ở đây chỉ để tương thích kiểu dữ liệu — hiển thị
      // thật dùng `tieuDe` (dựa trên formatEventNhomTuoi, luôn đúng định dạng có sẵn).
      nhomTuoi: groupIndex + 1,
      soLaMa: romanOf(groupIndex + 1),
      tieuDe: `LỨA TUỔI ${key}`.toUpperCase(),
      noiDungs,
    };
  });
}
