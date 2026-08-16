/**
 * lib/leaderboard.ts
 * ----------------------------------------------------------------------------
 * SERVER-ONLY data-fetching wrapper around the pure ranking logic in
 * lib/rank.ts. This file imports next/headers (via lib/supabase/server),
 * so it must only ever be imported from Server Components, Server Actions,
 * or Route Handlers — never from a Client Component like QuizPlayer.tsx.
 *
 * (Client-side ranking, e.g. inside QuizPlayer after a submit, should
 * import { rankPlayers } directly from '@/lib/rank' instead.)
 * ----------------------------------------------------------------------------
 */

import { createClient } from '@/lib/supabase/server';
import { rankPlayers, type RankedPlayer } from '@/lib/rank';

export type { PlayerResult, RankedPlayer } from '@/lib/rank';
export { rankPlayers, computeOptimisticRank } from '@/lib/rank';

/**
 * Server-side fetch + rank. Use in Server Components / route handlers.
 * Relies on the DB index (quiz_id, score desc, total_time_ms asc) to do the
 * heavy lifting — we only pull the columns we need, capped to top 50.
 */
export async function getLeaderboard(quizId: string): Promise<RankedPlayer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('players')
    .select('id, nickname, score, total_time_ms, claimed_reward')
    .eq('quiz_id', quizId)
    .not('score', 'is', null) // only players who finished
    .order('score', { ascending: false })
    .order('total_time_ms', { ascending: true })
    .limit(50);

  if (error) {
    console.error('[getLeaderboard] Supabase error:', error.message);
    throw new Error('Failed to load leaderboard');
  }

  // Data already arrives DB-sorted; re-run rankPlayers() to attach
  // rank numbers and isWinner flags consistently with client-side logic.
  return rankPlayers(data ?? []);
}