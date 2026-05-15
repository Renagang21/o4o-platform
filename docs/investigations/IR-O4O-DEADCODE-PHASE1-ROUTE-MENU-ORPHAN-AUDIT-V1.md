# IR-O4O-DEADCODE-PHASE1-ROUTE-MENU-ORPHAN-AUDIT-V1

> **조사 전용 문서 — 삭제·수정·리팩토링 작업 없음**
>
> 이 IR은 O4O 4개 서비스(KPA-Society, Neture, GlycoPharm, K-Cosmetics)의 Route Orphan·Menu Orphan·Dead Code 후보를 조사한 결과이다.
> 실제 삭제 작업은 Phase 2 WO에서 별도 진행한다.

---

## 조사 메타

| 항목 | 내용 |
|------|------|
| 조사 일자 | 2026-05-15 |
| 조사 대상 | services/web-kpa-society, web-neture, web-glycopharm, web-k-cosmetics |
| 조사 방법 | App.tsx 전수 분석 + 파일 존재 교차확인 + WO 주석 추적 |
| App.tsx 총 라인 수 | KPA 1201줄 / Neture 1042줄 / GlycoPharm 685줄 / K-Cosmetics 489줄 |
| Navigate/redirect 건수 | KPA 99 / Neture 58 / GlycoPharm 23 / K-Cosmetics 8 |

---

## 1. KPA-Society (`services/web-kpa-society/`)

### 1-A. 라우터 구조 개요

KPA App.tsx는 3개 서비스 영역으로 구분된다:
- **SVC-A (커뮤니티)**: `/`, `/forum/*`, `/store/*`, `/lms/*`, `/resources/*` 등 — 현행 canonical
- **SVC-B (/demo/*)**: `/demo/*` — 지부/분회 데모 영역, 삭제 예정 명시
- **Legacy redirect block**: `/pharmacy/*`, `/intranet/*`, `/news/*` 등 → 신규 경로로 redirect

### 1-B. Route 목록 및 상태

| 구분 | 경로/파일 | 상태 | 근거 | 위험도 | 삭제 후보 |
|------|-----------|------|------|--------|-----------|
| Route | `/demo/*` 전체 블록 (100+ routes) | LEGACY | App.tsx 명시: "실제 지부/분회 서비스가 독립 도메인으로 제공되면 전체 삭제 대상" | HIGH | HOLD |
| Route | `/demo/admin/*` | LEGACY | AdminRoutes 하위, demo 영역 일부 | HIGH | HOLD |
| Route | `/demo/operator/*` | LEGACY | `/operator` 로 redirect됨 (Navigate) | MEDIUM | HOLD |
| Route | `/demo/intranet/*` | LEGACY | IntranetRoutes — demo 삭제 시 함께 제거 | HIGH | HOLD |
| Route | `/demo/forum/*` | LEGACY | 커뮤니티 `/forum`과 별도 스코프 | HIGH | HOLD |
| Route | `/news` (main scope) | ORPHAN | Navigate to `/` 로 redirect, 실제 페이지 없음 | LOW | YES |
| Route | `/news/notice` (main scope) | ORPHAN | Navigate to `/` | LOW | YES |
| Route | `/news/:id` (main scope) | ORPHAN | `NewsIdRedirect` → redirect helper만 존재 | LOW | YES |
| File | `pages/news/NewsListPage.tsx` | LEGACY | /demo 영역에서만 사용 (/demo/news/*), main scope는 redirect | MEDIUM | HOLD |
| File | `pages/news/NewsDetailPage.tsx` | LEGACY | /demo 영역에서만 사용 | MEDIUM | HOLD |
| File | `pages/news/GalleryPage.tsx` | LEGACY | /demo 영역에서만 사용 | MEDIUM | HOLD |
| Route | `/pharmacy/dashboard` → `/store` | LEGACY | backward-compat redirect, 20+ 건 | LOW | YES |
| Route | `/pharmacy/store/*` → `/store/*` | LEGACY | 역할 명칭 전환 잔재 (6개 경로) | LOW | YES |
| Route | `/pharmacy/b2b/*` → `/store/products` | LEGACY | 3개 경로 | LOW | YES |
| Route | `/pharmacy/sales/*` → `/store/products/*` | LEGACY | 2개 경로 | LOW | YES |
| Route | `/intranet/*` → `/demo/intranet` | LEGACY | backward-compat redirect | LOW | HOLD |
| Route | `/select-function` → `/setup-activity` | LEGACY | WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1 | LOW | YES |
| Route | `/groupbuy` → `/store-hub/event-offers` | LEGACY | 구용어, event offers로 통합됨 | LOW | YES |
| Route | `/content/news` → `/content` | LEGACY | WO-KPA-CONTENT-HUB-REMOVAL-V1 | LOW | YES |
| Route | `/content/new/quiz` → `/lms` | LEGACY | quiz가 LMS로 이동됨 | LOW | YES |
| Route | `/dashboard` → `/mypage` | LEGACY | WO-KPA-SOCIETY-DASHBOARD-TO-MYPAGE-CONSOLIDATION-V1 | LOW | YES |
| Route | `/demo/login` → `/login` | LEGACY | redirect helper | LOW | HOLD |
| Route | `/demo/register` → `/register` | LEGACY | redirect helper | LOW | HOLD |
| Route | `/demo/select-function` → `/setup-activity` | LEGACY | redirect | LOW | HOLD |

### 1-C. Dead Code 밀집 영역

**1) /demo 블록 (HIGH PRIORITY — HOLD)**
- 위치: App.tsx `DemoLayoutRoutes()` 함수 (약 400줄)
- 상태: App.tsx에 삭제 대상 명시 주석 존재
- 포함 파일: `DemoLayout`, `DemoHeader`, `DashboardPage`, `/demo/*` 전용 pages
- 조건: "실제 지부/분회 서비스가 독립 도메인으로 제공될 때" 삭제
- **결론: HOLD — 독립 서비스 출시 WO 연계 필요**

**2) /pharmacy/* redirect chain (MEDIUM — batch 삭제 후보)**
- 총 20+ 개별 route 정의
- 모두 `/store/*` 경로로 1:1 redirect
- wildcard catch-all 2개로 대체 가능
- **결론: Phase 2 WO에서 consolidation**

**3) 기타 개별 legacy redirect route**
- `/news` 3개, `/groupbuy`, `/select-function`, `/dashboard`, `/content/news`, `/content/new/quiz`
- 모두 단순 Navigate 컴포넌트
- **결론: YES (삭제 후보)**

---

## 2. Neture (`services/web-neture/`)

### 2-A. 라우터 구조 개요

Neture App.tsx는 공급자(supplier/partner) 중심 플랫폼이며, 크게 3영역:
- **Public + 공통**: `/`, `/o4o/*`, `/guide/*`, `/forum/*`
- **Workspace (partner용)**: `/workspace/*` — 현재 ACTIVE 사용 (일부는 redirect)
- **Operator/Admin**: `/operator/*`, `/admin/*`, `/admin-vault/*`

### 2-B. Route 목록 및 상태

| 구분 | 경로/파일 | 상태 | 근거 | 위험도 | 삭제 후보 |
|------|-----------|------|------|--------|-----------|
| Route | `/about` → `/o4o` | LEGACY | WO-O4O-GLOBAL-MENU-UPDATE-V1 backward-compat | LOW | YES |
| Route | `/manual/concepts` → `/o4o/concepts` | LEGACY | 구 문서 경로 redirect | LOW | YES |
| Route | `/manual/concepts/channel-map` → `/o4o/channel-map` | LEGACY | 구 문서 경로 redirect | LOW | YES |
| Route | `/channel/structure` → `/o4o/structure` | LEGACY | 구 채널 경로 redirect | LOW | YES |
| Route | `/channel/dental` → `/o4o/channels/dental` | LEGACY | 구 채널 경로 redirect | LOW | YES |
| Route | `/channel/pharmacy` → `/o4o/channels/pharmacy` | LEGACY | 구 채널 경로 redirect | LOW | YES |
| Route | `/channel/optical` → `/o4o/channels/optical` | LEGACY | 구 채널 경로 redirect | LOW | YES |
| Route | `/channel/medical` → `/o4o/channels/medical` | LEGACY | 구 채널 경로 redirect | LOW | YES |
| Route | `/my` → `/mypage` | LEGACY | 구 mypage 경로 | LOW | YES |
| Route | `/partner/product-pool` → `/partner/products` | LEGACY | 구 용어 | LOW | YES |
| Route | `/partner/referrals` → `/partner/links` | LEGACY | 구 용어 | LOW | YES |
| Route | `/workspace/suppliers/:slug` | ORPHAN | `RedirectSupplierDetail` → Navigate to `/` (공급자 상세 삭제됨) | LOW | YES |
| Route | `/workspace/content/:id` | LEGACY | `RedirectContentDetail` → `/partner/contents/:id` | LOW | YES |
| Route | `/workspace/admin-market-trial/:id` | LEGACY | `RedirectAdminMarketTrialDetail` → `/operator/market-trial/:id` | LOW | YES |
| Route | `/workspace/operator/*` | LEGACY | `WorkspaceOperatorRedirect` → `/operator/*` (WO-O4O-NETURE-ROUTE-UNIFICATION-BIG-SWITCH-V1) | LOW | YES |
| Route | `/workspace/platform/principles` → `/o4o/principles` | LEGACY | 구 경로 redirect | LOW | YES |
| Route | `/workspace/partners` → `/workspace/partners/requests` | LEGACY | index redirect | LOW | YES |
| Route | `/workspace/partners/*` | ACTIVE | PartnershipRequest 기능 (파트너 신청/상세) — ACTIVE | - | NO |
| Route | `/workspace/my-content` | ACTIVE | MyContentPage — ACTIVE 사용 | - | NO |
| Route | `/workspace/forum/*` | ACTIVE | ForumHubPage — ACTIVE 사용 | - | NO |
| Route | `/workspace/hub` | ACTIVE | HubPage — ACTIVE | - | NO |
| File | (삭제됨) `NetureHomePage` | REMOVED | WO-NETURE-HOME-COMMUNITY-PROMOTION-V1 — Community가 Home 승격 | - | - |
| File | (삭제됨) Blog public routes | REMOVED | WO-O4O-NETURE-BLOG-RETIRE-V1 — Blog 운영 포기 | - | - |
| File | (삭제됨) ProductCurationPage | REMOVED | WO-NETURE-CURATION-PHASE3-FULL-REMOVAL-V1 | - | - |
| Function | `RedirectSupplierDetail()` | ORPHAN | 항상 Navigate to `/` — 실질적 기능 없음 | LOW | YES |
| Function | `RedirectPartnershipRequestDetail()` | LEGACY | redirect helper — 실제 경로는 workspace/partners/requests/:id | LOW | YES |
| Function | `RedirectContentDetail()` | LEGACY | `/partner/contents/:id` 로 redirect | LOW | YES |
| Function | `RedirectAdminMarketTrialDetail()` | LEGACY | `/operator/market-trial/:id` 로 redirect | LOW | YES |

### 2-C. Dead Code 밀집 영역

**1) Legacy redirect helper 함수 4개**
- `RedirectSupplierDetail`, `RedirectPartnershipRequestDetail`, `RedirectContentDetail`, `RedirectAdminMarketTrialDetail`
- 각각 1~3줄의 Navigate 반환 함수
- **결론: YES (삭제 후보) — 단, route 정의도 함께 제거 필요**

**2) /manual/* 및 /channel/* → /o4o/* redirect 8개**
- 구 문서/채널 경로 잔재
- **결론: YES (삭제 후보)**

**3) /workspace/operator/* redirect**
- `WorkspaceOperatorRedirect` helper + 라우트 1개
- **결론: YES (삭제 후보)**

---

## 3. GlycoPharm (`services/web-glycopharm/`)

### 3-A. 라우터 구조 개요

GlycoPharm App.tsx는 약국 전문 매장 운영 중심. 주요 영역:
- **Store Management**: `/store/*` — canonical
- **Operator/Admin**: `/operator/*`, `/admin/*`
- **Signage**: `/store/signage/*`, `/operator/signage/*`
- **Phase 2 (experimental)**: `/service`, `/service-login`

### 3-B. Route 목록 및 상태

| 구분 | 경로/파일 | 상태 | 근거 | 위험도 | 삭제 후보 |
|------|-----------|------|------|--------|-----------|
| File | `pages/store/StoreEntryPage.tsx` | ORPHAN | 라우트 제거됨 (WO-O4O-GLYCO-STORE-CANONICAL-ENTRY-ALIGN-V1). import 없음. 파일만 잔존. | LOW | YES |
| Route | `/pharmacy` → `/store` | LEGACY | 역할 명칭 전환 backward-compat | LOW | YES |
| Route | `/pharmacist` → `/store` | LEGACY | 역할 명칭 전환 backward-compat | LOW | YES |
| Route | `/pharmacist/*` → `/store` | LEGACY | 역할 명칭 전환 backward-compat | LOW | YES |
| Route | `/hub` → `/store-hub` | LEGACY | backward-compat | LOW | YES |
| Route | `/hub/*` → `/store-hub` | LEGACY | backward-compat | LOW | YES |
| Route | `/education` → `/lms` | LEGACY | backward-compat (WO-O4O-LMS-ROUTING-V1) | LOW | YES |
| Route | `/education/:id` → `/lms/:id` | LEGACY | EduRedirect helper | LOW | YES |
| Route | `/store/signage` → `/store/signage/library` | LEGACY | 단순 index redirect | LOW | YES |
| Route | `/store/hub` → `/store` | LEGACY | 구 store hub 개념 통합됨 | LOW | YES |
| Route | `/store/products` → `/store/my-products` | LEGACY | 구 경로 | LOW | YES |
| Route | `/store/market-trial/*` | LEGACY | MarketTrialNetureRedirect — Neture로 redirect (WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1) | LOW | YES |
| Route | `/service` | UNKNOWN | Phase 2 WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM — 방향 미확정 | HIGH | HOLD |
| Route | `/service-login` | UNKNOWN | Phase 2 experimental | HIGH | HOLD |
| Route | `/service/dashboard` | UNKNOWN | Phase 2 experimental | HIGH | HOLD |
| Route | (제거됨) `/store/services` | REMOVED | WO-O4O-GLYCO-CARE-CLEANUP-V1 PharmacyPatients 제거됨 | - | - |
| Route | (제거됨) `/signage/my` | REMOVED | WO-O4O-GLYCOPHARM-SIGNAGE-MIGRATION-V1 | - | - |
| Route | (제거됨) `/operator/roles` | REMOVED | `/admin/roles`로 단일화 | - | - |

### 3-C. Dead Code 밀집 영역

**1) StoreEntryPage.tsx — 즉시 삭제 후보**
- 위치: `services/web-glycopharm/src/pages/store/StoreEntryPage.tsx`
- 라우트 제거됨, import 없음, 파일만 잔존
- **결론: YES — 즉시 삭제 가능 (LOW risk)**

**2) Phase 2 실험 라우트 3개 (/service, /service-login, /service/dashboard)**
- WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM 진행 여부 미확정
- **결론: HOLD — WO 상태 확인 후 판단**

**3) backward-compat redirect 8개**
- `/pharmacy`, `/pharmacist`, `/pharmacist/*`, `/hub`, `/hub/*`, `/education`, `/store/hub`, `/store/products`
- 모두 단순 Navigate
- **결론: YES (삭제 후보) — bookmark 트래픽 없다면 제거 가능**

---

## 4. K-Cosmetics (`services/web-k-cosmetics/`)

### 4-A. 라우터 구조 개요

K-Cosmetics는 4개 서비스 중 가장 라우터가 단순하다 (489줄). 주요 영역:
- **Public + Store**: `/`, `/store/*`
- **Partner**: `/partner/*` — `k-cosmetics:partner` 역할 게이트
- **Operator/Admin**: `/operator/*`, `/admin/*`
- **Tablet**: `/tablet/:slug`

### 4-B. Route 목록 및 상태

| 구분 | 경로/파일 | 상태 | 근거 | 위험도 | 삭제 후보 |
|------|-----------|------|------|--------|-----------|
| Route | `/hub` → `/store-hub` | LEGACY | backward-compat | LOW | YES |
| Route | `/hub/*` → `/store-hub` | LEGACY | backward-compat | LOW | YES |
| Route | `/store/products` → `/store/my-products` | LEGACY | 구 경로 | LOW | YES |
| Route | `/store/market-trial/*` | LEGACY | MarketTrialNetureRedirect — Neture redirect (WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1) | LOW | YES |
| Route | (제거됨) `/operator/inventory` | REMOVED | WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1 mock route 제거됨 | - | - |
| Route | (제거됨) `/operator/settlements` | REMOVED | WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1 | - | - |
| Route | (제거됨) `/operator/analytics` | REMOVED | WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1 | - | - |
| Route | (제거됨) `/operator/marketing` | REMOVED | WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1 | - | - |
| Route | (제거됨) `/operator/support` | REMOVED | WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1 mock route 제거됨 | - | - |
| Route | `/partner/*` | HIDDEN | `k-cosmetics:partner` 역할 게이트. 5개 route. 역할 할당 여부 확인 필요. | MEDIUM | HOLD |
| File | (삭제됨) RoleBasedHome | REMOVED | WO-K-COSMETICS-ROLEBASED-HOME-REMOVAL-V1 | - | - |

### 4-C. Dead Code 밀집 영역

**1) /partner/* 라우트 — HOLD**
- 5개 라우트: overview, targets, content, events, status
- `ProtectedRoute allowedRoles={['k-cosmetics:partner']}` 게이트
- `k-cosmetics:partner` 역할이 실제 production DB에 할당된 사용자가 있는지 확인 필요
- **결론: HOLD — 역할 할당 현황 확인 후 판단**

**2) backward-compat redirect 4개**
- `/hub`, `/hub/*`, `/store/products`, `/store/market-trial/*`
- **결론: YES (삭제 후보)**

---

## 5. 크로스 서비스 공통 패턴

### 5-A. Market Trial Cross-Service Redirect (4개 서비스 공통)

| 서비스 | 상태 |
|--------|------|
| Neture | ACTIVE — 실제 Market Trial 구현체 존재 |
| GlycoPharm | LEGACY — `/store/market-trial/*` → Neture redirect |
| K-Cosmetics | LEGACY — `/store/market-trial/*` → Neture redirect |
| KPA-Society | 확인 필요 |

- WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1 완료됨
- **Neture 외 3개 서비스의 market-trial redirect route는 삭제 가능**

### 5-B. /pharmacy → /store 명칭 전환 잔재 (KPA + GlycoPharm)

| 서비스 | redirect 개수 |
|--------|--------------|
| KPA-Society | 20+ 개별 route |
| GlycoPharm | 4개 (/pharmacy, /pharmacist, /pharmacist/*) |

- wildcard catch-all로 통합 가능
- **결론: Phase 2 consolidation WO에서 처리**

### 5-C. Role-Based Home 제거 잔재

- K-Cosmetics: WO-K-COSMETICS-ROLEBASED-HOME-REMOVAL-V1 완료
- KPA: WO-O4O-ROLEBASED-HOME-REMOVAL-AND-ROUTING-NORMALIZATION-V1 완료
- 파일은 삭제되었으나 코드 내 주석이 잔존

---

## 6. 결과 요약

### A. 즉시 삭제 가능 후보 (LOW risk, 명확한 ORPHAN)

| 서비스 | 항목 | 내용 |
|--------|------|------|
| GlycoPharm | File | `pages/store/StoreEntryPage.tsx` — route 제거됨, import 없음 |
| GlycoPharm | Routes (8개) | `/pharmacy`, `/pharmacist/*`, `/hub/*`, `/education`, `/store/hub`, `/store/products`, `/store/signage` (index redirect) |
| GlycoPharm | Route | `/store/market-trial/*` → Neture redirect |
| K-Cosmetics | Routes (4개) | `/hub`, `/hub/*`, `/store/products`, `/store/market-trial/*` |
| Neture | Routes (8개) | `/manual/*`, `/channel/*` → `/o4o/*` redirect 전체 |
| Neture | Routes (5개) | `/about`, `/my`, `/partner/product-pool`, `/partner/referrals`, `/workspace/platform/principles` |
| Neture | Routes (4개) | `/workspace/suppliers/:slug`, `/workspace/content/:id`, `/workspace/admin-market-trial/:id`, `/workspace/operator/*` |
| Neture | Functions (4개) | `RedirectSupplierDetail`, `RedirectPartnershipRequestDetail`, `RedirectContentDetail`, `RedirectAdminMarketTrialDetail` |
| KPA | Routes (9개) | `/news` (main scope 3개), `/pharmacy/*` 잔재 (6개), `/dashboard`, `/groupbuy`, `/select-function` |

**즉시 삭제 가능 총계: 파일 1개, Route 약 40개, Function 4개**

---

### B. HOLD 필요 항목

| 서비스 | 항목 | 이유 |
|--------|------|------|
| KPA | `/demo/*` 전체 블록 | 독립 SVC-B 서비스 출시 WO 완료 후 삭제. `DemoLayout`, `IntranetRoutes`, `AdminRoutes` 포함. |
| KPA | `pages/news/` 3파일 | /demo 영역에서 실제 사용 중. /demo 삭제 WO와 동시 처리. |
| GlycoPharm | `/service`, `/service-login`, `/service/dashboard` | WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM 방향 확정 전 보류. |
| K-Cosmetics | `/partner/*` (5 routes) | `k-cosmetics:partner` 역할 실제 할당 현황 확인 필요. 할당자 없으면 삭제 후보. |

---

### C. Canonical Replacement 가능 항목

다음은 legacy UI 패턴을 사용 중이나, canonical 구조로 대체 가능한 영역이다.
(이번 Phase에서는 조사만 수행. 실제 교체는 별도 WO.)

| 서비스 | 영역 | 현 상태 | 대체 방향 |
|--------|------|---------|-----------|
| KPA | `/pharmacy/*` redirect chain (20+) | 개별 1:1 route 정의 | wildcard catch-all 2개로 통합 |
| KPA | legacy operator 구조 일부 | /demo/admin/* 하위 | /demo 삭제 WO와 함께 제거 |
| Neture | workspace redirect helpers | 개별 함수 + route | 단일 wildcard redirect로 통합 |
| GlycoPharm | StoreEntryPage.tsx | 파일만 잔존 | 즉시 삭제 |

---

### D. 서비스별 Dead Code 밀집 영역

| 서비스 | 밀집 영역 | 규모 | 결론 |
|--------|-----------|------|------|
| KPA-Society | `/demo/*` 블록 | ~400줄 / 100+ routes | HOLD (SVC-B 독립 서비스 출시 시) |
| KPA-Society | `/pharmacy/*` redirect chain | 20+ routes | Phase 2 consolidation |
| Neture | legacy workspace redirect (함수+route) | ~50줄 | YES 삭제 가능 |
| Neture | /manual/* /channel/* redirects | 8 routes | YES 삭제 가능 |
| GlycoPharm | `StoreEntryPage.tsx` | 1 파일 | YES 즉시 삭제 |
| GlycoPharm | Phase 2 `/service/*` | 3 routes | HOLD |
| K-Cosmetics | `/partner/*` | 5 routes | HOLD (역할 확인 후) |
| K-Cosmetics | backward-compat redirects | 4 routes | YES 삭제 가능 |

---

## 7. Phase 2 WO 권고 사항

이번 Phase 1 조사 결과를 기반으로 다음 순서의 Phase 2 작업을 권고한다.

### Priority 1: LOW risk 즉시 삭제 (배치)
- GlycoPharm `StoreEntryPage.tsx` 파일 삭제
- Neture legacy redirect functions + routes 일괄 제거
- K-Cosmetics backward-compat 4개 route 제거
- GlycoPharm backward-compat 8개 route 제거

### Priority 2: HOLD 항목 조건 확인
- GlycoPharm Phase 2 service auth WO 방향 확정
- K-Cosmetics `k-cosmetics:partner` 역할 할당 현황 DB 조회
- KPA SVC-B 독립 서비스 출시 일정 확인

### Priority 3: KPA /pharmacy/* 통합 (Medium)
- 20+ 개별 route → wildcard catch-all 2개로 통합
- regression test 필요

### Priority 4: KPA /demo/* 삭제 (SVC-B 출시 후)
- DemoLayout, DemoHeader, IntranetRoutes, AdminRoutes, pages/news/* 포함
- 가장 큰 규모의 cleanup

---

## 8. 조사 제외 항목

- `packages/` shared packages — Phase 1 범위 제외
- `apps/` (api-server, admin-dashboard 등) — Phase 1 범위 제외
- backend controller dead code — 별도 IR 필요
- E2E test 파일 orphan — 별도 IR 필요

---

*IR 작성: 2026-05-15*
*다음 단계: WO-O4O-DEADCODE-PHASE2-CLEANUP-V1 (삭제 작업)*
