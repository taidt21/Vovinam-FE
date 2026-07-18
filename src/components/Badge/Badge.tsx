/** @format */

import type { ReactNode } from "react";
import styles from "./Badge.module.scss";

type BadgeTone = "success" | "warning" | "danger" | "neutral";

interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
}

export default function Badge({ tone, children }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
