/** @format */

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Athlete, Squad } from "../../types";
import Modal from "../Modal/Modal";
import styles from "./SquadManager.module.scss";

interface SquadManagerProps {
  registeredAthletes: Athlete[];
  squads: Squad[];
  onCreateSquad: (ten: string, athleteIds: string[]) => void;
  onDeleteSquad: (squadId: string) => void;
}

export default function SquadManager({
  registeredAthletes,
  squads,
  onCreateSquad,
  onDeleteSquad,
}: SquadManagerProps) {
  const assignedIds = new Set(squads.flatMap((s) => s.athleteIds));
  const unassigned = registeredAthletes.filter((a) => !assignedIds.has(a.id));

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [squadName, setSquadName] = useState("");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const openCreateModal = () => {
    setSquadName(`Đội ${squads.length + 1}`);
    setShowModal(true);
  };

  const submitSquad = (e: FormEvent) => {
    e.preventDefault();
    if (!squadName.trim() || selectedIds.length === 0) return;
    onCreateSquad(squadName.trim(), selectedIds);
    setSelectedIds([]);
    setShowModal(false);
  };

  const athleteName = (id: string) =>
    registeredAthletes.find((a) => a.id === id)?.hoTen ?? "—";

  return (
    <div className={styles.wrap}>
      <div className={styles.unassignedSection}>
        <div className={styles.sectionHead}>
          <h3>
            Chưa xếp đội <span>({unassigned.length} người)</span>
          </h3>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={openCreateModal}
            disabled={selectedIds.length === 0}>
            <Plus size={14} /> Tạo đội từ {selectedIds.length} người đã chọn
          </button>
        </div>
        {unassigned.length > 0 ? (
          <div className={styles.checkList}>
            {unassigned.map((a) => (
              <label key={a.id} className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(a.id)}
                  onChange={() => toggleSelect(a.id)}
                />
                {a.hoTen}
              </label>
            ))}
          </div>
        ) : (
          <p className={styles.hint}>Tất cả VĐV đã được xếp vào đội</p>
        )}
      </div>

      {squads.length > 0 && (
        <div className={styles.squadList}>
          <h3>Các đội đã tạo</h3>
          {squads.map((s) => (
            <div key={s.id} className={styles.squadCard}>
              <div className={styles.squadHead}>
                <strong>{s.ten}</strong>
                <button
                  type="button"
                  onClick={() => onDeleteSquad(s.id)}
                  aria-label={`Xóa ${s.ten}`}>
                  <Trash2 size={13} />
                </button>
              </div>
              <p className={styles.squadMembers}>
                {s.athleteIds.map(athleteName).join(", ")}
              </p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Tạo đội mới" onClose={() => setShowModal(false)}>
          <form onSubmit={submitSquad} className={styles.modalForm}>
            <label className={styles.field}>
              <span>Tên đội</span>
              <input
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                autoFocus
                required
              />
            </label>
            <p className={styles.hint}>
              {selectedIds.length} thành viên:{" "}
              {selectedIds.map(athleteName).join(", ")}
            </p>
            <button type="submit" className={styles.btnPrimary}>
              Tạo đội
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
