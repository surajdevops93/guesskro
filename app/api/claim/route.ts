/**
 * app/api/claim/route.ts
 * ----------------------------------------------------------------------------
 * Called when the rank-1 winner submits their WhatsApp/contact info via
 * the Claim Reward modal. Server-side re-verifies the player is ACTUALLY
 * rank 1 with a perfect score before writing the claim — never trust a
 * client-sent "I won" flag.
 * ----------------------------------------------------------------------------
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rankPlayers } from '@/lib/rank';

export async function POST(req: NextRequest) {
  const { playerId, quizId, contact } = await req.json();

  const cleanContact = (contact ?? '').trim().slice(0, 40);
  if (!playerId || !quizId || !cleanContact) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = await createClient();

  // Re-derive the leaderboard server-side and confirm this player is
  // genuinely rank 1 — this is the same defense-in-depth pattern as the
  // scoring RPC: never trust anything the client claims about its own rank.
  const { data: players, error } = await supabase
    .from('players')
    .select('id, nickname, score, total_time_ms, claimed_reward')
    .eq('quiz_id', quizId)
    .not('score', 'is', null)
    .order('score', { ascending: false })
    .order('total_time_ms', { ascending: true })
    .limit(50);

  if (error || !players) {
    return NextResponse.json({ error: 'Could not verify leaderboard' }, { status: 500 });
  }

  const ranked = rankPlayers(players);
  const me = ranked.find((p) => p.id === playerId);

  if (!me || !me.isWinner) {
    return NextResponse.json({ error: 'Only the winning player can claim the reward' }, { status: 403 });
  }

  const { error: updateError } = await supabase
    .from('players')
    .update({
      claimed_reward: true,
      claim_contact: cleanContact,
      claimed_at: new Date().toISOString(),
    })
    .eq('id', playerId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save claim' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}