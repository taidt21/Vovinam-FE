export type UserRole = 'ban_to_chuc' | 'thu_ky' | 'trong_tai' | 'man_hinh_ket_qua';

export interface User {
  id: string;
  tenDangNhap: string;
  vaiTro: UserRole;
  hoTen: string;
}