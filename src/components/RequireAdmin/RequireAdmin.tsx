/** @format */

import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { isAdminLoggedIn } from "../../lib/api/adminAuth";

// Chỉ còn lo việc "đã đăng nhập hay chưa" — nút đăng xuất giờ nằm trong
// sidebar (DashboardLayout), không còn nằm ở đây nữa.
export default function RequireAdmin({ children }: { children: ReactNode }) {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin-dang-nhap" replace />;
  }

  return <>{children}</>;
}
