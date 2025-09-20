# 🚀 O4O Platform API Server - 로컬 개발 환경 설정

Docker 없이 네이티브 PostgreSQL을 사용한 간편한 로컬 개발 환경 구성 가이드입니다.

## ⚡ 빠른 시작 (Quick Start)

### 1단계: 초기 설정 (한 번만 실행)
```bash
cd /home/sohae21/o4o-platform/apps/api-server
pnpm run setup:local
```

### 2단계: 개발 서버 시작
```bash
pnpm run dev:quick
```

그게 전부입니다! 🎉

---

## 📋 상세 설정 과정

### 자동 설정 내용
- PostgreSQL 설치 및 설정
- 개발용 데이터베이스 생성 (`o4o_platform`)
- 전용 사용자 생성 (`o4o_user`)
- `.env` 파일 자동 생성
- 데이터베이스 마이그레이션 실행

### 생성되는 데이터베이스 정보
```
호스트: localhost:5432
데이터베이스: o4o_platform
사용자: o4o_user
비밀번호: o4o_dev_password_2024
```

---

## 🛠 개발 명령어

### 기본 개발
```bash
# 개발 서버 시작 (자동 DB 체크 포함)
pnpm run dev:quick

# 단순 개발 서버 시작
pnpm run dev
```

### 데이터베이스 관리
```bash
# PostgreSQL 서비스 관리
pnpm run db:start      # PostgreSQL 시작
pnpm run db:stop       # PostgreSQL 중지
pnpm run db:status     # PostgreSQL 상태 확인
pnpm run db:logs       # PostgreSQL 로그 보기

# 마이그레이션 관리
pnpm run migration:run    # 마이그레이션 실행
pnpm run migration:show   # 마이그레이션 상태 확인
pnpm run migration:revert # 마지막 마이그레이션 되돌리기

# 데이터베이스 초기화
pnpm run db:reset      # DB 스키마 재생성 + 시드 데이터
```

### 빌드 및 배포
```bash
pnpm run build        # TypeScript 빌드
pnpm run type-check   # 타입 체크
pnpm run lint         # ESLint 검사
```

---

## 🔍 트러블슈팅

### PostgreSQL 연결 실패
```bash
# PostgreSQL 서비스 상태 확인
pnpm run db:status

# PostgreSQL 시작
pnpm run db:start

# 연결 테스트
pnpm run db:test
```

### 마이그레이션 오류
```bash
# 현재 마이그레이션 상태 확인
pnpm run migration:show

# 마이그레이션 강제 실행
cd apps/api-server
npx typeorm-ts-node-commonjs -d src/database/data-source.ts migration:run
```

### .env 파일 재생성
```bash
# 기존 .env 삭제 후 재설정
rm .env
pnpm run setup:local
```

---

## 🌐 접속 정보

개발 서버가 시작되면 다음 URL로 접속할 수 있습니다:

- **API 서버**: http://localhost:3002
- **Health Check**: http://localhost:3002/api/health
- **API 문서**: http://localhost:3002/api-docs

---

## 💡 추가 팁

### PostgreSQL 직접 접속
```bash
# psql로 데이터베이스 접속
psql -h localhost -U o4o_user -d o4o_platform

# 또는 환경변수 사용
export PGPASSWORD=o4o_dev_password_2024
psql -h localhost -U o4o_user -d o4o_platform
```

### 개발 환경 변수 수정
`.env` 파일을 직접 편집하여 필요한 설정을 변경할 수 있습니다:
```bash
nano /home/sohae21/o4o-platform/apps/api-server/.env
```

### 메모리 사용량 최적화
Docker 없이 네이티브 PostgreSQL을 사용하므로 메모리 사용량이 크게 줄어듭니다:
- Docker Compose: ~500MB
- Native PostgreSQL: ~50MB

---

## 🤝 문제 해결이 안 될 때

1. **PostgreSQL 재설치**:
   ```bash
   sudo apt remove --purge postgresql postgresql-contrib
   sudo apt autoremove
   pnpm run setup:local
   ```

2. **권한 문제**: 스크립트를 `sudo` 권한으로 실행했는지 확인

3. **포트 충돌**: 5432 포트가 이미 사용 중인지 확인
   ```bash
   sudo netstat -tlnp | grep 5432
   ```

더 자세한 도움이 필요하면 팀에 문의해 주세요! 🚀