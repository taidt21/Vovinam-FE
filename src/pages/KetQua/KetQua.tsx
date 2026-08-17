/** @format */

import { useEffect, useMemo, useState } from "react";
import type { AthleteRecord, CompetitionEvent, Match } from "../../types";
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
  const [tab, setTab] = useState<"tong_sap" | "doi_khang" | "quyen">(
    "tong_sap",
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const loadAll = () =>
    Promise.all([
      fetchEvents(),
      apiGet<AthleteRecord[]>("/dashboard/athletes"),
      apiGet<{ id: string; ten: string }[]>("/dashboard/teams"),
      fetchMatches(),
      apiGet<PerformanceOrderWire[]>("/performance-orders"),
      fetchQuyenJudgeScores(),
      fetchQuyenLuotHoanThanh(),
    ]).then(
      ([
        eventsData,
        athletesData,
        teamsData,
        matchesData,
        ordersData,
        scoresData,
        quyenLuotHoanThanhData,
      ]) => {
        setEvents(eventsData);
        setAthletes(athletesData);
        setTeams(teamsData);
        setMatches(matchesData);
        setOrders(ordersData);
        setQuyenScores(scoresData);
        setQuyenLuotHoanThanh(quyenLuotHoanThanhData);
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
  // Đồng đội — danh sách trang này chỉ có teamId, chưa có sẵn từng VĐV
  // (khác BanThuKy vốn đã có squadOrderByEvent riêng) — suy từ đúng dữ
  // liệu VĐV đã tải: đúng đội đó + có đăng ký đúng nội dung đó.
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
  const selected =
    events.find((e) => e.id === selectedEventId) ?? eventsInTab[0];

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
        })),
        athletes,
      ),
    [doiKhangEvents, quyenEvents, matches, orders, quyenScores, athletes],
  );
  if (loading)
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Đang tải dữ liệu...</p>
      </div>
    );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Kết quả & báo cáo</h1>

      <div className={styles.tabsBar}>
        <button
          className={tab === "tong_sap" ? styles.tabActive : styles.tab}
          onClick={() => setTab("tong_sap")}>
          Tổng sắp huy chương
        </button>
        <button
          className={tab === "doi_khang" ? styles.tabActive : styles.tab}
          onClick={() => {
            setTab("doi_khang");
            setSelectedEventId(null);
          }}>
          Đối kháng
        </button>
        <button
          className={tab === "quyen" ? styles.tabActive : styles.tab}
          onClick={() => {
            setTab("quyen");
            setSelectedEventId(null);
          }}>
          Quyền
        </button>
      </div>

      {tab === "tong_sap" ? (
        <TongSapTab tally={medalTally} teamName={teamName} />
      ) : (
        <div className={styles.body}>
          <aside className={styles.sidebar}>
            {eventsInTab.map((ev) => (
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
            {eventsInTab.length === 0 && (
              <p className={styles.emptySidebar}>
                Chưa có nội dung nào{" "}
                {tab === "doi_khang" ? "đã bốc thăm" : "đã xếp lịch thi"}.
              </p>
            )}
          </aside>

          <section className={styles.main}>
            {!selected ? (
              <p className={styles.hint}>
                Chọn 1 nội dung ở danh sách bên trái.
              </p>
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
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
