/**
 * app/api/quiz/[quizId]/enter/route.ts
 * ----------------------------------------------------------------------------
 * Called once when a player submits their nickname and hits "Start".
 * Two jobs in one round trip:
 *   1. Insert the `players` row (nickname + silently-captured device
 *      analytics), stamping quiz_started_at = now() — this is the clock
 *      the tie-breaker's total_time_ms is measured against.
 *   2. Return the quiz's 5 questions WITHOUT `correct_option_index` —
 *      the answer key never leaves the server until after submission,
 *      so it can't be read from the Network tab mid-quiz.
 * ----------------------------------------------------------------------------
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface EnterBody {
  nickname: string;
  device_type: string;
  os: string;
  browser: string;
  referrer: string;
  user_agent_raw: string;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const body: EnterBody = await req.json();

  // Basic guardrails — this endpoint is public and unauthenticated by design
  // (zero-friction entry), so validate defensively.
  const nickname = (body.nickname ?? '').trim().slice(0, 30);
  if (!nickname) {
    return NextResponse.json({ error: 'Nickname is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Confirm the quiz exists and is published before letting anyone play it.
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id')
    .eq('id', quizId)
    .eq('is_published', true)
    .single();

  if (quizError || !quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  // Create the player row — quiz_started_at is stamped NOW, server-side,
  // so the total_time_ms tiebreaker can't be manipulated by a client
  // that delays sending this request.
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      quiz_id: quizId,
      nickname,
      device_type: body.device_type,
      os: body.os,
      browser: body.browser,
      referrer: body.referrer,
      user_agent_raw: body.user_agent_raw,
      quiz_started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (playerError || !player) {
    console.error('[enter] Failed to create player:', playerError?.message);
    return NextResponse.json({ error: 'Failed to start quiz' }, { status: 500 });
  }

  // Fetch questions WITHOUT the answer key.
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id, question_order, question_text, image_url, options')
    .eq('quiz_id', quizId)
    .order('question_order', { ascending: true });

  if (questionsError || !questions || questions.length === 0) {
    return NextResponse.json({ error: 'Quiz has no questions' }, { status: 500 });
  }

  return NextResponse.json({ playerId: player.id, questions });
}