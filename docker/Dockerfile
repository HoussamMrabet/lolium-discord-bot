# syntax=docker/dockerfile:1

# ---- base ----
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# ---- dependencies (production only) ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

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

# Run as the built-in unprivileged user.
USER node

# Default command; docker-compose overrides this per service
# (bot | scheduler | worker | api | mono).
CMD ["node", "entrypoints/api.js"]
