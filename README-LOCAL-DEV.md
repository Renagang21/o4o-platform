# O4O Platform - 로컬 개발 환경 즉시 시작

## 🎯 현재 상태: 설치 완료! ✅

모든 필수 도구가 설치되었습니다:
- ✅ Node.js v24.12.0
- ✅ pnpm 10.27.0
- ✅ gcloud CLI 550.0.0
- ✅ Cloud SQL Proxy
- ✅ 프로젝트 의존성 2,798개 패키지

---

## 🚀 3단계로 개발 시작하기

### 1️⃣ GCP 인증 (최초 1회만)

**CMD 또는 PowerShell에서 실행**:
```cmd
.\authenticate-gcp.cmd
```

- 브라우저가 자동으로 열립니다
- Google 계정으로 로그인 (sohae2100@gmail.com)
- "허용" 클릭
- 완료!

> ⚠️ Git Bash에서는 작동하지 않습니다. 반드시 **CMD** 또는 **PowerShell**을 사용하세요.

---

### 2️⃣ `.env` 파일 설정

`.env` 파일을 열고 **23번 줄**의 비밀번호를 입력하세요:

```env
DB_PASSWORD=여기에_실제_비밀번호_입력
```

**비밀번호 확인 방법**:

**옵션 A**: GCP Console (웹)
```
https://console.cloud.google.com/sql/instances/o4o-platform-db/users?project=netureyoutube
```

**옵션 B**: gcloud CLI
```cmd
.\gcloud.cmd sql users list --instance=o4o-platform-db
```

---

### 3️⃣ 개발 서버 실행

#### 방법 A: Admin Dashboard 개발 (추천)

**터미널 1** - Cloud SQL Proxy 시작:
```cmd
.\start-cloud-sql-proxy.cmd
```
✅ 이 창은 **계속 열어두세요** (백그라운드 실행)

**터미널 2** - 개발 서버 시작:
```cmd
.\pnpm.cmd run build:packages
.\pnpm.cmd run dev:admin
```

브라우저에서 열기: **http://localhost:5173**

#### 방법 B: API 서버 개발

**터미널 1** - Cloud SQL Proxy (동일):
```cmd
.\start-cloud-sql-proxy.cmd
```

**터미널 2** - API 서버:
```cmd
.\pnpm.cmd run build:packages
.\pnpm.cmd run build:api
.\pnpm.cmd run dev:api
```

API 주소: **http://localhost:3001**
Health Check: **http://localhost:3001/health**

---

## 📋 일일 개발 루틴

### 매일 아침 시작할 때:

**터미널 1** (백그라운드):
```cmd
.\start-cloud-sql-proxy.cmd
```
→ 이 창은 하루 종일 열어두세요

**터미널 2** (개발):
```cmd
.\pnpm.cmd run dev:admin
```
→ 코드 수정하면 자동 리로드

### 저녁에 작업 종료할 때:

1. 터미널 2에서 `Ctrl+C` (개발 서버 종료)
2. 터미널 1에서 `Ctrl+C` (Cloud SQL Proxy 종료)
3. Git 커밋 & 푸시
   ```cmd
   git add .
   git commit -m "feat: 오늘 작업한 내용"
   git push origin main
   ```

---

## 🔧 자주 사용하는 명령어

### 개발 중
```cmd
# 타입 체크
.\pnpm.cmd run type-check

# 린트 확인
.\pnpm.cmd run lint

# 린트 자동 수정
.\pnpm.cmd run lint:fix
```

### 패키지 수정했을 때
```cmd
# 패키지 재빌드
.\pnpm.cmd run build:packages

# 개발 서버 재시작 (Ctrl+C 후)
.\pnpm.cmd run dev:admin
```

### 새 의존성 추가
```cmd
# 패키지 설치
.\pnpm.cmd add <package-name>

# 특정 워크스페이스에 설치
.\pnpm.cmd add <package-name> --filter @o4o/admin-dashboard
```

---

## ❓ 문제 해결

### "Cannot connect to database"
1. Cloud SQL Proxy가 실행 중인가요?
   ```cmd
   # 별도 터미널에서 실행
   .\start-cloud-sql-proxy.cmd
   ```

2. `.env` 파일의 `DB_PASSWORD` 확인

3. GCP 인증 재시도
   ```cmd
   .\authenticate-gcp.cmd
   ```

### "Module not found" 에러
```cmd
# 패키지 재빌드
.\pnpm.cmd run build:packages
```

### "Port 5173 is already in use"
```cmd
# 기존 프로세스 확인
netstat -ano | findstr :5173

# PID 확인 후 종료 (예: PID가 12345라면)
taskkill /PID 12345 /F
```

### 브라우저에서 페이지가 안 열림
1. 개발 서버가 실행 중인지 확인 (터미널 2)
2. `http://localhost:5173` 주소 확인
3. 브라우저 캐시 삭제 후 재시도

---

## 🌐 유용한 링크

### 로컬 개발
- Admin Dashboard: http://localhost:5173
- API Server: http://localhost:3001
- API Health: http://localhost:3001/health

### 프로덕션 (참고용)
- API Server: https://o4o-core-api-117791934476.asia-northeast3.run.app
- Admin Dashboard: https://o4o-admin-dashboard-117791934476.asia-northeast3.run.app

### GCP Console
- Cloud SQL: https://console.cloud.google.com/sql?project=netureyoutube
- Cloud Run: https://console.cloud.google.com/run?project=netureyoutube

---

## 📚 추가 문서

- **빠른 시작**: [QUICK-START.md](./QUICK-START.md) ⭐
- **개발 규칙** (필독!): [CLAUDE.md](./CLAUDE.md)
- **상세 설정**: [SETUP.md](./SETUP.md)
- **Cloud SQL 가이드**: [GCP-SETUP-GUIDE.md](./GCP-SETUP-GUIDE.md)

---

## 💡 팁

### VSCode 사용자
1. Extensions 설치 권장:
   - ESLint
   - Prettier
   - TypeScript Vue Plugin (Volar)

2. 터미널 분할:
   - `Ctrl+Shift+5`: 터미널 분할
   - 왼쪽: Cloud SQL Proxy
   - 오른쪽: 개발 서버

### 성능 최적화
```cmd
# 불필요한 패키지 정리
.\pnpm.cmd prune

# 캐시 정리
.\pnpm.cmd store prune
```

---

**이제 개발을 시작하세요!** 🚀

**첫 단계**: `.\authenticate-gcp.cmd` 실행

---

*최종 업데이트: 2026-01-07*
*모든 준비 완료! Happy Coding! 💻*
