# Node.js (workspace 요구사항 충족)
FROM node:22-alpine

# pnpm 활성화
RUN corepack enable && corepack prepare pnpm@latest --activate

# 작업 디렉토리 = repo 루트
WORKDIR /repo

# workspace 메타 파일 복사
COPY pnpm-workspace.yaml package.json ./

# TypeScript 설정 파일 복사 (패키지 빌드에 필수)
COPY tsconfig.json tsconfig.base.json tsconfig.packages.json ./

# 전체 소스 복사
COPY apps ./apps
COPY packages ./packages
COPY services ./services

# workspace 전체 의존성 설치
RUN pnpm install

# 1단계: 모든 의존 패키지 빌드 (루트에서)
WORKDIR /repo
RUN pnpm run build:packages

# 2단계: api-server 빌드
RUN pnpm run build:api

# 실행 디렉토리 이동
WORKDIR /repo/apps/api-server

# Cloud Run 포트
ENV PORT=8080
EXPOSE 8080

# API 서버 실행
CMD ["pnpm", "run", "start"]
