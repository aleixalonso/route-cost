FROM node:26.12.1-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm i -g pnpm@10.34.3
WORKDIR /repo

FROM base AS pruner
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo prune @route-cost/api --docker

FROM base AS installer
COPY --from=pruner /repo/out/json/ .
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
RUN pnpm turbo build --filter=@route-cost/api...
RUN pnpm deploy --legacy --filter=@route-cost/api --prod /prod/api

FROM node:26.12.1-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
USER node
COPY --from=installer --chown=node:node /prod/api ./
EXPOSE 3001
CMD ["node", "dist/main.js"]
