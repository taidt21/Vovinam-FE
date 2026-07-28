/** @format */

import { useState } from "react";
import type { Athlete, CompetitionEvent, Match, Squad } from "../../types";
import { numberDoiKhangMatches, winnerLabel } from "../../lib/bracket";
import { compareNhomTuoi, formatEventNhomTuoi } from "../../lib/nhomTuoi";
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
  const [subTab, setSubTab] = useState<"quyen" | "doi_khang">("doi_khang");

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

  const doiKhangNumbered = numberDoiKhangMatches(events, bracketsByEvent);
  const soByMatchId = new Map(doiKhangNumbered.map((x) => [x.match.id, x.so]));

  const quyenReady = quyenEvents.filter((e) =>
    e.hinhThucThi === "doi" ? !!squadOrderByEvent[e.id] : !!orderByEvent[e.id],
  );
  const quyenSorted = [...quyenReady]
    .sort((a, b) => compareNhomTuoi(a.nhomTuoi, b.nhomTuoi))
    .flatMap((e) =>
      e.hinhThucThi === "doi"
        ? squadOrderByEvent[e.id]!.map((s) => ({
            event: e,
            key: s.id,
            label: `${s.ten} (${squadTeam(s)})`,
          }))
        : orderByEvent[e.id]!.map((a) => ({
            event: e,
            key: a.id,
            label: `${a.hoTen} (${a.namSinh} · ${teamName(a.teamId)})`,
          })),
    );
  const quyenNumbered = quyenSorted.map((x, i) => ({ ...x, so: i + 1 }));

  const nhomTuoiList = Array.from(new Set(events.map((e) => e.nhomTuoi))).sort(
    compareNhomTuoi,
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

      <div className={styles.subTabsBar}>
        <button
          className={
            subTab === "doi_khang" ? styles.subTabActive : styles.subTab
          }
          onClick={() => setSubTab("doi_khang")}>
          Đối kháng
        </button>
        <button
          className={subTab === "quyen" ? styles.subTabActive : styles.subTab}
          onClick={() => setSubTab("quyen")}>
          Quyền
        </button>
      </div>

      {subTab === "quyen" &&
        (quyenNumbered.length > 0 ? (
          <section className={styles.loaiSection}>
            {nhomTuoiList.map((nt) => {
              const items = quyenNumbered.filter(
                (x) => x.event.nhomTuoi === nt,
              );
              if (items.length === 0) return null;
              return (
                <div key={nt} className={styles.ntBlock}>
                  <h3 className={styles.ntTitle}>{formatEventNhomTuoi(nt)}</h3>
                  <ol className={styles.matchList}>
                    {items.map(({ event, key, label, so }) => (
                      <li key={key}>
                        <span className={styles.matchNo}>{so}</span>
                        <span className={styles.matchEvent}>{event.ten}</span>
                        <span className={styles.matchup}>{label}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </section>
        ) : (
          <p className={styles.hint}>
            Chưa có nội dung quyền nào sẵn sàng (đã bốc thăm/xếp thứ tự).
          </p>
        ))}

      {subTab === "doi_khang" &&
        (doiKhangNumbered.length > 0 ? (
          <section className={styles.loaiSection}>
            {nhomTuoiList.map((nt) => {
              const items = doiKhangNumbered.filter(
                (x) => x.event.nhomTuoi === nt,
              );
              if (items.length === 0) return null;
              return (
                <div key={nt} className={styles.ntBlock}>
                  <h3 className={styles.ntTitle}>{formatEventNhomTuoi(nt)}</h3>
                  <ol className={styles.matchList}>
                    {items.map(({ event, match, so }) => (
                      <li key={match.id}>
                        <span className={styles.matchNo}>{so}</span>
                        <span className={styles.matchVong}>{match.vong}</span>
                        <span className={styles.matchEvent}>{event.ten}</span>
                        <span className={styles.matchup}>
                          <span className={styles.matchDo}>
                            {athleteLabel(match.athleteRedId) ??
                              winnerLabel(
                                bracketsByEvent[event.id] ?? [],
                                soByMatchId,
                                match.id,
                                "do",
                              )}
                          </span>
                          <span className={styles.vs}>vs</span>
                          <span className={styles.matchXanh}>
                            {athleteLabel(match.athleteBlueId) ??
                              winnerLabel(
                                bracketsByEvent[event.id] ?? [],
                                soByMatchId,
                                match.id,
                                "xanh",
                              )}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </section>
        ) : (
          <p className={styles.hint}>
            Chưa có nội dung đối kháng nào sẵn sàng (đã bốc thăm).
          </p>
        ))}
    </div>
  );
}
