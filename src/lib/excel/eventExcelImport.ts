import * as XLSX from 'xlsx';
import type { CompetitionEvent } from '../../types';
import { normalizeVi as normalize } from '../utils/text';
import { NHOM_TUOI_OPTIONS } from '../utils/nhomTuoi';

const HEADER_ALIASES: Record<string, string[]> = {
  ten: ['ten', 'ten noi dung'],
  loai: ['loai'],
  gioiTinh: ['gioi tinh'],
  hinhThucThi: ['hinh thuc thi', 'hinh thuc'],
  nhomTuoi: ['nhom tuoi'],
  hangCan: ['hang can'],
  thoiGianBaiGiay: ['thoi gian tham chieu', 'thoi gian bai', 'thoi gian'],
};

export interface EventImportRow {
  rowNumber: number;
  ten: string;
  loai: 'quyen' | 'doi_khang' | null;
  gioiTinh: 'nam' | 'nu' | 'hon_hop' | null;
  hinhThucThi: 'ca_nhan' | 'doi';
  nhomTuoi: number | 'hon_hop' | null;
  hangCan: number | null;
  thoiGianBaiGiay: number | null;
  errors: string[];
}

// "Trùng" phải tính theo CẢ tên lẫn nhóm tuổi — cùng tên nhưng khác nhóm
// tuổi là 2 nội dung khác nhau thật sự (VD "Đối kháng nam - 48kg" thi ở
// cả Nhóm tuổi 1 và Nhóm tuổi 2), không phải bản sao của nhau.
function eventKey(ten: string, nhomTuoi: number | 'hon_hop'): string {
  return `${normalize(ten)}::${nhomTuoi}`;
}

export function parseEventsWorkbook(
  buffer: ArrayBuffer,
  existingEvents: CompetitionEvent[],
): { rows: EventImportRow[]; unknownColumns: string[] } {
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

  const existingKeys = new Set(existingEvents.map((e) => eventKey(e.ten, e.nhomTuoi)));
  const seenInThisFile = new Map<string, number>();

  const rows: EventImportRow[] = raw.slice(1).map((row, i) => {
    const rowNumber = i + 2;
    const errors: string[] = [];

    const ten = get(row, 'ten');
    if (!ten) errors.push('Thiếu tên nội dung');

    const loaiRaw = normalize(get(row, 'loai'));
    let loai: 'quyen' | 'doi_khang' | null = null;
    if (!loaiRaw) errors.push('Thiếu loại');
    else if (loaiRaw === 'quyen') loai = 'quyen';
    else if (loaiRaw === 'doi khang') loai = 'doi_khang';
    else errors.push(`Loại không hợp lệ ("${get(row, 'loai')}") — chỉ nhận Quyền/Đối kháng`);

    const gioiTinhRaw = normalize(get(row, 'gioiTinh'));
    let gioiTinh: 'nam' | 'nu' | 'hon_hop' | null = null;
    if (!gioiTinhRaw) errors.push('Thiếu giới tính');
    else if (gioiTinhRaw === 'nam') gioiTinh = 'nam';
    else if (gioiTinhRaw === 'nu') gioiTinh = 'nu';
    else if (gioiTinhRaw === 'hon hop') gioiTinh = 'hon_hop';
    else errors.push(`Giới tính không hợp lệ ("${get(row, 'gioiTinh')}") — chỉ nhận Nam/Nữ/Hỗn hợp`);

const hinhThucRaw = normalize(get(row, 'hinhThucThi'));
    let hinhThucThi: 'ca_nhan' | 'doi' = 'ca_nhan';
    if (hinhThucRaw === 'dong doi') hinhThucThi = 'doi';
    else if (hinhThucRaw && hinhThucRaw !== 'ca nhan') {
      errors.push(`Hình thức thi không hợp lệ ("${get(row, 'hinhThucThi')}") — chỉ nhận Cá nhân/Đồng đội, để trống = Cá nhân`);
    }

const nhomTuoiRaw = get(row, 'nhomTuoi');
    let nhomTuoi: number | 'hon_hop' | null = null;
    if (!nhomTuoiRaw) {
      errors.push('Thiếu nhóm tuổi');
    } else if (normalize(nhomTuoiRaw) === 'hon hop') {
      nhomTuoi = 'hon_hop';
    } else {
      const nhomTuoiNum = parseInt(nhomTuoiRaw.replace(/[^0-9]/g, ''), 10);
      if (!NHOM_TUOI_OPTIONS.includes(nhomTuoiNum)) {
        errors.push(`Nhóm tuổi không hợp lệ ("${nhomTuoiRaw}") — chỉ nhận ${NHOM_TUOI_OPTIONS.join('/')}/Hỗn hợp`);
      } else {
        nhomTuoi = nhomTuoiNum;
      }
    }

    // Kiểm tra trùng — chỉ làm được SAU khi đã có cả tên lẫn nhóm tuổi hợp
    // lệ, vì khóa so sánh cần cả 2.
    if (ten && nhomTuoi !== null) {
      const key = eventKey(ten, nhomTuoi);
      if (existingKeys.has(key)) errors.push(`Nội dung "${ten}" ở Nhóm tuổi ${nhomTuoi} đã tồn tại rồi`);
      else if (seenInThisFile.has(key)) errors.push(`Trùng với dòng ${seenInThisFile.get(key)} trong cùng file này (cùng tên, cùng nhóm tuổi)`);
      else seenInThisFile.set(key, rowNumber);
    }

    const hangCanRaw = get(row, 'hangCan');
    const thoiGianRaw = get(row, 'thoiGianBaiGiay');
    let hangCan: number | null = null;
    let thoiGianBaiGiay: number | null = null;

    if (loai === 'doi_khang') {
      if (!hangCanRaw) errors.push('Nội dung đối kháng cần có hạng cân');
      else {
        const n = Number(hangCanRaw);
        if (!Number.isFinite(n) || n <= 0) errors.push(`Hạng cân không hợp lệ ("${hangCanRaw}")`);
        else hangCan = n;
      }
      if (thoiGianRaw) errors.push('Nội dung đối kháng không cần thời gian tham chiếu — để trống cột này');
    } else if (loai === 'quyen') {
      if (hangCanRaw) errors.push('Nội dung quyền không cần hạng cân — để trống cột này');
      if (thoiGianRaw) {
        const n = Number(thoiGianRaw);
        if (!Number.isFinite(n) || n <= 0) errors.push(`Thời gian tham chiếu không hợp lệ ("${thoiGianRaw}")`);
        else thoiGianBaiGiay = n;
      }
    }

    return { rowNumber, ten, loai, gioiTinh, hinhThucThi, nhomTuoi, hangCan, thoiGianBaiGiay, errors };
  });

  return { rows, unknownColumns };
}

export function buildEventsTemplateFile(): Blob {
  const headers = ['Tên nội dung', 'Loại', 'Giới tính', 'Hình thức thi', 'Nhóm tuổi', 'Hạng cân', 'Thời gian tham chiếu'];
  const examples = [
    ['Đối kháng nam - 55kg', 'Đối kháng', 'Nam', 'Cá nhân', 2, 55, ''],
    ['Nhập môn quyền', 'Quyền', 'Nữ', 'Cá nhân', 1, '', 35],
    ['Đồng đội long hổ quyền nam', 'Quyền', 'Nam', 'Đồng đội', 2, '', 75],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nội dung');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/octet-stream' });
}