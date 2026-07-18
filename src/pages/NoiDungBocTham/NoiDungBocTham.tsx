/** @format */

import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import type { Athlete, CompetitionEvent, Match } from "../../types";
import { generateBracket } from "../../lib/bracket";
import BracketView from "../../components/BracketView/BracketView";
import styles from "./NoiDungBocTham.module.scss";

const SEED_EVENTS: CompetitionEvent[] = [
  {
    id: "e1",
    tournamentId: "demo",
    ten: "Đối kháng nam - 54kg",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "15-17",
    hangCanHoacBaiQuyen: "54kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e2",
    tournamentId: "demo",
    ten: "Đối kháng nam - 60kg",
    loai: "doi_khang",
    gioiTinh: "nam",
    nhomTuoi: "15-17",
    hangCanHoacBaiQuyen: "60kg",
    soTrongTai: 5,
    congThucTinhDiem: "10 điểm/trận",
  },
  {
    id: "e3",
    tournamentId: "demo",
    ten: "Quyền cá nhân nam",
    loai: "quyen",
    gioiTinh: "nam",
    nhomTuoi: "15-17",
    hangCanHoacBaiQuyen: "Long hổ quyền",
    soTrongTai: 5,
    congThucTinhDiem: "Trung bình, bỏ cao/thấp nhất",
  },
];

// VĐV mẫu riêng cho màn này — chưa nối chung với dữ liệu Đoàn & VĐV thật,
// sẽ dùng chung 1 nguồn khi có API ở bước 4. Cố tình để 5 người ở e1 để
// demo rõ trường hợp có bye (5 VĐV -> bracket 8 chỗ -> 3 người bye).
const SEED_ATHLETES_BY_EVENT: Record<string, Athlete[]> = {
  e1: [
    {
      id: "x1",
      hoTen: "Nguyễn Minh Khang",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t1",
      noiDung: ["Đối kháng nam - 54kg"],
    },
    {
      id: "x2",
      hoTen: "Lê Gia Huy",
      namSinh: 2009,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 1",
      teamId: "t2",
      noiDung: ["Đối kháng nam - 54kg"],
    },
    {
      id: "x3",
      hoTen: "Trần Nhật Nam",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t3",
      noiDung: ["Đối kháng nam - 54kg"],
    },
    {
      id: "x4",
      hoTen: "Bùi Anh Dương",
      namSinh: 2008,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 2",
      teamId: "t1",
      noiDung: ["Đối kháng nam - 54kg"],
    },
    {
      id: "x5",
      hoTen: "Đỗ Hoàng Anh",
      namSinh: 2009,
      gioiTinh: "nam",
      nhomTuoi: "Nhóm tuổi 1",
      teamId: "t2",
      noiDung: ["Đối kháng nam - 54kg"],
    },
  ],
  e2: [],
  e3: [],
};

const LOAI_LABEL = { quyen: "Quyền", doi_khang: "Đối kháng" } as const;

export default function NoiDungBocTham() {
  const [tab, setTab] = useState<"quyen" | "doi_khang">("doi_khang");
  const [selectedId, setSelectedId] = useState("e1");
  const [bracketsByEvent, setBracketsByEvent] = useState<
    Record<string, Match[]>
  >({});

  const eventsInTab = useMemo(
    () => SEED_EVENTS.filter((ev) => ev.loai === tab),
    [tab],
  );
  const selected =
    SEED_EVENTS.find((ev) => ev.id === selectedId) ?? eventsInTab[0];
  const athletesOfSelected = selected
    ? (SEED_ATHLETES_BY_EVENT[selected.id] ?? [])
    : [];
  const bracket = selected ? bracketsByEvent[selected.id] : undefined;

  const handleBocTham = () => {
    if (!selected) return;
    const matches = generateBracket(athletesOfSelected, selected.id);
    setBracketsByEvent((prev) => ({ ...prev, [selected.id]: matches }));
  };

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.tabs}>
          {(["quyen", "doi_khang"] as const).map((t) => (
            <button
              key={t}
              className={t === tab ? styles.tabActive : styles.tab}
              onClick={() => setTab(t)}>
              {LOAI_LABEL[t]}
            </button>
          ))}
        </div>
        <div className={styles.eventList}>
          {eventsInTab.map((ev) => (
            <button
              key={ev.id}
              className={
                ev.id === selectedId ? styles.eventItemActive : styles.eventItem
              }
              onClick={() => setSelectedId(ev.id)}>
              {ev.ten}
            </button>
          ))}
          {eventsInTab.length === 0 && (
            <p className={styles.emptyList}>Chưa có nội dung nào</p>
          )}
        </div>
      </aside>

      <section className={styles.main}>
        {!selected ? (
          <p>Chọn 1 nội dung ở danh sách bên trái.</p>
        ) : (
          <>
            <h1 className={styles.title}>{selected.ten}</h1>

            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <span>Giới tính</span>
                <strong>{selected.gioiTinh === "nam" ? "Nam" : "Nữ"}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Nhóm tuổi</span>
                <strong>{selected.nhomTuoi}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>
                  {selected.loai === "doi_khang" ? "Hạng cân" : "Bài quyền"}
                </span>
                <strong>{selected.hangCanHoacBaiQuyen}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Số trọng tài</span>
                <strong>{selected.soTrongTai}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Công thức điểm</span>
                <strong>{selected.congThucTinhDiem}</strong>
              </div>
            </div>

            {selected.loai === "doi_khang" ? (
              <>
                <div className={styles.actions}>
                  <button
                    className={styles.btnPrimary}
                    onClick={handleBocTham}
                    disabled={athletesOfSelected.length < 2}>
                    <Shuffle size={16} />{" "}
                    {bracket ? "Bốc thăm lại" : "Bốc thăm"}
                  </button>
                  {athletesOfSelected.length < 2 && (
                    <span className={styles.hint}>
                      Cần tối thiểu 2 VĐV đăng ký để bốc thăm
                    </span>
                  )}
                </div>
                <BracketView
                  matches={bracket ?? []}
                  athletes={athletesOfSelected}
                />
              </>
            ) : (
              <div className={styles.quyenNote}>
                Nội dung quyền không có nhánh loại trực tiếp — chỉ cần danh sách
                thứ tự thi. Cách xử lý hòa điểm còn đang để ngỏ, màn này để dành
                làm sau khi chốt xong.
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
