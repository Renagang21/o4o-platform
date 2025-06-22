# O4O Platform API Server
FROM node:20-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 루트 패키지 파일 복사 (Workspaces 때문에 필요)
COPY ../../package*.json ./

# api-server 패키지 파일 복사
COPY package*.json ./services/api-server/
WORKDIR /app/services/api-server

# 의존성 설치 (루트에서 실행)
RUN npm ci --workspace=o4o-platform-api-server && npm cache clean --force

# 소스 코드 복사
COPY src ./src

# TypeScript 빌드
RUN npm run build
WORKDIR /app

# 프로덕션 이미지
FROM node:20-alpine AS production

# 보안을 위한 non-root 사용자 생성
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# 작업 디렉토리 설정
WORKDIR /app

# 필요한 패키지 설치
RUN apk add --no-cache dumb-init

# 프로덕션 의존성만 설치
COPY ../../package*.json ./
COPY package*.json ./services/api-server/
WORKDIR /app/services/api-server
RUN npm ci --only=production --workspace=o4o-platform-api-server && npm cache clean --force
WORKDIR /app

# 빌드된 애플리케이션 복사
COPY --from=builder --chown=nodeuser:nodejs /app/services/api-server/dist ./dist

# 사용자 권한 설정
USER nodeuser

# 포트 노출
EXPOSE 3000

# 헬스체크 개선
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 애플리케이션 시작
CMD ["dumb-init", "node", "dist/main.js"]