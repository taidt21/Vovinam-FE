/** @format */

import { useRef, useState, type ChangeEvent } from "react";
import { Upload, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { CompetitionEvent } from "../../types";
import Modal from "../Modal/Modal";
import {
  parseEventsWorkbook,
  buildEventsTemplateFile,
  type EventImportRow,
} from "../../lib/excel/eventExcelImport";
import styles from "./ImportEventsExcelModal.module.scss";

interface ImportEventsExcelModalProps {
  existingEvents: CompetitionEvent[];
  onClose: () => void;
  onConfirm: (validRows: EventImportRow[]) => void;
}

export default function ImportEventsExcelModal({
  existingEvents,
  onClose,
  onConfirm,
}: ImportEventsExcelModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<EventImportRow[] | null>(null);
  const [unknownColumns, setUnknownColumns] = useState<string[]>([]);

  const onFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const { rows: parsed, unknownColumns: unknown } = parseEventsWorkbook(
      buffer,
      existingEvents,
    );
    setRows(parsed);
    setUnknownColumns(unknown);
  };

  const downloadTemplate = () => {
    const blob = buildEventsTemplateFile();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau-import-noi-dung.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validRows = rows?.filter((r) => r.errors.length === 0) ?? [];
  const errorRows = rows?.filter((r) => r.errors.length > 0) ?? [];

  return (
    <Modal
      title="Import nội dung, hạng cân & nhóm tuổi từ Excel"
      onClose={onClose}
      size="lg">
      {!rows ? (
        <div className={styles.uploadArea}>
          <button
            type="button"
            className={styles.dropZone}
            onClick={() => fileRef.current?.click()}>
            <Upload size={28} />
            <span>Bấm để chọn file Excel (.xlsx)</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={onFileInputChange}
          />
          <button
            type="button"
            className={styles.templateLink}
            onClick={downloadTemplate}>
            <Download size={14} /> Tải file mẫu — có ví dụ đối kháng và quyền
          </button>
        </div>
      ) : (
        <div className={styles.reviewArea}>
          <div className={styles.summaryRow}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryNum}>{rows.length}</span>
              <span>Tổng số dòng</span>
            </div>
            <div className={`${styles.summaryItem} ${styles.summaryOk}`}>
              <span className={styles.summaryNum}>{validRows.length}</span>
              <span>Hợp lệ</span>
            </div>
            <div className={`${styles.summaryItem} ${styles.summaryError}`}>
              <span className={styles.summaryNum}>{errorRows.length}</span>
              <span>Có lỗi</span>
            </div>
          </div>

          {unknownColumns.length > 0 && (
            <p className={styles.warnNote}>
              <AlertTriangle size={14} /> Không nhận diện được cột:{" "}
              {unknownColumns.join(", ")} — bị bỏ qua.
            </p>
          )}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>Dòng</th>
                  <th>Tên nội dung</th>
                  <th>Loại</th>
                  <th>Giới tính</th>
                  <th>Hình thức</th>
                  <th>Nhóm tuổi</th>
                  <th>Hạng cân</th>
                  <th>Thời gian</th>
                  <th>Ghi chú lỗi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.rowNumber}
                    className={
                      r.errors.length > 0 ? styles.rowError : undefined
                    }>
                    <td>
                      {r.errors.length === 0 ? (
                        <CheckCircle2 size={14} className={styles.iconOk} />
                      ) : (
                        <AlertTriangle size={14} className={styles.iconError} />
                      )}
                    </td>
                    <td>{r.rowNumber}</td>
                    <td>{r.ten || "—"}</td>
                    <td>
                      {r.loai === "quyen"
                        ? "Quyền"
                        : r.loai === "doi_khang"
                          ? "Đối kháng"
                          : "—"}
                    </td>
                    <td>
                      {r.gioiTinh === "nam"
                        ? "Nam"
                        : r.gioiTinh === "nu"
                          ? "Nữ"
                          : r.gioiTinh === "hon_hop"
                            ? "Hỗn hợp"
                            : "—"}
                    </td>
                    <td>{r.hinhThucThi === "doi" ? "Đồng đội" : "Cá nhân"}</td>
                    <td>
                      {r.nhomTuoi === "hon_hop"
                        ? "Hỗn hợp"
                        : (r.nhomTuoi ?? "—")}
                    </td>
                    <td>{r.hangCan ?? "—"}</td>
                    <td>{r.thoiGianBaiGiay ?? "—"}</td>
                    <td className={styles.errorCell}>{r.errors.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => setRows(null)}>
              Chọn file khác
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={validRows.length === 0}
              onClick={() => onConfirm(validRows)}>
              Ghi nhận import {validRows.length} nội dung
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
