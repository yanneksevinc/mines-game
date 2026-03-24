'use client';

import { useGameStore } from '@/store/gameStore';
import { SPECIAL_TILE_META } from '@/lib/types';

export default function StatsBar() {
  const { session, phase, streak, lastMessage, bet, provenSeed } = useGameStore();

  const multiplier = session?.currentMultiplier ?? 1.0;
  const nextPayout = bet * multiplier;
  const specialsFound = session?.specialTilesFound ?? [];
  const shieldActive = session?.shieldActive ?? false;
  const mineCount = session?.mineCount ?? 0;

  return (
    <div className="bg-mine-card border border-mine-border rounded-2xl p-4 flex flex-col gap-3">

      {/* Multiplier / Payout / Streak row */}
      <div className="flex items-stretch justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Multiplier</span>
          <span className={`text-2xl font-bold tabular-nums ${
            phase === 'won' ? 'text-mine-safe' : phase === 'lost' ? 'text-mine-danger' : 'text-mine-gold'
          }`}>
            {multiplier.toFixed(3)}×
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Payout</span>
          <span className="text-2xl font-semibold tabular-nums text-white">{nextPayout.toFixed(2)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Streak</span>
          <div className="flex items-center gap-1">
            {streak > 0 ? (
              <>
                <span className="text-xl">{streak >= 5 ? '🔥' : streak >= 3 ? '⚡' : '✨'}</span>
                <span className="text-xl font-bold text-orange-400">{streak}</span>
              </>
            ) : (
              <span className="text-gray-500 text-lg">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Live status chips: shield + mine count */}
      {phase === 'active' && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
            shieldActive
              ? 'bg-blue-900/40 border-blue-500 text-blue-300'
              : 'bg-mine-surface border-mine-border text-gray-500'
          }`}>
            <span>{shieldActive ? '🛡️' : '⚠️'}</span>
            <span>{shieldActive ? 'Shield active' : 'No shield'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-mine-surface border-mine-border text-gray-400">
            <span>💣</span>
            <span>{mineCount} mine{mineCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Special tiles found this session */}
      {specialsFound.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Special tiles found</span>
          <div className="flex flex-wrap gap-1.5">
            {specialsFound.map((s, i) => {
              const meta = SPECIAL_TILE_META[s.type];
              return (
                <div key={i} title={meta.description}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border border-white/10 bg-white/5 ${meta.color}`}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event message */}
      {lastMessage && (
        <div className="text-sm text-center py-1.5 px-3 rounded-lg bg-mine-surface border border-mine-border/50 text-gray-200">
          {lastMessage}
        </div>
      )}

      {/* End-game banners */}
      {phase === 'won' && (
        <div className="rounded-xl bg-green-900/30 border border-green-700 p-3">
          <div className="text-mine-safe font-bold text-center text-lg">
            ✅ Won {session?.winnings?.toFixed(2)} at {multiplier.toFixed(3)}×
          </div>
          {streak >= 2 && (
            <div className="text-orange-400 text-sm text-center mt-1">
              🔥 {streak} win streak!
            </div>
          )}
          {provenSeed && (
            <div className="mt-2 text-xs text-center text-gray-500">
              Seed: <span className="font-mono text-gray-400">{provenSeed.substring(0, 20)}…</span>
            </div>
          )}
        </div>
      )}

      {phase === 'lost' && (
        <div className="rounded-xl bg-red-900/30 border border-red-800 p-3 text-center">
          <div className="text-mine-danger font-bold text-lg">💥 Mine hit. Streak reset.</div>
        </div>
      )}
    </div>
  );
}
