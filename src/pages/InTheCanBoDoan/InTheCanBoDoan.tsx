/** @format */

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, Search, Trash2, Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { apiGet, apiPost } from "../../lib/api/api";
import { normalizeVi } from "../../lib/utils/text";
import type { Team } from "../../types/tournament";
import {
  fetchCanBoDoan,
  createCanBoDoan,
  updateCanBoDoan,
  deleteCanBoDoan,
  uploadCanBoDoanAnh,
  type CanBoDoanWire,
} from "../../lib/api/canBoDoanApi";
import {
  fetchTheVdvLogos,
  type TheVdvLogoWire,
} from "../../lib/api/theVdvLogosApi";
import theTruongDoanBg from "../../assets/the-truong-doan.jpg";
import theHuanLuyenVienBg from "../../assets/the-huan-luyen-vien.jpg";
import FittedName from "../../components/FittedName/FittedName";
import sharedStyles from "../../styles/theCard.module.scss";
import styles from "./InTheCanBoDoan.module.scss";

// Y hệt hằng số/hàm ghép trang ở InTheVDV.tsx/InTheTrongTai.tsx.
const A4_RONG_MM = 210;
const A4_CAO_MM = 297;
const KHE_HO_MM = 5;
const LE_TOI_THIEU_MM = 8;
const THE_RONG_MAC_DINH = 94.5;
const THE_CAO_MAC_DINH = 131;
const THE_KICH_THUOC_MIN = 20;
const TY_LE_THE_MAC_DINH = 3329 / 4616;

const VAI_TRO_OPTIONS: { value: string; label: string }[] = [
  { value: "truong_doan", label: "Trưởng đoàn" },
  { value: "huan_luyen_vien", label: "Huấn luyện viên" },
];

// Đọc nhãn tiếng Việt trong cột "Vai trò" của file Excel (xuất từ
// WordPress, xem vs_staff_role_label() bên theme) rồi map ngược lại
// đúng giá trị nội bộ — so sánh không dấu/không phân biệt hoa thường
// cho chắc ăn dù file gõ hoa/thường lẫn lộn.
function docVaiTro(text: string): string | null {
  const n = normalizeVi(text);
  if (n.includes("truong doan")) return "truong_doan";
  if (n.includes("huan luyen")) return "huan_luyen_vien";
  return null;
}

function nhanVaiTro(vaiTro: string): string {
  return VAI_TRO_OPTIONS.find((o) => o.value === vaiTro)?.label ?? vaiTro;
}

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

export default function InTheCanBoDoan() {
  const [list, setList] = useState<CanBoDoanWire[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
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
  const [tieuDeThe, setTieuDeThe] = useState("");
  const [logos, setLogos] = useState<TheVdvLogoWire[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [hoTenMoi, setHoTenMoi] = useState("");
  const [vaiTroMoi, setVaiTroMoi] = useState(VAI_TRO_OPTIONS[0].value);
  const [teamIdMoi, setTeamIdMoi] = useState("");
  const [dangThem, setDangThem] = useState(false);
  const [dangImport, setDangImport] = useState(false);
  const [importLoi, setImportLoi] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGet<{ tieuDeThe: string }>("/tournament")
      .then((t) => setTieuDeThe(t.tieuDeThe ?? ""))
      .catch(() => {});
    fetchTheVdvLogos()
      .then(setLogos)
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([fetchCanBoDoan(), apiGet<Team[]>("/dashboard/teams")])
      .then(([canBo, teamList]) => {
        setList(canBo);
        setTeams(teamList);
        if (teamList[0]) setTeamIdMoi(teamList[0].id);
      })
      .catch(() =>
        setLoadError("Không tải được dữ liệu — kiểm tra backend đã chạy chưa"),
      )
      .finally(() => setLoading(false));
  }, []);

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const cardW = clamp(cardWmm, THE_KICH_THUOC_MIN, A4_RONG_MM - 2 * LE_TOI_THIEU_MM);
  const cardH = clamp(cardHmm, THE_KICH_THUOC_MIN, A4_CAO_MM - 2 * LE_TOI_THIEU_MM);
  const cols = soLuongVua(A4_RONG_MM, cardW, KHE_HO_MM, LE_TOI_THIEU_MM);
  const rows = soLuongVua(A4_CAO_MM, cardH, KHE_HO_MM, LE_TOI_THIEU_MM);
  const moiTrang = cols * rows;

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...list]
      .filter(
        (c) =>
          !q ||
          c.hoTen.toLowerCase().includes(q) ||
          c.teamTen.toLowerCase().includes(q),
      )
      .sort((a, b) => a.hoTen.localeCompare(b.hoTen, "vi"));
  }, [list, search]);

  const themMoi = async () => {
    if (!hoTenMoi.trim() || !teamIdMoi) return;
    setDangThem(true);
    try {
      const created = await createCanBoDoan({
        hoTen: hoTenMoi.trim(),
        vaiTro: vaiTroMoi,
        teamId: teamIdMoi,
      });
      const team = teams.find((t) => t.id === teamIdMoi);
      setList((prev) => [...prev, { ...created, teamTen: team?.ten ?? "" }]);
      setHoTenMoi("");
    } catch {
      window.alert("Thêm thất bại — thử lại.");
    } finally {
      setDangThem(false);
    }
  };

  const xoa = async (c: CanBoDoanWire) => {
    if (!window.confirm(`Xoá "${c.hoTen}" khỏi danh sách?`)) return;
    try {
      await deleteCanBoDoan(c.id);
      setList((prev) => prev.filter((x) => x.id !== c.id));
    } catch {
      window.alert("Xoá thất bại — thử lại.");
    }
  };

  const doiTeam = async (c: CanBoDoanWire, teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    setList((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, teamId, teamTen: team.ten } : x)),
    );
    try {
      await updateCanBoDoan(c.id, { hoTen: c.hoTen, vaiTro: c.vaiTro, teamId });
    } catch {
      window.alert("Đổi đơn vị thất bại — thử lại.");
    }
  };

  const chonAnh = async (c: CanBoDoanWire, file: File) => {
    setUploadingId(c.id);
    try {
      const updated = await uploadCanBoDoanAnh(c.id, file);
      setList((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
    } catch {
      window.alert("Tải ảnh thất bại — thử lại.");
    } finally {
      setUploadingId(null);
    }
  };

  // Import Excel — đúng format WordPress xuất ra: Họ tên | Vai trò |
  // Đơn vị | Link ảnh. Đơn vị chưa có trong hệ thống thì tự tạo mới
  // (giống hệt cách VĐV đang import ở trang này), Link ảnh có sẵn thì
  // đặt thẳng bằng URL, không tải về rồi upload lại cho mất công.
  const nhapExcel = async (file: File) => {
    setDangImport(true);
    setImportLoi(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw: string[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        blankrows: false,
        defval: "",
      });
      if (raw.length < 2) {
        setImportLoi("File không có dòng dữ liệu nào.");
        return;
      }

      const idByTeamName = new Map(
        teams.map((t) => [normalizeVi(t.ten), t.id] as const),
      );
      let listMoi = [...list];
      let soLoi = 0;

      for (const row of raw.slice(1)) {
        const hoTen = String(row[0] ?? "").trim();
        const vaiTroText = String(row[1] ?? "").trim();
        const donVi = String(row[2] ?? "").trim();
        const anhUrl = String(row[3] ?? "").trim();
        if (!hoTen || !donVi) continue;

        const vaiTro = docVaiTro(vaiTroText);
        if (!vaiTro) {
          soLoi++;
          continue;
        }

        let teamId = idByTeamName.get(normalizeVi(donVi));
        if (!teamId) {
          // Chưa có đơn vị này — tạo mới, y hệt cách VĐV đang làm.
          const created = await apiPost<Team>("/dashboard/teams", {
            ten: donVi,
          });
          teamId = created.id;
          idByTeamName.set(normalizeVi(donVi), teamId);
          setTeams((prev) => [...prev, created]);
        }

        const created = await createCanBoDoan({
          hoTen,
          vaiTro,
          teamId,
          anhDaiDien: anhUrl || null,
        });
        listMoi = [...listMoi, { ...created, teamTen: donVi }];
      }

      setList(listMoi);
      if (soLoi > 0) {
        setImportLoi(
          `Đã import xong, nhưng ${soLoi} dòng có cột "Vai trò" không đọc được (phải ghi đúng "Trưởng đoàn" hoặc "Huấn luyện viên") — bị bỏ qua.`,
        );
      }
    } catch (err) {
      setImportLoi(
        err instanceof Error ? `Import lỗi: ${err.message}` : "Import thất bại.",
      );
    } finally {
      setDangImport(false);
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
        const c = sorted[i];
        const el = cardRefs.current.get(c.id);
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

      doc.save("the-truong-doan-hlv.pdf");
    } catch {
      setExportLoi("Xuất PDF thất bại — thử lại.");
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
            placeholder="Họ và tên..."
            value={hoTenMoi}
            onChange={(e) => setHoTenMoi(e.target.value)}
          />
          <select value={vaiTroMoi} onChange={(e) => setVaiTroMoi(e.target.value)}>
            {VAI_TRO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={teamIdMoi} onChange={(e) => setTeamIdMoi(e.target.value)}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.ten}
              </option>
            ))}
          </select>
          <button
            className={sharedStyles.btnPrimary}
            onClick={themMoi}
            disabled={dangThem || !hoTenMoi.trim() || !teamIdMoi}>
            <Plus size={16} /> {dangThem ? "Đang thêm..." : "Thêm"}
          </button>
        </div>

        <button
          className={styles.importBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={dangImport}>
          <FileSpreadsheet size={16} />
          {dangImport ? "Đang import..." : "Import Excel"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) nhapExcel(file);
            }}
          />
        </button>

        <div className={sharedStyles.searchBox}>
          <Search size={14} />
          <input
            placeholder="Tìm theo tên hoặc đơn vị..."
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
              setCardHmm(Math.round((v / TY_LE_THE_MAC_DINH) * 10) / 10);
            }}
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
        {importLoi && <p className={sharedStyles.exportLoi}>{importLoi}</p>}
      </div>

      {sorted.length === 0 && (
        <p className={sharedStyles.hint}>
          Chưa có Trưởng đoàn/HLV nào — thêm tay ở trên hoặc Import Excel.
        </p>
      )}

      <div className={sharedStyles.cardGrid}>
        {sorted.map((c) => {
          const laTruongDoan = c.vaiTro === "truong_doan";
          const bg = laTruongDoan ? theTruongDoanBg : theHuanLuyenVienBg;
          const fieldHoTen = laTruongDoan
            ? styles.fieldHoTenTruongDoan
            : styles.fieldHoTenHlv;
          const fieldDonVi = laTruongDoan
            ? styles.fieldDonViTruongDoan
            : styles.fieldDonViHlv;

          return (
            <div key={c.id} className={sharedStyles.cardWrap}>
              <div
                ref={(el) => {
                  if (el) cardRefs.current.set(c.id, el);
                }}
                className={sharedStyles.card}>
                <img src={bg} alt="" className={sharedStyles.cardBg} />
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
                  <CardPhoto name={c.hoTen} photoUrl={c.anhDaiDien} />
                </div>
                <FittedName
                  name={c.hoTen}
                  className={`${sharedStyles.field} ${fieldHoTen}`}
                />
                <FittedName
                  name={c.teamTen}
                  className={`${sharedStyles.field} ${fieldDonVi}`}
                />
              </div>

              <span className={styles.roleBadge}>{nhanVaiTro(c.vaiTro)}</span>

              <select
                className={sharedStyles.textInput}
                value={c.teamId}
                onChange={(e) => doiTeam(c, e.target.value)}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.ten}
                  </option>
                ))}
              </select>

              <div className={sharedStyles.cardActions}>
                <label className={sharedStyles.uploadAnhBtn}>
                  <Upload size={13} />
                  {uploadingId === c.id ? "Đang tải..." : "Đổi ảnh"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) chonAnh(c, file);
                    }}
                  />
                </label>
                <button
                  className={sharedStyles.deleteBtn}
                  onClick={() => xoa(c)}
                  aria-label={`Xoá ${c.hoTen}`}
                  title={`Xoá ${c.hoTen}`}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
