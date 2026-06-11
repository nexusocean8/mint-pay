FROM node:24-slim AS builder
WORKDIR /app

RUN npm install -g pnpm

ENV CI=true

COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

COPY packages/tsconfig ./packages/tsconfig
COPY packages/types ./packages/types
COPY apps/api ./apps/api

RUN pnpm --filter @mint-pay/api build

FROM node:24-slim
WORKDIR /app

RUN npm install -g pnpm

ENV CI=true

COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist

ENV NODE_ENV=production

CMD ["node", "apps/api/dist/src/main.js"]