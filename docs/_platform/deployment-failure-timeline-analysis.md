# 배포 실패 타임라인 분석

> **문서 목적**: 마지막 성공 배포 이후 발생한 변화와 연속 실패의 원인 분석
> **작성일**: 2026-01-12
> **분석 범위**: 2026-01-11 04:09 ~ 2026-01-12 07:45

---

## 1. 배포 상태 요약

### 1.1 핵심 수치
- **마지막 성공 배포**: 2026-01-11T04:09:06Z
- **첫 번째 실패 배포**: 2026-01-11T13:12:31Z
- **연속 실패 횟수**: 15회
- **실패 지속 시간**: 약 27시간

### 1.2 마지막 성공 커밋
```
3caa6969e fix: remove console.log from migration files for CI compliance
```

### 1.3 첫 번째 실패 커밋
```
267314fe1 feat: E-commerce Core standardization with O4O Store Templates (Phase 5-9A)
```

---

## 2. 성공과 실패 사이의 변화

### 2.1 커밋 목록 (성공 → 실패)
```
267314fe1 feat: E-commerce Core standardization with O4O Store Templates (Phase 5-9A)
81cb4757a docs(neture): add decision log for legacy code removal
24e7f2132 refactor(neture): remove legacy commerce code
```

### 2.2 Phase 5-9A 커밋 변경 규모
```
77 files changed
10,876 insertions(+)
507 deletions(-)
```

### 2.3 주요 변경 영역

| 영역 | 변경 내용 | 위험도 |
|------|----------|--------|
| **Entities** | 22개 엔티티 ESM 규칙 적용 | 높음 |
| **Controllers** | checkoutController, adminOrderController 수정 | 중간 |
| **Services** | checkout.service 대폭 확장 | 높음 |
| **Guards** | order-creation.guard.ts 신규 (360줄) | 중간 |
| **Tourism** | 새 도메인 전체 추가 | 높음 |
| **Migrations** | AddOrderTypeToCheckoutOrders 신규 | 높음 |

---

## 3. 실패 유형 변화 추이

### 3.1 Phase 1: Cloud Run 배포 실패 (01-11 13:12 ~ 14:32)

| Run ID | 커밋 | 실패 단계 |
|--------|------|-----------|
| 20895702350 | Phase 5-9A | Deploy to Cloud Run |
| 20895830789 | register Tourism/Checkout entities | Deploy to Cloud Run |
| 20895943074 | remove Checkout entities | Deploy to Cloud Run |
| 20896038464 | remove Tourism entities | Deploy to Cloud Run |
| 20896165312 | revert connection.ts | Deploy to Cloud Run |
| 20896765144 | revert to 3caa6969e | Build API server |

**원인 추정**:
- 새로 추가된 Tourism, Checkout 엔티티가 DB 테이블 없이 등록됨
- TypeORM 초기화 시 테이블 불일치로 서버 기동 실패

### 3.2 Phase 2: 빌드/기동 실패 (01-11 14:42 ~ 01-12 04:45)

| Run ID | 커밋 | 실패 단계 |
|--------|------|-----------|
| 20896905476 | remove Phase 5-9A new files | Deploy to Cloud Run |
| 20897028011 | remove Phase 5-9A migration | Deploy to Cloud Run |
| 20908348735 | ESM circular dependency fix | Deploy to Cloud Run |

**원인 추정**:
- ESM 순환 의존성 문제
- 엔티티 import 방식 변경으로 런타임 오류

### 3.3 Phase 3: Migration 실패 (01-12 05:05 ~ 현재)

| Run ID | 커밋 | 실패 단계 |
|--------|------|-----------|
| 20908671542 | Cloud Run PORT binding | Run database migrations |
| 20909041976 | separate migration entry point | Run database migrations |
| 20909340885 | CACHEBUST Docker cache | Build API server (중간 실패) |
| 20909418047 | migrate.js dockerignore | Run database migrations |
| 20909908152 | delimiter syntax for env vars | Run database migrations |
| 20911516530 | (수동 트리거) | Run database migrations |

**원인 추정**:
- Cloud Run 서비스 배포는 성공
- 별도의 migrate.js 진입점 추가 후 Job 실행 실패
- DB 연결 또는 마이그레이션 스크립트 문제

---

## 4. 실패 원인 계층 분석

### 4.1 1차 원인: Phase 5-9A 대규모 변경

**변경된 것들**:
1. 22개 엔티티 ESM 규칙 적용 (type-only imports)
2. Tourism 도메인 전체 신규 추가
3. Checkout/Order 확장
4. 새 마이그레이션 파일 추가

**문제점**:
- 한 번에 너무 많은 변경
- DB에 존재하지 않는 테이블을 참조하는 엔티티 등록
- 테스트 없이 프로덕션 배포

### 4.2 2차 원인: 잘못된 롤백 시도

```
abfb1e5b8 fix: revert api-server to last successful deployment (3caa6969e)
aa452dff9 fix: revert connection.ts to last successful deployment state
3cf2414ae fix: remove Tourism entities from connection.ts
04ea02a88 fix: remove Checkout entities from connection.ts
```

**문제점**:
- 부분 롤백으로 인한 불일치 상태
- connection.ts만 롤백하고 다른 파일은 그대로
- 의존성 정합성 깨짐

### 4.3 3차 원인: Migration 분리 작업의 부작용

```
f6d12b51f fix(api-server): separate migration entry point for Cloud Run Job
58fe4ef46 fix(api-server): add migrate.js to .dockerignore whitelist
```

**문제점**:
- 새로운 migrate.js 진입점 추가
- Docker 빌드 과정에서 파일 누락 가능성
- Cloud Run Job 환경에서 예상치 못한 동작

---

## 5. 현재 상태 정리

### 5.1 성공 항목
- ✅ 코드 빌드 (pnpm build)
- ✅ Docker 이미지 빌드 & 푸시
- ✅ Cloud Run Service 배포 (o4o-core-api)
- ✅ 서비스 Health Check (API 응답)

### 5.2 실패 항목
- ❌ Cloud Run Job 실행 (o4o-api-migrations)
- ❌ 마이그레이션 적용

### 5.3 미확인 항목
- ⚠️ Migration Job 내부 로그
- ⚠️ DB 실제 스키마 상태
- ⚠️ migrate.js 런타임 동작

---

## 6. 권장 조사 방향

### 6.1 즉시 확인 필요
1. Migration Job 실행 로그 (Cloud Logging)
2. migrate.js가 Docker 이미지에 포함되었는지
3. 환경변수가 올바르게 주입되었는지

### 6.2 근본 원인 해결
1. Phase 5-9A 변경사항 중 **필수/불필요 분리**
2. Tourism 도메인: 테이블 없으면 엔티티도 제거
3. 마이그레이션 파일: 실행 가능한 것만 유지

### 6.3 안정화 전략
1. **옵션 A**: migrate.js 제거, 마이그레이션 수동 실행
2. **옵션 B**: migrate.js 디버깅 후 수정
3. **옵션 C**: 3caa6969e로 완전 롤백 후 점진적 재적용

---

## 7. 핵심 교훈

1. **대규모 변경은 분할 배포**
   - Phase 5-9A는 8개 Phase를 한 커밋에 묶음
   - 각 Phase별 배포 후 검증 필요

2. **엔티티와 마이그레이션 동기화**
   - 엔티티 추가 시 마이그레이션 먼저 실행
   - 또는 synchronize: false일 때 엔티티 등록 제한

3. **새 진입점 추가 시 충분한 테스트**
   - migrate.js는 로컬에서 검증 후 배포
   - Cloud Run Job 환경 시뮬레이션 필요

---

## 8. 다이어그램: 실패 흐름

```
[3caa6969e] ─── 성공 ───┐
                        │
[Phase 5-9A] ─── 실패 ──┤─── Cloud Run 배포 실패
                        │
[롤백 시도] ──── 실패 ──┤─── 부분 롤백으로 불일치
                        │
[ESM 수정] ──── 실패 ──┤─── 순환 의존성 문제
                        │
[PORT 수정] ─── 배포 OK ┤─── 서비스는 기동
                        │
[migrate.js] ── 실패 ──┴─── Migration Job 실패 (현재)
```

---

*이 문서는 배포 이력 분석을 기반으로 합니다.*
*실제 로그 확인 후 원인이 달라질 수 있습니다.*
