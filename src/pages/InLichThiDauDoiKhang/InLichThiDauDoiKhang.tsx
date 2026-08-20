/** @format */

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { AthleteRecord, CompetitionEvent, Match } from "../../types";
import { fetchEvents } from "../../lib/api/eventsApi";
import { apiGet } from "../../lib/api/api";
import { numberDoiKhangMatches, winnerLabel } from "../../lib/domain/bracket";
import { compareNhomTuoi, formatEventNhomTuoi } from "../../lib/utils/nhomTuoi";
import styles from "./InLichThiDauDoiKhang.module.scss";

function teamName(
  teamId: string,
  teams: { id: string; ten: string }[],
): string {
  return teams.find((t) => t.id === teamId)?.ten ?? "—";
}

function gioiTinhLabel(gioiTinh: CompetitionEvent["gioiTinh"]): string {
  return gioiTinh === "nam" ? "Nam" : gioiTinh === "nu" ? "Nữ" : "Hỗn hợp";
}

// Vòng 32 và Vòng 16 gộp chung nhãn "Vòng loại" khi in — các vòng khác
// (Tứ kết, Bán kết, Chung kết...) giữ nguyên như dữ liệu gốc.
function nhanVong(vong: string): string {
  return vong === "Vòng 32" || vong === "Vòng 16" ? "Vòng loại" : vong;
}

// "Đối kháng Nam - 41kg" -> "41kg" ; "Đối kháng Nữ - Dưới 35kg" -> "Dưới
// 35kg". Chỉ bỏ đúng tiền tố "Đối kháng <giới tính>" ở đầu tên, giữ
// nguyên phần hạng cân dù viết dạng số thường hay "Dưới/Trên X kg" (hệ
// thống không có field riêng cho dạng hạng cân mở, chỉ có tên tự do).
// Không khớp được tiền tố thì giữ nguyên tên gốc, tránh mất chữ.
function tenHangCan(
  ten: string,
  gioiTinh: CompetitionEvent["gioiTinh"],
): string {
  const nhan = gioiTinhLabel(gioiTinh);
  const re = new RegExp(`^\\s*đối\\s*kháng\\s*${nhan}\\s*[-–—:]?\\s*`, "i");
  const con = ten.replace(re, "").trim();
  return con || ten;
}

// Bảng màu badge — dùng chung cho preview (web) và PDF, tách hẳn khỏi
// $color-do/$color-xanh/$color-vang sẵn có của app (những màu đó đã
// mang nghĩa riêng: góc đỏ/xanh, HCV) để khỏi gây hiểu lầm badge liên
// quan tới góc đấu.
type MauBadge = {
  bg: readonly [number, number, number];
  text: readonly [number, number, number];
};
const rgbCss = (c: readonly [number, number, number]) =>
  `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

// Vòng: 1 dải màu tăng dần độ đậm theo tiến trình giải — càng gần chung
// kết màu càng đậm, để màu tự thể hiện "trận này ở giai đoạn nào" thay
// vì chỉ là trang trí.
const BADGE_VONG: Record<string, MauBadge> = {
  "Vòng loại": {
    bg: [244, 240, 250],
    text: [86, 63, 120],
  },

  "Tứ kết": {
    bg: [224, 214, 239],
    text: [79, 52, 112],
  },

  "Bán kết": {
    bg: [171, 139, 204],
    text: [54, 33, 79],
  },

  "Chung kết": {
    bg: [86, 52, 120],
    text: [255, 255, 255],
  },
};
const mauVong = (v: string): MauBadge =>
  BADGE_VONG[v] ?? { bg: [230, 230, 230], text: [70, 70, 70] };

// Hạng cân: có tới hàng chục giá trị khác nhau — tô đặc riêng từng màu
// sẽ loạn mắt, nên làm badge VIỀN (không tô nền) thay vì tô đặc như
// Vòng, vừa đỡ rối vừa tạo nhịp khác biệt giữa 2 cột có màu.
const MAU_HANG_CAN: MauBadge = { bg: [181, 101, 29], text: [140, 78, 22] };

// Màu góc đỏ/xanh — lấy đúng $color-do/$color-xanh của app (không phải
// bảng màu badge riêng ở trên) vì đây đúng nghĩa "góc đấu", khác với
// Vòng/Hạng cân là phân loại chung chung.
const RGB_DO = [200, 38, 42] as const;
const RGB_XANH = [27, 75, 143] as const;
const RGB_TEAM = [107, 114, 128] as const;

type VdvSide = { ten: string; doi: string | null };

function Badge({
  mau,
  text,
  vienThoi,
}: {
  mau: MauBadge;
  text: string;
  vienThoi?: boolean;
}) {
  return (
    <span
      className={styles.badge}
      style={
        vienThoi
          ? { border: `1.5px solid ${rgbCss(mau.bg)}`, color: rgbCss(mau.text) }
          : { background: rgbCss(mau.bg), color: rgbCss(mau.text) }
      }>
      {text}
    </span>
  );
}

export default function InLichThiDauDoiKhang() {
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [teams, setTeams] = useState<{ id: string; ten: string }[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportLoi, setExportLoi] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchEvents(),
      apiGet<AthleteRecord[]>("/dashboard/athletes"),
      apiGet<{ id: string; ten: string }[]>("/dashboard/teams"),
      apiGet<Match[]>("/matches"),
    ])
      .then(([eventsData, athletesData, teamsData, matchesData]) => {
        setEvents(eventsData);
        setAthletes(athletesData);
        setTeams(teamsData);
        setMatches(matchesData);
      })
      .catch(() =>
        setLoadError("Không tải được dữ liệu — kiểm tra backend đã chạy chưa"),
      )
      .finally(() => setLoading(false));
  }, []);

  const bracketsByEvent = useMemo(() => {
    const byEvent: Record<string, Match[]> = {};
    for (const m of matches) {
      if (!byEvent[m.eventId]) byEvent[m.eventId] = [];
      byEvent[m.eventId].push(m);
    }
    return byEvent;
  }, [matches]);

  const doiKhangNumbered = useMemo(
    () => numberDoiKhangMatches(events, bracketsByEvent),
    [events, bracketsByEvent],
  );
  const soByMatchId = useMemo(
    () => new Map(doiKhangNumbered.map((x) => [x.match.id, x.so])),
    [doiKhangNumbered],
  );

  const nhomTuoiList = useMemo(
    () =>
      Array.from(new Set(events.map((e) => e.nhomTuoi))).sort(compareNhomTuoi),
    [events],
  );

  const vdvSide = (
    id: string | null,
    event: CompetitionEvent,
    match: Match,
    mau: "do" | "xanh",
  ): VdvSide => {
    if (!id)
      return {
        ten: winnerLabel(
          bracketsByEvent[event.id] ?? [],
          soByMatchId,
          match.id,
          mau,
        ),
        doi: null,
      };
    const a = athletes.find((x) => x.id === id);
    if (!a) return { ten: "—", doi: null };
    return { ten: a.hoTen, doi: teamName(a.teamId, teams) };
  };

  const xuatPDF = async () => {
    setExportLoi(null);
    setExporting(true);
    try {
      const [{ jsPDF }, { autoTable }, { dangKyFontVN }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
        import("../../lib/pdf/robotoVietnamese"),
      ]);

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      dangKyFontVN(doc);

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 12;
      const tableW = pageW - margin * 2;

      // Các giá trị dưới đây bám theo SCSS của preview web:
      // - xanh: header + góc xanh
      // - vàng nhạt: tiêu đề nhóm tuổi + zebra row
      // - xám: border/text phụ
      // - kích thước badge quy đổi gần tương đương px -> mm/pt
      const PDF_THEME = {
        text: [26, 26, 26] as const,
        muted: RGB_TEAM,
        border: [199, 193, 207] as const,
        unitText: [65, 70, 80] as const,
        genderText: [63, 57, 71] as const,
        // Header thông tin (# / Vòng / Hạng cân / Giới tính) dùng vàng trung tính.
        // Hai nhóm góc ĐỎ / XANH vẫn override bằng màu góc tương ứng ở head bên dưới.
        headerBg: [212, 167, 44] as const,
        headerText: [26, 26, 26] as const,
        groupBg: [249, 244, 228] as const,
        groupBorder: [236, 216, 160] as const,
        alternateRowBg: [253, 250, 243] as const,
        bodyBg: [255, 255, 255] as const,
        titleFont: 24,
        groupFont: 10.5,
        bodyFont: 9.75,
        headerFont: 9,
        badgeFont: 9.75,
        badgeHeight: 7,
        badgePadX: 2.7,
        rowHeight: 13,
      };

      let y = margin + 5;

      const canhBaoTran = (chieuCaoCanDung: number) => {
        if (y + chieuCaoCanDung > pageH - margin) {
          doc.addPage();
          y = margin + 5;
        }
      };

      // Tiêu đề: trên web là 26-34px/900; PDF dùng 24pt để giữ cùng nhịp thị giác.
      doc.setFont("RobotoVN", "bold");
      doc.setFontSize(PDF_THEME.titleFont);
      doc.setTextColor(PDF_THEME.text[0], PDF_THEME.text[1], PDF_THEME.text[2]);
      doc.text("Lịch thi đấu đối kháng", margin, y);
      y += 11;

      if (doiKhangNumbered.length === 0) {
        doc.setFontSize(10);
        doc.setFont("RobotoVN", "normal");
        doc.setTextColor(
          PDF_THEME.muted[0],
          PDF_THEME.muted[1],
          PDF_THEME.muted[2],
        );
        doc.text("Chưa có nội dung đối kháng nào đã bốc thăm.", margin, y);
      } else {
        for (const nt of nhomTuoiList) {
          const items = doiKhangNumbered.filter((x) => x.event.nhomTuoi === nt);
          if (items.length === 0) continue;

          // Một title bar giống .ntTitle trên web, thay vì chỉ vẽ text trần.
          canhBaoTran(30);
          const ntH = 8.5;
          doc.setFillColor(
            PDF_THEME.groupBg[0],
            PDF_THEME.groupBg[1],
            PDF_THEME.groupBg[2],
          );
          doc.rect(margin, y, tableW, ntH, "F");
          doc.setDrawColor(
            PDF_THEME.groupBorder[0],
            PDF_THEME.groupBorder[1],
            PDF_THEME.groupBorder[2],
          );
          doc.setLineWidth(0.25);
          doc.line(margin, y + ntH, margin + tableW, y + ntH);

          doc.setFont("RobotoVN", "bold");
          doc.setFontSize(PDF_THEME.groupFont);
          doc.setTextColor(
            PDF_THEME.text[0],
            PDF_THEME.text[1],
            PDF_THEME.text[2],
          );
          doc.text(
            formatEventNhomTuoi(nt).toUpperCase(),
            margin + 4,
            y + ntH / 2 + 0.2,
            {
              baseline: "middle",
            },
          );
          y += ntH;

          // Bốn cột thi đấu giống mẫu in: ĐỎ(VĐV + ĐƠN VỊ) và
          // XANH(VĐV + ĐƠN VỊ). Các cột thông tin bên trái được thu gọn,
          // phần chiều rộng còn lại chia đều cho hai góc đấu; trong mỗi góc
          // VĐV rộng hơn ĐƠN VỊ để tên dài ít bị xuống dòng.
          const fixedW = 11 + 27 + 24 + 38;
          const sideW = (tableW - fixedW) / 2;
          const athleteW = sideW * 0.58;
          const teamW = sideW - athleteW;

          autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            tableWidth: tableW,
            theme: "grid",
            styles: {
              font: "RobotoVN",
              fontSize: PDF_THEME.bodyFont,
              cellPadding: { top: 2.5, right: 2.2, bottom: 2.5, left: 2.2 },
              lineColor: [...PDF_THEME.border],
              lineWidth: 0.3,
              textColor: [...PDF_THEME.text],
              valign: "middle",
              minCellHeight: 12.5,
              overflow: "linebreak",
            },
            headStyles: {
              fillColor: [...PDF_THEME.headerBg],
              textColor: [...PDF_THEME.headerText],
              fontSize: PDF_THEME.headerFont,
              fontStyle: "bold",
              minCellHeight: 8.5,
              valign: "middle",
              halign: "center",
              lineColor: [...PDF_THEME.border],
              lineWidth: 0.3,
            },
            alternateRowStyles: { fillColor: [...PDF_THEME.alternateRowBg] },
            columnStyles: {
              0: { cellWidth: 11, halign: "center", fontStyle: "bold" },
              1: { cellWidth: 27, halign: "center" },
              2: { cellWidth: 38, halign: "center" },
              3: {
                cellWidth: 24,
                halign: "center",
                fontStyle: "bold",
                textColor: [...PDF_THEME.genderText],
              },
              4: { cellWidth: athleteW, halign: "left" },
              5: { cellWidth: teamW, halign: "left" },
              6: { cellWidth: athleteW, halign: "left" },
              7: { cellWidth: teamW, halign: "left" },
            },
            head: [
              [
                { content: "#", rowSpan: 2 },
                { content: "VÒNG", rowSpan: 2 },
                { content: "HẠNG CÂN", rowSpan: 2 },
                { content: "GIỚI TÍNH", rowSpan: 2 },
                {
                  content: "ĐỎ",
                  colSpan: 2,
                  styles: {
                    fillColor: [...RGB_DO],
                    textColor: [255, 255, 255],
                    halign: "center",
                    fontStyle: "bold",
                  },
                },
                {
                  content: "XANH",
                  colSpan: 2,
                  styles: {
                    fillColor: [...RGB_XANH],
                    textColor: [255, 255, 255],
                    halign: "center",
                    fontStyle: "bold",
                  },
                },
              ],
              [
                {
                  content: "VĐV",
                  styles: {
                    fillColor: [...RGB_DO],
                    textColor: [255, 255, 255],
                  },
                },
                {
                  content: "ĐƠN VỊ",
                  styles: {
                    fillColor: [...RGB_DO],
                    textColor: [255, 255, 255],
                  },
                },
                {
                  content: "VĐV",
                  styles: {
                    fillColor: [...RGB_XANH],
                    textColor: [255, 255, 255],
                  },
                },
                {
                  content: "ĐƠN VỊ",
                  styles: {
                    fillColor: [...RGB_XANH],
                    textColor: [255, 255, 255],
                  },
                },
              ],
            ],
            body: items.map(({ event, match, so }) => {
              const doSide = vdvSide(match.athleteRedId, event, match, "do");
              const xanhSide = vdvSide(
                match.athleteBlueId,
                event,
                match,
                "xanh",
              );
              return [
                String(so),
                nhanVong(match.vong),
                tenHangCan(event.ten, event.gioiTinh),
                gioiTinhLabel(event.gioiTinh),
                doSide.ten,
                doSide.doi ?? "",
                xanhSide.ten,
                xanhSide.doi ?? "",
              ];
            }),

            didParseCell: (data) => {
              if (data.section !== "body") return;
              const idx = data.column.index;

              if (idx === 4) {
                data.cell.styles.textColor = [...RGB_DO];
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fontSize = 11;
              } else if (idx === 6) {
                data.cell.styles.textColor = [...RGB_XANH];
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fontSize = 11;
              } else if (idx === 3) {
                data.cell.styles.textColor = [...PDF_THEME.genderText];
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fontSize = 9.8;
              } else if (idx === 5 || idx === 7) {
                data.cell.styles.textColor = [...PDF_THEME.unitText];
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fontSize = 9.4;
              }
            },

            // Vòng và Hạng cân vẫn giữ badge như preview web.
            didDrawCell: (data) => {
              if (data.section !== "body") return;
              const idx = data.column.index;
              if (idx !== 1 && idx !== 2) return;

              const rowBg: readonly [number, number, number] =
                data.row.index % 2 === 1
                  ? PDF_THEME.alternateRowBg
                  : PDF_THEME.bodyBg;
              const text = String(data.cell.raw ?? "").trim();
              if (!text) return;

              const mau = idx === 1 ? mauVong(text) : MAU_HANG_CAN;
              const vienThoi = idx === 2;

              // didDrawCell chạy sau khi autoTable đã vẽ ô. Nếu tô "F" toàn ô
              // thì phần fill này sẽ che luôn đường grid của autoTable, vì vậy
              // vẽ lại cả nền + viền để cột Vòng/Hạng cân không bị mất border.
              doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
              doc.setDrawColor(
                PDF_THEME.border[0],
                PDF_THEME.border[1],
                PDF_THEME.border[2],
              );
              doc.setLineWidth(0.3);
              doc.rect(
                data.cell.x,
                data.cell.y,
                data.cell.width,
                data.cell.height,
                "FD",
              );

              doc.setFont("RobotoVN", "bold");
              doc.setFontSize(PDF_THEME.badgeFont);
              const textW = doc.getTextWidth(text);
              const badgeW = Math.min(
                textW + PDF_THEME.badgePadX * 2,
                data.cell.width - 2,
              );
              const badgeH = PDF_THEME.badgeHeight;
              const bx = data.cell.x + (data.cell.width - badgeW) / 2;
              const by = data.cell.y + (data.cell.height - badgeH) / 2;
              const radius = badgeH / 2;

              if (vienThoi) {
                doc.setDrawColor(mau.bg[0], mau.bg[1], mau.bg[2]);
                doc.setLineWidth(0.4);
                doc.roundedRect(bx, by, badgeW, badgeH, radius, radius, "S");
              } else {
                doc.setFillColor(mau.bg[0], mau.bg[1], mau.bg[2]);
                doc.roundedRect(bx, by, badgeW, badgeH, radius, radius, "F");
              }

              doc.setTextColor(mau.text[0], mau.text[1], mau.text[2]);
              doc.text(text, bx + badgeW / 2, by + badgeH / 2 + 0.15, {
                align: "center",
                baseline: "middle",
              });
            },
          });

          y =
            (doc as unknown as { lastAutoTable: { finalY: number } })
              .lastAutoTable.finalY + 6.5;
        }
      }

      doc.save("lich-thi-dau-doi-khang.pdf");
    } catch {
      setExportLoi(
        "Xuất PDF thất bại — thử lại, hoặc báo lỗi này lại nếu vẫn không được.",
      );
    } finally {
      setExporting(false);
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
      <button
        className={styles.exportBtn}
        onClick={xuatPDF}
        disabled={exporting}>
        <Download size={16} /> {exporting ? "Đang xuất..." : "Tải file PDF"}
      </button>
      {exportLoi && <p className={styles.exportLoi}>{exportLoi}</p>}

      <h1 className={styles.mainTitle}>Lịch thi đấu đối kháng</h1>
      <p className={styles.hint}>
        Bấm "Tải file PDF" để tải về máy — nội dung xem trước bên dưới chỉ để
        kiểm tra dữ liệu, không dùng để in trực tiếp.
      </p>

      {doiKhangNumbered.length === 0 ? (
        <p className={styles.hint}>
          Chưa có nội dung đối kháng nào đã bốc thăm.
        </p>
      ) : (
        nhomTuoiList.map((nt) => {
          const items = doiKhangNumbered.filter((x) => x.event.nhomTuoi === nt);
          if (items.length === 0) return null;
          return (
            <div key={nt} className={styles.ntBlock}>
              <h3 className={styles.ntTitle}>{formatEventNhomTuoi(nt)}</h3>
              <table className={styles.matchTable}>
                <thead>
                  <tr>
                    <th className={styles.colNo} rowSpan={2}>
                      #
                    </th>
                    <th className={styles.colVong} rowSpan={2}>
                      Vòng
                    </th>
                    <th className={styles.colEvent} rowSpan={2}>
                      Hạng cân
                    </th>
                    <th className={styles.colGioiTinh} rowSpan={2}>
                      Giới tính
                    </th>
                    <th className={styles.headerDo} colSpan={2}>
                      Đỏ
                    </th>
                    <th className={styles.headerXanh} colSpan={2}>
                      Xanh
                    </th>
                  </tr>
                  <tr>
                    <th className={styles.subHeaderDo}>VĐV</th>
                    <th className={styles.subHeaderDo}>Đơn vị</th>
                    <th className={styles.subHeaderXanh}>VĐV</th>
                    <th className={styles.subHeaderXanh}>Đơn vị</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ event, match, so }) => {
                    const vong = nhanVong(match.vong);
                    const doSide = vdvSide(
                      match.athleteRedId,
                      event,
                      match,
                      "do",
                    );
                    const xanhSide = vdvSide(
                      match.athleteBlueId,
                      event,
                      match,
                      "xanh",
                    );
                    return (
                      <tr key={match.id}>
                        <td className={styles.colNo}>{so}</td>
                        <td className={styles.colVong}>
                          <Badge mau={mauVong(vong)} text={vong} />
                        </td>
                        <td className={styles.colEvent}>
                          <Badge
                            mau={MAU_HANG_CAN}
                            text={tenHangCan(event.ten, event.gioiTinh)}
                            vienThoi
                          />
                        </td>
                        <td className={styles.colGioiTinh}>
                          {gioiTinhLabel(event.gioiTinh)}
                        </td>
                        <td
                          className={`${styles.colVdvName} ${styles.vdvNameDoCell} ${
                            !match.athleteRedId ? styles.vdvCho : ""
                          }`}>
                          {doSide.ten}
                        </td>
                        <td
                          className={`${styles.colVdvTeam} ${styles.vdvTeamCell}`}>
                          {doSide.doi ?? ""}
                        </td>
                        <td
                          className={`${styles.colVdvName} ${styles.vdvNameXanhCell} ${
                            !match.athleteBlueId ? styles.vdvCho : ""
                          }`}>
                          {xanhSide.ten}
                        </td>
                        <td
                          className={`${styles.colVdvTeam} ${styles.vdvTeamCell}`}>
                          {xanhSide.doi ?? ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}
