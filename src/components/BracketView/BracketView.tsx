/** @format */

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import type { Athlete, Match } from "../../types";
import { groupByRound } from "../../lib/bracket";
import styles from "./BracketView.module.scss";

const CARD_W = 208;
const CARD_H = 60;
const ROUND_GAP = 64;
const ROW_HEIGHT = 84;
const CORNER_R = 12;
const LABEL_H = 32;

interface BracketViewProps {
  matches: Match[];
  athletes: Athlete[];
}

export default function BracketView({ matches, athletes }: BracketViewProps) {
  const rounds = useMemo(() => groupByRound(matches), [matches]);

  const layout = useMemo(() => {
    let leafCounter = 0;
    const unitById = new Map<string, number>();

    function resolveUnit(matchId: string): number {
      if (unitById.has(matchId)) return unitById.get(matchId)!;
      const feeders = matches.filter((m) => m.nextMatchId === matchId);
      let unit: number;
      if (feeders.length === 0) unit = leafCounter++;
      else if (feeders.length === 1)
        unit = (resolveUnit(feeders[0].id) + leafCounter++) / 2;
      else unit = (resolveUnit(feeders[0].id) + resolveUnit(feeders[1].id)) / 2;
      unitById.set(matchId, unit);
      return unit;
    }

    [...matches].reverse().forEach((m) => resolveUnit(m.id)); // từ chung kết lùi về

    const positioned = rounds.flatMap((roundMatches, r) =>
      roundMatches.map((m) => ({
        match: m,
        x: r * (CARD_W + ROUND_GAP),
        y: LABEL_H + (unitById.get(m.id)! + 0.5) * ROW_HEIGHT,
      })),
    );
    const byId = new Map(positioned.map((p) => [p.match.id, p]));

    const connectors = positioned
      .filter((p) => p.match.nextMatchId && byId.has(p.match.nextMatchId))
      .map((p) => {
        const target = byId.get(p.match.nextMatchId!)!;
        const x1 = p.x + CARD_W,
          y1 = p.y,
          x2 = target.x,
          y2 = target.y;
        const midX = x1 + ROUND_GAP / 2;
        if (y1 === y2) return { key: p.match.id, d: `M ${x1} ${y1} H ${x2}` };
        const sign = y2 > y1 ? 1 : -1;
        const d = `M ${x1} ${y1} H ${midX - CORNER_R} Q ${midX} ${y1} ${midX} ${y1 + CORNER_R * sign} V ${y2 - CORNER_R * sign} Q ${midX} ${y2} ${midX + CORNER_R} ${y2} H ${x2}`;
        return { key: p.match.id, d };
      });

    const finalMatch = matches.find((m) => !m.nextMatchId);
    const isDecided = finalMatch?.trangThai === "da_hoan_thanh";
    const width =
      rounds.length * (CARD_W + ROUND_GAP) -
      ROUND_GAP +
      (isDecided ? ROUND_GAP + 160 : 0);

    return {
      positioned,
      connectors,
      width,
      height: LABEL_H + leafCounter * ROW_HEIGHT,
      isDecided,
      finalMatch,
      championPos: finalMatch ? byId.get(finalMatch.id) : undefined,
    };
  }, [rounds, matches]);

  const athleteName = (id: string | null) =>
    id ? (athletes.find((a) => a.id === id)?.hoTen ?? "—") : null;

  if (rounds.length === 0)
    return (
      <p className={styles.empty}>
        Chưa bốc thăm — bấm "Bốc thăm" để tạo nhánh đấu.
      </p>
    );

  const championName = layout.isDecided
    ? athleteName(layout.finalMatch!.athleteRedId)
    : null;

  return (
    <div className={styles.scrollArea}>
      <div
        className={styles.canvas}
        style={{ width: layout.width, height: layout.height }}>
        {rounds.map((roundMatches, r) => (
          <div
            key={roundMatches[0]?.vong ?? r}
            className={styles.roundLabel}
            style={{ left: r * (CARD_W + ROUND_GAP), width: CARD_W }}>
            {roundMatches[0]?.vong}
          </div>
        ))}
        <svg
          className={styles.lines}
          width={layout.width}
          height={layout.height}>
          {layout.connectors.map((c) => (
            <path key={c.key} d={c.d} fill="none" />
          ))}
        </svg>
        {layout.positioned.map(({ match, x, y }) => (
          <div
            key={match.id}
            className={styles.card}
            style={{
              left: x,
              top: y - CARD_H / 2,
              width: CARD_W,
              height: CARD_H,
            }}>
            <div className={`${styles.slotRow} ${styles.slotDo}`}>
              {athleteName(match.athleteRedId) ?? "Chờ xác định"}
            </div>
            <div className={`${styles.slotRow} ${styles.slotXanh}`}>
              {athleteName(match.athleteBlueId) ?? "Chờ xác định"}
            </div>
          </div>
        ))}
        {championName && layout.championPos && (
          <div
            className={styles.champion}
            style={{
              left: layout.championPos.x + CARD_W + ROUND_GAP,
              top: layout.championPos.y - 24,
            }}>
            <Trophy size={20} />
            <span>{championName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
