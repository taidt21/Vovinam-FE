import type { LiveQuyenState } from '../../types/liveQuyen';
import { ensureStarted, ensureJoinedCourt, getConnection } from './matchHubConnection';
import { serverNow } from './serverClock';

const cache = new Map<string, LiveQuyenState | null>();
const listenersByCourtId = new Map<string, Set<(state: LiveQuyenState | null) => void>>();

function notify(courtId: string, state: LiveQuyenState | null) {
  cache.set(courtId, state);
  listenersByCourtId.get(courtId)?.forEach((cb) => cb(state));
}

let handlersRegistered = false;
function ensureHandlersRegistered() {
  if (handlersRegistered) return;
  handlersRegistered = true;
  const conn = getConnection();

  conn.on('CourtSnapshot', (courtId: string, snapshot: { quyenState: LiveQuyenState | null }) => {
    // CourtSnapshot là phản hồi cho ĐÚNG 1 lần gọi JoinCourt cụ thể —
    // KHÔNG phải tín hiệu "trạng thái vừa đổi". Nếu backend xử lý lần
    // gọi đó chậm (VD lúc mới mount trang, hoặc backend vừa khởi động
    // lại đang xử lý dồn), phản hồi có thể tới TRỄ hơn hẳn 1 cập nhật
    // MỚI HƠN mà client đã tự nhận được entretemps — áp thẳng snapshot
    // cũ (null) lúc đó sẽ XOÁ MẤT trạng thái mới vừa thiết lập. Chỉ áp
    // dụng snapshot null khi client CHƯA từng có gì.
    if (cache.get(courtId) == null || snapshot.quyenState != null) {
      notify(courtId, snapshot.quyenState ?? null);
    }
  });
  conn.on('QuyenStateUpdated', (courtId: string, state: LiveQuyenState) => {
    notify(courtId, state);
  });
  conn.on('QuyenStateCleared', (courtId: string) => {
    notify(courtId, null);
  });
}

export function getQuyenSnapshot(courtId: string): LiveQuyenState | null {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  return cache.get(courtId) ?? null;
}

export function publishQuyenState(state: LiveQuyenState): void {
  ensureHandlersRegistered();
  notify(state.courtId, state);
  ensureStarted()
    .then((conn) => conn.invoke('PublishQuyenState', state.courtId, state))
    .catch(() => {});
}

export function clearQuyenState(courtId: string): void {
  ensureHandlersRegistered();
  notify(courtId, null);
  ensureStarted()
    .then((conn) => conn.invoke('ClearQuyenState', courtId))
    .catch(() => {});
}

export function subscribeQuyenState(
  courtId: string,
  onChange: (state: LiveQuyenState | null) => void,
): () => void {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  if (!listenersByCourtId.has(courtId)) listenersByCourtId.set(courtId, new Set());
  listenersByCourtId.get(courtId)!.add(onChange);
  return () => {
    listenersByCourtId.get(courtId)?.delete(onChange);
  };
}

export function tinhThoiGianDaTroi(state: LiveQuyenState): number {
  const dangChay = state.trangThai === 'dang_thi';
  if (!dangChay) return state.thoiGianDaTroiGiay;
  const elapsed = (serverNow() - state.capNhatDongHoLuc) / 1000;
  return state.thoiGianDaTroiGiay + elapsed;
}
