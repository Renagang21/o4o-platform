# Node.js LTS
FROM node:20-alpine

# pnpm 활성화
RUN corepack enable && corepack prepare pnpm@latest --activate

# 작업 디렉토리
WORKDIR /app

# 현재 컨텍스트(= apps/api-server)의 package.json 복사
COPY package.json ./

# 의존성 설치
RUN pnpm install

# 소스 전체 복사 (apps/api-server 내부)
COPY . .

# Cloud Run 포트
ENV PORT=8080
EXPOSE 8080

# 서버 실행
CMD ["pnpm", "run", "start"]
