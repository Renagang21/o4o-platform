# 로컬 개발 환경 명령어 가이드

## 🔄 프로덕션 서버와 동기화

```bash
# 1. 최신 코드 pull
git pull origin main

# 2. 의존성 설치
cd apps/api-server
pnpm install

# 3. 빌드
npm run build

# 4. PM2 재시작
pm2 restart o4o-api-local

# 5. 엔드포인트 테스트
curl -X GET http://localhost:3002/api/v1/users
```

## ✅ 완료된 작업

### 메뉴 시스템
- ✅ `menu_locations` 테이블 생성 및 메뉴 API 수정
- ✅ permalink 설정 엔드포인트 정상 작동
- ✅ 메뉴 컨트롤러 수정 (숫자 ID 지원)

### 인증 시스템
- ✅ JWT Refresh Token 구현
- ✅ 로그인 추적 시스템
- ✅ 계정 잠금 기능 (5회 실패 시)

### 이메일 시스템
- ✅ 사용자 승인/거부 알림
- ✅ 계정 정지/재활성화 알림
- ✅ 커미션 계산 알림
- ✅ 정산 요청 알림

### 커미션 시스템
- ✅ 자동 승인 로직
- ✅ 정산 알림 이메일
- ✅ 주간 리포트 생성

### 배송 추적 시스템
- ✅ ShippingTracking 엔티티
- ✅ 한국 택배사 지원
- ✅ 추적 이력 관리
- ✅ 배송 통계

### 가격 계산 시스템
- ✅ 역할별 차등 가격
- ✅ 수량 할인
- ✅ 쿠폰 시스템
- ✅ 계절 할인 (한국 쇼핑 시즌)
- ✅ 국제 세율 지원

## 🔍 인증이 필요한 엔드포인트 (정상 동작)

- `/api/cpt/types` - 401 반환 (정상)
- `/api/v1/coupons` - 401 반환 (정상)

## ⚠️ 추가 조치 필요

- `/api/v1/users` 엔드포인트는 프로덕션 배포 후 재확인 필요

## 🛠️ 유용한 PM2 명령어

```bash
# PM2 프로세스 목록
pm2 list

# 로그 확인
pm2 logs o4o-api-local

# 실시간 로그 모니터링
pm2 logs o4o-api-local --follow

# 프로세스 재시작
pm2 restart o4o-api-local

# 프로세스 중지
pm2 stop o4o-api-local

# 프로세스 삭제
pm2 delete o4o-api-local

# PM2 상태 모니터링
pm2 monit
```

## 🗄️ 데이터베이스 명령어

```bash
# PostgreSQL 접속
psql -h localhost -U postgres -d o4o_platform

# 마이그레이션 실행
npm run migration:run

# 마이그레이션 되돌리기
npm run migration:revert

# 새 마이그레이션 생성
npm run migration:generate -- -n MigrationName
```

## 🧪 테스트 명령어

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov

# 특정 엔드포인트 테스트
curl -X GET http://localhost:3002/api/health
curl -X GET http://localhost:3002/api/v1/menus/locations
curl -X GET http://localhost:3002/api/public/permalink-settings
```

## 📝 개발 환경 설정

```bash
# .env 파일 설정
cp .env.example .env

# 필수 환경 변수
NODE_ENV=development
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=o4o_platform
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

## 🚀 빠른 시작 스크립트

```bash
# 전체 동기화 및 재시작 (한 번에 실행)
./scripts/sync-local.sh

# 또는 수동으로
git pull origin main && \
cd apps/api-server && \
pnpm install && \
npm run build && \
pm2 restart o4o-api-local && \
pm2 logs o4o-api-local --lines 50
```

## 📊 현재 API 상태

| 엔드포인트 | 상태 | 설명 |
|----------|------|------|
| `/api/health` | ✅ | 헬스 체크 |
| `/api/v1/menus/locations` | ✅ | 메뉴 위치 조회 |
| `/api/public/permalink-settings` | ✅ | 퍼머링크 설정 |
| `/api/cpt/types` | ⚠️ | 인증 필요 (401) |
| `/api/v1/coupons` | ⚠️ | 인증 필요 (401) |
| `/api/v1/users` | ❌ | 404 - 배포 후 확인 필요 |
| `/api/shipping/*` | ✅ | 배송 추적 API |
| `/api/pricing/*` | ✅ | 가격 계산 API |

## 📅 최근 업데이트

- **2025-01-24**: 커미션 시스템, 배송 추적, 가격 계산 시스템 구현
- **2025-01-23**: JWT Refresh Token, 이메일 시스템 구현
- **2025-01-22**: 메뉴 시스템 업데이트, permalink 설정 구현