# Multi-stage build for FIFA Sweepstakes.
# Custom Next.js + Socket.IO server runs under tini in a slim alpine runtime.

# --- deps ----------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# --- build ---------------------------------------------------------------
FROM node:20-alpine AS build
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# Strip dev deps for the runtime image.
RUN npm prune --omit=dev
# Compile the small TS scripts to JS so the runtime doesn't need tsx.
RUN npx --yes -p typescript tsc --target es2022 --module commonjs --moduleResolution node \
    --esModuleInterop --skipLibCheck --resolveJsonModule \
    --outDir dist-scripts prisma/seed.ts scripts/sync-fixtures.ts

# --- runtime -------------------------------------------------------------
FROM node:20-alpine AS runtime
RUN apk add --no-cache libc6-compat openssl tini wget
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server.mjs ./server.mjs
COPY --from=build /app/next.config.js ./next.config.js
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist-scripts/prisma/seed.js ./prisma/seed.js
COPY --from=build /app/dist-scripts/scripts/sync-fixtures.js ./scripts/sync-fixtures.js
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/local/bin/entrypoint.sh"]
