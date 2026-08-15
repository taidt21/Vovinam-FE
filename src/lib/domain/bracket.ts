import type { Athlete, CompetitionEvent, Match } from '../../types';
import { compareNhomTuoi } from '../utils/nhomTuoi';
import { generateGuid } from '../utils/guid';// Đặt tên vòng theo khoảng cách THẬT tới chung kết — không theo số trận
// trong vòng nữa. 0 bước = Chung kết, 1 = Bán kết, 2 = Tứ kết, xa hơn
// thì theo số người thi đấu ở vòng đó (2^(khoảng cách + 1)).
function tenVong(distance: number): string {
  if (distance === 0) return 'Chung kết';
  if (distance === 1) return 'Bán kết';
  if (distance === 2) return 'Tứ kết';
  return `Vòng ${2 ** (distance + 1)}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

type Entrant =
  | { kind: 'athlete'; athleteId: string }
  | { kind: 'pending'; matchId: string };

// Đếm số bước từ 1 trận tới chung kết, bằng cách lần theo nextMatchId —
// không suy đoán qua tên vòng hay số trận trong vòng. Chung kết
// (không có nextMatchId) = 0.
export function distanceFromFinal(match: Match, matchesInEvent: Match[]): number {
  let distance = 0;
  let current: Match | undefined = match;
  while (current?.nextMatchId) {
    current = matchesInEvent.find((m) => m.id === current!.nextMatchId);
    if (!current) break;
    distance++;
  }
  return distance;
}

/**
 * Sinh bracket đúng theo sơ đồ Sigma: đưa số VĐV về lũy thừa 2 LỚN NHẤT
 * <= n bằng ĐÚNG 1 vòng sơ bộ duy nhất, không giãn bracket lên như trước.
 * Sau vòng sơ bộ, bracket sạch tuyệt đối — không còn ai miễn đấu thêm
 * vòng nào nữa, không ai phải đợi nhiều vòng liên tiếp.
 *
 * Tên vòng KHÔNG còn gán "Sơ bộ" cứng cho vòng đầu nữa — toàn bộ cây
 * trận được dựng xong trước (giữ nguyên cấu trúc/nextMatchId như cũ),
 * rồi mới quét lại 1 lượt, đặt tên từng trận theo đúng khoảng cách thật
 * tới chung kết — để trận ngay trước bán kết luôn là tứ kết, bất kể n
 * lẻ hay có vòng sơ bộ hay không.
 */
export function generateBracket(athletes: Athlete[], eventId: string): Match[] {
  const n = athletes.length;
  if (n < 2) return [];

  let target = 1;
  while (target * 2 <= n) target *= 2; // lũy thừa 2 lớn nhất <= n, an toàn hơn Math.log2
  const soBoCount = n - target;

  const shuffled = shuffleArray(athletes);
  const soBoAthletes = shuffled.slice(0, soBoCount * 2);
  const mienAthletes = shuffled.slice(soBoCount * 2);

  const allMatches: Match[] = [];
  let entrants: Entrant[];

  if (soBoCount > 0) {
    const soBoMatches: Match[] = soBoAthletes.reduce<Match[]>((acc, _, i) => {
      if (i % 2 !== 0) return acc;
      acc.push({
        id:generateGuid(),
        eventId,
        courtId: null,
        nextMatchId: null,
        nextMatchSlot: null,
        athleteRedId: soBoAthletes[i].id,
        athleteBlueId: soBoAthletes[i + 1].id,
        vong: '', // gán thật ở bước cuối cùng, sau khi biết đủ cả cây trận
        trangThai: 'cho_thi',
      });
      return acc;
    }, []);
    allMatches.push(...soBoMatches);

    const pendingFromSoBo: Entrant[] = soBoMatches.map((m) => ({ kind: 'pending', matchId: m.id }));
    const mien: Entrant[] = mienAthletes.map((a) => ({ kind: 'athlete', athleteId: a.id }));
    entrants = shuffleArray([...pendingFromSoBo, ...mien]);
  } else {
    entrants = shuffleArray(athletes).map((a) => ({ kind: 'athlete', athleteId: a.id }));
  }

  // Từ đây bracket sạch — ghép tuần tự mỗi vòng tới khi còn 1 người, không còn khái niệm bye nữa
  while (entrants.length > 1) {
    const matchesInRound = entrants.length / 2;
    const roundMatches: Match[] = [];
    for (let i = 0; i < matchesInRound; i++) {
      const left = entrants[i * 2];
      const right = entrants[i * 2 + 1];
      const m: Match = {
        id: generateGuid(),
        eventId,
        courtId: null,
        nextMatchId: null,
        nextMatchSlot: null,
        athleteRedId: left.kind === 'athlete' ? left.athleteId : null,
        athleteBlueId: right.kind === 'athlete' ? right.athleteId : null,
        vong: '', // gán thật ở bước cuối cùng, sau khi biết đủ cả cây trận
        trangThai: 'cho_thi',
      };
      if (left.kind === 'pending') {
        const feeder = allMatches.find((x) => x.id === left.matchId)!;
        feeder.nextMatchId = m.id;
        feeder.nextMatchSlot = 'do';
      }
      if (right.kind === 'pending') {
        const feeder = allMatches.find((x) => x.id === right.matchId)!;
        feeder.nextMatchId = m.id;
        feeder.nextMatchSlot = 'xanh';
      }
      allMatches.push(m);
      roundMatches.push(m);
    }
    entrants = roundMatches.map((m) => ({ kind: 'pending', matchId: m.id }));
  }

  // Đặt tên vòng thật — chỉ làm được SAU khi đã dựng xong toàn bộ
  // nextMatchId, vì cần lần chuỗi tới chung kết mới biết khoảng cách.
  for (const m of allMatches) {
    m.vong = tenVong(distanceFromFinal(m, allMatches));
  }

  return allMatches;
}

export function groupByRound(matches: Match[]): Match[][] {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    if (!map.has(m.vong)) map.set(m.vong, []);
    map.get(m.vong)!.push(m);
  }

  // KHÔNG dựa vào thứ tự mảng đầu vào nữa — dữ liệu giờ có thể tới từ
  // database (không đảm bảo giữ nguyên thứ tự đã tạo ra ban đầu, khác hẳn
  // lúc còn nằm nguyên trong React state). Tự tính lại khoảng cách thật
  // tới chung kết cho từng nhóm, sắp xa nhất đứng trước.
  const groups = Array.from(map.entries());
  groups.sort(([, matchesA], [, matchesB]) => {
    const distA = distanceFromFinal(matchesA[0], matches);
    const distB = distanceFromFinal(matchesB[0], matches);
    return distB - distA;
  });
  return groups.map(([, ms]) => ms);
}

/**
 * Đánh số THỨ TỰ TOÀN GIẢI cho mọi trận đối kháng (mọi nội dung, mọi vòng) —
 * dùng chung 1 nguồn cho cả tab "Lịch thi đấu" lẫn sơ đồ nhánh đấu từng nội
 * dung, để số trận không bao giờ lệch nhau giữa 2 nơi.
 *
 * Sắp theo nhóm tuổi trước, rồi theo khoảng cách tới chung kết GIẢM DẦN
 * (vòng xa chung kết nhất trước) — nhờ vậy trận "nguồn" (nuôi người thắng
 * vào trận sau) LUÔN được đánh số trước trận nó nuôi vào, dù có xen kẽ
 * nhiều nội dung khác nhau ở giữa.
 */
export interface NumberedMatch {
  event: CompetitionEvent;
  match: Match;
  so: number;
}

export function numberDoiKhangMatches(
  events: CompetitionEvent[],
  bracketsByEvent: Record<string, Match[]>,
): NumberedMatch[] {
  const items = events
    .filter((e) => e.loai === 'doi_khang')
    .flatMap((e) => {
      const matches = bracketsByEvent[e.id];
      if (!matches) return [];
      return matches.map((m) => ({
        event: e,
        match: m,
        distance: distanceFromFinal(m, matches),
      }));
    })
    .sort((a, b) =>
      a.event.nhomTuoi !== b.event.nhomTuoi ? compareNhomTuoi(a.event.nhomTuoi, b.event.nhomTuoi) : b.distance - a.distance,
    );
  return items.map((x, i) => ({ event: x.event, match: x.match, so: i + 1 }));
}

/**
 * Nhãn hiển thị cho 1 ô VĐV trong trận: tên VĐV nếu đã biết, hoặc
 * "Thắng trận N" nếu ô này còn chờ người thắng từ trận trước (N lấy từ
 * soByMatchId — xem numberDoiKhangMatches). "Chưa xác định" chỉ xuất hiện
 * khi thiếu dữ liệu (trường hợp không nên xảy ra trong luồng bình thường).
 */
export function winnerLabel(
  matchesInEvent: Match[],
  soByMatchId: Map<string, number>,
  targetMatchId: string,
  slot: 'do' | 'xanh',
): string {
  const feeder = matchesInEvent.find(
    (m) => m.nextMatchId === targetMatchId && m.nextMatchSlot === slot,
  );
  const so = feeder ? soByMatchId.get(feeder.id) : undefined;
  return so ? `Thắng trận ${so}` : 'Chưa xác định';
}