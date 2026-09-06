import { apiGet, apiPost } from './api';

export interface ManHinhCongKhaiTrangThai {
  dangChay: boolean;
  coTheDungMayChu: boolean;
}

export interface ManHinhCongKhaiKetQua {
  message: string;
  dangChay: boolean;
}

export function layTrangThaiManHinhCongKhai(san: string): Promise<ManHinhCongKhaiTrangThai> {
  return apiGet<ManHinhCongKhaiTrangThai>(
    `/man-hinh-cong-khai-launcher/trang-thai?san=${encodeURIComponent(san)}`,
  );
}

export function moManHinhCongKhai(san: string): Promise<ManHinhCongKhaiKetQua> {
  return apiPost<ManHinhCongKhaiKetQua>('/man-hinh-cong-khai-launcher/mo', { san });
}

export function dongManHinhCongKhai(san: string): Promise<ManHinhCongKhaiKetQua> {
  return apiPost<ManHinhCongKhaiKetQua>('/man-hinh-cong-khai-launcher/dong', { san });
}
