/** @format */

import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { LogOut } from "lucide-react";
import { isAdminLoggedIn, adminLogout } from "../../lib/api/adminAuth";
import styles from "./RequireAdmin.module.scss";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin-dang-nhap" replace />;
  }

  return (
    <div className={styles.wrap}>
      <button
        className={styles.logoutBtn}
        onClick={() => {
          adminLogout();
          window.location.href = "/admin-dang-nhap";
        }}>
        <LogOut size={13} /> Đăng xuất
      </button>
      {children}
    </div>
  );
}
