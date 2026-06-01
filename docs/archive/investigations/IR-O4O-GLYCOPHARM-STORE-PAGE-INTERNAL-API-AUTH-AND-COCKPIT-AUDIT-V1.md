# IR-O4O-GLYCOPHARM-STORE-PAGE-INTERNAL-API-AUTH-AND-COCKPIT-AUDIT-V1

> **상태**: 조사 IR (코드 수정 없음)
> **선행 작업**: `WO-O4O-GLYCOPHARM-MY-STORE-MENU-MEMBERSHIP-GUARD-V1` (commit `cc334b1a3`) — 프론트 `/store` 라우트 가드를 membership-aware 로 정합. "내 약국" 클릭 → `/store` 페이지 로딩 자체는 정상화.
> **본 IR 범위**: `/store` 페이지 진입 후 내부 위젯이 호출하는 3개 API 의 실패 원인 분석 및 권장 수정 방향 제시.
> **작성일**: 2026-05-30

---

## 1. 배경

`/store` 메뉴 클릭 → 페이지 자체는 표시되지만, 내부 위젯/탭에서 다음 응답이 관측됨 (renagang21@gmail.com 약국 경영자 계정 / 신 revision `o4o-core-api-01936-ctr` + `glycopharm-web-00803~` 환경).

| # | API | 상태 | 응답 본문 요약 |
|---|-----|------|----------------|
| A | `GET /api/v1/glycopharm/pharmacy/cockpit/today-actions` | **500** | `{success:false, error:"Internal server error", code:"INTERNAL_ERROR"}` |
| B | `GET /api/v1/glycopharm/store-hub/capabilities` | **403** | `{success:false, error:"Store owner access required", code:"STORE_OWNER_REQUIRED"}` |
| C | `GET /api/v1/glycopharm/pharmacy/products?pageSize=1` | **403** | `{success:false, error:{code:"GLYCOPHARM_NOT_ENROLLED", message:"No active glycopharm enrollment found."}}` |

테스트 계정 상태 (JWT decode):
- `roles`: `['kpa:store_owner', 'lms:instructor', 'pharmacy', 'supplier']`
- `memberships`:
  - `kpa-society` / `user` / `active`
  - `glycopharm` / `pharmacy` / `active`
  - `neture` / `supplier` / `active`
- `glycopharm:store_owner` role **부재**
- `created_by_user_id` 로 등록된 organization 보유 (cockpit 로그에서 `c92b857f-7bac-423b-8a12-c29a0ab955fd` 확인)

---

## 2. 각 API 별 호출 위치

| # | 컨트롤러 | 라우트 정의 | 위젯/탭 (frontend) |
|---|----------|------------|---------------------|
| A | [cockpit.controller.ts:188-262](../../apps/api-server/src/routes/glycopharm/controllers/cockpit.controller.ts#L188-L262) — `router.get('/today-actions', requireAuth, …)` | [glycopharm.routes.ts:224](../../apps/api-server/src/routes/glycopharm/glycopharm.routes.ts#L224) — `router.use('/pharmacy/cockpit', cockpitController)` | 내 매장 홈 대시보드 (StoreOverviewPage 상단 KPI / 오늘의 액션 카드) |
| B | [store-hub.controller.ts:761-797](../../apps/api-server/src/routes/o4o-store/controllers/store-hub.controller.ts#L761-L797) — `router.get('/capabilities', requireAuth, requirePharmacyOwner, …)` | [glycopharm.routes.ts:366](../../apps/api-server/src/routes/glycopharm/glycopharm.routes.ts#L366) — `router.use('/store-hub', createStoreHubController(ds, …, 'glycopharm'))` | 내 매장 사이드바/탭 표시 — `useStoreCapabilities` hook ([App.tsx:364](../../services/web-glycopharm/src/App.tsx#L364)) |
| C | [pharmacy.controller.ts:44-50](../../apps/api-server/src/routes/glycopharm/controllers/pharmacy.controller.ts#L44-L50) — `router.get('/products', requirePharmacyContext, …)` | [glycopharm.routes.ts:379](../../apps/api-server/src/routes/glycopharm/glycopharm.routes.ts#L379) — `router.use('/pharmacy/products', createPharmacyProductsController(ds, …, 'glycopharm'))` | 내 매장 상품 미리보기 / 카운트 |

---

## 3. 각 API 별 실패 원인

### A. `today-actions` 500 — 서버 버그 (DB 테이블 부재)

Cloud Run stderr 직접 인용 (2026-05-30T13:24:53Z, revision `o4o-core-api-01936-ctr`):

```
query failed: SELECT COUNT(*)::int as count, COALESCE(SUM("totalAmount"), 0)::numeric as revenue
       FROM ecommerce_orders
       WHERE store_id = $1
         AND metadata->>'serviceKey' = 'glycopharm'
         AND "createdAt" >= $2
         AND status != 'cancelled'
   -- PARAMETERS: ["c92b857f-7bac-423b-8a12-c29a0ab955fd","2026-05-30T00:00:00.000Z"]
error: error: relation "ecommerce_orders" does not exist
[Cockpit] Failed to get today actions: relation "ecommerce_orders" does not exist
```

- 호출 경로: cockpit.controller.ts:226 `storeAdapter.getOrderStats(pharmacy.id, todayStart)` → `glycopharm-store-data.adapter.ts` → raw SQL on `ecommerce_orders`.
- `pharmacy` lookup ([cockpit.controller.ts:205](../../apps/api-server/src/routes/glycopharm/controllers/cockpit.controller.ts#L205)) 은 성공 (`OrganizationStore.findOne({ where: { created_by_user_id: userId } })`) — 사용자 organization 은 정상.
- 실패 지점: `ecommerce_orders` 테이블이 production DB에 **존재하지 않음**.
- 코드 검색 결과 `ecommerce_orders` 를 `CREATE TABLE` 하는 마이그레이션 부재. 존재하는 마이그레이션은 모두 `ALTER`/`CREATE INDEX` 형식:
  - [20260212000002-AddStoreAttributionToEcommerceOrders.ts](../../apps/api-server/src/database/migrations/20260212000002-AddStoreAttributionToEcommerceOrders.ts)
  - [20260224500000-AddEcommerceOrdersServiceKeyIndex.ts](../../apps/api-server/src/database/migrations/20260224500000-AddEcommerceOrdersServiceKeyIndex.ts)

이는 **CLAUDE.md "Critical Lessons" 항목과 정확히 일치하는 패턴**: *"Every new entity MUST have a CREATE TABLE migration. TypeORM `synchronize: false` in production means entity-only files do NOTHING."*

**판정**: **명백한 서버 버그**.
- 호출 자체가 적절하지 않은 게 아니라(매장 owner 대시보드에서 오늘 주문 통계 표시 의도는 정상), 의존 테이블이 production 에 부재.
- catch 블록이 generic `Internal server error` 만 반환 → 운영 진단성 낮음. 본 IR 작성 중에도 stderr trace 없이는 원인 식별 불가했음.

### B. `store-hub/capabilities` 403 — 정합성 결함 (role-only 가드 vs membership-aware 프론트)

가드 체인:
1. `requireAuth` — 통과 (renagang21 인증됨)
2. `requirePharmacyOwner = createRequireStoreOwner(dataSource, 'glycopharm')` ([store-hub.controller.ts:65](../../apps/api-server/src/routes/o4o-store/controllers/store-hub.controller.ts#L65))

`createRequireStoreOwner('glycopharm')` 내부 정책 ([store-owner.utils.ts:109-174](../../apps/api-server/src/utils/store-owner.utils.ts#L109-L174)):
1. `service_memberships` 에 `service_key='glycopharm' AND status='active'` 확인 → renagang21 보유 ✅ (membership 검사 통과)
2. `isStoreOwner(userId, 'glycopharm')` 호출 → `role_assignments` 에서 `role IN ('glycopharm:store_owner') AND is_active=true` 검색
3. renagang21 의 role_assignments 에 `glycopharm:store_owner` **부재** → `isOwner=false` → 403 `STORE_OWNER_REQUIRED`

`STORE_OWNER_ROLES_BY_SERVICE.glycopharm` 정의 ([store-owner.utils.ts:36-40](../../apps/api-server/src/utils/store-owner.utils.ts#L36-L40)):
```ts
const STORE_OWNER_ROLES_BY_SERVICE = {
  kpa: ['kpa:store_owner'],
  glycopharm: ['glycopharm:store_owner'],       // ← 단일 source
  cosmetics: ['cosmetics:store_owner'],
} as const;
```

주석은 의도를 명확히 함:
> "glycopharm:pharmacist(일반 약사/근무약사)는 매장 접근 권한 없음. pharmacy_owner 승인 시 store_owner + pharmacist 둘 다 부여되므로 경영자 판단은 store_owner role 단독 기준 — glycopharm-member.service.ts 참조."

**판정**: **정합성 결함 (frontend ↔ backend SSOT 불일치)**.

- backend SSOT: `role_assignments.glycopharm:store_owner` role 보유자만 매장 경영자.
- frontend (헤더 `isPharmacy`, 라우트 `PharmacyStoreGuard`): `glycopharm/pharmacy/active` membership 만으로도 매장 경영자로 인정.
- renagang21 은 frontend 기준으로는 매장 경영자, backend 기준으로는 아님 → 페이지는 열리지만 위젯들이 403.

원인 후보 (택일이 아니라 진단 필요):
- **(a) 가입 흐름 결함**: GlycoPharm 가입 시 `glycopharm:store_owner` role_assignment 자동 부여가 누락. 사용자가 약국 경영자로 인지되었음에도 role 미부여.
- **(b) backend 정책 의도와 frontend 정책의 캐넌적 불일치**: backend 는 role 단독, frontend 는 membership 까지 허용 — 두 SSOT 가 처음부터 다르게 설계됨.

(a) 라면 backfill 마이그레이션 + 가입 흐름 보강.
(b) 라면 backend 도 membership-aware 로 정합하거나 frontend 가 backend 와 동일하게 좁혀야 함.

KPA 와의 패턴 차이가 (a)/(b) 판정의 결정적 단서 (§5 참조).

### C. `pharmacy/products` 403 — 정합성 결함 (enrollment 미생성 vs frontend membership)

가드 체인:
1. `requirePharmacyContext = createPharmacyContextMiddleware(dataSource)` ([pharmacy-context.middleware.ts:28-111](../../apps/api-server/src/routes/glycopharm/pharmacy-context.middleware.ts#L28-L111))

미들웨어 정책:
1. user 인증 검사
2. admin/operator/super_admin role 보유 시 bypass ([line 44-49](../../apps/api-server/src/routes/glycopharm/pharmacy-context.middleware.ts#L44-L49)) — renagang21 은 admin/operator 아님 → bypass 안 됨
3. `organizations.created_by_user_id = userId` 로 org 조회 — renagang21 보유 ✅
4. `organization_service_enrollments` 에서 `organization_id = org.id AND service_code='glycopharm' AND status='active'` 확인
5. enrollment row 부재 → 403 `GLYCOPHARM_NOT_ENROLLED`

즉 renagang21 의 organization (`c92b857f-...`) 은 `organization_service_enrollments` 에 glycopharm enrollment 행이 등록되지 않음.

**판정**: **정합성 결함 (가입 흐름 잔여 또는 backfill 누락)**.

- backend SSOT: organization-level `organization_service_enrollments.(org_id, 'glycopharm', 'active')`.
- frontend (헤더, 라우트 가드): user-level `service_memberships.(glycopharm, pharmacy, active)`.
- 두 다른 layer (organization vs user) 의 enrollment 가 정합하지 않은 상태로 둘 다 유지되고 있음.

K-Cosmetics 동일 패턴 적용 사례: [`20260930000000-BackfillCosmeticsServiceEnrollments.ts`](../../apps/api-server/src/database/migrations/20260930000000-BackfillCosmeticsServiceEnrollments.ts) (K-Cosmetics 측에서는 이미 backfill 진행됨). GlycoPharm 동일 backfill 부재.

### 종합 (B + C 의 한 가지 가설)

renagang21 사례는 다음과 같이 발생했을 가능성이 가장 높음:

1. 어느 시점에 사용자가 GlycoPharm 약국 경영자로 가입 신청 → `service_memberships.glycopharm` 행 생성 (role='pharmacy', status='active')
2. 어느 시점에 organization 도 생성됨 (`organizations.created_by_user_id = userId`)
3. 그러나:
   - `role_assignments` 에 `glycopharm:store_owner` 부여가 누락
   - `organization_service_enrollments` 에 `(org_id, 'glycopharm', 'active')` 등록이 누락
4. frontend 는 (1) 만 보고 매장 경영자로 인식
5. backend B 는 (3-a) 거부, backend C 는 (3-b) 거부

→ 가입 흐름의 자동화 (혹은 admin 승인 후 backfill) 가 어디까지 진행되었는지 / 어디서 끊겼는지 확인 필요.

---

## 4. backend ↔ frontend SSOT 비교

| Layer | GlycoPharm 매장 경영자 판정 기준 | renagang21 충족? |
|-------|---------------------------------|------------------|
| **Frontend 헤더 `isPharmacy`** ([GlycoGlobalHeader.tsx:69-76](../../services/web-glycopharm/src/components/GlycoGlobalHeader.tsx#L69-L76)) | `glycopharm:pharmacist` role **OR** `service_memberships.glycopharm.role='pharmacy'` (active/approved) | ✅ |
| **Frontend 라우트 `PharmacyStoreGuard`** (이번 작업 신설) | 헤더와 동일 정책 + operator/admin/super_admin | ✅ |
| **Backend `createRequireStoreOwner('glycopharm')`** ([store-owner.utils.ts:73-101](../../apps/api-server/src/utils/store-owner.utils.ts#L73-L101)) | `role_assignments.glycopharm:store_owner` (active) **AND** `service_memberships.glycopharm.active` | ❌ (role 부재) |
| **Backend `createPharmacyContextMiddleware`** ([pharmacy-context.middleware.ts:51-99](../../apps/api-server/src/routes/glycopharm/pharmacy-context.middleware.ts#L51-L99)) | `organizations.created_by_user_id = userId` **AND** `organization_service_enrollments.(org_id, 'glycopharm', 'active')` | ❌ (enrollment 부재) |

**관찰**: backend 의 두 가드는 서로 다른 SSOT (role_assignments vs organization_service_enrollments) 를 사용하며, frontend 의 SSOT (`service_memberships`) 와도 다르다. **세 종류의 SSOT 가 공존**하고 일치 보장 메커니즘 (예: 가입 승인 시 셋을 동시에 생성) 가 신뢰성 있게 동작하지 않은 상태.

---

## 5. KPA-Society / K-Cosmetics 비교

### KPA-Society (canonical reference)

- 약국 경영자 = `kpa:store_owner` role + `kpa-society` membership active + `organization_service_enrollments.(org_id, 'kpa-society' / 'kpa', 'active')`.
- 동일한 `createRequireStoreOwner('kpa')` 사용 ([kpa-checkout.controller.ts:712](../../apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts#L712)).
- KPA 의 `PharmacyGuard` (프론트) 는 `isStoreOwnerDual(roles, 'kpa:store_owner', user.isStoreOwner)` — JWT roles 와 context flag 의 OR. 즉 KPA 도 **role 단독 SSOT 가 아님** (stale JWT recovery 위한 dual).
- 하지만 KPA 는 정상 가입 흐름에서 `kpa:store_owner` role 부여 + enrollment 자동 생성 이 **신뢰성 있게 동작** — 다년 운영 사이클을 거치며 정합화됨. backend 의 strict 정책이 문제를 일으키지 않는 이유.

### K-Cosmetics

- 동일하게 `STORE_OWNER_ROLES_BY_SERVICE.cosmetics = ['cosmetics:store_owner']` 단일 role 정책.
- enrollment backfill 진행 흔적: [`20260930000000-BackfillCosmeticsServiceEnrollments.ts`](../../apps/api-server/src/database/migrations/20260930000000-BackfillCosmeticsServiceEnrollments.ts).
- 즉 K-Cosmetics 는 동일 결함을 인지하고 backfill 마이그레이션으로 해결한 사례.

### 결론

- backend 정책 자체 (role + enrollment) 는 다른 서비스와 동일 패턴. GlycoPharm 만의 의도된 차이 아님.
- GlycoPharm 은 동일 패턴 대비 **(a) 가입 흐름 자동화 + (b) backfill 마이그레이션** 둘 다 누락 또는 미완료 상태.

---

## 6. 판정

| API | 분류 | 판정 |
|-----|------|------|
| A. `today-actions` 500 | 서버 버그 | **명백한 버그**. `ecommerce_orders` 테이블 부재. CREATE TABLE 마이그레이션 추가 필요. 본 IR 범위 외의 광역 영향 (checkout, payment, KPI 위젯 등 다수 의존). |
| B. `store-hub/capabilities` 403 | 정합성 결함 | **현 정책상 정상 차단이지만 frontend ↔ backend SSOT 불일치로 인한 UX 결함**. frontend 가 진입을 허용하면 backend 도 일관성 있게 허용하거나, frontend 가 backend 와 동일하게 좁혀야 함. |
| C. `pharmacy/products` 403 | 정합성 결함 | **현 정책상 정상 차단**. 단, B 와 동일 SSOT 불일치 패턴. enrollment backfill 또는 가입 흐름 보강 필요. |

**B/C 의 핵심 판정**:
- 정책상 차단 자체는 잘못된 것이 아님 (cross-service leakage 차단 의도).
- **문제는 renagang21 같은 사용자가 frontend 기준으로는 매장 경영자로 인지되었으나 backend 기준으로는 아닌 상태**. 즉 가입 흐름의 정합성 결함.
- KPA 가 동일 정책으로 정상 동작한다는 점이 GlycoPharm 특화 결함임을 시사.

---

## 7. 권장 수정 방향

본 IR 의 후속 WO 후보 3건 (우선순위 순):

### W1. `ecommerce_orders` 테이블 CREATE TABLE 마이그레이션 추가 (필수)

- **목적**: A 의 500 복구. 부가 효과로 checkout/payment/KPI 등 다수 위젯 정상화.
- **범위**: production DB 에 테이블 생성. entity 정의(있다면) 기준으로 컬럼 매칭.
- **주의**: 이미 cosmetics-store-summary, neture, kpa 등 광범위 코드가 이 테이블 참조 → migration 누락이 광범위한 silent failure 의 원인일 수 있음. CLAUDE.md "checkout_orders: NOT in production" 메모와 함께 별도 IR 로 광역 영향 평가 권장.
- **본 IR 범위 외** (광역 영향 평가 필요).

### W2. GlycoPharm 가입 흐름 정합성 복구 (조사 우선)

- **첫 단계**: 가입 흐름 코드 추적 — 약국 경영자 가입 신청 → 승인 → role_assignment + organization + organization_service_enrollment 의 어느 단계에서 멈춰 있는지 확인.
- **두 번째 단계**: 기존 사용자 (renagang21 외에 다른 케이스 다수 추정) 에 대한 backfill 마이그레이션:
  - `service_memberships.(glycopharm, pharmacy, active)` 보유 사용자
  - 이들의 `organizations.created_by_user_id` 에 대해
  - `role_assignments.(user_id, 'glycopharm:store_owner', active)` 부여
  - `organization_service_enrollments.(org_id, 'glycopharm', 'active')` 생성
- **K-Cosmetics 의 `BackfillCosmeticsServiceEnrollments` 마이그레이션이 직접적인 모델**.

### W3. (선택) backend ↔ frontend SSOT 정합 정책 결정

- 두 가지 옵션:
  - **Option α**: backend 를 frontend 와 정렬 — `createRequireStoreOwner('glycopharm')` 가 membership-aware 검사 (역할 OR `glycopharm/pharmacy/active` membership). 단기 충격 ↓, 정책 의도 변경.
  - **Option β**: frontend 를 backend 와 정렬 — `PharmacyStoreGuard` 가 backend SSOT (role_assignments) 와 동일 기준으로 체크. 단, 프론트가 JWT 만으로 role_assignments 직접 접근 불가 → JWT roles 기반 (`glycopharm:store_owner`) 으로 좁힘.
- **W2 가 정합성을 복구하면 W3 는 불필요할 수 있음** (가입 흐름이 정확하면 모든 SSOT 가 일치). W3 는 가입 흐름이 안정화된 후 보강 단계.

### W4. (운영성) cockpit 500 응답에 진단 코드 부착

- 현재 generic `INTERNAL_ERROR` 만 반환 → stderr trace 없이는 원인 식별 불가.
- catch 블록에서 PG error code (e.g. `42P01 undefined_table`) 분리하여 별도 응답 코드 부여.
- 본 IR 의 W1 후 잔여 운영성 개선.

---

## 8. Current Structure vs O4O Philosophy Conflict Check

`docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md` 의 §3.3 (매장 / 사업자) 정의:
> 매장은 **서비스에 가입된 organization 단위**로 운영된다. 매장 경영자는 organization 의 owner role 을 가진다.

`docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md` 의 §2 (책임 매트릭스):
> 매장 가입 흐름: 사용자 → service_memberships → organization 생성 → organization_service_enrollments → role_assignments. 가입 승인 시 4-tier 가 동시 생성되어야 함.

**충돌 분석**:

- **Philosophy 와 backend 정책은 일치** (organization-level enrollment + role-level store_owner).
- **GlycoPharm 의 현재 가입 흐름이 4-tier 의 일부만 생성** (service_memberships 와 organization 까지만) → philosophy 위반은 아니지만 philosophy 가 요구하는 정합성을 충족 못함.
- **frontend SSOT 가 backend 와 다른 것은 본질적 충돌이 아닌 임시 우회**. frontend 가 membership 기반으로 가시성을 결정하는 것은, backend 의 SSOT 가 정확히 정합되어 있다면 자연스럽게 일치할 것 (membership 있으면 role + enrollment 도 있으므로). 현재 frontend 의 너그러움은 backend 정합 결함의 잠정적 마스킹.

**Drift 권장사항**:
- W2 의 backfill + 가입 흐름 보강이 가장 직접적인 philosophy 정렬.
- W3 의 backend 정책 변경 (Option α) 은 philosophy 의 strict 정의를 약화시키므로 권장하지 않음.
- frontend (PharmacyStoreGuard) 의 membership-aware 정책은 W2 완료 후에도 유지 안전 — 정확한 SSOT 가 정렬되어 있다면 결과는 동일.

---

## 부록 A. 검증 재현 명령

```sh
# 1) Login (renagang21@gmail.com / seochuran1!)
curl -s -D /tmp/lh.txt -o /tmp/lb.json -X POST \
  "https://api.neture.co.kr/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: https://glycopharm.co.kr" \
  -d '{"email":"renagang21@gmail.com","password":"seochuran1!"}'
TOKEN=$(grep -i "^set-cookie: accessToken" /tmp/lh.txt | sed 's/set-cookie: accessToken=//;s/;.*//' | tr -d '\r\n')

# 2) Reproduce 3 errors
curl -s -H "Authorization: Bearer $TOKEN" -H "Origin: https://glycopharm.co.kr" \
  "https://api.neture.co.kr/api/v1/glycopharm/pharmacy/cockpit/today-actions"
# → 500 INTERNAL_ERROR

curl -s -H "Authorization: Bearer $TOKEN" -H "Origin: https://glycopharm.co.kr" \
  "https://api.neture.co.kr/api/v1/glycopharm/store-hub/capabilities"
# → 403 STORE_OWNER_REQUIRED

curl -s -H "Authorization: Bearer $TOKEN" -H "Origin: https://glycopharm.co.kr" \
  "https://api.neture.co.kr/api/v1/glycopharm/pharmacy/products?pageSize=1"
# → 403 GLYCOPHARM_NOT_ENROLLED
```

## 부록 B. 사용자 DB 상태 검증 SQL (Cloud SQL Admin 권한 필요)

```sql
-- A. role_assignments — glycopharm:store_owner 존재 여부
SELECT user_id, role, is_active, created_at
FROM role_assignments
WHERE user_id = '6967ebe0-2f87-4cab-809b-8c7190493cef'  -- renagang21
  AND role LIKE 'glycopharm:%';

-- B. service_memberships — glycopharm membership 상태
SELECT user_id, service_key, role, status, created_at
FROM service_memberships
WHERE user_id = '6967ebe0-2f87-4cab-809b-8c7190493cef'
  AND service_key = 'glycopharm';

-- C. organizations — 사용자 소유 organization
SELECT id, name, "isActive", created_by_user_id
FROM organizations
WHERE created_by_user_id = '6967ebe0-2f87-4cab-809b-8c7190493cef';

-- D. organization_service_enrollments — 해당 org 의 glycopharm enrollment
SELECT organization_id, service_code, status, created_at
FROM organization_service_enrollments
WHERE organization_id = 'c92b857f-7bac-423b-8a12-c29a0ab955fd'  -- pharmacy.id from cockpit log
  AND service_code = 'glycopharm';

-- E. 동일 케이스 광역 — membership 있으나 enrollment 없는 사용자 수
SELECT COUNT(*) AS users_missing_enrollment
FROM service_memberships sm
JOIN organizations o ON o.created_by_user_id = sm.user_id
LEFT JOIN organization_service_enrollments e
  ON e.organization_id = o.id AND e.service_code = 'glycopharm' AND e.status = 'active'
WHERE sm.service_key = 'glycopharm'
  AND sm.role = 'pharmacy'
  AND sm.status = 'active'
  AND e.id IS NULL;
```

---

*IR 종료*
