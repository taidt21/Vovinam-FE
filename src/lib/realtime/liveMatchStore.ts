import type { LiveMatchState } from '../../types/live';
import { ensureStarted, ensureJoinedCourt, getConnection } from './matchHubConnection';
import { serverNow } from './serverClock';
const cache = new Map<string, LiveMatchState | null>();
const listenersByCourtId = new Map<string, Set<(state: LiveMatchState | null) => void>>();

function notify(courtId: string, state: LiveMatchState | null) {
  cache.set(courtId, state);
  listenersByCourtId.get(courtId)?.forEach((cb) => cb(state));
}

let handlersRegistered = false;
function ensureHandlersRegistered() {
  if (handlersRegistered) return;
  handlersRegistered = true;
  const conn = getConnection();

  conn.on('CourtSnapshot', (courtId: string, snapshot: { matchState: LiveMatchState | null }) => {
    notify(courtId, snapshot.matchState ?? null);
  });
  conn.on('MatchStateUpdated', (courtId: string, state: LiveMatchState) => {
    notify(courtId, state);
  });
  conn.on('MatchStateCleared', (courtId: string) => {
    notify(courtId, null);
  });
}

export function getMatchSnapshot(courtId: string): LiveMatchState | null {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  return cache.get(courtId) ?? null;
}

export function publishMatchState(state: LiveMatchState): void {
  ensureHandlersRegistered();
  notify(state.courtId, state); // optimistic — thư ký thấy ngay thay đổi của chính mình
  ensureStarted()
    .then((conn) => conn.invoke('PublishMatchState', state.courtId, state))
    .catch(() => {});
}

export function clearMatchState(courtId: string): void {
  ensureHandlersRegistered();
  notify(courtId, null);
  ensureStarted()
    .then((conn) => conn.invoke('ClearMatchState', courtId))
    .catch(() => {});
}

export function subscribeMatchState(
  courtId: string,
  onChange: (state: LiveMatchState | null) => void,
): () => void {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  if (!listenersByCourtId.has(courtId)) listenersByCourtId.set(courtId, new Set());
  listenersByCourtId.get(courtId)!.add(onChange);
  return () => {
    listenersByCourtId.get(courtId)?.delete(onChange);
  };
}

// 2 hàm dưới thuần tính toán, không đụng gì tới mạng — giữ y nguyên.
export function tinhThoiGianConLai(state: LiveMatchState): number {
  const dangChay = state.trangThai === 'dang_thi' || state.trangThai === 'nghi_giua_hiep';
  if (!dangChay) return state.thoiGianConLaiGiay;
  const daTroiQuaGiay = (serverNow() - state.capNhatDongHoLuc) / 1000;
  return Math.max(0, Math.round(state.thoiGianConLaiGiay - daTroiQuaGiay));
}

export function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

// Nhãn "Hiệp X - MM:SS" để ghi kèm vào Nhật ký trận đấu — tính ở ĐÂY
// (frontend), KHÔNG để backend tự tính lại. Backend tự tính dựa vào
// state nó đang lưu trong bộ nhớ, đúng lúc ghi log có thể state đó
// chưa đầy đủ (VD vừa restart backend, chưa ai vào lại đúng sân đó) —
// khi đó backend trả về null, phía hiển thị lại rơi về giờ thực (đồng
// hồ hệ thống) thay vì đồng hồ đếm ngược trận đấu, gây lẫn lộn 2 loại
// giờ khác nhau trong cùng 1 nhật ký. Ở đây LUÔN có sẵn state đầy đủ
// (đang hiển thị ngay trên màn hình), nên tính xong gửi thẳng lên,
// backend chỉ cần lưu lại nguyên văn, không tự đoán lại nữa.
export function tinhNhanThoiGianTran(state: LiveMatchState): string {
  const giay = tinhThoiGianConLai(state);
  return `Hiệp ${state.hiepHienTai} - ${formatMmSs(giay)}`;
}