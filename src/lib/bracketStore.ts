import type { Athlete, Match, Squad } from '../types';

const KEY = 'vovinam:brackets';
const CHANNEL_NAME = 'vovinam-live';

export interface QuyenResult {
  eventId: string;
  performerId: string; // athleteId hoặc squadId
  diem: number;
  diemTru: number;
  capNhatLuc: number;
}

export function quyenResultKey(eventId: string, performerId: string): string {
  return `${eventId}:${performerId}`;
}

export interface BracketData {
  bracketsByEvent: Record<string, Match[]>;
  orderByEvent: Record<string, Athlete[]>;
  squadOrderByEvent: Record<string, Squad[]>;
  quyenResults: Record<string, QuyenResult>;
}

const EMPTY: BracketData = { bracketsByEvent: {}, orderByEvent: {}, squadOrderByEvent: {}, quyenResults: {} };

export function loadBracketData(): BracketData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

// Chỉ cần gửi đúng phần muốn đổi — hàm tự đọc lại dữ liệu đang lưu rồi gộp
// vào, không ghi đè mất các phần khác không liên quan tới lượt gọi này.
export function saveBracketData(patch: Partial<BracketData>): void {
  const next = { ...loadBracketData(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // đầy/bị chặn — bỏ qua, tab hiện tại vẫn còn dữ liệu trong state
  }
  getChannel()?.postMessage({ kind: 'brackets' });
}

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function subscribeBracketData(onChange: (data: BracketData) => void): () => void {
  const bc = getChannel();
  const onMessage = (e: MessageEvent) => {
    if (e.data?.kind === 'brackets') onChange(loadBracketData());
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange(loadBracketData());
  };
  bc?.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);
  return () => {
    bc?.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
  };
}