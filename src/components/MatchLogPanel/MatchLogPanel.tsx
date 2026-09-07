/** @format */

import { useEffect, useState } from "react";
import {
  getMatchLog,
  subscribeMatchLog,
  type MatchLogEntry,
} from "../../lib/realtime/pressLightClient";
import styles from "./MatchLogPanel.module.scss";

export default function MatchLogPanel({
  courtId,
  filterGiamDinhId,
  staticLog,
}: {
  // Bỏ trống lúc dùng staticLog (xem bên dưới) — vẫn phải khai kiểu
  // string bình thường (không optional) vì mọi lời gọi ĐANG CÓ đều
  // truyền courtId thật, không muốn ép sửa lại toàn bộ chỗ gọi cũ chỉ
  // vì thêm 1 trường hợp dùng mới.
  courtId: string;
  // Có giá trị thì CHỈ hiện đúng dòng log của trọng tài này (VD màn hình
  // trọng tài tự chấm — không cần/không nên thấy lượt bấm của người
  // khác hay điều chỉnh tay của Bàn thư ký). Bỏ trống thì hiện đầy đủ
  // như trước (VD bên Bàn thư ký cần thấy toàn cảnh).
  filterGiamDinhId?: string;
  // Có giá trị thì hiện THẲNG đúng mảng này, KHÔNG tự lấy/theo dõi live
  // qua courtId nữa — dùng cho "Xem lại trận đã kết thúc" (trận có thể
  // đã xong từ lâu, RAM của courtId đó giờ đang phục vụ trận khác rồi,
  // dữ liệu cần xem lại đọc thẳng từ API riêng, không qua SignalR).
  staticLog?: MatchLogEntry[];
}) {
  const [log, setLog] = useState<MatchLogEntry[]>(() =>
    staticLog ? staticLog : getMatchLog(courtId),
  );

  useEffect(() => {
    if (staticLog) return;
    setLog(getMatchLog(courtId));
    return subscribeMatchLog(courtId, setLog);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtId, staticLog]);

  const nguon = staticLog ?? log;
  const daLoc = filterGiamDinhId
    ? nguon.filter((e) => e.giamDinhId === filterGiamDinhId)
    : nguon;

  return (
    <div className={styles.panel}>
      <div className={styles.title}>
        {filterGiamDinhId ? "Nhật ký của bạn" : "Nhật ký trận đấu (thời gian thực)"}
      </div>
      <div className={styles.list}>
        {[...daLoc].reverse().map((entry) => (
          <div
            key={entry.id}
            className={
              entry.noiDung.startsWith("✓") ? styles.scoreLine : styles.line
            }>
            <span className={styles.time}>
              {entry.matchTimeLabel ??
                new Date(entry.luc).toLocaleTimeString("vi-VN")}
            </span>
            <span>{entry.noiDung}</span>
          </div>
        ))}
        {daLoc.length === 0 && (
          <p className={styles.empty}>Chưa có sự kiện nào.</p>
        )}
      </div>
    </div>
  );
}
