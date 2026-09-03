/** @format */

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, Search, Trash2, Upload } from "lucide-react";
import { apiGet } from "../../lib/api/api";
import {
  fetchTrongTai,
  createTrongTai,
  updateTrongTai,
  deleteTrongTai,
  uploadTrongTaiAnh,
  type TrongTaiWire,
} from "../../lib/api/trongTaiApi";
import {
  fetchTheVdvLogos,
  type TheVdvLogoWire,
} from "../../lib/api/theVdvLogosApi";
import theTrongTaiBg from "../../assets/the-trong-tai.jpg";
import FittedName from "../../components/FittedName/FittedName";
import sharedStyles from "../../styles/theCard.module.scss";
import styles from "./InTheTrongTai.module.scss";

// Y hệt các hằng số/hàm ghép trang ở InTheVDV.tsx — xem comment bên đó,
// không lặp lại ở đây. Cố tình KHÔNG dùng chung 1 file vì 2 trang có thể
// cần tách rời độc lập sau này (đổi mẫu 1 bên không đụng bên kia).
const A4_RONG_MM = 210;
const A4_CAO_MM = 297;
const KHE_HO_MM = 5;
const LE_TOI_THIEU_MM = 8;
const THE_RONG_MAC_DINH = 94.5;
const THE_CAO_MAC_DINH = 131;
const THE_KICH_THUOC_MIN = 20;
const TY_LE_THE_MAC_DINH = 3329 / 4616;

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

function soLuongVua(
  dodaiTrang: number,
  dodaiThe: number,
  khe: number,
  leToiThieu: number,
): number {
  const n = Math.floor((dodaiTrang - 2 * leToiThieu + khe) / (dodaiThe + khe));
  return Math.max(1, n);
}

function veKeCat(
  doc: import("jspdf").jsPDF,
  pageW: number,
  pageH: number,
  marginX: number,
  marginY: number,
  cardW: number,
  cardH: number,
  cols: number,
  rows: number,
) {
  doc.setDrawColor(200);
  doc.setLineWidth(0.15);
  doc.setLineDashPattern([1, 1], 0);
  for (let c = 1; c < cols; c++) {
    const x = marginX + c * cardW + (c - 0.5) * KHE_HO_MM;
    doc.line(x, 0, x, pageH);
  }
  for (let r = 1; r < rows; r++) {
    const y = marginY + r * cardH + (r - 0.5) * KHE_HO_MM;
    doc.line(0, y, pageW, y);
  }
  doc.setLineDashPattern([], 0);
}

function khoiTen(hoTen: string): string {
  const parts = hoTen.trim().split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  return last.slice(0, 1).toUpperCase() || "?";
}

function CardPhoto({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string | null;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [photoUrl]);

  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={sharedStyles.photoImg}
        onError={() => setFailed(true)}
        crossOrigin="anonymous"
      />
    );
  }

  return <div className={sharedStyles.photoFallback}>{khoiTen(name)}</div>;
}

export default function InTheTrongTai() {
  const [list, setList] = useState<TrongTaiWire[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportTien, setExportTien] = useState<{ da: number; tong: number } | null>(
    null,
  );
  const [exportLoi, setExportLoi] = useState<string | null>(null);
  const [cardWmm, setCardWmm] = useState(THE_RONG_MAC_DINH);
  const [cardHmm, setCardHmm] = useState(THE_CAO_MAC_DINH);
  const [tyLeThe, setTyLeThe] = useState(TY_LE_THE_MAC_DINH);
  const [tieuDeThe, setTieuDeThe] = useState("");
  const [logos, setLogos] = useState<TheVdvLogoWire[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [hoTenMoi, setHoTenMoi] = useState("");
  const [dangThem, setDangThem] = useState(false);

  useEffect(() => {
    apiGet<{ tieuDeThe: string }>("/tournament")
      .then((t) => setTieuDeThe(t.tieuDeThe ?? ""))
      .catch(() => {});
    fetchTheVdvLogos()
      .then(setLogos)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setTyLeThe(img.naturalWidth / img.naturalHeight);
    img.src = theTrongTaiBg;
  }, []);

  useEffect(() => {
    fetchTrongTai()
      .then(setList)
      .catch(() =>
        setLoadError("Không tải được dữ liệu — kiểm tra backend đã chạy chưa"),
      )
      .finally(() => setLoading(false));
  }, []);

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const cardW = clamp(
    cardWmm,
    THE_KICH_THUOC_MIN,
    A4_RONG_MM - 2 * LE_TOI_THIEU_MM,
  );
  const cardH = clamp(
    cardHmm,
    THE_KICH_THUOC_MIN,
    A4_CAO_MM - 2 * LE_TOI_THIEU_MM,
  );
  const cols = soLuongVua(A4_RONG_MM, cardW, KHE_HO_MM, LE_TOI_THIEU_MM);
  const rows = soLuongVua(A4_CAO_MM, cardH, KHE_HO_MM, LE_TOI_THIEU_MM);
  const moiTrang = cols * rows;

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...list]
      .filter((t) => !q || t.hoTen.toLowerCase().includes(q))
      .sort((a, b) => a.hoTen.localeCompare(b.hoTen, "vi"));
  }, [list, search]);

  // Sửa Đơn vị ngay tại đây (không có màn nào khác để nhập) — cập nhật
  // state trước cho gõ mượt, lưu thật xuống server lúc rời khỏi ô (blur)
  // thay vì gọi API theo từng phím gõ.
  const suaDonVi = (id: string, donVi: string) => {
    setList((prev) => prev.map((t) => (t.id === id ? { ...t, donVi } : t)));
  };
  const luuDonVi = async (t: TrongTaiWire) => {
    try {
      await updateTrongTai(t.id, {
        hoTen: t.hoTen,
        courtId: t.courtId,
        thuTuGiamDinh: t.thuTuGiamDinh,
        donVi: t.donVi,
      });
    } catch {
      window.alert("Lưu đơn vị thất bại — thử lại.");
    }
  };

  const chonAnh = async (t: TrongTaiWire, file: File) => {
    setUploadingId(t.id);
    try {
      const updated = await uploadTrongTaiAnh(t.id, file);
      setList((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
    } catch {
      window.alert("Tải ảnh thất bại — thử lại.");
    } finally {
      setUploadingId(null);
    }
  };

  // Sân gán tự động ở BACKEND (chia đều vòng tròn qua các sân hiện có)
  // — xem TrongTaiController.Create, không tự đoán ở đây nữa để tránh
  // race condition (bấm "Thêm" trước khi trang tải xong danh sách sân).
  const themMoi = async () => {
    if (!hoTenMoi.trim()) return;
    setDangThem(true);
    try {
      const created = await createTrongTai({
        hoTen: hoTenMoi.trim(),
        courtId: null,
        thuTuGiamDinh: null,
        donVi: null,
      });
      setList((prev) => [...prev, created]);
      setHoTenMoi("");
    } catch {
      window.alert("Thêm trọng tài thất bại — thử lại.");
    } finally {
      setDangThem(false);
    }
  };

  const xoa = async (t: TrongTaiWire) => {
    if (!window.confirm(`Xoá "${t.hoTen}" khỏi danh sách trọng tài?`)) return;
    try {
      await deleteTrongTai(t.id);
      setList((prev) => prev.filter((x) => x.id !== t.id));
    } catch {
      window.alert("Xoá thất bại — thử lại.");
    }
  };

  const xuatPDF = async () => {
    setExportLoi(null);
    setExporting(true);
    setExportTien({ da: 0, tong: sorted.length });
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      const contentW = cols * cardW + (cols - 1) * KHE_HO_MM;
      const marginX = (pageW - contentW) / 2;
      const contentH = rows * cardH + (rows - 1) * KHE_HO_MM;
      const marginY = (pageH - contentH) / 2;

      for (let i = 0; i < sorted.length; i++) {
        const t = sorted[i];
        const el = cardRefs.current.get(t.id);
        if (!el) continue;

        const viTri = i % moiTrang;
        if (viTri === 0) {
          if (i > 0) doc.addPage();
          veKeCat(doc, pageW, pageH, marginX, marginY, cardW, cardH, cols, rows);
        }

        const rongHienThiPx = el.getBoundingClientRect().width || 1;
        const rongMucTieuPx = (cardW / 25.4) * 300;
        const scale = Math.min(10, Math.max(1, rongMucTieuPx / rongHienThiPx));

        const canvas = await html2canvas(el, {
          scale,
          backgroundColor: "#ffffff",
          useCORS: true,
        });
        const imgData = canvas.toDataURL("image/png");

        const cot = viTri % cols;
        const hang = Math.floor(viTri / cols);
        const oX = marginX + cot * (cardW + KHE_HO_MM);
        const oY = marginY + hang * (cardH + KHE_HO_MM);
        doc.addImage(imgData, "PNG", oX, oY, cardW, cardH, undefined, "FAST");

        setExportTien({ da: i + 1, tong: sorted.length });
      }

      doc.save("the-trong-tai.pdf");
    } catch {
      setExportLoi(
        "Xuất PDF thất bại — thử lại, hoặc báo lỗi này lại nếu vẫn không được.",
      );
    } finally {
      setExporting(false);
      setExportTien(null);
    }
  };

  if (loading)
    return (
      <div className={sharedStyles.page}>
        <p className={sharedStyles.hint}>Đang tải dữ liệu...</p>
      </div>
    );
  if (loadError)
    return (
      <div className={sharedStyles.page}>
        <p className={sharedStyles.hint}>{loadError}</p>
      </div>
    );

  return (
    <div className={sharedStyles.page}>
      <div className={sharedStyles.toolbar}>
        <div className={sharedStyles.addBox}>
          <input
            placeholder="Họ và tên trọng tài mới..."
            value={hoTenMoi}
            onChange={(e) => setHoTenMoi(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void themMoi();
              }
            }}
          />
          <button
            className={sharedStyles.btnPrimary}
            onClick={themMoi}
            disabled={dangThem || !hoTenMoi.trim()}>
            <Plus size={16} /> {dangThem ? "Đang thêm..." : "Thêm"}
          </button>
        </div>

        <div className={sharedStyles.searchBox}>
          <Search size={14} />
          <input
            placeholder="Tìm theo tên trọng tài..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={sharedStyles.sizeBox}>
          <span>Kích thước thẻ</span>
          <input
            type="number"
            className={sharedStyles.sizeInput}
            value={cardWmm}
            min={THE_KICH_THUOC_MIN}
            max={A4_RONG_MM - 2 * LE_TOI_THIEU_MM}
            step={0.5}
            onChange={(e) => {
              const v = Number(e.target.value);
              setCardWmm(v);
              setCardHmm(Math.round((v / tyLeThe) * 10) / 10);
            }}
            aria-label="Chiều rộng thẻ (mm)"
          />
          <span>×</span>
          <input
            type="number"
            className={sharedStyles.sizeInput}
            value={cardHmm}
            min={THE_KICH_THUOC_MIN}
            max={A4_CAO_MM - 2 * LE_TOI_THIEU_MM}
            step={0.5}
            onChange={(e) => setCardHmm(Number(e.target.value))}
            aria-label="Chiều cao thẻ (mm) — sửa riêng, không đổi Rộng"
          />
          <span>mm</span>
          <span className={sharedStyles.sizeHint}>
            → {cols}×{rows} = {moiTrang} thẻ/trang
          </span>
        </div>

        <button
          className={sharedStyles.exportBtn}
          onClick={xuatPDF}
          disabled={exporting || sorted.length === 0}>
          <Download size={16} />
          {exporting
            ? `Đang xuất... (${exportTien?.da ?? 0}/${exportTien?.tong ?? 0})`
            : `Tải file PDF (${sorted.length} thẻ · ${Math.ceil(
                sorted.length / moiTrang,
              )} trang)`}
        </button>
        {exportLoi && <p className={sharedStyles.exportLoi}>{exportLoi}</p>}
      </div>

      {sorted.length === 0 && (
        <p className={sharedStyles.hint}>Chưa có trọng tài nào trong danh sách.</p>
      )}

      <div className={sharedStyles.cardGrid}>
        {sorted.map((t) => (
          <div key={t.id} className={sharedStyles.cardWrap}>
            <div
              ref={(el) => {
                if (el) cardRefs.current.set(t.id, el);
              }}
              className={sharedStyles.card}>
              <img src={theTrongTaiBg} alt="" className={sharedStyles.cardBg} />
              {tieuDeThe.trim() && (
                <div className={sharedStyles.tieuDe}>{tieuDeThe}</div>
              )}
              {logos.length > 0 && (
                <div className={sharedStyles.logoRow}>
                  {logos.map((logo) => (
                    <img
                      key={logo.id}
                      src={logo.duongDan}
                      alt=""
                      className={sharedStyles.logoAnh}
                    />
                  ))}
                </div>
              )}
              <div className={styles.photoBox}>
                <CardPhoto name={t.hoTen} photoUrl={t.anhDaiDien} />
              </div>
              <FittedName
                name={t.hoTen}
                className={`${sharedStyles.field} ${styles.fieldHoTen}`}
              />
              <FittedName
                name={t.donVi ?? ""}
                className={`${sharedStyles.field} ${styles.fieldDonVi}`}
              />
            </div>

            <input
              className={sharedStyles.textInput}
              placeholder="Đơn vị..."
              value={t.donVi ?? ""}
              onChange={(e) => suaDonVi(t.id, e.target.value)}
              onBlur={() => luuDonVi(t)}
            />
            <div className={sharedStyles.cardActions}>
              <label className={sharedStyles.uploadAnhBtn}>
                <Upload size={13} />
                {uploadingId === t.id ? "Đang tải..." : "Đổi ảnh"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) chonAnh(t, file);
                  }}
                />
              </label>
              <button
                className={sharedStyles.deleteBtn}
                onClick={() => xoa(t)}
                aria-label={`Xoá ${t.hoTen}`}
                title={`Xoá ${t.hoTen}`}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
