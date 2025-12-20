# Node.js LTS 이미지
FROM node:20-alpine

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@latest --activate

# 작업 디렉토리
WORKDIR /app

# pnpm workspace 설정 복사
COPY pnpm-workspace.yaml package.json ./

# packages 폴더 구조 복사 (workspace 의존성)
COPY packages ./packages

# api-server 복사
COPY apps/api-server ./apps/api-server

# 의존성 설치
RUN pnpm install --frozen-lockfile

# api-server 빌드
WORKDIR /app/apps/api-server
RUN pnpm run build

# Cloud Run 포트
ENV PORT=8080
EXPOSE 8080

# 서버 실행
CMD ["pnpm", "run", "start"]
