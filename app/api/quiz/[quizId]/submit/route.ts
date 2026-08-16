/**
 * app/api/quiz/[quizId]/submit/route.ts
 * ----------------------------------------------------------------------------
 * Single choke point for scoring. Delegates the actual grading to the
 * Postgres `submit_quiz_attempt()` security-definer function (see
 * supabase/schema.sql) — this route is intentionally "dumb": it just
 * forwards the player's answers and returns whatever the DB computed.
 *
 * This is what makes score tampering impossible: even if someone edits
 * the client-side score variable in devtools before this call, the
 * request body only ever contains RAW ANSWERS (selected_option_index +
 * time_taken_ms), never a score. The DB is the only source of truth.
 * ----------------------------------------------------------------------------
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SubmitAnswer {
  question_id: string;
  selected_option_index: number;
  time_taken_ms: number;
}

interface SubmitBody {
  playerId: string;
  answers: SubmitAnswer[];
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const body: SubmitBody = await req.json();

  if (!body.playerId || !Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
  }

  const supabase = await createClient();

  // Sanity check: player belongs to this quiz and hasn't already submitted
  // (prevents a replay attack where someone re-calls submit to try to
  // "improve" their time by resubmitting with a fabricated faster payload —
  // the RPC also guards this by only ever computing from quiz_started_at,
  // but we short-circuit here too for a clean error instead of a silent no-op).
  const { data: existing } = await supabase
    .from('players')
    .select('id, quiz_id, quiz_submitted_at')
    .eq('id', body.playerId)
    .single();

  if (!existing || existing.quiz_id !== quizId) {
    return NextResponse.json({ error: 'Player not found for this quiz' }, { status: 404 });
  }
  if (existing.quiz_submitted_at) {
    return NextResponse.json({ error: 'Quiz already submitted' }, { status: 409 });
  }

  // Delegate to the security-definer RPC — this is where score is actually
  // computed, by checking each answer against `questions.correct_option_index`
  // server-side, and total_time_ms is computed from quiz_started_at to now().
  const { data, error } = await supabase.rpc('submit_quiz_attempt', {
    p_player_id: body.playerId,
    p_answers: body.answers,
  });

  if (error || !data || data.length === 0) {
    console.error('[submit] RPC error:', error?.message);
    return NextResponse.json({ error: 'Failed to submit quiz' }, { status: 500 });
  }

  const result = data[0]; // RPC returns table(score, total_time_ms, rank)

  return NextResponse.json({
    score: result.score,
    total_time_ms: result.total_time_ms,
    rank: result.rank,
    isWinner: result.rank === 1 && result.score === 5,
  });
}