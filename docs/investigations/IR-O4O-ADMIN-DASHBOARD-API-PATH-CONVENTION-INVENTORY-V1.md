# IR-O4O-ADMIN-DASHBOARD-API-PATH-CONVENTION-INVENTORY-V1

> **read-only 감사 IR.** 코드·API·route·DB·migration·배포 변경 없음.
> 목적: `apps/admin-dashboard` 의 API 호출 경로를 전수 분류해 **다음 WO 후보를 고르는 것**.

---

## 1. 기준

| 항목 | 값 |
|---|---|
| 기준 commit | `b975107217b413307348cca0a5d276f41f0717c9` (main, `origin/main` 동기) |
| 작업트리 | clean (`git status --short` 출력 0건) |
| 조사 일자 | 2026-08-10 |
| 조사 대상 | `apps/admin-dashboard/src` + `packages/auth-client` · `packages/auth-react` · `packages/auth-context` · `packages/lms-client` |
| backend 대조 | `apps/api-server/src/bootstrap/register-routes.ts` (유일한 route 등록 지점, 교차 확인 완료) |
| 실측 채널 | 프로덕션 `https://api.neture.co.kr` 에 **비인증 GET** 만 수행 (상태코드 관측) |

**조사 도구**: 정적 스캐너(호출부 추출 → base 상수 해석 → 최종 URL 조립 → backend mount 대조) + 프로덕션 상태코드 실측 34건.

---

## 2. client 별 prefix 규칙 (실측 확정)

프로덕션 admin 빌드는 `.github/workflows/deploy-admin.yml:47` 에서
**`VITE_API_URL=https://api.neture.co.kr/api`** (즉 `/api` 로 끝남) 로 주입된다.
이 값을 각 client 가 서로 다르게 해석하는 것이 이번 문제의 뿌리다.

| # | client | 정의 위치 | 최종 base | 호출부가 써야 하는 path |
|---|--------|----------|-----------|------------------------|
| 1 | `authClient.api` | `packages/auth-client/src/client.ts:340-345` | `…/api/v1` | `/xxx` (접두 없음) |
| 2 | `unifiedApi.<ns>` | `apps/admin-dashboard/src/api/unified-client.ts:208` (`v1()` 주입) | `…/api/v1` | 네임스페이스 메서드 |
| 3 | **`unifiedApi.raw`** | 같은 파일 `get raw()` — **`v1()` 주입 없음** | `…/api` | `/v1/xxx` |
| 4 | `apiClient` | `apps/admin-dashboard/src/lib/api-client.ts:3-6` (raw `VITE_API_URL`) | `…/api` | `/v1/xxx` |
| 5 | `apiClient` (별개) | `apps/admin-dashboard/src/utils/apiClient.ts:16-20` (hostname 하드코딩) | `…/api/v1` | `/xxx` |
| 6 | `axios` 직접 | 3곳 (`pages/test/UserEditTest.tsx`) | 호출부 지정 | — |
| 7 | `fetch()` 직접 | 63곳 | **admin 오리진** | (프록시 없음) |
| 8 | `apiRequest()` | `apps/admin-dashboard/src/api/apiRequest.ts:20` (`/api${endpoint}`) | admin 오리진 | **호출부 0건 (dead)** |

### 2-1. `fetch()` 가 구조적으로 실패하는 이유

`apps/admin-dashboard/Dockerfile:9-21` 의 nginx 설정에는 **`/api` 리버스 프록시가 없다.**
`location /` 는 `try_files $uri $uri/ /index.html` (SPA fallback) 뿐이다.

→ `fetch('/api/...')` 는 `https://admin.neture.co.kr/api/...` 로 나가 **`index.html` 을 HTTP 200 으로 받는다.**
→ `response.ok === true` 이므로 에러 분기를 타지 않고, `response.json()` 이 `Unexpected token '<'` 로 터진다.
**404 가 아니라 "성공한 것처럼 보이는 실패"** 라는 점이 중요하다.

---

## 3. 전수 결과

**호출 총량: 847건 (파일 기준 admin-dashboard `src` 전역)**
그중 **주석 처리된 호출 19건 제외 → LIVE 828건**.

### 3-1. client 분포 (LIVE 828)

| client | 건수 |
|---|---:|
| `authClient.api` (직접) | 512 |
| `authClient.api` (`api` alias 경유: `@/api/base`, `@/lib/api`, 지역 `const api = authClient.api`) | 118 |
| `unifiedApi.raw` | 95 |
| `fetch()` 직접 | 63 |
| `apiClient` (lib + utils) | 37 |
| `axios` 직접 | 3 |

### 3-2. 위험도 분류표

| 분류 | 건수 | 파일 수 | 내용 |
|---|---:|---:|---|
| **PASS** | 366 | 91 | prefix 정합 + backend mount 존재 |
| **LEGACY_REMOVE / MISSING** | 178 | 42 | prefix 는 맞으나 backend 경로 없음 |
| **PREFIX_FIX** (소계) | **213** | **30** | baseURL 조립 문제 |
| ├ `missing-v1` | 95 | 7 | base 가 `/api` 인데 `/v1` 을 안 붙임 |
| ├ `double-api` | 83 | 13 | base 가 `/api/v1` 인데 path 에 `/api` 또 붙임 |
| └ `same-origin-no-proxy` | 35 | 10 | `fetch()` 가 admin 오리진으로 나감 |
| **UNCLASSIFIED (동적)** | 68 | 33 | 런타임 계산 경로 — 정적 판정 불가 |
| **NON_API** | 3 | 3 | `/version.json`, YouTube API — 정상 |
| 합계 | 828 | | |

> **PASS 의 정의를 좁게 읽을 것.** 여기서 PASS 는 *prefix 정합 + mount prefix 존재* 까지만 증명한다.
> **endpoint 단위 존재 증명이 아니다** (§4 참조).

---

## 4. backend 존재 검증 — 방법과 한계

### 4-1. 방법

`register-routes.ts` 의 `app.use('<prefix>', …)` 106개를 정본 mount 목록으로 삼고, 조립된 최종 URL 과 prefix 매칭했다.
`app.use('/api` 패턴을 api-server 전역에서 재검색해 **register-routes.ts 외에 실제 route 등록 지점이 없음**을 확인했다
(나머지 hit 은 주석 · rate-limit 미들웨어 · swagger · 테스트 파일).

### 4-2. 프로덕션 실측 (비인증 GET, 발췌)

| 상태 | 경로 | 해석 |
|---|---|---|
| 401 | `/api/v1/users`, `/api/v1/content/assets`, `/api/signage/kpa-society/playlists`, `/api/ai/usage`, `/api/v1/cpt/forms/submit` | mount 존재 |
| 200 | `/api/v1/cms/contents`, `/api/v1/cms/stats`, `/api/v1/organizations`, `/api/v1/forum/categories` | 존재 + 공개 |
| 404 | `/api/v1/posts`, `/api/v1/categories`, `/api/v1/tags`, `/api/v1/menus`, `/api/v1/content/media`, `/api/v1/content/posts`, `/api/v1/signage/displays`, `/api/v1/acf/custom-fields`, `/api/v1/vendors`, `/api/v1/monitoring/health`, `/api/v1/widgets`, `/api/v1/partnerops/dashboard`, `/api/v1/presets/forms`, `/api/v1/template-parts`, `/api/v1/zones`, `/api/v1/block-data`, `/api/v1/lms/marketing/products`, `/api/content/posts`, `/api/admin/menus`, `/api/v1/api/signage/kpa-society/playlists`, `/api/v1/api/zones`, `/api/v1/api/block-data` | 부재 |

### 4-3. ⚠ 판정 한계 2가지 (반드시 후속 WO 에 인계)

1. **`/api/v1/admin/*` 는 401 이 존재 증명이 아니다.**
   `register-routes.ts:418` 의 `app.use('/api/v1/admin', adminDashboardRoutes)` 가 걸려 있고,
   `apps/api-server/src/routes/admin/dashboard.routes.ts:17-18` 이 **경로 없는 `router.use(authenticate)` / `router.use(requireAdmin)`** 로 시작한다.
   → `/api/v1/admin/**` 어떤 경로든 **인증 단계에서 401** 이 나고 404 에 도달하지 못한다.
   실제 이 라우터의 endpoint 는 **7개뿐**이다 (`/dashboard/sales-summary`, `/dashboard/order-status`, `/dashboard/user-growth`, `/system/health`, `/partners`, `/partners/:id/summary`, `/cosmetics/partner-metrics`).
   따라서 `/admin/menus` · `/admin/templates` · `/admin/custom-fields` · `/admin/stats` · `/admin/search` · `/admin/utils/*` · `/admin/enrollments/*` 는 **소스 기준 부재**로 판정했고, HTTP 실측은 401 로 무효다.

2. **mount prefix 일치가 endpoint 존재를 뜻하지 않는다.**
   `lib/api/lmsMarketing.ts` 의 38건은 `/api/v1/lms/marketing/*` 로, mount `/api/v1/lms` 에 prefix 매칭된다.
   그러나 프로덕션 실측은 전부 404 이고 api-server 에 `marketing` 라우터가 없다.
   → mount 매칭만으로 PASS 처리하면 오탐이 난다. 본 IR 은 이 클러스터를 LEGACY 로 재분류했다.

---

## 5. 즉시 WO 후보 (PREFIX_FIX — 213건 / 30파일)

### A. `double-api` — 83건 / 13파일

`authClient`(base `…/api/v1`) 나 `apiClient`(base `…/api`) 에 `/api...` 로 시작하는 path 를 넘긴다.

| 건수 | 파일 | 조립 결과 | backend 실재 |
|---:|---|---|---|
| 38 | [lib/api/signageV2.ts](apps/admin-dashboard/src/lib/api/signageV2.ts#L425) | `/api/v1/api/signage/{serviceKey}/…` | ✅ `/api/signage/:serviceKey` (401) |
| 12 | [services/api/zoneApi.ts](apps/admin-dashboard/src/services/api/zoneApi.ts#L31) | `/api/v1/api/zones/…` | ❌ 없음 |
| 11 | [features/cpt-acf/services/block-data.api.ts](apps/admin-dashboard/src/features/cpt-acf/services/block-data.api.ts#L17) | `/api/v1/api/block-data/…` | ❌ 없음 |
| 4 | [hooks/useNotifications.ts](apps/admin-dashboard/src/hooks/useNotifications.ts#L60) | `/api/v1/api/v2/notifications` | ✅ `/api/v1/notifications` (401) |
| 4 | [pages/digital-signage/v2/ChannelList.tsx](apps/admin-dashboard/src/pages/digital-signage/v2/ChannelList.tsx#L92) | `/api/v1/api/signage/…/channels` | ✅ `/api/signage/:serviceKey/channels` (401) |
| 3 | [components/organization/PermissionGuard.tsx](apps/admin-dashboard/src/components/organization/PermissionGuard.tsx#L37) | `/api/v1/api/users/me` | ✅ `/api/v1/users/me` (401) |
| 3 | [pages/digital-signage/v2/ChannelEditor.tsx](apps/admin-dashboard/src/pages/digital-signage/v2/ChannelEditor.tsx#L143) | `/api/v1/api/signage/…` | ✅ |
| 2 | [api/categoriesApi.ts](apps/admin-dashboard/src/api/categoriesApi.ts#L33) | `/api/api/categories/…` | ❌ 없음 |
| 2 | [components/ai/FloatingAiButton.tsx](apps/admin-dashboard/src/components/ai/FloatingAiButton.tsx#L215) | `/api/v1/api/ai/usage` | ✅ `/api/ai/usage` (401) — **v1 밖 mount** |
| 1 | [components/organization/OrganizationSelector.tsx](apps/admin-dashboard/src/components/organization/OrganizationSelector.tsx#L44) | `/api/v1/api/organizations` | ✅ (200) |
| 1 | [components/product/ProductSelector.tsx](apps/admin-dashboard/src/components/product/ProductSelector.tsx#L73) | `/api/v1/api/products` | ✅ mount 존재 |
| 1 | [features/cpt-acf/components/FormRenderer.tsx](apps/admin-dashboard/src/features/cpt-acf/components/FormRenderer.tsx#L254) | `/api/v1/api/cpt-engine/forms/submit` | ❌ (`/api/v1/cpt` 는 존재) |
| 1 | [pages/dashboard/unified/cards/OverviewCard.tsx](apps/admin-dashboard/src/pages/dashboard/unified/cards/OverviewCard.tsx#L66) | `/api/v1/api/ai/query` | ✅ `/api/ai` |

> **주의**: `/api/ai`, `/api/signage/:serviceKey`, `/api/checkout`, `/api/orders`, `/api/operator`, `/api/accounts`, `/api/partner`, `/api/v2/roles` 는 **`/api/v1` 밖에 mount 된 정본 경로**다.
> base 가 `/api/v1` 로 고정된 `authClient` 로는 **원리적으로 도달할 수 없다.** 단순 문자열 치환으로 못 고친다 → §7 REVIEW-1.

### B. `missing-v1` — 95건 / 7파일

| 건수 | 파일 | client | 조립 결과 | `+/v1` 교정 시 실재 |
|---:|---|---|---|---|
| 57 | [api/contentApi.ts](apps/admin-dashboard/src/api/contentApi.ts) | `unifiedApi.raw` | `/api/content/*`, `/api/tags/*`, `/api/admin/templates/*`, `/api/admin/custom-fields/*` | ❌ 대부분 부재 |
| 21 | [api/menuApi.ts](apps/admin-dashboard/src/api/menuApi.ts) | `unifiedApi.raw` | `/api/menus/*`, `/api/admin/menus/*` | ❌ 부재 |
| 7 | [lib/widgets/registerWidgets.ts](apps/admin-dashboard/src/lib/widgets/registerWidgets.ts#L34) | `apiClient` | `/api/admin/enrollments/*` 등 | ❌ (소스 기준 부재) |
| 4 | [services/api/postApi.ts](apps/admin-dashboard/src/services/api/postApi.ts#L289) | `apiClient` | `/api/posts` | ❌ `/api/v1/posts` = 404 |
| 3 | [api/userApi.ts](apps/admin-dashboard/src/api/userApi.ts#L69) | `unifiedApi.raw` | `/api/admin/users/:id/approve`·`/reject`, `/api/users` | ❌ approve/reject 부재 (`adminUsersRoutes` 는 `PATCH /:id/status` 만) |
| 2 | [api/settings.ts](apps/admin-dashboard/src/api/settings.ts#L235) | `unifiedApi.raw` | `/api/settings/export`, `/api/settings/cache/clear` | ⚠ export 만 ✅ (401), cache/clear ❌ |
| 1 | [pages/test/UserEditTest.tsx](apps/admin-dashboard/src/pages/test/UserEditTest.tsx#L254) | `unifiedApi.raw` | `/api/users` | ✅ |

> **핵심**: 이 클러스터는 **`/v1` 만 붙여도 대부분 살아나지 않는다.** prefix 결함 + legacy 결함이 겹쳐 있다.
> 같은 파일 안에 `/v1/users` (정상) 와 `/content/posts` (누락) 가 **혼재**한다는 점이 `unifiedApi.raw` 규칙 부재의 증거다.

### C. `same-origin-no-proxy` — 35건 / 10파일

| 건수 | 파일 | 대상 |
|---:|---|---|
| 9 | [pages/digital-signage/v2/hq/HQContentManager.tsx](apps/admin-dashboard/src/pages/digital-signage/v2/hq/HQContentManager.tsx#L141) | `/api/signage/{serviceKey}/global/*` — **backend 는 실재** |
| 5 | [hooks/useBlockPatterns.ts](apps/admin-dashboard/src/hooks/useBlockPatterns.ts#L133) | `/api/block-patterns` — 부재 |
| 5 | [hooks/useReusableBlocks.ts](apps/admin-dashboard/src/hooks/useReusableBlocks.ts#L83) | `/api/reusable-blocks` — 부재 |
| 4 | [utils/affiliateTrackingUtils.ts](apps/admin-dashboard/src/utils/affiliateTrackingUtils.ts#L87) | `/api/v1/affiliate/*` — 부재 |
| 4 | [utils/partnerTrackingUtils.ts](apps/admin-dashboard/src/utils/partnerTrackingUtils.ts#L87) | `/api/v1/partner/track-click` |
| 3 | [components/shortcodes/admin/ApprovalQueue.tsx](apps/admin-dashboard/src/components/shortcodes/admin/ApprovalQueue.tsx#L99) | `/api/v1/approval/queue` — 404 |
| 2 | [services/cartService.ts](apps/admin-dashboard/src/services/cartService.ts#L229) | `/api/v1/ecommerce/cart` |
| 1 | [components/editor/PatternPageBuilder.tsx](apps/admin-dashboard/src/components/editor/PatternPageBuilder.tsx#L91) | `/api/block-patterns` |
| 1 | [components/payment/TossPaymentButton.tsx](apps/admin-dashboard/src/components/payment/TossPaymentButton.tsx#L92) | `/api/v1/payments/toss/create` — 404 |
| 1 | [types/user.ts](apps/admin-dashboard/src/types/user.ts#L71) | `/api/v1/roles` — 404 |

---

## 6. service segment 필요 여부

Boundary Policy(CLAUDE.md §7)상 **Broadcast(CMS·Signage) 는 `serviceKey` 가 Primary Boundary** 다.
backend Signage 정본은 `app.use('/api/signage/:serviceKey', …)` (register-routes.ts:999) — **`/api/v1` 밖 · serviceKey 필수**.

| 파일 | 건수 | serviceKey | prefix | 판정 |
|---|---:|---|---|---|
| [lib/api/digitalSignage.ts](apps/admin-dashboard/src/lib/api/digitalSignage.ts#L10) | 33 | ❌ **누락** (`API_BASE='/signage'`) | ❌ `/api/v1/signage/*` | **SERVICE_SEGMENT_REVIEW** — 실측 404 |
| [lib/api/signageV2.ts](apps/admin-dashboard/src/lib/api/signageV2.ts#L425) | 38 | ✅ 있음 | ❌ double-api | PREFIX_FIX |
| [pages/digital-signage/v2/hq/HQContentManager.tsx](apps/admin-dashboard/src/pages/digital-signage/v2/hq/HQContentManager.tsx) | 9 | ✅ 있음 | ❌ same-origin | PREFIX_FIX |
| [pages/digital-signage/v2/MonitoringDashboard.tsx](apps/admin-dashboard/src/pages/digital-signage/v2/MonitoringDashboard.tsx#L129) | 3 | ❌ 누락 | ❌ double-api | 둘 다 |

**즉 Signage 는 admin-dashboard 안에서 3가지 관례가 동시에 쓰이고 있으며 어느 것도 도달하지 못한다.**

CMS(`/api/v1/cms/contents`)는 `serviceKey` 를 **경로 세그먼트가 아니라 query 필터**로 받는다
(`cms-content-query.handler.ts:39-45`). → 경로 규칙 문제 아님, §7 REVIEW-2 로 넘긴다.

`/operator/*` 계열은 IR 지시대로 **재확인만** 수행: LIVE 4건 전부 SHAPE_OK + mount 존재. **즉시 수정 0건, 정렬 완료 재확인.**
(유일한 이상값 `pages/dashboard/unified/cards/OperatorCard.tsx:31` 은 주석 처리된 죽은 줄이다.)

---

## 7. legacy / dead endpoint 후보 (178건 / 42파일)

prefix 는 정합인데 backend 가 없는 것들. **SPA route 는 전부 살아 있어 화면 진입이 가능하다** (`/monitoring`, `/categories`, `/posts/tags`, `/appearance/template-parts`, `/partnerops/*`, `/sellerops/*`, `/storefront/*`, `/reusable-blocks`, `/cpt-engine/presets/*` 등 확인).

| 건수 | 경로 루트 | 대표 파일 | backend |
|---:|---|---|---|
| 33 | `/api/v1/signage/*` | `lib/api/digitalSignage.ts` | ✅ **다른 경로에 있음** → PRODUCE |
| 33 | `/api/v1/lms/marketing/*` | `lib/api/lmsMarketing.ts` | ❌ 전무 |
| 16 | `/api/v1/partnerops/*` | `pages/partnerops/pages/*` (6파일) | ❌ |
| 15 | `/api/v1/acf/*` | `features/cpt-acf/services/acf.api.ts` | ❌ |
| 12 | `/api/v1/presets/*` | `api/presets.ts` | ❌ |
| 10 | `/api/v1/posts/*` | `hooks/posts/usePostsData.ts`, `pages/pages/PageList.tsx` 외 | ❌ |
| 8 | `/api/v1/content/*` | `pages/media/*`, `pages/posts/Categories.tsx` 외 | ✅ **`/api/v1/cms/contents` 로 대체 가능** |
| 7 | `/api/v1/vendors/*` | `services/api/vendorApi.ts` 외 | ❌ |
| 6 | `/api/v1/inventory/*` | `components/inventory/*` | ❌ |
| 6 | `/api/v1/template-parts/*` | `pages/appearance/*` | ❌ |
| 5 | `/api/v1/categories/*` | `hooks/useCategories.ts` 외 | ❌ |
| 5 | `/api/v1/storefront/*` | `pages/storefront/*` (5파일) | ❌ |
| 4 | `/api/v1/monitoring/*` | `pages/monitoring/*` | ❌ |
| 3 | `/api/v1/tags/*` | `pages/categories/TagList.tsx` | ❌ |
| 2씩 | `/api/v1/widgets`, `/widget-templates`, `/roles`, `/taxonomies`, `/templates`, `/media` | — | ❌ |
| 1씩 | `/api/v1/pharmacy/*`, `/api/v1/menus/*`, `/api/v1/sellerops/*` | — | ❌ |

### UI_RETIRE 후보 (orphan 파일)

QR 은 지시대로 **실행 경로에서 제거된 것을 확인**했다.
`routes/lms-marketing.routes.tsx:163,170` 이 `/store/qr`·`/store/qr/create` 를 **`StoreQrGuidePage`** (API 호출 0건) 로 연결한다.

다만 아래 3파일은 **어떤 route 도 참조하지 않는 orphan 으로 잔존**한다 (실사용 404 는 아니고 죽은 코드):
- [apps/admin-dashboard/src/api/qr.api.ts](apps/admin-dashboard/src/api/qr.api.ts) — `/pharmacy/qr/*` 6개 호출 보유
- [apps/admin-dashboard/src/pages/store/qr/QrCreatePage.tsx](apps/admin-dashboard/src/pages/store/qr/QrCreatePage.tsx)
- [apps/admin-dashboard/src/pages/store/qr/QrListPage.tsx](apps/admin-dashboard/src/pages/store/qr/QrListPage.tsx)

`api/apiRequest.ts` 도 호출부 0건인 dead helper 다.

---

## 8. 정책 REVIEW 후보

| # | 항목 | 쟁점 |
|---|---|---|
| **REVIEW-1** | **`/api/v1` 밖 mount 의 존재** | `/api/ai`, `/api/signage/:serviceKey`, `/api/operator`, `/api/checkout`, `/api/orders`, `/api/accounts`, `/api/partner`, `/api/admin/orders`, `/api/v2/roles` 는 v1 밖에 있다. base 가 `/api/v1` 로 고정된 `authClient` 로는 도달 불가. **backend 를 v1 아래로 정렬할지, client 에 escape 수단을 둘지** 정책 결정 필요. 이 결정 없이는 §5-A 의 signage/ai 클러스터를 고칠 수 없다. |
| **REVIEW-2** | **`content/*` → `cms/contents` 이관 여부** | admin 의 posts/pages/media/categories UI 는 존재하지 않는 `/content/*` 를 본다. 정본 `/api/v1/cms/contents` 는 살아 있다(200). **이관(PRODUCE) vs 화면 폐기(UI_RETIRE)** 판단 필요 — 영향 범위 65건+. |
| **REVIEW-3** | **client 8종 난립** | 동일 앱에서 base 해석이 5가지다. 특히 `unifiedApi.raw`(`/v1` 미주입)와 `lib/api-client`(`/api` 그대로)가 사고 원인. **canonical client 1개 + 금지 규칙**을 CLAUDE.md §1 API 호출 규칙에 명문화할지 결정 필요. |
| **REVIEW-4** | **`/api/v1/admin/*` 가 404 를 401 로 가린다** | `dashboard.routes.ts:17-18` 의 경로 없는 `router.use(authenticate)` 때문에 **존재하지 않는 admin 경로도 401** 을 낸다. 최근 OperatorsPage 사고(로드 실패가 "권한 0건"으로 위장)와 같은 계열의 **진단 가능성 저하**다. 게이트 순서 조정은 권한 경계 변경이라 별도 판단 필요. |
| **REVIEW-5** | **admin 프런트 `/__debug__/*` 3개 라우트** | `routes/public.routes.tsx:64,78` 가 프로덕션 번들에 debug 화면을 등록한다. backend `/__debug__` 는 이미 비프로덕션 한정으로 차단됐으나 **프런트는 그대로**다. CLAUDE.md §8 "debug route 는 프로덕션에 등록하지 않는다" 와의 정합 판단 필요. |
| **REVIEW-6** | **`VITE_API_BASE_URL` 미주입** | `config/apps.config.ts:87`, `pages/neture/Partnership*.tsx` 가 `VITE_API_BASE_URL` 을 읽지만 `deploy-admin.yml` 은 주입하지 않는다. 현재는 하드코딩 fallback 으로 동작 중 — 환경 분리 시 깨진다. |

---

## 9. 건드리지 말아야 할 것

| 대상 | 이유 |
|---|---|
| `/operator/*` 4건 | 기존 IR 판정대로 정렬 완료. 재감사·재수정 불필요 |
| `unifiedApi.<namespace>` (content/platform 17건) | `v1()` 주입이 정상 동작 — `raw` 와 혼동 금지 |
| `packages/auth-client` · `auth-react` · `auth-context` · `lms-client` | API path 결함 0건. 최근 병합된 `auth-react` 공통화 결과물이며 이번 범위 밖 |
| `/store/qr` route | 이미 안내 화면으로 교체 완료. 되돌리지 말 것 |
| `PASS` 366건 | 정합 확인됨 |
| 동적 경로 68건 | 정적 판정 불가 — 추측으로 수정 금지, 필요 시 런타임 계측 별도 WO |

---

## 10. read-only 준수 확인

| 금지 항목 | 상태 |
|---|---|
| 코드 수정 | ❌ 없음 |
| API route 추가 | ❌ 없음 |
| 프론트 호출 수정 | ❌ 없음 |
| DB write | ❌ 없음 (DB 접속 자체 없음) |
| migration | ❌ 없음 |
| 배포 | ❌ 없음 |
| 메뉴 변경 | ❌ 없음 |
| 권한/role/ownership 정책 변경 | ❌ 없음 |

프로덕션 접촉은 **비인증 GET 상태코드 관측 34건** 뿐이며, 응답 본문을 읽거나 저장하지 않았다.
`apps/` · `packages/` · `.github/` 아래 변경 파일 0건. 본 IR 문서 1개만 신규 생성.

---

## 부록 — 다음 WO 분리 제안

| 후보 | 범위 | 선행 조건 |
|---|---|---|
| WO-A | `double-api` 중 **backend 실재분만** (signage 45 + users/ai/organizations/notifications 12) | REVIEW-1 결정 필요 |
| WO-B | Signage service segment 정렬 (`digitalSignage.ts` 33 + `MonitoringDashboard` 3) | REVIEW-1 과 함께 |
| WO-C | `content/*` → `cms/contents` 이관 또는 화면 폐기 | REVIEW-2 결정 필요 |
| WO-D | orphan 정리 (`qr.api.ts`, `QrCreatePage`, `QrListPage`, `apiRequest.ts`) | 없음 — 단독 가능 |
| WO-E | legacy 화면 처리 (partnerops / storefront / vendors / monitoring / template-parts / presets / acf / inventory / widgets) | 사업 판단 — 화면별 존치 여부 |
| WO-F | client canonical 화 + lint 규칙 | REVIEW-3 결정 필요 |

---

*작성: 2026-08-10 · 기준 commit `b975107` · read-only IR*
