/** @format */

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { CourtBasic } from "../../../lib/utils/courts";
import {
  createTrongTai,
  updateTrongTai,
  deleteTrongTai,
  type TrongTaiWire,
} from "../../../lib/api/trongTaiApi";
import styles from "../BanThuKy.module.scss";

export default function TrongTaiTab({
  courts,
  trongTaiList,
  onRefresh,
}: {
  courts: CourtBasic[];
  trongTaiList: TrongTaiWire[];
  onRefresh: () => void;
}) {
  const [hoTenMoi, setHoTenMoi] = useState("");
  const [courtMoi, setCourtMoi] = useState(courts[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  const themTrongTai = async () => {
    if (!hoTenMoi.trim()) return;
    setSaving(true);
    try {
      await createTrongTai({
        hoTen: hoTenMoi.trim(),
        courtId: courtMoi || null,
        thuTuGiamDinh: null,
      });
      setHoTenMoi("");
      onRefresh();
    } catch {
      window.alert("Thêm trọng tài thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const doiViTri = async (t: TrongTaiWire, thuTu: number | null) => {
    try {
      await updateTrongTai(t.id, {
        hoTen: t.hoTen,
        courtId: t.courtId,
        thuTuGiamDinh: thuTu,
      });
      onRefresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Đổi vị trí thất bại.");
    }
  };

  const doiSan = async (t: TrongTaiWire, courtId: string) => {
    try {
      // Đổi sân thì reset về dự bị luôn — số Giám định cũ gắn với sân cũ,
      // mang qua sân mới dễ đụng người khác đang giữ đúng số đó.
      await updateTrongTai(t.id, { hoTen: t.hoTen, courtId, thuTuGiamDinh: null });
      onRefresh();
    } catch {
      window.alert("Đổi sân thất bại.");
    }
  };

  const xoa = async (t: TrongTaiWire) => {
    if (!window.confirm(`Xoá "${t.hoTen}" khỏi danh sách trọng tài?`)) return;
    try {
      await deleteTrongTai(t.id);
      onRefresh();
    } catch {
      window.alert("Xoá thất bại.");
    }
  };

  return (
    <div className={styles.trongTaiTab}>
      <div className={styles.trongTaiAddForm}>
        <input
          value={hoTenMoi}
          onChange={(e) => setHoTenMoi(e.target.value)}
          placeholder="Tên trọng tài mới"
        />
        <select value={courtMoi} onChange={(e) => setCourtMoi(e.target.value)}>
          {courts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.ten}
            </option>
          ))}
        </select>
        <button
          className={styles.btnPrimary}
          disabled={saving || !hoTenMoi.trim()}
          onClick={themTrongTai}>
          <Plus size={16} /> Thêm
        </button>
      </div>

      {courts.map((court) => {
        const nguoiOSan = trongTaiList.filter((t) => t.courtId === court.id);
        return (
          <div key={court.id} className={styles.trongTaiCourtGroup}>
            <div className={styles.trongTaiCourtName}>
              {court.ten} · {nguoiOSan.length} trọng tài
            </div>
            {nguoiOSan.length === 0 && (
              <p className={styles.hint}>Chưa có trọng tài nào ở sân này.</p>
            )}
            {nguoiOSan.map((t) => (
              <div key={t.id} className={styles.trongTaiRow}>
                <span className={styles.trongTaiName}>{t.hoTen}</span>
                <select
                  value={t.thuTuGiamDinh ?? ""}
                  onChange={(e) =>
                    doiViTri(t, e.target.value ? Number(e.target.value) : null)
                  }>
                  <option value="">Dự bị</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      Giám định {n}
                    </option>
                  ))}
                </select>
                <select
                  value={t.courtId ?? ""}
                  onChange={(e) => doiSan(t, e.target.value)}>
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.ten}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.trongTaiDelete}
                  onClick={() => xoa(t)}
                  aria-label="Xoá trọng tài">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
