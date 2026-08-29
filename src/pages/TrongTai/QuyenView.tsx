/** @format */

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { fetchEvents } from "../../lib/api/eventsApi";
import {
  fetchQuyenJudgeScores,
  upsertQuyenJudgeScore,
  type QuyenJudgeScoreWire,
} from "../../lib/api/quyenJudgeScoreApi";
import type { LiveQuyenState } from "../../types/liveQuyen";
import { formatEventNhomTuoi } from "../../lib/utils/nhomTuoi";
import AthleteAvatar from "../../components/AthleteAvatar/AthleteAvatar";
import type { CompetitionEvent } from "../../types";
import type { Identity } from "./TrongTai";
import styles from "./TrongTai.module.scss";

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

  const nhomTuoiLabel = live
    ? formatEventNhomTuoi(
        events.find((e) => e.id === live.eventId)?.nhomTuoi ?? 1,
      )
    : "";

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
      trongTaiId={trongTaiId}
      tenTrongTai={tenTrongTai}
    />
  );
}

function QuyenScoringPanel({
  live,
  eventTen,
  nhomTuoiLabel,
  trongTaiId,
  tenTrongTai,
}: {
  live: LiveQuyenState | null;
  eventTen: string;
  nhomTuoiLabel: string;
  trongTaiId: string;
  tenTrongTai: string;
}) {
  const [existing, setExisting] = useState<QuyenJudgeScoreWire | undefined>(
    undefined,
  );
  const [diemNhap, setDiemNhap] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

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

  // Phản hồi tức thì như bên bấm đèn — không khoá nút đợi hết cả chuyến
  // mạng đi-về. Vẫn gửi thật và vẫn chờ kết quả THẬT ở nền — nếu thất bại
  // thì báo rõ ràng, không lặng lẽ coi như đã lưu.
  const submit = () => {
    if (!live || submitting) return;
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
      .catch(() => {
        setSavedFlash(false);
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
        <div>
          <div className={styles.matchMeta}>
            {eventTen}
            {nhomTuoiLabel ? ` - ${nhomTuoiLabel}` : ""}
          </div>
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

      <div className={styles.scoreDisplay}>
        <span className={styles.scoreDisplayLabel}>Điểm hiện tại</span>
        <span className={styles.scoreDisplayNum}>{diemNhap || "–"}</span>
      </div>

      <div className={styles.keypadGrid}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((so) => (
          <button
            key={so}
            type="button"
            className={styles.keypadBtn}
            disabled={chuaBatDau || diemNhap.length >= 2}
            onClick={() => nhanSo(so)}>
            {so}
          </button>
        ))}
        <div />
        <button
          type="button"
          className={styles.keypadBtn}
          disabled={chuaBatDau || diemNhap.length >= 2}
          onClick={() => nhanSo(0)}>
          0
        </button>
        <button
          type="button"
          className={styles.keypadBtnXoa}
          disabled={chuaBatDau || diemNhap === ""}
          onClick={xoaSo}
          aria-label="Xoá số vừa nhập">
          Xóa
        </button>
      </div>

      <button
        className={styles.btnPrimaryBig}
        disabled={chuaBatDau || submitting || diemNhap === ""}
        onClick={submit}>
        <Check size={18} /> {submitting ? "Đang gửi..." : "Gửi điểm"}
      </button>

      {existing && (
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
