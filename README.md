# 💣 Mines Game

An advanced, provably fair Mines gambling game built with **Next.js 14**, **Tailwind CSS**, **Supabase**, and deployable instantly to **Vercel**.

## Features

- **Provably Fair** — server seed hashed before play, revealed on cashout. Verify any outcome.
- **House Edge Math** — payouts use `multiplier = (1 / P(k)) × (1 − houseEdge)`. Default 1% edge, configurable via `HOUSE_EDGE` env var.
- **Dynamic Grid Sizes** — 3×3, 5×5, 7×7, 10×10
- **Risk Presets** — Safe, Balanced, Chaos, Custom
- **Special Tiles** — Gold (2× boost), Shield (survive a mine), Booster (×1.25), Mystery (random effect)
- **Auto Cashout** — set a target multiplier, game cashes out automatically
- **Win Streak Tracker** — visual 🔥 streak counter

## House Edge Formula

```
P(k) = C(total - mines, k) / C(total, k)
multiplier = (1 / P(k)) × (1 − house_edge)
```

Example (5×5, 3 mines, 1% edge):
- After 1 safe tile: `1 / (22/25) × 0.99 ≈ 1.124×`
- After 5 safe tiles: `≈ 1.814×`
- After 10 safe tiles: `≈ 4.050×`

## Getting Started

```bash
npm install
cp .env.local.example .env.local
# fill in Supabase credentials
npm run dev
```

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL editor
3. Copy your Project URL and anon key to `.env.local`

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yanneksevinc/mines-game)

Add your env vars in the Vercel dashboard, and you're live.

## Project Structure

```
src/
  app/
    api/game/start/      POST — creates session, generates mine positions
    api/game/reveal/     POST — validates reveal, returns tile type + new multiplier
    api/game/cashout/    POST — finalises payout, reveals server seed
    page.tsx             Main game UI
  components/
    BetPanel.tsx         Bet amount, grid size, risk preset, auto cashout
    MinesGrid.tsx        Animated tile grid
    StatsBar.tsx         Live multiplier, next payout, streak, messages
  lib/
    gameLogic.ts         House edge math, provably fair seeds, special tiles
    supabase.ts          Client + service role Supabase clients
    types.ts             Shared types and risk preset configs
  store/
    gameStore.ts         Zustand global state
supabase/
  schema.sql             Full DB schema with RLS
```
