# 📋 웹서버 Git Hook 자동 배포 설정 가이드

## 🎯 목표
로컬에서 `git push production main` 명령만으로 자동 빌드 & 배포

## 📝 웹서버 수작업 설정 단계

### 1. SSH로 웹서버 접속
```bash
ssh ubuntu@admin.neture.co.kr
```

### 2. Bare Git Repository 생성
```bash
# Git 저장소 디렉토리 생성
sudo mkdir -p /var/repos
cd /var/repos

# Bare repository 생성
sudo git init --bare o4o-platform.git

# 소유권 설정 (현재 사용자가 push 할 수 있도록)
sudo chown -R ubuntu:ubuntu /var/repos/o4o-platform.git
```

### 3. Post-receive Hook 설치
```bash
# Hook 파일 생성
sudo nano /var/repos/o4o-platform.git/hooks/post-receive

# 이 파일에 deploy/post-receive-hook.sh 내용을 복사-붙여넣기
# (전체 내용을 복사해서 붙여넣기)

# 실행 권한 부여
sudo chmod +x /var/repos/o4o-platform.git/hooks/post-receive

# 소유권 확인
sudo chown ubuntu:ubuntu /var/repos/o4o-platform.git/hooks/post-receive
```

### 4. 필요한 디렉토리 생성
```bash
# 백업 디렉토리 생성
sudo mkdir -p /var/www/admin-backup
sudo chown -R www-data:www-data /var/www/admin-backup

# 로그 파일 생성
sudo touch /var/log/o4o-deploy.log
sudo chown ubuntu:ubuntu /var/log/o4o-deploy.log
sudo chmod 666 /var/log/o4o-deploy.log
```

### 5. Node.js 환경 확인
```bash
# NVM이 설치되어 있는지 확인
nvm --version

# Node.js 22.18.0 설치 (없는 경우)
nvm install 22.18.0
nvm use 22.18.0
nvm alias default 22.18.0

# pnpm 설치 (없는 경우)
npm install -g pnpm
```

### 6. sudo 권한 설정 (비밀번호 없이 필요한 명령 실행)
```bash
# visudo로 sudoers 파일 편집
sudo visudo

# 다음 라인 추가 (파일 맨 아래)
ubuntu ALL=(ALL) NOPASSWD: /bin/mkdir, /bin/cp, /bin/rm, /bin/chown, /bin/chmod, /usr/bin/tee, /bin/systemctl reload nginx
```

### 7. 테스트
```bash
# 로그 모니터링 (새 터미널에서)
tail -f /var/log/o4o-deploy.log
```

## 🚀 로컬에서 배포하기

### 최초 1회 설정 (이미 완료됨)
```bash
# Production remote 추가
git remote add production ubuntu@admin.neture.co.kr:/var/repos/o4o-platform.git
```

### 배포 명령어
```bash
# 기본 배포
git push production main

# 강제 배포 (주의!)
git push production main --force

# 특정 브랜치 배포
git push production feature/branch-name:main
```

## 📊 배포 프로세스

1. `git push production main` 실행
2. 웹서버의 post-receive hook 자동 실행
3. 코드 체크아웃 → 빌드 → 백업 → 배포 → Nginx 재로드
4. 1-2분 내 사이트 반영 완료

## 🔍 모니터링

### 배포 로그 확인
```bash
# 로컬에서
ssh ubuntu@admin.neture.co.kr 'tail -f /var/log/o4o-deploy.log'

# 또는 package.json의 명령어 사용
npm run deploy:log
```

### 배포 상태 확인
```bash
# 사이트 응답 확인
curl -I https://admin.neture.co.kr

# 버전 확인
curl https://admin.neture.co.kr/version.json
```

## ⚠️ 주의사항

1. **main 브랜치만 자동 배포됨** (다른 브랜치는 무시)
2. **빌드 실패 시 이전 버전 유지** (백업에서 복원 안 함)
3. **최대 3개 백업 유지** (디스크 공간 관리)
4. **sudo 권한 필요한 명령들이 있음**

## 🔧 문제 해결

### 권한 오류
```bash
# Git repository 권한 확인
ls -la /var/repos/o4o-platform.git/

# 필요시 권한 재설정
sudo chown -R ubuntu:ubuntu /var/repos/o4o-platform.git
```

### 빌드 실패
```bash
# 로그 확인
cat /var/log/o4o-deploy.log

# 수동으로 백업 복원
sudo cp -r /var/www/admin-backup/backup-최신날짜/* /var/www/admin.neture.co.kr/
sudo systemctl reload nginx
```

### Hook이 실행되지 않음
```bash
# Hook 파일 확인
ls -la /var/repos/o4o-platform.git/hooks/post-receive

# 실행 권한 확인
sudo chmod +x /var/repos/o4o-platform.git/hooks/post-receive
```

## ✅ 설정 완료 확인

모든 설정이 완료되면:
1. 로컬에서 작은 변경 (예: README 수정)
2. `git add . && git commit -m "test: deployment"`
3. `git push production main`
4. 로그 확인: 자동 빌드 & 배포 진행
5. 사이트 확인: https://admin.neture.co.kr

---

💡 **이제 로컬에서 코드 수정 후 `git push production main` 만으로 자동 배포됩니다!**