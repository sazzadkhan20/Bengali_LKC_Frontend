# ------------------------------------------------------------------
# Bengali LKC webapp — production image (multi-stage)
# Build:  docker build -t bengali-lkc .
# Run:    docker run -p 3000:3000 bengali-lkc
# ------------------------------------------------------------------

# ---- deps stage ---------------------------------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build stage --------------------------------------------------
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
RUN npm run build

# ---- runtime stage ------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# wget is used by HEALTHCHECK; libc6-compat helps native optional deps
RUN apk add --no-cache wget libc6-compat

# Standalone server output + static assets
# node:22-alpine ships a `node` user/group at uid/gid 1000 (required by HF Spaces)
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
# Princeton WordNet 2.1 ILI registry (used by /api/lookup/ili)
COPY --from=builder --chown=node:node /app/data/wordnet21-ili.json ./data/wordnet21-ili.json

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ > /dev/null || exit 1

CMD ["node", "server.js"]
