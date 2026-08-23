/** @format */

import { useMemo } from "react";
import type { CompetitionEvent } from "../../../types";
import type { QuyenJudgeScoreWire } from "../../../lib/api/quyenJudgeScoreApi";
import type { QuyenLuotHoanThanhWire } from "../../../lib/api/quyenLuotApi";
import type { LyDoKetThucQuyen } from "../../../types/liveQuyen";
import { computeQuyenRanking } from "../../../lib/domain/medals";
import { tinhDiemQuyenTongHop } from "../../../lib/domain/quyenScoring";
import { formatEventNhomTuoi } from "../../../lib/utils/nhomTuoi";
import MedalBox from "../MedalBox";
import type { PerformanceOrderWire } from "../types";
import { LY_DO_LABEL } from "../helpers";
import styles from "../KetQua.module.scss";

export default function QuyenResultView({
  event,
  orders,
  scores,
  quyenLuotHoanThanh,
  athleteName,
  athleteTeamName,
  teamName,
  thanhVienCuaDoi,
  choPhepDongHang,
}: {
  event: CompetitionEvent;
  orders: PerformanceOrderWire[];
  scores: QuyenJudgeScoreWire[];
  quyenLuotHoanThanh: QuyenLuotHoanThanhWire[];
  athleteName: (id: string | null) => string;
  athleteTeamName: (id: string | null) => string;
  teamName: (id: string) => string;
  thanhVienCuaDoi: (teamId: string, eventId: string) => string[];
  choPhepDongHang: boolean;
}) {
  const items = useMemo(
    () =>
      [...orders]
        .sort((a, b) => a.thuTu - b.thuTu)
        .map((o) => ({ athleteId: o.athleteId, teamId: o.teamId })),
    [orders],
  );

  const hoanThanhRecords = useMemo(
    () =>
      quyenLuotHoanThanh
        .filter((h) => h.eventId === event.id)
        .map((h) => ({ athleteId: h.athleteId, teamId: h.teamId })),
    [quyenLuotHoanThanh, event.id],
  );

  const { hoanThanh, ranking } = useMemo(
    () => computeQuyenRanking(items, scores, hoanThanhRecords, choPhepDongHang),
    [items, scores, hoanThanhRecords, choPhepDongHang],
  );

  const membersFor = (teamId: string | null) =>
    teamId ? thanhVienCuaDoi(teamId, event.id) : [];

  const subFor = (athleteId: string | null, teamId: string | null) => {
    if (athleteId) return athleteTeamName(athleteId);
    return teamId ? teamName(teamId) : "—";
  };

  const rankingOf = (athleteId: string | null, teamId: string | null) =>
    ranking.find((r) => r.athleteId === athleteId && r.teamId === teamId);

  // Thành tích dùng cùng cấu trúc thông tin với danh sách thi đấu:
  // dòng chính là VĐV/thành viên, dòng phụ là tên đoàn; huy chương và
  // điểm được đưa sang cột trạng thái bên phải.
  const medalItems = hoanThanh
    ? ranking
        .filter((r) => r.huyChuong !== null)
        .map((r) => ({
          hang: r.huyChuong as 1 | 2 | 3,
          label: r.athleteId ? athleteName(r.athleteId) : undefined,
          members: r.teamId ? membersFor(r.teamId) : undefined,
          sub: subFor(r.athleteId, r.teamId),
          diem: r.diem,
        }))
    : [];

  const completedCount = items.filter((it) => {
    const ownScores = scores.filter(
      (s) => s.athleteId === it.athleteId && s.teamId === it.teamId,
    );
    if (tinhDiemQuyenTongHop(ownScores.map((s) => s.diem)) !== null)
      return true;
    return quyenLuotHoanThanh.some(
      (x) =>
        x.eventId === event.id &&
        x.athleteId === it.athleteId &&
        x.teamId === it.teamId,
    );
  }).length;

  const gioiTinhLabel =
    event.gioiTinh === "nam"
      ? "Nam"
      : event.gioiTinh === "nu"
        ? "Nữ"
        : "Hỗn hợp";

  return (
    <>
      <div className={styles.resultHeader}>
        <div>
          <span className={styles.resultType}>Nội dung quyền</span>
          <h2 className={styles.eventTitle}>{event.ten}</h2>
          <div className={styles.eventBadges}>
            <span>{formatEventNhomTuoi(event.nhomTuoi)}</span>
            <span>{gioiTinhLabel}</span>
            <span>{event.hinhThucThi === "doi" ? "Đồng đội" : "Cá nhân"}</span>
          </div>
        </div>
        <div className={styles.progressSummary}>
          <strong>
            {completedCount}/{items.length}
          </strong>
          <span>lượt đã hoàn tất</span>
          <div className={styles.progressTrack}>
            <span
              style={{
                width: `${items.length ? Math.round((completedCount / items.length) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {hoanThanh && medalItems.length > 0 && <MedalBox items={medalItems} />}

      <div className={styles.sectionHeader}>
        <div>
          <strong>Danh sách thi đấu</strong>
          <span>Kết quả được cập nhật tự động theo điểm giám định.</span>
        </div>
        <span className={styles.sectionCount}>{items.length} lượt</span>
      </div>

      <div className={styles.quyenList}>
        {items.map((it, i) => {
          const myScores = scores.filter(
            (s) => s.athleteId === it.athleteId && s.teamId === it.teamId,
          );
          const r = rankingOf(it.athleteId, it.teamId);
          const diemRieng = tinhDiemQuyenTongHop(myScores.map((s) => s.diem));
          const hoanThanhRow = quyenLuotHoanThanh.find(
            (x) =>
              x.eventId === event.id &&
              x.athleteId === it.athleteId &&
              x.teamId === it.teamId,
          );
          const members = membersFor(it.teamId);

          return (
            <div key={i} className={styles.quyenRow}>
              <span className={styles.quyenNo}>
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className={styles.quyenInfo}>
                {it.athleteId ? (
                  <>
                    <div className={styles.quyenName}>
                      {athleteName(it.athleteId)}
                    </div>
                    <div className={styles.quyenSub}>
                      {athleteTeamName(it.athleteId)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.quyenMemberList}>
                      {members.length > 0 ? (
                        members.map((member) => (
                          <span key={member} className={styles.quyenMember}>
                            {member}
                          </span>
                        ))
                      ) : (
                        <span className={styles.quyenMemberEmpty}>
                          Chưa có danh sách VĐV
                        </span>
                      )}
                    </div>
                    <div className={styles.quyenSub}>
                      {it.teamId ? teamName(it.teamId) : "—"}
                    </div>
                  </>
                )}
              </div>

              <div className={styles.quyenStatus}>
                {r ? (
                  <span className={styles.quyenDone}>
                    <strong>
                      {r.huyChuong === 1
                        ? "🥇"
                        : r.huyChuong === 2
                          ? "🥈"
                          : r.huyChuong === 3
                            ? "🥉"
                            : "✓"}{" "}
                      {r.diem.toFixed(2)}
                    </strong>
                    <small>
                      {r.huyChuong ? `Hạng ${r.hang}` : "Đã xếp hạng"}
                    </small>
                  </span>
                ) : diemRieng !== null ? (
                  <span className={styles.quyenDone}>
                    <strong>✓ {diemRieng.toFixed(2)}</strong>
                    <small>Đã đủ 5 điểm</small>
                  </span>
                ) : hoanThanhRow ? (
                  <span className={styles.quyenEnded}>
                    <strong>
                      {LY_DO_LABEL[hoanThanhRow.lyDo as LyDoKetThucQuyen] ??
                        "Đã kết thúc"}
                    </strong>
                    <small>Kết thúc lượt</small>
                  </span>
                ) : (
                  <span className={styles.quyenPending}>
                    <strong>{myScores.length}/5</strong>
                    <small>
                      {myScores.length > 0
                        ? "giám định đã chấm"
                        : "Chờ chấm điểm"}
                    </small>
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className={styles.emptyList}>
            <strong>Chưa có lượt thi</strong>
            <p>Chưa có VĐV hoặc đội được đăng ký/xếp lịch cho nội dung này.</p>
          </div>
        )}
      </div>
    </>
  );
}
