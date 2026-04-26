# Base stage
FROM node:20.19.5-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN npm config set strict-ssl false && npm install -g pnpm@8.15.6
RUN apk add --no-cache python3 py3-setuptools make g++ curl
ENV PYTHON=python3

# Builder stage
FROM base AS builder
WORKDIR /app
# Copy root files and backend package only
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/

# Strip husky and install dependencies
RUN npm pkg delete scripts.prepare && pnpm install --filter backend --frozen-lockfile

COPY . .
RUN find . -name ".env" -type f -delete
RUN pnpm --filter backend build

# Production dependencies stage
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
RUN npm pkg delete scripts.prepare && pnpm install --filter backend --prod --frozen-lockfile

# Dev stage
FROM base AS dev
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
RUN npm pkg delete scripts.prepare && pnpm install --filter backend
ENV NODE_ENV development
CMD ["pnpm", "--filter", "backend", "dev"]

# Runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 3000
# Improve DNS reliability in Docker
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
# Copy drizzle migrations from source location (in source they're at apps/backend/drizzle)
COPY --from=builder /app/apps/backend/drizzle ./apps/backend/drizzle

EXPOSE 3000
CMD ["node", "apps/backend/dist/src/main.js"]
