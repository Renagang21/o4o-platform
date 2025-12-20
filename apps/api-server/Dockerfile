# Node.js LTS
FROM node:20-alpine

# pnpm 활성화
RUN corepack enable && corepack prepare pnpm@latest --activate

# 작업 디렉토리
WORKDIR /app

# api-server 패키지 정보만 복사
COPY apps/api-server/package.json ./package.json

# 의존성 설치 (api-server 기준)
RUN pnpm install

# 실제 소스 복사
COPY apps/api-server ./apps/api-server

# 실행 위치
WORKDIR /app/apps/api-server

# Cloud Run 포트
ENV PORT=8080
EXPOSE 8080

# 서버 실행
CMD ["pnpm", "run", "start"]
