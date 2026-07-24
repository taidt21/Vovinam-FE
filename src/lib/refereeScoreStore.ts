import type { DiemTrongTai } from '../types/live';

const CHANNEL_NAME = 'vovinam-live';
const KEY_PREFIX = 'vovinam:live:score:';

// Điểm của từng trọng tài biên — khác với liveMatchStore (1 người ghi duy
// nhất là thư ký), ở đây có NHIỀU người ghi cùng lúc (mỗi trọng tài biên 1
// thiết bị). Để tránh việc 2 trọng tài ghi đè lên nhau khi chưa có backend
// thật xử lý tranh chấp ghi, MỖI trọng tài chỉ được phép ghi vào đúng 1 key
// gắn với chính giamDinhId của mình (courtId + giamDinhId) — không ai đụng
// vào key của người khác. Bàn thư ký chỉ đọc/tổng hợp, không ghi các key này.

function keyFor(courtId: string, giamDinhId: string): string {
  return `${KEY_PREFIX}${courtId}:${giamDinhId}`;
}

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function getOwnScore(courtId: string, giamDinhId: string): DiemTrongTai | null {
  try {
    const raw = localStorage.getItem(keyFor(courtId, giamDinhId));
    return raw ? (JSON.parse(raw) as DiemTrongTai) : null;
  } catch {
    return null;
  }
}

export function publishOwnScore(score: DiemTrongTai): void {
  const key = keyFor(score.courtId, score.giamDinhId);
  try {
    localStorage.setItem(key, JSON.stringify(score));
  } catch {
    // bỏ qua lỗi localStorage — tab khác vẫn nhận qua BroadcastChannel
  }
  getChannel()?.postMessage({ kind: 'score', courtId: score.courtId, score });
}

export function clearOwnScore(courtId: string, giamDinhId: string): void {
  try {
    localStorage.removeItem(keyFor(courtId, giamDinhId));
  } catch {
    // bỏ qua
  }
  getChannel()?.postMessage({ kind: 'score', courtId, score: null, giamDinhId });
}

// Quét toàn bộ localStorage theo prefix — dùng lúc Bàn thư ký mới mở trận
// (hoặc mới mở trang), để không bỏ lỡ điểm trọng tài đã chấm trước khi
// mình kịp bắt đầu lắng nghe broadcast.
export function getAllScoresForCourt(courtId: string): DiemTrongTai[] {
  const prefix = keyFor(courtId, '');
  const result: DiemTrongTai[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (raw) result.push(JSON.parse(raw) as DiemTrongTai);
    } catch {
      // bỏ qua bản ghi hỏng
    }
  }
  return result;
}

export function subscribeCourtScores(
  courtId: string,
  onScore: (score: DiemTrongTai) => void,
  onRemove?: (giamDinhId: string) => void,
): () => void {
  const bc = getChannel();
  const prefix = keyFor(courtId, '');

  const onMessage = (e: MessageEvent) => {
    if (e.data?.kind !== 'score' || e.data.courtId !== courtId) return;
    if (e.data.score) onScore(e.data.score as DiemTrongTai);
    else if (e.data.giamDinhId) onRemove?.(e.data.giamDinhId as string);
  };
  const onStorage = (e: StorageEvent) => {
    if (!e.key || !e.key.startsWith(prefix)) return;
    const giamDinhId = e.key.slice(prefix.length);
    if (e.newValue) {
      try {
        onScore(JSON.parse(e.newValue) as DiemTrongTai);
      } catch {
        // bỏ qua
      }
    } else {
      onRemove?.(giamDinhId);
    }
  };

  bc?.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);
  return () => {
    bc?.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
  };
}
