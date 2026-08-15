/** @format */

import { useEffect, useState } from "react";
import {
  subscribeLightPressed,
  subscribeConsensus,
} from "../../lib/realtime/pressLightClient";
import styles from "./LiveLightsPanel.module.scss";

interface ActivePress {
  tenTrongTai: string;
  mau: "do" | "xanh";
  diem: number;
}

export default function LiveLightsPanel({ courtId }: { courtId: string }) {
  const [active, setActive] = useState<Record<string, ActivePress>>({});

  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const unsubPress = subscribeLightPressed(courtId, (e) => {
      setActive((prev) => ({
        ...prev,
        [e.giamDinhId]: {
          tenTrongTai: e.tenTrongTai,
          mau: e.mau,
          diem: e.diem,
        },
      }));
      const existing = timers.get(e.giamDinhId);
      if (existing) clearTimeout(existing);
      // Mỗi lần bấm mới của ĐÚNG người đó làm mới lại 2 giây — bấm liên
      // tục thì đèn giữ sáng liên tục, không nhấp nháy tắt-bật vô nghĩa.
      timers.set(
        e.giamDinhId,
        setTimeout(() => {
          setActive((prev) => {
            const next = { ...prev };
            delete next[e.giamDinhId];
            return next;
          });
          timers.delete(e.giamDinhId);
        }, 2000),
      );
    });

    // Đủ đồng thuận, đã ghi điểm chính thức -> dọn sạch đèn đang sáng,
    // coi như 1 đợt tín hiệu đã kết thúc, bắt đầu đợt mới từ đầu.
    const unsubConsensus = subscribeConsensus(courtId, () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      setActive({});
    });

    return () => {
      unsubPress();
      unsubConsensus();
      timers.forEach((t) => clearTimeout(t));
    };
  }, [courtId]);

  const doList = Object.entries(active).filter(([, p]) => p.mau === "do");
  const xanhList = Object.entries(active).filter(([, p]) => p.mau === "xanh");

  return (
    <div className={styles.panel}>
      <div className={styles.col}>
        <span className={styles.label}>ĐỎ đang bấm</span>
        <div className={styles.badges}>
          {doList.map(([id, p]) => (
            <span key={id} className={styles.badgeDo}>
              {p.tenTrongTai} +{p.diem}
            </span>
          ))}
          {doList.length === 0 && <span className={styles.empty}>—</span>}
        </div>
      </div>
      <div className={styles.col}>
        <span className={styles.label}>XANH đang bấm</span>
        <div className={styles.badges}>
          {xanhList.map(([id, p]) => (
            <span key={id} className={styles.badgeXanh}>
              {p.tenTrongTai} +{p.diem}
            </span>
          ))}
          {xanhList.length === 0 && <span className={styles.empty}>—</span>}
        </div>
      </div>
    </div>
  );
}
