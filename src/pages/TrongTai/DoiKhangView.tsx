/** @format */

import { useEffect, useState } from "react";
import {
  tinhThoiGianConLai,
  tinhNhanThoiGianTran,
  formatMmSs,
} from "../../lib/realtime/liveMatchStore";
import {
  pressLight,
  subscribeConsensus,
  subscribeRejected,
  type ConsensusEvent,
} from "../../lib/realtime/pressLightClient";
import type { LiveMatchState } from "../../types/live";
import type { Identity } from "./TrongTai";
import styles from "./TrongTai.module.scss";

export default function DoiKhangView({
  identity,
  live,
}: {
  identity: Identity;
  live: LiveMatchState | null;
}) {
  const { trongTaiId, tenTrongTai, courtId } = identity;
  const [, setTick] = useState(0);
  const [flash, setFlash] = useState<ConsensusEvent | null>(null);
  const [rejectMsg, setRejectMsg] = useState<string | null>(null);
  const [pressingKey, setPressingKey] = useState<string | null>(null);

  useEffect(() => {
    return subscribeConsensus(courtId, (e) => {
      setFlash(e);
      const t = setTimeout(() => setFlash(null), 2000);
      return () => clearTimeout(t);
    });
  }, [courtId]);

  useEffect(() => {
    return subscribeRejected((msg) => {
      setRejectMsg(msg);
      setTimeout(() => setRejectMsg(null), 3000);
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const dangThi = live?.trangThai === "dang_thi";
  const remaining = live ? tinhThoiGianConLai(live) : 0;
  const hetGio = dangThi && remaining <= 0;
  const coTheBamDen = dangThi && !hetGio;

  const handlePress = (mau: "do" | "xanh", diem: 1 | 2) => {
    const key = `${mau}${diem}`;
    setPressingKey(key);
    setTimeout(() => setPressingKey(null), 200);
    pressLight(
      courtId,
      trongTaiId,
      tenTrongTai,
      mau,
      diem,
      live ? tinhNhanThoiGianTran(live) : undefined,
    );
  };

  // Dòng trạng thái ngắn gọn hiện trong dải thông tin — thay thế đủ 3
  // ghi chú dài trước đây (không đủ chỗ trong dải mỏng của layout mới).
  let trangThaiNgan = "";
  if (!live) trangThaiNgan = "Chưa có trận";
  else if (hetGio) trangThaiNgan = "Hết giờ — chờ hiệp mới";
  else if (!dangThi) trangThaiNgan = "Chưa thi / tạm dừng";

  return (
    // Luôn ép giao diện ngang, kiểu tay cầm game — bất kể máy đang dọc
    // hay ngang. Chỉ xoay bằng CSS khi máy THẬT SỰ đang ở chế độ DỌC
    // (xem @media (orientation: portrait) trong file scss) — máy đã tự
    // xoay ngang sẵn thì để nguyên, KHÔNG xoay chồng thêm lần nữa. Thử
    // qua thực tế: xoay chồng 2 lần (máy tự xoay + CSS xoay thêm) làm
    // vỡ hẳn layout, dồn cục vào 1 góc — đây là lý do bắt buộc phải có
    // điều kiện portrait, không được xoay vô điều kiện.
    <div className={styles.doiKhangRotWrap}>
      <div className={styles.doiKhangInner}>
        <div className={styles.doiKhangInfoStrip}>
          <span className={styles.doiKhangInfoNames}>
            {live ? `${live.tenXanh} vs ${live.tenDo}` : "Chờ Bàn thư ký"}
            {live && ` — Hiệp ${live.hiepHienTai}/${live.tongSoHiep}`}
          </span>
          {trangThaiNgan && (
            <span className={styles.doiKhangInfoWarn}>{trangThaiNgan}</span>
          )}
          <span className={styles.doiKhangInfoClock}>
            {live ? formatMmSs(remaining) : "00:00"}
          </span>
        </div>

        <div className={styles.doiKhangMainArea}>
          <div className={styles.doiKhangSideCol}>
            <button
              className={`${styles.doiKhangBtnXanh} ${styles.doiKhangBtn1} ${pressingKey === "xanh1" ? styles.pressing : ""}`}
              disabled={!coTheBamDen}
              onClick={() => handlePress("xanh", 1)}>
              XANH +1
            </button>
            <button
              className={`${styles.doiKhangBtnXanh} ${styles.doiKhangBtn2} ${pressingKey === "xanh2" ? styles.pressing : ""}`}
              disabled={!coTheBamDen}
              onClick={() => handlePress("xanh", 2)}>
              XANH +2
            </button>
          </div>
          <div className={styles.doiKhangSideCol}>
            <button
              className={`${styles.doiKhangBtnDo} ${styles.doiKhangBtn1} ${pressingKey === "do1" ? styles.pressing : ""}`}
              disabled={!coTheBamDen}
              onClick={() => handlePress("do", 1)}>
              ĐỎ +1
            </button>
            <button
              className={`${styles.doiKhangBtnDo} ${styles.doiKhangBtn2} ${pressingKey === "do2" ? styles.pressing : ""}`}
              disabled={!coTheBamDen}
              onClick={() => handlePress("do", 2)}>
              ĐỎ +2
            </button>
          </div>
        </div>
      </div>

      {flash && (
        <div className={flash.mau === "do" ? styles.flashDo : styles.flashXanh}>
          {flash.mau === "do" ? "ĐỎ" : "XANH"} +{flash.diem} — đã ghi điểm (
          {flash.soLuong}/5 đồng thuận)
        </div>
      )}
      {rejectMsg && <div className={styles.rejectToast}>{rejectMsg}</div>}
    </div>
  );
}
