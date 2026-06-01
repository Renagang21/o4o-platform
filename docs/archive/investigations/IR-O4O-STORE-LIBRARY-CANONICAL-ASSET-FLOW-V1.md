---
id: IR-O4O-STORE-LIBRARY-CANONICAL-ASSET-FLOW-V1
title: "Store Library Canonical Asset Flow — 현황 조사"
status: draft
date: 2026-05-09
scope:
  - 콘텐츠/강좌 저장 흐름
  - 내 자료함 (StoreLibrary) 구조
  - QR / POP / Blog / Channel / Tablet 제작 흐름
  - assetSnapshot / referenceMetadata / editable copy 정책
  - LessonCardPreview canonical 위치
related:
  - docs/investigations/IR-O4O-KPA-STORE-BLOG-SITE-ARCHITECTURE-V1.md
  - docs/investigations/IR-O4O-STORE-COMMON-CANONICAL-AUDIT-V1.md
  - docs/investigations/IR-O4O-GLYCO-STORE-CANONICAL-GAP-AUDIT-V1.md
  - docs/architecture/STORE-LAYER-ARCHITECTURE.md
  - docs/baseline/CONTENT-STABLE-DECLARATION-V1.md
work_orders_referenced:
  - WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1
  - WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1
  - WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1
  - WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1
  - WO-O4O-AI-CONTENT-AUTOMATION-SCOPE-CLEANUP-V1
  - WO-O4O-SNAPSHOT-POLICY-MIGRATION-V1
---

# IR-O4O-STORE-LIBRARY-CANONICAL-ASSET-FLOW-V1

## 0. 요약 (Executive Summary)

**현재 구현 상태는 canonical 방향과 거의 일치한다.**
"콘텐츠/강좌 → 내 자료함 → 매장 실행" 단방향 흐름이 코드 수준에서 강제되고 있으며, QR/POP/Blog/Channel/Tablet 모든 매장 실행 도구가 자료함 진입을 통해서만 제작을 시작하도록 정리되어 있다.

| 영역 | canonical 일치도 | 비고 |
|------|:---:|------|
| 콘텐츠 저장 흐름 | ✅ | 단일 저장 (커뮤니티) → 명시적 "자료함 추가" 액션으로 snapshot 생성 |
| 강좌 저장 흐름 | ✅ | reference-only metadata copy 정책 명확 |
| 내 자료함 구조 | ✅ | snapshot 중심 + 매장 편집 오버라이드 계층 분리 |
| QR 제작 흐름 | ✅ | "새로 만들기" 버튼 제거됨, library 진입만 |
| POP 제작 흐름 | ✅ | library/snapshot/direct 3-origin 통합, library만 PDF 출력 |
| Blog 제작 흐름 | ✅ | "새 글 작성" 제거됨, StartProductionModal 진입만 |
| Channel 제작 흐름 | ✅ | 콘텐츠/강좌 직접 진입 없음 (단, 콘텐츠 source 자체가 미보유) |
| Tablet playlist | ⚠️ | URL 직접 입력만 — 자료함 미연동 (정책 명확화 필요) |
| LessonCardPreview | ✅ | reference-only props 구조, StoreLibraryContentsPage 한 곳만 사용 |
| **용어 정렬** | ⚠️ | 메뉴 라벨="마케팅 자료함" vs UI 텍스트/breadcrumb="내 자료함" 혼재 |
| **잠재 위반** | ⚠️ | `StoreUseModal` 컴포넌트 잔존 (현재 비활성) — 복원 시 direct-connect 가능성 |

**다음 정비 우선순위**: ① 용어 통일 → ② Tablet playlist 자료함 연동 정책 결정 → ③ StoreUseModal 잔존물 정리.

---

## 1. canonical 흐름 정의

```text
[제작 공간]
  커뮤니티 콘텐츠      커뮤니티 강좌/레슨
        │                   │
        ▼                   ▼
  [명시적 "자료함 추가" 액션]
        │                   │
        ▼                   ▼
  Full copy (content_json)  Reference metadata only
        └────────┬──────────┘
                 ▼
         [내 자료함 / Store Library]
         o4o_asset_snapshots
         (+ kpa_store_asset_controls)
         (+ kpa_store_contents = 매장 편집 오버라이드)
                 │
                 ▼
   ┌─────────────┴─────────────────────┐
   │                                   │
[StartProductionModal — 자료 선택]
   │
   ├─ QR (StoreQRPage)
   ├─ POP (StorePopPage / ProductPopBuilderPage)
   ├─ Blog (PharmacyBlogPage)
   ├─ Channel (StoreChannelsPage) ← 현재 product-only
   └─ Tablet (IdlePlaylistEditor) ← 현재 자료함 미연동
        │
        └─ "새로 만들기 / 수정"
             ├─ 내 자료함에서 선택  ✅ canonical
             └─ 편집기에서 직접 제작 ✅ canonical
```

**canonical 원칙:**
1. 커뮤니티 = 제작/저장 공간 (오너십: 작성자)
2. 내 자료함 = 매장 실행용 asset 저장소 (오너십: 매장)
3. QR/POP/Blog/Channel/Tablet = 실행 도구 (자료함 source 의존)
4. **콘텐츠/강좌 화면에서 실행 도구로의 직접 진입 금지**

---

## 2. 현재 구현 상태

### 2.1 콘텐츠 / 강좌 저장 흐름 (조사 항목 1)

#### 콘텐츠 작성
- **[ContentWritePage.tsx:258-280](services/web-kpa-society/src/pages/contents/ContentWritePage.tsx#L258-L280)** — 저장 옵션은 "임시 저장" / "공개" 단일 분기. 커뮤니티/매장 선택 UI 없음.
- API: `contentApi.create()` → `cms_content` 테이블 (status: draft|published)
- snapshot **이 시점에 생성되지 않음** — canonical과 일치

#### 자료실 작성
- **[ResourceWritePage.tsx:540-562](services/web-kpa-society/src/pages/resources/ResourceWritePage.tsx#L540-L562)** — 동일 패턴. `resourcesApi.create()`.

#### 강좌/레슨 작성
- **[CourseEditPage.tsx:860-867](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L860-L867)** — "저장" + "승인 요청". 강사 직접 publish 불가, 운영자 승인 필요.

#### 자료함 추가 (snapshot 생성 시점)
- **[ContentListPage.tsx:150](services/web-kpa-society/src/pages/contents/ContentListPage.tsx#L150)** — 목록의 "자료함에 추가" 버튼이 명시적 액션
- `assetSnapshotApi.copy({ sourceService, sourceAssetId, assetType: 'content' | 'lesson' })` 호출
- `POST /assets/copy` → `o4o_asset_snapshots`에 row 생성

> **결론**: 저장 흐름은 canonical 일치. 콘텐츠 저장과 자료함 진입은 시간적/액션적으로 분리됨.

---

### 2.2 "마케팅 자료함" vs "내 자료함" 용어 사용처 (조사 항목 2)

총 25건 가까운 표기 발견:

| 카테고리 | 표기 | 위치 | 건수 |
|---|---|---|---:|
| 메뉴 라벨 | **"마케팅 자료함"** | [storeMenuConfig.ts:228](packages/store-ui-core/src/config/storeMenuConfig.ts#L228) | 1 |
| Page header / breadcrumb | "내 자료함" | StoreLibraryContentsPage.tsx:211, StoreLibraryResourcesPage.tsx:135, StoreProductDescriptionsPage.tsx:164 | 3 |
| Page comment / docstring | "내 자료함" | 위 페이지 파일 헤더 | 3 |
| Investigation/WO 문서 | 혼용 | docs/investigations, docs/work-orders | 다수 |
| 코드 식별자 | `StoreLibrary*`, `/library/*` | 컴포넌트명 / 라우트 path | 5 |

**현재 상태**: 메뉴 좌측 라벨은 "마케팅 자료함"인데 클릭해서 들어가는 페이지의 헤더/브레드크럼/안내문은 "내 자료함" → 사용자 입장에서 라벨 불일치.

**용어 통일 영향 범위 (낮음):**
- i18n 미사용 → 한국어 텍스트 직접 변경
- 라우트 path (`/library/*`) 변경 불필요
- 코드 식별자 (`StoreLibraryContentsPage` 등) 변경 불필요
- 핵심 변경 지점: 메뉴 라벨 1곳 + UI 텍스트 약 6~8곳

---

### 2.3 내 자료함 canonical 역할 (조사 항목 3)

**판단: "매장 실행용 repository (snapshot 중심 + 편집 오버라이드)"**

근거:
- **[storeMenuConfig.ts:222-226](packages/store-ui-core/src/config/storeMenuConfig.ts#L222-L226)** 메뉴 주석 — "제작 시작 진입점은 본 그룹에서만"
- 3-layer 구조:
  1. `o4o_asset_snapshots` (FROZEN 코어, 변경 불가)
  2. `kpa_store_asset_controls` (운영 정책: publish_status, channel_map, lifecycle_status)
  3. `kpa_store_contents` (매장 편집 오버라이드 — 렌더링 시 COALESCE 우선순위)
- 마이그레이션 [`20260421010000-RenameStoreLibraryToExecutionAssets.ts`](apps/api-server/src/database/migrations) — "자료실"에서 "실행 자산"으로 의미 재정의
- StartProductionModal 진입을 통해 자료함 항목이 QR/POP/Blog 편집기 prefill source가 됨

**자료함 페이지 인벤토리:**

| 파일 | 역할 | 라우트 |
|---|---|---|
| [StoreLibraryContentsPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx) | 콘텐츠/강의 snapshot + direct 콘텐츠 통합 목록 | `/store/library/contents` |
| [StoreLibraryResourcesPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx) | 파일/링크/콘텐츠 자료 (`store_library_items`) | `/store/library/resources` |
| [StoreProductDescriptionsPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx) | 상품 상세설명 결과물 (실행 자산이라기보다 결과물 관리) | `/store/marketing/product-descriptions` |

자료 종류 매핑:

| Asset 종류 | 저장 방식 | Entity / Table |
|---|---|---|
| 콘텐츠 (cms / 콘텐츠 허브) | Full copy | `o4o_asset_snapshots.content_json` (asset_type=`cms` or `content`) |
| 강좌 / 레슨 | Reference metadata only | `o4o_asset_snapshots.content_json` (asset_type=`lesson`) |
| 파일 / 링크 | Direct storage | `store_library_items` = `store_execution_assets` |
| 직접 작성 콘텐츠 | Direct (non-snapshot) | `kpa_store_contents` (source_type=`direct`) |
| 상품 상세설명 (AI) | Direct | `ProductAiContent` (contentType=`product_description`) |

---

### 2.4 QR 제작 흐름 (조사 항목 4)

- **[StoreQRPage.tsx:372-373](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L372-L373)** — "새로 만들기" 버튼 **제거됨**. 진입은 자료함 → StartProductionModal → 편집기 경로만 가능.
- **landingType** ([StoreQRPage.tsx:37-41](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L37-L41)): `'product' | 'page' | 'link'`
- **autoLandingType** ([:59-62](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L59-L62)) — 자료 origin에 따라 자동 결정
- **publicUrl** ([:230-233](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L230-L233)): `${origin}/qr/${slug}` 형태, 백엔드 `/qr/public/:slug` 리다이렉션
- **router state 강제 진입** ([:141-173](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L141-L173)) — `production.source.items[].origin === 'library'`만 처리
- **canonical 위반: 발견 안 됨**

---

### 2.5 POP 제작 흐름 (조사 항목 5)

- **[StorePopPage.tsx](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx)** — "새로 만들기" 버튼 제거됨 (`WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1` 주석)
- **3가지 origin** ([:31, :50-54](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L31)):
  - `library` — 자료함 아이템 (PDF 생성 가능)
  - `snapshot` — 커뮤니티 콘텐츠 fallback (PDF 미지원)
  - `direct` — 직접 작성 (`kpa_store_contents`, PDF 미지원)
- **PDF 제약** ([store-pop.controller.ts:85-98](apps/api-server/src/modules/kpa/controllers/store-pop.controller.ts#L85-L98)) — library만 출력 가능
- **canonical 위반: 발견 안 됨**

---

### 2.6 Blog 제작 흐름 (조사 항목 6)

- **[PharmacyBlogPage.tsx:617-619](services/web-glycopharm/src/pages/pharmacy/PharmacyBlogPage.tsx#L617-L619)** — "새 글 작성" 신규 버튼 제거됨
- 진입: 자료함 → StartProductionModal → location.state로 title/description prefill ([:136-157](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx#L136-L157))
- 본문 입력은 RichTextEditor(preset=`full`)로 HTML만 ([:407-421](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx#L407-L421))
- **asset selector / lesson embed 없음** — Blog editor 안에서 콘텐츠/강의 직접 가져오는 기능 없음
- **canonical 위반: 발견 안 됨**

---

### 2.7 Channel / Tablet 제작 흐름 (조사 항목 7)

#### Channel
- **[StoreChannelsPage.tsx:96-100](services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx#L96-L100)** — 채널 타입 B2C / KIOSK / TABLET
- **[AddProductModal:141-270](services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx#L141-L270)** — **상품(Product)만 추가 가능**. 콘텐츠/강의 직접 추가 불가.
- 콘텐츠 source가 자료함을 거치는 흐름 자체가 미구현 (canonical 위반은 아니지만 미연결)

#### Tablet playlist
- **[IdlePlaylistEditor.tsx](packages/tablet-kiosk-core/src/IdlePlaylistEditor.tsx)** — 이미지/영상 URL 직접 입력만
- 자료함 / media library 통합 명시적으로 제거됨 ([:12 주석](packages/tablet-kiosk-core/src/IdlePlaylistEditor.tsx#L12))
- 콘텐츠 source selector 부재

> **⚠️ 정책 미확정 영역**: Tablet idle playlist가 자료함을 거쳐야 하는지, 의도적으로 직접 URL 입력만 허용하는지 baseline에서 명시되지 않음.

---

### 2.8 assetSnapshot 구조 (조사 항목 8)

#### 엔티티
**[packages/asset-copy-core/src/entities/asset-snapshot.entity.ts](packages/asset-copy-core/src/entities/asset-snapshot.entity.ts)**

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid | PK |
| organization_id | uuid | 타겟 매장/조직 |
| source_service | varchar(50) | `kpa` / `neture` 등 |
| source_asset_id | uuid | 원본 자산 ID |
| asset_type | varchar(20) | `cms` / `signage` / `lesson` / `content` |
| title | text | 자산 제목 |
| content_json | jsonb | **타입별 페이로드 (full copy 또는 reference metadata)** |
| created_by | uuid | 복사 실행자 |
| created_at | timestamp | 복사 시각 |

**UNIQUE**: `(organization_id, source_asset_id, asset_type)` — 중복 copy 방지.

#### 마이그레이션 히스토리
1. `20260216000001` CreateO4oAssetSnapshots
2. `20260216100001` AddUniqueConstraintAssetSnapshots
3. `20260222000001` AddSnapshotPolicyColumns (대상은 `kpa_store_asset_controls`)
4. `20260421010000` RenameStoreLibraryToExecutionAssets (별개 — `store_library_items` → `store_execution_assets`)

> Core 테이블 (`o4o_asset_snapshots`) 자체는 **FROZEN**. 운영 정책은 extension 테이블에서 처리.

#### 정책 차이 — 왜 lesson은 reference-only인가

| 자산 타입 | 저장 방식 | content_json 구성 | 정책 근거 |
|---|---|---|---|
| `cms` / `content` | **Full copy** | body, blocks, summary, imageUrl, metadata 모두 | `WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1` — 매장이 편집해서 POP/블로그/QR로 활용 |
| `lesson` | **Reference metadata** | courseId, title, thumbnail, summary, lessonCount, instructorName, publicUrl | `WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1` — 강사 콘텐츠 보호, "preview만 제공, 실제 수강은 LMS로 유도" |
| `signage` | Full copy | mediaType, sourceUrl, duration | 매장 노출용 그대로 사용 |

게이트 ([kpa-asset.resolver.ts](packages/asset-copy-core/src/resolvers/kpa-asset.resolver.ts)):
- lesson: `status='published' && reusablePolicy != 'restricted'` (강사 명시 허용만)
- content: `is_deleted=false`만 (운영자/매장 모두 가져갈 수 있어야 함)

#### Reader: QR/POP/Blog는 어떻게 snapshot을 참조하는가
- `/published-assets/{orgId}` 엔드포인트 → `buildPublishedAssetQuery()` (asset-render-filter.ts)
- INNER JOIN `kpa_store_asset_controls` (control row 필수) + COALESCE(`kpa_store_contents`, snapshot)
- 매장이 편집한 버전이 있으면 우선, 없으면 snapshot 원본

---

### 2.9 LessonCardPreview 역할 (조사 항목 9)

- **위치**: [packages/shared-space-ui/src/LessonCardPreview.tsx](packages/shared-space-ui/src/LessonCardPreview.tsx) (328줄) + [types.ts:211-223](packages/shared-space-ui/src/types.ts#L211-L223)
- **Props**: `snapshot: LessonSnapshotContent`, `variant?: 'card' | 'compact'`, `href?`, `ctaLabel?`, `rightSlot?`, `accentColor?`
- **Reference-only 강제** ([:10-11](packages/shared-space-ui/src/LessonCardPreview.tsx#L10-L11)) — props에 lesson body / videoUrl / quiz **수신 안 함**. 표시는 썸네일/제목/요약/강사명/레슨수/CTA만.
- **사용처**: **단 한 곳** — [StoreLibraryContentsPage.tsx:24, 354-371](services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx#L354-L371) (variant=`compact`)
- canonical 위치는 자료함 내 read-only 미리보기 — Blog/Channel/Tablet 편집기에는 사용처 없음

---

## 3. canonical 비교 (조사 항목 10)

### 3.1 canonical과 일치하는 부분 ✅

1. **저장-실행 분리**: 콘텐츠/강좌 저장과 자료함 등록이 시간적/액션적으로 분리됨
2. **단방향 진입**: QR/POP/Blog 모두 router state를 통해서만 편집기 진입 (직접 URL 진입 차단)
3. **"새로 만들기" 버튼 제거**: StoreQRPage / StorePopPage / PharmacyBlogPage 모두 제거 완료
4. **3-layer 자료함 구조**: snapshot (frozen) + control (운영 정책) + content override (매장 편집)
5. **자산 타입별 정책**: lesson reference-only / content full-copy 코드와 주석에 명시
6. **LessonCardPreview reference-only**: props 구조 자체가 editable을 차단

### 3.2 canonical과 어긋나거나 미해결인 부분 ⚠️

| # | 항목 | 현재 상태 | canonical 방향 | 위험도 |
|:-:|---|---|---|:-:|
| 1 | 메뉴 라벨 vs UI 텍스트 | 라벨="마케팅 자료함", 헤더/브레드크럼="내 자료함" | 한 가지로 통일 | 낮 |
| 2 | Tablet playlist 자료함 미연동 | URL 직접 입력만 가능 | 정책 결정 필요 (자료함 거침 / 직접 입력 둘 다 허용) | 중 |
| 3 | Channel 콘텐츠 source | 상품(Product)만 추가, 콘텐츠/강의 미지원 | 자료함 콘텐츠를 채널 페이로드로 게시할 수 있는지 baseline 명확화 | 중 |
| 4 | StoreUseModal 잔존 | 컴포넌트 코드 존재, toolbar 버튼만 비활성 | 복원/제거 결정 필요. 복원 시 canonical 우회 위험 | 중 |
| 5 | StoreProductDescriptionsPage 위치 | 자료함이 아닌 "marketing/product-descriptions" 라우트 | 자료함 vs "결과물 관리"라는 별도 영역인지 분류 명확화 | 낮 |
| 6 | direct 콘텐츠 (`kpa_store_contents`) PDF/QR 미지원 | snapshot/direct origin은 UI 표시만, library만 출력 가능 | direct도 출력 가능하게 할지 정책 결정 | 낮 |

### 3.3 책임 경계 혼선

- **"마케팅"이라는 단어**: 메뉴 라벨에는 "마케팅 자료함"이지만 자료함 자체는 콘텐츠/강좌/자료/AI 콘텐츠 모두 포함. "마케팅"으로 한정짓기 어려움.
- **콘텐츠 ↔ 결과물 ↔ 실행 자산**: ContentWritePage(제작) — StoreLibraryContentsPage(실행 자산) — StoreProductDescriptionsPage(결과물 관리) 세 가지가 별도 라우트로 운영. 사용자가 어디서 무엇을 해야 하는지 흐름이 자명하지 않을 수 있음.

---

## 4. direct-connect 위반 흐름 (조사 항목 11)

### 4.1 활성 위반 — 발견 안 됨 ✅

전수 조사 결과 다음 진입점은 **모두 차단됨**:
- 콘텐츠/강좌 화면 → QR 직접 생성: 없음
- 콘텐츠/강좌 화면 → POP 직접 생성: 없음
- 콘텐츠/강좌 화면 → Blog 게시: 없음
- 콘텐츠/강좌 화면 → 채널 게시: 없음
- 콘텐츠/강좌 화면 → Tablet 게시: 없음

### 4.2 잠재 위반 — `StoreUseModal` 잔존 ⚠️

- **[packages/content-editor/src/components/StoreUseModal.tsx:77-490](packages/content-editor/src/components/StoreUseModal.tsx#L77-L490)** — 컴포넌트 코드 그대로 존재
- **[Toolbar.tsx:688-689](packages/content-editor/src/components/Toolbar.tsx#L688-L689)** — toolbar 진입 버튼 비활성 (주석: `WO-O4O-AI-CONTENT-AUTOMATION-SCOPE-CLEANUP-V1` — "후속 WO에서 복원")
- 활성화 시 흐름:
  - 입력: 현재 에디터 HTML
  - AI 변환: `POST /api/ai/content-to-store-use` (QR/POP/SNS/블로그 형태로 변환)
  - 저장: `POST /api/v1/kpa/store/assets`
- 복원될 경우 콘텐츠 작성 페이지에서 직접 매장 실행물 생성 — **canonical 위반 직행**

### 4.3 LessonCardPreview 사용 확장 시 주의

- 현재는 자료함 내부 read-only 미리보기로만 사용
- Blog editor 등에서 LessonCardPreview를 직접 embed 진입점으로 쓸 수 있게 되면 **자료함 우회** 발생 가능 — 추후 작업 시 명시적 방지 필요

---

## 5. 다음 정비 우선순위 (조사 항목 12)

### Priority 1 — 용어 정비 (낮은 비용, 사용자 인식 즉시 개선)
- 메뉴 라벨 vs UI 텍스트 불일치는 사용자가 가장 먼저 마주치는 인터페이스 부조화
- 한국어 텍스트만 변경하면 됨 (i18n / route 변경 불필요)
- **권장 결정**: "내 자료함"으로 통일 (UI 텍스트 다수 일치 + 매장 소유 자료라는 의미 명확). "마케팅"은 자료함의 한 활용처일 뿐 자료함 자체의 본질이 아니므로 라벨에서 제외.

### Priority 2 — StoreUseModal 잔존물 정리 (canonical 위반 잠재 위험)
- `WO-O4O-AI-CONTENT-AUTOMATION-SCOPE-CLEANUP-V1`에서 "후속 WO에서 복원"으로 보류된 상태
- 복원 정책을 결정하거나, 복원하지 않을 거면 코드 자체를 제거해야 canonical 안정성 확보
- 두 가지 결정 옵션:
  - (A) 완전 제거 — canonical 단순화
  - (B) 복원하되 흐름을 "AI 변환 결과 → 자료함 저장 → 매장 실행" 두 단계로 강제

### Priority 3 — Tablet / Channel 콘텐츠 source 정책 결정
- Tablet idle playlist를 자료함과 연동할 것인지, 직접 URL만 허용할지 baseline 명시 필요
- Channel은 현재 product-only인데, 자료함 콘텐츠를 채널 페이로드로 게시할 수 있어야 하는지 정의

### Priority 4 — 자료함 페이지 분류 명확화
- StoreLibraryContentsPage / StoreLibraryResourcesPage / StoreProductDescriptionsPage 세 페이지의 역할 경계와 사용자 진입 흐름 정리
- 특히 "결과물 관리" vs "실행 자산"의 분리가 사용자에게 자명해야 함

### Priority 5 — direct 콘텐츠 (`kpa_store_contents`) 출력 정책
- snapshot/direct origin이 PDF/QR로 출력되지 못하는 현재 제한이 의도된 것인지, 추후 확장 대상인지 명확화
- `WO-O4O-SNAPSHOT-POLICY-MIGRATION-V1`의 lifecycle_status 정책과 연동해서 결정

---

## 6. 추천 WO 목록

| WO 후보 | 우선순위 | 범위 |
|---|:-:|---|
| **WO-O4O-STORE-LIBRARY-TERMINOLOGY-UNIFY-V1** | P1 | 메뉴 라벨 + UI 텍스트 "내 자료함" 통일 (storeMenuConfig.ts 1곳 + UI 약 6~8곳) |
| **WO-O4O-STORE-USE-MODAL-DECISION-V1** | P2 | StoreUseModal 제거 또는 canonical-compliant 복원 결정 + 실행 |
| **WO-O4O-TABLET-PLAYLIST-LIBRARY-LINK-V1** | P3 | Tablet idle playlist 자료함 연동 정책 결정 후 구현 (또는 baseline에 "직접 입력만" 명시) |
| **WO-O4O-CHANNEL-CONTENT-PAYLOAD-V1** | P3 | Channel(B2C/Tablet) 콘텐츠 페이로드 source 정책 + 자료함 연결 구현 |
| **WO-O4O-STORE-LIBRARY-PAGE-CLASSIFICATION-V1** | P4 | 자료함 3페이지 역할 명확화 + 진입 흐름 정리 (필요시 페이지 통합/분리) |
| **WO-O4O-DIRECT-CONTENT-OUTPUT-POLICY-V1** | P5 | direct origin (`kpa_store_contents`) PDF/QR 출력 가능 여부 정책 결정 |

---

## 부록 A — 조사한 핵심 파일 목록

### 콘텐츠 / 강좌 작성
- `services/web-kpa-society/src/pages/contents/ContentWritePage.tsx`
- `services/web-kpa-society/src/pages/contents/ContentListPage.tsx`
- `services/web-kpa-society/src/pages/resources/ResourceWritePage.tsx`
- `services/web-kpa-society/src/pages/resources/ResourceListPage.tsx`
- `services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx`
- `services/web-kpa-society/src/pages/instructor/courses/LmsCourseListPage.tsx`

### 자료함 페이지
- `services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx`

### 매장 실행 도구
- `services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx`
- `services/web-glycopharm/src/pages/pharmacy/PharmacyBlogPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx`
- `packages/tablet-kiosk-core/src/IdlePlaylistEditor.tsx`

### 메뉴 / 라우트 / 설정
- `packages/store-ui-core/src/config/storeMenuConfig.ts`

### 공통 컴포넌트
- `packages/shared-space-ui/src/LessonCardPreview.tsx`
- `packages/shared-space-ui/src/types.ts`
- `packages/content-editor/src/components/StoreUseModal.tsx`
- `packages/content-editor/src/components/Toolbar.tsx`

### Backend / DB
- `packages/asset-copy-core/src/entities/asset-snapshot.entity.ts`
- `packages/asset-copy-core/src/resolvers/kpa-asset.resolver.ts`
- `packages/asset-copy-core/src/services/asset-copy.service.ts`
- `apps/api-server/src/database/entities/store-qr-code.entity.ts`
- `apps/api-server/src/database/entities/kpa-store-content.entity.ts`
- `apps/api-server/src/modules/kpa/controllers/store-pop.controller.ts`
- `apps/api-server/src/modules/kpa/controllers/store-qr-landing.controller.ts`
- `apps/api-server/src/modules/kpa/controllers/store-asset-control.controller.ts`
- `apps/api-server/src/modules/kpa/services/asset-render-filter.ts`
- 마이그레이션:
  - `20260216000001-CreateO4oAssetSnapshots`
  - `20260216100001-AddUniqueConstraintAssetSnapshots`
  - `20260222000001-AddSnapshotPolicyColumns`
  - `20260421010000-RenameStoreLibraryToExecutionAssets`

---

## 부록 B — 조사 시 참고 IR / WO

- IR-O4O-KPA-STORE-BLOG-SITE-ARCHITECTURE-V1
- IR-O4O-STORE-COMMON-CANONICAL-AUDIT-V1
- IR-O4O-GLYCO-STORE-CANONICAL-GAP-AUDIT-V1
- WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1
- WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1
- WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1
- WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1
- WO-O4O-AI-CONTENT-AUTOMATION-SCOPE-CLEANUP-V1
- WO-O4O-SNAPSHOT-POLICY-MIGRATION-V1
