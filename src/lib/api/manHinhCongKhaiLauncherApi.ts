import { apiGet, apiPost } from './api';

export interface ManHinhCongKhaiTrangThai {
  dangChay: boolean;
}

export interface ManHinhCongKhaiKetQua {
  message: string;
  dangChay: boolean;
}

export function layTrangThaiManHinhCongKhai(): Promise<ManHinhCongKhaiTrangThai> {
  return apiGet<ManHinhCongKhaiTrangThai>('/man-hinh-cong-khai-launcher/trang-thai');
}

export function moManHinhCongKhai(san: string): Promise<ManHinhCongKhaiKetQua> {
  return apiPost<ManHinhCongKhaiKetQua>('/man-hinh-cong-khai-launcher/mo', { san });
}

export function dongManHinhCongKhai(): Promise<ManHinhCongKhaiKetQua> {
  return apiPost<ManHinhCongKhaiKetQua>('/man-hinh-cong-khai-launcher/dong', {});
}
