/** @format */

import { useState } from "react";
import type { Match } from "../../../types";
import { publishMatchState } from "../../../lib/realtime/liveMatchStore";
import { serverNow } from "../../../lib/realtime/serverClock";
import {
  makeLiveState,
  DEFAULT_TONG_SO_HIEP,
  DEFAULT_THOI_GIAN_HIEP,
  DEFAULT_THOI_GIAN_NGHI,
} from "../helpers";
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
  const [tongSoHiep, setTongSoHiep] = useState(DEFAULT_TONG_SO_HIEP);
  const [thoiGianHiepGiay, setThoiGianHiepGiay] = useState(
    DEFAULT_THOI_GIAN_HIEP,
  );
  const [thoiGianConLaiGiay, setThoiGianConLaiGiay] = useState(
    DEFAULT_THOI_GIAN_HIEP,
  );
  const [thoiGianNghiGiay, setThoiGianNghiGiay] = useState(
    DEFAULT_THOI_GIAN_NGHI,
  );
  const [diemDo, setDiemDo] = useState(0);
  const [canhCaoDo, setCanhCaoDo] = useState(0);
  const [diemXanh, setDiemXanh] = useState(0);
  const [canhCaoXanh, setCanhCaoXanh] = useState(0);

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
      tongSoHiep,
      thoiGianHiepGiay,
      thoiGianConLaiGiay,
      thoiGianNghiGiay,
      diemChinhThucDo: diemDo,
      canhCaoDo,
      diemChinhThucXanh: diemXanh,
      canhCaoXanh,
      diemDaChinhTay: true,
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
        lại trọng tài nếu không chắc, không tự đoán. Các ô đã điền sẵn giá trị
        mặc định — CHỈ giữ nguyên nếu trận này đúng là chưa từng đổi cài đặt.
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
          <span>Tổng số hiệp của trận</span>
          <input
            type="number"
            min={1}
            value={tongSoHiep}
            onChange={(e) => setTongSoHiep(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Thời gian mỗi hiệp (giây)</span>
          <input
            type="number"
            min={1}
            value={thoiGianHiepGiay}
            onChange={(e) => setThoiGianHiepGiay(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Thời gian CÒN LẠI trong hiệp hiện tại (giây)</span>
          <input
            type="number"
            min={0}
            value={thoiGianConLaiGiay}
            onChange={(e) => setThoiGianConLaiGiay(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Thời gian nghỉ giữa hiệp (giây)</span>
          <input
            type="number"
            min={0}
            value={thoiGianNghiGiay}
            onChange={(e) => setThoiGianNghiGiay(Number(e.target.value))}
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
          <span>Số lần cảnh cáo Đỏ đã có (0–2)</span>
          <input
            type="number"
            min={0}
            max={2}
            value={canhCaoDo}
            onChange={(e) => setCanhCaoDo(Number(e.target.value))}
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
        <label className={styles.field}>
          <span>Số lần cảnh cáo Xanh đã có (0–2)</span>
          <input
            type="number"
            min={0}
            max={2}
            value={canhCaoXanh}
            onChange={(e) => setCanhCaoXanh(Number(e.target.value))}
          />
        </label>
        <button className={styles.btnPrimary} onClick={khoiPhuc}>
          Khôi phục — trận sẽ ở trạng thái Tạm dừng
        </button>
      </div>
    </div>
  );
}
