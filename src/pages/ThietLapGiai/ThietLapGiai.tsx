/** @format */

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type {
  CompetitionEvent,
  EventKind,
  GioiTinh,
  Tournament,
} from "../../types";
import Modal from "../../components/Modal/Modal";
import { loadEvents, saveEvents, subscribeEvents } from "../../lib/eventsStore";
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

const NHOM_TUOI_OPTIONS = [1, 2, 3];
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
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>(EMPTY_EVENT_FORM);

  useEffect(() => {
    loadEvents()
      .then(setEvents)
      .finally(() => setLoadingEvents(false));
    return subscribeEvents(setEvents);
  }, []);

  const toggleLoaiThi = (value: EventKind) => {
    setForm((prev) => ({
      ...prev,
      loaiThi: prev.loaiThi.includes(value)
        ? prev.loaiThi.filter((v) => v !== value)
        : [...prev.loaiThi, value],
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // TODO: gọi API khi có backend
    console.log("Lưu giải:", form);
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
    });
    setShowEventModal(true);
  };

  const submitEvent = (e: FormEvent) => {
    e.preventDefault();
    const next = editingEventId
      ? events.map((ev) =>
          ev.id === editingEventId ? { ...ev, ...eventForm } : ev,
        )
      : [
          { id: crypto.randomUUID(), tournamentId: "demo", ...eventForm },
          ...events,
        ];
    setEvents(next);
    saveEvents(next);
    setShowEventModal(false);
  };

  const deleteEvent = (ev: CompetitionEvent) => {
    if (
      !window.confirm(
        `Xóa nội dung "${ev.ten}"? Các đoàn đã đăng ký VĐV vào nội dung này sẽ không còn thấy được nữa. Không thể hoàn tác.`,
      )
    )
      return;
    const next = events.filter((x) => x.id !== ev.id);
    setEvents(next);
    saveEvents(next);
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
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={openAddEvent}>
            <Plus size={16} /> Thêm nội dung
          </button>
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
            <button type="submit" className={styles.btnPrimary}>
              {editingEventId ? "Lưu" : "Thêm"}
            </button>
          </form>
        </Modal>
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
