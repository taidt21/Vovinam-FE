/** @format */

import type { Athlete, CompetitionEvent, Match, Squad } from "../../types";
import { distanceFromFinal } from "../../lib/bracket";
import styles from "./LichThiDau.module.scss";

interface AthleteBasic {
  id: string;
  hoTen: string;
  namSinh: number;
  teamId: string;
}

interface LichThiDauProps {
  events: CompetitionEvent[];
  athletes: AthleteBasic[];
  teams: { id: string; ten: string }[];
  bracketsByEvent: Record<string, Match[]>;
  orderByEvent: Record<string, Athlete[]>;
  squadOrderByEvent: Record<string, Squad[]>;
}

export default function LichThiDau({
  events,
  athletes,
  teams,
  bracketsByEvent,
  orderByEvent,
  squadOrderByEvent,
}: LichThiDauProps) {
  const teamName = (teamId: string) =>
    teams.find((t) => t.id === teamId)?.ten ?? "—";
  const athleteLabel = (id: string | null) => {
    if (!id) return null;
    const a = athletes.find((x) => x.id === id);
    return a ? `${a.hoTen} (${a.namSinh} · ${teamName(a.teamId)})` : "—";
  };
  const squadTeam = (s: Squad) => {
    const first = athletes.find((a) => s.athleteIds.includes(a.id));
    return first ? teamName(first.teamId) : "—";
  };

  const doiKhangEvents = events.filter((e) => e.loai === "doi_khang");
  const quyenEvents = events.filter((e) => e.loai === "quyen");

  const pending = [
    ...doiKhangEvents.filter((e) => !bracketsByEvent[e.id]).map((e) => e.ten),
    ...quyenEvents
      .filter((e) =>
        e.hinhThucThi === "doi"
          ? !squadOrderByEvent[e.id]
          : !orderByEvent[e.id],
      )
      .map((e) => e.ten),
  ];

  // Trộn tất cả trận đối kháng đã xác định đủ 2 bên, từ MỌI nội dung —
  // không tách riêng theo từng hạng cân — rồi sắp theo đúng quy tắc:
  // nhóm tuổi tăng dần, trong đó khoảng cách chung kết giảm dần (xa nhất trước).
  const allMatches = doiKhangEvents.flatMap((e) => {
    const matches = bracketsByEvent[e.id];
    if (!matches) return [];
    return matches
      .filter((m) => m.athleteRedId && m.athleteBlueId)
      .map((m) => ({
        event: e,
        match: m,
        distance: distanceFromFinal(m, matches),
      }));
  });
  allMatches.sort((a, b) =>
    a.event.nhomTuoi !== b.event.nhomTuoi
      ? a.event.nhomTuoi - b.event.nhomTuoi
      : b.distance - a.distance,
  );

  const nhomTuoiList = Array.from(new Set(events.map((e) => e.nhomTuoi))).sort(
    (a, b) => a - b,
  );

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Lịch thi đấu tổng</h1>

      {pending.length > 0 && (
        <p className={styles.pendingNote}>
          Còn {pending.length} nội dung chưa bốc thăm: {pending.join(", ")} —
          danh sách dưới đây chỉ hiện phần đã sẵn sàng.
        </p>
      )}

      {nhomTuoiList.map((nt) => {
        const matchesOfNt = allMatches.filter((x) => x.event.nhomTuoi === nt);
        const quyenOfNt = quyenEvents.filter((e) => e.nhomTuoi === nt);
        const quyenReadyOfNt = quyenOfNt.filter((e) =>
          e.hinhThucThi === "doi"
            ? !!squadOrderByEvent[e.id]
            : !!orderByEvent[e.id],
        );

        if (matchesOfNt.length === 0 && quyenReadyOfNt.length === 0)
          return null;

        return (
          <section key={nt} className={styles.ntSection}>
            <h2 className={styles.ntTitle}>Nhóm tuổi {nt}</h2>

            {matchesOfNt.length > 0 && (
              <div className={styles.subSection}>
                <h3 className={styles.subTitle}>Đối kháng</h3>
                <ol className={styles.matchList}>
                  {matchesOfNt.map(({ event, match }) => (
                    <li key={match.id}>
                      <span className={styles.matchVong}>{match.vong}</span>
                      <span className={styles.matchEvent}>{event.ten}</span>
                      <span className={styles.matchup}>
                        {athleteLabel(match.athleteRedId)} vs{" "}
                        {athleteLabel(match.athleteBlueId)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {quyenReadyOfNt.map((e) => (
              <div key={e.id} className={styles.subSection}>
                <h3 className={styles.subTitle}>Quyền — {e.ten}</h3>
                <ol className={styles.matchList}>
                  {e.hinhThucThi === "doi"
                    ? squadOrderByEvent[e.id]!.map((s) => (
                        <li key={s.id}>
                          <strong>{s.ten}</strong> ({squadTeam(s)})
                        </li>
                      ))
                    : orderByEvent[e.id]!.map((a) => (
                        <li key={a.id}>
                          {a.hoTen} ({a.namSinh} · {teamName(a.teamId)})
                        </li>
                      ))}
                </ol>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
