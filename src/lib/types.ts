export type GridSize = 9 | 25 | 49 | 100;

export type RiskPreset = 'safe' | 'balanced' | 'chaos' | 'custom';

export interface RiskConfig {
  label: string;
  mines: number;
  description: string;
}

export const RISK_PRESETS: Record<RiskPreset, (gridSize: GridSize) => RiskConfig> = {
  safe:     (g) => ({ label: 'Safe',     mines: Math.max(1, Math.floor(Math.sqrt(g) * 0.5)), description: 'Few mines, lower multipliers' }),
  balanced: (g) => ({ label: 'Balanced', mines: Math.max(2, Math.floor(Math.sqrt(g) * 1.0)), description: 'Standard risk/reward' }),
  chaos:    (g) => ({ label: 'Chaos',    mines: Math.max(3, Math.floor(Math.sqrt(g) * 2.0)), description: 'Many mines, huge multipliers' }),
  custom:   (_) => ({ label: 'Custom',   mines: 3, description: 'Set mine count manually' }),
};

/**
 * TileState values:
 *   hidden         – not yet revealed
 *   safe           – plain safe tile
 *   mine           – mine that was hit (game-losing)
 *   mine-revealed  – mine shown after a successful cashout
 *   gold           – special: gold tile pickup
 *   shield         – special: shield tile pickup (grants the buff)
 *   shield-blocked – the shield BUFF fired and absorbed a mine hit (NOT a tile pickup)
 *   booster        – special: booster tile pickup
 *   defuse         – special: defuser tile pickup
 *   mystery        – special: mystery tile pickup
 */
export type TileState =
  | 'hidden'
  | 'safe'
  | 'mine'
  | 'mine-revealed'
  | 'gold'
  | 'shield'
  | 'shield-blocked'
  | 'booster'
  | 'defuse'
  | 'mystery';

export type GamePhase = 'idle' | 'active' | 'won' | 'lost';

export interface SpecialTileStat {
  type: 'gold' | 'shield' | 'booster' | 'defuse' | 'mystery';
  index: number;
}

export interface GameSession {
  id: string;
  bet: number;
  gridSize: GridSize;
  mineCount: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  phase: GamePhase;
  revealedSafe: number;
  currentMultiplier: number;
  shieldActive: boolean;
  winnings: number;
  specialTilesFound: SpecialTileStat[];
}

export const SPECIAL_TILE_META: Record<
  'gold' | 'shield' | 'booster' | 'defuse' | 'mystery',
  { icon: string; label: string; color: string; description: string }
> = {
  gold:    { icon: '🥇', label: 'Gold',    color: 'text-yellow-400',  description: '2x multiplier boost' },
  shield:  { icon: '🛡️', label: 'Shield',  color: 'text-blue-400',   description: 'Absorbs 1 mine hit (-15% multiplier)' },
  booster: { icon: '🚀', label: 'Booster', color: 'text-purple-400', description: '+25% multiplier boost' },
  defuse:  { icon: '✂️', label: 'Defuser', color: 'text-cyan-400',   description: 'Neutralises 1 mine permanently' },
  mystery: { icon: '🎁', label: 'Mystery', color: 'text-pink-400',   description: 'Random: big win, nothing, or penalty' },
};
