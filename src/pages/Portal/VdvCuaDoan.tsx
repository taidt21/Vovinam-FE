/** @format */

import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router";
import { Plus } from "lucide-react";
import type { CompetitionEvent } from "../../types";
import type { DoanAccount } from "../../lib/portalAuth";
import {
  loadAthletes,
  saveAthletes,
  type PortalAthlete,
} from "../../lib/portalAthletes";
import Modal from "../../components/Modal/Modal";
import styles from "./VdvCuaDoan.module.scss";
import { loadEvents, subscribeEvents } from "../../lib/eventsStore";
import { FileSpreadsheet } from "lucide-react";
import { saveSquads, type PortalSquad } from "../../lib/portalSquads";
import PortalImportExcelModal from "./PortalImportExcelModal";
import type { ImportRow } from "../../lib/portalExcelImport";
const CURRENT_YEAR = new Date().getFullYear();
const NHOM_TUOI_OPTIONS = [1, 2, 3];
const formatNhomTuoi = (n: number) => `Nhóm tuổi ${n}`;

type AthleteFormState = Omit<PortalAthlete, "id">;
const EMPTY_FORM: AthleteFormState = {
  hoTen: "",
  namSinh: CURRENT_YEAR - 15,
  gioiTinh: "nam",
  nhomTuoi: NHOM_TUOI_OPTIONS[0],
  eventIds: [],
};

export default function VdvCuaDoan() {
  const account = useOutletContext<DoanAccount>();
  const [athletes, setAthletes] = useState<PortalAthlete[]>([]);
  const [squads, setSquads] = useState<PortalSquad[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AthleteFormState>(EMPTY_FORM);

  useEffect(() => {
    setAthletes(loadAthletes(account.id));
    loadEvents()
      .then(setEvents)
      .finally(() => setLoading(false));
    return subscribeEvents(setEvents);
  }, [account.id]);

  const eventName = (id: string) => events.find((e) => e.id === id)?.ten ?? "—";

  const persist = (next: PortalAthlete[]) => {
    setAthletes(next);
    saveAthletes(account.id, next);
  };
  const handleImportConfirm = (validRows: ImportRow[]) => {
    const newAthletes: PortalAthlete[] = [];
    let nextSquads = squads.map((s) => ({
      ...s,
      athleteIds: [...s.athleteIds],
    }));

    for (const row of validRows) {
      const athleteId = crypto.randomUUID();
      const eventIds = row.noiDung
        .map((n) => n.eventId)
        .filter((id): id is string => !!id);
      newAthletes.push({
        id: athleteId,
        hoTen: row.hoTen,
        namSinh: row.namSinh!,
        gioiTinh: row.gioiTinh!,
        nhomTuoi: row.nhomTuoi!,
        eventIds,
      });

      for (const n of row.noiDung) {
        if (!n.eventId || !n.tenDoi) continue;
        const idx = nextSquads.findIndex((s) => s.eventId === n.eventId);
        if (idx >= 0) {
          nextSquads[idx] = {
            ...nextSquads[idx],
            athleteIds: [...nextSquads[idx].athleteIds, athleteId],
          };
        } else {
          nextSquads = [
            ...nextSquads,
            {
              id: crypto.randomUUID(),
              eventId: n.eventId,
              ten: n.tenDoi,
              athleteIds: [athleteId],
            },
          ];
        }
      }
    }

    const nextAthletes = [...newAthletes, ...athletes];
    persist(nextAthletes);
    setSquads(nextSquads);
    saveSquads(account.id, nextSquads);

    setShowImportModal(false);
  };
  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };
  const openEdit = (a: PortalAthlete) => {
    setEditingId(a.id);
    setForm({
      hoTen: a.hoTen,
      namSinh: a.namSinh,
      gioiTinh: a.gioiTinh,
      nhomTuoi: a.nhomTuoi,
      eventIds: a.eventIds,
    });
    setShowModal(true);
  };

  const toggleEventId = (id: string) => {
    setForm((prev) => ({
      ...prev,
      eventIds: prev.eventIds.includes(id)
        ? prev.eventIds.filter((x) => x !== id)
        : [...prev.eventIds, id],
    }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (editingId)
      persist(
        athletes.map((a) => (a.id === editingId ? { ...a, ...form } : a)),
      );
    else persist([{ id: crypto.randomUUID(), ...form }, ...athletes]);
    setShowModal(false);
  };

  const remove = (a: PortalAthlete) => {
    if (!window.confirm(`Xóa VĐV "${a.hoTen}"? Không thể hoàn tác.`)) return;
    persist(athletes.filter((x) => x.id !== a.id));
  };

  if (loading) return <p className={styles.hint}>Đang tải...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>VĐV của đoàn {account.tenDoan}</h1>
        <button
          className={styles.btnGhost}
          onClick={() => setShowImportModal(true)}>
          <FileSpreadsheet size={16} /> Import Excel
        </button>
        <button className={styles.btnPrimary} onClick={openAdd}>
          <Plus size={16} /> Thêm VĐV
        </button>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Năm sinh</th>
              <th>Giới tính</th>
              <th>Nhóm tuổi</th>
              <th>Nội dung đăng ký</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map((a) => (
              <tr key={a.id}>
                <td>{a.hoTen}</td>
                <td>{a.namSinh}</td>
                <td>{a.gioiTinh === "nam" ? "Nam" : "Nữ"}</td>
                <td>{formatNhomTuoi(a.nhomTuoi)}</td>
                <td>
                  {a.eventIds.length > 0 ? (
                    <div className={styles.eventTags}>
                      {a.eventIds.map((id) => (
                        <span key={id} className={styles.eventTag}>
                          {eventName(id)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={styles.rowActions}>
                  <button onClick={() => openEdit(a)}>Sửa</button>
                  <button
                    onClick={() => remove(a)}
                    className={styles.dangerLink}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
            {athletes.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  Chưa có VĐV nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {squads.length > 0 && (
        <div className={styles.card} style={{ marginTop: 16, padding: 16 }}>
          <h2
            className={styles.title}
            style={{ fontSize: 16, marginBottom: 12 }}>
            Các nội dung "quyền đồng đội" đã đăng ký ({squads.length})
          </h2>
          {squads.map((s) => (
            <div
              key={s.id}
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #e2e2e0",
                fontSize: 13,
              }}>
              <strong>{s.ten}</strong> — {eventName(s.eventId)} —{" "}
              {s.athleteIds
                .map((id) => athletes.find((a) => a.id === id)?.hoTen)
                .filter(Boolean)
                .join(", ")}
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <Modal
          title={editingId ? "Sửa VĐV" : "Thêm VĐV"}
          onClose={() => setShowModal(false)}
          size="lg">
          <form onSubmit={submit} className={styles.modalForm}>
            <label className={styles.field}>
              <span>Họ tên</span>
              <input
                value={form.hoTen}
                onChange={(e) => setForm({ ...form, hoTen: e.target.value })}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Năm sinh</span>
              <input
                type="number"
                min={1970}
                max={CURRENT_YEAR}
                value={form.namSinh}
                onChange={(e) =>
                  setForm({ ...form, namSinh: Number(e.target.value) })
                }
                required
              />
            </label>
            <label className={styles.field}>
              <span>Giới tính</span>
              <select
                value={form.gioiTinh}
                onChange={(e) =>
                  setForm({ ...form, gioiTinh: e.target.value as "nam" | "nu" })
                }>
                <option value="nam">Nam</option>
                <option value="nu">Nữ</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Nhóm tuổi</span>
              <select
                value={form.nhomTuoi}
                onChange={(e) =>
                  setForm({ ...form, nhomTuoi: Number(e.target.value) })
                }>
                {NHOM_TUOI_OPTIONS.map((nt) => (
                  <option key={nt} value={nt}>
                    {formatNhomTuoi(nt)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Đăng ký nội dung thi</span>
              <div className={styles.eventPicker}>
                {events.map((ev) => (
                  <label key={ev.id} className={styles.eventCheckItem}>
                    <input
                      type="checkbox"
                      checked={form.eventIds.includes(ev.id)}
                      onChange={() => toggleEventId(ev.id)}
                    />
                    <span>{ev.ten}</span>
                    <span className={styles.eventCheckMeta}>
                      Nhóm tuổi {ev.nhomTuoi}
                    </span>
                  </label>
                ))}
              </div>
            </label>
            <button type="submit" className={styles.btnPrimary}>
              {editingId ? "Lưu" : "Thêm"}
            </button>
          </form>
        </Modal>
      )}
      {showImportModal && (
        <PortalImportExcelModal
          events={events}
          existingSquads={squads.map((s) => ({
            eventId: s.eventId,
            ten: s.ten,
          }))}
          onClose={() => setShowImportModal(false)}
          onConfirm={handleImportConfirm}
        />
      )}
    </div>
  );
}
