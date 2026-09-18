# WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1

> **상태**: HANDOFF ONLY — 이 문서 접수 자체는 구현 지시가 아니다 · **접수**: 2026-09-18 · **CHECK**: (실행 후 `docs/checks/CHECK-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1.md`)
> 내 매장 AI First 리팩터링 **3단계**. 선행 WO1 [`WO-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1`](WO-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1.md)(내부 AI OFF) · WO2 [`WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1`](WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1.md)(공통 Prompt Core · LlmAssistPanel · 일반 콘텐츠/제작자료 외부 LLM 흐름) 위에서 **목적별 제작 화면(POP · QR · Blog · 상품 설명 · 다국어)** 을 같은 외부 LLM 제작 계약으로 정렬한다.
>
> 실행 시 최신 `origin/main` 에서 다시 census 하고, 동일 파일에 다른 세션의 WIP 가 있으면 즉시 보고 · 중지한다.

## 0. 목적

내 매장 AI First 리팩터링 3단계.

선행 완료:

```text
WO 1
STORE AI FIRST EDITOR BOUNDARY
→ Store RichTextEditor 내부 AI OFF

WO 2
STORE EXTERNAL LLM CONTENT AUTHORING
→ 공통 Prompt Core
→ LlmAssistPanel
→ ChatGPT로 작업
→ 일반 콘텐츠/제작자료 외부 LLM 흐름
```

이번 WO는 목적별 제작 화면:

```text
POP
QR
Blog
상품 설명
다국어 상품 콘텐츠
```

을 같은 외부 LLM 제작 계약으로 정렬한다.

최종 목표:

```text
제품 / 자료 / 기존 콘텐츠
        ↓
O4O Source Context
        ↓
목적별 Prompt
        ↓
사용자의 ChatGPT 등 외부 AI
        ↓
결과 HTML
        ↓
O4O 목적별 편집 화면
        ↓
사용자 확인·수정
        ↓
기존 저장 / 발행 / QR / POP 실행
```

---

## 1. 핵심 원칙

이번 WO에서도 AI 역할 분리를 유지한다.

```text
ChatGPT 등 외부 AI
= 작성
= 재작성
= 요약
= 목적별 변환
= 번역/현지화

O4O
= 정확한 Source Context
= 목적별 Prompt
= 편집기
= 저장
= 템플릿
= POP/QR/Blog 실행
= 다국어 페이지
= 공개/발행 상태
```

새로운 O4O LLM backend를 만들지 않는다.

---

## 2. 시작 기준

작업 시작 시 항상 최신 main.

```bash
git fetch origin
git status -sb
git pull --ff-only
```

본 WO 작성 당시 확인한 main은 `8eb16083b`였으나 **실행 기준으로 고정하지 않는다.**

현재 `origin/main`이 더 진행되었다면 반드시 최신 main을 사용한다.

다른 세션이 동일 파일을 수정 중이면 해당 파일 작업을 즉시 중지하고 보고한다.

---

## 3. 선행 WO 계약 유지

반드시 유지:

```text
showInternalAi={false}
```

Store-facing RichTextEditor에서:

```text
AI 정리 복원 금지
AiContentModal 재연결 금지
/api/ai/content 신규 연결 금지
```

한다.

WO 2의:

```text
buildStoreContentAuthoringPrompt()
STORE_LLM_ASSIST_LABEL='ChatGPT로 작업'
LlmAssistPanel
```

을 재사용한다.

---

## 4. Fresh Census — 현재 TARGET_SPECIFIC 13

WO 2 CHECK 기준 미변경 대상은 13개였다.

### KPA — 6

```text
PharmacyBlogPage
PharmacyPopPage
StoreLocalProductsPage
StoreProductDescriptionsPage
StoreProductMultilingualContentPage
StoreQrAiDescriptionPage
```

### K-Cosmetics — 3

```text
StoreBlogManagePage
StorePopStaffPage
StoreProductDescriptionsPage
```

### PharmacyHub — 4

```text
BlogEditorPage
PopPage
ProductDescriptionsPage
StoreProductMultilingualContentPage
```

합계:

```text
TARGET_SPECIFIC = 13
```

구현 직전 최신 main에서 다시 census하고 CHECK에 실제 최종 수를 기록한다.

---

## 5. 13개 화면의 목적별 분류

### Blog

```text
KPA PharmacyBlogPage
KCos StoreBlogManagePage
PH BlogEditorPage
```

### POP

```text
KPA PharmacyPopPage
KCos StorePopStaffPage
PH PopPage
```

### 상품 설명

```text
KPA StoreLocalProductsPage
KPA StoreProductDescriptionsPage
KCos StoreProductDescriptionsPage
PH ProductDescriptionsPage
```

### 다국어 상품 콘텐츠

```text
KPA StoreProductMultilingualContentPage
PH StoreProductMultilingualContentPage
```

### QR

```text
KPA StoreQrAiDescriptionPage
```

---

## 6. Prompt Core 확장

현재:

```ts
StoreContentLlmTask =
  | 'create'
  | 'revise';
```

를 목적별 작업까지 확장한다.

권장:

```ts
export type StoreContentLlmTask =
  | 'create'
  | 'revise'
  | 'pop'
  | 'qr'
  | 'blog'
  | 'product-description'
  | 'translate';
```

새 Prompt Builder를 화면별로 만들지 않는다.

기존:

```ts
buildStoreContentAuthoringPrompt()
```

하나를 확장한다.

---

## 7. Context additive 확장

필요한 경우 현재 Context에 additive 필드를 추가한다.

예:

```ts
referenceText?: string | null;
referenceHtml?: string | null;

sourceLocale?: string | null;
targetLocale?: string | null;
```

용도:

```text
QR 코너 항목
POP 참고 문안
다국어 기준 언어 본문
상품 설명 참고자료
```

를 전달하기 위함이다.

원칙:

> **현재 화면에 이미 존재하는 정보만 Context로 사용한다.**

새 API 호출을 Prompt Builder 안에 넣지 않는다.

---

## 8. 공통 Output Contract 유지

모든 task에 공통:

```text
설명 없이 결과 HTML만 반환
주어진 사실 외 새로운 사실 생성 금지
확인되지 않은 사실 단정 금지
script 금지
외부 CSS/JS 금지
일반 HTML + 필요 시 inline style
```

건강·의약 관련 Context이면 기존 health guard를 그대로 적용한다.

---

## 9. Blog Task

`task='blog'`

목적:

> 현재 자료와 사실을 바탕으로 매장 블로그용 본문을 작성하거나 기존 글을 다듬는다.

결과 계약:

```text
본문 HTML만 반환
h1은 사용하지 않음
제목은 O4O 제목 입력칸에서 별도 관리
도입부
h2/h3 소제목
본문
필요한 목록
마무리
```

ChatGPT가 O4O의 slug나 발행 상태를 만들지 않는다.

---

## 10. POP Task

`task='pop'`

목적:

> 매장에서 짧은 시간에 읽을 수 있는 POP 문안으로 재구성.

결과 계약:

```text
짧고 명확한 제목
핵심 문구
2~5개 정도의 짧은 포인트
필요 시 짧은 안내 본문
과도한 장문 금지
확인되지 않은 효능·효과 생성 금지
```

POP 디자인/PDF 생성은 기존 O4O 기능이 담당한다.

LLM은 POP 문안만 만든다.

---

## 11. QR Task

`task='qr'`

목적:

> QR을 스캔한 사용자가 모바일 화면에서 읽을 안내 콘텐츠 작성.

결과 계약:

```text
모바일 가독성 중심
짧은 도입
핵심 설명
필요한 항목/목록
과도한 장문 금지
HTML만 반환
```

QR slug, QR row, landing 연결은 O4O가 담당한다.

ChatGPT가 QR을 생성하지 않는다.

---

## 12. Product Description Task

`task='product-description'`

가장 엄격한 사실성 계약을 적용한다.

```text
제공된 제품정보만 사용
제품명만 보고 성분 추측 금지
제품명만 보고 효능 추측 금지
원문에 없는 사용법/주의사항 생성 금지
질병 치료·예방 표현 추가 금지
확인되지 않은 수치 생성 금지
```

결과:

```text
매장 고객이 읽기 좋은 상품 상세 HTML
```

이다.

---

## 13. Translate Task

다국어 상품 콘텐츠에는:

```text
task='translate'
```

를 사용한다.

원칙:

> 단순 직역보다 해당 언어 사용자에게 자연스럽게 읽히도록 표현은 다듬되, 원문의 사실과 의미는 변경하지 않는다.

Prompt Context:

```text
sourceLocale
targetLocale
referenceHtml
productName
현재 target locale HTML(있으면)
```

결과 조건:

```text
targetLocale로만 작성
원문의 제품 사실 추가/삭제 금지
숫자·단위·제품명 임의 변경 금지
의학/건강 의미 강화 금지
HTML 구조 반환
```

---

## 14. 다국어 Source 선택

현재 다국어 페이지에는 locale별 draft가 이미 메모리에 존재한다.

외부 AI 작업 시 우선순위:

```text
1. target locale 기존 본문
   → 있으면 revise/translate 참고

2. defaultLocale 본문
   → 있으면 번역 기준 source

3. 한국어 본문
   → defaultLocale에 내용이 없을 때 보조 source

4. 아무 기준 본문도 없음
   → 제품명만으로 제품 사실을 만들어 작성하지 않음
```

새 backend fetch를 만들지 않는다.

---

## 15. 공통 UI

목적별 화면에서도 대표 CTA는 동일하게:

```text
[ChatGPT로 작업]
```

사용한다.

내부 구현:

```text
LlmAssistPanel
```

재사용.

화면마다 별도 AI 컴포넌트를 만들지 않는다.

`contextLabel`에서 목적만 설명한다.

---

## 16. Blog 적용

### KPA

```text
PharmacyBlogPage
```

현재 editor/settings는 공통 `StoreBlogEditorPanel`을 사용한다.

KPA 고유 목록 구조는 유지한다.

외부 LLM assist를 editor 영역에 추가한다.

Context:

```text
task = blog
title = editorTitle
currentHtml = editorContent
```

자료함에서 넘어온 Source Context가 이미 존재하면 그것만 추가한다.

---

### K-Cosmetics

```text
StoreBlogManagePage
→ StoreBlogManageView
→ StoreBlogEditorPanel
```

현재 `renderEditor` slot 방식이다.

가능하면 공통 View/Panel에 additive assist slot을 연다.

예:

```ts
renderAssist?: (...) => ReactNode
```

또는 동일 목적의 최소 slot.

`store-ui-core`가 `@o4o/content-editor`를 직접 import하지 않는다.

서비스 wrapper에서:

```text
LlmAssistPanel
RichTextEditor
```

을 주입한다.

---

### PharmacyHub

```text
BlogEditorPage
```

standalone 구조이므로 동일 Prompt Core + LlmAssistPanel을 직접 적용한다.

새 별도 Prompt 복사본 작성 금지.

---

## 17. POP 적용

### KPA

```text
PharmacyPopPage
```

현재 운영자 HUB POP 사본 수정 화면.

editor에서:

```text
task='pop'
title=editTitle
currentHtml=editContent
referenceText=editExcerpt
```

등 현재 화면 데이터만 사용한다.

---

### KCos / PharmacyHub

공통 POP staff View가 존재하는 경우:

```text
StorePopStaffView
```

에 additive assist slot을 여는 방식을 우선한다.

각 서비스 페이지에 POP Prompt 문구를 복제하지 않는다.

---

## 18. POP V2 경계

이번 WO의 외부 LLM 대상은 **POP 문안 작성/수정**이다.

기존:

```text
POP V2 template
layout
render
PDF
store_execution_assets
```

는 변경하지 않는다.

POP 출력 엔진을 다시 설계하지 않는다.

---

## 19. 상품 설명 공통 View 적용

현재:

```text
StoreProductDescriptionsView
```

가 KPA/KCos/PH 상품 설명 화면 본체를 공통화하고 있다.

이미:

```text
renderEditor
```

slot이 존재한다.

여기에 필요하면:

```ts
renderAssist?: (ctx: {
  product: StoreDescriptionProduct;
  value: string;
  onApplyHtml: (html: string) => void;
}) => ReactNode;
```

와 같은 최소 additive slot을 추가한다.

실제 이름은 최신 코드 구조에 맞게 조정 가능하다.

---

## 20. 상품 설명 Context

Prompt:

```text
task='product-description'
productName=selectedProduct.name
currentHtml=content
referenceText=prefillNote(있으면)
```

단 `selectedProduct.summary` 등 현재 데이터가 실제 저장된 설명이라면 참고 가능하지만, 제품명만으로 새로운 제품정보를 유추하지 않는다.

---

## 21. StoreLocalProductsPage

KPA의 `StoreLocalProductsPage`는 자체 상품 등록/수정 modal 안에서 RichTextEditor를 사용한다.

여기의 detail HTML도:

```text
task='product-description'
```

으로 통일한다.

별도의 `local-product AI` task를 만들지 않는다.

Context:

```text
제품명
현재 상세 HTML
현재 폼에 존재하는 명시적 정보
```

만 사용한다.

---

## 22. 다국어 상품 콘텐츠 적용

대상:

```text
KPA StoreProductMultilingualContentPage
PH StoreProductMultilingualContentPage
```

active locale 편집기 옆에:

```text
[ChatGPT로 작업]
```

추가.

Prompt Core:

```text
task='translate'
```

사용.

결과는 현재 active locale draft의 `html`에만 반영한다.

---

## 23. 다국어 자동 발행 금지

ChatGPT 결과 적용 후:

```text
자동 임시저장 금지
자동 발행 금지
자동 QR 생성 금지
```

기존:

```text
임시 저장
저장 후 이 언어 발행
```

버튼을 사용자가 직접 눌러야 한다.

---

## 24. QR 현재 상태

현재 KPA에 독립적인 내부 AI 경로가 남아 있다.

```text
/store/marketing/qr/ai-description
→ StoreQrAiDescriptionPage
→ POST /api/ai/qr-description
```

현재 구조:

```text
단일 상품
코너·다품목
강조점
       ↓
Gemini
       ↓
HTML 생성
       ↓
store-content 저장
       ↓
QR 생성
```

---

## 25. 이번 WO의 QR 처리 원칙

이번 WO에서는 **외부 LLM 경로를 먼저 완성한다.**

삭제는 하지 않는다.

`StoreQrAiDescriptionPage`에:

```text
[ChatGPT로 작업]
```

경로를 추가한다.

Source Context는 현재 사용자가 이미 입력한:

```text
single:
  productName
  emphasis

corner:
  cornerName
  emphasis
  item names
  item emphasis
```

만 사용한다.

---

## 26. QR Prompt Context

single 예:

```text
task = qr
productName = productName
referenceText = emphasis
```

corner 예:

```text
task = qr
title = cornerName
referenceText =
  코너명
  전체 강조점
  상품 1 / 강조점
  상품 2 / 강조점
  ...
```

ChatGPT가 각 제품의 성분·효능을 제품명만으로 만들지 않도록 명시한다.

---

## 27. QR 외부 결과 반영

ChatGPT 결과 HTML:

```text
→ editorContent
```

에 반영.

그 뒤 기존:

```text
콘텐츠 저장
→ QR 생성
```

흐름을 사용한다.

자동 QR 생성하지 않는다.

---

## 28. QR legacy 내부 AI는 유지

이번 WO에서는 다음을 삭제하지 않는다.

```text
handleGenerate()
POST /api/ai/qr-description
qrDescription prompt
Gemini 호출
legacy route
```

WO 4에서 consumer 0 여부를 확인한 후 처분한다.

---

## 29. QR provenance 정확성

외부 ChatGPT 결과를 기존 Gemini 결과처럼 저장하면 안 된다.

현재 legacy 저장에는:

```text
generatedBy='gemini-qr-description'
tags=['AI 설명']
```

등이 존재한다.

외부 LLM 경로에서는:

```text
generatedBy='gemini-qr-description'
```

를 절대 기록하지 않는다.

Provider-specific 신규:

```text
generatedBy='chatgpt'
```

도 만들지 않는다.

외부 결과는 사용자가 편집·확정한 Store direct 콘텐츠로 취급한다.

필요하면 기존 manual/direct 의미를 사용하거나 provider provenance 자체를 생략한다.

---

## 30. QR `aiDescription` legacy metadata

현재 QR landing의 코너 표현 등에:

```text
contentJson.aiDescription
```

가 실제 구조 데이터로 쓰이는지 fresh census한다.

구조적으로 필요한:

```text
mode
cornerName
items
relatedKeys
```

등이 있다면 외부 LLM 결과에서도 **사용자가 화면에 입력한 구조정보**를 저장할 수 있다.

그러나 AI provider 결과라는 의미로 저장하지 않는다.

스키마 이름 정리/rename은 WO 4 또는 별도 후속으로 둔다.

---

## 31. 내부 AI 버튼 우선순위

WO 3 종료 시 목표는:

> 목적별 화면에서 O4O 내부 AI가 콘텐츠 제작에 반드시 필요하지 않다.

즉:

```text
STORE_TARGET_SPECIFIC_INTERNAL_AI_REQUIRED=0
```

이다.

이번 단계에서:

```text
STORE_INTERNAL_AI_ACTIVE=0
```

까지 요구하지 않는다.

그것은 WO 4 종료조건이다.

---

## 32. 공통 View 우선

이미 공통화된:

```text
StoreBlogEditorPanel
StoreBlogManageView
StorePopStaffView
StoreProductDescriptionsView
```

가 있으면 개별 서비스에 같은 UI 코드를 2~3번 복사하지 않는다.

원칙:

```text
공통 View
→ optional slot/context 제공

서비스 wrapper
→ LlmAssistPanel + Prompt Core 주입
```

이다.

`store-ui-core` 제로 의존 원칙을 깨지 않는다.

---

## 33. LlmAssistPanel 재사용

새:

```text
PopAiPanel
BlogAiPanel
QrAiPanel
ProductDescriptionAiPanel
```

등을 만들지 않는다.

모두:

```text
LlmAssistPanel
```

을 사용한다.

차이는:

```text
guideText
contextLabel
currentHtml
onApplyHtml
```

뿐이다.

---

## 34. Prompt duplication 금지

서비스 파일마다 Prompt 전문을 만들지 않는다.

Prompt canonical source:

```text
packages/store-ui-core/src/llm/storeContentAuthoringPrompt.ts
```

하나로 유지한다.

---

## 35. 저장 원장 변경 금지

이번 WO는 authoring realignment다.

다음 원장을 바꾸지 않는다.

```text
store_blog_posts
store_pops
store_local_products
store_multilingual_product_content_groups/pages
kpa_store_contents
store_qr_codes
```

기존 API와 상태 전이 유지.

---

## 36. Backend 변경 원칙

목표:

```text
NEW_LLM_BACKEND_API=0
DB_MIGRATION=0
```

frontend Prompt/authoring 경계가 중심이다.

기존 저장 API를 수정해야 한다면 additive 최소 변경만 허용하고 반드시 이유를 CHECK에 기록한다.

LLM 실행을 위한 backend 추가는 금지한다.

---

## 37. 발행 정책 변경 금지

다음 기존 동작은 유지한다.

```text
Blog draft/publish/archive
POP copy/edit
Product description save
Multilingual draft/publish
QR create/public landing
```

외부 LLM 결과가 발행 권한을 갖지 않는다.

---

## 38. 실행 결과 자동화 금지

ChatGPT 결과 적용은:

```text
편집기에 넣기
```

일 뿐이다.

다음 금지:

```text
적용과 동시에 저장
적용과 동시에 발행
적용과 동시에 QR 생성
적용과 동시에 PDF 생성
```

사용자가 기존 실행 버튼을 눌러야 한다.

---

## 39. WebMCP 비범위

이번 WO에서도:

```text
WebMCP
Site tools
ChatGPT 직접 O4O read
ChatGPT 직접 O4O write
```

는 하지 않는다.

복사/붙여넣기 흐름을 먼저 완성한다.

---

## 40. 내부 AI 삭제 비범위

삭제 금지:

```text
AiContentModal
/api/ai/content
/api/ai/qr-description
ai-proxy.routes
ai-prompts
product AI backend
```

실제 Store consumer 제거는 WO 4.

---

## 41. `aiRequestHeaders` 비범위

WO 1 이후 dead 가능성이 있는:

```text
aiRequestHeaders
getAccessToken for editor AI
```

는 이번 WO에서 일괄 정리하지 않는다.

WO 4에서 Store 내부 AI residue census 후 제거한다.

현재 수정 파일에서 확실히 dead이고 다른 용도 0인 경우에만 제한적으로 정리할 수 있다.

---

## 42. Fresh Census 필수

구현 전 다음을 최신 main에서 재검색한다.

```text
TARGET_SPECIFIC 13
RichTextEditor
LlmAssistPanel
buildStoreContentAuthoringPrompt
/api/ai/
AiContentModal
qr-description
generatedBy
aiDescription
```

13개 각각을:

```text
BLOG
POP
PRODUCT_DESCRIPTION
MULTILINGUAL
QR
```

로 확정한다.

---

## 43. 구현 순서

### Phase A — Prompt Core

```text
StoreContentLlmTask 확장

pop
qr
blog
product-description
translate
```

Context additive 확장.

unit test 추가.

---

### Phase B — 공통 View slots

필요한 공통 View에만 최소 optional slot/context 추가.

우선 후보:

```text
StoreBlogEditorPanel / StoreBlogManageView
StorePopStaffView
StoreProductDescriptionsView
```

기존 소비처 default 동작 불변.

---

### Phase C — Blog

```text
KPA
KCos
PH
```

3서비스 적용.

---

### Phase D — POP

```text
KPA
KCos
PH
```

3서비스 적용.

---

### Phase E — 상품 설명

```text
KPA StoreLocalProductsPage

KPA StoreProductDescriptionsPage
KCos StoreProductDescriptionsPage
PH ProductDescriptionsPage
```

적용.

---

### Phase F — 다국어

```text
KPA StoreProductMultilingualContentPage
PH StoreProductMultilingualContentPage
```

적용.

---

### Phase G — QR

```text
KPA StoreQrAiDescriptionPage
```

에 외부 LLM 경로 추가.

legacy 내부 AI는 유지.

---

### Phase H — Re-census

TARGET_SPECIFIC 13 전체 확인.

목표:

```text
TARGET_SPECIFIC_WITHOUT_EXTERNAL_LLM_ENTRY=0
```

실제로 LLM authoring이 의미 없는 화면이 발견되면 이유를 CHECK에 기록하고 census에서 제외 판정한다.

---

## 44. Prompt Core 테스트

최소 다음을 결정적으로 테스트한다.

```text
blog
pop
qr
product-description
translate
```

각 task별:

```text
task instruction 존재
공통 HTML contract 존재
사실 생성 금지 존재
health guard 유지
additionalInstruction 유지
referenceText 반영
referenceHtml 반영
locale 조건 반영
```

---

## 45. Source Contract Test

새 source-contract spec 권장:

```text
store-production-external-llm-realignment-contract.spec.ts
```

검증:

```text
TARGET_SPECIFIC 13 census drift

모든 대상에 external LLM entry 존재

showInternalAi=false 유지

Store AiContentModal 신규 연결 0

/api/ai/content 신규 호출 0

QR legacy /api/ai/qr-description만 예외로 명시

Prompt 전문 서비스별 duplication 금지
```

---

## 46. Build / Typecheck

최소:

```text
@o4o/store-ui-core
@o4o/content-editor

web-kpa-society
web-k-cosmetics
pharmacy-hub-web
```

build/typecheck.

---

## 47. Browser Smoke — Blog

가능하면:

```text
블로그 작성/수정
→ ChatGPT로 작업
→ Prompt 복사
→ HTML 붙여넣기
→ 편집기에 넣기
→ 저장
→ 재조회
```

확인.

---

## 48. Browser Smoke — POP

```text
POP 사본 수정
→ ChatGPT로 작업
→ 결과 반영
→ 저장
→ 재조회
```

확인.

POP V2/PDF 기능 회귀도 최소 확인.

---

## 49. Browser Smoke — 상품 설명

```text
상품 선택
→ ChatGPT로 작업
→ 결과 HTML 적용
→ 저장
→ 재선택
→ 내용 유지
```

확인.

---

## 50. Browser Smoke — 다국어

```text
한국어 기준본문 존재
→ English 탭
→ ChatGPT로 작업
→ English 결과 반영
→ 임시저장
```

확인.

자동 발행되지 않아야 한다.

---

## 51. Browser Smoke — QR

```text
상품명/코너 정보 입력
→ ChatGPT로 작업
→ 결과 HTML 적용
→ 사용자 검토
→ 저장/QR 생성
→ 공개 landing
```

확인.

외부 LLM path에서:

```text
generatedBy='gemini-qr-description'
```

가 저장되지 않아야 한다.

---

## 52. 인증 blocker

선행 WO 1·2에서:

```text
401 INVALID_USER
403 lockout
```

으로 브라우저 smoke가 막혀 있다.

동일 blocker가 지속되면 auth를 이번 WO에서 수정하지 않는다.

다음까지 완료 후:

```text
implementation
tests
build
deploy
bundle verification
```

브라우저 smoke만:

```text
PENDING_USER_VERIFICATION
```

로 기록 가능하다.

상태:

```text
CLOSED_WITH_SMOKE_PENDING
```

허용.

---

## 53. 완료 기준

다음을 모두 만족해야 한다.

```text
STORE_PRODUCTION_EXTERNAL_LLM=PASS

STORE_BLOG_EXTERNAL_LLM=PASS
STORE_POP_EXTERNAL_LLM=PASS
STORE_PRODUCT_DESCRIPTION_EXTERNAL_LLM=PASS
STORE_MULTILINGUAL_EXTERNAL_LLM=PASS
STORE_QR_EXTERNAL_LLM=PASS

TARGET_SPECIFIC_WITHOUT_EXTERNAL_LLM_ENTRY=0

STORE_TARGET_SPECIFIC_INTERNAL_AI_REQUIRED=0

STORE_INTERNAL_AI_REINTRODUCED=0

AUTO_SAVE_FROM_LLM=0
AUTO_PUBLISH_FROM_LLM=0
AUTO_QR_CREATE_FROM_LLM=0

PROMPT_CORE_SINGLE_SOURCE=PASS

NEW_LLM_BACKEND_API=0
DB_MIGRATION=0
```

---

## 54. 이번 WO 이후 남아 있어도 정상인 것

```text
StoreQrAiDescriptionPage legacy internal generate
/api/ai/qr-description

Store aiRequestHeaders 잔존

Store-related dead AI imports/helpers 일부

공통 AiContentModal
/api/ai/content
```

이들은 WO 4 대상이다.

---

## 55. 후속 WO 4

다음:

```text
WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1
```

에서 실제 잔존 consumer를 전수 census한다.

대상 후보:

```text
StoreQrAiDescriptionPage legacy Gemini generation
/api/ai/qr-description Store consumer
Store dead aiRequestHeaders
Store dead getAccessToken
Store AI 전용 labels
Store generatedBy/provider legacy
Store dormant AI wiring
```

consumer 0 또는 대체경로 확인 후 제거한다.

---

## 56. 후속 WO 5

마지막:

```text
WO-O4O-STORE-AI-FIRST-E2E-CLOSURE-V1
```

전체 실행 검증:

```text
제품/자료
↓
ChatGPT
↓
매장 콘텐츠
↓
POP
QR
Blog
상품 설명
PDF
태블릿
사이니지
```

그리고 WO 1~3의 browser smoke pending까지 함께 닫는다.

---

## 57. Git 규칙

작업 흐름:

```text
fresh census
→ 구현
→ 테스트
→ build
→ deploy
→ smoke
→ CHECK
→ push
```

path-specific stage만 사용.

```bash
git add .
```

금지.

다른 세션의 WIP 파일은 수정·stage·commit하지 않는다.

---

## 58. 문서

작업 문서:

```text
docs/work-orders/WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1.md
```

완료 후:

```text
docs/checks/CHECK-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1.md
```

작성.

---

## 59. 최종 구조

이번 WO 완료 후 Store 제작은 다음 하나의 원칙으로 통일되어야 한다.

```text
                  O4O Source Context
                         ↓
              Store Prompt Core
                         ↓
                ChatGPT로 작업
                         ↓
                    결과 HTML
                         ↓
       ┌────────┬────────┬────────┬────────┐
       ↓        ↓        ↓        ↓        ↓
      POP       QR      Blog    상품설명   다국어
       ↓        ↓        ↓        ↓        ↓
       기존 O4O 저장·발행·실행 시스템
```

**콘텐츠 작성은 외부 AI, 실제 매장 실행은 O4O**라는 경계를 완성하는 것이 본 WO의 목표다.
