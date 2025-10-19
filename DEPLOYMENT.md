# O4O Platform 배포 가이드

> **빠른 시작**: `git push origin main` → GitHub Actions 자동 배포 → 2-3분 대기

---

## 📑 목차

1. [배포 방식](#-배포-방식)
2. [자동 배포 (GitHub Actions)](#-자동-배포-github-actions)
3. [수동 배포 (긴급 상황)](#-수동-배포-긴급-상황)
4. [배포 확인](#-배포-확인)
5. [문제 해결](#-문제-해결)
6. [롤백](#-롤백)
7. [서버 정보](#-서버-정보)

---

## 🚀 배포 방식

### 주요 배포 방법

| 방법 | 사용 시기 | 소요 시간 |
|------|----------|----------|
| **GitHub Actions** (권장) | 일반적인 모든 배포 | 2-3분 |
| **수동 스크립트** | GitHub Actions 실패 시 | 1-2분 |

### 배포 흐름

```
코드 수정 → git push → GitHub Actions 트리거
            ↓
       CI 빌드 (패키지 + 앱)
            ↓
       서버 배포 (SCP)
            ↓
       Nginx 재시작
```

---

## 🤖 자동 배포 (GitHub Actions)

### 1. Admin Dashboard

**트리거 조건**:
- `apps/admin-dashboard/**` 수정
- `packages/**` 수정
- `nginx-configs/admin.neture.co.kr.conf` 수정

**배포 워크플로우**: `.github/workflows/deploy-admin.yml`

**배포 URL**: https://admin.neture.co.kr

**실행 방법**:
```bash
# 1. 코드 커밋 & 푸시
git add .
git commit -m "feat: your changes"
git push origin main

# 2. GitHub Actions 자동 실행 (2-3분)

# 3. 배포 확인
curl -s https://admin.neture.co.kr/version.json
```

### 2. Main Site

**트리거 조건**:
- `apps/main-site/**` 수정
- `packages/**` 수정

**배포 워크플로우**: `.github/workflows/deploy-main-site.yml`

**배포 URL**: https://neture.co.kr

### 3. API Server

**배포 방법**: 로컬 배포 (서버에서 직접 실행)

**이유**:
- 빌드 시간이 김 (TypeORM 마이그레이션 등)
- 환경변수가 많음
- PM2 프로세스 관리 필요

**배포 스크립트**: `./scripts/deploy-api-local.sh`

**실행 위치**: API 서버 (43.202.242.215)

```bash
# API 서버 접속
ssh o4o-api

# 배포 실행
cd /home/ubuntu/o4o-platform
./scripts/deploy-api-local.sh
```

### GitHub Actions 확인

**URL**: https://github.com/Renagang21/o4o-platform/actions

**상태**:
- 🟢 초록색 체크: 배포 성공
- 🟡 노란색 원: 진행 중
- 🔴 빨간색 X: 실패

### 수동 트리거 (GitHub UI)

자동 배포가 안 될 때:

1. https://github.com/Renagang21/o4o-platform/actions
2. 원하는 워크플로우 선택 (예: Deploy Admin Dashboard)
3. **Run workflow** 버튼 클릭
4. Branch: `main` 선택 → **Run workflow**

---

## 🆘 수동 배포 (긴급 상황)

### 언제 사용하나?

- GitHub Actions가 반복적으로 실패
- 긴급 핫픽스 필요
- GitHub 서비스 장애

### Admin Dashboard 수동 배포

```bash
# 1. 로컬에서 빌드
pnpm install --frozen-lockfile
pnpm run build:packages
pnpm run build:admin

# 2. 수동 배포 스크립트 실행
./scripts/deploy-admin-manual.sh
```

**스크립트 내용**:
- 빌드 파일 존재 확인
- SSH 연결 테스트
- 서버 백업 생성
- SCP로 파일 전송
- Nginx 설정 업데이트
- 권한 설정 및 재시작

### Main Site 수동 배포

```bash
# 빌드 후
pnpm run build:main-site

# 배포 (deploy-admin-manual.sh 수정하여 사용)
# 또는 rsync로 직접 전송
rsync -avz --delete apps/main-site/dist/ \
  ubuntu@13.125.144.8:/tmp/main-build/
```

---

## 🔍 배포 확인

### 방법 1: Version JSON 확인 (권장)

```bash
# Admin Dashboard
curl -s https://admin.neture.co.kr/version.json

# Main Site
curl -s https://neture.co.kr/version.json

# 예상 출력:
# {
#   "version": "2025.10.19-1459",
#   "buildDate": "2025-10-19T05:59:23.799Z",
#   "environment": "production",
#   "timestamp": 1760853563799
# }
```

### 방법 2: 브라우저 확인

```
https://admin.neture.co.kr/version.json
```

**주의**: 브라우저 캐시 때문에 이전 버전이 보일 수 있음
- Ctrl + Shift + R (강력한 새로고침)
- 시크릿 모드에서 확인

### 방법 3: API 헬스체크

```bash
curl -s https://api.neture.co.kr/api/health
```

---

## 🛠️ 문제 해결

### 문제 1: "패키지 dist 디렉토리가 없음"

**증상**:
```
Error: Cannot find module '@o4o/auth-client/dist/index.js'
```

**원인**: TypeScript composite 프로젝트는 `tsc --build` 필요

**해결**:
```bash
# 모든 패키지 빌드 스크립트 확인
grep '"build":' packages/*/package.json

# 올바른 형식: "build": "npx tsc --build"
# 잘못된 형식: "build": "npx tsc"
```

**수정됨**: commit 478cd7d2에서 수정 완료

### 문제 2: "version.json git pull 충돌"

**증상**:
```
error: Your local changes to the following files would be overwritten by merge:
    apps/admin-dashboard/public/version.json
```

**원인**: version.json이 Git에 추적되었음

**해결**:
```bash
# .gitignore에 추가됨 (commit 3b7a3723)
*.tsbuildinfo
**/version.json
```

**서버에서 충돌 발생 시**:
```bash
ssh o4o-web
cd /home/ubuntu/o4o-platform
git fetch origin
git reset --hard origin/main
```

### 문제 3: "GitHub Actions 빌드 실패"

**확인 순서**:

1. **Actions 로그 확인**
   - https://github.com/Renagang21/o4o-platform/actions
   - 실패한 step 클릭하여 에러 메시지 확인

2. **로컬 빌드 테스트**
   ```bash
   pnpm install --frozen-lockfile
   pnpm run build:packages
   pnpm run build:admin
   ```

3. **common errors**:
   - `pnpm install --frozen-lockfile` 실패 → lockfile 재생성 필요
   - TypeScript 에러 → `pnpm run type-check:frontend`
   - ESLint 에러 → `pnpm run lint`

### 문제 4: "배포는 성공했는데 반영 안됨"

**원인**: 브라우저 캐시

**해결**:
```bash
# 1. 강력한 새로고침
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# 2. 시크릿 모드 확인

# 3. 서버 측 확인
curl -s https://admin.neture.co.kr/version.json
```

### 문제 5: "Nginx 502 Bad Gateway"

**API 서버 확인**:
```bash
ssh o4o-api
pm2 status
pm2 logs o4o-api-server --lines 50
```

**Nginx 확인**:
```bash
ssh o4o-web
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

---

## 🔄 롤백

### 자동 백업

모든 배포 시 자동 백업 생성:
```
/var/www/admin.neture.co.kr.backup.20251019_143000
```

### 롤백 절차

```bash
# 1. 웹서버 접속
ssh o4o-web

# 2. 백업 목록 확인
ls -lt /var/www/admin.neture.co.kr.backup.* | head -5

# 3. 이전 버전 복구
BACKUP_DIR="/var/www/admin.neture.co.kr.backup.20251019_143000"
sudo rm -rf /var/www/admin.neture.co.kr/*
sudo cp -r $BACKUP_DIR/* /var/www/admin.neture.co.kr/

# 4. 권한 설정
sudo chown -R www-data:www-data /var/www/admin.neture.co.kr/
sudo chmod -R 755 /var/www/admin.neture.co.kr/

# 5. Nginx 재시작
sudo systemctl reload nginx

# 6. 확인
curl -s https://admin.neture.co.kr/version.json
```

---

## 🖥️ 서버 정보

### 인프라 구조

```
DNS: api.neture.co.kr → 웹서버 (13.125.144.8)
웹서버: Nginx 프록시 → API 서버 (43.202.242.215:4000)
```

### 서버 상세

| 서버 | IP | SSH Alias | 역할 | 프로세스 |
|------|-----|-----------|------|----------|
| 웹서버 | 13.125.144.8 | `o4o-web` | Nginx 프록시<br/>정적 파일 호스팅 | Nginx |
| API 서버 | 43.202.242.215 | `o4o-api` | Node.js 백엔드<br/>PostgreSQL | PM2: `o4o-api-server` |

### 배포 경로

| 서비스 | 배포 경로 |
|--------|----------|
| Admin Dashboard | `/var/www/admin.neture.co.kr/` |
| Main Site | `/var/www/neture.co.kr/` |
| API Server | `/home/ubuntu/o4o-platform/apps/api-server/` |
| 소스 코드 (Web) | `/home/ubuntu/o4o-platform/` |

### 환경변수

| 파일 | 위치 | 설명 |
|------|------|------|
| `.env` | API 서버 | API 서버 환경변수 |
| Vite 빌드 시 | GitHub Actions | 빌드 타임 환경변수 주입 |

**Admin Dashboard 빌드 환경변수**:
```bash
VITE_API_URL=https://api.neture.co.kr/api/v1
VITE_PUBLIC_APP_ORIGIN=https://neture.co.kr
GENERATE_SOURCEMAP=false
NODE_OPTIONS='--max-old-space-size=4096'
```

---

## 📊 배포 체크리스트

### 배포 전

- [ ] 로컬 빌드 성공 (`pnpm run build`)
- [ ] TypeScript 체크 통과 (`pnpm run type-check:frontend`)
- [ ] ESLint 통과 (`pnpm run lint`)
- [ ] console.log 제거 확인
- [ ] Git 커밋 & 푸시

### 배포 후

- [ ] GitHub Actions 성공 확인
- [ ] version.json 업데이트 확인
- [ ] 주요 기능 동작 확인
- [ ] 브라우저 콘솔 에러 없음
- [ ] API 응답 정상

### 긴급 배포 시

- [ ] 변경 사항 최소화
- [ ] 롤백 계획 수립
- [ ] 백업 확인
- [ ] 모니터링 강화

---

## 🎯 빠른 참조

### 명령어

```bash
# 배포 확인
curl -s https://admin.neture.co.kr/version.json

# 로컬 빌드
pnpm run build:packages && pnpm run build:admin

# 수동 배포
./scripts/deploy-admin-manual.sh

# API 서버 배포 (서버에서)
ssh o4o-api
cd /home/ubuntu/o4o-platform
./scripts/deploy-api-local.sh

# PM2 상태 확인
ssh o4o-api
pm2 status
pm2 logs o4o-api-server
```

### URL

| 서비스 | Production | Version Check |
|--------|-----------|---------------|
| Admin | https://admin.neture.co.kr | /version.json |
| Main Site | https://neture.co.kr | /version.json |
| API | https://api.neture.co.kr | /api/health |
| GitHub Actions | https://github.com/Renagang21/o4o-platform/actions | - |

---

## 📚 추가 문서

### 초기 설정 (한 번만)

- [서버 초기 설정](docs/deployment/SERVER_SETUP_GUIDE.md)
- [GitHub Actions 설정](docs/deployment/GITHUB_ACTIONS_SETUP.md)
- [환경변수 설정](docs/deployment/ENV_SETUP.md)
- [데이터베이스 설정](docs/deployment/DATABASE_SETUP_GUIDE.md)
- [DNS 설정](docs/deployment/DNS_CONFIGURATION_GUIDE.md)
- [Nginx 설정](docs/deployment/nginx-setup.md)

### 참고

- [CI/CD 워크플로우](.github/workflows/)
- [배포 스크립트](scripts/)

---

**마지막 업데이트**: 2025-10-19
**버전**: 4.0
**주요 변경**: GitHub Actions 중심 배포, 패키지 빌드 수정 반영
