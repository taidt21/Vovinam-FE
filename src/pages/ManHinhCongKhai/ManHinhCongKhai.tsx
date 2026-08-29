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
import { ensureJoinedCourt } from "../../lib/realtime/matchHubConnection";
import {
  getQuyenSnapshot,
  subscribeQuyenState,
} from "../../lib/realtime/liveQuyenStore";
import type { LiveQuyenState } from "../../types/liveQuyen";
import type { LiveMatchState } from "../../types";
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
  return <CourtScreen court={court} />;
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

function CourtScreen({ court }: { court: CourtBasic }) {
  const [live, setLive] = useState<LiveMatchState | null>(() =>
    getMatchSnapshot(court.id),
  );
  const [, setTick] = useState(0);

  useEffect(() => {
    setLive(getMatchSnapshot(court.id));
    const unsub = subscribeMatchState(court.id, setLive);
    const watchdog = setInterval(() => {
      if (!getMatchSnapshot(court.id)) {
        ensureJoinedCourt(court.id).catch(() => {});
      }
    }, 3000);
    return () => {
      unsub();
      clearInterval(watchdog);
    };
  }, [court.id]);
  const [liveQuyen, setLiveQuyen] = useState<LiveQuyenState | null>(() =>
    getQuyenSnapshot(court.id),
  );
  useEffect(() => {
    setLiveQuyen(getQuyenSnapshot(court.id));
    return subscribeQuyenState(court.id, setLiveQuyen);
  }, [court.id]);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const toggleFullscreen = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    document.addEventListener("dblclick", toggleFullscreen);
    return () => document.removeEventListener("dblclick", toggleFullscreen);
  }, []);

  useEffect(() => {
    document.documentElement.requestFullscreen().catch(() => {});
  }, []);
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
  // Nội dung đồng đội đông người thì hiện từng avatar sẽ rối màn hình —
  // từ 4 VĐV trở lên chỉ hiện tên, không hiện avatar; từ 3 VĐV trở xuống
  // vẫn hiện avatar riêng từng người như bình thường.
  const laDoiHinh = !!live.thanhVien && live.thanhVien.length > 0;
  const hienAvatarTungNguoi = laDoiHinh && live.thanhVien!.length <= 3;

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
        {!laDoiHinh ? (
          <AthleteAvatar
            name={live.performerLabel}
            photoUrl={live.photoUrl}
            size={220}
          />
        ) : (
          hienAvatarTungNguoi && (
            <div className={styles.quyenTeamAvatars}>
              {live.thanhVien!.map((tv, i) => (
                <AthleteAvatar
                  key={i}
                  name={tv.hoTen}
                  photoUrl={tv.anhDaiDien}
                  size={150}
                />
              ))}
            </div>
          )
        )}
        <div className={styles.athName}>{live.performerLabel}</div>
        <div className={styles.athUnit}>{live.performerSub}</div>
        {!daKetThuc && live.trangThai !== "cho_bat_dau" && (
          <span className={styles.clock}>{timeLabel}</span>
        )}
      </div>
    </div>
  );
}
