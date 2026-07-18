/** @format */

import { useRef, useState, type ChangeEvent } from "react";
import { Upload, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import Modal from "../Modal/Modal";
import {
  parseWorkbook,
  buildTemplateFile,
  type ImportRow,
} from "../../lib/excelImport";
import styles from "./ImportExcelModal.module.scss";

interface ImportExcelModalProps {
  existingTeamNames: string[];
  onClose: () => void;
  onConfirm: (validRows: ImportRow[]) => void;
}

export default function ImportExcelModal({
  existingTeamNames,
  onClose,
  onConfirm,
}: ImportExcelModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [unknownColumns, setUnknownColumns] = useState<string[]>([]);

  const normalizedExisting = new Set(
    existingTeamNames.map((t) => t.trim().toLowerCase()),
  );

  const onFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const { rows: parsed, unknownColumns: unknown } = parseWorkbook(buffer);
    setRows(parsed);
    setUnknownColumns(unknown);
  };

  const downloadTemplate = () => {
    const blob = buildTemplateFile();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau-import-vdv.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validRows = rows?.filter((r) => r.errors.length === 0) ?? [];
  const errorRows = rows?.filter((r) => r.errors.length > 0) ?? [];
  const newTeamNames = Array.from(
    new Set(
      validRows
        .map((r) => r.donVi.trim())
        .filter((d) => d && !normalizedExisting.has(d.toLowerCase())),
    ),
  );

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
            <Download size={14} /> Tải file mẫu đúng cột
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
            {newTeamNames.length > 0 && (
              <div className={styles.summaryItem}>
                <span className={styles.summaryNum}>{newTeamNames.length}</span>
                <span>Đơn vị mới</span>
              </div>
            )}
          </div>

          {unknownColumns.length > 0 && (
            <p className={styles.warnNote}>
              <AlertTriangle size={14} /> Không nhận diện được cột:{" "}
              {unknownColumns.join(", ")} — bị bỏ qua.
            </p>
          )}

          {newTeamNames.length > 0 && (
            <p className={styles.infoNote}>
              Sẽ tự tạo mới {newTeamNames.length} đơn vị:{" "}
              {newTeamNames.join(", ")}
            </p>
          )}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>Dòng</th>
                  <th>Họ tên</th>
                  <th>Năm sinh</th>
                  <th>Giới tính</th>
                  <th>Nhóm tuổi</th>
                  <th>Đơn vị</th>
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
                    <td>{r.namSinh ?? "—"}</td>
                    <td>
                      {r.gioiTinh ? (r.gioiTinh === "nam" ? "Nam" : "Nữ") : "—"}
                    </td>
                    <td>{r.nhomTuoi || "—"}</td>
                    <td>{r.donVi || "—"}</td>
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
