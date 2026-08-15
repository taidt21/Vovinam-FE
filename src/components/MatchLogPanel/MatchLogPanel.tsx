/** @format */

import { useEffect, useState } from "react";
import {
  getMatchLog,
  subscribeMatchLog,
  type MatchLogEntry,
} from "../../lib/realtime/pressLightClient";
import styles from "./MatchLogPanel.module.scss";

export default function MatchLogPanel({ courtId }: { courtId: string }) {
  const [log, setLog] = useState<MatchLogEntry[]>(() => getMatchLog(courtId));

  useEffect(() => {
    setLog(getMatchLog(courtId));
    return subscribeMatchLog(courtId, setLog);
  }, [courtId]);

  return (
    <div className={styles.panel}>
      <div className={styles.title}>Nhật ký trận đấu (thời gian thực)</div>
      <div className={styles.list}>
        {[...log].reverse().map((entry, i) => (
          <div
            key={i}
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
        {log.length === 0 && (
          <p className={styles.empty}>Chưa có sự kiện nào.</p>
        )}
      </div>
    </div>
  );
}
