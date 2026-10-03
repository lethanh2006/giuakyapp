# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS builder

WORKDIR /workspace/user

# Build bằng context thư mục backend: docker build -f user/Dockerfile .
COPY logger/packages/observability /workspace/logger/packages/observability
COPY user/package.json user/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY user/ ./
RUN npm run build

FROM node:${NODE_VERSION} AS runner

WORKDIR /workspace/user
ENV NODE_ENV=production

COPY --chown=node:node logger/packages/observability /workspace/logger/packages/observability
COPY --chown=node:node user/package.json user/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY --from=builder --chown=node:node /workspace/user/dist ./dist

EXPOSE 5000
USER node

CMD ["npm", "run", "start:prod"]
