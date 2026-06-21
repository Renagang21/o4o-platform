# CHECK — O4O 매장 유료 기능 이용권 기반 V1

**WO:** `WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1`
**일자:** 2026-06-21
**상위 IR:** [`IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1`](./IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1.md)
**성격:** 결제(Toss) 이전 단계의 "이용권/메뉴 오픈 기준" 기반 구축 (read-only)
**검증:** api-server `tsc --noEmit` PASS

---

## 1. 목표

Toss 결제를 붙이기 전에, 매장(조직)별 유료 기능 **이용권 상태**를 판단할 수 있는 기반을 먼저 만든다.

- 결제와 메뉴 게이트를 분리한다 — 이 WO 는 결제를 붙이지 않는다.
- Toss 없이도 이용권 활성 여부를 판정할 수 있게 한다.
- `FOREIGN_VISITOR_SALES_SUPPORT` 가 V1 활성 대상이다.
- 네이버·쿠팡 관련 플랜은 reserved 코드만 둔다.
- B2B 주문결제는 건드리지 않는다.

---

## 2. 핵심 결정 (조사 → 문제확정)

| 항목 | 결정 | 근거 |
|---|---|---|
| 이용권 소유 단위 | `organizationId` + `serviceKey` | Boundary Policy: Store Ops primary = `organizationId`. 매장(=조직)이 이용권 보유 주체, serviceKey 로 서비스 격리 |
| organization FK | hard FK 없음 (plain UUID + index) | `organization_core` FROZEN 비침범. 기존 `neture_suppliers.organization_id` 동일 패턴 |
| 기존 시스템 재사용 | 없음 → 신규 생성 | featureFlags=env 토글, PlatformService=카탈로그, MarketTrial=상품별. 이용권/구독 시스템 부재 |
| 결제 컬럼 | 미포함 | 결제(Toss)는 후속 WO. 이용권은 capability — 결제와 분리 |
| API 범위 | read-only (조회 + 활성 판정) | 발급/연장(write)은 결제 WO 에서 추가 |

---

## 3. 산출물

### 3.1 신규 엔티티 / 테이블

`StorePaidFeatureEntitlement` → `store_paid_feature_entitlements`
([entity](../../apps/api-server/src/modules/store-entitlement/store-paid-feature-entitlement.entity.ts))

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `organization_id` | uuid NOT NULL | 소유 조직 |
| `service_key` | varchar(50) NOT NULL | 'neture' 등 |
| `plan_code` | varchar(100) NOT NULL | 플랜 코드 |
| `status` | varchar(20) DEFAULT 'ACTIVE' | ACTIVE / EXPIRED / CANCELED |
| `starts_at` | timestamp NULL | 이용 시작 |
| `ends_at` | timestamp NULL | 이용 만료 |
| `source` | varchar(100) NULL | 발급 출처 (결제 연동은 후속) |
| `metadata` | jsonb NULL | |
| `created_at` / `updated_at` | timestamp | |

- `UNIQUE(organization_id, service_key, plan_code)`
- `INDEX(organization_id, service_key)`, `INDEX(service_key, plan_code, status)`

### 3.2 플랜 코드 (`STORE_PAID_FEATURE_PLAN_CODES`)

| 코드 | V1 |
|---|---|
| `FOREIGN_VISITOR_SALES_SUPPORT` | **활성** (외국인 여행객 판매지원) |
| `MARKETPLACE_LISTING_SUPPORT` | reserved only |
| `SALES_CHANNEL_GROWTH_BUNDLE` | reserved only |

`ACTIVE_STORE_PAID_FEATURE_PLAN_CODES` = `[FOREIGN_VISITOR_SALES_SUPPORT]`.

### 3.3 서비스

`StorePaidFeatureEntitlementService`
([service](../../apps/api-server/src/modules/store-entitlement/store-paid-feature-entitlement.service.ts))

- `static isActive(entitlement, now?)` — `status==='ACTIVE'` 이고 `now ∈ [startsAt, endsAt)` (null 경계는 열림)
- `listEntitlements(orgId, serviceKey?)`
- `getActiveEntitlements(orgId, serviceKey, now?)`
- `hasActiveEntitlement(orgId, serviceKey, planCode, now?)` — 메뉴 게이트 판정용

### 3.4 API (read-only) — mount `/api/v1/store-entitlements`

([routes](../../apps/api-server/src/modules/store-entitlement/store-entitlement.routes.ts))

| Method | Path | Query | 응답 |
|---|---|---|---|
| GET | `/` | `organizationId`(필수), `serviceKey`(옵션) | 이용권 행 목록 |
| GET | `/active` | `organizationId`, `serviceKey` (필수) | 활성 이용권 목록 |
| GET | `/check` | `organizationId`, `serviceKey`, `planCode` (필수) | `{ active: boolean }` |

전부 `requireAuth`. 응답 표준 `{ success, data }` / `{ success:false, error, code }`.

### 3.5 등록 / 마운트

- 엔티티: [connection.ts](../../apps/api-server/src/database/connection.ts) import + entities 배열
- 마이그레이션: [20260621000000-CreateStorePaidFeatureEntitlements.ts](../../apps/api-server/src/database/migrations/20260621000000-CreateStorePaidFeatureEntitlements.ts)
- 라우트: [register-routes.ts](../../apps/api-server/src/bootstrap/register-routes.ts) (28b)

---

## 4. V1 미포함 (의도적)

- Toss/결제 연동, 이용권 발급·연장(write), 자동결제/빌링키
- 메뉴 잠금/오픈 UI (후속 `WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1`)
- 외국인 여행객 판매지원 기능 본체
- B2B 주문결제 / 주문 목적
- 부분 취소/환불

---

## 5. 검증

- `pnpm --filter @o4o/api-server type-check` → PASS (tsc --noEmit, 오류 0)
- 마이그레이션은 main 배포 시 CI/CD 자동 실행 (PRODUCTION-MIGRATION-STANDARD). 현재 운영 데이터 disposable.
- 라우트는 `dataSource` 스코프 async 섹션에 동적 import 로 등록 (실패해도 다른 라우트 영향 없도록 try/catch).

---

## 6. 다음 작업

IR §9.1 순서대로:

```text
2. WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1   ← 이 API 소비
3. WO-O4O-TOSS-PAYMENT-CORE-V1
4. WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-TOSS-PAYMENT-V1  ← 이용권 발급(write) 추가
```
