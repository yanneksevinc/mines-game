import { NextRequest, NextResponse } from 'next/server';
import { getMultiplier, applySpecialTileEffect, shieldPenaltyFactor, SpecialTile } from '@/lib/gameLogic';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, tileIndex } = await req.json();
    const supabase = createServiceClient();
    const { data: session, error } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
    if (error || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.status !== 'active') return NextResponse.json({ error: 'Session not active' }, { status: 400 });

    const minePositions: number[] = session.mine_positions;
    const specialTiles: SpecialTile[] = session.special_tiles ?? [];
    const isMine = minePositions.includes(tileIndex);
    const special = specialTiles.find((s) => s.index === tileIndex) ?? null;

    if (isMine) {
      if (session.shield_active) {
        // Penalty scales with mine density: fewer mines = shield was worth more = bigger cut.
        // e.g. 1 mine / 25 tiles (4% density) -> retain 40% of multiplier
        //      high mine count (30% density)  -> retain 85% of multiplier
        const retainFactor = shieldPenaltyFactor(session.mine_count, session.grid_size);
        const penalisedMultiplier = session.current_multiplier * retainFactor;
        const penaltyPct = Math.round((1 - retainFactor) * 100);

        await supabase.from('game_sessions').update({
          shield_active: false,
          current_multiplier: penalisedMultiplier,
        }).eq('id', sessionId);

        return NextResponse.json({
          phase: 'active',
          tileState: 'shield',
          message: `\ud83d\udee1\ufe0f Shield blocked the mine! (-${penaltyPct}% multiplier penalty)`,
          sessionUpdate: { shieldActive: false, currentMultiplier: penalisedMultiplier },
        });
      }

      await supabase.from('game_sessions').update({ status: 'lost' }).eq('id', sessionId);
      return NextResponse.json({ phase: 'lost', tileState: 'mine', minePositions });
    }

    const newRevealedSafe = session.revealed_safe + 1;
    const rawMultiplier = getMultiplier(session.grid_size, session.mine_count, newRevealedSafe, session.house_edge);
    const { multiplier: adjustedMultiplier, message, newMinePositions } = applySpecialTileEffect(rawMultiplier, special?.type ?? null, minePositions);
    const newShieldActive = special?.type === 'shield' ? true : session.shield_active;

    await supabase.from('game_sessions').update({
      revealed_safe: newRevealedSafe,
      current_multiplier: adjustedMultiplier,
      shield_active: newShieldActive,
      mine_positions: newMinePositions,
    }).eq('id', sessionId);

    await supabase.from('tile_reveals').insert({
      session_id: sessionId, tile_index: tileIndex, tile_type: special?.type ?? 'safe',
    });

    return NextResponse.json({
      phase: 'active',
      tileState: special?.type ?? 'safe',
      message,
      sessionUpdate: {
        revealedSafe: newRevealedSafe,
        currentMultiplier: adjustedMultiplier,
        shieldActive: newShieldActive,
        mineCount: newMinePositions.length,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
