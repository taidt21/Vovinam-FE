// Bỏ dấu tiếng Việt để so khớp không phân biệt có/không dấu, hoa/thường
export function normalizeVi(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLowerCase();
}