import type { Athlete, Match } from '../types';

function tenVong(matchesInRound: number): string {
  if (matchesInRound === 1) return 'Chung kết';
  if (matchesInRound === 2) return 'Bán kết';
  if (matchesInRound === 4) return 'Tứ kết';
  return `Vòng ${matchesInRound * 2}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

type Entrant =
  | { kind: 'athlete'; athleteId: string }
  | { kind: 'pending'; matchId: string };

/**
 * Sinh bracket đúng theo sơ đồ Sigma: đưa số VĐV về lũy thừa 2 LỚN NHẤT
 * <= n bằng ĐÚNG 1 vòng sơ bộ duy nhất, không giãn bracket lên như trước.
 * Sau vòng sơ bộ, bracket sạch tuyệt đối — không còn ai miễn đấu thêm
 * vòng nào nữa, không ai phải đợi nhiều vòng liên tiếp.
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
        id: crypto.randomUUID(),
        eventId,
        courtId: null,
        nextMatchId: null,
        athleteRedId: soBoAthletes[i].id,
        athleteBlueId: soBoAthletes[i + 1].id,
        vong: 'Sơ bộ',
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
        id: crypto.randomUUID(),
        eventId,
        courtId: null,
        nextMatchId: null,
        athleteRedId: left.kind === 'athlete' ? left.athleteId : null,
        athleteBlueId: right.kind === 'athlete' ? right.athleteId : null,
        vong: tenVong(matchesInRound),
        trangThai: 'cho_thi',
      };
      if (left.kind === 'pending') allMatches.find((x) => x.id === left.matchId)!.nextMatchId = m.id;
      if (right.kind === 'pending') allMatches.find((x) => x.id === right.matchId)!.nextMatchId = m.id;
      allMatches.push(m);
      roundMatches.push(m);
    }
    entrants = roundMatches.map((m) => ({ kind: 'pending', matchId: m.id }));
  }

  return allMatches;
}

export function groupByRound(matches: Match[]): Match[][] {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    if (!map.has(m.vong)) map.set(m.vong, []);
    map.get(m.vong)!.push(m);
  }
  return Array.from(map.values()); // Sơ bộ luôn được push đầu tiên trong allMatches -> tự đứng cột đầu
}