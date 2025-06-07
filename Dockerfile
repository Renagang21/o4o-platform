# 빌드 스테이지
FROM node:18-alpine as builder

WORKDIR /app

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm ci

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# 프로덕션 스테이지
FROM node:18-alpine

WORKDIR /app

# 프로덕션 의존성만 설치
COPY package*.json ./
RUN npm ci --only=production

# 빌드된 파일 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=3003

# 헬스체크를 위한 포트 노출
EXPOSE 3003

# 애플리케이션 실행
CMD ["node", "dist/main.js"] 