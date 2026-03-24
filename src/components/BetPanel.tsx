'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { RISK_PRESETS, SPECIAL_TILE_META, GridSize, RiskPreset } from '@/lib/types';

const GRID_OPTIONS: { label: string; value: GridSize }[] = [
  { label: '3×3', value: 9 },
  { label: '5×5', value: 25 },
  { label: '7×7', value: 49 },
  { label: '10×10', value: 100 },
];

const RISK_OPTIONS: RiskPreset[] = ['safe', 'balanced', 'chaos', 'custom'];
const SPECIAL_TYPES = Object.entries(SPECIAL_TILE_META) as [
  keyof typeof SPECIAL_TILE_META,
  (typeof SPECIAL_TILE_META)[keyof typeof SPECIAL_TILE_META]
][];

export default function BetPanel() {
  const {
    phase, bet, gridSize, mineCount, riskPreset,
    setBet, setGridSize, setMineCount, setRiskPreset,
    startGame, cashOut, resetGame,
    autoCashout, setAutoCashout,
  } = useGameStore();

  const [showLegend, setShowLegend] = useState(false);

  const handleRiskChange = (p: RiskPreset) => {
    setRiskPreset(p);
    if (p !== 'custom') setMineCount(RISK_PRESETS[p](gridSize).mines);
  };

  const handleGridChange = (size: GridSize) => {
    setGridSize(size);
    if (riskPreset !== 'custom') setMineCount(RISK_PRESETS[riskPreset](size).mines);
  };

  return (
    <div className="bg-mine-card border border-mine-border rounded-2xl p-5 flex flex-col gap-4 w-full lg:w-64 shrink-0">
      <h2 className="text-lg font-semibold text-white">Bet</h2>

      {/* Amount */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 uppercase tracking-wide">Amount</label>
        <input
          type="number" min={1} value={bet} disabled={phase === 'active'}
          onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
          className="bg-mine-surface border border-mine-border rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-mine-accent"
        />
        <div className="flex gap-1.5 mt-1">
          {([0.5, 2, 5] as const).map((f) => (
            <button key={f} disabled={phase === 'active'}
              onClick={() => setBet(Math.max(1, Math.round(bet * f)))}
              className="flex-1 text-xs bg-mine-surface border border-mine-border rounded px-2 py-1 text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-40 transition"
            >
              {f === 0.5 ? '½' : `${f}×`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 uppercase tracking-wide">Grid</label>
        <div className="grid grid-cols-2 gap-1">
          {GRID_OPTIONS.map(({ label, value }) => (
            <button key={value} disabled={phase === 'active'} onClick={() => handleGridChange(value)}
              className={`text-sm rounded-lg px-2 py-2 border transition ${
                gridSize === value ? 'bg-mine-accent border-mine-accent text-white' : 'bg-mine-surface border-mine-border text-gray-300 hover:text-white'
              } disabled:opacity-40`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Risk */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 uppercase tracking-wide">Risk</label>
        <div className="flex flex-col gap-1">
          {RISK_OPTIONS.map((p) => (
            <button key={p} disabled={phase === 'active'} onClick={() => handleRiskChange(p)}
              className={`text-sm rounded-lg px-3 py-2 border text-left transition ${
                riskPreset === p ? 'bg-mine-accent border-mine-accent text-white' : 'bg-mine-surface border-mine-border text-gray-300 hover:text-white'
              } disabled:opacity-40`}
            >
              {RISK_PRESETS[p](gridSize).label}
              {riskPreset === p && p !== 'custom' && (
                <span className="ml-2 text-xs opacity-70">{RISK_PRESETS[p](gridSize).mines} mines</span>
              )}
            </button>
          ))}
        </div>
        {riskPreset === 'custom' && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Mines</span>
              <span className="font-bold text-white">{mineCount}</span>
            </div>
            <input type="range" min={1} max={Math.floor(gridSize * 0.75)} value={mineCount}
              disabled={phase === 'active'} onChange={(e) => setMineCount(Number(e.target.value))}
              className="w-full accent-mine-accent"
            />
          </div>
        )}
      </div>

      {/* Auto cashout */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 uppercase tracking-wide">Auto cashout ×</label>
        <input type="number" min={1.01} step={0.1} placeholder="disabled" value={autoCashout ?? ''}
          onChange={(e) => setAutoCashout(e.target.value ? Number(e.target.value) : null)}
          className="bg-mine-surface border border-mine-border rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-mine-accent"
        />
      </div>

      {/* Special tile legend */}
      <div>
        <button onClick={() => setShowLegend(v => !v)}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition w-full"
        >
          <span className="font-mono">{showLegend ? '▾' : '▸'}</span>
          <span>Special tiles guide</span>
        </button>
        {showLegend && (
          <div className="mt-2 flex flex-col gap-2 p-3 rounded-xl bg-mine-surface border border-mine-border/60">
            {SPECIAL_TYPES.map(([type, meta]) => (
              <div key={type} className="flex items-start gap-2">
                <span className="text-lg leading-none mt-0.5">{meta.icon}</span>
                <div>
                  <div className={`text-xs font-semibold ${meta.color}`}>{meta.label}</div>
                  <div className="text-xs text-gray-500">{meta.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action button */}
      {phase === 'idle' && (
        <button onClick={startGame}
          className="w-full bg-mine-accent hover:bg-red-500 active:scale-95 text-white font-bold rounded-xl py-3 transition"
        >Start Game</button>
      )}
      {phase === 'active' && (
        <button onClick={cashOut}
          className="w-full bg-mine-safe hover:bg-green-400 active:scale-95 text-white font-bold rounded-xl py-3 transition"
        >Cash Out</button>
      )}
      {(phase === 'won' || phase === 'lost') && (
        <button onClick={resetGame}
          className="w-full bg-mine-border hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl py-3 transition"
        >Play Again</button>
      )}
    </div>
  );
}
