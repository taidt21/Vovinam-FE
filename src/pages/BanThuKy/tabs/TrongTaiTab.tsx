/** @format */

import { useMemo, useState } from "react";
import { CheckCircle2, Search, Users, X } from "lucide-react";
import type { CourtBasic } from "../../../lib/utils/courts";
import {
  updateTrongTai,
  boChonTrongTai,
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
  const [search, setSearch] = useState("");

  const doiViTri = async (t: TrongTaiWire, thuTu: number | null) => {
    try {
      await updateTrongTai(t.id, {
        hoTen: t.hoTen,
        courtId: t.courtId,
        thuTuGiamDinh: thuTu,
        donVi: t.donVi,
      });
      onRefresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Đổi vị trí thất bại.");
    }
  };

  // courtId === "" nghĩa là trả về hồ chưa gán sân — reset luôn cả vị
  // trí giám định, số cũ gắn với sân cũ không còn ý nghĩa gì nữa.
  const doiSan = async (t: TrongTaiWire, courtId: string) => {
    try {
      await updateTrongTai(t.id, {
        hoTen: t.hoTen,
        courtId: courtId || null,
        thuTuGiamDinh: null,
        donVi: t.donVi,
      });
      onRefresh();
    } catch {
      window.alert("Đổi sân thất bại.");
    }
  };

  // Dành cho lúc điện thoại trọng tài hết pin/hỏng/đổi máy giữa chừng —
  // họ không tự bấm "Đổi tên" trên máy cũ được nữa (máy đó không dùng
  // được), nên BTC cần cách chủ động nhả khoá hộ để họ chọn lại trên
  // máy khác. Dùng lại đúng API "/bo-chon" (vốn để trọng tài tự gọi),
  // không cần API riêng.
  const resetLuaChon = async (t: TrongTaiWire) => {
    if (
      !window.confirm(
        `Cho phép chọn lại tên "${t.hoTen}" trên máy khác? Chỉ làm việc này khi chắc chắn máy cũ của họ không còn dùng được nữa.`,
      )
    )
      return;
    try {
      await boChonTrongTai(t.id);
      onRefresh();
    } catch {
      window.alert("Reset thất bại — thử lại.");
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
            ở danh sách dự bị của sân đó. Thêm/sửa/xoá trọng tài thực hiện ở
            Thiết lập giải.
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
                            onResetLuaChon={resetLuaChon}
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
                            onResetLuaChon={resetLuaChon}
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
  onResetLuaChon,
}: {
  t: TrongTaiWire;
  courts: CourtBasic[];
  onPositionChange: (t: TrongTaiWire, thuTu: number | null) => void;
  onCourtChange: (t: TrongTaiWire, courtId: string) => void;
  onResetLuaChon: (t: TrongTaiWire) => void;
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
        {t.daChonThietBi && (
          <button
            type="button"
            className={styles.trongTaiResetLuaChonBtn}
            onClick={() => onResetLuaChon(t)}
            title="Cho phép chọn lại tên này trên máy khác (dùng khi điện thoại của họ hết pin/hỏng)">
            Reset lựa chọn
          </button>
        )}
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
      </div>
    </div>
  );
}
