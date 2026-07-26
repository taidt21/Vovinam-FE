export interface DoanAccount {
  id: string;
  tenDoan: string;
  tenNguoiDaiDien: string;
  email: string;
}

// CHỈ để giả lập luồng đăng ký/đăng nhập lúc chưa có backend — hệ thống
// thật KHÔNG BAO GIỜ lưu mật khẩu dạng chữ thô như thế này, phải hash +
// xác thực qua server. Đừng mang nguyên cách làm này sang bản thật.
interface StoredAccount extends DoanAccount {
  matKhau: string;
}

const REGISTRY_KEY = 'vovinam:portal-registry';
const SESSION_KEY = 'vovinam:portal-session';

function loadRegistry(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRegistry(list: StoredAccount[]): void {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(list));
  } catch {
    // bỏ qua
  }
}

function setSession(account: DoanAccount): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(account));
  } catch {
    // bỏ qua
  }
}

export function signUp(data: {
  tenDoan: string;
  tenNguoiDaiDien: string;
  email: string;
  matKhau: string;
}): { ok: true; account: DoanAccount } | { ok: false; error: string } {
  const registry = loadRegistry();
  if (registry.some((a) => a.email.toLowerCase() === data.email.toLowerCase())) {
    return { ok: false, error: 'Email này đã đăng ký tài khoản rồi' };
  }
  const account: StoredAccount = { id: crypto.randomUUID(), ...data };
  saveRegistry([...registry, account]);
  setSession(account);
  return { ok: true, account };
}

export function login(email: string, matKhau: string): { ok: true; account: DoanAccount } | { ok: false; error: string } {
  const found = loadRegistry().find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (!found) return { ok: false, error: 'Không tìm thấy tài khoản với email này' };
  if (found.matKhau !== matKhau) return { ok: false, error: 'Sai mật khẩu' };
  setSession(found);
  return { ok: true, account: found };
}

export function getSession(): DoanAccount | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // bỏ qua
  }
}