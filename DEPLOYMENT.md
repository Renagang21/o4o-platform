# 배포 가이드 (Deployment Guide)

## 자동 배포 (Automatic Deployment)

GitHub에 푸시하면 자동으로 배포됩니다.

### 배포 조건

각 앱은 다음 조건에서 자동 배포됩니다:

#### Main Site (neture.co.kr)
- **트리거**: `main` 브랜치에 푸시
- **파일 변경**:
  - `apps/main-site/**`
  - `packages/**`
  - `.github/workflows/deploy-main-site.yml`
  - `nginx-configs/neture.co.kr.conf`

#### Admin Dashboard (admin.neture.co.kr)
- **트리거**: `main` 브랜치에 푸시
- **파일 변경**:
  - `apps/admin-dashboard/**`
  - `packages/**`
  - `.github/workflows/deploy-admin.yml`
  - `nginx-configs/admin.neture.co.kr.conf`

#### API Server
- **트리거**: `main` 브랜치에 푸시
- **파일 변경**:
  - `apps/api-server/**`
  - `packages/**`
  - `.github/workflows/deploy-api.yml`

### 배포 확인

1. **GitHub Actions 확인**
   ```bash
   # GitHub repository → Actions 탭
   # 최근 워크플로우 실행 확인
   ```

2. **배포된 파일 해시 확인**
   ```bash
   # Main Site
   curl -s https://neture.co.kr | grep -o 'index-[^.]*\.js'

   # Admin Dashboard
   curl -s https://admin.neture.co.kr | grep -o 'index-[^.]*\.js'
   ```

3. **로컬 빌드와 비교**
   ```bash
   # Main Site
   grep -o 'index-[^.]*\.js' apps/main-site/dist/index.html

   # Admin Dashboard
   grep -o 'index-[^.]*\.js' apps/admin-dashboard/dist/index.html
   ```

## 수동 배포 (Manual Deployment)

GitHub Actions가 실패하거나 긴급 배포가 필요한 경우 사용합니다.

### 방법 1: GitHub UI에서 수동 실행

1. GitHub repository → **Actions** 탭
2. 왼쪽에서 워크플로우 선택:
   - Deploy Main Site
   - Deploy Admin Dashboard
   - Deploy API Server
3. **Run workflow** 버튼 클릭
4. 브랜치 선택 (main) → **Run workflow** 클릭

### 방법 2: 로컬 스크립트 실행

```bash
# 프로젝트 루트에서 실행
./scripts/deploy-manual.sh
```

**메뉴:**
```
1) Main Site (neture.co.kr)
2) Admin Dashboard (admin.neture.co.kr)
3) Both (Main + Admin)
4) Exit
```

**사전 조건:**
- 로컬에서 빌드 완료 (`pnpm run build`)
- SSH 설정 완료 (`o4o-web` alias)

## 배포 문제 해결 (Troubleshooting)

### 1. GitHub Actions가 실행되지 않음

**증상:**
- 코드 푸시했는데 Actions 탭에 워크플로우가 안 보임

**원인:**
- 변경된 파일이 `paths` 필터에 해당하지 않음
- Repository의 Actions가 비활성화됨

**해결:**
```bash
# 1. 변경된 파일 확인
git diff HEAD~1 --name-only

# 2. 워크플로우 파일 자체를 수정해서 트리거
touch .github/workflows/deploy-main-site.yml
git add .github/workflows/deploy-main-site.yml
git commit -m "chore: trigger workflow"
git push

# 3. 또는 수동 실행 (GitHub UI)
```

### 2. 배포는 되었는데 반영이 안 됨

**증상:**
- Actions는 성공했는데 실제 사이트는 이전 버전

**원인:**
- 브라우저 캐시
- CDN 캐시
- Service Worker 캐시

**해결:**
```bash
# 1. 강력한 새로고침
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# 2. 캐시 완전 삭제
개발자 도구 → Application → Storage → Clear site data

# 3. 시크릿 모드에서 확인
Ctrl + Shift + N (Chrome)
Cmd + Shift + N (Safari)
```

### 3. SSH 연결 실패

**증상:**
```
Permission denied (publickey)
```

**해결:**
```bash
# 1. SSH 설정 확인
cat ~/.ssh/config

# 2. SSH alias 테스트
ssh o4o-web "echo 'Connection OK'"

# 3. SSH 키 추가
ssh-add ~/.ssh/your-key
```

### 4. 빌드 파일 해시가 다름

**증상:**
- 로컬: `index-Cd1csR2M.js`
- 배포: `index-WRnrpVjp.js`

**원인:**
- 이전 빌드가 배포됨
- GitHub Actions가 최신 코드를 받지 못함

**해결:**
```bash
# 1. 로컬 리빌드
cd apps/main-site
pnpm run build

# 2. 해시 확인
grep -o 'index-[^.]*\.js' dist/index.html

# 3. 수동 배포
cd ../..
./scripts/deploy-manual.sh
```

## 배포 체크리스트

배포 전 확인 사항:

- [ ] 로컬에서 빌드 성공 (`pnpm run build`)
- [ ] TypeScript 타입 체크 통과 (`pnpm run type-check`)
- [ ] 린트 통과 (`pnpm run lint`)
- [ ] Git 상태 확인 (`git status`)
- [ ] 올바른 브랜치 확인 (`git branch`)
- [ ] 커밋 메시지 작성
- [ ] Push to main

배포 후 확인 사항:

- [ ] GitHub Actions 성공 확인
- [ ] 배포된 파일 해시 일치 확인
- [ ] 실제 사이트 접속 확인
- [ ] 주요 기능 동작 확인
- [ ] 브라우저 콘솔 에러 확인

## 환경별 설정

### Production (배포 환경)

**Main Site:**
- URL: https://neture.co.kr
- Build: `VITE_API_URL=https://api.neture.co.kr/api/v1`
- Path: `/var/www/neture.co.kr`

**Admin Dashboard:**
- URL: https://admin.neture.co.kr
- Build: `VITE_API_URL=https://api.neture.co.kr/api/v1`
- Path: `/var/www/admin.neture.co.kr`

**API Server:**
- URL: https://api.neture.co.kr
- Port: 4000
- PM2: `o4o-api-server`
- Path: `/home/ubuntu/o4o-platform`

### Development (로컬 개발)

```bash
# Main Site
cd apps/main-site
pnpm dev

# Admin Dashboard
cd apps/admin-dashboard
pnpm dev

# API Server
cd apps/api-server
pnpm dev
```

## 긴급 롤백 (Emergency Rollback)

배포 후 심각한 문제 발생 시:

```bash
# 웹 서버 SSH 접속
ssh o4o-web

# 백업 목록 확인
ls -lt /var/www/neture.co.kr.backup.* | head -5

# 최신 백업으로 복구
sudo cp -r /var/www/neture.co.kr.backup.YYYYMMDD_HHMMSS/* /var/www/neture.co.kr/

# Nginx 재시작
sudo systemctl reload nginx
```

## 참고

- **GitHub Actions 로그**: repository → Actions → 워크플로우 클릭
- **서버 로그**: `ssh o4o-web "sudo tail -f /var/log/nginx/error.log"`
- **PM2 로그**: `ssh o4o-api "pm2 logs o4o-api-server"`
