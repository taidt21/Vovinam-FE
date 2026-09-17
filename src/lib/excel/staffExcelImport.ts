import * as XLSX from "xlsx";
import { normalizeVi } from "../utils/text";

export type StaffRole = "truong_doan" | "huan_luyen_vien";

export interface StaffImportRow {
  rowNumber: number;
  hoTen: string;
  vaiTro: StaffRole | null;
  donVi: string;
  anhDaiDien: string;
  errors: string[];
}

export interface StaffWorkbookResult {
  rows: StaffImportRow[];
  unknownColumns: string[];
  fileError: string | null;
}

const HEADER_ALIASES = {
  maDonVi: ["ma don vi", "ma doan", "team id", "team code"],
  donVi: ["ten don vi", "don vi", "doan", "ten doan"],
  hoTen: ["ho ten", "ho va ten", "ten", "ten can bo"],
  maVaiTro: ["ma vai tro", "role code", "vai tro code"],
  vaiTro: ["vai tro", "chuc vu", "role"],
  anhDaiDien: ["link anh", "anh", "anh dai dien", "url anh", "photo url", "image url"],
} as const;

type StaffField = keyof typeof HEADER_ALIASES;

function normalize(value: unknown): string {
  return normalizeVi(String(value ?? "").trim());
}

function normalizeSheetName(value: string): string {
  return normalize(value).replace(/[^a-z0-9]/g, "");
}

function findStaffSheetName(wb: XLSX.WorkBook): string | null {
  const preferred = wb.SheetNames.find((name) => {
    const n = normalizeSheetName(name);
    return (
      n === "truongdoanhlv" ||
      n === "truongdoanhuanluyenvien" ||
      n === "canbodoan" ||
      n === "canbo" ||
      n === "staff"
    );
  });

  if (preferred) return preferred;

  // File cán bộ riêng thường chỉ có một sheet.
  return wb.SheetNames.length === 1 ? wb.SheetNames[0] : null;
}

function normalizeRole(value: string): StaffRole | null {
  const raw = value.trim();
  if (!raw) return null;

  // Giữ cả bản có dấu gạch dưới để nhận mã vai trò từ WordPress.
  const code = raw.toLowerCase().replace(/\s+/g, "_");
  if (code === "truong_doan" || code === "truongdoan") return "truong_doan";
  if (
    code === "huan_luyen_vien" ||
    code === "huanluyenvien" ||
    code === "hlv"
  ) {
    return "huan_luyen_vien";
  }

  const n = normalize(raw).replace(/[^a-z0-9]/g, "");
  if (n === "truongdoan") return "truong_doan";
  if (n === "huanluyenvien" || n === "hlv") return "huan_luyen_vien";

  return null;
}

export function parseStaffWorkbook(buffer: ArrayBuffer): StaffWorkbookResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = findStaffSheetName(wb);

  if (!sheetName) {
    return {
      rows: [],
      unknownColumns: [],
      fileError:
        'Không tìm thấy sheet "Trưởng đoàn - HLV". File riêng chỉ cần 1 sheet; workbook WordPress cần sheet "Trưởng đoàn - HLV".',
    };
  }

  const sheet = wb.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  if (raw.length === 0) {
    return {
      rows: [],
      unknownColumns: [],
      fileError: `Sheet "${sheetName}" đang trống.`,
    };
  }

  const headerRow = raw[0].map((v) => String(v ?? "").trim());
  const normalizedHeaders = headerRow.map(normalize);
  const colIndex: Partial<Record<StaffField, number>> = {};
  const fields = Object.keys(HEADER_ALIASES) as StaffField[];

  for (const field of fields) {
    for (const alias of HEADER_ALIASES[field]) {
      const index = normalizedHeaders.indexOf(normalize(alias));
      if (index >= 0) {
        colIndex[field] = index;
        break;
      }
    }
  }

  const knownHeaders = new Set(
    fields.flatMap((field) => HEADER_ALIASES[field].map((alias) => normalize(alias))),
  );
  const unknownColumns = headerRow.filter(
    (header, index) => header && !knownHeaders.has(normalizedHeaders[index]),
  );

  // Họ tên + tên đơn vị là bắt buộc. Vai trò có thể lấy từ Mã vai trò HOẶC Vai trò.
  const missing: string[] = [];
  if (colIndex.hoTen === undefined) missing.push("Họ tên");
  if (colIndex.donVi === undefined) missing.push("Tên đơn vị/Đơn vị");
  if (colIndex.maVaiTro === undefined && colIndex.vaiTro === undefined) {
    missing.push("Mã vai trò hoặc Vai trò");
  }

  if (missing.length > 0) {
    return {
      rows: [],
      unknownColumns,
      fileError: `Sheet "${sheetName}" thiếu cột bắt buộc: ${missing.join(", ")}.`,
    };
  }

  const get = (row: unknown[], field: StaffField): string => {
    const index = colIndex[field];
    return index === undefined ? "" : String(row[index] ?? "").trim();
  };

  const rows: StaffImportRow[] = [];

  raw.slice(1).forEach((row, i) => {
    const rowNumber = i + 2;
    const hoTen = get(row, "hoTen");
    const donVi = get(row, "donVi");
    const maVaiTro = get(row, "maVaiTro");
    const vaiTroText = get(row, "vaiTro");
    const anhDaiDien = get(row, "anhDaiDien");

    // Bỏ qua dòng hoàn toàn trống.
    if (!hoTen && !donVi && !maVaiTro && !vaiTroText && !anhDaiDien) return;

    const errors: string[] = [];
    if (!hoTen) errors.push("Thiếu họ tên");
    if (!donVi) errors.push("Thiếu đơn vị");

    // Ưu tiên mã vai trò từ WordPress; nếu mã không nhận được thì thử nhãn Vai trò.
    let vaiTro = normalizeRole(maVaiTro);
    if (!vaiTro) vaiTro = normalizeRole(vaiTroText);

    if (!vaiTro) {
      const received = maVaiTro || vaiTroText;
      errors.push(
        received
          ? `Vai trò không hợp lệ ("${received}") — chỉ nhận Trưởng đoàn/Huấn luyện viên`
          : "Thiếu vai trò",
      );
    }

    rows.push({
      rowNumber,
      hoTen,
      vaiTro,
      donVi,
      anhDaiDien,
      errors,
    });
  });

  return { rows, unknownColumns, fileError: null };
}
