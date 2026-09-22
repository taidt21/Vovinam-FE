/** @format */

import { useEffect, useRef, useState } from "react";
import { subscribeLightPressed } from "../../lib/realtime/pressLightClient";
import { lightDisplayDurationMs } from "../../lib/realtime/usePressedLights";
import styles from "./LiveLightsPanel.module.scss";

interface ActivePress {
  tenTrongTai: string;
  mau: "do" | "xanh";
  diem: number;
}

export default function LiveLightsPanel({
  courtId,
  displayDurationSeconds,
}: {
  courtId: string;
  displayDurationSeconds: number;
}) {
  const [active, setActive] = useState<Record<string, ActivePress>>({});
  const displayDurationMsRef = useRef(
    lightDisplayDurationMs(displayDurationSeconds),
  );
  displayDurationMsRef.current = lightDisplayDurationMs(displayDurationSeconds);

  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const unsubPress = subscribeLightPressed(courtId, (e) => {
      const pressKey = `${e.giamDinhId}:${e.mau}`;
      setActive((prev) => ({
        ...prev,
        [pressKey]: {
          tenTrongTai: e.tenTrongTai,
          mau: e.mau,
          diem: e.diem,
        },
      }));
      const existing = timers.get(pressKey);
      if (existing) clearTimeout(existing);
      // Mỗi lần bấm mới của ĐÚNG người đó làm mới lại thời gian cấu hình — bấm liên
      // tục thì đèn giữ sáng liên tục, không nhấp nháy tắt-bật vô nghĩa.
      timers.set(
        pressKey,
        setTimeout(() => {
          setActive((prev) => {
            const next = { ...prev };
            delete next[pressKey];
            return next;
          });
          timers.delete(pressKey);
        }, displayDurationMsRef.current),
      );
    });

    // TRƯỚC ĐÂY: nghe thêm ConsensusScored (đủ 3/5 người đồng thuận) để
    // xoá sạch toàn bộ badge ngay lập tức — 5 giám định bấm gần như đồng
    // thời thì backend xử lý tuần tự, người thứ 3 vừa đủ ngưỡng là xoá
    // mất cả 3 badge vừa hiện, người thứ 4-5 bấm sau vài mili-giây mới
    // kịp hiện, nên chỉ còn thấy tối đa 2 người dù cả 5 đều đã bấm. Bỏ
    // hẳn — để MỖI badge tự tắt theo đúng thời gian cấu hình của riêng nó.
    return () => {
      unsubPress();
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
