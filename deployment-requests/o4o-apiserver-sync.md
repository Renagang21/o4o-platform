# O4O-APISERVER 동기화 배포 요청

## 배포 대상
- **저장소**: o4o-platform (API Server)
- **브랜치**: main
- **대상 서버**: Production API Server
- **포트**: 3001

## 동기화할 변경사항

### 1. 최신 코드 변경사항
```bash
# 최신 변경사항 가져오기
git pull origin main

# 의존성 업데이트 (워크스페이스 사용)
npm install --workspace=@o4o/api-server

# 패키지 빌드 (의존성 패키지 먼저)
npm run build:packages
npm run build --workspace=@o4o/api-server
```

### 2. 주요 변경사항
- console.log 제거 및 Winston 로거 사용
- RedisStore 설정 업데이트 (rate-limit-redis v4.2.0)
- TypeScript 빌드 오류 수정
- 미들웨어 및 서비스 인덱스 파일 정리

### 3. 환경 변수 확인
```bash
# .env.production 파일 확인
cat .env.production

# 필수 환경변수 체크
- DATABASE_URL
- JWT_SECRET
- REFRESH_TOKEN_SECRET
- REDIS_HOST
- REDIS_PORT
- TOSS_CLIENT_KEY
- TOSS_SECRET_KEY
- NODE_ENV=production
```

### 4. 데이터베이스 마이그레이션
```bash
# 마이그레이션 상태 확인
NODE_ENV=production npm run migration:show --workspace=@o4o/api-server

# 필요시 마이그레이션 실행
NODE_ENV=production npm run migration:run --workspace=@o4o/api-server
```

### 5. 빌드 및 검증
```bash
# TypeScript 타입 체크
npm run type-check --workspace=@o4o/api-server

# 린트 검사
npm run lint --workspace=@o4o/api-server

# 프로덕션 빌드
npm run build --workspace=@o4o/api-server

# 빌드 결과 확인
ls -la apps/api-server/dist/
```

### 6. PM2 프로세스 관리
```bash
# PM2 설정 파일 확인
cat ecosystem.config.js

# 현재 프로세스 확인
pm2 list

# 프로세스 재시작 (무중단 배포)
pm2 reload o4o-api-server --update-env

# 클러스터 모드로 실행 중인 경우
pm2 reload ecosystem.config.js --only o4o-api-server

# 로그 확인
pm2 logs o4o-api-server --lines 100
```

### 7. Redis 연결 확인
```bash
# Redis 연결 테스트
redis-cli ping

# Rate limiting 키 확인
redis-cli keys "rl:*"
```

### 8. 헬스체크
```bash
# API 서버 상태 확인
curl http://localhost:3001/health

# API 버전 확인
curl http://localhost:3001/api/v1/version

# Swagger 문서 접근 확인
curl -I http://localhost:3001/api-docs
```

### 9. 로그 모니터링
```bash
# Winston 로그 확인
tail -f logs/combined.log
tail -f logs/error.log

# PM2 로그 스트리밍
pm2 logs o4o-api-server --raw
```

## 배포 체크리스트
- [ ] Git 최신 코드 동기화 완료
- [ ] 의존성 패키지 설치 완료 (rate-limit-redis v4.2.0 포함)
- [ ] 환경변수 설정 확인
- [ ] 데이터베이스 마이그레이션 확인
- [ ] TypeScript 컴파일 성공
- [ ] 린트 검사 통과
- [ ] 프로덕션 빌드 성공
- [ ] PM2 프로세스 재시작 완료
- [ ] Redis 연결 정상 확인
- [ ] API 헬스체크 정상 응답
- [ ] 로그 레벨 production 설정 확인
- [ ] 에러 로그 확인
- [ ] Rate limiting 동작 확인

## 롤백 계획
문제 발생시 즉시 이전 버전으로 롤백:
```bash
# 이전 커밋으로 되돌리기
git checkout [previous-commit-hash]

# 의존성 재설치 및 빌드
npm install --workspace=@o4o/api-server
npm run build --workspace=@o4o/api-server

# PM2 재시작
pm2 reload o4o-api-server --update-env

# 데이터베이스 롤백 (필요시)
npm run migration:revert --workspace=@o4o/api-server
```

## 모니터링
- PM2 모니터링 대시보드
- Redis 모니터링 (메모리 사용량, 연결 수)
- 데이터베이스 연결 풀 모니터링
- API 응답 시간 측정
- Rate limiting 통계
- 에러율 모니터링
- CPU/메모리 사용량 확인

## 주의사항
- Rate limiting 설정이 변경되었으므로 클라이언트 영향도 확인
- Winston 로거 사용으로 로그 포맷이 변경됨
- TypeORM 마이그레이션 실행 시 데이터베이스 백업 필수
- Redis 연결 실패 시 Rate limiting이 작동하지 않을 수 있음