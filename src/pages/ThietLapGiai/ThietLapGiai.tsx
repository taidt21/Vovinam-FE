/** @format */

import { useState } from "react";
import type { EventKind, Tournament, TournamentStatus } from "../../types";
import styles from "./ThietLapGiai.module.scss";

const LOAI_THI_OPTIONS: { value: EventKind; label: string }[] = [
  { value: "quyen", label: "Quyền" },
  { value: "doi_khang", label: "Đối kháng" },
];

type FormState = Omit<Tournament, "id">;

const EMPTY_FORM: FormState = {
  ten: "",
  ngayBatDau: "",
  ngayKetThuc: "",
  diaDiem: "",
  soSan: 1,
  loaiThi: [],
  trangThai: "chuan_bi",
};

export default function ThietLapGiai() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const toggleLoaiThi = (value: EventKind) => {
    setForm((prev) => ({
      ...prev,
      loaiThi: prev.loaiThi.includes(value)
        ? prev.loaiThi.filter((v) => v !== value)
        : [...prev.loaiThi, value],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: gọi API khi có backend
    console.log("Lưu giải:", form);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Thiết lập giải</h1>

      <form className={styles.card} onSubmit={handleSubmit}>
        <h2 className={styles.cardTitle}>Thông tin giải đấu</h2>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span>
              Tên giải <span className={styles.required}>*</span>
            </span>
            <input
              type="text"
              value={form.ten}
              onChange={(e) => setForm({ ...form, ten: e.target.value })}
              placeholder="VD: Giải Vovinam Trẻ Toàn quốc 2026"
              required
            />
          </label>

          <label className={styles.field}>
            <span>
              Loại thi <span className={styles.required}>*</span>
            </span>
            <div className={styles.checkGroup}>
              {LOAI_THI_OPTIONS.map((opt) => (
                <label key={opt.value} className={styles.checkOption}>
                  <input
                    type="checkbox"
                    checked={form.loaiThi.includes(opt.value)}
                    onChange={() => toggleLoaiThi(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </label>

          <label className={styles.field}>
            <span>
              Ngày bắt đầu <span className={styles.required}>*</span>
            </span>
            <input
              type="date"
              value={form.ngayBatDau}
              onChange={(e) => setForm({ ...form, ngayBatDau: e.target.value })}
              required
            />
          </label>

          <label className={styles.field}>
            <span>
              Ngày kết thúc <span className={styles.required}>*</span>
            </span>
            <input
              type="date"
              value={form.ngayKetThuc}
              onChange={(e) =>
                setForm({ ...form, ngayKetThuc: e.target.value })
              }
              required
            />
          </label>

          <label className={styles.field}>
            <span>
              Địa điểm <span className={styles.required}>*</span>
            </span>
            <input
              type="text"
              value={form.diaDiem}
              onChange={(e) => setForm({ ...form, diaDiem: e.target.value })}
              placeholder="VD: Nhà thi đấu tỉnh Bình Dương"
              required
            />
          </label>

          <label className={styles.field}>
            <span>
              Số sân / thảm <span className={styles.required}>*</span>
            </span>
            <input
              type="number"
              min={1}
              value={form.soSan}
              onChange={(e) =>
                setForm({ ...form, soSan: Number(e.target.value) })
              }
              required
            />
          </label>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.btnPrimary}>
            Lưu
          </button>
          <button type="button" className={styles.btnGhost}>
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
}
