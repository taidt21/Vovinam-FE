/** @format */

import { useEffect, useState } from "react";
import {
  getMatchLog,
  subscribeMatchLog,
  type MatchLogEntry,
} from "../../lib/realtime/pressLightClient";
import styles from "./MatchLogPanel.module.scss";

export default function MatchLogPanel({
  courtId,
  filterGiamDinhId,
}: {
  courtId: string;
  // Có giá trị thì CHỈ hiện đúng dòng log của trọng tài này (VD màn hình
  // trọng tài tự chấm — không cần/không nên thấy lượt bấm của người
  // khác hay điều chỉnh tay của Bàn thư ký). Bỏ trống thì hiện đầy đủ
  // như trước (VD bên Bàn thư ký cần thấy toàn cảnh).
  filterGiamDinhId?: string;
}) {
  const [log, setLog] = useState<MatchLogEntry[]>(() => getMatchLog(courtId));

  useEffect(() => {
    setLog(getMatchLog(courtId));
    return subscribeMatchLog(courtId, setLog);
  }, [courtId]);

  const daLoc = filterGiamDinhId
    ? log.filter((e) => e.giamDinhId === filterGiamDinhId)
    : log;

  return (
    <div className={styles.panel}>
      <div className={styles.title}>
        {filterGiamDinhId ? "Nhật ký của bạn" : "Nhật ký trận đấu (thời gian thực)"}
      </div>
      <div className={styles.list}>
        {[...daLoc].reverse().map((entry) => (
          <div
            key={entry.id}
            className={
              entry.noiDung.startsWith("✓") ? styles.scoreLine : styles.line
            }>
            <span className={styles.time}>
              {entry.matchTimeLabel ??
                new Date(entry.luc).toLocaleTimeString("vi-VN")}
            </span>
            <span>{entry.noiDung}</span>
          </div>
        ))}
        {daLoc.length === 0 && (
          <p className={styles.empty}>Chưa có sự kiện nào.</p>
        )}
      </div>
    </div>
  );
}
