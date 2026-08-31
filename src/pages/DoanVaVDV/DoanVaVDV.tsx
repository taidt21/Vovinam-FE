/** @format */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Plus,
  FileSpreadsheet,
  FileDown,
  Search,
  Pencil,
  Trash2,
  UsersRound,
  UserRound,
  ClipboardList,
  X,
} from "lucide-react";
import type { CompetitionEvent, GioiTinh } from "../../types";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/api/api";
import { laAdmin } from "../../lib/api/adminAuth";
import { NHOM_TUOI_OPTIONS } from "../../lib/utils/nhomTuoi";
import Modal from "../../components/Modal/Modal";
import ImportExcelModal from "../../components/ImportExcelModal/ImportExcelModal";
import AthleteAvatar from "../../components/AthleteAvatar/AthleteAvatar";
import type { ImportRow } from "../../lib/excel/excelImport";
import { fetchEvents } from "../../lib/api/eventsApi";
import { formatEventNhomTuoi } from "../../lib/utils/nhomTuoi";
import styles from "./DoanVaVDV.module.scss";

const CURRENT_YEAR = new Date().getFullYear();
const formatNhomTuoi = (n: number) => `${n}`;

interface Team {
  id: string;
  ten: string;
  soVdv: number;
}

interface Athlete {
  id: string;
  hoTen: string;
  namSinh: number;
  gioiTinh: GioiTinh;
  nhomTuoi: number;
  teamId: string;
  eventIds: string[];
  anhDaiDien: string | null;
}

type AthleteFormState = Omit<Athlete, "id">;

const EMPTY_ATHLETE_FORM: AthleteFormState = {
  hoTen: "",
  namSinh: CURRENT_YEAR - 15,
  gioiTinh: "nam",
  nhomTuoi: NHOM_TUOI_OPTIONS[0],
  teamId: "",
  eventIds: [],
  anhDaiDien: null,
};

const PAGE_SIZE = 8;

export default function DoanVaVDV() {
  // Chỉ Admin được thêm/sửa/xoá — Bàn thư ký chỉ xem/tìm kiếm. Backend
  // cũng đã tự chặn (POST/PUT/DELETE các API đoàn & VĐV đều Admin-only),
  // đây chỉ để giao diện không hiện nút vô dụng.
  const coQuyenSua = laAdmin();
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAll = () =>
    Promise.all([
      fetchEvents(),
      apiGet<Team[]>("/dashboard/teams"),
      apiGet<Athlete[]>("/dashboard/athletes"),
    ]).then(([eventsData, teamsData, athletesData]) => {
      setEvents(eventsData);
      setTeams(teamsData);
      setAthletes(athletesData);
    });

  useEffect(() => {
    loadAll()
      .catch(() =>
        setLoadError("Không tải được dữ liệu — kiểm tra backend đã chạy chưa"),
      )
      .finally(() => setLoading(false));
  }, []);

  // Tải lại đúng teams + athletes sau mỗi lần sửa — để cột "số VĐV" mỗi
  // đoàn (soVdv, server tự đếm) luôn khớp thật, không phải tự cộng trừ
  // tay ở phía trình duyệt.
  const reloadTeamsAndAthletes = async () => {
    const [teamsData, athletesData] = await Promise.all([
      apiGet<Team[]>("/dashboard/teams"),
      apiGet<Athlete[]>("/dashboard/athletes"),
    ]);
    setTeams(teamsData);
    setAthletes(athletesData);
  };

  const [search, setSearch] = useState("");
  const [filterTeamId, setFilterTeamId] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [showAddTeam, setShowAddTeam] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamNameInput, setTeamNameInput] = useState("");
  const [submittingTeam, setSubmittingTeam] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  const [submittingAthlete, setSubmittingAthlete] = useState(false);
  const [athleteForm, setAthleteForm] =
    useState<AthleteFormState>(EMPTY_ATHLETE_FORM);

  const teamName = (teamId: string) =>
    teams.find((t) => t.id === teamId)?.ten ?? "—";
  const eventName = (eventId: string) =>
    events.find((e) => e.id === eventId)?.ten ?? "—";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return athletes.filter((a) => {
      const matchTeam = filterTeamId === "all" || a.teamId === filterTeamId;
      if (!matchTeam) return false;
      if (!q) return true;

      const gioiTinhLabel = a.gioiTinh === "nam" ? "nam" : "nữ";
      const eventNames = a.eventIds.map(eventName).join(" ");
      const haystack = [
        a.hoTen,
        String(a.namSinh),
        gioiTinhLabel,
        formatNhomTuoi(a.nhomTuoi),
        teamName(a.teamId),
        eventNames,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athletes, search, filterTeamId, teams, events]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleTeamFilter = (teamId: string) => {
    setFilterTeamId((prev) => (prev === teamId ? "all" : teamId));
    setPage(1);
  };

  const openAddAthlete = () => {
    setEditingId(null);
    setAthleteForm(EMPTY_ATHLETE_FORM);
    setShowAddAthlete(true);
  };

  const openEditAthlete = (athlete: Athlete) => {
    setEditingId(athlete.id);
    setAthleteForm({
      hoTen: athlete.hoTen,
      namSinh: athlete.namSinh,
      gioiTinh: athlete.gioiTinh,
      nhomTuoi: athlete.nhomTuoi,
      teamId: athlete.teamId,
      eventIds: athlete.eventIds,
      anhDaiDien: athlete.anhDaiDien ?? null,
    });
    setShowAddAthlete(true);
  };

  const toggleEventIdInForm = (eventId: string) => {
    setAthleteForm((prev) => ({
      ...prev,
      eventIds: prev.eventIds.includes(eventId)
        ? prev.eventIds.filter((id) => id !== eventId)
        : [...prev.eventIds, eventId],
    }));
  };

  const submitAthlete = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingAthlete(true);
    try {
      if (editingId)
        await apiPut(`/dashboard/athletes/${editingId}`, athleteForm);
      else await apiPost("/dashboard/athletes", athleteForm);
      await reloadTeamsAndAthletes();
      setShowAddAthlete(false);
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Lưu VĐV thất bại — kiểm tra backend đã chạy chưa",
      );
    } finally {
      setSubmittingAthlete(false);
    }
  };

  const deleteAthlete = async (a: Athlete) => {
    if (!window.confirm(`Xóa VĐV "${a.hoTen}"? Không thể hoàn tác.`)) return;
    try {
      await apiDelete(`/dashboard/athletes/${a.id}`);
      await reloadTeamsAndAthletes();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Xóa VĐV thất bại");
    }
  };

  const openAddTeam = () => {
    setEditingTeamId(null);
    setTeamNameInput("");
    setShowAddTeam(true);
  };

  const openEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setTeamNameInput(team.ten);
    setShowAddTeam(true);
  };

  const submitTeam = async (e: FormEvent) => {
    e.preventDefault();
    const ten = teamNameInput.trim();
    if (!ten) return;
    setSubmittingTeam(true);
    try {
      if (editingTeamId)
        await apiPut(`/dashboard/teams/${editingTeamId}`, { ten });
      else await apiPost("/dashboard/teams", { ten });
      await reloadTeamsAndAthletes();
      setTeamNameInput("");
      setShowAddTeam(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Lưu đoàn thất bại");
    } finally {
      setSubmittingTeam(false);
    }
  };

  const deleteTeam = async (t: Team) => {
    if (t.soVdv > 0) {
      window.alert(
        `Không thể xóa "${t.ten}" — còn ${t.soVdv} VĐV thuộc đoàn này. Xóa hoặc chuyển đoàn cho các VĐV đó trước.`,
      );
      return;
    }
    if (!window.confirm(`Xóa đoàn "${t.ten}"? Không thể hoàn tác.`)) return;
    try {
      await apiDelete(`/dashboard/teams/${t.id}`);
      await reloadTeamsAndAthletes();
      if (filterTeamId === t.id) setFilterTeamId("all");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Xóa đoàn thất bại");
    }
  };

  // Excel: đoàn nào chưa tồn tại phải TẠO TRƯỚC để có id thật từ server,
  // rồi mới tạo VĐV tham chiếu đúng id đó — khác hẳn bản cũ (tự sinh
  // crypto.randomUUID() tại chỗ, không cần chờ ai cả).
  const handleImportConfirm = async (validRows: ImportRow[]) => {
    setImporting(true);
    try {
      const idByTeamName = new Map(
        teams.map((t) => [t.ten.trim().toLowerCase(), t.id]),
      );

      const newTeamNames = Array.from(
        new Set(
          validRows
            .map((r) => r.donVi.trim())
            .filter((name) => name && !idByTeamName.has(name.toLowerCase())),
        ),
      );
      for (const name of newTeamNames) {
        const created = await apiPost<Team>("/dashboard/teams", { ten: name });
        idByTeamName.set(name.toLowerCase(), created.id);
      }

      for (const r of validRows) {
        const teamId = idByTeamName.get(r.donVi.trim().toLowerCase());
        if (!teamId) continue;
        await apiPost("/dashboard/athletes", {
          hoTen: r.hoTen,
          namSinh: r.namSinh,
          gioiTinh: r.gioiTinh,
          nhomTuoi:
            parseInt(r.nhomTuoi.replace(/[^0-9]/g, ""), 10) ||
            NHOM_TUOI_OPTIONS[0],
          teamId,
          eventIds: r.eventIds,
          anhDaiDien: r.anhDaiDien || null,
        });
      }

      await reloadTeamsAndAthletes();
      setShowImportModal(false);
    } catch (err) {
      window.alert(
        err instanceof Error
          ? `Import gặp lỗi giữa chừng: ${err.message} — 1 số dòng có thể đã được tạo, kiểm tra lại danh sách trước khi import lại.`
          : "Import thất bại",
      );
    } finally {
      setImporting(false);
    }
  };

  const activeTeam =
    filterTeamId === "all" ? null : teams.find((t) => t.id === filterTeamId);
  const registeredAthletes = athletes.filter(
    (a) => a.eventIds.length > 0,
  ).length;
  const totalRegistrations = athletes.reduce(
    (sum, athlete) => sum + athlete.eventIds.length,
    0,
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Đang tải dữ liệu...</p>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>{loadError}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageIntro}>
          <span className={styles.pageEyebrow}>Quản lý lực lượng tham dự</span>
          <h1 className={styles.title}>Đoàn & vận động viên</h1>
          <p className={styles.pageSubtitle}>
            Theo dõi đoàn tham dự, hồ sơ VĐV và các nội dung đã đăng ký trong
            một màn hình.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.btnGhost}
            onClick={() => window.open("/dashboard/in-the-vdv", "_blank")}>
            <FileDown size={17} /> In thẻ VĐV
          </button>
          {coQuyenSua && (
            <>
              <button
                className={styles.btnGhost}
                onClick={() => setShowImportModal(true)}>
                <FileSpreadsheet size={17} /> Import Excel
              </button>
              <button className={styles.btnPrimary} onClick={openAddAthlete}>
                <Plus size={17} /> Thêm VĐV
              </button>
            </>
          )}
        </div>
      </header>

      <section className={styles.summaryGrid} aria-label="Tổng quan">
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <UsersRound size={20} />
          </span>
          <div>
            <strong>{teams.length}</strong>
            <span>Đoàn tham dự</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <UserRound size={20} />
          </span>
          <div>
            <strong>{athletes.length}</strong>
            <span>Vận động viên</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <ClipboardList size={20} />
          </span>
          <div>
            <strong>{totalRegistrations}</strong>
            <span>Lượt đăng ký nội dung</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <ClipboardList size={20} />
          </span>
          <div>
            <strong>{registeredAthletes}</strong>
            <span>VĐV đã có nội dung</span>
          </div>
        </div>
      </section>

      <section className={styles.teamsCard}>
        <div className={styles.teamsHeader}>
          <div>
            <div className={styles.sectionTitleRow}>
              <h2 className={styles.teamsTitle}>Đoàn tham dự</h2>
              <span className={styles.teamsCount}>{teams.length} đoàn</span>
            </div>
            <p className={styles.sectionNote}>
              Bấm vào một đoàn để lọc nhanh danh sách VĐV bên dưới.
            </p>
          </div>
          {coQuyenSua && (
            <button className={styles.btnGhost} onClick={openAddTeam}>
              <Plus size={16} /> Thêm đoàn
            </button>
          )}
        </div>

        <div className={styles.teamsList}>
          {teams.map((t) => (
            <div
              key={t.id}
              className={`${styles.teamChip} ${
                filterTeamId === t.id ? styles.teamChipActive : ""
              }`}>
              <button
                type="button"
                className={styles.teamChipMain}
                onClick={() => toggleTeamFilter(t.id)}
                title="Bấm để lọc VĐV theo đoàn này">
                <span className={styles.teamInitial} aria-hidden="true">
                  {t.ten.trim().charAt(0).toUpperCase()}
                </span>
                <span className={styles.teamChipText}>
                  <span className={styles.teamChipName}>{t.ten}</span>
                  <span className={styles.teamChipCount}>{t.soVdv} VĐV</span>
                </span>
              </button>
              {coQuyenSua && (
                <div className={styles.teamChipActions}>
                  <button
                    type="button"
                    className={styles.teamChipEdit}
                    onClick={() => openEditTeam(t)}
                    aria-label={`Sửa tên đoàn ${t.ten}`}
                    title="Sửa tên đoàn">
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className={styles.teamChipDelete}
                    onClick={() => deleteTeam(t)}
                    aria-label={`Xóa đoàn ${t.ten}`}
                    title="Xóa đoàn">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {teams.length === 0 && (
            <div className={styles.teamsEmpty}>
              <UsersRound size={22} />
              <span>Chưa có đoàn nào</span>
            </div>
          )}
        </div>
      </section>

      <section className={styles.athleteSection}>
        <div className={styles.athleteSectionHead}>
          <div>
            <div className={styles.sectionTitleRow}>
              <h2>Danh sách vận động viên</h2>
              <span className={styles.resultBadge}>{filtered.length} VĐV</span>
            </div>
            <p className={styles.sectionNote}>
              {activeTeam
                ? `Đang lọc theo đoàn ${activeTeam.ten}.`
                : "Tìm theo tên, năm sinh, đơn vị hoặc nội dung đăng ký."}
            </p>
          </div>
          {activeTeam && (
            <button
              type="button"
              className={styles.clearTeamBtn}
              onClick={() => {
                setFilterTeamId("all");
                setPage(1);
              }}>
              <X size={15} /> Bỏ lọc đoàn
            </button>
          )}
        </div>

        <div className={styles.filters}>
          <label className={styles.searchBox}>
            <Search size={18} />
            <input
              placeholder="Tìm VĐV, năm sinh, nhóm tuổi, đơn vị, nội dung..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Tìm vận động viên"
            />
            {search && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                aria-label="Xóa từ khóa tìm kiếm">
                <X size={15} />
              </button>
            )}
          </label>
          <select
            className={styles.teamFilter}
            value={filterTeamId}
            onChange={(e) => {
              setFilterTeamId(e.target.value);
              setPage(1);
            }}>
            <option value="all">Tất cả đoàn</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.ten}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.card}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Vận động viên</th>
                  <th>Thông tin</th>
                  <th>Đoàn</th>
                  <th>Nội dung đăng ký</th>
                  <th className={styles.actionHead}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className={styles.athleteIdentity}>
                        <AthleteAvatar
                          name={a.hoTen}
                          photoUrl={a.anhDaiDien}
                          size={40}
                        />
                        <div>
                          <strong className={styles.athleteName}>
                            {a.hoTen}
                          </strong>
                          <span className={styles.athleteYear}>
                            Sinh năm {a.namSinh}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.metaBadges}>
                        <span
                          className={`${styles.metaBadge} ${
                            a.gioiTinh === "nam"
                              ? styles.genderMale
                              : styles.genderFemale
                          }`}>
                          {a.gioiTinh === "nam" ? "Nam" : "Nữ"}
                        </span>
                        <span className={styles.metaBadge}>
                          Nhóm {formatNhomTuoi(a.nhomTuoi)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.teamLink}
                        onClick={() => toggleTeamFilter(a.teamId)}
                        title="Lọc theo đoàn này">
                        {teamName(a.teamId)}
                      </button>
                    </td>
                    <td>
                      {a.eventIds.length > 0 ? (
                        <div className={styles.noiDungList}>
                          {a.eventIds.map((eid) => (
                            <span key={eid} className={styles.noiDungChip}>
                              {eventName(eid)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className={styles.noEvent}>Chưa đăng ký</span>
                      )}
                    </td>
                    <td className={styles.rowActions}>
                      {coQuyenSua ? (
                        <>
                          <button
                            className={styles.editAction}
                            onClick={() => openEditAthlete(a)}
                            title={`Sửa ${a.hoTen}`}>
                            <Pencil size={15} />
                            <span>Sửa</span>
                          </button>
                          <button
                            onClick={() => deleteAthlete(a)}
                            className={styles.deleteAction}
                            title={`Xóa ${a.hoTen}`}>
                            <Trash2 size={15} />
                            <span>Xóa</span>
                          </button>
                        </>
                      ) : (
                        <span className={styles.readOnlyText}>Chỉ xem</span>
                      )}
                    </td>
                  </tr>
                ))}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      <div className={styles.emptyState}>
                        <Search size={24} />
                        <strong>Không có VĐV phù hợp</strong>
                        <span>Thử đổi từ khóa hoặc bỏ bộ lọc đoàn.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <span>
              Hiển thị {pageItems.length ? (page - 1) * PAGE_SIZE + 1 : 0}–
              {(page - 1) * PAGE_SIZE + pageItems.length} của {filtered.length}
            </span>
            <div className={styles.pageBtns}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Trang trước">
                ‹
              </button>
              <span>
                Trang <strong>{page}</strong> / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Trang sau">
                ›
              </button>
            </div>
          </div>
        </div>
      </section>
      {showAddTeam && (
        <Modal
          title={editingTeamId ? "Sửa tên đoàn" : "Thêm đoàn"}
          onClose={() => setShowAddTeam(false)}>
          <form onSubmit={submitTeam} className={styles.modalForm}>
            <label className={styles.field}>
              <span>Tên đoàn</span>
              <input
                value={teamNameInput}
                onChange={(e) => setTeamNameInput(e.target.value)}
                autoFocus
                required
              />
            </label>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={submittingTeam}>
              {submittingTeam ? "Đang lưu..." : editingTeamId ? "Lưu" : "Thêm"}
            </button>
          </form>
        </Modal>
      )}

      {showAddAthlete && (
        <Modal
          title={editingId ? "Sửa VĐV" : "Thêm VĐV"}
          onClose={() => setShowAddAthlete(false)}
          size="lg">
          <form onSubmit={submitAthlete} className={styles.modalForm}>
            <label className={styles.field}>
              <span>Họ tên</span>
              <input
                value={athleteForm.hoTen}
                onChange={(e) =>
                  setAthleteForm({ ...athleteForm, hoTen: e.target.value })
                }
                required
              />
            </label>
            <label className={styles.field}>
              <span>Năm sinh</span>
              <input
                type="number"
                min={1970}
                max={CURRENT_YEAR}
                value={athleteForm.namSinh}
                onChange={(e) =>
                  setAthleteForm({
                    ...athleteForm,
                    namSinh: Number(e.target.value),
                  })
                }
                required
              />
            </label>
            <label className={styles.field}>
              <span>Giới tính</span>
              <select
                value={athleteForm.gioiTinh}
                onChange={(e) =>
                  setAthleteForm({
                    ...athleteForm,
                    gioiTinh: e.target.value as GioiTinh,
                  })
                }>
                <option value="nam">Nam</option>
                <option value="nu">Nữ</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Nhóm tuổi</span>
              <select
                value={athleteForm.nhomTuoi}
                onChange={(e) =>
                  setAthleteForm({
                    ...athleteForm,
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
            <label className={styles.field}>
              <span>Link ảnh</span>
              <input
                type="url"
                placeholder="https://.../anh-vdv.jpg"
                value={athleteForm.anhDaiDien ?? ""}
                onChange={(e) =>
                  setAthleteForm({
                    ...athleteForm,
                    anhDaiDien: e.target.value.trim() || null,
                  })
                }
              />
            </label>
            <label className={styles.field}>
              <span>Đoàn</span>
              <select
                value={athleteForm.teamId}
                onChange={(e) =>
                  setAthleteForm({ ...athleteForm, teamId: e.target.value })
                }
                required>
                <option value="" disabled>
                  Chọn đoàn
                </option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.ten}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Nội dung đăng ký</span>
              <div className={styles.eventPicker}>
                {events.map((ev) => (
                  <label key={ev.id} className={styles.eventCheckItem}>
                    <input
                      type="checkbox"
                      checked={athleteForm.eventIds.includes(ev.id)}
                      onChange={() => toggleEventIdInForm(ev.id)}
                    />
                    <span>{ev.ten}</span>
                    <span className={styles.eventCheckMeta}>
                      {formatEventNhomTuoi(ev.nhomTuoi)}
                    </span>
                  </label>
                ))}
              </div>
            </label>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={submittingAthlete}>
              {submittingAthlete ? "Đang lưu..." : editingId ? "Lưu" : "Thêm"}
            </button>
          </form>
        </Modal>
      )}

      {showImportModal && (
        <ImportExcelModal
          existingTeamNames={teams.map((t) => t.ten)}
          events={events}
          existingAthletes={athletes}
          onClose={() => setShowImportModal(false)}
          onConfirm={handleImportConfirm}
        />
      )}
      {importing && (
        <div className={styles.importingOverlay}>
          Đang import, vui lòng đợi...
        </div>
      )}
    </div>
  );
}
