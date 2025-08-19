# 🚨 API 서버 긴급 동기화 요청

## 현재 문제 상황
- **문제**: admin.neture.co.kr에서 API 서버(api.neture.co.kr)로 로그인 요청 시 CORS 에러 발생
- **에러 메시지**: `No 'Access-Control-Allow-Origin' header is present on the requested resource`
- **영향**: 관리자 대시보드 로그인 불가

## 필요한 작업

### 1. 최신 코드 동기화 (즉시)
```bash
# API 서버에서 실행
cd /home/ubuntu/o4o-platform
git pull origin main
```

### 2. 패키지 설치 및 빌드
```bash
# 의존성 설치
npm install

# API 서버 빌드
cd apps/api-server
npm run build
cd ../..
```

### 3. PM2 프로세스 재시작
```bash
# 현재 실행 중인 프로세스 확인
pm2 list

# API 서버 재시작
pm2 restart o4o-api --update-env

# 또는 새로 시작 (프로세스가 없는 경우)
pm2 start apps/api-server/dist/main.js --name o4o-api
```

### 4. CORS 설정 확인
최신 코드의 `apps/api-server/src/main.ts`에 다음 도메인들이 허용되어 있는지 확인:
- `https://admin.neture.co.kr`
- `http://admin.neture.co.kr`
- `https://neture.co.kr`
- `http://13.125.144.8` (IP 직접 접속)

### 5. 테스트 명령
```bash
# CORS 헤더 확인
curl -I -X OPTIONS https://api.neture.co.kr/api/v1/auth/login \
  -H 'Origin: https://admin.neture.co.kr' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type'

# 성공 시 다음과 같은 헤더가 보여야 함:
# Access-Control-Allow-Origin: https://admin.neture.co.kr
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
# Access-Control-Allow-Credentials: true
```

## 추가 확인 사항

### PM2 로그 확인
```bash
# 실시간 로그 확인
pm2 logs o4o-api --lines 50

# 에러 로그만 확인
pm2 logs o4o-api --err --lines 50
```

### 프로세스 상태 확인
```bash
pm2 show o4o-api
```

## 예상 소요 시간
- 전체 작업: 약 5-10분
- 동기화 및 빌드: 3-5분
- 재시작 및 테스트: 2분

## 긴급 연락
문제 발생 시 즉시 알려주세요. 추가 지원이 필요합니다.

---

**작성일**: 2025년 8월 19일
**우선순위**: 🔴 긴급 (Critical)
**영향 범위**: 관리자 대시보드 전체 접속 불가