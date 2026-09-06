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
        // .lightBox xếp hàng ngang (flex-direction: row) — đây là 2 ô
        // TRÁI/PHẢI, không phải trên/dưới (tên biến cũ "topOn"/"bottomOn"
        // gây hiểu lầm, đã đổi lại cho đúng thực tế). Ô TRÁI sáng từ 1
        // điểm trở lên, ô PHẢI chỉ sáng thêm khi đủ 2 điểm — khớp đúng
        // thứ tự bên JudgePanel ở màn hình công khai (đèn 1 điểm luôn ở
        // bên trái).
        const leftOn = diem !== undefined && diem >= 1;
        const rightOn = diem !== undefined && diem >= 2;
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
