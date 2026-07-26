/** @format */

import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import { signUp } from "../../lib/portalAuth";
import styles from "./PortalAuth.module.scss";

export default function DangKy() {
  const navigate = useNavigate();
  const [tenDoan, setTenDoan] = useState("");
  const [tenNguoiDaiDien, setTenNguoiDaiDien] = useState("");
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [xacNhan, setXacNhan] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (matKhau !== xacNhan) return setError("Mật khẩu xác nhận không khớp");
    if (matKhau.length < 6) return setError("Mật khẩu cần ít nhất 6 ký tự");

    const result = signUp({ tenDoan, tenNguoiDaiDien, email, matKhau });
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
        <h1 className={styles.title}>Đăng ký tài khoản trưởng đoàn</h1>
        <p className={styles.subtitle}>
          Tạo tài khoản để đăng ký VĐV cho đoàn của bạn
        </p>

        <form onSubmit={submit} className={styles.form}>
          <label className={styles.field}>
            <span>Tên đoàn</span>
            <input
              value={tenDoan}
              onChange={(e) => setTenDoan(e.target.value)}
              placeholder="VD: Bình Dương"
              required
            />
          </label>
          <label className={styles.field}>
            <span>Họ tên trưởng đoàn</span>
            <input
              value={tenNguoiDaiDien}
              onChange={(e) => setTenNguoiDaiDien(e.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
          <label className={styles.field}>
            <span>Xác nhận mật khẩu</span>
            <input
              type="password"
              value={xacNhan}
              onChange={(e) => setXacNhan(e.target.value)}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn}>
            Tạo tài khoản
          </button>
        </form>

        <p className={styles.switchNote}>
          Đã có tài khoản? <Link to="/dang-ky">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
