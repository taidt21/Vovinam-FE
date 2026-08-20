/** @format */

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import type {
  Athlete,
  AthleteRecord,
  CompetitionEvent,
  Squad,
} from "../../types";
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

function teamName(
  teamId: string,
  teams: { id: string; ten: string }[],
): string {
  return teams.find((t) => t.id === teamId)?.ten ?? "—";
}

function gioiTinhLabel(gioiTinh: CompetitionEvent["gioiTinh"]): string {
  return gioiTinh === "nam" ? "Nam" : gioiTinh === "nu" ? "Nữ" : "Hỗn hợp";
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
            .filter(
              (a) => a.teamId === o.teamId && a.eventIds.includes(eventId),
            )
            .map((a) => a.id),
        }));
    }

    return byEvent;
  }, [orders, athletes, teams]);

  const squadTeamOf = (s: Squad) => {
    const first = athletes.find((a) => s.athleteIds.includes(a.id));
    return first ? teamName(first.teamId, teams) : "—";
  };

  const squadMembers = (s: Squad): AthleteRecord[] =>
    s.athleteIds
      .map((id) => athletes.find((a) => a.id === id))
      .filter((a): a is AthleteRecord => a !== undefined);

  const quyenEventsReady = useMemo(() => {
    return events
      .filter((e) => e.loai === "quyen")
      .filter((e) =>
        e.hinhThucThi === "doi"
          ? (squadOrderByEvent[e.id]?.length ?? 0) > 0
          : (orderByEvent[e.id]?.length ?? 0) > 0,
      )
      .sort((a, b) => {
        const byAge = compareNhomTuoi(a.nhomTuoi, b.nhomTuoi);
        return byAge !== 0 ? byAge : a.ten.localeCompare(b.ten, "vi");
      });
  }, [events, orderByEvent, squadOrderByEvent]);

  const nhomTuoiList = useMemo(
    () =>
      Array.from(new Set(quyenEventsReady.map((e) => e.nhomTuoi))).sort(
        compareNhomTuoi,
      ),
    [quyenEventsReady],
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

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      dangKyFontVN(doc);

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 12;
      const contentW = pageW - margin * 2;
      let y = margin;

      const canhBaoTran = (chieuCaoCanDung: number) => {
        if (y + chieuCaoCanDung > pageH - margin) {
          doc.addPage();
          y = margin;
        }
      };

      doc.setFontSize(18);
      doc.setFont("RobotoVN", "bold");
      doc.setTextColor(45, 39, 63);
      doc.text("Lịch thi đấu quyền", margin, y);
      y += 10;

      if (quyenEventsReady.length === 0) {
        doc.setFontSize(10);
        doc.setFont("RobotoVN", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(
          "Chưa có nội dung quyền nào sẵn sàng (đã bốc thăm/xếp thứ tự).",
          margin,
          y,
        );
      } else {
        for (const nt of nhomTuoiList) {
          const eventList = quyenEventsReady.filter((e) => e.nhomTuoi === nt);
          if (eventList.length === 0) continue;

          canhBaoTran(18);
          doc.setFillColor(250, 246, 231);
          doc.setDrawColor(226, 205, 137);
          doc.roundedRect(margin, y - 4, contentW, 8, 1.5, 1.5, "FD");
          doc.setFontSize(11);
          doc.setFont("RobotoVN", "bold");
          doc.setTextColor(91, 72, 25);
          const nhomTuoiPdf = formatEventNhomTuoi(nt);
          const nhomTuoiPdfLabel =
            nhomTuoiPdf === "Hỗn hợp"
              ? `Nhóm tuổi: ${nhomTuoiPdf}`
              : nhomTuoiPdf;
          doc.text(nhomTuoiPdfLabel.toUpperCase(), margin + 3, y + 1);
          y += 10;

          for (const event of eventList) {
            const isTeam = event.hinhThucThi === "doi";
            const titleBg: [number, number, number] = isTeam
              ? [235, 246, 255]
              : [244, 240, 252];
            const titleBorder: [number, number, number] = isTeam
              ? [164, 205, 236]
              : [199, 181, 231];
            const titleText: [number, number, number] = isTeam
              ? [28, 91, 139]
              : [86, 60, 126];

            canhBaoTran(30);
            doc.setFillColor(titleBg[0], titleBg[1], titleBg[2]);
            doc.setDrawColor(titleBorder[0], titleBorder[1], titleBorder[2]);
            doc.roundedRect(margin, y, contentW, 11, 2, 2, "FD");

            doc.setFont("RobotoVN", "bold");
            doc.setFontSize(11);
            doc.setTextColor(titleText[0], titleText[1], titleText[2]);
            doc.text(event.ten, margin + 4, y + 5, { baseline: "middle" });

            doc.setFont("RobotoVN", "normal");
            doc.setFontSize(8.5);
            const suffix = `Giới tính: ${gioiTinhLabel(event.gioiTinh)} • ${isTeam ? "Đồng đội" : "Cá nhân"}`;
            doc.text(suffix, pageW - margin - 4, y + 5, {
              align: "right",
              baseline: "middle",
            });
            y += 13;

            if (!isTeam) {
              const individuals = orderByEvent[event.id] ?? [];
              autoTable(doc, {
                startY: y,
                margin: { left: margin, right: margin },
                theme: "grid",
                head: [["STT", "HỌ VÀ TÊN", "ĐƠN VỊ"]],
                body: individuals.map((a, index) => [
                  String(index + 1),
                  a.hoTen,
                  teamName(a.teamId, teams),
                ]),
                styles: {
                  font: "RobotoVN",
                  fontSize: 10,
                  cellPadding: { top: 3.2, right: 3, bottom: 3.2, left: 3 },
                  // Grid rõ hơn để đồng bộ với bảng web.
                  lineColor: [203, 196, 213],
                  lineWidth: 0.28,
                  valign: "middle",
                  textColor: [43, 40, 52],
                },
                headStyles: {
                  fillColor: [238, 233, 248],
                  textColor: [76, 53, 116],
                  fontStyle: "bold",
                  halign: "center",
                  lineColor: [174, 163, 188],
                  lineWidth: 0.42,
                },
                alternateRowStyles: { fillColor: [251, 249, 254] },
                columnStyles: {
                  0: { cellWidth: 15, halign: "center", fontStyle: "bold" },
                  1: { cellWidth: 98 },
                  2: { cellWidth: contentW - 113, halign: "center" },
                },
              });
            } else {
              const squads = squadOrderByEvent[event.id] ?? [];
              const body = squads.flatMap((s, squadIndex) => {
                const members = squadMembers(s);
                const rows = members.length > 0 ? members : [null];
                const rowSpan = rows.length;
                const team = squadTeamOf(s);

                return rows.map((member, memberIndex) => {
                  if (memberIndex === 0) {
                    return [
                      {
                        content: String(squadIndex + 1),
                        rowSpan,
                        styles: {
                          halign: "center" as const,
                          valign: "middle" as const,
                          fontStyle: "bold" as const,
                          fillColor: [240, 247, 253] as [
                            number,
                            number,
                            number,
                          ],
                        },
                      },
                      member?.hoTen ?? "—",
                      {
                        content: team,
                        rowSpan,
                        styles: {
                          halign: "center" as const,
                          valign: "middle" as const,
                          fontStyle: "bold" as const,
                          fillColor: [243, 248, 253] as [
                            number,
                            number,
                            number,
                          ],
                        },
                      },
                    ];
                  }

                  // Hai ô STT/Đơn vị phía trên đang rowSpan nên dòng tiếp theo
                  // chỉ cần nội dung Họ và tên; autoTable sẽ đặt vào cột còn trống.
                  return [member?.hoTen ?? "—"];
                });
              });

              autoTable(doc, {
                startY: y,
                margin: { left: margin, right: margin },
                theme: "grid",
                head: [["STT", "HỌ VÀ TÊN", "ĐƠN VỊ"]],
                body,
                styles: {
                  font: "RobotoVN",
                  fontSize: 10,
                  cellPadding: { top: 3.2, right: 3, bottom: 3.2, left: 3 },
                  // Grid xanh-xám rõ hơn; đặc biệt đường ngăn HỌ VÀ TÊN / ĐƠN VỊ.
                  lineColor: [189, 209, 223],
                  lineWidth: 0.28,
                  valign: "middle",
                  textColor: [38, 48, 58],
                },
                headStyles: {
                  fillColor: [228, 242, 252],
                  textColor: [31, 84, 125],
                  fontStyle: "bold",
                  halign: "center",
                  lineColor: [143, 184, 208],
                  lineWidth: 0.42,
                },
                alternateRowStyles: { fillColor: [248, 252, 255] },
                columnStyles: {
                  0: { cellWidth: 15, halign: "center" },
                  1: { cellWidth: 98 },
                  2: { cellWidth: contentW - 113, halign: "center" },
                },
              });
            }

            y =
              (doc as unknown as { lastAutoTable: { finalY: number } })
                .lastAutoTable.finalY + 7;
          }

          y += 2;
        }
      }

      doc.save("lich-thi-dau-quyen.pdf");
    } catch {
      setExportLoi(
        "Xuất PDF thất bại — thử lại, hoặc báo lỗi này lại nếu vẫn không được.",
      );
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
      <button
        className={styles.exportBtn}
        onClick={xuatPDF}
        disabled={exporting}>
        <Download size={16} /> {exporting ? "Đang xuất..." : "Tải file PDF"}
      </button>
      {exportLoi && <p className={styles.exportLoi}>{exportLoi}</p>}

      <h1 className={styles.mainTitle}>Lịch thi đấu quyền</h1>
      <p className={styles.hint}>
        Bấm "Tải file PDF" để tải về máy — nội dung xem trước bên dưới chỉ để
        kiểm tra dữ liệu, không dùng để in trực tiếp.
      </p>

      {quyenEventsReady.length === 0 ? (
        <p className={styles.hint}>
          Chưa có nội dung quyền nào sẵn sàng (đã bốc thăm/xếp thứ tự).
        </p>
      ) : (
        nhomTuoiList.map((nt) => {
          const eventList = quyenEventsReady.filter((e) => e.nhomTuoi === nt);
          if (eventList.length === 0) return null;
          const nhomTuoiLabel = formatEventNhomTuoi(nt);

          return (
            <section key={nt} className={styles.ntBlock}>
              <h3 className={styles.ntTitle}>
                {nhomTuoiLabel === "Hỗn hợp"
                  ? `Nhóm tuổi: ${nhomTuoiLabel}`
                  : nhomTuoiLabel}
              </h3>

              <div className={styles.eventList}>
                {eventList.map((event) => {
                  const isTeam = event.hinhThucThi === "doi";
                  const individuals = orderByEvent[event.id] ?? [];
                  const squads = squadOrderByEvent[event.id] ?? [];

                  return (
                    <article
                      key={event.id}
                      className={`${styles.eventCard} ${
                        isTeam ? styles.teamCard : styles.individualCard
                      }`}>
                      <header className={styles.eventHeader}>
                        <div>
                          <h4 className={styles.eventTitle}>{event.ten}</h4>
                        </div>
                        <div className={styles.eventBadges}>
                          <span className={styles.genderBadge}>
                            {`Giới tính: ${gioiTinhLabel(event.gioiTinh)}`}
                          </span>
                          <span
                            className={
                              isTeam ? styles.teamBadge : styles.individualBadge
                            }>
                            {isTeam ? "Đồng đội" : "Cá nhân"}
                          </span>
                        </div>
                      </header>

                      <div className={styles.tableWrap}>
                        <table className={styles.peopleTable}>
                          <thead>
                            <tr>
                              <th className={styles.colOrder}>STT</th>
                              <th className={styles.colName}>HỌ VÀ TÊN</th>
                              <th className={styles.colTeam}>ĐƠN VỊ</th>
                            </tr>
                          </thead>

                          <tbody>
                            {!isTeam
                              ? individuals.map((a, index) => (
                                  <tr key={a.id}>
                                    <td className={styles.orderCell}>
                                      {index + 1}
                                    </td>
                                    <td className={styles.nameCell}>
                                      {a.hoTen}
                                    </td>
                                    <td className={styles.teamCell}>
                                      {teamName(a.teamId, teams)}
                                    </td>
                                  </tr>
                                ))
                              : squads.flatMap((s, squadIndex) => {
                                  const members = squadMembers(s);
                                  const rows =
                                    members.length > 0 ? members : [null];

                                  return rows.map((member, memberIndex) => (
                                    <tr
                                      key={`${s.id}-${member?.id ?? memberIndex}`}>
                                      {memberIndex === 0 && (
                                        <td
                                          className={`${styles.orderCell} ${styles.groupOrderCell}`}
                                          rowSpan={rows.length}>
                                          {squadIndex + 1}
                                        </td>
                                      )}

                                      <td className={styles.nameCell}>
                                        {member?.hoTen ?? "—"}
                                      </td>

                                      {memberIndex === 0 && (
                                        <td
                                          className={`${styles.teamCell} ${styles.mergedTeamCell}`}
                                          rowSpan={rows.length}>
                                          {squadTeamOf(s)}
                                        </td>
                                      )}
                                    </tr>
                                  ));
                                })}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
