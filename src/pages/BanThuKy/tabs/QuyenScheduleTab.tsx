/** @format */

import type { QuyenJudgeScoreWire } from "../../../lib/api/quyenJudgeScoreApi";
import { tinhDiemQuyenTongHop } from "../../../lib/domain/quyenScoring";
import { formatEventNhomTuoi } from "../../../lib/utils/nhomTuoi";
import type { QuyenItem } from "../types";
import { quyenKeyOf, scoreMatchesQuyenItem } from "../helpers";
import styles from "../BanThuKy.module.scss";

export default function QuyenScheduleTab({
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
