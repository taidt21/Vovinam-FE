/** @format */

import { useEffect, useMemo, useState } from "react";
import type {
  Athlete,
  AthleteRecord,
  CompetitionEvent,
  LyDoKetThuc,
  Match,
} from "../../types";
import type { LiveQuyenState } from "../../types/liveQuyen";
import { useCourts } from "../../lib/utils/useCourts";
import { numberDoiKhangMatches } from "../../lib/domain/bracket";
import { compareNhomTuoi } from "../../lib/utils/nhomTuoi";
import { serverNow } from "../../lib/realtime/serverClock";
import { apiGet } from "../../lib/api/api";
import { fetchEvents } from "../../lib/api/eventsApi";
import { fetchMatches, updateMatch } from "../../lib/api/matchesApi";
import {
  fetchQuyenJudgeScores,
  type QuyenJudgeScoreWire,
} from "../../lib/api/quyenJudgeScoreApi";
import { fetchTrongTai, type TrongTaiWire } from "../../lib/api/trongTaiApi";
import {
  clearMatchState,
  getMatchSnapshot,
  publishMatchState,
} from "../../lib/realtime/liveMatchStore";
import {
  getQuyenSnapshot,
  publishQuyenState,
} from "../../lib/realtime/liveQuyenStore";
import { publishActiveMode } from "../../lib/realtime/activeModeStore";

import { TABS, type TabId, makeLiveState } from "./helpers";
import type { QuyenItem } from "./types";
import DoiKhangScheduleTab from "./tabs/DoiKhangScheduleTab";
import QuyenScheduleTab from "./tabs/QuyenScheduleTab";
import DieuHanhDoiKhangTab from "./tabs/DieuHanhDoiKhangTab";
import DieuHanhQuyenTab from "./tabs/DieuHanhQuyenTab";
import TrongTaiTab from "./tabs/TrongTaiTab";

import styles from "./BanThuKy.module.scss";

interface PerformanceOrderWire {
  id: string;
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
  thuTu: number;
}

export default function BanThuKy() {
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [teams, setTeams] = useState<{ id: string; ten: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [bracketsByEvent, setBracketsByEvent] = useState<
    Record<string, Match[]>
  >({});
  const [orderByEvent, setOrderByEvent] = useState<Record<string, Athlete[]>>(
    {},
  );
  interface BanThuKySquad {
    id: string;
    eventId: string;
    teamId: string;
    ten: string;
    athleteIds: string[];
  }
  const [squadOrderByEvent, setSquadOrderByEvent] = useState<
    Record<string, BanThuKySquad[]>
  >({});
  const [quyenJudgeScores, setQuyenJudgeScores] = useState<
    QuyenJudgeScoreWire[]
  >([]);
  const [trongTaiList, setTrongTaiList] = useState<TrongTaiWire[]>([]);
  const refreshTrongTai = () =>
    fetchTrongTai()
      .then(setTrongTaiList)
      .catch(() => {});

  const { courts, loadingCourts } = useCourts();
  const [tab, setTab] = useState<TabId>("lich_dk");
  const [currentCourtId, setCurrentCourtId] = useState("");

  useEffect(() => {
    if (!currentCourtId && courts.length > 0) setCurrentCourtId(courts[0].id);
  }, [courts, currentCourtId]);

  useEffect(() => {
    Promise.all([
      fetchEvents(),
      apiGet<AthleteRecord[]>("/dashboard/athletes"),
      apiGet<{ id: string; ten: string }[]>("/dashboard/teams"),
      fetchMatches(),
      apiGet<PerformanceOrderWire[]>("/performance-orders"),
      fetchQuyenJudgeScores(),
      fetchTrongTai(),
    ])
      .then(
        ([
          eventsData,
          athletesData,
          teamsData,
          matchesData,
          ordersData,
          quyenJudgeScoresData,
          trongTaiData,
        ]) => {
          setEvents(eventsData);
          setAthletes(athletesData);
          setTeams(teamsData);

          const byEventMatches: Record<string, Match[]> = {};
          for (const m of matchesData) {
            if (!byEventMatches[m.eventId]) byEventMatches[m.eventId] = [];
            byEventMatches[m.eventId].push(m);
          }
          setBracketsByEvent(byEventMatches);

          const eventTenById = new Map(eventsData.map((e) => [e.id, e.ten]));

          const athleteOrders = ordersData.filter((o) => o.athleteId);
          const byEventOrder: Record<string, Athlete[]> = {};
          const groupedAthlete = new Map<string, PerformanceOrderWire[]>();
          for (const o of athleteOrders) {
            if (!groupedAthlete.has(o.eventId))
              groupedAthlete.set(o.eventId, []);
            groupedAthlete.get(o.eventId)!.push(o);
          }
          for (const [eventId, list] of groupedAthlete) {
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
          const byEventSquadOrder: Record<string, BanThuKySquad[]> = {};
          const groupedTeam = new Map<string, PerformanceOrderWire[]>();
          for (const o of teamOrders) {
            if (!groupedTeam.has(o.eventId)) groupedTeam.set(o.eventId, []);
            groupedTeam.get(o.eventId)!.push(o);
          }
          for (const [eventId, list] of groupedTeam) {
            byEventSquadOrder[eventId] = [...list]
              .sort((a, b) => a.thuTu - b.thuTu)
              .map((o) => ({
                id: `squad-${eventId}-${o.teamId}`,
                eventId,
                teamId: o.teamId!,
                ten: `Đội ${teamsData.find((t) => t.id === o.teamId)?.ten ?? "—"}`,
                athleteIds: athletesData
                  .filter(
                    (a) =>
                      a.teamId === o.teamId && a.eventIds.includes(eventId),
                  )
                  .map((a) => a.id),
              }));
          }
          setSquadOrderByEvent(byEventSquadOrder);
          setQuyenJudgeScores(quyenJudgeScoresData);
          setTrongTaiList(trongTaiData);
        },
      )
      .catch(() =>
        setLoadError("Không tải được dữ liệu — kiểm tra backend đã chạy chưa"),
      )
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      fetchQuyenJudgeScores()
        .then(setQuyenJudgeScores)
        .catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, []);
  const athleteName = (id: string | null) =>
    id ? (athletes.find((a) => a.id === id)?.hoTen ?? "—") : null;
  const athleteTeam = (id: string | null) => {
    if (!id) return "";
    const a = athletes.find((x) => x.id === id);
    if (!a) return "";
    return teams.find((t) => t.id === a.teamId)?.ten ?? "";
  };
  const athletePhoto = (id: string | null): string | null =>
    id ? (athletes.find((a) => a.id === id)?.anhDaiDien ?? null) : null;
  const eventOf = (eventId: string) => events.find((e) => e.id === eventId);
  const squadTeam = (s: BanThuKySquad) => {
    const first = athletes.find((a) => s.athleteIds.includes(a.id));
    return first ? athleteTeam(first.id) : "—";
  };

  // Dùng chung cho mọi cách BTK có thể chuyển 1 sân sang đối kháng/quyền —
  // bấm tab, hoặc bấm Bắt đầu thẳng từ lịch thi đấu. Hỏi trước nếu sân
  // đang có lượt SỐNG của loại kia (chuyển lỡ tay không nên âm thầm cắt
  // ngang); trả về false nếu người dùng huỷ, để nơi gọi dừng lại giữa
  // chừng thay vì tiếp tục.
  const chuyenActiveMode = (courtId: string, mode: "doi_khang" | "quyen") => {
    const coLuotKiaDangSong =
      mode === "doi_khang"
        ? getQuyenSnapshot(courtId) !== null
        : getMatchSnapshot(courtId) !== null;
    if (coLuotKiaDangSong) {
      const loaiKia = mode === "doi_khang" ? "quyền" : "đối kháng";
      const loaiMoi = mode === "doi_khang" ? "đối kháng" : "quyền";
      const tenSan = courts.find((c) => c.id === courtId)?.ten ?? "";
      if (
        !window.confirm(
          `${tenSan} đang có lượt ${loaiKia} sống. Chuyển sang ${loaiMoi} sẽ dừng lượt ${loaiKia} đó lại. Tiếp tục?`,
        )
      )
        return false;
    }
    publishActiveMode(courtId, mode);
    return true;
  };

  /* ---------- Đối kháng ---------- */
  const numbered = useMemo(
    () => numberDoiKhangMatches(events, bracketsByEvent),
    [events, bracketsByEvent],
  );
  const allMatchesFlat = useMemo(
    () => Object.values(bracketsByEvent).flat(),
    [bracketsByEvent],
  );
  const activeOfCourt = (courtId: string) =>
    allMatchesFlat.find(
      (m) => m.courtId === courtId && m.trangThai === "dang_thi",
    ) ?? null;
  const activeOnMyCourt = activeOfCourt(currentCourtId);
  const activeEventId = activeOnMyCourt
    ? Object.keys(bracketsByEvent).find((eid) =>
        bracketsByEvent[eid].some((m) => m.id === activeOnMyCourt.id),
      )
    : undefined;
  const activeEvent = activeEventId ? eventOf(activeEventId) : undefined;

  const finishMatch = async (
    match: Match,
    eventId: string,
    lyDo: LyDoKetThuc,
    thangSide: "do" | "xanh",
  ) => {
    const winnerId =
      thangSide === "do" ? match.athleteRedId : match.athleteBlueId;
    const updatedMatch: Match = {
      ...match,
      trangThai: "da_hoan_thanh",
      lyDoKetThuc: lyDo,
      courtId: null,
      nguoiThangId: winnerId,
    };
    const next =
      match.nextMatchId && match.nextMatchSlot && winnerId
        ? (bracketsByEvent[eventId] ?? []).find(
            (m) => m.id === match.nextMatchId,
          )
        : undefined;
    const slotField =
      match.nextMatchSlot === "do" ? "athleteRedId" : "athleteBlueId";
    const updatedNext = next ? { ...next, [slotField]: winnerId } : undefined;

    setBracketsByEvent((prev) => ({
      ...prev,
      [eventId]: (prev[eventId] ?? []).map((m) => {
        if (m.id === updatedMatch.id) return updatedMatch;
        if (updatedNext && m.id === updatedNext.id) return updatedNext;
        return m;
      }),
    }));
    if (match.courtId) clearMatchState(match.courtId);

    try {
      await updateMatch(updatedMatch.id, updatedMatch);
      if (updatedNext) await updateMatch(updatedNext.id, updatedNext);
    } catch {
      window.alert(
        "Lưu kết quả thất bại — kiểm tra backend đã chạy chưa. Thử tải lại trang.",
      );
    }
  };

  const openIntoCourt = async (eventId: string, matchId: string) => {
    const current = activeOfCourt(currentCourtId);
    if (current) {
      if (current.id === matchId) return;
      const live = getMatchSnapshot(currentCourtId);
      const dangDienRaThat =
        live?.trangThai === "dang_thi" ||
        live?.trangThai === "nghi_giua_hiep" ||
        live?.trangThai === "tam_dung";
      if (dangDienRaThat) return;
    }
    const match = bracketsByEvent[eventId]?.find((m) => m.id === matchId);
    const event = eventOf(eventId);
    if (!match || !event) return;
    if (!chuyenActiveMode(currentCourtId, "doi_khang")) return;

    const updatedNew: Match = {
      ...match,
      courtId: currentCourtId,
      trangThai: "dang_thi",
    };
    let updatedCurrent: Match | undefined;
    let currentEventId: string | undefined;
    if (current) {
      currentEventId = Object.keys(bracketsByEvent).find((eid) =>
        bracketsByEvent[eid].some((m) => m.id === current.id),
      );
      const currentMatch = currentEventId
        ? bracketsByEvent[currentEventId].find((m) => m.id === current.id)
        : undefined;
      if (currentMatch)
        updatedCurrent = {
          ...currentMatch,
          trangThai: "cho_thi",
          courtId: null,
        };
    }

    setBracketsByEvent((prev) => {
      const next = {
        ...prev,
        [eventId]: (prev[eventId] ?? []).map((m) =>
          m.id === matchId ? updatedNew : m,
        ),
      };
      if (updatedCurrent && currentEventId) {
        next[currentEventId] = (prev[currentEventId] ?? []).map((m) =>
          m.id === updatedCurrent!.id ? updatedCurrent! : m,
        );
      }
      return next;
    });

    publishMatchState(
      makeLiveState(
        currentCourtId,
        event.ten,
        match,
        athleteName(match.athleteRedId) ?? "—",
        athleteTeam(match.athleteRedId),
        athletePhoto(match.athleteRedId),
        athleteName(match.athleteBlueId) ?? "—",
        athleteTeam(match.athleteBlueId),
        athletePhoto(match.athleteBlueId),
      ),
    );
    setTab("dieu_hanh_dk");

    try {
      await updateMatch(updatedNew.id, updatedNew);
      if (updatedCurrent) await updateMatch(updatedCurrent.id, updatedCurrent);
    } catch {
      window.alert(
        "Lưu trạng thái sân thất bại — kiểm tra backend đã chạy chưa. Thử tải lại trang.",
      );
    }
  };

  const quickFinish = (
    eventId: string,
    matchId: string,
    side: "do" | "xanh",
  ) => {
    const match = bracketsByEvent[eventId]?.find((m) => m.id === matchId);
    if (match) finishMatch(match, eventId, "thang_diem", side);
  };

  const editMatchResult = async (
    match: Match,
    eventId: string,
    lyDo: LyDoKetThuc,
    thangSide: "do" | "xanh",
  ) => {
    const newWinnerId =
      thangSide === "do" ? match.athleteRedId : match.athleteBlueId;
    const oldWinnerId = match.nguoiThangId ?? null;
    const list = bracketsByEvent[eventId] ?? [];
    const slotField =
      match.nextMatchSlot === "do" ? "athleteRedId" : "athleteBlueId";
    const next =
      newWinnerId !== oldWinnerId && match.nextMatchId && match.nextMatchSlot
        ? list.find((m) => m.id === match.nextMatchId)
        : undefined;
    const nextGiuNguoiThangCu = !!next && next[slotField] === oldWinnerId;
    const nextDaTienXa = nextGiuNguoiThangCu && next!.trangThai !== "cho_thi";

    if (
      nextDaTienXa &&
      !window.confirm(
        "Trận kế tiếp đã bắt đầu hoặc đã có kết quả dùng người thắng cũ " +
          "của trận này — đổi kết quả ở đây sẽ KHÔNG tự cập nhật trận đó, " +
          "cần tự kiểm tra lại. Vẫn đổi kết quả trận này?",
      )
    )
      return;

    const shouldSyncNext = nextGiuNguoiThangCu && !nextDaTienXa;
    const updatedMatch: Match = {
      ...match,
      lyDoKetThuc: lyDo,
      nguoiThangId: newWinnerId,
    };
    const updatedNext = shouldSyncNext
      ? { ...next!, [slotField]: newWinnerId }
      : undefined;

    setBracketsByEvent((prev) => ({
      ...prev,
      [eventId]: (prev[eventId] ?? []).map((m) => {
        if (m.id === updatedMatch.id) return updatedMatch;
        if (updatedNext && m.id === updatedNext.id) return updatedNext;
        return m;
      }),
    }));

    try {
      await updateMatch(updatedMatch.id, updatedMatch);
      if (updatedNext) await updateMatch(updatedNext.id, updatedNext);
    } catch {
      window.alert(
        "Lưu thay đổi thất bại — kiểm tra backend đã chạy chưa. Thử tải lại trang.",
      );
    }
  };

  const replayMatch = async (match: Match, eventId: string) => {
    const oldWinnerId = match.nguoiThangId ?? null;
    const list = bracketsByEvent[eventId] ?? [];
    const slotField =
      match.nextMatchSlot === "do" ? "athleteRedId" : "athleteBlueId";
    const next =
      match.nextMatchId && match.nextMatchSlot
        ? list.find((m) => m.id === match.nextMatchId)
        : undefined;
    const nextGiuNguoiThangCu =
      !!next && !!oldWinnerId && next[slotField] === oldWinnerId;
    const nextDaTienXa = nextGiuNguoiThangCu && next!.trangThai !== "cho_thi";

    const message = nextDaTienXa
      ? "Trận kế tiếp đã bắt đầu hoặc đã có kết quả dùng người thắng của " +
        "trận này — cho đấu lại sẽ KHÔNG tự gỡ trận đó, cần tự kiểm tra " +
        "lại. Vẫn cho đấu lại?"
      : "Cho trận này đấu lại từ đầu? Kết quả hiện tại sẽ bị xoá.";
    if (!window.confirm(message)) return;

    const shouldClearNext = nextGiuNguoiThangCu && !nextDaTienXa;
    const updatedMatch: Match = {
      ...match,
      trangThai: "cho_thi",
      lyDoKetThuc: undefined,
      nguoiThangId: null,
      courtId: null,
    };
    const updatedNext = shouldClearNext
      ? { ...next!, [slotField]: null }
      : undefined;

    setBracketsByEvent((prev) => ({
      ...prev,
      [eventId]: (prev[eventId] ?? []).map((m) => {
        if (m.id === updatedMatch.id) return updatedMatch;
        if (updatedNext && m.id === updatedNext.id) return updatedNext;
        return m;
      }),
    }));

    try {
      await updateMatch(updatedMatch.id, updatedMatch);
      if (updatedNext) await updateMatch(updatedNext.id, updatedNext);
    } catch {
      window.alert(
        "Lưu thay đổi thất bại — kiểm tra backend đã chạy chưa. Thử tải lại trang.",
      );
    }
  };

  /* ---------- Quyền ---------- */
  const quyenNumbered = useMemo<QuyenItem[]>(() => {
    const quyenEvents = events.filter((e) => e.loai === "quyen");
    const ready = quyenEvents.filter((e) =>
      e.hinhThucThi === "doi"
        ? !!squadOrderByEvent[e.id]
        : !!orderByEvent[e.id],
    );
    const flat: Omit<QuyenItem, "so">[] = [...ready]
      .sort((a, b) => compareNhomTuoi(a.nhomTuoi, b.nhomTuoi))
      .flatMap((e): Omit<QuyenItem, "so">[] => {
        if (e.hinhThucThi === "doi") {
          return (squadOrderByEvent[e.id] ?? []).map(
            (s): Omit<QuyenItem, "so"> => ({
              event: e,
              athleteId: null,
              teamId: s.teamId,
              label: s.ten,
              sub: squadTeam(s),
              isTeam: true,
            }),
          );
        }
        return (orderByEvent[e.id] ?? []).map(
          (a): Omit<QuyenItem, "so"> => ({
            event: e,
            athleteId: a.id,
            teamId: null,
            label: a.hoTen,
            sub: `${a.namSinh} · ${athleteTeam(a.id)}`,
            isTeam: false,
          }),
        );
      });
    return flat.map((x, i) => ({ ...x, so: i + 1 }));
  }, [events, orderByEvent, squadOrderByEvent, athletes, teams]);

  // Đưa 1 lượt quyền vào ĐÚNG khu vực đang thao tác (currentCourtId) —
  // dùng chung đúng bộ chọn sân đã có sẵn cho đối kháng, không cần thêm 1
  // bộ chọn "khu vực quyền" riêng.
  const startQuyenPerformance = (item: QuyenItem) => {
    if (!currentCourtId) return;
    if (!chuyenActiveMode(currentCourtId, "quyen")) return;
    const photoUrl = item.athleteId ? athletePhoto(item.athleteId) : null;
    const coGioiHan = item.event.thoiGianBaiGiay != null;
    const state: LiveQuyenState = {
      courtId: currentCourtId,
      eventId: item.event.id,
      athleteId: item.athleteId,
      teamId: item.teamId,
      eventTen: item.event.ten,
      performerLabel: item.label,
      performerSub: item.sub,
      photoUrl,
      trangThai: "cho_bat_dau",
      coGioiHan,
      thoiGianGioiHanGiay: item.event.thoiGianBaiGiay ?? null,
      thoiGianDaTroiGiay: 0,
      capNhatDongHoLuc: serverNow(),
      lyDoKetThuc: null,
      capNhatLuc: Date.now(),
    };
    publishQuyenState(state);
    setTab("dieu_hanh_quyen");
  };

  useEffect(() => {
    if (tab !== "dieu_hanh_dk" || activeOnMyCourt) return;
    const next = numbered.find(
      ({ match }) =>
        match.trangThai === "cho_thi" &&
        match.athleteRedId &&
        match.athleteBlueId,
    );
    if (next) openIntoCourt(next.event.id, next.match.id);
  }, [tab, activeOnMyCourt, numbered]);

  if (loading || loadingCourts)
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Đang tải dữ liệu...</p>
      </div>
    );
  if (loadError)
    return (
      <div className={styles.page}>
        <p className={styles.hint}>{loadError}</p>
      </div>
    );

  const courtName = courts.find((c) => c.id === currentCourtId)?.ten ?? "";

  // Chuyển sang 1 trong 2 tab điều hành = báo cho màn hình trọng tài biết
  // sân này giờ nên hiện gì.
  const handleTabClick = (id: TabId) => {
    if (id === "dieu_hanh_dk" || id === "dieu_hanh_quyen") {
      if (
        !chuyenActiveMode(
          currentCourtId,
          id === "dieu_hanh_dk" ? "doi_khang" : "quyen",
        )
      )
        return;
    }
    setTab(id);
  };
  // Mở màn hình công khai, tự đặt vị trí bắt đầu ngay tại mép phải màn
  // hình chính đang dùng — rơi đúng vào màn hình mở rộng liền kề (đúng
  // cách Windows sắp xếp mặc định khi cắm thêm màn hình, không cần biết
  // trước độ phân giải màn phụ là bao nhiêu).
  const openPublicScreenExtended = () => {
    const url = `/man-hinh-cong-khai?san=${currentCourtId}`;
    const left = window.screen.width;
    const width = window.screen.availWidth;
    const height = window.screen.availHeight;
    window.open(
      url,
      "_blank",
      `left=${left},top=0,width=${width},height=${height}`,
    );
  };
  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.title}>Bàn thư ký</h1>
        <div className={styles.topbarActions}>
          <button
            className={styles.publicScreenLink}
            onClick={openPublicScreenExtended}>
            Mở màn hình công khai ↗
          </button>
          <select
            className={styles.courtSelect}
            value={currentCourtId}
            onChange={(e) => setCurrentCourtId(e.target.value)}>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                Đang thao tác: {c.ten}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.tabsBar}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={tab === id ? styles.tabActive : styles.tab}
            onClick={() => handleTabClick(id)}>
            <Icon size={15} /> {label}
            {id === "dieu_hanh_dk" && activeOnMyCourt && (
              <span className={styles.tabDot} />
            )}
          </button>
        ))}
      </div>

      {tab === "lich_dk" && (
        <DoiKhangScheduleTab
          numbered={numbered}
          eventOf={eventOf}
          athleteName={athleteName}
          currentCourtId={currentCourtId}
          courts={courts}
          onStart={openIntoCourt}
          onQuickFinish={quickFinish}
          onEditResult={editMatchResult}
          onReplay={replayMatch}
        />
      )}

      {tab === "lich_quyen" && (
        <QuyenScheduleTab
          items={quyenNumbered}
          quyenJudgeScores={quyenJudgeScores}
          courtName={courtName}
          onStart={startQuyenPerformance}
        />
      )}

      {tab === "dieu_hanh_dk" &&
        (!activeOnMyCourt || !activeEvent ? (
          <div className={styles.noMatch}>
            Sân đang trống — hiện chưa có trận nào đủ 2 VĐV và sẵn sàng để tự
            động bắt đầu. Xem tab "Lịch thi đấu đối kháng" để biết đang chờ gì,
            hoặc bấm "Bắt đầu" thủ công ở 1 trận cụ thể.
          </div>
        ) : (
          <DieuHanhDoiKhangTab
            key={activeOnMyCourt.id}
            match={activeOnMyCourt}
            eventTen={activeEvent.ten}
            so={numbered.find((x) => x.match.id === activeOnMyCourt.id)?.so}
            athleteName={athleteName}
            athleteTeam={athleteTeam}
            onEndMatch={(lyDo, thang) =>
              finishMatch(activeOnMyCourt, activeEvent.id, lyDo, thang)
            }
          />
        ))}

      {tab === "dieu_hanh_quyen" && (
        <DieuHanhQuyenTab
          key={currentCourtId}
          courtId={currentCourtId}
          quyenJudgeScores={quyenJudgeScores}
          trongTaiList={trongTaiList}
        />
      )}

      {tab === "trong_tai" && (
        <TrongTaiTab
          courts={courts}
          trongTaiList={trongTaiList}
          onRefresh={refreshTrongTai}
        />
      )}
    </div>
  );
}
