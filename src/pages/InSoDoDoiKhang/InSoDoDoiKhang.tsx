/** @format */

import { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import type { Athlete, AthleteRecord, CompetitionEvent, Match } from "../../types";
import { fetchEvents } from "../../lib/api/eventsApi";
import { apiGet } from "../../lib/api/api";
import { numberDoiKhangMatches } from "../../lib/domain/bracket";
import { compareNhomTuoi, formatEventNhomTuoi } from "../../lib/utils/nhomTuoi";
import BracketView from "../../components/BracketView/BracketView";
import styles from "./InSoDoDoiKhang.module.scss";

export default function InSoDoDoiKhang() {
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [teams, setTeams] = useState<{ id: string; ten: string }[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportTien, setExportTien] = useState<{ da: number; tong: number } | null>(
    null,
  );
  const [exportLoi, setExportLoi] = useState<string | null>(null);

  const pageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  const numbered = useMemo(
    () => numberDoiKhangMatches(events, bracketsByEvent),
    [events, bracketsByEvent],
  );
  const soByMatchId = useMemo(
    () => new Map(numbered.map((x) => [x.match.id, x.so])),
    [numbered],
  );

  // Sắp theo nhóm tuổi rồi hạng cân — thứ tự quen thuộc để dán bảng theo
  // hạng mục, KHÔNG theo thứ tự thi đấu xen kẽ (đó là việc của trang lịch
  // thi đấu riêng).
  const doiKhangEvents = useMemo(
    () =>
      events
        .filter((e) => e.loai === "doi_khang" && bracketsByEvent[e.id])
        .sort(
          (a, b) =>
            compareNhomTuoi(a.nhomTuoi, b.nhomTuoi) ||
            (a.hangCan ?? 0) - (b.hangCan ?? 0),
        ),
    [events, bracketsByEvent],
  );

  const athletesFor = (eventId: string): Athlete[] =>
    athletes
      .filter((a) => a.eventIds.includes(eventId))
      .map(({ eventIds: _eventIds, ...rest }) => ({ ...rest, noiDung: [] }));

  const xuatPDF = async () => {
    setExportLoi(null);
    setExporting(true);
    setExportTien({ da: 0, tong: doiKhangEvents.length });
    try {
      const [{ default: html2canvas }, { jsPDF }, { dangKyFontVN }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
        import("../../lib/pdf/robotoVietnamese"),
      ]);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      dangKyFontVN(doc);
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const titleSpace = 14;

      for (let i = 0; i < doiKhangEvents.length; i++) {
        const ev = doiKhangEvents[i];
        const el = pageRefs.current.get(ev.id);
        if (!el) continue;

        const canvas = await html2canvas(el, {
          scale: 2,
          backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/png");

        if (i > 0) doc.addPage();

        doc.setFontSize(13);
        doc.setFont("RobotoVN", "bold");
        const tieuDe = `${ev.ten} - ${formatEventNhomTuoi(ev.nhomTuoi)}${ev.hangCan ? ` - ${ev.hangCan}kg` : ""}`;
        doc.text(tieuDe, margin, margin);

        const availW = pageW - margin * 2;
        const availH = pageH - margin - titleSpace;
        const tiLe = canvas.width / canvas.height;
        let w = availW;
        let h = w / tiLe;
        if (h > availH) {
          h = availH;
          w = h * tiLe;
        }
        doc.addImage(
          imgData,
          "PNG",
          margin,
          margin + titleSpace,
          w,
          h,
          undefined,
          "FAST",
        );

        setExportTien({ da: i + 1, tong: doiKhangEvents.length });
      }

      doc.save("so-do-doi-khang.pdf");
    } catch {
      setExportLoi("Xuất PDF thất bại — thử lại, hoặc báo lỗi này lại nếu vẫn không được.");
    } finally {
      setExporting(false);
      setExportTien(null);
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
      <div className={styles.toolbar}>
        <button className={styles.exportBtn} onClick={xuatPDF} disabled={exporting}>
          <Download size={16} />
          {exporting
            ? `Đang xuất... (${exportTien?.da ?? 0}/${exportTien?.tong ?? 0})`
            : "Tải file PDF"}
        </button>
        {exportLoi && <p className={styles.exportLoi}>{exportLoi}</p>}
      </div>

      {doiKhangEvents.length === 0 && (
        <p className={styles.hint}>Chưa có nội dung đối kháng nào đã bốc thăm.</p>
      )}

      {doiKhangEvents.map((ev) => (
        <section key={ev.id} className={styles.bracketPage}>
          <h1 className={styles.eventTitle}>
            {ev.ten} · {formatEventNhomTuoi(ev.nhomTuoi)}
            {ev.hangCan ? ` · ${ev.hangCan}kg` : ""}
          </h1>
          <div
            ref={(el) => {
              if (el) pageRefs.current.set(ev.id, el);
            }}
            className={styles.captureArea}>
            <BracketView
              matches={bracketsByEvent[ev.id] ?? []}
              athletes={athletesFor(ev.id)}
              teams={teams}
              soByMatchId={soByMatchId}
              khongCuon
            />
          </div>
        </section>
      ))}
    </div>
  );
}
