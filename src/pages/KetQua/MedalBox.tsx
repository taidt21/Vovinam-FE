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
    hang === 1 ? "HCV" : hang === 2 ? "HCB" : "HCĐ";
  const iconFor = (hang: 1 | 2 | 3) => (hang === 1 ? "🥇" : hang === 2 ? "🥈" : "🥉");

  return (
    <section className={styles.medalBox}>
      <div className={styles.medalBoxHead}>
        <div>
          <strong>Thành tích huy chương</strong>
          <span>Kết quả cao nhất của nội dung</span>
        </div>
      </div>
      <div className={styles.medalGrid}>
        {items.map((it, i) => (
          <div key={i} className={rowClass(it.hang)}>
            <div className={styles.medalIcon}>{iconFor(it.hang)}</div>
            <div className={styles.medalContent}>
              <span className={styles.medalTag}>{labelFor(it.hang)}</span>
              <span className={styles.medalName}>{it.label}</span>
              {it.sub && <span className={styles.medalSub}>{it.sub}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
