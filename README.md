# 🏸 Shuttle Stats — Badminton Analytics

A modern web application for tracking badminton matches and generating detailed analytics for your group.

## Tech Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **Supabase** (PostgreSQL)
- **Recharts** for data visualization

## Quick Start

### 1. Clone & Install

```bash
cd badminton-analytics
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Navigate to the **SQL Editor** in your Supabase dashboard.
3. Run the migration file:
   - Copy the contents of `supabase/migrations/001_initial_schema.sql` and execute it.
4. (Optional) Run the seed file for sample data:
   - Copy the contents of `supabase/seed.sql` and execute it.

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL` — from Project Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Project Settings → API

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

### Core
- **Player Management** — Create, edit, delete players with skill levels (Developing, Competitive, Advanced)
- **Session Tracking** — Create sessions, build teams, form pairs
- **Match Recording** — Record matches with best-of format and optional game scores

### Analytics Dashboard
- **Player Rankings** — Leaderboard sorted by win rate
- **Head-to-Head** — Direct comparison between any two players
- **Pair Statistics** — Win rates for every unique pair combination
- **Pair vs Pair** — Compare two specific pairs against each other
- **Best Partners** — Who performs best with whom
- **Toughest Opponents** — Hardest players to beat
- **Skill Level Analysis** — Performance breakdown by partner skill level
- **Underdog Analysis** — Win rates when paired against higher-skilled opponents

### Player Profiles
- Personal statistics and win rate
- Best partners and toughest opponents
- Skill level performance breakdown
- Recent match history

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with overview stats |
| `/players` | Player roster management |
| `/players/[id]` | Player profile and analytics |
| `/sessions` | Session list |
| `/sessions/[id]` | Session detail (teams, pairs, matches) |
| `/analytics` | Full analytics dashboard |

## Deployment

### Vercel (Frontend)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

### Supabase (Database)

Already hosted — just run the migration in the SQL editor.

## Sample Data

The seed file includes:
- 10 players (Fasi, Ali, Umar, Hassan, Hamza, Ahmad, Bilal, Saad, Zain, Omar)
- 3 sessions with varied match results
- Game scores for select matches

## License

Private use only.
