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
 * Spawn probabilities per safe tile:
 *   gold: 8%, shield: 4%, booster: 6%, defuse: 3%, mystery: 3%
 */
export function generateSpecialTiles(
  total: number,
  minePositions: number[],
  serverSeed: string
): SpecialTile[] {
  const mineSet = new Set(minePositions);
  const safeTiles = Array.from({ length: total }, (_, i) => i).filter(i => !mineSet.has(i));
  const specials: SpecialTile[] = [];
  const types: SpecialTileType[] = ['gold', 'shield', 'booster', 'defuse', 'mystery'];
  const probs = [0.08, 0.04, 0.06, 0.03, 0.03];

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
      return { multiplier: baseMultiplier * 2, message: '🥇 Gold tile! 2x multiplier boost!', newMinePositions: currentMinePositions };
    case 'shield':
      return { multiplier: baseMultiplier, message: '🛡️ Shield activated! You can survive one mine hit.', newMinePositions: currentMinePositions };
    case 'booster':
      return { multiplier: baseMultiplier * 1.25, message: '🚀 Booster! +25% multiplier!', newMinePositions: currentMinePositions };
    case 'defuse': {
      if (currentMinePositions.length === 0) {
        return { multiplier: baseMultiplier, message: '✂️ Defuser - no mines left to defuse!', newMinePositions: currentMinePositions };
      }
      const removeIdx = Math.floor(Math.random() * currentMinePositions.length);
      const newMines = currentMinePositions.filter((_, i) => i !== removeIdx);
      return {
        multiplier: baseMultiplier,
        message: `✂️ Defuser! One mine neutralised. ${newMines.length} mine${newMines.length !== 1 ? 's' : ''} remaining.`,
        newMinePositions: newMines,
      };
    }
    case 'mystery': {
      const roll = Math.random();
      if (roll < 0.10) return { multiplier: baseMultiplier * 1.5, message: '🎁 Mystery: Lucky! +50% bonus!', newMinePositions: currentMinePositions };
      if (roll < 0.40) return { multiplier: baseMultiplier, message: '🎁 Mystery: Nothing happened.', newMinePositions: currentMinePositions };
      return { multiplier: baseMultiplier * 0.85, message: '🎁 Mystery: Ouch. -15% penalty.', newMinePositions: currentMinePositions };
    }
    default:
      return { multiplier: baseMultiplier, message: '', newMinePositions: currentMinePositions };
  }
}
