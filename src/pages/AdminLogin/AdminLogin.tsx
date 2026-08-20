/** @format */

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { adminLogin } from "../../lib/api/adminAuth";
import styles from "./AdminLogin.module.scss";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { vaiTro } = await adminLogin(username, password);
      navigate(
        vaiTro === "Admin" ? "/dashboard/thiet-lap-giai" : "/dashboard/ban-thu-ky",
        { replace: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={submit}>
        <h1 className={styles.title}>Đăng nhập Ban tổ chức</h1>
        <label className={styles.field}>
          <span>Tên đăng nhập</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </label>
        <label className={styles.field}>
          <span>Mật khẩu</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.btnPrimary} disabled={loading} type="submit">
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
