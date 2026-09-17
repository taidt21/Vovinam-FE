/** @format */

import { useRef, useState, type ChangeEvent } from "react";
import { Upload, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { CompetitionEvent } from "../../types";
import Modal from "../Modal/Modal";
import {
  parseWorkbook,
  buildTemplateFile,
  type ImportRow,
} from "../../lib/excel/excelImport";
import styles from "./ImportExcelModal.module.scss";

interface ImportExcelModalProps {
  existingTeamNames: string[];
  events: CompetitionEvent[];
  existingAthletes: { hoTen: string; namSinh: number }[];
  importing?: boolean;
  onClose: () => void;
  onConfirm: (file: File) => void;
}

export default function ImportExcelModal({
  existingTeamNames,
  events,
  existingAthletes,
  importing = false,
  onClose,
  onConfirm,
}: ImportExcelModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [unknownColumns, setUnknownColumns] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const normalizedExisting = new Set(
    existingTeamNames.map((t) => t.trim().toLowerCase()),
  );

  const onFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const buffer = await file.arrayBuffer();
    try {
      const result = parseWorkbook(buffer, events, existingAthletes);
      setRows(result.rows);
      setUnknownColumns(result.unknownColumns);
      setFileError(result.fileError);
    } catch (error) {
      setRows([]);
      setUnknownColumns([]);
      setFileError(
        error instanceof Error
          ? `Không đọc được file Excel: ${error.message}`
          : 'Không đọc được file Excel.',
      );
    }
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
    <Modal title="Import toàn bộ danh sách từ Excel" onClose={onClose} size="lg">
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
          {fileError && (
            <p className={styles.warnNote}>
              <AlertTriangle size={14} /> {fileError}
            </p>
          )}
          <button
            type="button"
            className={styles.templateLink}
            onClick={downloadTemplate}>
            <Download size={14} /> Tải file mẫu đúng cột
          </button>
        </div>
      ) : (
        <div className={styles.reviewArea}>
          {fileError && (
            <p className={styles.warnNote}>
              <AlertTriangle size={14} /> {fileError}
            </p>
          )}
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

          <p className={styles.infoNote}>
            Bảng dưới đây kiểm tra từng dòng trong sheet VĐV. Khi xác nhận,
            hệ thống sẽ import toàn bộ workbook gồm Đơn vị, logo, VĐV, cán bộ
            đoàn và các ảnh.
          </p>

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
                  <th>Nội dung</th>
                  <th>Ảnh</th>
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
                    <td>{r.noiDung.length > 0 ? r.noiDung.join(", ") : "—"}</td>
                    <td>
                      {r.anhDaiDien ? (
                        <a
                          href={r.anhDaiDien}
                          target="_blank"
                          rel="noreferrer"
                          title={r.anhDaiDien}>
                          Có ảnh
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
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
              onClick={() => {
                setRows(null);
                setSelectedFile(null);
                setFileError(null);
                setUnknownColumns([]);
                if (fileRef.current) fileRef.current.value = '';
              }}>
              Chọn file khác
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!selectedFile || Boolean(fileError) || importing}
              onClick={() => selectedFile && onConfirm(selectedFile)}>
              {importing
                ? "Đang import..."
                : `Xác nhận import toàn bộ file (${validRows.length} VĐV hợp lệ)`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
