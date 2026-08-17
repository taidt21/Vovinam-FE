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
}: {
  event: CompetitionEvent;
  orders: PerformanceOrderWire[];
  scores: QuyenJudgeScoreWire[];
  quyenLuotHoanThanh: QuyenLuotHoanThanhWire[];
  athleteName: (id: string | null) => string;
  athleteTeamName: (id: string | null) => string;
  teamName: (id: string) => string;
  thanhVienCuaDoi: (teamId: string, eventId: string) => string[];
}) {
  const items = useMemo(
    () =>
      [...orders]
        .sort((a, b) => a.thuTu - b.thuTu)
        .map((o) => ({ athleteId: o.athleteId, teamId: o.teamId })),
    [orders],
  );

  const { hoanThanh, ranking } = useMemo(
    () => computeQuyenRanking(items, scores),
    [items, scores],
  );

  const labelFor = (athleteId: string | null, teamId: string | null) =>
    athleteId ? athleteName(athleteId) : `Đội ${teamName(teamId!)}`;
  const subFor = (athleteId: string | null) =>
    athleteId ? athleteTeamName(athleteId) : "";

  const rankingOf = (athleteId: string | null, teamId: string | null) =>
    ranking.find((r) => r.athleteId === athleteId && r.teamId === teamId);

  const medalItems = hoanThanh
    ? ranking
        .filter((r) => r.hang <= 3)
        .map((r) => {
          const sub = subFor(r.athleteId);
          return {
            hang: r.hang as 1 | 2 | 3,
            label: labelFor(r.athleteId, r.teamId),
            sub: `${sub}${sub ? " - " : ""}${r.diem.toFixed(2)} điểm`,
          };
        })
    : [];

  return (
    <>
      <h2 className={styles.eventTitle}>
        {event.ten} - {formatEventNhomTuoi(event.nhomTuoi)}
      </h2>

      {hoanThanh && <MedalBox items={medalItems} />}

      <div className={styles.quyenList}>
        {items.map((it, i) => {
          const myScores = scores.filter(
            (s) => s.athleteId === it.athleteId && s.teamId === it.teamId,
          );
          // const scoreCount = myScores.length;
          const r = rankingOf(it.athleteId, it.teamId);
          // Điểm CỦA RIÊNG người này — tính độc lập, không đợi CẢ nội
          // dung xong (computeQuyenRanking chỉ trả hạng khi TẤT CẢ đủ
          // 5/5, nên người đã đủ điểm từ lâu vẫn bị "treo" theo người
          // khác nếu chỉ dựa vào rankingOf).
          const diemRieng = tinhDiemQuyenTongHop(myScores.map((s) => s.diem));
          // Đã kết thúc thật (kể cả bị loại, chưa đủ 5 điểm) — không phải
          // suy từ số điểm, vì luật cho phép kết thúc ngay mà không cần đủ
          // điểm (rớt vũ khí, té ngã, dừng bài rõ rệt).
          const hoanThanhRow = quyenLuotHoanThanh.find(
            (x) =>
              x.eventId === event.id &&
              x.athleteId === it.athleteId &&
              x.teamId === it.teamId,
          );
          return (
            <div key={i} className={styles.quyenRow}>
              <span className={styles.quyenNo}>#{i + 1}</span>
              <div className={styles.quyenInfo}>
                <div className={styles.quyenName}>
                  {labelFor(it.athleteId, it.teamId)}
                </div>
                <div className={styles.quyenSub}>{subFor(it.athleteId)}</div>
                {it.teamId && (
                  <div className={styles.quyenSub}>
                    {thanhVienCuaDoi(it.teamId, event.id).join(" - ")}
                  </div>
                )}
              </div>
              {r ? (
                <span className={styles.quyenDone}>
                  {r.hang === 1
                    ? "🥇"
                    : r.hang === 2
                      ? "🥈"
                      : r.hang === 3
                        ? "🥉"
                        : "✓"}{" "}
                  {r.diem.toFixed(2)} điểm
                </span>
              ) : diemRieng !== null ? (
                <span className={styles.quyenDone}>
                  ✓ {diemRieng.toFixed(2)} điểm
                </span>
              ) : hoanThanhRow ? (
                <span className={styles.quyenDone}>
                  {LY_DO_LABEL[hoanThanhRow.lyDo as LyDoKetThucQuyen] ??
                    "Đã kết thúc"}
                </span>
              ) : (
                <span className={styles.quyenPending}>0</span>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <p className={styles.hint}>
            Chưa có ai đăng ký/xếp lịch cho nội dung này.
          </p>
        )}
      </div>
    </>
  );
}
