/** @format */

import { useEffect, useState } from "react";
import { Pencil, RotateCcw } from "lucide-react";
import type { CompetitionEvent, LiveMatchState, LyDoKetThuc, Match } from "../../../types";
import type { CourtBasic } from "../../../lib/utils/courts";
import type { NumberedMatch } from "../../../lib/domain/bracket";
import { getMatchSnapshot, subscribeMatchState } from "../../../lib/realtime/liveMatchStore";
import Modal from "../../../components/Modal/Modal";
import { LY_DO_OPTIONS } from "../helpers";
import styles from "../BanThuKy.module.scss";

export default function DoiKhangScheduleTab({
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
