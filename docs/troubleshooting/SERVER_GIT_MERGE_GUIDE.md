# 서버 Git 병합 가이드

## 🔍 현재 상황
서버의 브랜치와 GitHub의 main 브랜치가 분기되어 있습니다. 안전하게 병합해야 합니다.

## 🛠️ 해결 방법 (안전한 병합)

### 옵션 1: 병합 전략 사용 (권장) ✅
```bash
# 1. 현재 상태 확인
git status
git log --oneline -5

# 2. 로컬 변경사항 임시 저장 (있는 경우)
git stash

# 3. 병합 전략 설정 후 pull
git config pull.rebase false
git pull origin main

# 4. 충돌이 있는 경우 해결
# 충돌 파일 확인
git status

# 5. stash 복원 (필요한 경우)
git stash pop
```

### 옵션 2: 강제 동기화 (주의 필요) ⚠️
로컬 변경사항을 모두 버리고 GitHub 버전으로 덮어쓰기:
```bash
# 경고: 로컬 변경사항이 모두 사라집니다!
git fetch origin
git reset --hard origin/main
```

### 옵션 3: 백업 후 새로 클론 (가장 안전) 🛡️
```bash
# 1. 현재 디렉토리 백업
cd /home/ubuntu
mv o4o-platform o4o-platform.backup

# 2. 새로 클론
git clone https://github.com/Renagang21/o4o-platform.git

# 3. 환경 파일 복사
cp o4o-platform.backup/apps/api-server/.env* o4o-platform/apps/api-server/
cp o4o-platform.backup/.env* o4o-platform/ 2>/dev/null || true

# 4. PM2 ecosystem 파일 확인
ls -la o4o-platform/deployment/pm2/
```

## 📋 권장 실행 순서

```bash
# 1. 병합 전략으로 시도
git config pull.rebase false
git pull origin main

# 2. 성공하면 PM2 재시작
pm2 delete o4o-admin-dashboard
pm2 start deployment/pm2/ecosystem.config.js --only o4o-admin-dashboard
pm2 save

# 3. 확인
pm2 status
```

## 🚨 주의사항
- 서버에 중요한 로컬 변경사항이 있는지 확인
- 환경 파일(.env)은 git에 없으므로 백업 필수
- PM2 설정도 확인 필요

---
*즉시 해결이 필요합니다!*