import { apiGet, apiPost, apiPut, apiDelete } from './api';

export interface BanThuKyAccountWire {
  id: string;
  username: string;
  tenHienThi: string;
  courtId: string | null;
}

export function fetchBanThuKyAccounts(): Promise<BanThuKyAccountWire[]> {
  return apiGet<BanThuKyAccountWire[]>('/ban-thu-ky-accounts');
}

export function createBanThuKyAccount(payload: {
  username: string;
  password: string;
  tenHienThi: string;
  courtId: string | null;
}): Promise<BanThuKyAccountWire> {
  return apiPost<BanThuKyAccountWire>('/ban-thu-ky-accounts', payload);
}

export function updateBanThuKyAccount(
  id: string,
  payload: { tenHienThi: string; courtId: string | null; passwordMoi?: string },
): Promise<void> {
  return apiPut<void>(`/ban-thu-ky-accounts/${id}`, payload);
}

export function deleteBanThuKyAccount(id: string): Promise<void> {
  return apiDelete(`/ban-thu-ky-accounts/${id}`);
}
