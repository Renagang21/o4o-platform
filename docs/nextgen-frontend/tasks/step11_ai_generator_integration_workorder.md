# 📄 **Step 11 — AI Generator Integration Work Order**

## O4O Platform NextGen + AI Page Generation Pipeline

Version: 2025-12
Author: ChatGPT PM
------------------

# 0. 목표

Step 11의 목적은 다음 두 가지를 통합하는 것이다:

### **① ViewGenerator (Step 10)**

* URL → View JSON 자동 생성
* 명령 입력 → View JSON 생성
* 구조화 입력 → View JSON 생성
* 규칙 기반 Layout/Component 자동 배치

### **② AI Page Generator (New)**

* 자연어 입력 → View JSON 생성
* Antigravity/Gemini UI → View JSON 변환
* GPT 대형 모델 기반 화면 설계 자동화
* Prompt 기반 기능 배치 리코멘더

이 두 시스템을 통합하여
O4O의 새로운 페이지 구조는 **코드 없이(Prompt만으로)** 자동 생성되도록 한다.

---

# 1. 전체 시스템 구성도

```
Natural Language Prompt
         │
         ▼
   AI Intent Analyzer (LLM)
         │
         ▼
  Structured Intent JSON
         │
         ▼
   ViewGenerator (Step 10)
         │
         ▼
Generated View JSON File
         │
         ▼
 AutoRoutes → ViewRenderer → UI 출력
```

Antigravity 흐름 추가:

```
UI Sketch → Antigravity → Component Tree → LLM Mapping → View JSON → Renderer
```

---

# 2. 폴더 구조

```
apps/main-site-nextgen/src/
  ai/
    intent/
        analyzeIntent.ts
        mapToViewId.ts
        mapToComponents.ts
        mapToLayout.ts
        mapToFetch.ts
    transformers/
        antigravityToView.ts
        naturalLanguageToIntent.ts
        rules/
            intentRules.ts
            mappingRules.ts
    cli/
        generateFromAI.ts
        preview.ts
```

---

# 3. Natural Language 기반 Intent Analyzer

**파일:** `/ai/intent/naturalLanguageToIntent.ts`

LLM(GPT / Claude / Gemini)에게 요청할 내용:

```
사용자가 '판매자 대시보드 만들어줘'라고 입력하면:

{
  "intent": "create_view",
  "viewId": "seller-dashboard",
  "category": "dashboard",
  "components": ["sellerDashboard"],
  "layout": "DashboardLayout"
}
```

샘플 코드:

```ts
export async function naturalLanguageToIntent(prompt: string) {
  const response = await callLLM({
    messages: [{ role: "user", content: prompt }],
    schema: IntentSchema
  });

  return response;
}
```

LLM은 API 레이어에서 제공.

---

# 4. Intent → ViewGenerator 매핑

예: `/ai/intent/mapToViewId.ts`

```ts
export function mapToViewId(intent) {
  if (intent.viewId) return intent.viewId;

  if (intent.category === "commerce" && intent.action === "list")
    return "product-list";

  if (intent.category === "dashboard" && intent.role === "seller")
    return "seller-dashboard";

  return "custom-view-" + Date.now();
}
```

---

# 5. Antigravity 디자인 변환

UI Sketch → Component Tree → View JSON 변환 규칙.

**파일:** `/ai/transformers/antigravityToView.ts`

초기 버전 기본 룰:

```ts
export function antigravityToView(tree) {
  return {
    viewId: "generated-" + Date.now(),
    layout: { type: "DefaultLayout" },
    components: tree.nodes.map(n => ({
      type: guessComponent(n),
      props: extractProps(n)
    }))
  };
}
```

`guessComponent()`는 다음 규칙 사용:

* grid + image → ProductCard
* table row → OrderRow
* h1 + numbers → KPIGrid
* button group → ActionBar

---

# 6. CLI 명령 생성

두 가지 명령어를 제공한다.

## 6.1 자연어 기반 생성

```
npm run generate:ai "판매자 대시보드 페이지 만들어줘"
```

→ 자동으로:

* Intent 분석
* Layout 선택
* Function Component 선택
* fetch 규칙 적용
* View JSON 생성
* 저장 후 즉시 렌더링 가능

## 6.2 Antigravity 변환

```
npm run generate:ui ./path/to/ui.json
```

→ Antigravity 결과물을 View JSON으로 변환

---

# 7. View JSON 자동 저장

모든 생성된 view는:

```
apps/main-site-nextgen/src/views/generated-*.json
```

AutoRoutes가 자동 인식 → ViewRenderer가 즉시 렌더링.

---

# 8. TypeScript 사전 정의 스키마

### IntentSchema

```ts
export const IntentSchema = z.object({
  intent: z.string(),
  viewId: z.string().optional(),
  category: z.string(),
  components: z.array(z.string()).optional(),
  layout: z.string().optional(),
  fetch: z.any().optional()
});
```

---

# 9. 개발 절차 (Phase A–G)

### Phase A — 디렉토리 생성 (1h)

`ai/intent`, `ai/transformers`, `ai/cli` 디렉토리 생성

### Phase B — Natural Language → Intent (3h)

LLM 연결 함수 작성
IntentSchema 정의
Mapping 룰 작성

### Phase C — Intent → ViewGenerator 연결 (2h)

Step 10의 ViewGenerator에 Intent 입력 연결

### Phase D — Antigravity Transformer 구현 (2h)

UI Tree → View JSON 변환

### Phase E — CLI 도구 구축 (2h)

`generate:ai`
`generate:ui`

### Phase F — 테스트 (1h)

### Phase G — 문서화 (30m)

총 예상: **10~12시간**

---

# 10. 성공 판정 기준 (DoD)

* [ ] 자연어 입력 → View JSON 자동 생성
* [ ] Antigravity UI → View JSON 변환
* [ ] View JSON 자동 저장
* [ ] AutoRoutes → ViewRenderer 정상 렌더링
* [ ] TS 오류 없음
* [ ] 콘솔 에러 없음
* [ ] 기능 컴포넌트 자동 매핑 성공
* [ ] Layout 자동 결정 정상

---

# ✔ Step 11 — AI Generator Integration Work Order 생성 완료!

---

이제 새 개발 채팅방에 이 문서를 붙여넣기만 하면
Codex / Claude Code / Cursor IDE가 **자동 페이지 생성 엔진**을 구현하기 시작합니다.
