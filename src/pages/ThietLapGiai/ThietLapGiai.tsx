/** @format */

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, FileSpreadsheet } from "lucide-react";
import type {
  CompetitionEvent,
  EventKind,
  GioiTinh,
  Tournament,
} from "../../types";
import Modal from "../../components/Modal/Modal";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api";
import ImportEventsExcelModal from "../../components/ImportEventsExcelModal/ImportEventsExcelModal";
import type { EventImportRow } from "../../lib/eventExcelImport";
import styles from "./ThietLapGiai.module.scss";
import { NHOM_TUOI_OPTIONS } from "../../lib/nhomTuoi";
const formatNhomTuoi = (n: number) => `Nhóm tuổi ${n}`;

type EventFormState = Omit<CompetitionEvent, "id" | "tournamentId">;
const EMPTY_EVENT_FORM: EventFormState = {
  ten: "",
  loai: "doi_khang",
  gioiTinh: "nam",
  nhomTuoi: NHOM_TUOI_OPTIONS[0],
  hinhThucThi: "ca_nhan",
  hangCan: undefined,
  thoiGianBaiGiay: undefined,
};

export default function ThietLapGiai() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [form, setForm] = useState({ ten: "", soSan: 1 });
  const [savingTournament, setSavingTournament] = useState(false);

  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>(EMPTY_EVENT_FORM);
  const [showImportEventsModal, setShowImportEventsModal] = useState(false);
  const [importingEvents, setImportingEvents] = useState(false);
  useEffect(() => {
    apiGet<Tournament>("/tournament")
      .then((t) => {
        setTournament(t);
        setForm({ ten: t.ten, soSan: t.soSan });
      })
      .catch(() =>
        setLoadError(
          "Không tải được thông tin giải — kiểm tra backend đã chạy chưa",
        ),
      );

    apiGet<CompetitionEvent[]>("/events")
      .then(setEvents)
      .catch(() =>
        setLoadError(
          "Không tải được danh sách nội dung — kiểm tra backend đã chạy chưa",
        ),
      )
      .finally(() => setLoadingEvents(false));
  }, []);

  const handleSubmitTournament = async (e: FormEvent) => {
    e.preventDefault();
    setSavingTournament(true);
    try {
      const updated = await apiPut<Tournament>("/tournament", form);
      setTournament(updated);
    } catch {
      setLoadError(
        "Lưu thông tin giải thất bại — kiểm tra backend đã chạy chưa",
      );
    } finally {
      setSavingTournament(false);
    }
  };

  const openAddEvent = () => {
    setEditingEventId(null);
    setEventForm(EMPTY_EVENT_FORM);
    setShowEventModal(true);
  };

  const openEditEvent = (ev: CompetitionEvent) => {
    setEditingEventId(ev.id);
    setEventForm({
      ten: ev.ten,
      loai: ev.loai,
      gioiTinh: ev.gioiTinh,
      nhomTuoi: ev.nhomTuoi,
      hinhThucThi: ev.hinhThucThi,
      hangCan: ev.hangCan,
      thoiGianBaiGiay: ev.thoiGianBaiGiay,
    });
    setShowEventModal(true);
  };

  const submitEvent = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingEvent(true);
    try {
      if (editingEventId) {
        await apiPut(`/events/${editingEventId}`, eventForm);
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === editingEventId ? { ...ev, ...eventForm } : ev,
          ),
        );
      } else {
        const created = await apiPost<CompetitionEvent>("/events", eventForm);
        setEvents((prev) => [created, ...prev]);
      }
      setShowEventModal(false);
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Lưu nội dung thất bại — kiểm tra backend đã chạy chưa",
      );
    } finally {
      setSubmittingEvent(false);
    }
  };

  const deleteEvent = async (ev: CompetitionEvent) => {
    if (
      !window.confirm(
        `Xóa nội dung "${ev.ten}"? Các đoàn đã đăng ký VĐV vào nội dung này sẽ không còn thấy được nữa. Không thể hoàn tác.`,
      )
    )
      return;
    try {
      await apiDelete(`/events/${ev.id}`);
      setEvents((prev) => prev.filter((x) => x.id !== ev.id));
    } catch {
      window.alert("Xóa nội dung thất bại — kiểm tra backend đã chạy chưa");
    }
  };
  const handleImportEventsConfirm = async (validRows: EventImportRow[]) => {
    setImportingEvents(true);
    try {
      for (const r of validRows) {
        const created = await apiPost<CompetitionEvent>("/events", {
          ten: r.ten,
          loai: r.loai,
          gioiTinh: r.gioiTinh,
          hinhThucThi: r.hinhThucThi,
          nhomTuoi: r.nhomTuoi,
          hangCan: r.hangCan,
          thoiGianBaiGiay: r.thoiGianBaiGiay,
        });
        setEvents((prev) => [created, ...prev]);
      }
      setShowImportEventsModal(false);
    } catch (err) {
      window.alert(
        err instanceof Error
          ? `Import gặp lỗi giữa chừng: ${err.message} — 1 số dòng có thể đã được tạo, kiểm tra lại danh sách trước khi import lại.`
          : "Import thất bại",
      );
    } finally {
      setImportingEvents(false);
    }
  };
  const quyenEvents = [...events]
    .filter((e) => e.loai === "quyen")
    .sort((a, b) => a.nhomTuoi - b.nhomTuoi);
  const doiKhangEvents = [...events]
    .filter((e) => e.loai === "doi_khang")
    .sort(
      (a, b) => a.nhomTuoi - b.nhomTuoi || (a.hangCan ?? 0) - (b.hangCan ?? 0),
    );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Thiết lập giải</h1>

      {loadError && <p className={styles.errorBanner}>{loadError}</p>}

      <form className={styles.card} onSubmit={handleSubmitTournament}>
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
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={savingTournament}>
            {savingTournament ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
        {tournament && (
          <p className={styles.hint}>
            Đã lưu lần cuối — giải "{tournament.ten}", {tournament.soSan} sân.
          </p>
        )}
      </form>

      <section className={styles.card}>
        <div className={styles.eventsHead}>
          <div>
            <h2 className={styles.cardTitle}>
              Nội dung, hạng cân & nhóm tuổi được phép đăng ký
            </h2>
            <p className={styles.eventsNote}>
              Đoàn chỉ đăng ký VĐV được vào đúng những nội dung có trong danh
              sách này — cổng đăng ký không cho tự thêm nội dung mới.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => setShowImportEventsModal(true)}>
              <FileSpreadsheet size={16} /> Import Excel
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={openAddEvent}>
              <Plus size={16} /> Thêm nội dung
            </button>
          </div>
        </div>

        {loadingEvents ? (
          <p className={styles.hint}>Đang tải...</p>
        ) : (
          <div className={styles.eventGroups}>
            <EventGroupList
              title="Đối kháng"
              events={doiKhangEvents}
              onEdit={openEditEvent}
              onDelete={deleteEvent}
            />
            <EventGroupList
              title="Quyền"
              events={quyenEvents}
              onEdit={openEditEvent}
              onDelete={deleteEvent}
            />
          </div>
        )}
      </section>

      {showEventModal && (
        <Modal
          title={editingEventId ? "Sửa nội dung" : "Thêm nội dung"}
          onClose={() => setShowEventModal(false)}>
          <form onSubmit={submitEvent} className={styles.modalForm}>
            <label className={styles.field}>
              <span>Tên nội dung</span>
              <input
                value={eventForm.ten}
                onChange={(e) =>
                  setEventForm({ ...eventForm, ten: e.target.value })
                }
                placeholder="VD: Long hổ quyền"
                required
              />
            </label>
            <label className={styles.field}>
              <span>Loại</span>
              <select
                value={eventForm.loai}
                onChange={(e) =>
                  setEventForm({
                    ...eventForm,
                    loai: e.target.value as EventKind,
                    hangCan:
                      e.target.value === "quyen"
                        ? undefined
                        : eventForm.hangCan,
                    thoiGianBaiGiay:
                      e.target.value === "doi_khang"
                        ? undefined
                        : eventForm.thoiGianBaiGiay,
                  })
                }>
                <option value="doi_khang">Đối kháng</option>
                <option value="quyen">Quyền</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Hình thức thi</span>
              <select
                value={eventForm.hinhThucThi ?? "ca_nhan"}
                onChange={(e) =>
                  setEventForm({
                    ...eventForm,
                    hinhThucThi: e.target.value as "ca_nhan" | "doi",
                  })
                }>
                <option value="ca_nhan">Cá nhân</option>
                <option value="doi">Đội</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Giới tính</span>
              <select
                value={eventForm.gioiTinh}
                onChange={(e) =>
                  setEventForm({
                    ...eventForm,
                    gioiTinh: e.target.value as GioiTinh | "hon_hop",
                  })
                }>
                <option value="nam">Nam</option>
                <option value="nu">Nữ</option>
                <option value="hon_hop">Hỗn hợp (chỉ đội)</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Nhóm tuổi</span>
              <select
                value={eventForm.nhomTuoi}
                onChange={(e) =>
                  setEventForm({
                    ...eventForm,
                    nhomTuoi: Number(e.target.value),
                  })
                }>
                {NHOM_TUOI_OPTIONS.map((nt) => (
                  <option key={nt} value={nt}>
                    {formatNhomTuoi(nt)}
                  </option>
                ))}
              </select>
            </label>
            {eventForm.loai === "doi_khang" && (
              <label className={styles.field}>
                <span>Hạng cân (kg)</span>
                <input
                  type="number"
                  min={1}
                  value={eventForm.hangCan ?? ""}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      hangCan: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  required
                />
              </label>
            )}
            {eventForm.loai === "quyen" && (
              <label className={styles.field}>
                <span>Thời gian tham chiếu (giây)</span>
                <input
                  type="number"
                  min={1}
                  value={eventForm.thoiGianBaiGiay ?? ""}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      thoiGianBaiGiay: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="VD: 45"
                />
              </label>
            )}
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={submittingEvent}>
              {submittingEvent
                ? "Đang lưu..."
                : editingEventId
                  ? "Lưu"
                  : "Thêm"}
            </button>
          </form>
        </Modal>
      )}
      {showImportEventsModal && (
        <ImportEventsExcelModal
          existingEvents={events}
          onClose={() => setShowImportEventsModal(false)}
          onConfirm={handleImportEventsConfirm}
        />
      )}
      {importingEvents && (
        <div className={styles.importingOverlay}>
          Đang import, vui lòng đợi...
        </div>
      )}
    </div>
  );
}

function EventGroupList({
  title,
  events,
  onEdit,
  onDelete,
}: {
  title: string;
  events: CompetitionEvent[];
  onEdit: (ev: CompetitionEvent) => void;
  onDelete: (ev: CompetitionEvent) => void;
}) {
  return (
    <div className={styles.eventGroup}>
      <h3 className={styles.eventGroupTitle}>
        {title} <span>({events.length})</span>
      </h3>
      {events.length === 0 ? (
        <p className={styles.hint}>Chưa có nội dung nào</p>
      ) : (
        <div className={styles.eventList}>
          {events.map((ev) => (
            <div key={ev.id} className={styles.eventRow}>
              <div className={styles.eventInfo}>
                <span className={styles.eventName}>{ev.ten}</span>
                <span className={styles.eventMeta}>
                  {formatNhomTuoi(ev.nhomTuoi)} ·{" "}
                  {ev.gioiTinh === "nam"
                    ? "Nam"
                    : ev.gioiTinh === "nu"
                      ? "Nữ"
                      : "Hỗn hợp"}{" "}
                  · {ev.hinhThucThi === "doi" ? "Đội" : "Cá nhân"}
                  {ev.hangCan ? ` · ${ev.hangCan}kg` : ""}
                  {ev.thoiGianBaiGiay ? ` · ${ev.thoiGianBaiGiay}s` : ""}
                </span>
              </div>
              <div className={styles.eventRowActions}>
                <button onClick={() => onEdit(ev)} aria-label={`Sửa ${ev.ten}`}>
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => onDelete(ev)}
                  aria-label={`Xóa ${ev.ten}`}
                  className={styles.dangerBtn}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
