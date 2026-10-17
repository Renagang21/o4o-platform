FROM node:22.18.0-alpine AS builder
WORKDIR /app
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm install -g --ignore-scripts pnpm@10.25.0
COPY .npmrc pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.packages.json ./
COPY packages ./packages
COPY services/web-pharmacy-coop ./services/web-pharmacy-coop
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    pnpm install --filter @o4o/web-pharmacy-coop... --fail-if-no-match --frozen-lockfile --ignore-scripts --verify-store-integrity=true
ARG VITE_API_BASE_URL=https://api.neture.co.kr
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm --filter @o4o/web-pharmacy-coop... --if-present -r build

FROM node:22.18.0-alpine AS runner
WORKDIR /app
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm install -g --ignore-scripts serve@14.2.4
COPY --from=builder /app/services/web-pharmacy-coop/dist ./dist
USER node
ENV PORT=8080
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
