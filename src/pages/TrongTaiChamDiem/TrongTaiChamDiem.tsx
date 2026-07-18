/** @format */

import { useState } from "react";
import { Check, Lock, Minus, Plus, Settings } from "lucide-react";
import type { EventKind } from "../../types";
import styles from "./TrongTaiChamDiem.module.scss";

// Bối cảnh trận được phân công — sẽ đến từ server + đăng nhập trọng tài.
// Đổi LOAI để xem 2 giao diện: 'quyen' (nhập 1 điểm) vs 'doi_khang' (bấm cộng dồn).
const LOAI: EventKind = "doi_khang";
const CTX = {
  tenNoiDung: "Đối kháng nam - 54kg",
  vong: "Bán kết",
  hiep: 1,
  vdvDo: { hoTen: "Nguyễn Minh Khang", donVi: "Bình Dương" },
  vdvXanh: { hoTen: "Trần Đình Dương", donVi: "Nam Định" },
  // Cho thi quyền:
  vdvQuyen: { hoTen: "Trần Nhật Nam", donVi: "Cần Thơ" },
};

export default function TrongTaiChamDiem() {
  return LOAI === "doi_khang" ? <ChamDoiKhang /> : <ChamQuyen />;
}

/* ---------- ĐỐI KHÁNG: bấm cộng dồn, phản hồi tức thì ---------- */
function ChamDoiKhang() {
  const [diemDo, setDiemDo] = useState(0);
  const [diemXanh, setDiemXanh] = useState(0);
  const [pulse, setPulse] = useState<"do" | "xanh" | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const send = (side: "do" | "xanh", delta: number) => {
    // Optimistic: cập nhật ngay tại chỗ, gửi server ngầm phía sau. Không khóa,
    // không chốt — đối kháng cộng dồn thời gian thực, mỗi lần bấm là 1 lần ghi nhận.
    if (side === "do") setDiemDo((n) => Math.max(0, n + delta));
    else setDiemXanh((n) => Math.max(0, n + delta));
    if (delta > 0) {
      setPulse(side);
      setTimeout(() => setPulse(null), 150);
    }
    setLastSync(new Date().toLocaleTimeString("vi-VN"));
    // TODO: POST/SignalR gửi { matchId, side, delta } lên server. Lỗi mạng -> hiện lại để thử.
  };

  return (
    <div className={styles.screen}>
      <header className={styles.headerDoiKhang}>
        <span className={styles.badgeDoiKhang}>Đối kháng</span>
        <div className={styles.headMeta}>
          <div>{CTX.tenNoiDung}</div>
          <div className={styles.headSub}>
            {CTX.vong} · Hiệp {CTX.hiep}
          </div>
        </div>
        <button className={styles.iconBtn} aria-label="Cài đặt">
          <Settings size={20} />
        </button>
      </header>

      <div className={styles.tapArea}>
        <div
          className={`${styles.tapCol} ${styles.tapDo} ${pulse === "do" ? styles.tapPulse : ""}`}>
          <span className={styles.tapCorner}>ĐỎ</span>
          <span className={styles.tapName}>{CTX.vdvDo.hoTen}</span>
          <span className={styles.tapScore}>{diemDo}</span>
          <div className={styles.tapControls}>
            <button
              className={styles.minusBtn}
              onClick={() => send("do", -1)}
              aria-label="Trừ điểm đỏ">
              <Minus size={22} />
            </button>
            <button
              className={styles.plusBtn}
              onClick={() => send("do", 1)}
              aria-label="Cộng điểm đỏ">
              <Plus size={22} />
            </button>
          </div>
        </div>

        <div
          className={`${styles.tapCol} ${styles.tapXanh} ${pulse === "xanh" ? styles.tapPulse : ""}`}>
          <span className={styles.tapCorner}>XANH</span>
          <span className={styles.tapName}>{CTX.vdvXanh.hoTen}</span>
          <span className={styles.tapScore}>{diemXanh}</span>
          <div className={styles.tapControls}>
            <button
              className={styles.minusBtn}
              onClick={() => send("xanh", -1)}
              aria-label="Trừ điểm xanh">
              <Minus size={22} />
            </button>
            <button
              className={styles.plusBtn}
              onClick={() => send("xanh", 1)}
              aria-label="Cộng điểm xanh">
              <Plus size={22} />
            </button>
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <p className={styles.footNote}>
          {lastSync
            ? `Đã đồng bộ lúc ${lastSync}`
            : "Mỗi lần bấm được gửi ngay tới bàn thư ký"}
        </p>
      </footer>
    </div>
  );
}
/* ---------- QUYỀN: nhập 1 điểm cuối + điểm trừ ---------- */
function ChamQuyen() {
  const [diem, setDiem] = useState("");
  const [diemTru, setDiemTru] = useState("");
  const [locked, setLocked] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);

  const diemThuc = Math.max(
    0,
    (parseFloat(diem) || 0) - (parseFloat(diemTru) || 0),
  );
  const canSubmit = diem !== "" && !locked;

  const submit = () => {
    if (!canSubmit) return;
    setLocked(true);
    setLastSent(new Date().toLocaleTimeString("vi-VN"));
  };

  return (
    <div className={styles.screen}>
      <header className={styles.headerQuyen}>
        <span className={styles.badgeQuyen}>Thi quyền</span>
        <div className={styles.headMeta}>
          <div>{CTX.tenNoiDung.replace("Đối kháng", "Quyền")}</div>
          <div className={styles.headSub}>{CTX.vong}</div>
        </div>
        <button className={styles.iconBtn} aria-label="Cài đặt">
          <Settings size={20} />
        </button>
      </header>

      <div className={styles.quyenBody}>
        <div className={styles.quyenAthlete}>
          <div className={styles.quyenName}>{CTX.vdvQuyen.hoTen}</div>
          <div className={styles.quyenUnit}>{CTX.vdvQuyen.donVi}</div>
        </div>

        <label className={styles.quyenField}>
          <span>Điểm cuối cùng</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={diem}
            onChange={(e) => setDiem(e.target.value)}
            placeholder="0.00"
            disabled={locked}
            autoFocus
          />
        </label>

        <label className={styles.quyenField}>
          <span>Điểm trừ (nếu có)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={diemTru}
            onChange={(e) => setDiemTru(e.target.value)}
            placeholder="0.00"
            disabled={locked}
          />
        </label>

        <div className={styles.quyenResult}>
          <span>Điểm thực</span>
          <strong>{diemThuc.toFixed(2)}</strong>
        </div>
      </div>

      <footer className={styles.footer}>
        {!locked ? (
          <button
            className={styles.submitBtn}
            onClick={submit}
            disabled={!canSubmit}>
            <Check size={18} /> Gửi điểm
          </button>
        ) : (
          <div className={styles.lockedBar}>
            <Lock size={16} /> Đã gửi lúc {lastSent} — không thể sửa
          </div>
        )}
        <p className={styles.footNote}>
          Sau khi gửi, thiết bị tự khóa, không thể gửi lại.
        </p>
      </footer>
    </div>
  );
}
