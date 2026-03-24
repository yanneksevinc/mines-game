'use client';

import { useGameStore } from '@/store/gameStore';

export default function StatsBar() {
  const { session, phase, streak, lastMessage, bet } = useGameStore();

  const multiplier = session?.currentMultiplier ?? 1.0;
  const nextPayout = bet * multiplier;

  return (
    <div className="bg-mine-card border border-mine-border rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400">Multiplier</span>
          <span className="text-2xl font-bold text-mine-gold">
            {multiplier.toFixed(3)}×
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-400">Next payout</span>
          <span className="text-xl font-semibold text-mine-safe">
            {nextPayout.toFixed(2)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-400">Streak</span>
          <span className="text-xl font-semibold">
            {streak > 0 ? '🔥'.repeat(Math.min(streak, 5)) : '—'}
          </span>
        </div>
      </div>

      {lastMessage && (
        <div className="text-sm text-center py-1 px-3 rounded-lg bg-mine-surface text-gray-300">
          {lastMessage}
        </div>
      )}

      {phase === 'won' && (
        <div className="text-center text-mine-safe font-bold text-lg">
          ✅ You won {session?.winnings?.toFixed(2)}!
        </div>
      )}
      {phase === 'lost' && (
        <div className="text-center text-mine-danger font-bold text-lg">
          💥 You hit a mine. Better luck next time.
        </div>
      )}
    </div>
  );
}
