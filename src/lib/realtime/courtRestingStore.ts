import { ensureStarted, ensureJoinedCourt, getConnection } from './matchHubConnection';

export type CheDoNghi = 'doi_khang' | 'quyen';

// key nội bộ ghép courtId + bên (đối kháng/quyền) — 2 bên độc lập với
// nhau, gỡ bên nào chỉ ảnh hưởng đúng bên đó.
function key(courtId: string, mode: CheDoNghi): string {
  return `${courtId}::${mode}`;
}

const cache = new Map<string, boolean>();
const listeners = new Map<string, Set<(dangNghi: boolean) => void>>();

function notify(courtId: string, mode: CheDoNghi, dangNghi: boolean) {
  cache.set(key(courtId, mode), dangNghi);
  listeners.get(key(courtId, mode))?.forEach((cb) => cb(dangNghi));
}

let handlersRegistered = false;
function ensureHandlersRegistered() {
  if (handlersRegistered) return;
  handlersRegistered = true;
  const conn = getConnection();

  conn.on(
    'CourtSnapshot',
    (courtId: string, snapshot: { dangNghiDoiKhang?: boolean; dangNghiQuyen?: boolean }) => {
      notify(courtId, 'doi_khang', snapshot.dangNghiDoiKhang ?? false);
      notify(courtId, 'quyen', snapshot.dangNghiQuyen ?? false);
    },
  );
  conn.on(
    'CourtRestingUpdated',
    (courtId: string, mode: CheDoNghi, dangNghi: boolean) => {
      notify(courtId, mode, dangNghi);
    },
  );
}

export function getCourtResting(courtId: string, mode: CheDoNghi): boolean {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  return cache.get(key(courtId, mode)) ?? false;
}

export function publishCourtResting(courtId: string, mode: CheDoNghi, dangNghi: boolean): void {
  ensureHandlersRegistered();
  notify(courtId, mode, dangNghi);
  ensureStarted()
    .then((conn) => conn.invoke('SetCourtResting', courtId, mode, dangNghi))
    .catch(() => {});
}

export function subscribeCourtResting(
  courtId: string,
  mode: CheDoNghi,
  onChange: (dangNghi: boolean) => void,
): () => void {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  const k = key(courtId, mode);
  if (!listeners.has(k)) listeners.set(k, new Set());
  listeners.get(k)!.add(onChange);
  return () => {
    listeners.get(k)?.delete(onChange);
  };
}
