import type { EventSummaryState } from '../../types/eventSummary';
import styles from './EventSummaryView.module.scss';

export default function EventSummaryView({
  summary,
  publicMode = false,
  onClose,
}: {
  summary: EventSummaryState;
  publicMode?: boolean;
  onClose?: () => void;
}) {
  const iconFor = (hang: 1 | 2 | 3) =>
    hang === 1 ? '🥇' : hang === 2 ? '🥈' : '🥉';
  const tagFor = (hang: 1 | 2 | 3) =>
    hang === 1 ? 'HCV' : hang === 2 ? 'HCB' : 'HCĐ';

  return (
    <section
      className={`${styles.summary} ${publicMode ? styles.publicMode : ''}`}>
      <header className={styles.header}>
        <span className={styles.kicker}>TỔNG KẾT NỘI DUNG</span>
        <h2>{summary.eventTen}</h2>
        <span className={styles.typeLabel}>
          {summary.loai === 'doi_khang' ? 'ĐỐI KHÁNG' : 'QUYỀN'}
        </span>
      </header>

      <div className={styles.sectionTitle}>
        <div>
          <strong>Thành tích huy chương</strong>
          <span>Kết quả cao nhất của nội dung</span>
        </div>
        <span>{summary.items.length} huy chương</span>
      </div>

      <div className={styles.medalList}>
        {summary.items.map((item, index) => (
          <article className={styles.medalRow} key={`${item.hang}-${index}`}>
            <span className={styles.medalIcon}>{iconFor(item.hang)}</span>
            <div className={styles.medalInfo}>
              {item.members ? (
                <div className={styles.members}>
                  {item.members.length > 0 ? (
                    item.members.map((member) => (
                      <span key={member}>{member}</span>
                    ))
                  ) : (
                    <span>Chưa có danh sách VĐV</span>
                  )}
                </div>
              ) : (
                <strong className={styles.medalName}>{item.label ?? '—'}</strong>
              )}
              {item.sub && <span className={styles.medalSub}>{item.sub}</span>}
            </div>
            <div className={`${styles.medalBadge} ${styles[`hang${item.hang}`]}`}>
              <strong>{tagFor(item.hang)}</strong>
              {item.diem !== undefined && <small>{item.diem.toFixed(2)} điểm</small>}
            </div>
          </article>
        ))}
      </div>

      {!publicMode && onClose && (
        <div className={styles.actions}>
          <button type="button" onClick={onClose}>Đóng tổng kết</button>
        </div>
      )}
    </section>
  );
}
