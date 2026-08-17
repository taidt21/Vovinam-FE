/** @format */

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { AthleteRecord, CompetitionEvent, Match } from "../../types";
import { fetchEvents } from "../../lib/api/eventsApi";
import { apiGet } from "../../lib/api/api";
import { numberDoiKhangMatches, winnerLabel } from "../../lib/domain/bracket";
import { compareNhomTuoi, formatEventNhomTuoi } from "../../lib/utils/nhomTuoi";
import styles from "./InLichThiDauDoiKhang.module.scss";

function teamName(teamId: string, teams: { id: string; ten: string }[]): string {
  return teams.find((t) => t.id === teamId)?.ten ?? "—";
}

export default function InLichThiDauDoiKhang() {
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [teams, setTeams] = useState<{ id: string; ten: string }[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportLoi, setExportLoi] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchEvents(),
      apiGet<AthleteRecord[]>("/dashboard/athletes"),
      apiGet<{ id: string; ten: string }[]>("/dashboard/teams"),
      apiGet<Match[]>("/matches"),
    ])
      .then(([eventsData, athletesData, teamsData, matchesData]) => {
        setEvents(eventsData);
        setAthletes(athletesData);
        setTeams(teamsData);
        setMatches(matchesData);
      })
      .catch(() =>
        setLoadError("Không tải được dữ liệu — kiểm tra backend đã chạy chưa"),
      )
      .finally(() => setLoading(false));
  }, []);

  const bracketsByEvent = useMemo(() => {
    const byEvent: Record<string, Match[]> = {};
    for (const m of matches) {
      if (!byEvent[m.eventId]) byEvent[m.eventId] = [];
      byEvent[m.eventId].push(m);
    }
    return byEvent;
  }, [matches]);

  const athleteLabel = (id: string | null) => {
    if (!id) return null;
    const a = athletes.find((x) => x.id === id);
    return a ? `${a.hoTen} (${a.namSinh} - ${teamName(a.teamId, teams)})` : "—";
  };

  const doiKhangNumbered = useMemo(
    () => numberDoiKhangMatches(events, bracketsByEvent),
    [events, bracketsByEvent],
  );
  const soByMatchId = useMemo(
    () => new Map(doiKhangNumbered.map((x) => [x.match.id, x.so])),
    [doiKhangNumbered],
  );

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
      doc.text("Lịch thi đấu đối kháng", margin, y);
      y += 10;

      if (doiKhangNumbered.length === 0) {
        doc.setFontSize(10);
        doc.setFont("RobotoVN", "normal");
        doc.text("Chưa có nội dung đối kháng nào đã bốc thăm.", margin, y);
      } else {
        for (const nt of nhomTuoiList) {
          const items = doiKhangNumbered.filter((x) => x.event.nhomTuoi === nt);
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
            head: [["#", "Vòng", "Nội dung", "Đỏ", "", "Xanh"]],
            body: items.map(({ event, match, so }) => [
              String(so),
              match.vong,
              event.ten,
              athleteLabel(match.athleteRedId) ??
                winnerLabel(
                  bracketsByEvent[event.id] ?? [],
                  soByMatchId,
                  match.id,
                  "do",
                ),
              "vs",
              athleteLabel(match.athleteBlueId) ??
                winnerLabel(
                  bracketsByEvent[event.id] ?? [],
                  soByMatchId,
                  match.id,
                  "xanh",
                ),
            ]),
          });
          y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
            .finalY + 8;
        }
      }

      doc.save("lich-thi-dau-doi-khang.pdf");
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

      <h1 className={styles.mainTitle}>Lịch thi đấu đối kháng</h1>
      <p className={styles.hint}>
        Bấm "Tải file PDF" để tải về máy — nội dung xem trước bên dưới chỉ để
        kiểm tra dữ liệu, không dùng để in trực tiếp.
      </p>

      {doiKhangNumbered.length === 0 ? (
        <p className={styles.hint}>Chưa có nội dung đối kháng nào đã bốc thăm.</p>
      ) : (
        nhomTuoiList.map((nt) => {
          const items = doiKhangNumbered.filter((x) => x.event.nhomTuoi === nt);
          if (items.length === 0) return null;
          return (
            <div key={nt} className={styles.ntBlock}>
              <h3 className={styles.ntTitle}>{formatEventNhomTuoi(nt)}</h3>
              <table className={styles.matchTable}>
                <tbody>
                  {items.map(({ event, match, so }) => (
                    <tr key={match.id}>
                      <td className={styles.colNo}>{so}</td>
                      <td className={styles.colVong}>{match.vong}</td>
                      <td className={styles.colEvent}>{event.ten}</td>
                      <td className={styles.colDo}>
                        {athleteLabel(match.athleteRedId) ??
                          winnerLabel(
                            bracketsByEvent[event.id] ?? [],
                            soByMatchId,
                            match.id,
                            "do",
                          )}
                      </td>
                      <td className={styles.colVs}>vs</td>
                      <td className={styles.colXanh}>
                        {athleteLabel(match.athleteBlueId) ??
                          winnerLabel(
                            bracketsByEvent[event.id] ?? [],
                            soByMatchId,
                            match.id,
                            "xanh",
                          )}
                      </td>
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
