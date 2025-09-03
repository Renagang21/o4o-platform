# CLAUDE.md for Local Development Environment

## 개발 환경 개요
이것은 **로컬 개발 환경**으로, 전체 스택을 실행합니다.
- API 서버 + 프론트엔드 앱 모두 실행
- 개발 및 테스트 목적
- PM2 설정: `ecosystem.config.local.cjs` 사용

## 중요 작업 지침

### 1. 전체 스택 실행
```bash
# PM2로 전체 실행 (API + Frontend)
npm run pm2:start:local

# 또는 개발 모드 (PM2 없이)
npm run dev              # 프론트엔드만
npm run dev:api         # 별도 터미널에서 API

# 개별 앱 실행
npm run dev:admin       # Admin Dashboard
npm run dev:web         # Storefront
```

### 2. PM2 관리
```bash
# 로컬 환경 전용 명령어
npm run pm2:start:local     # 전체 시작
npm run pm2:stop:local      # 전체 중지
npm run pm2:restart:local   # 전체 재시작

# 상태 확인
pm2 status
pm2 logs
```

### 3. 환경 변수 설정
`.env.local` 파일:
```env
NODE_ENV=development
SERVER_TYPE=local

# API 설정
PORT=3001
VITE_API_URL=http://localhost:3001

# 로컬 데이터베이스
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=localpassword
DB_NAME=o4o_dev

# 개발용 JWT
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
```

### 4. 빌드 명령어
```bash
# 전체 빌드
npm run build

# 패키지만 빌드
npm run build:packages

# 앱만 빌드
npm run build:apps

# 특정 앱 빌드
npm run build:admin
npm run build:main-site
npm run build:api
```

### 5. 테스트 실행
```bash
# 타입 체크
npm run type-check

# 린트
npm run lint
npm run lint:fix

# 테스트
npm run test
npm run test:e2e
```

### 6. 데이터베이스 관리
```bash
# 로컬 PostgreSQL 설정
sudo -u postgres psql
CREATE DATABASE o4o_dev;
CREATE USER dev_user WITH PASSWORD 'localpassword';
GRANT ALL PRIVILEGES ON DATABASE o4o_dev TO dev_user;

# 마이그레이션
cd apps/api-server
npm run migration:run
npm run migration:revert
```

## 개발 워크플로우

### 새 기능 개발 시
1. 브랜치 생성: `git checkout -b feature/new-feature`
2. 개발 서버 실행: `npm run dev`
3. 코드 작성 및 테스트
4. 타입 체크: `npm run type-check`
5. 린트: `npm run lint:fix`
6. 커밋 및 푸시

### 프로덕션 배포 준비
1. 전체 빌드 테스트: `npm run build`
2. 프로덕션 환경변수로 테스트
3. PM2 설정 확인
4. 문서 업데이트

## 유용한 개발 도구

### 디버깅
```bash
# Node.js 디버거
node --inspect apps/api-server/dist/main.js

# PM2 로그 실시간 보기
pm2 logs --lines 50 -f

# 특정 앱 로그만
pm2 logs o4o-api-local
pm2 logs o4o-admin-local
```

### 성능 모니터링
```bash
# PM2 모니터
pm2 monit

# 메모리 사용량
pm2 list

# CPU 프로파일링
pm2 profile o4o-api-local
```

## 주의사항
1. **프로덕션 설정 사용 금지**: 로컬 개발용 설정만 사용
2. **실제 데이터베이스 접근 금지**: 로컬 DB만 사용
3. **보안 토큰**: 개발용 JWT 시크릿 사용
4. **포트 충돌**: 다른 앱과 포트가 겹치지 않도록 주의

## 트러블슈팅

### 일반적인 문제
- 포트 충돌: `lsof -i :3001` 또는 `lsof -i :5173`로 확인
- 빌드 실패: `npm run clean` 후 `pnpm install`
- 타입 에러: `npm run type-check` 실행하여 확인
- DB 연결 실패: PostgreSQL 서비스 확인

### 초기화
```bash
# 완전 초기화
npm run clean
rm -rf node_modules package-lock.json
pnpm install
npm run build:packages
```

## 프로덕션과의 차이점
| 항목 | 로컬 | 프로덕션 (webserver/apiserver) |
|------|------|--------------------------------|
| NODE_ENV | development | production |
| 디버그 로그 | 활성화 | 비활성화 |
| 소스맵 | 포함 | 제외 |
| 핫 리로드 | 지원 | 미지원 |
| API 응답 캐싱 | 비활성화 | 활성화 |

## 서버 타입 확인
현재 환경이 로컬인지 확인:
```bash
echo $SERVER_TYPE  # "local" 출력되어야 함
cat .env.local | grep SERVER_TYPE
```