# syntax=docker/dockerfile:1
FROM node:22.18.0-alpine AS builder
WORKDIR /app
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm install -g pnpm@10.25.0 --ignore-scripts
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.packages.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/auth-utils/package.json ./packages/auth-utils/
COPY packages/auth-client/package.json ./packages/auth-client/
COPY packages/auth-react/package.json ./packages/auth-react/
COPY packages/content-editor/package.json ./packages/content-editor/
COPY packages/error-handling/package.json ./packages/error-handling/
COPY packages/ui/package.json ./packages/ui/
COPY packages/operator-ux-core/package.json ./packages/operator-ux-core/
COPY packages/shared-space-ui/package.json ./packages/shared-space-ui/
COPY packages/operator-core-ui/package.json ./packages/operator-core-ui/
COPY services/web-partner/package.json ./services/web-partner/
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    pnpm install --filter @o4o/web-partner... --fail-if-no-match --frozen-lockfile --ignore-scripts
COPY packages/types/ ./packages/types/
COPY packages/auth-utils/ ./packages/auth-utils/
COPY packages/auth-client/ ./packages/auth-client/
COPY packages/auth-react/ ./packages/auth-react/
COPY packages/content-editor/ ./packages/content-editor/
COPY packages/error-handling/ ./packages/error-handling/
COPY packages/ui/ ./packages/ui/
COPY packages/operator-ux-core/ ./packages/operator-ux-core/
COPY packages/shared-space-ui/ ./packages/shared-space-ui/
COPY packages/operator-core-ui/ ./packages/operator-core-ui/
COPY services/web-partner/ ./services/web-partner/
RUN pnpm --filter @o4o/types build && pnpm --filter @o4o/auth-utils build && pnpm --filter @o4o/auth-client build
RUN pnpm --filter @o4o/ui build && pnpm --filter @o4o/content-editor build
ARG VITE_PARTNER_API_ORIGIN=https://api.neture.co.kr
ENV VITE_PARTNER_API_ORIGIN=$VITE_PARTNER_API_ORIGIN
RUN pnpm --filter @o4o/web-partner build
FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY --chmod=644 services/web-partner/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/services/web-partner/dist /usr/share/nginx/html
EXPOSE 8080
