import { apiGet, apiUpload, apiDelete } from './api';

export interface TheVdvLogoWire {
  id: string;
  duongDan: string;
  thuTu: number;
}

export function fetchTheVdvLogos(): Promise<TheVdvLogoWire[]> {
  return apiGet<TheVdvLogoWire[]>('/the-vdv-logos');
}

export function uploadTheVdvLogo(file: File): Promise<TheVdvLogoWire> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<TheVdvLogoWire>('/the-vdv-logos', formData);
}

export function deleteTheVdvLogo(id: string): Promise<void> {
  return apiDelete(`/the-vdv-logos/${id}`);
}
