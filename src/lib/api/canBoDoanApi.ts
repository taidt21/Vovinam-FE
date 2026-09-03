import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from './api';

export interface CanBoDoanWire {
  id: string;
  hoTen: string;
  vaiTro: string;
  anhDaiDien: string | null;
  teamId: string;
  teamTen: string;
}

export interface CanBoDoanUpsertPayload {
  hoTen: string;
  vaiTro: string;
  teamId: string;
  // Chỉ áp dụng lúc TẠO MỚI (import Excel) — backend tự tải ảnh từ URL
  // này về lưu local, không lưu thẳng URL ngoài (tránh lỗi CORS lúc in
  // PDF). Không dùng khi sửa (PUT) — đổi ảnh sau đó qua uploadCanBoDoanAnh.
  anhDaiDien?: string | null;
}

export function fetchCanBoDoan(): Promise<CanBoDoanWire[]> {
  return apiGet<CanBoDoanWire[]>('/can-bo-doan');
}

export function createCanBoDoan(payload: CanBoDoanUpsertPayload): Promise<CanBoDoanWire> {
  return apiPost<CanBoDoanWire>('/can-bo-doan', payload);
}

export function updateCanBoDoan(id: string, payload: CanBoDoanUpsertPayload): Promise<void> {
  return apiPut<void>(`/can-bo-doan/${id}`, payload);
}

export function deleteCanBoDoan(id: string): Promise<void> {
  return apiDelete(`/can-bo-doan/${id}`);
}

export function uploadCanBoDoanAnh(id: string, file: File): Promise<CanBoDoanWire> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<CanBoDoanWire>(`/can-bo-doan/${id}/anh`, formData);
}
