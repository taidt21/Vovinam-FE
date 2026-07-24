import type { RefereeIdentity } from '../types/live';

const KEY = 'vovinam:referee-identity';

// Danh tính trọng tài biên gắn với THIẾT BỊ đang dùng (điện thoại/tablet
// riêng của từng người) — lưu trong localStorage của chính thiết bị đó nên
// mở lại trang không phải chọn lại từ đầu. Đây là cách "đăng nhập" tạm thời
// khi chưa có tài khoản/đăng nhập thật; giamDinhId sinh ngẫu nhiên 1 lần và
// giữ ổn định cho tới khi người dùng chủ động đổi trọng tài/sân.

export function getSavedIdentity(): RefereeIdentity | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RefereeIdentity) : null;
  } catch {
    return null;
  }
}

export function saveIdentity(identity: RefereeIdentity): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(identity));
  } catch {
    // bỏ qua — trọng tài vẫn dùng được trong phiên hiện tại, chỉ là không nhớ khi tải lại trang
  }
}

export function clearIdentity(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // bỏ qua
  }
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `tt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Giữ nguyên giamDinhId cũ nếu đang đổi tên/sân, chỉ sinh id mới khi thiết bị chưa từng có danh tính. */
export function ensureGiamDinhId(existing?: string): string {
  return existing || randomId();
}
