/** @format */

import type { ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./Modal.module.scss";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg";
}

export default function Modal({
  title,
  onClose,
  children,
  size = "md",
}: ModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.dialog} ${size === "lg" ? styles.dialogLg : ""}`}
        onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{title}</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
