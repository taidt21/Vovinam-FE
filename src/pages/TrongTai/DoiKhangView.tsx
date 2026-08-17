/** @format */

import { useEffect, useState } from "react";
import {
  tinhThoiGianConLai,
  formatMmSs,
} from "../../lib/realtime/liveMatchStore";
import {
  pressLight,
  subscribeConsensus,
  subscribeRejected,
  type ConsensusEvent,
} from "../../lib/realtime/pressLightClient";
import MatchLogPanel from "../../components/MatchLogPanel/MatchLogPanel";
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
    pressLight(courtId, trongTaiId, tenTrongTai, mau, diem);
  };

  return (
    <>
      <div className={styles.matchInfo}>
        <div className={styles.eventName}>
          {live
            ? `${live.tenNoiDung} - ${live.vong}`
            : "Chờ Bàn thư ký gán trận"}
        </div>
        <div className={styles.namesRow}>
          <span className={styles.nameDo}>{live?.tenDo ?? "—"}</span>
          <span className={styles.vs}>vs</span>
          <span className={styles.nameXanh}>{live?.tenXanh ?? "—"}</span>
        </div>
        <div className={styles.clockRow}>
          <span>
            {live ? `Hiệp ${live.hiepHienTai}/${live.tongSoHiep}` : "—"}
          </span>
          <span className={styles.clock}>
            {live ? formatMmSs(remaining) : "00:00"}
          </span>
        </div>
        {!live ? (
          <div className={styles.notPlayingNote}>
            Chưa có trận nào được gán vào sân này — chưa bấm đèn được lúc này.
          </div>
        ) : (
          <>
            {!dangThi && (
              <div className={styles.notPlayingNote}>
                Trận chưa bắt đầu hoặc đang tạm dừng — chưa bấm đèn được lúc
                này.
              </div>
            )}
            {hetGio && (
              <div className={styles.notPlayingNote}>
                Đã hết giờ hiệp đấu — chờ thư ký xác nhận hiệp mới, chưa bấm đèn
                được lúc này.
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.buttonGrid}>
        <button
          className={`${styles.btnDo} ${pressingKey === "do1" ? styles.pressing : ""}`}
          disabled={!coTheBamDen}
          onClick={() => handlePress("do", 1)}>
          ĐỎ +1
        </button>
        <button
          className={`${styles.btnXanh} ${pressingKey === "xanh1" ? styles.pressing : ""}`}
          disabled={!coTheBamDen}
          onClick={() => handlePress("xanh", 1)}>
          XANH +1
        </button>
        <button
          className={`${styles.btnDo} ${pressingKey === "do2" ? styles.pressing : ""}`}
          disabled={!coTheBamDen}
          onClick={() => handlePress("do", 2)}>
          ĐỎ +2
        </button>
        <button
          className={`${styles.btnXanh} ${pressingKey === "xanh2" ? styles.pressing : ""}`}
          disabled={!coTheBamDen}
          onClick={() => handlePress("xanh", 2)}>
          XANH +2
        </button>
      </div>

      <MatchLogPanel courtId={courtId} />

      {flash && (
        <div className={flash.mau === "do" ? styles.flashDo : styles.flashXanh}>
          {flash.mau === "do" ? "ĐỎ" : "XANH"} +{flash.diem} — đã ghi điểm (
          {flash.soLuong}/5 đồng thuận)
        </div>
      )}
      {rejectMsg && <div className={styles.rejectToast}>{rejectMsg}</div>}
    </>
  );
}
