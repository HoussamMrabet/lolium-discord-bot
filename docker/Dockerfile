# syntax=docker/dockerfile:1

# ---- base ----
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# ---- dependencies (production only) ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- web build (Vite SPA) ----
FROM node:22-bookworm-slim AS web-build
WORKDIR /web
# Public client id baked into the "Add to Discord" invite link (optional).
ARG VITE_DISCORD_CLIENT_ID=""
ENV VITE_DISCORD_CLIENT_ID=$VITE_DISCORD_CLIENT_ID
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ---- runtime ----
FROM base AS runtime
# Fonts so @napi-rs/canvas can render chart text.
RUN apt-get update \
  && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY entrypoints ./entrypoints
COPY src ./src
# Bundled dashboard/landing SPA served by the API.
COPY --from=web-build /web/dist ./web/dist

# Run as the built-in unprivileged user.
USER node

# Default command; docker-compose overrides this per service
# (bot | scheduler | worker | api | mono).
CMD ["node", "entrypoints/api.js"]
