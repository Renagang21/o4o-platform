# 문제 해결 가이드

## 🔥 긴급 상황 대응

### 사이트가 안 보일 때 (5분 해결법)
```bash
# 1단계: 프로세스 상태 확인
pm2 status
pm2 logs main-site --lines 20

# 2단계: 강제 재시작
pm2 restart main-site
pm2 restart api-server

# 3단계: 빌드 재실행
npm run build:web
npm run build:api

# 4단계: 브라우저 캐시 제거
# Ctrl+F5 (강력 새로고침)
```

### Git 동기화 충돌 해결
```bash
# 안전한 동기화 (데이터 손실 방지)
git status
git stash push -m "backup-$(date +%Y%m%d_%H%M)"
git fetch origin
git reset --hard origin/main

# 백업된 변경사항 복구 (필요시)
git stash list
git stash pop stash@{0}
```

## 🔧 자주 발생하는 문제

### 1. 환경변수 문제
**증상**: Database connection failed, JWT secret missing
**해결**:
```bash
# .env 파일 확인
cat .env | grep -E "DATABASE_URL|JWT_SECRET|REDIS_URL"

# 없으면 .env.example에서 복사
cp .env.example .env
nano .env  # 실제 값으로 수정
```

### 2. 포트 충돌 문제  
**증상**: Port 3000 already in use
**해결**:
```bash
# 포트 사용 프로세스 확인
lsof -i :3000
netstat -tulpn | grep :3000

# 프로세스 종료
kill -9 [PID]
# 또는 다른 포트 사용
PORT=3001 npm run dev
```

### 3. npm/yarn 의존성 문제
**증상**: Module not found, version conflicts
**해결**:
```bash
# 캐시 정리 후 재설치
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# 또는 yarn 사용시
rm -rf node_modules yarn.lock  
yarn cache clean
yarn install
```

### 4. 빌드 실패 문제
**증상**: Build failed, TypeScript errors
**해결**:
```bash
# TypeScript 타입 체크
npx tsc --noEmit

# 점진적 빌드
npm run build:api    # API만 먼저
npm run build:web    # 웹앱 다음

# 캐시 제거 후 재빌드
rm -rf dist/ build/
npm run build:all
```

### 5. Medusa 버전 불일치 문제
**증상**: Medusa configuration errors, deprecated APIs
**해결**:
```bash
# 현재 Medusa 버전 확인
npm list @medusajs/medusa

# 최신 문서 확인 (필수!)
# https://docs.medusajs.com/
# 설치된 버전과 문서 버전 일치 여부 확인

# 설정 파일 버전별 마이그레이션
# v1.x → v2.x 설정 변경사항 적용
```

### 6. TipTap 에디터 문제
**증상**: Editor not rendering, extension errors
**해결**:
```bash
# TipTap 관련 패키지 버전 확인
npm list @tiptap/react @tiptap/starter-kit

# 호환되는 버전으로 다운그레이드/업그레이드
npm install @tiptap/react@^2.0.0 @tiptap/starter-kit@^2.0.0
```

## 📊 모니터링 명령어
```bash
# 시스템 상태 확인
pm2 monit
pm2 logs --lines 50

# 디스크 사용량
df -h
du -sh ./node_modules

# 메모리 사용량  
free -h
ps aux | grep node
```

## 🔍 서버별 문제 진단

### API 서버 문제
```bash
# API 서버 로그 확인
pm2 logs api-server --lines 100

# 데이터베이스 연결 테스트
npm run db:test

# API 엔드포인트 테스트
curl http://localhost:4000/health
```

### 웹 서버 문제
```bash
# 웹 서버 로그 확인
pm2 logs main-site --lines 100

# 정적 파일 확인
ls -la ./build/static/

# React 빌드 상태 확인
npm run build:web -- --verbose
```

## 🆘 복구 불가능할 때
```bash
# 마지막 수단: 전체 재설치
git clone https://github.com/Renagang21/o4o-platform.git o4o-platform-fresh
cd o4o-platform-fresh
cp ../o4o-platform/.env .env
npm install
npm run dev:all
```

## 📝 문제 해결 후 할 일
1. 해결 방법을 이 문서에 추가 (PR 또는 직접 수정)
2. 같은 문제 재발 방지를 위한 설정 개선
3. 팀원들과 해결책 공유
4. 정기 점검 항목에 추가 고려

---

**마지막 업데이트**: 2024-06-18  
**다음 리뷰**: 문제 발생 시 또는 월 1회