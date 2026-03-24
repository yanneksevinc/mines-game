import crypto from 'crypto';

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

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashServerSeed(serverSeed: string): string {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

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
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const byteOffset = (i * 4) % 32;
    const rand = parseInt(hash.substring(byteOffset * 2, byteOffset * 2 + 8), 16) / 0xffffffff;
    const j = Math.floor(rand * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, mineCount);
}

export type SpecialTileType = 'gold' | 'shield' | 'booster' | 'defuse' | 'mystery';

export interface SpecialTile {
  index: number;
  type: SpecialTileType;
}

/**
 * Compute the shield spawn probability for a given mine count.
 *
 * The shield's EV advantage is proportional to the probability of hitting the
 * single mine it can absorb. With very few mines the shield is worth a huge
 * fraction of the board's expected value, so we suppress it entirely at low
 * counts and ramp up linearly to the standard 4% above the threshold.
 *
 *   mines <= 3  → 0%   (shield suppressed — loophole fix)
 *   mines == 4  → 1%
 *   mines == 5  → 2%
 *   mines == 6  → 3%
 *   mines >= 7  → 4%   (full probability)
 */
export function shieldSpawnProb(mineCount: number): number {
  if (mineCount <= 3) return 0;
  if (mineCount >= 7) return 0.04;
  // linear ramp: 1% per extra mine above 3
  return (mineCount - 3) * 0.01;
}

/**
 * Compute the multiplier retention factor when a shield absorbs a mine.
 *
 * With few mines the shield saves a disproportionately large EV, so the
 * penalty must be larger to compensate. We tie the penalty to mine density
 * (mines / total tiles):
 *
 *   density >= 0.30 → retain 85%  (light penalty, high-risk game)
 *   density <= 0.04 → retain 40%  (heavy penalty, low-risk game)
 *
 * Linear interpolation between those two anchors.
 */
export function shieldPenaltyFactor(mineCount: number, gridSize: number): number {
  const density = mineCount / gridSize;
  const MIN_DENSITY = 0.04;  // 1 mine on 25 tiles
  const MAX_DENSITY = 0.30;
  const MIN_RETAIN  = 0.40;  // heavy penalty at low density
  const MAX_RETAIN  = 0.85;  // light penalty at high density

  const clamped = Math.min(Math.max(density, MIN_DENSITY), MAX_DENSITY);
  const t = (clamped - MIN_DENSITY) / (MAX_DENSITY - MIN_DENSITY);
  return MIN_RETAIN + t * (MAX_RETAIN - MIN_RETAIN);
}

/**
 * Spawn probabilities per safe tile:
 *   gold:    8%
 *   shield:  0–4%  (scales with mine count — see shieldSpawnProb)
 *   booster: 6%
 *   defuse:  3%
 *   mystery: 3%
 *
 * At 1-3 mines shield probability is 0, protecting the house edge.
 */
export function generateSpecialTiles(
  total: number,
  minePositions: number[],
  serverSeed: string
): SpecialTile[] {
  const mineCount = minePositions.length;
  const mineSet = new Set(minePositions);
  const safeTiles = Array.from({ length: total }, (_, i) => i).filter(i => !mineSet.has(i));
  const specials: SpecialTile[] = [];

  const types: SpecialTileType[] = ['gold', 'shield', 'booster', 'defuse', 'mystery'];
  const probs = [
    0.08,                          // gold
    shieldSpawnProb(mineCount),    // shield — dynamically scaled
    0.06,                          // booster
    0.03,                          // defuse
    0.03,                          // mystery
  ];

  safeTiles.forEach((tileIndex, i) => {
    const hash = crypto.createHmac('sha256', serverSeed).update(`special:${tileIndex}:${i}`).digest('hex');
    const roll = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
    let cumulative = 0;
    for (let t = 0; t < types.length; t++) {
      cumulative += probs[t];
      if (roll < cumulative) { specials.push({ index: tileIndex, type: types[t] }); break; }
    }
  });
  return specials;
}

export function applySpecialTileEffect(
  baseMultiplier: number,
  tileType: SpecialTileType | null,
  currentMinePositions: number[]
): { multiplier: number; message: string; newMinePositions: number[] } {
  switch (tileType) {
    case 'gold':
      return { multiplier: baseMultiplier * 2, message: '\ud83e\udd47 Gold tile! 2x multiplier boost!', newMinePositions: currentMinePositions };
    case 'shield':
      // Shield activation cost is zero here — the multiplier penalty is applied
      // in the reveal route when the shield actually fires (absorbs a mine hit),
      // using shieldPenaltyFactor() which accounts for mine density.
      return { multiplier: baseMultiplier, message: '\ud83d\udee1\ufe0f Shield activated! You can survive one mine hit.', newMinePositions: currentMinePositions };
    case 'booster':
      return { multiplier: baseMultiplier * 1.25, message: '\ud83d\ude80 Booster! +25% multiplier!', newMinePositions: currentMinePositions };
    case 'defuse': {
      if (currentMinePositions.length === 0) {
        return { multiplier: baseMultiplier, message: '\u2702\ufe0f Defuser - no mines left to defuse!', newMinePositions: currentMinePositions };
      }
      const removeIdx = Math.floor(Math.random() * currentMinePositions.length);
      const newMines = currentMinePositions.filter((_, i) => i !== removeIdx);
      return {
        multiplier: baseMultiplier,
        message: `\u2702\ufe0f Defuser! One mine neutralised. ${newMines.length} mine${newMines.length !== 1 ? 's' : ''} remaining.`,
        newMinePositions: newMines,
      };
    }
    case 'mystery': {
      const roll = Math.random();
      if (roll < 0.10) return { multiplier: baseMultiplier * 1.5, message: '\ud83c\udf81 Mystery: Lucky! +50% bonus!', newMinePositions: currentMinePositions };
      if (roll < 0.40) return { multiplier: baseMultiplier, message: '\ud83c\udf81 Mystery: Nothing happened.', newMinePositions: currentMinePositions };
      return { multiplier: baseMultiplier * 0.85, message: '\ud83c\udf81 Mystery: Ouch. -15% penalty.', newMinePositions: currentMinePositions };
    }
    default:
      return { multiplier: baseMultiplier, message: '', newMinePositions: currentMinePositions };
  }
}
