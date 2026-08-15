/** @format */

import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { LayoutGrid, Users, LogOut } from "lucide-react";
import { getSession, logout, type DoanAccount } from "./lib/portalAuth";
import styles from "./PortalLayout.module.scss";

const NAV_ITEMS = [
  { to: "tong-quan", label: "Tổng quan", icon: LayoutGrid },
  { to: "vdv", label: "VĐV của đoàn", icon: Users },
];

export default function PortalLayout() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<DoanAccount | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate("/dang-ky");
      return;
    }
    setAccount(session);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/dang-ky");
  };

  if (!account) return null;

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>VV</span>
          <span className={styles.brandName}>Cổng đăng ký Vovinam</span>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive
                  ? `${styles.navItem} ${styles.navItemActive}`
                  : styles.navItem
              }>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.accountArea}>
          <div className={styles.accountInfo}>
            <span className={styles.accountTeam}>{account.tenDoan}</span>
            <span className={styles.accountRep}>{account.tenNguoiDaiDien}</span>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            aria-label="Đăng xuất">
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <main className={styles.content}>
        <Outlet context={account} />
      </main>
    </div>
  );
}
