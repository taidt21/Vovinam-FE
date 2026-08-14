/** @format */

import { useEffect, useMemo /*, useRef*/, useState } from "react";
import {
  Minus,
  Plus,
  Flag,
  Play,
  Pause,
  SkipForward,
  Settings,
  RotateCcw,
  Pencil,
  Swords,
  Award,
  BicepsFlexed,
  Check,
  Users,
  X,
} from "lucide-react";
import type {
  Athlete,
  AthleteRecord,
  CompetitionEvent,
  // DiemTrongTai,
  LiveMatchState,
  LyDoKetThuc,
  Match,
} from "../../types";
import type { LiveQuyenState, LyDoKetThucQuyen } from "../../types/liveQuyen";
import Modal from "../../components/Modal/Modal";
import AthleteAvatar from "../../components/AthleteAvatar/AthleteAvatar";
import { useCourts } from "../../lib/useCourts";
import type { CourtBasic } from "../../lib/courts";
import { numberDoiKhangMatches, type NumberedMatch } from "../../lib/bracket";
import { compareNhomTuoi, formatEventNhomTuoi } from "../../lib/nhomTuoi";
import { serverNow } from "../../lib/serverClock";
import { apiGet } from "../../lib/api";
import { fetchEvents } from "../../lib/eventsApi";
import { fetchMatches, updateMatch } from "../../lib/matchesApi";
import {
  fetchQuyenJudgeScores,
  type QuyenJudgeScoreWire,
} from "../../lib/quyenJudgeScoreApi";
import { tinhDiemQuyenTongHop } from "../../lib/quyenScoring";
import {
  fetchTrongTai,
  createTrongTai,
  updateTrongTai,
  deleteTrongTai,
  type TrongTaiWire,
} from "../../lib/trongTaiApi";
import {
  clearMatchState,
  formatMmSs,
  getMatchSnapshot,
  publishMatchState,
  subscribeMatchState,
  tinhThoiGianConLai,
} from "../../lib/liveMatchStore";
import {
  clearQuyenState,
  getQuyenSnapshot,
  publishQuyenState,
  subscribeQuyenState,
  tinhThoiGianDaTroi,
} from "../../lib/liveQuyenStore";
import MatchLogPanel from "../../components/MatchLogPanel/MatchLogPanel";
import LiveLightsPanel from "../../components/LiveLightsPanel/LiveLightsPanel";
import LightBoxes from "../../components/LightBoxes/LightBoxes";
import { usePressedLights } from "../../lib/usePressedLights";

import styles from "./BanThuKy.module.scss";

const LY_DO_OPTIONS: { value: LyDoKetThuc; label: string }[] = [
  { value: "thang_diem", label: "Thắng điểm" },
  { value: "boc_tham", label: "Bốc thăm" },
  { value: "bo_cuoc", label: "Bỏ cuộc" },
];

const LY_DO_KET_THUC_QUYEN_OPTIONS: {
  value: LyDoKetThucQuyen;
  label: string;
}[] = [
  { value: "hoan_thanh", label: "Hoàn thành bình thường" },
  { value: "quen_bai", label: "Quên bài" },
  { value: "dung_bai", label: "Dừng bài giữa chừng" },
  { value: "roi_vu_khi", label: "Rơi vũ khí" },
  { value: "chan_thuong", label: "Chấn thương" },
  { value: "loi_may", label: "Mất điện / lỗi máy" },
];
const LY_DO_KET_THUC_QUYEN_LABEL: Record<LyDoKetThucQuyen, string> =
  Object.fromEntries(
    LY_DO_KET_THUC_QUYEN_OPTIONS.map((o) => [o.value, o.label]),
  ) as Record<LyDoKetThucQuyen, string>;

const DEFAULT_TONG_SO_HIEP = 2;
const DEFAULT_THOI_GIAN_HIEP = 60;
const DEFAULT_THOI_GIAN_NGHI = 30;
const DEFAULT_SO_TRONG_TAI = 5;

interface PerformanceOrderWire {
  id: string;
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
  thuTu: number;
}
interface QuyenItem {
  event: CompetitionEvent;
  athleteId: string | null;
  teamId: string | null;
  label: string;
  sub: string;
  isTeam: boolean;
  so: number;
}

function quyenKeyOf(
  eventId: string,
  athleteId: string | null,
  teamId: string | null,
): string {
  return `${eventId}::${athleteId ?? ""}::${teamId ?? ""}`;
}
function scoreMatchesQuyenItem(
  s: QuyenJudgeScoreWire,
  item: Pick<QuyenItem, "event" | "athleteId" | "teamId">,
): boolean {
  return (
    s.eventId === item.event.id &&
    s.athleteId === item.athleteId &&
    s.teamId === item.teamId
  );
}

function makeLiveState(
  courtId: string,
  eventTen: string,
  match: Match,
  tenDo: string,
  donViDo: string,
  anhDo: string | null,
  tenXanh: string,
  donViXanh: string,
  anhXanh: string | null,
): LiveMatchState {
  return {
    matchId: match.id,
    courtId,
    tenNoiDung: eventTen,
    vong: match.vong,
    tenDo,
    donViDo,
    anhDo,
    tenXanh,
    donViXanh,
    anhXanh,
    trangThai: "cho_bat_dau",
    hiepHienTai: 0,
    tongSoHiep: DEFAULT_TONG_SO_HIEP,
    thoiGianHiepGiay: DEFAULT_THOI_GIAN_HIEP,
    thoiGianNghiGiay: DEFAULT_THOI_GIAN_NGHI,
    thoiGianConLaiGiay: DEFAULT_THOI_GIAN_HIEP,
    capNhatDongHoLuc: serverNow(),
    soTrongTaiCanCo: DEFAULT_SO_TRONG_TAI,
    diemChinhThucDo: 0,
    diemChinhThucXanh: 0,
    diemDaChinhTay: false,
    canhCaoDo: 0,
    canhCaoXanh: 0,
    nguoiThang: null,
    capNhatLuc: Date.now(),
  };
}

const TABS = [
  { id: "lich_dk", label: "Lịch thi đấu đối kháng", icon: Swords },
  { id: "lich_quyen", label: "Lịch thi đấu quyền", icon: BicepsFlexed },
  { id: "dieu_hanh_dk", label: "Điều hành đối kháng", icon: Swords },
  { id: "dieu_hanh_quyen", label: "Điều hành quyền", icon: BicepsFlexed },
  { id: "trong_tai", label: "Trọng tài", icon: Users },
] as const;
type TabId = (typeof TABS)[number]["id"];

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
  const refreshTrongTai = () => fetchTrongTai().then(setTrongTaiList).catch(() => {});

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
    const photoUrl = item.athleteId ? athletePhoto(item.athleteId) : null;
    const coGioiHan = item.event.thoiGianBaiGiay !== undefined;
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
            onClick={() => setTab(id)}>
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

/* ============ Lịch thi đấu — Đối kháng ============ */
function DoiKhangScheduleTab({
  numbered,
  eventOf,
  athleteName,
  currentCourtId,
  courts,
  onStart,
  onQuickFinish,
  onEditResult,
  onReplay,
}: {
  numbered: NumberedMatch[];
  eventOf: (id: string) => CompetitionEvent | undefined;
  athleteName: (id: string | null) => string | null;
  currentCourtId: string;
  courts: CourtBasic[];
  onStart: (eventId: string, matchId: string) => void;
  onQuickFinish: (
    eventId: string,
    matchId: string,
    side: "do" | "xanh",
  ) => void;
  onEditResult: (
    match: Match,
    eventId: string,
    lyDo: LyDoKetThuc,
    side: "do" | "xanh",
  ) => void;
  onReplay: (match: Match, eventId: string) => void;
}) {
  const courtName = courts.find((c) => c.id === currentCourtId)?.ten ?? "";
  const [editingItem, setEditingItem] = useState<NumberedMatch | null>(null);
  const [editLyDo, setEditLyDo] = useState<LyDoKetThuc>("thang_diem");

  const openEdit = (item: NumberedMatch) => {
    setEditLyDo(item.match.lyDoKetThuc ?? "thang_diem");
    setEditingItem(item);
  };

  const [liveStatesByCourtId, setLiveStatesByCourtId] = useState<
    Record<string, LiveMatchState | null>
  >({});

  useEffect(() => {
    setLiveStatesByCourtId(
      Object.fromEntries(courts.map((c) => [c.id, getMatchSnapshot(c.id)])),
    );
    const unsubs = courts.map((c) =>
      subscribeMatchState(c.id, (state) =>
        setLiveStatesByCourtId((prev) => ({ ...prev, [c.id]: state })),
      ),
    );
    return () => unsubs.forEach((unsub) => unsub());
  }, [courts]);

  const currentCourtLive = liveStatesByCourtId[currentCourtId];
  const trueCourtBusy =
    currentCourtLive?.trangThai === "dang_thi" ||
    currentCourtLive?.trangThai === "nghi_giua_hiep" ||
    currentCourtLive?.trangThai === "tam_dung";
  const courtHasPendingStart = currentCourtLive?.trangThai === "cho_bat_dau";

  return (
    <section className={styles.listCard}>
      <div className={styles.listHead}>
        <span>Toàn bộ trận đối kháng ({numbered.length})</span>
        {trueCourtBusy && (
          <span className={styles.listHint}>
            {courtName} đang bận — kết thúc trận hiện tại trước khi bắt đầu trận
            khác
          </span>
        )}
      </div>
      <div className={styles.listBody}>
        {numbered.map((item) => {
          const { event, match, so } = item;
          const readyToPlay = !!match.athleteRedId && !!match.athleteBlueId;
          const daXong = match.trangThai === "da_hoan_thanh";
          const live = match.courtId
            ? liveStatesByCourtId[match.courtId]
            : null;
          const dangThiThat =
            live?.trangThai === "dang_thi" ||
            live?.trangThai === "nghi_giua_hiep";
          const loserSide: "do" | "xanh" | null =
            daXong && match.nguoiThangId
              ? match.nguoiThangId === match.athleteRedId
                ? "xanh"
                : "do"
              : null;
          return (
            <div key={match.id} className={styles.listRow}>
              <span className={styles.listNo}>#{so}</span>
              <div className={styles.listInfo}>
                <div className={styles.listEvent}>
                  {eventOf(event.id)?.ten} · {match.vong}
                </div>
                <div className={styles.listNames}>
                  <span className={styles.dotDo} />{" "}
                  <span
                    className={
                      loserSide === "do" ? styles.loserName : undefined
                    }>
                    {athleteName(match.athleteRedId) ?? "Chờ xác định"}
                  </span>
                  <span className={styles.vs}>vs</span>
                  <span className={styles.dotXanh} />{" "}
                  <span
                    className={
                      loserSide === "xanh" ? styles.loserName : undefined
                    }>
                    {athleteName(match.athleteBlueId) ?? "Chờ xác định"}
                  </span>
                </div>
              </div>
              {daXong ? (
                <div className={styles.listActions}>
                  <button
                    className={styles.editBtn}
                    onClick={() => openEdit(item)}
                    title="Sửa lại người thắng hoặc lý do">
                    <Pencil size={12} /> Sửa
                  </button>
                  <button
                    className={styles.replayBtn}
                    onClick={() => onReplay(match, event.id)}
                    title="Xoá kết quả, cho thi đấu lại từ đầu">
                    <RotateCcw size={12} /> Đấu lại
                  </button>
                </div>
              ) : match.trangThai === "dang_thi" ? (
                dangThiThat ? (
                  <span className={styles.playingTag}>Đang thi</span>
                ) : live?.trangThai === "tam_dung" ? (
                  <span className={styles.pausedTag}>Tạm dừng</span>
                ) : (
                  <span className={styles.waitTag}>Chờ bắt đầu</span>
                )
              ) : readyToPlay ? (
                <div className={styles.listActions}>
                  <button
                    className={styles.quickBtnDo}
                    disabled={trueCourtBusy}
                    onClick={() => onQuickFinish(event.id, match.id, "do")}
                    title="Xử Đỏ thắng ngay, không qua chấm điểm">
                    Đỏ thắng
                  </button>
                  <button
                    className={styles.quickBtnXanh}
                    disabled={trueCourtBusy}
                    onClick={() => onQuickFinish(event.id, match.id, "xanh")}
                    title="Xử Xanh thắng ngay, không qua chấm điểm">
                    Xanh thắng
                  </button>
                  <button
                    className={styles.startBtn}
                    disabled={trueCourtBusy}
                    onClick={() => onStart(event.id, match.id)}
                    title={
                      courtHasPendingStart
                        ? `Thay trận đang chờ bắt đầu ở ${courtName} bằng trận này`
                        : undefined
                    }>
                    Bắt đầu
                  </button>
                </div>
              ) : (
                <span className={styles.waitTag}>Chờ xác định</span>
              )}
            </div>
          );
        })}
        {numbered.length === 0 && (
          <p className={styles.empty}>
            Chưa có trận nào — vào Nội dung & bốc thăm để bốc thăm trước.
          </p>
        )}
      </div>

      {editingItem && (
        <Modal
          title={`Sửa kết quả — #${editingItem.so} ${editingItem.event.ten}`}
          onClose={() => setEditingItem(null)}>
          <div className={styles.settingsForm}>
            <label className={styles.reasonRow}>
              <span>Lý do</span>
              <select
                value={editLyDo}
                onChange={(e) => setEditLyDo(e.target.value as LyDoKetThuc)}>
                {LY_DO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.controlBtns}>
              <button
                className={styles.pickDoBig}
                onClick={() => {
                  onEditResult(
                    editingItem.match,
                    editingItem.event.id,
                    editLyDo,
                    "do",
                  );
                  setEditingItem(null);
                }}>
                {athleteName(editingItem.match.athleteRedId)} thắng
              </button>
              <button
                className={styles.pickXanhBig}
                onClick={() => {
                  onEditResult(
                    editingItem.match,
                    editingItem.event.id,
                    editLyDo,
                    "xanh",
                  );
                  setEditingItem(null);
                }}>
                {athleteName(editingItem.match.athleteBlueId)} thắng
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

/* ============ Lịch thi đấu — Quyền ============ */
function QuyenScheduleTab({
  items,
  quyenJudgeScores,
  courtName,
  onStart,
}: {
  items: QuyenItem[];
  quyenJudgeScores: QuyenJudgeScoreWire[];
  courtName: string;
  onStart: (item: QuyenItem) => void;
}) {
  return (
    <section className={styles.listCard}>
      <div className={styles.listHead}>
        <span>Toàn bộ lượt thi quyền ({items.length})</span>
      </div>
      <div className={styles.listBody}>
        {items.map((item) => {
          const scores = quyenJudgeScores.filter((s) =>
            scoreMatchesQuyenItem(s, item),
          );
          const tongHop = tinhDiemQuyenTongHop(scores.map((s) => s.diem));
          return (
            <div
              key={quyenKeyOf(item.event.id, item.athleteId, item.teamId)}
              className={styles.listRow}>
              <span className={styles.listNo}>#{item.so}</span>
              <div className={styles.listInfo}>
                <div className={styles.listEvent}>
                  {item.event.ten} · {formatEventNhomTuoi(item.event.nhomTuoi)}
                </div>
                <div className={styles.listNames}>
                  {item.label}{" "}
                  <span className={styles.subInline}>({item.sub})</span>
                </div>
              </div>
              {tongHop !== null ? (
                <span className={styles.resultTag}>
                  Kết quả: {tongHop.toFixed(2)}
                </span>
              ) : (
                <button
                  className={styles.startBtn}
                  onClick={() => onStart(item)}>
                  Bắt đầu tại {courtName}
                </button>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <p className={styles.empty}>
            Chưa có lượt thi quyền nào — vào Nội dung & bốc thăm để bốc thăm
            trước.
          </p>
        )}
      </div>
    </section>
  );
}

/* ============ Điều hành — Quyền ============ */
function DieuHanhQuyenTab({
  courtId,
  quyenJudgeScores,
  trongTaiList,
}: {
  courtId: string;
  quyenJudgeScores: QuyenJudgeScoreWire[];
  trongTaiList: TrongTaiWire[];
}) {
  const [live, setLive] = useState<LiveQuyenState | null>(() =>
    getQuyenSnapshot(courtId),
  );
  const [, setTick] = useState(0);
  const [showEndFlow, setShowEndFlow] = useState(false);
  const [lyDo, setLyDo] = useState<LyDoKetThucQuyen>("hoan_thanh");

  useEffect(() => {
    setLive(getQuyenSnapshot(courtId));
    return subscribeQuyenState(courtId, setLive);
  }, [courtId]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!live) {
    return (
      <div className={styles.noMatch}>
        Chưa có ai đang thi ở khu vực này — sang tab "Lịch thi đấu quyền" và bấm
        "Bắt đầu" ở 1 lượt để đưa vào đây.
      </div>
    );
  }

  const patch = (p: Partial<LiveQuyenState>) => {
    const next = { ...live, ...p, capNhatLuc: Date.now() };
    publishQuyenState(next);
    setLive(next);
  };

  const daTroi = tinhThoiGianDaTroi(live);
  const hienThi = live.coGioiHan
    ? Math.max(0, (live.thoiGianGioiHanGiay ?? 0) - daTroi)
    : daTroi;
  const hetGio =
    live.coGioiHan && hienThi <= 0 && live.trangThai === "dang_thi";
  const dangThi = live.trangThai === "dang_thi";
  const dangTamDung = live.trangThai === "tam_dung";
  const daKetThuc = live.trangThai === "da_ket_thuc";

  const batDau = () =>
    patch({ trangThai: "dang_thi", capNhatDongHoLuc: serverNow() });
  const tamDung = () =>
    patch({ trangThai: "tam_dung", thoiGianDaTroiGiay: daTroi });
  const tiepTuc = () =>
    patch({ trangThai: "dang_thi", capNhatDongHoLuc: serverNow() });

  const ketThuc = (reason: LyDoKetThucQuyen) => {
    patch({
      trangThai: "da_ket_thuc",
      lyDoKetThuc: reason,
      thoiGianDaTroiGiay: daTroi,
    });
    setShowEndFlow(false);
  };

  const xongHan = () => clearQuyenState(courtId);

  const choThiLai = () => {
    if (
      !window.confirm(
        "Cho thi lại từ đầu? Đồng hồ sẽ về 0 — các điểm giám khảo đã gửi cho " +
          "lượt này VẪN CÒN, cần tự nhắc giám khảo gửi lại nếu cần chấm lại.",
      )
    )
      return;
    patch({
      trangThai: "cho_bat_dau",
      thoiGianDaTroiGiay: 0,
      lyDoKetThuc: null,
    });
  };

  const scores = quyenJudgeScores.filter(
    (s) =>
      s.eventId === live.eventId &&
      s.athleteId === live.athleteId &&
      s.teamId === live.teamId,
  );
  const tongHop = tinhDiemQuyenTongHop(scores.map((s) => s.diem));
  // 5 giám định ĐANG HOẠT ĐỘNG tại đúng sân này, xếp theo đúng số vị trí
  // Bàn thư ký đã gán — không phải theo thứ tự gửi điểm.
  const giamDinhSan = trongTaiList
    .filter((t) => t.courtId === live.courtId && t.thuTuGiamDinh !== null)
    .sort((a, b) => (a.thuTuGiamDinh ?? 0) - (b.thuTuGiamDinh ?? 0));

  const mm = Math.floor(hienThi / 60);
  const ss = Math.floor(hienThi % 60);
  const timeLabel = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  return (
    <div className={styles.dieuHanhQuyen}>
      <div className={styles.matchMeta}>{live.eventTen}</div>

      <div className={styles.quyenJudgeList}>
        {[1, 2, 3, 4, 5].map((n) => {
          const gd = giamDinhSan.find((t) => t.thuTuGiamDinh === n);
          const diem = gd
            ? scores.find((s) => s.giamKhaoId === gd.id)?.diem
            : undefined;
          return (
            <div key={n} className={styles.quyenJudgeRow}>
              <span className={styles.quyenJudgeLabel}>
                Giám định {n}
                {gd ? ` — ${gd.hoTen}` : " — chưa gán"}
              </span>
              <span
                className={
                  diem !== undefined
                    ? styles.quyenJudgeScore
                    : styles.quyenJudgeScorePending
                }>
                {diem !== undefined ? diem : gd ? "chưa chấm" : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {tongHop !== null && (
        <div className={styles.quyenResultBox}>
          <span>Tổng điểm</span>
          <strong>{tongHop.toFixed(2)}</strong>
        </div>
      )}

      <div className={styles.quyenPerformer}>
        <AthleteAvatar
          name={live.performerLabel}
          photoUrl={live.photoUrl}
          size={96}
        />
        <div className={styles.quyenPerformerName}>{live.performerLabel}</div>
        <div className={styles.quyenPerformerSub}>{live.performerSub}</div>
      </div>

      {daKetThuc ? (
        <div className={styles.endedBox}>
          <Award size={28} />
          <span className={styles.endedLabel}>
            {live.lyDoKetThuc === "hoan_thanh"
              ? "Đã hoàn thành"
              : `Đã kết thúc — ${LY_DO_KET_THUC_QUYEN_LABEL[live.lyDoKetThuc!]}`}
          </span>
          <div className={styles.controlBtns}>
            <button className={styles.btnPrimary} onClick={xongHan}>
              <Check size={16} /> Xong, qua lượt tiếp theo
            </button>
            <button className={styles.linkBtn} onClick={choThiLai}>
              Cho thi lại
            </button>
          </div>
        </div>
      ) : (
        <>
          <span
            className={`${styles.timerBig} ${hetGio ? styles.timerDone : ""}`}>
            {timeLabel}
          </span>
          {!live.coGioiHan && (
            <p className={styles.hint}>
              Không giới hạn thời gian — đồng hồ chỉ đếm để tham khảo.
            </p>
          )}
          {hetGio && (
            <p className={styles.hint}>Đã hết thời gian tham chiếu của bài.</p>
          )}

          {live.trangThai === "cho_bat_dau" && (
            <button className={styles.timerBtn} onClick={batDau}>
              <Play size={15} /> Bắt đầu
            </button>
          )}
          {dangThi && (
            <button className={styles.timerBtn} onClick={tamDung}>
              <Pause size={15} /> Tạm dừng
            </button>
          )}
          {dangTamDung && (
            <button className={styles.timerBtn} onClick={tiepTuc}>
              <Play size={15} /> Tiếp tục
            </button>
          )}

          {!showEndFlow ? (
            <button
              className={styles.btnDangerBig}
              onClick={() => setShowEndFlow(true)}>
              <Flag size={18} /> Kết thúc lượt
            </button>
          ) : (
            <div className={styles.settingsForm}>
              <label className={styles.reasonRow}>
                <span>Lý do</span>
                <select
                  value={lyDo}
                  onChange={(e) => setLyDo(e.target.value as LyDoKetThucQuyen)}>
                  {LY_DO_KET_THUC_QUYEN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className={styles.btnPrimary}
                onClick={() => ketThuc(lyDo)}>
                Xác nhận kết thúc
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ============ Trọng tài (danh sách) ============ */
function TrongTaiTab({
  courts,
  trongTaiList,
  onRefresh,
}: {
  courts: CourtBasic[];
  trongTaiList: TrongTaiWire[];
  onRefresh: () => void;
}) {
  const [hoTenMoi, setHoTenMoi] = useState("");
  const [courtMoi, setCourtMoi] = useState(courts[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  const themTrongTai = async () => {
    if (!hoTenMoi.trim()) return;
    setSaving(true);
    try {
      await createTrongTai({
        hoTen: hoTenMoi.trim(),
        courtId: courtMoi || null,
        thuTuGiamDinh: null,
      });
      setHoTenMoi("");
      onRefresh();
    } catch {
      window.alert("Thêm trọng tài thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const doiViTri = async (t: TrongTaiWire, thuTu: number | null) => {
    try {
      await updateTrongTai(t.id, {
        hoTen: t.hoTen,
        courtId: t.courtId,
        thuTuGiamDinh: thuTu,
      });
      onRefresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Đổi vị trí thất bại.");
    }
  };

  const doiSan = async (t: TrongTaiWire, courtId: string) => {
    try {
      // Đổi sân thì reset về dự bị luôn — số Giám định cũ gắn với sân cũ,
      // mang qua sân mới dễ đụng người khác đang giữ đúng số đó.
      await updateTrongTai(t.id, { hoTen: t.hoTen, courtId, thuTuGiamDinh: null });
      onRefresh();
    } catch {
      window.alert("Đổi sân thất bại.");
    }
  };

  const xoa = async (t: TrongTaiWire) => {
    if (!window.confirm(`Xoá "${t.hoTen}" khỏi danh sách trọng tài?`)) return;
    try {
      await deleteTrongTai(t.id);
      onRefresh();
    } catch {
      window.alert("Xoá thất bại.");
    }
  };

  return (
    <div className={styles.trongTaiTab}>
      <div className={styles.trongTaiAddForm}>
        <input
          value={hoTenMoi}
          onChange={(e) => setHoTenMoi(e.target.value)}
          placeholder="Tên trọng tài mới"
        />
        <select value={courtMoi} onChange={(e) => setCourtMoi(e.target.value)}>
          {courts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.ten}
            </option>
          ))}
        </select>
        <button
          className={styles.btnPrimary}
          disabled={saving || !hoTenMoi.trim()}
          onClick={themTrongTai}>
          <Plus size={16} /> Thêm
        </button>
      </div>

      {courts.map((court) => {
        const nguoiOSan = trongTaiList.filter((t) => t.courtId === court.id);
        return (
          <div key={court.id} className={styles.trongTaiCourtGroup}>
            <div className={styles.trongTaiCourtName}>
              {court.ten} · {nguoiOSan.length} trọng tài
            </div>
            {nguoiOSan.length === 0 && (
              <p className={styles.hint}>Chưa có trọng tài nào ở sân này.</p>
            )}
            {nguoiOSan.map((t) => (
              <div key={t.id} className={styles.trongTaiRow}>
                <span className={styles.trongTaiName}>{t.hoTen}</span>
                <select
                  value={t.thuTuGiamDinh ?? ""}
                  onChange={(e) =>
                    doiViTri(t, e.target.value ? Number(e.target.value) : null)
                  }>
                  <option value="">Dự bị</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      Giám định {n}
                    </option>
                  ))}
                </select>
                <select
                  value={t.courtId ?? ""}
                  onChange={(e) => doiSan(t, e.target.value)}>
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.ten}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.trongTaiDelete}
                  onClick={() => xoa(t)}
                  aria-label="Xoá trọng tài">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ============ Điều hành — Đối kháng ============ */
function DieuHanhDoiKhangTab({
  match,
  eventTen,
  so,
  athleteName,
  athleteTeam,
  onEndMatch,
}: {
  match: Match;
  eventTen: string;
  so: number | undefined;
  athleteName: (id: string | null) => string | null;
  athleteTeam: (id: string | null) => string;
  onEndMatch: (lyDo: LyDoKetThuc, thang: "do" | "xanh") => void;
}) {
  const courtId = match.courtId!;
  const [live, setLive] = useState<LiveMatchState | null>(() =>
    getMatchSnapshot(courtId),
  );
  const pressed = usePressedLights(courtId);
  const [, setTick] = useState(0);

  const [showEndFlow, setShowEndFlow] = useState(false);
  const [lyDo, setLyDo] = useState<LyDoKetThuc>("thang_diem");
  const [showSettings, setShowSettings] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  useEffect(() => {
    setLive(getMatchSnapshot(courtId));
    return subscribeMatchState(courtId, setLive);
  }, [courtId]);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (live) {
      setShowRecovery(false);
      return;
    }
    const t = setTimeout(() => setShowRecovery(true), 2000);
    return () => clearTimeout(t);
  }, [live, courtId]);
  if (!live) {
    if (!showRecovery)
      return <p className={styles.hint}>Đang khởi tạo trận...</p>;
    return (
      <RecoveryScreen
        match={match}
        eventTen={eventTen}
        athleteName={athleteName}
        athleteTeam={athleteTeam}
      />
    );
  }

  const remaining = tinhThoiGianConLai(live);
  const dangChay = live.trangThai === "dang_thi";
  const dangNghi = live.trangThai === "nghi_giua_hiep";
  const laHiepCuoi = live.hiepHienTai >= live.tongSoHiep;
  const hetGio = remaining <= 0 && (dangChay || dangNghi);

  const patch = (p: Partial<LiveMatchState>) => {
    const next = { ...live, ...p, capNhatLuc: Date.now() };
    publishMatchState(next);
    setLive(next);
  };

  const batDauHiep = () =>
    patch({
      trangThai: "dang_thi",
      hiepHienTai: live.hiepHienTai + 1,
      thoiGianConLaiGiay: live.thoiGianHiepGiay,
      capNhatDongHoLuc: serverNow(),
    });
  const tamDung = () =>
    patch({ trangThai: "tam_dung", thoiGianConLaiGiay: remaining });
  const tiepTuc = () =>
    patch({ trangThai: "dang_thi", capNhatDongHoLuc: serverNow() });
  const ketThucHiep = () =>
    patch(
      laHiepCuoi
        ? { trangThai: "tam_dung", thoiGianConLaiGiay: 0 }
        : {
            trangThai: "nghi_giua_hiep",
            thoiGianConLaiGiay: live.thoiGianNghiGiay,
            capNhatDongHoLuc: serverNow(),
          },
    );

  const adjustScore = (side: "do" | "xanh", delta: number) => {
    const key = side === "do" ? "diemChinhThucDo" : "diemChinhThucXanh";
    patch({
      [key]: live[key] + delta,
      diemDaChinhTay: true,
    } as Partial<LiveMatchState>);
  };

  const adjustNhacNho = (side: "do" | "xanh", delta: number) => {
    const key = side === "do" ? "canhCaoDo" : "canhCaoXanh";
    const scoreKey = side === "do" ? "diemChinhThucDo" : "diemChinhThucXanh";
    const next = Math.max(0, live[key] + delta);
    if (delta > 0 && next >= 3) {
      patch({
        [key]: 0,
        [scoreKey]: live[scoreKey] - 2,
      } as Partial<LiveMatchState>);
    } else {
      patch({ [key]: next } as Partial<LiveMatchState>);
    }
  };

  const restartMatch = () => {
    if (
      !window.confirm(
        "Đấu lại từ đầu? Toàn bộ điểm, nhắc nhở và tiến trình hiệp hiện tại sẽ bị xóa.",
      )
    )
      return;
    patch({
      trangThai: "cho_bat_dau",
      hiepHienTai: 0,
      thoiGianConLaiGiay: live.thoiGianHiepGiay,
      diemChinhThucDo: 0,
      diemChinhThucXanh: 0,
      diemDaChinhTay: false,
      canhCaoDo: 0,
      canhCaoXanh: 0,
      nguoiThang: null,
    });
  };

  const daKetThuc = live.trangThai === "da_ket_thuc";

  const confirmWinner = (thang: "do" | "xanh") => {
    patch({ trangThai: "da_ket_thuc", nguoiThang: thang, lyDoKetThuc: lyDo });
    setShowEndFlow(false);
  };
  const confirmFinish = () => {
    if (live.nguoiThang) onEndMatch(live.lyDoKetThuc ?? lyDo, live.nguoiThang);
  };
  const huyKetThuc = () =>
    patch({ trangThai: "tam_dung", nguoiThang: null, lyDoKetThuc: undefined });

  return (
    <div className={styles.dieuHanh}>
      <div className={styles.matchMeta}>
        {so && <span className={styles.matchNoTag}>#{so}</span>} {eventTen} ·{" "}
        {match.vong}
      </div>

      <div className={styles.scoreBoardBig}>
        <div
          className={[
            styles.cornerDo,
            daKetThuc
              ? live.nguoiThang === "do"
                ? styles.cornerWinner
                : styles.cornerLoser
              : "",
          ]
            .filter(Boolean)
            .join(" ")}>
          {!daKetThuc && (
            <LightBoxes presses={pressed.do.map((p) => p.diem)} />
          )}
          <div className={styles.cornerMain}>
            <span className={styles.cornerLabelDo}>ĐỎ</span>
            <AthleteAvatar
              name={athleteName(match.athleteRedId) ?? "—"}
              photoUrl={live.anhDo}
              size={72}
            />
            <div className={styles.athNameBig}>
              {athleteName(match.athleteRedId)}
            </div>
            <div className={styles.athUnit}>
              {athleteTeam(match.athleteRedId)}
            </div>
            <div className={styles.scoreNumDoBig}>{live.diemChinhThucDo}</div>
            {daKetThuc ? (
              live.nguoiThang === "do" && (
                <div className={styles.winnerBadge}>
                  <Award size={16} /> Thắng
                </div>
              )
            ) : (
              <>
                <div className={styles.stepBtnsBig}>
                  <button onClick={() => adjustScore("do", -1)}>
                    <Minus size={22} />
                  </button>
                  <button onClick={() => adjustScore("do", 1)}>
                    <Plus size={22} />
                  </button>
                </div>
                <div className={styles.warnRowBig}>
                  <span>Nhắc nhở (3 → tự trừ 2đ)</span>
                  <div className={styles.dotsBig}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={
                          i < live.canhCaoDo ? styles.dotOnDo : styles.dotOff
                        }
                      />
                    ))}
                  </div>
                  <button onClick={() => adjustNhacNho("do", -1)}>
                    <Minus size={14} />
                  </button>
                  <button onClick={() => adjustNhacNho("do", 1)}>
                    <Plus size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.timerCol}>
          {daKetThuc ? (
            <div className={styles.endedBox}>
              <Award size={28} />
              <span className={styles.endedLabel}>Đã có người thắng</span>
              <div className={styles.controlBtns}>
                <button className={styles.btnPrimary} onClick={confirmFinish}>
                  <Check size={16} /> Xác nhận, qua trận tiếp theo
                </button>
                <button className={styles.linkBtn} onClick={huyKetThuc}>
                  Bấm nhầm, chọn lại
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.hiepRow}>
                <span className={styles.hiep}>
                  {live.hiepHienTai === 0
                    ? "Chưa bắt đầu"
                    : dangNghi
                      ? `Nghỉ giữa hiệp ${live.hiepHienTai}`
                      : `Hiệp ${live.hiepHienTai}/${live.tongSoHiep}`}
                </span>
                {live.trangThai === "cho_bat_dau" && (
                  <button
                    className={styles.settingsBtn}
                    onClick={() => setShowSettings(true)}
                    aria-label="Cài đặt trận">
                    <Settings size={14} />
                  </button>
                )}
              </div>
              <span
                className={`${styles.timerBig} ${hetGio ? styles.timerDone : ""}`}>
                {formatMmSs(remaining)}
              </span>
              {live.trangThai === "cho_bat_dau" && (
                <button className={styles.timerBtn} onClick={batDauHiep}>
                  <Play size={15} /> Bắt đầu hiệp 1
                </button>
              )}
              {dangChay && !hetGio && (
                <div className={styles.timerBtnRow}>
                  <button className={styles.timerBtn} onClick={tamDung}>
                    <Pause size={15} />
                  </button>
                  <button className={styles.timerBtn} onClick={ketThucHiep}>
                    <SkipForward size={15} />
                  </button>
                </div>
              )}
              {live.trangThai === "tam_dung" &&
                !(laHiepCuoi && live.hiepHienTai > 0) && (
                  <button className={styles.timerBtn} onClick={tiepTuc}>
                    <Play size={15} /> Tiếp tục
                  </button>
                )}
              {dangNghi && (
                <button className={styles.timerBtn} onClick={batDauHiep}>
                  <Play size={15} /> Bắt đầu hiệp {live.hiepHienTai + 1}
                </button>
              )}
              {hetGio && dangChay && (
                <button className={styles.timerBtn} onClick={ketThucHiep}>
                  <SkipForward size={15} /> Hết giờ
                </button>
              )}
              <button className={styles.restartBtn} onClick={restartMatch}>
                <RotateCcw size={13} /> Đấu lại từ đầu
              </button>
            </>
          )}
        </div>

        <div
          className={[
            styles.cornerXanh,
            daKetThuc
              ? live.nguoiThang === "xanh"
                ? styles.cornerWinner
                : styles.cornerLoser
              : "",
          ]
            .filter(Boolean)
            .join(" ")}>
          <div className={styles.cornerMain}>
            <span className={styles.cornerLabelXanh}>XANH</span>
            <AthleteAvatar
              name={athleteName(match.athleteBlueId) ?? "—"}
              photoUrl={live.anhXanh}
              size={72}
            />
            <div className={styles.athNameBig}>
              {athleteName(match.athleteBlueId)}
            </div>
            <div className={styles.athUnit}>
              {athleteTeam(match.athleteBlueId)}
            </div>
            <div className={styles.scoreNumXanhBig}>
              {live.diemChinhThucXanh}
            </div>
            {daKetThuc ? (
              live.nguoiThang === "xanh" && (
                <div className={styles.winnerBadge}>
                  <Award size={16} /> Thắng
                </div>
              )
            ) : (
              <>
                <div className={styles.stepBtnsBig}>
                  <button onClick={() => adjustScore("xanh", -1)}>
                    <Minus size={22} />
                  </button>
                  <button onClick={() => adjustScore("xanh", 1)}>
                    <Plus size={22} />
                  </button>
                </div>
                <div className={styles.warnRowBig}>
                  <span>Nhắc nhở (3 → tự trừ 2đ)</span>
                  <div className={styles.dotsBig}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={
                          i < live.canhCaoXanh
                            ? styles.dotOnXanh
                            : styles.dotOff
                        }
                      />
                    ))}
                  </div>
                  <button onClick={() => adjustNhacNho("xanh", -1)}>
                    <Minus size={14} />
                  </button>
                  <button onClick={() => adjustNhacNho("xanh", 1)}>
                    <Plus size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
          {!daKetThuc && (
            <LightBoxes presses={pressed.xanh.map((p) => p.diem)} />
          )}
        </div>
      </div>

      <LiveLightsPanel courtId={courtId} />

      {!daKetThuc && (
        <div className={styles.controls}>
          {!showEndFlow ? (
            <button
              className={styles.btnDangerBig}
              onClick={() => setShowEndFlow(true)}>
              <Flag size={18} /> Kết thúc trận
            </button>
          ) : (
            <>
              <label className={styles.reasonRow}>
                <span>Lý do</span>
                <select
                  value={lyDo}
                  onChange={(e) => setLyDo(e.target.value as LyDoKetThuc)}>
                  {LY_DO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.controlBtns}>
                <button
                  className={styles.pickDoBig}
                  onClick={() => confirmWinner("do")}>
                  Đỏ thắng
                </button>
                <button
                  className={styles.pickXanhBig}
                  onClick={() => confirmWinner("xanh")}>
                  Xanh thắng
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <MatchLogPanel courtId={courtId} />

      {showSettings && (
        <Modal title="Cài đặt trận đấu" onClose={() => setShowSettings(false)}>
          <div className={styles.settingsForm}>
            <label className={styles.field}>
              <span>Số hiệp</span>
              <input
                type="number"
                min={1}
                max={5}
                value={live.tongSoHiep}
                onChange={(e) => patch({ tongSoHiep: Number(e.target.value) })}
              />
            </label>
            <label className={styles.field}>
              <span>Thời gian mỗi hiệp (giây)</span>
              <input
                type="number"
                min={30}
                step={10}
                value={live.thoiGianHiepGiay}
                onChange={(e) =>
                  patch({
                    thoiGianHiepGiay: Number(e.target.value),
                    thoiGianConLaiGiay: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className={styles.field}>
              <span>Thời gian nghỉ giữa hiệp (giây)</span>
              <input
                type="number"
                min={10}
                step={10}
                value={live.thoiGianNghiGiay}
                onChange={(e) =>
                  patch({ thoiGianNghiGiay: Number(e.target.value) })
                }
              />
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
/* ============ Hồi phục trận sau khi mất trạng thái sống ============ */
function RecoveryScreen({
  match,
  eventTen,
  athleteName,
  athleteTeam,
}: {
  match: Match;
  eventTen: string;
  athleteName: (id: string | null) => string | null;
  athleteTeam: (id: string | null) => string;
}) {
  const [hiep, setHiep] = useState(1);
  const [diemDo, setDiemDo] = useState(0);
  const [diemXanh, setDiemXanh] = useState(0);

  const khoiPhuc = () => {
    const base = makeLiveState(
      match.courtId!,
      eventTen,
      match,
      athleteName(match.athleteRedId) ?? "—",
      athleteTeam(match.athleteRedId),
      null,
      athleteName(match.athleteBlueId) ?? "—",
      athleteTeam(match.athleteBlueId),
      null,
    );
    publishMatchState({
      ...base,
      trangThai: "tam_dung",
      hiepHienTai: hiep,
      diemChinhThucDo: diemDo,
      diemChinhThucXanh: diemXanh,
      capNhatDongHoLuc: serverNow(),
    });
  };

  return (
    <div className={styles.recoveryBox}>
      <h3 className={styles.recoveryTitle}>⚠ Mất trạng thái trận đấu</h3>
      <p className={styles.recoveryDesc}>
        Trận này đang được đánh dấu "đang thi" trong hệ thống, nhưng máy chủ
        không còn dữ liệu điểm/hiệp sống — khả năng cao do máy chủ vừa khởi động
        lại. <strong>Nhập đúng tiến trình thật</strong> trước khi tiếp tục — hỏi
        lại trọng tài nếu không chắc, không tự đoán.
      </p>
      <div className={styles.settingsForm}>
        <label className={styles.field}>
          <span>Đang ở hiệp</span>
          <input
            type="number"
            min={1}
            value={hiep}
            onChange={(e) => setHiep(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Điểm Đỏ hiện tại</span>
          <input
            type="number"
            value={diemDo}
            onChange={(e) => setDiemDo(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Điểm Xanh hiện tại</span>
          <input
            type="number"
            value={diemXanh}
            onChange={(e) => setDiemXanh(Number(e.target.value))}
          />
        </label>
        <button className={styles.btnPrimary} onClick={khoiPhuc}>
          Khôi phục — trận sẽ ở trạng thái Tạm dừng
        </button>
      </div>
    </div>
  );
}
