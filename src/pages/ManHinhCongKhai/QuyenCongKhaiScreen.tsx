/** @format */

import { useEffect, useState } from "react";
import type { LiveQuyenState } from "../../types/liveQuyen";
import {
  fetchQuyenJudgeScores,
  fetchQuyenScoreLocks,
  type QuyenJudgeScoreWire,
} from "../../lib/api/quyenJudgeScoreApi";
import { fetchTrongTai, type TrongTaiWire } from "../../lib/api/trongTaiApi";
import { fetchEvents } from "../../lib/api/eventsApi";
import {
  fetchPerformanceOrders,
  type PerformanceOrderWire,
} from "../../lib/api/performanceOrderApi";
import { compareNhomTuoi } from "../../lib/utils/nhomTuoi";
import { tinhDiemQuyenTongHop } from "../../lib/domain/quyenScoring";
import type { CompetitionEvent } from "../../types";
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

function responsiveTeamAvatarSize(
  memberCount: number,
  compactResult = false,
): number {
  const base = responsiveQuyenAvatarSize();

  let ratio: number;
  if (memberCount <= 3) ratio = 0.62;
  else if (memberCount <= 5) ratio = 0.56;
  else if (memberCount <= 10) ratio = 0.44;
  else ratio = 0.36;

  // Khi đã công bố kết quả, roster đồng đội thu gọn để nhường chiều cao
  // cho tổng điểm. Đội càng đông thì mức thu càng mạnh.
  if (compactResult) {
    if (memberCount <= 3) ratio *= 0.9;
    else if (memberCount <= 5) ratio *= 0.85;
    else if (memberCount <= 10) ratio *= 0.8;
    else ratio *= 0.72;
  }

  return Math.round(base * ratio);
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
  // Chuông giờ CHỈ phát ở Bàn thư ký (DieuHanhQuyenTab.tsx, gọi trực
  // tiếp ngay lúc bấm "Bắt đầu"), KHÔNG còn phát ở đây — y hệt lý do
  // đã bỏ ở ManHinhCongKhai.tsx (đối kháng): màn công khai và Bàn thư
  // ký thường CÙNG 1 THIẾT BỊ vật lý, 2 nơi tự động phát riêng gây
  // chồng tiếng, nghe như "reo bừa bãi".

  // Số thứ tự TOÀN CỤC của lượt hiện tại — tái tạo ĐÚNG logic tính
  // "quyenNumbered" bên BanThuKy.tsx (sắp theo nhóm tuổi, rồi theo thứ
  // tự đăng ký trong từng nội dung, đánh số liên tục qua MỌI nội dung
  // quyền) — không dùng chung được state đó vì màn này là 1 trang/thiết
  // bị HOÀN TOÀN riêng biệt với BTK, nên tự tải lại đúng 2 nguồn dữ
  // liệu cần thiết (events + performance-orders), tải 1 lần vì gần như
  // không đổi giữa chừng 1 buổi thi.
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [orders, setOrders] = useState<PerformanceOrderWire[]>([]);
  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch(() => {});
    fetchPerformanceOrders()
      .then(setOrders)
      .catch(() => {});
  }, []);

  const soThuTu = (() => {
    const quyenEvents = events
      .filter((e) => e.loai === "quyen")
      .sort((a, b) => compareNhomTuoi(a.nhomTuoi, b.nhomTuoi));
    let dem = 0;
    for (const e of quyenEvents) {
      const cuaNoiDungNay = orders
        .filter((o) => o.eventId === e.id)
        .sort((a, b) => a.thuTu - b.thuTu);
      for (const o of cuaNoiDungNay) {
        dem += 1;
        if (
          o.eventId === live.eventId &&
          o.athleteId === live.athleteId &&
          o.teamId === live.teamId
        ) {
          return dem;
        }
      }
    }
    return undefined;
  })();

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
  const laDongDoi = Boolean(live.thanhVien && live.thanhVien.length > 0);

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
              .sort((a, b) => (a.thuTuGiamDinh ?? 0) - (b.thuTuGiamDinh ?? 0)),
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

  // Đã bị Bàn thư ký khoá chưa — TỔNG ĐIỂM và từng điểm giám định chỉ
  // hiện công khai SAU KHI khoá, dù đã đủ 5 điểm từ trước đó rồi. Cho
  // Bàn thư ký cơ hội soát lại (VD phát hiện 1 giám định gõ nhầm) trước
  // khi công bố ra màn hình cho cả khán phòng thấy.
  const [daKhoa, setDaKhoa] = useState(false);
  useEffect(() => {
    let huy = false;
    const taiKhoa = () => {
      fetchQuyenScoreLocks()
        .then((all) => {
          if (huy) return;
          setDaKhoa(
            all.some(
              (l) =>
                l.eventId === live.eventId &&
                l.athleteId === live.athleteId &&
                l.teamId === live.teamId,
            ),
          );
        })
        .catch(() => {});
    };
    taiKhoa();
    const id = setInterval(taiKhoa, 3000);
    return () => {
      huy = true;
      clearInterval(id);
    };
  }, [live.eventId, live.athleteId, live.teamId]);

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
  const chiSoNenGiu = getKeptJudgeScoreIndices(viTriCoDiem.map((o) => o.diem));
  const viTriGocDuocGiu = new Set(
    viTriCoDiem
      .filter((_, compactIndex) => chiSoNenGiu.has(compactIndex))
      .map((o) => o.slotIndex),
  );

  const dangHienKetQua = daKetThuc && diemTongHop !== null && daKhoa;

  return (
    <div
      className={`${styles.screen} ${styles.quyenScreen} ${
        laDongDoi ? styles.quyenScreenTeam : ""
      }`}>
      {header}
      <div className={styles.quyenEvent}>
        {soThuTu && <span className={styles.quyenSoTag}>#{soThuTu}</span>}{" "}
        {live.eventTen}
      </div>
      <div
        className={`${styles.quyenPerformerBig} ${
          laDongDoi ? styles.quyenPerformerBigTeam : ""
        }`}>
        <div
          className={`${styles.quyenIdentity} ${
            daKetThuc ? styles.quyenIdentityFinished : ""
          }`}>
          {laDongDoi ? (
            (() => {
              const thanhVien = live.thanhVien!;
              return (
                <>
                  {/* Đồng đội: tên đội đặt trên roster để người xem nhận diện
                      theo đúng thứ tự thị giác: đội nào -> đội hình -> kết quả. */}
                  <div
                    className={`${styles.quyenInfoBlock} ${styles.quyenInfoBlockTeam} ${
                      daKetThuc ? styles.quyenInfoBlockFinished : ""
                    }`}>
                    <div className={styles.quyenName}>
                      {live.performerLabel}
                    </div>
                    <div className={styles.quyenUnit}>{live.performerSub}</div>
                    <div className={styles.quyenTeamCount}>
                      {thanhVien.length} VĐV
                    </div>
                  </div>

                  <div
                    className={`${styles.quyenThanhVienRowBig} ${
                      dangHienKetQua ? styles.quyenThanhVienRowResult : ""
                    }`}
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(
                        thanhVien.length,
                        5,
                      )}, max-content)`,
                    }}>
                    {thanhVien.map((tv, i) => (
                      <div
                        key={i}
                        className={styles.quyenThanhVienItemBig}
                        title={tv.hoTen}>
                        <AthleteAvatar
                          name={tv.hoTen}
                          photoUrl={tv.anhDaiDien}
                          size={responsiveTeamAvatarSize(
                            thanhVien.length,
                            dangHienKetQua,
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </>
              );
            })()
          ) : (
            <>
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
            </>
          )}

          {daKetThuc && diemTongHop !== null && daKhoa ? (
            <div
              className={`${styles.quyenScore} ${styles.quyenScoreFinished} ${
                laDongDoi ? styles.quyenScoreTeamFinished : ""
              }`}>
              {diemTongHop.toFixed(0)}
            </div>
          ) : (
            <>
              {live.trangThai !== "cho_bat_dau" && !daKetThuc && (
                <span className={styles.quyenClock}>{timeLabel}</span>
              )}
              {live.trangThai === "tam_dung" && (
                <span className={styles.quyenStatus}>TẠM DỪNG</span>
              )}
              {live.trangThai === "cho_bat_dau" && (
                <span className={styles.quyenStatus}>SẮP THI ĐẤU</span>
              )}
              {dangThi && <span className={styles.quyenLive}>TRỰC TIẾP</span>}
              {daKetThuc && (
                <span className={styles.quyenStatus}>ĐANG CHỜ KẾT QUẢ</span>
              )}
            </>
          )}
        </div>

        {/* Luôn hiện khung bảng 5 giám định — KHÔNG còn ẩn hẳn lúc chưa
            có điểm nào. Luôn đúng 5 dòng, ĐÚNG VỊ TRÍ (xem oDiem ở
            trên) — dòng nào giám định đó chưa gửi (hoặc vị trí chưa
            được gán ai) thì hiện "-". Chỉ tô vàng/xám (kept/dropped)
            khi đã ĐỦ 5 điểm để tính.
            
            ĐÃ gửi nhưng CHƯA khoá — hiện dấu ✓ xác nhận đã chấm, KHÔNG
            hiện số thật (khán giả cộng lại 5 số sẽ ra đúng tổng, khác
            gì hiện thẳng tổng điểm — ẩn tổng mà vẫn hiện từng điểm thì
            vô nghĩa). Số thật chỉ hiện SAU KHI khoá. */}
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
                    : !daKhoa
                      ? styles.judgeRowPending
                      : duocTinh
                        ? styles.judgeRowKept
                        : styles.judgeRowDropped;
                const noiDung =
                  diem === null ? "—" : !daKhoa ? "✓" : diem.toFixed(0);
                return (
                  <tr key={i} className={rowClass}>
                    <td className={styles.judgeIndexCell}>{i + 1}</td>
                    <td className={styles.judgeScoreCell}>{noiDung}</td>
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
