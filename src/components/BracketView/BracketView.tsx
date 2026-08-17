/** @format */

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import type { Athlete, Match } from "../../types";
import { groupByRound, winnerLabel } from "../../lib/domain/bracket";
import styles from "./BracketView.module.scss";

const CARD_W = 240; // nới từ 208 để chứa thêm tên đơn vị, CARD_H giữ nguyên
const CARD_H = 60;
const ROUND_GAP = 64;
const ROW_HEIGHT = 84;
const CORNER_R = 12;
const LABEL_H = 32;

interface BracketViewProps {
  matches: Match[];
  athletes: Athlete[];
  teams: { id: string; ten: string }[];
  // Số thứ tự toàn giải của từng trận (xem numberDoiKhangMatches trong
  // lib/bracket) — dùng để hiện "Thắng trận N" cho ô chưa biết VĐV, khớp
  // đúng với số hiện ở tab "Lịch thi đấu".
  soByMatchId: Map<string, number>;
  // true = không giới hạn khung cuộn, hiện trọn vẹn sơ đồ dù rộng bao
  // nhiêu — dùng khi cần CHỤP LẠI toàn bộ để xuất PDF (html2canvas chỉ
  // chụp đúng phần đang hiển thị trong khung, không tự "cuộn" được).
  khongCuon?: boolean;
}

export default function BracketView({
  matches,
  athletes,
  teams,
  soByMatchId,
  khongCuon,
}: BracketViewProps) {
  const rounds = useMemo(() => groupByRound(matches), [matches]);

  const layout = useMemo(() => {
    const feedersOf = (matchId: string) =>
      matches.filter((m) => m.nextMatchId === matchId);
    const finalMatch = matches.find((m) => !m.nextMatchId);

    // Bước 1 — gán số hàng "gốc" cho từng chỗ thật sự cần 1 hàng riêng:
    // trận không có nguồn nuôi nào (2 người vào thẳng), hoặc phần "miễn"
    // của trận chỉ có 1 nguồn nuôi. Đệ quy ĐÚNG 1 LẦN, bắt đầu từ chung
    // kết (không lặp qua cả mảng matches theo thứ tự tuỳ ý — mảng này giờ
    // tới từ database, không đảm bảo giữ thứ tự tạo ra ban đầu) — xử lý
    // XONG HẲN nhánh nuôi trước rồi mới gán số cho phần miễn ngay sau đó,
    // để số hàng luôn liền kề đúng vị trí thật. Cách cũ (1 dải đếm chung,
    // tăng dần bất kể đang ở nhánh nào) khiến 2 trận khác nhau có thể vô
    // tình tính ra cùng 1 vị trí — 2 quân bài đè thẳng lên nhau, 1 trận
    // biến mất khỏi màn hình dù dữ liệu vẫn còn nguyên.
    let leafCounter = 0;
    const ownLeafSlot = new Map<string, number>();
    function assignLeafPositions(matchId: string) {
      const feeders = feedersOf(matchId);
      if (feeders.length === 2) {
        assignLeafPositions(feeders[0].id);
        assignLeafPositions(feeders[1].id);
      } else if (feeders.length === 1) {
        assignLeafPositions(feeders[0].id);
        ownLeafSlot.set(matchId, leafCounter++);
      } else {
        ownLeafSlot.set(matchId, leafCounter++);
      }
    }
    if (finalMatch) assignLeafPositions(finalMatch.id);

    // Bước 2 — vị trí thật của mỗi trận = trung bình vị trí 2 nguồn nuôi
    // vào nó, dùng lại đúng số hàng đã gán ở bước 1 cho phần không có
    // nguồn nuôi.
    const unitById = new Map<string, number>();
    function resolveUnit(matchId: string): number {
      if (unitById.has(matchId)) return unitById.get(matchId)!;
      const feeders = feedersOf(matchId);
      let unit: number;
      if (feeders.length === 0) unit = ownLeafSlot.get(matchId)!;
      else if (feeders.length === 1)
        unit = (resolveUnit(feeders[0].id) + ownLeafSlot.get(matchId)!) / 2;
      else unit = (resolveUnit(feeders[0].id) + resolveUnit(feeders[1].id)) / 2;
      unitById.set(matchId, unit);
      return unit;
    }
    if (finalMatch) resolveUnit(finalMatch.id);

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

  const athleteTeam = (id: string | null) => {
    if (!id) return null;
    const a = athletes.find((x) => x.id === id);
    if (!a) return null;
    return teams.find((t) => t.id === a.teamId)?.ten ?? null;
  };

  if (rounds.length === 0)
    return (
      <p className={styles.empty}>
        Chưa bốc thăm — bấm "Bốc thăm" để tạo nhánh đấu.
      </p>
    );

  const championName = layout.isDecided
    ? athleteName(layout.finalMatch!.nguoiThangId ?? null)
    : null;

  return (
    <div className={khongCuon ? styles.scrollAreaKhongCuon : styles.scrollArea}>
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
        {layout.positioned.map(({ match, x, y }) => {
          // Chỉ tính "thua" riêng cho ĐÚNG trận này — 1 người thắng vòng
          // trước rồi mới thua vòng sau vẫn hiện bình thường ở ô đã
          // thắng, chỉ gạch tên ở đúng ô họ thua, để nhìn vào biết ngay
          // họ dừng lại ở vòng nào.
          const doThua =
            match.trangThai === "da_hoan_thanh" &&
            !!match.nguoiThangId &&
            match.nguoiThangId === match.athleteBlueId;
          const xanhThua =
            match.trangThai === "da_hoan_thanh" &&
            !!match.nguoiThangId &&
            match.nguoiThangId === match.athleteRedId;

          return (
            <div
              key={match.id}
              className={styles.card}
              style={{
                left: x,
                top: y - CARD_H / 2,
                width: CARD_W,
                height: CARD_H,
              }}>
              {soByMatchId.get(match.id) && (
                <span className={styles.matchBadge}>
                  Trận {soByMatchId.get(match.id)}
                </span>
              )}
              <div className={`${styles.slotRow} ${styles.slotDo}`}>
                {match.athleteRedId ? (
                  <>
                    <span
                      className={
                        doThua
                          ? `${styles.slotName} ${styles.slotNameEliminated}`
                          : styles.slotName
                      }>
                      {athleteName(match.athleteRedId)}
                    </span>
                    {athleteTeam(match.athleteRedId) && (
                      <span className={styles.slotTeam}>
                        {athleteTeam(match.athleteRedId)}
                      </span>
                    )}
                  </>
                ) : (
                  winnerLabel(matches, soByMatchId, match.id, "do")
                )}
              </div>
              <div className={`${styles.slotRow} ${styles.slotXanh}`}>
                {match.athleteBlueId ? (
                  <>
                    <span
                      className={
                        xanhThua
                          ? `${styles.slotName} ${styles.slotNameEliminated}`
                          : styles.slotName
                      }>
                      {athleteName(match.athleteBlueId)}
                    </span>
                    {athleteTeam(match.athleteBlueId) && (
                      <span className={styles.slotTeam}>
                        {athleteTeam(match.athleteBlueId)}
                      </span>
                    )}
                  </>
                ) : (
                  winnerLabel(matches, soByMatchId, match.id, "xanh")
                )}
              </div>
            </div>
          );
        })}
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
