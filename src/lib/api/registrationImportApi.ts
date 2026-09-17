import { apiUpload } from "./api";

export interface RegistrationImportResult {
  donVi: number;
  donViMoi: number;
  logoDonVi: number;
  canBo: number;
  anhCanBo: number;
  vdv: number;
  anhVdv: number;
  dangKyNoiDung: number;
  boQua: number;
  canhBao: string[];
}

export function importRegistrationExcel(file: File): Promise<RegistrationImportResult> {
  const form = new FormData();
  form.append("file", file);
  return apiUpload<RegistrationImportResult>("/import/registration", form);
}
