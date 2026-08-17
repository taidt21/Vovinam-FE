const TOKEN_KEY = 'vovinam:admin:token';
const ROLE_KEY = 'vovinam:admin:role';

export type VaiTro = 'Admin' | 'BanThuKy';

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

export function getVaiTro(): VaiTro | null {
  try {
    const v = localStorage.getItem(ROLE_KEY);
    return v === 'Admin' || v === 'BanThuKy' ? v : null;
  } catch {
    return null;
  }
}

// Vai trò "Admin" — toàn quyền. Dùng để ẩn/khoá các thao tác chỉ Admin
// mới được làm (thiết lập giải, bốc thăm, thêm/sửa/xoá đoàn & VĐV) —
// backend vẫn tự chặn lại nếu ai đó cố gọi thẳng API, đây chỉ là lớp
// hiển thị cho gọn giao diện.
export function laAdmin(): boolean {
  return getVaiTro() === 'Admin';
}

export async function adminLogin(username: string, password: string): Promise<VaiTro> {
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
    localStorage.setItem(ROLE_KEY, data.role);
  } catch {
    // bỏ qua — vẫn đăng nhập được trong phiên hiện tại, chỉ mất khi F5
  }
  return data.role;
}

export function adminLogout(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  } catch {
    // bỏ qua
  }
}