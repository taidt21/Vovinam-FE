/** @format */

import { useEffect, useState, type FormEvent } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Search,
  X,
  Save,
} from "lucide-react";
import type {
  CompetitionEvent,
  EventKind,
  GioiTinh,
  Tournament,
} from "../../types";
import Modal from "../../components/Modal/Modal";
import { apiGet, apiPut, apiDelete } from "../../lib/api/api";
import { fetchEvents, createEvent, updateEvent } from "../../lib/api/eventsApi";
import {
  EVENT_NHOM_TUOI_OPTIONS,
  formatEventNhomTuoi,
  compareNhomTuoi,
} from "../../lib/utils/nhomTuoi";
import ImportEventsExcelModal from "../../components/ImportEventsExcelModal/ImportEventsExcelModal";
import BanThuKyAccountsSection from "../../components/BanThuKyAccountsSection/BanThuKyAccountsSection";
import type { EventImportRow } from "../../lib/excel/eventExcelImport";
import styles from "./ThietLapGiai.module.scss";

type EventFormState = Omit<CompetitionEvent, "id" | "tournamentId">;
const EMPTY_EVENT_FORM: EventFormState = {
  ten: "",
  loai: "doi_khang",
  gioiTinh: "nam",
  nhomTuoi: EVENT_NHOM_TUOI_OPTIONS[0],
  hinhThucThi: "ca_nhan",
  hangCan: undefined,
  loaiHangCan: "dung_can",
  thoiGianBaiGiay: undefined,
};

export default function ThietLapGiai() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [form, setForm] = useState({
    ten: "",
    soSan: 1,
    choPhepHiepPhu: false,
    heSoVang: 50,
    heSoBac: 20,
    heSoDong: 10,
  });
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

  const [activeEventTab, setActiveEventTab] = useState<EventKind>("doi_khang");
  const [eventSearch, setEventSearch] = useState("");
  const [nhomTuoiFilter, setNhomTuoiFilter] = useState("all");
  const [gioiTinhFilter, setGioiTinhFilter] = useState("all");

  useEffect(() => {
    apiGet<Tournament>("/tournament")
      .then((t) => {
        setTournament(t);
        setForm({
          ten: t.ten,
          soSan: t.soSan,
          choPhepHiepPhu: t.choPhepHiepPhu,
          heSoVang: t.heSoVang,
          heSoBac: t.heSoBac,
          heSoDong: t.heSoDong,
        });
      })
      .catch(() =>
        setLoadError(
          "Không tải được thông tin giải — kiểm tra backend đã chạy chưa",
        ),
      );

    fetchEvents()
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
    setEventForm({
      ...EMPTY_EVENT_FORM,
      loai: activeEventTab,
      hangCan:
        activeEventTab === "doi_khang" ? EMPTY_EVENT_FORM.hangCan : undefined,
      thoiGianBaiGiay:
        activeEventTab === "quyen"
          ? EMPTY_EVENT_FORM.thoiGianBaiGiay
          : undefined,
    });
    setShowEventModal(true);
  };

  const openEditEvent = (ev: CompetitionEvent) => {
    setEditingEventId(ev.id);
    setEventForm({
      ten: ev.ten,
      loai: ev.loai,
      gioiTinh: ev.gioiTinh,
      nhomTuoi: ev.nhomTuoi,
      hinhThucThi: ev.loai === "doi_khang" ? "ca_nhan" : ev.hinhThucThi,
      hangCan: ev.hangCan,
      loaiHangCan: ev.loaiHangCan ?? "dung_can",
      thoiGianBaiGiay: ev.thoiGianBaiGiay,
    });
    setShowEventModal(true);
  };

  const submitEvent = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingEvent(true);
    try {
      if (editingEventId) {
        await updateEvent(editingEventId, eventForm);
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === editingEventId ? { ...ev, ...eventForm } : ev,
          ),
        );
      } else {
        const created = await createEvent(eventForm);
        setEvents((prev) => [created, ...prev]);
      }
      setActiveEventTab(eventForm.loai);
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
        const created = await createEvent({
          ten: r.ten,
          loai: r.loai!,
          gioiTinh: r.gioiTinh!,
          hinhThucThi: r.hinhThucThi,
          nhomTuoi: r.nhomTuoi!,
          hangCan: r.hangCan ?? undefined,
          thoiGianBaiGiay: r.thoiGianBaiGiay ?? undefined,
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
    .sort(
      (a, b) =>
        compareNhomTuoi(a.nhomTuoi, b.nhomTuoi) ||
        a.ten.localeCompare(b.ten, "vi"),
    );
  const doiKhangEvents = [...events]
    .filter((e) => e.loai === "doi_khang")
    .sort(
      (a, b) =>
        compareNhomTuoi(a.nhomTuoi, b.nhomTuoi) ||
        (a.hangCan ?? 0) - (b.hangCan ?? 0),
    );

  const nhomTuoiFilters = Array.from(
    new Set(events.map((e) => e.nhomTuoi)),
  ).sort(compareNhomTuoi);
  const activeEvents =
    activeEventTab === "doi_khang" ? doiKhangEvents : quyenEvents;
  const normalizedSearch = eventSearch.trim().toLocaleLowerCase("vi");
  const filteredEvents = activeEvents.filter((ev) => {
    if (nhomTuoiFilter !== "all" && String(ev.nhomTuoi) !== nhomTuoiFilter)
      return false;
    if (gioiTinhFilter !== "all" && ev.gioiTinh !== gioiTinhFilter)
      return false;
    if (!normalizedSearch) return true;

    const searchable = [
      ev.ten,
      formatEventNhomTuoi(ev.nhomTuoi),
      gioiTinhLabel(ev.gioiTinh),
      hinhThucLabel(ev.hinhThucThi),
      ev.hangCan ? `${ev.hangCan}kg` : "",
      ev.thoiGianBaiGiay ? `${ev.thoiGianBaiGiay}s` : "",
    ]
      .join(" ")
      .toLocaleLowerCase("vi");
    return searchable.includes(normalizedSearch);
  });

  const hasEventFilters =
    eventSearch.trim() !== "" ||
    nhomTuoiFilter !== "all" ||
    gioiTinhFilter !== "all";

  const clearEventFilters = () => {
    setEventSearch("");
    setNhomTuoiFilter("all");
    setGioiTinhFilter("all");
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Thiết lập giải</h1>

      {loadError && <p className={styles.errorBanner}>{loadError}</p>}

      <form
        className={`${styles.card} ${styles.tournamentCard}`}
        onSubmit={handleSubmitTournament}>
        <div className={styles.tournamentHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Cấu hình chung</span>
            <h2 className={styles.tournamentTitle}>Thông tin giải đấu</h2>
            <p className={styles.tournamentIntro}>
              Thiết lập thông tin cơ bản, luật thi đấu và hệ số tính điểm tổng
              đoàn. Các thay đổi chỉ có hiệu lực sau khi bấm Lưu.
            </p>
          </div>
          {tournament && (
            <div className={styles.savedBadge}>
              <span className={styles.savedDot} />
              Đã có cấu hình
            </div>
          )}
        </div>

        <div className={styles.tournamentContent}>
          <section className={styles.settingSection}>
            <div className={styles.settingSectionHead}>
              <div>
                <span className={styles.settingIndex}>01</span>
                <div>
                  <h3>Thông tin cơ bản</h3>
                  <p>Tên hiển thị của giải và số sân/thảm được sử dụng.</p>
                </div>
              </div>
            </div>

            <div className={styles.basicInfoGrid}>
              <label
                className={`${styles.field} ${styles.tournamentNameField}`}>
                <span className={styles.fieldLabel}>
                  Tên giải <span className={styles.required}>*</span>
                </span>
                <input
                  className={styles.largeInput}
                  type="text"
                  value={form.ten}
                  onChange={(e) => setForm({ ...form, ten: e.target.value })}
                  placeholder="VD: Giải Vovinam Trẻ Toàn quốc 2026"
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  Số sân / thảm <span className={styles.required}>*</span>
                </span>
                <div className={styles.courtInputWrap}>
                  <input
                    className={styles.largeInput}
                    type="number"
                    min={1}
                    value={form.soSan}
                    onChange={(e) =>
                      setForm({ ...form, soSan: Number(e.target.value) })
                    }
                    required
                  />
                  <span className={styles.inputSuffix}>sân</span>
                </div>
              </label>
            </div>
          </section>

          <section className={styles.settingSection}>
            <div className={styles.settingSectionHead}>
              <div>
                <span className={styles.settingIndex}>02</span>
                <div>
                  <h3>Luật thi đấu đối kháng</h3>
                  <p>
                    Thiết lập cách xử lý khi hai VĐV hoà điểm sau hiệp cuối.
                  </p>
                </div>
              </div>
            </div>

            <label className={styles.ruleOption}>
              <div className={styles.ruleOptionMain}>
                <input
                  className={styles.ruleCheckbox}
                  type="checkbox"
                  checked={form.choPhepHiepPhu}
                  onChange={(e) =>
                    setForm({ ...form, choPhepHiepPhu: e.target.checked })
                  }
                />
                <span className={styles.switchVisual} aria-hidden="true">
                  <span />
                </span>
                <div>
                  <strong>Cho phép hiệp phụ điểm vàng</strong>
                  <span>
                    Khi hoà điểm, thi thêm một hiệp bằng thời lượng hiệp chính;
                    VĐV ghi điểm trước sẽ thắng ngay.
                  </span>
                </div>
              </div>
              <span
                className={`${styles.ruleStatus} ${
                  form.choPhepHiepPhu ? styles.ruleStatusOn : ""
                }`}>
                {form.choPhepHiepPhu ? "Đang bật" : "Đang tắt"}
              </span>
            </label>

            {!form.choPhepHiepPhu && (
              <p className={styles.ruleFallback}>
                Khi tắt, nếu hoà điểm thì Bàn thư ký sẽ chọn người thắng theo
                quy định áp dụng tại thời điểm thi đấu.
              </p>
            )}
          </section>

          <section className={styles.settingSection}>
            <div className={styles.settingSectionHead}>
              <div>
                <span className={styles.settingIndex}>03</span>
                <div>
                  <h3>Hệ số tổng sắp huy chương</h3>
                  <p>
                    Điểm đoàn = số huy chương × hệ số tương ứng. Có thể thay đổi
                    theo điều lệ từng giải.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.medalCoefficientGrid}>
              <label
                className={`${styles.medalCoefficient} ${styles.medalGold}`}>
                <span className={styles.medalLabel}>
                  <strong>HCV</strong>
                  <span>Huy chương vàng</span>
                </span>
                <div className={styles.coefficientInput}>
                  <input
                    type="number"
                    min={0}
                    aria-label="Hệ số HCV"
                    value={form.heSoVang}
                    onChange={(e) =>
                      setForm({ ...form, heSoVang: Number(e.target.value) })
                    }
                  />
                  <span>điểm</span>
                </div>
              </label>

              <label
                className={`${styles.medalCoefficient} ${styles.medalSilver}`}>
                <span className={styles.medalLabel}>
                  <strong>HCB</strong>
                  <span>Huy chương bạc</span>
                </span>
                <div className={styles.coefficientInput}>
                  <input
                    type="number"
                    min={0}
                    aria-label="Hệ số HCB"
                    value={form.heSoBac}
                    onChange={(e) =>
                      setForm({ ...form, heSoBac: Number(e.target.value) })
                    }
                  />
                  <span>điểm</span>
                </div>
              </label>

              <label
                className={`${styles.medalCoefficient} ${styles.medalBronze}`}>
                <span className={styles.medalLabel}>
                  <strong>HCĐ</strong>
                  <span>Huy chương đồng</span>
                </span>
                <div className={styles.coefficientInput}>
                  <input
                    type="number"
                    min={0}
                    aria-label="Hệ số HCĐ"
                    value={form.heSoDong}
                    onChange={(e) =>
                      setForm({ ...form, heSoDong: Number(e.target.value) })
                    }
                  />
                  <span>điểm</span>
                </div>
              </label>
            </div>

            <div className={styles.formulaPreview}>
              <span>Công thức hiện tại</span>
              <strong>
                HCV × {form.heSoVang} + HCB × {form.heSoBac} + HCĐ ×{" "}
                {form.heSoDong}
              </strong>
            </div>
          </section>
        </div>

        <div className={styles.tournamentFooter}>
          <div className={styles.savedSummary}>
            {tournament ? (
              <>
                <span className={styles.savedDot} />
                <span>
                  Đã lưu: <strong>{tournament.ten}</strong> · {tournament.soSan}{" "}
                  sân
                </span>
              </>
            ) : (
              <span>Chưa có cấu hình giải được lưu.</span>
            )}
          </div>

          <button
            type="submit"
            className={`${styles.btnPrimary} ${styles.saveTournamentBtn}`}
            disabled={savingTournament}>
            <Save size={16} />
            {savingTournament ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </div>
      </form>

      <BanThuKyAccountsSection soSan={form.soSan} />

      <section className={`${styles.card} ${styles.eventsCard}`}>
        <div className={styles.eventsHead}>
          <div>
            <div className={styles.eventsTitleRow}>
              <h2 className={styles.cardTitle}>Nội dung thi đấu</h2>
              <span className={styles.totalBadge}>
                {events.length} nội dung
              </span>
            </div>
            <p className={styles.eventsNote}>
              Quản lý nội dung, hạng cân và nhóm tuổi mà các đoàn được phép đăng
              ký. Đối kháng và Quyền được trình bày riêng để dễ kiểm tra.
            </p>
          </div>
          <div className={styles.eventsActions}>
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
              <Plus size={16} />
              {activeEventTab === "doi_khang" ? "Thêm Đối kháng" : "Thêm Quyền"}
            </button>
          </div>
        </div>

        <div
          className={styles.eventTabs}
          role="tablist"
          aria-label="Loại nội dung">
          <button
            type="button"
            role="tab"
            aria-selected={activeEventTab === "doi_khang"}
            className={`${styles.eventTab} ${
              activeEventTab === "doi_khang" ? styles.eventTabActive : ""
            }`}
            onClick={() => setActiveEventTab("doi_khang")}>
            <span>Đối kháng</span>
            <strong>{doiKhangEvents.length}</strong>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeEventTab === "quyen"}
            className={`${styles.eventTab} ${
              activeEventTab === "quyen" ? styles.eventTabActive : ""
            }`}
            onClick={() => setActiveEventTab("quyen")}>
            <span>Quyền</span>
            <strong>{quyenEvents.length}</strong>
          </button>
        </div>

        <div className={styles.eventToolbar}>
          <label className={styles.searchBox}>
            <Search size={17} aria-hidden="true" />
            <input
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              placeholder={
                activeEventTab === "doi_khang"
                  ? "Tìm tên hoặc hạng cân..."
                  : "Tìm tên bài quyền..."
              }
              aria-label="Tìm nội dung"
            />
          </label>

          <select
            className={styles.filterSelect}
            value={nhomTuoiFilter}
            onChange={(e) => setNhomTuoiFilter(e.target.value)}
            aria-label="Lọc theo nhóm tuổi">
            <option value="all">Tất cả nhóm tuổi</option>
            {nhomTuoiFilters.map((nt) => (
              <option key={String(nt)} value={String(nt)}>
                {formatEventNhomTuoi(nt)}
              </option>
            ))}
          </select>

          <select
            className={styles.filterSelect}
            value={gioiTinhFilter}
            onChange={(e) => setGioiTinhFilter(e.target.value)}
            aria-label="Lọc theo giới tính">
            <option value="all">Tất cả giới tính</option>
            <option value="nam">Nam</option>
            <option value="nu">Nữ</option>
            <option value="hon_hop">Hỗn hợp</option>
          </select>

          {hasEventFilters && (
            <button
              type="button"
              className={styles.clearFiltersBtn}
              onClick={clearEventFilters}>
              <X size={15} /> Xóa lọc
            </button>
          )}
        </div>

        <div className={styles.resultSummary}>
          <span>
            Hiển thị <strong>{filteredEvents.length}</strong> /{" "}
            {activeEvents.length} nội dung
          </span>
          {activeEventTab === "doi_khang" && activeEvents.length > 0 && (
            <span>Ưu tiên theo nhóm tuổi, giới tính và hạng cân</span>
          )}
          {activeEventTab === "quyen" && activeEvents.length > 0 && (
            <span>Danh sách gọn theo nhóm tuổi và tên bài</span>
          )}
        </div>

        {loadingEvents ? (
          <div className={styles.emptyState}>
            Đang tải danh sách nội dung...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>Không tìm thấy nội dung phù hợp</strong>
            <span>Thử đổi từ khóa hoặc bộ lọc đang chọn.</span>
            {hasEventFilters && (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={clearEventFilters}>
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : activeEventTab === "doi_khang" ? (
          <DoiKhangEventList
            events={filteredEvents}
            onEdit={openEditEvent}
            onDelete={deleteEvent}
          />
        ) : (
          <QuyenEventList
            events={filteredEvents}
            onEdit={openEditEvent}
            onDelete={deleteEvent}
          />
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
                    hinhThucThi:
                      e.target.value === "doi_khang"
                        ? "ca_nhan"
                        : eventForm.hinhThucThi,
                  })
                }>
                <option value="doi_khang">Đối kháng</option>
                <option value="quyen">Quyền</option>
              </select>
            </label>
            {eventForm.loai === "quyen" && (
              <label className={styles.field}>
                <span>Hình thức thi</span>
                <select
                  value={eventForm.hinhThucThi ?? "ca_nhan"}
                  onChange={(e) => {
                    const v = e.target.value as "ca_nhan" | "doi";
                    setEventForm({
                      ...eventForm,
                      hinhThucThi: v,
                      gioiTinh:
                        v === "ca_nhan" && eventForm.gioiTinh === "hon_hop"
                          ? "nam"
                          : eventForm.gioiTinh,
                    });
                  }}>
                  <option value="ca_nhan">Cá nhân</option>
                  <option value="doi">Đội</option>
                </select>
              </label>
            )}
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
                {eventForm.hinhThucThi === "doi" && (
                  <option value="hon_hop">Hỗn hợp nam nữ</option>
                )}
              </select>
              {eventForm.hinhThucThi === "doi" &&
                eventForm.gioiTinh === "hon_hop" && (
                  <span className={styles.fieldHint}>
                    Đội được phép có cả VĐV nam lẫn nữ cùng thi đấu chung 1 đội.
                  </span>
                )}
            </label>
            <label className={styles.field}>
              <span>Nhóm tuổi</span>
              <select
                value={eventForm.nhomTuoi}
                onChange={(e) => {
                  const v = e.target.value;
                  setEventForm({
                    ...eventForm,
                    nhomTuoi: v === "hon_hop" ? "hon_hop" : Number(v),
                  });
                }}>
                {EVENT_NHOM_TUOI_OPTIONS.map((nt) => (
                  <option key={nt} value={nt}>
                    {formatEventNhomTuoi(nt)}
                  </option>
                ))}
              </select>
              {eventForm.nhomTuoi === "hon_hop" && (
                <span className={styles.fieldHint}>
                  {eventForm.hinhThucThi === "doi"
                    ? "Đội được phép có VĐV thuộc nhiều nhóm tuổi khác nhau cùng thi đấu chung 1 đội."
                    : "Nội dung mở cho VĐV thuộc nhiều nhóm tuổi khác nhau cùng đăng ký."}
                </span>
              )}
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
            {eventForm.loai === "doi_khang" && (
              <label className={styles.field}>
                <span>Loại hạng cân</span>
                <select
                  value={eventForm.loaiHangCan ?? "dung_can"}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      loaiHangCan: e.target.value as
                        | "dung_can"
                        | "duoi"
                        | "tren",
                    })
                  }>
                  <option value="dung_can">Đúng cân</option>
                  <option value="duoi">Dưới</option>
                  <option value="tren">Trên</option>
                </select>
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

      <ResetAllDangerZone />

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

function gioiTinhLabel(gioiTinh: CompetitionEvent["gioiTinh"]): string {
  return gioiTinh === "nam" ? "Nam" : gioiTinh === "nu" ? "Nữ" : "Hỗn hợp";
}

// Tên nội dung thường theo khuôn "Đối kháng <giới tính> - [Dưới/Trên]
// <hạng cân>kg" — đúng những gì thẻ ĐÃ hiện sẵn (badge giới tính ở nhóm
// cha, số cân to ở đầu thẻ có sẵn "Dưới/Trên" từ loaiHangCan) — hiện lại
// y hệt thành dòng phụ bên dưới là lặp vô ích. Chỉ giữ lại phần chữ CÒN
// THỪA sau khi bỏ 2 phần đó (VD ai đó có ghi thêm ghi chú riêng ngoài
// khuôn chuẩn); không còn gì thì ẩn hẳn dòng phụ.
function tenConLai(
  ten: string,
  gioiTinh: CompetitionEvent["gioiTinh"],
  hangCan: number | null | undefined,
  loaiHangCan: CompetitionEvent["loaiHangCan"],
): string {
  const nhan = gioiTinhLabel(gioiTinh);
  let con = ten.replace(
    new RegExp(`^\\s*đối\\s*kháng\\s*${nhan}\\s*[-–—:]?\\s*`, "i"),
    "",
  );
  if (hangCan) {
    const tienTo =
      loaiHangCan === "duoi"
        ? "dưới\\s*"
        : loaiHangCan === "tren"
          ? "trên\\s*"
          : "";
    con = con.replace(
      new RegExp(`^\\s*[-–—:]?\\s*${tienTo}${hangCan}\\s*kg\\s*$`, "i"),
      "",
    );
  }
  return con.trim();
}

function hinhThucLabel(hinhThuc: CompetitionEvent["hinhThucThi"]): string {
  return hinhThuc === "doi" ? "Đội" : "Cá nhân";
}

function groupByNhomTuoi(events: CompetitionEvent[]) {
  return Array.from(new Set(events.map((ev) => ev.nhomTuoi)))
    .sort(compareNhomTuoi)
    .map((nhomTuoi) => ({
      nhomTuoi,
      events: events.filter((ev) => ev.nhomTuoi === nhomTuoi),
    }));
}

function EventActions({
  event,
  onEdit,
  onDelete,
}: {
  event: CompetitionEvent;
  onEdit: (ev: CompetitionEvent) => void;
  onDelete: (ev: CompetitionEvent) => void;
}) {
  return (
    <div className={styles.eventRowActions}>
      <button
        type="button"
        onClick={() => onEdit(event)}
        aria-label={`Sửa ${event.ten}`}
        title="Chỉnh sửa">
        <Pencil size={15} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(event)}
        aria-label={`Xóa ${event.ten}`}
        title="Xóa"
        className={styles.dangerBtn}>
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function DoiKhangEventList({
  events,
  onEdit,
  onDelete,
}: {
  events: CompetitionEvent[];
  onEdit: (ev: CompetitionEvent) => void;
  onDelete: (ev: CompetitionEvent) => void;
}) {
  const genderOrder: CompetitionEvent["gioiTinh"][] = ["nam", "nu", "hon_hop"];

  return (
    <div className={styles.catalogList}>
      {groupByNhomTuoi(events).map(({ nhomTuoi, events: ageEvents }) => (
        <section key={String(nhomTuoi)} className={styles.ageGroup}>
          <div className={styles.ageGroupHeader}>
            <div>
              <span className={styles.ageEyebrow}>Nhóm tuổi</span>
              <h3>{formatEventNhomTuoi(nhomTuoi)}</h3>
            </div>
            <span className={styles.groupCount}>
              {ageEvents.length} nội dung
            </span>
          </div>

          <div className={styles.genderGroups}>
            {genderOrder.map((gender) => {
              const genderEvents = ageEvents
                .filter((ev) => ev.gioiTinh === gender)
                .sort((a, b) => (a.hangCan ?? 0) - (b.hangCan ?? 0));
              if (genderEvents.length === 0) return null;

              return (
                <div key={gender} className={styles.genderGroup}>
                  <div className={styles.genderGroupHeader}>
                    <span
                      className={`${styles.genderBadge} ${
                        gender === "nam"
                          ? styles.genderMale
                          : gender === "nu"
                            ? styles.genderFemale
                            : styles.genderMixed
                      }`}>
                      {gioiTinhLabel(gender)}
                    </span>
                    <span>{genderEvents.length} hạng cân</span>
                  </div>

                  <div className={styles.weightGrid}>
                    {genderEvents.map((ev) => {
                      const conLai = tenConLai(
                        ev.ten,
                        ev.gioiTinh,
                        ev.hangCan,
                        ev.loaiHangCan,
                      );
                      const hangCanPrefix =
                        ev.loaiHangCan === "duoi"
                          ? "Dưới "
                          : ev.loaiHangCan === "tren"
                            ? "Trên "
                            : "";
                      return (
                        <article key={ev.id} className={styles.weightCard}>
                          <div className={styles.weightCardTop}>
                            <strong className={styles.weightValue}>
                              {ev.hangCan
                                ? `${hangCanPrefix}${ev.hangCan} kg`
                                : "Chưa đặt hạng cân"}
                            </strong>
                            <EventActions
                              event={ev}
                              onEdit={onEdit}
                              onDelete={onDelete}
                            />
                          </div>
                          {conLai && (
                            <p
                              className={styles.weightEventName}
                              title={ev.ten}>
                              {conLai}
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function QuyenEventList({
  events,
  onEdit,
  onDelete,
}: {
  events: CompetitionEvent[];
  onEdit: (ev: CompetitionEvent) => void;
  onDelete: (ev: CompetitionEvent) => void;
}) {
  return (
    <div className={styles.catalogList}>
      {groupByNhomTuoi(events).map(({ nhomTuoi, events: ageEvents }) => (
        <section key={String(nhomTuoi)} className={styles.ageGroup}>
          <div className={styles.ageGroupHeader}>
            <div>
              <span className={styles.ageEyebrow}>Nhóm tuổi</span>
              <h3>{formatEventNhomTuoi(nhomTuoi)}</h3>
            </div>
            <span className={styles.groupCount}>
              {ageEvents.length} nội dung
            </span>
          </div>

          <div className={styles.quyenTable}>
            <div className={styles.quyenTableHead} aria-hidden="true">
              <span>Nội dung</span>
              <span>Giới tính</span>
              <span>Hình thức</span>
              <span>Thời gian</span>
              <span />
            </div>
            {ageEvents.map((ev) => (
              <div key={ev.id} className={styles.quyenRow}>
                <div className={styles.quyenNameCell}>
                  <strong>{ev.ten}</strong>
                </div>
                <div data-label="Giới tính">
                  <span
                    className={`${styles.genderBadge} ${
                      ev.gioiTinh === "nam"
                        ? styles.genderMale
                        : ev.gioiTinh === "nu"
                          ? styles.genderFemale
                          : styles.genderMixed
                    }`}>
                    {gioiTinhLabel(ev.gioiTinh)}
                  </span>
                </div>
                <div data-label="Hình thức">
                  <span className={styles.formBadge}>
                    {hinhThucLabel(ev.hinhThucThi)}
                  </span>
                </div>
                <div className={styles.durationCell} data-label="Thời gian">
                  {ev.thoiGianBaiGiay ? `${ev.thoiGianBaiGiay} giây` : "—"}
                </div>
                <EventActions event={ev} onEdit={onEdit} onDelete={onDelete} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const RESET_CONFIRM_PHRASE = "XÓA HẾT";

function ResetAllDangerZone() {
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  const doReset = async () => {
    setResetting(true);
    try {
      await apiDelete("/admin/reset-all");
      window.location.reload();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Reset thất bại — kiểm tra backend đã chạy chưa",
      );
      setResetting(false);
    }
  };

  return (
    <section className={styles.dangerZone}>
      <h2 className={styles.dangerTitle}>Vùng nguy hiểm</h2>
      <p className={styles.dangerDesc}>
        Xóa sạch toàn bộ dữ liệu giải hiện tại — thông tin giải, nội dung, đoàn,
        VĐV, đăng ký, kết quả bốc thăm. Không đụng tới tài khoản đăng nhập của
        cổng đăng ký trưởng đoàn. <strong>Không thể hoàn tác.</strong>
      </p>
      <button
        type="button"
        className={styles.dangerZoneBtn}
        onClick={() => setShowModal(true)}>
        Reset toàn bộ dữ liệu
      </button>

      {showModal && (
        <Modal
          title="Xác nhận xóa sạch dữ liệu"
          onClose={() => setShowModal(false)}>
          <div className={styles.modalForm}>
            <p>
              Thao tác này sẽ xóa <strong>vĩnh viễn</strong>: thông tin giải,
              toàn bộ nội dung/hạng cân/nhóm tuổi, toàn bộ đoàn và VĐV, toàn bộ
              đăng ký, toàn bộ kết quả bốc thăm và thứ tự thi diễn.
            </p>
            <p>
              Gõ đúng <strong>{RESET_CONFIRM_PHRASE}</strong> vào ô dưới để mở
              khóa nút xóa:
            </p>
            <input
              className={styles.confirmInput}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={RESET_CONFIRM_PHRASE}
              autoFocus
            />
            <button
              type="button"
              className={styles.dangerZoneBtn}
              disabled={confirmText !== RESET_CONFIRM_PHRASE || resetting}
              onClick={doReset}>
              {resetting ? "Đang xóa..." : "Tôi hiểu — xóa sạch toàn bộ"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
