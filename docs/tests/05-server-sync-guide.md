# 🔄 neture.co.kr 서버 동기화 스크립트

**실행 위치:** 서버 (SSH 접속 후)  
**목적:** GitHub에서 최신 코드를 가져와 서버에 반영

---

## 📋 서버에서 실행할 명령어들

### 1. 서버 접속 및 프로젝트 디렉토리 이동
```bash
# SSH로 서버 접속 후
cd ~/o4o-platform  # 또는 프로젝트가 있는 실제 경로
```

### 2. Git Pull로 최신 코드 가져오기
```bash
# 현재 상태 확인
git status

# 최신 코드 가져오기
git pull origin main

# 변경된 파일 목록 확인
git log --oneline -5
```

### 3. 프론트엔드 빌드 및 배포
```bash
# main-site 디렉토리로 이동
cd services/main-site

# 패키지 설치 (새로운 의존성이 있을 경우)
npm install

# 프로덕션 빌드
npm run build

# 빌드 결과 확인
ls -la dist/
```

### 4. 서비스 재시작
```bash
# PM2로 실행 중인 경우
pm2 restart neture-web
pm2 logs neture-web

# 또는 serve 명령어로 재실행
# 기존 프로세스 종료 후
npx serve -s dist -l 3000
```

### 5. Nginx 설정 확인 (필요한 경우)
```bash
# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl reload nginx

# 상태 확인
sudo systemctl status nginx
```

### 6. 서비스 동작 확인
```bash
# 로컬에서 테스트
curl -I http://localhost:3000

# 외부에서 접속 테스트
curl -I https://neture.co.kr
```

---

## 🔍 문제 해결 가이드

### 빌드 오류 발생 시:
```bash
# TypeScript 오류 확인
npm run build 2>&1 | grep "error TS"

# 캐시 정리 후 재시도
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

### PM2 관련 문제:
```bash
# PM2 프로세스 목록 확인
pm2 list

# PM2 로그 확인
pm2 logs neture-web --lines 50

# PM2 프로세스 완전 재시작
pm2 delete neture-web
pm2 start npx --name neture-web -- serve -s dist -l 3000
```

### 포트 충돌 문제:
```bash
# 포트 사용 상황 확인
netstat -tulpn | grep :3000

# 프로세스 강제 종료 (PID 확인 후)
kill -9 <PID>
```

---

## ✅ 성공 확인 체크리스트

- [ ] `git pull origin main` 성공
- [ ] `npm install` 완료 (오류 없음)
- [ ] `npm run build` 성공 (TypeScript 오류 없음)
- [ ] `dist/` 폴더 생성 확인
- [ ] 서비스 재시작 성공
- [ ] https://neture.co.kr 접속 가능
- [ ] 홈페이지 새로운 디자인 표시 확인

---

## 📊 예상되는 주요 변경사항

이번 동기화에서 서버에 반영될 내용:

### 새로 추가된 파일들:
- `docs/tests/` - 4개의 테스트 문서
- `services/api-server/` - 백엔드 API 서버 코드
- `services/main-site/src/pages/AdminDashboard.tsx` - 재작성된 관리자 대시보드
- `services/main-site/src/contexts/AuthContext.tsx` - 인증 시스템

### 수정된 파일들:
- `services/main-site/package.json` - react-query → @tanstack/react-query
- `services/main-site/src/components/RoleProtectedRoute.tsx` - 타입 정의 개선
- `services/main-site/src/pages/Home.tsx` - UI 개선

### 예상 결과:
- 새로운 홈페이지 디자인 표시
- 관리자 대시보드 정상 작동
- TypeScript 오류 감소 (67% 해결)

---

**작성일:** 2025-06-07 23:40 KST  
**GitHub 커밋:** b9b8dd5  
**다음 단계:** 서버에서 위 명령어들 실행 후 동작 확인
