import { create } from 'zustand';
import { GamePhase, GameSession, GridSize, RiskPreset, SpecialTileStat, TileState } from '@/lib/types';
import { apiFetch, log } from '@/lib/logger';

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
    const { bet, gridSize, mineCount, phase } = get();
    const reqBody = { bet, gridSize, mineCount };

    log.stateTransition(phase, 'active', { bet, gridSize, mineCount });

    let result: Awaited<ReturnType<typeof apiFetch>>;
    try {
      result = await apiFetch('/api/game/start', reqBody);
    } catch (err) {
      log.error('startGame: fetch threw unexpectedly', err);
      return;
    }

    const { ok, data } = result as { ok: boolean; status: number; data: Record<string, unknown> };
    if (!ok) {
      log.error('startGame: server returned error', data);
      return;
    }

    const newSession: GameSession = { ...(data.session as GameSession), specialTilesFound: [] };
    log.info('startGame: session created', {
      sessionId: newSession.id,
      gridSize,
      mineCount,
      bet,
      houseEdge: newSession.houseEdge,
    });

    set({
      session: newSession,
      phase: 'active',
      tiles: Array(gridSize).fill('hidden') as TileState[],
      lastMessage: '',
      provenSeed: null,
    });
  },

  revealTile: async (index) => {
    const { session, tiles, autoCashout } = get();
    if (!session || tiles[index] !== 'hidden') {
      if (!session) log.warn('revealTile: called with no active session');
      if (tiles[index] !== 'hidden') log.warn(`revealTile: tile[${index}] already revealed (state: ${tiles[index]})`);
      return;
    }

    const reqBody = { sessionId: session.id, tileIndex: index };

    let result: Awaited<ReturnType<typeof apiFetch>>;
    try {
      result = await apiFetch('/api/game/reveal', reqBody);
    } catch (err) {
      log.error('revealTile: fetch threw unexpectedly', err);
      return;
    }

    const { ok, data } = result as { ok: boolean; status: number; data: Record<string, unknown> };
    if (!ok) {
      log.error('revealTile: server returned error', data);
      return;
    }

    const newTiles = [...tiles] as TileState[];
    newTiles[index] = data.tileState as TileState;

    const sessionUpdate = data.sessionUpdate as Record<string, unknown> | undefined;
    log.tileReveal(
      index,
      data.tileState as string,
      sessionUpdate?.currentMultiplier as number | undefined,
      data.message as string | undefined
    );

    if (data.phase === 'lost') {
      (data.minePositions as number[])?.forEach((i) => { if (newTiles[i] === 'hidden') newTiles[i] = 'mine'; });
      log.stateTransition('active', 'lost', {
        hitTile: index,
        minePositions: data.minePositions,
      });
      set({ tiles: newTiles, phase: 'lost', lastMessage: '💥 Mine hit! Streak reset.', streak: 0 });
      return;
    }

    const specialTypes = ['gold', 'shield', 'booster', 'defuse', 'mystery'];
    const newSpecialsFound: SpecialTileStat[] = [...(session.specialTilesFound ?? [])];
    if (specialTypes.includes(data.tileState as string)) {
      newSpecialsFound.push({ type: data.tileState as SpecialTileStat['type'], index });
      log.info(`revealTile: special tile triggered — ${data.tileState}`, {
        tile: index,
        message: data.message,
        multiplier: sessionUpdate?.currentMultiplier,
        shieldActive: sessionUpdate?.shieldActive,
      });
    }

    const updatedSession: GameSession = { ...session, ...sessionUpdate, specialTilesFound: newSpecialsFound };
    set({ tiles: newTiles, session: updatedSession, lastMessage: (data.message as string) ?? '' });

    if (autoCashout && (updatedSession.currentMultiplier ?? 0) >= autoCashout) {
      log.info(`revealTile: auto-cashout triggered at ${updatedSession.currentMultiplier?.toFixed(3)}x (threshold: ${autoCashout}x)`);
      get().cashOut();
    }
  },

  cashOut: async () => {
    const { session, streak, tiles, phase } = get();
    if (!session) {
      log.warn('cashOut: called with no active session');
      return;
    }

    const reqBody = { sessionId: session.id };
    log.stateTransition(phase, 'won', {
      sessionId: session.id,
      currentMultiplier: session.currentMultiplier,
    });

    let result: Awaited<ReturnType<typeof apiFetch>>;
    try {
      result = await apiFetch('/api/game/cashout', reqBody);
    } catch (err) {
      log.error('cashOut: fetch threw unexpectedly', err);
      return;
    }

    const { ok, data } = result as { ok: boolean; status: number; data: Record<string, unknown> };
    if (!ok) {
      log.error('cashOut: server returned error', data);
      return;
    }

    const newTiles = [...tiles] as TileState[];
    (data.minePositions as number[])?.forEach((i) => { if (newTiles[i] === 'hidden') newTiles[i] = 'mine-revealed'; });

    const multiplier = data.multiplier as number;
    const winnings = data.winnings as number;

    log.info('cashOut: round complete', {
      multiplier: multiplier.toFixed(4),
      winnings: winnings.toFixed(2),
      bet: session.bet,
      mineCount: session.mineCount,
      gridSize: session.gridSize,
      revealedSafe: session.revealedSafe,
      serverSeed: data.serverSeed,
      specialTilesFound: session.specialTilesFound,
      newStreak: streak + 1,
    });

    set({
      phase: 'won',
      tiles: newTiles,
      session: { ...session, winnings },
      streak: streak + 1,
      lastMessage: `✅ Cashed out at ${multiplier.toFixed(3)}x — won ${winnings.toFixed(2)}`,
      provenSeed: (data.serverSeed as string) ?? null,
    });
  },

  resetGame: () => {
    const { phase } = get();
    log.stateTransition(phase, 'idle');
    set({ session: null, phase: 'idle', tiles: [], lastMessage: '', provenSeed: null });
  },
}));
