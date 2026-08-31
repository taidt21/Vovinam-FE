/** @format */

import { useEffect, useRef, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import {
  fetchTheVdvLogos,
  uploadTheVdvLogo,
  deleteTheVdvLogo,
  type TheVdvLogoWire,
} from "../../lib/api/theVdvLogosApi";
import styles from "../../pages/ThietLapGiai/ThietLapGiai.module.scss";

export default function TheVdvLogosSection() {
  const [logos, setLogos] = useState<TheVdvLogoWire[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLogos = () =>
    fetchTheVdvLogos()
      .then(setLogos)
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    loadLogos();
  }, []);

  const chonFile = () => fileInputRef.current?.click();

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho chọn lại đúng file đó lần nữa nếu cần
    if (!file) return;
    setUploading(true);
    try {
      const logo = await uploadTheVdvLogo(file);
      setLogos((prev) => [...prev, logo]);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Tải logo thất bại");
    } finally {
      setUploading(false);
    }
  };

  const doDelete = async (logo: TheVdvLogoWire) => {
    if (!window.confirm("Xoá logo này khỏi thẻ VĐV?")) return;
    try {
      await deleteTheVdvLogo(logo.id);
      setLogos((prev) => prev.filter((l) => l.id !== logo.id));
    } catch {
      window.alert("Xoá logo thất bại");
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.eventsHead}>
        <h2 className={styles.cardTitle}>Logo trên thẻ</h2>
        <button
          className={styles.btnPrimary}
          onClick={chonFile}
          disabled={uploading}>
          <Upload size={16} /> {uploading ? "Đang tải..." : "Thêm logo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className={styles.hiddenFileInput}
          onChange={onFileChosen}
        />
      </div>

      <p className={styles.hint}>
        Logo liên đoàn, logo nhà tài trợ... hiện thành 1 hàng phía trên MỌI
        loại thẻ (VĐV, trọng tài...), theo đúng thứ tự thêm vào. Không giới
        hạn số lượng, nhưng thêm nhiều quá thì mỗi logo sẽ tự co nhỏ lại cho
        vừa 1 hàng.
      </p>

      {loading ? (
        <p className={styles.hint}>Đang tải...</p>
      ) : logos.length === 0 ? (
        <p className={styles.hint}>Chưa có logo nào.</p>
      ) : (
        <div className={styles.logoList}>
          {logos.map((logo) => (
            <div key={logo.id} className={styles.logoItem}>
              <img
                src={logo.duongDan}
                alt="Logo"
                className={styles.logoThumb}
              />
              <div className={styles.eventRowActions}>
                <button
                  onClick={() => doDelete(logo)}
                  aria-label="Xoá logo"
                  className={styles.dangerBtn}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
