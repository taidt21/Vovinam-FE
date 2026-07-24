/** @format */

import { useEffect, useState } from "react";
import styles from "./AthleteAvatar.module.scss";

// Người Việt xưng hô bằng TÊN (từ cuối cùng trong họ tên đầy đủ), nên lấy
// chữ cái đầu của từ cuối làm avatar mặc định — ví dụ "Nguyễn Minh Khang"
// → "K", chứ không phải "N".
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  return last.slice(0, 1).toUpperCase() || "?";
}

export default function AthleteAvatar({
  name,
  photoUrl,
  size = 64,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const [loadFailed, setLoadFailed] = useState(false);

  // Đổi VĐV (photoUrl đổi) thì phải thử tải lại từ đầu — không được giữ
  // trạng thái lỗi của ảnh VĐV TRƯỚC ĐÓ.
  useEffect(() => {
    setLoadFailed(false);
  }, [photoUrl]);

  const style = { width: size, height: size };

  if (photoUrl && !loadFailed) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={styles.avatar}
        style={style}
        onError={() => setLoadFailed(true)}
      />
    );
  }

  return (
    <div
      className={styles.avatarFallback}
      style={{ ...style, fontSize: Math.round(size * 0.38) }}
      aria-label={name}
      role="img">
      {initialsOf(name)}
    </div>
  );
}
