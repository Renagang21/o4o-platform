# CHECK-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1

> **WO:** [`WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1`](../work-orders/WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1.md) (`50193c562`)
> **실행일:** 2026-09-22 · **기준 `origin/main` 착수 시점:** `50193c562`
> **커밋:** web-neture `bdbe0a3b9` · CHECK(본 문서) 후속 커밋
> **판정:** **COMPLETE — 외부 LLM First "ChatGPT로 작업" 패널 · 5 입력원 → 단일 CreatePage Draft · from-master hydration · 서버 변경 0 · 내부 AI 호출 0. 인증 UI smoke 는 PENDING(§6-B, WO §6.2 사유 명시로 완료를 막지 않음)**
> **트랙 위치:** Supplier AI First 제품 승격 7단계 중 ⑦(마지막). "제품등록 리팩터링" 후속 WO 없음 · 다음 판단 = WebMCP write 자동화 수준(§10)

---

## 1. Prompt Core — 위치 · Context · 실제 예시

**위치:** `services/web-neture/src/lib/supplier-product-authoring/` (순수 TS · React/API/fetch 의존 0 · 소스 계약 테스트로 고정).

| 파일 | 역할 |
|---|---|
| `types.ts` | `SupplierProductCandidateDraft` · `SupplierProductAuthoringContext` · `SupplierProductSourceKind` · `SUPPLIER_CANDIDATE_REGULATORY_TYPES` |
| `prompt.ts` | `SUPPLIER_PRODUCT_LLM_ASSIST_LABEL = 'ChatGPT로 작업'` · `buildSupplierProductAuthoringPrompt(ctx)` · `SUPPLIER_PRODUCT_OUTPUT_RULES`(11) |
| `parse.ts` | `parseSupplierProductCandidateDraft(text)` · `SUPPLIER_DRAFT_FORBIDDEN_KEYS` · `SUPPLIER_DRAFT_IGNORED_KEYS` |
| `apply.ts` | `applySupplierProductDraft(form, draft, opts)` · `descriptionTextToHtml` |
| `index.ts` | re-export |

**WO §2.8 과의 차이(보고):** WO 는 `packages/<선정 패키지>/src/llm/` 을 제시했으나, 후보 패키지(`@o4o/utils` · `store-ui-core` · `content-editor`)에 두려면 `package.json`(exports/의존) 변경이 필요해 **중지 조건 B** 에 걸린다. 소비처가 web-neture 1곳뿐이므로 web-neture `lib/` 에 두었다. 이동은 두 번째 소비처가 생길 때 additive 로 가능(패키지 경계 논의는 WebMCP 판단과 함께). Store Prompt Core(`storeContentAuthoringPrompt.ts`)는 재사용하지 않고 라벨 문자열 동일성만 테스트로 고정(`prompt.test.ts`).

**Context (`SupplierProductAuthoringContext`):** `productTypeLabel` · `regulatoryType` · `currentDraft`(현재 폼값: name/barcode/brandName/manufacturerName/specification/originCountry/regulatoryName/mfdsPermitNumber/offerDraft) · `sourceKind`(`manual|image|pdf|url|import`) · `sourceUrl`(url) · `sourceLabel`(image/pdf 파일 설명) · `additionalInstruction`. Prompt 구성 = `[작업]` / `[자료와 현재 상태]` / `[출력 규칙]` / `[출력 형식 — JSON 객체 1개]`.

**실제 Prompt 예시 — 사진(image · `sourceLabel='제품 앞면·뒷면 사진 2장'` · 현재 brandName='정관장'):** `[자료와 현재 상태]` 구간

```text
자료: 제품 사진(포장·라벨·성분표)을 이 대화에 첨부합니다. 사진에 실제로 인쇄된 정보만 읽어 주세요.
사진이 아직 첨부되지 않았다면 첨부를 기다렸다가 작업해 주세요.
- 자료 설명: 제품 앞면·뒷면 사진 2장
- 등록 제품 구분(사용자 선택): 비의약품
- 규제 구분 힌트(사용자 선택): 일반(기타) (GENERAL)
- 현재 입력값(참고 · 자료와 다르면 자료를 우선하되 바뀐 이유를 알 수 있게 정확히 적어 주세요):
  - 브랜드명: 정관장
```

**실제 Prompt 예시 — URL(`sourceUrl='https://example.com/product/123'`):**

```text
자료: 아래 제품 상세 URL 의 내용을 확인해 정리해 주세요. 페이지에 없는 정보는 만들지 마세요.
- 제품 상세 URL: https://example.com/product/123
- 등록 제품 구분(사용자 선택): 비의약품
- 규제 구분 힌트(사용자 선택): 일반(기타) (GENERAL)
```

두 예시의 `[출력 규칙]`(공통 11개 · 발췌):

```text
- 자료에서 확인되지 않는 값은 반드시 null 로 두세요. 추측해서 채우지 마세요.
- 바코드(barcode)는 자료에 실제로 인쇄·표기된 값만 적고, 없으면 null 입니다. 임의로 생성하지 마세요.
- 허가번호(mfdsPermitNumber)는 자료에 명시된 값만 적고, 없으면 null 입니다. 생성하지 마세요.
- categoryId · brandId · drugCategory · imageUrl · contentImageUrls 는 항상 null(배열은 [])로 두세요. O4O 화면에서 사용자가 직접 선택합니다.
- 의약품의 일반의약품(OTC)/전문의약품(Rx) 구분을 추측하지 마세요(drugCategory 는 항상 null).
- supplierId · masterId · serviceKeys · distributionType · 재고(stock)·유효기간·일련번호 같은 키는 넣지 마세요.
- 결과는 아래 형식의 JSON 객체 1개만 출력하세요.
```

PDF(`pdf`)는 "PDF 를 이 대화에 첨부 · 문서에 적힌 정보만" 안내 + `sourceLabel`, import 는 "상세페이지 소스 자동 추출 초안의 보정" 안내로 같은 골격이다.

## 2. `SupplierProductCandidateDraft` JSON 계약 · 파서 규칙

```json
{
  "name": "string|null", "barcode": "string|null",
  "categoryId": null, "brandId": null,
  "brandName": "string|null", "manufacturerName": "string|null",
  "specification": "string|null", "originCountry": "string|null",
  "regulatoryType": "GENERAL|COSMETIC|HEALTH_FUNCTIONAL|QUASI_DRUG|MEDICAL_DEVICE|DRUG|null",
  "drugCategory": null, "regulatoryName": "string|null", "mfdsPermitNumber": "string|null",
  "imageUrl": null, "contentImageUrls": [],
  "offerDraft": {
    "priceGeneral": "number|null", "consumerReferencePrice": "number|null",
    "consumerShortDescription": "string|null", "consumerDetailDescription": "string|null",
    "isFeatured": false
  }
}
```

`parseSupplierProductCandidateDraft(text)` → `{ ok: true, draft, warnings } | { ok: false, code, error }`

| 단계 | 규칙 | 결과 |
|---|---|---|
| 입력 정리 | 코드펜스(```json … ```) 제거 → `JSON.parse` → 실패 시 첫 `{`~마지막 `}` 재시도 | `EMPTY` / `INVALID_JSON` / `NOT_OBJECT` → **ok:false · write 0** |
| **거부(제거)** | `supplierId/masterId/productMasterId/distributionType/serviceKeys/stock*/inventory/lot*/serial*/expiry*/expiration*/warehouse*/traceability*` 및 한글 동의어(`재고/유효기간/일련번호/입고일/로트/창고`) — snake/camel 모두 · 최상위·`offerDraft` 양쪽 | 키 제거 + 경고 `"<key>: 허용되지 않는 항목이라 제거했습니다."` |
| 계약 외 키 | TOP_LEVEL/OFFER 키 밖의 모든 키 | 제거 + 경고 `"계약에 없는 항목이라 제거했습니다."` |
| **무시(AI 값 사용 안 함)** | `categoryId · brandId · drugCategory · imageUrl · contentImageUrls` | 값이 있으면 경고 `"AI 값은 사용하지 않습니다(화면에서 직접 선택)."` · 항상 `null`/`[]` 로 강제 |
| enum | `regulatoryType` 대문자화 후 6종 검증 | 아니면 `null` + 경고 |
| 문자열 | trim · 빈 문자열→`null` · 서버 mapper LIMITS 와 동일 절단(name 200 · barcode 64 · brandName/manufacturerName/regulatoryName 200 · specification 500 · mfdsPermitNumber 100 · originCountry 100 · short 500 · detail 5000) | 절단 시 경고 `"<field>: N자를 넘어 잘라냈습니다."` |
| 숫자 | `,`/공백/`원` 제거 후 파싱 · 0 이상만 | 아니면 `null` + 경고 |
| `isFeatured` | `=== true` 만 true | — |
| name 부재 | 경고 `"name: 제품명이 없습니다. 화면에서 직접 입력해 주세요."`(ok 유지 · 제출은 기존 Step 검증이 막음) | — |

테스트: `parse.test.ts` 11건 PASS(펜스/부분 JSON/오류 3종/금지 키 최상위·offer·snake·한글/무시 키/enum/절단/숫자).

## 3. CreatePage 세 입력원 통합 · Apply 계약 · 문구

**단일 Draft = `SupplierProductCreatePage` 의 `form` state.** 직접 입력(폼) · Import Assistant(sessionStorage `loadAndClearDraft` → `importDraft` → `form` 초기값 · 기존) · ChatGPT JSON(`SupplierProductLlmAssistPanel` → `parse` → `applySupplierProductDraft` → `setForm`)이 같은 state 에 합류하고, 제출은 기존 `handleSubmit` → `POST /supplier/product-candidates` 1곳뿐이다.

**Apply 병합 규칙(`applySupplierProductDraft` · `apply.test.ts` 6건 PASS):**

| 항목 | 규칙 |
|---|---|
| 모드 | `fill-empty`(기본 · 빈 칸만) / `overwrite`(AI 값이 있는 칸만 덮어씀 · `null` 은 건드리지 않음) |
| `brandName` 변경 | `brandId` 해제 + note(자동 매칭 금지) · 같은 이름이면 유지 |
| `regulatoryType` | 진입 유형이 있으면 잠금(note) · AI 의 `DRUG` 는 절대 적용 안 함(note) · 그 외 overwrite 또는 폼이 빈값/`GENERAL` 일 때만 |
| `isFeatured` | overwrite 에서만 |
| 설명 | `consumerDetailDescription ?? consumerShortDescription` → `descriptionTextToHtml`(HTML 통과 · 텍스트는 escape + `<p>`/`<br />`) → `consumerShortDesc` 에디터 |
| `categoryId · 이미지 · drugCategory` | 폼에 손대지 않음(사용자 직접 선택) |
| 바코드가 새로 채워짐 | `setBarcodeChecked(false)` · `searchBarcode()` → 기존 Master 발견 시 화면의 기존 [기존 제품에 공급 연결](from-master) 안내로 합류 |
| 저장 | **없음** — 적용은 state 변경뿐. 제출은 사용자의 [검토 요청] |

**패널(`components/supplier/SupplierProductLlmAssistPanel.tsx`):** 접힘 기본(Import 진입은 열림) · 입력원 칩(직접 입력/제품 사진/소개서 PDF/제품 URL/상세페이지 소스) · URL/자료 설명/추가 지시 · [요청문 복사](clipboard) · 요청문 미리보기 · 결과 JSON textarea · 적용 모드 라디오 · [결과 적용]. 파싱 실패 → 빨간 박스 `"… 입력란은 변경되지 않았습니다."` · 성공 → 경고/note 목록 + 초록 박스. `supplierApi`/제출 경로 없음(소스 계약 테스트).

**알려진 제약:** 패널은 모든 Step 에 표시되지만 Step 2 의 `ProductForm`(가격 초안)은 `initialData` 를 Step 전환 시에만 재계산한다 → Step 2 에 머문 채 적용하면 가격 칸은 Step 이동 후 반영된다(form state 는 즉시 갱신 · 제출값 정확). Step 1 에서 적용하는 흐름이 기본이라 추가 변경하지 않았다.

**문구:** 진입 화면(`SupplierProductRegisterEntryPage`) 신규 카드 부제 "직접 입력하거나 사진·PDF·URL 을 ChatGPT로 정리해 채운 뒤 검토 요청" · 하단 안내 정렬. CreatePage GuideBlock/Step1 문구에 ChatGPT 경로 추가 · Import 진입 배너 "상세페이지 소스에서 자동 추출한 초안입니다 … [ChatGPT로 작업]으로 보정". 사이드바(`SupplierSpaceLayout`)·Bulk 화면 링크 `등록 도우미` → `소스 자동 입력`. `SupplierProductImportPage` 본문은 이미 CreatePage 로 합류하므로 변경 0.

## 4. from-master hydration

- `productApi.getMasterById(masterId)` (`lib/api/product.ts`): `GET /neture/products/library/:id`(requireAuth · 기존) 응답을 `MasterSearchResult` 로 정규화(`name ?? regulatoryName` · `category/brand {id,name}` · `primaryImageUrl` = `isPrimary` 이미지 우선). **404 → null · 그 외 오류 throw**(조회 실패를 '없음'으로 오인하지 않음).
- `SupplierProductFromMasterPage`: `state.master?.id === masterId` → 즉시 표시 / 아니면 GET → 표시 / `NOT_FOUND` → 안내 + [제품 라이브러리로 이동] / `FAILED` → 안내 + [다시 시도] + Library 링크 / `masterId` 없음 → 안내. "새로고침 시 Library 로 되돌리는" 동작 제거. 헤더 주석("공급자용 get-master-by-id API 는 없으므로")을 사실에 맞게 정정. write 시 ACTIVE 등 최종 검증은 기존 `/from-master` 서버가 담당(변경 0).
- 배포 확인: `/supplier/products/from-master/<uuid>` SPA 200 · `SupplierProductFromMasterPage-DBPc-Bou.js` 에 hydration 문구 · `product-BmQcTvQT.js` 에 `getMasterById` 포함(§6-A).

## 5. brand picker · DRUG · AVAILABLE_SERVICES

- **brand picker 도입:** CreatePage 브랜드 칸 = `productApi.getBrands()`(`isActive !== false`) `<select>` + 직접 입력 텍스트. **`brandId` 는 목록에서 고른 경우에만** 채워지고 payload 에 `brandId: form.brandId || null` 로 전달(서버 mapper 는 UUID 만 evidence 로 보존 · ⑤+⑥ 계약 그대로). 텍스트 입력·AI 적용으로 brandName 이 바뀌면 `brandId` 해제. 유사도 매칭·자동 생성 0. `ProductForm.tsx`(Step 2 가격 전용)에는 브랜드 칸이 없어 변경 0.
- **DRUG:** 파서는 enum 으로 통과시키되 apply 에서 `DRUG` 는 절대 적용하지 않고 note 로 안내 → 의약품은 진입 화면 유형 선택(기존 gate) 으로만. `drugCategory` 는 항상 null. `assertDrugOfferAllowed` · `AVAILABLE_SERVICES` · 서비스 대상 정책 변경 0(Candidate 는 Offer 를 만들지 않으므로 해당 없음).

## 6. 검증

### 6-1. WO §6.1 항목별

| 항목 | 결과 | 근거 |
|---|---|---|
| 직접 입력 → Candidate · Import → 동일 draft · ChatGPT JSON → 동일 draft | PASS | 세 경로 모두 `form` state · 제출 1곳(§3) · 패널 RTL 테스트 `onApplyDraft` 1회 |
| JSON 오류 → write 0 · 오류 표시만 | PASS | `parse.test.ts` · 패널 테스트 "JSON 오류 → onApplyDraft 미호출 + 입력란은 변경되지 않았습니다" |
| 금지 키 제거/거부 · 무시 키 AI 값 무시 | PASS | `parse.test.ts` · 패널 테스트(supplierId 제거 · brandId null · 경고 표시) |
| 적용 후 사용자 수정 가능 · 제출 전 자동 저장 0 | PASS | apply 는 `setForm` 만 · 패널 소스에 제출 경로 0(소스 계약 테스트) |
| Candidate 제출 → Master/Offer write 0 | PASS | api-server `supplier-product-candidate-intake-contract` · `registration-cutover-contract` · `promotion-adapter-contract` · `product-promotion-core` 4 suites / 89 PASS · 서버 소스 diff 0 |
| 기존 Master 발견 → from-master · AI masterId 불가 | PASS | 바코드 적용 시 `searchBarcode` → 기존 안내 · `masterId` 금지 키 |
| from-master 직접 URL/새로고침 · 404 안내 | PASS(결정론) / 인증 브라우저 PENDING | §4 · tsc/build · 배포 chunk |
| link 시 이미지 자동부착 0 · create 승격 image 회귀 0 | PASS | promotion 테스트 PASS · 서버 변경 0 · `product_images(source='candidate_promotion')` 0 유지 |
| DRUG gate 변경 0 · 내부 AI 호출 0 | PASS | 소스 계약 테스트(`/ai/`·`/llm/`·`/generate`·`aiApi`·`vision`·`openai`·`gemini`·`anthropic` 0) · 배포 chunk grep 0 |
| 단위 테스트 · tsc · eslint · vite build · api-server spec | PASS | web-neture vitest **20 files / 158 tests**(신규 4 files / 27) · `tsc --noEmit` 0 · eslint 0 errors(경고 5 = HEAD 기존) · `vite build` ✓ · api-server 4 suites / 89 |

### 6-A. 배포 · smoke (2026-09-22 14:3x KST · write 0)

- **배포:** `Deploy Web Services (Cloud Run)` run 35690839617 SUCCESS(`detect-changes` · `deploy-neture`). API 서버 배포 없음(변경 0).
- **API 미인증:** `POST …/supplier/product-candidates` 401 · `POST …/supplier/products/from-master` 401 · `GET …/products/library/<uuid>` 401(`AUTH_REQUIRED`).
- **배포 bundle:** `index-C3FPDr6s.js` → `SupplierProductCreatePage-CPrEi4ry.js`("ChatGPT로 작업" 3 · "결과 적용" 2 · 내부 AI 경로 0) · `SupplierProductFromMasterPage-DBPc-Bou.js`(hydration 문구) · `product-BmQcTvQT.js`(`getMasterById` · `neture/products/library/` 2). SPA `/supplier/products/create` 200 · `/supplier/products/from-master/<uuid>` 200. 사이드바 라벨 "소스 자동 입력" index 포함.
- **read-only 계수(before = after):** `supplier_product_offers` 22 · `product_masters` 272,040 · `product_candidates` 394,495 · `product_images(source='candidate_promotion')` 0.

### 6-B. 인증 UI smoke — PENDING

Google 인증 가능한 ACTIVE 공급자 계정이 이 세션에 없다(⑤+⑥ CHECK §6-A 와 동일 사유: 표준 test 계정은 `SERVICE_NOT_MEMBER` · Google OAuth 수행 불가). 재개 시 write 0 으로 수행 가능한 범위: Prompt 복사 → 샘플 JSON 적용 → 폼 확인 → from-master 새로고침. Candidate 실제 제출은 운영 write 승인 별도. WO §6.2 에 따라 이 사유만으로 WO 완료를 막지 않는다.

## 7. 중지 조건 발동 여부

| WO §5 | 발동 | 비고 |
|---|---|---|
| A 서버 Candidate 계약·DB·migration | 없음 | `apps/api-server` diff 0 |
| B package.json/lockfile/새 패키지 | 없음 | lib 를 web-neture 안에 둔 이유(§1) |
| C 공통 모듈 기존 동작 변경 | 없음 | `@o4o/content-editor` `LlmAssistPanel` 변경 0(전용 JSON 패널 신설) |
| D DRUG gate·정책 | 없음 | §5 |
| E 타 세션 파일 접촉 | 없음 | `D packages/action-log-core/*` 미접촉 |
| F 프로덕션 write smoke | 없음 | write 0 · §6-B PENDING |
| G 무관한 build/test 실패 | 없음 | — |

## 8. 문서 정합

`문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건`

## 9. Git

- 코드 커밋 `bdbe0a3b9`(web-neture 16 files · path-specific stage · `check-staged-scope` PASS) → push → `HEAD == origin/main`. 본 CHECK 는 후속 커밋.
- WO 범위 미커밋 0. 타 세션 파일(`packages/action-log-core` 삭제 상태) 불가침 유지.

## 10. 다음 판단 인계 — WebMCP 로 Prompt/Apply/Save 를 더 자동화할지

현재 흐름에서 **기계가 이미 고정한 것**과 **사람이 남는 지점**:

| 단계 | 현재(⑦) | WebMCP/외부 agent 가 대신할 수 있는가 |
|---|---|---|
| Prompt | `buildSupplierProductAuthoringPrompt(ctx)` 순수 함수 · 사용자가 복사 | 가능(같은 함수 호출) |
| 자료 첨부(사진/PDF) | 사용자의 ChatGPT 대화에 직접 첨부 · O4O 는 파일을 받지 않음 | agent 가 자기 컨텍스트에서 처리 |
| Output | `SupplierProductCandidateDraft` JSON 1개(§2) · 파서가 금지/무시 키를 걸러냄 | 가능 — 계약이 코드로 고정됨(파서를 agent 측에서 재사용 가능) |
| Apply | 화면 state 채움 · 사람이 확인·수정(카테고리·브랜드·이미지는 사람만) | 부분 — `categoryId/brandId/imageUrl` 은 사람 선택이 계약 |
| Save | **정본 = `POST /api/v1/neture/supplier/product-candidates`** · `requireAuth` + ACTIVE 공급자 · payload 는 화면과 동일(별도 AI 저장 테이블 없음) | 가능하려면 공급자 인증 세션(쿠키)이 agent 에 있어야 함 · 사람 확인 단계를 어디에 둘지가 판단 사항 |
| 승격 | 운영자 Promotion(③ Adapter) — AI 무관 | 변경 없음 |

판단이 필요한 것은 **"Save 를 사람 확인 없이 agent 가 눌러도 되는가"** 하나다(Candidate 는 운영자 검토 전 단계라 위험은 낮으나, 인증 세션 위임 방식이 선행). 그 전까지는 ⑦ 흐름(복사 → 붙여넣기 → 적용 → 확인 → 검토 요청)이 정본이다.
