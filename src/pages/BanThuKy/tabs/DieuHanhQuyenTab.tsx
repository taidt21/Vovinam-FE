/** @format */

import { useEffect, useState } from "react";
import { Play, Pause, Flag, Award, Check, X, Lock, Unlock } from "lucide-react";
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
import {
  getCourtResting,
  publishCourtResting,
  subscribeCourtResting,
} from "../../../lib/realtime/courtRestingStore";
import { serverNow } from "../../../lib/realtime/serverClock";
import { playBellSound } from "../../../lib/audio/matchBell";
import {
  markQuyenLuotHoanThanh,
  unmarkQuyenLuotHoanThanh,
} from "../../../lib/api/quyenLuotApi";
import { tinhDiemQuyenTongHop } from "../../../lib/domain/quyenScoring";
import {
  deleteQuyenJudgeScores,
  fetchQuyenScoreLocks,
  lockQuyenScore,
  unlockQuyenScore,
  type QuyenJudgeScoreWire,
  type QuyenScoreLockWire,
} from "../../../lib/api/quyenJudgeScoreApi";
import type { TrongTaiWire } from "../../../lib/api/trongTaiApi";
import type { QuyenItem } from "../types";
import AthleteAvatar from "../../../components/AthleteAvatar/AthleteAvatar";
import {
  LY_DO_KET_THUC_QUYEN_OPTIONS,
  LY_DO_KET_THUC_QUYEN_LABEL,
} from "../helpers";
import styles from "../BanThuKy.module.scss";

export default function DieuHanhQuyenTab({
  courtId,
  quyenJudgeScores,
  quyenNumbered,
  trongTaiList,
  onLuotXong,
}: {
  courtId: string;
  quyenJudgeScores: QuyenJudgeScoreWire[];
  quyenNumbered: QuyenItem[];
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
  const [lyDo, setLyDo] = useState<LyDoKetThucQuyen>("hoan_thanh");
  const [dangNghi, setDangNghiState] = useState(() =>
    getCourtResting(courtId, "quyen"),
  );

  // Danh sách lượt đang bị khoá — poll nhẹ, không cần realtime tức thời
  // như điểm số (khoá/mở khoá là hành động hiếm, không cần cập nhật
  // trong vài trăm mili-giây như lúc giám định đang gửi điểm).
  const [locks, setLocks] = useState<QuyenScoreLockWire[]>([]);
  useEffect(() => {
    let huy = false;
    const tai = () => {
      fetchQuyenScoreLocks()
        .then((all) => {
          if (!huy) setLocks(all);
        })
        .catch(() => {});
    };
    tai();
    const id = setInterval(tai, 5000);
    return () => {
      huy = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    setLive(getQuyenSnapshot(courtId));
    return subscribeQuyenState(courtId, setLive);
  }, [courtId]);

  useEffect(() => {
    return subscribeCourtResting(courtId, "quyen", setDangNghiState);
  }, [courtId]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!live) {
    return (
      <div className={styles.noMatch}>
        {dangNghi ? (
          <p>
            Sân đang được cho nghỉ — nên chọn 1 lượt thi trong danh sách nếu
            muốn bắt đầu.
          </p>
        ) : (
          <p>
            Chưa có ai đang thi ở khu vực này — sang tab "Lịch thi đấu quyền"
            và bấm "Bắt đầu" ở 1 lượt để đưa vào đây.
          </p>
        )}
      </div>
    );
  }

  // Gỡ lượt "cho_bat_dau" (đã đưa vào sân, chưa bấm bắt đầu) khỏi sân —
  // quyền không có bản ghi DB nào cần trả lại (khác đối kháng), nên chỉ
  // cần xoá state sống rồi báo tạm ngưng tự nhận lượt kế tiếp cho ĐÚNG
  // bên quyền.
  const boLuotChoBatDau = () => {
    clearQuyenState(courtId);
    publishCourtResting(courtId, "quyen", true);
  };

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

  // Số thứ tự của ĐÚNG lượt đang điều hành — tra theo eventId +
  // athleteId + teamId (bộ khoá định danh 1 lượt quyền, y hệt cách
  // tra điểm/khoá điểm ở trên), không tra theo courtId vì 1 sân có thể
  // đổi qua nhiều lượt khác nhau theo thời gian.
  const soThuTu = quyenNumbered.find(
    (item) =>
      item.event.id === live.eventId &&
      item.athleteId === live.athleteId &&
      item.teamId === live.teamId,
  )?.so;

  const batDau = () => {
    patch({ trangThai: "dang_thi", capNhatDongHoLuc: serverNow() });
    playBellSound();
  };
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
  const daKhoa = locks.some(
    (l) =>
      l.eventId === live.eventId &&
      l.athleteId === live.athleteId &&
      l.teamId === live.teamId,
  );
  const khoaDiem = () =>
    lockQuyenScore(live.eventId, live.athleteId, live.teamId)
      .then(() =>
        setLocks((prev) => [
          ...prev,
          {
            eventId: live.eventId,
            athleteId: live.athleteId,
            teamId: live.teamId,
          },
        ]),
      )
      .catch(() =>
        window.alert("Khoá điểm thất bại — kiểm tra mạng rồi thử lại."),
      );
  const moKhoaDiem = () =>
    unlockQuyenScore(live.eventId, live.athleteId, live.teamId)
      .then(() =>
        setLocks((prev) =>
          prev.filter(
            (l) =>
              !(
                l.eventId === live.eventId &&
                l.athleteId === live.athleteId &&
                l.teamId === live.teamId
              ),
          ),
        ),
      )
      .catch(() =>
        window.alert("Mở khoá thất bại — kiểm tra mạng rồi thử lại."),
      );
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

  // Giao diện riêng cho nội dung đồng đội. Chỉ thay cách BỐ TRÍ:
  // roster được đưa ra full-width để 10-15 VĐV vẫn nhìn thấy cùng lúc,
  // còn toàn bộ logic timer / điểm / khoá / kết thúc giữ nguyên.
  const laDongDoi = Boolean(live.teamId);
  const thanhVienDongDoi = live.thanhVien ?? [];
  const soThanhVien = thanhVienDongDoi.length;
  const soCotThanhVien =
    soThanhVien <= 5 ? Math.max(soThanhVien, 1) : soThanhVien <= 10 ? 5 : 8;

  return (
    <div className={styles.dieuHanhQuyen}>
      <div className={styles.operationHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Điều hành quyền</span>
          <h2 className={styles.operationTitle}>
            {soThuTu && <span className={styles.matchNoTag}>#{soThuTu}</span>}{" "}
            {live.eventTen}
          </h2>
          <p className={styles.operationSubline}>
            Theo dõi VĐV, thời gian và điểm của 5 giám định trong cùng một màn
            hình.
          </p>
        </div>
        <span className={`${styles.operationStatus} ${statusClass}`}>
          <span /> {statusLabel}
        </span>
      </div>

      {laDongDoi && (
        <section className={styles.quyenTeamStrip}>
          <div className={styles.quyenTeamStripHeader}>
            <div className={styles.quyenTeamIdentity}>
              <span className={styles.panelEyebrow}>Đang điều hành</span>
              <div className={styles.quyenTeamTitleRow}>
                <h3 className={styles.quyenTeamName}>{live.performerLabel}</h3>
                <span className={styles.quyenTeamMeta}>Danh sách thành viên thi đấu</span>
              </div>
            </div>
            <div className={styles.quyenTeamCount}>
              <strong>{soThanhVien} VĐV</strong>
              <span>Thành viên đội</span>
            </div>
          </div>

          <div
            className={styles.quyenTeamRoster}
            style={
              {
                "--quyen-team-cols": soCotThanhVien,
              } as React.CSSProperties
            }>
            {thanhVienDongDoi.map((tv, i) => (
              <div
                key={`${tv.hoTen}-${i}`}
                className={styles.quyenTeamMember}
                title={tv.hoTen}>
                <div className={styles.quyenTeamMemberAvatar}>
                  <AthleteAvatar
                    name={tv.hoTen}
                    photoUrl={tv.anhDaiDien}
                    size={38}
                  />
                  <span className={styles.quyenTeamMemberNo}>{i + 1}</span>
                </div>
                <span className={styles.quyenTeamMemberName}>{tv.hoTen}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div
        className={`${styles.quyenLayout} ${
          laDongDoi ? styles.quyenLayoutTeam : ""
        }`}>
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

          {/* Chỉ hiện SAU KHI khoá — y hệt lý do màn hình công khai đã ẩn
              (xem QuyenCongKhaiScreen.tsx): điểm từng giám định đã hiện
              sẵn ngay phía trên rồi (để BTK soát), nhưng con số TỔNG HỢP
              đã tính sẵn thì để BTK chủ động khoá mới hiện — tạo đúng 1
              mốc "chốt xong, xem kết quả", không lộ ra ngay khi vừa đủ
              5 điểm. */}
          {tongHop !== null && daKhoa && (
            <div className={styles.quyenResultBox}>
              <div>
                <span>Kết quả tổng hợp</span>
                <small>Điểm hợp lệ sau khi tổng hợp</small>
              </div>
              <strong>{tongHop.toFixed(2)}</strong>
            </div>
          )}

          {/* Phòng hờ cho lượt đã lỡ bị khoá TỪ TRƯỚC lúc chưa đủ 5 điểm
              (trước khi có điều kiện chặn nút ở trên) — không để im
              lặng không hiện gì, dễ hiểu nhầm là lỗi. Bấm "bấm để mở
              lại" ngay trên nút khoá để gỡ, đợi đủ điểm rồi khoá lại. */}
          {tongHop === null && daKhoa && (
            <div className={styles.quyenLockIncompleteNote}>
              Đã khoá nhưng CHƯA đủ 5 điểm giám định — không có tổng hợp
              lệ. Bấm nút bên dưới để mở khoá, đợi đủ điểm rồi khoá lại.
            </div>
          )}

          {/* Khoá điểm — chặn giám định gửi/sửa thêm cho ĐÚNG lượt này,
              bất kể họ gửi từ thiết bị nào (chặn ở backend, không phải
              chỉ ẩn nút bên đây). Dùng khi BTK coi kết quả đã CHỐT, tránh
              trường hợp 1 giám định lỡ tay bấm gửi lại sau khi đã công
              bố, làm đổi kết quả đã thông báo.

              LỖI THẬT đã gặp: trước đây nút này bấm được BẤT KỲ LÚC NÀO,
              kể cả khi CHƯA đủ 5 điểm giám định — khoá vẫn "thành công"
              (nút vẫn đổi tên), nhưng không có tổng điểm hợp lệ nào để
              hiện (tinhDiemQuyenTongHop bắt buộc đúng 5 điểm mới tính),
              nên BTK bấm khoá xong mà không thấy điểm đâu cả, tưởng lỗi
              hiển thị — thật ra lỗi từ chỗ cho khoá quá sớm. Chặn LUÔN
              từ gốc: chỉ CHO PHÉP khoá (không áp dụng lúc MỞ khoá) khi
              đã có tongHop hợp lệ. */}
          <button
            className={
              daKhoa ? styles.quyenUnlockBtn : styles.quyenLockBtn
            }
            disabled={!daKhoa && tongHop === null}
            title={
              !daKhoa && tongHop === null
                ? "Cần đủ 5 giám định gửi điểm mới khoá được"
                : undefined
            }
            onClick={daKhoa ? moKhoaDiem : khoaDiem}>
            {daKhoa ? (
              <>
                <Lock size={15} /> Đã khoá điểm — bấm để mở lại
              </>
            ) : (
              <>
                <Unlock size={15} /> Khoá điểm
              </>
            )}
          </button>
        </div>

        <div
          className={`${styles.quyenMainCol} ${
            laDongDoi ? styles.quyenMainColTeam : ""
          }`}>
          {!laDongDoi && (
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
              <div className={styles.quyenPerformerSub}>
                {live.performerSub}
              </div>
            </div>
          )}

          {/* Giám định có thể gửi đủ điểm (và BTK khoá được) TRƯỚC KHI
              BTK kịp bấm "Kết thúc lượt" — điều kiện gửi điểm chỉ cần
              đủ 30 giây, không bắt buộc phải đã kết thúc. Lỗi thật đã
              gặp: lúc đó khối hiện điểm (nằm trong nhánh daKetThuc bên
              dưới) hoàn toàn không xuất hiện, dù đã khoá xong — BTK
              không thấy điểm ở đâu cả trong cột chính. Thêm khối riêng
              này, hiện NGAY KHI đã khoá, không phụ thuộc đã kết thúc
              hay chưa — luôn thấy được điểm đã chốt ở đúng cột chính,
              dù trận vẫn đang "sống" về mặt đồng hồ. */}
          {daKhoa && tongHop !== null && !daKetThuc && (
            <div className={`${styles.endedBox} ${styles.quyenEndedBox}`}>
              <div className={styles.endedIcon}>
                <Lock size={26} />
              </div>
              <span className={styles.endedLabel}>
                Đã chốt điểm — chưa bấm "Kết thúc lượt"
              </span>
              <strong className={styles.endedScore}>
                {tongHop.toFixed(2)}
              </strong>
            </div>
          )}

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
              {tongHop !== null && daKhoa ? (
                <strong className={styles.endedScore}>
                  {tongHop.toFixed(2)}
                </strong>
              ) : (
                tongHop !== null && (
                  <span className={styles.quyenWaitingLockNote}>
                    Đã đủ điểm — bấm "Khoá điểm" bên trái để xem kết quả
                  </span>
                )
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
                  <>
                    <button
                      className={`${styles.timerBtn} ${styles.timerBtnPrimary}`}
                      onClick={batDau}>
                      <Play size={16} /> Bắt đầu lượt thi
                    </button>
                    <button
                      className={styles.dropMatchBtn}
                      onClick={boLuotChoBatDau}
                      title="Gỡ lượt này khỏi sân, cho sân nghỉ">
                      <X size={15} /> Bỏ, cho sân nghỉ
                    </button>
                  </>
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

              {/* TRƯỚC ĐÂY 2 bước tách rời: bấm nút đỏ "Kết thúc lượt" chỉ
                  MỞ form chọn lý do (chưa đổi trangThai gì cả) — rồi mới
                  bấm tiếp "Xác nhận kết thúc" mới THẬT SỰ kết thúc. Khoảng
                  hở giữa 2 lần bấm đó (lúc BTK đang chọn lý do) đồng hồ
                  vẫn âm thầm chạy tiếp vì trangThai vẫn là "dang_thi" —
                  đúng lỗi đã gặp: bấm "kết thúc" mà đồng hồ chưa dừng
                  ngay. Giờ gộp lại đúng 1 bước: lý do LUÔN hiện sẵn, bấm
                  "Kết thúc lượt" (đã đổi tên từ "Xác nhận kết thúc") là
                  kết thúc NGAY LẬP TỨC — không còn khoảng hở nào giữa 2
                  lần bấm nữa. */}
              <div className={`${styles.settingsForm} ${styles.endFlowCard}`}>
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
                  className={`${styles.btnDangerBig} ${styles.quyenFinishBtn}`}
                  onClick={() => ketThuc(lyDo)}>
                  <Flag size={18} /> Kết thúc lượt
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
