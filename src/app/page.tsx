'use client';

import BetPanel from '@/components/BetPanel';
import MinesGrid from '@/components/MinesGrid';
import StatsBar from '@/components/StatsBar';
import { useGameStore } from '@/store/gameStore';

export default function Home() {
  const { phase } = useGameStore();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
      <h1 className="text-4xl font-bold tracking-tight text-mine-accent">
        💣 Mines
      </h1>
      <p className="text-sm text-gray-400">
        RTP: {((1 - parseFloat(process.env.NEXT_PUBLIC_HOUSE_EDGE ?? '0.01')) * 100).toFixed(0)}%
        &nbsp;·&nbsp; Provably Fair
      </p>
      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-4xl items-start justify-center">
        <BetPanel />
        <div className="flex flex-col gap-4 flex-1">
          <StatsBar />
          <MinesGrid />
        </div>
      </div>
    </main>
  );
}
