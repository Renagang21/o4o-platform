# O4O Platform - 빠른 시작 가이드 (로컬 개발)

## ✅ 설치 완료된 항목
- Node.js v24.12.0 ✅
- pnpm 10.27.0 ✅
- gcloud CLI 550.0.0 ✅
- Cloud SQL Proxy ✅
- 프로젝트 의존성 2,798개 패키지 ✅

---

## 🚀 로컬 개발 시작 (3단계)

### 1단계: GCP 인증 (최초 1회만)

**PowerShell 또는 CMD에서 실행**:
```cmd
.\gcloud.cmd auth application-default login
```

브라우저가 열리면:
1. Google 계정으로 로그인 (sohae2100@gmail.com)
2. 권한 승인
3. 인증 코드 복사
4. 터미널에 붙여넣기

**또는 수동 인증**:
1. 브라우저에서 아래 링크 열기
2. 로그인 후 인증 코드 복사
3. 터미널에서 `.\gcloud.cmd auth application-default login` 실행 후 코드 입력

---

### 2단계: Cloud SQL Proxy 실행 (항상)

**별도 터미널 창에서 실행하고 계속 열어두기**:
```cmd
.\start-cloud-sql-proxy.cmd
```

출력 예시:
```
Starting Cloud SQL Proxy...
Instance: netureyoutube:asia-northeast3:o4o-platform-db
Local Port: 5432

Listening on 127.0.0.1:5432
```

✅ **이 창을 닫지 마세요!** (개발 중 계속 실행)

---

### 3단계: 환경 변수 설정

`.env` 파일을 열고 Cloud SQL 비밀번호 입력:

```env
DB_PASSWORD=YOUR_CLOUD_SQL_PASSWORD_HERE
```

**비밀번호 확인 방법**:
```cmd
.\gcloud.cmd sql users list --instance=o4o-platform-db
```

또는 GCP Console:
```
https://console.cloud.google.com/sql/instances/o4o-platform-db/users?project=netureyoutube
```

---

## 💻 개발 서버 실행

### 옵션 1: Admin Dashboard 개발
```cmd
.\pnpm.cmd run build:packages
.\pnpm.cmd run dev:admin
```

브라우저에서 열기: http://localhost:5173

### 옵션 2: API 서버 개발
```cmd
.\pnpm.cmd run build:packages
.\pnpm.cmd run build:api
.\pnpm.cmd run dev:api
```

API 주소: http://localhost:3001
Health Check: http://localhost:3001/health

### 옵션 3: 전체 개발 (웹 + 관리자)
```cmd
.\pnpm.cmd run build:packages
.\pnpm.cmd run dev
```

---

## 📁 프로젝트 구조

```
o4o-platform/
├── apps/
│   ├── api-server/          # API 서버 (NestJS)
│   ├── admin-dashboard/     # 관리자 대시보드 (React)
│   ├── main-site/           # 메인 사이트
│   └── */                   # 기타 웹 서비스들
├── packages/                # 공유 패키지
├── .env                     # 환경 변수 (로컬)
├── pnpm.cmd                 # pnpm 래퍼
├── gcloud.cmd               # gcloud CLI 래퍼
├── start-cloud-sql-proxy.cmd # Cloud SQL Proxy 시작
└── CLAUDE.md                # 플랫폼 개발 헌법
```

---

## 🔧 유용한 명령어

### 빌드 관련
```cmd
# 패키지 빌드 (필수 - 최초 1회 또는 패키지 수정 시)
.\pnpm.cmd run build:packages

# API 서버 빌드
.\pnpm.cmd run build:api

# Admin Dashboard 빌드
.\pnpm.cmd run build:admin

# 전체 빌드
.\pnpm.cmd run build
```

### 개발 서버
```cmd
# Admin Dashboard (권장 포트: 5173)
.\pnpm.cmd run dev:admin

# Main Site
.\pnpm.cmd run dev:web

# API Server
.\pnpm.cmd run dev:api

# 전체
.\pnpm.cmd run dev
```

### 타입 체크 & 린트
```cmd
# 타입 체크
.\pnpm.cmd run type-check

# 린트
.\pnpm.cmd run lint

# 린트 자동 수정
.\pnpm.cmd run lint:fix
```

### 데이터베이스
```cmd
# 마이그레이션 실행
cd apps/api-server
..\pnpm.cmd run migration:run

# 마이그레이션 생성
..\pnpm.cmd run migration:generate MigrationName
```

---

## ❓ 자주 발생하는 문제

### 1. "Cannot connect to database"
- Cloud SQL Proxy가 실행 중인지 확인
- `.env` 파일의 `DB_PASSWORD` 확인
- GCP 인증 확인: `.\gcloud.cmd auth application-default login`

### 2. "Module not found" 빌드 에러
```cmd
.\pnpm.cmd run build:packages
```

### 3. "Port already in use"
포트 변경 또는 기존 프로세스 종료:
```cmd
# 포트 사용 확인
netstat -ano | findstr :5173
netstat -ano | findstr :3001

# 프로세스 종료 (PID는 위 명령어 결과에서 확인)
taskkill /PID <PID> /F
```

### 4. pnpm 명령어 오류
프로젝트 루트의 `.\pnpm.cmd` 사용:
```cmd
.\pnpm.cmd install
.\pnpm.cmd run dev
```

---

## 🌐 프로덕션 서비스 URL

| 서비스 | URL |
|--------|-----|
| API Server | https://o4o-core-api-117791934476.asia-northeast3.run.app |
| Admin Dashboard | https://o4o-admin-dashboard-117791934476.asia-northeast3.run.app |
| Neture Web | https://neture-web-117791934476.asia-northeast3.run.app |
| Glycopharm Web | https://glycopharm-web-117791934476.asia-northeast3.run.app |
| Glucoseview Web | https://glucoseview-web-117791934476.asia-northeast3.run.app |

---

## 📚 다음 읽을 문서

- **개발 규칙**: [CLAUDE.md](./CLAUDE.md) - 반드시 읽어야 함!
- **상세 설정**: [SETUP.md](./SETUP.md)
- **Cloud SQL**: [GCP-SETUP-GUIDE.md](./GCP-SETUP-GUIDE.md)

---

## 🎯 일반적인 개발 흐름

1. **Cloud SQL Proxy 시작** (별도 터미널)
   ```cmd
   .\start-cloud-sql-proxy.cmd
   ```

2. **패키지 빌드** (최초 1회 또는 패키지 수정 시)
   ```cmd
   .\pnpm.cmd run build:packages
   ```

3. **개발 서버 실행** (새 터미널)
   ```cmd
   .\pnpm.cmd run dev:admin
   ```

4. **코드 수정** → 브라우저 자동 리로드

5. **커밋 전 확인**
   ```cmd
   .\pnpm.cmd run type-check
   .\pnpm.cmd run lint
   ```

6. **Git 커밋 & 푸시**
   ```cmd
   git add .
   git commit -m "feat: ..."
   git push
   ```

---

*최종 업데이트: 2026-01-07*
*모든 환경 설정 완료! 개발을 시작하세요! 🚀*
