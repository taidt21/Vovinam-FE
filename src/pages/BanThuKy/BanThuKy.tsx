/** @format */

import { useEffect, useMemo, useState } from "react";
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
  Sparkles,
  Gauge,
  Award,
  BicepsFlexed,
  Check,
} from "lucide-react";
import type {
  Athlete,
  AthleteRecord,
  CompetitionEvent,
  DiemTrongTai,
  LiveMatchState,
  LyDoKetThuc,
  Match,
  Squad,
} from "../../types";
import Modal from "../../components/Modal/Modal";
import AthleteAvatar from "../../components/AthleteAvatar/AthleteAvatar";
import { COURTS } from "../../lib/courts";
import { numberDoiKhangMatches, type NumberedMatch } from "../../lib/bracket";
import {
  loadBracketData,
  saveBracketData,
  subscribeBracketData,
  quyenResultKey,
  type QuyenResult,
} from "../../lib/bracketStore";
import {
  clearMatchState,
  formatMmSs,
  getMatchSnapshot,
  publishMatchState,
  subscribeMatchState,
  tinhThoiGianConLai,
} from "../../lib/liveMatchStore";
import {
  getAllScoresForCourt,
  subscribeCourtScores,
} from "../../lib/refereeScoreStore";
import styles from "./BanThuKy.module.scss";

const LY_DO_OPTIONS: { value: LyDoKetThuc; label: string }[] = [
  { value: "thang_diem", label: "Thắng điểm" },
  { value: "doi_thu_khong_thi_dau", label: "Đối thủ không thi đấu" },
  { value: "bo_cuoc", label: "Bỏ cuộc" },
  { value: "dung_vi_y_te", label: "Dừng vì y tế" },
  { value: "truat_quyen", label: "Truất quyền" },
];

const DEFAULT_TONG_SO_HIEP = 3;
const DEFAULT_THOI_GIAN_HIEP = 120;
const DEFAULT_THOI_GIAN_NGHI = 60;
const DEFAULT_SO_TRONG_TAI = 3;

interface QuyenItem {
  event: CompetitionEvent;
  performerId: string;
  label: string;
  sub: string;
  isTeam: boolean;
  so: number;
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
    capNhatDongHoLuc: Date.now(),
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
  const [squadOrderByEvent, setSquadOrderByEvent] = useState<
    Record<string, Squad[]>
  >({});
  const [quyenResults, setQuyenResults] = useState<Record<string, QuyenResult>>(
    {},
  );

  const [tab, setTab] = useState<TabId>("lich_dk");
  const [currentCourtId, setCurrentCourtId] = useState(COURTS[0]?.id ?? "");
  const [currentQuyenKey, setCurrentQuyenKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/events.json").then((r) => r.json()),
      fetch("/data/athletes.json").then((r) => r.json()),
      fetch("/data/teams.json").then((r) => r.json()),
    ])
      .then(([eventsData, athletesData, teamsData]) => {
        setEvents(eventsData);
        setAthletes(athletesData);
        setTeams(teamsData);
      })
      .catch(() =>
        setLoadError(
          "Không tải được dữ liệu — kiểm tra lại 3 file trong public/data/",
        ),
      )
      .finally(() => setLoading(false));

    const applyBracketData = (d: ReturnType<typeof loadBracketData>) => {
      setBracketsByEvent(d.bracketsByEvent);
      setOrderByEvent(d.orderByEvent);
      setSquadOrderByEvent(d.squadOrderByEvent);
      setQuyenResults(d.quyenResults);
    };
    applyBracketData(loadBracketData());
    return subscribeBracketData(applyBracketData);
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
  const squadTeam = (s: Squad) => {
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

  const persistBrackets = (next: Record<string, Match[]>) => {
    setBracketsByEvent(next);
    saveBracketData({ bracketsByEvent: next });
  };

  const finishMatch = (
    match: Match,
    eventId: string,
    lyDo: LyDoKetThuc,
    thangSide: "do" | "xanh",
  ) => {
    const winnerId =
      thangSide === "do" ? match.athleteRedId : match.athleteBlueId;
    const updated = (bracketsByEvent[eventId] ?? []).map((m) => {
      if (m.id === match.id)
        return {
          ...m,
          trangThai: "da_hoan_thanh" as const,
          lyDoKetThuc: lyDo,
          courtId: null,
          nguoiThangId: winnerId,
        };
      if (
        match.nextMatchId &&
        m.id === match.nextMatchId &&
        match.nextMatchSlot &&
        winnerId
      ) {
        const slotField =
          match.nextMatchSlot === "do" ? "athleteRedId" : "athleteBlueId";
        return { ...m, [slotField]: winnerId };
      }
      return m;
    });
    persistBrackets({ ...bracketsByEvent, [eventId]: updated });
    if (match.courtId) clearMatchState(match.courtId);
  };

  const openIntoCourt = (eventId: string, matchId: string) => {
    const current = activeOfCourt(currentCourtId);
    if (current) {
      if (current.id === matchId) return; // đã đúng là trận đang chờ ở sân này
      const live = getMatchSnapshot(currentCourtId);
      const dangDienRaThat =
        live?.trangThai === "dang_thi" ||
        live?.trangThai === "nghi_giua_hiep" ||
        live?.trangThai === "tam_dung";
      // Chỉ chặn khi đồng hồ hiệp đã thật sự chạy/tạm dừng — còn nếu trận
      // hiện tại trên sân mới ở trạng thái "chờ bắt đầu hiệp 1" (VD do
      // effect tự-setup vừa đẩy vào), cho phép thay bằng trận khác: trả
      // trận đó về "cho_thi" để còn quay lại hàng chờ, không mất.
      if (dangDienRaThat) return;
    }
    const match = bracketsByEvent[eventId]?.find((m) => m.id === matchId);
    const event = eventOf(eventId);
    if (!match || !event) return;
    const nextBrackets: Record<string, Match[]> = {};
    for (const [eid, list] of Object.entries(bracketsByEvent)) {
      nextBrackets[eid] = list.map((m) => {
        if (current && m.id === current.id)
          return { ...m, trangThai: "cho_thi" as const, courtId: null };
        if (m.id === matchId)
          return {
            ...m,
            courtId: currentCourtId,
            trangThai: "dang_thi" as const,
          };
        return m;
      });
    }
    persistBrackets(nextBrackets);
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
  };

  const quickFinish = (
    eventId: string,
    matchId: string,
    side: "do" | "xanh",
  ) => {
    const match = bracketsByEvent[eventId]?.find((m) => m.id === matchId);
    if (match) finishMatch(match, eventId, "thang_diem", side);
  };

  // Sửa lại người thắng/lý do của 1 trận ĐÃ có kết quả. Nếu người thắng
  // thay đổi và trận đó từng đẩy người thắng cũ vào trận kế tiếp: tự cập
  // nhật lại ô đó CHỈ KHI trận kế tiếp vẫn còn "cho_thi" (chưa ai đụng vào)
  // — an toàn, không cần hỏi. Nếu trận kế tiếp đã bắt đầu/xong rồi thì hỏi
  // xác nhận trước, vì sửa ở đây sẽ không tự kéo theo được nữa.
  const editMatchResult = (
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
    const updated = list.map((m) => {
      if (m.id === match.id)
        return { ...m, lyDoKetThuc: lyDo, nguoiThangId: newWinnerId };
      if (shouldSyncNext && m.id === next!.id)
        return { ...m, [slotField]: newWinnerId };
      return m;
    });
    persistBrackets({ ...bracketsByEvent, [eventId]: updated });
  };

  // Xoá kết quả, đưa trận về "cho_thi" để thi đấu lại từ đầu — số thứ tự
  // (#so) và 2 VĐV giữ nguyên, không đổi. Cùng nguyên tắc gỡ/hỏi xác nhận
  // với trận kế tiếp như editMatchResult ở trên.
  const replayMatch = (match: Match, eventId: string) => {
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
    const updated = list.map((m) => {
      if (m.id === match.id)
        return {
          ...m,
          trangThai: "cho_thi" as const,
          lyDoKetThuc: undefined,
          nguoiThangId: null,
          courtId: null,
        };
      if (shouldClearNext && m.id === next!.id)
        return { ...m, [slotField]: null };
      return m;
    });
    persistBrackets({ ...bracketsByEvent, [eventId]: updated });
  };

  /* ---------- Quyền ---------- */
  const quyenNumbered = useMemo<QuyenItem[]>(() => {
    const quyenEvents = events.filter((e) => e.loai === "quyen");
    const ready = quyenEvents.filter((e) =>
      e.hinhThucThi === "doi"
        ? !!squadOrderByEvent[e.id]
        : !!orderByEvent[e.id],
    );
    const flat = [...ready]
      .sort((a, b) => a.nhomTuoi - b.nhomTuoi)
      .flatMap((e) =>
        e.hinhThucThi === "doi"
          ? (squadOrderByEvent[e.id] ?? []).map((s) => ({
              event: e,
              performerId: s.id,
              label: s.ten,
              sub: squadTeam(s),
              isTeam: true,
            }))
          : (orderByEvent[e.id] ?? []).map((a) => ({
              event: e,
              performerId: a.id,
              label: a.hoTen,
              sub: `${a.namSinh} · ${athleteTeam(a.id)}`,
              isTeam: false,
            })),
      );
    return flat.map((x, i) => ({ ...x, so: i + 1 }));
  }, [events, orderByEvent, squadOrderByEvent, athletes, teams]);

  const currentQuyenItem = quyenNumbered.find(
    (x) => quyenResultKey(x.event.id, x.performerId) === currentQuyenKey,
  );

  const submitQuyenResult = (
    item: QuyenItem,
    diem: number,
    diemTru: number,
  ) => {
    const key = quyenResultKey(item.event.id, item.performerId);
    const next = {
      ...quyenResults,
      [key]: {
        eventId: item.event.id,
        performerId: item.performerId,
        diem,
        diemTru,
        capNhatLuc: Date.now(),
      },
    };
    setQuyenResults(next);
    saveBracketData({ quyenResults: next });
  };

  const pickQuyenItem = (item: QuyenItem) => {
    setCurrentQuyenKey(quyenResultKey(item.event.id, item.performerId));
    setTab("dieu_hanh_quyen");
  };

  // Tự động mở trận kế tiếp (đúng thứ tự lịch thi đấu, lấy từ `numbered`)
  // vào sân đang thao tác, mỗi khi đang ở tab Điều hành đối kháng mà sân
  // đang trống — thư ký không cần quay lại tab Lịch thi đấu để bấm "Bắt
  // đầu" nữa. Tự dừng lặp: ngay sau khi mở trận, activeOnMyCourt hết rỗng
  // nên điều kiện dưới false ở lần chạy kế tiếp. Trận đang thi ở sân khác
  // vẫn có trangThai "dang_thi" nên không bao giờ bị chọn nhầm lần 2.
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

  // Tương tự cho Điều hành quyền: chưa chọn ai HOẶC người/đội đang chọn đã
  // chấm xong (vừa bấm "Xác nhận điểm") -> tự nhảy sang lượt kế tiếp chưa
  // có điểm, theo đúng thứ tự đã đánh số ở quyenNumbered. Nếu không còn ai
  // để chấm nữa thì giữ nguyên lượt vừa chấm (không có "next" để nhảy tới).
  useEffect(() => {
    if (tab !== "dieu_hanh_quyen") return;
    const daChamXong = !!(currentQuyenKey && quyenResults[currentQuyenKey]);
    if (currentQuyenItem && !daChamXong) return;
    const next = quyenNumbered.find(
      (item) => !quyenResults[quyenResultKey(item.event.id, item.performerId)],
    );
    if (next)
      setCurrentQuyenKey(quyenResultKey(next.event.id, next.performerId));
  }, [tab, currentQuyenKey, currentQuyenItem, quyenResults, quyenNumbered]);

  if (loading)
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

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.title}>Bàn thư ký</h1>
        <div className={styles.topbarActions}>
          <a
            className={styles.publicScreenLink}
            href={`/man-hinh-cong-khai?san=${currentCourtId}`}
            target="_blank"
            rel="noopener noreferrer">
            Mở màn hình công khai ↗
          </a>
          <select
            className={styles.courtSelect}
            value={currentCourtId}
            onChange={(e) => setCurrentCourtId(e.target.value)}>
            {COURTS.map((c) => (
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
            {id === "dieu_hanh_quyen" && currentQuyenItem && (
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
          onStart={openIntoCourt}
          onQuickFinish={quickFinish}
          onEditResult={editMatchResult}
          onReplay={replayMatch}
        />
      )}

      {tab === "lich_quyen" && (
        <QuyenScheduleTab
          items={quyenNumbered}
          quyenResults={quyenResults}
          onPick={pickQuyenItem}
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
          key={currentQuyenKey ?? "none"}
          item={currentQuyenItem}
          savedResult={
            currentQuyenKey ? quyenResults[currentQuyenKey] : undefined
          }
          onSubmit={(diem, diemTru) =>
            currentQuyenItem &&
            submitQuyenResult(currentQuyenItem, diem, diemTru)
          }
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
  onStart,
  onQuickFinish,
  onEditResult,
  onReplay,
}: {
  numbered: NumberedMatch[];
  eventOf: (id: string) => CompetitionEvent | undefined;
  athleteName: (id: string | null) => string | null;
  currentCourtId: string;
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
  const courtName = COURTS.find((c) => c.id === currentCourtId)?.ten ?? "";
  const [editingItem, setEditingItem] = useState<NumberedMatch | null>(null);
  const [editLyDo, setEditLyDo] = useState<LyDoKetThuc>("thang_diem");

  const openEdit = (item: NumberedMatch) => {
    setEditLyDo(item.match.lyDoKetThuc ?? "thang_diem");
    setEditingItem(item);
  };

  // Trạng thái "sống" của từng sân — dùng để biết trận đã vào sân
  // (match.trangThai = "dang_thi") có ĐANG THẬT SỰ đếm giờ hay không, hay
  // mới chỉ vào sân/đang tạm dừng. Chỉ subscribe khi tab này đang hiển thị
  // (component mount/unmount theo tab ở component cha) nên không tốn gì
  // lúc đang ở tab khác.
  const [liveStatesByCourtId, setLiveStatesByCourtId] = useState<
    Record<string, LiveMatchState | null>
  >(() =>
    Object.fromEntries(COURTS.map((c) => [c.id, getMatchSnapshot(c.id)])),
  );

  useEffect(() => {
    setLiveStatesByCourtId(
      Object.fromEntries(COURTS.map((c) => [c.id, getMatchSnapshot(c.id)])),
    );
    const unsubs = COURTS.map((c) =>
      subscribeMatchState(c.id, (state) =>
        setLiveStatesByCourtId((prev) => ({ ...prev, [c.id]: state })),
      ),
    );
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const currentCourtLive = liveStatesByCourtId[currentCourtId];
  // "Bận thật" = đồng hồ hiệp đang chạy, đang nghỉ giữa hiệp, hoặc đang tạm
  // dừng — những lúc này KHÔNG cho bắt đầu/xử trận khác vào sân. "Chờ bắt
  // đầu" (chưa bấm hiệp 1, thường do effect tự-setup vừa đẩy vào) không
  // tính là bận — thư ký vẫn chọn trận khác để thay được.
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
          // Chỉ tính "đang thi" khi đồng hồ hiệp thật sự đang chạy hoặc
          // đang nghỉ giữa hiệp — KHÔNG tính lúc mới vào sân chờ bấm bắt
          // đầu hiệp 1, hay lúc thư ký bấm tạm dừng.
          const dangThiThat =
            live?.trangThai === "dang_thi" ||
            live?.trangThai === "nghi_giua_hiep";
          // Ai thua = bên còn lại của người thắng đã lưu. null nếu chưa có
          // (VD kết quả cũ từ trước khi có field nguoiThangId) — khi đó
          // không gạch bên nào, tránh gạch nhầm.
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
  quyenResults,
  onPick,
}: {
  items: QuyenItem[];
  quyenResults: Record<string, QuyenResult>;
  onPick: (item: QuyenItem) => void;
}) {
  return (
    <section className={styles.listCard}>
      <div className={styles.listHead}>
        <span>Toàn bộ lượt thi quyền ({items.length})</span>
      </div>
      <div className={styles.listBody}>
        {items.map((item) => {
          const key = quyenResultKey(item.event.id, item.performerId);
          const result = quyenResults[key];
          return (
            <div key={key} className={styles.listRow}>
              <span className={styles.listNo}>#{item.so}</span>
              <div className={styles.listInfo}>
                <div className={styles.listEvent}>
                  {item.event.ten} · Nhóm tuổi {item.event.nhomTuoi}
                </div>
                <div className={styles.listNames}>
                  {item.label}{" "}
                  <span className={styles.subInline}>({item.sub})</span>
                </div>
              </div>
              {result ? (
                <span className={styles.resultTag}>
                  Đã chấm: {(result.diem - result.diemTru).toFixed(2)}
                </span>
              ) : (
                <button
                  className={styles.startBtn}
                  onClick={() => onPick(item)}>
                  Chấm điểm
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
  const [, setTick] = useState(0);
  const [refScores, setRefScores] = useState<DiemTrongTai[]>(() =>
    getAllScoresForCourt(courtId),
  );
  const [showEndFlow, setShowEndFlow] = useState(false);
  const [lyDo, setLyDo] = useState<LyDoKetThuc>("thang_diem");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setLive(getMatchSnapshot(courtId));
    setRefScores(getAllScoresForCourt(courtId));
    const unsubMatch = subscribeMatchState(courtId, setLive);
    const unsubScores = subscribeCourtScores(
      courtId,
      (score) =>
        setRefScores((prev) => [
          ...prev.filter((s) => s.giamDinhId !== score.giamDinhId),
          score,
        ]),
      (giamDinhId) =>
        setRefScores((prev) => prev.filter((s) => s.giamDinhId !== giamDinhId)),
    );
    return () => {
      unsubMatch();
      unsubScores();
    };
  }, [courtId]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!live) return <p className={styles.hint}>Đang khởi tạo trận...</p>;

  const remaining = tinhThoiGianConLai(live);
  const dangChay = live.trangThai === "dang_thi";
  const dangNghi = live.trangThai === "nghi_giua_hiep";
  const laHiepCuoi = live.hiepHienTai >= live.tongSoHiep;
  const hetGio = remaining <= 0 && (dangChay || dangNghi);
  // "da_ket_thuc" ở đây là trạng thái TẠM — đã chọn người thắng nhưng thư
  // ký chưa bấm xác nhận cuối cùng. Dùng patch() (broadcast qua
  // liveMatchStore) thay vì gọi onEndMatch ngay, để: (1) có 1 nhịp nổi bật
  // người thắng trước khi chuyển trận, (2) Màn hình công khai xem cùng lúc
  // cũng thấy được y hệt, vì cùng đọc chung 1 LiveMatchState.

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
      capNhatDongHoLuc: Date.now(),
    });
  const tamDung = () =>
    patch({ trangThai: "tam_dung", thoiGianConLaiGiay: remaining });
  const tiepTuc = () =>
    patch({ trangThai: "dang_thi", capNhatDongHoLuc: Date.now() });
  const ketThucHiep = () =>
    patch(
      laHiepCuoi
        ? { trangThai: "tam_dung", thoiGianConLaiGiay: 0 }
        : {
            trangThai: "nghi_giua_hiep",
            thoiGianConLaiGiay: live.thoiGianNghiGiay,
            capNhatDongHoLuc: Date.now(),
          },
    );

  // Không còn chặn ở 0 nữa — điểm được phép âm (VD do bị trừ phạt nhiều lần khi đang thấp điểm)
  const adjustScore = (side: "do" | "xanh", delta: number) => {
    const key = side === "do" ? "diemChinhThucDo" : "diemChinhThucXanh";
    patch({
      [key]: live[key] + delta,
      diemDaChinhTay: true,
    } as Partial<LiveMatchState>);
  };

  // Đủ 3 lần nhắc nhở -> tự trừ 2 điểm bên đó (có thể xuống âm), reset nhắc nhở về 0 để tính tiếp
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

  // Bấm "Đỏ/Xanh thắng": chỉ CÔNG BỐ người thắng (broadcast cho mọi màn
  // hình đang xem sân này), CHƯA đụng vào bảng đấu — cho 1 nhịp nổi bật
  // trước khi thật sự chuyển trận.
  const confirmWinner = (thang: "do" | "xanh") => {
    patch({ trangThai: "da_ket_thuc", nguoiThang: thang, lyDoKetThuc: lyDo });
    setShowEndFlow(false);
  };
  // Xác nhận cuối: giờ mới thật sự cập nhật bảng đấu (onEndMatch ở component
  // cha) — chuyển trận sang đã hoàn thành, đẩy người thắng vào trận kế, xoá
  // live state của sân này.
  const confirmFinish = () => {
    if (live.nguoiThang) onEndMatch(live.lyDoKetThuc ?? lyDo, live.nguoiThang);
  };
  // Bấm nhầm bên thắng? Quay lại màn hình điều khiển bình thường, không
  // đụng gì tới bảng đấu (vì confirmWinner chưa đụng tới nó).
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
          <div className={styles.scoreNumXanhBig}>{live.diemChinhThucXanh}</div>
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
                        i < live.canhCaoXanh ? styles.dotOnXanh : styles.dotOff
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
      </div>

      {!daKetThuc && refScores.length > 0 && (
        <div className={styles.refBox}>
          <span className={styles.refBoxTitle}>
            Điểm trọng tài biên đã gửi ({refScores.length}/
            {live.soTrongTaiCanCo})
          </span>
          <div className={styles.refList}>
            {refScores.map((s) => (
              <span key={s.giamDinhId} className={styles.refItem}>
                {s.tenTrongTai}: <b className={styles.refDo}>{s.diemDo}</b>–
                <b className={styles.refXanh}>{s.diemXanh}</b>
              </span>
            ))}
          </div>
        </div>
      )}

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
            <label className={styles.field}>
              <span>Số trọng tài biên</span>
              <input
                type="number"
                min={1}
                max={5}
                value={live.soTrongTaiCanCo}
                onChange={(e) =>
                  patch({ soTrongTaiCanCo: Number(e.target.value) })
                }
              />
            </label>
            <button
              className={styles.btnPrimary}
              onClick={() => setShowSettings(false)}>
              Xong
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============ Điều hành — Quyền ============ */
function DieuHanhQuyenTab({
  item,
  savedResult,
  onSubmit,
}: {
  item: QuyenItem | undefined;
  savedResult: QuyenResult | undefined;
  onSubmit: (diem: number, diemTru: number) => void;
}) {
  const [diem, setDiem] = useState(savedResult ? String(savedResult.diem) : "");
  const [diemTru, setDiemTru] = useState(
    savedResult ? String(savedResult.diemTru) : "",
  );

  if (!item) {
    return (
      <div className={styles.noMatch}>
        Chưa có lượt thi quyền nào — vào Nội dung & bốc thăm để bốc thăm trước.
      </div>
    );
  }

  const diemThuc = Math.max(
    0,
    (parseFloat(diem) || 0) - (parseFloat(diemTru) || 0),
  );

  return (
    <div className={styles.dieuHanhQuyen}>
      <div className={styles.matchMeta}>
        #{item.so} {item.event.ten} · Nhóm tuổi {item.event.nhomTuoi}
      </div>

      <div className={styles.quyenPerformer}>
        <div className={styles.quyenPerformerName}>{item.label}</div>
        <div className={styles.quyenPerformerSub}>{item.sub}</div>
      </div>

      <div className={styles.quyenScoreRow}>
        <label className={styles.quyenField}>
          <span>Điểm cuối cùng</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={diem}
            onChange={(e) => setDiem(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </label>
        <label className={styles.quyenField}>
          <span>Điểm trừ (nếu có)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={diemTru}
            onChange={(e) => setDiemTru(e.target.value)}
            placeholder="0.00"
          />
        </label>
        <div className={styles.quyenResultBox}>
          <span>Điểm thực</span>
          <strong>{diemThuc.toFixed(2)}</strong>
        </div>
      </div>

      <button
        className={styles.btnPrimaryBig}
        disabled={diem === ""}
        onClick={() =>
          onSubmit(parseFloat(diem) || 0, parseFloat(diemTru) || 0)
        }>
        <Check size={18} /> Xác nhận điểm
      </button>

      {savedResult && (
        <p className={styles.savedNote}>
          Đã lưu lúc{" "}
          {new Date(savedResult.capNhatLuc).toLocaleTimeString("vi-VN")}
        </p>
      )}
    </div>
  );
}
