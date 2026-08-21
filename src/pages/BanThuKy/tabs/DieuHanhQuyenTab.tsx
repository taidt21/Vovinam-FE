/** @format */

import { useEffect, useState } from "react";
import { Play, Pause, Flag, Award, Check } from "lucide-react";
import type {
  LiveQuyenState,
  LyDoKetThucQuyen,
} from "../../../types/liveQuyen";
import {
  clearQuyenState,
  getQuyenSnapshot,
  publishQuyenState,
  subscribeQuyenState,
  tinhThoiGianDaTroi,
} from "../../../lib/realtime/liveQuyenStore";
import { serverNow } from "../../../lib/realtime/serverClock";
import {
  markQuyenLuotHoanThanh,
  unmarkQuyenLuotHoanThanh,
} from "../../../lib/api/quyenLuotApi";
import { tinhDiemQuyenTongHop } from "../../../lib/domain/quyenScoring";
import {
  deleteQuyenJudgeScores,
  type QuyenJudgeScoreWire,
} from "../../../lib/api/quyenJudgeScoreApi";
import type { TrongTaiWire } from "../../../lib/api/trongTaiApi";
import AthleteAvatar from "../../../components/AthleteAvatar/AthleteAvatar";
import {
  LY_DO_KET_THUC_QUYEN_OPTIONS,
  LY_DO_KET_THUC_QUYEN_LABEL,
} from "../helpers";
import styles from "../BanThuKy.module.scss";

export default function DieuHanhQuyenTab({
  courtId,
  quyenJudgeScores,
  trongTaiList,
  onLuotXong,
}: {
  courtId: string;
  quyenJudgeScores: QuyenJudgeScoreWire[];
  trongTaiList: TrongTaiWire[];
  onLuotXong: (marked: {
    eventId: string;
    athleteId: string | null;
    teamId: string | null;
    lyDo: string;
  }) => void;
}) {
  const [live, setLive] = useState<LiveQuyenState | null>(() =>
    getQuyenSnapshot(courtId),
  );
  const [, setTick] = useState(0);
  const [showEndFlow, setShowEndFlow] = useState(false);
  const [lyDo, setLyDo] = useState<LyDoKetThucQuyen>("hoan_thanh");

  useEffect(() => {
    setLive(getQuyenSnapshot(courtId));
    return subscribeQuyenState(courtId, setLive);
  }, [courtId]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!live) {
    return (
      <div className={styles.noMatch}>
        Chưa có ai đang thi ở khu vực này — sang tab "Lịch thi đấu quyền" và bấm
        "Bắt đầu" ở 1 lượt để đưa vào đây.
      </div>
    );
  }

  const patch = (p: Partial<LiveQuyenState>) => {
    const next = { ...live, ...p, capNhatLuc: Date.now() };
    publishQuyenState(next);
    setLive(next);
  };

  const daTroi = tinhThoiGianDaTroi(live);
  const hienThi = live.coGioiHan
    ? Math.max(0, (live.thoiGianGioiHanGiay ?? 0) - daTroi)
    : daTroi;
  const hetGio =
    live.coGioiHan && hienThi <= 0 && live.trangThai === "dang_thi";
  const dangThi = live.trangThai === "dang_thi";
  const dangTamDung = live.trangThai === "tam_dung";
  const daKetThuc = live.trangThai === "da_ket_thuc";

  const batDau = () =>
    patch({ trangThai: "dang_thi", capNhatDongHoLuc: serverNow() });
  const tamDung = () =>
    patch({ trangThai: "tam_dung", thoiGianDaTroiGiay: daTroi });
  const tiepTuc = () =>
    patch({ trangThai: "dang_thi", capNhatDongHoLuc: serverNow() });

  const ketThuc = (reason: LyDoKetThucQuyen) => {
    patch({
      trangThai: "da_ket_thuc",
      lyDoKetThuc: reason,
      thoiGianDaTroiGiay: daTroi,
    });
    setShowEndFlow(false);
  };

  // Đánh dấu ĐÃ XONG lưu lâu dài trước khi xoá state sống — để biết đúng
  // lượt nào đã kết thúc dù không đủ 5 điểm (bị loại giữa chừng), tránh bị
  // tự động đưa lại vào sân.
  // Báo cho Bàn thư ký biết NGAY, cùng lúc với việc xoá state sống — không
  // đợi mạng xác nhận đã lưu. Effect tự động qua lượt tiếp theo (ở
  // BanThuKy) chạy gần như ngay khi state sống bị xoá — nếu phải đợi
  // đúng lần gọi mạng này xong mới cập nhật, effect đó sẽ chạy TRƯỚC,
  // nhìn thấy lượt vừa xong "chưa được đánh dấu xong" (nhất là khi chưa
  // hề có điểm nào, kiểu Quên bài) rồi tự đưa lại chính lượt đó vào sân.
  const xongHan = () => {
    const marked = {
      eventId: live.eventId,
      athleteId: live.athleteId,
      teamId: live.teamId,
      lyDo: live.lyDoKetThuc ?? "hoan_thanh",
    };
    onLuotXong(marked);
    markQuyenLuotHoanThanh(marked).catch(() => {});
    clearQuyenState(courtId);
  };

  const choThiLai = async () => {
    if (
      !window.confirm(
        "Cho thi lại từ đầu? Đồng hồ sẽ về 0 — điểm giám định đã gửi cho " +
          "lượt này sẽ bị XOÁ SẠCH, chấm lại từ đầu.",
      )
    )
      return;
    try {
      await Promise.all([
        deleteQuyenJudgeScores(live.eventId, live.athleteId, live.teamId),
        unmarkQuyenLuotHoanThanh(live.eventId, live.athleteId, live.teamId),
      ]);
    } catch {
      window.alert(
        "Xoá điểm cũ thất bại — kiểm tra mạng rồi thử lại, chưa cho thi lại.",
      );
      return;
    }
    patch({
      trangThai: "cho_bat_dau",
      thoiGianDaTroiGiay: 0,
      lyDoKetThuc: null,
    });
  };

  const scores = quyenJudgeScores.filter(
    (s) =>
      s.eventId === live.eventId &&
      s.athleteId === live.athleteId &&
      s.teamId === live.teamId,
  );
  const tongHop = tinhDiemQuyenTongHop(scores.map((s) => s.diem));
  // 5 giám định ĐANG HOẠT ĐỘNG tại đúng sân này, xếp theo đúng số vị trí
  // Bàn thư ký đã gán — không phải theo thứ tự gửi điểm.
  const giamDinhSan = trongTaiList
    .filter((t) => t.courtId === live.courtId && t.thuTuGiamDinh !== null)
    .sort((a, b) => (a.thuTuGiamDinh ?? 0) - (b.thuTuGiamDinh ?? 0));

  const mm = Math.floor(hienThi / 60);
  const ss = Math.floor(hienThi % 60);
  const timeLabel = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  const statusLabel = daKetThuc
    ? "Đã kết thúc"
    : dangThi
      ? "Đang thi"
      : dangTamDung
        ? "Tạm dừng"
        : "Chờ bắt đầu";

  const statusClass = daKetThuc
    ? styles.operationStatusDone
    : dangThi
      ? styles.operationStatusLive
      : dangTamDung
        ? styles.operationStatusPaused
        : styles.operationStatusWaiting;

  return (
    <div className={styles.dieuHanhQuyen}>
      <div className={styles.operationHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Điều hành quyền</span>
          <h2 className={styles.operationTitle}>{live.eventTen}</h2>
          <p className={styles.operationSubline}>
            Theo dõi VĐV, thời gian và điểm của 5 giám định trong cùng một màn
            hình.
          </p>
        </div>
        <span className={`${styles.operationStatus} ${statusClass}`}>
          <span /> {statusLabel}
        </span>
      </div>

      <div className={styles.quyenLayout}>
        <div className={styles.quyenJudgePanel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.panelEyebrow}>Tổ giám định</span>
              <strong>Điểm chấm</strong>
            </div>
            <span className={styles.judgeCountBadge}>
              {Math.min(scores.length, 5)}/5 đã chấm
            </span>
          </div>

          <div className={styles.quyenJudgeList}>
            {[1, 2, 3, 4, 5].map((n) => {
              const gd = giamDinhSan.find((t) => t.thuTuGiamDinh === n);
              const diem = gd
                ? scores.find((s) => s.giamKhaoId === gd.id)?.diem
                : undefined;
              return (
                <div
                  key={n}
                  className={`${styles.quyenJudgeCell} ${
                    diem !== undefined ? styles.quyenJudgeCellScored : ""
                  }`}>
                  <div className={styles.judgeIndex}>{n}</div>
                  <div className={styles.quyenJudgeInfo}>
                    <span className={styles.quyenJudgeLabel}>
                      Giám định {n}
                    </span>
                    <span className={styles.quyenJudgeName}>
                      {gd ? gd.hoTen : "Chưa gán giám định"}
                    </span>
                  </div>
                  <span
                    className={
                      diem !== undefined
                        ? styles.quyenJudgeScore
                        : styles.quyenJudgeScorePending
                    }>
                    {diem !== undefined ? diem : gd ? "Chờ điểm" : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={styles.judgeProgressSummary}>
            <div className={styles.judgeProgressTrack}>
              <span style={{ width: `${Math.min(scores.length, 5) * 20}%` }} />
            </div>
            <span>{Math.min(scores.length, 5)} / 5 giám định đã gửi điểm</span>
          </div>

          {tongHop !== null && (
            <div className={styles.quyenResultBox}>
              <div>
                <span>Kết quả tổng hợp</span>
                <small>Điểm hợp lệ sau khi tổng hợp</small>
              </div>
              <strong>{tongHop.toFixed(2)}</strong>
            </div>
          )}
        </div>

        <div className={styles.quyenMainCol}>
          <div className={styles.quyenPerformer}>
            <span className={styles.panelEyebrow}>Đang điều hành</span>
            <AthleteAvatar
              name={live.performerLabel}
              photoUrl={live.photoUrl}
              size={104}
            />
            <div className={styles.quyenPerformerName}>
              {live.performerLabel}
            </div>
            <div className={styles.quyenPerformerSub}>{live.performerSub}</div>
            {/* {live.thanhVien && live.thanhVien.length > 0 && (
              <div className={styles.quyenThanhVien}>
                {live.thanhVien.join(" · ")}
              </div>
            )} */}
          </div>

          {daKetThuc ? (
            <div className={`${styles.endedBox} ${styles.quyenEndedBox}`}>
              <div className={styles.endedIcon}>
                <Award size={28} />
              </div>
              <span className={styles.endedLabel}>
                {live.lyDoKetThuc === "hoan_thanh"
                  ? "Đã hoàn thành lượt thi"
                  : `Đã kết thúc — ${LY_DO_KET_THUC_QUYEN_LABEL[live.lyDoKetThuc!]}`}
              </span>
              {tongHop !== null && (
                <strong className={styles.endedScore}>
                  {tongHop.toFixed(2)}
                </strong>
              )}
              <div
                className={`${styles.controlBtns} ${styles.quyenEndActions}`}>
                <button className={styles.btnPrimary} onClick={xongHan}>
                  <Check size={16} /> Xong, qua lượt tiếp theo
                </button>
                <button className={styles.linkBtn} onClick={choThiLai}>
                  Cho thi lại từ đầu
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.quyenControlPanel}>
              <div className={styles.timerPanel}>
                <span className={styles.timerCaption}>
                  {live.coGioiHan ? "Thời gian còn lại" : "Thời gian đã thi"}
                </span>
                <span
                  className={`${styles.timerBig} ${hetGio ? styles.timerDone : ""}`}>
                  {timeLabel}
                </span>
                <span className={styles.timerSupportText}>
                  {!live.coGioiHan
                    ? "Không giới hạn thời gian · đồng hồ dùng để tham khảo"
                    : hetGio
                      ? "Đã hết thời gian tham chiếu của bài"
                      : `Thời gian tham chiếu: ${live.thoiGianGioiHanGiay ?? 0} giây`}
                </span>
              </div>

              <div className={styles.quyenTimerActions}>
                {live.trangThai === "cho_bat_dau" && (
                  <button
                    className={`${styles.timerBtn} ${styles.timerBtnPrimary}`}
                    onClick={batDau}>
                    <Play size={16} /> Bắt đầu lượt thi
                  </button>
                )}
                {dangThi && (
                  <button className={styles.timerBtn} onClick={tamDung}>
                    <Pause size={16} /> Tạm dừng đồng hồ
                  </button>
                )}
                {dangTamDung && (
                  <button
                    className={`${styles.timerBtn} ${styles.timerBtnPrimary}`}
                    onClick={tiepTuc}>
                    <Play size={16} /> Tiếp tục
                  </button>
                )}
              </div>

              {!showEndFlow ? (
                <button
                  className={`${styles.btnDangerBig} ${styles.quyenFinishBtn}`}
                  onClick={() => setShowEndFlow(true)}>
                  <Flag size={18} /> Kết thúc lượt
                </button>
              ) : (
                <div className={`${styles.settingsForm} ${styles.endFlowCard}`}>
                  <div className={styles.endFlowTitle}>
                    Xác nhận kết thúc lượt
                  </div>
                  <label className={styles.reasonRow}>
                    <span>Lý do</span>
                    <select
                      value={lyDo}
                      onChange={(e) =>
                        setLyDo(e.target.value as LyDoKetThucQuyen)
                      }>
                      {LY_DO_KET_THUC_QUYEN_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className={styles.endFlowActions}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => setShowEndFlow(false)}>
                      Huỷ
                    </button>
                    <button
                      className={styles.btnPrimary}
                      onClick={() => ketThuc(lyDo)}>
                      Xác nhận kết thúc
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
