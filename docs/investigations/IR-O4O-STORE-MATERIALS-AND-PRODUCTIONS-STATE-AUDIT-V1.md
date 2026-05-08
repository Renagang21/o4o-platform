# IR-O4O-STORE-MATERIALS-AND-PRODUCTIONS-STATE-AUDIT-V1

> **"내 자료함 / 내 제작물" 현 상태 조사 (state audit)**
> 작성일: 2026-05-08
> 상태: READ-ONLY 조사 완료
> 목적: 4개 서비스(KPA-Society / GlycoPharm / K-Cosmetics / Neture)에서 "내 자료함"과 "내 제작물(POP·QR·블로그·상품 상세설명)" 관련 실제 구현 상태를 식별하고, 재사용 가능한 자산과 신규 설계가 필요한 영역을 분리하기 위한 inventory를 만든다.
>
> ⚠️ **이번 단계는 "조사"만 수행한다. canonical 판단은 하되, route 추가·코드 수정·DB 변경은 후속 WO에서 진행한다.**

---

## 0. 조사 방법

| 항목 | 내용 |
|------|------|
| 1차 소스 | `services/<svc>/src/pages`, `services/<svc>/src/router*`, `packages/store-ui-core/src/config/storeMenuConfig.ts` |
| 백엔드 inventory | `apps/api-server/src/routes/`, `apps/api-server/src/modules/`, `apps/api-server/src/database/migrations/` |
| 검증 방식 | Korean keyword grep (`내 자료함`, `자료실`, `내 제작물`, `POP`, `블로그`) + 영어 keyword grep (`store materials`, `saved contents`, `productionPath`, `qr-code`, `pop-generator`, `productDescription`, `sourceType`, `snapshot`) → route file 매핑 → 컴포넌트 파일 존재 확인 → 백엔드 entity/route 존재 확인 |
| 추정 금지 원칙 | 코드에 존재하지 않는 항목은 보고하지 않음. 메뉴에 있으나 placeholder인 항목은 `partial`로 표시 |

**Status 표기:**
- `active` — 실제 페이지+API+DB가 모두 동작
- `partial` — 일부 구성요소(예: 메뉴/API만) 존재
- `stub` — 메뉴/route는 있으나 placeholder 페이지
- `missing` — 항목 자체 부재

---

## 1. 내 자료함 (My Materials) — 현 상태

### 1-1. 메뉴/라우트 존재 여부 (서비스별)

| Service | 메뉴 그룹 | 메뉴 항목 | Route | 페이지 | Status | File:Line |
|---------|----------|-----------|-------|--------|--------|-----------|
| **kpa-society** | 내 자료함 | 콘텐츠 | `/store/library/contents` | `StoreLibraryPlaceholderPage` | **stub** | `packages/store-ui-core/src/config/storeMenuConfig.ts:203` |
| **kpa-society** | 내 자료함 | 강좌 | `/store/library/courses` | `StoreLibraryPlaceholderPage` | **stub** | `packages/store-ui-core/src/config/storeMenuConfig.ts:204` |
| **kpa-society** | 내 자료함 | 자료 | `/store/library/resources` | `StoreLibraryPlaceholderPage` | **stub** | `packages/store-ui-core/src/config/storeMenuConfig.ts:205` |
| **kpa-society** | 매장 실행 | 자료실 | `/store/content` | (별개 페이지, 커뮤니티 자료 가져오기) | partial | `packages/store-ui-core/src/config/storeMenuConfig.ts:221` |
| **kpa-society** | (대시보드) | 내 콘텐츠 | `/dashboard/my-content` | `MyContentPage.tsx` | **active** | `services/web-kpa-society/src/pages/dashboard/MyContentPage.tsx` |
| **glycopharm** | 마케팅·콘텐츠 | 콘텐츠 가져오기 | `/store/content` | `ResourcesPage.tsx` (read-only hub) | partial | `packages/store-ui-core/src/config/storeMenuConfig.ts:146` |
| **k-cosmetics** | — | — | `/resources` (메뉴 미연결) | `ResourcesPage.tsx` (empty fallback) | **stub** | `services/web-k-cosmetics/src/pages/resources/ResourcesPage.tsx` |
| **neture** | (대시보드) | 내 콘텐츠 | `/dashboard/my-content` | `MyContentPage.tsx` | **active** | `services/web-neture/src/pages/dashboard/MyContentPage.tsx` |
| **neture** | (공급자) | 라이브러리 | `/supplier/library` | `SupplierLibraryPage.tsx` | **active** | `services/web-neture/src/pages/supplier/SupplierLibraryPage.tsx` |

**핵심 관찰:**
- KPA 사이드바의 "내 자료함" 그룹은 메뉴만 배치되고 placeholder 연결 (소스 헤더 주석에 "콘텐츠 기획 확정 후 후속 WO에서 본 페이지 연결" 명시 — `storeMenuConfig.ts:200`)
- KPA·Neture에는 별도로 `/dashboard/my-content` 라는 dashboard asset 시스템이 이미 active 상태 — 사이드바 "내 자료함"과 분리되어 있음
- GlycoPharm·K-Cosmetics는 store 사이드바에 자료함 그룹 자체가 부재

### 1-2. 백엔드 자산 inventory (재사용 가능 후보)

| 자산 | 종류 | 파일 | Status |
|------|------|------|--------|
| `o4o_asset_snapshots` | core entity (cross-service) | `apps/api-server/src/modules/asset-snapshot/` | **active** |
| `kpa_store_contents` | KPA 매장 콘텐츠 (snapshot 편집 + direct) | `apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts` | **active** |
| `store_library_items` | 매장 자료실 아이템 | `apps/api-server/src/routes/platform/entities/store-library-item.entity.ts` | **active (UI 미연결)** |
| `NetureSupplierLibraryItem` | Neture 공급자 라이브러리 | `apps/api-server/src/modules/neture/entities/NetureSupplierLibraryItem.entity.ts` | **active** |
| Dashboard Assets API | `/api/v1/dashboard/*` (list/copy/publish/archive/delete) | `apps/api-server/src/routes/dashboard/` | **active** |
| Store Library API | `/api/v1/store/pharmacy/library` (CRUD) | `apps/api-server/src/routes/o4o-store/controllers/store-library.controller.ts` | **active (UI 미연결)** |
| Store Content API | `/api/v1/store/store-contents` (direct + share-to-hub) | `apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts` | **active** |
| Neture Library API | `/api/v1/neture/library` | `apps/api-server/src/modules/neture/neture-library.routes.ts` | **active** |

### 1-3. sourceType / sourceId / snapshot 패턴

**구현 위치:**
- `CopyAssetRequest.sourceType` enum: `'content' | 'signage_media' | 'signage_playlist' | 'hub_content'` (`apps/api-server/src/routes/dashboard/dashboard-assets.types.ts`)
- `KpaStoreContent.snapshot_id` (uuid, nullable) + `source_type: 'snapshot_edit' | 'direct'` — snapshot 편집 vs 직접 작성 구분
- `StoreLibraryItem.sourceType` (default `'uploaded'`) — 확장 가능 필드만 존재, 실제 routing은 미사용
- 복사 흐름: dashboard-assets.copy-handlers.ts → `o4o_asset_snapshots` 레코드 생성 → 서비스별 resolver(kpa/neture)가 origin 데이터를 frozen snapshot으로 박제

**미구현:**
- "Save To: [Community / My Store / Both]" 선택 다이얼로그 — 코드 어디에도 없음. 현재는 user가 위치한 페이지에 따라 source가 implicit 결정됨
- live reference (snapshot이 아닌 원본 링크) — 모든 복사는 frozen snapshot
- 부모-자식 추적 metadata — `사이트 X에서 가져옴` 표기 같은 origin breadcrumb 없음

---

## 2. 내 제작물 (My Productions) — 현 상태

### 2-1. POP

| Service | UI 페이지 | 생성 API | AI 연동 | 저장 entity | 파일 출력 | Status |
|---------|----------|----------|---------|-------------|----------|--------|
| **kpa-society** | `ProductPopBuilderPage.tsx`, `StorePopPage.tsx` | `POST /pharmacy/pop/generate` | ✓ (pop_short/pop_long) | `StoreExecutionAsset` | PDF (A4/A5/A6) | **active** |
| **glycopharm** | — | `POST /pharmacy/pop/generate` | ✓ (pop_short/pop_long) | `StoreExecutionAsset` | PDF | partial (UI 부재) |
| **k-cosmetics** | — | `POST /pharmacy/pop/generate` | ✓ (pop_short/pop_long) | `StoreExecutionAsset` | PDF | partial (UI 부재) |
| **neture** | — | (미등록) | — | — | — | missing |

**파일 위치:**
- 백엔드 entity: `apps/api-server/src/routes/platform/entities/store-execution-asset.entity.ts`
- 컨트롤러: `apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts:76-160`
- 서비스: `apps/api-server/src/services/pop-generator.service.js` (PDF 생성)
- KPA UI: [ProductPopBuilderPage.tsx](services/web-kpa-society/src/pages/pharmacy/ProductPopBuilderPage.tsx) (메뉴 미노출, route only) / [StorePopPage.tsx](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx) (사이드바 `매장 실행 → POP 자료`)

### 2-2. QR Code

| Service | 관리 UI | 랜딩 페이지 | API | AI 연동 | Analytics | 파일 출력 | Status |
|---------|---------|-------------|-----|---------|-----------|----------|--------|
| **kpa-society** | `StoreQRPage.tsx` | (백엔드 공용) | `/pharmacy/qr/*` | ✓ (qr_description) | ✓ | PNG/SVG/PDF | **active** |
| **glycopharm** | — | `QrLandingPage.tsx` (요청 라우팅 전용) | `/pharmacy/qr/*` | ✓ | ✓ | PNG/SVG/PDF | partial (관리 UI 부재) |
| **k-cosmetics** | — | — | `/pharmacy/qr/*` | ✓ | ✓ | PNG/SVG/PDF | partial (UI 부재) |
| **neture** | `SellerQRGuidePage.tsx` (가이드용) | `/qr/public/:slug` (공용) | (관리 API 미등록) | — | — | PNG (client) | partial |

**파일 위치:**
- 백엔드 entity: `apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts` (+ `StoreQrScanEvent`)
- 컨트롤러: `apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts`
- 생성 서비스: `apps/api-server/src/services/qr-print.service.js`
- KPA UI: [StoreQRPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx) (사이드바 `매장 실행 → QR 코드`)

### 2-3. 블로그

| Service | Staff Editor | 공개 페이지 | API | 저장 | AI 연동 | Status |
|---------|--------------|-------------|-----|------|---------|--------|
| **kpa-society** | `PharmacyBlogPage.tsx` | `StoreBlogPage.tsx` / `StoreBlogPostPage.tsx` | `/stores/:slug/blog/staff` | `store_blog_posts` | ✗ | **active** |
| **glycopharm** | — | — | `/stores/:slug/blog` | `store_blog_posts` (serviceKey=glycopharm) | ✗ | partial (UI 부재) |
| **k-cosmetics** | — | — | (미등록) | — | ✗ | missing |
| **neture** | — | `StoreBlogListPage.tsx` / `StoreBlogPage.tsx` | `/stores/:slug/blog` (read-only) | `store_blog_posts` | ✗ | partial (read-only) |

**파일 위치:**
- 백엔드 entity: `apps/api-server/src/routes/glycopharm/entities/store-blog-post.entity.ts` (multi-service via `serviceKey` column)
- 컨트롤러: `apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts`
- KPA UI: [PharmacyBlogPage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx) (사이드바 `매장 실행 → 블로그`)

### 2-4. 상품 상세설명

| Service | UI 페이지 | API | AI 연동 | 저장 entity | 파일 출력 | Status |
|---------|----------|-----|---------|-------------|----------|--------|
| **kpa-society** | `ProductPopBuilderPage.tsx` (간접) | `/products/:productId/ai-contents` | ✓ | `ProductAiContent` | (텍스트) + POP PDF | partial (전용 UI 부재) |
| **glycopharm** | — | `/products/:productId/ai-contents` | ✓ | `ProductAiContent` | (텍스트) | partial (UI 부재) |
| **k-cosmetics** | — | `/products/:productId/ai-contents` | ✓ | `ProductAiContent` | (텍스트) | partial (UI 부재) |
| **neture** | — | `/products/:productId/ai-contents` | ✓ | `ProductAiContent` | (텍스트) | partial (UI 부재) |

**파일 위치:**
- 백엔드 entity: `apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts`
- contentType enum: `product_description | pop_short | pop_long | qr_description | signage_text` — POP/QR/Signage 텍스트와 통합 관리
- 컨트롤러: `apps/api-server/src/modules/store-ai/controllers/product-ai-content.controller.ts`
- 프롬프트: `apps/api-server/src/services/ai-prompts/productDetail.ts`

### 2-5. AI 흐름 정리

- **AI 콘텐츠 → POP 변환:** `ProductPopBuilderPage`가 `getProductAiContents()`로 pop_short/pop_long을 prefill → 사용자가 편집 → `saveProductAiContent()`로 manual override 저장 → `GET /products/:productId/pop/:layout`으로 PDF 생성
- **AI 콘텐츠 → QR 활용:** `qr_description` 타입이 `ProductAiContent`에 존재하나, 현재 KPA `StoreQRPage`에서 자동 prefill 흐름은 코드상 미연결
- **상품 설명 자동 생성:** `POST /api/v1/products/:productId/ai-contents/generate` (전체 5타입 fire-and-forget) 또는 `/generate/:type` (특정 타입). UI에서 명시적 트리거는 ProductPopBuilderPage 내부에 한정
- **Blog/Article export:** AI 연동 없음. `ProductAiContent.signage_text`만 별도 활용

---

## 3. Signage 분리 상태

### 3-1. Signage entity inventory (참고)

| 테이블 | 역할 |
|--------|------|
| `signage_media` | 미디어 자산 (video/image/html/text/link) |
| `signage_playlists` | 재생 목록 |
| `signage_playlist_items` | 재생 목록 항목 |
| `signage_schedules` | 시간대 라우팅 |
| `signage_templates` / `signage_template_zones` | 레이아웃 템플릿 |
| `signage_layout_presets` | 레이아웃 프리셋 |
| `signage_content_blocks` | 모듈식 콘텐츠 |
| `signage_forced_content` / `signage_forced_content_positions` | 운영자 강제 노출 |
| `signage_ai_generation_logs` | AI 생성 로그 |

(dropped: `signage_playlist_shares`, `signage_analytics`, `signage_media_tags` — `WO-KPA-SIGNAGE-DEAD-CODE-CLEANUP-V1`)

### 3-2. 혼합 흔적 검사

**검사 결과: 혼합 없음** (read-only grep 기준)

| 검사 | 결과 |
|------|------|
| `signage` ↔ `material` 동시 등장 파일 | 0건 |
| `signage` ↔ `production` 동시 등장 파일 | 0건 |
| `routes/signage` 내부에서 CMS/Forum/LMS import | 0건 |
| `pages/dashboard` 또는 materials 페이지에서 signage import | 0건 |
| asset-snapshot resolver의 signage 호출 | KPA·Neture resolver 단방향만 (`resolvers/kpa-asset.resolver.ts`, `resolvers/neture-asset.resolver.ts`) — signage 측은 asset-snapshot 미참조 |

**canonical 문서 정합성:**
- `docs/baseline/KPA-SIGNAGE-STRUCTURE-V1.md` (Frozen): Community/Operator/Store **3분리 구조** 명시. Hub=Original, Store=Snapshot 단방향 복사. URL namespace `/signage` (community), `/operator/signage` (operator), `/store/marketing/signage` (store)
- `docs/o4o-common-structure.md`: Forum/LMS/Signage는 **공통 구조**, serviceKey 기반 격리. 서비스별 signage 테이블 생성 금지

**결론:** Signage는 본 IR 대상(자료함/제작물)과 **물리적·논리적으로 분리**되어 있음. 단, **사이드바 메뉴 구조 측면에서는** "디지털 사이니지" 그룹이 별도 존재 (`storeMenuConfig.ts:207-212`) — 신규 "내 제작물" 그룹과 같은 계층에 위치하므로 향후 메뉴 재배치 시 충돌 가능성은 없음.

---

## 4. UI/메뉴 구조 정리 (canonical 후보 vs 현재)

### 4-1. 제안 canonical 구조

```
내 자료함
 ├─ 콘텐츠
 └─ 자료

내 제작물
 ├─ POP
 ├─ QR 코드
 ├─ 블로그
 └─ 상품 상세설명
```

### 4-2. KPA-Society 현 사이드바 vs 제안

| 제안 항목 | 현재 위치 | 차이 |
|----------|----------|------|
| 내 자료함 / 콘텐츠 | `내 자료함 → 콘텐츠` (`/store/library/contents`) | placeholder만 — **항목 일치, 페이지 부재** |
| 내 자료함 / 자료 | `내 자료함 → 자료` (`/store/library/resources`) | placeholder만 — **항목 일치, 페이지 부재** |
| (제안에 없음) | `내 자료함 → 강좌` (`/store/library/courses`) | KPA에 추가 항목 — 제안과 충돌 또는 보완 검토 필요 |
| 내 제작물 / POP | `매장 실행 → POP 자료` | **그룹 다름** (매장 실행에 흩어짐) |
| 내 제작물 / QR 코드 | `매장 실행 → QR 코드` | **그룹 다름** |
| 내 제작물 / 블로그 | `매장 실행 → 블로그` | **그룹 다름** |
| 내 제작물 / 상품 상세설명 | (메뉴 미노출, 라우트만 `/store/commerce/products/:productId/marketing`) | **메뉴 자체 부재** |
| (제안에 없음) | `매장 실행 → 자료실` (`/store/content`) | "내 자료함"과 의미 중복 가능 — 정리 필요 |
| (제안에 없음) | `매장 실행 → 채널 관리`, `태블릿 진열`, `상담 요청` | 매장 실행 잔존 항목 — 별도 그룹 검토 |

### 4-3. GlycoPharm·K-Cosmetics·Neture

- **GlycoPharm:** 사이드바에 자료함/제작물 그룹 부재. `마케팅·콘텐츠 → 콘텐츠 가져오기`만 존재. 백엔드 API는 모두 등록되어 있어 UI만 추가하면 활성화 가능
- **K-Cosmetics:** 매우 단순한 사이드바 (홈/채널/상품/사이니지/설정). 자료함·제작물 모두 부재. 일부 백엔드(POP·QR API)는 등록되어 있으나 entity 실데이터·UI 모두 부재
- **Neture:** store-hub 사이드바 모델 자체가 없음 — supplier/partner/operator 역할 기반 네비게이션. 단, `/dashboard/my-content`는 active. 본 canonical 구조의 **적용 대상에서 제외하거나 별도 매핑 필요**

---

## 5. 종합 정리

### A. 이미 존재하는 기능 (재사용 가능)

| 영역 | 자산 | 비고 |
|------|------|------|
| 내 자료함 (사이드바 그룹) | KPA 사이드바 `내 자료함` 그룹 메뉴 | placeholder 페이지만 연결 |
| 내 자료함 (Dashboard 변형) | KPA·Neture `/dashboard/my-content` | snapshot copy 패턴 active |
| 자료함 백엔드 | `o4o_asset_snapshots`, `kpa_store_contents`, `store_library_items`, `NetureSupplierLibraryItem` | 모두 active |
| 자료함 API | Dashboard Assets API, Store Library API, Store Content API, Neture Library API | 모두 active |
| POP | KPA UI 2개, 백엔드 4개 서비스 (Neture 제외), PDF 생성 | KPA active / 그 외 partial |
| QR | KPA `StoreQRPage`, 백엔드 4개 서비스 (Neture 관리 API 제외), PNG/SVG/PDF + Analytics | KPA active / 그 외 partial |
| 블로그 | KPA Staff editor + Public, Neture Public-only, 공통 `store_blog_posts` (serviceKey 분리) | KPA active / Neture read-only |
| 상품 상세설명 (AI) | `ProductAiContent` entity, 5 contentType, generate/upsert API | 4개 서비스 모두 백엔드 active, KPA에 간접 UI |
| AI 통합 | `ProductAiContent` 단일 entity로 POP·QR·Signage 텍스트 통합 관리 | 5 contentType 통합 |

### B. 부분 구현 상태

| 영역 | 상태 |
|------|------|
| KPA 내 자료함 콘텐츠/강좌/자료 | 메뉴 + route 존재, **페이지 placeholder** (StoreLibraryPlaceholderPage) |
| KPA 내 자료함 자료실 (`/store/content`) | 별개 메뉴 — 의미 중복 가능 |
| GlycoPharm POP·QR·블로그 | 백엔드 active, **UI 미구현** |
| K-Cosmetics POP·QR | 백엔드 active, **UI·실데이터 부재** |
| Neture 블로그 | Public read-only, **Staff editor·관리 API 미등록** |
| Neture POP·QR 관리 | 백엔드 미등록, public 랜딩만 존재 |
| 상품 상세설명 진입점 | 4개 서비스 백엔드 active, 전용 UI 페이지 부재 (KPA만 ProductPopBuilder를 통한 간접 진입) |
| `StoreLibraryItem` (store_library_items) | 백엔드 active, **사용 UI 미연결** |

### C. dead/mock 상태

| 항목 | 상태 | 위치 |
|------|------|------|
| `StoreLibraryPlaceholderPage` | placeholder만 (실 데이터/CRUD 없음) | `services/web-kpa-society/src/pages/pharmacy/StoreLibraryPlaceholderPage.tsx` |
| K-Cosmetics `ResourcesPage` | API 미구현으로 empty fallback | `services/web-k-cosmetics/src/pages/resources/ResourcesPage.tsx` |
| Signage dropped tables | dead — 이미 cleanup WO 적용됨 | `signage_playlist_shares`, `signage_analytics`, `signage_media_tags` |

(현재 자료함/제작물 영역에서 명시적 mock 데이터 사용 페이지는 발견되지 않음 — 모두 실 API 또는 placeholder)

### D. 새로 설계해야 하는 영역

| 영역 | 필요 사유 |
|------|----------|
| KPA `내 자료함` 실 페이지 (콘텐츠·자료) | 메뉴는 있으나 placeholder만 — `o4o_asset_snapshots` + `store_library_items` 연결 필요 |
| `내 제작물` 메뉴 그룹 신설 | 현재 KPA `매장 실행`에 흩어진 POP/QR/블로그를 묶고, 상품 상세설명을 추가 |
| 상품 상세설명 전용 UI | 4개 서비스 모두 백엔드만 존재. 사이드바 진입점 정의 + 페이지 필요 |
| "Save To" 다이얼로그 (커뮤니티/내 매장/둘 다) | 코드 어디에도 없음. 현재 source는 implicit |
| GlycoPharm·K-Cosmetics 자료함 UI | 백엔드는 다 있으나 사이드바 그룹·페이지 부재 |
| Neture 블로그 Staff editor (필요 시) | 현재 read-only public만. 의도된 read-only인지 확인 필요 |
| origin breadcrumb / parent-child 추적 | 현재 snapshot은 frozen — "어디서 가져왔는지" UI 표기 메커니즘 부재 |

### E. canonical 구조와 충돌하는 기존 구조

| 충돌 | 위치 | 설명 |
|------|------|------|
| KPA `내 자료함 → 강좌` 추가 항목 | `storeMenuConfig.ts:204` | 제안 canonical(콘텐츠/자료 2개)과 다름. 강좌(LMS)를 별도 그룹으로 분리할지 결정 필요 |
| KPA `매장 실행 → 자료실` (`/store/content`) | `storeMenuConfig.ts:221` | "내 자료함"과 의미 중복. 둘 중 하나는 deprecate 또는 역할 분리 필요 |
| KPA POP/QR/블로그가 `매장 실행`에 위치 | `storeMenuConfig.ts:218-220` | 제안 `내 제작물` 그룹과 그룹명 다름. 메뉴 이동 필요 |
| KPA `매장 실행 → 채널 관리·태블릿 진열·상담 요청` | `storeMenuConfig.ts:216-217, 222` | 제안 `내 제작물`로 묶이지 않는 항목 — 잔존 그룹 처리 필요 |
| Neture 사이드바 모델 | (사이드바 부재) | role-based navigation으로 store-hub 모델 미적용 — canonical 적용 범위 정의 필요 |
| `StoreLibraryItem.sourceType = 'uploaded'` 단일 값 | `store-library-item.entity.ts` | 제안 구조의 `community/store/both` 라우팅과 호환 위해 enum 확장 필요 |

### F. 즉시 재사용 가능한 API/entity/component

**Entity:**
- `o4o_asset_snapshots` — 모든 서비스 공용 immutable copy
- `kpa_store_contents` (KPA), `NetureSupplierLibraryItem` (Neture) — 서비스 확장 패턴 reference
- `store_library_items` — 매장 자료실 통합 entity (현재 미사용 UI 후보)
- `store_execution_assets` — POP 등 실행 자산
- `store_qr_codes` + `store_qr_scan_events` — QR 관리 + analytics
- `store_blog_posts` — 다중 serviceKey 지원
- `product_ai_contents` — 5개 contentType 통합 (product_description / pop_short / pop_long / qr_description / signage_text)

**API:**
- `GET/POST /api/v1/dashboard` (list/copy/publish/archive)
- `GET/POST/PUT/DELETE /api/v1/store/pharmacy/library`
- `POST /api/v1/store/store-contents` (direct + share-to-hub)
- `POST /api/v1/products/:productId/ai-contents/generate[/:type]`
- `PUT /api/v1/products/:productId/ai-contents/:type` (manual override)
- `GET /api/v1/products/:productId/pop/:layout` (PDF)
- `POST /api/v1/store/pharmacy/pop/generate` (배치 PDF)
- `/api/v1/store/pharmacy/qr/*` (생성·이미지·인쇄·analytics)
- `/api/v1/store/stores/:slug/blog/staff` (CRUD + publish/archive)

**Component:**
- `StoreLibraryPlaceholderPage` (KPA) — 그룹 의도 표시용으로 재사용 가능
- `StoreQRCreateEntryModal` (KPA) — POP/QR 연결 modal
- `ProductPopBuilderPage` (KPA) — AI prefill + manual edit + PDF 패턴 reference
- `PharmacyBlogPage` (KPA) — Staff editor reference
- `MyContentPage` (KPA, Neture) — Dashboard asset 패턴 reference

---

## 6. 구현 우선순위 (참고)

> 본 IR은 구현 계획이 아니지만, 후속 WO 설계의 참고를 위해 의존도/난이도 기준 우선순위를 메모한다.

| 순위 | 항목 | 이유 |
|------|------|------|
| 1 | KPA `내 자료함` 실 페이지 연결 | 메뉴+route+entity+API 모두 active. 페이지 컴포넌트만 부재 — 가장 낮은 비용 |
| 2 | KPA `내 제작물` 그룹 신설 + 매장 실행에서 POP/QR/블로그 이동 | 메뉴 재배치만으로 canonical 구조 정합성 확보 |
| 3 | 상품 상세설명 전용 UI (4개 서비스) | 백엔드 100% 준비됨 — UI만 추가하면 4개 서비스 동시 활성화 |
| 4 | GlycoPharm POP/QR/블로그 UI | 백엔드 active, UI 부재 |
| 5 | "Save To" 다이얼로그 | 신규 흐름 정의 + sourceType enum 확장 + UI 동시 작업 |
| 6 | K-Cosmetics 자료함/제작물 UI | 가장 마지막 — 실데이터·운영 사용 사례 확인 후 |
| 7 | Neture canonical 적용 여부 결정 | role-based vs store-hub 정책 결정 선행 필요 |

---

## 7. 작업 규칙 준수 확인

- ✅ 조사만 수행 (코드/DB/route 변경 없음)
- ✅ canonical 판단은 §5 E·F에 기재, 구현 미수행
- ✅ 실제 존재 코드/파일/path/line 기준으로만 판단
- ✅ 추정(speculation) 금지 — "있을 것 같다"형 표현 미사용

---

*작성: 2026-05-08*
*조사 범위: services/{web-kpa-society, web-glycopharm, web-k-cosmetics, web-neture, signage-player-web}, packages/store-ui-core, apps/api-server*
*상태: READ-ONLY 조사 완료. 후속 WO에서 우선순위 기반 구현 진행 권장.*
