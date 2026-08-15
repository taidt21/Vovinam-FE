import type { CompetitionEvent } from "../../types";

export interface QuyenItem {
  event: CompetitionEvent;
  athleteId: string | null;
  teamId: string | null;
  label: string;
  sub: string;
  isTeam: boolean;
  so: number;
}
