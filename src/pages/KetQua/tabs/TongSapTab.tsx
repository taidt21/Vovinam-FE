/** @format */

import type { MedalTally } from "../../../lib/domain/medals";
import styles from "../KetQua.module.scss";

export default function TongSapTab({
  tally,
  teamName,
}: {
  tally: MedalTally[];
  teamName: (id: string) => string;
}) {
  return (
    <section className={styles.card}>
      <table className={styles.medalTable}>
        <thead>
          <tr>
            <th>Hạng</th>
            <th>Đoàn</th>
            <th className={styles.center}>HCV</th>
            <th className={styles.center}>HCB</th>
            <th className={styles.center}>HCĐ</th>
            <th className={styles.center}>Tổng</th>
          </tr>
        </thead>
        <tbody>
          {tally.map((t, i) => (
            <tr key={t.teamId}>
              <td className={styles.rankNum}>{i + 1}</td>
              <td>{teamName(t.teamId)}</td>
              <td className={`${styles.center} ${styles.gold}`}>{t.vang}</td>
              <td className={styles.center}>{t.bac}</td>
              <td className={styles.center}>{t.dong}</td>
              <td className={`${styles.center} ${styles.total}`}>
                {t.vang + t.bac + t.dong}
              </td>
            </tr>
          ))}
          {tally.length === 0 && (
            <tr>
              <td colSpan={6} className={styles.empty}>
                Chưa có nội dung nào kết thúc
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
