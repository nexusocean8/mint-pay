FROM node:24-slim AS builder
WORKDIR /app

RUN npm install -g pnpm

ENV NEXT_TELEMETRY_DISABLED=1

COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

COPY packages/tsconfig ./packages/tsconfig
COPY packages/types ./packages/types
COPY apps/web ./apps/web
COPY apps/web/.env ./apps/web/.env

RUN pnpm --filter @mint-pay/web build

FROM node:24-slim
WORKDIR /app

RUN npm install -g pnpm

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY apps/web/package.json ./apps/web/
COPY apps/web/next.config.ts ./apps/web/
COPY apps/web/.env ./apps/web/.env

EXPOSE 3000
CMD ["pnpm", "--filter", "@mint-pay/web", "start"]