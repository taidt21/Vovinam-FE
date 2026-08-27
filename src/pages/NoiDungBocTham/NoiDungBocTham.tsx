/** @format */

import { useEffect, useMemo, useState } from "react";
import { Shuffle, CheckCircle2, FileDown, RotateCcw } from "lucide-react";
import type {
  Athlete,
  AthleteRecord,
  CompetitionEvent,
  Match,
  Squad,
} from "../../types";
import {
  generateBracket,
  numberDoiKhangMatches,
} from "../../lib/domain/bracket";
import { apiGet, apiPut } from "../../lib/api/api";
import { laAdmin } from "../../lib/api/adminAuth";
import BracketView from "../../components/BracketView/BracketView";
import { fetchEvents } from "../../lib/api/eventsApi";
import { formatEventNhomTuoi, compareNhomTuoi } from "../../lib/utils/nhomTuoi";
import styles from "./NoiDungBocTham.module.scss";

interface PerformanceOrder {
  id: string;
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
  thuTu: number;
}

interface DerivedSquad extends Squad {
  teamId: string;
}

function getAthletesForEvent(
  athletes: AthleteRecord[],
  eventId: string,
  eventTen: string,
): Athlete[] {
  return athletes
    .filter((a) => Array.isArray(a.eventIds) && a.eventIds.includes(eventId))
    .map(({ eventIds: _eventIds, ...rest }) => ({
      ...rest,
      noiDung: [eventTen],
    }));
}

// Không còn bảng Squads riêng — "đội" chỉ là nhóm VĐV cùng đơn vị, cùng
// đăng ký 1 nội dung đội. Đúng luật: 1 đơn vị chỉ có 1 đội/nội dung, nên
// tên đội = tên đơn vị luôn, không cần đặt tên riêng để phân biệt.
function deriveSquadsForEvent(
  athletes: Athlete[],
  eventId: string,
  teams: { id: string; ten: string }[],
): DerivedSquad[] {
  const byTeam = new Map<string, string[]>();
  for (const a of athletes) {
    if (!byTeam.has(a.teamId)) byTeam.set(a.teamId, []);
    byTeam.get(a.teamId)!.push(a.id);
  }
  return Array.from(byTeam.entries()).map(([teamId, athleteIds]) => ({
    id: `squad-${eventId}-${teamId}`,
    eventId,
    teamId,
    ten: `Đội ${teamName(teamId, teams)}`,
    athleteIds,
  }));
}

// Bảng STT/HỌ VÀ TÊN/ĐƠN VỊ — khớp đúng kiểu trình bày ở trang xuất
// in-lich-thi-dau-quyen (đội dùng rowSpan gộp nhiều VĐV dưới 1 số thứ tự
// và 1 ô đơn vị chung), dùng lại cho cả "Danh sách đăng ký" lẫn "Thứ tự
// thi diễn" ở đây — 2 chỗ, mỗi chỗ 2 kiểu (cá nhân/đội), tránh viết lặp
// 4 lần.
function PeopleTable({
  isTeam,
  individuals,
  squads,
  squadMembers,
  squadTeamOf,
  teams,
}: {
  isTeam: boolean;
  individuals: Athlete[];
  squads: Squad[];
  squadMembers: (s: Squad) => Athlete[];
  squadTeamOf: (s: Squad) => string;
  teams: { id: string; ten: string }[];
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.peopleTable}>
        <thead>
          <tr>
            <th className={styles.colOrder}>STT</th>
            <th className={styles.colName}>HỌ VÀ TÊN</th>
            <th className={styles.colTeam}>ĐƠN VỊ</th>
          </tr>
        </thead>
        <tbody>
          {!isTeam
            ? individuals.map((a, index) => (
                <tr key={a.id}>
                  <td className={styles.orderCell}>{index + 1}</td>
                  <td className={styles.nameCell}>{a.hoTen}</td>
                  <td className={styles.teamCell}>
                    {teamName(a.teamId, teams)}
                  </td>
                </tr>
              ))
            : squads.flatMap((s, squadIndex) => {
                const members = squadMembers(s);
                const rows = members.length > 0 ? members : [null];
                return rows.map((member, memberIndex) => (
                  <tr key={`${s.id}-${member?.id ?? memberIndex}`}>
                    {memberIndex === 0 && (
                      <td
                        className={`${styles.orderCell} ${styles.groupOrderCell}`}
                        rowSpan={rows.length}>
                        {squadIndex + 1}
                      </td>
                    )}
                    <td className={styles.nameCell}>
                      {member?.hoTen ?? "—"}
                    </td>
                    {memberIndex === 0 && (
                      <td
                        className={`${styles.teamCell} ${styles.mergedTeamCell}`}
                        rowSpan={rows.length}>
                        {squadTeamOf(s)}
                      </td>
                    )}
                  </tr>
                ));
              })}
        </tbody>
      </table>
    </div>
  );
}

function teamName(
  teamId: string,
  teams: { id: string; ten: string }[],
): string {
  return teams.find((t) => t.id === teamId)?.ten ?? "—";
}
function isEventDrawn(
  ev: CompetitionEvent,
  bracketsByEvent: Record<string, Match[]>,
  orderByEvent: Record<string, Athlete[]>,
  squadOrderByEvent: Record<string, Squad[]>,
): boolean {
  if (ev.loai === "doi_khang") return !!bracketsByEvent[ev.id];
  if (ev.hinhThucThi === "doi") return !!squadOrderByEvent[ev.id];
  return !!orderByEvent[ev.id];
}
const LOAI_LABEL = {
  quyen: "Quyền",
  doi_khang: "Đối kháng",
} as const;

function BocThamButton({
  onClick,
  onReset,
  count,
  hasResult,
  itemLabel,
  resetting = false,
}: {
  onClick: () => void;
  onReset: () => void;
  count: number;
  hasResult: boolean;
  itemLabel: string;
  resetting?: boolean;
}) {
  // Chỉ Admin mới được bốc thăm — backend cũng đã tự chặn nếu ai đó cố
  // gọi thẳng API, đây chỉ để giao diện không hiện nút vô dụng.
  if (!laAdmin()) return null;
  const disabled = count < 2;
  const handleClick = () => {
    if (
      hasResult &&
      !window.confirm(
        `Đã có kết quả bốc thăm cho ${itemLabel} này rồi. Bốc thăm lại sẽ XOÁ HẾT toàn bộ trận/thứ tự hiện tại (kể cả kết quả đã thi đấu, nếu có) và tạo lại từ đầu — không hoàn tác được. Chắc chắn muốn bốc thăm lại?`,
      )
    )
      return;
    onClick();
  };
  return (
    <div className={styles.actions}>
      <button
        className={styles.btnPrimary}
        onClick={handleClick}
        disabled={disabled || resetting}>
        <Shuffle size={16} /> {hasResult ? "Bốc thăm lại" : "Bốc thăm"}
      </button>
      {hasResult && (
        <button
          className={styles.btnReset}
          onClick={onReset}
          disabled={resetting}>
          <RotateCcw size={16} />
          {resetting ? "Đang reset..." : "Reset bốc thăm"}
        </button>
      )}
      {disabled && (
        <span className={styles.hint}>
          Cần tối thiểu 2 {itemLabel} để bốc thăm
        </span>
      )}
    </div>
  );
}

export default function NoiDungBocTham() {
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [teams, setTeams] = useState<{ id: string; ten: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tab, setTab] = useState<"quyen" | "doi_khang">("quyen");
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
  const [resettingEventId, setResettingEventId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchEvents(),
      apiGet<AthleteRecord[]>("/dashboard/athletes"),
      apiGet<{ id: string; ten: string }[]>("/dashboard/teams"),
      apiGet<Match[]>("/matches"),
      apiGet<PerformanceOrder[]>("/performance-orders"),
    ])
      .then(
        ([eventsData, athletesData, teamsData, matchesData, ordersData]) => {
          setEvents(eventsData);
          setAthletes(athletesData);
          setTeams(teamsData);

          const eventTenById = new Map(eventsData.map((e) => [e.id, e.ten]));

          const byEventMatches: Record<string, Match[]> = {};
          for (const m of matchesData) {
            if (!byEventMatches[m.eventId]) byEventMatches[m.eventId] = [];
            byEventMatches[m.eventId].push(m);
          }
          setBracketsByEvent(byEventMatches);

          const athleteOrders = ordersData.filter((o) => o.athleteId);
          const byEventOrder: Record<string, Athlete[]> = {};
          const athleteOrderByEvent = new Map<string, PerformanceOrder[]>();
          for (const o of athleteOrders) {
            if (!athleteOrderByEvent.has(o.eventId))
              athleteOrderByEvent.set(o.eventId, []);
            athleteOrderByEvent.get(o.eventId)!.push(o);
          }
          for (const [eventId, list] of athleteOrderByEvent) {
            const eventTen = eventTenById.get(eventId) ?? "";
            byEventOrder[eventId] = [...list]
              .sort((a, b) => a.thuTu - b.thuTu)
              .map((o) => {
                const a = athletesData.find((x) => x.id === o.athleteId);
                if (!a) return null;
                const { eventIds: _eventIds, ...rest } = a;
                return { ...rest, noiDung: [eventTen] };
              })
              .filter((a): a is Athlete => a !== null);
          }
          setOrderByEvent(byEventOrder);

          const teamOrders = ordersData.filter((o) => o.teamId);
          const byEventSquadOrder: Record<string, Squad[]> = {};
          const teamOrderByEvent = new Map<string, PerformanceOrder[]>();
          for (const o of teamOrders) {
            if (!teamOrderByEvent.has(o.eventId))
              teamOrderByEvent.set(o.eventId, []);
            teamOrderByEvent.get(o.eventId)!.push(o);
          }
          for (const [eventId, list] of teamOrderByEvent) {
            byEventSquadOrder[eventId] = [...list]
              .sort((a, b) => a.thuTu - b.thuTu)
              .map((o) => ({
                id: `squad-${eventId}-${o.teamId}`,
                eventId,
                ten: `Đội ${teamName(o.teamId!, teamsData)}`,
                athleteIds: athletesData
                  .filter(
                    (a) =>
                      a.teamId === o.teamId && a.eventIds.includes(eventId),
                  )
                  .map((a) => a.id),
              }));
          }
          setSquadOrderByEvent(byEventSquadOrder);
        },
      )
      .catch(() =>
        setLoadError("Không tải được dữ liệu — kiểm tra backend đã chạy chưa"),
      )
      .finally(() => setLoading(false));
  }, []);

  const eventsInTab = useMemo(
    () =>
      events
        .filter((ev) => ev.loai === tab)
        .sort((a, b) => compareNhomTuoi(a.nhomTuoi, b.nhomTuoi)),
    [events, tab],
  );
  const selected = events.find((ev) => ev.id === selectedId) ?? eventsInTab[0];
  const nhomTuoiLabel = selected
    ? formatEventNhomTuoi(selected.nhomTuoi)
    : "";
  const athletesOfSelected = selected
    ? getAthletesForEvent(athletes, selected.id, selected.ten)
    : [];
  const squadMembers = (s: Squad): Athlete[] =>
    s.athleteIds
      .map((id) => athletesOfSelected.find((a) => a.id === id))
      .filter((a): a is Athlete => a !== undefined);
  const squadTeamOf = (s: Squad): string => {
    const first = athletesOfSelected.find((a) => s.athleteIds.includes(a.id));
    return first ? teamName(first.teamId, teams) : "—";
  };
  const bracket = selected ? bracketsByEvent[selected.id] : undefined;
  const order = selected ? orderByEvent[selected.id] : undefined;
  const squadsOfSelected: DerivedSquad[] = selected
    ? deriveSquadsForEvent(athletesOfSelected, selected.id, teams)
    : [];
  const squadOrder = selected ? squadOrderByEvent[selected.id] : undefined;
  const isTeamEvent = selected?.hinhThucThi === "doi";

  const soByMatchId = useMemo(() => {
    const numbered = numberDoiKhangMatches(events, bracketsByEvent);
    return new Map(numbered.map((x) => [x.match.id, x.so]));
  }, [events, bracketsByEvent]);

  const handleBocTham = async () => {
    if (!selected) return;
    const matches = generateBracket(athletesOfSelected, selected.id);
    setBracketsByEvent((prev) => ({ ...prev, [selected.id]: matches }));
    try {
      await apiPut(`/matches/by-event/${selected.id}`, matches);
    } catch {
      window.alert(
        "Lưu kết quả bốc thăm thất bại — kiểm tra backend đã chạy chưa",
      );
    }
  };

  const handleBocThamQuyen = async () => {
    if (!selected) return;
    const shuffled = [...athletesOfSelected].sort(() => Math.random() - 0.5);
    setOrderByEvent((prev) => ({ ...prev, [selected.id]: shuffled }));
    try {
      await apiPut(
        `/performance-orders/by-event/${selected.id}`,
        shuffled.map((a, i) => ({ athleteId: a.id, teamId: null, thuTu: i })),
      );
    } catch {
      window.alert(
        "Lưu thứ tự thi diễn thất bại — kiểm tra backend đã chạy chưa",
      );
    }
  };

  const handleBocThamSquads = async () => {
    if (!selected) return;
    const shuffled = [...squadsOfSelected].sort(() => Math.random() - 0.5);
    setSquadOrderByEvent((prev) => ({ ...prev, [selected.id]: shuffled }));
    try {
      await apiPut(
        `/performance-orders/by-event/${selected.id}`,
        shuffled.map((s, i) => ({
          athleteId: null,
          teamId: s.teamId,
          thuTu: i,
        })),
      );
    } catch {
      window.alert(
        "Lưu thứ tự thi diễn thất bại — kiểm tra backend đã chạy chưa",
      );
    }
  };

  const handleResetBocTham = async () => {
    if (!selected || !laAdmin() || resettingEventId) return;

    const loaiDuLieu =
      selected.loai === "doi_khang"
        ? "toàn bộ sơ đồ và các trận đối kháng"
        : "toàn bộ thứ tự thi diễn";

    const confirmed = window.confirm(
      `Reset bốc thăm nội dung “${selected.ten}”?\n\nThao tác này sẽ xóa ${loaiDuLieu} của nội dung này. Danh sách VĐV/đội đăng ký vẫn được giữ nguyên.`,
    );
    if (!confirmed) return;

    setResettingEventId(selected.id);
    try {
      if (selected.loai === "doi_khang") {
        await apiPut(`/matches/by-event/${selected.id}`, []);
        setBracketsByEvent((prev) => {
          const next = { ...prev };
          delete next[selected.id];
          return next;
        });
      } else {
        await apiPut(`/performance-orders/by-event/${selected.id}`, []);

        if (selected.hinhThucThi === "doi") {
          setSquadOrderByEvent((prev) => {
            const next = { ...prev };
            delete next[selected.id];
            return next;
          });
        } else {
          setOrderByEvent((prev) => {
            const next = { ...prev };
            delete next[selected.id];
            return next;
          });
        }
      }
    } catch (error) {
      window.alert(
        error instanceof Error
          ? `Reset bốc thăm thất bại: ${error.message}`
          : "Reset bốc thăm thất bại — kiểm tra backend đã chạy chưa",
      );
    } finally {
      setResettingEventId(null);
    }
  };

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

  // Tổng số trận đối kháng (đã bốc thăm) + lượt thi quyền (cá nhân + đội,
  // đã xếp thứ tự) trên toàn giải — thay cho tab "Lịch thi đấu tổng" đã
  // bỏ, chỉ còn đúng 1 con số tổng quan, không cần rời trang xem chi
  // tiết (đã có 2 nút xuất PDF riêng cho việc đó).
  const tongSoTran =
    Object.values(bracketsByEvent).flat().length +
    Object.values(orderByEvent).flat().length +
    Object.values(squadOrderByEvent).flat().length;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageIntro}>
          <span className={styles.pageEyebrow}>Quản lý nội dung thi đấu</span>
          <h1 className={styles.pageTitle}>Nội dung & bốc thăm</h1>
          <p className={styles.pageSubtitle}>
            Kiểm tra danh sách đăng ký, bốc thăm đối kháng và xếp thứ tự thi quyền theo từng nội dung.
          </p>
        </div>
      </header>

      <div className={styles.tabsBar}>
        <div className={styles.tabsGroup}>
          {(["quyen", "doi_khang"] as const).map((t) => (
            <button
              key={t}
              className={t === tab ? styles.tabActive : styles.tab}
              onClick={() => setTab(t)}>
              {LOAI_LABEL[t]}
            </button>
          ))}
        </div>
        <span className={styles.tongSoTran}>Tổng số trận: {tongSoTran}</span>
      </div>

      <div className={styles.exportBar}>
        <button
          className={styles.exportBtn}
          onClick={() => window.open("/dashboard/in-lich-thi-dau-quyen", "_blank")}>
          <FileDown size={14} /> Xuất lịch thi đấu quyền (PDF)
        </button>
        <button
          className={styles.exportBtn}
          onClick={() =>
            window.open("/dashboard/in-lich-thi-dau-doi-khang", "_blank")
          }>
          <FileDown size={14} /> Xuất lịch thi đấu đối kháng (PDF)
        </button>
        <button
          className={styles.exportBtn}
          onClick={() => window.open("/dashboard/in-so-do-doi-khang", "_blank")}>
          <FileDown size={14} /> Xuất sơ đồ đối kháng (PDF)
        </button>
      </div>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.eventList}>
              {eventsInTab.map((ev) => {
                const drawn = isEventDrawn(
                  ev,
                  bracketsByEvent,
                  orderByEvent,
                  squadOrderByEvent,
                );
                return (
                  <button
                    key={ev.id}
                    className={
                      ev.id === selectedId
                        ? styles.eventItemActive
                        : drawn
                          ? styles.eventItemDrawn
                          : styles.eventItem
                    }
                    onClick={() => setSelectedId(ev.id)}>
                    <span className={styles.eventName}>
                      {ev.ten}
                      {drawn && (
                        <CheckCircle2 size={13} className={styles.drawnIcon} />
                      )}
                    </span>
                    <span className={styles.eventMeta}>
                      {formatEventNhomTuoi(ev.nhomTuoi)}
                    </span>
                  </button>
                );
              })}
              {eventsInTab.length === 0 && (
                <p className={styles.emptyList}>Chưa có nội dung nào</p>
              )}
          </div>
        </aside>

        <section className={styles.main}>
          {!selected ? (
            <p>Chọn 1 nội dung ở danh sách bên trái.</p>
          ) : (
            <>
              <h1 className={styles.title}>
                {selected.ten} |{" "}
                <small>
                  {nhomTuoiLabel === "Hỗn hợp"
                    ? `Nhóm tuổi: ${nhomTuoiLabel}`
                    : nhomTuoiLabel}
                </small>
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
                    <PeopleTable
                      isTeam
                      individuals={[]}
                      squads={squadsOfSelected}
                      squadMembers={squadMembers}
                      squadTeamOf={squadTeamOf}
                      teams={teams}
                    />
                  ) : (
                    <p className={styles.hint}>
                      Chưa có đội đăng ký nội dung này
                    </p>
                  )
                ) : athletesOfSelected.length > 0 ? (
                  <PeopleTable
                    isTeam={false}
                    individuals={athletesOfSelected}
                    squads={[]}
                    squadMembers={squadMembers}
                    squadTeamOf={squadTeamOf}
                    teams={teams}
                  />
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
                    onReset={handleResetBocTham}
                    count={athletesOfSelected.length}
                    hasResult={!!bracket}
                    itemLabel="VĐV đăng ký"
                    resetting={resettingEventId === selected.id}
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
                    onReset={handleResetBocTham}
                    count={squadsOfSelected.length}
                    hasResult={!!squadOrder}
                    itemLabel="đội"
                    resetting={resettingEventId === selected.id}
                  />
                  {squadOrder && (
                    <div className={styles.registeredSection}>
                      <h2 className={styles.registeredTitle}>
                        Thứ tự thi diễn
                      </h2>
                      <PeopleTable
                        isTeam
                        individuals={[]}
                        squads={squadOrder}
                        squadMembers={squadMembers}
                        squadTeamOf={squadTeamOf}
                        teams={teams}
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <BocThamButton
                    onClick={handleBocThamQuyen}
                    onReset={handleResetBocTham}
                    count={athletesOfSelected.length}
                    hasResult={!!order}
                    itemLabel="VĐV đăng ký"
                    resetting={resettingEventId === selected.id}
                  />
                  {order && (
                    <div className={styles.registeredSection}>
                      <h2 className={styles.registeredTitle}>
                        Thứ tự thi diễn
                      </h2>
                      <PeopleTable
                        isTeam={false}
                        individuals={order}
                        squads={[]}
                        squadMembers={squadMembers}
                        squadTeamOf={squadTeamOf}
                        teams={teams}
                      />
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
