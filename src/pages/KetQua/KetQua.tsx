/** @format */

import { useEffect, useMemo, useState } from "react";
import type {
  Athlete,
  AthleteRecord,
  CompetitionEvent,
  Match,
} from "../../types";
import { fetchEvents } from "../../lib/api/eventsApi";
import { apiGet } from "../../lib/api/api";
import { fetchMatches } from "../../lib/api/matchesApi";
import {
  fetchQuyenJudgeScores,
  type QuyenJudgeScoreWire,
} from "../../lib/api/quyenJudgeScoreApi";
import { numberDoiKhangMatches } from "../../lib/domain/bracket";
import { compareNhomTuoi, formatEventNhomTuoi } from "../../lib/utils/nhomTuoi";
import {
  computeDoiKhangMedals,
  computeQuyenRanking,
  computeMedalTally,
  type MedalTally,
} from "../../lib/domain/medals";
import BracketView from "../../components/BracketView/BracketView";
import styles from "./KetQua.module.scss";

interface PerformanceOrderWire {
  id: string;
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
  thuTu: number;
}

function toAthleteArray(records: AthleteRecord[]): Athlete[] {
  return records.map(({ eventIds, ...rest }) => ({ ...rest, noiDung: [] }));
}

export default function KetQua() {
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [teams, setTeams] = useState<{ id: string; ten: string }[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [orders, setOrders] = useState<PerformanceOrderWire[]>([]);
  const [quyenScores, setQuyenScores] = useState<QuyenJudgeScoreWire[]>([]);
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
    ]).then(
      ([
        eventsData,
        athletesData,
        teamsData,
        matchesData,
        ordersData,
        scoresData,
      ]) => {
        setEvents(eventsData);
        setAthletes(athletesData);
        setTeams(teamsData);
        setMatches(matchesData);
        setOrders(ordersData);
        setQuyenScores(scoresData);
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
                athleteName={athleteName}
                athleteTeamName={athleteTeamName}
                teamName={teamName}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function DoiKhangResultView({
  event,
  matches,
  athletes,
  teams,
  soByMatchId,
  athleteTeamName,
  athleteName,
}: {
  event: CompetitionEvent;
  matches: Match[];
  athletes: Athlete[];
  teams: { id: string; ten: string }[];
  soByMatchId: Map<string, number>;
  athleteTeamName: (id: string | null) => string;
  athleteName: (id: string | null) => string;
}) {
  const medals = useMemo(() => computeDoiKhangMedals(matches), [matches]);

  return (
    <>
      <h2 className={styles.eventTitle}>
        {event.ten} · {formatEventNhomTuoi(event.nhomTuoi)}
      </h2>

      {medals && (
        <MedalBox
          items={[
            {
              hang: 1,
              label: athleteName(medals.vang),
              sub: athleteTeamName(medals.vang),
            },
            {
              hang: 2,
              label: athleteName(medals.bac),
              sub: athleteTeamName(medals.bac),
            },
            ...medals.dong.map((id) => ({
              hang: 3 as const,
              label: athleteName(id),
              sub: athleteTeamName(id),
            })),
          ]}
        />
      )}

      <BracketView
        matches={matches}
        athletes={athletes}
        teams={teams}
        soByMatchId={soByMatchId}
      />
    </>
  );
}

function QuyenResultView({
  event,
  orders,
  scores,
  athleteName,
  athleteTeamName,
  teamName,
}: {
  event: CompetitionEvent;
  orders: PerformanceOrderWire[];
  scores: QuyenJudgeScoreWire[];
  athleteName: (id: string | null) => string;
  athleteTeamName: (id: string | null) => string;
  teamName: (id: string) => string;
}) {
  const items = useMemo(
    () =>
      [...orders]
        .sort((a, b) => a.thuTu - b.thuTu)
        .map((o) => ({ athleteId: o.athleteId, teamId: o.teamId })),
    [orders],
  );

  const { hoanThanh, ranking } = useMemo(
    () => computeQuyenRanking(items, scores),
    [items, scores],
  );

  const labelFor = (athleteId: string | null, teamId: string | null) =>
    athleteId ? athleteName(athleteId) : `Đội ${teamName(teamId!)}`;
  const subFor = (athleteId: string | null) =>
    athleteId ? athleteTeamName(athleteId) : "";

  const rankingOf = (athleteId: string | null, teamId: string | null) =>
    ranking.find((r) => r.athleteId === athleteId && r.teamId === teamId);

  const medalItems = hoanThanh
    ? ranking
        .filter((r) => r.hang <= 3)
        .map((r) => {
          const sub = subFor(r.athleteId);
          return {
            hang: r.hang as 1 | 2 | 3,
            label: labelFor(r.athleteId, r.teamId),
            sub: `${sub}${sub ? " · " : ""}${r.diem.toFixed(2)} điểm`,
          };
        })
    : [];

  return (
    <>
      <h2 className={styles.eventTitle}>
        {event.ten} · {formatEventNhomTuoi(event.nhomTuoi)}
      </h2>

      {hoanThanh && <MedalBox items={medalItems} />}

      <div className={styles.quyenList}>
        {items.map((it, i) => {
          const scoreCount = scores.filter(
            (s) => s.athleteId === it.athleteId && s.teamId === it.teamId,
          ).length;
          const r = rankingOf(it.athleteId, it.teamId);
          return (
            <div key={i} className={styles.quyenRow}>
              <span className={styles.quyenNo}>#{i + 1}</span>
              <div className={styles.quyenInfo}>
                <div className={styles.quyenName}>
                  {labelFor(it.athleteId, it.teamId)}
                </div>
                <div className={styles.quyenSub}>{subFor(it.athleteId)}</div>
              </div>
              {r ? (
                <span className={styles.quyenDone}>
                  {r.hang === 1
                    ? "🥇"
                    : r.hang === 2
                      ? "🥈"
                      : r.hang === 3
                        ? "🥉"
                        : "✓"}{" "}
                  {r.diem.toFixed(2)} điểm
                </span>
              ) : (
                <span className={styles.quyenPending}>
                  {scoreCount}/5 giám khảo
                </span>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <p className={styles.hint}>
            Chưa có ai đăng ký/xếp lịch cho nội dung này.
          </p>
        )}
      </div>
    </>
  );
}

function MedalBox({
  items,
}: {
  items: { hang: 1 | 2 | 3; label: string; sub: string }[];
}) {
  const rowClass = (hang: 1 | 2 | 3) =>
    hang === 1
      ? styles.medalRowVang
      : hang === 2
        ? styles.medalRowBac
        : styles.medalRowDong;
  const labelFor = (hang: 1 | 2 | 3) =>
    hang === 1 ? "🥇 Vàng" : hang === 2 ? "🥈 Bạc" : "🥉 Đồng";
  return (
    <div className={styles.medalBox}>
      {items.map((it, i) => (
        <div key={i} className={rowClass(it.hang)}>
          <span className={styles.medalTag}>{labelFor(it.hang)}</span>
          <span className={styles.medalName}>{it.label}</span>
          <span className={styles.medalSub}>{it.sub}</span>
        </div>
      ))}
    </div>
  );
}

function TongSapTab({
  tally,
  teamName,
}: {
  tally: MedalTally[];
  teamName: (id: string) => string;
}) {
  return (
    <section className={styles.card}>
      <table className={styles.medalTable}>
        <thead>
          <tr>
            <th>Hạng</th>
            <th>Đoàn</th>
            <th className={styles.center}>HCV</th>
            <th className={styles.center}>HCB</th>
            <th className={styles.center}>HCĐ</th>
            <th className={styles.center}>Tổng</th>
          </tr>
        </thead>
        <tbody>
          {tally.map((t, i) => (
            <tr key={t.teamId}>
              <td className={styles.rankNum}>{i + 1}</td>
              <td>{teamName(t.teamId)}</td>
              <td className={`${styles.center} ${styles.gold}`}>{t.vang}</td>
              <td className={styles.center}>{t.bac}</td>
              <td className={styles.center}>{t.dong}</td>
              <td className={`${styles.center} ${styles.total}`}>
                {t.vang + t.bac + t.dong}
              </td>
            </tr>
          ))}
          {tally.length === 0 && (
            <tr>
              <td colSpan={6} className={styles.empty}>
                Chưa có nội dung nào kết thúc
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
