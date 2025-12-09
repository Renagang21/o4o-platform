# Step 10 — ViewGenerator Implementation Work Order

## AI-Powered 자동 페이지 생성 엔진

**Version:** 2025-12
**Author:** ChatGPT PM
**경로:** `/docs/nextgen-frontend/tasks/step10_viewgenerator_workorder.md`

---

## 0. 목표

NextGen Frontend의 **최종 단계**로, **ViewGenerator**를 구현하여:

- 자연어 프롬프트로 페이지 자동 생성
- View JSON 자동 생성
- Function Component 자동 매칭
- UI Component 자동 선택
- Layout 자동 추천
- AI-assisted 페이지 빌더 완성

을 통해 **코드 없이 페이지를 생성**할 수 있는 **No-Code / Low-Code 페이지 빌더**를 완성한다.

---

## 1. ViewGenerator란?

ViewGenerator는 다음 입력을 받아 View JSON을 자동 생성하는 엔진이다:

### 입력 (Input)

```typescript
{
  prompt: "상품 목록 페이지를 만들어줘. 검색창과 필터가 있고, 그리드로 표시해줘.",
  context: {
    user: { role: "admin" },
    availableComponents: ["ProductCard", "SearchBar", "FilterPanel"],
    availableFunctions: ["productList", "cart"],
    availableLayouts: ["ShopLayout", "DefaultLayout"]
  }
}
```

### 출력 (Output)

```json
{
  "viewId": "product-list-generated",
  "meta": {
    "title": "상품 목록",
    "route": "/products"
  },
  "layout": {
    "type": "ShopLayout"
  },
  "components": [
    {
      "type": "SearchBar",
      "props": { "placeholder": "상품 검색..." }
    },
    {
      "type": "FilterPanel",
      "props": { "categories": ["전체", "화장품", "의류"] }
    },
    {
      "type": "productList",
      "props": {
        "fetch": { "url": "/api/products", "method": "GET" }
      }
    }
  ]
}
```

---

## 2. 작업 범위

### ✔ 2.1 ViewGenerator Core Engine

**경로:** `apps/main-site-nextgen/src/generator/ViewGenerator.ts`

```typescript
export class ViewGenerator {
  constructor(
    private componentRegistry: ComponentRegistry,
    private functionRegistry: FunctionRegistry,
    private layoutRegistry: LayoutRegistry
  ) {}

  async generate(prompt: string, context: GeneratorContext): Promise<ViewSchema> {
    // 1. Prompt 분석
    const intent = await this.analyzeIntent(prompt);

    // 2. Component 선택
    const components = await this.selectComponents(intent, context);

    // 3. Layout 선택
    const layout = await this.selectLayout(intent, context);

    // 4. View JSON 생성
    const viewSchema = this.buildViewSchema(layout, components);

    return viewSchema;
  }

  private async analyzeIntent(prompt: string): Promise<Intent> {
    // LLM or Rule-based intent analysis
    return {
      pageType: "product-list",
      features: ["search", "filter", "grid"],
      dataSource: "/api/products"
    };
  }

  private async selectComponents(intent: Intent, context: GeneratorContext) {
    // Component matching logic
    const selected = [];

    if (intent.features.includes("search")) {
      selected.push({ type: "SearchBar", props: {} });
    }

    if (intent.features.includes("filter")) {
      selected.push({ type: "FilterPanel", props: {} });
    }

    // Find matching function component
    const funcComponent = this.functionRegistry[intent.pageType];
    if (funcComponent) {
      selected.push({
        type: intent.pageType,
        props: {
          fetch: { url: intent.dataSource, method: "GET" }
        }
      });
    }

    return selected;
  }

  private async selectLayout(intent: Intent, context: GeneratorContext) {
    // Layout selection logic
    if (intent.pageType.includes("product") || intent.pageType.includes("shop")) {
      return { type: "ShopLayout" };
    }

    if (intent.pageType.includes("dashboard")) {
      return { type: "DashboardLayout" };
    }

    return { type: "DefaultLayout" };
  }

  private buildViewSchema(layout: any, components: any[]): ViewSchema {
    return {
      viewId: `generated-${Date.now()}`,
      meta: {
        title: "Generated Page",
        route: "/generated"
      },
      layout,
      components
    };
  }
}
```

---

### ✔ 2.2 Prompt Analyzer (Rule-based)

**경로:** `apps/main-site-nextgen/src/generator/PromptAnalyzer.ts`

```typescript
export class PromptAnalyzer {
  analyze(prompt: string): Intent {
    const intent: Intent = {
      pageType: this.detectPageType(prompt),
      features: this.detectFeatures(prompt),
      dataSource: this.detectDataSource(prompt)
    };

    return intent;
  }

  private detectPageType(prompt: string): string {
    const patterns = {
      "product-list": /상품.*목록|제품.*리스트|products.*list/i,
      "product-detail": /상품.*상세|제품.*상세|product.*detail/i,
      "cart": /장바구니|쇼핑.*카트|cart/i,
      "checkout": /결제|체크아웃|checkout/i,
      "login": /로그인|sign.*in|login/i,
      "signup": /회원가입|가입|sign.*up|register/i,
      "dashboard": /대시보드|dashboard/i,
      "profile": /프로필|profile|내.*정보/i
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(prompt)) return type;
    }

    return "default";
  }

  private detectFeatures(prompt: string): string[] {
    const features: string[] = [];

    if (/검색|search/i.test(prompt)) features.push("search");
    if (/필터|filter/i.test(prompt)) features.push("filter");
    if (/그리드|grid/i.test(prompt)) features.push("grid");
    if (/리스트|list/i.test(prompt)) features.push("list");
    if (/페이지네이션|pagination/i.test(prompt)) features.push("pagination");
    if (/정렬|sort/i.test(prompt)) features.push("sort");

    return features;
  }

  private detectDataSource(prompt: string): string {
    // Extract API endpoint from prompt or use defaults
    const apiPatterns = {
      "product": "/api/products",
      "order": "/api/orders",
      "user": "/api/users",
      "cart": "/api/cart"
    };

    for (const [key, endpoint] of Object.entries(apiPatterns)) {
      if (new RegExp(key, "i").test(prompt)) {
        return endpoint;
      }
    }

    return "/api/data";
  }
}
```

---

### ✔ 2.3 ViewGenerator CLI Tool

**경로:** `apps/main-site-nextgen/scripts/generate-view.ts`

```typescript
#!/usr/bin/env node

import { ViewGenerator } from "../src/generator/ViewGenerator";
import { ComponentRegistry } from "../src/components/registry";
import { FunctionRegistry } from "../src/components/registry/function";
import { LayoutRegistry } from "../src/layouts/registry";
import fs from "fs";

async function main() {
  const prompt = process.argv[2];

  if (!prompt) {
    console.error("Usage: pnpm generate-view \"상품 목록 페이지를 만들어줘\"");
    process.exit(1);
  }

  const generator = new ViewGenerator(
    ComponentRegistry,
    FunctionRegistry,
    LayoutRegistry
  );

  const context = {
    user: { role: "admin" },
    availableComponents: Object.keys(ComponentRegistry),
    availableFunctions: Object.keys(FunctionRegistry),
    availableLayouts: Object.keys(LayoutRegistry)
  };

  console.log("🤖 Generating view from prompt...");
  console.log(`📝 Prompt: "${prompt}"`);
  console.log("");

  const viewSchema = await generator.generate(prompt, context);

  const outputPath = `src/views/${viewSchema.viewId}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(viewSchema, null, 2));

  console.log(`✅ View generated: ${outputPath}`);
  console.log(`🌐 Route: ${viewSchema.meta.route}`);
  console.log(`📄 Layout: ${viewSchema.layout.type}`);
  console.log(`🧩 Components: ${viewSchema.components.length}`);
}

main();
```

**사용 예시:**

```bash
pnpm generate-view "상품 목록 페이지를 만들어줘. 검색창과 필터가 있고, 그리드로 표시해줘."
```

---

### ✔ 2.4 Web UI (Optional - Advanced)

**경로:** `apps/main-site-nextgen/src/admin/ViewGeneratorUI.tsx`

React 기반 페이지 빌더 UI:

```tsx
export function ViewGeneratorUI() {
  const [prompt, setPrompt] = useState("");
  const [generatedView, setGeneratedView] = useState<ViewSchema | null>(null);

  const handleGenerate = async () => {
    const generator = new ViewGenerator(...);
    const view = await generator.generate(prompt, context);
    setGeneratedView(view);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">AI Page Generator</h1>

      <textarea
        className="w-full h-32 p-4 border rounded"
        placeholder="어떤 페이지를 만들까요?"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <button
        onClick={handleGenerate}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded"
      >
        페이지 생성
      </button>

      {generatedView && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-2">Generated View</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(generatedView, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

---

## 3. 개발 단계 (Phase A–F)

### Phase A — ViewGenerator Core

ViewGenerator 클래스 구현

### Phase B — PromptAnalyzer

Rule-based intent detection

### Phase C — Component Selector

Registry 기반 컴포넌트 매칭

### Phase D — CLI Tool

`generate-view` 스크립트 완성

### Phase E — Web UI (Optional)

React 기반 페이지 빌더

### Phase F — AI Integration (Advanced)

OpenAI/Claude API 연동 (optional)

**총 예상 시간:** 12시간

---

## 4. AI Integration (Advanced - Optional)

LLM API를 사용하여 더 정교한 페이지 생성:

```typescript
import OpenAI from "openai";

export class AIViewGenerator extends ViewGenerator {
  private openai: OpenAI;

  async analyzeIntent(prompt: string): Promise<Intent> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a page generator. Analyze the user's request and return a JSON object with:
- pageType: string (e.g., "product-list", "cart", "login")
- features: string[] (e.g., ["search", "filter", "grid"])
- dataSource: string (e.g., "/api/products")`
        },
        { role: "user", content: prompt }
      ]
    });

    return JSON.parse(response.choices[0].message.content);
  }
}
```

---

## 5. 성공 기준 (DoD)

- [ ] ViewGenerator 클래스 구현 완료
- [ ] PromptAnalyzer rule-based 분석 작동
- [ ] Component 자동 선택 로직 완성
- [ ] Layout 자동 선택 로직 완성
- [ ] CLI 도구 `pnpm generate-view` 작동
- [ ] 생성된 View JSON이 ViewRenderer에서 정상 렌더링
- [ ] 최소 10개 이상의 페이지 타입 지원
- [ ] Web UI (Optional) 구현
- [ ] AI Integration (Optional) 구현

---

## 6. 사용 시나리오

### 시나리오 1: CLI로 페이지 생성

```bash
$ pnpm generate-view "관리자 대시보드를 만들어줘. 통계 카드와 최근 주문 목록이 필요해."

🤖 Generating view from prompt...
📝 Prompt: "관리자 대시보드를 만들어줘. 통계 카드와 최근 주문 목록이 필요해."

✅ View generated: src/views/admin-dashboard-generated.json
🌐 Route: /admin/dashboard
📄 Layout: DashboardLayout
🧩 Components: 3
  - AdminStatsCard
  - OrderListView
  - AdminDashboardPanel
```

### 시나리오 2: Web UI로 페이지 생성

1. 관리자가 `/admin/page-builder` 접속
2. 텍스트 입력: "상품 상세 페이지를 만들어줘"
3. "페이지 생성" 버튼 클릭
4. View JSON 미리보기
5. "저장" 버튼으로 파일 저장
6. 자동으로 라우팅 등록

---

## 7. 향후 확장 (Future Roadmap)

### Step 11 — Component Generator

View뿐만 아니라 **Custom Component 자동 생성**:

```bash
$ pnpm generate-component "리뷰 카드 컴포넌트를 만들어줘. 별점, 작성자, 내용이 표시되어야 해."
```

### Step 12 — Full-Stack Generator

Backend API까지 자동 생성:

```bash
$ pnpm generate-fullstack "블로그 관리 시스템"
# → View JSON + API Routes + Database Schema 자동 생성
```

---

## ✅ Step 10 — ViewGenerator Work Order 생성 완료

이제 NextGen Frontend는:

- ✅ **Step 1-4:** Priority 기능 완성
- ✅ **Step 5-7:** 추가 우선순위 기능
- ✅ **Step 8:** 라우팅 자동화
- ✅ **Step 9:** 성능 최적화
- ✅ **Step 10:** AI 페이지 생성

**완전한 No-Code/Low-Code Frontend 플랫폼**으로 진화합니다! 🚀
