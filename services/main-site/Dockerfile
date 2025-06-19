# O4O Platform Web App
FROM node:20-alpine AS builder

# 보안을 위한 non-root 사용자 생성
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치 (보안 강화)
RUN npm ci && npm cache clean --force

# 소스 코드 복사
COPY . .

# 빌드 (권한 설정)
USER nodeuser
RUN npm run build

# Nginx 프로덕션 이미지
FROM nginx:alpine AS production

# 빌드된 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 설정 복사
COPY nginx.conf /etc/nginx/nginx.conf

# 포트 노출
EXPOSE 80

# 헬스체크 개선
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Nginx 시작
CMD ["nginx", "-g", "daemon off;"]