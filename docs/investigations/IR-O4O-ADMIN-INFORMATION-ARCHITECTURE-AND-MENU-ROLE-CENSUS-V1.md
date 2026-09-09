# IR-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-CENSUS-V1

> **WO**: WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 — **1단계 (전수조사)**
> **상태**: ACTIVE · **작성일**: 2026-09-09 · **대상**: `admin.neture.co.kr` (`apps/admin-dashboard`)
> **성격**: 조사 전용. 본 IR 은 코드를 변경하지 않는다. 2단계(정보구조 확정)의 입력이다.

---

## 0. 조사 방법 및 검증 채널

| 채널 | 사용 | 결과 |
|---|---|---|
| 정적 코드 분석 (메뉴·라우트·가드·API·엔티티) | ✅ | 전수 완료 |
| 백엔드 mount 대조 (`bootstrap/register-routes.ts`) | ✅ | 전수 완료 |
| **프로덕션 요청 로그** (`gcloud logging`, 30일, `referer:admin.neture.co.kr`) | ✅ | 운영 사용량 실측 완료 |
| 프로덕션 DB SELECT (Cloud SQL Auth Proxy) | ❌ **차단** | 터널은 성공, `o4o_api` password authentication failed — `apps/api-server/.env` 자격정보가 프로덕션과 불일치 (§7 중지 조건) |

> DB row-level 검증이 필요한 항목은 §5 에 `DB미검증` 으로 표시했다. 그 항목들도 **백엔드 mount 부재 / 404 실측 / 하드코딩 상수** 등 DB 없이 확정 가능한 근거로 판정했다.

---

## 1. 정본 확인 — 메뉴 진입점은 단일

```text
AdminSidebar.tsx → useAdminMenu() → adminMenuStatic  (admin/menu/admin-menu.static.tsx)
```

- `useAdminMenu` 는 `/api/v1/navigation/admin` 을 먼저 호출하지만, 그 백엔드는 **영구 stub** 이다
  (`routes/navigation.routes.ts:18` — `data: []`, `total: 0`, `context.phase: 'R1'`).
- 따라서 `dynamicMenuItems` 는 **항상 null**, `transformApiMenuItems` 는 **도달 불가 코드**이며
  `admin-menu.static.tsx` 가 **유일한 메뉴 SSOT** 다.
- 프로덕션에서 이 stub 은 30일간 **82회** 호출됐다(로그인마다 1회). 순수 낭비.
- `admin-menu.static.tsx:9` 가 참조하는 `docs/architecture/admin-goal-state-definition.md` 는 **존재하지 않는다.**
  저장소에 **현행 관리자 정보구조 기준 문서가 없다** (관련 문서는 전부 `docs/archive/**` 또는 `docs/checks/**` 기록물).

---

## 2. 총계

```text
ADMIN_MENU_TOTAL = 35 clickable
  ├─ 최상위 노드 16 (구분선 2 제외 → 14 navigable)
  │    · 그룹 8 : Core / O4O 상품 DB / Content / CMS / AppStore / Forum / Yaksa (KPA) / Digital Signage
  │    · 직접 leaf 6 : Overview · Ops Metrics · 플랫폼 HUB · 매장 네트워크 · 오프라인 매장 · Content Manager
  └─ 하위 leaf 29

ADMIN_ROUTE_TOTAL = 151 (routes/*.tsx 선언) + 약 75 (wildcard 하위 라우터 중첩)
  ├─ public       10  (로그인 3 · 진단 4 · 루트 1 · preview 1 · storefront 1)
  ├─ test         15
  └─ protected   126
  중첩 subtree(실측): cpt-engine 17 · cpt-acf 16 · digital-signage 11 · neture 10 · settings 5 ·
                     media 4 · mail 4 · cosmetics-products 4 · menus 3 · lms-instructor 3 · partnerops 1
```

**메뉴에 연결된 라우트는 35/151 (23%)** — 라우트의 3/4 이상이 사이드바에서 도달 불가하다.

---

## 3. 권한 경계 — 구조적 결함 (최우선)

### 3-1. 프런트 진입 바닥이 플랫폼 관리자가 아니다

`App.tsx:172` 이 **모든** 보호 라우트를 하나의 게이트로 감싼다.

```tsx
<Route path="/*" element={
  <AdminProtectedRoute requiredRoles={['admin']} showContactAdmin={true}>
```

`packages/auth-context/src/adminRouteAccess.ts` 의 판정:

| 함수 | 동작 |
|---|---|
| `expandRequiredRoles(['admin'])` | → `['admin','super_admin','operator','platform:super_admin']` |
| `matchesRequiredRole` | 요구 집합에 `admin` 이 있으면 **모든 서비스 접두 `:admin`/`:operator` 역할을 통과**시킨다 (`isServicePrefixedAdminRole`) |

결과: **`kpa:admin` · `kpa:operator` · `neture:operator` · `cosmetics:admin` 등이 `admin.neture.co.kr` 전체에 진입한다.**
`admin.neture.co.kr` 은 **현재 플랫폼 관리자 전용 사이트가 아니다.**

### 3-2. 메뉴 가시성 게이트가 사실상 없다

`config/rolePermissions.ts` 의 `menuPermissions` 는 항목이 **2개**뿐이고(`dashboard` 무게이트 · `core-users` 실게이트),
`hasMenuPermission` 은 **"설정 없음 = 허용"**(allow-by-default) 이다.

→ 위 3-1 의 서비스 운영자에게 **플랫폼 HUB · 매장 네트워크 · 오프라인 매장 · O4O 상품 DB · Platform Settings 를 포함한 메뉴 거의 전부가 노출된다.**

### 3-3. 백엔드는 반대로 매우 좁다

| 백엔드 가드 | 허용 역할 |
|---|---|
| `requireAdmin` (`common/middleware/auth/authorization.middleware.ts`) | **`platform:super_admin` 만** (legacy `admin`/`super_admin` 거부) |
| `/api/v1/admin/users` `ADMIN_ROLES` | **`platform:super_admin` 만** |
| `/api/v1/platform/hub/*` `requirePlatformAdmin` | **`platform:super_admin` 만** |
| `/api/v1/kpa/*` `KPA_SCOPE_CONFIG` | `kpa:admin`/`kpa:operator` 만. **`platformBypass: false`** + `blockedServicePrefixes: ['platform','neture','cosmetics']` |

→ **노출은 넓고 실행은 좁다.** 진입은 되지만 API 가 403 인 화면이 광범위하다.
→ 특히 **Yaksa (KPA) 4개 메뉴는 플랫폼 관리자가 구조적으로 사용할 수 없다** (`platformBypass: false`).

---

## 4. 프로덕션 실사용 실측 (30일 · `referer: admin.neture.co.kr`)

관리자 사이트에서 발생한 **전체** API 호출:

| 호출 | 건수 | 성격 |
|---|---:|---|
| `/api/v1/auth/status` | 90 | bootstrap |
| `/api/v1/userRole/:id/permissions` | 86 | bootstrap |
| `/api/v1/navigation/admin` | 82 | **stub (빈 배열)** |
| `/api/v1/apps/availability` | 80 | bootstrap |
| `/api/v1/public/cpt/types` | 77 | bootstrap (CPT 메뉴 주입) |
| `/api/v1/auth/login` · `refresh` | 77 | bootstrap |
| **`/api/v1/cms/contents`** | **21** | **유일한 실질 업무 사용** |
| `/api/v1/settings/*` | 9 | 설정 |
| `/api/v1/partnerops/*` | 8 | **메뉴 없음** · ⚠️ **정정: 8건 전부 404** (백엔드 부재 — 실사용 아님) |
| `/api/v1/admin/o4o-product-db/supplier-store-descriptions*` | 5 | **사이드바 없음**(탭) · **쓰기 포함** |
| `/api/v1/admin/apps/*` | 4 | AppStore |
| `/api/v1/admin/platform-accounts*` | 4 | 설정 탭 · 쓰기 포함 |
| `/api/v1/admin/store-network/*` | 3 | 최근 탐색 추정 |
| `/api/v1/platform/hub/summary` | 2 | 2026-09-09 (본 WO 촉발 세션) |
| `/api/v1/admin/ops/metrics` | 2 | — |
| `/api/v1/cms/slots` · `/forum/categories` · `/content/categories` · `/kpa/store/assets` · `/platform/media-library` | 각 2 | — |
| `/api/v1/admin/physical-stores` · `/admin/users` · `/cms/contents/:id` | 각 1 | — |

**호출 0건 (관리자 사이트 기준)**: `/api/v1/cms/{cpts,fields,views,pages}` · `/api/v1/cpt/*` ·
`/admin/custom-field-groups` · `/api/v1/hub/contents` · `/api/v1/content/assets` ·
`/api/v1/points/admin/*` · `/api/v1/kpa/admin/force-assets` · `/api/v1/monitoring/*`

> 결론: 관리자 사이트는 **부트스트랩 트래픽이 대부분이고, 실제 업무는 `cms/contents` 한 축에 집중**돼 있다.

---

## 5. 메뉴별 판정 (35 clickable)

### 5-1. 분류 집계

```text
KEEP_PLATFORM_ADMIN      = 16
RENAME                   =  4
REGROUP                  =  0   (그룹 단위 — §6 에 별도 기술)
MERGE_DUPLICATE          =  2
MOVE_TO_SERVICE_OPERATOR =  4
MOVE_TO_STORE_OWNER      =  0   (메뉴 기준 0 · 라우트 기준 4 → §5-3)
MOVE_TO_SYSTEM_OPERATIONS=  0   (대상 백엔드 부재 → 신설 불가 · §6-2)
REMOVE_DEAD_RUNTIME      =  6
REMOVE_MENU_ONLY         =  0
NEEDS_BUSINESS_DECISION  =  3
                          ────
                            35
```

### 5-2. 항목별 근거

| 메뉴 | 경로 | 백엔드 / 데이터 | 프로덕션 | 판정 |
|---|---|---|---:|---|
| Overview | `/admin` | AdminDashboard | — | **KEEP** (단, `/home`·`/dashboard` 와 3중 → §5-3) |
| Core > RBAC Role Assignments | `/users` | `/admin/users` · `role_assignments` | 1 | **KEEP** — 프런트/백엔드 `platform:super_admin` 정합 ✅ |
| Core > Service Operators | `/operators` | `/admin/users` (동일 endpoint) | 0 | **KEEP** + **MUST_FIX** — 프런트 `['admin','super_admin','platform:super_admin']` vs 백엔드 `['platform:super_admin']` |
| Core > 포인트 운영 | `/operator/points` | `/points/admin/{grant,spend}` | **0** | **KEEP** (금융 = Admin 영역, CLAUDE.md §11) · `DB미검증` |
| Core > Platform Settings | `/settings` | 5탭 (admin-accounts / ai-query / app-services / email …) | 9 | **KEEP** |
| O4O 상품 DB ×5 | `/admin/o4o-product-db/*` | `/admin/o4o-product-db/*` · `product_masters` | 5 | **KEEP** + 그룹 **REGROUP** — 사이드바 5 vs 화면 내 탭 7 (`설명서 검수`·`이미지 상태` 누락, **설명서 검수는 프로덕션 쓰기 실사용**) |
| Content > Overview | `/content` | 없음 (링크 shell, 본문 "준비 중") | 0 | **MERGE_DUPLICATE** |
| Content > Assets | `/content/assets` | `/api/v1/content/assets` (READ-ONLY, mount 확인) | 0 | **KEEP** |
| Content > Collections | `/content/collections` | 없음 — 주석에 "기능 미구현 · DB 미구현 · Mock 없음" 명시 | 0 | **REMOVE_DEAD_RUNTIME** |
| Content > Policies | `/content/policies` | 없음 — `content-core` enum 을 렌더한 **정적 문서 화면**(425줄) | 0 | **RENAME** (문서/가이드 성격) |
| Content > Analytics | `/content/analytics` | `contentAssetsApi` stats | 0 | **KEEP** |
| CMS > Contents | `/admin/cms/contents` | `/api/v1/cms/contents` (`requireAuth`) | **21** | **KEEP** — 사이트 유일 실사용 축 |
| CMS > Slots | `/admin/cms/slots` | `/api/v1/cms/slots` (`requireSlotAccess`) | 2 | **KEEP** |
| CMS > Post Types | `/admin/cms/cpts` | **백엔드 없음** | **404 실측** | **REMOVE_DEAD_RUNTIME** |
| CMS > Fields | `/admin/cms/fields` | **백엔드 없음** | **404 실측** | **REMOVE_DEAD_RUNTIME** |
| CMS > Views | `/admin/cms/views` | **백엔드 없음** | 0 | **REMOVE_DEAD_RUNTIME** |
| CMS > Pages | `/admin/cms/pages` | **백엔드 없음** | 0 | **REMOVE_DEAD_RUNTIME** |
| AppStore > Browse Apps | `/apps/store` | `/api/v1/admin/apps` (`requireAdmin`) · `app_registry` | 4 | **KEEP** (프런트/백엔드 역할 불일치 → §5-7 A3) |
| Forum > Dashboard | `/forum` | forum stats · `forum_post` | 2 | **NEEDS_BUSINESS_DECISION** + **MUST_FIX**(데드링크 2) |
| Forum > Boards | `/forum/boards` | `@o4o/forum-core/admin-ui` | 0 | **NEEDS_BUSINESS_DECISION** |
| Forum > Categories | `/forum/categories` | `@o4o/forum-core/admin-ui` | 2 | **NEEDS_BUSINESS_DECISION** |
| Yaksa > HUB 콘텐츠 | `/operator/hub-contents` | `/api/v1/hub/contents` (**무인증 공개**) + `/kpa/notices` | 0 | **MOVE_TO_SERVICE_OPERATOR** |
| Yaksa > 콘텐츠 승인 | `/operator/approvals` | `/api/v1/kpa/operator/approvals` (`kpa:operator`) | 24 (**서비스 프런트발**) | **MOVE_TO_SERVICE_OPERATOR** — KPA Society operator 콘솔의 `공급자 콘텐츠 승인` 과 **동일 경로·동일 endpoint** |
| Yaksa > 공급 자산 조회 | `/operator/kpa/snapshots` | `/kpa/admin/force-assets/snapshots` (`kpa:admin`) | 0 | **MOVE_TO_SERVICE_OPERATOR** |
| Yaksa > Force Asset 관리 | `/operator/kpa/force-assets` | `/kpa/admin/force-assets` (`kpa:admin`) · `kpa_store_asset_control` | **0** | **MOVE_TO_SERVICE_OPERATOR** |
| Digital Signage > Content Hub | `/admin/digital-signage/content` | `/api/signage/:serviceKey/global/*` — **serviceKey `'neture'` 하드코딩** · browse-only | 1 | **RENAME** (플랫폼 전체 자산 아님) |
| Ops Metrics | `/admin/ops/metrics` | `/admin/ops/metrics` (`requireAdmin`) | 12 | **RENAME** + 부분 dead (§5-4 #6) |
| 플랫폼 HUB | `/admin/platform/hub` | `/platform/hub/summary` (`platform:super_admin`) | 2 | **KEEP** + **MUST_FIX** (§5-4 #1) |
| 매장 네트워크 | `/admin/store-network` | `cosmetics.cosmetics_stores` + `checkout_orders(serviceKey='cosmetics')` | 3 | **RENAME** — 단일 서비스 집계 · `DB미검증` |
| 오프라인 매장 | `/admin/physical-stores` | `physical_stores` ← **cosmetics 매장 스캔으로만 생성** | 1 | **MERGE_DUPLICATE** (매장 네트워크와 동일 소스) · `DB미검증` |
| Content Manager | `/admin/service-content-manager` | **API 호출 0건** · 하드코딩 샘플(`// 샘플 데이터 - 실제로는 API에서 가져옴`) · 748줄 · inline style | 0 | **REMOVE_DEAD_RUNTIME** |

### 5-3. 메뉴 없는 라우트 중 주목 대상

| 라우트 | 상태 | 판정 |
|---|---|---|
| `/home` · `/dashboard` | 각기 다른 대시보드 구현 (Overview 와 3중) | **MERGE_DUPLICATE** |
| `/partnerops/*` | 호출 8회가 **전부 404** (백엔드 부재) · 메뉴 없음 | ⚠️ **정정** — 기능 은폐가 아니라 **REMOVE_DEAD_RUNTIME** 후보 |
| `/admin/o4o-product-db/supplier-store-descriptions` | **쓰기 포함 실사용** · 사이드바 없음(탭만) | **REGROUP** |
| `/cpt-engine/*` (17 routes) | 백엔드 `/api/v1/cpt/*` **41 endpoint 실재** · 메뉴 없음 · 관리자발 호출 0 | **NEEDS_BUSINESS_DECISION** (CMS V2 와 중복 축) |
| `/acf/*` · `/acf/groups` | `/admin/custom-field-groups` **백엔드 0 refs** | **REMOVE_DEAD_RUNTIME** |
| `/admin/cpt-acf/*` (16 routes) | 9개 컴포넌트 **전부 14줄 "temporarily disabled" 스텁** | **REMOVE_DEAD_RUNTIME** |
| `/analytics/*` | 21줄 "분석 페이지는 개발 중입니다" | **REMOVE_DEAD_RUNTIME** |
| `/monitoring` · `/monitoring/performance` · `/monitoring/security` | 995줄 · `/api/v1/monitoring/*` **미마운트** · **프로덕션 404 실측** | **REMOVE_DEAD_RUNTIME** |
| `/store/pop*` · `/store/tablet/settings` · `/store-content*` | 매장 실행 자산 제작 | **MOVE_TO_STORE_OWNER** 검토 (4건) |
| `/store/qr` · `/store/qr/create` | 이미 안내 화면으로 대체됨 (선례: WO-O4O-ADMIN-STORE-QR-LEGACY-UI-GUIDE-V1) | 유지 |
| `/admin/lms-instructor/*` | 개별 route guard **없음** (App.tsx floor 만) | 가드 정합 필요 |
| `/admin/digital-signage/*` 하위 9개 | `RemovedRouteRedirect` — 노란 "Route Relocated" 박스만 렌더 | **REMOVE_DEAD_RUNTIME** |
| `/admin/orders` · `/admin/orders/:id` | 가드 `content:read` · Commerce 성격 | **NEEDS_BUSINESS_DECISION** (Priority Chain 3·3-A) |
| `/__debug__/auth-bootstrap` · `/__debug__/login` · `/debug/auth` · `/auth-inspector` | **무인증 공개 · 프로덕션 등록** | **MUST_FIX** (CLAUDE.md §8 규칙 3) |
| `/admin/test/*` · `/ui-showcase` · `/test/*` (15) | 가드는 있으나 프로덕션 등록 | §8 규칙 3 위반 |
| `/posts` · `/categories` · `/pages/*` | 의도된 legacy redirect | 유지 |

### 5-4. MUST_FIX (운영 중 결함 · 확정)

1. **플랫폼 HUB 의 KPA 카드는 한 번도 동작한 적이 없다.**
   `modules/platform/platform-hub.controller.ts:52` `FROM kpa_member`, `:60` `FROM kpa_application` — **단수형**.
   실제 테이블은 `kpa_members`(저장소 90 refs) / `kpa_applications`(11 refs). 단수형은 이 파일에서만 각 1 ref.
   첫 쿼리에서 throw → `catch` → KPA 카드가 영구 `error:'unavailable'`, `riskLevel:'unknown'`.
   **HTTP 는 200 이므로 과거의 "조회 API 2xx 확인" 검증을 그대로 통과했다.**
2. **`/operators` 프런트/백엔드 가드 불일치.** 선행 `WO-O4O-ADMIN-MENU-ROUTE-BACKEND-ACCESS-ALIGNMENT-V1` 이
   `/users` 와 `menuPermissions['core-users']` 만 정렬하고 `/operators` 를 남겼다. `admin`/`super_admin` 은
   화면 진입 후 전 API 403.
3. **CMS 4개 메뉴 백엔드 부재.** `apps/api-server/src/modules/cms/` 에는 **entities 만** 있고
   routes/controller 0건, `register-routes.ts` 미등록. 프로덕션 404 실측(2026-08-10, `/cms/fields`·`/cms/cpts`).
4. **Forum Dashboard 데드링크 2건.** `pages/forum/index.tsx:340,346,401` → `/forum/users`·`/forum/moderation`
   라우트 미정의 → catch-all 로 `/` 리다이렉트.
5. **무인증 진단 라우트 4건이 프로덕션에 등록**(§5-3). CLAUDE.md §8 규칙 3 (`NODE_ENV` 게이트) 미적용.
6. **Ops Metrics 응답의 다수가 하드코딩 0.** `channels`(전 필드) · `services`(빈 Set) ·
   `opsStatus`(automated/manualAttention/contractControlled) · `cms.draftOnlyAreas` — Channel 축 은퇴로
   출처 소멸. 실데이터는 `lockedSlots` · `emptyCriticalSlots` · `expiredContents` **3개뿐**.

### 5-5. DEAD_RUNTIME 요약

| 대상 | 규모 | 근거 |
|---|---|---|
| `/admin/service-content-manager` | 748줄 + `types.ts` | API 0 · 하드코딩 샘플 |
| CMS cpts/fields/views/pages | 13 routes + 10 컴포넌트 + `lib/cms.ts` 다수 메서드 | 백엔드 부재 · 404 실측 |
| `/admin/cpt-acf/*` | 16 routes + 9 스텁 | 전부 "temporarily disabled" |
| `/acf/*` | 2 routes + 379줄 | 백엔드 0 refs |
| `/monitoring/*` | 3 routes + 995줄 | 미마운트 · 404 실측 |
| `/analytics/*` | 1 route + 21줄 | 플레이스홀더 |
| Digital Signage 하위 | 9 화면 | `RemovedRouteRedirect` |
| `/content/collections` · `/content` | 2 화면 | 미구현 명시 · "준비 중" |
| Navigation API 분기 | `useAdminMenu` 다수 + stub 3 endpoint | 영구 빈 배열 · 82 calls/30d 낭비 |

### 5-6. CROSS_SERVICE_DEPENDENCY

1. **Yaksa 4개 → `/api/v1/kpa/*`**. `KPA_SCOPE_CONFIG`: `platformBypass:false`,
   `blockedServicePrefixes:['platform','neture','cosmetics']` → **플랫폼 관리자 구조적 403.**
2. **`콘텐츠 승인` 은 KPA Society operator 콘솔과 동일 기능·동일 endpoint** —
   `services/web-kpa-society/src/config/operatorMenuGroups.ts` 의 `{ '공급자 콘텐츠 승인', '/operator/approvals' }`.
   KPA 측 operator 콘솔은 11그룹(승인 5 · 매장 HUB 자료 8 · signage 4 · forum 5 · …)으로 이미 완비돼 있다.
3. **매장 네트워크 / 오프라인 매장 = Cosmetics 단일 서비스.** `store-network.service.ts` 는
   `getCosmeticsServiceStats` 하나만 호출하고 `serviceBreakdown` 에 `'cosmetics'` 만 넣는다.
   `physical-store.service.ts:85` 는 **cosmetics 매장만 스캔**해 `physical_stores` 를 채운다.
   KPA · PharmacyHub · Neture 매장은 두 화면 모두에 나타나지 않는다.
4. **Digital Signage Content Hub 는 serviceKey `'neture'` 하드코딩** (`v2/ContentHub.tsx:47,55`).
5. **Forum 은 공통 패키지(`@o4o/forum-core/admin-ui`)를 소비**하나, 서비스별 포럼 운영 정본은
   각 operator 콘솔(KPA 5개 메뉴)이다 — CLAUDE.md §13 (Forum = 플랫폼 공통 구조 · 데이터는 serviceKey 격리).
6. **`checkout_orders` 기반 매출/주문 KPI 의 사업적 의미**가 Priority Chain 3(소비자 commerce 금지선) ·
   3-A(B2B canonical) 중 어디에 속하는지 판단 필요.

### 5-7. AUTHORIZATION_DEFECT

| # | 결함 | 근거 |
|---|---|---|
| A1 | **관리자 사이트 진입 바닥이 서비스 운영자까지 허용** | `App.tsx:172` + `adminRouteAccess.ts` `matchesRequiredRole` (§3-1) |
| A2 | **메뉴 가시성 게이트 사실상 부재**(allow-by-default, 실게이트 1건) | `rolePermissions.ts` (§3-2) |
| A3 | 프런트 `['admin']` vs 백엔드 `platform:super_admin` — `/operators` · `/admin/platform/hub` · `/admin/store-network` · `/admin/physical-stores` · `/admin/ops/metrics` · `/apps/store` | §3-3 |
| A4 | 프런트 `['admin','super_admin']` vs 백엔드 `kpa:admin` (플랫폼 역할 차단) — Yaksa 4건 | §5-6 #1 |
| A5 | 무인증 진단 라우트 4건 프로덕션 노출 | §5-4 #5 |
| A6 | `/admin/lms-instructor/*` 개별 가드 부재 | §5-3 |

> A1·A2 는 **개별 메뉴 문제가 아니라 사이트 역할 정의 문제**다. 2단계에서 먼저 확정해야 한다.

---

## 6. 2단계 입력 — 목표 정보구조에 대한 조사 결과

### 6-1. WO §6 초안과 코드 현실의 차이

| WO 초안 그룹 | 현실 |
|---|---|
| 플랫폼 관리 (서비스/사용자/조직·매장/역할·권한/서비스 운영자) | `/users`·`/operators` 는 동일 endpoint 의 facet 2개. **조직·매장 관리 화면은 Cosmetics 단일 서비스뿐**. "서비스" 관리 화면 없음 |
| 상품 및 기준 데이터 | O4O 상품 DB 그룹이 이미 대응. 탭 7 ↔ 사이드바 5 정합만 필요 |
| 콘텐츠 (콘텐츠/CMS/미디어·템플릿/공통 게시 정책) | 실동작은 `cms/contents` · `cms/slots` · `content/assets` **3개뿐**. CMS 4항목 · Content 2항목은 dead |
| 서비스 및 기능 (AppStore/자동화/공통 사이니지 정책) | AppStore 실재. **"공통 사이니지 정책" 화면은 없다** (있는 것은 Neture 고정 browse-only 뷰어) |
| **운영 및 보안 (시스템 상태/감사 로그/보안 현황/배포·장애)** | **대응 백엔드가 없다.** `/api/v1/monitoring/*` 미마운트(404). Ops Metrics 는 CMS 지표 3개뿐. **이 그룹은 기존 코드로 채울 수 없다** |

### 6-2. 따라서 2단계에서 확정해야 하는 것

1. **`admin.neture.co.kr` 의 권한 경계** (A1·A2) — 플랫폼 관리자 전용으로 좁힐지, 서비스 운영자 진입을 유지할지.
   이 결정이 나머지 모든 판정의 전제다.
2. **Forum 의 소속** (WO §4.1) — 플랫폼 정책/개설 승인만 남길지, 전량 서비스 operator 로 이전할지.
3. **CMS V2 ↔ CPT Engine 이원 축** — `cms_cpts/cms_fields/cms_views/cms_pages`(entity 有 · API 無)와
   `/api/v1/cpt/*`(API 41개 · 메뉴 無) 중 어느 축을 정본으로 둘지.
4. **매장 KPI 의 사업적 의미** (§5-6 #6) — Priority Chain 3 vs 3-A.
5. **"운영 및 보안" 그룹** — 신설(백엔드 필요, 별도 WO)하거나 목표 IA 에서 제외.

---

## 7. 중지 조건 해당 사항 (WO §8)

| # | 조건 | 해당 |
|---|---|---|
| 1 | 다른 서비스가 API·엔티티를 실사용 | ✅ **해당** — `/api/v1/kpa/operator/approvals`(24 calls), `/api/v1/hub/contents`(348), `/api/v1/forum`(400+) 는 서비스 프런트가 사용 중. 관리자 메뉴 제거 시 **백엔드는 건드리지 않는다** |
| 2 | 운영 데이터 존재 + 소유 주체 불명확 | ⚠️ **부분** — `physical_stores`(cosmetics 파생) 소유 주체 판단 필요 · `DB미검증` |
| 3 | 플랫폼 관리자 ↔ 서비스 운영자 권한 계약 변경 | ✅ **해당** — §3 정비는 권한 계약 변경이다. 사용자 판단 필요 |
| 4 | 삭제 대상이 배포·보안·감사와 연결 | ⚠️ `/monitoring/security` 는 이름만 보안. 백엔드 부재로 실 감사 기능 아님 |
| 5 | 다른 세션 미커밋 변경과 충돌 | ❌ 해당 없음 (작업 시작 시 working tree clean) |
| — | **자격정보** | ✅ **해당** — 프로덕션 DB `o4o_api` 자격정보가 `.env` 와 불일치. row-level 검증 보류 |

---

## 8. 문서 정합 (CLAUDE.md §16-5)

```text
문서 정합: 발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
```

1. `apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx:9` → `docs/architecture/admin-goal-state-definition.md`
   **존재하지 않는 문서.** 소스 주석의 링크이므로 §16-1 대상(기준 문서) 밖 → **보고만.**
2. **현행 관리자 정보구조 기준 문서가 저장소에 없다.** 관련 문서는 전부 `docs/archive/**`(IA 감사 3건) 또는
   `docs/checks/**`(부분 정비 기록 다수). 2단계 산출물로 **신규 baseline 문서 1건**이 필요하다 → 별도 WO.

---

## 9. WO §9 보고 형식

```text
ADMIN_MENU_TOTAL  = 35 clickable (최상위 16 / 구분선 2 / 그룹 8 / leaf 29)
ADMIN_ROUTE_TOTAL = 151 (routes/*.tsx) + 약 75 (중첩) · 메뉴 연결 35/151 = 23%

KEEP_PLATFORM_ADMIN       = 16
RENAME                    =  4
REGROUP                   =  0  (그룹 단위 2건 — O4O 상품 DB 탭 정합 · Insights 재편)
MERGE_DUPLICATE           =  2  (+ 라우트 2: /home · /dashboard)
MOVE_TO_SERVICE_OPERATOR  =  4
MOVE_TO_STORE_OWNER       =  0  (라우트 4건 검토 대상)
MOVE_TO_SYSTEM_OPERATIONS =  0  (대상 백엔드 부재)
REMOVE_DEAD_RUNTIME       =  6  (+ 라우트 약 44)
REMOVE_MENU_ONLY          =  0
NEEDS_BUSINESS_DECISION   =  3

MUST_FIX                  =  6  (§5-4)
DEAD_RUNTIME              =  9군 (§5-5)
CROSS_SERVICE_DEPENDENCY  =  6  (§5-6)
AUTHORIZATION_DEFECT      =  6  (§5-7 · A1·A2 는 구조적)
```
