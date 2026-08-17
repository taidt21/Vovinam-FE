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

  return (
    <>
      <h2 className={styles.eventTitle}>
        {event.ten} - {formatEventNhomTuoi(event.nhomTuoi)}
      </h2>

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

      <BracketView
        matches={matches}
        athletes={athletes}
        teams={teams}
        soByMatchId={soByMatchId}
      />
    </>
  );
}
