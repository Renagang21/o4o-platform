# O4O-APISERVER Claude Code 배포 요청

안녕하세요! o4o-platform의 API 서버에 최신 변경사항을 배포해주세요.

## 📌 배포 작업 요청

### 1. 최신 코드 동기화
```bash
# main 브랜치에서 최신 변경사항 가져오기
git pull origin main
```

### 2. 의존성 설치 및 빌드
```bash
# API 서버 패키지 설치 (rate-limit-redis v4.2.0 업데이트 포함)
npm install --workspace=@o4o/api-server

# 의존성 패키지들 먼저 빌드
npm run build:packages

# TypeScript 타입 체크
npm run type-check --workspace=@o4o/api-server

# API 서버 빌드
npm run build --workspace=@o4o/api-server
```

### 3. 환경변수 확인
- `.env.production` 파일이 올바르게 설정되어 있는지 확인
- 특히 다음 변수들이 필수:
  - `DATABASE_URL`
  - `JWT_SECRET` 
  - `REFRESH_TOKEN_SECRET`
  - `REDIS_HOST`, `REDIS_PORT`
  - `NODE_ENV=production`

### 4. 데이터베이스 마이그레이션 확인
```bash
# 마이그레이션 상태 확인
NODE_ENV=production npm run migration:show --workspace=@o4o/api-server

# 필요한 경우에만 실행 (주의: 백업 먼저!)
# NODE_ENV=production npm run migration:run --workspace=@o4o/api-server
```

### 5. PM2로 서버 재시작
```bash
# 무중단 배포로 재시작
pm2 reload o4o-api-server --update-env

# 프로세스 상태 확인
pm2 list

# 로그 확인 (에러 없는지 체크)
pm2 logs o4o-api-server --lines 50
```

### 6. 서비스 연결 확인
```bash
# Redis 연결 테스트
redis-cli ping

# API 헬스체크
curl http://localhost:3001/health

# Swagger 문서 접근 확인
curl -I http://localhost:3001/api-docs
```

### 7. 로그 모니터링
```bash
# Winston 로그 확인 (에러 체크)
tail -f logs/error.log

# PM2 실시간 로그
pm2 logs o4o-api-server --raw
```

## 🔧 주요 변경사항
- console.log를 Winston 로거로 교체
- rate-limit-redis v4.2.0으로 업그레이드
- RedisStore 설정 방식 변경 (sendCommand 패턴 사용)
- TypeScript 빌드 오류 수정

## ⚠️ 주의사항
- Redis 연결이 실패하면 Rate Limiting이 작동하지 않을 수 있음
- 로그 포맷이 Winston으로 변경되었음
- 마이그레이션 실행 전 반드시 DB 백업

## 🔄 문제 발생 시
롤백이 필요한 경우:
```bash
# 이전 커밋으로 되돌리기
git log --oneline -5  # 최근 커밋 확인
git checkout [이전_커밋_해시]

# 재빌드 및 재배포
npm install --workspace=@o4o/api-server
npm run build --workspace=@o4o/api-server
pm2 reload o4o-api-server

# 필요시 마이그레이션 롤백
# npm run migration:revert --workspace=@o4o/api-server
```

작업 완료 후 API 서버가 정상 작동하는지 확인하고 결과를 알려주세요. 감사합니다!