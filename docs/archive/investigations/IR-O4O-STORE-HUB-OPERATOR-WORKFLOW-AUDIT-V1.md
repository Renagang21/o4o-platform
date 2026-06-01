# IR-O4O-STORE-HUB-OPERATOR-WORKFLOW-AUDIT-V1

> **조사 목적:** O4O/KPA 구조 안에서 운영자가 수행하는 "매장 HUB 운영 업무"를 실제 코드·기능 기준으로 재발견
>
> **조사 방법:** register-routes.ts + KPA 라우트 트리 + 컨트롤러 + 엔티티 + 마이그레이션 + Frontend 페이지 전수 탐색 (추정 없음)
>
> **조사 일자:** 2026-05-15
>
> **기준 커밋:** main (971a013c2)
>
> **상태:** COMPLETE

---

## 목차

1. [핵심 발견사항 요약](#1-핵심-발견사항-요약)
2. [운영자 업무 분류표](#2-운영자-업무-분류표)
3. [KPA 도메인 API 전수 목록](#3-kpa-도메인-api-전수-목록)
4. [Signage HQ 운영 API](#4-signage-hq-운영-api)
5. [Store HUB API 구조](#5-store-hub-api-구조)
6. [Store 자료함 및 Playlist API](#6-store-자료함-및-playlist-api)
7. [Frontend 운영자 UI 현황](#7-frontend-운영자-ui-현황)
8. [실제 운영 흐름 다이어그램](#8-실제-운영-흐름-다이어그램)
9. [admin-force-asset 상세 구조](#9-admin-force-asset-상세-구조)
10. [working-content 구조 판정](#10-working-content-구조-판정)
11. [매장 HUB 콘텐츠 공급 체계](#11-매장-hub-콘텐츠-공급-체계)
12. [Signage 운영 구조 상세](#12-signage-운영-구조-상세)
13. [숨겨진 기능 목록 (API only)](#13-숨겨진-기능-목록-api-only)
14. [단절(Dead) 기능 목록](#14-단절dead-기능-목록)
15. [Orphan 후보](#15-orphan-후보)
16. [매장 HUB 운영 IA 재편 핵심 후보](#16-매장-hub-운영-ia-재편-핵심-후보)

---

## 1. 핵심 발견사항 요약

### F1. 강제 콘텐츠 운영 인프라 — 완성, UI 없음

두 가지 강제 배포 경로가 모두 API + DB 레벨에서 완전 구현되어 있으나 운영자 UI가 전무하다.

- **경로 A:** `kpa_store_asset_controls.is_forced=true` — 특정 조직에 특정 snapshot을 강제 push
- **경로 B:** `signage_forced_content` — service_key 전체 store playlist에 기간 기반 YouTube/Vimeo 영상 자동 삽입

경로 B는 store-playlist 렌더 시 `store_playlist_items UNION ALL signage_forced_content` 쿼리로 실제 동작 중이다 (`apps/api-server/src/routes/o4o-store/repositories/store-playlist.repository.ts:145`).

### F2. Event Offer 운영 API — 완성, UI 완전 단절

`/api/v1/kpa/groupbuy-admin/*` API (products/available-offers/toggle/order/stats 등) 완전 구현.

단, `admin-dashboard/src/hooks/groupbuy/*.ts`는 존재하지 않는 `/api/groupbuy/campaigns` 경로를 호출 → **런타임 완전 비동작**.
현재 KPA Event Offer API와 기존 groupbuy hook은 완전 단절 상태.

### F3. Store HUB API — 완성, 호출하는 프론트엔드 코드 미발견

`/api/v1/kpa/store-hub/*` (overview/channels/kpi-summary/live-signals/capabilities/slug) 모두 구현.
프론트엔드 전체 검색에서 이 API를 직접 호출하는 코드 미발견.

### F4. 커뮤니티 관리 API — 완성, UI 없음

`/api/v1/kpa/community/manage/ads|sponsors|quick-links` CRUD 완성.
Public 조회 API는 동작 중 (`/community/ads`, `/community/sponsors`, `/community/quick-links`).
관리 API만 UI 없음.

### F5. 공급자 Signage 캠페인 요청 → 강제 삽입 흐름 — end-to-end 완성

공급자가 자신의 승인된 signage_media로 캠페인 요청 → 운영자 승인 → `signage_forced_content` 자동 생성 → store playlist UNION 삽입 전체 흐름 구현 완성. 공급자 요청 UI만 없음.

### F6. LMS Marketing API — 호출 경로 미등록

`admin-dashboard/src/lib/api/lmsMarketing.ts`가 `/api/v1/lms/marketing` 호출.
`register-routes.ts` 전체 탐색 결과 해당 경로 미등록 → **dead**.

---

## 2. 운영자 업무 분류표

### 2-A. 현재 사용 가능 (API + UI 모두 존재)

| 업무 그룹 | 세부 업무 | API 경로 | UI 위치 |
|----------|----------|---------|--------|
| **운영 대시보드** | KPI·콘텐츠·포럼·분회 요약 | `/kpa/operator/summary` | 운영자 대시보드 |
| **콘텐츠 승인** | 공급자 제출 + signage 캠페인 요청 승인/반려 | `/kpa/operator/approvals` | `ContentApprovalsPage` |
| **상품 신청 심사** | 약사 상품 신청 승인/반려/일괄 | `/kpa/operator/product-applications` | OperatorProductApplications |
| **Signage HQ 콘텐츠** | HQ 플레이리스트·미디어 생성/편집/상태전환/삭제 | `/api/signage/:key/hq/*` | `HQContentManager` |
| **Signage 템플릿 관리** | 템플릿·콘텐츠블록·레이아웃 프리셋 | `/api/signage/:key/templates/*` | TemplateBuilder, TemplateList |
| **HUB 콘텐츠 가져가기** | CMS/Signage/LMS/kpa_contents 자료 snapshot 복사 | `/kpa/assets/` | `HubContentsPage` |
| **매장 자료함** | snapshot+direct 통합 피드 | `/kpa/store-library/contents` | `MyStoreContentsPage` |
| **매장 플레이리스트** | 플레이리스트 CRUD + 항목 추가/정렬 | `/kpa/store-playlists/*` | `StoreSignageDashboard` |
| **POP/QR** | 점두 자료 생성 | `/kpa/...pop`, `/kpa/...qr` | `PopListPage`, `QrListPage` |
| **포럼 운영** | 카테고리 CRUD, 모더레이션 | `/kpa/forum/...` | 포럼 운영 페이지 |
| **LMS 과정 관리** | 과정 승인/반려/아카이브 | `/kpa/lms/operator/*` | LMS 운영 |

### 2-B. API만 존재 (UI 없음)

| 업무 그룹 | 세부 업무 | API 경로 | 가드 |
|----------|----------|---------|------|
| **Asset 강제 배포** | 특정 조직에 snapshot 강제 push/잠금/기간 | `/kpa/admin/force-assets` | `kpa:admin` |
| **Signage 강제 콘텐츠 직접 관리** | 기간 기반 YouTube/Vimeo 전체 매장 삽입 | `/api/signage/:key/hq/forced-content` | `requireSignageOperator` |
| **Event Offer 운영** | 공급 상품 진열·순서·토글·통계 | `/kpa/groupbuy-admin/*` | `kpa:operator` |
| **워킹 콘텐츠 관리** | HUB 콘텐츠 복사본 편집·발행 | `/kpa/operator/working-contents` | `requireAuth` (owner) |
| **커뮤니티 배너 관리** | 광고 배너 CRUD | `/kpa/community/manage/ads` | `kpa:operator` |
| **커뮤니티 스폰서 관리** | 스폰서 CRUD | `/kpa/community/manage/sponsors` | `kpa:operator` |
| **커뮤니티 퀵링크 관리** | 퀵링크 CRUD | `/kpa/community/manage/quick-links` | `kpa:operator` |
| **Store HUB 전체** | 매장 개요·KPI·채널·슬러그·Capability | `/kpa/store-hub/*` | store_owner |
| **공급자 캠페인 요청** | 공급자가 signage_media로 캠페인 요청 | `/kpa/supplier/signage/campaign-requests` | `requireAuth` (supplier) |
| **공급자 사이니지 보고서** | 재생 성과 조회 (조직ID 미노출) | `/kpa/supplier/signage/reports` | `requireAuth` (supplier) |

### 2-C. 단절된 기능

| 기능 | 현상 |
|------|------|
| `admin-dashboard/hooks/groupbuy/*.ts` | `/api/groupbuy/campaigns` → 서버 경로 미존재 |
| `admin-dashboard/lib/api/lmsMarketing.ts` | `/api/v1/lms/marketing` → 서버 경로 미등록 |

---

## 3. KPA 도메인 API 전수 목록

**베이스 경로:** `/api/v1/kpa/`  
**라우터 파일:** `apps/api-server/src/routes/kpa/kpa.routes.ts`

### 3.1 admin-force-assets

**컨트롤러:** `routes/kpa/controllers/admin-force-asset.controller.ts`  
**가드:** `requireAuth` + `requireKpaScope('kpa:admin')`

| Method | Path | 기능 |
|--------|------|------|
| GET | `/admin/force-assets` | 강제 배포 전체 목록 (organizationId 필터) |
| POST | `/admin/force-assets` | snapshot → 특정 organization 강제 push |
| PATCH | `/admin/force-assets/:controlId` | 기간/채널 수정 |
| DELETE | `/admin/force-assets/:controlId` | 강제 해제 (is_forced=false) |

### 3.2 operator/working-contents

**컨트롤러:** `routes/kpa/controllers/working-content.controller.ts`  
**가드:** `requireAuth` (owner_id 내부 검증)

| Method | Path | 기능 |
|--------|------|------|
| GET | `/operator/working-contents` | 내 워킹 콘텐츠 목록 |
| GET | `/operator/working-contents/:id` | 상세 |
| PUT | `/operator/working-contents/:id` | title/blocks/tags/category 편집 |
| DELETE | `/operator/working-contents/:id` | 삭제 |
| POST | `/operator/working-contents/:id/publish` | → o4o_asset_snapshots 발행 |

### 3.3 operator/summary (대시보드)

**컨트롤러:** `routes/kpa/controllers/operator-summary.controller.ts`  
**가드:** `requireAuth` + `requireKpaScope('kpa:operator')`

| Method | Path | 기능 |
|--------|------|------|
| GET | `/operator/summary` | 통합 KPI (콘텐츠/사이니지/포럼/대기 수) |
| GET | `/operator/forum-analytics` | 포럼 분석 |
| GET | `/operator/district-summary` | 분회 요약 |

### 3.4 operator/approvals (콘텐츠 승인 게이트)

**컨트롤러:** `routes/kpa/controllers/content-approval.controller.ts`  
**가드:** `requireAuth` + `requireKpaScope('kpa:operator')`  
**처리 대상:** `hub_content_submission` | `signage_campaign_request`

| Method | Path | 기능 |
|--------|------|------|
| GET | `/operator/approvals` | 승인 대기 목록 (entity_type 필터) |
| GET | `/operator/approvals/:id` | 상세 |
| POST | `/operator/approvals/:id/approve` | 승인 |
| POST | `/operator/approvals/:id/reject` | 반려 |

### 3.5 operator/product-applications (상품 신청 심사)

**컨트롤러:** `routes/kpa/controllers/operator-product-applications.controller.ts`

| Method | Path | 기능 |
|--------|------|------|
| GET | `/operator/product-applications` | 신청 목록 |
| GET | `/operator/product-applications/stats` | 통계 |
| PATCH | `/operator/product-applications/:id/approve` | 승인 |
| PATCH | `/operator/product-applications/:id/reject` | 반려 |
| POST | `/operator/product-applications/batch-approve` | 일괄 승인 |
| DELETE | `/operator/product-applications/:id` | 삭제 |

### 3.6 groupbuy-admin (Event Offer 운영)

**컨트롤러:** `routes/kpa/controllers/event-offer-operator.controller.ts`  
**등록 경로:** `router.use('/groupbuy-admin', createEventOfferOperatorController(...))`  
**가드:** `requireAuth` (내부 operatorOrgId 해석)

| Method | Path | 기능 |
|--------|------|------|
| GET | `/groupbuy-admin/available-offers` | 등록 가능한 공급 상품 목록 (APPROVED SPO) |
| GET | `/groupbuy-admin/products` | 이벤트 상품 목록 (offerId, 주문수, 참여자수 포함) |
| POST | `/groupbuy-admin/` | 이벤트 상품 등록 |
| POST | `/groupbuy-admin/order` | 상품 순서 변경 |
| POST | `/groupbuy-admin/:id/toggle` | 노출 토글 |
| DELETE | `/groupbuy-admin/:id` | 상품 제거 |
| GET | `/groupbuy-admin/stats` | 집계 통계 |
| GET | `/groupbuy-admin/supplier-stats-status` | 공급자 통계 연계 상태 |
| POST | `/groupbuy-admin/validate` | 오퍼 유효성 검증 |

### 3.7 supplier (공급자 흐름)

| 경로 | 컨트롤러 | 기능 |
|------|---------|------|
| `/supplier/content-submissions` | `supplier-content.controller.ts` | 공급자 마케팅 콘텐츠 제출 |
| `/supplier/signage/campaign-requests` | `supplier-campaign-request.controller.ts` | signage 캠페인 요청 |
| `/supplier/signage` | `supplier-signage-report.controller.ts` | 재생 성과 보고서 |

### 3.8 community/manage (커뮤니티 운영)

**컨트롤러:** `routes/kpa/controllers/community-hub.controller.ts`  
**가드:** `requireAuth` + `requireKpaScope('kpa:operator')`

| Path | 기능 |
|------|------|
| `GET /community/ads` | 활성 광고 조회 (public) |
| `GET /community/sponsors` | 활성 스폰서 조회 (public) |
| `GET /community/quick-links` | 활성 퀵링크 조회 (public) |
| `GET/POST/PUT/DELETE /community/manage/ads(/:id)` | 광고 CRUD (operator) |
| `GET/POST/PUT/DELETE /community/manage/sponsors(/:id)` | 스폰서 CRUD (operator) |
| `GET/POST/PUT/DELETE /community/manage/quick-links(/:id)` | 퀵링크 CRUD (operator) |

### 3.9 store 자료/에셋 (매장 실행 계층)

| 경로 | 컨트롤러 | 기능 |
|------|---------|------|
| `/assets/*` | `asset-snapshot.controller.ts` | Asset Snapshot CRUD (cms/signage/lesson/content/resource) |
| `/store-assets/*` | `store-asset-control.controller.ts` | publish_status/channel_map 제어 |
| `/store-contents/*` | `store-content.controller.ts` | kpa_store_contents (snapshot_edit/direct) |
| `/store-library/contents` | `store-library-feed.controller.ts` | snapshot+direct UNION 피드 |
| `/store-playlists/*` | `store-playlist.controller.ts` | 매장 플레이리스트 CRUD + 항목 관리 |
| `/published-assets/*` | `published-assets.controller.ts` | 발행된 자산 공개 조회 |

---

## 4. Signage HQ 운영 API

**베이스 경로:** `/api/signage/:serviceKey/`  
**라우터 파일:** `apps/api-server/src/routes/signage/signage.routes.ts`

### 역할별 접근 구분

| 역할 미들웨어 | 적용 범위 |
|------------|----------|
| `requireSignageAdmin` | (현재 사용 경로 없음 — 기존 admin 엔드포인트 제거됨) |
| `requireSignageOperator` | `/hq/*` 전체, templates CRUD, content-blocks CRUD, layout-presets CRUD |
| `requireSignageStore` | 플레이리스트/미디어/스케줄 CRUD |
| `requireSignageOperatorOrStore` | 플레이리스트 조회, 항목 관리 |
| `allowSignageStoreRead` | templates 읽기, global 콘텐츠, active-content |
| `requireSignageCommunity` | `/community/*` |

### HQ 운영자 전용 엔드포인트

| Method | Path | 기능 |
|--------|------|------|
| POST | `/hq/playlists` | HQ 플레이리스트 생성 (scope='global', source='hq') |
| PATCH | `/hq/playlists/:id` | HQ 플레이리스트 수정 |
| PATCH | `/hq/playlists/:id/status` | 승인 상태 전환 (draft→approved) |
| DELETE | `/hq/playlists/:id` | hard delete |
| POST | `/hq/media` | HQ 미디어 생성 |
| PATCH | `/hq/media/:id` | HQ 미디어 수정 |
| PATCH | `/hq/media/:id/status` | 미디어 승인 상태 전환 |
| DELETE | `/hq/media/:id` | hard delete |
| **GET** | **`/hq/forced-content`** | **강제 콘텐츠 목록** ← UI 없음 |
| **POST** | **`/hq/forced-content`** | **강제 콘텐츠 생성 (기간+YouTube/Vimeo)** ← UI 없음 |
| **PATCH** | **`/hq/forced-content/:id`** | **강제 콘텐츠 수정** ← UI 없음 |
| **DELETE** | **`/hq/forced-content/:id`** | **강제 콘텐츠 soft delete** ← UI 없음 |
| POST | `/templates` | 템플릿 생성 |
| PATCH/DELETE | `/templates/:id` | 템플릿 수정/삭제 |
| POST/PATCH/DELETE | `/templates/:tid/zones(/:zid)` | Zone 관리 |
| POST/PATCH/DELETE | `/content-blocks(/:id)` | 콘텐츠 블록 CRUD |
| POST/PATCH/DELETE | `/layout-presets(/:id)` | 레이아웃 프리셋 CRUD |

### 강제 콘텐츠 자동 삽입 메커니즘 (코드 근거)

`apps/api-server/src/routes/o4o-store/repositories/store-playlist.repository.ts:130-156`:

```sql
-- store_playlist_items에 signage_forced_content를 UNION ALL로 실시간 합산
SELECT ... FROM store_playlist_items
WHERE playlist_id = $1
UNION ALL
SELECT 'forced-' || fc.id AS id, ...
FROM signage_forced_content fc
WHERE fc.service_key = $2
  AND fc.is_active = true
  AND fc.deleted_at IS NULL
  AND NOW() >= fc.start_at
  AND NOW() <= fc.end_at
ORDER BY "displayOrder" ASC
```

→ 플레이어가 `/kpa/store-playlists/public/:id` 조회 시 기간 내 강제 콘텐츠가 자동 포함.

### 커뮤니티 콘텐츠 생성

| Method | Path | 기능 | 가드 |
|--------|------|------|------|
| POST | `/community/media` | 커뮤니티 미디어 생성 | `requireSignageCommunity` |
| DELETE | `/community/media/:id` | 자신의 미디어 삭제 | `requireSignageCommunity` |
| POST | `/community/playlists` | 커뮤니티 플레이리스트 생성 | `requireSignageCommunity` |
| DELETE | `/community/playlists/:id` | 자신의 플레이리스트 삭제 | `requireSignageCommunity` |

---

## 5. Store HUB API 구조

**베이스 경로:** `/api/v1/kpa/store-hub/`  
**컨트롤러:** `apps/api-server/src/routes/o4o-store/controllers/store-hub.controller.ts`  
**서비스키:** `serviceKey='kpa'`  
**프론트엔드 호출 코드:** 미발견

| Method | Path | 가드 | 기능 | 반환 |
|--------|------|------|------|------|
| GET | `/overview` | `requireAuth` + `optionalAuth` | Products+Contents+Signage 통합 개요 | `StoreHubOverview` |
| GET | `/channels` | `requireAuth` + `optionalAuth` | 채널 목록 + KPI (상품수/가시성) | Channel[] + organizationCode |
| POST | `/channels` | `requireAuth` + `requirePharmacyOwner` | 채널 생성 (B2C/KIOSK/TABLET/SIGNAGE) — 즉시 APPROVED | Channel |
| GET | `/slug` | `requireAuth` + `requirePharmacyOwner` | 현재 슬러그 + canChange | SlugInfo |
| PATCH | `/slug` | `requireAuth` + `requirePharmacyOwner` | 슬러그 변경 (1회 정책) | UpdatedSlug |
| GET | `/kpi-summary` | `requireAuth` + `optionalAuth` | 주문/매출 KPI (checkout_orders) | KpiData |
| GET | `/live-signals` | `requireAuth` + `optionalAuth` | 신규주문/태블릿요청/판매요청/설문 실시간 수 | SignalCounts |
| GET | `/capabilities` | `requireAuth` + `requirePharmacyOwner` | 매장 Capability 목록 | Capability[] |

**StoreHubOverview 구조:**
```
{
  organizationId, organizationName,
  products: { glycopharm: {totalCount, link}, cosmetics: {listedCount, link} },
  contents: { slots: [{serviceKey, slotKey, count, link}], totalSlotCount },
  signage: { pharmacy: {contentCount, activeCount, link} }
}
```

---

## 6. Store 자료함 및 Playlist API

### 6.1 Store Playlist

**베이스 경로:** `/api/v1/kpa/store-playlists/`  
**컨트롤러:** `routes/o4o-store/controllers/store-playlist.controller.ts`  
**가드:** `requireAuth` + store owner 검증

| Method | Path | 기능 |
|--------|------|------|
| GET | `/` | 내 매장 플레이리스트 목록 |
| GET | `/public/:id` | 렌더링용 (강제 콘텐츠 UNION 포함) |
| POST | `/` | 플레이리스트 생성 |
| PATCH | `/:id` | 수정 |
| DELETE | `/:id` | 삭제 |
| GET | `/:id/items` | 항목 목록 |
| POST | `/:id/items` | 항목 추가 (snapshot 직접) |
| POST | `/:id/items/from-library` | 자료함에서 추가 |
| POST | `/:id/items/from-signage` | Signage Media에서 추가 |
| PATCH | `/:id/items/reorder` | 순서 변경 |
| DELETE | `/:id/items/:itemId` | 항목 삭제 (is_forced=true 거부) |

### 6.2 Asset Snapshot (HUB 자료 가져가기)

**베이스 경로:** `/api/v1/kpa/assets/`  
**컨트롤러:** `routes/o4o-store/controllers/asset-snapshot.controller.ts`  
**허용 역할:** kpa:admin, kpa:operator, kpa:pharmacist, kpa:store_owner  
**지원 asset_type:** cms, signage, lesson, content, resource

### 6.3 Store Library Feed

**베이스 경로:** `/api/v1/kpa/store-library/`  
**기능:** `o4o_asset_snapshots` + `kpa_store_contents(direct)` UNION 통합 피드  
**엔드포인트:** `GET /store-library/contents?page=&limit=&search=&type=`

---

## 7. Frontend 운영자 UI 현황

### 7.1 admin-dashboard 페이지 목록

| 경로 | 파일 | 연결 API | 상태 |
|------|------|---------|------|
| `pages/kpa/HubContentsPage.tsx` | HubContentsPage | `/kpa/assets/*` | ✅ 동작 |
| `pages/kpa/HubNoticeListPage.tsx` | HubNoticeListPage | KPA notices API | ✅ 동작 |
| `pages/kpa/MyStoreContentsPage.tsx` | MyStoreContentsPage | `/kpa/store-library/contents` | ✅ 동작 |
| `pages/kpa/StoreContentWorkspacePage.tsx` | StoreContentWorkspacePage | `/kpa/store-contents/*` | ✅ 동작 |
| `pages/operator/ContentApprovalsPage.tsx` | ContentApprovalsPage | `/kpa/operator/approvals` | ✅ 동작 |
| `pages/operator/AuthAnalyticsPage.tsx` | AuthAnalyticsPage | analytics API | ✅ |
| `pages/operator/MyPolicyPage.tsx` | MyPolicyPage | policy API | ✅ |
| `pages/operator/PointSpendPage.tsx` | PointSpendPage | point API | ✅ |
| `pages/digital-signage/v2/hq/HQContentManager.tsx` | HQContentManager | `/api/signage/:key/hq/playlists`, `/hq/media` | ✅ 동작 (forced-content UI 없음) |
| `pages/digital-signage/v2/store/StoreSignageDashboard.tsx` | StoreSignageDashboard | `/kpa/store-playlists/*` | ✅ 동작 |
| `pages/groupbuy/GroupbuyCampaignListPage.tsx` | GroupbuyCampaignListPage | `/api/groupbuy/campaigns` ← **미존재 경로** | ❌ Dead |
| `pages/marketing/operator-console/index.tsx` | OperatorConsole | `/api/v1/lms/marketing` ← **미등록 경로** | ❌ Dead |

### 7.2 메뉴 노출 현황

**파일:** `apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx`

| 섹션 | 노출 여부 |
|------|---------|
| Digital Signage (Operations/Displays/Media/Schedules) | ✅ `roles: ['admin', 'super_admin']` |
| 콘텐츠 승인 (`/operator/approvals`) | ✅ |
| **admin-force-assets** | ❌ 없음 |
| **Signage 강제 콘텐츠** | ❌ 없음 |
| **Event Offer 운영** | ❌ 없음 (기존 groupbuy 메뉴는 dead 경로) |
| **Store HUB** | ❌ 없음 |
| **커뮤니티 관리** | ❌ 없음 |

---

## 8. 실제 운영 흐름 다이어그램

### 8.1 공급자 콘텐츠 → HUB → 매장 흐름

```
[공급자]
  POST /kpa/supplier/content-submissions
    → cms_contents 생성
    → kpa_approval_requests 생성 (entity_type='hub_content_submission', status='pending')

[운영자]
  GET /kpa/operator/approvals?entity_type=hub_content_submission
  POST /kpa/operator/approvals/:id/approve
    → cms_contents.status = 'approved'
    → HUB 노출 (producer='supplier')

[HUB → 매장]
  GET /api/v1/hub/contents?serviceKey=kpa&producer=supplier
  POST /kpa/assets/copy  (asset-snapshot-copy)
    → o4o_asset_snapshots 생성 (store 소유)
    → kpa_store_asset_controls 생성 (snapshot_type='user_copy')
  PATCH /kpa/store-assets/:controlId
    → publish_status='published', channel_map 설정
```

### 8.2 공급자 Signage 캠페인 → 전체 매장 삽입 흐름

```
[공급자]
  GET /kpa/supplier/signage/campaign-requests/my-media  (본인 활성 media 목록)
  POST /kpa/supplier/signage/campaign-requests
    → kpa_approval_requests 생성 (entity_type='signage_campaign_request')

[운영자]
  GET /kpa/operator/approvals?entity_type=signage_campaign_request
  POST /kpa/operator/approvals/:id/approve
    → signage_forced_content 생성
    → media_id, campaign_request_id 연결 (추적용)

[플레이어 렌더]
  GET /kpa/store-playlists/public/:id
    → store_playlist_items UNION ALL signage_forced_content (기간 체크)
    → 캠페인 영상 자동 포함
```

### 8.3 Admin 강제 배포 흐름 (API only)

```
[Admin]
  GET /kpa/admin/force-assets               (현재 강제 배포 현황)
  POST /kpa/admin/force-assets
    Body: { snapshotId, organizationId, forcedStartAt, forcedEndAt, channelMap }
    → kpa_store_asset_controls 생성
    → is_forced=true, is_locked=true, snapshot_type='hq_forced'
    → forced_by_admin_id=adminId, 기간 설정

[매장 측]
  - locked=true → store 수정/삭제 불가
  - channel_map에 지정된 채널에만 노출
  - 기간 만료 → lifecycle_status='expired'

[Admin 해제]
  DELETE /kpa/admin/force-assets/:controlId
    → is_forced=false, is_locked=false, snapshot_type='user_copy'
    → 매장이 이후 직접 수정 가능
```

### 8.4 Event Offer 공급 흐름 (API only — UI dead)

```
[공급자]
  POST /kpa/supplier/event-offers  (공급자 제안)

[운영자]
  GET /kpa/groupbuy-admin/available-offers  (등록 가능한 APPROVED SPO 목록)
  POST /kpa/groupbuy-admin/                 (진열 등록)
  POST /kpa/groupbuy-admin/:id/toggle       (노출 토글)
  POST /kpa/groupbuy-admin/order            (진열 순서 변경)
  GET  /kpa/groupbuy-admin/stats            (주문수/참여자수 통계)

[매장]
  GET /kpa/groupbuy/...  (매장에서 이벤트 오퍼 열람/주문)
```

### 8.5 워킹 콘텐츠 편집 → 발행 흐름 (API only)

```
[HUB 콘텐츠 복사]
  POST /kpa/content/:id/copy-to-working  (kpa.routes.ts 내부)
    → kpa_working_contents 생성 (owner_id=user, source_content_id=원본)

[편집]
  PUT /kpa/operator/working-contents/:id
    → edited_blocks, title, tags, category 독립 수정 (원본과 무관)

[발행]
  POST /kpa/operator/working-contents/:id/publish
    → 매장 organization 확인 (isStoreOwner)
    → o4o_asset_snapshots 생성 (asset_type='content')
    → 이후 /kpa/store-assets로 publish_status 제어 가능
```

---

## 9. admin-force-asset 상세 구조

### DB 구조

**테이블:** `kpa_store_asset_controls`  
**엔티티:** `routes/kpa/entities/kpa-store-asset-control.entity.ts`

```
id                UUID PK
snapshot_id       UUID → o4o_asset_snapshots
organization_id   UUID → organizations
publish_status    'draft' | 'published' | 'hidden'
channel_map       JSONB  { [channelKey: string]: boolean }
is_forced         boolean
forced_by_admin_id UUID nullable
forced_start_at   timestamptz nullable
forced_end_at     timestamptz nullable
is_locked         boolean
snapshot_type     'user_copy' | 'hq_forced' | 'campaign_push' | 'template_seed'
lifecycle_status  'active' | 'expired' | 'archived'
UNIQUE(snapshot_id, organization_id)
```

### Signage와의 관계

- `kpa_store_asset_controls` (경로 A) ≠ `signage_forced_content` (경로 B)
- 경로 A: 콘텐츠 자료(cms/lms/kpa_contents) 강제 배포, store의 자료함 레이어
- 경로 B: Signage 영상 스트림 강제 삽입, playlist 렌더 레이어
- store-playlist의 `store_playlist_items.is_forced=true`는 별도 (snapshot 기반 강제 항목)

### 현재 사용 여부

- **API 완전 구현**, UI 없음
- `kpa:admin` 스코프만 접근 가능 → 현재 사용 불가 상태
- `snapshot_type='hq_forced'`, `lifecycle_status`, `campaign_push` 등 확장 예정 구조 포함

---

## 10. working-content 구조 판정

### 목적

`kpa_working_contents` = HUB 콘텐츠(`kpa_contents`)를 매장 사용자(owner_id)가 복사한 **독립 편집 작업공간**

### 흐름

```
kpa_contents (HUB 원본)
  ↓ copy-to-working
kpa_working_contents (owner 소유 독립 복사본, 원본과 sync 없음)
  ↓ PUT /:id (edited_blocks 편집)
  ↓ POST /:id/publish
o4o_asset_snapshots (발행됨)
  ↓ kpa_store_asset_controls
매장 실행 계층
```

### kpa_store_contents와 차이점

| | `kpa_working_contents` | `kpa_store_contents` |
|--|----------------------|--------------------|
| 목적 | HUB 콘텐츠 편집 중간 단계 | 매장 로컬 편집 레이어 |
| source | kpa_contents 복사 | snapshot 편집 또는 direct 생성 |
| 발행 방식 | → o4o_asset_snapshots | 직접 렌더 (COALESCE 우선) |
| owner | owner_id (user) | organization_id (org) |

### orphan 여부

**orphan 아님** — 흐름 정의 명확, API 완성. UI 미구현으로 비활성 상태.  
향후 "매장 콘텐츠 작업공간" UI 구성 시 핵심 중간 레이어로 활용 가능.

---

## 11. 매장 HUB 콘텐츠 공급 체계

### 콘텐츠 원천별 HUB 진입 경로

| 원천 | 경로 | HUB producer | 테이블 |
|------|------|-------------|--------|
| 운영자 직접 제작 | CMS editor → cms_contents | `operator` | `cms_contents` (author_role='admin') |
| 운영자 Signage | `/hq/playlists`, `/hq/media` | `operator` | signage (source='hq') |
| 공급자 콘텐츠 제출 | supplier/content-submissions → 승인 | `supplier` | `cms_contents` |
| 공급자 Signage | signage 등록 → 승인 | `supplier` | signage (source='supplier') |
| 커뮤니티 제작 | `/community/playlists`, `/community/media` | `community` | signage (source='community') |

### HUB → 매장 공급 방식

| 방식 | 구현 | 연결 |
|------|------|------|
| **snapshot copy** (가져가기) | ✅ | HUB 열람 → asset-snapshot-copy → o4o_asset_snapshots |
| **working content 편집 후 발행** | ✅ API, ❌ UI | kpa_working_contents → o4o_asset_snapshots |
| **admin 강제 push** | ✅ API, ❌ UI | kpa_store_asset_controls(is_forced=true) |
| **campaign push** | ✅ 구조 예약 | snapshot_type='campaign_push' |
| **direct 생성** | ✅ | kpa_store_contents(source_type='direct') |
| ~~Store → Community 공유~~ | ❌ 제거됨 | WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1 |

### 렌더링 우선순위

```
1. kpa_store_contents (직접 편집) — 매장 최우선
2. o4o_asset_snapshots (HUB 복사본)
3. kpa_contents (HUB 원본 참조)
```

---

## 12. Signage 운영 구조 상세

### 운영자(HQ) vs 매장 권한

| 기능 | HQ 운영자 | 매장 |
|------|----------|------|
| HQ 플레이리스트/미디어 생성 | ✅ | ❌ |
| 승인 상태 전환 (draft→approved) | ✅ | ❌ |
| 매장 플레이리스트/미디어 생성 | ✅ (operatorOrStore) | ✅ |
| 스케줄 관리 | ❌ | ✅ |
| 템플릿 생성/수정/삭제 | ✅ | ❌ (읽기만) |
| 강제 콘텐츠 관리 | ✅ (API only) | ❌ |
| Global 콘텐츠 열람 | ✅ | ✅ |
| 커뮤니티 콘텐츠 생성 | ❌ | ❌ (community 역할 별도) |

### 서비스키별 분리

```
/api/signage/kpa-society/:path    ← KPA 약사회
/api/signage/glycopharm/:path     ← GlycoPharm
/api/signage/k-cosmetics/:path    ← K-화장품 (확장 라우터 존재)
```

각 서비스별 확장 라우터:
- `routes/signage/extensions/pharmacy/pharmacy.routes.ts`
- `routes/signage/extensions/cosmetics/cosmetics.routes.ts`
- `routes/signage/extensions/seller/seller.routes.ts`

### 기기 모니터링

| 테이블 | 역할 |
|--------|------|
| `signage_heartbeat` | 기기 온/오프라인 상태 (WO-P5-CHANNEL-HEARTBEAT-P1) |
| `signage_playback_logs` | 실제 재생 이력 + 공급자 캠페인 노출 증빙 (WO-P5-CHANNEL-PLAYBACK-LOG-P0) |

---

## 13. 숨겨진 기능 목록 (API only)

> 구현 완성, 어떤 프론트엔드도 호출하지 않는 기능

| # | 기능명 | API 경로 | 가드 | 완성도 | 연결 테이블 |
|---|--------|---------|------|--------|------------|
| 1 | **Admin Force Asset 배포** | `POST /kpa/admin/force-assets` | `kpa:admin` | ✅ | `kpa_store_asset_controls` |
| 2 | **Admin Force Asset 해제** | `DELETE /kpa/admin/force-assets/:id` | `kpa:admin` | ✅ | `kpa_store_asset_controls` |
| 3 | **Signage 강제 콘텐츠 CRUD** | `/api/signage/:key/hq/forced-content` | `requireSignageOperator` | ✅ | `signage_forced_content` |
| 4 | **Event Offer 진열 관리** | `/kpa/groupbuy-admin/*` | `kpa:operator` | ✅ | `organization_product_listings` |
| 5 | **워킹 콘텐츠 편집/발행** | `/kpa/operator/working-contents` | `requireAuth` | ✅ | `kpa_working_contents` |
| 6 | **커뮤니티 배너 관리** | `/kpa/community/manage/ads` | `kpa:operator` | ✅ | `kpa_community_ads` |
| 7 | **커뮤니티 스폰서 관리** | `/kpa/community/manage/sponsors` | `kpa:operator` | ✅ | `kpa_community_sponsors` |
| 8 | **커뮤니티 퀵링크 관리** | `/kpa/community/manage/quick-links` | `kpa:operator` | ✅ | `kpa_community_quick_links` |
| 9 | **Store HUB 전체** | `/kpa/store-hub/*` | store_owner | ✅ | checkout_orders, cms_content_slots 등 |
| 10 | **공급자 캠페인 요청** | `/kpa/supplier/signage/campaign-requests` | `requireAuth` | ✅ | `kpa_approval_requests` |
| 11 | **공급자 사이니지 보고서** | `/kpa/supplier/signage/reports` | `requireAuth` | ✅ | `signage_playback_logs` |

---

## 14. 단절(Dead) 기능 목록

| 기능명 | 프론트엔드 파일 | 호출 경로 | 실제 서버 경로 | 단절 유형 |
|--------|-------------|---------|------------|--------|
| **Groupbuy 캠페인 UI** | `hooks/groupbuy/useGroupbuyCampaigns.ts` | `/api/groupbuy/campaigns` | 미존재 | Frontend→없는 API |
| **Groupbuy 캠페인 상세** | `hooks/groupbuy/useCampaignDetail.ts` | `/api/groupbuy/campaigns/:id` | 미존재 | Frontend→없는 API |
| **LMS Marketing 콘솔** | `lib/api/lmsMarketing.ts` | `/api/v1/lms/marketing` | 미등록 | Frontend→없는 API |

> ⚠️ `admin-dashboard/pages/groupbuy/` 전체 페이지 (GroupbuyCampaignListPage, GroupbuyDetailPage 등)는 존재하지 않는 API를 호출하므로 런타임 완전 비동작.  
> 실제 KPA Event Offer API는 `/api/v1/kpa/groupbuy-admin/*` 경로로 별도 구현되어 있으나 이 프론트엔드 코드와 연결 없음.

---

## 15. Orphan 후보

### 실질적 Orphan (교체/제거 대상)

| 코드 | 판정 | 근거 |
|------|------|------|
| `admin-dashboard/hooks/groupbuy/*.ts` | **Orphan (교체 대상)** | 호출 경로 미존재. 새 Event Offer UI로 교체 필요 |
| `admin-dashboard/pages/groupbuy/GroupbuyCampaign*.tsx` | **Orphan (교체 대상)** | hooks 의존. 전체 groupbuy 폴더 교체 필요 |
| `admin-dashboard/lib/api/lmsMarketing.ts` | **Orphan (제거 후보)** | 미등록 경로 호출, 관련 WO 확인 후 판단 |

### Orphan 아님 (미연결이나 구조 완성)

| 코드 | 판정 |
|------|------|
| `/kpa/operator/working-contents` | **미연결 기능** — API 완성, UI 없음. 향후 활용 가능 |
| `/kpa/admin/force-assets` | **미노출 기능** — API 완성, Admin UI 구현 필요 |
| `/api/signage/:key/hq/forced-content` | **미노출 기능** — HQContentManager 확장으로 연결 가능 |
| `/kpa/store-hub/*` | **미연결 기능** — 매장주 대시보드 진입점으로 활용 가능 |

---

## 16. 매장 HUB 운영 IA 재편 핵심 후보

현재 코드 기준으로 아래 6개 그룹의 API·DB가 이미 완비 상태. 메뉴 연결 또는 UI 신규 구현만 필요.

| 그룹 | 핵심 API | 현재 UI | 재편 우선순위 |
|------|---------|--------|------------|
| **A. 공급 운영** | `/groupbuy-admin/*`, `/operator/approvals`, `/operator/product-applications` | 일부 ✅ | ⭐⭐⭐ — Event Offer UI 완전 교체 필요 |
| **B. HUB 콘텐츠 운영** | `/operator/approvals`, `/community/manage/*`, `/operator/working-contents` | 일부 ✅ | ⭐⭐ — 커뮤니티 관리 UI, 워킹 콘텐츠 흐름 연결 |
| **C. 강제 배포 운영** | `/admin/force-assets`, `/hq/forced-content` | ❌ | ⭐⭐⭐ — Admin 콘솔 신규 구현 필요 |
| **D. Signage 운영** | `/hq/*`, `/playlists`, `/schedules`, `/templates` | 대부분 ✅ | ⭐ — 강제 콘텐츠 관리 추가만 필요 |
| **E. 매장 지원 운영** | `/operator/stores/*`, `contact-requests` | 일부 ✅ | ⭐⭐ — 매장 역량 설정 UI 추가 |
| **F. 매장 콘텐츠 공급** | `/store-hub/*`, `/store-playlists/*`, `/store-library/*` | 일부 ✅ | ⭐⭐ — Store HUB 대시보드 UI 연결 |

### 즉각 WO 후보

| WO 후보 | 목적 | 근거 |
|---------|------|------|
| `WO-O4O-EVENT-OFFER-OPERATOR-UI-REBUILD-V1` | groupbuy-admin API 연결 신규 UI 구축, dead hooks 교체 | F2 |
| `WO-O4O-ADMIN-FORCE-CONTENT-CONSOLE-V1` | admin-force-assets + signage hq/forced-content 관리 UI | F1 |
| `WO-O4O-STORE-HUB-UI-CONNECT-V1` | /store-hub/* API를 매장주 대시보드에 연결 | F3 |
| `WO-O4O-COMMUNITY-MANAGE-UI-V1` | /community/manage/* 관리 UI 구현 | F4 |

---

## 부록: 주요 파일 참조

### API 서버

| 파일 | 역할 |
|------|------|
| `bootstrap/register-routes.ts` | 전체 라우트 등록 기준 |
| `routes/kpa/kpa.routes.ts` | KPA 메인 라우터 (2000+ lines) |
| `routes/signage/signage.routes.ts` | Signage 라우터 |
| `routes/kpa/controllers/admin-force-asset.controller.ts` | 강제 배포 |
| `routes/kpa/controllers/working-content.controller.ts` | 워킹 콘텐츠 |
| `routes/kpa/controllers/event-offer-operator.controller.ts` | Event Offer 운영 |
| `routes/kpa/controllers/content-approval.controller.ts` | 콘텐츠 승인 게이트 |
| `routes/kpa/controllers/community-hub.controller.ts` | 커뮤니티 관리 |
| `routes/kpa/controllers/supplier-campaign-request.controller.ts` | 공급자 캠페인 요청 |
| `routes/signage/controllers/forced-content.controller.ts` | Signage 강제 콘텐츠 |
| `routes/o4o-store/controllers/store-hub.controller.ts` | Store HUB 집계 |
| `routes/o4o-store/repositories/store-playlist.repository.ts` | 강제 콘텐츠 UNION 구현 |

### Frontend

| 파일 | 역할 |
|------|------|
| `admin-dashboard/src/admin/menu/admin-menu.static.tsx` | 메뉴 노출 구조 |
| `admin-dashboard/src/pages/kpa/` | KPA 운영자 페이지 |
| `admin-dashboard/src/pages/operator/ContentApprovalsPage.tsx` | 콘텐츠 승인 UI |
| `admin-dashboard/src/pages/digital-signage/v2/hq/HQContentManager.tsx` | Signage HQ 관리 UI |
| `admin-dashboard/src/hooks/groupbuy/` | ⚠️ dead — `/api/groupbuy/campaigns` 호출 |

---

*Auditor: Claude Code (IR-O4O-STORE-HUB-OPERATOR-WORKFLOW-AUDIT-V1)*  
*Date: 2026-05-15*  
*Method: Full code traversal — register-routes.ts + KPA route tree + controllers + entities + migrations + frontend pages*  
*Status: Complete*
