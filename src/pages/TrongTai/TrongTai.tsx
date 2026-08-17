/** @format */

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useCourts } from "../../lib/utils/useCourts";
import type { CourtBasic } from "../../lib/utils/courts";
import {
  getMatchSnapshot,
  subscribeMatchState,
} from "../../lib/realtime/liveMatchStore";
import {
  getQuyenSnapshot,
  subscribeQuyenState,
} from "../../lib/realtime/liveQuyenStore";
import {
  getActiveMode,
  subscribeActiveMode,
  type ActiveMode,
} from "../../lib/realtime/activeModeStore";
import {
  subscribeConnectionState,
  ensureJoinedCourt,
} from "../../lib/realtime/matchHubConnection";
import { fetchTrongTai, type TrongTaiWire } from "../../lib/api/trongTaiApi";
import type { LiveMatchState } from "../../types/live";
import type { LiveQuyenState } from "../../types/liveQuyen";
import DoiKhangView from "./DoiKhangView";
import QuyenView from "./QuyenView";
import styles from "./TrongTai.module.scss";

const IDENTITY_KEY = "vovinam:trong-tai:identity";

export interface Identity {
  trongTaiId: string;
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

export default function TrongTai() {
  const { courts, loadingCourts } = useCourts();
  const [identity, setIdentity] = useState<Identity | null>(() =>
    loadIdentity(),
  );

  if (loadingCourts)
    return <p className={styles.hint}>Đang tải danh sách sân...</p>;

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
    onDone({ trongTaiId: t.id, tenTrongTai: t.hoTen, courtId: t.courtId });
  };

  return (
    <div className={styles.setupPage}>
      <h1 className={styles.setupTitle}>Trọng tài</h1>
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
              Giám định {t.thuTuGiamDinh} - {tenSan(t.courtId)}
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
  const { tenTrongTai, courtId } = identity;
  const courtName = courts.find((c) => c.id === courtId)?.ten ?? "";

  const [connected, setConnected] = useState(true);
  useEffect(() => subscribeConnectionState(setConnected), []);

  const [liveMatch, setLiveMatch] = useState<LiveMatchState | null>(() =>
    getMatchSnapshot(courtId),
  );
  useEffect(() => {
    setLiveMatch(getMatchSnapshot(courtId));
    const unsub = subscribeMatchState(courtId, setLiveMatch);
    const watchdog = setInterval(() => {
      if (!getMatchSnapshot(courtId))
        ensureJoinedCourt(courtId).catch(() => {});
    }, 3000);
    return () => {
      unsub();
      clearInterval(watchdog);
    };
  }, [courtId]);

  const [liveQuyen, setLiveQuyen] = useState<LiveQuyenState | null>(() =>
    getQuyenSnapshot(courtId),
  );
  useEffect(() => {
    setLiveQuyen(getQuyenSnapshot(courtId));
    return subscribeQuyenState(courtId, setLiveQuyen);
  }, [courtId]);

  // Nguồn thật để quyết định hiện gì — KHÔNG suy ra từ việc có dữ liệu hay
  // không (Bàn thư ký có thể đã chọn đúng chế độ nhưng chưa kịp gán trận
  // /đưa VĐV vào), mà theo đúng tab Bàn thư ký đang mở cho sân này.
  const [activeMode, setActiveMode] = useState<ActiveMode>(() =>
    getActiveMode(courtId),
  );
  useEffect(() => {
    setActiveMode(getActiveMode(courtId));
    return subscribeActiveMode(courtId, setActiveMode);
  }, [courtId]);

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
          Mất kết nối mạng — đang tự thử kết nối lại. Thao tác lúc này có thể
          không được ghi nhận.
        </div>
      )}

      {activeMode === "doi_khang" ? (
        <DoiKhangView identity={identity} live={liveMatch} />
      ) : activeMode === "quyen" ? (
        <QuyenView identity={identity} live={liveQuyen} />
      ) : (
        <div className={styles.noMatch}>
          <p>{courtName} chưa có gì đang diễn ra.</p>
          <button
            className={styles.retryBtn}
            onClick={() => ensureJoinedCourt(courtId).catch(() => {})}>
            Thử tải lại
          </button>
        </div>
      )}
    </div>
  );
}
