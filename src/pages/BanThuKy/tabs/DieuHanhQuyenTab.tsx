/** @format */

import { useEffect, useState } from "react";
import { Play, Pause, Flag, Award, Check } from "lucide-react";
import type { LiveQuyenState, LyDoKetThucQuyen } from "../../../types/liveQuyen";
import {
  clearQuyenState,
  getQuyenSnapshot,
  publishQuyenState,
  subscribeQuyenState,
  tinhThoiGianDaTroi,
} from "../../../lib/realtime/liveQuyenStore";
import { serverNow } from "../../../lib/realtime/serverClock";
import { tinhDiemQuyenTongHop } from "../../../lib/domain/quyenScoring";
import type { QuyenJudgeScoreWire } from "../../../lib/api/quyenJudgeScoreApi";
import type { TrongTaiWire } from "../../../lib/api/trongTaiApi";
import AthleteAvatar from "../../../components/AthleteAvatar/AthleteAvatar";
import { LY_DO_KET_THUC_QUYEN_OPTIONS, LY_DO_KET_THUC_QUYEN_LABEL } from "../helpers";
import styles from "../BanThuKy.module.scss";

export default function DieuHanhQuyenTab({
  courtId,
  quyenJudgeScores,
  trongTaiList,
}: {
  courtId: string;
  quyenJudgeScores: QuyenJudgeScoreWire[];
  trongTaiList: TrongTaiWire[];
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

  const xongHan = () => clearQuyenState(courtId);

  const choThiLai = () => {
    if (
      !window.confirm(
        "Cho thi lại từ đầu? Đồng hồ sẽ về 0 — các điểm giám khảo đã gửi cho " +
          "lượt này VẪN CÒN, cần tự nhắc giám khảo gửi lại nếu cần chấm lại.",
      )
    )
      return;
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

  return (
    <div className={styles.dieuHanhQuyen}>
      <div className={styles.matchMeta}>{live.eventTen}</div>

      <div className={styles.quyenLayout}>
        <div className={styles.quyenJudgePanel}>
          <div className={styles.quyenJudgeList}>
            {[1, 2, 3, 4, 5].map((n) => {
              const gd = giamDinhSan.find((t) => t.thuTuGiamDinh === n);
              const diem = gd
                ? scores.find((s) => s.giamKhaoId === gd.id)?.diem
                : undefined;
              return (
                <div key={n} className={styles.quyenJudgeCell}>
                  <div className={styles.quyenJudgeInfo}>
                    <span className={styles.quyenJudgeLabel}>
                      Giám định {n}
                    </span>
                    <span className={styles.quyenJudgeName}>
                      {gd ? gd.hoTen : "chưa gán"}
                    </span>
                  </div>
                  <span
                    className={
                      diem !== undefined
                        ? styles.quyenJudgeScore
                        : styles.quyenJudgeScorePending
                    }>
                    {diem !== undefined ? diem : gd ? "chưa chấm" : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {tongHop !== null && (
            <div className={styles.quyenResultBox}>
              <span>Tổng điểm</span>
              <strong>{tongHop.toFixed(2)}</strong>
            </div>
          )}
        </div>

        <div className={styles.quyenMainCol}>
          <div className={styles.quyenPerformer}>
            <AthleteAvatar
              name={live.performerLabel}
              photoUrl={live.photoUrl}
              size={96}
            />
            <div className={styles.quyenPerformerName}>
              {live.performerLabel}
            </div>
            <div className={styles.quyenPerformerSub}>
              {live.performerSub}
            </div>
          </div>

          {daKetThuc ? (
            <div className={styles.endedBox}>
              <Award size={28} />
              <span className={styles.endedLabel}>
                {live.lyDoKetThuc === "hoan_thanh"
                  ? "Đã hoàn thành"
                  : `Đã kết thúc — ${LY_DO_KET_THUC_QUYEN_LABEL[live.lyDoKetThuc!]}`}
              </span>
              <div className={styles.controlBtns}>
                <button className={styles.btnPrimary} onClick={xongHan}>
                  <Check size={16} /> Xong, qua lượt tiếp theo
                </button>
                <button className={styles.linkBtn} onClick={choThiLai}>
                  Cho thi lại
                </button>
              </div>
            </div>
          ) : (
            <>
              <span
                className={`${styles.timerBig} ${hetGio ? styles.timerDone : ""}`}>
                {timeLabel}
              </span>
              {!live.coGioiHan && (
                <p className={styles.hint}>
                  Không giới hạn thời gian — đồng hồ chỉ đếm để tham khảo.
                </p>
              )}
              {hetGio && (
                <p className={styles.hint}>
                  Đã hết thời gian tham chiếu của bài.
                </p>
              )}

              {live.trangThai === "cho_bat_dau" && (
                <button className={styles.timerBtn} onClick={batDau}>
                  <Play size={15} /> Bắt đầu
                </button>
              )}
              {dangThi && (
                <button className={styles.timerBtn} onClick={tamDung}>
                  <Pause size={15} /> Tạm dừng
                </button>
              )}
              {dangTamDung && (
                <button className={styles.timerBtn} onClick={tiepTuc}>
                  <Play size={15} /> Tiếp tục
                </button>
              )}

              {!showEndFlow ? (
                <button
                  className={styles.btnDangerBig}
                  onClick={() => setShowEndFlow(true)}>
                  <Flag size={18} /> Kết thúc lượt
                </button>
              ) : (
                <div className={styles.settingsForm}>
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
                  <button
                    className={styles.btnPrimary}
                    onClick={() => ketThuc(lyDo)}>
                    Xác nhận kết thúc
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
