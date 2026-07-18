/** @format */

import { useMemo, useState } from "react";
import { Minus, Plus, Flag, Check, ChevronRight } from "lucide-react";
import type { LyDoKetThuc, Match } from "../../types";
import Badge from "../../components/Badge/Badge";
import styles from "./BanThuKy.module.scss";

const COURTS = [
  { id: "c1", ten: "Sân 1" },
  { id: "c2", ten: "Sân 2" },
  { id: "c3", ten: "Sân 3" },
  { id: "c4", ten: "Sân 4" },
];

const EVENTS: Record<string, string> = {
  e1: "Đối kháng nam - 54kg",
  e2: "Đối kháng nữ - 50kg",
  e3: "Đối kháng nam - 60kg",
  e4: "Đối kháng nữ - 48kg",
};

const ATHLETES: Record<string, { hoTen: string; donVi: string }> = {
  a1: { hoTen: "Nguyễn Minh Khang", donVi: "Bình Dương" },
  a2: { hoTen: "Trần Đình Dương", donVi: "Nam Định" },
  a3: { hoTen: "Lê Gia Huy", donVi: "TP.HCM" },
  a4: { hoTen: "Võ Hoàng Anh", donVi: "Đà Nẵng" },
  a5: { hoTen: "Bùi Khánh Duy", donVi: "Bình Dương" },
  a6: { hoTen: "Nguyễn Đức Tài", donVi: "Quảng Trị" },
  a7: { hoTen: "Vũ Ngọc Linh", donVi: "Hà Nội" },
  a8: { hoTen: "Trần Yến Nhi", donVi: "Cần Thơ" },
  a9: { hoTen: "Phạm Anh Thư", donVi: "Hà Nội" },
  a10: { hoTen: "Đỗ Khánh Oanh", donVi: "Hải Phòng" },
};

const LY_DO_OPTIONS: { value: LyDoKetThuc; label: string }[] = [
  { value: "thang_diem", label: "Thắng điểm" },
  { value: "doi_thu_khong_thi_dau", label: "Đối thủ không thi đấu" },
  { value: "bo_cuoc", label: "Bỏ cuộc" },
  { value: "dung_vi_y_te", label: "Dừng vì y tế" },
  { value: "truat_quyen", label: "Truất quyền" },
];

const SEED_MATCHES: Match[] = [
  {
    id: "m1",
    eventId: "e1",
    courtId: "c1",
    nextMatchId: null,
    athleteRedId: "a1",
    athleteBlueId: "a2",
    vong: "Vòng 16",
    trangThai: "dang_thi",
  },
  {
    id: "m2",
    eventId: "e2",
    courtId: "c2",
    nextMatchId: null,
    athleteRedId: "a3",
    athleteBlueId: "a4",
    vong: "Vòng 16",
    trangThai: "dang_thi",
  },
  {
    id: "m3",
    eventId: "e3",
    courtId: null,
    nextMatchId: null,
    athleteRedId: "a5",
    athleteBlueId: "a6",
    vong: "Vòng 16",
    trangThai: "cho_thi",
  },
  {
    id: "m4",
    eventId: "e4",
    courtId: null,
    nextMatchId: null,
    athleteRedId: "a7",
    athleteBlueId: "a8",
    vong: "Vòng 16",
    trangThai: "cho_thi",
  },
  {
    id: "m5",
    eventId: "e1",
    courtId: null,
    nextMatchId: null,
    athleteRedId: "a9",
    athleteBlueId: "a10",
    vong: "Tứ kết",
    trangThai: "cho_thi",
  },
  {
    id: "m6",
    eventId: "e2",
    courtId: null,
    nextMatchId: null,
    athleteRedId: "a4",
    athleteBlueId: "a8",
    vong: "Tứ kết",
    trangThai: "cho_thi",
  },
];

interface LiveState {
  diemDo: number;
  diemXanh: number;
  canhCaoDo: number;
  canhCaoXanh: number;
  ketThuc: boolean;
  lyDo: LyDoKetThuc;
}

const DEFAULT_LIVE: LiveState = {
  diemDo: 0,
  diemXanh: 0,
  canhCaoDo: 0,
  canhCaoXanh: 0,
  ketThuc: false,
  lyDo: "thang_diem",
};

const nameOf = (id: string | null) => (id ? (ATHLETES[id]?.hoTen ?? "—") : "—");
const unitOf = (id: string | null) => (id ? (ATHLETES[id]?.donVi ?? "") : "");

export default function BanThuKy() {
  const [matches, setMatches] = useState<Match[]>(SEED_MATCHES);
  const [currentCourtId, setCurrentCourtId] = useState("c1");
  const [live, setLive] = useState<Record<string, LiveState>>({
    m1: { ...DEFAULT_LIVE, diemDo: 6, diemXanh: 4, canhCaoDo: 1 },
    m2: { ...DEFAULT_LIVE, diemDo: 2, diemXanh: 3 },
  });

  const queue = useMemo(
    () =>
      matches.filter((m) => m.courtId === null && m.trangThai === "cho_thi"),
    [matches],
  );
  const activeOnMyCourt =
    matches.find(
      (m) => m.courtId === currentCourtId && m.trangThai === "dang_thi",
    ) ?? null;
  const activeOfCourt = (courtId: string) =>
    matches.find((m) => m.courtId === courtId && m.trangThai === "dang_thi") ??
    null;

  const getLive = (id: string): LiveState => live[id] ?? DEFAULT_LIVE;
  const patchLive = (id: string, patch: Partial<LiveState>) =>
    setLive((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? DEFAULT_LIVE), ...patch },
    }));

  const openIntoMyCourt = (matchId: string) => {
    if (activeOnMyCourt) return; // sân đang bận, không mở thêm
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? { ...m, courtId: currentCourtId, trangThai: "dang_thi" }
          : m,
      ),
    );
    setLive((prev) => ({ ...prev, [matchId]: { ...DEFAULT_LIVE } }));
  };

  const adjust = (
    id: string,
    key: keyof LiveState,
    delta: number,
    max = 999,
  ) => {
    const cur = getLive(id)[key] as number;
    patchLive(id, {
      [key]: Math.max(0, Math.min(max, cur + delta)),
    } as Partial<LiveState>);
  };

  const confirmResult = (matchId: string) => {
    // TODO: khi có store dùng chung theo giải + nextMatchId, tự đẩy người thắng sang vòng sau
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              trangThai: "da_hoan_thanh",
              lyDoKetThuc: getLive(matchId).lyDo,
            }
          : m,
      ),
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.title}>Bàn thư ký</h1>
        <span className={styles.courtTag}>
          Đang thao tác: {COURTS.find((c) => c.id === currentCourtId)?.ten}
        </span>
      </div>

      <div className={styles.columns}>
        {/* CỘT 1 — HÀNG CHỜ CHUNG */}
        <section className={styles.col}>
          <h2 className={styles.colTitle}>
            Hàng chờ chung <span>(chưa gán sân)</span>
          </h2>
          <div className={styles.queueList}>
            {queue.map((m, idx) => (
              <div key={m.id} className={styles.queueItem}>
                <span className={styles.queueIdx}>{idx + 1}</span>
                <div className={styles.queueBody}>
                  <div className={styles.queueEvent}>
                    {EVENTS[m.eventId]} · {m.vong}
                  </div>
                  <div className={styles.queueNames}>
                    <span className={styles.dotDo} /> {nameOf(m.athleteRedId)}
                    <span className={styles.vs}>vs</span>
                    <span className={styles.dotXanh} />{" "}
                    {nameOf(m.athleteBlueId)}
                  </div>
                </div>
                <button
                  className={styles.openBtn}
                  disabled={!!activeOnMyCourt}
                  onClick={() => openIntoMyCourt(m.id)}
                  title={
                    activeOnMyCourt
                      ? "Sân đang có trận, kết thúc trận hiện tại trước"
                      : "Mở trận vào sân đang thao tác"
                  }>
                  Mở vào sân
                </button>
              </div>
            ))}
            {queue.length === 0 && (
              <p className={styles.empty}>Hàng chờ trống</p>
            )}
          </div>
        </section>

        {/* CỘT 2 — TRẠNG THÁI SÂN */}
        <section className={styles.col}>
          <h2 className={styles.colTitle}>Trạng thái sân</h2>
          <div className={styles.courtCards}>
            {COURTS.map((c) => {
              const active = activeOfCourt(c.id);
              const isMine = c.id === currentCourtId;
              return (
                <button
                  key={c.id}
                  className={`${styles.courtCard} ${isMine ? styles.courtCardMine : ""}`}
                  onClick={() => setCurrentCourtId(c.id)}>
                  <div className={styles.courtCardHead}>
                    <strong>{c.ten}</strong>
                    {active ? (
                      <Badge tone="danger">Đang thi</Badge>
                    ) : (
                      <Badge tone="success">Trống</Badge>
                    )}
                  </div>
                  {active ? (
                    <div className={styles.courtCardBody}>
                      {EVENTS[active.eventId]} · {active.vong}
                    </div>
                  ) : (
                    <div className={styles.courtCardBodyMuted}>
                      Sẵn sàng nhận trận
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* CỘT 3 — SÂN CỦA TÔI */}
        <section className={styles.col}>
          <h2 className={styles.colTitle}>Sân của tôi</h2>
          {!activeOnMyCourt ? (
            <div className={styles.noMatch}>
              Sân đang trống. Chọn 1 trận ở hàng chờ bên trái và bấm "Mở vào
              sân".
            </div>
          ) : (
            <div className={styles.matchPanel}>
              <div className={styles.matchMeta}>
                {EVENTS[activeOnMyCourt.eventId]} · {activeOnMyCourt.vong}
              </div>

              <div className={styles.scoreBoard}>
                <div className={styles.corner}>
                  <span className={styles.cornerLabelDo}>ĐỎ</span>
                  <div className={styles.athName}>
                    {nameOf(activeOnMyCourt.athleteRedId)}
                  </div>
                  <div className={styles.athUnit}>
                    {unitOf(activeOnMyCourt.athleteRedId)}
                  </div>
                  <div className={styles.scoreNumDo}>
                    {getLive(activeOnMyCourt.id).diemDo}
                  </div>
                  <div className={styles.stepBtns}>
                    <button
                      onClick={() => adjust(activeOnMyCourt.id, "diemDo", -1)}>
                      <Minus size={16} />
                    </button>
                    <button
                      onClick={() => adjust(activeOnMyCourt.id, "diemDo", 1)}>
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className={styles.warnRow}>
                    <span>Cảnh cáo</span>
                    <div className={styles.dots}>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className={
                            i < getLive(activeOnMyCourt.id).canhCaoDo
                              ? styles.dotOnDo
                              : styles.dotOff
                          }
                        />
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        adjust(activeOnMyCourt.id, "canhCaoDo", -1, 3)
                      }>
                      <Minus size={12} />
                    </button>
                    <button
                      onClick={() =>
                        adjust(activeOnMyCourt.id, "canhCaoDo", 1, 3)
                      }>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <div className={styles.timerCol}>
                  <span className={styles.hiep}>Hiệp 1</span>
                  <span className={styles.timer}>02:00</span>
                  <span className={styles.timerNote}>
                    đồng hồ tĩnh — logic đếm giờ thêm sau
                  </span>
                </div>

                <div className={styles.corner}>
                  <span className={styles.cornerLabelXanh}>XANH</span>
                  <div className={styles.athName}>
                    {nameOf(activeOnMyCourt.athleteBlueId)}
                  </div>
                  <div className={styles.athUnit}>
                    {unitOf(activeOnMyCourt.athleteBlueId)}
                  </div>
                  <div className={styles.scoreNumXanh}>
                    {getLive(activeOnMyCourt.id).diemXanh}
                  </div>
                  <div className={styles.stepBtns}>
                    <button
                      onClick={() =>
                        adjust(activeOnMyCourt.id, "diemXanh", -1)
                      }>
                      <Minus size={16} />
                    </button>
                    <button
                      onClick={() => adjust(activeOnMyCourt.id, "diemXanh", 1)}>
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className={styles.warnRow}>
                    <span>Cảnh cáo</span>
                    <div className={styles.dots}>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className={
                            i < getLive(activeOnMyCourt.id).canhCaoXanh
                              ? styles.dotOnXanh
                              : styles.dotOff
                          }
                        />
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        adjust(activeOnMyCourt.id, "canhCaoXanh", -1, 3)
                      }>
                      <Minus size={12} />
                    </button>
                    <button
                      onClick={() =>
                        adjust(activeOnMyCourt.id, "canhCaoXanh", 1, 3)
                      }>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.controls}>
                {getLive(activeOnMyCourt.id).ketThuc && (
                  <label className={styles.reasonRow}>
                    <span>Lý do kết thúc</span>
                    <select
                      value={getLive(activeOnMyCourt.id).lyDo}
                      onChange={(e) =>
                        patchLive(activeOnMyCourt.id, {
                          lyDo: e.target.value as LyDoKetThuc,
                        })
                      }>
                      {LY_DO_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className={styles.controlBtns}>
                  {!getLive(activeOnMyCourt.id).ketThuc ? (
                    <button
                      className={styles.btnDanger}
                      onClick={() =>
                        patchLive(activeOnMyCourt.id, { ketThuc: true })
                      }>
                      <Flag size={16} /> Kết thúc trận
                    </button>
                  ) : (
                    <button
                      className={styles.btnPrimary}
                      onClick={() => confirmResult(activeOnMyCourt.id)}>
                      <Check size={16} /> Xác nhận kết quả
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
