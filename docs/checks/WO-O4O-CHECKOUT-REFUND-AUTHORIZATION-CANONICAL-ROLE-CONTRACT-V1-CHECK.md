# WO-O4O-CHECKOUT-REFUND-AUTHORIZATION-CANONICAL-ROLE-CONTRACT-V1 — CHECK

- **작업일**: 2026-08-25
- **시작 기준**: `origin/main` (`23fdb013e`) — 특정 과거 commit 고정 없음
- **선행 계약**: `WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1`
  (`docs/checks/...-CHECK.md`) 에서 확정한 identity/membership/role 3축 계약

---

## 0. 먼저 밝히는 제한사항

### 0-1. production DB read census 미실행 — `NO_PRODUCTION_DB_CENSUS`

§8 이 요구한 production role/order 실측을 **수행하지 못했다.**

수행한 것:
- `gcloud auth` 및 `gcloud sql instances list` 정상 (`o4o-platform-db` / asia-northeast3 확인)
- `SETUP.md` 가 규정한 정규 경로대로 Cloud SQL Auth Proxy v2 **pinned 버전(v2.14.3)** 을
  `bin/cloud-sql-proxy-v2.exe` 로 내려받아 `--version` 확인까지 성공
  (`bin/` 은 `.gitignore` 대상이며 commit 하지 않는다)

막힌 것:
- 프록시 **기동**(`--port=5442 …`)이 세션 안전 분류기에 차단됨
- `SETUP.md` 의 정규 스크립트 `start-cloud-sql-proxy.cmd` 실행도 동일하게 차단됨
- **우회하지 않았다.** 자격증명을 다른 경로로 탐색하거나 방화벽/포트를 돌아가려는 시도는 하지 않았다

따라서 본 CHECK 의 수치는 전부 **정적 감사 + 자동화 테스트 + 무인증 production API smoke**
근거다. 아래 근거 표기를 구분해 읽어야 한다.

| 표기 | 의미 |
|------|------|
| `CODE` | 저장소 소스 전수조사 |
| `TEST` | 본 WO 에서 추가/기존 자동화 테스트 |
| `SMOKE` | production 무인증 HTTP 응답 |
| `NO_DB` | production DB 실측이 필요하나 수행하지 못함 |

**과거 CHECK 의 수치를 현재 실측으로 사용하지 않았다.** 선행 WO 가 2026-08-24 에 기록한
"무접두 role 활성 보유자 0" 은 그 시점의 기록이며, 본 WO 는 그 값에 의존하지 않는 방식으로
계약을 닫았다 — 아래 §4 참조.

### 0-2. 다른 세션 WIP 공존

작업 시작·종료 시점 모두 저장소에 다른 세션의 dirty/untracked 파일이 존재했다
(cms-content, service-templates/provisioning, operator-core-ui 계열).
**수정·restore·stash·stage 하지 않았고, `git add .` 를 쓰지 않았다.**
commit 은 전부 path-specific 이다.

---

## 1. 조사 결론 — 환불의 업무 주체

WO §4 가 요구한 대로 **"bare role 을 무엇으로 바꿀까"에서 시작하지 않고**, 주문 생성부부터
결제·취소·환불 경로와 UI producer 를 따라가 업무 소유자를 먼저 판정했다.

판정 결과, 환불은 하나의 권한이 아니라 **업무 주체별 3축 + 구매자 취소 1축**이다.

| 축 | 주체 | 판정 조건 | 근거 |
|----|------|-----------|------|
| `PLATFORM_REFUND_ADMIN` | 플랫폼 운영자 | `platform:super_admin` (cross-service, 명시적 override) | `CODE` |
| `STORE_OWNER_REFUND` | 판매 매장 경영자 | active membership + `{service}:store_owner` + `sellerOrganizationId` 일치 + `metadata.serviceKey` 일치 | `CODE` |
| `SERVICE_OPERATOR_REFUND` | 서비스 운영자 | active membership + `{service}:operator` — **매장 주문이 아니라 수기 정산 원장 한정** | `CODE` |
| `CUSTOMER_CANCEL` (환불 아님) | 구매자 본인 | `buyerId` 일치 + `metadata.serviceKey` 일치 + 결제 전 lifecycle | `CODE` |

### 왜 서비스 운영자가 매장 주문의 환불 주체가 아닌가

추측이 아니라 코드가 이미 그렇게 설계돼 있다.

- `services/web-kpa-society/src/pages/operator/OrdersPage.tsx:9`
- `services/web-glycopharm/src/pages/operator/OrdersPage.tsx:7`
- `services/web-k-cosmetics/src/pages/operator/OrdersPage.tsx:7`

세 서비스 모두 헤더 주석이 동일하게 **"조회 전용 — 상태변경/배송/취소/환불/송장/정산/bulk
action 없음"** 이다. 백엔드에도 서비스 operator 용 매장 주문 환불 엔드포인트가 없다.
매장 주문의 판매 주체는 매장이고, 환불 책임도 매장 경영자에게 있다.
플랫폼 운영자는 전역 backstop 이다.

### 왜 `/api/checkout/refund` 가 플랫폼 축인가

`CheckoutController.initiate` 가 주문을 만들 때
`sellerId = 'platform-seller'`, `supplierId = 'supplier-phase-n1'` 을 **상수로 고정**한다
(`checkoutController.ts` `PHASE_N1_CONFIG`). 매장 조직(`sellerOrganizationId`)은 선택 입력이고
`metadata.serviceKey` 도 세팅하지 않는다. 즉 이 경로의 주문은 **플랫폼 자체 판매**이며,
서비스 매장 주문(KPA/GlycoPharm/Cosmetics/Pharmacy-Hub)의 환불은 별도 매장 경영자 경로가
이미 담당한다. 따라서 canonical authority 는 `platform:super_admin` 이다
(`platform:admin` 은 `WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1` 로
이미 제거돼 존재하지 않는다 — `utils/role.utils.ts:137`).

---

## 2. refund / cancel entry 전수 census

### 2-1. 전체 목록

| # | Entry | 종전 guard | 분류(종전) | 분류(현행) |
|---|-------|-----------|-----------|-----------|
| R1 | `POST /api/checkout/refund` (`= /api/orders/refund`) | `authenticate` + bare `['admin','operator']` | **BARE_ROLE_ONLY** | `PLATFORM_ROLE` |
| R2 | `GET /api/checkout/orders/:id` | `authenticate` + buyer **OR** bare `['admin','operator']` | **BARE_ROLE_ONLY** | `AUTHENTICATED_CUSTOMER` + `PLATFORM_ROLE` |
| R3 | `POST /api/admin/orders/:id/refund` | `authenticate` + `platform:super_admin` | `PLATFORM_ROLE` | 변경 없음 |
| R4 | `PATCH /api/v1/kpa/checkout/store-orders/:orderId/status` (`cancel`\|`refund`) | requireAuth + `createRequireStoreOwner(ds,'kpa')` + `sellerOrganizationId` + `metadata.serviceKey` | `SERVICE_MEMBERSHIP_AND_ROLE` + `STORE_OR_SELLER` | 변경 없음 |
| R5 | `POST /{kpa,glycopharm,cosmetics}/checkout/orders/:id/cancel` | requireAuth + `buyerId` + `serviceKeys` | `AUTHENTICATED_CUSTOMER` | 변경 없음 |
| R6 | pharmacy-hub `POST /store-owner/orders/:orderId/cancel` · `POST /store-owner/payments/:paymentGroupId/cancel` | `storeOwnerGuards` + `loadGroupOrders(pgid, buyerId)` | `STORE_OR_SELLER` + buyer ownership | 변경 없음 |
| R7 | `PATCH /api/v1/neture/operator/market-trial/:id/participants/:pid/payment-status` (`action: refund`) | requireAuth + `requireNetureScope('neture:operator')` | `SERVICE_MEMBERSHIP_AND_ROLE` | 변경 없음 |
| R8 | `POST /api/v1/glycopharm/checkout/cleanup-expired` | `requireAuth` **만** | **NO_GUARD** | `SERVICE_MEMBERSHIP_AND_ROLE` |
| R9 | `EcommercePaymentController @Post(':id/refund')` (`packages/ecommerce-core`) | 없음 (NestJS 데코레이터) | **DEAD** | `DEAD` (유지) |

```text
UNKNOWN = 0
```

### 2-2. R9 를 DEAD 로 판정한 근거

`packages/ecommerce-core/src/controllers/payment.controller.ts` 는 NestJS `@Controller`
데코레이터 기반이나 api-server 는 Express 다. 전체 저장소에서 `EcommercePaymentController`
참조는 **자기 자신 · `controllers/index.ts` re-export · `manifest.ts` 문자열** 3곳뿐이고,
`apps/api-server` 어디에도 mount 가 없다. 라우팅되지 않으므로 authorization 결함이 아니다.
**본 WO 에서 삭제하지 않았다** — 패키지 구조 변경은 §23 금지 범위(대규모 리팩토링)에 가깝고,
소비처 0 판정만으로 공통 계약을 제거하지 않는다는 `CLAUDE.md` Shared Module 규칙을 따른다.

### 2-3. 무접두 `admin` / `operator` live path 전수

수정 전 저장소 전체에서 무접두 `admin`/`operator` 를 **authority 로 읽는** 지점:

| 위치 | 성격 | 처리 |
|------|------|------|
| `controllers/checkout/checkoutController.ts:287` | 환불 authority | **수정** (D1) |
| `controllers/checkout/checkoutController.ts:402` | 주문 조회 authority | **수정** (D2) |
| `routes/kpa/services/kpa-operator.service.ts:24` | `KpaMemberRole` — `kpa_members.role` 의 업무 role | 대상 아님 (RBAC role 네임스페이스가 아님) |
| `services/approval/MembershipApprovalService.ts:418` | `service_memberships.role` 값 비교 | 대상 아님 (동일) |
| `modules/media/controllers/media-library.controller.ts` | `r.includes('admin')` 부분일치 — 접두 role 도 매칭 | 환불 범위 밖 → §7 보고 |
| `packages/auth-context/*`, `services/*/MediaPickerModal.tsx` 등 프런트 | UI 표시 조건 | 환불 범위 밖 → §7 보고 |

환불 경로 기준 무접두 role authority = **0** (`TEST`: raw-source 단언 포함).

---

## 3. 기능별 업무 주체 (§6)

| 기능 | 구현 여부 | WHO_INITIATES | WHO_APPROVES | WHO_EXECUTES | WHO_CAN_VIEW |
|------|:--------:|---------------|--------------|--------------|--------------|
| 결제 전 주문 취소 | O | 구매자 본인 / 매장 경영자(pharmacy-hub) | 없음(즉시) | 동일 주체 | 구매자 · 매장 · 플랫폼 |
| 결제 후 전체 환불 | O | 매장 경영자(R4) · 플랫폼 운영자(R1/R3) | 없음(즉시) | 동일 주체 | 동일 |
| 결제 후 그룹 취소·환불 (공급자 접수 전) | O | 구매자(=매장) | 없음, **공급자 접수 시 차단(409)** | 동일 주체 | 동일 |
| 부분 환불 | △ | R1 이 `amount` 를 PG 에 전달 | — | — | — |
| 관리자 강제 취소 | O | 매장 경영자(R4 `action=cancel`) | 없음 | 동일 | 동일 |
| 사용자 취소 요청 (승인 대기 큐) | **X** | 미구현 | 미구현 | 미구현 | 미구현 |
| 환불 승인 (별도 승인 단계) | **X** | 미구현 | 미구현 | 미구현 | 미구현 |
| 환불 상태·내역 조회 | O | — | — | — | 구매자 본인 · 매장(`checkout_payments`/`checkout_order_logs`) · 플랫폼 |

**생성/승인/취소/조회 권한을 분리해야 하는가**(§6 마지막 질문): 현재 코드에 승인 단계가
존재하지 않으므로 **분리하지 않았다.** 없는 기능을 권한 계약으로 먼저 만들지 않는다.
조회 권한은 이미 분리돼 있다(구매자 본인 / 매장 조직 / 플랫폼).

---

## 4. 수정한 결함 3건

### D1 — `POST /api/checkout/refund` 기능 폐색 + escalation 표면

- 파일: `apps/api-server/src/controllers/checkout/checkoutController.ts`
- 종전: `user.roles?.some(r => ['admin','operator'].includes(r))` — **배타 조건**
- 문제: 현행 canonical RBAC 에서 무접두 role 은 신규 authority 로 쓰지 않으므로
  (F9 / `RBAC-CANONICAL-STATE-V1 §8-A`) 이 조건은 **통과 가능한 주체가 없는 기능 폐색**이었다.
  동시에, 무접두 role 이 어떤 경로로든 하나 주입되면 **곧바로 실제 금전 환불 권한**이 되는
  privilege escalation 표면이었다 — 이 엔드포인트는 Toss `cancelPayment` 를 직접 호출한다.
- 수정: `isPlatformAdmin(user.roles)` (= `platform:super_admin`)
- 근거: §1 "왜 플랫폼 축인가"

> 본 판정은 production 보유자 수에 의존하지 않는다. 무접두 role 보유자가 0 이면 폐색 해소이고,
> 0 이 아니면 escalation 차단이다. **어느 쪽이든 canonical 계약으로 수렴한다** —
> `NO_PRODUCTION_DB_CENSUS` 상태에서도 안전하게 확정할 수 있는 이유다.

### D2 — `GET /api/checkout/orders/:id` 타인 주문 열람

- 같은 파일 `:402`
- 종전: `order.buyerId !== userId && !bare('admin'|'operator')` → 무접두 role 주입 시 타인 주문 전체 열람
- 수정: `!isPlatformAdmin(userRoles)`
- 응답 의미 유지: 미인증 401 / 권한 부족 403 / 없는 주문 404

### D3 — `POST /api/v1/glycopharm/checkout/cleanup-expired` 무권한 대량 write (**신규 발견**)

- 파일: `apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts`,
  `apps/api-server/src/routes/glycopharm/glycopharm.routes.ts`
- 종전 guard: `requireAuth` **하나뿐**
- 문제: **어느 서비스의 아무 로그인 사용자나** (GlycoPharm membership 없이, role 없이)
  GlycoPharm 의 15분 초과 `created` 주문을 **일괄 `cancelled` 로 전이**시킬 수 있었고,
  응답으로 **타인 주문의 `id` · `orderNumber` 목록**까지 받아갔다.
  cross-service write + 정보 노출이 동시에 성립하는 `CROSS_SERVICE_REFUND_LEAK` 이다.
- 수정: `requireGlycopharmScope('glycopharm:operator')` 주입
  (`createMembershipScopeGuard` 계열 — active glycopharm membership + `glycopharm:operator` role).
  컨트롤러 쪽은 guard 미주입 시 **fail-closed 403 `OPERATOR_SCOPE_REQUIRED`** 로 기본값을 둔다.
- 호출자: 저장소 전체에서 `cleanup-expired` 호출자 **0** (프런트·cron 모두 없음).
  즉 사용자에게 보이는 기능 회귀 없음.

---

## 5. 분류했으나 수정하지 않은 항목

| # | 항목 | 판정 | 사유 |
|---|------|------|------|
| C1 | `/api/orders` 이중 mount 가 사실상 죽어 있음 | `DEAD_ROUTE` | `register-routes.ts:443` 이 `app.use('/api/orders', checkoutRoutes)` 로 붙였으나 라우터 내부 경로가 `/orders/:id`·`/orders` 라서 `/api/orders/orders/:id` 가 되어 매칭되지 않는다. `SMOKE` 확인: `GET /api/orders/<uuid>` → 404, `GET /api/checkout/orders/<uuid>` → 401. **고치면 지금 닫혀 있는 경로가 새로 열린다** — 요청자 없는 기능 확장이므로 §20 허용 범위 밖. 보고만 한다. |
| C2 | R1(`/api/checkout/refund`)만 PG(Toss) 취소를 호출하고, R3·R4 는 `checkoutService.refundOrder` 만 호출해 **원장만 refunded 로 바꾼다** | `LIFECYCLE_ASYMMETRY` | 권한 결함이 아니라 결제 연동 결함이다. §17 "권한 판정과 lifecycle 판정을 분리한다" · §18 "PG 연동 재설계가 아니다" 에 따라 손대지 않았다. **별도 WO 권고 — §7 참조.** |
| C3 | `services/web-kpa-society/src/api/checkout.ts:174 updateStoreOrderStatus` 의 호출자 0 | `DEAD_UI_PRODUCER` | 백엔드 R4 는 살아 있고 canonical 하다. 매장 경영자용 환불 UI 가 아직 없을 뿐이다. API 클라이언트 제거는 향후 UI 를 막을 뿐이라 유지. |
| C4 | `media-library.controller.ts` 의 `r.includes('admin')` 부분일치 | `OUT_OF_SCOPE` | 환불 경로 아님. 다만 `kpa:admin` 같은 접두 role 까지 매칭하는 느슨한 판정이라 별도 정비 대상. |
| C5 | `packages/auth-context/adminRouteAccess.ts` · `CookieAuthProvider.tsx` 의 무접두 role 조건 | `OUT_OF_SCOPE` | 프런트 표시 조건이며 환불과 무관. 프런트는 보안 SSOT 가 아니다. |
| C6 | R9 `EcommercePaymentController` | `DEAD` | §2-2 참조. |

---

## 6. 주문 ownership 축 (§9)

`checkout_orders` 의 소유권 축:

| 축 | 컬럼/필드 | 비고 |
|----|-----------|------|
| 구매자 | `buyerId` (uuid, indexed) | 고객 취소 판정의 유일한 축 |
| 판매 매장 | `sellerOrganizationId` (uuid, nullable, indexed) | 매장 경영자 환불 판정 축 |
| 판매자(플랫폼) | `sellerId` (varchar) | Phase N-1 은 `'platform-seller'` 고정 |
| 공급자 | `supplierId` (varchar, indexed) | |
| **서비스** | **`metadata->>'serviceKey'` (jsonb)** | **전용 컬럼이 아니다** |
| 결제 | `checkout_payments.orderId` / `paymentGroupId` | |

**§25 중지 조건 "order 에 service ownership 정보가 없어 cross-service 안전 판정이 불가능"에
해당하지 않는다.** 전용 컬럼은 없지만 `metadata.serviceKey` 가 실제 격리 축으로 쓰이고 있고
(R4 · R5 · R8 모두 이 값으로 필터), 매장 축은 `sellerOrganizationId` 로 인덱싱돼 있다.
따라서 "권한 있는 사용자 + 이 주문에 대한 업무 범위" 두 조건을 함께 검증할 수 있다.

다만 서비스 격리가 **인덱스 없는 jsonb 필드**에 의존한다는 점은 구조적 약점이다.
스키마 변경은 §23 금지(대규모 migration) 이므로 본 WO 에서 하지 않았다 — §7 권고.

---

## 7. 별도 WO 권고

| 우선 | 항목 | 이유 |
|:---:|------|------|
| 1 | **환불 PG 연동 정합** (C2) | 매장 경영자 환불(R4)과 플랫폼 주문 관리 환불(R3)이 **PG 취소 없이 원장만 `refunded`** 로 바꾼다. 실제 돈이 고객에게 돌아가지 않은 채 시스템은 환불 완료로 보인다. 권한과 무관한 **정합성 결함**이며 금전 영향이 있다. |
| 2 | `checkout_orders.service_key` 컬럼화 (§6) | 서비스 격리가 인덱스 없는 jsonb 에 의존. |
| 3 | `/api/orders` 이중 mount 정리 (C1) | 죽은 mount 를 제거할지 되살릴지는 제품 결정. |
| 4 | 무접두 role 부분일치 판정 정비 (C4) | `r.includes('admin')` 계열. |

---

## 8. 검증

### 8-1. 자동화 테스트

신규: `apps/api-server/src/__tests__/checkout-refund-authorization-canonical-role.spec.ts`
— **20 tests, 전부 PASS**.

§19 요구 matrix 대비:

| 요구 항목 | 커버 | 방식 |
|-----------|:----:|------|
| 정상 환불 권한자 + 자기 service order | O | R4 raw-source 계약 단언(`sellerOrganizationId` + `serviceKey` 동시 요구) |
| 정상 환불 권한자 + 타 service order | O | 동일 단언 — 매칭 실패 시 404 경로 |
| membership suspended | O | 선행 WO 회귀(`crossservice-membership-gate-live-consumers.spec.ts`)가 `requireStoreOwner`/membership guard 축을 이미 커버 |
| membership 없음 + role만 있음 | O | 동일 (선행 WO) + 본 spec 의 서비스 role 7종 403 |
| role 부족 | O | role 없음 → 403 |
| platform role | O | `platform:super_admin` → authorization 통과(404/400 로 분기) |
| bare admin | O | 403, 환불·PG 호출 0 |
| bare operator | O | 403 |
| bare super_admin (접두 없음) | O | 403 |
| customer own order | O | 200 |
| customer other user order | O | 403 |
| 이미 환불된/미결제 주문 | O | 400 `INVALID_TRANSITION` 계열, PG 호출 0 |
| 없는 주문 | O | 404 |

기대치 대비:

```text
canonical 권한만 성공        : 충족 (TEST)
cross-service refund 0       : 충족 (TEST + CODE) — D3 로 마지막 경로 차단
bare role privilege 0        : 충족 (TEST + CODE)
suspended 접근 0             : 충족 (CODE + 선행 WO TEST)
```

### 8-2. 타입체크

`apps/api-server` `npx tsc --noEmit` → **통과 (exit 0)**.

### 8-3. 전체 테스트 스위트

`apps/api-server` 전체 jest 결과는 §8-3-1 에 기록. 본 WO 변경과 무관한 실패는
다른 세션 WIP 소유임을 `git status` 로 확인해 구분한다.

### 8-3-1. 결과

```text
Test Suites: 5 failed, 184 passed, 189 total
Tests:       6 failed, 3042 passed, 3048 total
```

실패 5개 suite 는 **전부 다른 세션 WIP 소유**이며 본 WO 범위와 무관하다.

| 실패 suite | 소유 |
|-----------|------|
| `src/__tests__/cms-content-detail-service-scope.spec.ts` | 다른 세션 — `routes/cms-content/**` 4파일 modified + `cms-content-member-authoring.ts` untracked |
| `src/__tests__/community-content-resource-frontend-view-commonization.spec.ts` | 다른 세션 — `packages/operator-core-ui/modules/resources/**`, `shared-space-ui/ResourcesHubTemplate.tsx` modified |
| `src/__tests__/pharmacy-hub-content-resource-adoption.spec.ts` | 다른 세션 — `services/web-pharmacy-hub/**` 다수 modified/untracked |
| `src/__tests__/pharmacy-hub-community-baseline.spec.ts` | 다른 세션 — 동일 |
| `src/routes/pharmacy-hub/__tests__/pharmacy-hub-parity-contract.test.ts` | 다른 세션 — 해당 `__tests__/` 디렉터리 자체가 untracked |

본 WO 가 수정한 3개 파일(`controllers/checkout/checkoutController.ts`,
`routes/glycopharm/controllers/checkout.controller.ts`, `routes/glycopharm/glycopharm.routes.ts`)을
참조하는 suite 는 **전부 통과**한다. 해당 WIP 파일은 **수정·restore·stash·stage 하지 않았다**.

### 8-4. production API smoke (무인증, read-only)

base: `https://api.neture.co.kr` (Cloud Run 직접 URL 은 404 — 커스텀 도메인이 진입점)

| 요청 | 응답 | 판정 |
|------|:----:|------|
| `GET /api/health` | 200 | 서비스 정상 |
| `GET /api/v1/auth/me` | 401 | 인증 경계 정상 |
| `POST /api/checkout/refund` | 401 | 미인증 차단 |
| `POST /api/orders/refund` | 401 | 미인증 차단 |
| `POST /api/admin/orders/<uuid>/refund` | 401 | 미인증 차단 |
| `POST /api/v1/glycopharm/checkout/cleanup-expired` | 401 | 미인증 차단 |
| `GET /api/checkout/orders/<uuid>` | 401 | 미인증 차단 |
| `GET /api/checkout/orders` | 401 | 미인증 차단 |
| `GET /api/v1/kpa/checkout/store-orders/<uuid>` | 401 | 미인증 차단 |
| `GET /api/orders/<uuid>` | 404 | **C1 죽은 mount** (권한 결함 아님) |

**401 / 403 / 404 의미가 무너지지 않았음**을 확인했다(§16).

> smoke 는 **배포 전 코드 기준**이 아니라 현재 운영 리비전 기준이다. 본 WO 의 수정은
> commit·push 시점 이후 CI/CD 로 반영되며, 위 401 결과는 수정 전후 모두 동일해야 하는
> 인증 경계 확인이다. 권한(403) 판정 자체는 실계정 없이 검증할 수 없어 `TEST` 로 대체했다.

### 8-5. 실제 refund write 수행 여부

**수행하지 않았다.**

- production 환불 write E2E 는 안전한 테스트 주문이 확보되지 않았고, 금전 영향이 통제됨을
  확인할 수 없었다 (§21 · §23 "실사용 주문으로 위험한 production 환불" 금지).
- PG(Toss) refund 를 검증 명목으로 임의 실행하지 않았다.
- 대체 수단: 위 자동화 테스트 + 무인증 smoke. 특히 테스트에서
  **`tossPaymentsService.cancelPayment` 가 호출되지 않았음**을 명시적으로 단언한다.

---

## 9. 변경 요약

### backend

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/controllers/checkout/checkoutController.ts` | D1 · D2 — 무접두 role 판정 → `isPlatformAdmin` |
| `apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts` | D3 — `/cleanup-expired` 에 operator scope guard + fail-closed 기본값 |
| `apps/api-server/src/routes/glycopharm/glycopharm.routes.ts` | D3 — `requireGlycopharmScope('glycopharm:operator')` 주입 |

### frontend

**변경 없음.** 환불/취소 버튼을 제공하는 UI 를 전수조사한 결과:

- `/api/checkout/refund` · `/api/admin/orders/*` 를 호출하는 프런트 코드 **0건**
- 유일한 환불 실행 UI 는 `services/web-neture/.../MarketTrialApprovalDetailPage.tsx` 이며
  `neture:operator` scope 로 이미 정합 (R7)
- 매장 경영자 환불 UI 는 아직 없음 (C3)
- 세 서비스 operator 주문 화면은 설계상 조회 전용

따라서 **UI 버튼 노출과 backend guard 계약이 어긋난 지점이 없다.**
권한 없는 사용자에게 노출되는 환불 버튼도 없다.

### schema / migration / API 계약

```text
schema 변경     : 없음
migration       : 없음
API 경로 변경   : 없음
API 응답 shape  : 없음 (403 message 문자열만 변경 — code 필드 없던 경로)
```

### 문서 정합

- `docs/rbac/RBAC-CANONICAL-STATE-V1.md`
  - §8-A platform override 표에 `/api/checkout/refund` · `/api/orders/:id` · `/api/admin/orders/**` 2행 추가
  - **"환불 authorization 계약"** 절 신설 — 3축 표 + 구매자 취소 분리 + 서비스 운영자가 매장 환불 주체가 아닌 근거
- 기타 검색(`checkout` / `orders` / `payments` / `refund` / `RBAC` / `operator`) 결과
  현행 계약과 충돌하는 **살아있는 기준 문서 없음**.
  `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md` 는 `refunded_at` 컬럼만 언급하며 권한 서술 없음.
- 과거 완료 CHECK 의 역사적 결과는 덮어쓰지 않았다.

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건
```

---

## 10. 최종 수치

| 항목 | 값 | 근거 |
|------|:--:|------|
| `UNKNOWN` | **0** | `CODE` — R1~R9 전수 분류 |
| `REQUIRED_BUT_MISSING` | **0** | `CODE` — 승인 단계 등 미구현 기능은 억지로 추가하지 않음(§3) |
| `PRIVILEGE_ESCALATION_PATH` | **0** | `CODE` + `TEST` |
| `CROSS_SERVICE_REFUND_LEAK` | **0** | `CODE` + `TEST` — D3 로 마지막 경로 차단 |
| bare `admin`/`operator` 의존 (환불 경로) | **0** | `CODE` + `TEST` raw-source 단언 |
| production DB census | **`NO_PRODUCTION_DB_CENSUS`** | §0-1 |

§20 escalation 감사 항목별:

| 항목 | 결과 |
|------|:----:|
| bare role 만 추가하면 refund 가능 | 차단 (D1) |
| service role 만 있고 membership 없어도 refund 가능 | 차단 (R4 `requireStoreOwner` / R7·R8 membership guard) |
| JWT snapshot 만으로 suspend 후 refund 가능 | 차단 (선행 WO 의 DB 확정검사가 membership guard·`isStoreOwner` 양쪽에 적용) |
| 한 서비스 operator 가 다른 서비스 refund 가능 | 차단 (D3 가 마지막 경로였음) |
| store_owner 가 operator refund API 호출 가능 | 차단 (R7 `neture:operator` scope) |
| customer 가 관리자 refund API 호출 가능 | 차단 (R1 platform authority, R4 store owner) |

**위 0 수치는 정적 감사 + 자동화 테스트 + 무인증 smoke 기준이다.**
production DB 실측을 포함한 절대적 0 을 주장하지 않는다.

---

## 11. 완료 상태

```text
관련 파일만 path-specific stage
commit
push
HEAD == origin/main
```

상세는 완료 보고 참조.
