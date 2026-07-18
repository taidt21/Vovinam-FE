import { normalizeVi } from './text';

const TEAM_CONTENT_KEYWORDS = ['dong doi', 'vo nhac'];

export function isTeamContent(tenNoiDung: string): boolean {
  const n = normalizeVi(tenNoiDung);
  return TEAM_CONTENT_KEYWORDS.some((k) => n.includes(k));
}