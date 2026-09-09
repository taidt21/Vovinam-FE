/** @format */

import { useEffect, useState } from "react";
import type { Match } from "../../../types";
import { publishMatchState } from "../../../lib/realtime/liveMatchStore";
import { serverNow } from "../../../lib/realtime/serverClock";
import { fetchMatchReview } from "../../../lib/api/matchesApi";
import type { MatchLogEntry } from "../../../lib/realtime/pressLightClient";
import MatchLogPanel from "../../../components/MatchLogPanel/MatchLogPanel";
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
  // Nhật ký ĐÃ LƯU DB của đúng trận này (dữ liệu vẫn còn dù RAM đã mất
  // sạch) — cho BTK ĐỌC LẠI diễn biến thật trước khi gõ tay các ô bên
  // dưới, thay vì phải nhớ suông hoặc hỏi lại trọng tài mọi chi tiết.
  // KHÔNG tự điền số vào form — nhật ký là câu chữ tự do (VD "Đỏ bấm
  // +2"), tự phân tích lại thành đúng từng con số rủi ro suy luận sai
  // còn nguy hiểm hơn để BTK tự đọc và tự gõ.
  const [log, setLog] = useState<MatchLogEntry[]>([]);
  const [dangTaiLog, setDangTaiLog] = useState(true);
  useEffect(() => {
    let huy = false;
    fetchMatchReview(match.id)
      .then((data) => {
        if (!huy) setLog(data.log);
      })
      .catch(() => {})
      .finally(() => {
        if (!huy) setDangTaiLog(false);
      });
    return () => {
      huy = true;
    };
  }, [match.id]);

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
  const [nhacNhoDo, setNhacNhoDo] = useState(0);
  const [soCanhCaoDo, setSoCanhCaoDo] = useState(0);
  const [soCanhCaoHiepDo, setSoCanhCaoHiepDo] = useState(0);
  const [soLanYTeDo, setSoLanYTeDo] = useState(0);
  const [soLanYTeHiepDo, setSoLanYTeHiepDo] = useState(0);
  const [diemXanh, setDiemXanh] = useState(0);
  const [nhacNhoXanh, setNhacNhoXanh] = useState(0);
  const [soCanhCaoXanh, setSoCanhCaoXanh] = useState(0);
  const [soCanhCaoHiepXanh, setSoCanhCaoHiepXanh] = useState(0);
  const [soLanYTeXanh, setSoLanYTeXanh] = useState(0);
  const [soLanYTeHiepXanh, setSoLanYTeHiepXanh] = useState(0);

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
      nhacNhoDo,
      soCanhCaoDo,
      soCanhCaoHiepDo,
      soLanYTeDo,
      soLanYTeHiepDo,
      diemChinhThucXanh: diemXanh,
      nhacNhoXanh,
      soCanhCaoXanh,
      soCanhCaoHiepXanh,
      soLanYTeXanh,
      soLanYTeHiepXanh,
      dangGoiYTe: null,
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

      {/* Nhật ký đã lưu DB của đúng trận này — đọc lại đây trước khi gõ
          tay, không cần nhớ suông hay hỏi lại trọng tài nếu nhật ký đủ
          rõ. Chỉ hiện khi có ít nhất 1 dòng — trận vừa mới bắt đầu, chưa
          ai bấm gì thì không có gì để đọc lại, ẩn hẳn khối này đi. */}
      {!dangTaiLog && log.length > 0 && (
        <div className={styles.recoveryLogRef}>
          <p className={styles.recoveryLogRefHint}>
            Đọc lại diễn biến thật đã ghi nhận được (mới nhất ở trên) trước khi
            điền các ô bên dưới:
          </p>
          <MatchLogPanel courtId={match.courtId ?? ""} staticLog={log} />
        </div>
      )}

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
          <span>Số lần nhắc nhở Đỏ đã có (0–2)</span>
          <input
            type="number"
            min={0}
            max={2}
            value={nhacNhoDo}
            onChange={(e) => setNhacNhoDo(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Số lần cảnh cáo Đỏ CẢ TRẬN đã có (0–3)</span>
          <input
            type="number"
            min={0}
            max={3}
            value={soCanhCaoDo}
            onChange={(e) => setSoCanhCaoDo(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Số lần cảnh cáo Đỏ TRONG HIỆP NÀY đã có (0–2)</span>
          <input
            type="number"
            min={0}
            max={2}
            value={soCanhCaoHiepDo}
            onChange={(e) => setSoCanhCaoHiepDo(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Số lần gọi y tế Đỏ CẢ TRẬN đã có (0–4)</span>
          <input
            type="number"
            min={0}
            max={4}
            value={soLanYTeDo}
            onChange={(e) => setSoLanYTeDo(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Số lần gọi y tế Đỏ TRONG HIỆP NÀY đã có (0–2)</span>
          <input
            type="number"
            min={0}
            max={2}
            value={soLanYTeHiepDo}
            onChange={(e) => setSoLanYTeHiepDo(Number(e.target.value))}
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
          <span>Số lần nhắc nhở Xanh đã có (0–2)</span>
          <input
            type="number"
            min={0}
            max={2}
            value={nhacNhoXanh}
            onChange={(e) => setNhacNhoXanh(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Số lần cảnh cáo Xanh CẢ TRẬN đã có (0–3)</span>
          <input
            type="number"
            min={0}
            max={3}
            value={soCanhCaoXanh}
            onChange={(e) => setSoCanhCaoXanh(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Số lần cảnh cáo Xanh TRONG HIỆP NÀY đã có (0–2)</span>
          <input
            type="number"
            min={0}
            max={2}
            value={soCanhCaoHiepXanh}
            onChange={(e) => setSoCanhCaoHiepXanh(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Số lần gọi y tế Xanh CẢ TRẬN đã có (0–4)</span>
          <input
            type="number"
            min={0}
            max={4}
            value={soLanYTeXanh}
            onChange={(e) => setSoLanYTeXanh(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Số lần gọi y tế Xanh TRONG HIỆP NÀY đã có (0–2)</span>
          <input
            type="number"
            min={0}
            max={2}
            value={soLanYTeHiepXanh}
            onChange={(e) => setSoLanYTeHiepXanh(Number(e.target.value))}
          />
        </label>
        <button className={styles.btnPrimary} onClick={khoiPhuc}>
          Khôi phục — trận sẽ ở trạng thái Tạm dừng
        </button>
      </div>
    </div>
  );
}
