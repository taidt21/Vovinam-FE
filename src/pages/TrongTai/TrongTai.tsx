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
  ensureStarted,
  getConnection,
} from "../../lib/realtime/matchHubConnection";
import {
  fetchTrongTai,
  chonTrongTai,
  boChonTrongTai,
  type TrongTaiWire,
} from "../../lib/api/trongTaiApi";
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
function clearIdentity() {
  try {
    localStorage.removeItem(IDENTITY_KEY);
  } catch {
    // bỏ qua
  }
}

export default function TrongTai() {
  const { courts, loadingCourts } = useCourts();
  const [identity, setIdentity] = useState<Identity | null>(() =>
    loadIdentity(),
  );
  const [list, setList] = useState<TrongTaiWire[] | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [bienMatKhoiDanhSach, setBienMatKhoiDanhSach] = useState(false);

  // Tải danh sách trọng tài đã được Bàn thư ký gán. Tải ngay lúc mở trang,
  // rồi tải lại NGAY khi có ai (Bàn thư ký) thêm/sửa/xoá — nghe qua đúng
  // SignalR hub đang dùng chung cho cả app, khớp với cách "MatchesChanged"
  // đã làm cho danh sách trận, thay vì bắt trọng tài tự bấm tải lại trang.
  // Vẫn giữ thêm vòng lặp 20 giây làm lưới an toàn, phòng lúc lỡ mất đúng
  // tín hiệu đó (rớt mạng ngay lúc BTC vừa thêm xong chẳng hạn).
  useEffect(() => {
    const load = () =>
      fetchTrongTai()
        .then((data) => {
          setList(data);
          setFetchError(false);
        })
        .catch(() => setFetchError(true));
    load();
    const conn = getConnection();
    conn.on("TrongTaiChanged", load);
    ensureStarted().catch(() => {});
    const id = setInterval(load, 20_000);
    return () => {
      conn.off("TrongTaiChanged", load);
      clearInterval(id);
    };
  }, []);

  // Thiết lập (tên + sân) đã lưu sẵn trên MÁY NÀY từ lần chọn trước — lưu
  // trong localStorage, hoàn toàn không liên quan gì tới CSDL ở server.
  // Trước đây cứ có sẵn là dùng luôn, không kiểm tra lại có còn đúng
  // không — nên đổi CSDL (hoặc BTC gỡ/đổi gán) ở server thì máy này vẫn
  // "nhớ" trọng tài cũ, dù danh sách thật ở Bàn thư ký đã trống/khác rồi.
  // Giờ hễ tải xong danh sách mới là đối chiếu lại: không còn thấy đúng
  // người + đúng sân đó nữa thì coi thiết lập cũ hết hiệu lực, quay về
  // màn chọn lại thay vì tin mãi vào dữ liệu cũ trên máy.
  //
  // CỐ TÌNH chỉ so courtId, KHÔNG so thuTuGiamDinh — list ở đây giờ là
  // TOÀN BỘ danh sách (kể cả dự bị, không lọc như trước), nên chuyển
  // dự bị <-> giám định (cùng sân) không còn bị coi là "hết hạn" nữa,
  // máy vẫn nhận đúng người, chỉ đổi cách MainScreen hiển thị bên dưới.
  //
  // CÓ so thêm daChonThietBi === true — đây là tín hiệu để phát hiện lúc
  // BTC bấm "Reset lựa chọn" bên Bàn thư ký (xem TrongTaiTab.tsx): máy
  // đang hoạt động không hề biết BTC vừa nhả khoá hộ mình, nếu không so
  // thêm cờ này thì máy CŨ cứ tưởng vẫn hợp lệ, tiếp tục chạy bình
  // thường — trong khi 1 máy MỚI cũng đang được phép chọn đúng tên đó,
  // quay lại đúng vấn đề "2 máy cùng 1 người" ban đầu.
  useEffect(() => {
    if (!identity || list === null) return;
    const conCoTrongDanhSach = list.some(
      (t) =>
        t.id === identity.trongTaiId &&
        t.courtId === identity.courtId &&
        t.daChonThietBi,
    );
    if (!conCoTrongDanhSach) {
      clearIdentity();
      setIdentity(null);
      setBienMatKhoiDanhSach(true);
    }
  }, [identity, list]);

  if (loadingCourts)
    return <p className={styles.hint}>Đang tải danh sách sân...</p>;

  if (!identity) {
    return (
      <SetupScreen
        courts={courts}
        list={list}
        error={fetchError}
        canhBaoHetHan={bienMatKhoiDanhSach}
        onDone={(id) => {
          saveIdentity(id);
          setIdentity(id);
          setBienMatKhoiDanhSach(false);
          // Cập nhật NGAY tại đây, không đợi vòng SignalR "TrongTaiChanged"
          // tự tải lại — nếu không, đúng khoảnh khắc vừa chọn xong, list
          // cục bộ vẫn còn đang ở bản CŨ (daChonThietBi=false, do đó mới
          // chọn được), stale-check phía trên sẽ hiểu nhầm là bị reset
          // ngay lập tức, đá thẳng về màn chọn lại dù vừa chọn thành công.
          setList((prev) =>
            prev
              ? prev.map((t) =>
                  t.id === id.trongTaiId ? { ...t, daChonThietBi: true } : t,
                )
              : prev,
          );
        }}
      />
    );
  }

  // Đang là dự bị hay giám định active tra CHÍNH XÁC ngay lúc render,
  // không lưu tĩnh vào identity — BTC đổi qua lại giữa dự bị/active thì
  // MainScreen tự cập nhật ngay khi list làm mới (qua SignalR), không
  // cần F5 hay chọn lại gì cả.
  const banThan = list?.find((t) => t.id === identity.trongTaiId);
  const dangLaDuBi = banThan ? banThan.thuTuGiamDinh === null : false;

  return (
    <MainScreen
      identity={identity}
      courts={courts}
      dangLaDuBi={dangLaDuBi}
      onChangeSetup={() => {
        // Nhả tên ra cho người khác chọn lại được — cố gắng hết sức,
        // không chặn việc đổi thiết lập trên MÁY NÀY dù lỡ gọi lỗi
        // (mất mạng...), BTC vẫn có thể "reset-all" nếu kẹt lại.
        boChonTrongTai(identity.trongTaiId).catch(() => {});
        clearIdentity();
        setIdentity(null);
      }}
    />
  );
}

function SetupScreen({
  courts,
  list,
  error,
  canhBaoHetHan,
  onDone,
}: {
  courts: CourtBasic[];
  list: TrongTaiWire[] | null;
  error: boolean;
  canhBaoHetHan: boolean;
  onDone: (id: Identity) => void;
}) {
  const [dangChon, setDangChon] = useState<string | null>(null);
  const [loiChon, setLoiChon] = useState<string | null>(null);

  const tenSan = (courtId: string | null) =>
    courts.find((c) => c.id === courtId)?.ten ?? courtId ?? "—";

  // Lọc CHỈ giám định đang active để chọn — dự bị chưa có gì để chấm,
  // không cho chọn ở màn này (list giờ là TOÀN BỘ danh sách, lọc ở đây
  // thay vì lúc tải như trước, để chỗ khác vẫn cần thấy cả dự bị).
  const dangActive = (list ?? []).filter((t) => t.thuTuGiamDinh !== null);

  // Sắp theo đúng thứ tự Giám định 1, 2, 3... cho dễ tìm — trước đây
  // hiện đúng thứ tự thêm vào CSDL, lộn xộn không theo số nào cả.
  const daSap = [...dangActive].sort(
    (a, b) => (a.thuTuGiamDinh ?? 0) - (b.thuTuGiamDinh ?? 0),
  );

  const pick = async (t: TrongTaiWire) => {
    if (!t.courtId || t.daChonThietBi || dangChon) return;
    setLoiChon(null);
    setDangChon(t.id);
    try {
      // Xin "khoá" đúng tên này trước — CHỈ khi server xác nhận chưa ai
      // chọn mới coi là thành công, đúng lúc chọn có thể trùng với 1
      // thiết bị khác đang bấm cùng lúc.
      await chonTrongTai(t.id);
      onDone({ trongTaiId: t.id, tenTrongTai: t.hoTen, courtId: t.courtId });
    } catch (err) {
      setLoiChon(
        err instanceof Error
          ? err.message
          : "Chọn tên thất bại — thử lại.",
      );
    } finally {
      setDangChon(null);
    }
  };

  return (
    <div className={styles.setupPage}>
      <h1 className={styles.setupTitle}>Trọng tài</h1>
      <p className={styles.hint}>Chọn đúng tên của bạn trong danh sách</p>

      {canhBaoHetHan && !error && (
        <p className={styles.hint}>
          Thiết lập cũ trên máy này không còn hợp lệ (đã bị gỡ hoặc đổi gán
          bên Bàn thư ký) — chọn lại tên của bạn.
        </p>
      )}
      {error && (
        <p className={styles.hint}>
          Không tải được danh sách — kiểm tra mạng rồi thử lại.
        </p>
      )}
      {loiChon && <p className={styles.hint}>{loiChon}</p>}
      {list === null && !error && <p className={styles.hint}>Đang tải...</p>}
      {list !== null && dangActive.length === 0 && (
        <p className={styles.hint}>
          Chưa có ai được Bàn thư ký gán làm giám định. Liên hệ Bàn thư ký trước
          khi vào chấm.
        </p>
      )}

      <div className={styles.pickerList}>
        {daSap.map((t) => (
          <button
            key={t.id}
            type="button"
            className={styles.pickerBtn}
            disabled={t.daChonThietBi || dangChon !== null}
            onClick={() => pick(t)}>
            <span className={styles.pickerName}>{t.hoTen}</span>
            <span className={styles.pickerSub}>
              Giám định {t.thuTuGiamDinh} - {tenSan(t.courtId)}
              {t.daChonThietBi && " · đã có người chọn"}
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
  dangLaDuBi,
  onChangeSetup,
}: {
  identity: Identity;
  courts: CourtBasic[];
  dangLaDuBi: boolean;
  onChangeSetup: () => void;
}) {
  const { tenTrongTai, courtId } = identity;
  const courtName = courts.find((c) => c.id === courtId)?.ten ?? "";

  const [connected, setConnected] = useState(true);
  useEffect(() => {
    // Y hệt lỗi vừa sửa ở màn hình công khai: watchdog dưới đây (dựa
    // theo "có dữ liệu hay chưa") không phát hiện được lúc ĐÃ từng có
    // dữ liệu rồi MỚI mất kết nối — dữ liệu cũ vẫn còn nên watchdog
    // tưởng ổn, không bao giờ thử nối lại, chấm điểm/xem trận cứ đứng
    // im dù trận vẫn đang diễn ra thật. Giờ hễ kết nối THẬT vừa nối lại
    // là rejoin ngay — CourtSnapshot trả về gồm cả matchState/quyenState
    // /activeMode cùng lúc nên chỉ cần rejoin đúng 1 lần là làm mới lại
    // cả 3 thứ, không cần tách riêng từng effect.
    return subscribeConnectionState((c) => {
      setConnected(c);
      if (c) ensureJoinedCourt(courtId).catch(() => {});
    });
  }, [courtId]);

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

      {dangLaDuBi ? (
        // Đang dự bị — KHÔNG hiện màn chấm điểm (dù vẫn đang có trận diễn
        // ra ở sân này) để tránh lỡ tay bấm nhầm; backend cũng đã chặn
        // riêng ở PressLight nếu vẫn lọt qua được. Tự chuyển sang màn
        // chấm ngay khi Bàn thư ký xếp lại vị trí active, không cần làm
        // gì thêm ở đây (dangLaDuBi tính lại mỗi khi danh sách làm mới).
        <div className={styles.noMatch}>
          <p>Bạn đang là dự bị, chưa được xếp vị trí giám định.</p>
          <p>Màn hình sẽ tự chuyển sang chấm điểm khi được xếp vào 1 vị trí.</p>
        </div>
      ) : activeMode === "doi_khang" ? (
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
