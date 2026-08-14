const TOKEN_KEY = 'vovinam:admin:token';

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function isAdminLoggedIn(): boolean {
  return !!getAdminToken();
}

export async function adminLogin(username: string, password: string): Promise<void> {
  const res = await fetch('/api/admin-auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Đăng nhập thất bại');
  }
  const data = await res.json();
  try {
    localStorage.setItem(TOKEN_KEY, data.token);
  } catch {
    // bỏ qua — vẫn đăng nhập được trong phiên hiện tại, chỉ mất khi F5
  }
}

export function adminLogout(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // bỏ qua
  }
}