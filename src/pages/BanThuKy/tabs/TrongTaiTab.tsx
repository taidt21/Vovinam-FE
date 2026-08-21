/** @format */

import { useMemo, useState } from "react";
import { CheckCircle2, Plus, Search, Users, X } from "lucide-react";
import type { CourtBasic } from "../../../lib/utils/courts";
import {
  createTrongTai,
  updateTrongTai,
  deleteTrongTai,
  type TrongTaiWire,
} from "../../../lib/api/trongTaiApi";
import styles from "../BanThuKy.module.scss";

const VI_TRI_GIAM_DINH = [1, 2, 3, 4, 5] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[parts.length - 2][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

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
  const [search, setSearch] = useState("");

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
      await updateTrongTai(t.id, {
        hoTen: t.hoTen,
        courtId,
        thuTuGiamDinh: null,
      });
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

  const searchNormalized = search.trim().toLocaleLowerCase("vi");
  const filteredList = useMemo(
    () =>
      searchNormalized
        ? trongTaiList.filter((t) =>
            t.hoTen.toLocaleLowerCase("vi").includes(searchNormalized),
          )
        : trongTaiList,
    [trongTaiList, searchNormalized],
  );

  const soDangCham = trongTaiList.filter(
    (t) => t.courtId && t.thuTuGiamDinh !== null,
  ).length;
  const soDuBi = trongTaiList.filter(
    (t) => t.courtId && t.thuTuGiamDinh === null,
  ).length;

  return (
    <div className={styles.trongTaiTabV2}>
      <section className={styles.trongTaiOverview}>
        <div>
          <div className={styles.trongTaiEyebrow}>Phân công lực lượng</div>
          <h2 className={styles.trongTaiPageTitle}>Trọng tài & giám định</h2>
          <p className={styles.trongTaiPageDesc}>
            Mỗi sân có tối đa 5 vị trí giám định. Người chưa được xếp số sẽ nằm
            ở danh sách dự bị của sân đó.
          </p>
        </div>

        <div className={styles.trongTaiStats}>
          <div className={styles.trongTaiStat}>
            <span>Tổng trọng tài</span>
            <strong>{trongTaiList.length}</strong>
          </div>
          <div className={styles.trongTaiStat}>
            <span>Đang chấm</span>
            <strong>{soDangCham}</strong>
          </div>
          <div className={styles.trongTaiStat}>
            <span>Dự bị</span>
            <strong>{soDuBi}</strong>
          </div>
        </div>
      </section>

      <section className={styles.trongTaiToolbarCard}>
        <div className={styles.trongTaiAddHeader}>
          <div>
            <strong>Thêm trọng tài</strong>
            <span>Thêm vào sân trước, sau đó xếp vị trí giám định bên dưới.</span>
          </div>
        </div>

        <div className={styles.trongTaiAddFormV2}>
          <label className={styles.trongTaiAddField}>
            <span>Họ và tên</span>
            <input
              value={hoTenMoi}
              onChange={(e) => setHoTenMoi(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void themTrongTai();
                }
              }}
              placeholder="VD: Nguyễn Văn A"
            />
          </label>

          <label className={styles.trongTaiAddField}>
            <span>Sân / thảm</span>
            <select
              value={courtMoi}
              onChange={(e) => setCourtMoi(e.target.value)}>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.ten}
                </option>
              ))}
            </select>
          </label>

          <button
            className={styles.btnPrimary}
            disabled={saving || !hoTenMoi.trim() || !courtMoi}
            onClick={themTrongTai}>
            <Plus size={16} /> {saving ? "Đang thêm..." : "Thêm trọng tài"}
          </button>
        </div>
      </section>

      <div className={styles.trongTaiListToolbar}>
        <div>
          <strong>Phân công theo sân</strong>
          <span>
            Xếp đúng vị trí 1–5 để điểm Quyền hiển thị theo đúng thứ tự giám
            định.
          </span>
        </div>
        <label className={styles.trongTaiSearch}>
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên trọng tài..."
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Xoá tìm kiếm">
              <X size={14} />
            </button>
          )}
        </label>
      </div>

      <div className={styles.trongTaiCourtGrid}>
        {courts.map((court) => {
          const allCourtPeople = trongTaiList.filter(
            (t) => t.courtId === court.id,
          );
          const visibleCourtPeople = filteredList.filter(
            (t) => t.courtId === court.id,
          );
          const assigned = visibleCourtPeople
            .filter((t) => t.thuTuGiamDinh !== null)
            .sort(
              (a, b) =>
                (a.thuTuGiamDinh ?? 99) - (b.thuTuGiamDinh ?? 99) ||
                a.hoTen.localeCompare(b.hoTen, "vi"),
            );
          const reserves = visibleCourtPeople
            .filter((t) => t.thuTuGiamDinh === null)
            .sort((a, b) => a.hoTen.localeCompare(b.hoTen, "vi"));
          const assignedAll = allCourtPeople.filter(
            (t) => t.thuTuGiamDinh !== null,
          );
          const occupied = new Set(
            assignedAll
              .map((t) => t.thuTuGiamDinh)
              .filter((n): n is number => n !== null),
          );

          return (
            <section key={court.id} className={styles.trongTaiCourtCard}>
              <header className={styles.trongTaiCourtHeader}>
                <div className={styles.trongTaiCourtIdentity}>
                  <div className={styles.trongTaiCourtIcon}>
                    <Users size={18} />
                  </div>
                  <div>
                    <h3>{court.ten}</h3>
                    <span>
                      {allCourtPeople.length} trọng tài · {assignedAll.length}/5
                      vị trí đã xếp
                    </span>
                  </div>
                </div>

                <div
                  className={`${styles.trongTaiCoverageBadge} ${
                    assignedAll.length >= 5 ? styles.trongTaiCoverageComplete : ""
                  }`}>
                  {assignedAll.length >= 5 && <CheckCircle2 size={14} />}
                  {assignedAll.length}/5 giám định
                </div>
              </header>

              <div className={styles.trongTaiPositionStrip}>
                {VI_TRI_GIAM_DINH.map((n) => (
                  <span
                    key={n}
                    className={
                      occupied.has(n)
                        ? styles.trongTaiPositionFilled
                        : styles.trongTaiPositionEmpty
                    }>
                    GD {n}
                  </span>
                ))}
              </div>

              {searchNormalized && visibleCourtPeople.length === 0 ? (
                <div className={styles.trongTaiCourtEmpty}>
                  Không có trọng tài khớp “{search.trim()}” tại {court.ten}.
                </div>
              ) : allCourtPeople.length === 0 ? (
                <div className={styles.trongTaiCourtEmpty}>
                  Chưa có trọng tài nào ở sân này.
                </div>
              ) : (
                <div className={styles.trongTaiCourtBody}>
                  <div className={styles.trongTaiSection}>
                    <div className={styles.trongTaiSectionHead}>
                      <span>Đội hình giám định</span>
                      <small>{assigned.length} người</small>
                    </div>

                    {assigned.length === 0 ? (
                      <p className={styles.trongTaiSectionEmpty}>
                        Chưa xếp ai vào vị trí 1–5.
                      </p>
                    ) : (
                      <div className={styles.trongTaiAssignedList}>
                        {assigned.map((t) => (
                          <TrongTaiRow
                            key={t.id}
                            t={t}
                            courts={courts}
                            onPositionChange={doiViTri}
                            onCourtChange={doiSan}
                            onDelete={xoa}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.trongTaiSection}>
                    <div className={styles.trongTaiSectionHead}>
                      <span>Dự bị</span>
                      <small>{reserves.length} người</small>
                    </div>

                    {reserves.length === 0 ? (
                      <p className={styles.trongTaiSectionEmpty}>
                        Không có trọng tài dự bị.
                      </p>
                    ) : (
                      <div className={styles.trongTaiReserveList}>
                        {reserves.map((t) => (
                          <TrongTaiRow
                            key={t.id}
                            t={t}
                            courts={courts}
                            onPositionChange={doiViTri}
                            onCourtChange={doiSan}
                            onDelete={xoa}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TrongTaiRow({
  t,
  courts,
  onPositionChange,
  onCourtChange,
  onDelete,
}: {
  t: TrongTaiWire;
  courts: CourtBasic[];
  onPositionChange: (t: TrongTaiWire, thuTu: number | null) => void;
  onCourtChange: (t: TrongTaiWire, courtId: string) => void;
  onDelete: (t: TrongTaiWire) => void;
}) {
  const assigned = t.thuTuGiamDinh !== null;

  return (
    <div
      className={`${styles.trongTaiPersonRow} ${
        assigned ? styles.trongTaiPersonAssigned : ""
      }`}>
      <div className={styles.trongTaiPersonMain}>
        <span className={styles.trongTaiAvatar}>{initials(t.hoTen)}</span>
        <div className={styles.trongTaiPersonInfo}>
          <strong>{t.hoTen}</strong>
          <span>{assigned ? `Giám định ${t.thuTuGiamDinh}` : "Dự bị"}</span>
        </div>
      </div>

      <div className={styles.trongTaiPersonControls}>
        <label>
          <span>Vị trí</span>
          <select
            value={t.thuTuGiamDinh ?? ""}
            onChange={(e) =>
              onPositionChange(
                t,
                e.target.value ? Number(e.target.value) : null,
              )
            }>
            <option value="">Dự bị</option>
            {VI_TRI_GIAM_DINH.map((n) => (
              <option key={n} value={n}>
                Giám định {n}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Sân</span>
          <select
            value={t.courtId ?? ""}
            onChange={(e) => onCourtChange(t, e.target.value)}>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ten}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={styles.trongTaiDeleteV2}
          onClick={() => onDelete(t)}
          aria-label={`Xoá ${t.hoTen}`}
          title={`Xoá ${t.hoTen}`}>
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
