# WO-O4O-FINAL-UNJUDGED-RUNTIME-AND-POLICY-RESIDUE-CENSUS-V1 — CHECK

- **작성일**: 2026-09-04
- **성격**: 조사 전용 (investigation-only). runtime 수정 0 / route 수정 0 / dependency 수정 0 / DB write 0 / migration 0 / production config 변경 0
- **선행 문서**: `docs/checks/WO-O4O-LEGACY-FILES-DEPENDENCIES-AND-DEAD-RUNTIME-FINAL-CLEANUP-V1-CHECK.md` (§9~§12 UNJUDGED 4건)
- **선행 기준(CLAUDE.md Priority Chain)**: `O4O-STORE-COMMERCE-BOUNDARY-V1` (3번) · `O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1` (3-A) — 축 D 판정의 상위 계약
- **목표**: UNJUDGED 4축을 각각 단일 판정으로 확정한다. **UNKNOWN = 0**

---

## §1. 조사 기준선 (baseline)

| 항목 | 값 |
|---|---|
| `origin/main` | `eff7816d0` |
| 조사 worktree | `/c/tmp/o4o-census-unjudged-v1` (branch `work/o4o-final-unjudged-census-v1`, clean) |
| 공유 worktree HEAD | `304fc4ff0` (다른 세션 WIP 11 modified + 5 untracked — **미접촉**) |
| 선행 PR #191 | **MERGED** (`b64b2b61b`, `origin/main` 의 ancestor 확인) |
| Production DB | `o4o_platform` via cloud-sql-proxy `127.0.0.1:5442`, user `o4o_api_v2` |
| DB 접근 방식 | `BEGIN READ ONLY; … ROLLBACK;` — SELECT / information_schema / count / aggregate 만 |
| DB write | **0건** (INSERT/UPDATE/DELETE/ALTER/DROP/migration 없음) |

자격증명은 `gcloud secrets versions access` 로 런타임에만 주입했고 본 문서·로그·커밋에 남기지 않았다.

---

## 축 A. Admin / Operator 승인 중복

### §2. write path census (같은 SSOT를 쓰는가)

| Endpoint | 호출 서비스 함수 | 쓰는 테이블 | Actor scope | Action log key | 판정 |
|---|---|---|---|---|---|
| `POST /neture/admin/suppliers/:id/approve` (`admin.controller.ts:87`) | `netureService.approveSupplier()` | `neture_suppliers` | `neture:admin` | `neture.admin.supplier_approve` | **SAME_DOMAIN_DUPLICATE** |
| `POST /neture/operator/suppliers/:id/approve` (`operator-supplier.controller.ts:350`) | `netureService.approveSupplier()` (**동일 함수**) | `neture_suppliers` | `neture:operator` | `neture.operator.supplier_approve` | canonical |
| `POST /neture/admin/products/:id/approve` (`admin.controller.ts:425`) | `netureService.approveProduct()` | `supplier_product_offers` | `neture:admin` | `neture.admin.product_approve` | **SAME_DOMAIN_DUPLICATE** |
| `POST /neture/operator/products/:id/approve` (`operator-product-approval.controller.ts:178`) | `netureService.approveProduct()` (**동일 함수**) | `supplier_product_offers` | `neture:operator` | `neture.operator.product_approve` | canonical |
| `POST /neture/admin/service-approvals/:id/approve|reject` (`admin.controller.ts:953,982`) | `ProductApprovalV2Service.approveServiceProduct()` | `organization_product_listings` · `product_approvals` | `neture:admin` | `neture.admin.service_approval_approve` | **SAME_DOMAIN_DUPLICATE** (읽기 테이블만 다름) |
| `POST /neture/operator/service-approvals/:id/approve|reject|batch-*` (`operator-service-approval.controller.ts:194~273`) | `OfferServiceApprovalService.approve()` | `offer_service_approvals` · `product_approvals` · `organization_product_listings` | `neture:operator` | — | canonical |
| `POST /neture/admin/service-approvals/:id/revoke` (`admin.controller.ts:1013`) | `ProductApprovalV2Service` | `organization_product_listings` | `neture:admin` | `neture.admin.service_approval_revoke` | **DISTINCT_DOMAIN** (operator 측 대응 없음 = admin 전용 governance) |

**핵심 사실**: supplier / product 승인은 admin·operator 가 **문자 그대로 동일한 service 함수**를 호출한다. 차이는 scope guard 와 action-log key 뿐이다. ownership axis 도, 서비스 계층 차이도 아니다.

service 승인은 admin 이 `product_approvals`(approval_type='service') 를, operator 가 `offer_service_approvals` 를 읽는다. 두 테이블 모두 `OfferServiceApprovalService` 가 함께 쓴다 (`offer-service-approval.service.ts:53, 472`) → **같은 업무 객체를 서로 다른 테이블로 읽는 중복**이며, 이는 drift 위험 지점이다.

### §3. read / UI path census (도달 가능한가)

| UI route | 페이지 | 호출 API | 메뉴 등록 | 판정 |
|---|---|---|---|---|
| `/operator/suppliers` | `OperatorSupplierApprovalPage.tsx:248,281` | `operatorSupplierApi.approve/reject` | ✅ `operatorMenuGroups.ts:31` "공급자 승인" | **canonical UI** |
| `/admin/supplier-governance` | `AdminSupplierGovernancePage.tsx` | `getGovernanceSuppliers` / `deactivate` / `reactivate` — **approve/reject 호출 없음** | ✅ `operatorMenuGroups.ts:166` | ACTIVE (governance 전용, 선행 IR OPTION_B) |
| `/admin/admin-suppliers` | — | — | ❌ | 이미 `Navigate → /admin/supplier-governance` (App.tsx:1111) |
| `/neture/suppliers` (admin-dashboard) | `SupplierListPage.tsx:68-73,90,95` → `/neture/admin/suppliers/:id/approve|reject` 직접 호출 | admin path | ❌ **메뉴 grep 0건** (`apps/admin-dashboard/src/admin/menu/` 내 `neture/suppliers` 0) | **LEGACY_UI_ONLY** (route 만 `services.routes.tsx:73` 에 존재) |
| `/operator/product-approvals` | `OperatorProductApprovalPage` | `operatorProductApi` | ✅ `operatorMenuGroups.ts:52` | **canonical UI** |
| `/admin/product-approvals` | `AdminProductApprovalPage.tsx:117,128` | `adminProductApi.approveProduct/rejectProduct` | ❌ **메뉴 0건** | **LEGACY_UI_ONLY** |
| `/operator/product-service-approvals` | `ProductServiceApprovalPage.tsx` | `operatorServiceApprovalApi` | ✅ `operatorMenuGroups.ts:53` | **canonical UI** |
| `/admin/service-approvals` | `AdminServiceApprovalPage.tsx:51,61,63` | `adminServiceApprovalApi` | ✅ `operatorMenuGroups.ts:55,167` (adminOnly) | ACTIVE (단, revoke 외에는 operator 와 중복) |

`services/web-neture/src/lib/api/admin.ts` 의 `adminSupplierApi.approveSupplier(:148)` / `rejectSupplier(:158)` 는 **web-neture 내 페이지 소비처 0건**이다 (§23 확장 검색: 심볼·`href`·`navigate(`·`<Link`·API URL 리터럴 모두 확인).

### §4. production 사용 실적 (read-only)

`action_logs` (8,604행, 2026-05-14 ~ 2026-09-04) 중 승인/반려 계열 전수:

| action_key | 건수 | 최초 | 최종 |
|---|---:|---|---|
| `neture.operator.supplier_approve` | 2 | 2026-06-11 | 2026-07-23 |
| `neture.operator.product_approve` | 1 | 2026-06-11 | 2026-06-11 |
| `neture.operator.product_batch_approve` | 1 | 2026-06-18 | 2026-06-18 |
| `neture.operator.product_reject` | 1 | 2026-06-18 | 2026-06-18 |
| `neture.operator.registration_batch_approve` | 10 | 2026-05-24 | 2026-07-23 |
| **`neture.admin.supplier_approve`** | **1** | **2026-05-28** | **2026-05-28** |
| `neture.admin.product_approve` | **0** | — | — |
| `neture.admin.service_approval_approve` / `_reject` / `_revoke` | **0** | — | — |

타 서비스 비교: `pharmacy-hub.operator.member_approve` 11 / `platform.operator.member_batch_approved` 9 / `kpa.operator.product_approve` 3 — **승인 실행은 전 서비스에서 operator scope 로 수렴**해 있다.

상태 테이블: `neture_suppliers` ACTIVE 2 / PENDING 1 (max 2026-07-23) · `offer_service_approvals` approved 3 (max 2026-08-14) · `product_approvals` approved 3 + pending 1 (approval_type='service').

### §5. 축 A 판정

**`LEGACY_RETIRE_READY`**

근거 3가지가 모두 같은 방향이다.
1. admin·operator 가 **동일 service 함수 / 동일 테이블 / 동일 row** 를 쓴다 — ownership axis 분리가 아니다.
2. admin 측 승인 UI 는 메뉴 진입점이 없다 (`/admin/product-approvals`, admin-dashboard `/neture/suppliers`), `adminSupplierApi.approve/reject` 는 소비처 0.
3. production 실행 실적이 admin 측 supplier 1건(2026-05-28, 선행 IR canonical 정렬 이전)뿐이고 product·service 는 0건이다.

**후속 WO 대상 (본 WO 에서 실행하지 않음)**: `admin.controller.ts` 의 supplier approve/reject · product approve/reject/batch, `adminSupplierApi.approveSupplier/rejectSupplier`, `adminProductApi.approveProduct/rejectProduct`, `AdminProductApprovalPage`, admin-dashboard `SupplierListPage`.
**보존 대상**: `/admin/service-approvals` 의 **revoke** (operator 측 대응 없는 admin 전용 governance) · `/admin/supplier-governance` (선행 IR OPTION_B) · 모든 operator 측 승인 경로.

---

## 축 B. 권한 진입 중복

### §6. 권한 SSOT 확인 (production, read-only)

| 테이블 | 존재 | 행수 |
|---|:---:|---:|
| `role_assignments` | ✅ | 78 |
| `service_memberships` | ✅ | 42 |
| `service_credentials` | ✅ | — |
| `organization_members` | ✅ | — |
| `user_roles` | ❌ **없음** | — |
| `users.role` / `users.roles` 컬럼 | ❌ **없음** (information_schema 0건) | — |

→ F9 (RBAC SSOT) · F11 (User/Operator Freeze) 계약대로 단일 소스가 유지되고 있다. **legacy 권한 테이블 잔재 0건.**

### §7. guard 계층 census

| 계층 | 구현 | 건수 | 판정 |
|---|---|---:|---|
| Backend 인증 | `requireAuth` | — | ACTIVE |
| Backend 역할 | `requireAdmin` (`common/middleware/auth/authorization.middleware.ts:58`) | 148 참조 / 31 파일 | ACTIVE |
| Backend 서비스 scope | `requireNetureScope` · `requireKpaAdmin` · `requireLmsOperator` 등 | — | ACTIVE |
| Frontend | `AdminProtectedRoute` (`packages/auth-context`) | 245 | **DEFENSE_IN_DEPTH_REQUIRED** |
| Frontend | `RoleGuard` (서비스별 4벌) | 78 | **DUPLICATED (서비스별 분기)** |
| Frontend | `ProtectedRoute` (web-neture 에서 `RoleGuard` 별칭, `App.tsx:682`) | 57 | 별칭 — 중복 아님 |
| Frontend | `OperatorRoute` | 24 | ACTIVE |

**중복 여부 판정 근거**
- `requireAdmin` 과 서비스 scope guard 를 **동시에 stacking 한 라우트 0건** (교차 grep 결과 없음) → backend 계층 내 redundant gate 없음.
- `requireAdmin` 단독 사용도 인증은 `requireAuth` 에 위임되어 401 이 정상 반환된다 (`authorization.middleware.ts:19` 주석에 계약 명시). 무방비 경로 아님.
- frontend guard + backend guard 는 **서로 대체 관계가 아니다**. frontend 는 UX(메뉴/화면 은폐), backend 는 권한 판정이다. 제거 대상이 아니라 유지되어야 할 이중 방어다.
- raw-source 계약 테스트가 이 경계를 고정하고 있다 (§23 대상): `bootstrap/__tests__/admin-route-auth-boundary.test.ts:141,143`, `__tests__/security/require-admin-contract.spec.ts`, `bootstrap/__tests__/product-db-write-authority.test.ts:145-147`. → **guard 를 임의로 제거하면 계약 테스트가 깨진다.**

### §8. 서비스별 `RoleGuard` 4벌 실측

| 파일 | 라인수 | md5(앞 8) |
|---|---:|---|
| `services/web-glycopharm/src/components/auth/RoleGuard.tsx` | 76 | `48b0ea44` |
| `services/web-k-cosmetics/src/components/auth/RoleGuard.tsx` | 92 | `1f51c5fb` |
| `services/web-kpa-society/src/components/auth/RoleGuard.tsx` | 43 | `512ff8fc` |
| `services/web-neture/src/components/auth/RoleGuard.tsx` | 180 | `96870b63` |

**단순 복사본이 아니라 서비스별로 분기·발산한 4개 구현**이다 (neture 만 `requireMembership` / `MembershipGate` 위임 로직 보유). 이는 legacy 잔재가 아니라 **공통화 재정렬 트랙의 미완 항목**이며, 은퇴가 아니라 통합이 필요한 대상이다.

### §9. 축 B 판정

**`DUPLICATED_BUT_INTENTIONAL`**

- frontend guard ↔ backend guard 의 중복은 **의도된 이중 방어**이고 계약 테스트로 고정되어 있다 → 제거 금지.
- backend 계층 내부에는 redundant gate 가 없다 (stacking 0건).
- 권한 SSOT 는 `role_assignments` + `service_memberships` 단일 소스로 유지, legacy 테이블 잔재 0건.
- 유일한 실제 중복은 **서비스별 `RoleGuard` 4벌 발산**이며, 이는 **은퇴 대상이 아니라 공통화 대상**이다 → 별도 WO 로 분리 제안.

---

## 축 C. Notification fallback

### §10. fallback 지점 census

| # | fallback 지점 | 위치 | 동작 | 판정 |
|---|---|---|---|---|
| 1 | `fallbackUrl` | — | **저장소 전체 0건** (`.ts/.tsx` 전수). 선행 WO 에서 `types/auth.ts` 의 `PricingResult` 제거와 함께 사라졌다 (`CHECK-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1.md:94`) | **DEAD_RESIDUE — 이미 해소됨** |
| 2 | mail transport dev fallback | `packages/mail-core/src/mail-transport.service.ts:83-88` | `NODE_ENV === 'development' && !SMTP_HOST` 일 때만 `jsonTransport` | **프로덕션 도달 불가** (아래 §11) |
| 3 | SMTP 설정 불완전 시 | `mail-transport.service.ts:90-95` | transporter `null` → 전송 시 예외 → `mail.service.ts:78-81` 이 `{success:false}` 반환 + `email_logs` 에 `'failed'` 기록 | **SAFE_DEGRADATION** (거짓 성공 아님) |
| 4 | 템플릿 inline fallback | `mail.service.ts:64` `loadTemplateWithFallback` | 파일 템플릿 없으면 inline 템플릿. 내용은 전달됨 | **SAFE_DEGRADATION** |
| 5 | 콘텐츠 없음 | `mail.service.ts:68` | `{ success:false, error:'No email content provided' }` — 조용히 성공 처리하지 않음 | **SAFE_DEGRADATION** |
| 6 | action queue 링크 fallback | `packages/operator-ux-core/src/blocks/ActionQueueBlock.tsx:138` `to={item.actionUrl || item.link}` | `ActionItem.link` 은 **필수 `string`** (`types.ts:42`) → 두 값이 모두 비는 경우가 타입상 없음 | **ACTIVE_REQUIRED** (하위호환 폴백) |

### §11. production 설정·실적 (read-only)

Cloud Run `o4o-core-api` env **키 이름만** 확인 (값 미출력, 변경 0):

| 키 | 값 |
|---|---|
| `EMAIL_SERVICE_ENABLED` | `true` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` / `SMTP_SECURE` | `587` / `false` |
| `SMTP_USER` / `SMTP_PASS` | 설정됨 (값 미출력) |

→ `NODE_ENV === 'development' && !SMTP_HOST` 조건이 프로덕션에서 성립하지 않는다. **jsonTransport(가짜 전송) 경로는 프로덕션에서 도달 불가.**

`email_logs` 실적:

| status | 건수 | 최초 | 최종 |
|---|---:|---|---|
| `sent` | 82 | 2026-05-18 | 2026-09-03 |
| `failed` | **0** | — | — |

최근 90일 `sent` 37건. `notifications` 108행 (max 2026-08-26). → 메일 전송은 **살아 있는 실사용 경로**이며 실패 누적도 없다.

### §12. 축 C 판정

**`ACTIVE_REQUIRED`**

- notification / mail 전송은 실사용 중이다 (90일 37건, 실패 0).
- fallback 중 **조용히 성공을 위조하는(NOOP_FALSE_SUCCESS) 경로는 없다.** 전송 실패는 `{success:false}` + `email_logs.status='failed'` 로 관측 가능하다.
- dev-only `jsonTransport` 는 프로덕션 env 조건상 도달 불가 — 제거 대상이 아니라 개발 편의 경로다.
- 선행 CHECK 가 지목한 `fallbackUrl` 은 **이미 제거되어 잔재 0건**이다.

본 WO 는 조사 전용이므로 **신규 telemetry 를 추가하지 않았다** (§17 준수).

---

## 축 D. Order / Settlement 잔재

### §13. 상위 계약 확인

CLAUDE.md Priority Chain 3번(`O4O-STORE-COMMERCE-BOUNDARY-V1`) · 3-A(`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`) 를 선행 기준으로 적용했다. **B2B 축(`store_cart_items` → `checkout_orders`, `/api/v1/store/cart/*`)은 보호 대상이며 legacy 판정 대상이 아니다.**

### §14. 테이블 실측 (production, read-only)

| 테이블 | 행수 | 성격 | 판정 |
|---|---:|---|---|
| `checkout_orders` | **23** | B2B canonical 주문 (3-A) | **ACTIVE_B2B** |
| `checkout_order_logs` | 24 | 위 주문 이력 | **ACTIVE_B2B** |
| `checkout_payments` | 1 | B2B 결제 | **ACTIVE_B2B** |
| `store_cart_items` | 0 | B2B cart (3-A 보호 대상) | **ACTIVE_B2B** (0행 = 미보유일 뿐, 잔재 아님) |
| `o4o_payments` | 13 | `sourceService` 별 분포 아래 참조 | **ACTIVE_B2B / 구독** |
| `neture_orders` | 0 | PharmacyHub 결제 → 공급자 접수 bridge | **ACTIVE_B2B** (§15) |
| `neture_settlements` | 0 | 공급자 정산 | **ACTIVE_ACCOUNTING_REFERENCE** (§16) |
| `neture_settlement_orders` | 0 | 정산 ↔ 주문 매핑 | **ACTIVE_ACCOUNTING_REFERENCE** |
| `partner_settlements` | 0 | 파트너 정산 (F7 Freeze) | **ACTIVE_ACCOUNTING_REFERENCE** |
| `partner_settlement_items` | 0 | 〃 | **ACTIVE_ACCOUNTING_REFERENCE** |
| `platform_store_payment_configs` | 0 | 매장 결제 설정 | 미사용 (아래 §17 잔재 후보와 연결) |

`checkout_orders` 분포: `GENERIC/cancelled/pending` 20건 (2026-08-01~08-18), `GENERIC/created/pending` 3건 (2026-06-11~08-09).
`o4o_payments` 분포: `pharmacy-hub` 6 (max 2026-08-18) · `store-service-subscription` 5 (max 2026-06-23) · `neture-b2b` 2 (max 2026-06-12) — 전부 `CREATED`.

→ **소비자(B2C) 결제·주문 데이터는 0건이다.** 모든 실데이터가 B2B 또는 매장 구독 축이다. 3번 문서의 금지선 위반 데이터 없음.

### §15. `neture_orders` 는 잔재가 아니다

행수 0이지만 살아 있는 write/read 경로가 있다:
- `PharmacyHubPaymentController.ts:330,333,377` — 결제 후 공급자 접수 상태 bridge (`UPDATE neture_orders`)
- `PharmacyHubOrderController.ts:173` · `PharmacyHubOperatorFulfillmentController.ts:56` — 상태 조회
- `database/migrations/20260902500000-CreateNetureOrders.ts` — **2026-09-02 신규 생성** 마이그레이션

→ 최근 도입된 B2B bridge 이며, 0행은 아직 트래픽이 없다는 뜻이다. **DEAD 아님.**

### §16. Settlement 은 잔재가 아니다

- 서비스 전체 구현: `neture-settlement.service.ts` — `calculateSettlements`(158) / `cancelSettlement`(251) / `approveSettlement`(392) / `paySettlement`(422) / KPI·상세 조회
- HTTP 라우트 15개: `admin-settlement.controller.ts` — 전부 `requireAuth + adminGuard` 적용 (무방비 0)
- UI 라우트 6개: `/admin/settlements`(App.tsx:1120) · `/admin/partner-settlements`(1122) · `/supplier/settlements`(868) · `/partner/settlements`(958) + redirect 2
- 메뉴 등록: `operatorMenuGroups.ts:81,82,179,180` "정산 관리" · "파트너 정산"
- 정산 산출 소스: `neture_orders` + `neture.neture_order_items` (`WHERE o.status='delivered'`) → **B2B 주문 축에서 파생**. 소비자 commerce 파생 아님
- `partner_settlements` 는 F7 (Neture Partner Contract Freeze) 대상

→ 행수 0은 **아직 정산 실행이 없었다**는 뜻이며, 코드·라우트·메뉴·가드가 모두 정합하다. **DEAD_SETTLEMENT_RESIDUE 아님.**

### §17. 실제로 확인된 소비자 commerce 잔재 1건

| 항목 | 내용 |
|---|---|
| 대상 | `POST /api/v1/stores/:slug/channels/b2c/activate` · `/deactivate` (`routes/platform/store-policy.routes.ts:354,428`) |
| 쓰는 테이블 | `organization_channels` (`channel_type='B2C'` UPSERT → `APPROVED`) |
| 소비처 census (§23 확장) | **정의 파일 자신 외 0건** — 심볼·route 리터럴·`href`·`navigate(`·`<Link`·API URL 리터럴·raw-source 단언 전부 0 |
| production 데이터 | `organization_channels`: `B2C/APPROVED` 1행 (updated 2026-05-15), `KIOSK/APPROVED` 1행 |
| 계약 근거 | `O4O-STORE-COMMERCE-BOUNDARY-V1` — 매장 경영자는 O4O 로 소비자에게 판매하지 않는다. 기존 memory 기록의 "폐기축 = channel_type B2C" 와 일치 |
| 판정 | **RETIRED_CONSUMER_COMMERCE_RESIDUE** → 후속 WO 대상 (본 WO 에서 제거하지 않음) |

### §18. 축 D 판정

**`ACTIVE_REQUIRED`**

order / settlement 도메인의 **본체는 전부 살아 있는 B2B 축**이다 (`checkout_orders` 23행, `o4o_payments` 13행, PharmacyHub bridge, 정산 서비스·라우트·메뉴 정합). 3-A 보호 대상이므로 3번의 소비자 commerce 금지선을 근거로 은퇴시키지 않는다.

축 내부에서 **단 1건**만 소비자 commerce 잔재로 확정됐다 — `channels/b2c` activate/deactivate 엔드포인트 (소비처 0). 이는 축 전체 판정을 바꾸지 않으며 개별 후속 WO 항목으로 분리한다.

---

## §19. 최종 판정표 (4축)

| # | 축 | 판정 | 근거 요약 | 후속 조치 |
|:-:|---|---|---|---|
| 1 | Admin / Operator 승인 중복 | **`LEGACY_RETIRE_READY`** | 동일 service 함수·동일 테이블 / admin UI 메뉴 진입점 0 / admin action_log 실적 supplier 1건(2026-05-28) 외 0 | 후속 WO: admin 측 supplier·product 승인 endpoint + client + 페이지 은퇴. **revoke·governance·operator 경로는 보존** |
| 2 | 권한 진입 중복 | **`DUPLICATED_BUT_INTENTIONAL`** | frontend↔backend 이중 방어는 의도적이며 계약 테스트로 고정 / backend stacking 0 / SSOT(`role_assignments`+`service_memberships`) 정상, legacy 테이블 0 | 제거 금지. 서비스별 `RoleGuard` 4벌 발산은 **공통화 WO** 로 분리 |
| 3 | Notification fallback | **`ACTIVE_REQUIRED`** | 90일 37건 발송·실패 0 / 거짓 성공 경로 없음 / dev jsonTransport 는 프로덕션 도달 불가 / `fallbackUrl` 은 이미 0건 | 없음. telemetry 추가 안 함 |
| 4 | Order / Settlement 잔재 | **`ACTIVE_REQUIRED`** | `checkout_orders` 23 · `o4o_payments` 13 (전부 B2B/구독) / 정산은 서비스·라우트·메뉴·가드 정합 / 소비자 결제 데이터 0 | 후속 WO 1건: `channels/b2c` activate·deactivate (소비처 0, RETIRED_CONSUMER_COMMERCE_RESIDUE) |

**UNKNOWN = 0 / UNJUDGED = 0.**

---

## §20. 후속 WO 제안 (본 WO 에서 실행하지 않음)

| # | 제안 WO | 범위 |
|:-:|---|---|
| 1 | Neture admin 승인 표면 은퇴 | `admin.controller.ts` supplier/product approve·reject·batch, `adminSupplierApi`·`adminProductApi` 승인 함수, `AdminProductApprovalPage`, admin-dashboard `SupplierListPage` + `/neture/suppliers` route |
| 2 | service-approval 읽기 테이블 정합 | admin(`product_approvals`) ↔ operator(`offer_service_approvals`) 이중 읽기 축 정리 |
| 3 | 서비스별 `RoleGuard` 공통화 | 4벌(43/76/92/180 라인) → 공통 패키지 수렴 |
| 4 | `channels/b2c` 잔재 은퇴 | `store-policy.routes.ts:354,428` + `organization_channels` B2C 1행 처리 판단 |

선행 CHECK 의 DEFERRED 2건(`store_events` · `organization_product_applications` 테이블 DROP, `packages/cosmetics-seller-extension` 의 `@o4o/ui` 미선언 dependency)은 본 WO 범위 밖이므로 그대로 유지한다.

---

## §21. 준수 확인

| 항목 | 결과 |
|---|---|
| runtime 수정 | **0** |
| route 수정 | **0** |
| dependency 수정 | **0** |
| DB write (INSERT/UPDATE/DELETE/ALTER/DROP) | **0** |
| migration | **0** |
| production config 변경 | **0** (env 는 키 이름·비민감 값만 read) |
| 자격증명 노출 | **0** (secret 값 본문·로그 미기록) |
| 변경 파일 | 본 CHECK 1개 |
| 공유 worktree 접촉 | **0** (격리 worktree 사용) |

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건
