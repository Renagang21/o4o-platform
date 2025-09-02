# 🔄 O4O Platform 서버 패키지 업데이트 가이드

> **작성일**: 2025년 9월 2일  
> **목적**: 로컬 패키지 버전으로 통일된 코드를 서버에 적용

## 🎯 주요 변경사항

1. **모든 package.json overrides 제거**
   - 로컬 환경의 패키지 버전 그대로 사용
   - npm이 자연스럽게 의존성 해결

2. **Express 타입 충돌 해결**
   - overrides 없이 로컬에서 해결되는 버전 사용
   - 4.17.x와 5.0.x가 혼재하지만 작동

3. **API 서버 개발 스크립트 수정**
   - `nest start` → `nodemon + ts-node` 방식

---

## 🖥️ Web Server (o4o-webserver) 작업

### 사전 준비
```bash
# 서버 접속
ssh o4o-webserver
cd /home/ubuntu/o4o-platform

# 현재 상태 백업
cp package.json package.json.backup.$(date +%Y%m%d_%H%M%S)
cp -r apps/admin-dashboard/package.json apps/admin-dashboard/package.json.backup.$(date +%Y%m%d_%H%M%S)
cp -r apps/main-site/package.json apps/main-site/package.json.backup.$(date +%Y%m%d_%H%M%S)
```

### Git 동기화 보호 해제
```bash
# package.json 파일들의 동기화 보호 해제
git update-index --no-skip-worktree package.json
git update-index --no-skip-worktree apps/admin-dashboard/package.json
git update-index --no-skip-worktree apps/main-site/package.json

# 상태 확인
git ls-files -v | grep "^S"  # S로 시작하는 파일이 없어야 함
```

### 코드 업데이트 및 빌드
```bash
# 최신 코드 가져오기 (주의: 로컬 변경사항 덮어쓰기)
git fetch origin main
git reset --hard origin/main

# 클린 설치
rm -rf node_modules package-lock.json
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# 종속성 설치
npm install

# 프론트엔드 빌드
npm run build:packages  # 패키지 먼저 빌드
npm run build:web       # 프론트엔드 앱 빌드

# 빌드 결과 확인
ls -la apps/admin-dashboard/dist/
ls -la apps/main-site/dist/
```

### 서비스 재시작
```bash
# PM2 재시작 (정적 파일 서버인 경우)
pm2 restart o4o-web
pm2 status

# Nginx 재로드
sudo nginx -t
sudo systemctl reload nginx

# 상태 확인
curl -I http://localhost:5173  # Admin
curl -I http://localhost:5174  # Main site
```

---

## 💻 API Server (o4o-apiserver) 작업

### 사전 준비
```bash
# 서버 접속
ssh o4o-apiserver
cd /home/ubuntu/o4o-platform

# 현재 상태 백업
cp package.json package.json.backup.$(date +%Y%m%d_%H%M%S)
cp apps/api-server/package.json apps/api-server/package.json.backup.$(date +%Y%m%d_%H%M%S)

# 현재 빌드 백업 (롤백용)
cp -r apps/api-server/dist apps/api-server/dist.backup.$(date +%Y%m%d_%H%M%S)
```

### Git 동기화 보호 해제
```bash
# package.json 파일들의 동기화 보호 해제
git update-index --no-skip-worktree package.json
git update-index --no-skip-worktree apps/api-server/package.json

# 상태 확인
git ls-files -v | grep "^S"
```

### 코드 업데이트 및 빌드
```bash
# 최신 코드 가져오기
git fetch origin main
git reset --hard origin/main

# 클린 설치
rm -rf node_modules package-lock.json
rm -rf apps/api-server/node_modules

# 종속성 설치
npm install

# API 서버 빌드
cd apps/api-server
npm run build

# 빌드 성공 확인
ls -la dist/
```

### 서비스 재시작
```bash
# PM2 재시작
pm2 restart o4o-api

# 상태 확인
pm2 status
pm2 logs o4o-api --lines 100

# API 헬스체크
curl http://localhost:3001/health
```

---

## ✅ 검증 체크리스트

### Web Server
- [ ] `git status` 깨끗한 상태
- [ ] Admin Dashboard 접속 가능 (http://admin.neture.co.kr)
- [ ] Main Site 접속 가능 (http://neture.co.kr)
- [ ] 정적 파일 제공 정상
- [ ] Nginx 에러 로그 확인

### API Server
- [ ] `git status` 깨끗한 상태
- [ ] API 서버 빌드 성공
- [ ] PM2 상태 online
- [ ] API 엔드포인트 응답 정상
- [ ] 데이터베이스 연결 정상

---

## 🚨 문제 발생 시 롤백

### 빠른 롤백 (백업 사용)
```bash
# package.json 복원
cp package.json.backup.[timestamp] package.json
cp apps/api-server/package.json.backup.[timestamp] apps/api-server/package.json

# dist 폴더 복원 (API 서버)
rm -rf apps/api-server/dist
cp -r apps/api-server/dist.backup.[timestamp] apps/api-server/dist

# 서비스 재시작
pm2 restart all
```

### Git 롤백
```bash
# 이전 커밋으로 롤백
git log --oneline -5
git reset --hard [previous-commit-hash]

# 종속성 재설치
rm -rf node_modules package-lock.json
npm install

# 재빌드 및 재시작
npm run build
pm2 restart all
```

---

## 📝 주의사항

1. **동기화 보호 재설정 (선택사항)**
   ```bash
   # 작업 완료 후 다시 보호하려면
   git update-index --skip-worktree package.json
   ```

2. **메모리 부족 시**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run build
   ```

3. **빌드 실패 시**
   - TypeScript 에러 확인
   - node_modules 완전 삭제 후 재설치
   - 로컬에서 먼저 테스트

4. **PM2 클러스터 모드**
   ```bash
   # 무중단 재시작
   pm2 reload o4o-api
   ```

---

## 📊 현재 패키지 상태

- **overrides 제거**: 모든 overrides 설정 제거
- **Express 타입**: 로컬에서 자연스럽게 해결되는 버전 사용
- **UUID**: 9.0.1 (root dependencies)
- **Vite**: 5.4.19 (통일)
- **TypeScript**: 5.9.2 (통일)

---

## 🔍 모니터링

```bash
# 실시간 로그 모니터링
pm2 logs --lines 100 --raw

# 시스템 리소스 확인
pm2 monit

# API 응답 시간 체크
curl -w "\n응답시간: %{time_total}s\n" http://localhost:3001/health
```

---

*이 가이드는 2025년 9월 2일 기준으로 작성되었습니다.*
*커밋: deb2f500 (chore: trigger CI/CD with local package versions)*