/** @format */

import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { getVaiTro, isAdminLoggedIn, type VaiTro } from "../../lib/api/adminAuth";

// Dùng LỒNG BÊN TRONG RequireAdmin (RequireAdmin đã lo việc "có đăng nhập
// hay chưa" ở tầng ngoài) — component này chỉ thêm điều kiện CHẶT hơn:
// đúng vai trò cụ thể mới được vào, còn lại (đã đăng nhập nhưng sai vai
// trò) thì đưa về trang chính họ được dùng, không phải màn đăng nhập.
export default function RequireRole({
  role,
  children,
}: {
  role: VaiTro;
  children: ReactNode;
}) {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin-dang-nhap" replace />;
  }
  if (getVaiTro() !== role) {
    return <Navigate to="/dashboard/ban-thu-ky" replace />;
  }
  return <>{children}</>;
}
