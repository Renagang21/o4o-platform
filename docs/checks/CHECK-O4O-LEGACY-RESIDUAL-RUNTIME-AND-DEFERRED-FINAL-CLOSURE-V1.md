# CHECK — O4O legacy 잔여 runtime · DEFERRED 최종 종결 V1

**WO:** WO-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1
**작성일:** 2026-09-04
**기준 커밋:** `b64b2b61b` (Merge PR #191 — WO-O4O-LEGACY-FILES-DEPENDENCIES-AND-DEAD-RUNTIME-FINAL-CLEANUP-V1)
**판정:** **CLOSED_WITH_FOLLOWUPS**
— 6개 잔여 축을 current main 기준으로 전수 census. 작은 residue 3건(축 A·C·D)은 제거 완료. 계약 변경(권한 guard·type union·app 카탈로그)에 해당하는 4건은 **RETAIN + 별도 WO 권고**. DB 2 테이블은 판정만 수행하고 실제 production DROP 은 수행하지 않았다.

> 조사 → 판정 → 안전 범위 residue 제거 → 전량 검증 → production read-only smoke → 마감.
> 권한·route·API contract 변경에 해당하는 항목은 CLAUDE.md 중지 조건이므로 제거하지 않고 판정·기록만 했다.

---

## 0. 축별 판정 요약

| 축 | 대상 | 판정 | 조치 |
|:--:|------|------|------|
| A | Admin/Operator 승인 기능 중복 | `DEAD_DUPLICATE` 1건 + 나머지 `CANONICAL_OWNER` | **제거 완료** |
| B | 권한 진입점 중복 (`requirePermission` 계열) | `DEAD_UNMOUNTED` | **RETAIN · 별도 WO** |
| C | notification fallback residue | `BEST_EFFORT_INTENTIONAL` (dead fallback 0) + orphan type 1건 | **부분 제거 · 나머지 RETAIN** |
| D | order / settlement residue | `DEAD_CROSSLINK` 6화면 + `LEGACY_CONSUMER` 3 app | **6화면 제거 · 3 app RETAIN** |
| E | `cosmetics-seller-extension` 의 `@o4o/ui` 미선언 dependency | 실제 결함 | **수정 완료** |
| F | `store_events` · `organization_product_applications` DROP 가능 여부 | 둘 다 `DROP_READY` | **판정만 · DROP 미수행** |

---

## 1. Axis A — Admin / Operator 승인 기능 중복

### 1-1. 인벤토리

Neture 승인 축의 admin / operator 쌍을 전수 대조했다.

| 기능 | admin 경로 | operator 경로 | 공유 service | 판정 |
|------|-----------|--------------|-------------|------|
| 제품 일괄 승인 | `POST /neture/admin/products/batch-approve` | `POST /neture/operator/products/batch-approve` | 동일 (`offer.service` / approval service) | `CANONICAL_OWNER` (양쪽 다 실사용 · 권한 축이 다름) |
| offer 일괄 승인 | **`POST /neture/admin/offers/bulk-approve`** | — | `netureService.approveProducts` → `offerService.approveProducts` | **`DEAD_DUPLICATE`** |
| 서비스 승인 | — | `POST /neture/operator/service-approvals/batch-approve` | 전용 | `CANONICAL_OWNER` |

### 1-2. `DEAD_DUPLICATE` 판정 근거 — `/admin/offers/bulk-approve`

- frontend 소비처 **0건** (admin-dashboard / web-neture / web-kpa-society / web-k-cosmetics / web-glycopharm 전 범위 문자열 census).
- 동일 결과를 내는 canonical 경로가 이미 존재한다 (`/operator/products/batch-approve`).
- `approveProducts` 는 이 route 외 호출자 **0건** — `neture.service.ts` wrapper 와 `offer.service.ts` 구현이 모두 이 route 전용이었다.

### 1-3. 조치

- `modules/neture/controllers/admin.controller.ts` — `POST /admin/offers/bulk-approve` route 제거 (1,437자).
- `modules/neture/neture.service.ts` — `approveProducts` wrapper 제거.
- `modules/neture/services/offer.service.ts` — `approveProducts` 루프 제거 (803자).

### 1-4. 관측 사항 (변경하지 않음)

admin batch 상한은 50, operator batch 상한은 100 이다. 두 경로의 권한 축이 다르므로 상한 통일은 정책 판단이며 이번 범위 밖이다. **기록만 한다.**

---

## 2. Axis B — 권한 진입점 중복

### 2-1. census

`requirePermission` / `requireAnyPermission` 를 repo 전체에서 조사했다 (15개 파일 hit).

| 위치 | 역할 |
|------|------|
| `common/middleware/auth/authorization.middleware.ts` | 정의 |
| `common/middleware/auth.middleware.ts:40-41` | re-export |
| 나머지 13건 | `dist/` 산출물 · 무관한 `packages/organization-core/src/guards/PermissionGuard.ts` |

**api-server route mount = 0건.** 즉 정의·export 는 살아 있으나 어떤 라우터에도 걸려 있지 않다.

### 2-2. 판정 `DEAD_UNMOUNTED` — RETAIN

제거하지 않은 이유:

1. export 된 **인증 guard 를 삭제하는 것은 권한 contract 변경**이며 CLAUDE.md 중지 조건이다.
2. 실제 canonical 권한 축은 `role_assignments` 기반 `requireAuth` + `require{Service}Scope` 이고, 이 축은 정상 동작한다 — 이번 WO 는 그 축을 건드리지 않는다.

### 2-3. 추가 관측 (별도 WO 권고 사유)

`requirePermission` 첫 분기는 `user.permissions?.includes(permission)` 로 **JWT snapshot 을 신뢰**한다.
백엔드는 `user.permissions` 를 채우지 않으므로 현재는 항상 false 로 떨어져 무해하지만, 되살릴 때 이 분기를 먼저 제거해야 한다. → **별도 WO 대상**.

---

## 3. Axis C — notification fallback residue

### 3-1. dead fallback 판정 결과 = **0건**

- `services/NotificationService.ts` (326행)의 유일한 fallback 형태는 SSE emit 의 try/catch 이며, 클래스 doc-comment 에 "SSE emission is best-effort — failures are logged but never thrown" 로 **명시**돼 있다 → `BEST_EFFORT_INTENTIONAL`.
- `actionUrl` 생산자 전수 추적 결과, 모든 값이 web-neture / web-kpa-society / web-k-cosmetics / web-glycopharm 의 **실재 route** 로 해소된다 → `DEAD_FALLBACK` 0 · `BUG_MASKING` 0.

### 3-2. orphan type 1건 제거

`apps/api-server/src/types/auth.ts` 의 `PricingResult` interface (351자) — repo 전체 importer **0건**(`dist/` 산출물 제외). `CacheService.ts:250/254` 의 `getCachedPricingResult`/`cachePricingResult` 는 `Promise<any>` 로 이 타입을 쓰지 않는다. → **제거 완료**. 이 interface 는 파일 내 유일한 `fallbackUrl` 출현부였다.

### 3-3. `NotificationType` 19개 dead member — **RETAIN**

`entities/Notification.ts:24` union 중 **생산자 0** 인 19개를 확인했다:

`order.new` · `order.status_changed` · `settlement.new_pending` · `settlement.paid` · `price.changed` · `stock.low` · `role.approved` · `role.application_submitted` · `member.license_expiring` · `member.license_expired` · `member.verification_expired` · `member.fee_overdue_warning` · `member.fee_overdue` · `member.report_rejected` · `member.education_deadline` · `pharmacy.request_submitted` · `pharmacy.request_approved` · `pharmacy.request_rejected` · `store.online_sales_order_created`

production 교차 검증: `SELECT type, count(*) FROM notifications GROUP BY type` → 실재 type **16종**, 위 19개는 **1행도 없음**.

그럼에도 제거하지 않은 이유: 이 union 은 `apps/admin-dashboard/src/types/index.ts:196-206` 에 **부분 미러**돼 있는 양쪽 앱 공유 contract 이며, 좁히는 것은 API/type contract 변경(중지 조건)이다. → **별도 WO 권고**.

### 3-4. 관측 사항 (변경하지 않음)

`modules/neture/services/neture-settlement.service.ts:455-481` `notifySupplierSettlementPaid` 는 union 에 `settlement.paid` 가 존재함에도 `type: 'custom'` + `metadata.targetUrl: '/supplier/settlements'` 를 쓴다. 동작에는 문제가 없으나 3-3 정리 시 함께 처리해야 한다. **기록만 한다.**

---

## 4. Axis D — order / settlement residue

### 4-1. 살아 있는 축 (보호 대상 · 손대지 않음)

| 대상 | 판정 | 근거 |
|------|------|------|
| `services/neture/checkout-fulfillment-bridge.service.ts` | **`ACTIVE_B2B`** | 실소비처 `PharmacyHubOperatorFulfillmentController.ts:24,101` · `NetureB2bCheckoutPaymentEventHandler.ts:37,46,52` + 계약 테스트 |
| `/api/v1/neture/supplier/settlements` (`supplier-settlement.controller.ts`, `neture.routes.ts:91`) | **`ACTIVE_FINANCIAL`** | web-neture `/supplier/settlements` 가 canonical 소비처 |
| `store_cart_items` → `checkout_orders` 축 (`/api/v1/store/cart/:serviceKey/*`) | **`ACTIVE_B2B`** | CLAUDE.md Priority Chain 3-A 보호 대상 |
| partner-core (F7) | **`ACTIVE_FINANCIAL`** | Frozen Baseline |

### 4-2. 제거 대상 — admin-dashboard PD-3/PD-4/PD-5 seller·supplier 대시보드 6화면

3중 근거로 dead 임을 확정했다.

1. **backend 부재** — 6화면이 호출하는 경로가 모두 존재하지 않는다. production 실측 **404**:
   `/api/v2/seller/catalog` · `/api/v2/seller/products` · `/api/v2/seller/orders` · `/api/v1/seller/settlements` · `/api/v2/supplier/orders` · `/api/v1/supplier/settlements`
2. **권한 리터럴이 legacy** — `<AdminProtectedRoute requiredRoles={['seller']}>` / `['supplier']`. RBAC SSOT(`role_assignments`)는 이 role 을 발급하지 않는다. seller 축은 `PLATFORM_DIRECT_SALE_BUSINESS_CONTRACT = NONE` (2026-08-25).
3. **진입 네비게이션 0건.**

판정 **`DEAD_CROSSLINK`** → 제거.

| 제거 파일 | 호출하던 dead endpoint |
|-----------|----------------------|
| `pages/dashboard/seller/SellerCatalog.tsx` | `/v2/seller/catalog`, `/v2/seller/catalog/import` |
| `pages/dashboard/seller/SellerProducts.tsx` | `/v2/seller/products`, PATCH/DELETE `/v2/seller/products/{id}` |
| `pages/dashboard/seller/SellerOrders.tsx` | `/v2/seller/orders` |
| `pages/dashboard/seller/SellerSettlements.tsx` | `/v1/seller/settlements`, `/preview` |
| `pages/dashboard/supplier/SupplierOrders.tsx` | `/v2/supplier/orders` |
| `pages/dashboard/supplier/SupplierSettlements.tsx` | `/v1/supplier/settlements`, `/preview` |

`routes/dashboard.routes.tsx` 에서 lazy import 6건 + `<Route>` 6건을 제거하고 은퇴 사유 주석을 남겼다. `seller/` · `supplier/` 디렉터리는 비어서 사라졌고, `pages/dashboard/` 에는 `business/` · `phase2.4/` · `unified/` 만 남는다.

### 4-3. RETAIN — 별도 WO 권고

| 대상 | 판정 | RETAIN 사유 |
|------|------|-------------|
| `pages/sellerops/*` · `supplierops/*` · `partnerops/*` | `LEGACY_CONSUMER` (`/sellerops/listings` 는 backend 부재) | `routes/apps.routes.tsx:140,151,162` + `ViewComponentRegistry.ts:235` 로 **app 카탈로그 항목 전체**가 걸려 있다. 카탈로그 엔트리 제거는 "작은 residue" 범위를 넘는다. |
| `/:slug/channels/b2c/activate` · `/deactivate` | `LEGACY_CONSUMER` | KPA storefront 폐기 트랙의 메뉴 껍데기 유지 정책과 lockstep. 단독 제거하지 않는다. |

---

## 5. Axis E — `cosmetics-seller-extension` 의 `@o4o/ui` 미선언 dependency

실제 결함이었다. 사용 중이나 `package.json` 에 선언이 없었다.

| 파일 | 조치 |
|------|------|
| `packages/cosmetics-seller-extension/package.json` | `"@o4o/ui": "workspace:*"` 추가 |
| `packages/forum-core/package.json` | 동일 유형 2건 추가 — `"@o4o/auth-client"`, `"@o4o/content-editor"` |
| `packages/organization-forum/src/services/OrganizationForumService.ts` | dead import `ForumCategory from '@o4o/forum-app'` 제거 |
| `pnpm-lock.yaml` | `pnpm install --lockfile-only` 재생성 (9줄 추가만) |

---

## 6. Axis F — DB 2 테이블 DROP 가능 여부

**WO 지시대로 실제 production DROP 은 수행하지 않았다. DROP migration 도 작성하지 않았다** — `apps/api-server/src/database/migrations/` 아래 파일은 merge 시 CI/CD 가 자동 실행하므로, migration 작성 자체가 금지된 DROP 수행에 해당한다.

| 테이블 | 판정 | 근거 |
|--------|------|------|
| `organization_product_applications` | **`DROP_READY`** (이미 적용된 상태) | 코드 참조 0 · production 부재 |
| `store_events` | **`DROP_READY`** | 코드 write 경로 0 · 소비처 0 · production row 확인 |

후속 DROP 은 `PRODUCTION-MIGRATION-STANDARD` 절차에 따라 **별도 승인 WO** 로 수행한다.

---

## 7. Axis G — 재조사 · stale test · 문서

- **재조사**: 제거 대상 심볼(`approveProducts` · `bulk-approve` · `PricingResult` · 6개 삭제 페이지명) 을 `apps` / `packages` / `services` 전 범위 재검색 → 잔존 참조 **0건** (`dist/` 산출물 제외).
  web-neture 의 `SupplierOrdersPage` / `SupplierSettlementsPage` 는 **이름만 유사한 canonical 화면**이며 이번 제거 대상과 무관하다.
- **stale test**: 제거 심볼을 참조하는 spec/test **0건**. 기존 retirement guard spec 18종은 전부 `RETIREMENT_GUARD` 로 유효.
- **신규 guard spec 추가**: `apps/api-server/src/__tests__/legacy-residual-runtime-final-closure.spec.ts` (5 test) — 축 A·C 제거분의 **재등록 방지 계약**. DB·네트워크 접근 0.
- **문서 정합**: 기준 문서 drift 발견 없음. 과거 CHECK·history 는 삭제하지 않았다.

---

## 8. 검증 결과

### 8-1. 로컬 (전량 통과)

| 항목 | 결과 |
|------|------|
| api-server Jest | **217 suites / 3,606 tests 통과** (exit 0) |
| api-server type-check | 통과 |
| admin-dashboard type-check | 통과 |
| admin-dashboard Vitest | **13 files / 229 tests 통과** |
| admin-dashboard build | exit 0 |
| `cosmetics-seller-extension` · `forum-core` · `organization-forum` `tsc --noEmit` | 3건 모두 rc=0 |
| `scripts/check-unsafe-routes.mjs` | 1,156 파일 / 위반 0 |
| `scripts/check-typeorm-entities.mjs` | PASS (221 `@Entity`, 동결 재고 5 등재) |
| `scripts/lint-ratchet.mjs` | baseline 유지 (error 62 / warning 1,686) |

### 8-2. production read-only smoke (금전 write 0)

진입점 `https://api.neture.co.kr`. GET 은 `-H "Origin: https://neture.co.kr"` 필요 (없으면 검증 미들웨어가 오해 소지 있는 400 반환).

| 경로 | 기대 | 실측 |
|------|:----:|:----:|
| `/auth/status` | 200 | **200** |
| `/notifications` | 401 | **401** |
| `/neture/supplier/settlements` | 401 (살아 있음) | **401** |
| `/store/cart/neture/items` | 401 (살아 있음) | **401** |
| `/store/cart/pharmacy-hub/items` | 401 (살아 있음) | **401** |
| admin `batch-approve` | 401 | **401** |
| operator `batch-approve` | 401 | **401** |
| 제거한 6개 endpoint | 404 | **전부 404** |

> `/api/v1/store/cart` 단독 호출은 404 다. mount 가 `/api/v1/store/cart/:serviceKey/*` (`register-routes.ts:359`) 이기 때문이며 dead route 가 아니다.

---

## 9. 남은 후속 (별도 WO 권고)

| # | 대상 | 사유 |
|:-:|------|------|
| 1 | `requirePermission` / `requireAnyPermission` 제거 + `user.permissions` JWT snapshot 분기 정리 | 권한 contract 변경 |
| 2 | `NotificationType` dead member 19개 정리 + `notifySupplierSettlementPaid` 를 `settlement.paid` 로 교정 | 두 앱 공유 type contract 변경 |
| 3 | `sellerops` / `supplierops` / `partnerops` app 카탈로그 은퇴 | 카탈로그 엔트리 전체 제거 |
| 4 | `store_events` · `organization_product_applications` production DROP | migration = CI/CD 자동 실행 · 별도 승인 필요 |

---

## 10. 마감

- **legacy cleanup 트랙 종료.** 잔여 6축 중 안전 범위 residue 는 전부 제거했고, 남은 4건은 계약 변경 사유와 함께 위 §9 에 등재했다.
- 다른 세션 WIP 는 접촉하지 않았다 (수정·restore·stash·stage 0건). 커밋은 path-specific pathspec 으로만 수행했다.

**문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건**
