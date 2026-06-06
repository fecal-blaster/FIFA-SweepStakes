#!/bin/sh
# Container entrypoint: apply migrations, seed admin, then start the server.
set -e

echo "→ applying database migrations…"
npx prisma migrate deploy

echo "→ seeding admin (idempotent)…"
npx tsx /app/prisma/seed.ts || true

echo "→ starting FIFA Sweepstakes"
exec node server.mjs
