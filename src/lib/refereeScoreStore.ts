import type { DiemTrongTai } from '../types/live';
import { ensureStarted, ensureJoinedCourt, getConnection } from './matchHubConnection';

interface ScoreListener {
  onScore: (s: DiemTrongTai) => void;
  onRemove?: (id: string) => void;
}

const cacheByCourtId = new Map<string, Map<string, DiemTrongTai>>();
const listenersByCourtId = new Map<string, Set<ScoreListener>>();

function getCourtCache(courtId: string): Map<string, DiemTrongTai> {
  if (!cacheByCourtId.has(courtId)) cacheByCourtId.set(courtId, new Map());
  return cacheByCourtId.get(courtId)!;
}

function notifyScore(courtId: string, score: DiemTrongTai) {
  getCourtCache(courtId).set(score.giamDinhId, score);
  listenersByCourtId.get(courtId)?.forEach((l) => l.onScore(score));
}
function notifyRemove(courtId: string, giamDinhId: string) {
  getCourtCache(courtId).delete(giamDinhId);
  listenersByCourtId.get(courtId)?.forEach((l) => l.onRemove?.(giamDinhId));
}

let handlersRegistered = false;
function ensureHandlersRegistered() {
  if (handlersRegistered) return;
  handlersRegistered = true;
  const conn = getConnection();

  conn.on('CourtSnapshot', (courtId: string, snapshot: { refereeScores: DiemTrongTai[] }) => {
    (snapshot.refereeScores ?? []).forEach((s) => notifyScore(courtId, s));
  });
  conn.on('RefereeScoreUpdated', (courtId: string, score: DiemTrongTai) => {
    notifyScore(courtId, score);
  });
  conn.on('RefereeScoreRemoved', (courtId: string, giamDinhId: string) => {
    notifyRemove(courtId, giamDinhId);
  });
}

export function getOwnScore(courtId: string, giamDinhId: string): DiemTrongTai | null {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  return getCourtCache(courtId).get(giamDinhId) ?? null;
}

export function publishOwnScore(score: DiemTrongTai): void {
  ensureHandlersRegistered();
  notifyScore(score.courtId, score);
  ensureStarted()
    .then((conn) => conn.invoke('SubmitRefereeScore', score.courtId, score.giamDinhId, score))
    .catch(() => {});
}

export function clearOwnScore(courtId: string, giamDinhId: string): void {
  ensureHandlersRegistered();
  notifyRemove(courtId, giamDinhId);
  ensureStarted()
    .then((conn) => conn.invoke('RemoveRefereeScore', courtId, giamDinhId))
    .catch(() => {});
}

export function getAllScoresForCourt(courtId: string): DiemTrongTai[] {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  return Array.from(getCourtCache(courtId).values());
}

export function subscribeCourtScores(
  courtId: string,
  onScore: (score: DiemTrongTai) => void,
  onRemove?: (giamDinhId: string) => void,
): () => void {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  if (!listenersByCourtId.has(courtId)) listenersByCourtId.set(courtId, new Set());
  const entry = { onScore, onRemove };
  listenersByCourtId.get(courtId)!.add(entry);
  return () => {
    listenersByCourtId.get(courtId)?.delete(entry);
  };
}