# IR-O4O-PHARMACY-HUB-STORE-MANAGEMENT-BASELINE-AND-GAP-V1

> **조사 전용 문서.** 코드 변경 0 / DB write 0 / migration 0 / 배포 0.
> 작성일: 2026-08-03 · 기준 HEAD: `e250eb0bb` · 브랜치: `main`

---

## 0. 결론 요약

| 항목 | 값 |
|---|---|
| KPA `내 매장` 기준 기능 (사이드바 노출) | **25** |
| KPA `내 매장` hidden/deep route 기능 | **18** |
| 매장 HUB(수신) 기능 | **12** |
| 공개 매장/키오스크 기능 | **7** |
| 계정·마이페이지 기능 | **10** |
| **KPA 기준 기능 총계** | **72** |
| Pharmacy-Hub 구현 (매장 경영 축) | **8** (전부 B2B 구매·주문·결제) |
| Pharmacy-Hub 누락 (기본 기능) | **64** |
| 직접 재사용 가능한 공통 Core | **6 패키지** |
| adapter/config 필요 | **5 지점** |

**핵심 판정 3줄:**

1. Pharmacy-Hub 에는 **매장 주체(store subject)가 존재하지 않는다.** 승인 시 `organizations` / `organization_members` / `platform_store_slugs` 를 만들지 않으므로, 조직 축(organizationId)에 걸린 O4O 매장 경영 기능 **전량이 물리적으로 실행 불가**다. → 최우선 선행 조건.
2. 선행 IR (`IR-O4O-PHARMACY-HUB-COMMON-CORE-ADOPTION-SCOPE-V1`) 의 `store-ui-core / account-ui / Tablet·POP·QR NOT_APPLICABLE` 판정은 **"채택 대상 화면이 없다"는 관점에서는 정확**하지만, 본 WO 의 판정축(**O4O 매장 경영자 기본 기능**)에서는 **MISSING_BASE_FUNCTION 으로 재분류**한다. (§5)
3. 이미 구현된 B2B 장바구니·주문·결제는 **구매자 축(buyerId)이 KPA 공통 축과 동일**하다. 드리프트가 아니라 정당한 extension 이며, 매장 셸 안으로 **메뉴 편입만** 하면 된다. (§8)

---

## 1. 조사 범위·근거

| 축 | 확인한 실체 |
|---|---|
| Frontend | [services/web-kpa-society/src/App.tsx](services/web-kpa-society/src/App.tsx) · [services/web-k-cosmetics/src/App.tsx](services/web-k-cosmetics/src/App.tsx) · [services/web-pharmacy-hub/src/App.tsx](services/web-pharmacy-hub/src/App.tsx) |
| 공통 메뉴 SSOT | [packages/store-ui-core/src/config/storeMenuConfig.ts](packages/store-ui-core/src/config/storeMenuConfig.ts) |
| 공통 셸 | [packages/store-ui-core/src/layout/StoreDashboardLayout.tsx](packages/store-ui-core/src/layout/StoreDashboardLayout.tsx) |
| 공통 가드(FE) | [packages/store-ui-core/src/auth/StoreOwnerGuard.tsx](packages/store-ui-core/src/auth/StoreOwnerGuard.tsx) |
| 공통 가드(BE) | [apps/api-server/src/utils/store-owner.utils.ts](apps/api-server/src/utils/store-owner.utils.ts) |
| 매장 주체 프로비저닝 | [apps/api-server/src/routes/kpa/controllers/member.controller.ts:620-780](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L620-L780) |
| PH 백엔드 | [apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts](apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts) · [apps/api-server/src/controllers/pharmacy-hub/](apps/api-server/src/controllers/pharmacy-hub/) |
| 공통 매장 API | [apps/api-server/src/routes/o4o-store/controllers/](apps/api-server/src/routes/o4o-store/controllers/) (35개) · [apps/api-server/src/routes/platform/store-*.routes.ts](apps/api-server/src/routes/platform/) |
| 선행 IR | [docs/investigations/IR-O4O-PHARMACY-HUB-COMMON-CORE-ADOPTION-SCOPE-V1.md](docs/investigations/IR-O4O-PHARMACY-HUB-COMMON-CORE-ADOPTION-SCOPE-V1.md) |

**규모 대비:** Pharmacy-Hub `src` = **25 파일**. KPA `내 매장` 관련 tsx 만 **53 파일**, `App.tsx` 단독 1,100+ 행.

---

## 2. KPA `내 매장` 기능 전체 목록 (기준선)

### 2-1. 사이드바 노출 25건 — `KPA_SOCIETY_STORE_CONFIG`

| # | 그룹 | 기능 | route | 성격 |
|---:|---|---|---|---|
| 1 | — | 홈 (대시보드) | `/store` | 공통 |
| 2 | 약국 상품·거래 | O4O 제품 | `/store/commerce/products` | 공통 |
| 3 | 〃 | 매장 경영활용 제품 | `/store/handled-products` | 공통 |
| 4 | 〃 | 매장 자체 상품 | `/store/commerce/local-products` | 공통 |
| 5 | 〃 | 발주 내역 (buyer) | `/store/commerce/orders` | 공통 |
| 6 | 〃 | 판매자 모집 | `/store/commerce/seller-recruitments` | KPA 전용 |
| 7 | 〃 | 신청·승인 현황 | `/store/commerce/recruitment-applications` | 공통 |
| 8 | 약국 경영지원 | 상품 설명 | `/store/marketing/product-descriptions` | 공통 |
| 9 | 〃 | 블로그 | `/store/content/blog` | 공통 |
| 10 | 〃 | POP | `/store/marketing/pop` | 공통 |
| 11 | 〃 | QR-code | `/store/marketing/qr` | 공통 |
| 12 | 〃 | 태블렛 화면 제작 | `/store/commerce/tablet-displays` | 공통 |
| 13 | 약국 자료함 | 콘텐츠 | `/store/library/contents` | 공통 |
| 14 | 〃 | 자료 | `/store/library/resources` | 공통 |
| 15 | 디지털 사이니지 | 플레이리스트 | `/store/marketing/signage/playlist` | 공통 |
| 16 | 〃 | 동영상 | `/store/marketing/signage/videos` | 공통 |
| 17 | 〃 | 스케줄 | `/store/marketing/signage/schedules` | 공통 |
| 18 | 〃 | TV 재생 | `/store/marketing/signage/player` | 공통 |
| 19 | 온라인 판매 | 판매 설정 | `/store/online-sales/settings` | 공통 |
| 20 | 〃 | 판매 상품 | `/store/online-sales/products` | 공통 |
| 21 | 〃 | 주문 관리 (seller) | `/store/online-sales/orders` | 공통 |
| 22 | 판매 채널 확장 | 외국인 여행객 판매지원 | `/store/sales-channels/foreign-visitor` | 공통(유료 게이트) |
| 23 | 분석 | 마케팅 분석 | `/store/analytics/marketing` | 공통 |
| 24 | 설정 | 약국 정보 | `/store/info` | 공통 |
| 25 | 설정 | 매장 홈 디자인 | `/store/settings` | 공통 |

### 2-2. hidden / deep route 18건

`my-products` · `requests`(상담 요청) · `content`(StoreAssetsPage) · `content/pop` · `content/video` · `content/direct/:id` · `content/:snapshotId/edit` · `library/production-materials/:id/edit` · `products/multilingual/:targetKind/:targetId` · `commerce/products/b2c` · `commerce/products/:productId/marketing` · `commerce/products/:productId/pop` · `commerce/order-worktable` · `marketing/qr/ai-description` · `marketing/signage/playlist/new` · `marketing/signage/play/:playlistId` · `sales-channels/foreign-visitor/partners[/:id/qr-codes]` · `online-sales/orders/:orderId`

### 2-3. 매장 HUB(수신) 12건 — `/store-hub/*`

`index` · `b2b` · `signage` · `event-offers` · `cart` · `content` · `blog` · `pop` · `qr` · `video` · `screen-set` · `multilingual-product-contents[/my]`

### 2-4. 공개 매장·키오스크 7건

`/store/:slug` · `/store/:slug/products/:id` · `/checkout` · `/payment/success` · `/payment/fail` · `/store/:slug/blog[/:postSlug]` · `/tablet/:slug`

### 2-5. 계정·마이페이지 10건

`/mypage` · `profile` · `settings` · `certificates` · `my-forums` · `my-requests` · `qualifications` · `enrollments` · `credits` · 알림(`NotificationBell`)

---

## 3. K-Cosmetics 공통 기능 목록 (교차 검증축)

`COSMETICS_STORE_CONFIG` 및 [services/web-k-cosmetics/src/App.tsx:775-865](services/web-k-cosmetics/src/App.tsx#L775-L865) 기준. **KPA 와 동일한 `/store` nested canonical 구조**를 사용한다.

| 축 | K-Cos | KPA | 판정 |
|---|---|---|---|
| 셸 | `StoreDashboardLayout` + `COSMETICS_STORE_CONFIG` | 동일 + `KPA_SOCIETY_STORE_CONFIG` | **REUSABLE_COMMON_CORE** |
| 가드 | `StoreOwnerGuard(serviceKey='cosmetics')` | `StoreOwnerGuard(serviceKey='kpa')` | **REUSABLE_COMMON_CORE** |
| 홈 | `StoreCockpitPage` | `StoreHomePage` (+`StoreHomeShell`) | 공통 셸, 서비스별 페이지 |
| 매장/사업자 정보 | `/store/info` `StoreInfoPage` | `/store/info` `PharmacyInfoPage` | **REUSABLE_COMMON_CORE** (organizations SSOT) |
| 상품·자체상품·주문 | `commerce/*` 동일 경로 | 동일 | 공통 |
| POP/QR/블로그/사이니지/태블릿 | `marketing/*`·`content/*`·`commerce/tablet-displays` | 동일 | 공통 |
| 자료함 | `library/{contents,resources,production-materials,product-descriptions}` | 동일(일부 KPA 숨김) | 공통 |
| 고유 기능 | `interest-requests` (관심 요청) | `seller-recruitments`, `online-sales/*`, `store-hub/*` | 각 도메인 전용 |

**→ "매장 경영 공통 기능"의 실체는 KPA 단독 정의가 아니라 KPA↔K-Cos 2축 교집합으로 이미 검증돼 있다.** 이 교집합이 Pharmacy-Hub 가 충족해야 할 최소선이다.

---

## 4. Pharmacy-Hub 현재 구현 기능

### 4-1. 전체 라우트 (App.tsx)

| # | route | 화면 | 판정 |
|---:|---|---|---|
| 1 | `/` | HomePage — 브랜드 + 역할 3진입점 | `PHARMACYHUB_B2B_EXTENSION` 골격 |
| 2 | `/login` | LoginPage | 기반 |
| 3 | `/join` | JoinPage — 역할 선택 + 최소 프로필 | `ALREADY_IMPLEMENTED` |
| 4 | `/join/status` | JoinStatusPage | `ALREADY_IMPLEMENTED` |
| 5 | `/store-owner` | **RoleEntryPage** — 텍스트 + 링크 3개 | **MISSING_BASE_FUNCTION** (대시보드 아님) |
| 6 | `/supplier` | RoleEntryPage | 공급자 축 |
| 7 | `/operator` | RoleEntryPage | 운영자 축 |
| 8 | `/operator/memberships[/:id]` | 가입 승인 콘솔 | `ALREADY_IMPLEMENTED` |
| 9 | `/supplier/products` | 상품 제공 설정 | 공급자 축 |
| 10 | `/store-owner/products[/:offerId]` | 공급 상품 목록·상세 | **ALREADY_IMPLEMENTED** |
| 11 | `/store-owner/cart` | 장바구니 | **ALREADY_IMPLEMENTED** |
| 12 | `/store-owner/orders[/:orderId]` | 주문 목록·상세 | **ALREADY_IMPLEMENTED** |
| 13 | `/store-owner/payment[/success\|/fail]` | 결제 3화면 | **ALREADY_IMPLEMENTED** |

### 4-2. 매장 경영 축으로 집계한 구현 8건

공급 상품 탐색 / 상품 상세 / 장바구니 / 주문 생성 / 주문 목록 / 주문 상세 / 결제 / 결제 결과.
**전부 §7 "공급 상품 탐색·구매" + "장바구니·주문·결제" 영역에만 존재한다.**

### 4-3. 프론트 패키지 채택 현황

```
services/web-pharmacy-hub/package.json dependencies:
  @o4o/auth-client, @o4o/auth-utils, react, react-dom, react-router-dom
```

KPA 는 `@o4o/` 패키지 **23개** 사용. Pharmacy-Hub 는 **2개**.
→ `@o4o/ui` · `@o4o/error-handling` · `@o4o/account-ui` · `@o4o/store-ui-core` · `@o4o/store-products-ui` · `@o4o/types` **전부 미채택**. 공통 헤더/푸터/사이드바/토스트/에러바운더리/테이블 **0**.

---

## 5. 기존 판정 재검토 (WO §"반드시 재검토할 기존 판정")

| 기존 판정 | 근거 | 본 IR 재판정 | 사유 |
|---|---|---|---|
| store-owner 전용 대시보드 0 | 화면 없음 | **MISSING_BASE_FUNCTION** | O4O 매장 경영자에게 대시보드는 선택이 아니라 기본. KPA·GP·K-Cos 3서비스 모두 보유. `RoleEntryPage` 는 "후속 WO 예정"을 나열한 골격일 뿐이다. |
| account 화면 0 | 화면 없음 | **MISSING_BASE_FUNCTION** | 내 정보·비밀번호 변경·알림은 로그인 사용자 기본 기능. `@o4o/account-ui` 에 `ProfileCard` / `SecuritySection` / `PasswordChangeModal` / `NotificationBell` / `MyPageLayout` 실재. |
| `store-ui-core` NOT_APPLICABLE | 대응 화면 없음 | **REUSABLE_COMMON_CORE + NEEDS_ADAPTER** | 화면 부재가 곧 불필요는 아니다. `StoreDashboardLayout` 은 config 주입만으로 동작하며 3서비스가 이미 소비 중. `PHARMACY_HUB_STORE_CONFIG` 신설이 유일한 추가 작업. |
| `account-ui` NOT_APPLICABLE | 대응 화면 없음 | **REUSABLE_COMMON_CORE** | 위와 동일. 화면 신설 시 그대로 소비 가능. |
| Tablet·POP·QR·Store execution NOT_APPLICABLE | 화면 없음 | **MISSING_BASE_FUNCTION (단, 선행조건 미충족)** | 매장 실행 자산은 O4O 사업 철학(공급자 자료 → 매장 실행 자산)의 핵심. 다만 **§6-1 매장 주체 부재로 지금은 착수 불가**. |

> **판정 규칙 준수:** 위 재분류는 전부 "O4O 매장 경영자에게 기본적으로 필요한가"라는 WO 판정 기준에 따른 것이며, 선행 IR 이 답한 질문("현재 코드에 채택 가능한 공통 Core 대응물이 있는가")과 **질문이 다르다**. 선행 IR 을 오류로 보지 않는다.

---

## 6. 누락된 기본 기능 (MISSING_BASE_FUNCTION)

### 6-1. 【최우선·차단】 매장 주체(store subject) 프로비저닝 부재

**KPA 승인 시 실행되는 5단계** ([member.controller.ts:646-770](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L646-L770)):

```
1) organizations ensure  (type='pharmacy', code=`kpa-pharm-{businessNumber}`)
2) kpa_members.organization_id 보정
3) organization_members(role='owner') 추가
4) role_assignments('kpa:store_owner') 부여
5) platform_store_slugs 예약 (공개 매장/QR/태블릿 slug)
```

**Pharmacy-Hub 승인 시 실행되는 것** ([PharmacyHubMembershipConsoleController.ts](apps/api-server/src/controllers/pharmacy-hub/PharmacyHubMembershipConsoleController.ts)):

```
service_memberships(active) + users + role_assignments(멱등 upsert)
→ organizations 없음 · organization_members 없음 · platform_store_slugs 없음
```

가입 시 `businessName` 은 **`users.businessInfo` JSONB 텍스트로만** 저장된다 ([auth-register.controller.ts:880-907](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L880-L907)).

**귀결:** 공통 매장 API 는 전부 `resolveStoreAccess()` → `organization_members` 조회로 `organizationId` 를 얻는다. Pharmacy-Hub 경영자는 이 row 가 없으므로 **`organizationId = null`** 이며, 매장 정보·상품·콘텐츠·QR·POP·태블릿·사이니지·공개 매장 **전부 실행 불가**다.

### 6-2. 누락 기능 목록 (64건)

| 영역 | 누락 기능 | 판정 |
|---|---|---|
| **매장 셸** | 사이드바 · 헤더 · 푸터 · 매장 홈 대시보드 | MISSING_BASE_FUNCTION |
| **매장 정보** | 매장/사업자 정보 조회·수정 (`/store/info` 대응) | MISSING_BASE_FUNCTION |
| **계정** | 내 정보 · 비밀번호 변경 · 알림 · 내 요청함 | MISSING_BASE_FUNCTION |
| **설정** | 매장 홈 디자인 / 템플릿 / 공개 storefront | MISSING_BASE_FUNCTION |
| **취급 상품** | 매장 경영활용 제품 · 매장 자체 상품 · 취급 등록 | MISSING_BASE_FUNCTION |
| **콘텐츠** | 자료함(콘텐츠/자료) · 매장 콘텐츠 · 블로그 | MISSING_BASE_FUNCTION |
| **실행 자산** | QR · POP · 태블릿 화면 · 사이니지(4) · 상품 설명 | MISSING_BASE_FUNCTION |
| **HUB 수신** | 공급자/운영자 자료 진열·가져가기 (12건 축) | MISSING_BASE_FUNCTION |
| **분석** | 마케팅 분석 | MISSING_BASE_FUNCTION |
| **판매** | 온라인 판매(B2C) 3건 | 정책 확정 필요 — §7 참조 |

---

## 7. 직접 재사용 가능한 공통 Core (REUSABLE_COMMON_CORE)

| 패키지 | 재사용 대상 | 직접 재사용 가능성 | 비고 |
|---|---|---|---|
| `@o4o/store-ui-core` | `StoreDashboardLayout` · `StoreSidebar` · `StoreTopBar` · `StoreHomeShell` · `StoreLocalProductsManager` · `SupplyCatalogHub` · `EventOffersHubList` · `BuyerOrderStatusBadge` · `buyerCheckoutStatus` · `MediaPickerModal` · `StoreProductionMaterialsView` · `ProductionMaterialEditorShell` · `StartProductionModal` | **가능** — config/adapter 주입형 | `PHARMACY_HUB_STORE_CONFIG` 신설 필요(§8) |
| `@o4o/account-ui` | `MyPageLayout` · `MyPageNavigation` · `ProfileCard` · `SecuritySection` · `PasswordChangeModal` · `NotificationBell` · `MyRequestsInbox` · `BusinessRegistrationFields` · `GlobalUserProfileDropdown` | **가능** | 화면 신설과 동시 채택 |
| `@o4o/store-products-ui` | `StoreProductsManagerPage`(문구 prop 주입) · `StoreProductImageManagerModal` | **가능** | KPA·K-Cos 동일 컴포넌트를 라벨만 바꿔 사용 중 — 검증된 패턴 |
| `@o4o/ui` | `DataTable` · `BaseTable` · `AddressSearch` · `ConfirmActionDialog` 등 primitive | **가능** | 현재 `<table>` 수동 HTML 4개소 대체 |
| `@o4o/error-handling` | `O4OErrorBoundary` · `O4OToastProvider` | **가능** | 현재 전무 |
| `@o4o/types` | 상품·주문·매장 canonical 타입 | **부분** — offer 축 타입 대응은 미확인 | `INSUFFICIENT_EVIDENCE` (선행 IR §294 와 동일) |

**백엔드 재사용 가능 (조직 축 확보 후):**
`/api/v1/store/*` (local-products · tablet · handled-products · library · product-requests · channel-products · cart) · `/api/v1/pharmacy/info` · `o4o-store` 컨트롤러 35개 · `store-entitlement` · `store-ai`.
**모두 서비스 중립적으로 작성돼 있으며 `organizationId` 만 요구한다.**

---

## 8. adapter / config 가 필요한 기능 (NEEDS_ADAPTER)

| # | 지점 | 현재 | 필요 작업 | 성격 |
|---:|---|---|---|---|
| A1 | [store-owner.utils.ts:37-56](apps/api-server/src/utils/store-owner.utils.ts#L37-L56) | `STORE_OWNER_ROLES_BY_SERVICE` = `{kpa, glycopharm, cosmetics}` · `STORE_OWNER_SCOPE_TO_MEMBERSHIP_KEY` 동일 3키 · `ALL_STORE_OWNER_ROLES` 도 3서비스 합집합 | `pharmacy-hub: ['pharmacy-hub:store_owner']` + membership key `'pharmacy-hub'` 추가 | **공용 모듈 변경 — Shared Module Change Protocol 적용 대상** |
| A2 | [StoreOwnerGuard.tsx:50-72](packages/store-ui-core/src/auth/StoreOwnerGuard.tsx#L50-L72) | `SERVICE_ROLES` = 3키. `StoreOwnerServiceKey` 타입도 3값 | `'pharmacy-hub'` 엔트리 추가 | 공용 패키지 |
| A3 | [storeMenuConfig.ts](packages/store-ui-core/src/config/storeMenuConfig.ts) | 3개 서비스 config | `PHARMACY_HUB_STORE_CONFIG` 신설 (basePath `/store-owner` 또는 `/store` 확정 필요) | 신규 추가(기존 무영향) |
| A4 | 매장 셸 wrapper | 없음 | `PharmacyHubStoreLayoutWrapper` (KPA `KpaStoreLayoutWrapper` / K-Cos `StoreLayoutWrapper` 패턴) | 서비스 코드 |
| A5 | Capability | KPA `useStoreCapabilities` + `resolveStoreMenu` | Pharmacy-Hub capability 소스 정의 또는 필터 미적용 결정 | 정책 결정 필요 |

> **A1·A2 경고:** 두 파일은 KPA / GlycoPharm / K-Cosmetics 3서비스가 공유하는 **공통 가드 SSOT** 다. 수정 시 `docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md` 절차(전체 소비처 식별 → 4서비스 영향 확인)를 반드시 선행해야 하며, Pharmacy-Hub-only 임시 분기로 해결해서는 안 된다.

---

## 9. 업종별 전용 기능 (적용하지 않을 것)

| 기능 | 소유 | 판정 |
|---|---|---|
| 판매자 모집 / 신청 (`seller-recruitments`) | KPA | `KPA_DOMAIN_ONLY` — backend proxy 가 `kpa-society` 고정 |
| 분회(kpa_members) · 약사 면허 · 자격 | KPA | `KPA_DOMAIN_ONLY` |
| 커뮤니티 포럼 · LMS · 자료실 | KPA | `KPA_DOMAIN_ONLY` (Pharmacy-Hub 는 "후속 WO 예정"으로만 기재) |
| 외국인 여행객 판매지원 | KPA/K-Cos 공통(유료 게이트) | `NOT_REQUIRED_BY_CONFIRMED_POLICY` — 현 Pharmacy-Hub 범위 밖 |
| 관심 요청 (`interest-requests`) | K-Cosmetics | `COSMETICS_DOMAIN_ONLY` |
| 화장품 셀러 extension | K-Cosmetics | `COSMETICS_DOMAIN_ONLY` |
| 의약품 취급·규제 유형 탭(DRUG/HFF/QUASI) | Pharmacy-Hub 고유(약국 맥락) | `PHARMACYHUB_B2B_EXTENSION` |

> **온라인 판매(B2C) 3건**은 KPA·K-Cos 공통이나, Pharmacy-Hub 의 서비스 정의(공급자 ↔ 약국 **직접 연결**)에 B2C 판매가 포함되는지 **명시된 정책 문서가 없다**. → `INSUFFICIENT_EVIDENCE`. 5단계 착수 전 정책 확정 필요.

---

## 10. Pharmacy-Hub B2B extension (유지 대상)

| 기능 | 경계축 | KPA 공통 대응 | 판정 |
|---|---|---|---|
| 장바구니 | `buyerId + serviceKey='pharmacy-hub'` · `store_cart_items` | KPA `/api/v1/store/cart/kpa-society/*` · **동일 테이블·동일 축** | `PHARMACYHUB_B2B_EXTENSION` — 축 정합 확인됨 |
| 주문 | `checkout_orders.metadata->>'serviceKey'` + `buyerId` | KPA `/checkout/orders` · **동일 테이블·동일 축** | 동일 |
| 결제 | `paymentGroupId` 다공급자 1회 결제 | KPA 미보유 | 고유 — `DO_NOT_UNIFY` |
| 공급자 주문 처리 (accept/ship) | 3중 guard + supplier 소유 | Neture 공급자 축 | 고유 |
| 운영자 fulfillment 복구 | operator scope | 없음 | 고유 |
| 상품 제공 설정 (`service_keys` opt-in) | supplier | Neture `SupplierProductOffer` 재사용 | 재사용 완료 |

**중요:** PH 가 공용 `/api/v1/store/cart/:serviceKey/*` 대신 자체 네임스페이스를 둔 이유는 **"공용 라우트가 인증만 요구하고 Pharmacy-Hub membership·역할을 확인하지 않기 때문"** 이라고 라우트 파일에 명시돼 있다. 저장 SSOT(`store_cart_items` / `checkout_orders`)는 하나이므로 **SSOT 이원화가 아니다.** 다만 A1 어댑터 적용 후에는 공용 라우트로 수렴시킬지 재판정할 가치가 있다(중복 계약 축소).

---

## 11. 단계별 구현 순서

```
0단계 (차단 해제) — 매장 주체 확립                     ★ 선행 필수
   organizations ensure + organization_members(owner)
   + platform_store_slugs + role_assignments
   → PharmacyHub 승인 흐름에 KPA 5단계 패턴 이식

1단계 — 공통 가드·셸 어댑터                            (A1·A2·A3·A4)
   store-owner.utils / StoreOwnerGuard / STORE_CONFIG / LayoutWrapper
   + @o4o/ui · @o4o/error-handling 채택

2단계 — 매장 경영자 홈(대시보드)                        StoreHomeShell 기반

3단계 — 매장 정보 · 계정 · 설정                         /info · MyPage · 매장 홈 디자인

4단계 — 기존 B2B 구매·주문·결제 셸 편입                 route 이동 + 사이드바 등재

5단계 — 매장 취급 상품                                  handled-products · local-products

6단계 — 매장 콘텐츠 · 자료함                            library · blog

7단계 — QR · POP · 태블릿 · 사이니지 · 상품 설명        실행 자산 (0단계 slug 의존)

8단계 — HUB 수신(진열·가져가기)                         공급자/운영자 자료 흐름

9단계 — 완료 재감사                                     데드링크 0 / 기능 은폐 0 검증
```

**순서 근거:** 0단계 없이 1~8단계 어느 것도 실동작하지 않는다(§6-1). 4단계를 5단계보다 앞에 둔 이유는 **이미 동작하는 기능이 셸 밖에 떠 있는 상태가 가장 큰 UX 부채**이기 때문이다.

---

## 12. 후속 구현 WO 목록

| # | WO(안) | 범위 | 선행 |
|---:|---|---|---|
| W1 | `WO-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1` | 승인 시 organizations/organization_members/slug/role 5단계 | — |
| W2 | `WO-O4O-STORE-OWNER-GUARD-PHARMACY-HUB-REGISTRATION-V1` | A1+A2 공용 가드 SSOT 확장 (**Shared Module Change Protocol 필수**) | W1 |
| W3 | `WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1` | A3+A4 + `@o4o/ui`·`error-handling` 채택 | W2 |
| W4 | `WO-PHARMACY-HUB-STORE-HOME-DASHBOARD-V1` | `StoreHomeShell` 기반 매장 홈 | W3 |
| W5 | `WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1` | `/info` + MyPage(account-ui) | W3 |
| W6 | `WO-PHARMACY-HUB-B2B-INTO-STORE-SHELL-V1` | 기존 8기능 셸 편입 + 사이드바 등재 | W3 |
| W7 | `WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1` | 취급 상품 2축 | W1·W3 |
| W8 | `WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1` | 자료함·콘텐츠·블로그 | W7 |
| W9 | `WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1` | QR·POP·태블릿·사이니지·상품 설명 | W1(slug)·W8 |
| W10 | `WO-PHARMACY-HUB-STORE-HUB-RECEIVE-V1` | HUB 진열·가져가기 | W9 |
| W11 | `WO-PHARMACY-HUB-STORE-COMPLETION-AUDIT-V1` | 데드링크 0 / 기능 은폐 0 재감사 | W10 |
| **W0** | *(정책 결정)* 온라인 판매(B2C) 포함 여부 · Capability 소스 · basePath(`/store` vs `/store-owner`) | 조사 아님, 결정 사항 | — |

---

## 13. 서비스 공통화 재개 전 완료 기준

Pharmacy-Hub 를 4번째 공통화 축으로 편입하기 전 **반드시 충족**해야 할 조건:

```
C1  매장 주체가 실재한다
      pharmacy-hub 경영자 승인 → organizations + organization_members(owner)
      + platform_store_slugs 가 생성되고, resolveStoreAccess() 가 organizationId 를 반환한다.

C2  공통 가드 SSOT 에 등록돼 있다
      store-owner.utils.ts · StoreOwnerGuard.tsx 에 pharmacy-hub 가 정식 등록되고,
      기존 3서비스 회귀 0 이 검증됐다.

C3  매장 셸이 공통 Core 위에 있다
      StoreDashboardLayout + PHARMACY_HUB_STORE_CONFIG 로 렌더되며,
      서비스 자체 사이드바/레이아웃 사본이 없다.

C4  기존 B2B 기능이 셸 안에 있다
      /store-owner/{products,cart,orders,payment} 가 사이드바에서 도달 가능하고,
      셸 밖 고아 라우트가 0 이다.

C5  기본 4영역이 존재한다
      매장 홈 · 매장 정보 · 계정 · 매장 설정.

C6  데드링크 0 / 기능 은폐 0
      route 없는 메뉴 미노출, route 있는 실기능 메뉴 미은폐 (CLAUDE.md §1).

C7  SSOT 단일성
      매장 정보 = organizations, 장바구니 = store_cart_items,
      주문 = checkout_orders 로 유지되고 Pharmacy-Hub 전용 사본 테이블 0.
```

**C1~C4 미충족 상태에서 공통화(commonization)를 재개하면**, 공통 패키지가 "조직 축이 없는 서비스"를 수용하도록 변형되어 기존 3서비스의 조직 축 계약이 약화된다. 이는 CLAUDE.md §7 Boundary Policy(Store Ops = `organizationId`) 위반 방향이다.

---

## 14. 미확정 사항 (INSUFFICIENT_EVIDENCE)

| 항목 | 사유 |
|---|---|
| 온라인 판매(B2C) 포함 여부 | Pharmacy-Hub 서비스 정의 문서에 B2C 언급 없음 |
| Capability 소스 | `fetchStoreCapabilities` 가 pharmacy-hub 를 인지하는지 미확인 |
| basePath (`/store` vs `/store-owner`) | 현 PH 는 `/store-owner`, 3서비스 공통은 `/store` — 정합 결정 필요 |
| `@o4o/types` offer 축 canonical 타입 대응 | 선행 IR §294 와 동일하게 미확인 |
| 공급자 콘텐츠 전달(비-상품) 경로 | `RoleEntryPage` 에 "후속 WO 예정"으로만 기재, 계약 미정의 |

---

## 15. 중지 조건 점검

| 조건 | 해당 여부 |
|---|---|
| 매장 주체 모델이 달라 직접 비교 불가 | **아니오 (조건부)** — 모델이 *다른* 것이 아니라 Pharmacy-Hub 에 *없다*. 비교는 가능했고, 부재 자체가 §6-1 결론이다. |
| 공통 Core ↔ 전용 코드 경계 불명확 | 아니오 — `packages/*` vs `services/*` 경계 명확 |
| 동일 기능 SSOT 둘 이상 | 아니오 — cart/order 는 API 네임스페이스만 둘, 저장 SSOT 는 하나 (§10) |
| 코드 변경 없이 확인 불가 | 아니오 — 전량 정적 근거로 판정 |
| 병행 세션 파일 수정 필요 | 아니오 — 미접촉 |

**→ 조사 완주. 범위 확대 없음.**

---

*작성: read-only investigation · 코드 0 / DB 0 / migration 0 / 배포 0*
