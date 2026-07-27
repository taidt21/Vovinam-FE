/** @format */

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Shuffle } from "lucide-react";
import type {
  Athlete,
  AthleteRecord,
  CompetitionEvent,
  Match,
  Squad,
} from "../../types";
import { saveBracketData, subscribeBracketData } from "../../lib/bracketStore";
import { generateBracket, numberDoiKhangMatches } from "../../lib/bracket";
import BracketView from "../../components/BracketView/BracketView";
import LichThiDau from "../../components/LichThiDau/LichThiDau";
import styles from "./NoiDungBocTham.module.scss";
import { apiGet } from "../../lib/api";
function getAthletesForEvent(
  athletes: AthleteRecord[],
  eventId: string,
  eventTen: string,
): Athlete[] {
  return athletes
    .filter((a) => Array.isArray(a.eventIds) && a.eventIds.includes(eventId))
    .map(({ eventIds, ...rest }) => ({
      ...rest,
      noiDung: [eventTen],
    }));
}

// Không còn bảng Squads riêng — "đội" giờ chỉ là nhóm VĐV cùng đơn vị,
// cùng đăng ký 1 nội dung đội. Đúng luật mới: 1 đơn vị chỉ có 1 đội/nội
// dung, nên không cần tên riêng để phân biệt nhiều đội cùng đơn vị nữa —
// tên đội = tên đơn vị luôn.
function deriveSquadsForEvent(
  athletes: Athlete[],
  eventId: string,
  teams: { id: string; ten: string }[],
): Squad[] {
  const byTeam = new Map<string, string[]>();
  for (const a of athletes) {
    if (!byTeam.has(a.teamId)) byTeam.set(a.teamId, []);
    byTeam.get(a.teamId)!.push(a.id);
  }
  return Array.from(byTeam.entries()).map(([teamId, athleteIds]) => ({
    id: `squad-${eventId}-${teamId}`,
    eventId,
    ten: `Đội ${teamName(teamId, teams)}`,
    athleteIds,
  }));
}

function shuffleAndStore<T>(
  items: T[],
  eventId: string,
  setter: Dispatch<SetStateAction<Record<string, T[]>>>,
) {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  setter((prev) => ({ ...prev, [eventId]: shuffled }));
}

function squadMemberNames(s: Squad, athletes: Athlete[]): string {
  return s.athleteIds
    .map((id) => athletes.find((a) => a.id === id)?.hoTen)
    .join(", ");
}
// function squadMemberNames(s: Squad, athletes: Athlete[]): string {
//   return s.athleteIds
//     .map((id) => {
//       const a = athletes.find((x) => x.id === id);
//       return a ? `${a.hoTen} (${a.namSinh})` : undefined;
//     })
//     .join(", ");
// }
function teamName(
  teamId: string,
  teams: { id: string; ten: string }[],
): string {
  return teams.find((t) => t.id === teamId)?.ten ?? "—";
}

function squadTeamName(
  s: Squad,
  athletes: Athlete[],
  teams: { id: string; ten: string }[],
): string {
  const first = athletes.find((a) => s.athleteIds.includes(a.id));
  return first ? teamName(first.teamId, teams) : "—";
}
const LOAI_LABEL = {
  quyen: "Quyền",
  doi_khang: "Đối kháng",
  lich_thi_dau: "Lịch thi đấu",
} as const;
function BocThamButton({
  onClick,
  count,
  hasResult,
  itemLabel,
}: {
  onClick: () => void;
  count: number;
  hasResult: boolean;
  itemLabel: string;
}) {
  const disabled = count < 2;
  return (
    <div className={styles.actions}>
      <button
        className={styles.btnPrimary}
        onClick={onClick}
        disabled={disabled}>
        <Shuffle size={16} /> {hasResult ? "Bốc thăm lại" : "Bốc thăm"}
      </button>
      {disabled && (
        <span className={styles.hint}>
          Cần tối thiểu 2 {itemLabel} để bốc thăm
        </span>
      )}
    </div>
  );
}

export default function NoiDungBocTham() {
  // Dữ liệu gốc — không nằm trong file này nữa, load thật qua fetch() từ
  // public/data/*.json. Sau này nối API thật, chỉ cần đổi đúng 3 URL bên
  // dưới (VD "/api/events") — phần còn lại của component không đổi gì.
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [teams, setTeams] = useState<{ id: string; ten: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<CompetitionEvent[]>("/events"),
      apiGet<AthleteRecord[]>("/dashboard/athletes"),
      apiGet<{ id: string; ten: string }[]>("/dashboard/teams"),
    ])
      .then(([eventsData, athletesData, teamsData]) => {
        setEvents(eventsData);
        setAthletes(athletesData);
        setTeams(teamsData);
        // Squads (đội quyền đồng đội) chưa có API thật — để dành làm
        // riêng ở Giai đoạn 2, chưa gán gì ở đây, tránh hiện dữ liệu demo
        // cũ tham chiếu tới ID VĐV không còn tồn tại trong SQL Server.
      })
      .catch(() =>
        setLoadError("Không tải được dữ liệu — kiểm tra backend đã chạy chưa"),
      )
      .finally(() => setLoading(false));
  }, []);

  const [tab, setTab] = useState<"quyen" | "doi_khang" | "lich_thi_dau">(
    "doi_khang",
  );
  const [selectedId, setSelectedId] = useState("e1");
  const [bracketsByEvent, setBracketsByEvent] = useState<
    Record<string, Match[]>
  >({});
  const [orderByEvent, setOrderByEvent] = useState<Record<string, Athlete[]>>(
    {},
  );
  const [squadOrderByEvent, setSquadOrderByEvent] = useState<
    Record<string, Squad[]>
  >({});
  useEffect(() => {
    saveBracketData({ bracketsByEvent, orderByEvent, squadOrderByEvent });
  }, [bracketsByEvent, orderByEvent, squadOrderByEvent]);

  useEffect(() => {
    return subscribeBracketData((data) => {
      setBracketsByEvent(data.bracketsByEvent);
      setOrderByEvent(data.orderByEvent);
      setSquadOrderByEvent(data.squadOrderByEvent);
    });
  }, []);
  const eventsInTab = useMemo(
    () =>
      events
        .filter((ev) => ev.loai === tab)
        .sort((a, b) => a.nhomTuoi - b.nhomTuoi),
    [events, tab],
  );
  const selected = events.find((ev) => ev.id === selectedId) ?? eventsInTab[0];
  const athletesOfSelected = selected
    ? getAthletesForEvent(athletes, selected.id, selected.ten)
    : [];
  const bracket = selected ? bracketsByEvent[selected.id] : undefined;
  const order = selected ? orderByEvent[selected.id] : undefined;
  const squadsOfSelected = selected
    ? deriveSquadsForEvent(athletesOfSelected, selected.id, teams)
    : [];
  const squadOrder = selected ? squadOrderByEvent[selected.id] : undefined;
  const isTeamEvent = selected?.hinhThucThi === "doi";

  // Số thứ tự toàn giải cho từng trận đối kháng — tính 1 lần ở đây, dùng
  // chung cho cả sơ đồ nhánh (BracketView) lẫn tab Lịch thi đấu, để số
  // trận hiển thị luôn khớp nhau ở mọi nơi.
  const soByMatchId = useMemo(() => {
    const numbered = numberDoiKhangMatches(events, bracketsByEvent);
    return new Map(numbered.map((x) => [x.match.id, x.so]));
  }, [events, bracketsByEvent]);

  const handleBocTham = () => {
    if (!selected) return;
    const matches = generateBracket(athletesOfSelected, selected.id);
    setBracketsByEvent((prev) => ({ ...prev, [selected.id]: matches }));
  };
  const handleBocThamQuyen = () =>
    selected &&
    shuffleAndStore(athletesOfSelected, selected.id, setOrderByEvent);
  const handleBocThamSquads = () =>
    selected &&
    shuffleAndStore(squadsOfSelected, selected.id, setSquadOrderByEvent);

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Đang tải dữ liệu...</p>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>{loadError}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.tabsBar}>
        {(["quyen", "doi_khang", "lich_thi_dau"] as const).map((t) => (
          <button
            key={t}
            className={t === tab ? styles.tabActive : styles.tab}
            onClick={() => setTab(t)}>
            {LOAI_LABEL[t]}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {tab !== "lich_thi_dau" && (
          <aside className={styles.sidebar}>
            <div className={styles.eventList}>
              {eventsInTab.map((ev) => (
                <button
                  key={ev.id}
                  className={
                    ev.id === selectedId
                      ? styles.eventItemActive
                      : styles.eventItem
                  }
                  onClick={() => setSelectedId(ev.id)}>
                  <span className={styles.eventName}>{ev.ten}</span>
                  <span className={styles.eventMeta}>
                    Nhóm tuổi {ev.nhomTuoi}
                  </span>
                </button>
              ))}
              {eventsInTab.length === 0 && (
                <p className={styles.emptyList}>Chưa có nội dung nào</p>
              )}
            </div>
          </aside>
        )}

        <section className={styles.main}>
          {tab === "lich_thi_dau" ? (
            <LichThiDau
              events={events}
              athletes={athletes}
              teams={teams}
              bracketsByEvent={bracketsByEvent}
              orderByEvent={orderByEvent}
              squadOrderByEvent={squadOrderByEvent}
            />
          ) : !selected ? (
            <p>Chọn 1 nội dung ở danh sách bên trái.</p>
          ) : (
            <>
              <h1 className={styles.title}>
                {selected.ten} | <small>Nhóm tuổi {selected.nhomTuoi}</small>
              </h1>

              <section className={styles.registeredSection}>
                <h2 className={styles.registeredTitle}>
                  {isTeamEvent ? "Danh sách đội đăng ký" : "Danh sách đăng ký"}{" "}
                  <span>
                    {isTeamEvent
                      ? `(${squadsOfSelected.length} đội)`
                      : `(${athletesOfSelected.length} người)`}
                  </span>
                </h2>
                {isTeamEvent ? (
                  squadsOfSelected.length > 0 ? (
                    <ol className={styles.athleteList}>
                      {squadsOfSelected.map((s) => (
                        <li key={s.id}>
                          <strong>{s.ten}</strong> —{" "}
                          {squadMemberNames(s, athletesOfSelected)}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className={styles.hint}>
                      Chưa có đội đăng ký nội dung này
                    </p>
                  )
                ) : athletesOfSelected.length > 0 ? (
                  <ol className={styles.athleteList}>
                    {athletesOfSelected.map((a) => (
                      <li key={a.id}>
                        {a.hoTen}{" "}
                        <span className={styles.teamTag}>
                          ({a.namSinh} · {teamName(a.teamId, teams)})
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={styles.hint}>
                    Chưa có VĐV đăng ký nội dung này
                  </p>
                )}
              </section>

              {selected.loai === "doi_khang" ? (
                <>
                  <BocThamButton
                    onClick={handleBocTham}
                    count={athletesOfSelected.length}
                    hasResult={!!bracket}
                    itemLabel="VĐV đăng ký"
                  />
                  <BracketView
                    matches={bracket ?? []}
                    athletes={athletesOfSelected}
                    teams={teams}
                    soByMatchId={soByMatchId}
                  />
                </>
              ) : isTeamEvent ? (
                <>
                  <BocThamButton
                    onClick={handleBocThamSquads}
                    count={squadsOfSelected.length}
                    hasResult={!!squadOrder}
                    itemLabel="đội"
                  />
                  {squadOrder && (
                    <div className={styles.registeredSection}>
                      <h2 className={styles.registeredTitle}>
                        Thứ tự thi diễn
                      </h2>
                      <ol className={styles.athleteList}>
                        {squadOrder.map((s) => (
                          <li key={s.id}>
                            <strong>{s.ten}</strong>{" "}
                            <span className={styles.teamTag}>
                              ({squadTeamName(s, athletesOfSelected, teams)})
                            </span>{" "}
                            — {squadMemberNames(s, athletesOfSelected)}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <BocThamButton
                    onClick={handleBocThamQuyen}
                    count={athletesOfSelected.length}
                    hasResult={!!order}
                    itemLabel="VĐV đăng ký"
                  />
                  {order && (
                    <div className={styles.registeredSection}>
                      <h2 className={styles.registeredTitle}>
                        Thứ tự thi diễn
                      </h2>
                      <ol className={styles.athleteList}>
                        {order.map((a) => (
                          <li key={a.id}>
                            {a.hoTen}{" "}
                            <span className={styles.teamTag}>
                              ({teamName(a.teamId, teams)})
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
