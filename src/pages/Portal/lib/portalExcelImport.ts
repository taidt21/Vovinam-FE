import * as XLSX from 'xlsx';
import type { CompetitionEvent, GioiTinh } from '../../../types';
import { normalizeVi } from '../../../lib/utils/text';

const CURRENT_YEAR = new Date().getFullYear();

const HEADER_ALIASES: Record<string, string[]> = {
  hoTen: ['ho ten', 'ten', 'ho va ten'],
  namSinh: ['nam sinh'],
  gioiTinh: ['gioi tinh'],
  nhomTuoi: ['nhom tuoi'],
  noiDung: ['noi dung'],
};

export interface ParsedNoiDung {
  raw: string;
  eventId: string | null;
  tenDoi?: string;
}

export interface ImportRow {
  rowNumber: number;
  hoTen: string;
  namSinh: number | null;
  gioiTinh: GioiTinh | null;
  nhomTuoi: number | null;
  noiDung: ParsedNoiDung[];
  errors: string[];
}

// Tách "Tên nội dung (Tên đội)" thành 2 phần — phần ngoặc chỉ hợp lệ nếu
// nội dung đó thật sự là loại đội (hinhThucThi === 'doi').
function parseNoiDungEntry(raw: string, events: CompetitionEvent[]): { entry: ParsedNoiDung; error?: string } {
  const match = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  const tenGoc = (match ? match[1] : raw).trim();
  const tenDoiInNgoac = match ? match[2].trim() : undefined;

  const event = events.find((e) => normalizeVi(e.ten) === normalizeVi(tenGoc));
  if (!event) {
    return { entry: { raw, eventId: null, tenDoi: tenDoiInNgoac }, error: `Không tìm thấy nội dung "${tenGoc}" trong danh sách BTC đã tạo` };
  }

  const laNoiDungDoi = event.hinhThucThi === 'doi';
  if (laNoiDungDoi && !tenDoiInNgoac) {
    return { entry: { raw, eventId: event.id }, error: `"${event.ten}" là nội dung đội — cần ghi thêm tên đội trong ngoặc, VD: "${event.ten} (Đội 1)"` };
  }
  if (!laNoiDungDoi && tenDoiInNgoac) {
    return { entry: { raw, eventId: event.id }, error: `"${event.ten}" không phải nội dung đội — không cần ghi tên đội trong ngoặc` };
  }

  return { entry: { raw, eventId: event.id, tenDoi: tenDoiInNgoac } };
}

export function parseWorkbook(buffer: ArrayBuffer, events: CompetitionEvent[]): { rows: ImportRow[]; unknownColumns: string[] } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });

  if (raw.length === 0) return { rows: [], unknownColumns: [] };

  const headerRow = raw[0].map((h) => String(h));
  const colIndex: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
  const unknownColumns: string[] = [];

  headerRow.forEach((h, i) => {
    const n = normalizeVi(h);
    const field = (Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]).find((key) =>
      HEADER_ALIASES[key].some((alias) => normalizeVi(alias) === n)
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
    else if (!Number.isInteger(namSinh) || namSinh < 1970 || namSinh > CURRENT_YEAR) errors.push(`Năm sinh không hợp lệ ("${namSinhRaw}")`);

    const gioiTinhRaw = normalizeVi(get(row, 'gioiTinh'));
    let gioiTinh: GioiTinh | null = null;
    if (!gioiTinhRaw) errors.push('Thiếu giới tính');
    else if (gioiTinhRaw === 'nam') gioiTinh = 'nam';
    else if (gioiTinhRaw === 'nu') gioiTinh = 'nu';
    else errors.push(`Giới tính không hợp lệ ("${get(row, 'gioiTinh')}")`);

    const nhomTuoiRaw = get(row, 'nhomTuoi');
    const nhomTuoi = nhomTuoiRaw ? parseInt(nhomTuoiRaw.replace(/[^0-9]/g, ''), 10) : NaN;
    if (!nhomTuoiRaw) errors.push('Thiếu nhóm tuổi');
    else if (!Number.isInteger(nhomTuoi) || nhomTuoi < 1) errors.push(`Nhóm tuổi không hợp lệ ("${nhomTuoiRaw}")`);

    const noiDungRaw = get(row, 'noiDung');
    const noiDungParts = noiDungRaw ? noiDungRaw.split(';').map((s) => s.trim()).filter(Boolean) : [];
    if (noiDungParts.length === 0) errors.push('Thiếu nội dung đăng ký');

    const noiDung: ParsedNoiDung[] = [];
    for (const part of noiDungParts) {
      const { entry, error } = parseNoiDungEntry(part, events);
      noiDung.push(entry);
      if (error) errors.push(error);
    }

    return {
      rowNumber: i + 2,
      hoTen,
      namSinh: Number.isInteger(namSinh) ? namSinh : null,
      gioiTinh,
      nhomTuoi: Number.isInteger(nhomTuoi) ? nhomTuoi : null,
      noiDung,
      errors,
    };
  });

  return { rows, unknownColumns };
}

export function buildTemplateFile(events: CompetitionEvent[]): Blob {
  const teamEvent = events.find((e) => e.hinhThucThi === 'doi');
  const soloEvent = events.find((e) => e.hinhThucThi !== 'doi') ?? events[0];

  const headers = ['Họ tên', 'Năm sinh', 'Giới tính', 'Nhóm tuổi', 'Nội dung'];
  const rows: (string | number)[][] = [headers];
  if (soloEvent) rows.push(['Nguyễn Văn A', 2008, 'Nam', 2, soloEvent.ten]);
  if (teamEvent) {
    rows.push(['Trần Văn B', 2008, 'Nam', 2, `${teamEvent.ten} (Đội 1)`]);
    rows.push(['Lê Văn C', 2008, 'Nam', 2, `${teamEvent.ten} (Đội 1)`]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'VĐV');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/octet-stream' });
}
// Mỗi đơn vị (ở đây = tài khoản trưởng đoàn) chỉ được có ĐÚNG 1 đội cho mỗi
// nội dung đồng đội. Hàm này chạy SAU parseWorkbook, xét cả đội đã có sẵn
// từ trước (existingSquads) lẫn thứ tự các dòng trong file đang import —
// tên đội xuất hiện ĐẦU TIÊN cho 1 nội dung được coi là "chốt", tên nào
// khác đi sau đó cho cùng nội dung sẽ bị báo lỗi.
export function validateTeamConsistency(rows: ImportRow[], existingSquads: { eventId: string; ten: string }[]): ImportRow[] {
  const claimed = new Map<string, string>();
  for (const s of existingSquads) {
    if (!claimed.has(s.eventId)) claimed.set(s.eventId, s.ten);
  }

  return rows.map((row) => {
    const extraErrors: string[] = [];
    for (const n of row.noiDung) {
      if (!n.eventId || !n.tenDoi) continue;
      const existing = claimed.get(n.eventId);
      if (existing === undefined) {
        claimed.set(n.eventId, n.tenDoi);
      } else if (existing !== n.tenDoi) {
        extraErrors.push(`Đơn vị đã có đội "${existing}" cho nội dung này — không thể thêm đội "${n.tenDoi}" khác (mỗi đơn vị chỉ được đăng ký tối đa 1 đội/nội dung đồng đội)`);
      }
    }
    return extraErrors.length > 0 ? { ...row, errors: [...row.errors, ...extraErrors] } : row;
  });
}