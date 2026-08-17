/** @format */

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
          // Đã đánh dấu kết thúc thật (kể cả bị loại, chưa đủ điểm) —
          // không cho bấm Bắt đầu lại nữa, và hiện đúng lý do cụ thể.
          const hoanThanh = quyenLuotHoanThanh.find(
            (x) =>
              x.eventId === item.event.id &&
              x.athleteId === item.athleteId &&
              x.teamId === item.teamId,
          );
          return (
            <div
              key={quyenKeyOf(item.event.id, item.athleteId, item.teamId)}
              className={styles.listRow}>
              <span className={styles.listNo}>#{item.so}</span>
              <div className={styles.listInfo}>
                <div className={styles.listEvent}>
                  {item.event.ten} - {formatEventNhomTuoi(item.event.nhomTuoi)}
                </div>
                <div className={styles.listNames}>
                  {item.label}{" "}
                  <span className={styles.subInline}>({item.sub})</span>
                </div>
                {item.thanhVien && item.thanhVien.length > 0 && (
                  <div className={styles.subInline}>
                    {item.thanhVien.join(" - ")}
                  </div>
                )}
              </div>
              {tongHop !== null ? (
                <span className={styles.resultTag}>
                  Kết quả: {tongHop.toFixed(2)}
                </span>
              ) : hoanThanh ? (
                <span className={styles.resultTag}>
                  {LY_DO_KET_THUC_QUYEN_LABEL[
                    hoanThanh.lyDo as keyof typeof LY_DO_KET_THUC_QUYEN_LABEL
                  ] ?? "Đã kết thúc"}
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
