/** @format */

import styles from "./KetQua.module.scss";

export default function MedalBox({
  items,
}: {
  items: { hang: 1 | 2 | 3; label: string; sub: string }[];
}) {
  const rowClass = (hang: 1 | 2 | 3) =>
    hang === 1
      ? styles.medalRowVang
      : hang === 2
        ? styles.medalRowBac
        : styles.medalRowDong;
  const labelFor = (hang: 1 | 2 | 3) =>
    hang === 1 ? "🥇 Vàng" : hang === 2 ? "🥈 Bạc" : "🥉 Đồng";
  return (
    <div className={styles.medalBox}>
      {items.map((it, i) => (
        <div key={i} className={rowClass(it.hang)}>
          <span className={styles.medalTag}>{labelFor(it.hang)}</span>
          <span className={styles.medalName}>{it.label}</span>
          <span className={styles.medalSub}>{it.sub}</span>
        </div>
      ))}
    </div>
  );
}
