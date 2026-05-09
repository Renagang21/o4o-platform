---
id: IR-O4O-STORE-EXECUTION-CONTENT-ASSET-POLICY-V1
title: "Store Execution Content Asset Policy — 실행 메뉴 결과를 자료함 자산으로 통합 가능성 조사"
status: draft
date: 2026-05-09
scope:
  - 매장 실행 메뉴(블로그/POP/QR/상품 상세설명) 결과물의 자료함 통합 가능성
  - "실행 entity = reference layer / 본문 = 자료함 asset" canonical 구조 검토
  - duplication 분석 + reference 패턴 비교 + boundary 정책 정합성
  - 신규 entity vs 컬럼 추가 vs UI 재구성 영향 범위
related:
  - docs/investigations/IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1.md
  - docs/investigations/IR-O4O-STORE-LIBRARY-CANONICAL-ASSET-FLOW-V1.md
  - docs/investigations/IR-O4O-COMMUNITY-TO-STORE-COPY-FLOW-AUDIT-V1.md
  - docs/investigations/IR-O4O-KPA-STORE-BLOG-SITE-ARCHITECTURE-V1.md
  - docs/architecture/STORE-LAYER-ARCHITECTURE.md
  - docs/baseline/PLATFORM-CONTENT-POLICY-V1.md
  - docs/architecture/O4O-BOUNDARY-POLICY-V1.md
constraint:
  - 조사만 수행 — 코드 / migration / entity 변경 없음
  - 추정 금지 / 실제 코드 기준 / 자매 IR 사실은 출처 명시
---

# IR-O4O-STORE-EXECUTION-CONTENT-ASSET-POLICY-V1

> 실행 메뉴(블로그/POP/QR/상품 상세설명) 결과를 "내 자료함" 중심 Store Asset 구조로 통합 가능한지를 정적 조사한다.
> **자매 IR**(`IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1`)이 입력측(자료함 → 결과물 reference) 가능성을 다뤘다면, 본 IR은 **출력측(결과물 → 자료함 backstore)** 가능성과 정책 방향을 다룬다.

- 작성일: 2026-05-09
- 기준 브랜치: `main` (sync 완료, `Already up to date`)
- 작업 규칙: 조사만 / 코드 수정 없음

---

## 0. 결론 요약 (TL;DR)

> **canonical 가설("실행 결과 = 매장 전용 자산 = 자료함 저장, 실행 entity = reference 관리")은 입력측에서는 90% 작동하나, 출력측에서는 단 한 곳에서 막힌다 — Blog 본문이 `store_blog_posts.content`에 HTML로 직접 저장되어 자료함과 *현저한 duplication* 이 발생한다. POP은 entity 자체가 휘발성, QR은 libraryItemId 단일 FK라 polymorphic 부재, ProductAi는 source 필드 부재. 단방향 boundary("Community → Store only")는 코드 수준에서 이미 강제되어 있으며, 과거 Store→Community 공유 흐름은 폐기 완료(WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1).**

> **권장 구조 방향: B (일부만 Store Asset 연결) → 점진적 C (실행 콘텐츠 통합). 직접 D (완전 CMS 재설계)는 과도하며 이미 분산된 패키지(forum-core / shared-space-ui / asset-copy-core) 구조와 충돌. 핵심 정비 진입점은 ① Blog body의 자료함 reference 전환 ② Blog/ProductAi에 source_material_id 추가 ③ POP 결과물 entity화 정책 결정.**

### 핵심 발견 8가지

1. **boundary는 이미 견고** — "Community → Store 단방향" 정책이 코드/문서/엔드포인트 폐기로 강제됨. 본 IR의 통합 방향은 이 정책에 정합.
2. **Blog가 가장 큰 duplication 원흉** — `store_blog_posts.content`에 본문 HTML 직접 저장. 자료함 prefill 후 발행하면 본문이 두 곳에 존재.
3. **POP은 휘발성 PDF** — entity 자체가 없어 결과물 reference 대상이 아님. 영속화 정책 결정이 선행 과제.
4. **QR은 단일 FK** — `libraryItemId`로 `store_library_items` / `store_execution_assets`만 가리킴. `kpa_store_contents`나 다른 source 미지원.
5. **ProductAi는 target만 보유** — `productId`는 결과물의 *target* product이지 *source* asset이 아님. source 필드 부재.
6. **`kpa_store_contents`가 통합 entity의 baseline** — 자매 IR 결론. `content_json` jsonb로 모든 payload 흡수 가능, `source_type='direct'`로 store-created 흐름 이미 작동.
7. **Reference 4패턴 중 B+D 조합 권장** — assetId FK(B) 기본 + 발행 시점 snapshot copy(D) 선택적 사용. URL(A)은 외부 링크 한정, slug(C)는 사람 친화 보조.
8. **AI 재가공 chain 부재** — AI 결과가 자료함에 backstore되지 않아 재사용 불가. 멀티채널 재배포 시 결정적 제약.

### Phase 1 권장 우선순위

1. **canonical 정책 선언** — "매장 제작 콘텐츠 = `kpa_store_contents` 단일 entity" + "실행 entity는 reference layer" 명문화 (코드 변경 없음)
2. **Blog duplication 해소** — `store_blog_posts.body_asset_id` 추가 + 발행 흐름이 `kpa_store_contents`에 본문 저장 후 reference (가장 시급, 실효성 가장 큼)
3. **Blog/ProductAi에 `source_material_id` 추가** — polymorphic source reference 통일
4. **POP 결과물 entity 영속화 정책 결정** — 휘발성 유지 vs `store_pop_outputs` 신설

---

## 1. canonical 가설 정의

```text
[현재 — 분산 저장]
   자료함 콘텐츠       Blog editor       POP generator      QR creator       ProductAi
        │                  │                  │                 │                │
        ├─ kpa_store_contents (직접/편집)
        │                  │                  │                 │                │
   본문 저장          본문 직접 저장        휘발성 PDF        libraryItemId    productId+content
   (jsonb)         (store_blog_posts.content)  (entity 없음)    (단일 FK)       (단일 row upsert)
   ↑                                                           ↑               ↑
   │   ← 같은 본문이 여기 저장되면         self-contained      자료함만        본문이 자료함 밖에서
   └── Blog 발행 후에도 본문이 두 곳 존재  (재발행 불가)         가리킴          별도 저장
       (duplication 발생)


[가설 — 통합 저장]
   자료함 콘텐츠 = kpa_store_contents (single source of truth)
        │
   본문 저장 (jsonb)
        │
        ├──────────────────┬──────────────────┬──────────────────┐
        │                  │                  │                  │
   Blog reference       POP reference       QR reference        ProductAi reference
   (body_asset_id)      (sourceMaterialIds) (source_material_id) (source_material_id)
   + 발행 메타          + 출력 메타 + PDF   + landing 메타       + productId target
   (status, slug, ...)  (libraryItemIds[])  (publicUrl, ...)     (contentType, model)
```

본 IR은 **각 결과물이 가설 구조에 얼마나 가까이 갈 수 있는지** 평가한다.

---

## 2. 현재 Store Asset 저장 구조

### 2.1 자료함 entity 매트릭스 (재확인)

자매 IR(`IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1`)에서 정리된 결론을 본 IR의 출력측 관점에서 재확인:

| Entity | 본문 형식 | source 식별 | store-created 허용 | 비고 |
|---|---|---|:---:|---|
| `o4o_asset_snapshots` | jsonb (`content_json`) | `sourceService`+`sourceAssetId` (필수) | ❌ community import 강제 | snapshot은 시점 고정 read-mostly |
| **`kpa_store_contents`** | jsonb (`content_json`) | `snapshot_id` + `source_type` (`snapshot_edit`/`direct`) | ✅ direct 타입으로 가능 | **canonical 통합 entity 후보** |
| `store_library_items` | description + `htmlContent` + `fileUrl` | `sourceType` (자유 문자열) | ✅ 자유 분류 | 파일/링크 중심 |
| `store_execution_assets` | description + `htmlContent` + `fileUrl` | `sourceType` (자유 문자열) | ✅ 자유 분류 | usageType + assetType + category 3축 |
| `kpa_store_asset_controls` | — | `snapshot_id` (FK) | ❌ snapshot 제어 layer | publish/lifecycle 정책 |

**결론**: `kpa_store_contents` + `content_json` 조합이 store-created 본문을 흡수하는 baseline. 신규 entity 없이 진입 가능.

### 2.2 시나리오별 현재 수용 가능 여부 (출력측)

| 시나리오 | 현재 작동 | 가능성 | GAP |
|---|:---:|:---:|---|
| A. 자료함에서 직접 콘텐츠 작성 (`source_type='direct'`) | ✅ | ✅ | 없음 |
| B. Blog editor 결과를 자료함에 backstore | ❌ | ✅ (jsonb로 흡수 가능) | source_material_id / backstore 흐름 부재 |
| C. AI 정리 결과를 자료함에 backstore | ❌ | ✅ (jsonb로 흡수 가능) | aiContext / backstore 흐름 부재 |
| D. POP 결과물 영속화 + 자료함 backstore | ❌ | ⚠️ entity 신설 필요 | `store_pop_outputs` 같은 entity 부재 |
| E. ProductAi 결과를 자료함 asset으로 통합 | ❌ | ✅ (필드 추가 후 가능) | productId-only 구조라 source 분리 필요 |

→ **B, C는 신규 entity 없이 가능. D는 entity 정책 결정 필요. E는 컬럼 1~2개 추가**.

---

## 3. 결과물 4종별 저장 구조 + duplication 분석

### 3.1 Blog (`store_blog_posts`) — 가장 큰 duplication 발생

| 항목 | 현황 |
|---|---|
| 본문 저장 | `store_blog_posts.content` (text, **HTML 직접**) |
| source 필드 | ❌ 부재 |
| 작성 흐름 | 자료함 prefill → editor에서 수정 → 발행 시 HTML이 직접 저장 |
| duplication | **발생** — 자료함 콘텐츠 + Blog 본문이 두 곳에 존재. 발행 후 분기 |

**가설 적용 시 변환안**:

```text
[현재]
store_blog_posts {
  content: text  ← HTML 직접 저장
  ...
}

[가설]
store_blog_posts {
  body_asset_id: uuid  ← kpa_store_contents 참조
  body_snapshot_id: uuid (선택, 발행 시점 고정용)
  status, slug, publishedAt 등 발행 메타만
  ...
}
```

- **Reference 패턴**: B (assetId FK) 기본 + D (snapshot copy) 발행 시점 옵션
- **현실 부담**: 조회 시 join, 발행된 글의 본문 갱신 정책 결정 필요(자료함 변경이 발행글에 즉시 반영? 발행 시점 고정?)
- **마이그레이션 비용**: 기존 published row의 content를 자료함에 backstore + body_asset_id 채움 (자동 변환 스크립트 가능)

### 3.2 POP — 휘발성, entity 자체 부재

| 항목 | 현황 |
|---|---|
| 본문 저장 | ❌ 영속화 안 됨 (PDF buffer를 즉시 응답) |
| source 입력 | `libraryItemIds[]` + `supplierItemIds[]` (`POST /pharmacy/pop/generate`) |
| duplication | 없음 (애초에 저장 안 함) |

**가설 적용 시 변환안**: 두 옵션 중 정책 결정 필요

| 옵션 | 설명 | 영향 |
|---|---|---|
| (a) 휘발성 유지 | POP 결과는 reference 대상이 아님 명시 | 단순, 0 migration. 단 재발행 불가 |
| (b) `store_pop_outputs` entity 신설 | `{libraryItemIds[], supplierItemIds[], pdfUrl, layout, generatedAt}` 저장 | 재발행 / 추적 / 통계 가능. 신규 entity 1개 |

자매 IR도 동일한 양 갈래로 결정 항목 식별. 본 IR도 정책 영역으로 식별.

### 3.3 QR (`store_qr_codes`) — 단일 FK, polymorphic 부재

| 항목 | 현황 |
|---|---|
| 본문 저장 | 본문 없음 (description만) |
| source 필드 | `libraryItemId` (UUID FK, `store_library_items` 또는 `store_execution_assets`만 가리킴) |
| 추가 reference | `landingTargetId` (varchar, URL/slug 자유) + `landingType` (`product`/`promotion`/`page`/`link`) |
| duplication | 없음 |

**가설 적용 시 변환안**: `kpa_store_contents` 같은 다른 자료 source도 가리킬 수 있도록 polymorphic 확장

```text
[현재]
libraryItemId: uuid  ← store_library_items / store_execution_assets만

[가설]
source_material_service: 'library_item' | 'execution_asset' | 'store_content' | 'lesson_snapshot' | 'external_url'
source_material_id: uuid (또는 nullable)
```

→ libraryItemId 의미 확장(같은 컬럼 재정의) vs 신규 컬럼 추가 — 정책 결정.

### 3.4 ProductAi (`product_ai_contents`) — productId가 target, source 부재

| 항목 | 현황 |
|---|---|
| 본문 저장 | `product_ai_contents.content` (text) |
| source 필드 | ❌ 부재 (productId는 *target* product) |
| 작성 흐름 | LLM 호출 → upsert by `(productId, contentType)` |
| duplication | **부분** — 같은 productId의 같은 contentType 콘텐츠가 자료함에 별도로 저장될 가능성 |

**가설 적용 시 변환안**:

```text
[현재]
product_ai_contents {
  productId, contentType, content, model
}

[가설]
product_ai_contents {
  productId, contentType, model,
  body_asset_id: uuid  ← kpa_store_contents 참조
  ai_context: jsonb (선택)
}
```

→ 같은 자료함 asset을 여러 productId에 재사용 가능 (1:N).

### 3.5 결과물 4종 reference 가능 여부 매트릭스

| 결과물 | 현재 가능 | 컬럼 추가 후 가능 | 신규 entity 후 가능 |
|---|:---:|:---:|:---:|
| POP | ❌ entity 부재 | ❌ | ✅ (영속화 시) |
| QR | ⚠️ (단일 FK만) | ✅ (polymorphic) | — |
| Blog | ❌ (source 필드 부재) | ✅ | — |
| ProductAi | ❌ (source 필드 부재) | ✅ | — |

---

## 4. Reference 패턴 4종 비교

자매 IR(`IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1`)의 결과물 → 제작 자료 reference 매트릭스를 본 IR의 가설(*실행 결과 → 자료함 asset reference*) 관점에서 재평가:

| 패턴 | 코드 사용처 | 장점 | 단점 | 본 IR 가설에서 권장 |
|---|---|---|---|:---:|
| **A. URL reference** | `store_qr_codes.landingTargetId`, `store_library_items` (external-link) | 단순, 외부 연동 | ownership 모호, 깨진 링크 위험 | △ (외부 링크 한정) |
| **B. assetId FK** | `store_qr_codes.libraryItemId` | DB 정합성, 추적성 | polymorphic 한계 (단일 entity만) | **★ 기본 권장** |
| **C. slug reference** | `store_blog_posts.slug` | 사람 친화 URL | slug 변경 시 깨짐 (history로 완화) | △ (사람 친화 보조) |
| **D. snapshot copy** | `o4o_asset_snapshots.content_json` | 시점 고정, 원본 변경 무영향 | duplication, lifecycle 불일치 | ☆ (발행 시점 고정 옵션) |

### 권장 조합

**B (assetId FK) 중심 + D (snapshot copy) 보조**:
- 평소: `body_asset_id` (B)로 자료함 reference — 자료함 변경이 즉시 반영
- 발행 시점 고정 옵션: `body_snapshot_id` (D)로 snapshot 별도 보관 — 발행 후 자료함 변경에도 발행글은 안 변함

→ Blog 같이 "발행 시점 고정"이 의미 있는 결과물에는 D 옵션 추가, QR/ProductAi 같이 "최신 상태 자동 반영"이 자연스러운 결과물에는 B만으로 충분.

### Polymorphic source 패턴

`o4o_asset_snapshots`의 `sourceService` + `sourceAssetId` 패턴이 모범:

```text
source_material_service: 'kpa_store_contents' | 'store_library_items' | 'o4o_asset_snapshots'
source_material_id: uuid
```

자매 IR도 동일 패턴 권장. 본 IR도 출력측 reference 통일에 동일 권장.

---

## 5. Boundary / Ownership 정책 정합성

### 5.1 "Community → Store 단방향" 정책 — 이미 강제됨

- 명문화: `docs/baseline/PLATFORM-CONTENT-POLICY-V1.md` §6 "store 콘텐츠는 HUB 탭에 포함되지 않는다"
- 코드 강제:
  - 과거 `POST /store-contents/:id/share-to-hub` 엔드포인트 → **WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1로 폐기 완료** (코드에 주석만 잔존)
  - `o4o_asset_snapshots` UNIQUE `(org_id, source_asset_id, asset_type)` — community import 중복 차단
- 결론: **본 IR의 가설 구조는 boundary 정책과 충돌하지 않음**. 매장 자체 생성물이 자료함에 저장돼도 ownership=매장으로 유지.

### 5.2 Ownership 식별

- 식별자: `storeId + serviceKey` (복합)
- store-created vs community-imported 구분: `kpa_store_contents.source_type` (`snapshot_edit`/`direct`) — direct가 store-created
- Blog 발행 시 ownership 영향: ❌ **변경 없음**. visibility만 비공개→공개

### 5.3 Visibility / Publish 정책 매트릭스

| 행위 | Ownership 영향 | Visibility 영향 | 메커니즘 |
|---|:---:|:---:|---|
| Blog 발행 | ❌ | ✅ | `store_blog_posts.status='published'` + 공개 URL `/store/:slug/blog` |
| AssetSnapshot publish | ❌ | ✅ | `kpa_store_asset_controls.publish_status='published'` (매장 사이트 노출) |
| Storefront 노출 | ❌ | ✅ | `StorefrontHomePage` block visibility |
| POP PDF 생성 | ❌ | ✅ | 즉시 응답 (현재 휘발) |
| QR landing | ❌ | ✅ | `/qr/:slug` 공개 리다이렉션 |
| ~~Store→Community publish~~ | — | — | **폐기** |

→ Blog `published` 같은 공개 행위는 **ownership 이전이 아닌 visibility 변경**. 가설 구조 적용해도 boundary 안전.

### 5.4 HUB 공유 메커니즘
- `kpa_store_contents.share_status` (`pending`/`approved`/`rejected`/null) — 컬럼은 존재, 그러나 share-to-hub flow가 폐기되어 현재 미작동
- 다른 매장이 매장 자료를 가져갈 수 있는가? **불가** (canonical 정책 강제)

---

## 6. 멀티채널 재배포 + AI 재가공 가능성

### 6.1 한 자료함 asset → N 결과물 (현 상태)
- 기술적 가능: `o4o_asset_snapshots.id` 1건이 QR 1개 + POP N장 + Blog 1글 + ProductAi 1건에 동시 활용 가능
- **그러나** 결과물 entity가 source_material_id 미보유 → **역참조(이 자료를 쓴 결과물 N개) 추적 불가**
- `store_execution_assets.usageType` 필드 있지만 같은 asset이 여러 usageType 갖지 않음 (각각 독립 row)
- **canonical 가설 적용 후**: 역참조 추적 가능, 한 자료 변경이 N개 결과물에 영향(또는 발행 시점 snapshot 고정 가능)

### 6.2 AI 재가공 chain (현 상태)
- AI 호출 위치: Blog editor `AiContentModal` (`POST /api/ai/content`), ProductAi `/api/v1/products/:id/ai-contents/:type`
- 자료함 asset을 AI 입력으로 받는가: ✅ 부분 (Blog editor가 prefill된 title/excerpt를 AI로 보냄)
- AI 결과를 자료함 backstore: ❌ **부재**. 결과물 entity에만 저장.
- aiContext 보존 위치: ❌ 부재 (자매 IR과 동일 진단)
- chained reprocessing: ❌ 미지원

→ 가설 구조 적용 시 AI 결과 자동 backstore 흐름 + aiContext 컬럼 추가 시 chain 가능.

### 6.3 확장성 시나리오

| 시나리오 | 현 가능 | 가설 적용 후 |
|---|:---:|:---:|
| 같은 자료를 Blog + POP + QR에 동시 활용 | ⚠️ 가능하지만 추적 불가 | ✅ 추적 가능 |
| AI 결과를 다른 결과물에서 재사용 | ❌ | ✅ |
| 발행된 Blog 본문을 자료함에서 다시 편집 후 재발행 | ⚠️ duplication 발생 | ✅ single source |
| 매장 자산을 SNS에 자동 게시 | ❌ | ⚠️ SNS outlet entity 추가 필요 |
| 외부 LLM API로 콘텐츠 검수 후 재발행 | ❌ | ⚠️ approval workflow 추가 필요 |

---

## 7. 자료함 UI 영향

### 7.1 새로운 "출력물" 탭 가능성

| 자료함 페이지 | 현 라우트 | 표시 데이터 |
|---|---|---|
| StoreLibraryContentsPage | `/store/library/contents` | snapshot + kpa_store_contents (direct) |
| StoreLibraryResourcesPage | `/store/library/resources` | store_library_items |
| (제안) StoreLibraryOutputsPage | `/store/library/outputs` (가칭) | Blog asset / POP asset / AI asset 통합 view |

- 가설 구조에서는 Blog 본문/AI 본문이 `kpa_store_contents`에 저장되므로 기존 콘텐츠 탭에 자연 흡수
- 또는 `content_json.outputType` 필터로 별도 탭 분리 가능 (zero migration, UI만)

### 7.2 list / batch toolbar 재사용
자매 IR과 동일: ✅ 그대로 재사용 가능. wrapper layout만 추가하면 3번째 탭 진입.

---

## 8. 구조 판정 (A/B/C/D)

### 옵션 비교

| 옵션 | 설명 | 장점 | 단점 | 본 IR 권장 |
|---|---|---|---|:---:|
| **A. 현재 유지 (기능별 entity 분리)** | Blog/POP/QR/AI 각각 독립 본문 저장 | 단순, 변경 0 | duplication 지속, 멀티채널 재사용 불가, 추적성 부족 | ❌ |
| **B. 일부만 Store Asset 연결** | Blog body + AI body만 자료함 reference로 전환. POP/QR은 현 상태 유지(또는 별도 정책) | 가장 시급한 duplication 해소, 단계적 진입 가능, 비용 최소 | 도메인별 비대칭이 일부 잔존 | ★ **권장** |
| **C. Store Asset 중심 통합** | 모든 결과물이 자료함 reference만 보유, 본문은 자료함 단일 출처 | 완전한 single source of truth, 멀티채널 재사용, AI chain 가능 | 큰 마이그레이션, POP entity 신설 + 4개 entity 동시 변경 | △ **점진적 목표** |
| **D. 완전 CMS 재설계** | 단일 CMS로 모든 콘텐츠 통합 | 이론적 일관성 | 과도, 이미 분산된 forum-core / shared-space-ui / asset-copy-core / cms-core 패키지와 충돌, 동결 정책(§3) 위반 위험 | ❌ |

### 권장 진행 방향

**B → 점진적 C**:
1. Phase 1 (B 진입): Blog + ProductAi 본문 자료함 통합 + source_material_id 추가
2. Phase 2 (C 진입): POP entity 결정 (영속화 시) + QR polymorphic 확장 + AI backstore 흐름 + 자료함 출력물 탭
3. Phase 3 (C 완성): aiContext / chained reprocessing / 멀티채널 재배포 트리거

D는 의도적으로 회피. CLAUDE.md §3 Core 동결 정책과 §13 공통 구조 원칙을 모두 준수해야 함.

### O4O 철학 정합성

- ✅ §3 Core 동결 — `o4o_asset_snapshots` 자체는 변경 없음. 본 IR의 변경 후보는 모두 service-specific 또는 store-layer entity
- ✅ §7 Boundary Policy — `storeId + serviceKey` 복합 boundary 유지
- ✅ §13 공통 구조 원칙 — 자료함이 single source of truth가 되면 forum/lms/signage와 같은 공통 구조 카테고리 강화
- ✅ §11 Operator Dashboard 표준 — 관리/공개 분리 유지

---

## 9. 정책 결정 필요 항목

| # | 결정 | 옵션 |
|---|---|---|
| 1 | **canonical entity 선언** | (a) `kpa_store_contents` 재사용 — 권장 ★ / (b) 신규 `store_production_materials` |
| 2 | **Blog body 저장 방식** | (a) `body_asset_id` (B) — 자료함 reference만 / (b) (a) + `body_snapshot_id` (D) 발행 시점 고정 / (c) 현재 유지 |
| 3 | **POP entity 영속화** | (a) 휘발성 유지 / (b) `store_pop_outputs` 신설 |
| 4 | **QR source 일반화** | (a) `libraryItemId` 의미 확장(같은 컬럼 재정의) / (b) 신규 `source_material_id` polymorphic 컬럼 |
| 5 | **ProductAi source** | (a) `body_asset_id` 추가 + 기존 content는 cache로 / (b) 현재 유지 |
| 6 | **AI 결과 backstore** | (a) AI 호출 시 자동 backstore / (b) 사용자 액션 기반 backstore / (c) 미지원 |
| 7 | **자료함 출력물 탭** | (a) 별도 탭 / (b) 콘텐츠 탭 내 필터로 통합 |
| 8 | **lifecycle 통일** | (a) 도메인별 분산 유지 / (b) `kpa_store_contents`에 `material_status` 통합 |

---

## 10. 후속 WO 후보 (정책 결정 후)

| 우선순위 | WO 후보 | 작업 범위 | 의존 |
|:---:|---|---|---|
| **1** | **WO-O4O-STORE-EXECUTION-CONTENT-CANONICAL-DECLARATION-V1** | 본 IR 결론을 docs/architecture/STORE-LAYER-ARCHITECTURE.md에 반영. canonical entity 선언 (정책 1) | (정책 1) |
| **2** | **WO-O4O-KPA-BLOG-BODY-ASSET-REFERENCE-V1** | `store_blog_posts.body_asset_id` (+ optional `body_snapshot_id`) 추가 + 발행 흐름 변경 + 기존 content 마이그레이션 | (정책 1, 2) |
| **3** | **WO-O4O-RESULT-SOURCE-MATERIAL-REFERENCE-ALIGN-V1** | Blog/ProductAi에 `source_material_id` + `source_material_service` 추가 | (정책 1) |
| **4** | **WO-O4O-PRODUCT-AI-BODY-ASSET-V1** | `product_ai_contents.body_asset_id` 추가 + 자료함 흐름 연동 | (정책 5) |
| **5** | **WO-O4O-POP-OUTPUT-ENTITY-DECISION-V1** | POP 영속화 정책 IR + (영속화 시) `store_pop_outputs` entity 설계 | (정책 3) |
| **6** | **WO-O4O-QR-SOURCE-POLYMORPHIC-V1** | QR source polymorphic 확장 | (정책 4) |
| **7** | **WO-O4O-AI-BACKSTORE-FLOW-V1** | AI 결과 자료함 backstore + `ai_context` 컬럼 (jsonb) | (정책 6) |
| **8** | **WO-O4O-STORE-LIBRARY-OUTPUTS-TAB-V1** | 자료함 UI 출력물 탭/필터 + wrapper layout (자매 IR의 3번째 탭과 통합 가능) | (정책 7) |
| **9** | **WO-O4O-STORE-CONTENT-LIFECYCLE-UNIFY-V1** | lifecycle 통일 (선택) | (정책 8) |

---

## 11. 영향 범위 / 마이그레이션 비용 요약

| 변경 영역 | 비용 | 설명 |
|---|:---:|---|
| canonical 선언 (docs only) | 0 | 코드 변경 없음 |
| `kpa_store_contents.content_json` 키 추가 (jsonb) | 0 | migration 불필요, 운영 수준 스키마 |
| Blog `body_asset_id` 추가 + 마이그레이션 | 중 | migration 1회 + 기존 published 본문 자료함 backstore 스크립트 |
| Blog `body_snapshot_id` (선택) | 소 | migration 1회 (선택적) |
| ProductAi source_material_id | 소 | migration 1회 |
| QR polymorphic | 소~중 | migration 1회 + 기존 libraryItemId 재해석 정책 |
| POP entity 신설 (영속화 시) | 중~대 | 신규 entity + storage 정책 + 재발행 흐름 |
| AI backstore 흐름 | 중 | 신규 service 메서드 + UI 진입 |
| 자료함 출력물 탭 | 소 | UI wrapper + 라우트 1개 |
| lifecycle 통일 | 중 | 4개 entity 영향 |

---

## 12. 핵심 질문 답변 매트릭스

| 질문 | 답 |
|---|---|
| Q1. 매장 실행 결과물을 자료함 asset으로 통합 가능? | **부분 가능**. 입력측은 90% 작동, 출력측은 결과물별 비대칭 — Blog는 가장 시급(duplication), POP은 entity 부재, QR/AI는 컬럼 추가 필요 |
| Q2. 신규 entity 필요? | **필수 아님**. canonical entity = `kpa_store_contents` 재사용. POP 영속화 시만 신규 entity 검토 |
| Q3. Blog 본문 자료함 reference 가능? | ✅ 가능. body_asset_id 추가 + 발행 흐름 변경. 비용 중 |
| Q4. POP을 자료함 asset으로 저장 가능? | **정책 결정 필요**. 휘발성 유지 vs entity 신설 |
| Q5. QR 일반화 가능? | ✅ libraryItemId 의미 확장 또는 polymorphic 추가 |
| Q6. ProductAi 자료함 통합 가능? | ✅ body_asset_id 추가로 가능 |
| Q7. boundary 정책과 충돌? | ❌ 충돌 없음. "Community → Store 단방향"은 이미 강제, ownership=매장 유지 |
| Q8. 멀티채널 재배포 가능? | 현재 ⚠️ 추적 불가, 가설 적용 후 ✅ |
| Q9. AI 재가공 chain 가능? | 현재 ❌, AI backstore + ai_context 추가 시 ✅ |
| Q10. 자료함 UI에 출력물 탭 추가 가능? | ✅ 0 migration. 자매 IR의 3번째 탭과 통합 가능 |
| Q11. 권장 구조? | **B (일부만 통합) → 점진적 C (실행 콘텐츠 통합)**. D(완전 CMS)는 회피 |
| Q12. 가장 시급한 정비? | **Blog body의 자료함 reference 전환** — duplication 가장 큼, 실효성 가장 큼 |

---

## 부록 A. 핵심 파일 인벤토리

### Entity
- `o4o_asset_snapshots`: [packages/asset-copy-core/src/entities/asset-snapshot.entity.ts](packages/asset-copy-core/src/entities/asset-snapshot.entity.ts)
- `kpa_store_contents`: [apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts)
- `store_library_items`: [apps/api-server/src/routes/platform/entities/store-library-item.entity.ts](apps/api-server/src/routes/platform/entities/store-library-item.entity.ts)
- `store_execution_assets`: [apps/api-server/src/routes/platform/entities/store-execution-asset.entity.ts](apps/api-server/src/routes/platform/entities/store-execution-asset.entity.ts)
- `store_qr_codes`: [apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts](apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts)
- `store_blog_posts` / `staff_blog_posts`: [apps/api-server/src/routes/glycopharm/entities/store-blog-post.entity.ts](apps/api-server/src/routes/glycopharm/entities/store-blog-post.entity.ts)
- `store_blog_settings`: [apps/api-server/src/routes/glycopharm/entities/store-blog-settings.entity.ts](apps/api-server/src/routes/glycopharm/entities/store-blog-settings.entity.ts)
- `product_ai_contents`: [apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts](apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts)
- `kpa_store_asset_controls`: 자매 IR 참조

### Controllers
- [apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts](apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts)
- [apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts)
- [apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts)
- [apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts)
- [apps/api-server/src/routes/o4o-store/controllers/store-library.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-library.controller.ts)
- [apps/api-server/src/modules/store-ai/controllers/product-ai-content.controller.ts](apps/api-server/src/modules/store-ai/controllers/product-ai-content.controller.ts)
- [apps/api-server/src/routes/ai-proxy.routes.ts](apps/api-server/src/routes/ai-proxy.routes.ts) — `/api/ai/content`

### Frontend (KPA)
- [services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx)
- [services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx)
- [services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx)
- [services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx](services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx)
- [services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx)
- [services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx)
- [services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx)
- [services/web-kpa-society/src/api/storeBlog*.ts](services/web-kpa-society/src/api/)
- [services/web-kpa-society/src/api/productAiContent.ts](services/web-kpa-society/src/api/productAiContent.ts)

### 정책 / Architecture
- [docs/baseline/PLATFORM-CONTENT-POLICY-V1.md](docs/baseline/PLATFORM-CONTENT-POLICY-V1.md)
- [docs/baseline/CONTENT-STABLE-DECLARATION-V1.md](docs/baseline/CONTENT-STABLE-DECLARATION-V1.md)
- [docs/architecture/O4O-BOUNDARY-POLICY-V1.md](docs/architecture/O4O-BOUNDARY-POLICY-V1.md)
- [docs/architecture/STORE-LAYER-ARCHITECTURE.md](docs/architecture/STORE-LAYER-ARCHITECTURE.md)
- [docs/baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md](docs/baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md)

### 자매 IR
- [docs/investigations/IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1.md](IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1.md) — 입력측 capability
- [docs/investigations/IR-O4O-STORE-LIBRARY-CANONICAL-ASSET-FLOW-V1.md](IR-O4O-STORE-LIBRARY-CANONICAL-ASSET-FLOW-V1.md) — 자료함 흐름
- [docs/investigations/IR-O4O-COMMUNITY-TO-STORE-COPY-FLOW-AUDIT-V1.md](IR-O4O-COMMUNITY-TO-STORE-COPY-FLOW-AUDIT-V1.md) — community→store copy 정책
- [docs/investigations/IR-O4O-KPA-STORE-BLOG-SITE-ARCHITECTURE-V1.md](IR-O4O-KPA-STORE-BLOG-SITE-ARCHITECTURE-V1.md) — Blog 아키텍처

---

*IR-O4O-STORE-EXECUTION-CONTENT-ASSET-POLICY-V1*
*Updated: 2026-05-09*
*Status: Investigation Complete — 정책 결정 + 후속 WO 분기 대기 (변경 없음)*
