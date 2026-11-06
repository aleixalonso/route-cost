FROM node:26.12.1-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm i -g pnpm@10.34.3
WORKDIR /repo

FROM base AS pruner
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo prune @route-cost/web --docker

FROM base AS builder
COPY --from=pruner /repo/out/json/ .
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
RUN pnpm turbo build --filter=@route-cost/web...

FROM nginxinc/nginx-unprivileged:1.31.7-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
