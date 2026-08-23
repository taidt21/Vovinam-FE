/** @format */

import { useEffect, useMemo, useState } from "react";
import { FileDown, FileText } from "lucide-react";
import type {
  AthleteRecord,
  CompetitionEvent,
  Match,
  Tournament,
} from "../../types";
import { fetchEvents } from "../../lib/api/eventsApi";
import { apiGet } from "../../lib/api/api";
import { fetchMatches } from "../../lib/api/matchesApi";
import {
  fetchQuyenJudgeScores,
  type QuyenJudgeScoreWire,
} from "../../lib/api/quyenJudgeScoreApi";
import {
  fetchQuyenLuotHoanThanh,
  type QuyenLuotHoanThanhWire,
} from "../../lib/api/quyenLuotApi";
import { numberDoiKhangMatches } from "../../lib/domain/bracket";
import { compareNhomTuoi, formatEventNhomTuoi } from "../../lib/utils/nhomTuoi";
import { computeMedalTally } from "../../lib/domain/medals";

import type { PerformanceOrderWire } from "./types";
import { toAthleteArray } from "./helpers";
import TongSapTab from "./tabs/TongSapTab";
import DoiKhangResultView from "./tabs/DoiKhangResultView";
import QuyenResultView from "./tabs/QuyenResultView";
import styles from "./KetQua.module.scss";
import { buildReport } from "./export/reportData";
import { exportKetQuaWord } from "./export/exportWord";
import { exportKetQuaPdf } from "./export/exportPdf";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function KetQua() {
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [teams, setTeams] = useState<{ id: string; ten: string }[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [orders, setOrders] = useState<PerformanceOrderWire[]>([]);
  const [quyenScores, setQuyenScores] = useState<QuyenJudgeScoreWire[]>([]);
  const [quyenLuotHoanThanh, setQuyenLuotHoanThanh] = useState<
    QuyenLuotHoanThanhWire[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tab, setTab] = useState<"tong_sap" | "doi_khang" | "quyen">(
    "tong_sap",
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventSearch, setEventSearch] = useState("");
  const [exporting, setExporting] = useState<"word" | "pdf" | null>(null);

  const loadAll = () =>
    Promise.all([
      fetchEvents(),
      apiGet<AthleteRecord[]>("/dashboard/athletes"),
      apiGet<{ id: string; ten: string }[]>("/dashboard/teams"),
      fetchMatches(),
      apiGet<PerformanceOrderWire[]>("/performance-orders"),
      fetchQuyenJudgeScores(),
      fetchQuyenLuotHoanThanh(),
      apiGet<Tournament>("/tournament"),
    ]).then(
      ([
        eventsData,
        athletesData,
        teamsData,
        matchesData,
        ordersData,
        scoresData,
        quyenLuotHoanThanhData,
        tournamentData,
      ]) => {
        setEvents(eventsData);
        setAthletes(athletesData);
        setTeams(teamsData);
        setMatches(matchesData);
        setOrders(ordersData);
        setQuyenScores(scoresData);
        setQuyenLuotHoanThanh(quyenLuotHoanThanhData);
        setTournament(tournamentData);
      },
    );

  useEffect(() => {
    loadAll()
      .catch(() => {})
      .finally(() => setLoading(false));
    const id = setInterval(() => loadAll().catch(() => {}), 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const athleteName = (id: string | null): string =>
    id ? (athletes.find((a) => a.id === id)?.hoTen ?? "—") : "—";
  const teamName = (id: string): string =>
    teams.find((t) => t.id === id)?.ten ?? "—";
  const athleteTeamName = (athleteId: string | null): string => {
    if (!athleteId) return "—";
    const a = athletes.find((x) => x.id === athleteId);
    return a ? teamName(a.teamId) : "—";
  };

  const thanhVienCuaDoi = (teamId: string, eventId: string): string[] =>
    athletes
      .filter((a) => a.teamId === teamId && a.eventIds.includes(eventId))
      .map((a) => a.hoTen);

  const doiKhangEvents = useMemo(
    () =>
      events
        .filter(
          (e) =>
            e.loai === "doi_khang" && matches.some((m) => m.eventId === e.id),
        )
        .sort((a, b) => compareNhomTuoi(a.nhomTuoi, b.nhomTuoi)),
    [events, matches],
  );
  const quyenEvents = useMemo(
    () =>
      events
        .filter(
          (e) => e.loai === "quyen" && orders.some((o) => o.eventId === e.id),
        )
        .sort((a, b) => compareNhomTuoi(a.nhomTuoi, b.nhomTuoi)),
    [events, orders],
  );

  const eventsInTab = tab === "doi_khang" ? doiKhangEvents : quyenEvents;
  const normalizedSearch = eventSearch.trim().toLocaleLowerCase("vi");
  const filteredEvents = normalizedSearch
    ? eventsInTab.filter((ev) =>
        `${ev.ten} ${formatEventNhomTuoi(ev.nhomTuoi)}`
          .toLocaleLowerCase("vi")
          .includes(normalizedSearch),
      )
    : eventsInTab;

  const selected =
    events.find(
      (e) => e.id === selectedEventId && eventsInTab.some((x) => x.id === e.id),
    ) ?? eventsInTab[0];

  const numbered = useMemo(() => {
    const byEvent: Record<string, Match[]> = {};
    for (const m of matches) {
      if (!byEvent[m.eventId]) byEvent[m.eventId] = [];
      byEvent[m.eventId].push(m);
    }
    return numberDoiKhangMatches(events, byEvent);
  }, [events, matches]);
  const soByMatchId = useMemo(
    () => new Map(numbered.map((x) => [x.match.id, x.so])),
    [numbered],
  );
  const medalTally = useMemo(
    () =>
      computeMedalTally(
        doiKhangEvents.map((e) => matches.filter((m) => m.eventId === e.id)),
        quyenEvents.map((e) => ({
          items: orders
            .filter((o) => o.eventId === e.id)
            .sort((a, b) => a.thuTu - b.thuTu)
            .map((o) => ({ athleteId: o.athleteId, teamId: o.teamId })),
          scores: quyenScores.filter((s) => s.eventId === e.id),
          hoanThanhRecords: quyenLuotHoanThanh
            .filter((h) => h.eventId === e.id)
            .map((h) => ({ athleteId: h.athleteId, teamId: h.teamId })),
        })),
        athletes,
        tournament
          ? {
              vang: tournament.heSoVang,
              bac: tournament.heSoBac,
              dong: tournament.heSoDong,
            }
          : undefined,
        tournament?.choPhepDongHangBaQuyen ?? true,
      ),
    [
      doiKhangEvents,
      quyenEvents,
      matches,
      orders,
      quyenScores,
      quyenLuotHoanThanh,
      athletes,
      tournament,
    ],
  );

  const completedDoiKhang = matches.filter(
    (m) => m.trangThai === "da_hoan_thanh",
  ).length;
  const completedQuyen = quyenLuotHoanThanh.length;

  const tenGiai = tournament?.ten ? `Giải ${tournament.ten}` : "Giải Vovinam";

  const buildReportData = () =>
    buildReport({
      events,
      matches,
      orders,
      scores: quyenScores,
      quyenLuotHoanThanh,
      athletes,
      teams,
      tournament,
    });

  const handleExportWord = async () => {
    setExporting("word");
    try {
      const report = buildReportData();
      const blob = await exportKetQuaWord(report, tenGiai);
      downloadBlob(blob, "bao-cao-ket-qua.docx");
    } catch {
      window.alert("Xuất Word thất bại. Vui lòng thử lại.");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = () => {
    setExporting("pdf");
    try {
      const report = buildReportData();
      const blob = exportKetQuaPdf(report, tenGiai);
      downloadBlob(blob, "ket-qua-trao-giai.pdf");
    } catch {
      window.alert("Xuất PDF thất bại. Vui lòng thử lại.");
    } finally {
      setExporting(null);
    }
  };

  const selectTab = (nextTab: "tong_sap" | "doi_khang" | "quyen") => {
    setTab(nextTab);
    setSelectedEventId(null);
    setEventSearch("");
  };

  if (loading)
    return (
      <div className={styles.page}>
        <div className={styles.loadingCard}>
          <span className={styles.loadingDot} />
          <div>
            <strong>Đang cập nhật kết quả</strong>
            <p>Hệ thống đang tải dữ liệu thi đấu mới nhất.</p>
          </div>
        </div>
      </div>
    );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerIntro}>
          <span className={styles.eyebrow}>Kết quả thi đấu</span>
          <h1 className={styles.title}>Kết quả & báo cáo</h1>
          <p className={styles.pageDescription}>
            Theo dõi huy chương, kết quả đối kháng và điểm quyền theo từng nội
            dung.
          </p>
        </div>

        <div className={styles.headerTools}>
          <div className={styles.headerStats}>
            <div className={styles.headerStat}>
              <strong>{medalTally.length}</strong>
              <span>Đoàn có huy chương</span>
            </div>
            <div className={styles.headerStat}>
              <strong>{completedDoiKhang}</strong>
              <span>Trận đối kháng xong</span>
            </div>
            <div className={styles.headerStat}>
              <strong>{completedQuyen}</strong>
              <span>Lượt quyền xong</span>
            </div>
          </div>

          <div className={styles.exportPanel}>
            <div className={styles.exportPanelLabel}>
              <strong>Xuất kết quả</strong>
              <span>Chọn định dạng phù hợp mục đích sử dụng</span>
            </div>
            <div className={styles.exportActions}>
              <button
                type="button"
                className={styles.exportWordBtn}
                onClick={handleExportWord}
                disabled={exporting !== null}>
                <span className={styles.exportBtnIcon}>
                  <FileText size={19} />
                </span>
                <span className={styles.exportBtnText}>
                  <strong>
                    {exporting === "word" ? "Đang xuất..." : "Xuất Word"}
                  </strong>
                  <small>Báo cáo .docx</small>
                </span>
              </button>
              <button
                type="button"
                className={styles.exportPdfBtn}
                onClick={handleExportPdf}
                disabled={exporting !== null}>
                <span className={styles.exportBtnIcon}>
                  <FileDown size={19} />
                </span>
                <span className={styles.exportBtnText}>
                  <strong>
                    {exporting === "pdf" ? "Đang xuất..." : "Xuất PDF"}
                  </strong>
                  <small>Bản trao giải .pdf</small>
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.tabsBar} role="tablist" aria-label="Loại kết quả">
        <button
          className={tab === "tong_sap" ? styles.tabActive : styles.tab}
          onClick={() => selectTab("tong_sap")}>
          <span>Tổng sắp huy chương</span>
          <span className={styles.tabCount}>{medalTally.length}</span>
        </button>
        <button
          className={tab === "doi_khang" ? styles.tabActive : styles.tab}
          onClick={() => selectTab("doi_khang")}>
          <span>Đối kháng</span>
          <span className={styles.tabCount}>{doiKhangEvents.length}</span>
        </button>
        <button
          className={tab === "quyen" ? styles.tabActive : styles.tab}
          onClick={() => selectTab("quyen")}>
          <span>Quyền</span>
          <span className={styles.tabCount}>{quyenEvents.length}</span>
        </button>
      </div>

      {tab === "tong_sap" ? (
        <TongSapTab
          tally={medalTally}
          teamName={teamName}
          heSo={{
            vang: tournament?.heSoVang ?? 50,
            bac: tournament?.heSoBac ?? 20,
            dong: tournament?.heSoDong ?? 10,
          }}
        />
      ) : (
        <div className={styles.body}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHead}>
              <div>
                <span className={styles.sidebarEyebrow}>
                  Danh sách nội dung
                </span>
                <strong>{tab === "doi_khang" ? "Đối kháng" : "Quyền"}</strong>
              </div>
              <span className={styles.sidebarCount}>{eventsInTab.length}</span>
            </div>

            <label className={styles.searchBox}>
              <span className={styles.searchIcon}>⌕</span>
              <input
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Tìm nội dung, nhóm tuổi..."
              />
            </label>

            <div className={styles.eventList}>
              {filteredEvents.map((ev) => (
                <button
                  key={ev.id}
                  className={
                    ev.id === selected?.id
                      ? styles.eventItemActive
                      : styles.eventItem
                  }
                  onClick={() => setSelectedEventId(ev.id)}>
                  <span className={styles.eventName}>{ev.ten}</span>
                  <span className={styles.eventMeta}>
                    {formatEventNhomTuoi(ev.nhomTuoi)}
                  </span>
                </button>
              ))}
            </div>

            {filteredEvents.length === 0 && (
              <p className={styles.emptySidebar}>
                {eventsInTab.length === 0
                  ? `Chưa có nội dung nào ${tab === "doi_khang" ? "đã bốc thăm" : "đã xếp lịch thi"}.`
                  : "Không tìm thấy nội dung phù hợp."}
              </p>
            )}
          </aside>

          <section className={styles.main}>
            {!selected ? (
              <div className={styles.emptyMain}>
                <strong>Chưa có nội dung để hiển thị</strong>
                <p>
                  Chọn một nội dung ở danh sách bên trái khi dữ liệu đã sẵn
                  sàng.
                </p>
              </div>
            ) : tab === "doi_khang" ? (
              <DoiKhangResultView
                event={selected}
                matches={matches.filter((m) => m.eventId === selected.id)}
                athletes={toAthleteArray(athletes)}
                teams={teams}
                soByMatchId={soByMatchId}
                athleteTeamName={athleteTeamName}
                athleteName={athleteName}
              />
            ) : (
              <QuyenResultView
                event={selected}
                orders={orders.filter((o) => o.eventId === selected.id)}
                scores={quyenScores.filter((s) => s.eventId === selected.id)}
                quyenLuotHoanThanh={quyenLuotHoanThanh}
                athleteName={athleteName}
                athleteTeamName={athleteTeamName}
                teamName={teamName}
                thanhVienCuaDoi={thanhVienCuaDoi}
                choPhepDongHang={tournament?.choPhepDongHangBaQuyen ?? true}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
