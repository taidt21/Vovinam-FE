import { ensureStarted, ensureJoinedCourt, getConnection } from './matchHubConnection';

export type ActiveMode = 'doi_khang' | 'quyen' | null;

const cache = new Map<string, ActiveMode>();
const listenersByCourtId = new Map<string, Set<(mode: ActiveMode) => void>>();

function notify(courtId: string, mode: ActiveMode) {
  cache.set(courtId, mode);
  listenersByCourtId.get(courtId)?.forEach((cb) => cb(mode));
}

let handlersRegistered = false;
function ensureHandlersRegistered() {
  if (handlersRegistered) return;
  handlersRegistered = true;
  const conn = getConnection();

  conn.on('CourtSnapshot', (courtId: string, snapshot: { activeMode?: ActiveMode }) => {
    notify(courtId, snapshot.activeMode ?? null);
  });
  conn.on('ActiveModeUpdated', (courtId: string, mode: ActiveMode) => {
    notify(courtId, mode);
  });
}

export function getActiveMode(courtId: string): ActiveMode {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  return cache.get(courtId) ?? null;
}

export function publishActiveMode(courtId: string, mode: ActiveMode): void {
  ensureHandlersRegistered();
  notify(courtId, mode);
  ensureStarted()
    .then((conn) => conn.invoke('SetActiveMode', courtId, mode))
    .catch(() => {});
}

export function subscribeActiveMode(
  courtId: string,
  onChange: (mode: ActiveMode) => void,
): () => void {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  if (!listenersByCourtId.has(courtId)) listenersByCourtId.set(courtId, new Set());
  listenersByCourtId.get(courtId)!.add(onChange);
  return () => {
    listenersByCourtId.get(courtId)?.delete(onChange);
  };
}
