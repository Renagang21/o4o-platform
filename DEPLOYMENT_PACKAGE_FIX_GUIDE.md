# 📦 O4O Platform 패키지 수정 배포 가이드

> **작성일**: 2025년 9월 2일  
> **커밋**: dbae24fa (fix: resolve critical package conflicts and NestJS/Express mismatch)

## 🎯 수정 내용 요약

### 해결된 문제들
1. **API 서버 NestJS/Express 불일치** - 빌드 스크립트 수정
2. **UUID 버전 충돌** (9.0.1 vs 11.1.0) - 9.0.1로 통일
3. **Vite 버전 차이** (5.4.19 vs 7.1.1) - 5.4.19로 통일
4. **package.json overrides 정리** - React 관련만 유지

---

## 🖥️ 환경별 적용 가이드

### 1️⃣ API Server (o4o-apiserver) 적용

**⚠️ 주의: package.json 동기화 보호 해제 필요**

```bash
# 1. 서버 접속
ssh o4o-apiserver

# 2. 작업 디렉토리로 이동
cd /home/ubuntu/o4o-platform

# 3. 현재 상태 백업 (중요!)
cp package.json package.json.backup.$(date +%Y%m%d_%H%M%S)
cp apps/api-server/package.json apps/api-server/package.json.backup.$(date +%Y%m%d_%H%M%S)

# 4. Git 동기화 보호 해제 (중요!)
git config --unset core.sparseCheckout
git update-index --no-skip-worktree package.json
git update-index --no-skip-worktree apps/api-server/package.json
git update-index --no-skip-worktree apps/admin-dashboard/package.json

# 5. 최신 변경사항 가져오기
git fetch origin main
git pull origin main

# 6. 종속성 재설치
rm -rf node_modules package-lock.json
pnpm install

# 7. API 서버 재빌드
cd apps/api-server
npm run build

# 8. PM2 재시작
pm2 restart o4o-api

# 9. 상태 확인
pm2 status
pm2 logs o4o-api --lines 50

# 10. 동기화 보호 재설정 (선택사항)
# 만약 다시 보호하려면:
# git update-index --skip-worktree package.json
```

---

### 2️⃣ Web Server (o4o-webserver) 적용

**⚠️ 주의: package.json 동기화 보호 해제 필요**

```bash
# 1. 서버 접속
ssh o4o-webserver

# 2. 작업 디렉토리로 이동
cd /home/ubuntu/o4o-platform

# 3. 현재 상태 백업
cp package.json package.json.backup.$(date +%Y%m%d_%H%M%S)
cp apps/admin-dashboard/package.json apps/admin-dashboard/package.json.backup.$(date +%Y%m%d_%H%M%S)

# 4. Git 동기화 보호 해제 (중요!)
git update-index --no-skip-worktree package.json
git update-index --no-skip-worktree apps/admin-dashboard/package.json

# 5. 최신 변경사항 가져오기
git fetch origin main
git pull origin main

# 6. 종속성 재설치
rm -rf node_modules package-lock.json
pnpm install

# 7. 프론트엔드 빌드
npm run build:web

# 8. PM2 재시작 (정적 파일 서버인 경우)
pm2 restart o4o-web

# 9. Nginx 재시작 (필요시)
sudo nginx -t
sudo systemctl reload nginx

# 10. 동기화 보호 재설정 (선택사항)
# git update-index --skip-worktree package.json
```

---

### 3️⃣ Local Development (조사용 로컬) 적용

**💡 로컬은 덮어쓰기 방식으로 간단하게 처리**

```bash
# 1. 작업 디렉토리로 이동
cd ~/o4o-platform

# 2. 변경사항 백업 (있는 경우)
git stash save "backup before package fix $(date +%Y%m%d_%H%M%S)"

# 3. 최신 코드로 완전 덮어쓰기
git fetch origin main
git reset --hard origin/main

# 4. 클린 설치
rm -rf node_modules package-lock.json
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# 5. 전체 재설치
pnpm install

# 6. 빌드 테스트
npm run build:packages
npm run build:apps

# 7. 개발 서버 실행 테스트
npm run dev
```

---

## ✅ 검증 체크리스트

### API Server 검증
```bash
# 1. 빌드 성공 확인
cd apps/api-server
npm run build
# → "Successfully compiled" 메시지 확인

# 2. TypeScript 타입 체크
npm run type-check
# → 오류 없음 확인

# 3. PM2 상태 확인
pm2 status
# → o4o-api가 online 상태

# 4. API 응답 테스트
curl http://localhost:3001/health
```

### Web Server 검증
```bash
# 1. Admin Dashboard 빌드 확인
cd apps/admin-dashboard
npm run build
# → dist 폴더 생성 확인

# 2. 정적 파일 확인
ls -la dist/
# → index.html, assets 폴더 존재

# 3. Nginx 상태
sudo nginx -t
sudo systemctl status nginx
```

### Local 검증
```bash
# 1. 전체 빌드
npm run build
# → 모든 패키지와 앱 빌드 성공

# 2. 개발 서버
npm run dev
# → 포트 5173 (Admin), 3001 (API) 접근 가능
```

---

## 🚨 롤백 절차

문제 발생 시 백업에서 복원:

```bash
# package.json 복원
cp package.json.backup.[timestamp] package.json
cp apps/api-server/package.json.backup.[timestamp] apps/api-server/package.json

# 이전 커밋으로 롤백
git reset --hard dbae24fa^  # 이전 커밋으로

# 종속성 재설치
rm -rf node_modules package-lock.json
pnpm install

# 서비스 재시작
pm2 restart all
```

---

## 📝 주요 변경 파일

| 파일 | 주요 변경 내용 |
|------|---------------|
| `package.json` | UUID 9.0.1 추가, overrides 정리 |
| `apps/api-server/package.json` | build 스크립트 수정, @nestjs/cli 제거, vite 5.4.19 |
| `apps/admin-dashboard/package.json` | UUID ^9.0.1로 변경 |
| `package-lock.json` | 전체 종속성 트리 재생성 |

---

## 💡 팁

1. **동기화 보호 상태 확인**
   ```bash
   git ls-files -v | grep ^S
   # S로 시작하는 파일들이 skip-worktree 상태
   ```

2. **PM2 로그 실시간 모니터링**
   ```bash
   pm2 logs --lines 100 --raw
   ```

3. **메모리 부족 시**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run build
   ```

---

*이 가이드는 커밋 dbae24fa 기준으로 작성되었습니다.*