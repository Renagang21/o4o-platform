# Production Test Account Management

> Phase 5: 프로덕션 테스트 계정 생성 및 관리 기준

## 1. 개요

본 문서는 프로덕션 환경에서 테스트를 수행하기 위한 **공식 테스트 계정**의 생성, 사용, 정비 절차를 정의한다.

---

## 2. 운영 원칙

- 테스트는 **프로덕션에서만** 수행
- 테스트 계정은 **프로덕션 DB에 실제로 존재**
- 테스트 종료 후 **정비 절차 필수**
- 프론트엔드 하드코딩 ❌
- 임시 bypass ❌
- **모든 테스트 계정은 `@o4o.com` 도메인 사용**

---

## 3. 테스트 계정 목록

### 3.1 GlucoseView

| 이메일 | 역할 | 비밀번호 | 용도 |
|--------|------|----------|------|
| `pharmacist@o4o.com` | user | TestPassword | 약사 테스트 |
| `admin@o4o.com` | admin | TestPassword | 관리자 테스트 |

### 3.2 K-Cosmetics

| 이메일 | 역할 | 비밀번호 | 용도 |
|--------|------|----------|------|
| `consumer-k-cosmetics@o4o.com` | user | TestPassword | 소비자 테스트 |
| `seller-k-cosmetics@o4o.com` | seller | TestPassword | 판매자 테스트 |
| `supplier-k-cosmetics@o4o.com` | supplier | TestPassword | 공급자 테스트 |
| `admin-k-cosmetics@o4o.com` | admin | TestPassword | 관리자 테스트 |

### 3.3 GlycoPharm

| 이메일 | 역할 | 비밀번호 | 용도 |
|--------|------|----------|------|
| `pharmacy-glycopharm@o4o.com` | user | TestPassword | 약국 테스트 |
| `admin-glycopharm@o4o.com` | admin | TestPassword | 운영자 테스트 |

### 3.4 KPA Society

| 이메일 | 역할 | 비밀번호 | 용도 |
|--------|------|----------|------|
| `pharmacist-kpa@o4o.com` | user | TestPassword | 일반회원 (약사) |
| `branch-officer-kpa@o4o.com` | user | TestPassword | 분회 임원 |
| `branch-admin-kpa@o4o.com` | admin | TestPassword | 분회 운영자 |
| `district-officer-kpa@o4o.com` | user | TestPassword | 지부 임원 |
| `district-admin-kpa@o4o.com` | admin | TestPassword | 지부 운영자 |

### 3.5 Neture

| 이메일 | 역할 | 비밀번호 | 용도 |
|--------|------|----------|------|
| `supplier-neture@o4o.com` | supplier | TestPassword | 공급자 테스트 |
| `partner-neture@o4o.com` | partner | TestPassword | 파트너 테스트 |
| `admin-neture@o4o.com` | admin | TestPassword | 운영자 테스트 |

---

## 4. 식별 방법

테스트 계정은 이메일 패턴으로 식별:

```sql
-- 모든 테스트 계정 조회
SELECT * FROM users
WHERE email LIKE '%@o4o.com';
```

---

## 5. 생성 방식

**Seed Migration 사용** (Option A)

- 파일: `apps/api-server/src/database/migrations/1737000000000-SeedProductionTestAccounts.ts`
- 추가: `apps/api-server/src/database/migrations/1737100200000-SeedAdditionalTestAccounts.ts`
- 특징:
  - Idempotent (중복 생성 방지)
  - 배포 자동화와 일관
  - 재현 가능

---

## 6. 정비 절차 (테스트 종료 후)

### 6.1 비활성화 (권장)

```sql
-- 모든 테스트 계정 비활성화
UPDATE users
SET "isActive" = false, status = 'inactive'
WHERE email LIKE '%@o4o.com';
```

### 6.2 삭제 (선택적)

```sql
-- 운영 데이터에 영향 없는 경우에만 삭제
DELETE FROM users
WHERE email LIKE '%@o4o.com';
```

### 6.3 Migration Rollback (대안)

```bash
# TypeORM migration revert 실행
npm run typeorm:revert
```

이 명령은 `SeedProductionTestAccounts1737000000000.down()` 메서드를 실행하여 계정을 비활성화한다.

---

## 7. 권한 범위 규칙

- **최소 권한 원칙** 적용
- 테스트 목적에 필요한 기능만 접근
- 결제/정산/삭제 권한은 필요 시에만 부여

| 역할 | 제한 사항 |
|------|----------|
| user | 일반 사용자 기능만 |
| seller | 자신의 상품 관리만 |
| supplier | 자신의 공급 관리만 |
| partner | 파트너 기능만 |
| admin | 테스트 도메인 내 관리 기능 |

---

## 8. 보안 고려사항

- 테스트 비밀번호(`TestPassword`)는 단순하므로 **테스트 종료 후 반드시 비활성화**
- 테스트 계정으로 생성된 데이터는 식별 가능해야 함
- 프로덕션 운영 데이터와 혼동 방지

---

## 9. 관련 문서

- Migration: `apps/api-server/src/database/migrations/1737000000000-SeedProductionTestAccounts.ts`
- Migration: `apps/api-server/src/database/migrations/1737100200000-SeedAdditionalTestAccounts.ts`
- Migration: `apps/api-server/src/database/migrations/1737200000000-UpdateTestAccountEmailsToO4O.ts`
- Work Order: Phase 5 - 프로덕션 테스트 계정 생성 및 관리 기준

---

*Created: 2026-01-14*
*Updated: 2026-01-26*
*Status: Active*
