# Node.js (workspace 요구사항 충족)
FROM node:22-alpine

# pnpm 활성화
RUN corepack enable && corepack prepare pnpm@latest --activate

# 작업 디렉토리 = repo 루트
WORKDIR /repo

# workspace 메타 파일 복사
COPY pnpm-workspace.yaml package.json ./

# 모든 패키지 메타 복사
COPY apps ./apps
COPY packages ./packages

# workspace 전체 의존성 설치
RUN pnpm install --frozen-lockfile=false

# 실행 디렉토리 이동
WORKDIR /repo/apps/api-server

# Cloud Run 포트
ENV PORT=8080
EXPOSE 8080

# API 서버 실행
CMD ["pnpm", "run", "start"]
