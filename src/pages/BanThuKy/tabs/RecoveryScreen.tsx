/** @format */

import { useState } from "react";
import type { Match } from "../../../types";
import { publishMatchState } from "../../../lib/realtime/liveMatchStore";
import { serverNow } from "../../../lib/realtime/serverClock";
import { makeLiveState } from "../helpers";
import styles from "../BanThuKy.module.scss";

export default function RecoveryScreen({
  match,
  eventTen,
  athleteName,
  athleteTeam,
}: {
  match: Match;
  eventTen: string;
  athleteName: (id: string | null) => string | null;
  athleteTeam: (id: string | null) => string;
}) {
  const [hiep, setHiep] = useState(1);
  const [diemDo, setDiemDo] = useState(0);
  const [diemXanh, setDiemXanh] = useState(0);

  const khoiPhuc = () => {
    const base = makeLiveState(
      match.courtId!,
      eventTen,
      match,
      athleteName(match.athleteRedId) ?? "—",
      athleteTeam(match.athleteRedId),
      null,
      athleteName(match.athleteBlueId) ?? "—",
      athleteTeam(match.athleteBlueId),
      null,
    );
    publishMatchState({
      ...base,
      trangThai: "tam_dung",
      hiepHienTai: hiep,
      diemChinhThucDo: diemDo,
      diemChinhThucXanh: diemXanh,
      capNhatDongHoLuc: serverNow(),
    });
  };

  return (
    <div className={styles.recoveryBox}>
      <h3 className={styles.recoveryTitle}>⚠ Mất trạng thái trận đấu</h3>
      <p className={styles.recoveryDesc}>
        Trận này đang được đánh dấu "đang thi" trong hệ thống, nhưng máy chủ
        không còn dữ liệu điểm/hiệp sống — khả năng cao do máy chủ vừa khởi động
        lại. <strong>Nhập đúng tiến trình thật</strong> trước khi tiếp tục — hỏi
        lại trọng tài nếu không chắc, không tự đoán.
      </p>
      <div className={styles.settingsForm}>
        <label className={styles.field}>
          <span>Đang ở hiệp</span>
          <input
            type="number"
            min={1}
            value={hiep}
            onChange={(e) => setHiep(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Điểm Đỏ hiện tại</span>
          <input
            type="number"
            value={diemDo}
            onChange={(e) => setDiemDo(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Điểm Xanh hiện tại</span>
          <input
            type="number"
            value={diemXanh}
            onChange={(e) => setDiemXanh(Number(e.target.value))}
          />
        </label>
        <button className={styles.btnPrimary} onClick={khoiPhuc}>
          Khôi phục — trận sẽ ở trạng thái Tạm dừng
        </button>
      </div>
    </div>
  );
}
