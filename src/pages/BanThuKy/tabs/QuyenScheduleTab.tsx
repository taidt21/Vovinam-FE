/** @format */

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { QuyenJudgeScoreWire } from "../../../lib/api/quyenJudgeScoreApi";
import type { QuyenLuotHoanThanhWire } from "../../../lib/api/quyenLuotApi";
import { tinhDiemQuyenTongHop } from "../../../lib/domain/quyenScoring";
import { formatEventNhomTuoi } from "../../../lib/utils/nhomTuoi";
import type { QuyenItem } from "../types";
import {
  quyenKeyOf,
  scoreMatchesQuyenItem,
  LY_DO_KET_THUC_QUYEN_LABEL,
} from "../helpers";
import styles from "../BanThuKy.module.scss";

type QuyenFilter = "tat_ca" | "cho_thi" | "da_xong";

export default function QuyenScheduleTab({
  items,
  quyenJudgeScores,
  quyenLuotHoanThanh,
  courtName,
  onStart,
}: {
  items: QuyenItem[];
  quyenJudgeScores: QuyenJudgeScoreWire[];
  quyenLuotHoanThanh: QuyenLuotHoanThanhWire[];
  courtName: string;
  onStart: (item: QuyenItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QuyenFilter>("tat_ca");

  const rows = useMemo(
    () =>
      items.map((item) => {
        const scores = quyenJudgeScores.filter((s) =>
          scoreMatchesQuyenItem(s, item),
        );
        const tongHop = tinhDiemQuyenTongHop(scores.map((s) => s.diem));
        const hoanThanh = quyenLuotHoanThanh.find(
          (x) =>
            x.eventId === item.event.id &&
            x.athleteId === item.athleteId &&
            x.teamId === item.teamId,
        );
        return { item, scores, tongHop, hoanThanh };
      }),
    [items, quyenJudgeScores, quyenLuotHoanThanh],
  );

  const completedCount = rows.filter(
    ({ tongHop, hoanThanh }) => tongHop !== null || !!hoanThanh,
  ).length;
  const pendingCount = rows.length - completedCount;

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("vi");
    return rows.filter(({ item, tongHop, hoanThanh }) => {
      const done = tongHop !== null || !!hoanThanh;
      if (filter === "cho_thi" && done) return false;
      if (filter === "da_xong" && !done) return false;
      if (!q) return true;
      const searchable = [
        `#${item.so}`,
        item.event.ten,
        formatEventNhomTuoi(item.event.nhomTuoi),
        item.label,
        item.sub,
        ...(item.thanhVien ?? []).map((t) => t.hoTen),
      ]
        .join(" ")
        .toLocaleLowerCase("vi");
      return searchable.includes(q);
    });
  }, [rows, query, filter]);

  return (
    <section className={`${styles.listCard} ${styles.scheduleCard}`}>
      <div className={styles.scheduleHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Lịch thi đấu</span>
          <h2 className={styles.scheduleTitle}>Quyền</h2>
          <p className={styles.scheduleDescription}>
            Theo dõi thứ tự thi, tiến độ chấm và đưa lượt tiếp theo vào {courtName || "sân hiện tại"}.
          </p>
        </div>
        <div className={styles.scheduleStats}>
          <div className={styles.scheduleStat}>
            <strong>{items.length}</strong>
            <span>Tổng lượt</span>
          </div>
          <div className={styles.scheduleStat}>
            <strong>{pendingCount}</strong>
            <span>Chờ thi</span>
          </div>
          <div className={styles.scheduleStat}>
            <strong>{completedCount}</strong>
            <span>Đã xong</span>
          </div>
        </div>
      </div>

      <div className={styles.scheduleToolbar}>
        <label className={styles.scheduleSearch}>
          <Search size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm nội dung, VĐV hoặc đội..."
            aria-label="Tìm lượt thi quyền"
          />
        </label>
        <div className={styles.scheduleFilters}>
          <button
            type="button"
            className={filter === "tat_ca" ? styles.filterActive : styles.filterBtn}
            onClick={() => setFilter("tat_ca")}>
            Tất cả
          </button>
          <button
            type="button"
            className={filter === "cho_thi" ? styles.filterActive : styles.filterBtn}
            onClick={() => setFilter("cho_thi")}>
            Chờ thi <span className={styles.filterCount}>{pendingCount}</span>
          </button>
          <button
            type="button"
            className={filter === "da_xong" ? styles.filterActive : styles.filterBtn}
            onClick={() => setFilter("da_xong")}>
            Đã xong <span className={styles.filterCount}>{completedCount}</span>
          </button>
        </div>
      </div>

      <div className={`${styles.listBody} ${styles.scheduleList}`}>
        {filtered.map(({ item, scores, tongHop, hoanThanh }) => {
          const done = tongHop !== null || !!hoanThanh;
          return (
            <div
              key={quyenKeyOf(item.event.id, item.athleteId, item.teamId)}
              className={`${styles.listRow} ${styles.scheduleRow} ${done ? styles.scheduleRowDone : ""}`}>
              <div className={styles.matchNumberBlock}>
                <span className={styles.listNo}>#{item.so}</span>
                <span className={styles.roundTag}>
                  {item.isTeam ? "Đội" : "Cá nhân"}
                </span>
              </div>

              <div className={styles.listInfo}>
                <div className={styles.eventMetaLine}>
                  <span className={styles.eventNameStrong}>{item.event.ten}</span>
                  <span className={styles.metaPill}>
                    {formatEventNhomTuoi(item.event.nhomTuoi)}
                  </span>
                </div>
                <div className={styles.quyenSchedulePerformer}>
                  <strong>{item.label}</strong>
                  <span>{item.sub}</span>
                </div>
              </div>

              <div className={styles.quyenProgressArea}>
                <div className={styles.judgeProgress}>
                  <span>Giám định</span>
                  <strong>{Math.min(scores.length, 5)}/5</strong>
                  <div className={styles.judgeProgressTrack}>
                    <span style={{ width: `${Math.min(scores.length, 5) * 20}%` }} />
                  </div>
                </div>

                {tongHop !== null ? (
                  <div className={styles.scoreResultBox}>
                    <span>Tổng điểm</span>
                    <strong>{tongHop.toFixed(2)}</strong>
                  </div>
                ) : hoanThanh ? (
                  <span className={styles.resultTag}>
                    {LY_DO_KET_THUC_QUYEN_LABEL[
                      hoanThanh.lyDo as keyof typeof LY_DO_KET_THUC_QUYEN_LABEL
                    ] ?? "Đã kết thúc"}
                  </span>
                ) : (
                  <button className={styles.startBtn} onClick={() => onStart(item)}>
                    Bắt đầu tại {courtName}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <p className={styles.empty}>
            Chưa có lượt thi quyền nào — vào Nội dung & bốc thăm để bốc thăm trước.
          </p>
        )}
        {items.length > 0 && filtered.length === 0 && (
          <p className={styles.empty}>
            Không có lượt thi nào phù hợp với tìm kiếm hoặc bộ lọc hiện tại.
          </p>
        )}
      </div>
    </section>
  );
}
