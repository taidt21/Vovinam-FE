/** @format */

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Swords, Award } from "lucide-react";
import { useCourts } from "../../lib/utils/useCourts";
import type { CourtBasic } from "../../lib/utils/courts";
import { usePressedLights } from "../../lib/realtime/usePressedLights";
import {
  formatMmSs,
  getMatchSnapshot,
  subscribeMatchState,
  tinhThoiGianConLai,
} from "../../lib/realtime/liveMatchStore";
import {
  ensureJoinedCourt,
  subscribeConnectionState,
} from "../../lib/realtime/matchHubConnection";
import {
  getQuyenSnapshot,
  subscribeQuyenState,
} from "../../lib/realtime/liveQuyenStore";
import type { LiveQuyenState } from "../../types/liveQuyen";
import type { LiveMatchState } from "../../types";
import { fetchQuyenJudgeScores } from "../../lib/api/quyenJudgeScoreApi";
import { tinhDiemQuyenTongHop } from "../../lib/domain/quyenScoring";
import AthleteAvatar from "../../components/AthleteAvatar/AthleteAvatar";
import LightBoxes from "../../components/LightBoxes/LightBoxes";
import styles from "./ManHinhCongKhai.module.scss";

export default function ManHinhCongKhai() {
  const { courts, loadingCourts } = useCourts();
  const [searchParams] = useSearchParams();

  if (loadingCourts) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <span className={styles.brand}>VECTOR SPORT</span>
        </header>
      </div>
    );
  }

  const court = courts.find((c) => c.id === searchParams.get("san"));
  if (!court) return <CourtChooser courts={courts} />;

  return (
    <CourtScreen
      court={court}
      autoFullscreen={searchParams.get("autoFullscreen") === "1"}
    />
  );
}

function CourtChooser({ courts }: { courts: CourtBasic[] }) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <span className={styles.brand}>
          <img
            src="/src/assets/VECTOR-SPORT-_5_.svg"
            alt="VECTOR SPORT"
            width="200"
          />
        </span>
      </header>
      <div className={styles.chooser}>
        <p className={styles.chooserHint}>Màn hình này chiếu cho sân nào?</p>
        <div className={styles.chooserGrid}>
          {courts.map((c) => (
            <Link
              key={c.id}
              className={styles.chooserCard}
              to={`/man-hinh-cong-khai?san=${c.id}`}>
              {c.ten}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function CourtScreen({
  court,
  autoFullscreen,
}: {
  court: CourtBasic;
  autoFullscreen: boolean;
}) {
  const [live, setLive] = useState<LiveMatchState | null>(() =>
    getMatchSnapshot(court.id),
  );
  const [, setTick] = useState(0);

  useEffect(() => {
    setLive(getMatchSnapshot(court.id));
    const unsub = subscribeMatchState(court.id, setLive);

    // Trước đây watchdog chỉ kiểm tra "có snapshot nào chưa" — nếu đã
    // từng nhận dữ liệu rồi MỚI mất kết nối, dữ liệu cũ đó vẫn còn
    // (không rỗng), nên watchdog tưởng vẫn ổn, không bao giờ thử nối
    // lại — đúng nguyên nhân màn hình bị "đơ", điểm/giờ đứng im dù trận
    // vẫn đang diễn ra thật ở Bàn thư ký. Giờ theo dõi thẳng TRẠNG THÁI
    // KẾT NỐI thật — hễ vừa nối lại được là tự rejoin ngay đúng sân này,
    // không đợi watchdog phát hiện gián tiếp qua dữ liệu nữa.
    const unsubConn = subscribeConnectionState((connected) => {
      if (connected) ensureJoinedCourt(court.id).catch(() => {});
    });

    const watchdog = setInterval(() => {
      if (!getMatchSnapshot(court.id)) {
        ensureJoinedCourt(court.id).catch(() => {});
      }
    }, 3000);
    return () => {
      unsub();
      unsubConn();
      clearInterval(watchdog);
    };
  }, [court.id]);
  const [liveQuyen, setLiveQuyen] = useState<LiveQuyenState | null>(() =>
    getQuyenSnapshot(court.id),
  );
  useEffect(() => {
    setLiveQuyen(getQuyenSnapshot(court.id));
    const unsub = subscribeQuyenState(court.id, setLiveQuyen);

    // Y hệt lý do ở effect đối kháng bên trên — bên quyền trước đây còn
    // chưa có watchdog nào cả, dễ bị "đơ" hơn nữa nếu mất kết nối.
    const unsubConn = subscribeConnectionState((connected) => {
      if (connected) ensureJoinedCourt(court.id).catch(() => {});
    });
    return () => {
      unsub();
      unsubConn();
    };
  }, [court.id]);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const enterFullscreen = async () => {
      if (document.fullscreenElement) return;

      try {
        await document.documentElement.requestFullscreen({
          navigationUI: "hide",
        });
      } catch {
        // Nếu Chrome chưa được cấp Automatic Fullscreen, API sẽ bị chặn.
        // Khi đó vẫn giữ nguyên cơ chế double-click đã có để vào fullscreen.
      }
    };

    const toggleFullscreen = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        enterFullscreen();
      }
    };

    document.addEventListener("dblclick", toggleFullscreen);

    // Chỉ tự request fullscreen khi cửa sổ được mở từ nút Bàn thư ký.
    // Với Chrome đã allow Automatic Fullscreen cho origin này, request sẽ
    // thành công ngay sau khi trang load mà không cần click lần 2.
    if (autoFullscreen) {
      enterFullscreen();
    }

    return () => document.removeEventListener("dblclick", toggleFullscreen);
  }, [autoFullscreen]);
  const pressed = usePressedLights(court.id);
  const header = (
    <header className={styles.header}>
      <span className={styles.brand}>VECTOR SPORT</span>
      <span className={styles.courtNameHeader}>{court.ten}</span>
      <span className={styles.wallClock}>
        {new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </header>
  );

  if (!live && liveQuyen) {
    return <QuyenScreen header={header} live={liveQuyen} />;
  }

  if (!live) {
    return (
      <div className={styles.screen}>
        {header}
        <div className={styles.idleState}>
          <Swords size={64} />
          <span>Đang chờ trận tiếp theo</span>
        </div>
      </div>
    );
  }

  if (live.trangThai === "cho_bat_dau") {
    return (
      <div className={styles.screen}>
        {header}
        <div className={styles.matchMeta}>
          <span className={styles.eventInfo}>
            {live.tenNoiDung} - {live.vong}
          </span>
          <span className={styles.upcomingBadge}>SẮP THI ĐẤU</span>
        </div>
        <div className={styles.matchup}>
          <div className={styles.sideDo}>
            <LightBoxes presses={[]} className={styles.lightBoxesArena} />
            <div className={styles.sideMain}>
              <AthleteAvatar
                name={live.tenDo}
                photoUrl={live.anhDo}
                size={180}
              />
              <div className={styles.athName}>{live.tenDo}</div>
              <div className={styles.athUnit}>{live.donViDo}</div>
              <div className={styles.scoreNum}>{live.diemChinhThucDo}</div>
            </div>
          </div>
          <div className={styles.centerCol}>
            <span className={styles.vsBadge}>VS</span>
          </div>
          <div className={styles.sideXanh}>
            <div className={styles.sideMain}>
              <AthleteAvatar
                name={live.tenXanh}
                photoUrl={live.anhXanh}
                size={180}
              />
              <div className={styles.athName}>{live.tenXanh}</div>
              <div className={styles.athUnit}>{live.donViXanh}</div>
              <div className={styles.scoreNum}>{live.diemChinhThucXanh}</div>
            </div>
            <LightBoxes presses={[]} className={styles.lightBoxesArena} />
          </div>
        </div>
      </div>
    );
  }
  const remaining = tinhThoiGianConLai(live);
  const dangChay = live.trangThai === "dang_thi";
  const dangNghi = live.trangThai === "nghi_giua_hiep";
  const dangTamDung = live.trangThai === "tam_dung";
  const daKetThuc = live.trangThai === "da_ket_thuc";
  const dangTrucTiep = dangChay || dangNghi;

  const sideClass = (nguoiThang: "do" | "xanh") =>
    !daKetThuc
      ? ""
      : live.nguoiThang === nguoiThang
        ? styles.sideWinner
        : styles.sideLoser;
  return (
    <div className={styles.screen}>
      {header}

      <div className={styles.matchMeta}>
        <span className={styles.eventInfo}>
          {live.tenNoiDung} - {live.vong}
        </span>
        {dangTrucTiep && (
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} /> TRỰC TIẾP
          </span>
        )}
        {dangTamDung && <span className={styles.pausedBadge}>TẠM DỪNG</span>}
      </div>

      <div className={styles.matchup}>
        <div className={`${styles.sideDo} ${sideClass("do")}`}>
          <LightBoxes
            presses={pressed.do.map((p) => p.diem)}
            className={styles.lightBoxesArena}
          />
          <div className={styles.sideMain}>
            <AthleteAvatar name={live.tenDo} photoUrl={live.anhDo} size={180} />
            <div className={styles.athName}>{live.tenDo}</div>
            <div className={styles.athUnit}>{live.donViDo}</div>
            <div className={styles.scoreNum}>{live.diemChinhThucDo}</div>
            {daKetThuc && live.nguoiThang === "do" && (
              <div className={styles.winnerTag}>
                <Award size={22} /> THẮNG
              </div>
            )}
          </div>
        </div>

        <div className={styles.centerCol}>
          <span className={styles.vsBadge}>VS</span>
          {daKetThuc ? (
            <span className={styles.endedLabel}>KẾT THÚC</span>
          ) : (
            <>
              <span className={styles.roundLabel}>
                {dangNghi
                  ? `Nghỉ giữa hiệp ${live.hiepHienTai}`
                  : `Hiệp ${live.hiepHienTai}/${live.tongSoHiep}`}
              </span>
              <span className={styles.clock}>{formatMmSs(remaining)}</span>
            </>
          )}
        </div>

        <div className={`${styles.sideXanh} ${sideClass("xanh")}`}>
          <div className={styles.sideMain}>
            <AthleteAvatar
              name={live.tenXanh}
              photoUrl={live.anhXanh}
              size={180}
            />
            <div className={styles.athName}>{live.tenXanh}</div>
            <div className={styles.athUnit}>{live.donViXanh}</div>
            <div className={styles.scoreNum}>{live.diemChinhThucXanh}</div>
            {daKetThuc && live.nguoiThang === "xanh" && (
              <div className={styles.winnerTag}>
                <Award size={22} /> THẮNG
              </div>
            )}
          </div>
          <LightBoxes
            presses={pressed.xanh.map((p) => p.diem)}
            className={styles.lightBoxesArena}
          />
        </div>
      </div>
    </div>
  );
}
function QuyenScreen({
  header,
  live,
}: {
  header: React.ReactNode;
  live: LiveQuyenState;
}) {
  const daTroi =
    live.trangThai === "dang_thi"
      ? live.thoiGianDaTroiGiay + (Date.now() - live.capNhatDongHoLuc) / 1000
      : live.thoiGianDaTroiGiay;
  const hienThi = live.coGioiHan
    ? Math.max(0, (live.thoiGianGioiHanGiay ?? 0) - daTroi)
    : daTroi;
  const mm = Math.floor(hienThi / 60);
  const ss = Math.floor(hienThi % 60);
  const timeLabel = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const daKetThuc = live.trangThai === "da_ket_thuc";
  const dangThi = live.trangThai === "dang_thi";

  // Đúng lúc kết thúc mới có ý nghĩa để lấy điểm — trong lúc đang thi
  // chưa có điểm chính thức nào cả (quyền chấm SAU khi thi xong, không
  // chấm dần từng giây như đối kháng). Vẫn dò lại vài giây 1 lần TRONG
  // LÚC đã kết thúc, phòng lúc giám định cuối cùng gửi điểm chậm hơn 1
  // nhịp so với lúc trạng thái chuyển "đã kết thúc".
  const [diemTongHop, setDiemTongHop] = useState<number | null>(null);
  useEffect(() => {
    if (!daKetThuc) {
      setDiemTongHop(null);
      return;
    }
    let huy = false;
    const taiDiem = () => {
      fetchQuyenJudgeScores()
        .then((all) => {
          if (huy) return;
          const cuaLuotNay = all.filter(
            (s) =>
              s.eventId === live.eventId &&
              s.athleteId === live.athleteId &&
              s.teamId === live.teamId,
          );
          setDiemTongHop(tinhDiemQuyenTongHop(cuaLuotNay.map((s) => s.diem)));
        })
        .catch(() => {});
    };
    taiDiem();
    const id = setInterval(taiDiem, 3000);
    return () => {
      huy = true;
      clearInterval(id);
    };
  }, [daKetThuc, live.eventId, live.athleteId, live.teamId]);

  return (
    <div className={styles.screen}>
      {header}
      <div className={styles.matchMeta}>
        <span className={styles.eventInfo}>{live.eventTen}</span>
        {dangThi && (
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} /> TRỰC TIẾP
          </span>
        )}
        {live.trangThai === "tam_dung" && (
          <span className={styles.pausedBadge}>TẠM DỪNG</span>
        )}
        {live.trangThai === "cho_bat_dau" && (
          <span className={styles.upcomingBadge}>SẮP THI ĐẤU</span>
        )}
        {daKetThuc && <span className={styles.endedLabel}>KẾT THÚC</span>}
      </div>

      <div className={styles.quyenPerformerBig}>
        <AthleteAvatar
          name={live.performerLabel}
          photoUrl={live.photoUrl}
          size={220}
        />
        <div className={styles.athName}>{live.performerLabel}</div>
        <div className={styles.athUnit}>{live.performerSub}</div>
        {!daKetThuc && live.trangThai !== "cho_bat_dau" && (
          <span className={styles.clock}>{timeLabel}</span>
        )}
        {daKetThuc && diemTongHop !== null && (
          <div className={styles.scoreNum}>{diemTongHop.toFixed(2)}</div>
        )}
      </div>
    </div>
  );
}
