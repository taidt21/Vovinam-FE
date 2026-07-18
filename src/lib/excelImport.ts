import * as XLSX from 'xlsx';
import type { GioiTinh } from '../types';
import { normalizeVi as normalize } from './text';
const CURRENT_YEAR = new Date().getFullYear();
export const NHOM_TUOI_OPTIONS = ['Nhóm tuổi 1', 'Nhóm tuổi 2', 'Nhóm tuổi 3'];

const HEADER_ALIASES: Record<string, string[]> = {
  hoTen: ['ho ten', 'ten', 'ho va ten'],
  namSinh: ['nam sinh'],
  gioiTinh: ['gioi tinh'],
  nhomTuoi: ['nhom tuoi'],
  donVi: ['don vi', 'doan'],
  noiDung: ['noi dung'],
};

// Bỏ dấu tiếng Việt để so khớp tên cột không phân biệt có/không dấu, hoa/thường
// function normalize(s: string): string {
//   return s
//     .normalize('NFD')
//     .replace(/[\u0300-\u036f]/g, '')
//     .replace(/đ/g, 'd')
//     .replace(/Đ/g, 'D')
//     .trim()
//     .toLowerCase();
// }

export interface ImportRow {
  rowNumber: number; // số dòng thật trong Excel, để báo lỗi đúng dòng
  hoTen: string;
  namSinh: number | null;
  gioiTinh: GioiTinh | null;
  nhomTuoi: string;
  donVi: string;
  noiDung: string[];
  errors: string[];
}

export function parseWorkbook(buffer: ArrayBuffer): { rows: ImportRow[]; unknownColumns: string[] } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });

  if (raw.length === 0) return { rows: [], unknownColumns: [] };

  const headerRow = raw[0].map((h) => String(h));
  const colIndex: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
  const unknownColumns: string[] = [];

  headerRow.forEach((h, i) => {
    const n = normalize(h);
    const field = (Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]).find((key) =>
      HEADER_ALIASES[key].some((alias) => normalize(alias) === n)
    );
    if (field) colIndex[field] = i;
    else if (h.trim()) unknownColumns.push(h);
  });

  const get = (row: string[], field: keyof typeof HEADER_ALIASES) => {
    const idx = colIndex[field];
    return idx === undefined ? '' : String(row[idx] ?? '').trim();
  };

  const rows: ImportRow[] = raw.slice(1).map((row, i) => {
    const errors: string[] = [];

    const hoTen = get(row, 'hoTen');
    if (!hoTen) errors.push('Thiếu họ tên');

    const namSinhRaw = get(row, 'namSinh');
    const namSinh = namSinhRaw ? Number(namSinhRaw) : NaN;
    if (!namSinhRaw) errors.push('Thiếu năm sinh');
    else if (!Number.isInteger(namSinh) || namSinh < 1970 || namSinh > CURRENT_YEAR) {
      errors.push(`Năm sinh không hợp lệ ("${namSinhRaw}")`);
    }

    const gioiTinhRaw = normalize(get(row, 'gioiTinh'));
    let gioiTinh: GioiTinh | null = null;
    if (!gioiTinhRaw) errors.push('Thiếu giới tính');
    else if (gioiTinhRaw === 'nam') gioiTinh = 'nam';
    else if (gioiTinhRaw === 'nu') gioiTinh = 'nu';
    else errors.push(`Giới tính không hợp lệ ("${get(row, 'gioiTinh')}") — chỉ nhận Nam/Nữ`);

    const nhomTuoiRaw = get(row, 'nhomTuoi');
    const nhomTuoiMatch = NHOM_TUOI_OPTIONS.find((o) => normalize(o) === normalize(nhomTuoiRaw));
    if (!nhomTuoiRaw) errors.push('Thiếu nhóm tuổi');
    else if (!nhomTuoiMatch) errors.push(`Nhóm tuổi không hợp lệ ("${nhomTuoiRaw}") — chỉ nhận ${NHOM_TUOI_OPTIONS.join('/')}`);

    const donVi = get(row, 'donVi');
    if (!donVi) errors.push('Thiếu đơn vị');

    const noiDungRaw = get(row, 'noiDung');
    const noiDung = noiDungRaw ? noiDungRaw.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : [];

    return {
      rowNumber: i + 2, // +2: bù dòng header + đánh số từ 1
      hoTen,
      namSinh: Number.isInteger(namSinh) ? namSinh : null,
      gioiTinh,
      nhomTuoi: nhomTuoiMatch ?? nhomTuoiRaw,
      donVi,
      noiDung,
      errors,
    };
  });

  return { rows, unknownColumns };
}

export function buildTemplateFile(): Blob {
  const headers = ['Họ tên', 'Năm sinh', 'Giới tính', 'Nhóm tuổi', 'Đơn vị', 'Nội dung'];
  const example = ['Nguyễn Văn A', 2008, 'Nam', 'Nhóm tuổi 2', 'Bình Dương', 'Đối kháng nam - 54kg'];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'VĐV');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/octet-stream' });
}