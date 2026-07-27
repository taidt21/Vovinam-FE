const BASE = '/api';

async function handle<T>(res: Response): Promise<T> {
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

export function apiGet<T>(path: string): Promise<T> {
  return fetch(`${BASE}${path}`).then((r) => handle<T>(r));
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => handle<T>(r));
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => handle<T>(r));
}

export function apiDelete(path: string): Promise<void> {
  return fetch(`${BASE}${path}`, { method: 'DELETE' }).then((r) => handle<void>(r));
}