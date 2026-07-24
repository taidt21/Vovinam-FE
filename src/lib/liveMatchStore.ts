import type { LiveMatchState } from '../types/live';

const CHANNEL_NAME = 'vovinam-live';
const KEY_PREFIX = 'vovinam:live:match:';

// Lớp đồng bộ "trạng thái điều hành trận đấu" giữa Bàn thư ký (nơi ghi DUY
// NHẤT) và các trang xem/nhận (Trọng tài, sau này là Màn hình công khai...).
// Hiện dùng BroadcastChannel (đồng bộ tức thì giữa các tab CÙNG trình
// duyệt) + localStorage (để tab mới mở/refresh vẫn đọc được trạng thái mới
// nhất). Đây LÀ điểm nối duy nhất cần thay khi có backend thật — đổi phần
// triển khai bên trong 4 hàm dưới đây sang gọi API/WebSocket, giữ nguyên
// chữ ký hàm, phần còn lại của UI (BanThuKy, TrongTaiChamDiem) không cần
// sửa gì.
//
// Giới hạn hiện tại: BroadcastChannel + localStorage chỉ đồng bộ được giữa
// các tab của CÙNG 1 trình duyệt trên CÙNG 1 máy — chưa đồng bộ được giữa
// nhiều thiết bị thật (điện thoại trọng tài biên với laptop thư ký). Đó là
// lý do cần thay bằng backend thật ở bước tiếp theo.

function keyFor(courtId: string): string {
  return `${KEY_PREFIX}${courtId}`;
}

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function getMatchSnapshot(courtId: string): LiveMatchState | null {
  try {
    const raw = localStorage.getItem(keyFor(courtId));
    return raw ? (JSON.parse(raw) as LiveMatchState) : null;
  } catch {
    return null;
  }
}

export function publishMatchState(state: LiveMatchState): void {
  try {
    localStorage.setItem(keyFor(state.courtId), JSON.stringify(state));
  } catch {
    // localStorage đầy/bị chặn — bỏ qua, tab khác vẫn nhận qua BroadcastChannel
  }
  getChannel()?.postMessage({ kind: 'match', courtId: state.courtId, state });
}

export function clearMatchState(courtId: string): void {
  try {
    localStorage.removeItem(keyFor(courtId));
  } catch {
    // bỏ qua
  }
  getChannel()?.postMessage({ kind: 'match', courtId, state: null });
}

export function subscribeMatchState(
  courtId: string,
  onChange: (state: LiveMatchState | null) => void,
): () => void {
  const bc = getChannel();

  const onMessage = (e: MessageEvent) => {
    if (e.data?.kind === 'match' && e.data.courtId === courtId) {
      onChange(e.data.state as LiveMatchState | null);
    }
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== keyFor(courtId)) return;
    try {
      onChange(e.newValue ? (JSON.parse(e.newValue) as LiveMatchState) : null);
    } catch {
      onChange(null);
    }
  };

  bc?.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);
  return () => {
    bc?.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
  };
}

// Đồng hồ KHÔNG bắn broadcast mỗi giây — mọi tab tự nội suy thời gian còn
// lại từ mốc capNhatDongHoLuc, nhờ vậy không tốn băng thông và không lệch
// pha giữa các tab.
export function tinhThoiGianConLai(state: LiveMatchState): number {
  const dangChay = state.trangThai === 'dang_thi' || state.trangThai === 'nghi_giua_hiep';
  if (!dangChay) return state.thoiGianConLaiGiay;
  const daTroiQuaGiay = (Date.now() - state.capNhatDongHoLuc) / 1000;
  return Math.max(0, Math.round(state.thoiGianConLaiGiay - daTroiQuaGiay));
}

export function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
