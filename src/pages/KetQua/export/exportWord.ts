/** @format */

// Xuất báo cáo kết quả ra file Word (.docx), theo đúng bố cục file mẫu:
// Lứa tuổi (số La Mã) -> Nội dung (đánh số) -> bảng kết quả -> câu kết + khối ký tên.
//
// Cần cài thêm gói: npm install docx

import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { LuaTuoiReport } from "./reportData";

const cellBorder = {
  top: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
  left: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
  right: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
};

function headerCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: cellBorder,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true })],
      }),
    ],
  });
}

function dataCell(
  text: string,
  width: number,
  center = false,
  verticalMerge?: "restart" | "continue",
) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: cellBorder,
    verticalMerge,
    children: [
      new Paragraph({
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text })],
      }),
    ],
  });
}

// Gộp STT/Đơn vị/Thành tích thành 1 ô cao (verticalMerge) — CHỈ áp dụng
// cho đúng quyền đồng đội (laDongDoi), nơi nhiều dòng liên tiếp thật sự
// là nhiều thành viên của CÙNG 1 đội. Đối kháng/quyền cá nhân giữ
// nguyên 1 dòng/người, kể cả khi 2 người tình cờ trùng STT (đồng hạng
// ba) hoặc trùng đơn vị — đó là 2 người khác nhau, không được gộp.
function resultTable(
  rows: LuaTuoiReport["noiDungs"][number]["rows"],
  laDongDoi: boolean,
) {
  const dataRows: TableRow[] = [];
  if (laDongDoi) {
    for (let i = 0; i < rows.length; ) {
      const r = rows[i];
      let span = 1;
      while (i + span < rows.length && rows[i + span].stt === r.stt) span++;
      const merge = span > 1 ? "restart" : undefined;

      dataRows.push(
        new TableRow({
          children: [
            dataCell(String(r.stt), 10, true, merge),
            dataCell(r.hoTen, 30),
            dataCell(r.namSinh, 15, true),
            dataCell(r.donVi, 25, false, merge),
            dataCell(r.thanhTich, 20, true, merge),
          ],
        }),
      );
      for (let k = 1; k < span; k++) {
        const m = rows[i + k];
        dataRows.push(
          new TableRow({
            children: [
              dataCell("", 10, true, "continue"),
              dataCell(m.hoTen, 30),
              dataCell(m.namSinh, 15, true),
              dataCell("", 25, false, "continue"),
              dataCell("", 20, true, "continue"),
            ],
          }),
        );
      }
      i += span;
    }
  } else {
    for (const r of rows) {
      dataRows.push(
        new TableRow({
          children: [
            dataCell(String(r.stt), 10, true),
            dataCell(r.hoTen, 30),
            dataCell(r.namSinh, 15, true),
            dataCell(r.donVi, 25),
            dataCell(r.thanhTich, 20, true),
          ],
        }),
      );
    }
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          headerCell("STT", 10),
          headerCell("Họ và tên", 30),
          headerCell("Năm sinh", 15),
          headerCell("Đơn vị", 25),
          headerCell("Thành tích", 20),
        ],
      }),
      ...dataRows,
    ],
  });
}

export async function exportKetQuaWord(
  report: LuaTuoiReport[],
  tenGiai: string,
): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  for (const nhom of report) {
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({ text: `${nhom.soLaMa}.    ${nhom.tieuDe}`, bold: true, size: 26 }),
        ],
      }),
    );

    for (const nd of nhom.noiDungs) {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({ text: `${nd.soThuTu}.  ${nd.tenNoiDung}`, bold: true }),
          ],
        }),
      );
      children.push(resultTable(nd.rows, nd.laDongDoi));
      children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
    }
  }

  children.push(
    new Paragraph({
      spacing: { before: 240, after: 240 },
      children: [
        new TextRun({
          text: `Trên đây là kết quả thi đấu ${tenGiai}./.`,
        }),
      ],
    }),
  );

  // Khối ký tên — thay tên/chức danh thật của giải trước khi gửi, đây chỉ là khung mẫu.
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ children: [new TextRun({ text: "Nơi nhận:", bold: true })] }),
                new Paragraph({ text: "- Ban tổ chức;" }),
                new Paragraph({ text: "- Các CLB tham dự;" }),
                new Paragraph({ text: "- Lưu VT." }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "TM. BAN TỔ CHỨC", bold: true })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "TRƯỞNG BAN", bold: true })],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "" }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}
