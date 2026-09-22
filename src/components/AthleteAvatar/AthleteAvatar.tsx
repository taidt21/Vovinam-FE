/** @format */

import { useEffect, useState } from "react";
import styles from "./AthleteAvatar.module.scss";

// Người Việt xưng hô bằng TÊN (từ cuối cùng trong họ tên đầy đủ), nên lấy
// chữ cái đầu của từ cuối làm avatar mặc định — ví dụ "Nguyễn Minh Khang"
// → "K", chứ không phải "N".
function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  return last.slice(0, 1).toUpperCase() || "?";
}

export default function AthleteAvatar({
  name,
  photoUrl,
  size = 64,
  shape = "circle",
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  shape?: "circle" | "id-card";
}) {
  const [loadFailed, setLoadFailed] = useState(false);

  // Đổi VĐV (photoUrl đổi) thì phải thử tải lại từ đầu — không được giữ
  // trạng thái lỗi của ảnh VĐV TRƯỚC ĐÓ.
  useEffect(() => {
    setLoadFailed(false);
  }, [photoUrl]);

  // Với ảnh thẻ, `size` là chiều cao để không làm tăng chiều cao của các
  // khu vực đang hiển thị avatar. Tỷ lệ 3:4 khớp vùng ảnh trên thẻ VĐV.
  const width = shape === "id-card" ? Math.round((size * 3) / 4) : size;
  const style = { width, height: size };
  const shapeClass = shape === "id-card" ? styles.idCard : "";

  if (photoUrl && !loadFailed) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${styles.avatar} ${shapeClass}`}
        style={style}
        onError={() => setLoadFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${styles.avatarFallback} ${shapeClass}`}
      style={{ ...style, fontSize: Math.round(width * 0.38) }}
      aria-label={name}
      role="img">
      {initialsOf(name)}
    </div>
  );
}
