'use client';

import { useGameStore } from '@/store/gameStore';
import { RISK_PRESETS, GridSize, RiskPreset } from '@/lib/types';

const GRID_OPTIONS: { label: string; value: GridSize }[] = [
  { label: '3×3', value: 9 },
  { label: '5×5', value: 25 },
  { label: '7×7', value: 49 },
  { label: '10×10', value: 100 },
];

const RISK_OPTIONS: RiskPreset[] = ['safe', 'balanced', 'chaos', 'custom'];

export default function BetPanel() {
  const {
    phase, bet, gridSize, mineCount, riskPreset,
    setBet, setGridSize, setMineCount, setRiskPreset,
    startGame, cashOut, resetGame,
    autoCashout, setAutoCashout,
  } = useGameStore();

  const preset = RISK_PRESETS[riskPreset](gridSize);
  const resolvedMines = riskPreset !== 'custom' ? preset.mines : mineCount;

  const handleRiskChange = (p: RiskPreset) => {
    setRiskPreset(p);
    if (p !== 'custom') setMineCount(RISK_PRESETS[p](gridSize).mines);
  };

  return (
    <div className="bg-mine-card border border-mine-border rounded-2xl p-5 flex flex-col gap-4 w-full lg:w-64 shrink-0">
      <h2 className="text-lg font-semibold text-white">Bet</h2>

      {/* Bet amount */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Amount</label>
        <input
          type="number"
          min={1}
          value={bet}
          disabled={phase === 'active'}
          onChange={(e) => setBet(Number(e.target.value))}
          className="bg-mine-surface border border-mine-border rounded-lg px-3 py-2 text-white w-full"
        />
        <div className="flex gap-2 mt-1">
          {[0.5, 2].map((factor) => (
            <button
              key={factor}
              disabled={phase === 'active'}
              onClick={() => setBet(Math.max(1, Math.round(bet * factor)))}
              className="text-xs bg-mine-surface border border-mine-border rounded px-2 py-1 text-gray-300 hover:text-white disabled:opacity-40"
            >
              {factor === 0.5 ? '½' : '2×'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid size */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Grid</label>
        <div className="grid grid-cols-2 gap-1">
          {GRID_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              disabled={phase === 'active'}
              onClick={() => setGridSize(value)}
              className={`text-sm rounded-lg px-2 py-2 border transition ${
                gridSize === value
                  ? 'bg-mine-accent border-mine-accent text-white'
                  : 'bg-mine-surface border-mine-border text-gray-300 hover:text-white'
              } disabled:opacity-40`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Risk preset */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Risk</label>
        <div className="flex flex-col gap-1">
          {RISK_OPTIONS.map((p) => (
            <button
              key={p}
              disabled={phase === 'active'}
              onClick={() => handleRiskChange(p)}
              className={`text-sm rounded-lg px-3 py-2 border text-left transition ${
                riskPreset === p
                  ? 'bg-mine-accent border-mine-accent text-white'
                  : 'bg-mine-surface border-mine-border text-gray-300 hover:text-white'
              } disabled:opacity-40`}
            >
              {RISK_PRESETS[p](gridSize).label}
            </button>
          ))}
        </div>

        {riskPreset === 'custom' && (
          <div className="mt-2">
            <label className="text-xs text-gray-400">Mines: {mineCount}</label>
            <input
              type="range"
              min={1}
              max={Math.floor(gridSize * 0.8)}
              value={mineCount}
              disabled={phase === 'active'}
              onChange={(e) => setMineCount(Number(e.target.value))}
              className="w-full mt-1"
            />
          </div>
        )}
      </div>

      {/* Auto cashout */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Auto cashout at ×</label>
        <input
          type="number"
          min={1.01}
          step={0.1}
          placeholder="disabled"
          value={autoCashout ?? ''}
          onChange={(e) =>
            setAutoCashout(e.target.value ? Number(e.target.value) : null)
          }
          className="bg-mine-surface border border-mine-border rounded-lg px-3 py-2 text-white w-full"
        />
      </div>

      {/* Action buttons */}
      {phase === 'idle' && (
        <button
          onClick={startGame}
          className="w-full bg-mine-accent hover:bg-red-500 text-white font-bold rounded-xl py-3 transition"
        >
          Start Game
        </button>
      )}
      {phase === 'active' && (
        <button
          onClick={cashOut}
          className="w-full bg-mine-safe hover:bg-green-400 text-white font-bold rounded-xl py-3 transition"
        >
          Cash Out
        </button>
      )}
      {(phase === 'won' || phase === 'lost') && (
        <button
          onClick={resetGame}
          className="w-full bg-mine-border hover:bg-blue-700 text-white font-bold rounded-xl py-3 transition"
        >
          Play Again
        </button>
      )}
    </div>
  );
}
