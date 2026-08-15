/** @format */

import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import type { DoanAccount } from "./lib/portalAuth";
import { loadAthletes } from "./lib/portalAthletes";
import styles from "./TongQuan.module.scss";

export default function TongQuan() {
  const account = useOutletContext<DoanAccount>();
  const [athleteCount, setAthleteCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    const athletes = loadAthletes(account.id);
    setAthleteCount(athletes.length);
    setEventCount(new Set(athletes.flatMap((a) => a.eventIds)).size);
  }, [account.id]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Chào {account.tenNguoiDaiDien}</h1>
      <p className={styles.subtitle}>Đoàn {account.tenDoan}</p>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{athleteCount}</span>
          <span className={styles.statLabel}>VĐV đã thêm</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{eventCount}</span>
          <span className={styles.statLabel}>Nội dung có VĐV đăng ký</span>
        </div>
      </div>

      {athleteCount === 0 && (
        <p className={styles.hint}>
          Chưa có VĐV nào — sang "VĐV của đoàn" để thêm VĐV đầu tiên.
        </p>
      )}
    </div>
  );
}
