'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { TileState } from '@/lib/types';

const TILE_ICONS: Record<TileState, string> = {
  hidden:            '',
  safe:              '\ud83d\udc8e',
  mine:              '\ud83d\udca3',
  'mine-revealed':   '\ud83d\udca3',
  gold:              '\ud83e\udd47',
  shield:            '\ud83d\udee1\ufe0f',
  'shield-blocked':  '\ud83d\udee1\ufe0f',  // shield buff fired, mine absorbed
  booster:           '\ud83d\ude80',
  defuse:            '\u2702\ufe0f',
  mystery:           '\ud83c\udf81',
};

const TILE_BG: Record<TileState, string> = {
  hidden:            'bg-mine-surface border-mine-border hover:border-mine-accent hover:bg-[#1e1e3a] cursor-pointer active:scale-95',
  safe:              'bg-green-900/40 border-green-600',
  mine:              'bg-red-900/70 border-red-500 animate-shake',
  'mine-revealed':   'bg-gray-800/50 border-gray-700 opacity-50',
  gold:              'bg-yellow-900/50 border-yellow-400 shadow-[0_0_12px_2px_rgba(250,204,21,0.45)]',
  shield:            'bg-blue-900/50 border-blue-400 shadow-[0_0_12px_2px_rgba(96,165,250,0.45)]',
  // shield-blocked: dimmer blue — visually distinct from a fresh shield pickup
  'shield-blocked':  'bg-blue-900/20 border-blue-700/60 opacity-70',
  booster:           'bg-purple-900/50 border-purple-400 shadow-[0_0_12px_2px_rgba(167,139,250,0.45)]',
  defuse:            'bg-cyan-900/50 border-cyan-400 shadow-[0_0_12px_2px_rgba(34,211,238,0.45)]',
  mystery:           'bg-pink-900/50 border-pink-400 shadow-[0_0_12px_2px_rgba(244,114,182,0.45)]',
};

export default function MinesGrid() {
  const { tiles, phase, revealTile, gridSize } = useGameStore();
  const cols = Math.round(Math.sqrt(gridSize));
  const textSize = gridSize <= 9 ? 'text-4xl' : gridSize <= 25 ? 'text-2xl' : gridSize <= 49 ? 'text-lg' : 'text-xs';

  if (phase === 'idle') {
    return (
      <div className="flex items-center justify-center h-64 bg-mine-card border border-mine-border rounded-2xl text-gray-500 text-sm">
        Set your bet and start the game \ud83d\udca3
      </div>
    );
  }

  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {tiles.map((state, index) => {
        const isHidden = state === 'hidden';
        const isSpecial = ['gold', 'shield', 'booster', 'defuse', 'mystery'].includes(state);
        // shield-blocked uses a fade-in (not a spring pop) since it\'s an event, not a collectible
        const isShieldBlock = state === 'shield-blocked';

        return (
          <motion.button
            key={index}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.12, delay: index * 0.004 }}
            layout
            disabled={!isHidden || phase !== 'active'}
            onClick={() => revealTile(index)}
            className={[
              'aspect-square rounded-xl border-2 flex items-center justify-center transition-all duration-150 select-none font-bold',
              TILE_BG[state],
              textSize,
              'disabled:cursor-default',
            ].join(' ')}
          >
            {!isHidden && (
              <motion.span
                initial={
                  isSpecial
                    ? { scale: 0, rotate: -20 }
                    : isShieldBlock
                    ? { opacity: 0, scale: 1.3 }
                    : { rotateY: 90, opacity: 0 }
                }
                animate={
                  isSpecial
                    ? { scale: 1, rotate: 0 }
                    : isShieldBlock
                    ? { opacity: 1, scale: 1 }
                    : { rotateY: 0, opacity: 1 }
                }
                transition={{
                  duration: 0.22,
                  type: isSpecial ? 'spring' : 'tween',
                  bounce: isSpecial ? 0.4 : 0,
                }}
                className="leading-none"
              >
                {TILE_ICONS[state]}
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
