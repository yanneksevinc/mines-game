import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  generateServerSeed,
  hashServerSeed,
  generateMinePositions,
  generateSpecialTiles,
} from '@/lib/gameLogic';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { bet, gridSize, mineCount } = await req.json();

    // Basic validation
    if (
      typeof bet !== 'number' || bet <= 0 ||
      typeof gridSize !== 'number' || ![9, 25, 49, 100].includes(gridSize) ||
      typeof mineCount !== 'number' || mineCount < 1 || mineCount >= gridSize - 1
    ) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const sessionId = uuidv4();
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = uuidv4(); // In production: let the user provide this
    const nonce = 1;

    const minePositions = generateMinePositions(gridSize, mineCount, serverSeed, clientSeed, nonce);
    const specialTiles = generateSpecialTiles(gridSize, minePositions, serverSeed);

    const supabase = createServiceClient();

    const { error } = await supabase.from('game_sessions').insert({
      id: sessionId,
      bet,
      grid_size: gridSize,
      mine_count: mineCount,
      server_seed: serverSeed,       // stored server-side only
      server_seed_hash: serverSeedHash,
      client_seed: clientSeed,
      nonce,
      mine_positions: minePositions,
      special_tiles: specialTiles,
      status: 'active',
      revealed_safe: 0,
      current_multiplier: 1.0,
      shield_active: false,
      house_edge: parseFloat(process.env.HOUSE_EDGE ?? '0.01'),
    });

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({
      session: {
        id: sessionId,
        bet,
        gridSize,
        mineCount,
        serverSeedHash,
        clientSeed,
        nonce,
        phase: 'active',
        revealedSafe: 0,
        currentMultiplier: 1.0,
        shieldActive: false,
        winnings: 0,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
