/** @format */

import { useMemo, useState } from "react";
import type { MedalTally } from "../../../lib/domain/medals";
import styles from "../KetQua.module.scss";

type SortMode = "hcv" | "diem";

export default function TongSapTab({
  tally,
  teamName,
  heSo,
}: {
  tally: MedalTally[];
  teamName: (id: string) => string;
  heSo: { vang: number; bac: number; dong: number };
}) {
  const [sortMode, setSortMode] = useState<SortMode>("hcv");
  const totalMedals = tally.reduce((sum, t) => sum + t.vang + t.bac + t.dong, 0);

  const sorted = useMemo(() => {
    const list = [...tally];
    if (sortMode === "diem") {
      return list.sort(
        (a, b) => b.diem - a.diem || b.vang - a.vang || b.bac - a.bac || b.dong - a.dong,
      );
    }
    return list.sort((a, b) => b.vang - a.vang || b.bac - a.bac || b.dong - a.dong);
  }, [tally, sortMode]);

  return (
    <section className={styles.tallySection}>
      <div className={styles.tallyHeader}>
        <div>
          <span className={styles.resultType}>Xếp hạng toàn đoàn</span>
          <h2>Tổng sắp huy chương</h2>
          <p>
            {sortMode === "hcv"
              ? "Thứ hạng sắp theo số HCV, bằng HCV mới xét tiếp HCB rồi HCĐ."
              : `Thứ hạng sắp theo Điểm (HCV×${heSo.vang} + HCB×${heSo.bac} + HCĐ×${heSo.dong}, hệ số tạm thời — chỉnh ở Thiết lập giải), bằng điểm mới xét tiếp số HCV, HCB, HCĐ.`}
          </p>
        </div>
        <div className={styles.tallySummary}>
          <strong>{totalMedals}</strong>
          <span>huy chương đã trao</span>
        </div>
      </div>

      <div className={styles.sortToggle}>
        <button
          className={sortMode === "hcv" ? styles.sortToggleActive : styles.sortToggleBtn}
          onClick={() => setSortMode("hcv")}>
          Theo số HCV
        </button>
        <button
          className={sortMode === "diem" ? styles.sortToggleActive : styles.sortToggleBtn}
          onClick={() => setSortMode("diem")}>
          Theo điểm
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.tableScroll}>
          <table className={styles.medalTable}>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Đoàn</th>
                <th className={styles.center}>HCV</th>
                <th className={styles.center}>HCB</th>
                <th className={styles.center}>HCĐ</th>
                <th className={styles.center}>Tổng</th>
                <th className={styles.center}>Điểm</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => (
                <tr key={t.teamId} className={i < 3 ? styles.topRankRow : undefined}>
                  <td>
                    <span className={styles.rankBadge} data-rank={i + 1}>
                      {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                    </span>
                  </td>
                  <td>
                    <div className={styles.teamCell}>
                      <strong>{teamName(t.teamId)}</strong>
                      <span>{t.vang + t.bac + t.dong} huy chương</span>
                    </div>
                  </td>
                  <td className={`${styles.center} ${styles.gold}`}>{t.vang}</td>
                  <td className={styles.center}>{t.bac}</td>
                  <td className={styles.center}>{t.dong}</td>
                  <td className={`${styles.center} ${styles.total}`}>
                    {t.vang + t.bac + t.dong}
                  </td>
                  <td className={`${styles.center} ${styles.total}`}>{t.diem}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    Chưa có nội dung nào kết thúc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
