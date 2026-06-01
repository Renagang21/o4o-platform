# IR-O4O-KPA-STORE-PRODUCTION-AI-EDITOR-REUSE-V1

> 커뮤니티 강좌·콘텐츠에서 이미 구현된 AI 편집 기능을 조사하고,
> 이를 **내 자료함 > 매장 제작 자료** 의 POP / QR / 블로그 / 상품 상세설명 제작 흐름에
> 재사용할 수 있는지를 검토하는 조사 보고서 (코드 변경 없음).

| 항목 | 값 |
|------|------|
| 작성일 | 2026-05-11 |
| 선행 IR | `IR-O4O-STORE-PRODUCTION-ASSET-RESTRUCTURE-V1.md` |
| 대상 서비스 | KPA-Society + (검증 참조) GlycoPharm |
| 핵심 컴포넌트 | `packages/content-editor/src/components/AiContentModal.tsx` |
| 백엔드 라우트 | `apps/api-server/src/routes/ai-proxy.routes.ts` |
| AI 프롬프트 카탈로그 | `apps/api-server/src/services/ai-prompts/index.ts` |
| 영향 범위 | 매장 제작 자료 (POP / QR / 블로그 / 상품 상세설명) UX 통합 |
| 디지털사이니지 | **조사 범위 외 (격리 유지)** |
| 사전 동기화 | `git pull origin main` 완료, working tree clean |

---

## 1. 결론 (요약 먼저)

1. **AI 편집 기능은 이미 canonical 재사용 가능 컴포넌트**로 존재한다 — [packages/content-editor/src/components/AiContentModal.tsx](packages/content-editor/src/components/AiContentModal.tsx). 현재 콘텐츠/포럼/자료/LMS 강좌/블로그 5+ 페이지에서 동일 컴포넌트가 재사용되고 있다.
2. **백엔드 AI 프롬프트 카탈로그는 7개 outputType을 이미 지원**한다 — `product_detail`, `blog`, `pop`, `summary`, `title_suggest`, `store_qr`, `store_sns`. 그러나 **프론트 모달은 4개만 노출**한다 (`customer_rewrite=product_detail`, `summary`, `pop`, `title_suggest`).
   - → **`blog`, `store_qr`, `store_sns` 는 백엔드 준비 완료, 프론트만 풀어주면 즉시 사용 가능.**
3. 매장 제작 자료의 4유형(POP/QR/블로그/상품 상세설명) 중:
   - **블로그**: 이미 `AiContentModal` 사용 중 → 그대로 통합 가능.
   - **상품 상세설명 / POP**: `productAiContent` (별도 async fire-and-forget API, productId FK 필수) 사용 중 → 통합 시 **이중 트랙** 발생.
   - **QR**: AI 편집 미통합 → 백엔드(`store_qr` 프롬프트)는 있으나 프론트에서 사용되지 않음.
4. 따라서 "매장 제작 자료" 의 진입점인 **유형 선택 모달 → 제작 화면** 흐름은 **단일 `AiContentModal` 위에서 4유형을 모두 처리**할 수 있다 (조건부 분기).
5. `productAiContent` 의 async 트랙은 **productId 가 있을 때만** 사용되는 보조 트랙이므로 즉시 제거할 필요는 없다. 매장 제작 자료의 일차 진입은 `AiContentModal` 동기 트랙을 채택하고, productId 가 있을 때만 결과를 추가로 `productAiContent` 에 동기화한다.
6. **새 AI 편집기를 만들 필요 없다.** 모달의 `outputType` 노출 카탈로그를 확장하고 저장 destination 을 추가하는 정도의 **선택적 확장**으로 충분하다.

---

## 2. AI 편집 기능 위치 조사

### 2-1. 프론트엔드 — Canonical 컴포넌트

| 컴포넌트 | 위치 | 역할 |
|---------|------|------|
| **AiContentModal** | [packages/content-editor/src/components/AiContentModal.tsx](packages/content-editor/src/components/AiContentModal.tsx) | AI 콘텐츠 변환 모달 (text/url 입력 → HTML 결과). **단일 SSOT.** |
| **RichTextEditor** | [packages/content-editor/src/components/RichTextEditor.tsx](packages/content-editor/src/components/RichTextEditor.tsx) | TipTap 기반 본문 편집기. Toolbar 의 AI 버튼이 내부에서 `AiContentModal` 호출. |
| **Toolbar** | [packages/content-editor/src/components/Toolbar.tsx](packages/content-editor/src/components/Toolbar.tsx) | RichTextEditor 의 툴바 — `aiRequestHeaders` / `showCommunitySave` / `showStoreSave` 를 모달로 propagate. |
| **공개 export** | [packages/content-editor/src/index.ts](packages/content-editor/src/index.ts) | `AiContentModal` 외부 export 완료 — 외부 페이지에서 직접 mount 가능. |

### 2-2. AiContentModal Props (확장 포인트)

`AiContentModalProps` (AiContentModal.tsx:39-96):

| Prop | 타입 | 용도 |
|------|------|------|
| `open` / `onClose` | `boolean` / `()=>void` | 모달 가시성 |
| `editor` | `Editor \| null` | TipTap Editor 인스턴스. `null` 이면 form state 직접 사용 (`onInsert`) |
| `onInsert` | `(data: {html,title,sourceUrl?})=>void` | 결과를 외부 state 로 전달 (editor=null 케이스) |
| `aiRequestHeaders` | `Record<string,string>` | `Authorization: Bearer` 등 명시 주입 (쿠키 인증 fallback 외) |
| `onChannelSave` | `(data)=>Promise<{success,fieldLabel?,error?}>` | "채널에 저장" 버튼 — productAiContent 등 채널형 저장 |
| `showCommunitySave` | `boolean` | "커뮤니티 저장" 버튼 노출 → `/api/v1/forum/posts` 직접 호출 |
| `showStoreSave` | `boolean` | "내 매장 저장" 버튼 노출 → `/api/v1/kpa/store-contents` 직접 호출 |
| `headerLabel` | `string` | 모달 헤더 라벨 override (예: "AI 레슨 초안 만들기") |
| `urlPlaceholder` | `string` | URL 입력란 placeholder override |
| `initialSourceTab` | `'text' \| 'url'` | 첫 진입 시 활성 탭 (LMS 는 `url` 로 시작) |

→ **이 props 만으로 매장 제작 자료의 4유형을 분기 처리할 수 있다.** 별도 컴포넌트 분기 불필요.

### 2-3. 현재 사용처 (재사용 검증된 5+ 페이지)

| 페이지 | 위치 | 활용 패턴 |
|--------|------|----------|
| Content 작성 | [services/web-kpa-society/src/pages/contents/ContentWritePage.tsx](services/web-kpa-society/src/pages/contents/ContentWritePage.tsx) | `RichTextEditor` 내장 + 별도 모달. `showCommunitySave=true`, `showStoreSave=true` |
| Resource 작성 | [services/web-kpa-society/src/pages/resources/ResourceWritePage.tsx](services/web-kpa-society/src/pages/resources/ResourceWritePage.tsx) | `editor=null`, `onInsert` 로 form state 갱신 |
| Forum 작성 | [services/web-kpa-society/src/pages/forum/ForumWritePage.tsx](services/web-kpa-society/src/pages/forum/ForumWritePage.tsx) | `RichTextEditor` 툴바 내장 모달. `showStoreSave` 가 `kpa:store_owner` role 에만 활성 |
| **LMS 강좌/레슨** | [services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx) | `showCommunitySave=true`, `headerLabel="AI 레슨 초안 만들기"`, `initialSourceTab='url'`, YouTube URL placeholder |
| **약국 블로그** | [services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx) | `headerLabel="AI 칼럼 보조"`, `urlPlaceholder="...article 또는 YouTube..."` |
| (참조) GlycoPharm 블로그 | [services/web-glycopharm/src/pages/store-management/PharmacyBlogPage.tsx](services/web-glycopharm/src/pages/store-management/PharmacyBlogPage.tsx) | 동일 패턴 — canonical 검증됨 |

> **즉, 매장 제작 자료에서 4유형을 통합한다 해도, 이 컴포넌트의 5번째 사용처가 하나 더 늘어나는 것일 뿐이다.**

### 2-4. 백엔드 라우트

[apps/api-server/src/routes/ai-proxy.routes.ts](apps/api-server/src/routes/ai-proxy.routes.ts) — 인증된 사용자 전용:

| 엔드포인트 | 메서드 | 용도 | 모달 사용 여부 |
|-----------|--------|------|---------------|
| `/api/ai/generate` | POST | Raw provider proxy (systemPrompt + userPrompt) | ❌ (admin 용) |
| `/api/ai/content` | POST | outputType 기반 텍스트 변환 | ✅ (text 모드) |
| `/api/ai/url-to-blocks` | POST | URL/YouTube → Block[] 변환 | ✅ (url 모드) |
| `/api/ai/vision/analyze` | POST | Vision AI (이미지 분석) | ❌ (별도 흐름) |

→ 모달은 `/api/ai/content` + `/api/ai/url-to-blocks` 2개 라우트만 사용. 두 라우트 모두 `authenticate` 미들웨어 통과 필수.

### 2-5. AI 프롬프트 카탈로그 (백엔드)

[apps/api-server/src/services/ai-prompts/index.ts](apps/api-server/src/services/ai-prompts/index.ts):

```ts
export type OutputType =
  | 'product_detail'   // 상품 상세설명
  | 'blog'             // 블로그 칼럼
  | 'pop'              // POP 문구
  | 'summary'          // 요약
  | 'title_suggest'    // 제목 추천
  | 'store_qr'         // QR 랜딩 텍스트
  | 'store_sns';       // SNS 게시물
```

**모달에 노출된 모드 (AiContentModal.tsx:114-119):**

```ts
{ key: 'customer_rewrite', outputType: 'product_detail', label: '고객용 정리' }
{ key: 'summary',          outputType: 'summary',        label: '짧게 요약'  }
{ key: 'pop',              outputType: 'pop',            label: 'POP용 정리' }
{ key: 'title_suggest',    outputType: 'title_suggest',  label: '제목 추천'  }
```

→ **격차**: `blog`, `store_qr`, `store_sns` 3개 outputType 은 백엔드 완비, 프론트 노출만 누락. 매장 제작 자료 통합 시 모달의 `MODE_CONFIG` 에 카드 3개만 추가하면 바로 사용 가능.

### 2-6. 별도 AI 트랙 — Product-bound async

[services/web-kpa-society/src/api/productAiContent.ts](services/web-kpa-society/src/api/productAiContent.ts):

| 항목 | 값 |
|------|------|
| 라우트 | `/api/v1/products/:productId/ai-contents` |
| contentType | `product_description` / `pop_short` / `pop_long` / `qr_description` / `signage_text` |
| 동작 | `generateProductAiContent()` 호출 → 서버가 비동기 생성 → 후속 `getProductAiContents()` polling |
| 진입 조건 | **productId FK 필수** (로컬 상품 또는 마스터 상품) |
| 백엔드 | [apps/api-server/src/modules/store-ai/services/product-ai-content.service.ts](apps/api-server/src/modules/store-ai/services/product-ai-content.service.ts) |

→ **`AiContentModal` 트랙과 완전히 별개 시스템.** 동기 vs 비동기, 자유 입력 vs 상품 FK 라는 결정적 차이가 있어 직접 통합은 불가. 단, 결과 저장 destination 으로는 양립 가능.

---

## 3. 매장 제작 4유형별 현재 AI 통합 상태

| 유형 | 페이지 | 현재 AI 통합 | 통합 트랙 |
|------|--------|--------------|-----------|
| **POP** | [services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx) + [ProductPopBuilderPage.tsx](services/web-kpa-society/src/pages/pharmacy/ProductPopBuilderPage.tsx) | **있음** — `productAiContent` (productId 필수) | Product-bound async |
| **QR** | [services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx) | **없음** | (백엔드는 `store_qr` 프롬프트 + `qr_description` contentType 둘 다 보유) |
| **블로그** | [services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx) | **있음** — `AiContentModal` (editor=null + onInsert) | Editor-based sync |
| **상품 상세설명** | [services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx) | **있음** — `productAiContent.generateProductAiContent(_, 'product_description')` | Product-bound async |

### 3-1. POP 트랙 분석

[ProductPopBuilderPage.tsx:73-132](services/web-kpa-society/src/pages/pharmacy/ProductPopBuilderPage.tsx#L73) — `useEffect` 안에서:

1. `getProductAiContents(productId)` 로 기존 AI 결과 조회
2. `pop_short`, `pop_long`, `product_description` 우선순위로 prefill
3. 부재 시 fallback (asset description → product name)
4. 사용자 편집 → `saveProductAiContent('pop_short' / 'pop_long', ...)` 로 upsert
5. PDF 생성: `GET /api/v1/products/:productId/pop/:layout` (별도 트랙)

→ **strong assumption: productId 존재**. productId 없는 매장 제작 자료(예: 매장 일반 캠페인용 POP)는 이 트랙으로 만들 수 없다.

### 3-2. QR 트랙 분석

[StoreQRPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx):
- `StoreAssetSelectorModal` 로 자료 선택 → slug + landingType 결정 → `createStoreQrCode()` 로 저장
- **AI 편집 단계 없음**. `qr_description` contentType 은 백엔드에 존재하지만 프론트에서 호출하지 않음.
- 백엔드의 `store_qr` 프롬프트 ([apps/api-server/src/services/ai-prompts/storeQr.ts](apps/api-server/src/services/ai-prompts/storeQr.ts)) 도 unused.

→ **AI 통합 신규 진입 지점.** 매장 제작 자료 통합 시 QR 결과물의 랜딩 텍스트/설명을 `AiContentModal(outputType='store_qr')` 로 보조할 수 있다.

### 3-3. 블로그 트랙 분석

[PharmacyBlogPage.tsx:441-455](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx#L441):
- `AiContentModal` 직접 mount (editor=null + onInsert + Bearer 토큰)
- 결과 HTML → `setBody(html)` 로 RichTextEditor 에 주입
- 저장은 별도 blog 도메인 API
- → **이미 완벽한 통합.** 매장 제작 자료 통합 시 그대로 옮기면 됨.

### 3-4. 상품 상세설명 트랙 분석

[StoreProductDescriptionsPage.tsx:114-115](services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx#L114):
- "AI 재생성" 버튼 → `generateProductAiContent(productId, 'product_description')` 호출 (fire-and-forget)
- 일정 시간 후 `getProductAiContents()` 로 polling/refresh
- 사용자 편집 → `saveProductAiContent()` 로 upsert
- → **POP 와 동일한 product-bound async 트랙.** 매장 제작 자료 통합 시 productId 가 있는 경로에 한해 유지.

---

## 4. 재사용 가능 영역

### 4-1. 100% 재사용 — 코드 변경 없음

| 컴포넌트/API | 재사용 형태 |
|-------------|------------|
| `AiContentModal` 컴포넌트 | `<AiContentModal open onClose editor={null} onInsert={...} aiRequestHeaders={...} />` 로 직접 mount |
| `RichTextEditor` 컴포넌트 | 결과 HTML 미리보기/편집기. `value` prop sync 로 결과 주입 |
| `/api/ai/content` 엔드포인트 | 4유형 모두 동일하게 사용 (outputType 만 다름) |
| `/api/ai/url-to-blocks` 엔드포인트 | URL/YouTube 소스 자료 변환 — 4유형 공통 |
| `getAccessToken()` 헤더 주입 | KPA-society 표준 패턴 |
| `htmlToForumBlocks()` 변환 | "내 매장 저장" / "커뮤니티 저장" 시 백엔드 호환 변환 |
| `blocksToHtml()` 변환 | URL 결과를 RichTextEditor 에 주입 |
| TipTap YouTube embed 우회 (`setYoutubeVideo` command) | 유튜브 자료 변환 시 자동 처리됨 |

### 4-2. 부분 재사용 — 소폭 확장 필요

| 항목 | 변경 범위 |
|------|----------|
| `AiContentModal.MODE_CONFIG` | 카드 3개 추가: `blog`, `store_qr`, `store_sns` (백엔드 이미 보유) |
| `aiRequestHeaders` 정책 | `kpa:store_owner` 권한 검증 — `showStoreSave` 와 동일한 boolean 패턴 추가 |
| `urlPlaceholder` / `headerLabel` | 4유형별 라벨 정의 (POP/QR/블로그/상품 상세설명) |
| `onInsert` payload | sourceUrl + storeAssetId 추가 (제작 자료가 어느 원본 자료에서 왔는지 추적) |

### 4-3. 신규 추가 필요

| 항목 | 위치 | 비고 |
|------|------|------|
| 매장 제작 자료 저장 destination | `showProductionMaterialSave` prop + `/api/v1/kpa/store/assets` POST 호출 | `assetType=content`, `category` / `usageType` 자동 설정 |
| 유형 선택 모달 (4 카드) | 매장 제작 자료 페이지 진입점 | 모달 자체는 별도, 카드 선택 후 `AiContentModal` 로 dispatch |
| outputType ↔ usageType 매핑 | `pop→pop`, `store_qr→qr`, `blog→banner/notice`, `product_detail→(productId 필수 분기)` | `store_execution_assets.usageType` 컬럼 enum 확인 필요 |

---

## 5. 매장 제작 자료 적용 가능성 (4유형 매트릭스)

| 유형 | AiContentModal 적용 | outputType | productId 필요? | 저장 destination | 코드 변경 규모 |
|------|---------------------|-----------|----------------|-----------------|----------------|
| POP (매장 일반) | ✅ 가능 | `pop` (이미 노출) | **불필요** (매장 캠페인용) | `store_execution_assets`(`usageType=pop`) | 소 — destination 추가만 |
| POP (상품 연결) | ⚠️ 분기 | `pop` 또는 `product_detail` | **필요** | `product_ai_contents`(`pop_short/pop_long`) | 중 — 트랙 분기 |
| QR 랜딩 텍스트 | ✅ 가능 | `store_qr` (백엔드 OK, 모달 추가) | 선택 | `store_qr_codes` + `store_execution_assets`(`usageType=qr`) | 소 — MODE_CONFIG 추가 |
| 블로그 | ✅ 가능 | `blog` (백엔드 OK, 모달 추가) | 불필요 | `storeBlog` 도메인 | 소 — MODE_CONFIG 추가 |
| 상품 상세설명 | ⚠️ 분기 | `product_detail` (이미 `customer_rewrite`) | **필요** | `product_ai_contents`(`product_description`) | 중 — productId 분기 |

### 5-1. 두 가지 진입 경로 권장

매장 제작 자료 만들기 모달 → 유형 선택 → **두 갈래로 라우팅**:

```text
유형 선택 (POP / QR / 블로그 / 상품 상세설명)
   │
   ├─ productId 가 있는 경우 (상품 컨텍스트 진입)
   │     → productAiContent 트랙 (기존 ProductPopBuilderPage, StoreProductDescriptionsPage 흐름)
   │     → async fire-and-forget, productId FK 저장
   │
   └─ productId 가 없는 경우 (매장 일반 캠페인)
         → AiContentModal 트랙 (text/url 자유 입력)
         → 결과 HTML → store_execution_assets 로 저장 (showProductionMaterialSave)
```

**근거**: productId 존재 여부는 매장 제작 자료의 의미를 가르는 결정적 boundary. productAiContent 의 fire-and-forget polling 패턴은 productId 가 있을 때만 의미가 있다.

---

## 6. API 재사용 가능성 조사

### 6-1. 인증 헤더 처리

- `AiContentModal` 은 두 가지 인증 채널 모두 지원:
  1. `credentials: 'include'` → 쿠키 fallback
  2. `aiRequestHeaders` prop → `Authorization: Bearer <token>` 명시 주입
- KPA-society 표준: [services/web-kpa-society/src/contexts/AuthContext.tsx](services/web-kpa-society/src/contexts/AuthContext.tsx) `getAccessToken()` 호출 → Bearer 토큰
- 현재 LMS CourseEditPage 가 `aiRequestHeaders={Bearer}` 미주입 시 `/api/ai/url-to-blocks` 401 발생한 이력 (WO-O4O-AI-LESSON-FLOW-FIX-V1 코멘트). 매장 제작 자료에서도 동일하게 명시 주입 필수.

### 6-2. Gemini quota / retry 영향

- 백엔드 [aiProxyService](apps/api-server/src/services/ai-proxy.service.ts) 가 단일 게이트웨이로 통제
- 모델: `gemini-2.5-flash` (단일 모델, [ai-proxy.routes.ts:230](apps/api-server/src/routes/ai-proxy.routes.ts#L230))
- Rate limit 응답: `429 RATE_LIMIT_ERROR` — 모달에서 사용자에게 에러로 표시
- → **매장 제작 자료 통합으로 인한 호출 증가가 quota 한도 영향**. AI 사용 흐름 baseline ([docs/baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md](docs/baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md)) 와 교차 검증 필요.

### 6-3. 백엔드 변경 영향도

| 영역 | 변경 필요성 | 비고 |
|------|------------|------|
| `/api/ai/content` | **불필요** | 4 outputType 모두 처리 가능 |
| `/api/ai/url-to-blocks` | **불필요** | URL 입력은 outputType 무관 |
| `store_execution_assets` 테이블 | **불필요** | 이미 `assetType=content` + `usageType` 분기 |
| `product_ai_contents` 테이블 | **불필요** | productId 트랙은 기존 그대로 |
| 새 endpoint `/api/v1/kpa/store/production-materials` (선택) | 통합 리스트가 필요하면 후속 WO | 선행 IR §7-3 참조 |

---

## 7. 위험 요소

| # | 위험 | 영향 | 완화 |
|---|------|------|------|
| R1 | **이중 AI 트랙 혼입** — `AiContentModal` (동기, productless) vs `productAiContent` (비동기, productId FK) | 사용자 혼란, 동일 자료 중복 저장 | productId 분기를 유형 선택 모달 단계에서 명시 (§5-1) |
| R2 | **forum/course 전용 props 의 매장 누설** — `showCommunitySave=true` 가 기본값으로 매장 흐름에 적용되면 안 됨 | UX 비일관 | 매장 제작 자료에서는 `showCommunitySave=false`, `showStoreSave=false` 고정. 새 `showProductionMaterialSave` 만 활성 |
| R3 | **store owner 권한 우회** — `kpa:store_owner` 가 아닌 사용자가 매장 제작 자료를 만들면 403 | 사용자 혼란 (현재 모달은 403 후 일반 오류로 표시) | 진입 전 RoleGuard 적용. CLAUDE.md §11 (Operator Dashboard 표준) + [docs/baseline/ROLE-POLICY-AND-GUARD-V1.md](docs/baseline/ROLE-POLICY-AND-GUARD-V1.md) 교차 |
| R4 | **POP/QR 결과 포맷 차이** — POP 은 PDF, QR 은 이미지(PNG/SVG), 블로그/상품 상세설명은 HTML | 단일 모달이 출력 포맷을 통일적으로 처리 못함 | AiContentModal 은 **HTML 결과까지만 책임**. PDF/이미지 변환은 후속 파이프라인(기존 `/api/v1/products/:productId/pop/:layout` 등) 유지 |
| R5 | **organizationId Domain Boundary 누락** — 매장 제작 자료가 `store_execution_assets` 에 저장될 때 `organizationId` 필터 누락 위험 | CLAUDE.md §7 Guard Rules 위반 | 백엔드 라우트가 이미 `requireStoreScope` + `organizationId` 필터 보유 — 확인만 |
| R6 | **백엔드 outputType vs `usageType` 매핑 모호** — `store_qr` outputType 결과를 `usageType=qr` 로 매핑할 때 enum 검증 누락 | DB 제약 위반 | `store_execution_assets.usageType` enum 코드 확인. 매핑 테이블 명시 |
| R7 | **AI 결과의 productId 사후 연결** — productless 진입 후 사용자가 사후에 상품을 연결하려는 케이스 | 데이터 모델 비대칭 | Phase 1 에서는 productless 만 허용, productId 사후 연결은 별도 WO |
| R8 | **모달 4개 카드 + 7개 outputType 비대칭** — 사용자 혼란 ("summary/title_suggest/store_sns 는 왜 없나?") | UX 일관성 손상 | 매장 제작 자료 카드 목록은 명시적 화이트리스트(4유형). 추가 outputType 노출은 별도 WO |

---

## 8. 추천 구현 순서

> 본 IR 은 조사만. 아래는 후속 WO 권장 시퀀스.

### Phase 0 — 결정 사항 확정 (별도 WO 또는 본 IR 검토 시)

1. productId 분기를 유형 선택 모달 단계에서 노출할지, AiContentModal 내부에서 분기할지 결정
2. 모달의 4유형 카드 화이트리스트 확정 (POP / QR / 블로그 / 상품 상세설명) — 사이니지 제외
3. `outputType ↔ usageType` 매핑 표 확정

### Phase 1 — AiContentModal MODE_CONFIG 확장

- `blog`, `store_qr` (필요 시 `store_sns`) 카드 추가 — 모달 한 곳 수정
- 백엔드 변경 없음 (이미 7 outputType 지원)
- 별도 WO: **WO-O4O-AI-MODAL-OUTPUT-TYPE-EXPOSE-V1**

### Phase 2 — 매장 제작 자료 저장 destination 추가

- `showProductionMaterialSave` prop 추가
- `/api/v1/kpa/store/assets` POST 호출 (이미 존재)
- 별도 WO: **WO-O4O-AI-MODAL-PRODUCTION-MATERIAL-SAVE-V1**

### Phase 3 — 매장 제작 자료 페이지에 모달 진입 통합

- 선행 IR §6-3 의 [매장 제작 자료 만들기] 버튼 → 유형 선택 모달 → AiContentModal
- 별도 WO: **WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-AI-FLOW-V1**

### Phase 4 — Product-bound 트랙 보존 + 양립

- productId 가 있는 경우 productAiContent 트랙 유지
- 매장 제작 자료 진입 시 productId 컨텍스트 보존
- 별도 WO: **WO-O4O-KPA-STORE-PRODUCTION-PRODUCTID-BRANCH-V1**

### Phase 5 — 브라우저 검증

- 4유형 × productid 유/무 = 8 케이스 smoke test
- 검증 계정: [docs/local/TEST-ACCOUNTS.local.md](docs/local/TEST-ACCOUNTS.local.md) SSOT
- AI quota 한도 모니터링

---

## 9. 다음 WO 추천

| # | WO ID | Phase | 우선순위 |
|---|-------|-------|---------|
| 1 | WO-O4O-AI-MODAL-OUTPUT-TYPE-EXPOSE-V1 | Phase 1 | High — 백엔드 준비된 outputType 노출 |
| 2 | WO-O4O-AI-MODAL-PRODUCTION-MATERIAL-SAVE-V1 | Phase 2 | High — 저장 destination 추가 |
| 3 | WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-AI-FLOW-V1 | Phase 3 | High — 매장 제작 자료 진입점 통합 |
| 4 | WO-O4O-KPA-STORE-PRODUCTION-PRODUCTID-BRANCH-V1 | Phase 4 | Medium — productId 분기 정리 |
| 5 | WO-O4O-AI-USAGE-QUOTA-MONITOR-EXTEND-V1 | (운영) | Low — quota 모니터링 확장 |

---

## 10. 참조 문서

| 문서 | 관련성 |
|------|--------|
| 선행 IR — Production Asset Restructure V1 | [docs/investigations/IR-O4O-STORE-PRODUCTION-ASSET-RESTRUCTURE-V1.md](docs/investigations/IR-O4O-STORE-PRODUCTION-ASSET-RESTRUCTURE-V1.md) |
| AI Content Automation V1 | [docs/architecture/O4O-AI-CONTENT-AUTOMATION-V1.md](docs/architecture/O4O-AI-CONTENT-AUTOMATION-V1.md) |
| AI Usage Flow Baseline V1 | [docs/baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md](docs/baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md) |
| Store Production Material Canonical | [docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md](docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md) |
| Boundary Policy (organizationId 필수) | [docs/architecture/O4O-BOUNDARY-POLICY-V1.md](docs/architecture/O4O-BOUNDARY-POLICY-V1.md) |
| Role Policy & Guard Baseline | [docs/baseline/ROLE-POLICY-AND-GUARD-V1.md](docs/baseline/ROLE-POLICY-AND-GUARD-V1.md) |
| Test Accounts SSOT | [docs/local/TEST-ACCOUNTS.local.md](docs/local/TEST-ACCOUNTS.local.md) |

---

## 11. 결론

- 매장 제작 자료의 AI 편집 흐름을 위해 **새 컴포넌트를 만들 필요 없다**. `AiContentModal` 이 이미 5+ 페이지에서 검증된 canonical 컴포넌트이며, 매장 제작 자료는 6번째 사용처가 될 뿐이다.
- 백엔드 AI 프롬프트 카탈로그는 이미 7개 outputType 지원 (`blog`, `store_qr`, `store_sns` 포함). 프론트 노출만 풀어주면 즉시 사용 가능.
- 단, **productAiContent 트랙(productId FK 필수, async)** 과 **AiContentModal 트랙(productless, sync)** 의 분기는 유형 선택 모달 단계에서 명시적으로 처리해야 한다.
- 디지털사이니지는 격리 유지. 모달의 카드 화이트리스트(POP/QR/블로그/상품 상세설명)에 포함하지 않는다.
- 다음 작업은 Phase 1 (MODE_CONFIG 확장) → Phase 2 (저장 destination) → Phase 3 (진입점 통합) 순.

---

*Status: Investigation Complete. No code changes performed. Awaiting Phase 1 WO.*
