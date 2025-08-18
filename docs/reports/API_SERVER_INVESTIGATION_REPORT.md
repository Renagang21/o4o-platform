# API서버 환경 조사 보고서

## 📋 서버 기본 정보
- **OS**: Ubuntu 22.04.1 LTS (Linux 6.8.0-1033-aws)
- **Node.js**: v22.18.0
- **NPM**: 10.9.3
- **PM2 서비스**: o4o-api-server (실행 중, 재시작 횟수: 161회)
- **리스닝 포트**: 
  - PostgreSQL: 5432 (localhost)
  - Redis: 6379 (localhost)
  - Nginx: 80, 443, 8080, 8443
  - SSH: 22

---

## 🔴 절대 보호해야 할 파일들 (데이터 손실 위험)

### 1. 데이터베이스 마이그레이션 (★★★ 최우선 보호)
```
apps/api-server/src/database/migrations/
├── 1700000000000-CreateUsersTable.ts
├── 1704362400000-AddPerformanceIndexes.ts
├── 1737106000000-AddSettingsTable.ts
├── 1738000000000-AddOptimizationIndexes.ts
├── 1738500000000-CreateRefreshTokenTable.ts
└── 1738600000000-CreateLoginAttemptsTable.ts
```
- **중요도**: 극히 높음
- **사유**: DB 스키마 변경 기록, 손실 시 데이터베이스 복구 불가능

### 2. 환경변수 파일 (★★★ 보안 민감)
```
apps/api-server/.env (1216 bytes, 권한: 664)
.env (메인 환경변수)
.env.backup (백업 환경변수)
```
- **중요도**: 극히 높음
- **사유**: DB 접속 정보, JWT 시크릿, API 키 등 포함
- **권한 문제**: 664 권한으로 그룹 쓰기 가능 (보안 취약)

### 3. PM2 설정 파일 (★★★ 서비스 중단 위험)
```
ecosystem.config.apiserver.cjs (641 bytes)
ecosystem.config.cjs
ecosystem.config.local.cjs
ecosystem.config.webserver.cjs
```
- **중요도**: 매우 높음
- **사유**: 서버 프로세스 관리 설정, 잘못 수정 시 서비스 중단

### 4. 사용자 업로드 데이터
```
uploads/ (8.0K)
└── themes/
```
- **중요도**: 중간
- **사유**: 사용자 업로드 파일 (현재 용량 작음)

---

## ⚠️ 동기화 시 주의 파일들 (설정/보안)

### 1. 로그 파일 (정기 정리 필요)
```
logs/ (15M)
├── api-server-combined-*.log
├── api-server-error-*.log
└── *.log.gz (압축된 로그)

apps/api-server/logs/ (18M)
├── combined.log (7.5M)
├── error.log (0)
├── exceptions.log (10.6M) ⚠️ 대용량
└── rejections.log (0)

~/.pm2/logs/ (105M) ⚠️ 대용량
├── o4o-api-error.log (9.3M)
├── o4o-api-out.log (1.6M)
└── 기타 PM2 로그들
```
- **총 로그 용량**: 약 138M
- **주의사항**: exceptions.log 파일이 10M 이상으로 커짐

### 2. 빌드 결과물
```
apps/api-server/dist/ (9.8M)
apps/api-server/dist/database/migrations/
apps/api-server/dist/migrations/
```
- **주의사항**: 소스 변경 시 재빌드 필요

### 3. 기타 환경변수 파일들
```
apps/admin-dashboard/.env.development
apps/admin-dashboard/.env.production
apps/main-site/.env.production
.env.apiserver.example
.env.webserver.example
.env.production.example
```

---

## 🔄 서버 재시작 필요한 변경사항들

### 1. 환경변수 변경
- `.env` 파일 수정 시 → `pm2 reload o4o-api-server --update-env`

### 2. PM2 설정 변경
- `ecosystem.config.apiserver.cjs` 수정 시 → `pm2 restart o4o-api-server`

### 3. 소스코드 변경
- TypeScript 파일 수정 시 → 빌드 후 PM2 재시작
```bash
npm run build --workspace=@o4o/api-server
pm2 reload o4o-api-server
```

### 4. 패키지 의존성 변경
- `package.json` 수정 시 → npm install 후 재시작

---

## 📦 용량 큰 불필요 파일들

### 1. node_modules (1.2G)
- **처리 방안**: 배포 시 `npm ci --production` 사용으로 개발 의존성 제외

### 2. .git (134M)
- **처리 방안**: 히스토리 정리 필요 시 `git gc --aggressive`

### 3. PM2 로그 (105M)
- **처리 방안**: pm2-logrotate 모듈 설정 조정 또는 수동 정리
```bash
pm2 flush  # 모든 로그 삭제
```

### 4. 대용량 로그 파일
```
apps/api-server/logs/exceptions.log (10.6M)
logs/exceptions.log (11M)
```
- **처리 방안**: 로그 로테이션 설정 필요

---

## 🛡️ 보안 권고사항

### 1. 파일 권한 강화
```bash
# .env 파일 권한을 600으로 변경 (소유자만 읽기/쓰기)
chmod 600 apps/api-server/.env
chmod 600 .env
```

### 2. 민감 정보 관리
- JWT 시크릿, DB 비밀번호 등은 AWS Secrets Manager 또는 환경변수로 관리 권장
- .env 파일은 절대 Git에 커밋하지 않음

### 3. 로그 관리
- 로그 로테이션 설정 강화
- 민감 정보가 로그에 기록되지 않도록 확인

---

## 📋 배포 체크리스트

### 배포 전 확인사항
- [ ] 환경변수 파일 백업
- [ ] 데이터베이스 마이그레이션 파일 확인
- [ ] PM2 설정 파일 백업
- [ ] 로그 파일 정리

### 배포 시 주의사항
- [ ] `SERVER_TYPE=apiserver` 환경변수 확인
- [ ] 프론트엔드 빌드 제외 (API서버에서는 불필요)
- [ ] PM2 apiserver 전용 명령어 사용
- [ ] 데이터베이스 연결 상태 확인

### 배포 후 확인사항
- [ ] PM2 프로세스 상태 확인
- [ ] API 헬스체크 (`curl http://localhost:3001/health`)
- [ ] 로그 모니터링
- [ ] 메모리 사용량 확인

---

## 📊 요약

### 보호 우선순위
1. **최우선**: 마이그레이션 파일, 환경변수, PM2 설정
2. **높음**: 사용자 업로드 데이터, 빌드 결과물
3. **중간**: 로그 파일 (정기 백업 후 정리 가능)

### 정리 가능한 항목
- PM2 로그 (105M) - `pm2 flush` 명령으로 정리
- 대용량 exceptions.log 파일들 - 백업 후 삭제 가능
- node_modules (1.2G) - 재설치 가능

### 즉시 조치 필요사항
1. `.env` 파일 권한을 600으로 변경 (보안)
2. exceptions.log 파일 정리 (10M 이상)
3. PM2 로그 정리 (105M)

---

*조사 완료: 2025-08-16*
*서버: o4o-apiserver (Ubuntu 22.04.1 LTS)*