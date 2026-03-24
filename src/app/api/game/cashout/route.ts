import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    const supabase = createServiceClient();
    const { data: session, error } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
    if (error || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.status !== 'active') return NextResponse.json({ error: 'Session not active' }, { status: 400 });
    if (session.revealed_safe === 0) return NextResponse.json({ error: 'Must reveal at least one tile before cashing out' }, { status: 400 });

    const multiplier: number = session.current_multiplier;
    const winnings = session.bet * multiplier;

    await supabase.from('game_sessions').update({
      status: 'won',
      cashout_multiplier: multiplier,
      winnings,
      server_seed_revealed: session.server_seed,
    }).eq('id', sessionId);

    // Return mine positions so frontend can reveal them on cashout
    return NextResponse.json({
      multiplier,
      winnings,
      minePositions: session.mine_positions as number[],
      serverSeed: session.server_seed as string,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
