/** @format */

import { useMemo } from "react";
import type { Athlete, CompetitionEvent, Match } from "../../../types";
import { computeDoiKhangMedals } from "../../../lib/domain/medals";
import { formatEventNhomTuoi } from "../../../lib/utils/nhomTuoi";
import BracketView from "../../../components/BracketView/BracketView";
import MedalBox from "../MedalBox";
import styles from "../KetQua.module.scss";

export default function DoiKhangResultView({
  event,
  matches,
  athletes,
  teams,
  soByMatchId,
  athleteTeamName,
  athleteName,
}: {
  event: CompetitionEvent;
  matches: Match[];
  athletes: Athlete[];
  teams: { id: string; ten: string }[];
  soByMatchId: Map<string, number>;
  athleteTeamName: (id: string | null) => string;
  athleteName: (id: string | null) => string;
}) {
  const medals = useMemo(() => computeDoiKhangMedals(matches), [matches]);
  const completed = matches.filter((m) => m.trangThai === "da_hoan_thanh").length;
  const gioiTinhLabel =
    event.gioiTinh === "nam" ? "Nam" : event.gioiTinh === "nu" ? "Nữ" : "Hỗn hợp";

  return (
    <>
      <div className={styles.resultHeader}>
        <div>
          <span className={styles.resultType}>Nội dung đối kháng</span>
          <h2 className={styles.eventTitle}>{event.ten}</h2>
          <div className={styles.eventBadges}>
            <span>{formatEventNhomTuoi(event.nhomTuoi)}</span>
            <span>{gioiTinhLabel}</span>
            {event.hangCan != null && <span>{event.hangCan} kg</span>}
          </div>
        </div>
        <div className={styles.progressSummary}>
          <strong>{completed}/{matches.length}</strong>
          <span>trận đã hoàn tất</span>
          <div className={styles.progressTrack}>
            <span
              style={{
                width: `${matches.length ? Math.round((completed / matches.length) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {medals && (
        <MedalBox
          items={[
            {
              hang: 1,
              label: athleteName(medals.vang),
              sub: athleteTeamName(medals.vang),
            },
            {
              hang: 2,
              label: athleteName(medals.bac),
              sub: athleteTeamName(medals.bac),
            },
            ...medals.dong.map((id) => ({
              hang: 3 as const,
              label: athleteName(id),
              sub: athleteTeamName(id),
            })),
          ]}
        />
      )}

      <div className={styles.sectionHeader}>
        <div>
          <strong>Sơ đồ thi đấu</strong>
          <span>Theo dõi nhánh đấu và kết quả từng vòng.</span>
        </div>
        <span className={styles.sectionCount}>{matches.length} trận</span>
      </div>

      <div className={styles.bracketShell}>
        <BracketView
          matches={matches}
          athletes={athletes}
          teams={teams}
          soByMatchId={soByMatchId}
        />
      </div>
    </>
  );
}
