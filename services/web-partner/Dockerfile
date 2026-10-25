# syntax=docker/dockerfile:1
FROM node:22.18.0-alpine AS builder
WORKDIR /app
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm install -g pnpm@10.25.0 --ignore-scripts
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY services/web-partner/package.json ./services/web-partner/
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    pnpm install --filter @o4o/web-partner... --fail-if-no-match --frozen-lockfile --ignore-scripts
COPY services/web-partner/ ./services/web-partner/
ARG VITE_PARTNER_API_ORIGIN=https://api.neture.co.kr
ENV VITE_PARTNER_API_ORIGIN=$VITE_PARTNER_API_ORIGIN
RUN pnpm --filter @o4o/web-partner build
FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY services/web-partner/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/services/web-partner/dist /usr/share/nginx/html
EXPOSE 8080
