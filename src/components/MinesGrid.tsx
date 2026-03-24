'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { TileState } from '@/lib/types';

const TILE_ICONS: Record<TileState, string> = {
  hidden: '',
  safe: '💎',
  mine: '💣',
  gold: '🥇',
  shield: '🛡️',
  booster: '🚀',
  mystery: '🎁',
};

const TILE_COLORS: Record<TileState, string> = {
  hidden: 'bg-mine-surface border-mine-border hover:border-mine-accent cursor-pointer',
  safe: 'bg-green-900/40 border-green-600',
  mine: 'bg-red-900/60 border-red-600 animate-shake',
  gold: 'bg-yellow-900/40 border-mine-gold animate-pulse-gold',
  shield: 'bg-blue-900/40 border-blue-500',
  booster: 'bg-purple-900/40 border-purple-500',
  mystery: 'bg-pink-900/40 border-pink-500',
};

export default function MinesGrid() {
  const { tiles, phase, revealTile, gridSize } = useGameStore();
  const cols = Math.round(Math.sqrt(gridSize));

  if (phase === 'idle') {
    return (
      <div className="flex items-center justify-center h-64 bg-mine-card border border-mine-border rounded-2xl text-gray-500">
        Set your bet and start the game
      </div>
    );
  }

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {tiles.map((state, index) => (
        <motion.button
          key={index}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15, delay: index * 0.005 }}
          disabled={state !== 'hidden' || phase !== 'active'}
          onClick={() => revealTile(index)}
          className={`aspect-square rounded-xl border-2 text-2xl flex items-center justify-center transition-all ${
            TILE_COLORS[state]
          } disabled:cursor-default`}
        >
          {state !== 'hidden' ? TILE_ICONS[state] : ''}
        </motion.button>
      ))}
    </div>
  );
}
