# IR-KPA-STORE-CONTENT-LIBRARY-AND-ASSET-CREATION-FLOW-AUDIT-V1

> **조사 전용 (read-only).** 코드/문구/라우트/API 수정 없음. KPA-Society `내 약국` 실행 영역에서 **내 자료함(콘텐츠/자료/제작 자료) ↔ POP·QR·블로그·사이니지 제작·저장·재사용** 흐름의 정합성을 조사하고 단계별 WO 판단 근거를 제공한다.

- **작성일**: 2026-06-04
- **작업 유형**: Investigation (IR) — 구현·UI 추가는 본 작업 범위 밖
- **조사 범위**: `services/web-kpa-society`, `packages/store-ui-core`, `packages/store-asset-policy-core`, `packages/asset-copy-core`, `apps/api-server/src`
- **선행 참조**: `docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md`
- **트리거**: POP 제작 화면 오류 `PDF 출력은 "내 자료함 → 자료" 항목만 지원합니다` + "내 자료함 → 콘텐츠를 재사용 중심 저장소로" 요구

---

## 1. Executive Summary

**핵심 결론: "내 자료함"은 단일 저장소가 아니라, 3개의 서로 다른 탭이 3종 이상의 서로 다른 엔티티를 바라보는 분절(分節) 구조다.** 그리고 POP/QR/블로그/사이니지는 각자 **독립 저장소**를 가지며, 이들 사이의 "저장 → 재사용" 연결은 **부분적으로만** 존재한다.

1. **내 자료함 = 3탭 / 3엔티티**
   - 콘텐츠 (`/store/library/contents`) → 문서·강의 Full-Copy 자산 (`o4o_asset_snapshots` + `kpa_store_contents`)
   - 자료 (`/store/library/resources`) → **원소스 보관 전용** (`store_execution_assets` 업로드 + `o4o_asset_snapshots` resource) — read-only
   - 매장 제작 자료 (`/store/library/production-materials`) → **제작 결과 저장소** (`kpa_store_contents` direct + `store_execution_assets` generated)

2. **POP PDF 오류는 UX 버그가 아니라 자산 타입(origin) 분류 제약이다.** POP PDF 백엔드는 **파일형 자산(`store_execution_assets`, origin=`library`)만** 입력으로 받는다. HTML/텍스트형 콘텐츠(snapshot/direct)는 PDF 경로가 없어 필터링된다.

3. **제작 결과물의 "내 자료함 재노출"이 불완전하다.**
   - POP(PDF): **엔티티로 저장되지 않음** (즉석 blob) → 재사용 불가
   - QR: `store_qr_codes` 엔티티로 저장되나 콘텐츠/제작자료 탭에 **노출되지 않고** 자기 화면(`/marketing/qr`)에서만 보임
   - 블로그: `store_blog_posts`(staff)로 저장되나 내 자료함에 **미노출**
   - 사이니지: 플레이리스트 항목이 `snapshot_id` 참조로 **재사용 연결됨** (유일하게 정합)

4. **사용자가 기대하는 "콘텐츠를 중심 저장소로, 모든 제작이 거기서 출발/거기로 저장"은 현재 구조상 콘텐츠 탭에서 일부만 성립**한다 (콘텐츠 → 제작 시작 → AI → 제작 자료 저장 흐름은 존재). 그러나 POP/QR/블로그 결과의 역방향 적재(내 자료함 재노출)와 자산 간 교차 재사용(블로그→QR→POP)은 미구현.

**판단:** 사용자 지적은 타당하다. 단, **단순 CTA 추가로 끝나지 않으며**, 저장 모델(엔티티 분산)과 asset-type 분류가 얽혀 있다. → **Phase 1(발견성/진입점) 먼저, Phase 2(저장·재사용 정합성)와 분리** 권장.

---

## 2. 현재 구조 요약 (3계층)

| 계층 | 경로 | 역할 | 비고 |
|------|------|------|------|
| **Store Hub (공급계층)** | `/store-hub/*` | 플랫폼·운영자 자료 탐색 → "내 매장으로 가져가기" | import-only. `assetSnapshotApi.copy` → `o4o_asset_snapshots` |
| **내 약국 실행 (실행계층)** | `/store/*` | 실제 사용 자산 제작·운영 | POP/QR/블로그/사이니지 각 화면 |
| **내 자료함** | `/store/library/{contents,resources,production-materials}` | 보관·제작·재사용 중심 | **3탭 분절** (아래 §9) |

> 주의: `/store/content`(StoreAssetsPage)는 **사이드바 미노출 legacy hidden route**다. 사용자가 말하는 "내 자료함 → 콘텐츠"의 canonical 화면은 **`/store/library/contents` (StoreLibraryContentsPage)** 이다. (`store-ui-core/src/config/storeMenuConfig.ts` `KPA_SOCIETY_STORE_CONFIG` "내 자료함" 그룹)

---

## 3. Route Map (KPA, `App.tsx`)

```text
# 내 자료함 (사이드바 "내 자료함" 그룹)
/store/library/contents              → StoreLibraryContentsPage     (콘텐츠)
/store/library/resources             → StoreLibraryResourcesPage    (자료)
/store/library/production-materials  → StoreProductionMaterialsPage (매장 제작 자료)
/store/library/production-materials/new → ProductionMaterialEditorPage (표준 에디터)

# 제작/운영
/store/marketing/pop                 → StorePopPage                 (POP 제작·PDF)
/store/marketing/qr                  → StoreQRPage                  (QR 제작)
/store/marketing/signage/playlist|videos|schedules → StoreSignagePage
/store/content/blog                  → PharmacyBlogPage             (블로그 작성)
/store/content/pop                   → PharmacyPopPage              (가져온 POP 사본 관리)
/store/commerce/products/:id/pop     → ProductPopBuilderPage        (상품 POP, AI prefill)

# legacy / hidden
/store/content                       → StoreAssetsPage   (사이드바 미노출)
/store/content/:snapshotId/edit      → StoreContentEditPage
/store/content/direct/:id            → StoreDirectContentPage

# Store Hub (가져오기 입구)
/store-hub/{content,blog,pop,qr,signage}  → Hub*LibraryPage (import-only)
```

---

## 4. Component Map

| 화면 | 컴포넌트 | 핵심 동작 |
|------|----------|-----------|
| 콘텐츠 | `StoreLibraryContentsPage` | `StoreContentsSelector`(document/lesson 목록) + **"콘텐츠 제작"**(`CreateContentFromResourcesModal`) + **"제작 시작"**(`StartProductionModal` → AI → 에디터) |
| 자료 | `StoreLibraryResourcesPage` | `store_execution_assets`(업로드) + `assetSnapshotApi.list(type:'resource')` 병합 / **"자료 등록"**(`RegisterStoreResourceModal`) / 상세는 read-only |
| 제작 자료 | `StoreProductionMaterialsPage` | `directContentApi.list()` + `getStoreExecutionAssets(sourceType:'generated')` 병합 / **"새 제작 자료 만들기"** → `SelectContentsForProductionModal` → AI → 에디터 |
| 표준 에디터 | `ProductionMaterialEditorPage` | RichTextEditor, `createStoreExecutionAsset({assetType:'content', sourceType:'generated', category:POP|QR|blog|...})` 저장 |
| POP 제작 | `StorePopPage` | library 항목으로 PDF 생성(즉석 blob). 진입은 콘텐츠→제작시작 |
| POP 사본 | `PharmacyPopPage` | 운영자 HUB에서 가져온 `store_pops`(author_role=store) 편집/발행 |
| QR 제작 | `StoreQRPage` | `StoreAssetSelectorModal`로 source 선택 → `store_qr_codes` 저장 |
| 블로그 | `PharmacyBlogPage` | RichTextEditor + AI, `store blog staff` 저장/발행 |
| 사이니지 | `StoreSignagePage` | 동영상/플레이리스트/스케줄 3탭 |
| 자료 선택기 | `StoreAssetSelectorModal` / `StoreContentsSelector` / `SelectContentsForProductionModal` | source 선택 (KPA는 후자 2개가 canonical) |

> "내 자료함 열기"라는 단일 모달은 없다. POP/QR는 각자 다른 선택기를 쓴다(`StoreAssetSelectorModal` vs `SelectContentsForProductionModal`).

---

## 5. API Map (핵심)

| 기능 | 메서드·경로 | 저장 위치 |
|------|------------|-----------|
| 콘텐츠(direct) | `GET/POST/PUT /api/v1/kpa/store-contents[/{id}]` | `kpa_store_contents` (source_type=direct/snapshot_edit) |
| 자료/제작자산 | `GET/POST/PUT/DELETE /api/v1/kpa/store/assets[/{id}]` | `store_execution_assets` |
| 자산 스냅샷 복사 | `POST /api/v1/kpa/assets/copy`, `GET/PATCH/DELETE /api/v1/kpa/assets[/{id}]` | `o4o_asset_snapshots` (assetType: cms/signage/lesson/content/resource/blog/pop/qr) |
| 자산 publish/channel | `GET /api/v1/kpa/store-assets`, `PATCH .../publish`, `PATCH .../channel` | `kpa_store_asset_controls` (channel_map) |
| **POP PDF 생성** | `POST /api/v1/kpa/pharmacy/pop/generate` (`libraryItemIds[]`) | **저장 없음 — PDF blob 반환** |
| POP 사본 | `GET/PUT/DELETE /api/v1/kpa/stores/{slug}/pop/staff[/{id}]`, `POST .../import` | `store_pops` (author_role=store) |
| QR | `GET/POST/PUT/DELETE /api/v1/kpa/pharmacy/qr[/{id}]`, `/image`,`/print`,`/flyer`,`/analytics` | `store_qr_codes` (libraryItemId, landingTargetId) |
| 블로그(staff) | `GET/POST/PUT/PATCH/DELETE /api/v1/kpa/stores/{slug}/blog/staff[...]` | `store_blog_posts` (resolver: blog→StoreBlogPost) |
| 상품 POP AI | `GET/PUT /api/v1/products/{id}/ai-contents/{type}`, `GET /api/v1/products/{id}/pop/{layout}` | `product_ai_contents` (productId 키) |
| 사이니지 미디어 | `GET/POST/PATCH/DELETE /api/signage/kpa-society/media[/{id}]` | `signage_media` |
| 플레이리스트 | `GET/POST/PATCH/DELETE /api/v1/kpa/store-playlists[/{id}]`, `/items`, `/items/from-library`, `/items/from-signage`, `/items/reorder` | `store_playlists`, `store_playlist_items`(snapshot_id 참조) |
| 스케줄 | `GET/POST/PATCH/DELETE /api/signage/kpa-society/schedules[/{id}]` | signage schedules |

---

## 6. Data Model Map (저장소 분산 현황)

```text
o4o_asset_snapshots        # Hub에서 가져온 모든 자산 (assetType: cms/signage/lesson/content/resource/blog/pop/qr)
kpa_store_contents         # Store Production Material (canonical). source_type: direct | snapshot_edit
                           #   author_role(operator/store) · visibility_scope(organization) · workspace_status
store_execution_assets     # 파일 업로드 + AI 생성물. assetType(file/content) · sourceType(library/generated) · category(POP/QR/blog/...)
store_qr_codes             # QR 엔티티 (libraryItemId=source, landingTargetId=target)
store_pops                 # POP/블로그 사본·게시 (author_role: operator|store)
store_blog_posts           # 매장 블로그 글
signage_media              # 사이니지 미디어 (youtube/vimeo)
store_playlists / store_playlist_items   # 플레이리스트 (item이 snapshot_id 참조)
kpa_store_asset_controls   # 스냅샷 publish_status + channel_map(signage/blog 노출 여부)
product_ai_contents        # 상품별 AI 문구(pop_short/pop_long 등)
```

**관찰:** "콘텐츠 원본"과 "파생 결과물"을 **하나로 묶는 상위 모델이 없다.** `kpa_store_contents`가 logical canonical "Store Production Material"이지만, POP PDF/QR/블로그/사이니지 결과는 **각자 다른 테이블**에 적재되며 `kpa_store_contents`와의 parent/derived 관계 컬럼이 없다. 유일한 재사용 링크는 `store_playlist_items.snapshot_id`(사이니지)와 `store_qr_codes.libraryItemId`(QR source 참조)뿐이다.

> Canonical 문서(`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`): `kpa_store_contents`는 legacy physical name이며 3서비스(KPA/Glyco/Cosmetics) 공통. logical 개념은 service-neutral **Store Production Material**. 성급한 rename 금지. → 본 IR도 rename을 제안하지 않는다.

---

## 7. 화면별 기능 매트릭스 (§9 요구)

| 영역 | route | 현재 기능 | 생성 가능 | 저장 위치 | 내 자료함 노출 | 재사용 | 문제 |
|------|-------|-----------|:---------:|-----------|:--------------:|:------:|------|
| 콘텐츠 | `/store/library/contents` | 문서·강의 자산 목록 + 콘텐츠 제작 + 제작 시작 | ✅ | `kpa_store_contents`·`o4o_asset_snapshots` | — (본인이 목록) | △ 제작 시작만 | 교차 재사용(→QR/블로그) 진입 없음 |
| 자료 | `/store/library/resources` | 원소스 보관(업로드/가져옴), read-only | △ 등록만 | `store_execution_assets`·snapshot | ✅(자료 탭) | △ POP source | 제작 진입 없음(설계상 read-only) |
| 제작 자료 | `/store/library/production-materials` | 제작 결과 목록 + 새 제작(AI) | ✅ | `kpa_store_contents`(direct)·`store_execution_assets`(generated) | ✅(제작자료 탭) | △ | POP/QR/블로그 결과 일부만 적재 |
| POP | `/store/marketing/pop` | library 항목으로 PDF 생성 | ✅(PDF) | **없음(blob)** | ❌ | ❌ | 결과 미저장 + library-only 제약(§8) |
| POP 사본 | `/store/content/pop` | 가져온 POP 편집/발행 | △ 편집 | `store_pops`(store) | ❌(별도화면) | △ | 내 자료함 미노출 |
| QR | `/store/marketing/qr` | QR 생성·인쇄·분석 | ✅ | `store_qr_codes` | ❌(자기화면만) | △ POP 연결(qrId) | 콘텐츠/제작자료 탭 미노출 |
| 블로그 | `/store/content/blog` | 블로그 작성·발행·AI | ✅ | `store_blog_posts` | ❌ | ❌ | 내 자료함 미노출, QR/POP 연결 없음 |
| 사이니지 | `/store/marketing/signage/playlist` | 미디어·플레이리스트·스케줄 | ✅ | `signage_media`·`store_playlists`·`items` | △(별도) | ✅ snapshot 참조 | 콘텐츠 탭과 별도 관리 |
| Hub 콘텐츠 | `/store-hub/content` | 탐색·가져가기 | — | → `o4o_asset_snapshots` | ✅ 가져가면 노출 | ✅ | (설계상 정상) |
| Hub POP/QR/블로그/사이니지 | `/store-hub/{pop,qr,blog,signage}` | 탐색·가져가기 | — | → snapshot / store_pops | △ | △ | qr resolver 미구현(Phase1 placeholder) |

범례: ✅ 충족 / △ 부분 / ❌ 없음

---

## 8. POP 오류 원인 분석 — `PDF 출력은 "내 자료함 → 자료" 항목만 지원합니다`

**발생 지점:** `StorePopPage.tsx` `handleGenerate()` —
```ts
const libraryItems = popItems.filter((p) => p.origin === 'library');
if (libraryItems.length === 0) {
  toast.error('PDF 출력은 "내 자료함 → 자료" 항목만 지원합니다');
  return;
}
// 이후: POST /api/v1/kpa/pharmacy/pop/generate  { libraryItemIds: [...] }
```

**`origin` 분류** (`type PopItemOrigin = 'library' | 'snapshot' | 'direct'`):
- `library` = `store_execution_assets` (직접 업로드 **파일형 자산**, `getStoreExecutionAsset()`) → **PDF 가능**
- `snapshot` = `o4o_asset_snapshots` (Hub 가져온 커뮤니티 콘텐츠, HTML/텍스트) → 제외
- `direct` = `kpa_store_contents` (직접 작성 콘텐츠, HTML) → 제외

**근본 원인 (확정):** POP PDF 백엔드(`/pharmacy/pop/generate`)는 **파일형 라이브러리 자산(`libraryItemIds`)만** 받는다. "콘텐츠"(snapshot/direct)는 HTML/텍스트 본문이라 **파일→PDF 경로가 없어** 입력에서 배제된다. 즉 이것은 **자산 타입(파일 vs 콘텐츠) × PDF 생성기 입력 계약**의 문제이며, 단순 UI 카피 문제가 아니다.

**함의:** 사용자가 "콘텐츠로도 POP PDF를 만들고 싶다"면, (a) HTML/텍스트 콘텐츠를 PDF로 렌더하는 백엔드 경로 추가 또는 (b) 콘텐츠 → 파일형 제작 자산 변환(이미 존재하는 `ProductionMaterialEditorPage` 결과를 PDF 입력으로 승격) 중 하나가 필요. → Phase 2 범위.

---

## 9. "내 자료함 → 콘텐츠"의 현재 역할

- **canonical 화면 = `StoreLibraryContentsPage`** (`/store/library/contents`). 단순 보관함이 아니라 이미 **제작 진입 일부를 보유**한다:
  - "콘텐츠 제작" → `CreateContentFromResourcesModal` (자료 기반 신규 콘텐츠)
  - "제작 시작" → `SelectContentsForProductionModal` → `StartProductionModal` → AI → `ProductionMaterialEditorPage` → `store_execution_assets`(generated) 저장
- 그러나 **부재**: 콘텐츠 row에서 직접 "POP 만들기 / QR 만들기 / 블로그 글쓰기 / 사이니지에 추가"로 가는 교차 진입, 가져온 자료 vs 직접 제작 구분 표식, 결과물 역추적.
- 사용자가 기대하는 "중심 저장소"는 **콘텐츠 + 제작 자료 두 탭이 사실상 그 역할을 나눠 갖고** 있는 상태. 통합 인지가 약하다.

---

## 10. 제작 결과물 저장/재사용 가능 여부 (요약)

| 자산 | 저장 | 내 자료함 재노출 | 다시 열기/재출력 | 교차 재사용 |
|------|:----:|:----------------:|:----------------:|-------------|
| POP(PDF) | ❌ blob | ❌ | ❌ | QR 연결(qrId 입력)만 |
| QR | ✅ `store_qr_codes` | ❌ (자기 화면만) | ✅ 다운로드/인쇄/flyer | POP에 qrId로 연결 |
| 블로그 | ✅ `store_blog_posts` | ❌ | ✅ 편집/발행 | ❌ |
| 사이니지 플레이리스트 | ✅ `store_playlists/items` | △ (별도 탭) | ✅ | ✅ snapshot 재사용 |
| 제작 자료(AI/직접) | ✅ `kpa_store_contents`/`store_execution_assets` | ✅ (제작자료 탭) | ✅ 에디터 | △ |

---

## 11. 누락된 UX (정리)

1. 콘텐츠/제작자료 row → **POP·QR·블로그·사이니지로의 교차 제작 진입** 없음.
2. **POP 결과물 미저장** (PDF blob) → 다시 열기/재출력/내 자료함 노출 불가.
3. QR·블로그 결과가 **내 자료함에 통합 노출되지 않음** (각자 화면에 고립).
4. "가져온 자료 vs 직접 제작" **UI 구분 표식** 부족(데이터(kind/sourceType)는 있으나 노출 약함).
5. 콘텐츠로 POP PDF를 만들려는 **자연스러운 경로 부재** (library 파일만 허용).
6. "내 자료함 = 1개 저장소"라는 **멘탈 모델과 3탭/다중 엔티티 실제 구조의 괴리**.

---

## 12. 권장 구현안 (단계 분리 — 코드 미착수)

### Phase 1 — 발견성/진입점 (저위험, UI/링크만)
- **콘텐츠·제작자료 row action 추가**: `POP 만들기`·`QR-code 만들기`·`블로그 글쓰기`·`사이니지에 추가` → **기존 제작 화면으로 state 전달**(이미 `production.source.items` 패턴 존재). 신규 엔티티/API 불필요.
- **각 제작 화면 상단에 저장 위치 안내**: "결과는 내 자료함 → 제작 자료에 저장됩니다" / POP의 경우 "PDF는 파일형 자료만 지원" 사유를 inline 안내로 명확화(오류 토스트 의존 탈피).
- **가져온 자료/직접 제작 배지** 노출(데이터 `kind`/`sourceType` 이미 존재).
- 이미 한 일과의 정합: `/store-hub/*`에 "직접 만들기" CTA는 본 IR 직전 WO(`dab7a81a6`)로 추가됨 → Phase 1은 그 매장 측(/store) 대응.

### Phase 2 — 저장/재사용 정합성 (중위험, API/모델)
- **POP 결과 저장**: `/pharmacy/pop/generate` 결과(또는 설정 + 생성 PDF 참조)를 엔티티로 저장 → 내 자료함 노출·재출력.
- **콘텐츠→POP PDF 경로**: HTML/텍스트 콘텐츠를 PDF로 렌더하거나, `ProductionMaterialEditorPage` 결과를 파일형으로 승격해 POP 입력 허용.
- **파생 관계 컬럼**: 결과물(POP/QR/블로그)에 `source_content_id`(또는 origin metadata) 부여 → 역추적/재사용.
- **QR·블로그의 내 자료함 통합 노출**(읽기 통합 뷰 또는 asset-type 필터).

### Phase 3 — 공통화 확장 (KPA → Glyco/KCos)
- `kpa_store_contents`는 이미 3서비스 공통(canonical). Phase 1·2에서 정리된 흐름을 GlycoPharm/K-Cosmetics로 확장 검토. **단, canonical 문서 기준 rename 금지·`organization_id` 격리 유지.**

---

## 13. 단계별 WO 제안

1. **WO-KPA-STORE-CONTENT-LIBRARY-CROSS-CREATE-CTA-V1** (Phase 1)
   콘텐츠/제작자료 row action으로 POP·QR·블로그·사이니지 제작 진입 + 저장위치/PDF제약 inline 안내 + 가져옴/직접 배지. *(UI·링크만, 신규 API 없음)*
2. **WO-KPA-POP-RESULT-PERSIST-AND-CONTENT-PDF-PATH-V1** (Phase 2-A)
   POP 결과 저장 + 콘텐츠(HTML)→PDF 경로(또는 파일 승격). POP 오류의 근본 해소.
3. **WO-KPA-STORE-ASSET-DERIVED-LINK-AND-UNIFIED-VIEW-V1** (Phase 2-B)
   결과물 `source_content_id` 도입 + QR/블로그 내 자료함 통합 노출.
4. **WO-O4O-STORE-CONTENT-LIBRARY-COMMONIZATION-V1** (Phase 3)
   KPA 정리분의 Glyco/KCos 확장. *(canonical/격리 가드 준수)*

> 우선순위: 1 → 2 → 3 → 4. Phase 1은 즉시 가능(저위험), Phase 2는 모델/계약 변경 동반이므로 별도 승인.

---

## 14. 위험 요소

- **저장소 분산**: 통합 뷰/파생관계를 무리하게 단일 테이블로 합치면 canonical(`kpa_store_contents`) 및 3서비스 공유 구조 위반 위험. → 읽기 통합/메타 링크로 접근.
- **POP PDF 계약 변경**: 파일형 전제(`libraryItemIds`)를 바꾸면 백엔드 PDF 생성기·다른 서비스 영향. → 별도 WO·검증 필수.
- **asset-type 다축(source_type/usage_type/assetType/origin) 혼재**: Phase 2에서 분류 축을 건드릴 때 회귀 위험. 변경 전 축 정의 고정 필요.
- **boundary**: 모든 쿼리 `organization_id`(Store) 격리 유지 (Boundary Policy §7). visibility_scope='organization' 강제 유지.
- **동시 세션**: 작업 시 Neture Phase4 등 타 세션 변경과 staging 혼입 주의(본 프로젝트 반복 이슈).

---

## 15. 결론

사용자 지적은 정확하다. "내 자료함 → 콘텐츠"는 보관함을 넘어 **재사용 중심 저장소**여야 하지만, 현재는 (a) 3탭/다중 엔티티로 분절되어 인지가 약하고, (b) POP/QR/블로그 결과의 역방향 적재·교차 재사용이 미완이며, (c) POP PDF 오류는 **파일형 자산만 허용하는 PDF 계약** 때문이다.

따라서 **바로 UI 버튼을 붙이는 대신**, ① Phase 1으로 기존 제작 화면으로의 교차 진입·안내를 먼저 살리고(저위험), ② Phase 2로 POP 결과 저장·콘텐츠 PDF 경로·파생 관계를 정합화하며, ③ Phase 3에서 3서비스 공통화를 검토하는 단계 분리가 안전하다. POP 오류는 Phase 2의 핵심 항목으로 다룬다.

---

### 부록 A. 핵심 파일 인덱스
- 사이드바: `packages/store-ui-core/src/config/storeMenuConfig.ts` (`KPA_SOCIETY_STORE_CONFIG` "내 자료함")
- 콘텐츠/자료/제작자료: `services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx`, `StoreLibraryResourcesPage.tsx`, `StoreProductionMaterialsPage.tsx`, `ProductionMaterialEditorPage.tsx`
- POP 오류: `services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx` (`handleGenerate`, `origin==='library'` 필터)
- QR/블로그/사이니지: `StoreQRPage.tsx`, `PharmacyBlogPage.tsx`, `StoreSignagePage.tsx`
- 백엔드 엔티티: `apps/api-server/src` — `kpa-store-content.entity.ts`, `store-execution-asset*`, `store-qr*`, `store-pop.entity.ts`, `store-playlist*.entity.ts`, `kpa-store-asset-control.entity.ts`
- canonical: `docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md`

*조사 방식: read-only 병렬 코드 조사(Explore agents) + canonical 문서 정독. 코드/문구/라우트/API 변경 없음. 본 IR은 git commit 하지 않는다(WO §13).*
