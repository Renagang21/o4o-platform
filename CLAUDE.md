# CLAUDE.md - O4O Platform 로컬 개발 환경 가이드

## ⚠️ 필수 개발 원칙 (MUST READ FIRST)

### 🎯 작업 전 체크리스트
1. **환경 파악**: 현재 어느 환경인지 확인 (로컬/웹서버/API서버)
2. **서버 역할 이해**:
   - **웹서버**: 정적 파일 서빙 (Nginx), PM2 불필요
   - **API서버**: Node.js 백엔드 (PM2 필요)
   - **로컬**: 개발 환경 (모든 기능)
3. **문제 분석**: 증상이 아닌 근본 원인 파악
4. **신중한 판단**: 한 번 더 생각하고 체계적으로 접근

### 🚫 하지 말아야 할 것
- 웹서버에서 PM2로 정적 파일 실행 시도
- 프로덕션에서 개발 서버 포트(5173, 5174) 사용
- 환경 확인 없이 명령어 실행
- 문제의 본질을 파악하지 않고 여러 해결책 시도

### ✅ 올바른 접근 방법
1. CLAUDE.md, CLAUDE_WEBSERVER.md, CLAUDE_APISERVER.md 먼저 확인
2. 현재 환경과 목적에 맞는 문서 참조
3. 체계적이고 논리적인 문제 해결
4. 각 단계 검증 후 다음 단계 진행

## 🏠 현재 환경: 로컬 개발 (Local Development)

이 환경은 **로컬 개발 환경**으로, O4O Platform의 전체 스택(API + 프론트엔드)을 실행합니다.

## 📋 서버 환경 구성

O4O Platform은 3개의 독립적인 환경으로 운영됩니다:

1. **o4o-webserver**: 프론트엔드 전용 (Admin, Storefront)
2. **o4o-apiserver**: API 서버 전용 (REST API, DB)  
3. **로컬 개발** (현재): 전체 스택 개발/테스트용

각 환경은 독립적인 PM2 설정 파일을 사용하여 충돌을 방지합니다.

## 🚀 빠른 시작

### 전체 스택 실행
```bash
# PM2로 전체 실행 (추천)
pnpm run pm2:start:local

# 또는 개발 모드 (핫 리로드)
pnpm run dev              # 터미널 1: 프론트엔드
cd apps/api-server && pnpm run dev  # 터미널 2: API 서버
```

### PM2 관리
```bash
# 로컬 환경 전용 명령어만 사용
pnpm run pm2:start:local     # 시작
pnpm run pm2:stop:local      # 중지  
pnpm run pm2:restart:local   # 재시작

# 절대 사용 금지:
# pnpm run pm2:start:webserver (X) - 프로덕션 웹서버용
# pnpm run pm2:start:apiserver (X) - 프로덕션 API용
```

## 🚀 빠른 배포 가이드 (package.json 수정 없음)

### 웹서버에서 실행
```bash
# 캐시 정리 (선택사항)
./scripts/clean-before-build.sh

# 웹서버 전용 빌드 및 시작
./scripts/build-webserver.sh
./scripts/start-pm2-webserver.sh
```

### 서버 타입 자동 감지 실행
```bash
# SERVER_TYPE 환경변수에 따라 자동 실행
export SERVER_TYPE=webserver  # 또는 apiserver, local
./scripts/run-by-server-type.sh
```

### Admin Dashboard 빌드 최적화
웹서버에서 admin-dashboard 빌드 시 메모리 및 타임아웃 문제를 해결하기 위한 설정:

1. **환경 변수 설정** (`apps/admin-dashboard/.env.production`):
   - `GENERATE_SOURCEMAP=false` - 소스맵 비활성화
   - `NODE_OPTIONS='--max-old-space-size=4096'` - 메모리 증가
   
2. **빌드 스크립트**:
   - 5분 타임아웃 설정으로 무한 빌드 방지
   - 빌드 실패 시 기존 dist 폴더 사용
   
3. **캐시 활용**:
   - Vite 캐시 디렉토리 설정 (`.vite-cache`)
   - 빌드 전 캐시 정리 스크립트 제공

## ⚙️ 환경 설정

### 환경 변수 (.env.local)
```env
NODE_ENV=development
SERVER_TYPE=local
PORT=3001
VITE_API_URL=http://localhost:3001

# 로컬 DB
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=localpassword
DB_NAME=o4o_dev

# 개발용 JWT (프로덕션에서는 변경 필수)
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
```

## 💻 개발 워크플로우

### 1. 코드 변경 후 테스트
```bash
# 타입 체크
pnpm run type-check

# 린트
pnpm run lint:fix

# 빌드 테스트
pnpm run build
```

### 2. Git 작업
```bash
# 기능 개발
git checkout -b feature/new-feature
git add .
git commit -m "feat: 새 기능 추가"
git push origin feature/new-feature
```

### 3. 데이터베이스 작업
```bash
cd apps/api-server

# 마이그레이션 생성
pnpm run migration:generate -- -n MigrationName

# 마이그레이션 실행
pnpm run migration:run
```

## 🔧 자주 사용하는 명령어

### 개발
```bash
pnpm run dev:admin       # Admin Dashboard만
pnpm run dev:web         # Storefront만
cd apps/api-server && pnpm run dev  # API 서버만
```

### 빌드
```bash
pnpm run build:packages  # 패키지 빌드
pnpm run build:apps     # 프론트엔드 앱 빌드
pnpm run build          # 전체 빌드
cd apps/api-server && pnpm run build  # API 서버 빌드
```

### 테스트
```bash
pnpm run type-check     # TypeScript 타입 체크
pnpm run lint          # ESLint 검사
pnpm run test          # 단위 테스트
```

### 정리
```bash
pnpm run clean:dist    # 빌드 파일 삭제
pnpm run clean        # 전체 초기화
```

## 🐛 트러블슈팅

### 포트 충돌
```bash
# 사용 중인 포트 확인
lsof -i :3001  # API
lsof -i :5173  # Admin
lsof -i :5174  # Storefront

# 프로세스 종료
kill -9 [PID]
```

### 빌드 실패
```bash
# 캐시 정리 후 재설치
pnpm run clean
rm -rf node_modules package-lock.json
pnpm install
pnpm run build:packages
```

### DB 연결 실패
```bash
# PostgreSQL 상태 확인
sudo systemctl status postgresql

# DB 생성
sudo -u postgres psql
CREATE DATABASE o4o_dev;
CREATE USER dev_user WITH PASSWORD 'localpassword';
GRANT ALL PRIVILEGES ON DATABASE o4o_dev TO dev_user;
```

### 메모리 부족
```bash
# Node.js 메모리 증가
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm run build
```

## 📁 프로젝트 구조

```
o4o-platform/
├── apps/
│   ├── admin-dashboard/     # 관리자 대시보드
│   ├── api-server/          # REST API 서버
│   └── storefront/          # 고객용 스토어프론트
├── packages/                # 공유 패키지
├── ecosystem.config.local.cjs  # 로컬 PM2 설정
├── .env.local              # 로컬 환경변수
└── package.json            # 루트 package.json
```

## ⚠️ 중요 주의사항

1. **환경 분리**: 로컬은 개발용, 프로덕션 설정 사용 금지
2. **PM2 설정**: 반드시 `ecosystem.config.local.cjs` 사용
3. **데이터베이스**: 로컬 DB만 사용, 프로덕션 DB 접근 금지
4. **보안**: 개발용 JWT 시크릿은 프로덕션에서 변경 필수
5. **포트**: 3001(API), 5173(Admin), 5174(Storefront)

## 🔍 디버깅

### 로그 확인
```bash
# PM2 로그
pm2 logs
pm2 logs o4o-api-local
pm2 logs o4o-admin-local

# 실시간 모니터링
pm2 monit
```

### Node.js 디버거
```bash
# Chrome DevTools 디버깅
node --inspect apps/api-server/dist/main.js

# VS Code 디버깅
# .vscode/launch.json 설정 사용
```

## 📝 추가 문서

- `SERVER_DEPLOYMENT_GUIDE.md`: 전체 배포 가이드
- `QUICK_START.md`: 빠른 시작 가이드
- `CLAUDE_WEBSERVER.md`: 웹서버 전용 가이드
- `CLAUDE_APISERVER.md`: API 서버 전용 가이드

## 🆘 도움말

문제가 발생하면:
1. 이 문서의 트러블슈팅 섹션 확인
2. `pm2 logs`로 에러 메시지 확인
3. GitHub Issues에 문제 보고

---

*최종 업데이트: 2025년 8월*
*현재 환경: 로컬 개발 (SERVER_TYPE=local)*