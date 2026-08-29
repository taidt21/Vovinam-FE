/** @format */

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Search } from "lucide-react";
import type { AthleteRecord } from "../../types";
import { apiGet } from "../../lib/api/api";
import {
  fetchTheVdvLogos,
  type TheVdvLogoWire,
} from "../../lib/api/theVdvLogosApi";
import theVdvBg from "../../assets/the-vdv.jpg";
import styles from "./InTheVDV.module.scss";

interface TeamLite {
  id: string;
  ten: string;
}

// Ghép nhiều thẻ / trang A4 theo đúng kích thước thẻ tự nhập (rộng x
// cao, mm) — không cố định số cột/hàng nữa, mà tính ngược lại nhét vừa
// bao nhiêu thẻ theo kích thước đó rồi canh giữa trang. Nhờ vậy không
// phụ thuộc mẫu thẻ nào: có mẫu chính thức thì chỉ đổi ảnh nền + toạ độ
// overlay trong file scss, còn phần ghép trang này vẫn dùng nguyên.
const A4_RONG_MM = 210;
const A4_CAO_MM = 297;
const KHE_HO_MM = 5;
const LE_TOI_THIEU_MM = 8;
const THE_RONG_MAC_DINH = 94.5;
// Cao mặc định tính lại theo đúng tỉ lệ ảnh mẫu mới (94.5 / (3329/4616))
// — trước là 138, khớp tỉ lệ bản demo cũ, giờ lệch nếu để nguyên.
const THE_CAO_MAC_DINH = 131;
const THE_KICH_THUOC_MIN = 20;
// Tỉ lệ đo trực tiếp trên file the-vdv.jpg hiện tại (3329 x 4616px, mẫu
// chính thức — trước là bản demo 921 x 1298px) — dùng làm giá trị khởi
// động để bấm là chạy đúng ngay, không phải đợi ảnh tải xong xử lý bất
// đồng bộ mới có tỉ lệ.
const TY_LE_THE_MAC_DINH = 3329 / 4616;

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

// Nhét vừa bao nhiêu ô kích thước "dodaiThe" trên 1 trang dài "dodaiTrang",
// chừa ít nhất "leToiThieu" mỗi đầu và "khe" giữa các ô.
function soLuongVua(
  dodaiTrang: number,
  dodaiThe: number,
  khe: number,
  leToiThieu: number,
): number {
  const n = Math.floor((dodaiTrang - 2 * leToiThieu + khe) / (dodaiThe + khe));
  return Math.max(1, n);
}

// Đường kẻ đứt ở đúng giữa khe hở — cắt theo đó là đều tay, không cần đo.
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

// "Nhóm 1"/"Nhóm 2"... — đúng cách DoanVaVDV đang hiện nhóm tuổi, để
// khớp với chữ "Lứa tuổi:" đã in sẵn trên thẻ.
function formatNhom(n: number) {
  return `Nhóm ${n}`;
}

// Avatar/ảnh đại diện xưng hô theo TÊN (từ cuối), giống hệt quy ước của
// AthleteAvatar — dùng khi VĐV chưa có ảnh để khỏi in thẻ với ô ảnh trống
// trơn, dễ nhận ra thiếu ảnh trước khi in hàng loạt.
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
        className={styles.photoImg}
        onError={() => setFailed(true)}
        crossOrigin="anonymous"
      />
    );
  }

  return <div className={styles.photoFallback}>{khoiTen(name)}</div>;
}

export default function InTheVDV() {
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [teams, setTeams] = useState<TeamLite[]>([]);
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

  // Tiêu đề + logo lấy riêng, không chung Promise.all với athletes/teams
  // bên dưới — lỗi ở đây (backend cũ chưa có bảng logo chẳng hạn) không
  // được phép chặn mất chức năng chính (in thẻ).
  useEffect(() => {
    apiGet<{ tieuDeThe: string }>("/tournament")
      .then((t) => setTieuDeThe(t.tieuDeThe ?? ""))
      .catch(() => {});
    fetchTheVdvLogos()
      .then(setLogos)
      .catch(() => {});
  }, []);

  // Đo lại tỉ lệ THẬT lúc ảnh tải xong, để tự cập nhật khi sau này đổi
  // sang ảnh mẫu chính thức (tỉ lệ có thể khác) — nhưng khởi động đã
  // đúng sẵn nên không cần đợi bước này mới đổi Rộng/Cao được.
  useEffect(() => {
    const img = new Image();
    img.onload = () => setTyLeThe(img.naturalWidth / img.naturalHeight);
    img.src = theVdvBg;
  }, []);

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Giá trị "an toàn" dùng để tính toán/xuất — ô nhập được gõ tự do
  // (kể cả xoá trắng, số lẻ...), chỉ chặn khi thực sự dùng tới, để
  // không giật lại con số đang gõ dở giữa chừng.
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

  useEffect(() => {
    Promise.all([
      apiGet<AthleteRecord[]>("/dashboard/athletes"),
      apiGet<TeamLite[]>("/dashboard/teams"),
    ])
      .then(([athletesData, teamsData]) => {
        setAthletes(athletesData);
        setTeams(teamsData);
      })
      .catch(() =>
        setLoadError("Không tải được dữ liệu — kiểm tra backend đã chạy chưa"),
      )
      .finally(() => setLoading(false));
  }, []);

  const teamNameOf = useMemo(() => {
    const map = new Map(teams.map((t) => [t.id, t.ten]));
    return (teamId: string) => map.get(teamId) ?? "—";
  }, [teams]);

  // Xếp theo đơn vị rồi tên — để in xong chia chồng thẻ theo từng đoàn
  // luôn, khỏi phải lọc lại bằng tay.
  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...athletes]
      .filter((a) => !q || a.hoTen.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          teamNameOf(a.teamId).localeCompare(teamNameOf(b.teamId), "vi") ||
          a.hoTen.localeCompare(b.hoTen, "vi"),
      );
  }, [athletes, search, teamNameOf]);

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

      // Canh giữa cả khối thẻ trên trang — nhét được bao nhiêu cột/hàng
      // theo đúng kích thước thẻ thì phần lề dư ra chia đều 2 bên, thay
      // vì dồn hết về 1 góc.
      const contentW = cols * cardW + (cols - 1) * KHE_HO_MM;
      const marginX = (pageW - contentW) / 2;
      const contentH = rows * cardH + (rows - 1) * KHE_HO_MM;
      const marginY = (pageH - contentH) / 2;

      for (let i = 0; i < sorted.length; i++) {
        const a = sorted[i];
        const el = cardRefs.current.get(a.id);
        if (!el) continue;

        const viTri = i % moiTrang;
        if (viTri === 0) {
          if (i > 0) doc.addPage();
          veKeCat(doc, pageW, pageH, marginX, marginY, cardW, cardH, cols, rows);
        }

        // Trước đây scale cố định x3 nhân với đúng kích thước đang HIỂN
        // THỊ trên màn hình (ô xem trước nhỏ gọn cho dễ lướt danh sách,
        // tầm 260-400px) — nên ảnh chụp ra chỉ tầm 900-1200px, quy ra
        // chưa tới 120 DPI khi in, rõ mờ dù ảnh mẫu gốc tới 3329x4616px.
        // Giờ tính lại scale để LUÔN đạt đúng 300 DPI theo đúng kích
        // thước MM đang chọn để in (cardW), không phụ thuộc màn hình
        // đang hiện to hay nhỏ — cỡ nào cũng ra đúng chất lượng in thật.
        const rongHienThiPx = el.getBoundingClientRect().width || 1;
        const rongMucTieuPx = (cardW / 25.4) * 300; // 300 DPI
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

        // Rộng x Cao nhập ở trên LÀ kích thước của cả thẻ, không phải 1
        // khung ngoài chứa thẻ nhỏ hơn bên trong — nên phủ kín đúng ô,
        // không canh-giữa-chừa-trắng theo tỉ lệ ảnh nữa. Đổi Rộng thì
        // Cao đã tự tính đúng tỉ lệ nên bình thường không méo; nếu tự
        // sửa riêng Cao lệch tỉ lệ thì đây là lúc thẻ co giãn theo đúng
        // số đã nhập, không còn phần thừa/thiếu nào.
        doc.addImage(imgData, "PNG", oX, oY, cardW, cardH, undefined, "FAST");

        setExportTien({ da: i + 1, tong: sorted.length });
      }

      doc.save("the-vdv.pdf");
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
      <div className={styles.page}>
        <p className={styles.hint}>Đang tải dữ liệu...</p>
      </div>
    );
  if (loadError)
    return (
      <div className={styles.page}>
        <p className={styles.hint}>{loadError}</p>
      </div>
    );

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input
            placeholder="Tìm theo tên VĐV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.sizeBox}>
          <span>Kích thước thẻ</span>
          <input
            type="number"
            className={styles.sizeInput}
            value={cardWmm}
            min={THE_KICH_THUOC_MIN}
            max={A4_RONG_MM - 2 * LE_TOI_THIEU_MM}
            step={0.5}
            onChange={(e) => {
              const v = Number(e.target.value);
              setCardWmm(v);
              // Đổi Rộng thì tính lại Cao theo đúng tỉ lệ ảnh mẫu (nhân
              // theo tỉ lệ, không phải cộng thêm bằng đúng số Rộng vừa
              // tăng) — khỏi nhẩm tay.
              setCardHmm(Math.round((v / tyLeThe) * 10) / 10);
            }}
            aria-label="Chiều rộng thẻ (mm)"
          />
          <span>×</span>
          <input
            type="number"
            className={styles.sizeInput}
            value={cardHmm}
            min={THE_KICH_THUOC_MIN}
            max={A4_CAO_MM - 2 * LE_TOI_THIEU_MM}
            step={0.5}
            onChange={(e) => setCardHmm(Number(e.target.value))}
            aria-label="Chiều cao thẻ (mm) — sửa riêng, không đổi Rộng"
          />
          <span>mm</span>
          <span className={styles.sizeHint}>
            → {cols}×{rows} = {moiTrang} thẻ/trang
          </span>
        </div>

        <button
          className={styles.exportBtn}
          onClick={xuatPDF}
          disabled={exporting || sorted.length === 0}>
          <Download size={16} />
          {exporting
            ? `Đang xuất... (${exportTien?.da ?? 0}/${exportTien?.tong ?? 0})`
            : `Tải file PDF (${sorted.length} thẻ · ${Math.ceil(
                sorted.length / moiTrang,
              )} trang)`}
        </button>
        {exportLoi && <p className={styles.exportLoi}>{exportLoi}</p>}
      </div>

      {sorted.length === 0 && (
        <p className={styles.hint}>Không có VĐV nào khớp.</p>
      )}

      <div className={styles.cardGrid}>
        {sorted.map((a) => (
          <div key={a.id} className={styles.cardWrap}>
            <div
              ref={(el) => {
                if (el) cardRefs.current.set(a.id, el);
              }}
              className={styles.card}>
              <img src={theVdvBg} alt="" className={styles.cardBg} />
              {tieuDeThe.trim() && (
                <div className={styles.tieuDe}>{tieuDeThe}</div>
              )}
              {logos.length > 0 && (
                <div className={styles.logoRow}>
                  {logos.map((logo) => (
                    <img
                      key={logo.id}
                      src={logo.duongDan}
                      alt=""
                      className={styles.logoAnh}
                    />
                  ))}
                </div>
              )}
              <div className={styles.photoBox}>
                <CardPhoto name={a.hoTen} photoUrl={a.anhDaiDien} />
              </div>
              <div className={`${styles.field} ${styles.fieldHoTen}`}>
                {a.hoTen}
              </div>
              <div className={`${styles.field} ${styles.fieldNhomTuoi}`}>
                {formatNhom(a.nhomTuoi)}
              </div>
              <div className={`${styles.field} ${styles.fieldDonVi}`}>
                {teamNameOf(a.teamId)}
              </div>
            </div>
            <p className={styles.cardCaption}>{a.hoTen}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
