import { ensureStarted, ensureJoinedCourt, getConnection } from './matchHubConnection';

export interface MatchLogEntry {
  id: string;
  luc: string;
  noiDung: string;
  matchTimeLabel?: string | null;
  giamDinhId?: string | null;
}
export interface ConsensusEvent {
  mau: 'do' | 'xanh';
  diem: number;
  soLuong: number;
  luc: string;
}
export interface LightPressEvent {
  giamDinhId: string;
  tenTrongTai: string;
  mau: 'do' | 'xanh';
  diem: number;
  luc: string;
}

const logCache = new Map<string, MatchLogEntry[]>();
const logListeners = new Map<string, Set<(log: MatchLogEntry[]) => void>>();
const consensusListeners = new Map<string, Set<(e: ConsensusEvent) => void>>();
const pressListeners = new Map<string, Set<(e: LightPressEvent) => void>>();
const rejectListeners = new Set<(message: string) => void>();

function notifyLog(courtId: string, log: MatchLogEntry[]) {
  logCache.set(courtId, log);
  logListeners.get(courtId)?.forEach((cb) => cb(log));
}

let handlersRegistered = false;
function ensureHandlersRegistered() {
  if (handlersRegistered) return;
  handlersRegistered = true;
  const conn = getConnection();

  conn.on('CourtSnapshot', (courtId: string, snapshot: { log: MatchLogEntry[] }) => {
    notifyLog(courtId, snapshot.log ?? []);
  });
  conn.on('LogEntryAdded', (courtId: string, entry: MatchLogEntry) => {
    notifyLog(courtId, [...(logCache.get(courtId) ?? []), entry]);
  });
  conn.on('LogEntryRemoved', (courtId: string, id: string) => {
    notifyLog(courtId, (logCache.get(courtId) ?? []).filter((e) => e.id !== id));
  });
  conn.on(
    'ConsensusScored',
    (courtId: string, mau: 'do' | 'xanh', diem: number, soLuong: number, luc: string) => {
      consensusListeners.get(courtId)?.forEach((cb) => cb({ mau, diem, soLuong, luc }));
    },
  );
  conn.on(
    'LightPressed',
    (courtId: string, giamDinhId: string, tenTrongTai: string, mau: 'do' | 'xanh', diem: number, luc: string) => {
      pressListeners.get(courtId)?.forEach((cb) => cb({ giamDinhId, tenTrongTai, mau, diem, luc }));
    },
  );
  conn.on('PressRejected', (message: string) => {
    rejectListeners.forEach((cb) => cb(message));
  });
}

// Bấm đèn — gửi ngay, không đợi phản hồi (fire-and-forget). Xác nhận thật
// sự "đã ghi điểm" đến qua sự kiện ConsensusScored (subscribeConsensus),
// không phải qua return value của hàm này.
export function pressLight(
  courtId: string,
  giamDinhId: string,
  tenTrongTai: string,
  mau: 'do' | 'xanh',
  diem: 1 | 2,
  matchTimeLabel?: string,
): void {
  ensureHandlersRegistered();
  ensureStarted()
    .then((conn) => conn.invoke('PressLight', courtId, giamDinhId, tenTrongTai, mau, diem, matchTimeLabel))
    .catch(() => {
      rejectListeners.forEach((cb) => cb('Gửi không thành công — kiểm tra kết nối mạng.'));
    });
}

export function getMatchLog(courtId: string): MatchLogEntry[] {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  return logCache.get(courtId) ?? [];
}

// Bàn thư ký cộng/trừ điểm tay — chỉ để GHI LOG (điểm số thật vẫn gửi
// qua publishMatchState như trước, tách riêng đúng ở đây để Nhật ký
// trận đấu hiện đủ cả thao tác tay lẫn đèn giám định cùng 1 nơi).
// Trả về Id của dòng log vừa tạo (null nếu gửi lỗi) — gọi nơi dùng giữ
// lại Id này để lỡ hoàn tác thì xoá đúng dòng, xem xoaLogDieuChinhDiem.
export function ghiLogDieuChinhDiem(
  courtId: string,
  noiDung: string,
  matchTimeLabel?: string,
): Promise<string | null> {
  ensureHandlersRegistered();
  return ensureStarted()
    .then((conn) => conn.invoke<string>('GhiLogDieuChinhDiem', courtId, noiDung, matchTimeLabel))
    .catch(() => null);
}

// Hoàn tác điều chỉnh điểm tay — xoá HẲN dòng log gốc (không thêm dòng
// "hoàn tác" mới) theo đúng Id đã lưu từ lúc ghiLogDieuChinhDiem trả
// về. Gửi ngay, không đợi phản hồi — điểm số đã tự lùi lại đúng ở phía
// state cục bộ rồi, lỗi xoá log (nếu có) không ảnh hưởng gì tới đó.
export function xoaLogDieuChinhDiem(courtId: string, id: string): void {
  ensureHandlersRegistered();
  ensureStarted()
    .then((conn) => conn.invoke('XoaLogDieuChinhDiem', courtId, id))
    .catch(() => {});
}

export function subscribeMatchLog(courtId: string, onChange: (log: MatchLogEntry[]) => void): () => void {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  if (!logListeners.has(courtId)) logListeners.set(courtId, new Set());
  logListeners.get(courtId)!.add(onChange);
  return () => {
    logListeners.get(courtId)?.delete(onChange);
  };
}

export function subscribeConsensus(courtId: string, onConsensus: (e: ConsensusEvent) => void): () => void {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  if (!consensusListeners.has(courtId)) consensusListeners.set(courtId, new Set());
  consensusListeners.get(courtId)!.add(onConsensus);
  return () => {
    consensusListeners.get(courtId)?.delete(onConsensus);
  };
}

export function subscribeLightPressed(courtId: string, onPress: (e: LightPressEvent) => void): () => void {
  ensureHandlersRegistered();
  ensureJoinedCourt(courtId).catch(() => {});
  if (!pressListeners.has(courtId)) pressListeners.set(courtId, new Set());
  pressListeners.get(courtId)!.add(onPress);
  return () => {
    pressListeners.get(courtId)?.delete(onPress);
  };
}

export function subscribeRejected(onReject: (message: string) => void): () => void {
  ensureHandlersRegistered();
  rejectListeners.add(onReject);
  return () => {
    rejectListeners.delete(onReject);
  };
}