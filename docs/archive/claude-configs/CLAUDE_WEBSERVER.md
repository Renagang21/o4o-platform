# CLAUDE.md for o4o-webserver (Frontend Server)

## 서버 역할 및 환경
이 서버는 **o4o-webserver**로, 프론트엔드 전용 서버입니다.
- Admin Dashboard와 Storefront 앱만 실행
- API 서버는 실행하지 않음 (외부 o4o-apiserver 사용)
- PM2 설정: `ecosystem.config.webserver.cjs` 사용

## 중요 작업 지침

### 1. 코드 동기화 시
```bash
# GitHub에서 최신 코드 가져오기
git pull origin main

# 의존성 업데이트
npm install

# 패키지 재빌드 (필요시)
npm run build:packages

# PM2 재시작
npm run pm2:restart:webserver
```

### 2. PM2 관리
```bash
# 이 서버는 반드시 webserver 설정만 사용
npm run pm2:start:webserver    # 시작
npm run pm2:stop:webserver     # 중지
npm run pm2:restart:webserver  # 재시작

# 절대 사용하지 말 것:
# npm run pm2:start:apiserver (X)
# npm run pm2:start:local (X)
```

### 3. 환경 변수
`.env` 파일 주요 설정:
```env
NODE_ENV=production
SERVER_TYPE=webserver
VITE_API_URL=http://[o4o-apiserver-domain]:3001  # 외부 API 서버 주소
ADMIN_PORT=5173
STOREFRONT_PORT=5174
```

### 4. 빌드 명령어
```bash
# 프론트엔드만 빌드
npm run build:apps:frontend

# 특정 앱만 빌드
npm run build:admin       # Admin Dashboard
npm run build:main-site   # Storefront
```

### 5. 로그 확인
```bash
pm2 logs o4o-admin        # Admin 로그
pm2 logs o4o-storefront   # Storefront 로그
pm2 status               # 상태 확인
```

## 주의사항
1. **API 서버 코드 실행 금지**: 이 서버에서는 api-server 앱을 실행하지 않음
2. **환경 설정 유지**: git pull 시에도 ecosystem.config.webserver.cjs 사용 유지
3. **포트 충돌 방지**: 5173(Admin), 5174(Storefront) 포트만 사용

## 트러블슈팅
- CORS 에러: VITE_API_URL이 올바른 API 서버 주소인지 확인
- 빌드 실패: `npm run clean:dist` 후 재빌드
- PM2 프로세스 없음: `npm run pm2:start:webserver` 실행

## 서버 타입 확인
현재 서버가 webserver인지 확인:
```bash
echo $SERVER_TYPE  # "webserver" 출력되어야 함
cat .env | grep SERVER_TYPE
```