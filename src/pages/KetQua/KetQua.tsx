/** @format */

import { useMemo, useState } from "react";
import { FileSpreadsheet, Printer, Medal } from "lucide-react";
import styles from "./KetQua.module.scss";

type MedalType = "vang" | "bac" | "dong";

interface XepHang {
  hang: number;
  hoTen: string;
  donVi: string;
  medal: MedalType;
}

interface EventResult {
  eventId: string;
  tenNoiDung: string;
  daKetThuc: boolean;
  xepHang: XepHang[];
}

// Dữ liệu mẫu — sẽ lấy từ store dùng chung theo giải khi nối API.
// Nội dung đối kháng: đúng luật đã chốt — 2 người thua bán kết đồng hạng 3.
const SEED_RESULTS: EventResult[] = [
  {
    eventId: "e1",
    tenNoiDung: "Đối kháng nam - 54kg",
    daKetThuc: true,
    xepHang: [
      {
        hang: 1,
        hoTen: "Nguyễn Minh Khang",
        donVi: "Bình Dương",
        medal: "vang",
      },
      {
        hang: 2,
        hoTen: "Lê Gia Huy",
        donVi: "TP. Hồ Chí Minh",
        medal: "bac",
      },
      {
        hang: 3,
        hoTen: "Đinh Quang Huy",
        donVi: "Hà Nội",
        medal: "dong",
      },
      {
        hang: 3,
        hoTen: "Trần Nhật Nam",
        donVi: "Cần Thơ",
        medal: "dong",
      },
    ],
  },
  {
    eventId: "e2",
    tenNoiDung: "Đối kháng nữ - 50kg",
    daKetThuc: false,
    xepHang: [],
  },
];

const MEDAL_LABEL: Record<MedalType, string> = {
  vang: "Vàng",
  bac: "Bạc",
  dong: "Đồng",
};
type Tab = "ket_qua" | "tong_sap";

export default function KetQua() {
  const [tab, setTab] = useState<Tab>("ket_qua");
  const [selectedEventId, setSelectedEventId] = useState("e1");

  const selected =
    SEED_RESULTS.find((r) => r.eventId === selectedEventId) ?? SEED_RESULTS[0];

  // Bảng tổng sắp: gom huy chương theo đơn vị từ mọi nội dung đã kết thúc
  const tongSap = useMemo(() => {
    const map = new Map<
      string,
      { donVi: string; vang: number; bac: number; dong: number }
    >();
    for (const ev of SEED_RESULTS) {
      if (!ev.daKetThuc) continue;
      for (const x of ev.xepHang) {
        if (!map.has(x.donVi))
          map.set(x.donVi, { donVi: x.donVi, vang: 0, bac: 0, dong: 0 });
        map.get(x.donVi)![x.medal] += 1;
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.vang - a.vang || b.bac - a.bac || b.dong - a.dong,
    );
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.title}>Kết quả & báo cáo</h1>
        <div className={styles.exportBtns}>
          <button className={styles.btnGhost}>
            <FileSpreadsheet size={16} /> Xuất Excel
          </button>
          <button className={styles.btnGhost}>
            <Printer size={16} /> In biên bản
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={tab === "ket_qua" ? styles.tabActive : styles.tab}
          onClick={() => setTab("ket_qua")}>
          Kết quả nội dung
        </button>
        <button
          className={tab === "tong_sap" ? styles.tabActive : styles.tab}
          onClick={() => setTab("tong_sap")}>
          Bảng tổng sắp đoàn
        </button>
      </div>

      {tab === "ket_qua" ? (
        <div className={styles.resultLayout}>
          <aside className={styles.eventPicker}>
            {SEED_RESULTS.map((ev) => (
              <button
                key={ev.eventId}
                className={
                  ev.eventId === selectedEventId
                    ? styles.eventItemActive
                    : styles.eventItem
                }
                onClick={() => setSelectedEventId(ev.eventId)}>
                <span>{ev.tenNoiDung}</span>
                {ev.daKetThuc ? (
                  <span className={styles.doneTag}>Đã xong</span>
                ) : (
                  <span className={styles.pendingTag}>Chưa xong</span>
                )}
              </button>
            ))}
          </aside>

          <section className={styles.resultMain}>
            <h2 className={styles.resultTitle}>{selected.tenNoiDung}</h2>
            {!selected.daKetThuc ? (
              <p className={styles.notDone}>
                Nội dung này chưa thi đấu xong — chưa có kết quả chính thức.
              </p>
            ) : (
              <>
                <table className={styles.rankTable}>
                  <thead>
                    <tr>
                      <th>Hạng</th>
                      <th>VĐV</th>
                      <th>Đơn vị</th>
                      <th>Huy chương</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.xepHang.map((x, i) => (
                      <tr key={i}>
                        <td className={styles.rankNum}>{x.hang}</td>
                        <td>
                          <div className={styles.athName}>{x.hoTen}</div>
                        </td>
                        <td>{x.donVi}</td>
                        <td>
                          <span
                            className={`${styles.medalTag} ${styles[x.medal]}`}>
                            <Medal size={13} /> {MEDAL_LABEL[x.medal]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className={styles.note}>
                  Có 2 VĐV đồng hạng Ba (theo quy định thua bán kết cùng nhận
                  HCĐ).
                </p>
              </>
            )}
          </section>
        </div>
      ) : (
        <section className={styles.card}>
          <table className={styles.medalTable}>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Đoàn</th>
                <th className={styles.center}>HCV</th>
                <th className={styles.center}>HCB</th>
                <th className={styles.center}>HCĐ</th>
                <th className={styles.center}>Tổng</th>
              </tr>
            </thead>
            <tbody>
              {tongSap.map((t, i) => (
                <tr key={t.donVi}>
                  <td className={styles.rankNum}>{i + 1}</td>
                  <td>{t.donVi}</td>
                  <td className={`${styles.center} ${styles.gold}`}>
                    {t.vang}
                  </td>
                  <td className={styles.center}>{t.bac}</td>
                  <td className={styles.center}>{t.dong}</td>
                  <td className={`${styles.center} ${styles.total}`}>
                    {t.vang + t.bac + t.dong}
                  </td>
                </tr>
              ))}
              {tongSap.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    Chưa có nội dung nào kết thúc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
