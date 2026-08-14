/** @format */

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useCourts } from "../../lib/useCourts";
import type { CourtBasic } from "../../lib/courts";
import {
  getMatchSnapshot,
  subscribeMatchState,
  tinhThoiGianConLai,
  formatMmSs,
} from "../../lib/liveMatchStore";
import {
  pressLight,
  subscribeConsensus,
  subscribeRejected,
  type ConsensusEvent,
} from "../../lib/pressLightClient";
import {
  subscribeConnectionState,
  ensureJoinedCourt,
} from "../../lib/matchHubConnection";
import MatchLogPanel from "../../components/MatchLogPanel/MatchLogPanel";
import type { LiveMatchState } from "../../types/live";
import styles from "./TrongTaiDoiKhang.module.scss";
import { fetchTrongTai, type TrongTaiWire } from "../../lib/trongTaiApi";
const IDENTITY_KEY = "vovinam:trong-tai-doi-khang:identity";

interface Identity {
  giamDinhId: string;
  tenTrongTai: string;
  courtId: string;
}

function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}
function saveIdentity(id: Identity) {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
  } catch {
    // bỏ qua — vẫn hoạt động trong phiên hiện tại, chỉ mất khi F5
  }
}

export default function TrongTaiDoiKhang() {
  const { courts, loadingCourts } = useCourts();
  const [identity, setIdentity] = useState<Identity | null>(() =>
    loadIdentity(),
  );

  if (loadingCourts) {
    return <p className={styles.hint}>Đang tải danh sách sân...</p>;
  }

  if (!identity) {
    return (
      <SetupScreen
        courts={courts}
        onDone={(id) => {
          saveIdentity(id);
          setIdentity(id);
        }}
      />
    );
  }
  return (
    <MainScreen
      identity={identity}
      courts={courts}
      onChangeSetup={() => setIdentity(null)}
    />
  );
}

function SetupScreen({
  courts,
  onDone,
}: {
  courts: CourtBasic[];
  onDone: (id: Identity) => void;
}) {
  const [list, setList] = useState<TrongTaiWire[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchTrongTai()
      .then((data) => setList(data.filter((t) => t.thuTuGiamDinh !== null)))
      .catch(() => setError(true));
  }, []);

  const tenSan = (courtId: string | null) =>
    courts.find((c) => c.id === courtId)?.ten ?? courtId ?? "—";

  const pick = (t: TrongTaiWire) => {
    if (!t.courtId) return;
    onDone({ giamDinhId: t.id, tenTrongTai: t.hoTen, courtId: t.courtId });
  };

  return (
    <div className={styles.setupPage}>
      <h1 className={styles.setupTitle}>Trọng tài đối kháng</h1>
      <p className={styles.hint}>Chọn đúng tên của bạn trong danh sách</p>

      {error && (
        <p className={styles.hint}>
          Không tải được danh sách — kiểm tra mạng rồi thử lại.
        </p>
      )}
      {list === null && !error && <p className={styles.hint}>Đang tải...</p>}
      {list !== null && list.length === 0 && (
        <p className={styles.hint}>
          Chưa có ai được Bàn thư ký gán làm giám định. Liên hệ Bàn thư ký trước
          khi vào chấm.
        </p>
      )}

      <div className={styles.pickerList}>
        {list?.map((t) => (
          <button
            key={t.id}
            type="button"
            className={styles.pickerBtn}
            onClick={() => pick(t)}>
            <span className={styles.pickerName}>{t.hoTen}</span>
            <span className={styles.pickerSub}>
              Giám định {t.thuTuGiamDinh} · {tenSan(t.courtId)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MainScreen({
  identity,
  courts,
  onChangeSetup,
}: {
  identity: Identity;
  courts: CourtBasic[];
  onChangeSetup: () => void;
}) {
  const { giamDinhId, tenTrongTai, courtId } = identity;

  const [connected, setConnected] = useState(true);
  const [live, setLive] = useState<LiveMatchState | null>(() =>
    getMatchSnapshot(courtId),
  );
  const [, setTick] = useState(0);
  const [flash, setFlash] = useState<ConsensusEvent | null>(null);
  const [rejectMsg, setRejectMsg] = useState<string | null>(null);
  const [pressingKey, setPressingKey] = useState<string | null>(null);

  useEffect(() => {
    setLive(getMatchSnapshot(courtId));
    const unsub = subscribeMatchState(courtId, setLive);

    const watchdog = setInterval(() => {
      if (!getMatchSnapshot(courtId)) {
        ensureJoinedCourt(courtId).catch(() => {});
      }
    }, 3000);

    return () => {
      unsub();
      clearInterval(watchdog);
    };
  }, [courtId]);

  useEffect(() => subscribeConnectionState(setConnected), []);

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

  const courtName = courts.find((c) => c.id === courtId)?.ten ?? "";
  const dangThi = live?.trangThai === "dang_thi";
  const remaining = live ? tinhThoiGianConLai(live) : 0;
  const hetGio = dangThi && remaining <= 0;
  const coTheBamDen = dangThi && !hetGio;

  const handlePress = (mau: "do" | "xanh", diem: 1 | 2) => {
    const key = `${mau}${diem}`;
    setPressingKey(key);
    setTimeout(() => setPressingKey(null), 200);
    pressLight(courtId, giamDinhId, tenTrongTai, mau, diem);
  };

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.tenTrongTai}>{tenTrongTai}</div>
          <div className={styles.courtLabel}>{courtName}</div>
        </div>
        <div className={styles.topbarRight}>
          <span className={connected ? styles.connOk : styles.connBad}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? "Đã kết nối" : "Mất kết nối..."}
          </span>
          <button className={styles.changeBtn} onClick={onChangeSetup}>
            Đổi
          </button>
        </div>
      </div>

      {!connected && (
        <div className={styles.connBanner}>
          Mất kết nối mạng — đang tự thử kết nối lại. Bấm đèn lúc này có thể
          không được ghi nhận.
        </div>
      )}

      {!live ? (
        <div className={styles.noMatch}>
          <p>{courtName} chưa có trận nào đang mở.</p>
          <button
            className={styles.retryBtn}
            onClick={() => ensureJoinedCourt(courtId).catch(() => {})}>
            Thử tải lại
          </button>
        </div>
      ) : (
        <>
          <div className={styles.matchInfo}>
            <div className={styles.eventName}>
              {live.tenNoiDung} · {live.vong}
            </div>
            <div className={styles.namesRow}>
              <span className={styles.nameDo}>{live.tenDo}</span>
              <span className={styles.vs}>vs</span>
              <span className={styles.nameXanh}>{live.tenXanh}</span>
            </div>
            <div className={styles.clockRow}>
              <span>
                Hiệp {live.hiepHienTai}/{live.tongSoHiep}
              </span>
              <span className={styles.clock}>{formatMmSs(remaining)}</span>
            </div>
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
        </>
      )}

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
