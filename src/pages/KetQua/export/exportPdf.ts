/** @format */

// PDF trao giải: ưu tiên đọc nhanh, in rõ và hỗ trợ đầy đủ tiếng Việt.
// Font RobotoVN được đăng ký bởi helper dùng chung của dự án.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { dangKyFontVN } from "../../../lib/pdf/robotoVietnamese";
import type { LuaTuoiReport } from "./reportData";

const COLORS = {
  ink: [31, 41, 55] as const,
  muted: [107, 114, 128] as const,
  line: [226, 229, 234] as const,
  soft: [247, 248, 250] as const,
  accent: [153, 45, 58] as const,
  accentSoft: [249, 239, 241] as const,
  white: [255, 255, 255] as const,
};

export function exportKetQuaPdf(report: LuaTuoiReport[], tenGiai: string): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  dangKyFontVN(doc);
  doc.setFont("RobotoVN", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 36;
  const contentWidth = pageWidth - marginX * 2;
  const topForContinuation = 56;
  const bottomReserve = 48;
  let y = 38;

  const setTextColor = (rgb: readonly [number, number, number]) =>
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);

  const drawContinuationHeader = () => {
    doc.setFont("RobotoVN", "bold");
    doc.setFontSize(8.5);
    setTextColor(COLORS.muted);
    doc.text("KẾT QUẢ THI ĐẤU", marginX, 28);
    doc.setFont("RobotoVN", "normal");
    doc.text(tenGiai, pageWidth - marginX, 28, { align: "right" });
    doc.setDrawColor(COLORS.line[0], COLORS.line[1], COLORS.line[2]);
    doc.setLineWidth(0.6);
    doc.line(marginX, 36, pageWidth - marginX, 36);
  };

  const addManualPage = () => {
    doc.addPage();
    drawContinuationHeader();
    y = topForContinuation;
  };

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - bottomReserve) addManualPage();
  };

  // Header tài liệu.
  doc.setFillColor(COLORS.accentSoft[0], COLORS.accentSoft[1], COLORS.accentSoft[2]);
  doc.roundedRect(marginX, y, contentWidth, 76, 9, 9, "F");
  doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.roundedRect(marginX, y, 5, 76, 2.5, 2.5, "F");

  doc.setFont("RobotoVN", "bold");
  doc.setFontSize(10);
  setTextColor(COLORS.accent);
  doc.text("KẾT QUẢ THI ĐẤU", marginX + 18, y + 22);

  doc.setFontSize(18);
  setTextColor(COLORS.ink);
  const titleLines = doc.splitTextToSize(tenGiai, contentWidth - 36);
  doc.text(titleLines, marginX + 18, y + 47);
  y += 98;

  if (report.length === 0) {
    doc.setFont("RobotoVN", "normal");
    doc.setFontSize(10.5);
    setTextColor(COLORS.muted);
    doc.text("Chưa có dữ liệu kết quả để xuất.", marginX, y);
  }

  for (const nhom of report) {
    ensureSpace(56);

    // Header lứa/nhóm tuổi.
    doc.setFillColor(COLORS.soft[0], COLORS.soft[1], COLORS.soft[2]);
    doc.roundedRect(marginX, y, contentWidth, 34, 6, 6, "F");
    doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.roundedRect(marginX + 8, y + 8, 22, 18, 4, 4, "F");
    doc.setFont("RobotoVN", "bold");
    doc.setFontSize(8.5);
    setTextColor(COLORS.white);
    doc.text(nhom.soLaMa, marginX + 19, y + 20.5, { align: "center" });
    doc.setFontSize(11.5);
    setTextColor(COLORS.ink);
    doc.text(nhom.tieuDe, marginX + 40, y + 21.5);
    y += 46;

    for (const nd of nhom.noiDungs) {
      ensureSpace(74);

      // Tên nội dung.
      doc.setFont("RobotoVN", "bold");
      doc.setFontSize(10.5);
      setTextColor(COLORS.ink);
      doc.text(`${nd.soThuTu}.`, marginX, y + 1);

      const eventTitleX = marginX + 18;
      const eventTitleLines = doc.splitTextToSize(
        nd.tenNoiDung,
        contentWidth - 18,
      );
      doc.text(eventTitleLines, eventTitleX, y + 1);
      y += Math.max(17, eventTitleLines.length * 12 + 7);

      if (nd.rows.length === 0) {
        doc.setFont("RobotoVN", "normal");
        doc.setFontSize(9.5);
        setTextColor(COLORS.muted);
        doc.text("Chưa có kết quả.", eventTitleX, y);
        y += 22;
        continue;
      }

      // Gộp STT/Đơn vị/Thành tích thành 1 ô cao (rowSpan) — CHỈ áp dụng
      // cho đúng quyền đồng đội (nd.laDongDoi), nơi nhiều dòng liên tiếp
      // thật sự là nhiều thành viên của CÙNG 1 đội. Đối kháng/quyền cá
      // nhân giữ nguyên 1 dòng/người như cũ, kể cả khi 2 người tình cờ
      // trùng STT (đồng hạng ba) hoặc trùng đơn vị — đó là 2 người khác
      // nhau, không được gộp.
      type OTableCell = string | { content: string; rowSpan: number };
      const body: OTableCell[][] = [];
      if (nd.laDongDoi) {
        for (let i = 0; i < nd.rows.length; ) {
          const r = nd.rows[i];
          let span = 1;
          while (i + span < nd.rows.length && nd.rows[i + span].stt === r.stt) span++;
          body.push([
            span > 1 ? { content: String(r.stt), rowSpan: span } : String(r.stt),
            r.hoTen,
            r.namSinh,
            span > 1 ? { content: r.donVi, rowSpan: span } : r.donVi,
            span > 1 ? { content: r.thanhTich, rowSpan: span } : r.thanhTich,
          ]);
          for (let k = 1; k < span; k++) {
            body.push([nd.rows[i + k].hoTen, nd.rows[i + k].namSinh]);
          }
          i += span;
        }
      } else {
        for (const r of nd.rows) {
          body.push([String(r.stt), r.hoTen, r.namSinh, r.donVi, r.thanhTich]);
        }
      }

      autoTable(doc, {
        startY: y,
        margin: {
          left: marginX,
          right: marginX,
          top: topForContinuation,
          bottom: bottomReserve,
        },
        theme: "plain",
        head: [["STT", "Họ và tên", "Năm sinh", "Đơn vị", "Thành tích"]],
        body,
        styles: {
          font: "RobotoVN",
          fontStyle: "normal",
          fontSize: 9.2,
          textColor: [...COLORS.ink],
          cellPadding: { top: 7, right: 7, bottom: 7, left: 7 },
          minCellHeight: 27,
          valign: "middle",
          lineColor: [...COLORS.line],
          lineWidth: 0.55,
          overflow: "linebreak",
        },
        headStyles: {
          font: "RobotoVN",
          fontStyle: "bold",
          fontSize: 8.8,
          fillColor: [...COLORS.accent],
          textColor: [...COLORS.white],
          minCellHeight: 29,
          halign: "left",
        },
        alternateRowStyles: {
          fillColor: [250, 250, 251],
        },
        columnStyles: {
          0: { cellWidth: 34, halign: "center" },
          1: { cellWidth: 155 },
          2: { cellWidth: 62, halign: "center" },
          3: { cellWidth: 162 },
          4: { cellWidth: 110, halign: "center", fontStyle: "bold" },
        },
        didDrawPage: () => {
          if (doc.getCurrentPageInfo().pageNumber > 1) drawContinuationHeader();
        },
      });

      // lastAutoTable được jspdf-autotable gắn thêm vào instance lúc chạy.
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY;
      y = finalY + 22;
    }

    y += 4;
  }

  // Footer & số trang cho toàn bộ tài liệu, kể cả trang do autoTable tự sinh.
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(COLORS.line[0], COLORS.line[1], COLORS.line[2]);
    doc.setLineWidth(0.6);
    doc.line(marginX, pageHeight - 31, pageWidth - marginX, pageHeight - 31);

    doc.setFont("RobotoVN", "normal");
    doc.setFontSize(8);
    setTextColor(COLORS.muted);
    doc.text(tenGiai, marginX, pageHeight - 17);
    doc.text(`Trang ${page} / ${totalPages}`, pageWidth - marginX, pageHeight - 17, {
      align: "right",
    });
  }

  return doc.output("blob");
}