/** @format */

import { useEffect, useState } from "react";
import type { LiveQuyenState } from "../../types/liveQuyen";
import {
  fetchQuyenJudgeScores,
  type QuyenJudgeScoreWire,
} from "../../lib/api/quyenJudgeScoreApi";
import { fetchTrongTai, type TrongTaiWire } from "../../lib/api/trongTaiApi";
import { tinhDiemQuyenTongHop } from "../../lib/domain/quyenScoring";
import AthleteAvatar from "../../components/AthleteAvatar/AthleteAvatar";
import styles from "./QuyenCongKhaiScreen.module.scss";

function responsiveQuyenAvatarSize(): number {
  if (typeof window === "undefined") return 230;

  return Math.round(
    Math.max(
      180,
      Math.min(320, window.innerWidth * 0.145, window.innerHeight * 0.29),
    ),
  );
}

// scores TRUYỀN VÀO đã đúng thứ tự vị trí giám định (index 0 = Giám
// định 1...) — xem comment ở nơi gọi hàm này, không tự sắp xếp gì
// thêm ở đây, chỉ xác định trong số điểm ĐÃ ĐÚNG VỊ TRÍ đó, đâu là 3
// điểm giữa (được tính) và đâu là cao/thấp nhất (bị loại).
function getKeptJudgeScoreIndices(scores: number[]): Set<number> {
  if (scores.length <= 2) {
    return new Set(scores.map((_, index) => index));
  }

  const sorted = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => a.score - b.score || a.index - b.index);

  const kept = sorted.slice(1, -1);
  return new Set(kept.map((item) => item.index));
}

export default function QuyenScreen({
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

  const [scores, setScores] = useState<QuyenJudgeScoreWire[]>([]);

  useEffect(() => {
    setScores([]);
    let huy = false;
    const taiDiem = () => {
      fetchQuyenJudgeScores()
        .then((all) => {
          if (huy) return;
          setScores(
            all.filter(
              (s) =>
                s.eventId === live.eventId &&
                s.athleteId === live.athleteId &&
                s.teamId === live.teamId,
            ),
          );
        })
        .catch(() => {});
    };
    taiDiem();
    const id = setInterval(taiDiem, 3000);
    return () => {
      huy = true;
      clearInterval(id);
    };
  }, [live.eventId, live.athleteId, live.teamId]);

  // Danh sách giám định ĐANG được gán cho đúng sân này, xếp theo đúng
  // số vị trí (thuTuGiamDinh) Bàn thư ký đã gán — y hệt cách
  // DieuHanhQuyenTab.tsx (màn "Tổ giám định" bên BTK) tra cứu, để 2 màn
  // luôn khớp nhau. TRƯỚC ĐÂY màn này tự lấy điểm theo ĐÚNG THỨ TỰ API
  // trả về (thường là thứ tự gửi điểm, có lúc lại là thứ tự khác) rồi
  // đánh số 1-5 lên trên — ai gửi trước thành "Giám định 1" dù người đó
  // có thể là giám định 3 hay 5 thật sự. Giờ luôn tra theo ĐÚNG người
  // được gán vị trí đó, không quan tâm họ gửi điểm lúc nào.
  const [giamDinhSan, setGiamDinhSan] = useState<TrongTaiWire[]>([]);

  useEffect(() => {
    let huy = false;
    const taiPhanCong = () => {
      fetchTrongTai()
        .then((all) => {
          if (huy) return;
          setGiamDinhSan(
            all
              .filter(
                (t) => t.courtId === live.courtId && t.thuTuGiamDinh !== null,
              )
              .sort(
                (a, b) => (a.thuTuGiamDinh ?? 0) - (b.thuTuGiamDinh ?? 0),
              ),
          );
        })
        .catch(() => {});
    };
    taiPhanCong();
    const id = setInterval(taiPhanCong, 5000);
    return () => {
      huy = true;
      clearInterval(id);
    };
  }, [live.courtId]);

  // 5 ô ĐÚNG vị trí 1-5 — null nếu vị trí đó chưa được gán giám định,
  // hoặc đã gán nhưng người đó chưa gửi điểm.
  const oDiem: (number | null)[] = Array.from({ length: 5 }, (_, i) => {
    const thuTu = i + 1;
    const gd = giamDinhSan.find((t) => t.thuTuGiamDinh === thuTu);
    if (!gd) return null;
    return scores.find((s) => s.giamKhaoId === gd.id)?.diem ?? null;
  });

  // getKeptJudgeScoreIndices chỉ nhận mảng ĐẶC (không có null) — nén
  // lại trước khi đưa vào, rồi ánh xạ chỉ số kết quả NGƯỢC LẠI đúng vị
  // trí gốc (0-4) để tô màu đúng ô, không lệch nếu có ô trống ở giữa
  // (VD vị trí 2 chưa gửi điểm nhưng 1,3,4,5 đã có).
  const viTriCoDiem = oDiem
    .map((diem, slotIndex) => ({ diem, slotIndex }))
    .filter((o): o is { diem: number; slotIndex: number } => o.diem !== null);
  const diemTongHop = tinhDiemQuyenTongHop(viTriCoDiem.map((o) => o.diem));
  const chiSoNenGiu = getKeptJudgeScoreIndices(
    viTriCoDiem.map((o) => o.diem),
  );
  const viTriGocDuocGiu = new Set(
    viTriCoDiem
      .filter((_, compactIndex) => chiSoNenGiu.has(compactIndex))
      .map((o) => o.slotIndex),
  );

  return (
    <div className={`${styles.screen} ${styles.quyenScreen}`}>
      {header}
      <div className={styles.quyenEvent}>{live.eventTen}</div>
      <div className={styles.quyenPerformerBig}>
        <div
          className={`${styles.quyenIdentity} ${
            daKetThuc ? styles.quyenIdentityFinished : ""
          }`}>
          <AthleteAvatar
            name={live.performerLabel}
            photoUrl={live.photoUrl}
            size={responsiveQuyenAvatarSize()}
          />

          <div
            className={`${styles.quyenInfoBlock} ${
              daKetThuc ? styles.quyenInfoBlockFinished : ""
            }`}>
            <div className={styles.quyenName}>{live.performerLabel}</div>
            <div className={styles.quyenUnit}>{live.performerSub}</div>
          </div>

          {daKetThuc && diemTongHop !== null ? (
            <div
              className={`${styles.quyenScore} ${styles.quyenScoreFinished}`}>
              {diemTongHop.toFixed(0)}
            </div>
          ) : (
            <>
              {live.trangThai !== "cho_bat_dau" && (
                <span className={styles.quyenClock}>{timeLabel}</span>
              )}
              {live.trangThai === "tam_dung" && (
                <span className={styles.quyenStatus}>TẠM DỪNG</span>
              )}
              {live.trangThai === "cho_bat_dau" && (
                <span className={styles.quyenStatus}>SẮP THI ĐẤU</span>
              )}
              {dangThi && <span className={styles.quyenLive}>TRỰC TIẾP</span>}
            </>
          )}
        </div>

        {/* Luôn hiện khung bảng 5 giám định — KHÔNG còn ẩn hẳn lúc chưa
            có điểm nào. Luôn đúng 5 dòng, ĐÚNG VỊ TRÍ (xem oDiem ở
            trên) — dòng nào giám định đó chưa gửi (hoặc vị trí chưa
            được gán ai) thì hiện "-". Chỉ tô vàng/xám (kept/dropped)
            khi đã ĐỦ 5 điểm để tính. */}
        <div className={styles.quyenResultCol}>
          <table className={styles.quyenBangGiamDinh}>
            <thead>
              <tr>
                <th>Giám định</th>
                <th>Điểm</th>
              </tr>
            </thead>
            <tbody>
              {oDiem.map((diem, i) => {
                const duocTinh =
                  diemTongHop !== null &&
                  diem !== null &&
                  viTriGocDuocGiu.has(i);
                const rowClass =
                  diem === null
                    ? styles.judgeRowPending
                    : duocTinh
                      ? styles.judgeRowKept
                      : styles.judgeRowDropped;
                return (
                  <tr key={i} className={rowClass}>
                    <td className={styles.judgeIndexCell}>{i + 1}</td>
                    <td className={styles.judgeScoreCell}>
                      {diem !== null ? diem.toFixed(0) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
