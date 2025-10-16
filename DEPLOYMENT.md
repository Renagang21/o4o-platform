# O4O Platform 배포 가이드

> **빠른 시작**: 코드 수정 → `git push origin main` → 2-3분 대기 → 자동 배포 완료

---

## 📑 목차

1. [빠른 시작](#-빠른-시작)
2. [자동 배포 (GitHub Actions)](#-자동-배포-github-actions)
3. [배포 확인](#-배포-확인)
4. [문제 해결](#-문제-해결)
5. [수동 배포](#-수동-배포-긴급-상황)
6. [고급 설정](#-고급-설정)

---

## 🚀 빠른 시작

### 일반적인 배포 흐름

```bash
# 1. 코드 수정 후 커밋
git add .
git commit -m "fix: your changes"

# 2. main 브랜치에 푸시
git push origin main

# 3. 2-3분 대기 (GitHub Actions 자동 실행)

# 4. 배포 확인
./scripts/check-deployment.sh
```

### 어느 앱이 배포되나?

| 변경 파일 | 배포 대상 | 예상 시간 |
|----------|----------|----------|
| `apps/admin-dashboard/**` | Admin Dashboard | 2-3분 |
| `apps/main-site/**` | Main Site | 2-3분 |
| `apps/api-server/**` | API Server | 3-5분 |
| `packages/**` | 영향받는 모든 앱 | 앱 개수에 따라 |

---

## 🤖 자동 배포 (GitHub Actions)

### 배포 트리거 조건

#### 1. Admin Dashboard (`deploy-admin.yml`)
```yaml
paths:
  - 'apps/admin-dashboard/**'
  - 'packages/**'
  - '.github/workflows/deploy-admin.yml'
  - 'nginx-configs/admin.neture.co.kr.conf'
```

**배포 URL**: https://admin.neture.co.kr

#### 2. Main Site (`deploy-main-site.yml`)
```yaml
paths:
  - 'apps/main-site/**'
  - 'packages/**'
  - '.github/workflows/deploy-main-site.yml'
  - 'nginx-configs/neture.co.kr.conf'
```

**배포 URL**: https://neture.co.kr

#### 3. API Server (`deploy-api.yml`)
```yaml
paths:
  - 'apps/api-server/**'
  - 'packages/**'
  - '.github/workflows/deploy-api.yml'
```

**배포 URL**: https://api.neture.co.kr

### GitHub Actions 확인

**URL**: https://github.com/Renagang21/o4o-platform/actions

**상태 색상**:
- 🟢 초록색 체크: 배포 성공
- 🟡 노란색 동그라미: 실행 중
- 🔴 빨간색 X: 배포 실패

### 수동 트리거

자동 배포가 실행되지 않을 때:

1. GitHub → **Actions** 탭
2. 배포할 workflow 선택 (예: Deploy Admin Dashboard)
3. **Run workflow** 버튼 클릭
4. Branch: `main` 선택 → **Run workflow**

---

## 🔍 배포 확인

### 방법 1: 자동 체크 스크립트 (권장)

```bash
./scripts/check-deployment.sh
```

**출력 예시**:
```
🖥️  Admin Dashboard (admin.neture.co.kr)
----------------------------
📦 Remote: 2025.10.16-2137
💻 Local:  2025.10.16-2137
✅ Versions match!
```

### 방법 2: 직접 확인

```bash
# Admin Dashboard
curl -s https://admin.neture.co.kr/version.json

# Main Site
curl -s https://neture.co.kr/version.json

# API Server
curl -s https://api.neture.co.kr/api/health
```

### 방법 3: 브라우저에서 확인

```
https://admin.neture.co.kr/version.json
```

**버전 비교**:
- `version`: 빌드 시각 (예: 2025.10.16-2137)
- `buildDate`: ISO 8601 형식
- `timestamp`: Unix timestamp

---

## 🛠️ 문제 해결

### 문제 1: "Workflow가 트리거되지 않음"

**증상**: 코드 푸시했는데 GitHub Actions에 workflow가 안 보임

**원인**: 변경된 파일이 `paths` 필터에 해당하지 않음

**해결**:

```bash
# 1. 변경된 파일 확인
git diff --name-only HEAD~1 HEAD

# 2. workflow 파일 자체를 수정해서 강제 트리거
touch .github/workflows/deploy-admin.yml
git add .github/workflows/deploy-admin.yml
git commit -m "chore: trigger deployment"
git push

# 3. 또는 수동 실행 (위 "수동 트리거" 참조)
```

---

### 문제 2: "배포는 성공했는데 반영이 안됨"

**증상**: GitHub Actions는 성공했는데 실제 사이트는 이전 버전

**원인**: 브라우저 캐시

**해결**:

```bash
# 1. 강력한 새로고침
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# 2. 시크릿 모드에서 확인
Ctrl + Shift + N (Chrome)

# 3. 캐시 완전 삭제
개발자 도구 → Application → Clear site data
```

**서버 측 확인**:
```bash
# 실제 배포된 버전 확인
curl -s https://admin.neture.co.kr/version.json

# 로컬 빌드 버전 확인
cat apps/admin-dashboard/dist/version.json
```

---

### 문제 3: "빌드는 성공했는데 배포 실패"

**증상**: Build 단계는 성공, Deploy 단계에서 실패

**원인**: SSH 연결 또는 서버 권한 문제

**해결**:

1. **GitHub Actions 로그 확인**
   - Actions → 실패한 workflow 클릭
   - "Move files to web directory" step 확인
   - 에러 메시지 읽기

2. **Secrets 설정 확인**
   ```
   Settings → Secrets and variables → Actions

   필요한 Secrets:
   - WEB_HOST: 웹서버 IP 주소
   - WEB_USER: SSH 사용자명
   - WEB_SSH_KEY: SSH private key
   - API_HOST: API 서버 IP 주소
   - API_USER: SSH 사용자명
   - API_SSH_KEY: SSH private key
   ```

3. **SSH 연결 테스트**
   ```bash
   # 로컬에서 테스트
   ssh $WEB_USER@$WEB_HOST "echo 'SSH OK'"
   ```

---

### 문제 4: "pnpm install --frozen-lockfile 실패"

**증상**: `pnpm install` 단계에서 lockfile 에러

**원인**: `pnpm-lock.yaml`이 `package.json`과 동기화되지 않음

**해결**:

```bash
# 로컬에서 lockfile 재생성
pnpm install

# 변경사항 커밋
git add pnpm-lock.yaml
git commit -m "chore: update lockfile"
git push
```

---

### 문제 5: "GitHub Actions 로그에서 디버깅"

**로그 찾는 방법**:

1. https://github.com/Renagang21/o4o-platform/actions
2. 실패한 workflow 클릭
3. 실패한 job 클릭
4. 각 step 확장해서 에러 메시지 확인

**주요 step**:
- `Install dependencies`: pnpm install 관련
- `Build admin dashboard`: 빌드 에러
- `Copy build files`: SCP 전송 문제
- `Move files to web directory`: 서버 측 문제

---

## 🆘 수동 배포 (긴급 상황)

### 언제 사용하나?

- GitHub Actions가 계속 실패할 때
- 긴급 핫픽스가 필요할 때
- 네트워크 문제로 자동 배포가 안될 때

### 사전 조건

```bash
# 1. SSH 설정 확인
cat ~/.ssh/config | grep "o4o-web"

# 2. 로컬 빌드 완료
pnpm run build:admin  # 또는 build:main-site
```

### 수동 배포 실행

```bash
# 대화형 메뉴
./scripts/deploy-manual.sh

# 메뉴 선택:
# 1) Main Site (neture.co.kr)
# 2) Admin Dashboard (admin.neture.co.kr)
# 3) Both (Main + Admin)
```

### 수동 배포 흐름

1. 빌드 파일 존재 확인
2. SSH 연결 테스트
3. 서버에 백업 생성
4. 빌드 파일 전송 (SCP)
5. 파일 이동 및 권한 설정
6. Nginx 재시작

---

## 🔄 롤백 (Rollback)

### 자동 백업

모든 배포 시 자동으로 백업 생성:
```
/var/www/admin.neture.co.kr.backup.20251016_143000
```

### 롤백 방법

```bash
# 1. 서버 접속
ssh ubuntu@13.125.144.8

# 2. 백업 목록 확인
ls -lt /var/www/admin.neture.co.kr.backup.*

# 3. 복구
sudo rm -rf /var/www/admin.neture.co.kr/*
sudo cp -r /var/www/admin.neture.co.kr.backup.20251016_143000/* \
  /var/www/admin.neture.co.kr/

# 4. 권한 설정
sudo chown -R www-data:www-data /var/www/admin.neture.co.kr/
sudo chmod -R 755 /var/www/admin.neture.co.kr/

# 5. Nginx 재시작
sudo systemctl reload nginx
```

---

## 🔧 고급 설정

### CI/CD Workflow 수정

**파일 위치**: `.github/workflows/`

**주요 설정**:

```yaml
# 배포 타이밍 조정
concurrency:
  group: deploy-admin-${{ github.ref }}
  cancel-in-progress: false  # true로 변경 시 이전 배포 취소

# Node.js 버전
node-version: '22.18.0'

# 빌드 메모리 제한
NODE_OPTIONS: '--max-old-space-size=4096'

# 환경 변수
VITE_API_URL: https://api.neture.co.kr/api/v1
```

### Nginx 캐시 설정

배포 시 Nginx 설정도 함께 업데이트:

```bash
# 파일 위치
nginx-configs/admin.neture.co.kr.conf

# 수정 후 자동 배포됨 (paths 필터에 포함)
```

### 배포 알림 설정

GitHub Actions에 Slack/Discord 알림 추가 가능:

```yaml
- name: Notify deployment
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "✅ Admin Dashboard deployed successfully!"
      }
```

---

## 📊 배포 모니터링

### 실시간 확인

```bash
# 10초마다 배포 상태 확인
watch -n 10 ./scripts/check-deployment.sh
```

### 로그 확인

```bash
# GitHub Actions 로그
https://github.com/Renagang21/o4o-platform/actions

# 서버 로그 (API Server)
ssh ubuntu@43.202.242.215
pm2 logs o4o-api-server

# Nginx 로그 (Web Server)
ssh ubuntu@13.125.144.8
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🎯 빠른 참조

### 명령어

| 작업 | 명령어 |
|------|--------|
| 배포 상태 확인 | `./scripts/check-deployment.sh` |
| 전체 빌드 | `pnpm run build` |
| Admin만 빌드 | `pnpm run build:admin` |
| Main Site만 빌드 | `pnpm run build:main-site` |
| 수동 배포 | `./scripts/deploy-manual.sh` |

### URL

| 서비스 | URL |
|--------|-----|
| Admin Dashboard | https://admin.neture.co.kr |
| Main Site | https://neture.co.kr |
| API Server | https://api.neture.co.kr |
| GitHub Actions | https://github.com/Renagang21/o4o-platform/actions |

### 서버 정보

| 서버 | IP | 용도 |
|------|-----|-----|
| Web Server | 13.125.144.8 | Admin + Main Site (Nginx) |
| API Server | 43.202.242.215 | Backend API (Node.js + PM2) |

---

## 📞 지원

### 문제 발생 시 체크리스트

- [ ] `./scripts/check-deployment.sh` 실행
- [ ] GitHub Actions 로그 확인
- [ ] `git diff --name-only HEAD~1 HEAD` 실행
- [ ] 브라우저 캐시 삭제 (Ctrl + Shift + R)
- [ ] 시크릿 모드에서 확인
- [ ] SSH 연결 테스트
- [ ] 서버 디스크 용량 확인

### 추가 문서

- **CI/CD 상세**: `.github/workflows/README-CI-CD.md`
- **스크립트 가이드**: `scripts/README-DEPLOYMENT.md` (있다면)

---

**마지막 업데이트**: 2025-10-16
**버전**: 3.0
