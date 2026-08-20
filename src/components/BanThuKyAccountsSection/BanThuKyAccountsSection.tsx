/** @format */

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Modal from "../Modal/Modal";
import {
  fetchBanThuKyAccounts,
  createBanThuKyAccount,
  updateBanThuKyAccount,
  deleteBanThuKyAccount,
  type BanThuKyAccountWire,
} from "../../lib/api/banThuKyAccountApi";
import styles from "../../pages/ThietLapGiai/ThietLapGiai.module.scss";

const EMPTY_FORM = { username: "", password: "", tenHienThi: "", courtId: "" };

export default function BanThuKyAccountsSection({ soSan }: { soSan: number }) {
  const [accounts, setAccounts] = useState<BanThuKyAccountWire[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const loadAccounts = () =>
    fetchBanThuKyAccounts()
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (a: BanThuKyAccountWire) => {
    setEditingId(a.id);
    setForm({
      username: a.username,
      password: "",
      tenHienThi: a.tenHienThi,
      courtId: a.courtId ?? "",
    });
    setShowModal(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await updateBanThuKyAccount(editingId, {
          tenHienThi: form.tenHienThi,
          courtId: form.courtId || null,
          passwordMoi: form.password || undefined,
        });
      } else {
        await createBanThuKyAccount({
          username: form.username,
          password: form.password,
          tenHienThi: form.tenHienThi,
          courtId: form.courtId || null,
        });
      }
      setShowModal(false);
      await loadAccounts();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Lưu tài khoản thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const doDelete = async (a: BanThuKyAccountWire) => {
    if (
      !window.confirm(
        `Xoá tài khoản "${a.tenHienThi}" (@${a.username})? Không thể hoàn tác.`,
      )
    )
      return;
    try {
      await deleteBanThuKyAccount(a.id);
      setAccounts((prev) => prev.filter((x) => x.id !== a.id));
    } catch {
      window.alert("Xoá tài khoản thất bại");
    }
  };

  const courtOptions = Array.from({ length: Math.max(1, soSan) }, (_, i) => `c${i + 1}`);
  const tenSan = (id: string) => `Sân ${id.replace("c", "")}`;

  return (
    <section className={styles.card}>
      <div className={styles.eventsHead}>
        <h2 className={styles.cardTitle}>Tài khoản Bàn thư ký</h2>
        <button className={styles.btnPrimary} onClick={openAdd}>
          <Plus size={16} /> Thêm tài khoản
        </button>
      </div>

      <p className={styles.hint}>
        Gán sẵn đúng 1 sân cho mỗi tài khoản để Bàn thư ký đăng nhập vào là vào
        thẳng đúng sân của mình, không cần tự chọn tay và không thao tác nhầm
        sang sân khác. Để trống "Gán sân" nếu muốn tài khoản đó vẫn tự chọn
        sân như trước.
      </p>

      {loading ? (
        <p className={styles.hint}>Đang tải...</p>
      ) : accounts.length === 0 ? (
        <p className={styles.hint}>Chưa có tài khoản Bàn thư ký nào.</p>
      ) : (
        <div className={styles.eventList}>
          {accounts.map((a) => (
            <div key={a.id} className={styles.eventRow}>
              <div className={styles.eventInfo}>
                <span className={styles.eventName}>{a.tenHienThi}</span>
                <span className={styles.eventMeta}>
                  @{a.username} —{" "}
                  {a.courtId ? tenSan(a.courtId) : "Chưa gán sân (tự chọn tay)"}
                </span>
              </div>
              <div className={styles.eventRowActions}>
                <button
                  onClick={() => openEdit(a)}
                  aria-label={`Sửa tài khoản ${a.username}`}>
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => doDelete(a)}
                  aria-label={`Xóa tài khoản ${a.username}`}
                  className={styles.dangerBtn}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title={editingId ? "Sửa tài khoản Bàn thư ký" : "Thêm tài khoản Bàn thư ký"}
          onClose={() => setShowModal(false)}>
          <form className={styles.modalForm} onSubmit={submit}>
            <label className={styles.field}>
              <span>
                Tên đăng nhập{" "}
                {!editingId && <span className={styles.required}>*</span>}
              </span>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required={!editingId}
                disabled={!!editingId}
                placeholder="VD: banthuky-san2"
              />
              {editingId && (
                <span className={styles.fieldHint}>
                  Không đổi được tên đăng nhập sau khi tạo.
                </span>
              )}
            </label>
            <label className={styles.field}>
              <span>
                {editingId
                  ? "Mật khẩu mới (để trống nếu giữ nguyên)"
                  : "Mật khẩu"}{" "}
                {!editingId && <span className={styles.required}>*</span>}
              </span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editingId}
                minLength={4}
              />
            </label>
            <label className={styles.field}>
              <span>
                Tên hiển thị <span className={styles.required}>*</span>
              </span>
              <input
                value={form.tenHienThi}
                onChange={(e) =>
                  setForm({ ...form, tenHienThi: e.target.value })
                }
                required
                placeholder="VD: Cô Lan - Sân 2"
              />
            </label>
            <label className={styles.field}>
              <span>Gán sân</span>
              <select
                value={form.courtId}
                onChange={(e) => setForm({ ...form, courtId: e.target.value })}>
                <option value="">— Chưa gán, tự chọn tay —</option>
                {courtOptions.map((id) => (
                  <option key={id} value={id}>
                    {tenSan(id)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={submitting}>
              {submitting ? "Đang lưu..." : editingId ? "Lưu" : "Thêm"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
