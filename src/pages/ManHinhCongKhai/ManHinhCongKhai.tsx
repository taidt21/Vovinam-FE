/** @format */

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Swords, Award } from "lucide-react";
import { COURTS, type CourtBasic } from "../../lib/courts";
import {
  formatMmSs,
  getMatchSnapshot,
  subscribeMatchState,
  tinhThoiGianConLai,
} from "../../lib/liveMatchStore";
import type { LiveMatchState } from "../../types";
import AthleteAvatar from "../../components/AthleteAvatar/AthleteAvatar";
import styles from "./ManHinhCongKhai.module.scss";

// Màn hình công khai — chỉ ĐỌC, không có nút bấm nào tác động tới trận
// đấu. Ăn chung đúng 1 nguồn dữ liệu "sống" (liveMatchStore) mà Bàn thư ký
// ghi, nên tự động khớp 100% với những gì thư ký đang làm.
//
// Mỗi sân có màn hình/máy chiếu RIÊNG (không phải 1 màn hình chung cho cả
// giải), nên trang này chỉ hiện ĐÚNG 1 trận theo sân được chọn qua query
// string ?san=<id> — ví dụ /man-hinh-cong-khai?san=c1 cho màn hình ở Sân 1,
// bên thư ký Sân 2 thì mở /man-hinh-cong-khai?san=c2 trên máy/màn hình của
// sân đó. Không có ?san hoặc sai id thì hiện màn hình chọn sân.
export default function ManHinhCongKhai() {
  const [searchParams] = useSearchParams();
  const court = COURTS.find((c) => c.id === searchParams.get("san"));

  if (!court) return <CourtChooser />;
  return <CourtScreen court={court} />;
}

function CourtChooser() {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <span className={styles.brand}>VECTOR SPORT</span>
      </header>
      <div className={styles.chooser}>
        <p className={styles.chooserHint}>Màn hình này chiếu cho sân nào?</p>
        <div className={styles.chooserGrid}>
          {COURTS.map((c) => (
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
  // Chỉ để ép re-render mỗi giây cho đồng hồ đếm ngược + giờ tường tự chạy —
  // bản thân state không được đọc ở đâu khác.
  const [, setTick] = useState(0);

  useEffect(() => {
    setLive(getMatchSnapshot(court.id));
    return subscribeMatchState(court.id, setLive);
  }, [court.id]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

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

  // Trận vừa được mở vào sân (VD do effect tự-setup ở Bàn thư ký đẩy vào)
  // nhưng thư ký CHƯA bấm "Bắt đầu hiệp 1" lần nào thì vẫn coi như CHƯA CÓ
  // TRẬN trên màn hình công khai — không lộ trận sắp đấu ra cho khán giả,
  // giữ nguyên màn hình chờ tới khi trận thật sự bắt đầu.
  if (!live || live.trangThai === "cho_bat_dau") {
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
          {live.tenNoiDung} · {live.vong}
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
      </div>
    </div>
  );
}
