/** @format */

import { useEffect, useState } from "react";
import { Check, Lock, Clock } from "lucide-react";
import { fetchEvents } from "../../lib/api/eventsApi";
import {
  fetchQuyenJudgeScores,
  fetchQuyenScoreLocks,
  upsertQuyenJudgeScore,
  type QuyenJudgeScoreWire,
} from "../../lib/api/quyenJudgeScoreApi";
import {
  fetchPerformanceOrders,
  type PerformanceOrderWire,
} from "../../lib/api/performanceOrderApi";
import type { LiveQuyenState } from "../../types/liveQuyen";
import { formatEventNhomTuoi } from "../../lib/utils/nhomTuoi";
import AthleteAvatar from "../../components/AthleteAvatar/AthleteAvatar";
import type { CompetitionEvent } from "../../types";
import type { Identity } from "./TrongTai";
import styles from "./TrongTai.module.scss";

// Số giây tối thiểu nội dung phải chạy trước khi giám định được gửi
// điểm (trừ khi Bàn thư ký đã bấm kết thúc sớm hơn mốc này) — tránh
// việc gửi điểm ngay tức khắc khi chưa kịp xem đủ phần trình diễn.
const SO_GIAY_TOI_THIEU_TRUOC_KHI_GUI = 30;

export default function QuyenView({
  identity,
  live,
}: {
  identity: Identity;
  live: LiveQuyenState | null;
}) {
  const { trongTaiId, tenTrongTai } = identity;

  // Chỉ cần cho đúng 1 nhãn nhóm tuổi hiển thị — tải 1 lần, không cần lặp
  // lại liên tục vì sự kiện gần như không đổi giữa chừng giải.
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch(() => {});
  }, []);

  // Danh sách thứ tự thi của MỌI nội dung — tải 1 lần (gần như không đổi
  // giữa chừng 1 buổi thi), dùng để đếm ra số VĐV/team của đúng nội dung
  // đang thi hiện tại (xem soLuongThamGia bên dưới).
  const [orders, setOrders] = useState<PerformanceOrderWire[]>([]);
  useEffect(() => {
    fetchPerformanceOrders()
      .then(setOrders)
      .catch(() => {});
  }, []);

  const nhomTuoiLabel = live
    ? formatEventNhomTuoi(
        events.find((e) => e.id === live.eventId)?.nhomTuoi ?? 1,
      )
    : "";

  // Đếm trực tiếp mỗi lần render — orders chỉ vài chục tới vài trăm dòng
  // cả giải, không cần tối ưu bằng useMemo. laDongDoi lấy từ dòng đầu
  // tìm được (1 nội dung chỉ thuộc đúng 1 loại — cá nhân hoặc đồng đội
  // — không lẫn lộn).
  const cuaNoiDungNay = live
    ? orders.filter((o) => o.eventId === live.eventId)
    : [];
  const soLuongThamGia =
    cuaNoiDungNay.length > 0
      ? {
          soLuong: cuaNoiDungNay.length,
          laDongDoi: cuaNoiDungNay[0].teamId !== null,
        }
      : null;

  return (
    <QuyenScoringPanel
      key={
        live
          ? `${live.eventId}::${live.athleteId ?? ""}::${live.teamId ?? ""}`
          : "trong"
      }
      live={live}
      eventTen={live?.eventTen ?? "Chờ Bàn thư ký đưa VĐV vào"}
      nhomTuoiLabel={nhomTuoiLabel}
      soLuongThamGia={soLuongThamGia}
      trongTaiId={trongTaiId}
      tenTrongTai={tenTrongTai}
    />
  );
}

function QuyenScoringPanel({
  live,
  eventTen,
  nhomTuoiLabel,
  soLuongThamGia,
  trongTaiId,
  tenTrongTai,
}: {
  live: LiveQuyenState | null;
  eventTen: string;
  nhomTuoiLabel: string;
  soLuongThamGia: { soLuong: number; laDongDoi: boolean } | null;
  trongTaiId: string;
  tenTrongTai: string;
}) {
  const [existing, setExisting] = useState<QuyenJudgeScoreWire | undefined>(
    undefined,
  );
  const [diemNhap, setDiemNhap] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Đồng hồ đếm lên tick mỗi giây LÚC ĐANG THI — chỉ để ép render lại,
  // cho mốc "đã chạy đủ 30 giây" bên dưới tự cập nhật đúng lúc, không
  // cần đợi 1 thay đổi nào khác (VD giám định gõ số) mới tính lại.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (live?.trangThai !== "dang_thi") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [live?.trangThai]);

  // Lượt hiện tại đã bị Bàn thư ký khoá chưa — poll nhẹ, khoá là hành
  // động hiếm, không cần realtime tức thời như bên gửi điểm.
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (!live) {
      setLocked(false);
      return;
    }
    let huy = false;
    const tai = () => {
      fetchQuyenScoreLocks()
        .then((all) => {
          if (huy) return;
          setLocked(
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
    tai();
    const id = setInterval(tai, 5000);
    return () => {
      huy = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.eventId, live?.athleteId, live?.teamId]);

  // Chỉ để biết điểm CỦA CHÍNH giám định này đã gửi cho đúng lượt này chưa
  // (điền sẵn lại + cho biết gửi lại sẽ ghi đè) — tải khi lượt đổi HOẶC
  // khi trạng thái đổi (VD Bàn thư ký "cho thi lại" — vẫn cùng người
  // nhưng điểm cũ đã bị xoá sạch ở backend, cần đọc lại chứ không giữ
  // điểm cũ còn nằm sẵn trên máy) — không cần theo dõi điểm của 4 giám
  // định còn lại nữa (không còn hiện "N/5" ở đây), nên không cần lặp lại
  // liên tục theo thời gian.
  useEffect(() => {
    if (!live) return;
    let huy = false;
    fetchQuyenJudgeScores()
      .then((all) => {
        if (huy) return;
        const mine = all.find(
          (s) =>
            s.eventId === live.eventId &&
            s.athleteId === live.athleteId &&
            s.teamId === live.teamId &&
            s.giamKhaoId === trongTaiId,
        );
        setExisting(mine);
        setDiemNhap(mine ? String(mine.diem) : "");
      })
      .catch(() => {});
    return () => {
      huy = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    live?.eventId,
    live?.athleteId,
    live?.teamId,
    live?.trangThai,
    trongTaiId,
  ]);

  const diemHienTai = diemNhap === "" ? 0 : Number(diemNhap);

  // Bàn phím số — tối đa 2 chữ số, mỗi trọng tài chỉ được nhập điểm <= 99.
  const nhanSo = (so: number) =>
    setDiemNhap((prev) => (prev.length >= 2 ? prev : prev + String(so)));
  const xoaSo = () => setDiemNhap((prev) => prev.slice(0, -1));

  // Chưa có lượt nào sống (Bàn thư ký chưa đưa ai vào) cũng coi như "chưa
  // bắt đầu" — dùng chung đúng 1 khối hiển thị, không tách riêng trạng
  // thái trống thành 1 giao diện khác.
  const chuaBatDau = !live || live.trangThai === "cho_bat_dau";
  const daKetThuc = live?.trangThai === "da_ket_thuc";

  // Thời gian ĐÃ chạy của lượt hiện tại — y hệt công thức dùng ở
  // DieuHanhQuyenTab.tsx/QuyenCongKhaiScreen.tsx (tính từ
  // capNhatDongHoLuc lúc đang thi, đứng yên lúc tạm dừng/đã kết thúc).
  const daTroiGiay = live
    ? live.trangThai === "dang_thi"
      ? live.thoiGianDaTroiGiay +
        (Date.now() - live.capNhatDongHoLuc) / 1000
      : live.thoiGianDaTroiGiay
    : 0;
  // Đủ điều kiện gửi điểm: chạy đủ SO_GIAY_TOI_THIEU_TRUOC_KHI_GUI giây
  // HOẶC Bàn thư ký đã bấm kết thúc sớm hơn mốc đó — tránh việc giám
  // định gửi điểm ngay khi vừa mới bắt đầu, chưa kịp xem đủ.
  const duThoiGianDeGui =
    daKetThuc || daTroiGiay >= SO_GIAY_TOI_THIEU_TRUOC_KHI_GUI;

  // Gộp thêm điều kiện khoá — dùng riêng cho các nút bấm/bàn phím, tách
  // khỏi chuaBatDau vì đây là 2 LÝ DO KHÁC NHAU khiến không nhập được
  // (chưa tới lượt, VS đã chốt xong không cho sửa nữa) — thông báo hiện
  // ra cho mỗi trường hợp cũng khác nhau (xem JSX bên dưới).
  const khongChoNhap = chuaBatDau || locked || !duThoiGianDeGui;

  // Phản hồi tức thì như bên bấm đèn — không khoá nút đợi hết cả chuyến
  // mạng đi-về. Vẫn gửi thật và vẫn chờ kết quả THẬT ở nền — nếu thất bại
  // thì báo rõ ràng, không lặng lẽ coi như đã lưu.
  const submit = () => {
    if (!live || submitting || locked || !duThoiGianDeGui) return;
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 300);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);

    const diemLucGui = diemHienTai;
    upsertQuyenJudgeScore({
      eventId: live.eventId,
      athleteId: live.athleteId,
      teamId: live.teamId,
      giamKhaoId: trongTaiId,
      tenGiamKhao: tenTrongTai,
      diem: diemLucGui,
      chiTietJson: null,
    })
      .then((saved) => setExisting(saved))
      .catch((err) => {
        setSavedFlash(false);
        // Trường hợp hiếm: BTK vừa khoá đúng lúc đang gửi (đụng độ thời
        // điểm) — backend trả về thông báo rõ ràng sẵn (xem Conflict()
        // trong QuyenJudgeScoresController.cs), hiện thẳng thông báo đó
        // thay vì lời chung chung "kiểm tra mạng", đồng thời tự cập nhật
        // lại khoá ngay để bàn phím khoá lại luôn, không cần đợi tới lượt
        // poll kế tiếp (5 giây sau).
        if (
          err instanceof Error &&
          err.message.includes("đã bị Bàn thư ký khoá")
        ) {
          setLocked(true);
          window.alert(err.message);
          return;
        }
        window.alert(
          `Gửi điểm THẤT BẠI — điểm ${diemLucGui} CHƯA được lưu. Kiểm tra mạng rồi bấm Gửi điểm lại.`,
        );
      });
  };

  return (
    <div className={styles.scoreWrap}>
      <div className={styles.performerCard}>
        <AthleteAvatar
          name={live?.performerLabel ?? "—"}
          photoUrl={live?.photoUrl ?? null}
          size={72}
        />
        <div className={styles.performerInfo}>
          <div className={styles.matchMeta}>
            {eventTen}
            {nhomTuoiLabel ? ` - ${nhomTuoiLabel}` : ""}
          </div>
          {soLuongThamGia && (
            <div className={styles.soLuongThamGia}>
              {soLuongThamGia.laDongDoi
                ? `${soLuongThamGia.soLuong} team`
                : `${soLuongThamGia.soLuong} VĐV`}{" "}
              trong nội dung này
            </div>
          )}
          <div className={styles.performerName}>
            {live?.performerLabel ?? "—"}
          </div>
          <div className={styles.performerSub}>{live?.performerSub ?? ""}</div>
          {live?.thanhVien && live.thanhVien.length > 0 && (
            <div className={styles.thanhVien}>
              {live.thanhVien.map((t) => t.hoTen).join(" - ")}
            </div>
          )}
        </div>
      </div>

      {locked ? (
        <div className={styles.lockedNotice}>
          <Lock size={22} />
          <strong>Điểm đã bị khoá</strong>
          <span>Bàn thư ký đã chốt điểm — không thể gửi/sửa thêm.</span>
        </div>
      ) : !chuaBatDau && !duThoiGianDeGui ? (
        <div className={styles.waitingNotice}>
          <Clock size={22} />
          <strong>
            Chờ đủ {SO_GIAY_TOI_THIEU_TRUOC_KHI_GUI} giây mới gửi được điểm
          </strong>
          <span>
            Còn {Math.max(0, Math.ceil(SO_GIAY_TOI_THIEU_TRUOC_KHI_GUI - daTroiGiay))}{" "}
            giây — hoặc đợi Bàn thư ký bấm kết thúc.
          </span>
        </div>
      ) : (
        <div className={styles.scoreDisplay}>
          <span className={styles.scoreDisplayLabel}>Điểm hiện tại</span>
          <span className={styles.scoreDisplayNum}>{diemNhap || "–"}</span>
        </div>
      )}

      <div className={styles.keypadGrid}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((so) => (
          <button
            key={so}
            type="button"
            className={styles.keypadBtn}
            disabled={khongChoNhap || diemNhap.length >= 2}
            onClick={() => nhanSo(so)}>
            {so}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.keypadBtn} ${styles.keypadBtnZero}`}
          disabled={khongChoNhap || diemNhap.length >= 2}
          onClick={() => nhanSo(0)}>
          0
        </button>
        <button
          type="button"
          className={styles.keypadBtnXoa}
          disabled={khongChoNhap || diemNhap === ""}
          onClick={xoaSo}
          aria-label="Xoá số vừa nhập">
          Xóa
        </button>
      </div>

      <button
        className={styles.btnPrimaryBig}
        disabled={khongChoNhap || submitting || diemNhap === ""}
        onClick={submit}>
        <Check size={18} /> {submitting ? "Đang gửi..." : "Gửi điểm"}
      </button>

      {existing && !locked && (
        <p className={styles.savedNote}>
          Đã gửi lúc {new Date(existing.capNhatLuc).toLocaleTimeString("vi-VN")}{" "}
          — gửi lại sẽ ghi đè điểm cũ.
        </p>
      )}

      {savedFlash && (
        <div className={styles.flashSuccess}>✓ Đã gửi điểm thành công</div>
      )}
    </div>
  );
}
