# 🚀 O4O Platform 배포 검증 가이드

> **작성일**: 2025년 9월 2일  
> **상태**: ✅ 서버 배포 완료 확인됨

## 📊 현재 상태

### ✅ 완료된 작업
1. **패키지 버전 통일**
   - 모든 overrides 제거 (자연스러운 의존성 해결)
   - UUID 9.0.1로 통일
   - Express 타입 충돌 해결

2. **서버 배포 완료**
   - Web Server: `git reset --hard origin/main` 실행 및 재빌드
   - API Server: `git reset --hard origin/main` 실행 및 재빌드
   - 모든 서비스 재시작됨

## 🔍 배포 후 검증 체크리스트

### Web Server (o4o-webserver)
```bash
# 1. Git 상태 확인
git status
# Expected: clean working tree

# 2. 패키지 버전 확인
grep '"uuid"' package.json apps/*/package.json
# Expected: 9.0.1

# 3. 빌드 확인
ls -la apps/admin-dashboard/dist/
ls -la apps/main-site/dist/
# Expected: 최신 타임스탬프

# 4. 서비스 상태
pm2 status
# Expected: o4o-web online

# 5. 웹 접속 테스트
curl -I https://admin.neture.co.kr
curl -I https://neture.co.kr
# Expected: 200 OK
```

### API Server (o4o-apiserver)
```bash
# 1. Git 상태 확인
git status
# Expected: clean working tree

# 2. 패키지 버전 확인
grep '"uuid"' apps/api-server/package.json
# Expected: ^9.0.1

# 3. 빌드 확인
ls -la apps/api-server/dist/
# Expected: main.js 및 기타 파일들

# 4. 서비스 상태
pm2 status
# Expected: o4o-api online

# 5. API 헬스체크
curl http://localhost:3001/health
# Expected: {"status":"ok"}

# 6. PM2 로그 확인
pm2 logs o4o-api --lines 50 --nostream
# Expected: 에러 없음
```

## 📝 모니터링 명령어

### 실시간 로그 모니터링
```bash
# Web Server
pm2 logs o4o-web --lines 100

# API Server  
pm2 logs o4o-api --lines 100

# 전체 로그
pm2 logs --lines 100
```

### 리소스 사용량
```bash
# PM2 모니터
pm2 monit

# 메모리 사용량
pm2 info o4o-api | grep memory

# CPU 사용량
pm2 info o4o-api | grep cpu
```

## 🚨 문제 발생 시 대응

### 1. 빌드 실패
```bash
# 캐시 정리
rm -rf node_modules package-lock.json
rm -rf apps/*/node_modules

# 재설치
npm ci

# 재빌드
npm run build
```

### 2. PM2 서비스 문제
```bash
# 재시작
pm2 restart all

# 강제 재시작
pm2 delete all
pm2 start ecosystem.config.[server].cjs

# 로그 확인
pm2 logs --err --lines 100
```

### 3. TypeScript 에러
```bash
# 타입 체크
npm run type-check

# API 서버 타입 체크
cd apps/api-server
npx tsc --noEmit
```

## 📊 패키지 버전 확인

### 핵심 패키지 버전
| 패키지 | 기대 버전 | 확인 명령 |
|--------|-----------|-----------|
| uuid | 9.0.1 | `npm ls uuid` |
| typescript | 5.9.2 | `npm ls typescript` |
| vite | 5.4.x | `npm ls vite` |
| express | 4.18.2 | `npm ls express` |

### 버전 불일치 확인
```bash
# UUID 버전 체크
npm ls uuid 2>&1 | grep "invalid"
# Expected: 출력 없음

# 중복 패키지 체크
npm dedupe --dry-run
# Expected: 변경사항 없음
```

## ✅ 최종 확인 사항

- [ ] Git 상태 clean
- [ ] 모든 빌드 성공
- [ ] PM2 프로세스 online
- [ ] 웹사이트 접속 가능
- [ ] API 엔드포인트 응답 정상
- [ ] 로그에 에러 없음
- [ ] 메모리/CPU 사용량 정상

## 📅 정기 점검 사항

### 일일 점검
- PM2 상태 확인
- 에러 로그 확인
- 메모리 사용량 확인

### 주간 점검
- 패키지 업데이트 확인
- 보안 패치 확인
- 백업 상태 확인

### 월간 점검
- 전체 의존성 감사
- 성능 메트릭 분석
- 용량 계획 검토

---

*이 가이드는 2025년 9월 2일 배포 완료 후 작성되었습니다.*