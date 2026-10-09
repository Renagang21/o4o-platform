FROM node:22.18.0-alpine AS builder
WORKDIR /app
RUN npm install -g --ignore-scripts pnpm@10.25.0
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.packages.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/auth-utils/package.json ./packages/auth-utils/
COPY packages/auth-client/package.json ./packages/auth-client/
COPY packages/auth-react/package.json ./packages/auth-react/
COPY packages/shared-space-ui/package.json ./packages/shared-space-ui/
COPY packages/content-editor/package.json ./packages/content-editor/
COPY packages/ui/package.json ./packages/ui/
COPY packages/lms-client/package.json ./packages/lms-client/
COPY packages/lms-ui/package.json ./packages/lms-ui/
COPY packages/operator-core-ui/package.json ./packages/operator-core-ui/
COPY packages/operator-ux-core/package.json ./packages/operator-ux-core/
COPY packages/error-handling/package.json ./packages/error-handling/
COPY services/web-lecture/package.json ./services/web-lecture/
RUN pnpm install --filter lecture-web... --fail-if-no-match --frozen-lockfile --ignore-scripts
COPY packages/types/ ./packages/types/
COPY packages/auth-utils/ ./packages/auth-utils/
COPY packages/auth-client/ ./packages/auth-client/
COPY packages/auth-react/ ./packages/auth-react/
COPY packages/shared-space-ui/ ./packages/shared-space-ui/
COPY packages/content-editor/ ./packages/content-editor/
COPY packages/ui/ ./packages/ui/
COPY packages/lms-client/ ./packages/lms-client/
COPY packages/lms-ui/ ./packages/lms-ui/
COPY packages/operator-core-ui/ ./packages/operator-core-ui/
COPY packages/operator-ux-core/ ./packages/operator-ux-core/
COPY packages/error-handling/ ./packages/error-handling/
COPY services/web-lecture/ ./services/web-lecture/
RUN pnpm --fail-if-no-match --filter @o4o/types build
RUN pnpm --fail-if-no-match --filter @o4o/auth-utils build
RUN pnpm --fail-if-no-match --filter @o4o/auth-client build
RUN pnpm --fail-if-no-match --filter @o4o/ui build
RUN pnpm --fail-if-no-match --filter @o4o/content-editor build
RUN pnpm --fail-if-no-match --filter @o4o/lms-client build
ARG VITE_API_BASE_URL=https://api.neture.co.kr
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_SERVICE_URL=https://study.neture.co.kr
ENV VITE_SERVICE_URL=$VITE_SERVICE_URL
WORKDIR /app/services/web-lecture
RUN pnpm exec vite build

FROM node:22.18.0-alpine AS runner
WORKDIR /app
RUN npm install -g --ignore-scripts serve@14.2.4
COPY --from=builder /app/services/web-lecture/dist ./dist
USER node
ENV PORT=8080
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
