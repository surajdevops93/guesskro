/**
 * lib/rank.ts
 * ----------------------------------------------------------------------------
 * Pure tie-breaker/ranking logic — deliberately has ZERO imports from
 * Supabase, next/headers, or anything server-only. This is what makes it
 * safe to import from a Client Component (QuizPlayer.tsx needs to rank
 * players locally after submit, without waiting on a server round trip).
 *
 * lib/leaderboard.ts (server-side data fetching) imports FROM this file,
 * not the other way around — keep it that way, or you'll leak `next/headers`
 * into the client bundle and break the build.
 * ----------------------------------------------------------------------------
 */

export interface PlayerResult {
  id: string;
  nickname: string;
  score: number | null;
  total_time_ms: number | null;
  claimed_reward: boolean;
}

export interface RankedPlayer extends PlayerResult {
  rank: number;
  isWinner: boolean; // rank === 1 AND score === 5 (perfect score required to claim)
}

/**
 * Rank by score DESC, then total_time_ms ASC on ties.
 * Unsubmitted players (score === null) are filtered out.
 */
export function rankPlayers(players: PlayerResult[]): RankedPlayer[] {
  const submitted = players.filter(
    (p): p is PlayerResult & { score: number; total_time_ms: number } =>
      p.score !== null && p.total_time_ms !== null
  );

  const sorted = [...submitted].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.total_time_ms - b.total_time_ms;
  });

  let rank = 0;
  let prevScore: number | null = null;
  let prevTime: number | null = null;

  return sorted.map((p, index) => {
    const isTiedWithPrev = p.score === prevScore && p.total_time_ms === prevTime;
    if (!isTiedWithPrev) rank = index + 1;
    prevScore = p.score;
    prevTime = p.total_time_ms;

    return {
      ...p,
      rank,
      isWinner: rank === 1 && p.score === 5,
    };
  });
}

/** Optimistic client-side rank calc right after a submit, before a full re-fetch. */
export function computeOptimisticRank(
  myScore: number,
  myTimeMs: number,
  existingLeaderboard: RankedPlayer[]
): number {
  const better = existingLeaderboard.filter(
    (p) => p.score! > myScore || (p.score === myScore && p.total_time_ms! < myTimeMs)
  );
  return better.length + 1;
}