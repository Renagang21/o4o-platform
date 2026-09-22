# WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1

> **상태:** HANDOFF ONLY · 구현 WO (등록일 2026-09-22 · **실행 착수는 별도 명시 지시**)
> **기준 코드:** `origin/main` `d25e3757b` 시점 조사. **실행은 항상 최신 `origin/main` 에서 시작**한다 — reset/rebase 로 타 세션 커밋을 제거하지 않는다.
> **위치:** Supplier AI First 제품 승격 트랙 7단계 중 **⑦(ChatGPT / 사진 / PDF / URL → Candidate)**. 선행 ①~⑥ 전부 CLOSED — 직전 [`…-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1`](WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1.md) · CHECK [`…-RETIREMENT-V1`](../checks/CHECK-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1.md) §10(Candidate 입력 계약).
> **동급 선례:** Store 영역 외부 LLM First — [`WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1`](WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1.md) · [`WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1`](WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1.md) (`packages/store-ui-core/src/llm/storeContentAuthoringPrompt.ts` · `@o4o/content-editor` `LlmAssistPanel`). 원칙은 같고 **출력 계약이 HTML 이 아니라 구조화 JSON** 이라는 점만 다르다.
> **기준 문서:** [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) · [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) · [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](../baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md) (F12).

---

# 1. 목표와 배경

## 1.1 한 문장

공급자가 **직접 입력 · 사진 · PDF · 제품 상세 URL · 기존 Import Assistant 자료 · ChatGPT/Astra 작업 결과**를 **하나의 제품정보 작성 화면**(`SupplierProductCreatePage`)에서 쓰고, 최종적으로 기존 정본 `POST /api/v1/neture/supplier/product-candidates` 에 제출되게 한다. **새 데이터 구조를 만드는 작업이 아니라, 이미 완성된 Candidate 구조에 외부 ChatGPT 를 제대로 연결하는 작업**이다.

## 1.2 최종 구조

```text
제품 자료(사진 · PDF · URL · Import 자료 · 메모)
   ↓
O4O 제품정보 작성 Context (현재 화면 draft + 자료 종류)
   ↓
[ChatGPT로 작업]  — Prompt 복사 → 사용자의 ChatGPT/Astra 에서 자료와 함께 작업
   ↓
외부 LLM → SupplierProductCandidateDraft JSON 1개
   ↓
O4O [결과 적용] — 파싱 · 검증 · 금지 키 제거 → draft state 채움
   ↓
사용자 확인 / 수정 (제출 전 자동 저장 없음)
   ↓
POST /supplier/product-candidates → ProductCandidate (Master/Offer write 0)
```

## 1.3 핵심 원칙 — 외부 LLM First

Store 영역에서 확정한 원칙과 동일하다.

- O4O 내부 LLM 생성 버튼을 새로 만들지 않는다. O4O 가 OpenAI/Gemini 비용을 부담해 제품정보를 생성하는 구조를 만들지 않는다. 내부 vision / PDF 분석 pipeline 을 이번에 만들지 않는다.
- O4O 의 책임은 **Prompt · Reference · Output Contract · Apply · Save** 다. 제품 분석·정리는 사용자의 ChatGPT/Astra 등 외부 LLM 이 수행한다.
- 대표 CTA 문구: **`ChatGPT로 작업`** (`STORE_LLM_ASSIST_LABEL` 과 같은 문구 · 별도 라벨 상수를 새로 만들지 말고 공용 상수를 쓰거나 같은 값으로 고정).
- AI 는 ProductMaster 를 만들지도, 정본을 판단하지도, `masterId` 를 지정하지도 않는다.

## 1.4 현재 코드 사실 (조사 결과)

| 항목 | 현재 |
|---|---|
| 신규 제품 화면 | `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx`(1,107줄) — 3-Step · `ProductForm` · 바코드 조회(`productApi.getMasterByBarcode`) → 기존 Master 발견 시 `/supplier/products/from-master?masterId=` 로 이동(state 로 master 전달) · 제출 = `POST /supplier/product-candidates` |
| Import Assistant | `SupplierProductImportPage.tsx`(1,233줄) — Firstmall 관리자 HTML 분석 → `saveDraft(ImportDraft)`(localStorage) → `/supplier/products/new` 이동 → CreatePage 가 `loadAndClearDraft()` 로 prefill. 이미 Candidate 흐름으로 합류(⑥) |
| from-master 화면 | `SupplierProductFromMasterPage.tsx` — `?masterId=` + `location.state.master` 에만 의존. state 없으면 Library 로 복귀. 헤더 주석에 "공급자용 get-master-by-id API 는 없으므로" 라고 적혀 있으나 **사실이 아니다** — `GET /api/v1/neture/products/library/:id`(`product-library.controller.ts:131`, `requireAuth`) 가 category/brand/images 포함 상세를 반환한다. **프런트 hydration 공백**이지 서버 공백이 아니다 |
| 외부 LLM 패널 | `@o4o/content-editor` `LlmAssistPanel` — `guideText`(string \| fn(additionalInstruction)) · `onApplyHtml(html)` · 복사/붙여넣기 UI. HTML 적용 전용이라 JSON 적용은 `onApplyHtml` 을 그대로 쓰지 않는다(§2.3) |
| Store Prompt Core | `packages/store-ui-core/src/llm/storeContentAuthoringPrompt.ts` — HTML 콘텐츠용. **재사용하지 않는다**(출력 계약이 다름) · 구조 원칙(Task + Source Context + Output Contract · 화면별 Prompt 하드코딩 금지 · 개인정보 미포함)만 따른다 |
| 브랜드/카테고리 | `ProductForm` 은 `categoryId`(select · `productApi.getCategories`) · `brandName`(텍스트) 만 · `brandId` 입력 없음. `productApi.getBrands()` 는 존재 |
| Candidate 서버 계약 | 직전 CHECK §10 — body 키 · 상한 · 금지 키(`supplierId · distributionType · serviceKeys · stock*` + O4O 범위 밖 키, 소문자 비교) · `contentImageUrls ≤ 20` · 응답 = Candidate(PENDING) · Offer 0 · Master write 0. **이번 WO 에서 서버 계약 변경 없음** |

## 1.5 다른 세션 보호

착수 직전 `git fetch origin` · `git status -sb`. 타 세션의 dirty/untracked/staged 파일은 불가침. 이 WO 의 파일 범위는 §2.8.

---

# 2. 승인 범위

## 2.1 Supplier Product Prompt Core (순수 함수)

- 위치: `packages/` 공통 패키지 중 **API·React·router 의존이 없는 곳** — 권장 `packages/store-ui-core/src/llm/supplierProductAuthoringPrompt.ts` 옆이 아니라 **제품 도메인 쪽**(예: `packages/product-ui-core/...` 가 있으면 거기, 없으면 `packages/utils/src/llm/supplierProductAuthoringPrompt.ts`). 실행 세션이 기존 패키지 구조를 보고 결정하되 **새 패키지를 만들지 않는다**(`package.json`/lockfile 변경 = 중지 조건).
- 입력:

```ts
interface SupplierProductAuthoringContext {
  productType?: string | null;        // 진입 화면 2분기(non_drug / drug 등 기존 supplierProductTypes 키)
  regulatoryType?: string | null;     // GENERAL | COSMETIC | HEALTH_FUNCTIONAL | QUASI_DRUG | DRUG | MEDICAL_DEVICE
  currentDraft?: Partial<SupplierProductCandidateDraft> | null; // 화면에 이미 입력된 값(참고용)
  sourceKind?: 'manual' | 'image' | 'pdf' | 'url' | 'import';
  sourceUrl?: string | null;          // url 일 때
  sourceLabel?: string | null;        // PDF 파일명 · 자료 설명 정도(원문 첨부 X)
  additionalInstruction?: string | null;
}
buildSupplierProductAuthoringPrompt(ctx): string   // 사람이 ChatGPT 에 붙여넣는 텍스트
```

- Prompt = Task(제품정보 구조화) + Source Context(현재 draft · 자료 종류 · URL/파일명 · 추가 요청) + Output Contract(§2.2 JSON 스키마 + 금지 규칙). 화면별 Prompt 복사본 금지. 회원·주문·매출 등 개인정보·거래 정보는 넣지 않는다.
- 사진/PDF 일 때 Prompt 에 "같은 사진/PDF 를 이 대화에 첨부하세요" 안내를 포함한다(O4O 는 파일을 LLM 에 보내지 않는다).
- 단위 테스트(순수 함수): 자료 종류별 문구 · JSON 스키마 키 전량 포함 · 금지 규칙 문장 포함 · currentDraft 값이 그대로 실림 · 개인정보 필드 미포함.

## 2.2 외부 LLM 출력 계약 — `SupplierProductCandidateDraft` JSON 1개

서버 Candidate 계약을 그대로 쓴다(키 추가·의미 변경 없음).

```jsonc
{
  "name": "string | null",
  "barcode": "string | null",
  "categoryId": "null",                 // AI 추측 금지 — 항상 null, 사용자가 화면에서 선택
  "brandId": "null",                    // AI 추측 금지 — 항상 null
  "brandName": "string | null",
  "manufacturerName": "string | null",
  "specification": "string | null",
  "originCountry": "string | null",
  "regulatoryType": "GENERAL | COSMETIC | HEALTH_FUNCTIONAL | QUASI_DRUG | DRUG | MEDICAL_DEVICE | null",
  "drugCategory": "null",               // OTC/Rx 추측 금지
  "regulatoryName": "string | null",
  "mfdsPermitNumber": "string | null",  // 자료에 명시된 값만 · 생성 금지
  "imageUrl": "null",                   // O4O 업로드 URL 만 유효 — AI 는 채우지 않음
  "contentImageUrls": [],
  "offerDraft": {
    "priceGeneral": "number | null",
    "consumerReferencePrice": "number | null",
    "consumerShortDescription": "string | null",
    "consumerDetailDescription": "string | null",
    "isFeatured": false
  }
}
```

Output Contract 에 고정하는 규칙: **모르면 null · 확인되지 않은 허가번호/바코드 생성 금지 · categoryId/brandId 추측 금지 · 의약품 OTC/Rx 추측 금지 · JSON 외 문장 금지(코드펜스 허용)**.

## 2.3 결과 적용 (Apply)

- CreatePage 에 `ChatGPT로 작업` 패널: ① Prompt 복사(§2.1) ② "결과 JSON 붙여넣기" 입력 ③ **[결과 적용]**.
- 적용기(순수 함수, 테스트 대상): `parseSupplierProductCandidateDraft(text)` — 코드펜스 제거 → `JSON.parse` → 스키마 검증(알 수 없는 키 제거 · 금지 키 `supplierId/distributionType/serviceKeys/stock*/masterId` **제거 + 경고** · 타입/enum 검증 · `categoryId/brandId/drugCategory/imageUrl/contentImageUrls` 는 **무시**(AI 값 불신 · 화면 값 유지)) → `{ ok, draft, warnings } | { ok:false, error }`.
- 파싱·검증 실패 시 **아무것도 저장하지 않고** 오류만 표시. 성공 시 draft state 에 병합(기존 사용자 입력이 있으면 덮어쓰기 여부를 묻거나 빈 필드만 채움 — 실행 세션이 단순한 쪽으로 결정하고 CHECK 에 기록).
- 적용 후 **자동 제출 없음**. 사용자가 Step 을 검토·수정한 뒤 기존 제출 버튼으로 Candidate 를 만든다. 제출 전 서버 자동 저장(임시 Candidate) 없음.
- `LlmAssistPanel` 재사용 여부: 복사/안내 UI 는 재사용 가능하나 `onApplyHtml` 은 HTML 전용이므로 JSON 적용은 별도 콜백/입력으로 둔다. `LlmAssistPanel` 에 additive prop(`onApplyText` 등)을 추가할 경우 소비처 전수 확인([`SHARED-MODULE-CHANGE-PROTOCOL`](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)) · 기존 동작 불변.

## 2.4 사진 · PDF · URL · Import Assistant

- **사진:** 기존 `imageUrl`/`contentImageUrls[]` 계약 그대로. O4O 화면의 사진은 기존 `mediaApi.upload` 로 O4O URL 을 만든다(현재 CreatePage 동작 유지). 외부 LLM 작업 시에는 같은 사진을 ChatGPT 에 첨부하도록 Prompt 가 안내. 내부 vision API 신설 없음.
- **PDF:** 사용자 = `PDF + O4O Prompt → ChatGPT → JSON`. O4O 는 PDF 를 저장·분석하지 않는다. `sourceLabel` 에 파일명·자료 설명만.
- **URL:** 두 경로를 경쟁시키지 않는다 — ① 기존 Import Assistant 로 O4O 초안 생성(현행 `saveDraft → /products/new`) ② ChatGPT 에 URL + Prompt(`sourceKind:'url'`). 둘 다 **같은 CreatePage draft state** 로 들어온다. Import Assistant 를 별도 등록 시스템으로 유지하지 않는다(진입 화면/사이드바 문구를 "자료로 초안 만들기" 성격으로 정렬 · 기능 삭제는 아님).

## 2.5 기존 화면 통합

`SupplierProductCreatePage` 가 유일한 작성 화면이다. **직접 입력 · Import Assistant 초안(`loadAndClearDraft`) · ChatGPT 결과 적용** 세 입력원이 하나의 draft state(현 `form` + 이미지 state)를 공유한다. 별도 "AI 제품등록 페이지" 신설 금지. 진입 화면(`SupplierProductRegisterEntryPage`)은 사용자에게 다음처럼 보인다:

```text
제품이 이미 O4O 에 있음 → 라이브러리에서 선택 → 공급 연결(from-master)
제품이 없음            → 직접 입력 또는 ChatGPT 로 제품정보 정리 → 검토 요청(Candidate)
```

## 2.6 기존 Master 탐색 · brand · DRUG

- **기존 Master 발견:** AI 결과 적용 후 바코드(현행 `getMasterByBarcode`) — 필요 시 제품명 검색(`productApi.searchMasters`) 안내 — 로 기존 Master 가 발견되면 cutover 원칙 유지: Candidate 권유 없이 `/supplier/products/from-master` 로 보낸다. AI 는 `masterId` 를 생성·지정하지 못한다(적용기가 제거).
- **brand:** AI 는 `brandName` 만 채운다 · `brandId = null`. `brandId` 는 **사용자가 O4O 브랜드 목록(`productApi.getBrands`)에서 정확히 선택한 경우에만** 채운다(ProductForm 에 선택형 brand picker 를 additive 로 추가할 수 있음 · 문자열 유사도 자동 매칭 금지 · 브랜드 자동 생성 금지).
- **DRUG:** 신규 DRUG 는 Candidate 까지만(현행). `drugCategory` 는 사용자가 화면에서 선택. `AVAILABLE_SERVICES` 상수는 이번 화면 작업에서 실제 문제를 일으킬 때만 `service_audience_policies` 기반 기존/읽기 API 재사용으로 해결하고, 아니면 범위를 늘리지 않는다. Drug security policy(`assertDrugOfferAllowed`) 변경 0.

## 2.7 from-master 새로고침 공백 (같은 WO 에서 해결 · 서버 변경 0)

- `productApi` 에 단건 조회 wrapper 추가: `getMasterById(id)` → `GET /neture/products/library/:id` (`authClient.api.get`).
- `SupplierProductFromMasterPage`: `navigation state 있음 → 즉시 표시 / 없음 → masterId 로 GET → 표시 / 404·오류 → 안내 + Library 링크`. 응답의 category/brand/regulatoryType 을 현 state 형태로 매핑(응답 shape 는 컨트롤러 확인).
- 헤더 주석("공급자용 get-master-by-id API 는 없으므로")을 사실에 맞게 정정. ACTIVE 상태 등 write 시 최종 검증은 기존 `/from-master` 서버가 계속 담당(프런트는 표시만).

## 2.8 파일 범위

- `packages/<선정 패키지>/src/llm/supplierProductAuthoringPrompt.ts` + `supplierProductCandidateDraft.parse.ts`(또는 한 파일) + 테스트
- `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` · `SupplierProductFromMasterPage.tsx` · `SupplierProductRegisterEntryPage.tsx` · `SupplierProductImportPage.tsx`(문구/합류만) · `components/product/ProductForm.tsx`(brand picker additive) · `lib/api/product.ts`(getMasterById) · 필요 시 `components/layouts/SupplierSpaceLayout.tsx` 문구
- `@o4o/content-editor` `LlmAssistPanel`(additive prop 이 필요할 때만)
- `apps/api-server/src/__tests__/` 계약 spec(회귀 확인용 · 서버 소스 변경 0)
- `docs/checks/CHECK-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1.md`

## 2.9 WebMCP 확장 가능성

이번 WO 는 WebMCP write 성공을 전제하지 않는다. Prompt 와 JSON Output Contract 를 명확히 고정해 이후 `ChatGPT → O4O Candidate 저장` 을 WebMCP/외부 agent 가 직접 수행할 수 있게 한다. 저장 정본은 계속 `POST /supplier/product-candidates` · 별도 AI 저장 테이블 없음.

---

# 3. 실행 순서

1. `git fetch origin` · `git status -sb` · 최신 `origin/main` 에서 시작.
2. Prompt Core + Draft 파서(순수 함수 · 테스트 먼저).
3. `productApi.getMasterById` + from-master hydration(§2.7).
4. CreatePage 에 `ChatGPT로 작업` 패널 + 결과 적용 + draft 병합 · brand picker(선택) · 기존 Master 발견 시 from-master 유도 정합.
5. 진입 화면/Import Assistant/사이드바 문구 정렬(§2.4 · §2.5).
6. 검증(§6) → 배포 → 가능한 범위 smoke → CHECK → path-specific commit/push.

---

# 4. 제외 범위 (하지 않는다)

```text
AI → ProductMaster 직접 write            AI → Offer 자동 생성
내부 AI endpoint 신규 생성(vision/PDF/URL 분석 포함)
AI 가 supplierId · masterId 지정          AI 가 허가번호/바코드/brandId/categoryId/drugCategory 생성
새 Candidate 테이블 · AI 전용 ProductMaster · AI 결과 서버 임시 저장
별도 "AI 제품등록 페이지"                  Store Prompt Core 억지 재사용
서버 Candidate 계약 변경 · DRUG gate 변경 · 브랜드 자동 생성
Candidate link 시 기존 Master 에 이미지 자동 부착(현 보수 정책 유지 — 결함 아님)
WebMCP write 구현(후속 판단 사항)
```

---

# 5. 중지 조건

| # | 조건 |
|---|---|
| A | 서버 Candidate 계약·DB·migration 변경이 필요해질 때 |
| B | `package.json`/lockfile/새 패키지가 필요할 때 |
| C | `LlmAssistPanel` 등 공통 모듈의 **기존 동작 변경**이 필요할 때(additive 는 허용 · 소비처 전수 확인 후) |
| D | DRUG gate · `assertDrugOfferAllowed` · 서비스 대상 정책 변경이 필요할 때 |
| E | 타 세션 dirty/untracked 파일 접촉이 필요할 때 |
| F | 프로덕션 Candidate/Offer 생성 smoke 에 write 가 필요할 때(별도 승인) |
| G | 현재 변경과 무관한 build/test 실패 |

---

# 6. 검증과 Git

## 6.1 성립 조건 (전부)

- 직접 입력 → Candidate · Import Assistant → 동일 Candidate draft · ChatGPT JSON → 동일 Candidate draft(세 입력원이 같은 state)
- JSON parse/검증 실패 → write 0 · 오류 표시만
- 금지 키(`supplierId/distributionType/serviceKeys/stock*/masterId`) 는 결과 적용 시 제거/거부 · `categoryId/brandId/drugCategory/imageUrl/contentImageUrls` AI 값 무시
- AI 결과 적용 후 사용자 수정 가능 · 제출 전 자동 저장 없음 · Candidate 제출 → Master/Offer write 0(기존 계약 spec PASS)
- 기존 Master 발견 → from-master 경로 · AI `masterId` 불가
- from-master 직접 URL/새로고침 정상(state 없음 → `GET /products/library/:id` hydration · 404 안내)
- 기존 Master link 시 Candidate 이미지 자동부착 0 · 신규 Master promotion image 계약 회귀 없음(기존 Core/Adapter 테스트 PASS)
- DRUG gate 변경 0 · 내부 AI API 호출 0(web-neture 에서 `/ai/` 류 신규 호출 0 — 소스 계약 테스트)
- Prompt Core/파서 단위 테스트 PASS · web-neture `tsc --noEmit` · eslint · vite build PASS · api-server 관련 계약 spec PASS(서버 소스 변경 0)

## 6.2 smoke

배포 후: 미인증 401(Candidate/from-master/library) · web bundle 에 `ChatGPT로 작업`/적용 로직 포함 확인 · read-only 계수(`product_candidates` · `supplier_product_offers` · `product_masters`) 전후 동일. **인증 UI smoke 는 Google 인증 가능한 ACTIVE 공급자 계정이 있을 때 실브라우저로**(Prompt 복사 · 샘플 JSON 적용 · from-master 새로고침까지는 write 0 으로 수행 가능 · Candidate 실제 제출은 별도 승인). 계정 부재 시 PENDING 사유 명시.

## 6.3 Git

`git fetch origin` · `git status -sb` → path-specific stage → `node scripts/git/check-staged-scope.mjs <paths>` → `git commit -m "… (WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1)" -- <paths>` → push(`--force` 금지) → `HEAD == origin/main` · WO 범위 미커밋 0.

---

# 7. 완료 보고

CHECK `docs/checks/CHECK-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1.md` 를 작성하고 보고에 다음을 포함한다.

1. Prompt Core 위치 · Context 필드 · Prompt 실제 예시 1건(사진 · URL 각 1)
2. `SupplierProductCandidateDraft` 최종 JSON 계약 + 파서의 제거/무시/거부 규칙 표
3. CreatePage 세 입력원 통합 결과(draft 병합 규칙 포함) · 진입 화면/Import Assistant 문구
4. from-master hydration 결과(`getMasterById` · state 유무 분기 · 404 처리) · 헤더 주석 정정
5. brand picker 도입 여부와 `brandId` 채움 조건 · DRUG/`AVAILABLE_SERVICES` 처리 판단
6. 검증 §6.1 항목별 PASS/FAIL · smoke 결과/PENDING 사유
7. 중지 조건 발동 여부 표
8. `문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건`
9. commit hash · `HEAD == origin/main` · WO 범위 미커밋 0
10. **다음 판단 인계:** WebMCP 로 `Prompt/Apply/Save` 흐름을 더 자동화할지 판단할 수 있도록 — 외부 agent 가 호출할 저장 정본(`POST /supplier/product-candidates`) · 인증 요구 · JSON 계약 · 사람 확인 단계가 남는 지점을 정리한다. "제품등록 리팩터링" 후속 WO 는 만들지 않는다.
