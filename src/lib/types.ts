export type GridSize = 9 | 25 | 49 | 100; // 3×3, 5×5, 7×7, 10×10

export type RiskPreset = 'safe' | 'balanced' | 'chaos' | 'custom';

export interface RiskConfig {
  label: string;
  mines: number;
  description: string;
}

export const RISK_PRESETS: Record<RiskPreset, (gridSize: GridSize) => RiskConfig> = {
  safe:     (g) => ({ label: '🟢 Safe',     mines: Math.max(1, Math.floor(Math.sqrt(g) * 0.5)), description: 'Few mines, lower multipliers' }),
  balanced: (g) => ({ label: '🟡 Balanced', mines: Math.max(2, Math.floor(Math.sqrt(g) * 1.0)), description: 'Standard risk/reward' }),
  chaos:    (g) => ({ label: '🔴 Chaos',    mines: Math.max(3, Math.floor(Math.sqrt(g) * 2.0)), description: 'Many mines, huge multipliers' }),
  custom:   (_) => ({ label: '⚙️ Custom',   mines: 3, description: 'Set mine count manually' }),
};

export type TileState = 'hidden' | 'safe' | 'mine' | 'gold' | 'shield' | 'booster' | 'mystery';

export type GamePhase = 'idle' | 'active' | 'won' | 'lost';

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
}
