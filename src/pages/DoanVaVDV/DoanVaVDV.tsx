/** @format */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, FileSpreadsheet, Search, Pencil, Trash2 } from "lucide-react";
import type { AthleteRecord, CompetitionEvent, GioiTinh } from "../../types";
import Modal from "../../components/Modal/Modal";
import ImportExcelModal from "../../components/ImportExcelModal/ImportExcelModal";
import type { ImportRow } from "../../lib/excelImport";
import styles from "./DoanVaVDV.module.scss";

const CURRENT_YEAR = new Date().getFullYear();
const NHOM_TUOI_OPTIONS = [1, 2, 3];
const formatNhomTuoi = (n: number) => `${n}`;

type TeamBasic = { id: string; ten: string };
type AthleteFormState = Omit<AthleteRecord, "id">;

const EMPTY_ATHLETE_FORM: AthleteFormState = {
  hoTen: "",
  namSinh: CURRENT_YEAR - 15,
  gioiTinh: "nam",
  nhomTuoi: NHOM_TUOI_OPTIONS[0],
  teamId: "",
  eventIds: [],
};

const PAGE_SIZE = 8;

export default function DoanVaVDV() {
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [teams, setTeams] = useState<TeamBasic[]>([]);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/events.json").then((r) => r.json()),
      fetch("/data/teams.json").then((r) => r.json()),
      fetch("/data/athletes.json").then((r) => r.json()),
    ])
      .then(([eventsData, teamsData, athletesData]) => {
        setEvents(eventsData);
        setTeams(teamsData);
        setAthletes(athletesData);
      })
      .catch(() =>
        setLoadError(
          "Không tải được dữ liệu — kiểm tra lại 3 file trong public/data/",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const [search, setSearch] = useState("");
  const [filterTeamId, setFilterTeamId] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [showAddTeam, setShowAddTeam] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamNameInput, setTeamNameInput] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  const [athleteForm, setAthleteForm] =
    useState<AthleteFormState>(EMPTY_ATHLETE_FORM);

  const teamName = (teamId: string) =>
    teams.find((t) => t.id === teamId)?.ten ?? "—";
  const eventName = (eventId: string) =>
    events.find((e) => e.id === eventId)?.ten ?? "—";

  const teamStats = useMemo(() => {
    return teams.map((t) => ({
      ...t,
      count: athletes.filter((a) => a.teamId === t.id).length,
    }));
  }, [teams, athletes]);

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

  const openEditAthlete = (athlete: AthleteRecord) => {
    setEditingId(athlete.id);
    setAthleteForm({
      hoTen: athlete.hoTen,
      namSinh: athlete.namSinh,
      gioiTinh: athlete.gioiTinh,
      nhomTuoi: athlete.nhomTuoi,
      teamId: athlete.teamId,
      eventIds: athlete.eventIds,
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

  const submitAthlete = (e: FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setAthletes((prev) =>
        prev.map((a) => (a.id === editingId ? { ...a, ...athleteForm } : a)),
      );
    } else {
      setAthletes((prev) => [
        { id: crypto.randomUUID(), ...athleteForm },
        ...prev,
      ]);
    }
    setShowAddAthlete(false);
  };

  const deleteAthlete = (a: AthleteRecord) => {
    if (!window.confirm(`Xóa VĐV "${a.hoTen}"? Không thể hoàn tác.`)) return;
    setAthletes((prev) => prev.filter((x) => x.id !== a.id));
  };

  const openAddTeam = () => {
    setEditingTeamId(null);
    setTeamNameInput("");
    setShowAddTeam(true);
  };

  const openEditTeam = (team: TeamBasic) => {
    setEditingTeamId(team.id);
    setTeamNameInput(team.ten);
    setShowAddTeam(true);
  };

  const submitTeam = (e: FormEvent) => {
    e.preventDefault();
    const ten = teamNameInput.trim();
    if (!ten) return;
    if (editingTeamId) {
      setTeams((prev) =>
        prev.map((t) => (t.id === editingTeamId ? { ...t, ten } : t)),
      );
    } else {
      setTeams((prev) => [...prev, { id: crypto.randomUUID(), ten }]);
    }
    setTeamNameInput("");
    setShowAddTeam(false);
  };

  const deleteTeam = (t: TeamBasic & { count: number }) => {
    if (t.count > 0) {
      window.alert(
        `Không thể xóa "${t.ten}" — còn ${t.count} VĐV thuộc đoàn này. Xóa hoặc chuyển đoàn cho các VĐV đó trước.`,
      );
      return;
    }
    if (!window.confirm(`Xóa đoàn "${t.ten}"? Không thể hoàn tác.`)) return;
    setTeams((prev) => prev.filter((x) => x.id !== t.id));
    if (filterTeamId === t.id) setFilterTeamId("all");
  };

  const handleImportConfirm = (validRows: ImportRow[]) => {
    const existingNames = new Set(teams.map((t) => t.ten.trim().toLowerCase()));
    const newTeams: TeamBasic[] = [];
    for (const r of validRows) {
      const key = r.donVi.trim().toLowerCase();
      if (
        key &&
        !existingNames.has(key) &&
        !newTeams.some((t) => t.ten.trim().toLowerCase() === key)
      ) {
        newTeams.push({ id: crypto.randomUUID(), ten: r.donVi.trim() });
      }
    }

    const allTeams = [...teams, ...newTeams];
    const teamIdByName = new Map(
      allTeams.map((t) => [t.ten.trim().toLowerCase(), t.id]),
    );

    const newAthletes: AthleteRecord[] = validRows.map((r) => ({
      id: crypto.randomUUID(),
      hoTen: r.hoTen,
      namSinh: r.namSinh!,
      gioiTinh: r.gioiTinh!,
      nhomTuoi:
        parseInt(r.nhomTuoi.replace(/[^0-9]/g, ""), 10) || NHOM_TUOI_OPTIONS[0],
      teamId: teamIdByName.get(r.donVi.trim().toLowerCase())!,
      eventIds: [], // Excel không map được nội dung chính xác — gán tay qua Sửa sau khi import
    }));

    setTeams(allTeams);
    setAthletes((prev) => [...newAthletes, ...prev]);
    setShowImportModal(false);
  };

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
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Đoàn & vận động viên</h1>
        <div className={styles.headerActions}>
          <button
            className={styles.btnGhost}
            onClick={() => setShowImportModal(true)}>
            <FileSpreadsheet size={16} /> Import Excel
          </button>
          <button className={styles.btnPrimary} onClick={openAddAthlete}>
            <Plus size={16} /> Thêm VĐV
          </button>
        </div>
      </div>

      <section className={styles.teamsCard}>
        <div className={styles.teamsHeader}>
          <h2 className={styles.teamsTitle}>
            Đoàn tham dự
            <span className={styles.teamsCount}>{teams.length} đoàn</span>
          </h2>
          <button className={styles.btnGhost} onClick={openAddTeam}>
            <Plus size={16} /> Thêm đoàn
          </button>
        </div>
        <div className={styles.teamsList}>
          {teamStats.map((t) => (
            <div
              key={t.id}
              className={`${styles.teamChip} ${filterTeamId === t.id ? styles.teamChipActive : ""}`}>
              <button
                type="button"
                className={styles.teamChipMain}
                onClick={() => toggleTeamFilter(t.id)}
                title="Bấm để lọc VĐV theo đoàn này">
                <span className={styles.teamChipName}>{t.ten}</span>
                <span className={styles.teamChipCount}>{t.count} VĐV</span>
              </button>
              <button
                type="button"
                className={styles.teamChipEdit}
                onClick={() => openEditTeam(t)}
                aria-label={`Sửa tên đoàn ${t.ten}`}
                title="Sửa tên đoàn">
                <Pencil size={12} />
              </button>
              <button
                type="button"
                className={styles.teamChipDelete}
                onClick={() => deleteTeam(t)}
                aria-label={`Xóa đoàn ${t.ten}`}
                title="Xóa đoàn">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {teamStats.length === 0 && (
            <p className={styles.teamsEmpty}>Chưa có đoàn nào</p>
          )}
        </div>
      </section>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            placeholder="Tìm theo tên, năm sinh, nhóm tuổi, đơn vị, nội dung..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
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
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Năm sinh</th>
              <th>Giới tính</th>
              <th>Nhóm tuổi</th>
              <th>Đơn vị</th>
              <th>Nội dung</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((a) => (
              <tr key={a.id}>
                <td>{a.hoTen}</td>
                <td>{a.namSinh}</td>
                <td>{a.gioiTinh === "nam" ? "Nam" : "Nữ"}</td>
                <td>{formatNhomTuoi(a.nhomTuoi)}</td>
                <td>{teamName(a.teamId)}</td>
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
                    "—"
                  )}
                </td>
                <td className={styles.rowActions}>
                  <button onClick={() => openEditAthlete(a)}>Sửa</button>
                  <button
                    onClick={() => deleteAthlete(a)}
                    className={styles.dangerLink}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  Không có VĐV nào khớp bộ lọc
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className={styles.pagination}>
          <span>
            Hiển thị {pageItems.length ? (page - 1) * PAGE_SIZE + 1 : 0}–
            {(page - 1) * PAGE_SIZE + pageItems.length} của {filtered.length}
          </span>
          <div className={styles.pageBtns}>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ‹
            </button>
            <span>
              {page}/{totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}>
              ›
            </button>
          </div>
        </div>
      </div>

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
            <button type="submit" className={styles.btnPrimary}>
              {editingTeamId ? "Lưu" : "Thêm"}
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
        <ImportExcelModal
          existingTeamNames={teams.map((t) => t.ten)}
          onClose={() => setShowImportModal(false)}
          onConfirm={handleImportConfirm}
        />
      )}
    </div>
  );
}
