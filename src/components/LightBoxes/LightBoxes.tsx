/** @format */

import styles from "./LightBoxes.module.scss";

export default function LightBoxes({
  presses,
  className,
}: {
  presses: (number | undefined)[];
  className?: string;
}) {
  return (
    <div
      className={[styles.lightBoxesRow, className].filter(Boolean).join(" ")}>
      {Array.from({ length: 5 }, (_, i) => {
        const diem = presses[i];
        // 1 điểm — vàng; 2 điểm — xanh lá, để phân biệt được ngay từ xa
        // không cần nhìn rõ mấy nửa sáng.
        const onClass = diem === 2 ? styles.lightHalfOn2 : styles.lightHalfOn1;
        const topOn = diem !== undefined && diem >= 2;
        const bottomOn = diem !== undefined && diem >= 1;
        return (
          <div key={i} className={styles.lightBox}>
            <span className={topOn ? onClass : styles.lightHalfOff} />
            <span className={bottomOn ? onClass : styles.lightHalfOff} />
          </div>
        );
      })}
    </div>
  );
}
