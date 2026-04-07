# Base image
FROM node:20.19.5-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN npm config set strict-ssl false && npm install -g pnpm@8.15.6
RUN apk add --no-cache python3 py3-setuptools make g++ curl
ENV PYTHON=python3

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
RUN npm pkg delete scripts.prepare && pnpm install --filter web --frozen-lockfile

# Builder stage
FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_BACKEND_URL
ARG INTERNAL_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV INTERNAL_BACKEND_URL=$INTERNAL_BACKEND_URL

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN find . -name ".env" -type f -delete
RUN pnpm --filter web build

# Runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

# Copy standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3001
CMD ["node", "apps/web/server.js"]
