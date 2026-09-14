import { ensureStarted, ensureJoinedCourt, getConnection } from './matchHubConnection';

export type CheDoNghi = 'doi_khang' | 'quyen';

// key nội bộ ghép courtId + bên (đối kháng/quyền) — 2 bên độc lập với
// nhau, gỡ bên nào chỉ ảnh hưởng đúng bên đó.
function key(courtId: string, mode: CheDoNghi): string {
  return `${courtId}::${mode}`;
}

const cache = new Map<string, boolean>();
const listeners = new Map<string, Set<(dangNghi: boolean) => void>>();
const snapshotBlockedKeys = new Set<string>();

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
      if (!snapshotBlockedKeys.has(key(courtId, 'doi_khang'))) {
        notify(courtId, 'doi_khang', snapshot.dangNghiDoiKhang ?? false);
      }
      if (!snapshotBlockedKeys.has(key(courtId, 'quyen'))) {
        notify(courtId, 'quyen', snapshot.dangNghiQuyen ?? false);
      }
    },
  );
  conn.on(
    'CourtRestingUpdated',
    (courtId: string, mode: CheDoNghi, dangNghi: boolean) => {
      snapshotBlockedKeys.delete(key(courtId, mode));
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

export async function setCourtRestingConfirmed(
  courtId: string,
  mode: CheDoNghi,
  dangNghi: boolean,
): Promise<void> {
  ensureHandlersRegistered();
  const k = key(courtId, mode);
  const previous = cache.get(k) ?? false;

  // Chặn CourtSnapshot cũ ghi đè cờ nghỉ trong lúc command đang bay.
  snapshotBlockedKeys.add(k);
  notify(courtId, mode, dangNghi);

  try {
    const conn = await ensureStarted();
    await conn.invoke('SetCourtResting', courtId, mode, dangNghi);
    // Server cũng broadcast CourtRestingUpdated; notify lại để bảo đảm
    // chính caller đã có state đúng ngay cả khi event tới sau ACK.
    notify(courtId, mode, dangNghi);
  } catch (error) {
    snapshotBlockedKeys.delete(k);
    notify(courtId, mode, previous);
    throw error;
  }
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
