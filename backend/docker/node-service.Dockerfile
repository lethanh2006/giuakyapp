# Use the Dockerfile frontend bundled with BuildKit (Docker Engine 23+).
# Avoid a separate Docker Hub fetch for docker/dockerfile on every build.

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS build
ARG SERVICE_DIR
ARG NPM_CI_FLAGS
WORKDIR /workspace/${SERVICE_DIR}

COPY logger/packages/observability /workspace/logger/packages/observability
RUN npm ci \
    --prefix /workspace/logger/packages/observability \
    --no-audit --no-fund
COPY ${SERVICE_DIR}/package.json ${SERVICE_DIR}/package-lock.json ./
RUN --mount=type=cache,id=nrapp-npm-cache,target=/root/.npm,sharing=shared \
    npm ci ${NPM_CI_FLAGS} --no-audit --no-fund \
      --fetch-retries=5 --fetch-retry-mintimeout=20000 \
      --fetch-retry-maxtimeout=120000 --fetch-timeout=300000

COPY ${SERVICE_DIR}/ ./
RUN npm run build

FROM node:${NODE_VERSION} AS runtime
ARG SERVICE_DIR
ARG NPM_CI_FLAGS
WORKDIR /workspace/${SERVICE_DIR}

ENV NODE_ENV=production

COPY --chown=node:node logger/packages/observability /workspace/logger/packages/observability
RUN npm ci \
    --prefix /workspace/logger/packages/observability \
    --omit=dev --no-audit --no-fund
COPY --chown=node:node ${SERVICE_DIR}/package.json ${SERVICE_DIR}/package-lock.json ./
RUN --mount=type=cache,id=nrapp-npm-cache,target=/root/.npm,sharing=shared \
    npm ci ${NPM_CI_FLAGS} --omit=dev --no-audit --no-fund \
      --fetch-retries=5 --fetch-retry-mintimeout=20000 \
      --fetch-retry-maxtimeout=120000 --fetch-timeout=300000

COPY --from=build --chown=node:node /workspace/${SERVICE_DIR}/dist ./dist

USER node

CMD ["npm", "run", "start:prod"]
