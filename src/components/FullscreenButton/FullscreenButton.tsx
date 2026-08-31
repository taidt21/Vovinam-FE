/** @format */

import { useCallback, useEffect, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import styles from "./FullscreenButton.module.scss";

// Nút nổi, cố định 1 góc màn hình — thả vào trang nào cũng được, không
// cần chỉnh layout riêng vì dùng position: fixed. Dùng đúng Fullscreen
// API chuẩn của trình duyệt (không cần thư viện ngoài nào).
export default function FullscreenButton() {
  const [dangFullscreen, setDangFullscreen] = useState(
    () => !!document.fullscreenElement,
  );

  useEffect(() => {
    const onChange = () => setDangFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Bấm ESC cũng thoát fullscreen được (hành vi mặc định của trình
  // duyệt) — sự kiện fullscreenchange ở trên tự bắt lại đúng trạng thái
  // trong 2 trường hợp, không cần xử lý riêng cho ESC.
  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  return (
    <button
      type="button"
      className={styles.btn}
      onClick={toggle}
      title={dangFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
      aria-label={dangFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>
      {dangFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
    </button>
  );
}
