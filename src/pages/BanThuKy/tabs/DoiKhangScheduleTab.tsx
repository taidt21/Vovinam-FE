/** @format */

import { useEffect, useMemo, useState } from "react";
import { Pencil, RotateCcw, Search } from "lucide-react";
import type {
  CompetitionEvent,
  LiveMatchState,
  LyDoKetThuc,
  Match,
} from "../../../types";
import type { CourtBasic } from "../../../lib/utils/courts";
import type { NumberedMatch } from "../../../lib/domain/bracket";
import {
  getMatchSnapshot,
  subscribeMatchState,
} from "../../../lib/realtime/liveMatchStore";
import Modal from "../../../components/Modal/Modal";
import { LY_DO_OPTIONS } from "../helpers";
import { formatEventNhomTuoi } from "../../../lib/utils/nhomTuoi";
import styles from "../BanThuKy.module.scss";

type ScheduleFilter =
  | "tat_ca"
  | "san_sang"
  | "dang_thi"
  | "da_xong"
  | "cho_xac_dinh";

const FILTERS: { value: ScheduleFilter; label: string }[] = [
  { value: "tat_ca", label: "Tất cả" },
  { value: "san_sang", label: "Sẵn sàng" },
  { value: "dang_thi", label: "Đang thi" },
  { value: "da_xong", label: "Đã xong" },
  { value: "cho_xac_dinh", label: "Chờ VĐV" },
];

// Vòng 32 và Vòng 16 gộp chung nhãn "Vòng loại" khi hiện — đúng quy ước
// đang dùng ở trang xuất PDF đối kháng, để mọi nơi khớp nhau.
function nhanVong(vong: string): string {
  return vong === "Vòng 32" || vong === "Vòng 16" ? "Vòng loại" : vong;
}

export default function DoiKhangScheduleTab({
  numbered,
  eventOf,
  athleteName,
  athleteTeam,
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
  athleteTeam: (id: string | null) => string;
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ScheduleFilter>("tat_ca");

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

  const rowStatus = (item: NumberedMatch): Exclude<ScheduleFilter, "tat_ca"> => {
    const { match } = item;
    const readyToPlay = !!match.athleteRedId && !!match.athleteBlueId;
    const live = match.courtId ? liveStatesByCourtId[match.courtId] : null;
    const isLive =
      live?.trangThai === "dang_thi" ||
      live?.trangThai === "nghi_giua_hiep" ||
      live?.trangThai === "tam_dung" ||
      live?.trangThai === "cho_bat_dau";
    if (match.trangThai === "da_hoan_thanh") return "da_xong";
    if (isLive || match.trangThai === "dang_thi") return "dang_thi";
    if (readyToPlay) return "san_sang";
    return "cho_xac_dinh";
  };

  const counts = useMemo(() => {
    const result = {
      san_sang: 0,
      dang_thi: 0,
      da_xong: 0,
      cho_xac_dinh: 0,
    };
    numbered.forEach((item) => {
      result[rowStatus(item)] += 1;
    });
    return result;
    // rowStatus reads the current realtime snapshot map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numbered, liveStatesByCourtId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("vi");
    return numbered.filter((item) => {
      if (filter !== "tat_ca" && rowStatus(item) !== filter) return false;
      if (!q) return true;
      const event = eventOf(item.event.id);
      const searchable = [
        `#${item.so}`,
        event?.ten ?? item.event.ten,
        formatEventNhomTuoi(event?.nhomTuoi ?? item.event.nhomTuoi),
        nhanVong(item.match.vong),
        athleteName(item.match.athleteRedId) ?? "",
        athleteName(item.match.athleteBlueId) ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("vi");
      return searchable.includes(q);
    });
    // rowStatus reads the current realtime snapshot map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numbered, query, filter, eventOf, athleteName, liveStatesByCourtId]);

  return (
    <section className={`${styles.listCard} ${styles.scheduleCard}`}>
      <div className={styles.scheduleHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Lịch thi đấu</span>
          <h2 className={styles.scheduleTitle}>Đối kháng</h2>
          <p className={styles.scheduleDescription}>
            Chọn trận để đưa vào {courtName || "sân hiện tại"}. Trận đang diễn
            ra luôn được ưu tiên hiển thị trạng thái rõ ràng.
          </p>
        </div>
        <div className={styles.scheduleStats}>
          <div className={styles.scheduleStat}>
            <strong>{numbered.length}</strong>
            <span>Tổng trận</span>
          </div>
          <div className={styles.scheduleStat}>
            <strong>{counts.san_sang}</strong>
            <span>Sẵn sàng</span>
          </div>
          <div className={styles.scheduleStat}>
            <strong>{counts.da_xong}</strong>
            <span>Đã xong</span>
          </div>
        </div>
      </div>

      {trueCourtBusy && (
        <div className={styles.busyBanner}>
          <span className={styles.busyDot} />
          <strong>{courtName} đang có trận.</strong>
          <span>Kết thúc hoặc tạm xử lý trận hiện tại trước khi mở trận khác.</span>
        </div>
      )}

      <div className={styles.scheduleToolbar}>
        <label className={styles.scheduleSearch}>
          <Search size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm số trận, nội dung hoặc VĐV..."
            aria-label="Tìm trận đối kháng"
          />
        </label>
        <div className={styles.scheduleFilters}>
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={filter === item.value ? styles.filterActive : styles.filterBtn}
              onClick={() => setFilter(item.value)}>
              {item.label}
              {item.value !== "tat_ca" && (
                <span className={styles.filterCount}>{counts[item.value]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={`${styles.listBody} ${styles.scheduleList}`}>
        {filtered.map((item) => {
          const { event, match, so } = item;
          const currentEvent = eventOf(event.id) ?? event;
          const readyToPlay = !!match.athleteRedId && !!match.athleteBlueId;
          const daXong = match.trangThai === "da_hoan_thanh";
          const live = match.courtId ? liveStatesByCourtId[match.courtId] : null;
          const dangThiThat =
            live?.trangThai === "dang_thi" || live?.trangThai === "nghi_giua_hiep";
          const loserSide: "do" | "xanh" | null =
            daXong && match.nguoiThangId
              ? match.nguoiThangId === match.athleteRedId
                ? "xanh"
                : "do"
              : null;

          return (
            <div
              key={match.id}
              className={`${styles.listRow} ${styles.scheduleRow} ${
                daXong ? styles.scheduleRowDone : ""
              } ${rowStatus(item) === "dang_thi" ? styles.scheduleRowLive : ""}`}>
              <div className={styles.matchNumberBlock}>
                <span className={styles.listNo}>#{so}</span>
                <span className={styles.roundTag}>{nhanVong(match.vong)}</span>
              </div>

              <div className={styles.listInfo}>
                <div className={styles.eventMetaLine}>
                  <span className={styles.eventNameStrong}>{currentEvent.ten}</span>
                  <span className={styles.metaPill}>
                    {formatEventNhomTuoi(currentEvent.nhomTuoi)}
                  </span>
                </div>

                <div className={styles.competitorPair}>
                  <div className={`${styles.competitor} ${styles.competitorRed}`}>
                    <span className={styles.competitorSide}>Đỏ</span>
                    <div className={styles.competitorInfo}>
                      <strong className={loserSide === "do" ? styles.loserName : undefined}>
                        {athleteName(match.athleteRedId) ?? "Chờ xác định"}
                      </strong>
                      {athleteTeam(match.athleteRedId) && (
                        <span className={styles.competitorTeam}>
                          {athleteTeam(match.athleteRedId)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={styles.vsBadge}>VS</span>
                  <div className={`${styles.competitor} ${styles.competitorBlue}`}>
                    <span className={styles.competitorSide}>Xanh</span>
                    <div className={styles.competitorInfo}>
                      <strong className={loserSide === "xanh" ? styles.loserName : undefined}>
                        {athleteName(match.athleteBlueId) ?? "Chờ xác định"}
                      </strong>
                      {athleteTeam(match.athleteBlueId) && (
                        <span className={styles.competitorTeam}>
                          {athleteTeam(match.athleteBlueId)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.scheduleActionArea}>
                {daXong ? (
                  <>
                    <span className={styles.resultTag}>Đã hoàn thành</span>
                    <div className={styles.listActions}>
                      <button
                        className={styles.editBtn}
                        onClick={() => openEdit(item)}
                        title="Sửa lại người thắng hoặc lý do">
                        <Pencil size={13} /> Sửa
                      </button>
                      <button
                        className={styles.replayBtn}
                        onClick={() => onReplay(match, event.id)}
                        title="Xoá kết quả, cho thi đấu lại từ đầu">
                        <RotateCcw size={13} /> Đấu lại
                      </button>
                    </div>
                  </>
                ) : match.trangThai === "dang_thi" ? (
                  dangThiThat ? (
                    <span className={styles.playingTag}>Đang thi</span>
                  ) : live?.trangThai === "tam_dung" ? (
                    <span className={styles.pausedTag}>Tạm dừng</span>
                  ) : (
                    <span className={styles.waitTag}>Chờ bắt đầu</span>
                  )
                ) : readyToPlay ? (
                  <>
                    <button
                      className={styles.startBtn}
                      disabled={trueCourtBusy}
                      onClick={() => onStart(event.id, match.id)}
                      title={
                        courtHasPendingStart
                          ? `Thay trận đang chờ bắt đầu ở ${courtName} bằng trận này`
                          : undefined
                      }>
                      Bắt đầu tại {courtName}
                    </button>
                    <div className={styles.quickResultActions}>
                      <span>Kết quả nhanh:</span>
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
                    </div>
                  </>
                ) : (
                  <span className={styles.waitTag}>Chờ xác định VĐV</span>
                )}
              </div>
            </div>
          );
        })}

        {numbered.length === 0 && (
          <p className={styles.empty}>
            Chưa có trận nào — vào Nội dung & bốc thăm để bốc thăm trước.
          </p>
        )}
        {numbered.length > 0 && filtered.length === 0 && (
          <p className={styles.empty}>
            Không có trận nào phù hợp với tìm kiếm hoặc bộ lọc hiện tại.
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
