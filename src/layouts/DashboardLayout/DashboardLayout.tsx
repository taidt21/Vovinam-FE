/** @format */

import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import {
  LayoutGrid,
  Users,
  ClipboardList,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  LogOut,
} from "lucide-react";
import { adminLogout, getVaiTro } from "../../lib/api/adminAuth";
import styles from "./DashboardLayout.module.scss";

const NAV_ITEMS = [
  { to: "thiet-lap-giai", label: "Thiết lập giải", icon: LayoutGrid },
  { to: "doan-vdv", label: "Đoàn & VĐV", icon: Users },
  { to: "noi-dung-boc-tham", label: "Nội dung & bốc thăm", icon: Shuffle },
  { to: "ban-thu-ky", label: "Bàn thư ký", icon: ClipboardList },
  { to: "ket-qua", label: "Kết quả & báo cáo", icon: BarChart3 },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const vaiTro = getVaiTro();
  const currentRole = vaiTro === "Admin" ? "Ban tổ chức" : "Bàn thư ký";
  const [collapsed, setCollapsed] = useState(false);

  const dangXuat = () => {
    adminLogout();
    navigate("/admin-dang-nhap", { replace: true });
  };

  return (
    <div className={styles.shell}>
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>
            <img src="/favicon.svg" alt="Vovinam" />
          </span>
          {!collapsed && <span className={styles.brandName}>Vector Sport</span>}
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                isActive
                  ? `${styles.navItem} ${styles.navItemActive}`
                  : styles.navItem
              }>
              <Icon size={18} strokeWidth={1.75} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={dangXuat}
          title={collapsed ? "Đăng xuất" : undefined}>
          <LogOut size={18} strokeWidth={1.75} />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Thu gọn</span>}
        </button>
      </aside>
      <div className={styles.main}>
        <header className={styles.topbar}>
          <span className={styles.roleBadge}>Vai trò: {currentRole}</span>
        </header>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
