import * as signalR from '@microsoft/signalr';
import { calibrateServerClock } from './serverClock';
import { getAdminToken } from '../api/adminAuth';

let connection: signalR.HubConnection | null = null;
let starting: Promise<signalR.HubConnection> | null = null;
const joinedCourts = new Set<string>();
const joinedCourtsOnConnection = new Set<string>();
const joiningCourts = new Map<string, Promise<void>>();
const connectionStateListeners = new Set<(connected: boolean) => void>();
let connectionHandlersRegistered = false;
let calibrateIntervalStarted = false;
let statusSyncIntervalStarted = false;
let startedWithToken: string | null | undefined;

function build(): signalR.HubConnection {
  const conn = new signalR.HubConnectionBuilder()
    .withUrl('/hubs/match', {
      accessTokenFactory: () => getAdminToken() ?? '',
    })
    .withAutomaticReconnect([0, 500, 1000, 2000, 5000])
    .build();

  conn.onreconnected(() => {
    startedWithToken = getAdminToken();
    rejoinAllCourts(conn);
    calibrateServerClock().catch(() => {});
  });

  return conn;
}

export function getConnection(): signalR.HubConnection {
  if (!connection) connection = build();
  return connection;
}

async function joinCourt(
  conn: signalR.HubConnection,
  courtId: string,
  force = false,
): Promise<void> {
  if (!force && joinedCourtsOnConnection.has(courtId)) return;

  const pending = joiningCourts.get(courtId);
  if (pending) {
    await pending;
    if (!force) return;
  }

  const joinPromise = conn
    .invoke('JoinCourt', courtId)
    .then(() => {
      joinedCourtsOnConnection.add(courtId);
    })
    .finally(() => {
      if (joiningCourts.get(courtId) === joinPromise) {
        joiningCourts.delete(courtId);
      }
    });

  joiningCourts.set(courtId, joinPromise);
  await joinPromise;
}

function rejoinAllCourts(conn: signalR.HubConnection) {
  joinedCourtsOnConnection.clear();
  joiningCourts.clear();
  joinedCourts.forEach((id) => {
    joinCourt(conn, id).catch(() => {});
  });
}

function startCalibrateInterval() {
  if (calibrateIntervalStarted) return;
  calibrateIntervalStarted = true;
  setInterval(() => {
    calibrateServerClock().catch(() => {});
  }, 60_000);
}

// KHÔNG dựa hoàn toàn vào 3 sự kiện SignalR tự bắn (onreconnecting/
// onreconnected/onclose) để biết trạng thái — tab bị nền hoá (khoá màn
// hình điện thoại) có thể khiến JS tạm ngưng đúng lúc sự kiện đó bắn ra,
// làm giao diện "kẹt" lại sai trạng thái dù kết nối thật đã ổn. Tự kiểm
// tra lại đều đặn, không tin hoàn toàn vào việc "có ai báo cho mình biết".
function syncConnectionState() {
  const conn = getConnection();
  const connected = conn.state === signalR.HubConnectionState.Connected;
  connectionStateListeners.forEach((cb) => cb(connected));
}

function startStatusSyncInterval() {
  if (statusSyncIntervalStarted) return;
  statusSyncIntervalStarted = true;
  setInterval(syncConnectionState, 5000);
}

export async function ensureStarted(): Promise<signalR.HubConnection> {
  const conn = getConnection();

  if (conn.state === signalR.HubConnectionState.Connected) {
    const currentToken = getAdminToken();
    if (startedWithToken !== undefined && startedWithToken !== currentToken) {
      joinedCourtsOnConnection.clear();
      joiningCourts.clear();
      await conn.stop();
      startedWithToken = undefined;
      return ensureStarted();
    }
    startCalibrateInterval();
    return conn;
  }

  if (
    conn.state === signalR.HubConnectionState.Connecting ||
    conn.state === signalR.HubConnectionState.Reconnecting
  ) {
    if (starting) return starting;
    await new Promise((r) => setTimeout(r, 300));
    return ensureStarted();
  }

  if (!starting) {
    joinedCourtsOnConnection.clear();
    joiningCourts.clear();
    starting = conn
      .start()
      .then(async () => {
        startedWithToken = getAdminToken();
        rejoinAllCourts(conn);
        await calibrateServerClock();
        startCalibrateInterval();
        syncConnectionState();
        starting = null;
        return conn;
      })
      .catch((err) => {
        starting = null;
        throw err;
      });
  }
  return starting;
}

export async function ensureJoinedCourt(courtId: string, force = false): Promise<void> {
  const conn = await ensureStarted();
  joinedCourts.add(courtId);

  if (conn.state !== signalR.HubConnectionState.Connected) return;
  await joinCourt(conn, courtId, force);
}

function ensureConnectionHandlersRegistered(conn: signalR.HubConnection) {
  if (connectionHandlersRegistered) return;
  connectionHandlersRegistered = true;

  conn.onreconnecting(syncConnectionState);
  conn.onreconnected(syncConnectionState);
  conn.onclose(syncConnectionState);

  startStatusSyncInterval();

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Thứ tự quan trọng: kiểm tra + báo lại trạng thái THẬT ngay lập
        // tức (không đợi ensureStarted xong, vì nếu mạng đã ổn sẵn thì
        // không cần làm gì thêm) — rồi mới thử nối lại nếu thật sự cần.
        syncConnectionState();
        ensureStarted().catch(() => {});
      }
    });
  }
}

export function subscribeConnectionState(onChange: (connected: boolean) => void): () => void {
  const conn = getConnection();
  ensureConnectionHandlersRegistered(conn);
  connectionStateListeners.add(onChange);
  onChange(conn.state === signalR.HubConnectionState.Connected);
  return () => {
    connectionStateListeners.delete(onChange);
  };
}