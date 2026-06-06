# FIFA Sweepstakes

A self-hosted, transparent, audit-friendly platform for running FIFA tournament
sweepstakes with friends, workplaces, and clubs.

- Fair, mathematically-even team allocation (pure-random and balanced/tier modes)
- **Verifiable draws** — anyone with the public seed can reproduce and confirm the result
- Live leaderboard with projected prize splits
- Automatic scoring from a football data provider
- Self-hosted on Unraid via Docker, behind your reverse proxy of choice

## Tech

- Next.js 14 (App Router) + React 18 + Tailwind CSS
- PostgreSQL via Prisma
- NextAuth (credentials) for admin auth
- Socket.IO for live updates (with SWR polling fallback)
- Provider-agnostic football data layer (default: [football-data.org](https://www.football-data.org/))

---

## Quick start (local dev)

```bash
cp .env.example .env
# edit DATABASE_URL, NEXTAUTH_SECRET, ADMIN_PASSWORD, FOOTBALL_DATA_API_KEY
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev   # http://localhost:3000
```

Sign in at `/admin/login` with the credentials in `.env`, create a tournament,
sync teams from the provider, share the invite link, then run the draw.

> Tip: leave `FOOTBALL_DATA_API_KEY` empty and the app falls back to a built-in
> mock provider with 32 World Cup teams — perfect for offline demos.

---

## Deploying on Unraid

1. Drop this repo into `/mnt/user/appdata/fifa-sweepstakes` (or wherever you keep compose stacks).
2. Copy `.env.example` to `.env` and fill in:
   - `NEXTAUTH_SECRET` (long random string — `openssl rand -base64 32`)
   - `NEXTAUTH_URL` (`https://fifa.your-domain.com`)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   - `FOOTBALL_DATA_API_KEY` (free from football-data.org)
   - `POSTGRES_PASSWORD`
3. `docker compose up -d --build`
4. Point your reverse proxy at `app:3000`:
   - **Caddy**: `fifa.your-domain.com { reverse_proxy app:3000 }`
   - **Nginx Proxy Manager / Traefik**: standard reverse proxy with WebSocket upgrade enabled.
   - **Cloudflare**: enable WebSockets in the dashboard.

Migrations are applied automatically by the container entrypoint. The admin
user from `.env` is seeded on first boot (idempotent).

### Persistent data

Postgres data lives in the named volume `fifa_pgdata`. Backup with:

```bash
docker exec fifa-sweepstakes-db pg_dump -U fifa fifa_sweepstakes \
  | gzip > backup-$(date +%F).sql.gz
```

Restore:

```bash
gunzip -c backup-DATE.sql.gz \
  | docker exec -i fifa-sweepstakes-db psql -U fifa -d fifa_sweepstakes
```

### Scheduled fixture sync

The container ships a standalone sync script. Schedule it from the host with cron
or Unraid User Scripts (every 2 minutes during live matches is plenty):

```bash
*/2 * * * * docker exec fifa-sweepstakes node /app/scripts/sync-fixtures.js >> /var/log/fifa-sync.log 2>&1
```

You can also trigger a sync manually from the admin tournament page.

---

## Verifying a draw

Every draw has three public values stored permanently:

- **Seed** (display): a friendly label like `fifa2026-9a7c4d`
- **Seed secret**: the raw hex entropy used by the deterministic PRNG
- **Verify hash**: `sha256(seedSecret || sha256(canonical inputs) || canonical allocations)`

To verify a draw, hit:

```
GET /api/tournaments/{slug-or-id}/draws/{drawId}/verify
```

The server re-runs the allocation from the stored seed against the participant
and team rosters, then compares the recomputed hash to the stored hash. A match
proves the draw was not manipulated post-hoc. The endpoint is **public** —
participants can verify their own tournaments without admin access.

The same logic is exposed in `src/lib/allocation/`, so anyone with the seed
and the rosters can reproduce the draw locally:

```ts
import { runAllocation } from "./src/lib/allocation";
const result = runAllocation({
  mode: "BALANCED",
  seedSecret: "9a7c4d…",
  participants: [...],
  teams: [...]
});
// compare result.verifyHash to the stored hash
```

### Why the draw is fair

- **Cryptographic randomness**: PRNG is SHA-256-keyed by 128 bits of fresh entropy from `crypto.randomBytes`. Reproducible only with the seed.
- **Balanced mode** distributes teams from each strength tier round-robin to the participants with the lowest current count, breaking ties at random — so no one can collect all favourites or all outsiders.
- **Even split**: when teams don't divide cleanly, the leftover is dealt to the participants with the smallest running count. Distribution is always within ±1 across the room.
- **Locked once run**: allocations become read-only. A redraw creates a new audit record, supersedes the old draw, and records the reason. Both records remain visible forever.

---

## API surface

Public:
- `GET /api/tournaments` — list
- `GET /api/tournaments/:idOrSlug` — detail
- `GET /api/tournaments/:idOrSlug/leaderboard`
- `GET /api/tournaments/:idOrSlug/draws` — all draws, including superseded
- `GET /api/tournaments/:idOrSlug/draws/:drawId/verify`
- `POST /api/tournaments/:idOrSlug/join` — self-register (rate-limited)
- `GET /api/health`

Admin (require auth):
- `POST /api/admin/tournaments`
- `PATCH /api/admin/tournaments/:id`
- `DELETE /api/admin/tournaments/:id`
- `POST /api/admin/tournaments/:id/teams/sync`
- `PATCH /api/admin/tournaments/:id/teams/:teamId`
- `POST /api/admin/tournaments/:id/participants`
- `PATCH /api/admin/tournaments/:id/participants/:pid`
- `DELETE /api/admin/tournaments/:id/participants/:pid`
- `POST /api/admin/tournaments/:id/draws` — runs draw (or redraw with reason)
- `POST /api/admin/tournaments/:id/sync` — pull fixtures + score

---

## Default scoring

| Event | Points |
| --- | --- |
| Group win | 3 |
| Group draw | 1 |
| Group loss | 0 |
| Round of 16 qualified | 5 |
| Quarter-final qualified | 10 |
| Semi-final qualified | 15 |
| Final qualified | 20 |
| Champion | 30 |

Customise per tournament via the `scoringJson` column / API.

## Default prize split

- 1st — 50.00%
- 2nd — 33.33%
- 3rd — 16.67%

Editable per tournament; uses largest-remainder rounding so the pence reconcile
exactly to the pool.

---

## Security notes

- Passwords hashed with bcrypt (work factor 12).
- Admin and write endpoints behind NextAuth (JWT sessions, 7-day expiry).
- Public self-registration is rate-limited per IP.
- Every state change writes an `AuditLog` row.
- `next.config.js` only allows images from configured provider hosts.

Always run behind HTTPS in production (your reverse proxy handles it).
