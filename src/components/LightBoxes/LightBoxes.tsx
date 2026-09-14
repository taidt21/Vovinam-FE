/** @format */

import styles from "./LightBoxes.module.scss";

export default function LightBoxes({
  presses,
  className,
  side,
}: {
  presses: (number | undefined)[];
  className?: string;
  side?: "do" | "xanh";
}) {
  const isBlue = side === "xanh";
  return (
    <div
      className={[styles.lightBoxesWrap, className].filter(Boolean).join(" ")}>
      <div className={styles.lightLegend} aria-hidden="true">
        <span className={styles.lightLegendSpacer} />
        <span className={styles.lightLegendCell}>{isBlue ? "+1" : "+2"}</span>
        <span className={styles.lightLegendCell}>{isBlue ? "+2" : "+1"}</span>
      </div>
      <div className={styles.lightBoxesRow}>
        {Array.from({ length: 5 }, (_, i) => {
          const diem = presses[i];
          // Mỗi giám định chỉ làm sáng đúng MỘT cột:
          // - +1 = cột phía trong (gần khu vực thi đấu)
          // - +2 = cột phía ngoài
          // Đỏ nằm bên trái: ngoài=trái, trong=phải.
          // Xanh nằm bên phải: trong=trái, ngoài=phải.
          const onClass = styles.lightHalfOn1;
          const leftIsOuter = side === "do";
          const leftOn = diem === (leftIsOuter ? 2 : 1);
          const rightOn = diem === (leftIsOuter ? 1 : 2);
          return (
            <div key={i} className={styles.lightBox}>
              <span className={leftOn ? onClass : styles.lightHalfOff} />
              <span className={rightOn ? onClass : styles.lightHalfOff} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
