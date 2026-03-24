import { create } from 'zustand';
import { GamePhase, GameSession, GridSize, RiskPreset, SpecialTileStat, TileState } from '@/lib/types';

interface GameStore {
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
  provenSeed: string | null;

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
  provenSeed: null,

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
      session: { ...data.session, specialTilesFound: [] },
      phase: 'active',
      tiles: Array(gridSize).fill('hidden') as TileState[],
      lastMessage: '',
      provenSeed: null,
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

    const newTiles = [...tiles] as TileState[];
    newTiles[index] = data.tileState as TileState;

    if (data.phase === 'lost') {
      (data.minePositions as number[])?.forEach((i) => { if (newTiles[i] === 'hidden') newTiles[i] = 'mine'; });
      set({ tiles: newTiles, phase: 'lost', lastMessage: '💥 Mine hit! Streak reset.', streak: 0 });
      return;
    }

    const specialTypes = ['gold', 'shield', 'booster', 'defuse', 'mystery'];
    const newSpecialsFound: SpecialTileStat[] = [...(session.specialTilesFound ?? [])];
    if (specialTypes.includes(data.tileState)) {
      newSpecialsFound.push({ type: data.tileState as SpecialTileStat['type'], index });
    }

    const updatedSession: GameSession = { ...session, ...data.sessionUpdate, specialTilesFound: newSpecialsFound };
    set({ tiles: newTiles, session: updatedSession, lastMessage: data.message ?? '' });

    if (autoCashout && updatedSession.currentMultiplier >= autoCashout) get().cashOut();
  },

  cashOut: async () => {
    const { session, streak, tiles } = get();
    if (!session) return;
    const res = await fetch('/api/game/cashout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    });
    const data = await res.json();
    if (!res.ok) return;

    // Reveal all mines with a distinct 'mine-revealed' style after cashout
    const newTiles = [...tiles] as TileState[];
    (data.minePositions as number[])?.forEach((i) => { if (newTiles[i] === 'hidden') newTiles[i] = 'mine-revealed'; });

    set({
      phase: 'won',
      tiles: newTiles,
      session: { ...session, winnings: data.winnings },
      streak: streak + 1,
      lastMessage: `✅ Cashed out at ${(data.multiplier as number).toFixed(3)}x — won ${(data.winnings as number).toFixed(2)}`,
      provenSeed: data.serverSeed ?? null,
    });
  },

  resetGame: () => set({ session: null, phase: 'idle', tiles: [], lastMessage: '', provenSeed: null }),
}));
