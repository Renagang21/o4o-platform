# IR-O4O-PHARMACY-HUB-COMMON-CORE-ADOPTION-SCOPE-V1

> **WO**: `WO-O4O-PHARMACY-HUB-COMMON-CORE-ADOPTION-SCOPE-V1`
> **성격**: read-only 조사 — 코드/package/route/DB/배포 **무변경**. 문서만 생성.
> **기준 commit**: `9efba8fcaacc061c178641710fffc02d5b62c57c` (main, 조사 시작) — 조사 중 병렬 세션이 `dd792c64e` 로 전진했으나 조사 범위 무관 (§1.1)
> **작성일**: 2026-08-03
> **선행 문서**: [`O4O-COMMONIZATION-STANDARD` V2.1 §3.3](../architecture/O4O-COMMONIZATION-STANDARD.md) · [`IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1` §14·§19-2](IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1.md) · [`IR-O4O-OPERATOR-CORE-CANONICAL-ROLE-AND-MODULAR-COMPOSITION-AUDIT-V1` §8·§15-1](IR-O4O-OPERATOR-CORE-CANONICAL-ROLE-AND-MODULAR-COMPOSITION-AUDIT-V1.md)
>
> **결론(요약)**: PharmacyHub 26 파일 3,745 L 을 **10 화면군 · 화면 21건** 으로 분해해 판정했다. 전체의 약 **35% 는 기반 3종(types/ui/error-handling) 채택만으로 정리 가능**하고, **약 45% 는 서비스 고유 업무(B2B 주문·결제·거래조건·전용 membership·공급자 제공설정)로 유지**하며, **회원관리 1건만이 공통 계약의 additive 확장을 요구**한다. 나머지는 layout/primitive 수준 채택 또는 NOT_APPLICABLE 이다.
>
> **선행 판정 대비 delta 3건** — ① `operator-ux-core` `ServiceKey` union 은 adoption 의 **차단 요인이 아니다**(Neture 가 53 import 중 `ServiceConfig` 0 소비로 실증, §10.4). ② members 모듈은 `active`/`approved` **이중 상태 어휘를 이미 수용**한다(§11.2). ③ 선행 IR 이 잡지 못한 **반려 사유 필수 gap 과 suspend/restore 미지원 action 노출 gap 2건**이 실재한다(§11.4) — 이 2건이 `CORE_CONTRACT_EXPANSION_REQUIRED` 판정을 유지시키는 실제 사유다.

---

## 1. 기준 commit 과 작업 상태

| 항목 | 값 |
|------|-----|
| repo | `https://github.com/Renagang21/o4o-platform` |
| branch | `main` |
| **조사 기준 HEAD (조사 시작)** | `9efba8fcaacc061c178641710fffc02d5b62c57c` |
| **커밋 시점 HEAD (조사 종료)** | `dd792c64ea2cb553f0a28b8cbcf8b169e6128241` |
| working tree | **clean 아님** — 조사 시작 시 `otc-zh-batch01-verify.ga.json` 1건 modified. 종료 시 병렬 세션 WIP 4건 추가(`hff-zh-b01-build.mjs` M · `hff-zh-b02-*` untracked 3) |
| 해당 변경 처리 | **전부 무접촉** — 병렬 세션 소유. 수정·삭제·stash·revert·stage 하지 않음. 본 IR 은 path-specific commit 으로만 기록 |
| `git pull --ff-only origin main` | **미실행** — 작업 트리가 clean 이 아니므로 WO §5 에 따라 생략 |
| 경로 충돌 | 없음 — 본 IR 문서 경로(`docs/investigations/IR-O4O-PHARMACY-HUB-...`)는 WIP 파일과 무관 |
| `pnpm install` / 전체 build | **미실행** (WO §5) |

### 1.1 조사 중 기준 commit 이동 (사실 기록)

조사 진행 중 병렬 세션이 `main` 을 `9efba8fca → dd792c64e` 로 2 commit 전진시켰다.

| commit | 내용 | 본 조사 범위 침범 |
|--------|------|:---:|
| `9e7cfb710` | `docs(check)` — Screen Set corner content E2E smoke 기록 | **없음** (docs) |
| `dd792c64e` | `fix(membership)` — `apps/api-server/src/bootstrap/membership-admin-guard.ts` + 테스트 2 | **없음** — `packages/operator-core-ui/**` · `services/web-pharmacy-hub/**` · `apps/api-server/src/**/pharmacy-hub/**` 무관 |

> **판정**: 본 IR 의 모든 실측(파일 수·LOC·import 수·계약 gap·endpoint 대조)은 **`9efba8fca` 기준으로 수행**되었고, 두 commit 중 어느 것도 조사 대상 경로를 건드리지 않았으므로 **`dd792c64e` 에서도 그대로 유효하다.** 재실측 불필요.

**사용 명령**: `git status/branch/rev-parse/remote/log/show`, 파일 열거·읽기, ripgrep 검색, `wc -l`, `node -e`(package.json 파싱)만.

---

## 2. 조사 범위와 제외 범위

### 2.1 포함

```
services/web-pharmacy-hub/**                    (26 파일 · 3,745 L — 전수)
apps/api-server/src/controllers/pharmacy-hub/*  (9 파일)
apps/api-server/src/routes/pharmacy-hub/*       (1 파일)
apps/api-server/src/services/pharmacy-hub/*     (2 파일)
apps/api-server/src/services/cart/pharmacy-hub-cart-checkout.service.ts (+ 테스트 1)
apps/api-server/src/middleware/pharmacy-hub-scope.middleware.ts
apps/api-server/src/database/migrations/2027021{6,7,8}*.ts (3 파일)
apps/api-server/src/config/service-catalog.ts (pharmacy-hub 엔트리)
.github/workflows/deploy-web-services.yml (pharmacy-hub job)
```

비교 기준(읽기 전용): `packages/{operator-core-ui,operator-ux-core,ui,error-handling,account-ui,shared-space-ui,store-ui-core,store-products-ui,types}` 및 KPA/K-Cos/Neture 의 소비 형태.

### 2.2 제외

| 대상 | 사유 |
|------|------|
| **GlycoPharm 전 영역** | `O4O-COMMONIZATION-STANDARD` §3.4 `historical out-of-scope`. 기능 비교·route parity·판정 근거 사용 **모두 하지 않음** |
| `apps/api-server/src/routes/glycopharm/**`, `routes/signage/extensions/pharmacy/**`, `routes/o4o-store/controllers/pharmacy-*.ts`, `routes/kpa/entities/kpa-pharmacy-request.entity.ts` | 파일명에 `pharmacy` 가 들어가지만 **GlycoPharm / KPA / Signage 도메인**이며 PharmacyHub 서비스와 무관. 인벤토리에서 제외 |
| 병렬 세션 WIP 파일 | §1 |
| `@o4o/operator-core` 은퇴 | 축 C — 본 IR(축 B)과 분리(`O4O-COMMONIZATION-STANDARD` §0.4) |

> **명명 함정 (신규 기록)**: `apps/api-server/src/**` 에서 `*pharmacy*` 로 검색하면 **58 파일**이 잡히지만, 그중 PharmacyHub 서비스에 속하는 것은 **17 파일**뿐이다. 나머지는 GlycoPharm 약국 도메인 · KPA 약국 요청 · Signage 약국 extension · o4o-store 약국 정보다. 후속 WO 가 `grep pharmacy` 로 범위를 잡으면 **out-of-scope 를 침범한다.**

---

## 3. PharmacyHub 구조 요약

### 3.1 규모

| 축 | 파일 | LOC |
|----|-----:|----:|
| Frontend `services/web-pharmacy-hub/src` | 26 | 3,745 |
| Backend controller | 9 | 2,180 |
| Backend route | 1 | 269 |
| Backend service (pharmacy-hub + cart) | 3 | 602 |
| Backend middleware | 1 | 59 |
| Backend migration | 3 | 183 |
| **합계(테스트 제외)** | **43** | **7,038** |

> 선행 IR(`3a9dde01`)은 frontend 25 파일 / 약 3,700 L 로 기록했다. 현재 **26 파일 / 3,745 L** — 그 사이 `lib/api/pharmacyHubOrders.ts`(257 L) 계열 결제 UI 가 추가되었다. **선행 IR 의 규모 기재는 아직 유효한 범위**이며 판정에 영향 없다.

### 3.2 현재 공통 패키지 채택 (실측, HEAD `9efba8fca`)

```
grep -rn "from '@o4o/" services/web-pharmacy-hub/src
→ @o4o/auth-client   2 (lib/apiClient.ts, contexts/AuthContext.tsx)
→ @o4o/auth-utils    5 (contexts/AuthContext.tsx ×1, lib/membershipGate.ts ×4 — import 2 + re-export 2)
→ 그 외 공통 패키지  0
```

`package.json` dependency 도 정확히 이 2개뿐이다(+ react / react-dom / react-router-dom). **dependency ≠ adoption 불일치 없음** — 선언과 실제 소비가 일치하는 유일한 서비스다.

### 3.3 데이터 원장 (F12 · CLAUDE.md §4·§5 정합)

backend 가 실제로 접근하는 테이블 전수:

```
users · service_memberships · organizations
product_masters · product_identifiers · product_images · product_categories
supplier_product_offers · offer_service_prices
neture_suppliers · neture_orders
store_cart_items · checkout_orders
```

**PharmacyHub 전용 사본 테이블 0.** `*_orders` / `*_payments` 신설 0. 주문은 `checkout_orders` + `pharmacy-hub-cart-checkout.service.ts` 경유. → CLAUDE.md §4 금지 테이블 규칙 준수. **이 사실은 데이터 축의 공통화가 이미 완료되어 있고, 남은 gap 이 순수하게 UI/화면 축임을 뜻한다.**

### 3.4 인프라 상태

| 항목 | 실측 |
|------|------|
| Cloud Run 배포 | **연결됨** — `deploy-web-services.yml` 에 `deploy-pharmacy-hub` job + `detect-changes` 경로 필터 + `pharmacy-hub-web` 이미지 |
| Dockerfile 주석 | **stale** — "배포 연결은 하지 않았다: deploy-web-services.yml 미변경" 이라 적혀 있으나 실제로는 연결되어 있다(사실만 기록, 수정 안 함) |
| Dockerfile 이 이미 빌드하는 패키지 | `@o4o/types` · `@o4o/auth-utils` · `@o4o/auth-client` — **`@o4o/types` 는 dependency 선언이 없는데도 COPY + build 가 이미 있다**(auth 패키지의 전이 의존) |
| package name | `pharmacy-hub-web` — `@o4o/` scope 밖 (선행 IR R6, 미해결. 본 IR 범위 밖) |
| tailwind content | `['./index.html','./src/**/*']` — **공통 패키지 src 경로 없음** |

> **adoption 비용 관련 핵심 사실 2건**
> 1. `@o4o/types` 채택은 **Dockerfile 변경 0** 이다(이미 COPY·build 됨). 기반 3종 중 가장 싼 진입점.
> 2. 그 외 패키지(`ui`/`error-handling`/…)는 채택 시 **Dockerfile 2줄(package.json COPY + source COPY) + build 1줄 + tailwind content glob 1줄**이 필요하다. `IR-...-OPERATOR-CORE-...-AUDIT-V1 §4.2` 가 경고한 "4곳 참조" 구조가 **역방향(추가)으로도 동일하게 적용**된다.

---

## 4. 역할 · route · 화면 inventory

### 4.1 역할 축

| 역할 | 판정 근거 | 프론트 gate | 백엔드 guard |
|------|----------|------------|-------------|
| **Public / Unauthenticated** | route 무 gate | 없음 | 없음 (`/join`, `/service-info`) |
| **Applicant** (신청자) | membership `pending`/`rejected` | `MembershipGate` 차단 + 상태 안내 | `requireAuth` (`/join/status`) |
| **Store Owner (약국 경영자)** | role `pharmacy-hub:store_owner` | `MembershipGate`(가입 상태만) | `requirePharmacyHubScope('pharmacy-hub:store_owner')` |
| **Supplier (공급자)** | role `pharmacy-hub:supplier` | 〃 | 위 + `createRequireActiveSupplier` (Neture 공급자 원장 ACTIVE) — **3중 guard** |
| **Operator (서비스 운영자)** | role `pharmacy-hub:operator` | 〃 | `requirePharmacyHubScope('pharmacy-hub:operator')` |
| **Platform super_admin** | `isPlatformSuperAdmin` | `MembershipGate` 무조건 통과 | `platformBypass: true` |
| **Shared Account** | 해당 없음 | — | — |

> **구조적 사실**: 프론트 `MembershipGate` 는 **가입 상태(active)만** 검사하고 **역할은 검사하지 않는다.** 역할 판정은 전적으로 backend guard 다(`App.tsx:21-22` 주석이 이를 명시). 즉 `/operator/memberships` 에 store_owner 가 URL 로 진입하면 화면은 뜨고 API 가 403 을 반환한다. 이는 `IR-...-OPERATOR-CORE-...-AUDIT-V1 §9.2-1` 이 기존 3서비스에서 지적한 "route 는 capability 를 모른다" 와 **같은 클래스의 구조**다 — PharmacyHub 고유 결함이 아니다.

### 4.2 화면 · route · endpoint 매트릭스 (전수 21건)

| # | 화면/기능 | frontend 경로 | route | backend endpoint | 주요 데이터 | 역할 |
|--:|-----------|--------------|-------|------------------|-----------|------|
| 1 | 홈 | `pages/HomePage.tsx` (77) | `/` | — (로컬 config) | `BRAND`·membership status | Public |
| 2 | 로그인 | `pages/LoginPage.tsx` (100) | `/login` | `POST /auth/login`(authClient) | user·token | Public |
| 3 | 가입 신청 | `pages/JoinPage.tsx` (222) | `/join` | `POST /pharmacy-hub/join` | roleType·프로필 | Public |
| 4 | 가입 상태 | `pages/JoinStatusPage.tsx` (170) | `/join/status` | `GET /pharmacy-hub/join/status` | membership status | Applicant |
| 5 | 역할 진입점 셸 | `pages/RoleEntryPage.tsx` (80) | `/store-owner`·`/supplier`·`/operator` | — (JWT roles) | roles | 3역할 |
| 6 | 회원 승인 목록 | `pages/operator/MembershipsPage.tsx` (268) | `/operator/memberships` | `GET /pharmacy-hub/operator/memberships` | membership+user JOIN | Operator |
| 7 | 회원 승인 상세 | `pages/operator/MembershipDetailPage.tsx` (196) | `/operator/memberships/:id` | `GET .../:id` · `PATCH .../approve` · `PATCH .../reject` | membership+`businessInfo` | Operator |
| 8 | 공급자 상품 제공설정 | `pages/supplier/ProductsPage.tsx` (311) | `/supplier/products` | `GET /supplier/products` · `PATCH /supplier/products/:offerId/delivery` | `supplier_product_offers`·`offer_service_prices` | Supplier |
| 9 | 공급 상품 목록 | `pages/store-owner/ProductsPage.tsx` (251) | `/store-owner/products` | `GET /store-owner/products` | offer+master JOIN | Store Owner |
| 10 | 공급 상품 상세 | `pages/store-owner/ProductDetailPage.tsx` (247) | `/store-owner/products/:offerId` | `GET .../:offerId` · `POST /cart/items` | offer 상세·identifiers | Store Owner |
| 11 | 장바구니 | `pages/store-owner/CartPage.tsx` (289) | `/store-owner/cart` | `GET/POST/PATCH/DELETE .../cart[/items]` · `POST .../orders` | `store_cart_items` | Store Owner |
| 12 | 주문 목록 | `pages/store-owner/OrdersPage.tsx` (151) | `/store-owner/orders` | `GET .../orders` | `checkout_orders` | Store Owner |
| 13 | 주문 상세 | `pages/store-owner/OrderDetailPage.tsx` (197) | `/store-owner/orders/:orderId` | `GET .../orders/:id` · `POST .../orders/:id/cancel` | 주문+`neture_orders` fulfillment | Store Owner |
| 14 | 결제 | `pages/store-owner/PaymentPage.tsx` (198) | `/store-owner/payment` | `POST .../payments/prepare` | paymentGroup·금액 | Store Owner |
| 15 | 결제 성공 | `pages/store-owner/PaymentSuccessPage.tsx` (106) | `/store-owner/payment/success` | `POST .../payments/confirm` | 승인 결과 | Store Owner |
| 16 | 결제 실패 | `pages/store-owner/PaymentFailPage.tsx` (60) | `/store-owner/payment/fail` | — (query param) | Toss 코드 | Store Owner |
| 17 | 멤버십 게이트 | `components/MembershipGate.tsx` (95) | (전 route wrap) | — (JWT memberships) | status 6값 | 공통 |
| 18 | 인증 컨텍스트 | `contexts/AuthContext.tsx` (113) | — | `GET /auth/me` | user·roles·memberships | 공통 |
| 19 | 주문/결제 API 클라이언트 | `lib/api/pharmacyHubOrders.ts` (257) | — | store-owner 12 endpoint | — | 공통 |
| 20 | 서비스 identity | `config/service.ts` (39) | — | — | SERVICE_KEY·BRAND·ROLES | 공통 |
| 21 | apiClient / membershipGate | `lib/apiClient.ts` (20) · `lib/membershipGate.ts` (37) | — | — | — | 공통 |

### 4.3 화면 없는 backend endpoint (7건) — **adoption gap 아님**

| endpoint | 역할 | 상태 |
|----------|------|------|
| `GET /pharmacy-hub/service-info` | Public | **소비 0** — 프론트가 `config/service.ts` 로컬 상수를 쓴다 |
| `GET /pharmacy-hub/me/access` | auth | **소비 0** — 프론트가 JWT memberships 를 `@o4o/auth-utils` 로 직접 읽는다 |
| `GET/POST /pharmacy-hub/supplier/orders[/:id][/accept][/ship]` (4) | Supplier | **화면 미구현** — 공급자 주문 처리 UI 없음 |
| `POST /store-owner/payments/:paymentGroupId/cancel` | Store Owner | **호출 0** — 결제 후 취소 UI·클라이언트 함수 없음 |
| `GET /operator/fulfillment/stuck` · `POST /operator/fulfillment/:orderId/recover` (2) | Operator | **화면 미구현** — fulfillment 복구 콘솔 없음 |
| `GET .../{operator\|store-owner\|supplier}/ping` (3) | 각 scope | Foundation 진단용 |

> **판정 원칙 (WO §18)**: 위는 **"공통 core 를 안 썼다"가 아니라 "화면이 아직 없다"** 이다. adoption gap 집계에 넣지 않는다. 다만 `service-info` · `me/access` 2건은 프론트가 같은 정보를 다른 경로로 얻고 있어 `O4O-COMMONIZATION-STANDARD` §8 dead code 기준("등록만 되고 호출 없는 엔드포인트")에 해당한다 — **정리 여부는 별도 판단**이며 본 IR 은 제거를 지시하지 않는다.

---

## 5. 화면군 분류 (10군)

| 화면군 | 파일 수 | LOC | 주요 route | 주요 업무 | 현재 공통 패키지 | 고유성 |
|--------|------:|----:|-----------|----------|-----------------|--------|
| **P1 Public / Home** | 1 | 77 | `/` | 브랜드·역할 진입점 3 | 없음 | 낮음 |
| **P2 Auth / Join** | 3 | 322 | `/login` `/join` | 로그인·역할선택 가입폼 | `auth-client`·`auth-utils` (로그인만) | **중** (역할별 분기 폼) |
| **P3 Join Status / Role Entry** | 2 | 250 | `/join/status` `/{role}` | 상태 6값 안내·역할 진입 | `auth-utils`(gate) | **중** (membership 상태축) |
| **P4 Operator** | 2 | 464 | `/operator/memberships[/:id]` | 가입 승인·반려 | 없음 | **중** (승인 전용 콘솔) |
| **P5 Store Owner** | 0 전용 | — | `/store-owner` | 역할 홈 = P3 공용 셸 | 없음 | — |
| **P6 Supplier** | 1 | 311 | `/supplier/products` | Hub 제공 on/off + 서비스 공급가 | 없음 | **높음** (serviceKeys opt-in 축) |
| **P7 Product / Offer** | 2 | 498 | `/store-owner/products[/:id]` | 목록·필터·상세·담기 | 없음 | 낮음~중 |
| **P8 Order / Payment / Transaction** | 6 + 1 lib | 1,258 | `/store-owner/{cart,orders,payment}*` | B2B 장바구니·다공급자 1회결제·전달 | 없음 | **매우 높음** |
| **P9 Account / Notification** | 0 | 0 | — | **화면 자체 없음** | — | — |
| **P10 Common Error / Loading / Empty / Confirm** | (전 화면 인라인) | ≈ 350 산재 | — | 로딩·에러·빈상태·confirm | 없음 | 없음 |
| 공통 인프라 (P1~P10 횡단) | 5 | 465 | — | Auth·gate·apiClient·config·orders client | `auth-client`·`auth-utils` | 낮음 |

**관찰 3건**

1. **P5 Store Owner 전용 화면은 존재하지 않는다.** `/store-owner` 는 P3 의 `RoleEntryPage` 를 props 로 재사용한다. store-owner 의 실제 업무는 전부 P7(상품)·P8(주문)에 있다. → **`@o4o/store-ui-core` 가 대응할 "매장 대시보드" 자체가 없다** (§12).
2. **P9 Account / Notification 은 화면이 0 이다.** 내 정보·비밀번호·알림 화면이 없다. → `@o4o/account-ui` 는 **adoption gap 이 아니라 기능 미구현**이다. 선행 IR §14 가 "account-ui gap = JoinPage/JoinStatusPage/RoleEntryPage" 로 기재한 것은 화면 대응이 부정확하다(§18.1).
3. **P8 이 전체 LOC 의 34%** 로 최대 화면군이며, 동시에 `O4O-COMMONIZATION-STANDARD` §3.3 ③ 이 이미 `서비스 고유 유지` 로 분류한 영역이다.

---

## 6. 공통 패키지 대응 매트릭스

| package/core | 대응 PharmacyHub 화면 | 현재 계약 적합성 | 필요한 adapter/config | extension 필요 | 판정 |
|--------------|----------------------|-----------------|----------------------|---------------|------|
| `@o4o/types` | 전역 (P1~P8 로컬 interface 20+) | **적합** — union 아님, 신규 서비스 수용 | 없음 (Dockerfile 이미 준비됨) | 도메인 타입은 로컬 유지 | **ADOPT_TYPES_ONLY** (부분) |
| `@o4o/ui` | P1~P8 전 화면 primitive | **적합** — `Button`/`Input`/`Select`/`Textarea`/`Badge`/`Card`/`Alert`/`Tabs`/`BaseTable`/`Skeleton`/`Dialog`/`ConfirmActionDialog` 실재 | 없음 | 없음 | **ADOPT_PRIMITIVE** |
| `@o4o/error-handling` | P10 + 전 API 호출 (13개소) | **적합** — `parseApiError`·`O4OToastProvider`·`O4OErrorBoundary`·`useApiErrorHandler`·`toast` | 없음 | 없음 | **ADOPT_ERROR_CONTRACT** |
| `@o4o/account-ui` | **대응 화면 없음** (P9 = 0) | 판정 불가 | — | — | **NOT_APPLICABLE** (기능 도입 시 재판정) |
| `@o4o/shared-space-ui` | P1 HomePage (`StandardHomeTemplate` 후보) | **부분** — Template 은 Hub 6종 + Home 1종. PharmacyHub 는 forum/content/resources/lms/store-hub/signage **도메인이 없다** | Home config | — | **ADOPT_TEMPLATE** (P1 한정) / 나머지 **NOT_APPLICABLE** |
| `@o4o/operator-ux-core` | P4 (셸·DataTable·Pagination·SearchBar·Form) | **적합** — `ServiceKey` union 은 소비하지 않으면 무관(§10.4) | `DomainIASidebar` 용 domain IA config | — | **ADOPT_LAYOUT_ONLY** + **ADOPT_PRIMITIVE** |
| `@o4o/operator-core-ui` `modules/members` | P4 회원 승인 콘솔 | **부적합** — 필수 prop 3 + 필수 client 메서드 5 + 반려사유 UI 부재 (§11) | `MembersConsoleClient` adapter | reject reason slot | **CORE_CONTRACT_EXPANSION_REQUIRED** |
| `@o4o/operator-core-ui` 나머지 18 모듈 | 대응 화면 없음 | — | — | — | **NOT_APPLICABLE** |
| `@o4o/admin-ux-core` | admin 영역 자체 없음 | — | — | — | **NOT_APPLICABLE** |
| `@o4o/store-ui-core` | **대응 화면 없음** (매장 대시보드 0) | 판정 불가 | — | — | **NOT_APPLICABLE** (§12) |
| `@o4o/store-products-ui` | P7 상품 목록/상세 | **미확정** — B2C 매장 상품 축 vs B2B 공급 offer 축. `configureStoreProductsApi()` DI 는 적용 가능하나 데이터 의미가 다름 | api 주입 | — | **INSUFFICIENT_EVIDENCE** (§14) |
| `@o4o/content-editor` | 콘텐츠 저작 화면 없음 | — | — | — | **NOT_APPLICABLE** |
| `@o4o/forum-core` | 커뮤니티 화면 없음 | — | — | — | **NOT_APPLICABLE** (`RoleEntryPage` 에 "후속 예정"으로만 기재) |
| `@o4o/tablet-kiosk-core` · `@o4o/tablet-screen-set-editor` | 태블릿 화면 없음 | — | — | — | **NOT_APPLICABLE** |

> **판정 규칙 준수 확인 (WO §8 주의)**: 위 표에서 `NOT_APPLICABLE` 7건은 전부 **"PharmacyHub 에 해당 업무 화면이 존재하지 않는다"** 는 사실에 근거한다. "다른 서비스가 쓰니까 필요하다"로 뒤집지 않았다. 반대로 `ADOPT_*` 6건은 전부 **현재 화면에 대응물이 실재**하는 경우만이다.

---

## 7. 화면별 adoption 판정 (전수 21건)

| 화면/route | 현재 구현 | 대응 core | 판정 | 근거 | 선행 작업 | 위험 |
|-----------|----------|----------|------|------|----------|------|
| `/` HomePage | 자체 77 L (Link 카드 3) | `shared-space-ui` `StandardHomeTemplate` | **ADOPT_TEMPLATE** + `ADOPT_PRIMITIVE` | Home 은 서비스 정체성 영역이나 Template 은 config 로 흡수 가능(`STANDARD` §4.1·§5) | shared-space-ui Dockerfile/tailwind 추가 | 낮음 (읽기 전용 화면) |
| `/login` LoginPage | 자체 폼 100 L | `@o4o/ui` Input/Button + `error-handling` | **ADOPT_PRIMITIVE** + **ADOPT_ERROR_CONTRACT** | 인증 로직은 이미 공통(`auth-client`). 남은 건 폼 UI·에러 표면뿐 | B1 | 낮음 |
| `/join` JoinPage | 자체 역할선택 + 조건부 폼 222 L | `@o4o/ui` primitive | **ADOPT_PRIMITIVE** · 폼 구조는 **KEEP_BESPOKE** | 역할별 분기 필드(약국명 vs 회사명+담당자)는 서비스 고유 가입 정책 | B1 | 낮음 |
| `/join/status` JoinStatusPage | 자체 상태 6값 카드 170 L | `@o4o/ui` Badge/Card + `error-handling` | **ADOPT_PRIMITIVE** + **ADOPT_ERROR_CONTRACT** · 상태축은 **SERVICE_EXTENSION_REQUIRED** | `service_memberships.status` 6값 ↔ 다음 행동 매핑은 PharmacyHub 가입 정책 | B1 | 낮음 |
| `/{store-owner,supplier,operator}` RoleEntryPage | 자체 공용 셸 80 L | — | **KEEP_BESPOKE** | 3역할 공용 진입 셸. 대응 core 없음(operator-ux-core 는 operator 전용 셸) | — | — |
| `components/MembershipGate` | 자체 95 L | — | **KEEP_BESPOKE** | 공통 판정 로직은 이미 `@o4o/auth-utils` 위임. 남은 건 안내 UI | (primitive 만 B1) | — |
| `contexts/AuthContext` | 자체 113 L | `@o4o/auth-context`(서비스 소비 0) | **INSUFFICIENT_EVIDENCE** | 4서비스 전부 자체 보유 — 선행 IR R4/R5 미확정 축. PharmacyHub 단독 판단 불가 | `IR-...-AUTH-CONTEXT-CANONICAL-POSITION-V1` | 중 (인증 축) |
| `/operator/memberships` 목록 | 자체 table 268 L + `window.confirm/prompt` | `operator-core-ui/modules/members` + `operator-ux-core` | **CORE_CONTRACT_EXPANSION_REQUIRED** (+ `ADOPT_LAYOUT_ONLY` 선행 가능) | §11 | B3 계약 완화 | **중~높음** (기존 3서비스 회귀) |
| `/operator/memberships/:id` 상세 | 자체 dl 196 L | 위 모듈의 drawer | **CORE_CONTRACT_EXPANSION_REQUIRED** | 별도 route 상세 ↔ 모듈은 drawer 방식. `drawerExtraSections` 로 수용 가능하나 route 소멸 | B3 | 중 |
| (운영자 영역 셸) | **없음** | `operator-ux-core` `OperatorAreaShell` + `DomainIASidebar` | **ADOPT_LAYOUT_ONLY** | 현재 운영자 화면에 사이드바·대시보드가 전혀 없다 | domain IA config 신설 | 낮음 (신규 추가) |
| (운영자 5-Block 대시보드) | **없음** | `operator-ux-core` `OperatorDashboardLayout` | **NOT_APPLICABLE** (현 시점) | CLAUDE.md §11-2 는 대시보드 도입 시 5-Block 강제. **화면이 없으므로 gap 아님** | 대시보드 신설 WO 시 적용 | — |
| `/supplier/products` | 자체 table + 인라인 가격 편집 311 L | `operator-ux-core` list primitive | **ADOPT_PRIMITIVE** · 업무는 **SERVICE_EXTENSION_REQUIRED** | `serviceKeys` opt-in + `offer_service_prices` 서비스별 공급가는 PharmacyHub↔Neture 계약 고유 | B1 | 중 |
| `/store-owner/products` 목록 | 자체 table 251 L | `ui` BaseTable / `store-products-ui` | **ADOPT_PRIMITIVE** · store-products-ui 는 **INSUFFICIENT_EVIDENCE** | 규제유형 탭(DRUG/HFF/QUASI/COSMETIC/GENERAL)은 약국 맥락 고유 | B1 → B7 조사 | 중 |
| `/store-owner/products/:offerId` 상세 | 자체 247 L + `dangerouslySetInnerHTML` ×2 | `ui` + `content-editor` `ContentRenderer` | **ADOPT_PRIMITIVE**; 본문 렌더는 **INSUFFICIENT_EVIDENCE** | 공급자 HTML 설명을 sanitize 없이 주입 — `ContentRenderer` 대응 가능성 미확인 | 별도 조사 | **중** (XSS 표면) |
| `/store-owner/cart` | 자체 289 L | `ui` primitive | **ADOPT_PRIMITIVE** · 업무 **KEEP_BESPOKE** | 다공급자 그룹 + 서버권위 금액 + 1회 결제 = 서비스 고유 | B1 | 중 |
| `/store-owner/orders` 목록 | 자체 151 L | `ui` + `store-ui-core` `BuyerOrderStatusBadge` | **ADOPT_PRIMITIVE** · 상태 라벨은 **INSUFFICIENT_EVIDENCE** | `store-ui-core` 에 `buyerCheckoutStatus`·`BuyerOrderStatusBadge` 실재하나 PharmacyHub 는 `supplierNotified` 축이 추가됨 | B1 → 조사 | 중 |
| `/store-owner/orders/:orderId` 상세 | 자체 197 L + `window.confirm` | `ui` `ConfirmActionDialog` | **ADOPT_PRIMITIVE** · 업무 **KEEP_BESPOKE** | 결제 전 취소 / 409 ALREADY_PAID 계약은 고유 | B1 | 낮음 |
| `/store-owner/payment` | 자체 198 L + Toss CDN 로더 | — | **KEEP_BESPOKE** | PG 연동·paymentGroup 1회결제 = `DO_NOT_UNIFY`(선행 IR §10) | — | — |
| `/store-owner/payment/success` | 자체 106 L | — | **KEEP_BESPOKE** | confirm 멱등·중복승인 방지 로직 고유 | — | — |
| `/store-owner/payment/fail` | 자체 60 L | — | **KEEP_BESPOKE** | Toss 실패코드 매핑 고유 | — | — |
| `lib/api/pharmacyHubOrders.ts` | 자체 257 L | — | **SERVICE_EXTENSION_REQUIRED** | 서비스 API 계약. 공통화 대상 아님 | — | — |
| `lib/apiClient.ts` · `lib/membershipGate.ts` · `config/service.ts` | 96 L 합계 | (이미 공통 경유) | **KEEP_BESPOKE** (정상 형태) | 선행 IR §10.2 — "별도 구현이 아니라 부팅 config" | — | — |
| P10 로딩/에러/빈상태/confirm (전 화면 인라인) | 문자열·`window.confirm` ×3 | `error-handling` + `ui` `ConfirmActionDialog` | **ADOPT_ERROR_CONTRACT** | §8.3 | B1 | 낮음 |

### 7.1 판정 집계

| 판정 | 건수 | LOC 비중(개략) |
|------|-----:|:---:|
| `ADOPT_PRIMITIVE` (단독 또는 병기) | 12 | ≈ 45% |
| `ADOPT_ERROR_CONTRACT` | 4 (+전 화면 횡단) | ≈ 10% |
| `ADOPT_TYPES_ONLY` | 전역 1 | — |
| `ADOPT_TEMPLATE` | 1 (P1) | 2% |
| `ADOPT_LAYOUT_ONLY` | 2 (P4 + 신설 셸) | 12% |
| `CORE_CONTRACT_EXPANSION_REQUIRED` | 2 (P4 목록·상세) | 12% |
| `SERVICE_EXTENSION_REQUIRED` | 3 | 15% |
| `KEEP_BESPOKE` | 9 | ≈ 35% |
| `INSUFFICIENT_EVIDENCE` | 5 | — |
| `NOT_APPLICABLE` (패키지 축) | 7 | — |

> 합계가 100% 를 넘는 것은 **한 화면이 복수 판정을 받기 때문**이다(예: CartPage = `ADOPT_PRIMITIVE`(UI) + `KEEP_BESPOKE`(업무)). WO §9 가 "하나 이상"을 허용한 대로다.

---

## 8. 기반 4종 — types / ui / error-handling / confirm

### 8.1 E1. `@o4o/types`

로컬 정의된 도메인 interface 실측:

| 로컬 타입 | 위치 | canonical 후보 | 판정 |
|----------|------|---------------|------|
| `Pagination` (page/limit/total/totalPages) | 5개 파일에 **중복 정의 5회** | `operator-core-ui` `PaginationData` / `operator-ux-core` `normalizePaginatedResponse` | **DIRECT_ADOPTION** |
| `PharmacyHubUser extends UserLike` | `contexts/AuthContext.tsx` | `@o4o/auth-utils` `UserLike` (이미 확장 중) | **현행 유지 — 정상** |
| `MembershipRow` / `MembershipDetail` | operator 2 파일 | `operator-core-ui` `UserData`/`MembershipData` | **ADAPTER_TYPE_REQUIRED** (§11.3) |
| `OfferRow` / `ProductRow` / `ProductDetail` / `Identifier` | supplier·store-owner 3 파일 | `@o4o/types` 상품 축 | **INSUFFICIENT_EVIDENCE** — offer 축 canonical 타입 대응 미확인 |
| `CartItem`/`CartGroup`/`CartResponse`/`CreatedOrder`/`OrderListItem`/`OrderDetail`/`PreparePaymentResult`/`ConfirmPaymentResult`/`FailedItem` (9) | `lib/api/pharmacyHubOrders.ts` | — | **PHARMACYHUB_DOMAIN_TYPE** |
| `JoinStatus` | `pages/JoinStatusPage.tsx` | — | **PHARMACYHUB_DOMAIN_TYPE** |
| `SERVICE_KEY`/`ROLES` 상수 | `config/service.ts` | backend `SERVICE_KEYS`·service-catalog | **DO_NOT_UNIFY** — 프론트 SSOT 로 이미 drift 방지 설계됨(파일 주석) |

**우선 효과**: `Pagination` 5중 중복 제거 + API response 껍데기(`{success,data}`) 타입 통일. **비용 최저**(Dockerfile 변경 0, §3.4).

### 8.2 E2. `@o4o/ui`

| 필요 primitive | PharmacyHub 현재 | `@o4o/ui` 대응 | 판정 |
|---------------|-----------------|---------------|------|
| 버튼 | `<button className="rounded bg-primary-600 …">` × **28개소** | `Button` | 대응 |
| 테이블 | `<table>` 수동 HTML × **4개소** (operator 1 · supplier 1 · store-owner 2) | `BaseTable` (비-Operator) / `operator-ux-core` `DataTable` (Operator) | 대응 — **`OPERATOR-DATATABLE-POLICY-V1` 상 P4 는 operator-ux-core, P6/P7 은 `@o4o/ui`** |
| pagination | 이전/다음 버튼 수동 × **4개소** (동일 코드 반복) | `operator-ux-core` `Pagination` | 대응 |
| form / input | `<input className="…">` × 14 · `<select>` 1 · `<textarea>` 1 | `Input` / `Select` / `Textarea` / `operator-ux-core` `FormField` | 대응 |
| modal | **없음** (`window.prompt` 로 대체) | `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` | 대응 |
| badge | `<span className="rounded bg-amber-50 …">` × 6 | `Badge` / `operator-ux-core` `StatusBadge` | 대응 |
| card | `<div className="rounded-lg border …">` × 20+ | `Card` | 대응 |
| 확인 UI | `window.confirm` × 2 | `ConfirmActionDialog` | 대응 |
| empty / loading / error | 인라인 문자열 (§8.3) | `Skeleton` + `Alert` + `error-handling` | 대응 |

**단순 CSS 유사성이 아님을 확인한 방법**: 각 항목을 실제 export 심볼(`packages/ui/src/index.tsx`)과 대조했다. `Pagination`·`DataTable`·`FormField`·`StatusBadge` 는 `@o4o/ui` 가 아니라 **`@o4o/operator-ux-core`** 에 있다 — 즉 `@o4o/ui` 단독 채택으로는 pagination·operator 테이블을 커버할 수 없다. 이것이 §19 에서 B1 을 `ui + error-handling + types` 로, 운영자 primitive 를 B5 로 분리한 이유다.

`DESIGN-CORE-GOVERNANCE`("모든 신규 화면은 Design Core v1.0") 대비 현재 `@o4o/ui` import 0 — 선행 IR §17.1 의 `DOC_CODE_MISMATCH` 는 HEAD `9efba8fca` 에서도 **유지**된다.

### 8.3 E3. `@o4o/error-handling`

| 축 | 현재 구현 | 문제 |
|----|----------|------|
| API 오류 파싱 | 화면마다 `(err as {response?:{data?:{error?:string}}}).response…` 인라인 캐스팅 **13개소**. `lib/api/pharmacyHubOrders.ts` 만 `errorMessage()`/`errorStatus()` 로 국소 추출 | `parseApiError` 미사용. 파싱 규칙이 화면별로 다름 |
| 조회 실패 | `setError('…을 불러오지 못했습니다.')` 문자열 **9개소** | 계약 없음 |
| mutation 실패 | 동일 패턴 | 계약 없음 |
| 401 | CartPage·OrdersPage 만 `status===401 → '로그인이 필요합니다.'` (2/13) | **나머지 11개소는 401 을 일반 오류로 처리** |
| 403 | 5개소에서 서비스 문구로 분기 | 화면별 문구 상이 |
| 404 | ProductDetail·OrderDetail 2개소 | — |
| empty ↔ error 혼동 | **분리되어 있음** — 목록 4화면 모두 `loading / items.length===0 / error` 3분기 | 양호 |
| alert / console 기반 오류 | **없음** (`window.alert` 0) | 양호 |
| silent failure | `AuthContext.tsx:66-69` `catch {}` (세션 없음 = 정상 — **의도된 것**) · `JoinStatusPage` `catch` 후 error state 설정 | 실제 silent failure 0 |
| Toast | **없음** — 전부 인라인 `<p className="text-red-600">` | `O4OToastProvider` 미도입 |
| ErrorBoundary | **없음** — `main.tsx` 10 L, Provider 없음 | `O4OErrorBoundary` 미도입 |

**판정**: `ADOPT_ERROR_CONTRACT` — 효과가 가장 균일한 축이다. 특히 **401 처리 불일치(2/13)** 는 토큰 만료 시 화면별로 다른 문구가 나오는 실사용 결함이며, 공통 계약 채택으로 소멸한다.

### 8.4 E4. `window.confirm` / `prompt` / `alert`

| 위치 | 호출 | 대체물 | 심각도 |
|------|------|--------|:---:|
| `pages/operator/MembershipsPage.tsx:86` | `window.confirm('… 승인하시겠습니까?')` | `ui` `ConfirmActionDialog` 또는 members 모듈 내장 confirm | 중 |
| `pages/operator/MembershipsPage.tsx:99` | **`window.prompt('반려 사유를 입력해 주세요.')`** | Dialog + textarea | **높음** — 반려 사유는 `service_memberships.rejection_reason` 에 영구 저장되고 신청자에게 그대로 노출된다(`JoinStatusPage:143`). 브라우저 prompt 는 줄바꿈·길이 제한·취소 구분이 빈약하다 |
| `pages/store-owner/OrderDetailPage.tsx:67` | `window.confirm('… 되돌릴 수 없습니다.')` | `ConfirmActionDialog` | 중 |
| `window.alert` | **0건** | — | — |

> `MembershipDetailPage` 는 같은 반려 동작을 **`<textarea>` 로 제대로 구현**하고 있다(`:159-165`). 즉 **같은 서비스 안에서 같은 업무의 UX 가 목록/상세로 이원화**되어 있다. 이는 공통 core 문제가 아니라 PharmacyHub 내부 일관성 문제이며, B1 에서 함께 정리 가능하다.
>
> 본 IR 은 수정하지 않고 분류만 한다(WO §10).

---

## 9. Public / Auth / Account

### F1. Public / Home

| 확인 항목 | 실측 |
|----------|------|
| HomePage | 77 L — header(브랜드/tagline/domain) + 로그인 상태 배너 + 역할 카드 3 |
| public layout | **없음** — 각 페이지가 `mx-auto max-w-* px-4 py-10` 을 직접 반복(**11개 파일에서 동일 패턴**) |
| header / footer | **없음** — 전역 헤더·푸터 부재. `GLOBAL-HEADER-STANDARD-V1` 미적용 |
| service guide | **없음** |
| role entry | `HomePage` `ENTRIES` 3 + `RoleEntryPage` |
| public CTA | 로그인 / 가입 신청 / 신청 상태 확인 |
| `StandardHomeTemplate` 대응 | **가능** — Hero + 진입 카드 구조가 Template 의 config 축과 일치 |

**판정**: HomePage = `ADOPT_TEMPLATE`. 전역 레이아웃 부재는 **gap 이지만 core 채택 이전에 "레이아웃을 도입할 것인가" 자체가 서비스 판단**이므로 `INSUFFICIENT_EVIDENCE` 로 남긴다(B2 조사 항목).

### F2. Auth / Join

| 항목 | 실측 | 판정 |
|------|------|------|
| 로그인 | `LoginPage` 100 L. `authClient.login({email,password,serviceKey})` — 공통 계약 | 로직 **이미 채택** / UI `ADOPT_PRIMITIVE` |
| 회원가입·가입 신청 | `JoinPage` 222 L. 역할 선택(store_owner/supplier) → 조건부 필드 → `POST /pharmacy-hub/join` | 폼 `KEEP_BESPOKE` + primitive 채택 |
| 역할 선택 | 2개 (operator 는 신청 대상 아님 — 서버 정책) | `SERVICE_EXTENSION_REQUIRED` |
| 가입 상태 | 6값 (`none/pending/active/rejected/suspended/withdrawn`) | `SERVICE_EXTENSION_REQUIRED` |
| 승인 대기 / 반려 / 재신청 | `JoinStatusPage` + `MembershipGate` 상태별 CTA 매핑 | 〃 |
| 제한 로그인 | `accountAccess==='restricted'` → `/join/status` 강제 (`WO-O4O-RESTRICTED-LOGIN-…-V1` 계약) | 공통 정책 준수 |
| `auth-client` ↔ `account-ui` 경계 | **`account-ui` 는 계정 화면(MyPage/Profile/Notification) 용** — 가입·로그인 화면 컴포넌트는 제공하지 않는다 | `account-ui` **NOT_APPLICABLE** |

> **인증 로직 ↔ 화면 UI 분리 판정 (WO §11)**
> - `auth-client` / `auth-utils` : **이미 채택** — 추가 작업 없음
> - `account-ui` : 대응 화면 부재 → **NOT_APPLICABLE**
> - membership UI (`MembershipGate` · 상태 6값) : **SERVICE_EXTENSION** 으로 유지가 적절

### F3. Account / Notification

| 항목 | 실측 |
|------|------|
| 내 정보 | **없음** |
| 비밀번호 변경 | **없음** |
| 알림 | **없음** |
| membership 상태 표시 | `JoinStatusPage` (계정 화면이 아니라 가입 흐름) |
| 서비스 이동 | **없음** |
| 로그아웃 UI | **없음** — `AuthContext.logout()` 는 존재하나 **어떤 화면도 호출하지 않는다** |

**판정**: **NOT_APPLICABLE** — P9 화면군 자체가 비어 있다. `@o4o/account-ui` 는 adoption gap 이 아니다.

> **선행 IR §14 정정 (§18.1)**: "계정/알림 UI — gap 서비스 PharmacyHub — JoinPage/JoinStatusPage/RoleEntryPage" 기재는 화면 대응이 부정확하다. 그 3화면은 **가입 흐름**이지 계정 화면이 아니며, `account-ui` 의 어떤 export 와도 대응하지 않는다.

---

## 10. Operator

### 10.1 대상 화면

| Operator 화면 | 존재 | LOC |
|--------------|:---:|----:|
| `MembershipsPage` (승인 목록) | ✅ | 268 |
| `MembershipDetailPage` (승인 상세) | ✅ | 196 |
| Operator layout / navigation | ❌ | — |
| Operator 대시보드 | ❌ | — |
| supplier 관리 | ❌ | — |
| store-owner 관리 | ❌ | — |
| product / offer 관리 | ❌ (설계상 부재 — 상품 승인 개념 없음) | — |
| order / payment 조회 | ❌ (backend fulfillment 2 endpoint 만 존재, 화면 없음) | — |
| service settings | ❌ | — |

> **설계 의도 확인**: `pharmacy-hub.routes.ts:19` · `MembershipConsoleController:6-10` 이 **"상품 승인·주문 승인·콘텐츠 승인 엔드포인트는 존재하지 않는다"** 를 명시하고, `pharmacy-hub-scope.middleware.ts:32-34` 가 `scopeRoleMapping` 에서 operator 가 store_owner/supplier scope 를 대신 통과하지 못하도록 고정한다. → **운영자 화면이 적은 것은 미구현이 아니라 명시적 서비스 경계**다. `NOT_APPLICABLE` 로 집계한다.

### 10.2 core 대비 판정

| Operator 화면 | 기존 core | 계약 gap | adapter 가능 | capability 필요 | 최종 판정 |
|--------------|----------|---------|:-----------:|:--------------:|----------|
| 승인 목록 | `operator-core-ui/modules/members` | 필수 prop 3 + client 메서드 5 + 반려사유 UI (§11) | 부분 | **예** | `CORE_CONTRACT_EXPANSION_REQUIRED` |
| 승인 상세 (별도 route) | 위 모듈의 drawer + `drawerExtraSections` | route 구조 상이 | 예 | 아니오 | `CORE_CONTRACT_EXPANSION_REQUIRED` (목록과 동반) |
| 테이블 / 페이지네이션 / 검색 | `operator-ux-core` `DataTable`·`Pagination`·`SearchBar` | **없음** | 해당없음 | 아니오 | **ADOPT_PRIMITIVE** — members 계약과 **독립적으로 선행 가능** |
| 운영자 영역 셸 · 사이드바 | `operator-ux-core` `OperatorAreaShell`·`DomainIASidebar` | 없음 (config 주입형) | 예 | 아니오 | **ADOPT_LAYOUT_ONLY** |
| 5-Block 대시보드 | `operator-ux-core` `OperatorDashboardLayout` | — | — | — | **NOT_APPLICABLE** (화면 없음) |
| AI Summary | backend `CopilotEngineService` | — | — | — | **NOT_APPLICABLE** |
| 나머지 18 core-ui 모듈 | — | — | — | — | **NOT_APPLICABLE** |

### 10.3 `admin-ux-core`

PharmacyHub 에 `/admin` 영역이 **존재하지 않는다**(route 0 · 화면 0 · backend admin endpoint 0). → **NOT_APPLICABLE**.

### 10.4 `ServiceKey` union — **차단 요인 아님 (선행 판정 정밀화)**

`IR-...-OPERATOR-CORE-...-AUDIT-V1 §13-6` 은 `operator-ux-core` 의 `ServiceKey = 'kpa-society' | 'glycopharm' | 'k-cosmetics'` 에 Neture·PharmacyHub 가 없음을 부정합으로 기록했다. 본 IR 의 adoption 관점 실측:

```
packages/operator-ux-core/src/config/serviceConfig.ts:11
  export type ServiceKey = 'kpa-society' | 'glycopharm' | 'k-cosmetics';

grep -rn "ServiceConfig|serviceConfig|getServiceConfig" services/web-neture/src
  → 0 matches
```

**Neture 는 `operator-ux-core` 를 53 import 소비하면서 `ServiceKey`/`ServiceConfig` 는 단 한 번도 쓰지 않는다.** `ServiceKey` 는 `kpaConfig`/`glycopharmConfig`/`kcosmeticsConfig` 표현 config 축에만 묶여 있고, `OperatorAreaShell` · `DomainIASidebar` · `DataTable` · `Pagination` · `FormField` 는 이 타입을 요구하지 않는다.

또한 `operator-core-ui` `OperatorMembersConsolePageProps.serviceKey` 는 **`string`** 이다(union 아님) — 주석 "Canonical service key (neture / glycopharm / k-cosmetics)" 는 설명일 뿐 타입 제약이 아니다.

> **판정**: `WO-O4O-OPERATOR-UX-CORE-SERVICEKEY-REALIGNMENT-V1`(선행 IR §15-5)은 **PharmacyHub adoption 의 선행 조건이 아니다.** 위생 개선 과제로 남기되, B4/B5 를 막지 않는다. 이 판정 없이는 후속 WO 가 불필요한 공유 패키지 타입 변경을 선행 조건으로 잡을 위험이 있었다.

---

## 11. 회원관리 상세 (H)

> 선행 판정(`IR-...-OPERATOR-CORE-...-AUDIT-V1 §8.4`): **`CORE_CONTRACT_EXPANSION_REQUIRED`**. 본 절은 이를 **유지**하되, 그 사유를 정밀화하고 **선행 IR 이 잡지 못한 gap 2건을 추가**한다.

### H1. 목록 데이터 모델

| 질문 | 실측 답 |
|------|--------|
| User 중심인가 Membership 중심인가 | **Membership 중심** — `FROM service_memberships sm JOIN users u ON u.id = sm.user_id`, 응답 `id` = `sm.id` |
| 둘을 함께 보여야 하는가 | **예** — 목록 컬럼 = 신청자(u.name/u.email) + 신청역할(sm.role) + 약국/회사(`u."businessInfo"->>'businessName'`) + 신청일시(sm.created_at) + 상태(sm.status) |
| `UserData` 로 정규화 가능한가 | **가능** — 응답이 `id`(membership) 와 `userId`(user) 를 **둘 다** 내려준다. adapter 가 `UserData.id ← r.id(membership)` 로 매핑하면 `updateStatus(userId=membershipId)` 가 PharmacyHub endpoint(`PATCH /memberships/:membershipId/approve`)와 **정확히 맞는다**. `memberships: [{id, serviceKey:'pharmacy-hub', status, role, createdAt}]` 도 채울 수 있어 기본 `getPrimaryRole` 이 동작한다 |
| generic row 타입이 필요한가 | **불필요** — `UserData` 의 `email`·`name`·`phone`·`company`·`status`·`createdAt` 이 PharmacyHub 응답 필드와 1:1 대응한다 |

> **선행 판정 정밀화**: §8.4 는 "데이터 모델(User 중심 vs membership 중심)"을 `REUSE_WITH_ADAPTER` 불가 사유의 하나로 들었다. 본 IR 실측 결과 **id 축은 adapter 로 해소 가능**하다. `CORE_CONTRACT_EXPANSION_REQUIRED` 판정을 유지시키는 실제 사유는 데이터 모델이 아니라 **필수 prop / 필수 메서드 / 반려사유 UI 부재**(H3·H4)다.

### H2. 상세 화면

| 질문 | 실측 답 |
|------|--------|
| drawer 확장으로 수용 가능한가 | **부분 가능** — 모듈 drawer 는 상태·역할·membership 목록·상태변경 버튼을 이미 렌더(`:884-946`). PharmacyHub 고유 항목(약국/회사명·담당자·사업자번호·사업장주소 = `businessInfo` 5필드)은 `drawerExtraSections` 로 수용 가능 |
| 별도 상세 route 가 필요한가 | **정책 판단 필요** — 현재 `/operator/memberships/:id` 가 실재하고 목록에서 링크된다. 모듈 채택 시 drawer 로 흡수되면 이 route 는 소멸한다. `O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1` §4-4/5("route 없는 메뉴 금지 / route 있는 실기능 숨김 금지") 대상 |
| `drawerExtraSections` 로 충분한가 | 표시는 **충분**. **처리(승인/반려)는 불충분** — H4 참조 |

### H3. action 분류

| action | PharmacyHub backend | 분류 |
|--------|:---:|------|
| `approve` | `PATCH /memberships/:id/approve` | **REQUIRED** |
| `reject` | `PATCH /memberships/:id/reject` — **`reason` 필수, 없으면 400 `REJECTION_REASON_REQUIRED`** | **REQUIRED** (+ 사유 입력 UI 필수) |
| `suspend` | **없음** | **NOT_SUPPORTED** |
| `activate` (suspended→active) | **없음** | **NOT_SUPPORTED** |
| `changeRole` | 없음 (승인 시 `sm.role` 기준 자동 부여) | **NOT_SUPPORTED** |
| `updatePassword` | 없음 | **NOT_SUPPORTED** |
| `editMember` | 없음 (`MembershipConsoleController:9` 가 회원 삭제·role 직접부여 미포함을 명시) | **NOT_SUPPORTED** |
| `batchUpdate` | 없음 | **NOT_SUPPORTED** |
| `delete` | 없음 | **NOT_SUPPORTED** (모듈에선 이미 optional) |

### H4. 계약 완화 범위 — **신규 gap 2건 포함**

#### (a) 필수 → optional 완화 대상 (선행 IR §8.4 계승)

| 항목 | 모듈 내 호출 위치 | 미제공 시 숨겨야 할 UI |
|------|------------------|----------------------|
| `renderEditModal` (필수 prop) | `:992` (`editUser &&` 로 이미 조건부) | RowActionMenu `edit` 항목 |
| `client.updatePassword` | `:109` (비밀번호 변경 모달 내부) | RowActionMenu `password` 항목 |
| `client.stats` | `:316` | 상단 통계 카드 |
| `client.listAll` | `:320` (`fetchStats` 내부, `stats` 와 동일 함수) | 역할 탭 카운트 |
| `client.batchUpdateStatus` | `:432`·`:445` | ActionBar 일괄 승인/반려 |

> **완화의 구현 형태는 이미 모듈 안에 선례가 있다.** `renderDeleteFlow` 는 optional 이며, `buildUserActionPolicy({ serviceKey, hasDelete: !!renderDeleteFlow })`(`:186-203`, `:601`)가 **prop 유무로 action 규칙 배열을 조립**한다. 즉 `hasEdit: !!renderEditModal` · `hasPassword: !!client.updatePassword` 를 같은 자리에 추가하는 것이 **기존 3서비스에 대해 완전 additive**(전부 제공 중이므로 동작 불변)이다. 이는 계약 완화 WO 의 설계 리스크를 크게 낮추는 실측 사실이다.

#### (b) **신규 gap 1 — 반려 사유 필수 (선행 IR 미기재)**

모듈의 반려 경로:

```
:681  onClick: () => handleStatusChange(u.id, 'rejected', u.status, u)
:397  await client.updateStatus(userId, status, currentStatus, user)
```

`updateStatus` 시그니처에 **사유를 전달할 자리가 없다.** PharmacyHub `POST reject` 는 `reason` 이 없으면 **400** 을 반환한다(`MembershipConsoleController:267-270`). 반려 사유는 `service_memberships.rejection_reason` 에 저장되어 신청자 화면에 그대로 노출된다(`JoinStatusPage:143`).

→ adapter 가 "존재하지 않는 기능을 가짜로 구현"하지 않고는 메울 수 없다. **`updateStatus` 에 optional `reason` 을 추가하거나, 반려 전 사유 입력 slot(`renderRejectReason` 또는 `rejectRequiresReason: true`)을 도입**해야 한다.

#### (c) **신규 gap 2 — 미지원 action 노출 (선행 IR 미기재)**

모듈의 drawer action 은 **status 값으로만** 결정된다(`:657-707`):

```
u.status === 'active' | 'approved'  → '비활성화' (suspended 로 전이)
u.status === 'suspended'            → '활성화'   (approved 로 전이)
```

capability gate 가 없다. PharmacyHub 는 suspend/activate endpoint 가 **없으므로**, 승인 완료(`active`) 회원 행에서 "비활성화" 버튼이 뜨고 누르면 실패한다. `O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1` §4-4("route 없는 메뉴는 노출하지 않는다")의 action 판 위반이다.

→ **`supportedStatusTransitions` 또는 `canSuspend`/`canActivate` capability 가 필요**하다. 기존 3서비스는 기본값 `true` 로 두면 동작 불변.

#### (d) 상태 어휘 — **문제 아님 (선행 판정 정밀화)**

모듈은 `active` 와 `approved` 를 **이미 동시에 수용**한다:

```
:334  active: getCount('active') + getCount('approved')
:687  if (u.status === 'active' || u.status === 'approved')
:918  m.status === 'active' ? … : m.status === 'pending' ? … : …
```

PharmacyHub 의 `service_memberships.status` 6값 중 `pending`/`active`/`rejected`/`suspended` 는 그대로 통한다. `withdrawn` 만 미지원 라벨이나 badge fallback 으로 표시된다. → **어휘 정렬 작업 불필요.**

### H5. 최종 선택지 판정

| 선택지 | 성립 여부 | 사유 |
|--------|:---:|------|
| `REUSE_EXISTING_MEMBER_CORE` | ✗ | 필수 prop `renderEditModal` + 필수 client 메서드 5 를 만족할 수 없다 |
| `REUSE_WITH_ADAPTER` | ✗ | adapter 가 `stats`/`listAll`/`updatePassword`/`batchUpdateStatus` 를 **가짜로 구현**해야 하고, 반려 사유(H4-b)는 adapter 층에서 메울 수 없다 |
| `REUSE_WITH_CAPABILITY_EXTENSION` | △ | H4-(a)(c) 는 capability 로 해결되나 **H4-(b) 반려 사유는 계약(시그니처 또는 slot) 변경**이 필요하다 |
| **`CORE_CONTRACT_EXPANSION_REQUIRED`** | **✅** | H4-(a) optional 완화 + H4-(b) 반려 사유 계약 + H4-(c) transition capability. **전부 additive** 로 설계 가능하며 기존 3서비스 동작 불변 |
| `KEEP_PHARMACYHUB_BESPOKE` | △ (fallback) | 계약 확장 WO 가 승인되지 않으면 유효한 대안. 단 `window.prompt` 반려 UX(§8.4)는 그 경우에도 정리 대상 |

> **최종**: **`CORE_CONTRACT_EXPANSION_REQUIRED`** — 선행 판정 유지. **코드는 변경하지 않았다.**
>
> 완화 항목 최종 목록(후속 WO 입력):
> ```
> optional 화:  renderEditModal · client.updatePassword · client.stats
>               client.listAll · client.batchUpdateStatus
> 신규 계약:    반려 사유 전달 (updateStatus 의 optional reason 또는 reject 사유 slot)
> 신규 capability: 지원 상태 전이 선언 (canSuspend / canActivate 또는 supportedStatusTransitions)
> 조립 지점:    buildUserActionPolicy 의 hasDelete 패턴을 hasEdit/hasPassword 로 확장
> 불필요:       상태 어휘 정렬 (active|approved 이미 수용) · id 축 정규화 (adapter 로 해소)
> ```
> 모든 변경은 `O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1` 대상이며 **KPA / K-Cosmetics / Neture 3서비스 회귀 검증이 필수**다.

---

## 12. Store Owner / Pharmacy Owner

| 확인 항목 | PharmacyHub 실측 | KPA 약국 운영자 대비 |
|----------|-----------------|---------------------|
| dashboard | **없음** (`RoleEntryPage` 링크 3개) | KPA 는 `StoreDashboardLayout` + 사이드바 + insight |
| supplier offers | `/store-owner/products` — 공급자 제공 상품 카탈로그 | KPA 에 동일 개념 없음 |
| handled products (취급 상품) | **없음** — 상품 상세 주석이 "취급상품 등록은 범위 밖(§9)" 명시 | KPA 는 `listing is_active` 축 보유 |
| orders | `/store-owner/orders[/:id]` — 구매자(약국) 주문 | KPA 는 매장이 **판매자** |
| payments | `/store-owner/payment*` — 약국이 **결제자** | KPA 매장은 **수취자** |
| profile / membership | **없음** | KPA 는 `/store/settings` 보유 |
| store / pharmacy information | **없음** — organizations 참조는 backend JOIN 에만 | KPA 는 `pharmacy-info` 콘솔 보유 |

### 12.1 `@o4o/store-ui-core` 판정

**NOT_APPLICABLE (현 시점)**. 사유:

1. `store-ui-core` 의 핵심 계약은 `StoreDashboardLayout` + `storeMenuConfig` + `resolveStoreMenu(capability)` 4요소다(`STORE-LAYER-ARCHITECTURE` F3). PharmacyHub 에는 **매장 대시보드도 매장 메뉴도 없다.**
2. `store-ui-core` 가 전제하는 매장 = **판매·실행 자산 제작 주체**(POP/QR/블로그/사이니지/설명서 — `O4O-STORE-MENU-CANONICAL-TREE-V1` 6항목). PharmacyHub 의 약국 경영자는 **구매자**다. 업무 축이 반대다.
3. 부분 재사용 후보는 있다 — `BuyerOrderStatusBadge` · `buyerCheckoutStatus` (§14). 그러나 이는 layout 채택이 아니라 **primitive 채택**이며 `INSUFFICIENT_EVIDENCE` 로 남긴다.

> **WO §14 주의사항 준수**: "PharmacyHub 의 약국 경영자 = KPA 의 약국 운영자" 라는 선결론을 내리지 않았다. 위 표가 보여주듯 **두 역할은 상품·주문·결제 축에서 방향이 반대**다(구매 vs 판매). 이름이 같다는 이유로 `store-ui-core` 를 요구하면 서비스 고유 정책을 공통 core 로 오인하는 사례가 된다(WO §23 중지 조건).

### 12.2 구분 결과

```
공통 layout          → NOT_APPLICABLE (대응 화면 없음)
공통 menu capability → NOT_APPLICABLE (메뉴 자체 없음)
공통 상품 UI         → INSUFFICIENT_EVIDENCE (§14)
PharmacyHub 직접거래  → SERVICE_EXTENSION_REQUIRED
PharmacyHub 주문·결제 → KEEP_BESPOKE / DO_NOT_UNIFY
약국 고유 정보        → 화면 없음 (기능 미구현)
```

---

## 13. Supplier

| 항목 | PharmacyHub 실측 |
|------|-----------------|
| supplier dashboard | **없음** (`RoleEntryPage` 링크 1개) |
| product offer creation | **없음** — 상품 등록·수정은 **Neture 공급자 원장**이 담당(`pharmacy-hub.routes.ts:175` 명시) |
| product availability | `/supplier/products` — `serviceKeys` 배열에 `pharmacy-hub` opt-in/out + `offer_service_prices` 서비스별 공급가 |
| store/pharmacy delivery scope | 서비스 단위(전체 약국). 개별 약국 지정 없음 |
| profile / membership | **없음** |
| orders | **backend 4 endpoint 존재, 화면 0** (§4.3) |
| payments | 공급자 측 정산 화면 없음 |
| 승인 흐름 | **없음** — "운영자 상품 승인 없이 즉시 노출"이 명시적 설계(`supplier/ProductsPage.tsx:8`) |

### 13.1 판정

| 기준 | 판정 |
|------|------|
| 공급자 UI primitive 공통성 | **ADOPT_PRIMITIVE** — 테이블·페이지네이션·검색·인라인 입력은 `@o4o/ui` + `operator-ux-core` list primitive 로 대응 |
| supplier layout 공통성 | **NOT_APPLICABLE** — 공급자 셸/대시보드가 없다 |
| 상품/offer 데이터 계약 공통성 | **INSUFFICIENT_EVIDENCE** — `supplier_product_offers`/`offer_service_prices` 는 Neture canonical 이나 프론트 공통 컴포넌트 대응은 미확인 |
| 거래 정책의 서비스 고유성 | **SERVICE_EXTENSION_REQUIRED** — `serviceKeys` opt-in 축은 Pharmacy-Hub↔Neture 계약. 3키(glycopharm/kpa-society/k-cosmetics)만 승인 큐를 갖는 기존 정책과도 다르다 |
| 승인 흐름 유무 | **NOT_APPLICABLE** — 승인 개념 부재가 설계 |

> **WO §15 주의사항 준수**: Neture 공급자 구조를 참조하되 강제 적용하지 않았다. Neture 공급자는 **상품 원장 주체**이고 PharmacyHub 공급자는 **제공 대상 선택 주체**다 — 후자는 전자 위에 얹힌 얇은 opt-in 레이어이며, 이 분리가 이미 코드로 표현되어 있다(등록·수정 없음).

---

## 14. Product / Offer

### 14.1 계층 분리 실측

| 계층 | 실체 | PharmacyHub 취급 |
|------|------|-----------------|
| ProductMaster 기반 공통 상품 | `product_masters` + `product_identifiers` + `product_images` + `product_categories` | **읽기만** — 생성·수정 없음 |
| Supplier offer | `supplier_product_offers` (Neture canonical) | **읽기 + serviceKeys 토글** |
| PharmacyHub 서비스별 가격 | `offer_service_prices` | **읽기 + 쓰기** (공급가) |
| PharmacyHub 제공 가능 상품 | `serviceKeys @> ['pharmacy-hub']` + 안전 게이트 | 파생 뷰 |
| 약국 취급/주문 가능 상품 | 위와 동일 (별도 "취급 등록" 개념 없음) | — |
| 운영자 상품 관리 | **없음** (설계상 부재) | `NOT_APPLICABLE` |
| 공급자 상품 설정 | `/supplier/products` | `SERVICE_EXTENSION_REQUIRED` |

**PharmacyHub 전용 상품 모델 0** — F12 §불변식 ⑥(ProductMaster 는 Resource 를 모른다)·CLAUDE.md §4 준수.

### 14.2 `@o4o/store-products-ui` 판정

**INSUFFICIENT_EVIDENCE**. 판정 불가 사유(코드 변경 없이 확정 불가 — WO §23):

1. `store-products-ui` 는 `configureStoreProductsApi(api)` DI 로 서비스 authClient 를 주입받는다. 이 축은 PharmacyHub 에서도 **기술적으로 성립**한다.
2. 그러나 3서비스(KPA/KCos/Neture)가 이 패키지를 **각 2 import 만** 쓴다(`PARTIALLY_USED`). 어떤 컴포넌트를 쓰는지, 그것이 B2B 공급 offer 목록에 대응하는지 확인하려면 3서비스 소비 지점 상세 조사가 필요하다.
3. PharmacyHub 목록의 축은 **규제유형 탭(DRUG/HEALTH_FUNCTIONAL/QUASI_DRUG/COSMETIC/GENERAL) + 공급자 필터 + 서비스 공급가**다. 이 3축이 공통 컴포넌트 props 로 표현 가능한지는 미확인이다.

→ **B7 (Product UI Adoption) 진입 전 별도 조사 필요.** 본 IR 은 데이터 모델 변경을 제안하지 않는다.

### 14.3 주의 사항 (신규 기록)

`store-owner/ProductDetailPage.tsx:183,189` 가 공급자 제공 HTML(`businessShortDescription`/`businessDetailDescription`)을 **`dangerouslySetInnerHTML` 로 sanitize 없이** 렌더한다. `@o4o/content-editor` `ContentRenderer` 는 sanitizer 를 내장한다(메모리: sanitizer 가 `style` 제거). **본 IR 은 보안 판정을 하지 않으며**, 공통화 관점에서 `ContentRenderer` 대응 가능성을 `INSUFFICIENT_EVIDENCE` 로 기록하고 후속 조사 대상으로 남긴다.

---

## 15. Order / Payment / Transaction

### 15.1 공통화 가능 축 vs 고유 축

| 축 | 실측 | 판정 |
|----|------|------|
| 목록·상세 UI primitive | 수동 `<ul>`/`<div>` 카드, 페이지네이션 수동 | **ADOPT_PRIMITIVE** |
| 상태 badge | `statusLabel()` 로컬 함수 (`OrdersPage:22-32`) — 취소/환불/결제완료/공급자전달완료/결제실패/결제대기 6값 | **INSUFFICIENT_EVIDENCE** — `store-ui-core` `BuyerOrderStatusBadge`·`buyerCheckoutStatus` 실재하나 PharmacyHub 는 `supplierNotified` 축이 추가되어 6값 중 2값이 다르다 |
| pagination / search | 수동 이전/다음 (4개소 중복) | **ADOPT_PRIMITIVE** |
| error / loading | 인라인 (§8.3) | **ADOPT_ERROR_CONTRACT** |
| 금액 표시 | `won()` 로컬 함수가 **5개 파일에 중복 정의** (`toLocaleString('ko-KR')`) | **ADOPT_PRIMITIVE** 또는 `ADOPT_TYPES_ONLY` 축의 util |
| 날짜 표시 | `fmt()` / `toLocaleString('ko-KR')` **6개소 중복** | 동상 |
| 공통 audit metadata | backend `ActionLogService`(`@o4o/action-log-core`) 이미 사용 | **이미 채택** |
| **주문 상태 전이** | `pending→paid→cancelled` + `neture_orders` fulfillment | **SERVICE_EXTENSION_REQUIRED** |
| **결제 이벤트 처리** | `PharmacyHubPaymentEventHandler` — 결제 완료만이 paid 전이 + 공급자 전달 | **KEEP_BESPOKE** |
| **정산 규칙** | 화면 없음 | NOT_APPLICABLE |
| **거래 조건** | 공급자별 배송비·무료배송 임계 | **SERVICE_EXTENSION_REQUIRED** |
| **공급자↔약국 관계** | `neture_suppliers` 경유 | **SERVICE_EXTENSION_REQUIRED** |
| **취소·환불 정책** | 결제 전 단건 취소 / 결제 후 그룹 취소(공급자 접수 전 한정) | **KEEP_BESPOKE** |
| **다공급자 1회 결제 (paymentGroupId)** | PharmacyHub 고유 | **DO_NOT_UNIFY** |

### 15.2 종합 판정

```
P8 화면군 = ADOPT_PRIMITIVE + ADOPT_ERROR_CONTRACT (UI 표면)
          + KEEP_BESPOKE / SERVICE_EXTENSION_REQUIRED (업무 전부)
```

`O4O-COMMONIZATION-STANDARD` §3.3 ③ 및 선행 IR §17("PharmacyHub B2B 주문/결제 도메인 로직 = `SERVICE_ONLY`, 단 UI/레이아웃 축은 adoption 대상")과 **완전 일치**한다. 본 IR 은 이 경계를 화면 단위로 확정했다.

> **주의(신규)**: `lib/api/pharmacyHubOrders.ts:9-12` 가 **"모든 금액은 서버 응답을 그대로 표시한다. 프론트에서 재계산하지 않는다"** 를 계약으로 명시한다. 어떤 공통 컴포넌트를 채택하더라도 **금액을 클라이언트에서 합산하는 컴포넌트는 도입할 수 없다.** B1/B7 진입 시 필수 제약이다.

---

## 16. Optional Module 판정

| 모듈 | 판정 | 근거 |
|------|:----:|------|
| **Community** | `FUTURE_OPTIONAL` | `RoleEntryPage` operator `plannedFeatures` 에 "커뮤니티 운영·신고 처리" 명시. 현재 화면·endpoint 0 |
| **Forum** | `FUTURE_OPTIONAL` | 위와 동일 축. `forum-core` + `shared-space-ui` `ForumHubTemplate` 가 준비되어 있으므로 도입 시 채택 |
| **LMS** | `NOT_APPLICABLE` | 교육 도메인 언급 0. Neture 와 동일한 **의도된 경계** |
| **CMS** | `FUTURE_OPTIONAL` | operator `plannedFeatures` "공지·운영자 콘텐츠" |
| **Resources (자료실)** | `FUTURE_OPTIONAL` | store_owner `plannedFeatures` "공급자 제공 콘텐츠 수신" |
| **Tablet** | `NOT_APPLICABLE` | 태블릿·키오스크 언급 0 |
| **Signage** | `NOT_APPLICABLE` | 사이니지 언급 0 |
| **POP / QR** | `NOT_APPLICABLE` | 매장 실행 자산 제작 = 판매자 업무. PharmacyHub 약국은 구매자(§12) |
| **Store execution assets** | `NOT_APPLICABLE` | 위와 동일 |
| **Event Offer** | `FUTURE_OPTIONAL` | `config/service.ts:19` `EVENT_OFFER_SERVICE_KEY = 'pharmacy-hub-event-offer'` 가 **정의되어 있으나 미연결**. supplier `plannedFeatures` 에도 기재 |

> **WO §18 준수**: 위 `NOT_APPLICABLE` 5건은 "다른 서비스에 있으니 필요하다"로 뒤집지 않았고, **기능이 없다는 사실을 adoption gap 으로 집계하지 않았다.** `FUTURE_OPTIONAL` 5건도 현재 gap 이 아니다 — 해당 기능 WO 가 승인될 때 비로소 채택 판정 대상이 된다.

---

## 17. 서비스 고유 유지 영역 (확정)

| 영역 | 분류 | 근거 |
|------|------|------|
| B2B 장바구니 → 다공급자 주문 분할 → **paymentGroupId 1회 결제** | `DO_NOT_UNIFY` | PharmacyHub 고유 거래 구조 |
| 결제 완료 이벤트만이 paid 전이 + 공급자 전달 (`PharmacyHubPaymentEventHandler`) | `KEEP_BESPOKE` | 원장 정합성 계약 |
| 결제 전/후 취소 정책 (409 `ALREADY_PAID` · 공급자 접수 전 한정) | `KEEP_BESPOKE` | 〃 |
| 공급자별 배송비·무료배송 임계 | `SERVICE_EXTENSION_REQUIRED` | 거래 조건 |
| 공급자 `serviceKeys` opt-in + `offer_service_prices` 서비스별 공급가 | `SERVICE_EXTENSION_REQUIRED` | Neture 원장 위 얇은 계약층 |
| **운영자 상품·주문·콘텐츠 승인 부재** | `SERVICE_ONLY` (설계) | 명시적 경계 — 미구현 아님 |
| PharmacyHub 전용 membership 6상태 축 + 역할별 가입 폼 | `SERVICE_EXTENSION_REQUIRED` | 가입 정책 |
| `scopeRoleMapping` — operator 가 store_owner/supplier scope 를 대신 통과하지 않음 | `SERVICE_ONLY` | 3자 경계 원칙 |
| 3중 supplier guard (`requireAuth` + scope + Neture ACTIVE 공급자) | `SERVICE_ONLY` | — |
| `config/service.ts` SSOT (SERVICE_KEY/BRAND/ROLES 단일 파일) | `KEEP_BESPOKE` — **모범 사례** | drift 방지 설계 |
| `lib/apiClient.ts` (20 L 부팅 config) | `KEEP_BESPOKE` — 정상 | 선행 IR §10.2 |

---

## 18. 공통 계약 확장 필요 영역

| # | 대상 | 확장 성격 | 소비처 영향 | 필수 절차 |
|:-:|------|----------|-----------|----------|
| **C1** | `operator-core-ui/modules/members` — 필수 prop/메서드 5종 optional 화 | additive | KPA(별도 페이지) / K-Cos / Neture — **전부 제공 중이므로 동작 불변** | `SHARED-MODULE-CHANGE-PROTOCOL-V1` 전 절차 |
| **C2** | 위 모듈 — 반려 사유 전달 계약 (§11 H4-b) | additive (optional `reason` 또는 slot) | 기존 3서비스는 미사용 → 불변 | 〃 |
| **C3** | 위 모듈 — 지원 상태 전이 capability (§11 H4-c) | additive (기본값 = 현행 전체 허용) | 불변 | 〃 |
| **C4** | `operator-ux-core` `ServiceKey` union | 위생 개선 | **adoption 차단 요인 아님**(§10.4) | 별도 WO, 우선순위 낮음 |

**공통 원칙**: 4건 모두 **기존 3서비스 동작을 바꾸지 않는 additive/optional 방식만 허용**한다. PharmacyHub 편입을 이유로 기존 소비처 동작을 변경하는 방식은 금지(`IR-...-OPERATOR-CORE-...-AUDIT-V1 §8.4` 주의 계승).

### 18.1 선행 문서 대비 정정 (본 IR 이 확인한 사실)

| 문서 | 기재 | 본 IR 실측 |
|------|------|-----------|
| `IR-...-ASSET-AND-STATUS-REGISTRY-V1` §14 | "계정/알림 UI — `account-ui` — gap: PharmacyHub — JoinPage/JoinStatusPage/RoleEntryPage" | **화면 대응 부정확** — 그 3화면은 가입 흐름이며 `account-ui` export 와 대응하지 않는다. 계정 화면은 **0개** → `NOT_APPLICABLE` (§9-F3) |
| 〃 §14 | "매장주 대시보드 — `store-ui-core` — gap: PharmacyHub(store-owner 6페이지 ~1,000L)" | store-owner 6페이지는 **주문·결제·상품**이며 매장 대시보드가 아니다 → `store-ui-core` `NOT_APPLICABLE` (§12) |
| 〃 §12 | "src 전체 25파일 / 약 3,700L" | HEAD `9efba8fca` 기준 **26파일 / 3,745L** (결제 API 클라이언트 추가) |
| `IR-...-OPERATOR-CORE-...-AUDIT-V1` §8.3 | 계약 gap 7행 | **정확**. 단 반려 사유(§11 H4-b)·상태 전이 capability(§11 H4-c) **2건 누락** |
| 〃 §8.4 | "데이터 모델(User 중심 vs membership 중심)" 을 불가 사유로 기재 | **id 축은 adapter 로 해소 가능**(응답에 `userId` 동봉). 실제 사유는 필수 prop + 반려 사유 (§11 H1) |
| 〃 §13-6 | `ServiceKey` union 부정합 | 사실이나 **adoption 선행 조건 아님** — Neture 가 53 import 중 `ServiceConfig` 0 소비로 실증 (§10.4) |
| `O4O-COMMONIZATION-STANDARD` §3.3 | PharmacyHub 3구분 (①기반 채택 ②화면별 판단 ③서비스 고유) | **유지**. 단 ① 의 `account-ui`·`shared-space-ui` 는 본 IR 판정상 각각 `NOT_APPLICABLE` / `P1 한정`으로 좁혀진다 |

> 위 정정은 **과거 IR·CHECK 본문을 수정하지 않고** 본 IR 에 기록하는 방식으로 처리했다(WO §21.2 — 과거 문서 본문 수정 금지). 기준 문서(`O4O-COMMONIZATION-STANDARD`) 개정 여부는 §22 후속 WO 판단.

---

## 19. 단계별 adoption 순서

WO §19 의 초기 가설(B1~B6)을 판정 결과로 검증한 결과 **B2 를 재정의하고 B5/B6 를 재배치**했다.

| 단계 | 대상 화면 | 채택 core | 선행 계약 변경 | 회귀 위험 | 예상 규모 |
|:---:|----------|----------|--------------|:--------:|----------|
| **B1** | 전 화면 primitive + 에러/로딩/빈상태 + confirm 3개소 + `Pagination` 타입 5중복 | `@o4o/types` · `@o4o/ui` · `@o4o/error-handling` | **없음** | **낮음** | 26파일 중 20파일 touch. Dockerfile +4줄(ui/error-handling), tailwind content +2 glob. `types` 는 **Dockerfile 변경 0** |
| **B2** | P1 HomePage (+ 전역 레이아웃 도입 여부 판단) | `@o4o/shared-space-ui` `StandardHomeTemplate` | 없음 | 낮음 | 1화면. **선행 조사 필요** — 전역 header/footer 도입은 서비스 판단 |
| **B3** | (코드: 공유 패키지) members 계약 완화 §18 C1~C3 | `operator-core-ui/modules/members` | **C1·C2·C3** | **높음** — KPA/K-Cos/Neture 3서비스 회귀 | 패키지 1개. `SHARED-MODULE-CHANGE-PROTOCOL` 전 절차 + 3서비스 smoke |
| **B4** | P4 운영자 회원 승인 2화면 | 위 모듈 + adapter | B3 완료 필수 | 중 | 464 L → thin wrapper + adapter ≈ 150 L |
| **B5** | 운영자 영역 셸 · 사이드바 (**신설**) + operator list primitive | `operator-ux-core` `OperatorAreaShell`·`DomainIASidebar`·`DataTable`·`Pagination` | 없음 | 낮음 | domain IA config 신설. **B3/B4 와 독립 — B1 직후 진입 가능** |
| **B6** | P7 상품 UI | `@o4o/store-products-ui` (판정 미확정) | 없음 | 중 | **선행 조사 필요** (§14.2) |
| **B7** | P6 공급자 화면 primitive | `@o4o/ui` + `operator-ux-core` list | 없음 | 중 | B1 에 흡수 가능 |
| — | P8 주문·결제 업무 | — | — | — | **채택 없음** — `KEEP_BESPOKE` (UI primitive 만 B1 에서 처리) |
| — | P9 계정 · optional module | — | — | — | **해당 기능 WO 승인 시 재판정** |

### 19.1 가설 대비 변경점

| WO §19 가설 | 본 IR 판정 |
|------------|-----------|
| B2 = "account / public shared components" | **account 는 화면 0 → 제외.** B2 = public/Home Template 만 |
| B3 = "operator shell + members" | **분리** — shell(B5)은 계약 변경 불필요, members(B3/B4)는 계약 변경 필수. **묶으면 낮은 위험 작업이 높은 위험 작업에 인질이 된다** |
| B4 = "store-owner shell / products" | **store-owner shell 은 대응 core 없음(§12) → 삭제.** products 만 B6 |
| B5 = "supplier 공통 기반" | supplier 고유 기반은 없음. primitive 뿐 → **B1 에 흡수 가능(B7)** |

### 19.2 우선순위 근거

| 기준 | 적용 |
|------|------|
| 효과 | B1 이 압도적 — 20/26 파일, 401 처리 불일치·`Pagination` 5중복·`won()` 5중복·`fmt()` 6중복 동시 해소 |
| 반복 제거 | B1 (pagination 4개소·테이블 4개소·버튼 28개소) |
| 기존 core 안정성 | B1 대상 3패키지는 최다 소비(ui 87/86/…) — 가장 안정 |
| 서비스 고유 로직 침범 위험 | B1·B2·B5 = 0 (UI 층만) / B3 = 높음(공유 계약) |
| 선행 계약 변경 규모 | B1·B2·B5·B6·B7 = 0 / B3 = 3건 |
| 사용자 화면 회귀 위험 | B4 가 유일하게 실사용 운영자 화면을 교체 |

**권고 순서**: `B1 → B5 → B2 → (B6 조사) → B3 → B4`.
B3(공유 계약 변경)를 **가장 나중에** 두는 이유는, 그 전까지의 단계가 전부 계약 변경 0 이며 PharmacyHub 단독 회귀 범위 안에서 끝나기 때문이다.

---

## 20. 구현 Workstream 제안

| WS | 제목 | 성격 | 공통 package 변경 | PharmacyHub 변경 | 기존 3서비스 회귀 검증 |
|:--:|------|------|:---:|:---:|:---:|
| **WS-1** | `WO-O4O-PHARMACY-HUB-DESIGN-CORE-AND-ERROR-CONTRACT-ADOPTION-V1` | 서비스 코드 | **없음** (dependency 추가만) | 20파일 | **불필요** |
| **WS-2** | `WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-ADOPTION-V1` | 서비스 코드 | 없음 | 신설 셸 + config | 불필요 |
| **WS-3** | `WO-O4O-PHARMACY-HUB-PUBLIC-HOME-TEMPLATE-ADOPTION-V1` | 서비스 코드 | 없음 | 1화면 | 불필요 |
| **WS-4** | `IR-O4O-PHARMACY-HUB-PRODUCT-UI-CORE-FIT-V1` | read-only | — | — | — |
| **WS-5** | `WO-O4O-OPERATOR-MEMBERS-CONSOLE-CONTRACT-RELAXATION-V1` | **공유 모듈** | `operator-core-ui/modules/members` | 없음 | **필수 — KPA/K-Cos/Neture typecheck + smoke** |
| **WS-6** | `WO-O4O-PHARMACY-HUB-OPERATOR-MEMBERS-ADOPTION-V1` | 서비스 코드 | 없음 | P4 2화면 | 불필요 (WS-5 에서 완료) |
| **WS-7** | `WO-O4O-PHARMACY-HUB-SUPPLIER-AND-PRODUCT-PRIMITIVE-ADOPTION-V1` | 서비스 코드 | 없음 | P6·P7 | 불필요 |

> **WO-5 는 `IR-...-OPERATOR-CORE-...-AUDIT-V1 §15-2` 의 `WO-O4O-OPERATOR-MEMBERS-CONSOLE-CONTRACT-RELAXATION-V1` 과 동일 과제다.** 본 IR §11 H4 가 그 WO 의 입력 명세를 확정했다(완화 5 + 신규 계약 1 + 신규 capability 1 + 조립 지점 1 + 불필요 2).

**원칙 준수**: 7 WS 모두 ① 한 번에 하나의 공통 계약 또는 화면군 ② 공통 package 변경은 WS-5 단 1건 ③ 기존 3서비스 회귀 검증 대상도 WS-5 뿐 ④ PharmacyHub 고유 로직(P8 전체·supplier 정책)은 어느 WS 도 건드리지 않음 ⑤ **축 C(legacy 정비)와 혼합 없음** — `operator-core` 은퇴·`auth-context` 포지션은 어느 WS 에도 포함하지 않았다.

---

## 21. 위험 · 중지 조건

### 21.1 위험

| # | 위험 | 심각도 | 완화 |
|:-:|------|:---:|------|
| R-1 | WS-5 계약 완화가 기존 3서비스 members 콘솔을 깨뜨림 | **높음** | 전 완화가 additive(기본값 = 현행). `hasDelete` 선례 패턴 재사용. `SHARED-MODULE-CHANGE-PROTOCOL` 전 절차 + 3서비스 smoke |
| R-2 | WS-6 채택 시 `/operator/memberships/:id` route 소멸 → 데드링크 | 중 | 목록 링크·MembershipGate 안내와 함께 정리. `PROTOCOL` §4-4/5 확인 |
| R-3 | Dockerfile COPY / tailwind glob 누락으로 빌드 실패 | 중 | 패키지 추가 시 **package.json COPY + source COPY + build + tailwind content 4곳** 동시 반영 (§3.4) |
| R-4 | 공통 컴포넌트가 금액을 클라이언트 재계산 | **높음** | `pharmacyHubOrders.ts:9-12` 계약 — 서버 응답 그대로 표시. WS-1/WS-7 필수 제약 (§15.2) |
| R-5 | `store-ui-core`/`store-products-ui` 를 이름 유사성으로 강제 채택 | 중 | §12·§14.2 — 약국 경영자는 **구매자**. 판정은 `NOT_APPLICABLE`/`INSUFFICIENT_EVIDENCE` |
| R-6 | `pharmacy` 문자열 검색으로 GlycoPharm/KPA/Signage 침범 | **높음** | §2.2 — in-scope 17 파일 목록 고정. 경로 기준으로만 범위 설정 |
| R-7 | 축 B(adoption)와 축 C(legacy)의 혼합 | 중 | §20 — 어느 WS 도 `operator-core`/`auth-context` 를 포함하지 않음 |

### 21.2 중지 조건 대조 (WO §23)

| 조건 | 발생 여부 |
|------|:---:|
| 다른 세션 WIP 와 충돌 | ✗ — WIP 5건 무접촉, 경로 무관. 조사 중 base commit 2 전진했으나 조사 범위 무침범 (§1.1) |
| route ↔ 화면 연결 확인 불가 | ✗ — `App.tsx` 21 route 전수 확인 |
| backend endpoint ↔ frontend 소비 관계 불명확 | ✗ — 전수 대조 완료. **소비 0 endpoint 7건도 식별**(§4.3) |
| 회원관리 데이터 모델 확인 불가 | ✗ — SQL 전문 확인(§11 H1) |
| 진행 중 PharmacyHub 구현 작업과 충돌 | ✗ — PharmacyHub 경로에 WIP 없음 |
| **공통 package 계약을 코드 변경 없이 판단 불가** | **△ 부분 발생** — `store-products-ui`(§14.2) · `store-ui-core` 상태 badge(§15.1) · `content-editor` `ContentRenderer`(§14.3) · `auth-context`(§7) **4건은 `INSUFFICIENT_EVIDENCE` 로 남기고 결론을 내리지 않았다** |
| 서비스 고유 정책을 공통 core 로 오인할 위험 | **△ 관리됨** — §12(약국=구매자) · §13(공급자=opt-in 층) · §16(NOT_APPLICABLE 5건)에서 명시적으로 차단 |
| 조사 범위가 구현으로 확대 | ✗ — 코드 변경 0 |

### 21.3 미확정 사항 (결론 내리지 않음)

1. `@o4o/store-products-ui` 의 PharmacyHub B2B offer 목록 적합성 — WS-4 조사 필요
2. `@o4o/store-ui-core` `BuyerOrderStatusBadge`/`buyerCheckoutStatus` 의 `supplierNotified` 축 수용 여부
3. `@o4o/content-editor` `ContentRenderer` 의 공급자 HTML 설명 렌더 대응 (§14.3)
4. 서비스별 `AuthContext.tsx` 4중 병존 (선행 IR R4·R5 — PharmacyHub 단독 판단 불가)
5. PharmacyHub 전역 header/footer 도입 여부 — 서비스 판단 사항
6. `/service-info`·`/me/access` 2 endpoint 의 정리 여부 (§4.3)

---

## 22. 후속 WO

| 순위 | 문서 | 성격 | 근거 |
|:---:|------|------|------|
| 1 | `WO-O4O-PHARMACY-HUB-DESIGN-CORE-AND-ERROR-CONTRACT-ADOPTION-V1` (WS-1) | 서비스 코드 | §19 B1 — 효과 최대·위험 최소·계약 변경 0 |
| 2 | `WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-ADOPTION-V1` (WS-2) | 서비스 코드 | §19 B5 |
| 3 | `IR-O4O-PHARMACY-HUB-PRODUCT-UI-CORE-FIT-V1` (WS-4) | read-only | §14.2 · §21.3-1·2 |
| 4 | `WO-O4O-OPERATOR-MEMBERS-CONSOLE-CONTRACT-RELAXATION-V1` (WS-5) | **공유 모듈** | §11 H4 · §18 C1~C3. 선행 IR §15-2 와 동일 과제 |
| 5 | `WO-O4O-PHARMACY-HUB-OPERATOR-MEMBERS-ADOPTION-V1` (WS-6) | 서비스 코드 | 4 완료 후 |
| 6 | `WO-O4O-PHARMACY-HUB-PUBLIC-HOME-TEMPLATE-ADOPTION-V1` (WS-3) | 서비스 코드 | §19 B2 |
| 7 | `WO-O4O-PHARMACY-HUB-SUPPLIER-AND-PRODUCT-PRIMITIVE-ADOPTION-V1` (WS-7) | 서비스 코드 | 3 완료 후 |
| (별도 축) | `WO-O4O-OPERATOR-UX-CORE-SERVICEKEY-REALIGNMENT-V1` | 위생 | §10.4 — **adoption 선행 조건 아님** |

**첫 구현 WO 권고**: **WS-1**. 이유 — 공통 package 변경 0 · 기존 3서비스 회귀 검증 불필요 · PharmacyHub 단독 범위 · 20/26 파일 정리 · `DESIGN-CORE-GOVERNANCE` 부정합(선행 IR §17.1) 해소.

---

## 23. 코드 · DB 변경 0 확인

| 항목 | 결과 |
|------|------|
| 코드 변경 | **0** — 조사 중 파일 수정/생성 없음 (본 IR 문서 1건 제외) |
| package / dependency 변경 | **0** |
| `pnpm-lock.yaml` | **0** |
| route 변경 | **0** |
| 기능 변경 | **0** |
| 공통 패키지 계약 변경 | **0** — members 계약 완화는 **제안만**, 구현 없음 |
| UI 교체 / 화면 전환 | **0** |
| DB 조회 / write | **0** — 프로덕션·로컬 DB 접속 없음 |
| migration | **0** |
| 배포 | **0** |
| **GlycoPharm 접촉** | **0** — 조사·비교·수정 없음. 판정 근거로도 미사용 (§2.2) |
| **다른 세션 WIP 접촉** | **0** — `otc-zh-batch01-verify.ga.json` 무접촉 (§1) |
| `pnpm install` / 전체 build | **미실행** |
| 기준 문서 수정 | **0** — 조사 결과 기준 문서의 PharmacyHub 기재에 **명백한 오류는 없었고**, 정밀화 사항은 본 IR §18.1 에 기록하는 방식으로 처리했다(WO §21.2 의 "명백히 부족하거나 잘못된 경우에만" 조건 미충족) |

---

*Date: 2026-08-03 · read-only adoption scope audit · 조사 기준 HEAD `9efba8fca` (커밋 시점 `dd792c64e`, 범위 무침범) · frontend 26파일 3,745L + backend 17파일 3,293L 전수 · 화면 21건 × 화면군 10 × 판정값 14 · 공통 패키지 14종 대응 매트릭스 · 코드/package/route/DB/배포 변경 0 · GlycoPharm 무접촉 · 병렬 세션 WIP 무접촉.*
