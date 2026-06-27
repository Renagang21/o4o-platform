# IR — AI outputType·프롬프트 전체 모노레포 소비자 재감사 V1

**IR:** `IR-O4O-AI-OUTPUTTYPE-PROMPT-MONOREPO-CONSUMER-AUDIT-V1`
**일자:** 2026-06-27
**성격:** read-only 전체 모노레포 재감사 (코드/DB/API/프롬프트 변경 없음)
**계기:** [`IR-O4O-AI-PROMPTS-SETTINGS-CLEANUP-AUDIT-V1`](./IR-O4O-AI-PROMPTS-SETTINGS-CLEANUP-AUDIT-V1.md) §2 정정 — `services/web-*` 한정 검색이 admin·pipeline 소비를 놓쳐 generate 라우트를 orphan으로 오판. 본 IR은 **services/web-* + apps/admin-dashboard + apps/api-server 내부 호출 + packages + 동적 문자열**까지 전수 재조사.
**분류:** `KEEP / 실제 ORPHAN / RESERVED / 외부 호환 확인 필요`

---

## 0. 두 체계는 분리 — 혼동 금지

| | **A. `/api/ai/content` OutputType** | **B. `ProductAiContentType`** |
|---|---|---|
| 정의 | `apps/api-server/src/services/ai-prompts/index.ts` (8종) | `packages/ai-prompts/src/store/product-content.prompt.ts` + `…/store-ai/entities/product-ai-content.entity.ts` (5종, mirror) |
| 값 | product_detail · blog · pop · summary · title_suggest · store_qr · store_sns · flexible | product_description · pop_short · pop_long · qr_description · signage_text |
| 경로 | `POST /api/ai/content` (편집기 텍스트 보조) — dispatcher buildSystemPrompt/parseResponse | `POST/PUT/GET .../products/:id/ai-contents` — `AiPolicyExecutor.execute('PRODUCT_CONTENT')`, **`/api/ai/content` 미경유** |
| 도메인 | 매장 편집/제작 보조 | **admin 상품마스터 AI 자동화 파이프라인** (draft/seed) |

> `qr_description`(B) ≠ `store_qr`(A). 이름이 비슷하나 **다른 체계·다른 프롬프트·다른 스키마**.

---

## 1. 체계 A — `/api/ai/content` OutputType (8종)

### 1.1 현재 호출 실태 (전수 grep)

- `/api/ai/content` 의 outputType 은 **`AiContentModal`** 이 결정: `effectiveOutputType = initialMode ? currentConfig.outputType : 'flexible'` (`packages/content-editor/src/components/AiContentModal.tsx:446`). 모드 선택 UI 는 `{initialMode && (...)}` (L975) 로만 노출.
- **`initialMode=` 실코드 호출 0** — 전수 grep 결과 production 매치는 전부 docs + 제거 주석(매장 POP/QR/Blog AI 제거 완료). 즉 **모든 live 호출은 flexible**.
- `StoreUseModal`(useCase qr/pop/sns/blog → store_qr/pop/store_sns/blog, `/api/ai/content-to-store-use`) 은 **Toolbar 에서 마운트 제거됨**(`Toolbar.tsx:689`) → **도달 불가**.

> ⚠️ **사전 에이전트 분석 교정:** "pop/blog/store_qr 는 StoreUseModal 경유 KEEP" 은 **오류**. StoreUseModal 은 언마운트 상태라 그 경로는 live 아님.

### 1.2 분류

| outputType | 분류 | 근거 (file:line) |
|---|---|---|
| **`flexible`** | **KEEP** | 유일한 live 생성 경로. Toolbar "AI 정리"(`Toolbar.tsx`) + CourseEdit/InstructorCourseEdit/StoreProductionMaterials(전부 initialMode 미전달). `AiContentModal.tsx:446` |
| `pop` · `blog` · `store_qr` · `title_suggest` | **판단보류 (현재 비활성)** | `MODE_CONFIG`(`AiContentModal.tsx:208-213`) + 백엔드 빌더 존재. 그러나 **initialMode 호출 0** + 모드 UI는 initialMode 시에만 노출 → 사용자 도달 불가. **모달 mode 기능 자체의 존폐 결정** 선행 필요(성급 삭제 금지). |
| `store_sns` | **RESERVED** | `MODE_CONFIG` 미노출(`AiContentModal.tsx:206` "후속 결정"), `StoreUseModal` useCase='sns'(언마운트)만. 백엔드 빌더(`ai-prompts/index.ts`) 잔존. |
| **`summary`** | **실제 ORPHAN** | 프론트 sender **전무**(grep: MODE_CONFIG·StoreUseModal·서비스 모두 0). 백엔드 빌더(`apps/api-server/src/services/ai-prompts/summary.ts`)·dispatcher만. |
| `product_detail` | **외부 호환 확인 필요** | `POST /api/ai/content` 의 **기본값**(`ai-proxy.routes.ts:210` default). 현재 outputType 생략 sender 없음(AiContentModal는 항상 명시) → 사실상 비도달이나 **라우트 계약 기본값**이라 잔존. `editingSurfaceForOutputType` 매핑(`ai-editing-model-resolver.ts:96`)에도 사용. **B의 product_description 과 혼동 금지.** |

> 잔여 확인: `/api/ai/content` 문자열이 KPA `CreateContentFromResourcesModal`·`StoreQRPage`·`StorePopPage` 에 잔존(매치 3) — 모두 AI 제거된 화면의 잔재 참조 가능성. 제거 WO 시 실호출 여부 재확인.

### 1.3 StoreUseModal / content-to-store-use

| 자산 | 상태 | 분류 |
|---|---|---|
| `StoreUseModal` 컴포넌트 + `POST /api/ai/content-to-store-use` (useCase qr/pop/sns/blog) | Toolbar 마운트 제거(`Toolbar.tsx:689`), 코드·API만 잔존 | **기존 WO 종속** — `WO-O4O-STORE-USE-MODAL-DECISION-V1` / `WO-O4O-AI-CONTENT-AUTOMATION-SCOPE-CLEANUP-V1` |

---

## 2. 체계 B — `ProductAiContentType` (5종, admin 상품마스터 파이프라인)

### 2.1 생성·소비 실태

- **생성:** `ProductAiContentService.generateAllContents()` 가 **5종 전부** 생성(`service.ts:98-105`). 트리거:
  - `product-ai-tag.controller.ts:66-73` — **AI 태깅 → 콘텐츠 자동생성 파이프라인**(WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1, live)
  - admin `pop.api.ts:97 generateAiContent('pop_short'|'pop_long')` ← `PopCreatePage.tsx:334-335` (운영자 POP 생성)
- **조회/저장 UI:** StoreProductDescriptionsPage(3서비스, product_description) · ProductPopBuilderPage(3서비스, pop_short/pop_long) · admin PopCreatePage · PDF(`product-pop-pdf.controller.ts:54-69`, pop_short/pop_long) · `shared-product-description.service.ts:258` seed(product_description).

### 2.2 분류

| ProductAiContentType | 분류 | 근거 |
|---|---|---|
| **`product_description`** | **KEEP** | 생성(pipeline) + StoreProductDescriptions 3서비스 조회/저장 + `seedFromProductAiContents`(shared desc 후보). |
| **`pop_short` · `pop_long`** | **KEEP** | 생성(pipeline + admin generateAiContent) + ProductPopBuilder 3서비스 + admin PopCreate + PDF 조회. |
| **`qr_description` · `signage_text`** | **RESERVED (생성되나 소비처 없음)** | `generateAllContents` 가 생성·DB 적재(파이프라인 alive)하나 **reader 전무**(grep: 정의 + 생성 loop `service.ts:103-104` 만, UI/backend reader 0). 제거하려면 loop·prompt·VALID_CONTENT_TYPES(2곳)·entity·3 mirror 동반 + **파이프라인 정책 결정** 선행. 데이터 무손실. |

### 2.3 프롬프트 (`packages/ai-prompts/src/store/product-content.prompt.ts`)

`PRODUCT_CONTENT_PROMPTS` 5종 전부 `generateAllContents` 경유 도달 → **전부 KEEP**(qr_description/signage_text 프롬프트도 생성 경로상 호출됨; reader 없을 뿐). admin 프롬프트(block/section/page refine 등)·store assist(tagging/insight)는 본 축 무관 KEEP.

---

## 3. 경계 (매장 제작 AI vs admin 상품마스터 자동화)

| 경계 | 대상 | 상태 |
|---|---|---|
| **매장 제작 화면 AI** (제거 진행 축) | `/api/ai/content` via AiContentModal **페이지 진입**(initialMode) | 대부분 제거 완료. **flexible(Toolbar AI 정리)만 유지.** |
| **admin 상품마스터 자동화** (별개·KEEP) | ProductAiContentType 전체 + generate 라우트 + 태깅 파이프라인 + admin PopCreate + PDF | **유지.** product_ai_contents = draft/seed (canonical 아님). 제품 방향 "매장 제작 AI 배제" 와 무관. |

---

## 4. 후속 (확실 orphan만 별도 제거 WO)

| 대상 | 분류 | 권고 |
|---|---|---|
| 체계 A `summary` outputType (빌더 `summary.ts` + dispatcher 분기 + 타입 1) | **실제 ORPHAN** | 제거 가능. 단 `OutputType` 8종 union·dispatcher·`isSupportedOutputType` 동반 수정. → `WO-O4O-AI-OUTPUTTYPE-SUMMARY-RETIRE-V1`(소규모) |
| 체계 A `pop`/`blog`/`store_qr`/`title_suggest` + AiContentModal MODE_CONFIG + StoreUseModal/content-to-store-use + `store_sns` | **판단보류/RESERVED** | **모달 mode 기능 + StoreUseModal 존폐**를 먼저 결정(`WO-O4O-STORE-USE-MODAL-DECISION-V1` 와 묶음). 그 전 삭제 금지. |
| 체계 A `product_detail` | **외부 호환 확인 필요** | 라우트 기본값·editingSurface 매핑 — 기본값 변경/제거는 계약 영향, 별도 검토. |
| 체계 B `qr_description`/`signage_text` | **RESERVED** | 파이프라인이 생성 중. reader 0 확정이나, generateAllContents 정책(5종 전체 생성 유지 vs 축소) 결정 후 제거 WO. |
| 체계 B generate 라우트·service·entity·product_description/pop_short/pop_long·admin/PDF | **KEEP** | 변경 금지(IR-PROMPTS-SETTINGS §2 정정 확정). |

> **원칙(재확인):** 제거 전 항상 services + admin-dashboard + api-server 내부 호출 + 동적 문자열까지 소비자 전수 확인. 라우트 기본값·dispatcher·파이프라인 생성 루프는 "호출자 0" 처럼 보여도 계약/데이터 영향이 있어 성급 삭제 금지.

---

## 5. 검증 기준 (IR 종료 조건)

```
1. 두 체계(OutputType vs ProductAiContentType)가 분리 기록되었는가
2. 각 값이 KEEP / 실제 ORPHAN / RESERVED / 외부 호환 확인 필요 로 분류되었는가
3. 전체 모노레포(services + admin-dashboard + api-server 내부 + packages + 동적 문자열) 소비자가 확인되었는가
4. 사전 에이전트 오판(StoreUseModal 경유 KEEP, initialMode 잔존)이 grep 으로 교정되었는가
5. 매장 제작 AI vs admin 상품마스터 자동화 경계가 명시되었는가
6. 확실 orphan(summary, qr_description/signage_text reader 0)과 결정 종속분이 구분되었는가
```

## 6. 결론

체계 A `/api/ai/content` 는 현재 **`flexible`(Toolbar "AI 정리")만 live**이며, MODE_CONFIG outputType(pop/blog/store_qr/title_suggest)은 initialMode 호출 0 + StoreUseModal 언마운트로 **사실상 비활성**(모달 mode 기능 존폐 결정 종속). **`summary` 만 확실 ORPHAN**. `product_detail` 은 라우트 기본값이라 외부 호환 확인 필요. 체계 B `ProductAiContentType` 는 **admin 상품마스터 자동화 파이프라인으로 전부 살아있고**(product_description/pop_short/pop_long KEEP, qr_description/signage_text 는 생성되나 reader 없음=RESERVED), **매장 제작 AI 제거 축과 별개**다. 다음은 코드 변경이 아니라, (a) `summary` 소규모 제거 또는 (b) 모달 mode/StoreUseModal 존폐 결정 WO 중 택일로 진행한다.
