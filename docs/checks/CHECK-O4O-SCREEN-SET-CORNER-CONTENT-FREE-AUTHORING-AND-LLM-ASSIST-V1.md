# CHECK-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1

**WO**: WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1
**작업 일자**: 2026-08-03
**작업 기준 HEAD**: `05cb4d14b` (다른 세션 WIP(`apps/api-server/src/scripts/hff-zh-*`)와 경로 미충돌 — 병렬 작업 승인 범위)
**상태**: 구현 완료 · typecheck PASS · 브라우저 스모크 보류(사유 §5)

---

## 1. 사용한 기존 구조

| 항목 | 사용한 기존 구조 | 비고 |
|------|-----------------|------|
| 코너 콘텐츠 정본 | `store_tablet_screen_sets` + `store_tablet_screen_blocks` | 신규 테이블·migration 없음 (§7) |
| 상품 표시 | 기존 `product_list` block | 신규 block type 없음 |
| 상품 선택 저장소 | `product_list` block 의 `config` (jsonb, free-form) | 서버 스키마 변경 불필요 |
| 상품 식별자 | supplier = `organization_product_listings.id` / local = `store_local_products.id` | 기존 상품 풀 API 와 동일 키 |
| 편집기 | `@o4o/content-editor` `RichTextEditor` (기존 sanitize 그대로) | sanitize 완화 없음 (§5-D) |
| 이미지 업로드 | 기존 `mediaApi.upload()` + 공용 `MediaPickerModal` | 신규 저장소 없음 |
| 상품 풀 조회 | `GET /tablets/:id/product-pool` 과 **동일 SQL·동일 응답 shape** | 태블릿 비의존 경로로 재노출 |

---

## 2. 변경 내용

### 2-1. `packages/screen-content-core/src/index.ts` (계약)

`product_list` config 의 **명시 선택** 계약을 additive 로 추가.

```ts
export type SelectedProductRef = { productType: 'supplier' | 'local'; productId: string };
productRefKey(ref)                      // 중복 제거 키
selectedProductsOf(config)              // config.source === 'selected_products' 일 때만 목록 반환
hasSelectedProducts(config)
withSelectedProducts(config, products)  // 빈 목록 → { source: 'legacy_tablet_displays' } 로 복귀
```

- 기존 `{ source: 'legacy_tablet_displays' }` 는 **미파괴**. 선택을 모두 비우면 자동으로 legacy 로 돌아간다.

### 2-2. `packages/content-editor` (공용 LLM 작업 보조)

- 신규 `src/components/LlmAssistPanel.tsx` — **클립보드 전용**.
  - 현재 내용 복사 / 참고자료·작업 안내 복사 / 결과 HTML 붙여넣기(적용) / HTML 오류 수정 요청문 복사
  - 기본 버튼 라벨 `LLM으로 작업하기`. 모델·서비스 지정 없음.
  - **LLM API 호출 없음 / 계정 연동 없음 / 프롬프트·대화 저장 없음** (§7 준수)
- `src/components/index.ts`, `src/index.ts` 에서 export.

### 2-3. `packages/tablet-screen-set-editor/src/index.tsx` (자유 편집 구조)

- **단계형 제작 흐름 제거** — `BuilderStepKind` / `BuilderStepMeta` / `BUILDER_STEPS` / `step` state / 단계 인디케이터 `<ol>` / 이전·다음 버튼 삭제.
- 좌측이 스택형 `EditorSection` 목록으로 재구성: **코너 내용 / 상품 / 추가 정보 / 대기 화면 / 화면 배치 / 저장**.
  - 각 섹션은 언제든 독립적으로 편집 가능. **상품이 없어도 생성·저장 가능**.
  - 헤더에 **항상 활성인 저장 버튼**.
  - 내부 용어 `block` 은 사용자 화면에 노출하지 않음. 드래그형 페이지 빌더 도입 없음.
- **상품 영역**: 신규 `ProductSelectEditor` — 취급 상품/매장 상품 탭 + 이름 검색 + 다중 선택, 선택 목록의 위로/아래로/제외.
  - `fetchProductPool` prop **미주입 시 상품 영역 자체를 노출하지 않는다** (운영자·공급자 제작기 = 기존 동작 그대로).
- **코너 내용**: 기존 고정 프롬프트(`CORNER_DESC_PROMPT`)의 "3~5문장" 등 분량·구조 강제를 제거하고 자유 구성 슬롯으로 완화. 허용 태그에 `table`, `img` 추가.
  - 복사 버튼 2개 + ChatGPT 안내 모달 → 공용 `LlmAssistPanel` 로 대체.
  - `RichTextEditor` 에 `onImageUpload` / `onMediaLibraryPick` 연결, `minHeight="320px"`.
- **언어**: `language: 'ko'` 하드코딩 제거. 콘텐츠 선택 모달에서 해당 자료가 가진 언어 중 선택(기본 `ko`). 자동 번역·다국어 자동 생성 없음.

### 2-4. Backend

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/platform/store-tablet.routes.ts` | **신규** `GET /product-pool` (조직 스코프, `withStoreAuth`). 기존 `/tablets/:id/product-pool` 과 동일 SQL·shape. `/screen-sets/:id` 라우트 shadowing 회피를 위해 top-level 등록. |
| `store-public/store-public-utils.ts` | `queryTabletVisibleProducts` data SELECT 에 `opl.id AS "listingId"` 추가(선택 대조용 키). |
| `store-public/store-public-screen-set-resolve.ts` | `product_list` 처리에 선택 분기 추가: `parseSelectedProducts()` → 공급자 상품은 **기존 노출 게이트 통과분과 교집합**, 매장 상품은 `organization_id + is_active` 로 조회. 선택 순서 유지. `selectionMode: 'selected'` 를 응답에 포함. legacy 경로는 그대로. |

- api-server 는 `@o4o/screen-content-core` 를 의존하지 않으므로 파싱 계약을 서버 측에 **미러링**(기존 `parseContentListConfig` 와 동일 정책).

### 2-5. `packages/tablet-kiosk-core/src/TabletKioskPage.tsx`

- `selectionMode === 'selected'` 인 경우 `fetchProducts` 를 호출하지 않고 **resolve 응답의 상품을 그대로 사용**.
- `mapSectionProduct()` 추가(local/supplier 공통 매핑).
- screen fetch 블록을 상품 로드 effect **위로 이동**(React TDZ 회피 — 로직 보존).

### 2-6. 소비처 주입 (3곳)

| 소비처 | `fetchProductPool` | 미디어 props |
|--------|:---:|:---:|
| `services/web-kpa-society/.../pharmacy/TabletScreenSetManager.tsx` (매장) | ✅ `fetchStoreProductPool` | ✅ |
| `services/web-kpa-society/.../operator/tablet/OperatorTabletScreenSetsPage.tsx` | ❌ (매장 상품 문맥 없음 → 상품 영역 비노출) | ✅ |
| `services/web-neture/.../supplier/SupplierTabletScreenSetsPage.tsx` | ❌ (동일) | ✅ |

---

## 3. 호환성

- 기존 Screen Set(선택 config 없음)은 `selectedProductsOf()` 가 `[]` 를 반환 → **legacy 상품 목록 동작 그대로**.
- `{ source: 'legacy_tablet_displays' }` 계약 미파괴. 선택 전부 해제 시 legacy 로 자동 복귀.
- 저장 payload·5섹션 계약·template_key·QR·공개 slug 로직 **무변경**.
- 운영자·공급자 제작기는 상품 영역이 노출되지 않으므로 구조적 변화 없음(편집기 미디어 버튼만 추가).
- **알려진 동작(설계상 유지)**
  1. 선택한 공급자 상품이라도 TABLET 채널 미승인·공급자 비활성이면 기존 노출 게이트에서 걸러진다. 선택은 *무엇을 보여줄지*를 정하고, *보여줘도 되는지*는 기존 게이트가 정한다.
  2. `POST /screen-sets/preview` 는 여전히 `product_list` 를 skip 하므로, 제작기 우측 실시간 미리보기에는 선택 상품이 렌더되지 않는다(기존과 동일). 실제 코너 화면(resolve)에서는 정상 반영된다.

---

## 4. DB · API 변경

- **DB 변경 없음.** 신규 테이블 없음 / migration 없음 / 컬럼 추가 없음. 상품 선택은 기존 `product_list` block 의 free-form jsonb config 에 저장.
- **API 변경**: `GET /api/v1/store/product-pool` 1개 추가(조직 스코프 read-only, 기존 태블릿 상품 풀과 동일 shape). 기존 엔드포인트 시그니처 변경 없음.
- 공개 resolve 응답의 `product_list` 섹션에 `selectionMode`, `localProductsEndpoint` 필드 additive 추가.

---

## 5. 검증 결과

### typecheck

| 대상 | 결과 |
|------|------|
| `pnpm --filter @o4o/content-editor typecheck` | ✅ PASS |
| `services/web-kpa-society` `tsc --noEmit` | ✅ PASS (0 error) |
| `services/web-neture` `tsc --noEmit` | ✅ PASS (0 error) |
| `apps/api-server` `tsc --noEmit` | ✅ 본 변경 범위 0 error (`src/scripts/*` 의 기존 오류만 잔존 — 다른 세션 WIP·build tsconfig 제외 대상) |

- `@o4o/screen-content-core`, `@o4o/tablet-screen-set-editor`, `@o4o/tablet-kiosk-core` 는 **source-only 패키지**로 `typecheck` 스크립트가 없다(`main`/`types` 가 `src/` 를 가리킴). 소비 앱 typecheck 로 커버됨을 확인.
- `@o4o/content-editor` 는 dist 소비 패키지이므로 `LlmAssistPanel` export 반영을 위해 `pnpm --filter @o4o/content-editor build` 수행(신규 export 미빌드 시 소비 앱 TS2305 발생 → 재빌드로 해소).

### 브라우저 스모크 — **보류**

보류 사유(정확히 기록): 본 세션은 사용자 승인에 따라 `git checkout` / `git pull` / `pnpm install` 없이 현재 HEAD 에서 **경로 분리 병렬 작업**으로 진행되었다. 동일 워크트리에서 다른 세션의 WIP(`apps/api-server/src/scripts/hff-zh-*`)가 진행 중이므로 dev 서버 기동·배포를 수행하지 않았다. 정적 검증(typecheck 4종 + 계약 대조)으로 대체했다.

### §10 기능 시나리오 정적 검증

| # | 시나리오 | 결과 |
|:-:|---------|------|
| 1 | 상품 없이 코너 콘텐츠 생성·저장 | ✅ 저장 버튼 상시 활성, 상품 미선택 시 legacy config 유지 |
| 2 | 저장 후 상품 추가 | ✅ `ProductSelectEditor` → `withSelectedProducts` |
| 3 | 상품 추가 후 제거 → 전부 제거 | ✅ 빈 목록 → legacy 복귀 |
| 4 | 코너 내용만 편집 | ✅ 섹션 독립 |
| 5 | 단계 강제 없음 | ✅ step state·인디케이터·이전/다음 제거 |
| 6 | 이미지 업로드 | ✅ `onImageUpload` → `mediaApi.upload` |
| 7 | 미디어 라이브러리 삽입 | ✅ `onMediaLibraryPick` → `MediaPickerModal` |
| 8 | LLM 보조 — 현재 내용 복사 | ✅ 클립보드 |
| 9 | LLM 보조 — 결과 HTML 적용 | ✅ `onApplyHtml` → `corner_description.body` |
| 10 | 언어 선택 | ✅ 자료 보유 언어 중 선택, 기본 ko |
| 11 | 기존 세트 열기(회귀) | ✅ 선택 config 부재 → legacy 경로 |
| 12 | 운영자·공급자 제작기 | ✅ 상품 영역 비노출, 나머지 동작 동일 |

---

## 6. 후속 작업

1. **코너 QR 표시 / 제품별 QR** — 본 WO 범위 외(§2-⑫). 별도 WO 필요.
2. **제작기 미리보기의 상품 렌더** — `POST /screen-sets/preview` 가 `product_list` 를 skip 하는 기존 제약. 선택 상품 미리보기가 필요하면 preview resolver 확장 WO.
3. **브라우저 스모크** — 워크트리 단독 점유 가능한 시점에 매장/운영자/공급자 3경로 실브라우저 확인.
4. 태블릿 실제 코너에서의 선택 상품 노출 게이트 상호작용(§3 알려진 동작 1) 사용자 안내 문구 필요 여부 검토.
