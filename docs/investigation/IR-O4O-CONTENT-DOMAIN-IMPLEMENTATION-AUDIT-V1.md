# IR-O4O-CONTENT-DOMAIN-IMPLEMENTATION-AUDIT-V1

> **Content Domain 구현 현황 조사 보고서**
> Core → Extension → Service 순서로 조사한 실태 보고

---

## 1. 아키텍처 요약

```
┌─────────────────────────────────────────────────────────┐
│ CORE (Frozen, Immutable)                                │
│                                                         │
│  cms_contents          signage_media                    │
│  cms_content_slots     signage_playlists                │
│  cms_media             lms_templates                    │
│  o4o_asset_snapshots   lms_template_versions/blocks     │
│                                                         │
│  ContentQueryService   HubContentQueryService           │
│  CmsContentService     SignageContentService            │
│                                                         │
│  Packages: cms-core, asset-copy-core,                   │
│            interactive-content-core, hub-core            │
├─────────────────────────────────────────────────────────┤
│ EXTENSION (Service-Specific Copy/Override)              │
│                                                         │
│  AssetCopyService      → o4o_asset_snapshots            │
│  KpaStoreContent       → kpa_store_contents (override)  │
│  StoreContentService   → store_contents + blocks        │
│  StoreLibraryService   → store_library_items            │
│  DashboardAssetsCopy   → cms_media/signage 복사         │
│                                                         │
│  Resolver Pattern: KpaAssetResolver, NetureAssetResolver│
├─────────────────────────────────────────────────────────┤
│ SERVICE (Frontend + Service-Specific API)               │
│                                                         │
│  Neture      : Homepage CMS (Hero/Ads/Logos)            │
│  GlycoPharm  : Guidelines + Signage Library + Assets    │
│  K-Cosmetics : Signage Only                             │
│  KPA         : News/Docs + Content Mgmt + Hub Library   │
└─────────────────────────────────────────────────────────┘
```

### Core가 Content를 무엇으로 보고 있는가?

**Core는 Content를 3가지 서로 다른 것으로 관리하고 있다:**

| 개념 | 테이블 | 용도 |
|------|--------|------|
| **CMS 글** | `cms_contents` | 서비스별 공지/뉴스/프로모 (serviceKey 격리) |
| **사이니지 미디어** | `signage_media`, `signage_playlists` | 매장 디스플레이용 영상/재생목록 |
| **학습 콘텐츠** | `lms_templates`, `lms_template_versions/blocks` | 블록 기반 교육 콘텐츠 |

**HUB는 이 3가지를 통합 조회하는 읽기 전용 레이어**이다 (CmsContent + SignageMedia + SignagePlaylists를 3축 모델로 병합).

---

## 2. Core 구조 상세

### 2.1 데이터 구조

#### 핵심 테이블

| 테이블 | 원본/복사 구분 | 상태값 | Boundary |
|--------|---------------|--------|----------|
| `cms_contents` | 원본 | draft → published → archived | serviceKey + organizationId |
| `cms_content_slots` | 참조 (FK→cms_contents) | isActive + 시간 윈도우 | serviceKey + organizationId |
| `cms_media` | 원본 (copy 시 새 레코드) | isActive | organizationId |
| `signage_media` | 원본 | active/inactive | serviceKey + scope(global/store) |
| `signage_playlists` | 원본 | active/inactive | serviceKey + scope |
| `o4o_asset_snapshots` | **복사본** (immutable) | — | sourceService + organizationId |
| `kpa_store_contents` | **오버라이드** (mutable) | — | snapshot_id + organization_id |
| `store_contents` | **복사본** (mutable) | draft → active → archived | templateId + storeId |
| `store_content_blocks` | 복사본의 블록 | — | storeContentId |
| `lms_templates` | 원본 | draft → published → archived | serviceKey + organizationId |

#### 원본/복사 관계

```
cms_contents (원본)
  ↓ AssetCopyService.copyWithResolver()
o4o_asset_snapshots (불변 복사본)
  ↓ PUT /store-contents/:snapshotId
kpa_store_contents (수정 가능 오버라이드)
  → 렌더링: COALESCE(override, snapshot)

lms_templates → lms_template_versions → lms_template_blocks (원본)
  ↓ StoreContentService.copyTemplateToStore()
store_contents → store_content_blocks (수정 가능 복사본)
```

#### library / my content 구분

- **명시적 구분 컬럼 없음**
- 구분은 **테이블 수준**으로 이루어짐:
  - 원본 = `cms_contents`, `signage_media`, `lms_templates`
  - 내 콘텐츠 = `o4o_asset_snapshots` + `kpa_store_contents`, `store_contents`
- `cms_media`의 경우 `sourceContentId` metadata로 복사 출처 추적

### 2.2 백엔드 구조

#### 공통 API

| 경로 | 서비스 | 역할 |
|------|--------|------|
| `/api/v1/cms/contents` | CmsContentService | CMS CRUD + 슬롯 관리 |
| `/api/v1/content/assets` | (Read-Only 프로젝션) | cms_media 기반 자산 목록/복사 |
| `/api/v1/hub/contents` | HubContentQueryService | CMS + Signage 통합 조회 (공개) |
| `/api/v1/{service}/contents` | ContentQueryService | 서비스별 발행 콘텐츠 조회 |
| `/api/v1/{service}/assets/copy` | AssetCopyService | 스냅샷 기반 복사 |
| `/api/v1/dashboard/assets/copy` | DashboardAssetsCopy | 개인 대시보드 복사 |

#### Owner 개념

- `authorRole`: admin, service_admin, supplier, community
- `visibilityScope`: platform, service, organization
- HUB에서 producer로 매핑: admin/service_admin→operator, supplier→supplier, community→community
- **서버 강제**: producer 매핑은 백엔드에서만 수행, 클라이언트 입력 불신

---

## 3. Extension 구조 상세

### 3.1 Core와 Extension의 경계

| Core (변경 불가) | Extension (서비스별 확장) |
|-----------------|------------------------|
| cms_contents 스키마 | kpa_store_contents 오버라이드 |
| signage_media 스키마 | 서비스별 AssetResolver |
| ContentQueryService | 서비스별 홈 API 라우트 |
| HubContentQueryService | 서비스별 Hub 페이지 UI |
| AssetCopyService (공통 로직) | 서비스별 role/org 해석 |

### 3.2 복사/가져오기(Copy) 메커니즘 — 4가지 존재

#### A. AssetSnapshot Copy (주력 복사)

```
HUB Content → POST /api/v1/{service}/assets/copy
  → ContentResolver.resolve(sourceId, type) → ResolvedContent
  → INSERT o4o_asset_snapshots (immutable)
  → 매장에서 PUT /store-contents/:snapshotId 로 오버라이드 가능
```

- **구현 완료**: KPA, Neture에 Resolver 존재
- **팩토리 패턴**: `createAssetCopyController()` — 서비스가 config만 넘기면 동작

#### B. Template → StoreContent Copy

```
lms_templates (published) → StoreContentService.copyTemplateToStore()
  → store_contents + store_content_blocks
  → 블록 단위 수정 가능
```

- **구현 완료**: interactive-content-core 패키지
- **사용처**: 매장 콘텐츠(POP, QR, 매장 소개 등)

#### C. Dashboard Asset Copy

```
HUB Content (public) → POST /api/v1/dashboard/assets/copy
  → 새 cms_media/signage_media/signage_playlist 레코드 생성
  → metadata에 sourceContentId 추가
  → 초기 상태: draft (isActive=false)
```

- **구현 완료**: dashboard-assets.copy-handlers.ts
- **공개 콘텐츠만** 복사 가능

#### D. Signage Library 가져오기 (GlycoPharm 전용)

```
Signage 콘텐츠 라이브러리 (HQ/Supplier/Community 소스)
  → POST /api/v1/glycopharm/signage/my-signage
  → 매장 소유 사이니지 콘텐츠로 복사
```

### 3.3 자료실 흐름 관련 구현 여부

| 질문 | 답변 |
|------|------|
| 자료실에서 가져오기 개념이 있는가? | **Yes** — AssetSnapshot Copy, Dashboard Copy |
| sourceId/copiedFrom 연결 구조가 있는가? | **Yes** — `o4o_asset_snapshots.sourceAssetId`, `metadata.sourceContentId`, `metadata.copiedFrom` |
| library item → user content 전환 구조가 있는가? | **Yes** — 복사 후 독립 레코드, 오버라이드로 수정 가능 |
| 자료실은 조회용인가, 가져오기용인가? | **가져오기용** — Copy API 존재, UI에 "내 매장에 복사" 버튼 |
| 가져오면 참조인가 복사인가? | **복사** — 독립 레코드 생성 (snapshot은 불변, override는 독립) |

---

## 4. 서비스별 적용 비교표

### 4.1 기능 비교

| 기능 | Neture | GlycoPharm | K-Cosmetics | KPA |
|------|--------|-----------|-------------|-----|
| **CMS 콘텐츠 관리** | Homepage CMS (Hero/Ads/Logos) | Guidelines (환자용/약사용) | ❌ 없음 | News + Content Mgmt |
| **자료실 (docs)** | ❌ 없음 | ❌ 없음 | ❌ 없음 | ✅ DocsPage (규정/양식/매뉴얼/자료) |
| **콘텐츠 라이브러리 (browse)** | ❌ 없음 | ✅ Signage Library | ❌ 없음 | ✅ Hub Content Library |
| **가져오기 (copy to store)** | ❌ 없음 | ✅ assetSnapshotApi | ❌ 없음 | ✅ assetSnapshotApi |
| **내 콘텐츠 (store assets)** | ❌ 없음 | ✅ StoreAssetsPage | ❌ 없음 | ✅ (store/content 라우트 존재) |
| **콘텐츠 수정** | Homepage CMS 직접 편집 | Asset 편집 + 가이드라인 편집 | ❌ | Content Mgmt 편집 + Override |
| **사이니지** | ✅ Supplier Hub | ✅ HQ/Playlist/Template/Library | ✅ HQ/Playlist/Template | ✅ HQ/Playlist/Template |
| **API 패턴** | 자체 CMS API | 자체 가이드라인 API + 공통 Signage | 공통 Signage만 | KPA news API + 공통 CMS/Hub |

### 4.2 메뉴 위치

| 서비스 | Content 메뉴 항목 | 위치 |
|--------|-------------------|------|
| Neture | 홈페이지 CMS | content 그룹 |
| GlycoPharm | 가이드라인 관리 + 콘텐츠 라이브러리 | content + signage 그룹 |
| K-Cosmetics | (없음) | — |
| KPA | 공지사항 + 자료실 + 콘텐츠 관리 | content 그룹 |

### 4.3 서비스별 용어 차이

| 개념 | Neture | GlycoPharm | KPA |
|------|--------|-----------|-----|
| 콘텐츠 원본 | Hero Slides, Ads, Logos | Guidelines, Signage | 공지사항, 뉴스, 자료 |
| 라이브러리 | — | 콘텐츠 라이브러리 | Hub 콘텐츠 라이브러리 |
| 가져오기 | — | 내 등록 추가 | 내 매장에 복사 |
| 내 콘텐츠 | — | 매장 자산 | 매장 콘텐츠 |

---

## 5. 실제 흐름 조사 (Flow Analysis)

### 5.1 완전한 흐름이 이어지는 서비스

#### GlycoPharm — Signage Library Flow ✅

```
1. 운영자가 콘텐츠 등록 (HQ/Supplier/Community)
2. 약국이 /store/signage/library 에서 콘텐츠 목록 조회
3. 소스 필터링 (본부/공급자/내 등록/광고)
4. "가져오기" 클릭 → POST /api/v1/glycopharm/signage/my-signage
5. /store/assets 에서 가져온 콘텐츠 확인 (draft 상태)
6. publish/edit 가능
```

**판정: 흐름이 처음부터 끝까지 이어진다.**

#### KPA — Hub Content Copy Flow ✅

```
1. 운영자가 /operator/content 에서 CMS 콘텐츠 작성 (공지/뉴스)
2. CMS 발행 (published)
3. 분회 관계자가 /hub/content 에서 Hub 콘텐츠 라이브러리 조회
4. "내 매장에 복사" 클릭 → assetSnapshotApi.copy()
5. o4o_asset_snapshots에 스냅샷 생성
6. /store/content?tab=cms 에서 복사된 콘텐츠 확인
7. PUT /store-contents/:snapshotId 로 오버라이드 편집 가능
```

**판정: 흐름이 처음부터 끝까지 이어진다.**

### 5.2 중간에 끊기는 흐름

#### Neture — Content ❌

```
1. 운영자가 Homepage CMS에서 Hero/Ads/Logos 관리
2. → 이 콘텐츠는 홈페이지 전용, 다른 곳에서 가져오기 불가
3. Hub 콘텐츠? → Neture에는 Hub Content Library 페이지 없음
4. 매장 콘텐츠? → 매장 자산 페이지 없음
```

**판정: Homepage CMS → 홈페이지 렌더링만. 라이브러리→가져오기 흐름 없음.**

#### K-Cosmetics — Content ❌

```
1. 사이니지 콘텐츠만 존재
2. 콘텐츠 관리 메뉴 자체가 없음
3. Hub 라이브러리 없음, 매장 자산 없음
```

**판정: 콘텐츠 흐름이 아예 존재하지 않음. 사이니지만 독립 운영.**

### 5.3 화면만 있고 backend 없는 것

- **해당 없음**: 발견된 모든 페이지는 backend API가 존재함

### 5.4 backend는 있는데 frontend가 없는 것

| Backend | Frontend 부재 서비스 |
|---------|---------------------|
| `ContentQueryService.listPublished()` | Neture (Hub Library 페이지 없음) |
| `AssetCopyService` (Neture Resolver 존재) | Neture (Copy UI 없음) |
| `StoreContentService.copyTemplateToStore()` | Neture, K-Cosmetics (Store Content 페이지 없음) |
| `POST /api/v1/dashboard/assets/copy` | 대부분 서비스에서 미연결 |
| `CmsContentService` slot 관리 | 모든 서비스 (Slot UI 미구현) |

---

## 6. GAP 분석

### A. 이미 설계되어 있고 구현도 된 것

| 항목 | 상태 |
|------|------|
| CMS Content CRUD (cms_contents) | ✅ Core API + KPA/Neture UI |
| Signage Content (media/playlists) | ✅ 4개 서비스 모두 Signage 라우트 |
| AssetSnapshot Copy (불변 스냅샷) | ✅ Core 패키지 + KPA/Neture Resolver |
| KPA Store Content Override | ✅ Backend + Frontend 연결 |
| HUB 통합 조회 (3축 모델) | ✅ Backend API (공개) |
| ContentQueryService (공통 쿼리) | ✅ KPA/Neture/GlycoPharm 연결 |
| Template → StoreContent Copy | ✅ interactive-content-core 패키지 |
| GlycoPharm Signage Library | ✅ 라이브러리→가져오기→매장 자산 |
| KPA Hub Content Library | ✅ 라이브러리→복사→매장 콘텐츠 |
| 추천/조회수 (cms_content_recommendations) | ✅ toggle API + graceful fallback |

### B. 설계는 있으나 미구현인 것

| 항목 | 설계 위치 | 미구현 부분 |
|------|----------|------------|
| Neture Hub Content Library | Backend Resolver 존재 | Frontend 페이지 없음 |
| Neture 매장 자산 관리 | AssetCopyService Neture 지원 | 매장 자산 UI 없음 |
| K-Cosmetics Content 전체 | CMS API 지원 (serviceKey) | Operator Content 메뉴/페이지 없음 |
| CMS Slot 관리 UI | Backend CRUD 완비 | Frontend 없음 (모든 서비스) |
| Dashboard Assets Copy UI | Backend handler 존재 | 연결된 UI 거의 없음 |
| Content Assets Stats | Backend API 존재 | 분석 UI 없음 |

### C. 서비스별 제각각인 것

| 항목 | 편차 내용 |
|------|----------|
| CMS 콘텐츠 유형 | Neture: Hero/Ads/Logos, GlycoPharm: Guidelines, KPA: News/Notice, K-Cosmetics: 없음 |
| 라이브러리 명칭 | GlycoPharm: 콘텐츠 라이브러리, KPA: Hub 콘텐츠 라이브러리, Neture/K-Cosmetics: 없음 |
| 콘텐츠 관리 UI | Neture: 3탭 CMS, GlycoPharm: 2탭 가이드라인, KPA: 2탭 Content + 별도 News/Docs |
| API 패턴 | Neture: 자체 CMS API, KPA: KPA news API, GlycoPharm: 자체 가이드라인 API |
| 메뉴 구성 | 4개 서비스 모두 다름 (content 그룹 항목 불일치) |

### D. 아직 개념 자체가 불명확한 것

| 항목 | 불명확 사항 |
|------|-----------|
| "자료실"의 플랫폼 정의 | KPA만 DocsPage(규정/양식/매뉴얼) 보유. 다른 서비스에서 자료실이 필요한지 미정 |
| CMS vs 자료실 경계 | cms_contents(뉴스/공지)와 자료실(파일/문서)이 같은 Core인지 별도 Core인지 |
| 서비스별 Content 표준화 방향 | 현재 각 서비스가 독자적 Content 형태 → APP-CONTENT 표준이 어디까지 강제하는지 |
| HUB의 역할 | 현재 읽기 전용 조회 → 향후 발행/배포/큐레이션까지 확장할 것인지 |
| Template(LMS) vs Content(CMS) 관계 | Template은 교육용, Content는 홍보용으로 분리되어 있으나, 매장에서는 둘 다 "콘텐츠" |

---

## 7. 현재 상태 판정

### 종합 판정: **부분 구현 단계 — 서비스별 편차 큼**

```
Core         ████████████████████ 90%  ← 구조/API/정책 완비, 슬롯 UI만 미구현
Extension    ██████████████░░░░░░ 70%  ← 복사 메커니즘 4종 완비, 일부 서비스 미연결
KPA          ████████████████░░░░ 80%  ← 가장 완성도 높음 (CMS+Docs+Hub+Copy+Store)
GlycoPharm   ████████████░░░░░░░░ 60%  ← 사이니지 라이브러리 우수, CMS는 가이드라인만
Neture       ████████░░░░░░░░░░░░ 40%  ← Homepage CMS만, 라이브러리/가져오기 없음
K-Cosmetics  ████░░░░░░░░░░░░░░░░ 20%  ← 사이니지만, 콘텐츠 관리 전무
```

### 핵심 발견

1. **Core는 충분히 설계되어 있다** — CMS, Signage, Template, Snapshot, Hub 모두 API 존재
2. **Extension(복사 메커니즘)도 구현되어 있다** — AssetCopyService, StoreContentService 동작
3. **병목은 Frontend** — Backend가 있는데 Frontend가 없는 경우가 많음
4. **서비스별 독자 구현이 문제** — 같은 기능을 서비스마다 다르게 만듦
5. **"자료실"은 KPA 전용 개념** — 다른 서비스에는 문서 관리 자체가 없음

---

## 8. 다음 단계 제안

### 즉시 보정 가능 (WO 범위 작음)

| # | 항목 | 난이도 | 영향 |
|---|------|--------|------|
| 1 | K-Cosmetics Operator에 Content 메뉴 + 기본 CMS 페이지 추가 | 낮음 | K-Cosmetics 콘텐츠 관리 가능 |
| 2 | Neture에 Hub Content Library 페이지 추가 | 중간 | Neture 가져오기 흐름 활성화 |
| 3 | 서비스별 Content 관리 페이지 APP-CONTENT 표준 통일 | 중간 | UI 일관성 |

### 구조 정리 먼저 필요

| # | 항목 | 선행 조건 |
|---|------|----------|
| 4 | CMS Slot 관리 UI (모든 서비스 공통) | Slot 활용 시나리오 확정 |
| 5 | "자료실" 표준화 — 서비스 공통 개념인지, KPA 전용인지 결정 | 요구사항 확인 |
| 6 | Content 유형 표준화 — 서비스별 독자 유형을 공통 ContentType으로 매핑 | APP-CONTENT 스펙 재검토 |

### Core 수정 필요 여부

- **현재 Core 수정 불필요** — 기존 구조로 모든 서비스 확장 가능
- 단, 자료실(문서/파일 관리)을 플랫폼 공통으로 만들려면 **새로운 Core 테이블 또는 CMS type 확장** 검토 필요
- Media Core 통합(v3+)은 장기 과제 — 현재 3영역 분리(CMS/Signage/LMS) 유지

---

## 9. 핵심 파일 참조

### Core

| 역할 | 파일 |
|------|------|
| CMS 엔티티 | `packages/cms-core/src/entities/CmsContent.entity.ts` |
| CMS 서비스 | `apps/api-server/src/routes/cms-content/cms-content.service.ts` |
| CMS 라우트 | `apps/api-server/src/routes/cms-content/cms-content.routes.ts` |
| Hub 서비스 | `apps/api-server/src/modules/hub-content/hub-content.service.ts` |
| Content 쿼리 | `apps/api-server/src/modules/content/content-query.service.ts` |
| Content 자산 | `apps/api-server/src/routes/content/content-assets.routes.ts` |
| Content 타입 | `packages/types/src/content.ts` |
| Hub 타입 | `packages/types/src/hub-content.ts` |

### Extension

| 역할 | 파일 |
|------|------|
| Asset Copy Core | `packages/asset-copy-core/src/services/asset-copy.service.ts` |
| Copy Controller Factory | `packages/asset-copy-core/src/factory/create-asset-copy-controller.ts` |
| KPA Resolver | `apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts` |
| Neture Resolver | `apps/api-server/src/modules/asset-snapshot/resolvers/neture-asset.resolver.ts` |
| Store Content Service | `packages/interactive-content-core/src/services/StoreContentService.ts` |
| KPA Store Override | `apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts` |
| Dashboard Copy | `apps/api-server/src/routes/dashboard/dashboard-assets.copy-handlers.ts` |

### Service Frontend

| 서비스 | 콘텐츠 관리 | 라이브러리 |
|--------|------------|----------|
| Neture | `services/web-neture/src/pages/operator/HomepageCmsPage.tsx` | — |
| GlycoPharm | `services/web-glycopharm/src/pages/operator/GuidelineManagementPage.tsx` | `services/web-glycopharm/src/pages/pharmacy/signage/ContentLibraryPage.tsx` |
| K-Cosmetics | — | — |
| KPA | `services/web-kpa-society/src/pages/operator/ContentManagementPage.tsx` | `services/web-kpa-society/src/pages/hub/HubContentLibraryPage.tsx` |
| KPA (자료실) | `services/web-kpa-society/src/pages/admin-branch/DocsPage.tsx` | — |

### Documentation

| 문서 | 경로 |
|------|------|
| Content Core Overview | `docs/platform/content-core/CONTENT-CORE-OVERVIEW.md` |
| Platform Content Policy | `docs/baseline/PLATFORM-CONTENT-POLICY-V1.md` |
| Content Stable Declaration | `docs/baseline/CONTENT-STABLE-DECLARATION-V1.md` |
| APP-CONTENT Standard | `docs/architecture/APP-CONTENT-STANDARD-SPEC.md` |

---

*조사 완료: 2026-03-23*
*조사자: Claude Code (IR-O4O-CONTENT-DOMAIN-IMPLEMENTATION-AUDIT-V1)*
