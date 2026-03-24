import { create } from 'zustand';
import { GamePhase, GameSession, GridSize, RiskPreset, TileState } from '@/lib/types';

interface GameStore {
  // Current session
  session: GameSession | null;
  phase: GamePhase;
  tiles: TileState[];
  gridSize: GridSize;
  mineCount: number;
  bet: number;
  riskPreset: RiskPreset;
  streak: number;
  lastMessage: string;
  autoCashout: number | null;

  // Actions
  setGridSize: (size: GridSize) => void;
  setMineCount: (count: number) => void;
  setBet: (amount: number) => void;
  setRiskPreset: (preset: RiskPreset) => void;
  setAutoCashout: (multiplier: number | null) => void;
  startGame: () => Promise<void>;
  revealTile: (index: number) => Promise<void>;
  cashOut: () => Promise<void>;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  session: null,
  phase: 'idle',
  tiles: [],
  gridSize: 25,
  mineCount: 3,
  bet: 10,
  riskPreset: 'balanced',
  streak: 0,
  lastMessage: '',
  autoCashout: null,

  setGridSize: (size) => set({ gridSize: size }),
  setMineCount: (count) => set({ mineCount: count }),
  setBet: (amount) => set({ bet: amount }),
  setRiskPreset: (preset) => set({ riskPreset: preset }),
  setAutoCashout: (multiplier) => set({ autoCashout: multiplier }),

  startGame: async () => {
    const { bet, gridSize, mineCount } = get();
    const res = await fetch('/api/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet, gridSize, mineCount }),
    });
    const data = await res.json();
    if (!res.ok) return;

    set({
      session: data.session,
      phase: 'active',
      tiles: Array(gridSize).fill('hidden'),
      lastMessage: '',
    });
  },

  revealTile: async (index) => {
    const { session, tiles, autoCashout } = get();
    if (!session || tiles[index] !== 'hidden') return;

    const res = await fetch('/api/game/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, tileIndex: index }),
    });
    const data = await res.json();
    if (!res.ok) return;

    const newTiles = [...tiles];
    newTiles[index] = data.tileState as TileState;

    if (data.phase === 'lost') {
      // Reveal all mine positions
      data.minePositions?.forEach((i: number) => {
        if (newTiles[i] === 'hidden') newTiles[i] = 'mine';
      });
      set({ tiles: newTiles, phase: 'lost', lastMessage: '💥 Mine hit!', streak: 0 });
    } else {
      const updatedSession = { ...session, ...data.sessionUpdate };
      set({ tiles: newTiles, session: updatedSession, lastMessage: data.message ?? '' });

      // Auto cashout check
      if (autoCashout && updatedSession.currentMultiplier >= autoCashout) {
        get().cashOut();
      }
    }
  },

  cashOut: async () => {
    const { session, streak } = get();
    if (!session) return;

    const res = await fetch('/api/game/cashout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    });
    const data = await res.json();
    if (!res.ok) return;

    set({
      phase: 'won',
      session: { ...session, winnings: data.winnings },
      streak: streak + 1,
      lastMessage: `✅ Cashed out at ${data.multiplier.toFixed(3)}× — won ${data.winnings.toFixed(2)}`,
    });
  },

  resetGame: () => {
    set({ session: null, phase: 'idle', tiles: [], lastMessage: '' });
  },
}));
