import type { CompetitionEvent } from "../../types";
import type { ThanhVienQuyen } from "../../types/liveQuyen";

export interface QuyenItem {
  event: CompetitionEvent;
  athleteId: string | null;
  teamId: string | null;
  label: string;
  sub: string;
  isTeam: boolean;
  so: number;
  thanhVien?: ThanhVienQuyen[];
}
