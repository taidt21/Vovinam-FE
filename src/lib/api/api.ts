import { getAdminToken, adminLogout } from './adminAuth';

const BASE = '/api';

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Token không còn hợp lệ (hết hạn, hoặc tài khoản/role đã đổi) —
    // trước đây chỉ ném lỗi ra console, trang vẫn đứng yên trông như bị
    // treo/lỗi vô cớ. Giờ dọn phiên đăng nhập cũ rồi đưa thẳng về trang
    // đăng nhập, thay vì để mỗi lần gọi API lại âm thầm 401 tiếp.
    adminLogout();
    if (!window.location.pathname.startsWith('/admin-dang-nhap')) {
      window.location.href = '/admin-dang-nhap';
    }
    throw new Error('Phiên đăng nhập đã hết hạn — vui lòng đăng nhập lại.');
  }
  if (!res.ok) {
    let message = `Lỗi ${res.status}`;
    const text = await res.text().catch(() => '');
    try {
      const parsed = JSON.parse(text);
      message = typeof parsed === 'string' ? parsed : message;
    } catch {
      message = text || message;
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function authHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function apiGet<T>(path: string): Promise<T> {
  return fetch(`${BASE}${path}`, { headers: authHeaders() }).then((r) => handle<T>(r));
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) => handle<T>(r));
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) => handle<T>(r));
}

export function apiDelete(path: string): Promise<void> {
  return fetch(`${BASE}${path}`, { method: 'DELETE', headers: authHeaders() }).then((r) => handle<void>(r));
}