import type { EventSummaryState } from '../../types/eventSummary';
import { ensureJoinedCourt, ensureStarted, getConnection } from './matchHubConnection';

type CacheEntry = {
  state: EventSummaryState | null;
  revision: number;
};

const cache = new Map<string, CacheEntry>();
const listenersByCourtId = new Map<
  string,
  Set<(state: EventSummaryState | null) => void>
>();

function currentEntry(courtId: string): CacheEntry {
  return cache.get(courtId) ?? { state: null, revision: -1 };
}

function apply(
  courtId: string,
  state: EventSummaryState | null,
  revision: number,
) {
  const current = currentEntry(courtId);
  if (revision < current.revision) return;
  cache.set(courtId, { state, revision });
  listenersByCourtId.get(courtId)?.forEach((cb) => cb(state));
}

let handlersRegistered = false;
function ensureHandlersRegistered() {
  if (handlersRegistered) return;
  handlersRegistered = true;
  const conn = getConnection();

  // Backend giữ summary trong RAM nên revision sẽ bắt đầu lại từ 0 sau
  // khi backend restart. Khi SignalR reconnect, cho snapshot mới quyền
  // thay thế cache cũ của client; còn trong cùng một connection vẫn dùng
  // revision để chặn CourtSnapshot cũ tới muộn.
  conn.onreconnected(() => {
    cache.forEach((entry, courtId) => {
      cache.set(courtId, { ...entry, revision: -1 });
    });
  });

  conn.on(
    'CourtSnapshot',
    (
      courtId: string,
      snapshot: {
        eventSummary?: EventSummaryState | null;
        eventSummaryRevision?: number;
      },
    ) => {
      if (snapshot.eventSummary === undefined) return;
      apply(
        courtId,
        snapshot.eventSummary ?? null,
        snapshot.eventSummaryRevision ?? 0,
      );
    },
  );

  conn.on(
    'EventSummaryUpdated',
    (courtId: string, state: EventSummaryState, revision: number) =>
      apply(courtId, state, revision),
  );

  conn.on(
    'EventSummaryCleared',
    (courtId: string, revision: number) => apply(courtId, null, revision),
  );
}

export function getEventSummarySnapshot(
  courtId: string,
): EventSummaryState | null {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  return currentEntry(courtId).state;
}

export async function publishEventSummary(
  state: EventSummaryState,
): Promise<void> {
  ensureHandlersRegistered();
  await ensureJoinedCourt(state.courtId);
  const conn = await ensureStarted();
  await conn.invoke('PublishEventSummary', state.courtId, state);
}

export async function clearEventSummary(courtId: string): Promise<void> {
  ensureHandlersRegistered();
  await ensureJoinedCourt(courtId);
  const conn = await ensureStarted();
  await conn.invoke('ClearEventSummary', courtId);
}

export function subscribeEventSummary(
  courtId: string,
  onChange: (state: EventSummaryState | null) => void,
): () => void {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  if (!listenersByCourtId.has(courtId)) {
    listenersByCourtId.set(courtId, new Set());
  }
  listenersByCourtId.get(courtId)!.add(onChange);
  return () => listenersByCourtId.get(courtId)?.delete(onChange);
}
