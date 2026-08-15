import type { CompetitionEvent } from '../../../types';

const KEY = 'vovinam:events';
const CHANNEL_NAME = 'vovinam-live';

let cache: CompetitionEvent[] | null = null;

function readFromStorage(): CompetitionEvent[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Lần đầu chưa có gì trong localStorage — nạp từ events.json làm dữ liệu
// khởi tạo. Từ đó về sau, CRUD ở Thiết lập giải ghi đè lên localStorage,
// không đọc lại events.json nữa — file JSON chỉ còn vai trò "hạt giống".
export async function loadEvents(): Promise<CompetitionEvent[]> {
  if (cache) return cache;
  const stored = readFromStorage();
  if (stored) {
    cache = stored;
    return stored;
  }
  const res = await fetch('/data/events.json');
  const seeded: CompetitionEvent[] = await res.json();
  cache = seeded;
  try {
    localStorage.setItem(KEY, JSON.stringify(seeded));
  } catch {
    // bỏ qua
  }
  return seeded;
}

export function saveEvents(events: CompetitionEvent[]): void {
  cache = events;
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    // đầy/bị chặn — bỏ qua, tab hiện tại vẫn còn dữ liệu trong bộ nhớ
  }
  getChannel()?.postMessage({ kind: 'events' });
}

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function subscribeEvents(onChange: (events: CompetitionEvent[]) => void): () => void {
  const bc = getChannel();
  const refresh = () => {
    const stored = readFromStorage();
    if (stored) {
      cache = stored;
      onChange(stored);
    }
  };
  const onMessage = (e: MessageEvent) => {
    if (e.data?.kind === 'events') refresh();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) refresh();
  };
  bc?.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);
  return () => {
    bc?.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
  };
}