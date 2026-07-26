/** @format */

import { useRef, useState, type ChangeEvent } from "react";
import { Upload, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { CompetitionEvent } from "../../types";
import Modal from "../../components/Modal/Modal";

import {
  parseWorkbook,
  buildTemplateFile,
  validateTeamConsistency,
  type ImportRow,
} from "../../lib/portalExcelImport";
import styles from "./PortalImportExcelModal.module.scss";

interface PortalImportExcelModalProps {
  events: CompetitionEvent[];
  existingSquads: { eventId: string; ten: string }[];
  onClose: () => void;
  onConfirm: (validRows: ImportRow[]) => void;
}

export default function PortalImportExcelModal({
  events,
  existingSquads,
  onClose,
  onConfirm,
}: PortalImportExcelModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [unknownColumns, setUnknownColumns] = useState<string[]>([]);

  const onFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const { rows: parsed, unknownColumns: unknown } = parseWorkbook(
      buffer,
      events,
    );
    setRows(validateTeamConsistency(parsed, existingSquads));
    setUnknownColumns(unknown);
  };

  const downloadTemplate = () => {
    const blob = buildTemplateFile(events);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau-import-vdv.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validRows = rows?.filter((r) => r.errors.length === 0) ?? [];
  const errorRows = rows?.filter((r) => r.errors.length > 0) ?? [];

  return (
    <Modal title="Import danh sách VĐV từ Excel" onClose={onClose} size="lg">
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
            <Download size={14} /> Tải file mẫu — có sẵn ví dụ đăng ký đội
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
                  <th>Họ tên</th>
                  <th>Nội dung đăng ký</th>
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
                    <td>{r.hoTen || "—"}</td>
                    <td>{r.noiDung.map((n) => n.raw).join("; ") || "—"}</td>
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
              Ghi nhận import {validRows.length} VĐV
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
