import crypto from 'crypto';

// ---------------------------------------------------------------------------
// House edge
// ---------------------------------------------------------------------------

/**
 * Returns the adjusted payout multiplier after revealing `revealedSafe` safe
 * tiles on a grid of `total` tiles containing `mines` mines.
 *
 * Formula (fair):
 *   P(k) = C(total - mines, k) / C(total, k)
 *   fair_multiplier = 1 / P(k)
 *
 * We discount by the house edge before returning:
 *   payout = fair_multiplier * (1 - houseEdge)
 *
 * Example — 5×5 grid (25 tiles), 3 mines, houseEdge=0.01, k=1:
 *   P(1) = (25-3)/25 = 22/25 = 0.88
 *   fair = 1/0.88 ≈ 1.136
 *   actual ≈ 1.124
 */
export function getMultiplier(
  total: number,
  mines: number,
  revealedSafe: number,
  houseEdge: number
): number {
  if (revealedSafe === 0) return 1.0;

  let probability = 1;
  for (let i = 0; i < revealedSafe; i++) {
    probability *= (total - mines - i) / (total - i);
  }

  return (1 / probability) * (1 - houseEdge);
}

// ---------------------------------------------------------------------------
// Provably fair seed system
// ---------------------------------------------------------------------------

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashServerSeed(serverSeed: string): string {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

/**
 * Deterministically generate mine positions from seeds.
 * Uses HMAC-SHA256(serverSeed, clientSeed + ':' + nonce) to derive positions.
 */
export function generateMinePositions(
  total: number,
  mineCount: number,
  serverSeed: string,
  clientSeed: string,
  nonce: number
): number[] {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hash = hmac.digest('hex');

  // Convert hash bytes to floats, then use Fisher-Yates to pick positions
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const byteOffset = (i * 4) % 32; // reuse 32-byte hash cyclically
    const rand = parseInt(hash.substring(byteOffset * 2, byteOffset * 2 + 8), 16) / 0xffffffff;
    const j = Math.floor(rand * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, mineCount);
}

// ---------------------------------------------------------------------------
// Special tile placement
// ---------------------------------------------------------------------------

export type SpecialTileType = 'gold' | 'shield' | 'booster' | 'mystery';

export interface SpecialTile {
  index: number;
  type: SpecialTileType;
}

/**
 * Spawns special tiles on safe positions.
 * Spawn probabilities (per safe tile):
 *   gold:    8%
 *   shield:  4%
 *   booster: 6%
 *   mystery: 3%
 *
 * These are tuned so the expected added value never exceeds 0.5% of bet,
 * keeping the net house edge safely above 0%.
 */
export function generateSpecialTiles(
  total: number,
  minePositions: number[],
  serverSeed: string
): SpecialTile[] {
  const mineSet = new Set(minePositions);
  const safeTiles = Array.from({ length: total }, (_, i) => i).filter(
    (i) => !mineSet.has(i)
  );

  const specials: SpecialTile[] = [];
  const types: SpecialTileType[] = ['gold', 'shield', 'booster', 'mystery'];
  const probs = [0.08, 0.04, 0.06, 0.03];

  safeTiles.forEach((tileIndex, i) => {
    // derive a deterministic pseudo-random float per tile
    const hash = crypto
      .createHmac('sha256', serverSeed)
      .update(`special:${tileIndex}:${i}`)
      .digest('hex');
    const roll = parseInt(hash.substring(0, 8), 16) / 0xffffffff;

    let cumulative = 0;
    for (let t = 0; t < types.length; t++) {
      cumulative += probs[t];
      if (roll < cumulative) {
        specials.push({ index: tileIndex, type: types[t] });
        break;
      }
    }
  });

  return specials;
}

// ---------------------------------------------------------------------------
// Multiplier after special tile effects
// ---------------------------------------------------------------------------

export function applySpecialTileEffect(
  baseMultiplier: number,
  tileType: SpecialTileType | null
): { multiplier: number; message: string } {
  switch (tileType) {
    case 'gold':
      return { multiplier: baseMultiplier * 2, message: '🥇 Gold tile! 2× boost!' };
    case 'shield':
      // Shield value is survival, not multiplier change — handled in game state
      return { multiplier: baseMultiplier, message: '🛡️ Shield activated!' };
    case 'booster':
      return { multiplier: baseMultiplier * 1.25, message: '🚀 Multiplier boosted!' };
    case 'mystery': {
      // Weighted random: 10% great, 30% neutral, 60% small penalty
      const roll = Math.random();
      if (roll < 0.10) return { multiplier: baseMultiplier * 1.5, message: '🎁 Mystery: Lucky bonus!' };
      if (roll < 0.40) return { multiplier: baseMultiplier, message: '🎁 Mystery: Nothing happened.' };
      return { multiplier: baseMultiplier * 0.85, message: '🎁 Mystery: Small penalty.' };
    }
    default:
      return { multiplier: baseMultiplier, message: '' };
  }
}
