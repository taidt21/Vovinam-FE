import * as XLSX from 'xlsx';
import type { CompetitionEvent, GioiTinh } from '../../types';
import { normalizeVi as normalize } from '../utils/text';
import { NHOM_TUOI_OPTIONS } from '../utils/nhomTuoi';

const CURRENT_YEAR = new Date().getFullYear();

const HEADER_ALIASES: Record<string, string[]> = {
  hoTen: ['ho ten', 'ten', 'ho va ten'],
  namSinh: ['nam sinh'],
  gioiTinh: ['gioi tinh'],
  nhomTuoi: ['nhom tuoi'],
  donVi: ['don vi', 'doan'],
  noiDung: ['noi dung'],
  anhDaiDien: ['link anh', 'anh', 'anh dai dien', 'url anh', 'photo url', 'image url'],
};

export interface ImportRow {
  rowNumber: number;
  hoTen: string;
  namSinh: number | null;
  gioiTinh: GioiTinh | null;
  nhomTuoi: string;
  donVi: string;
  noiDung: string[];
  anhDaiDien: string;
  eventIds: string[];
  errors: string[];
}

function athleteKey(hoTen: string, namSinh: number): string {
  return `${normalize(hoTen)}::${namSinh}`;
}

export function parseWorkbook(
  buffer: ArrayBuffer,
  events: CompetitionEvent[],
  existingAthletes: { hoTen: string; namSinh: number }[],
): { rows: ImportRow[]; unknownColumns: string[] } {
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

  // Trùng với VĐV đã có sẵn trong hệ thống (import lại file cũ, hoặc file
  // mới đè lên dữ liệu đã nhập tay từ trước).
  const existingKeys = new Set(existingAthletes.map((a) => athleteKey(a.hoTen, a.namSinh)));
  // Trùng NGAY TRONG CHÍNH FILE đang import (2 dòng cùng tên + năm sinh).
  const seenInThisFile = new Map<string, number>();

  const rows: ImportRow[] = raw.slice(1).map((row, i) => {
    const rowNumber = i + 2;
    const errors: string[] = [];

    const hoTen = get(row, 'hoTen');
    if (!hoTen) errors.push('Thiếu họ tên');

    const namSinhRaw = get(row, 'namSinh');
    const namSinh = namSinhRaw ? Number(namSinhRaw) : NaN;
    if (!namSinhRaw) errors.push('Thiếu năm sinh');
    else if (!Number.isInteger(namSinh) || namSinh < 1970 || namSinh > CURRENT_YEAR) {
      errors.push(`Năm sinh không hợp lệ ("${namSinhRaw}")`);
    }

    if (hoTen && Number.isInteger(namSinh)) {
      const key = athleteKey(hoTen, namSinh);
      if (existingKeys.has(key)) {
        errors.push(`VĐV "${hoTen}" (${namSinh}) đã có sẵn trong hệ thống — bỏ dòng này để tránh tạo trùng`);
      } else if (seenInThisFile.has(key)) {
        errors.push(`Trùng với dòng ${seenInThisFile.get(key)} trong cùng file này`);
      } else {
        seenInThisFile.set(key, rowNumber);
      }
    }

    const gioiTinhRaw = normalize(get(row, 'gioiTinh'));
    let gioiTinh: GioiTinh | null = null;
    if (!gioiTinhRaw) errors.push('Thiếu giới tính');
    else if (gioiTinhRaw === 'nam') gioiTinh = 'nam';
    else if (gioiTinhRaw === 'nu') gioiTinh = 'nu';
    else errors.push(`Giới tính không hợp lệ ("${get(row, 'gioiTinh')}") — chỉ nhận Nam/Nữ`);

    const nhomTuoiRaw = get(row, 'nhomTuoi');
    const nhomTuoiNum = nhomTuoiRaw ? parseInt(nhomTuoiRaw.replace(/[^0-9]/g, ''), 10) : NaN;
    if (!nhomTuoiRaw) errors.push('Thiếu nhóm tuổi');
    else if (!NHOM_TUOI_OPTIONS.includes(nhomTuoiNum)) {
      errors.push(`Nhóm tuổi không hợp lệ ("${nhomTuoiRaw}") — chỉ nhận ${NHOM_TUOI_OPTIONS.join('/')}`);
    }

    const donVi = get(row, 'donVi');
    if (!donVi) errors.push('Thiếu đơn vị');

    // Link ảnh là cột tuỳ chọn do website WordPress xuất ra. Không bắt
    // buộc phải có ảnh; nếu có thì giữ nguyên URL để backend lưu và các
    // màn Bàn thư ký / Trọng tài / Màn hình công khai dùng AthleteAvatar.
    const anhDaiDien = get(row, 'anhDaiDien');

    const noiDungRaw = get(row, 'noiDung');
    const noiDungParts = noiDungRaw ? noiDungRaw.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : [];
    const eventIds: string[] = [];
    for (const part of noiDungParts) {
      const candidates = events.filter((ev) => normalize(ev.ten) === normalize(part));
      if (candidates.length === 0) {
        errors.push(`Không tìm thấy nội dung "${part}" trong danh sách đã tạo ở Thiết lập giải`);
        continue;
      }
      // Nhiều nội dung trùng tên (khác nhóm tuổi) — ưu tiên đúng nhóm tuổi
      // của chính VĐV này, sau đó mới tới nội dung hỗn hợp nhóm tuổi.
      let matched = candidates.find((ev) => ev.nhomTuoi === nhomTuoiNum);
      if (!matched) matched = candidates.find((ev) => ev.nhomTuoi === 'hon_hop');
      if (!matched && candidates.length > 1) {
        errors.push(`"${part}" có ${candidates.length} bản trùng tên khác nhóm tuổi, không bản nào khớp Nhóm tuổi ${nhomTuoiNum} của VĐV này — sửa lại nhóm tuổi hoặc tên nội dung cho khớp`);
        continue;
      }
      eventIds.push((matched ?? candidates[0]).id);
    }

    return {
      rowNumber,
      hoTen,
      namSinh: Number.isInteger(namSinh) ? namSinh : null,
      gioiTinh,
      nhomTuoi: nhomTuoiRaw,
      donVi,
      noiDung: noiDungParts,
      anhDaiDien,
      eventIds,
      errors,
    };
  });

  return { rows, unknownColumns };
}

export function buildTemplateFile(): Blob {
  const headers = ['Họ tên', 'Năm sinh', 'Giới tính', 'Nhóm tuổi', 'Đơn vị', 'Nội dung', 'Link ảnh'];
  const example = [
    'Nguyễn Văn A',
    2008,
    'Nam',
    2,
    'Bình Dương',
    'Đối kháng nam - 54kg',
    'https://example.com/uploads/nguyen-van-a.jpg',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'VĐV');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/octet-stream' });
}