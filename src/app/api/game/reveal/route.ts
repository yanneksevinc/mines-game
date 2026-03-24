import { NextRequest, NextResponse } from 'next/server';
import { getMultiplier, applySpecialTileEffect, SpecialTile } from '@/lib/gameLogic';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, tileIndex } = await req.json();

    const supabase = createServiceClient();
    const { data: session, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session not active' }, { status: 400 });
    }

    const minePositions: number[] = session.mine_positions;
    const specialTiles: SpecialTile[] = session.special_tiles ?? [];
    const isMine = minePositions.includes(tileIndex);
    const special = specialTiles.find((s) => s.index === tileIndex) ?? null;

    if (isMine) {
      if (session.shield_active) {
        // Shield absorbs the mine hit — penalise multiplier, deactivate shield
        const penalisedMultiplier = session.current_multiplier * 0.85;
        await supabase
          .from('game_sessions')
          .update({ shield_active: false, current_multiplier: penalisedMultiplier })
          .eq('id', sessionId);

        return NextResponse.json({
          phase: 'active',
          tileState: 'shield',
          message: '🛡️ Shield blocked the mine! (×0.85 penalty)',
          sessionUpdate: { shieldActive: false, currentMultiplier: penalisedMultiplier },
        });
      }

      // Game over
      await supabase
        .from('game_sessions')
        .update({ status: 'lost' })
        .eq('id', sessionId);

      return NextResponse.json({
        phase: 'lost',
        tileState: 'mine',
        minePositions,
      });
    }

    // Safe tile — compute new multiplier
    const newRevealedSafe = session.revealed_safe + 1;
    const rawMultiplier = getMultiplier(
      session.grid_size,
      session.mine_count,
      newRevealedSafe,
      session.house_edge
    );

    const { multiplier: adjustedMultiplier, message } = applySpecialTileEffect(
      rawMultiplier,
      special?.type ?? null
    );

    const newShieldActive =
      special?.type === 'shield' ? true : session.shield_active;

    await supabase
      .from('game_sessions')
      .update({
        revealed_safe: newRevealedSafe,
        current_multiplier: adjustedMultiplier,
        shield_active: newShieldActive,
      })
      .eq('id', sessionId);

    // Log tile reveal
    await supabase.from('tile_reveals').insert({
      session_id: sessionId,
      tile_index: tileIndex,
      tile_type: special?.type ?? 'safe',
    });

    const tileState = special?.type ?? 'safe';

    return NextResponse.json({
      phase: 'active',
      tileState,
      message,
      sessionUpdate: {
        revealedSafe: newRevealedSafe,
        currentMultiplier: adjustedMultiplier,
        shieldActive: newShieldActive,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
