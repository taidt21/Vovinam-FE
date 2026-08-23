/** @format */

import styles from "./KetQua.module.scss";

export default function MedalBox({
  items,
}: {
  items: {
    hang: 1 | 2 | 3;
    label?: string;
    members?: string[];
    sub: string;
    diem?: number;
  }[];
}) {
  const tagFor = (hang: 1 | 2 | 3) =>
    hang === 1 ? "HCV" : hang === 2 ? "HCB" : "HCĐ";
  const iconFor = (hang: 1 | 2 | 3) =>
    hang === 1 ? "🥇" : hang === 2 ? "🥈" : "🥉";
  const badgeClass = (hang: 1 | 2 | 3) =>
    hang === 1
      ? styles.medalBadgeVang
      : hang === 2
        ? styles.medalBadgeBac
        : styles.medalBadgeDong;

  return (
    <section className={styles.medalBox}>
      <div className={styles.sectionHeader}>
        <div>
          <strong>Thành tích huy chương</strong>
          <span>Kết quả cao nhất của nội dung</span>
        </div>
        <span className={styles.sectionCount}>{items.length} huy chương</span>
      </div>
      <div className={styles.medalListNew}>
        {items.map((it, i) => (
          <div key={i} className={styles.medalListRow}>
            <span className={styles.medalListIcon}>{iconFor(it.hang)}</span>
            <div className={styles.medalListInfo}>
              {it.members ? (
                <div className={styles.quyenMemberList}>
                  {it.members.length > 0 ? (
                    it.members.map((member) => (
                      <span key={member} className={styles.quyenMember}>
                        {member}
                      </span>
                    ))
                  ) : (
                    <span className={styles.quyenMemberEmpty}>
                      Chưa có danh sách VĐV
                    </span>
                  )}
                </div>
              ) : (
                <div className={styles.medalListName}>{it.label}</div>
              )}
              {it.sub && <div className={styles.medalListSub}>{it.sub}</div>}
            </div>
            <span className={`${styles.medalListBadge} ${badgeClass(it.hang)}`}>
              <strong>{tagFor(it.hang)}</strong>
              {it.diem !== undefined && (
                <small>{it.diem.toFixed(2)} điểm</small>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
