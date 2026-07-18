/** @format */

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import styles from "./TagInput.module.scss";

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export default function TagInput({
  value,
  onChange,
  placeholder,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const trimmed = draft.trim();
    if (!trimmed || value.includes(trimmed)) return; // rỗng hoặc trùng thì bỏ qua
    onChange([...value, trimmed]);
    setDraft("");
  };

  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // chặn Enter submit luôn cả form Thêm/Sửa VĐV bên ngoài
      addTag();
    }
  };

  return (
    <div className={styles.tagInput}>
      <div className={styles.tagRow}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <button type="button" onClick={addTag}>
          Thêm
        </button>
      </div>
      {value.length > 0 && (
        <div className={styles.tagList}>
          {value.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Xóa ${tag}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
