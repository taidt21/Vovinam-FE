/** @format */

import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import { getSession, login } from "./lib/portalAuth";
import styles from "./PortalAuth.module.scss";

export default function DangNhap() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getSession()) navigate("/dang-ky/quan-ly/tong-quan");
  }, [navigate]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = login(email, matKhau);
    if (!result.ok) return setError(result.error);
    navigate("/dang-ky/quan-ly/tong-quan");
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>VV</span>
          <span className={styles.brandName}>Vovinam</span>
        </div>
        <h1 className={styles.title}>Đăng nhập trưởng đoàn</h1>
        <p className={styles.subtitle}>
          Đăng ký và quản lý VĐV cho đoàn của bạn
        </p>

        <form onSubmit={submit} className={styles.form}>
          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className={styles.field}>
            <span>Mật khẩu</span>
            <input
              type="password"
              value={matKhau}
              onChange={(e) => setMatKhau(e.target.value)}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn}>
            Đăng nhập
          </button>
        </form>

        <p className={styles.switchNote}>
          Chưa có tài khoản?{" "}
          <Link to="/dang-ky/tao-tai-khoan">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}
