/** @format */

import styles from "./LightBoxes.module.scss";

export default function LightBoxes({
  presses,
  side,
  className,
}: {
  presses: (number | undefined)[];
  side: "do" | "xanh";
  className?: string;
}) {
  return (
    <div
      className={[styles.lightBoxesRow, className].filter(Boolean).join(" ")}>
      {Array.from({ length: 5 }, (_, i) => {
        const diem = presses[i];
        // Mỗi giám định có 2 cột đèn riêng:
        // - cột PHÍA TRONG (gần khu vực thi đấu) = 1 điểm
        // - cột PHÍA NGOÀI = 2 điểm
        // Chỉ sáng đúng MỘT đèn theo số điểm được bấm, không sáng cả hai.
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
  );
}
