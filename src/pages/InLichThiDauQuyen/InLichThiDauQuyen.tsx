/** @format */

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { Athlete, AthleteRecord, CompetitionEvent, Squad } from "../../types";
import { fetchEvents } from "../../lib/api/eventsApi";
import { apiGet } from "../../lib/api/api";
import { compareNhomTuoi, formatEventNhomTuoi } from "../../lib/utils/nhomTuoi";
import styles from "./InLichThiDauQuyen.module.scss";

interface PerformanceOrderWire {
  id: string;
  eventId: string;
  athleteId: string | null;
  teamId: string | null;
  thuTu: number;
}

function teamName(teamId: string, teams: { id: string; ten: string }[]): string {
  return teams.find((t) => t.id === teamId)?.ten ?? "—";
}

export default function InLichThiDauQuyen() {
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [teams, setTeams] = useState<{ id: string; ten: string }[]>([]);
  const [orders, setOrders] = useState<PerformanceOrderWire[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportLoi, setExportLoi] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchEvents(),
      apiGet<AthleteRecord[]>("/dashboard/athletes"),
      apiGet<{ id: string; ten: string }[]>("/dashboard/teams"),
      apiGet<PerformanceOrderWire[]>("/performance-orders"),
    ])
      .then(([eventsData, athletesData, teamsData, ordersData]) => {
        setEvents(eventsData);
        setAthletes(athletesData);
        setTeams(teamsData);
        setOrders(ordersData);
      })
      .catch(() =>
        setLoadError("Không tải được dữ liệu — kiểm tra backend đã chạy chưa"),
      )
      .finally(() => setLoading(false));
  }, []);

  const orderByEvent = useMemo(() => {
    const byEvent: Record<string, Athlete[]> = {};
    const eventTenById = new Map(events.map((e) => [e.id, e.ten]));
    const grouped = new Map<string, PerformanceOrderWire[]>();
    for (const o of orders.filter((o) => o.athleteId)) {
      if (!grouped.has(o.eventId)) grouped.set(o.eventId, []);
      grouped.get(o.eventId)!.push(o);
    }
    for (const [eventId, list] of grouped) {
      const eventTen = eventTenById.get(eventId) ?? "";
      byEvent[eventId] = [...list]
        .sort((a, b) => a.thuTu - b.thuTu)
        .map((o) => {
          const a = athletes.find((x) => x.id === o.athleteId);
          if (!a) return null;
          const { eventIds: _eventIds, ...rest } = a;
          return { ...rest, noiDung: [eventTen] };
        })
        .filter((a): a is Athlete => a !== null);
    }
    return byEvent;
  }, [orders, athletes, events]);

  const squadOrderByEvent = useMemo(() => {
    const byEvent: Record<string, Squad[]> = {};
    const grouped = new Map<string, PerformanceOrderWire[]>();
    for (const o of orders.filter((o) => o.teamId)) {
      if (!grouped.has(o.eventId)) grouped.set(o.eventId, []);
      grouped.get(o.eventId)!.push(o);
    }
    for (const [eventId, list] of grouped) {
      byEvent[eventId] = [...list]
        .sort((a, b) => a.thuTu - b.thuTu)
        .map((o) => ({
          id: `squad-${eventId}-${o.teamId}`,
          eventId,
          ten: `Đội ${teamName(o.teamId!, teams)}`,
          athleteIds: athletes
            .filter((a) => a.teamId === o.teamId && a.eventIds.includes(eventId))
            .map((a) => a.id),
        }));
    }
    return byEvent;
  }, [orders, athletes, teams]);

  const squadTeamOf = (s: Squad) => {
    const first = athletes.find((a) => s.athleteIds.includes(a.id));
    return first ? teamName(first.teamId, teams) : "—";
  };
  const squadMemberNames = (s: Squad) =>
    s.athleteIds.map((id) => athletes.find((a) => a.id === id)?.hoTen).join(", ");

  const quyenNumbered = useMemo(() => {
    const quyenReady = events
      .filter((e) => e.loai === "quyen")
      .filter((e) =>
        e.hinhThucThi === "doi" ? !!squadOrderByEvent[e.id] : !!orderByEvent[e.id],
      );
    const sorted = [...quyenReady].sort((a, b) => compareNhomTuoi(a.nhomTuoi, b.nhomTuoi));
    const flat = sorted.flatMap((e) =>
      e.hinhThucThi === "doi"
        ? (squadOrderByEvent[e.id] ?? []).map((s) => ({
            event: e,
            key: s.id,
            label: s.ten,
            sub: `${squadTeamOf(s)} - ${squadMemberNames(s)}`,
          }))
        : (orderByEvent[e.id] ?? []).map((a) => ({
            event: e,
            key: a.id,
            label: a.hoTen,
            sub: `${a.namSinh} - ${teamName(a.teamId, teams)}`,
          })),
    );
    return flat.map((x, i) => ({ ...x, so: i + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, orderByEvent, squadOrderByEvent, athletes, teams]);

  const nhomTuoiList = useMemo(
    () => Array.from(new Set(events.map((e) => e.nhomTuoi))).sort(compareNhomTuoi),
    [events],
  );

  const xuatPDF = async () => {
    setExportLoi(null);
    setExporting(true);
    try {
      const [{ jsPDF }, { autoTable }, { dangKyFontVN }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
        import("../../lib/pdf/robotoVietnamese"),
      ]);
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      dangKyFontVN(doc);
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 12;
      let y = margin;

      const canhBaoTran = (chieuCaoCanDung: number) => {
        if (y + chieuCaoCanDung > pageH - margin) {
          doc.addPage();
          y = margin;
        }
      };

      doc.setFontSize(18);
      doc.setFont("RobotoVN", "bold");
      doc.text("Lịch thi đấu quyền", margin, y);
      y += 10;

      if (quyenNumbered.length === 0) {
        doc.setFontSize(10);
        doc.setFont("RobotoVN", "normal");
        doc.text(
          "Chưa có nội dung quyền nào sẵn sàng (đã bốc thăm/xếp thứ tự).",
          margin,
          y,
        );
      } else {
        for (const nt of nhomTuoiList) {
          const items = quyenNumbered.filter((x) => x.event.nhomTuoi === nt);
          if (items.length === 0) continue;

          canhBaoTran(16);
          doc.setFontSize(11);
          doc.setFont("RobotoVN", "bold");
          doc.text(formatEventNhomTuoi(nt), margin, y);
          y += 5;

          autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            styles: { font: "RobotoVN", fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [230, 230, 230], textColor: 20 },
            head: [["#", "Nội dung", "VĐV / Đội", "Thông tin"]],
            body: items.map(({ event, label, sub, so }) => [
              String(so),
              event.ten,
              label,
              sub,
            ]),
          });
          y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
            .finalY + 8;
        }
      }

      doc.save("lich-thi-dau-quyen.pdf");
    } catch {
      setExportLoi("Xuất PDF thất bại — thử lại, hoặc báo lỗi này lại nếu vẫn không được.");
    } finally {
      setExporting(false);
    }
  };

  if (loading)
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Đang tải dữ liệu...</p>
      </div>
    );
  if (loadError)
    return (
      <div className={styles.page}>
        <p className={styles.hint}>{loadError}</p>
      </div>
    );

  return (
    <div className={styles.page}>
      <button className={styles.exportBtn} onClick={xuatPDF} disabled={exporting}>
        <Download size={16} /> {exporting ? "Đang xuất..." : "Tải file PDF"}
      </button>
      {exportLoi && <p className={styles.exportLoi}>{exportLoi}</p>}

      <h1 className={styles.mainTitle}>Lịch thi đấu quyền</h1>
      <p className={styles.hint}>
        Bấm "Tải file PDF" để tải về máy — nội dung xem trước bên dưới chỉ để
        kiểm tra dữ liệu, không dùng để in trực tiếp.
      </p>

      {quyenNumbered.length === 0 ? (
        <p className={styles.hint}>
          Chưa có nội dung quyền nào sẵn sàng (đã bốc thăm/xếp thứ tự).
        </p>
      ) : (
        nhomTuoiList.map((nt) => {
          const items = quyenNumbered.filter((x) => x.event.nhomTuoi === nt);
          if (items.length === 0) return null;
          return (
            <div key={nt} className={styles.ntBlock}>
              <h3 className={styles.ntTitle}>{formatEventNhomTuoi(nt)}</h3>
              <table className={styles.matchTable}>
                <tbody>
                  {items.map(({ event, key, label, sub, so }) => (
                    <tr key={key}>
                      <td className={styles.colNo}>{so}</td>
                      <td className={styles.colEvent}>{event.ten}</td>
                      <td className={styles.colQuyenLabel}>{label}</td>
                      <td className={styles.colQuyenSub}>{sub}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}
