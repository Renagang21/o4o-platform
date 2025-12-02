# 📄 **Step 10 — ViewGenerator 구현 Work Order**

## NextGen Frontend Automatic View Generator

Version: 2025-12
Author: ChatGPT PM
------------------

# 0. 목표

ViewGenerator는 Block Editor/Template/Page 시스템을 완전히 대체하는
NextGen 프론트엔드의 핵심 엔진이다.

이 Work Order의 목적은:

* URL 또는 사용자 요청을 입력받아
* **View Schema(JSON)** 을 자동으로 생성하고
* main-site-nextgen/src/views/*.json 형태로 저장하며
* ViewRenderer가 즉시 렌더링할 수 있도록 하는
  **자동 생성 엔진을 구현하는 것**이다.

ViewGenerator는 다음 4가지 입력을 지원해야 한다:

1. URL 입력
2. 자연어 입력
3. 구조화 명령 입력
4. Antigravity/Gemini 기반 디자인 입력

---

# 1. 폴더 구조 생성

작업 경로:

```
apps/main-site-nextgen/src/
  generator/
      viewGenerator.ts
      rules/
          layoutRules.ts
          componentRules.ts
          fetchRules.ts
          aiMappingRules.ts
  views/
      (자동 생성되는 JSON 파일들)
  view/
      (loader / renderer — 이미 구현됨)
```

---

# 2. ViewGenerator 핵심 기능

ViewGenerator는 다음 단계를 수행해야 한다:

```
1. 입력 수신
2. URL 또는 의도 분석
3. 레이아웃 선택
4. 기능 컴포넌트 선택
5. UI 컴포넌트 선택
6. fetch 규칙 자동 생성
7. 최종 View JSON 조립
8. /views/ 폴더에 저장
9. AutoRoutes를 통해 자동 라우팅 반영
```

---

# 3. 입력(Input) 유형 4가지

## ✔ 3.1 URL 기반 자동 생성

예)

```
/product-list
/dashboard/seller
/orders
/admin/seller-list
```

ViewGenerator는 URL을 분석해 적절한 View를 생성한다.

## ✔ 3.2 명령(Command) 기반 입력

예)

```
generate view product list
create seller dashboard view
make order detail page for admin
```

## ✔ 3.3 자연어 기반 입력

예)

```
"반응형 그리드로 베스트셀러 8개를 보여주는 상품 목록 페이지 만들어줘."
```

## ✔ 3.4 AI 디자인(Input JSON) 기반 입력

Antigravity/Gemini가 생성한 구조 기반:

```json
{
  "layout": "Default",
  "sections": [
    ...
  ]
}
```

---

# 4. 로직 상세

---

## ✔ Step 1 — URL/명령 해석 (Analyzer)

```ts
function analyzeInput(input: string): AnalyzedIntent {
  // seller → seller dashboard
  // product → product list
  // admin sellers → admin seller list
  // /shop → product list
}
```

결과 예:

```ts
{
  viewId: "product-list",
  category: "commerce",
  action: "list"
}
```

---

## ✔ Step 2 — Layout 선택 (layoutRules.ts)

규칙:

| 패턴                      | Layout          |
| ----------------------- | --------------- |
| dashboard               | DashboardLayout |
| shop/product/cart/order | ShopLayout      |
| auth/login/signup/reset | AuthLayout      |
| admin                   | DashboardLayout |
| fallback                | DefaultLayout   |

코드:

```ts
export function selectLayout(intent) {
  if (intent.category === "dashboard") return "DashboardLayout";
  if (intent.category === "commerce") return "ShopLayout";
  if (intent.category === "auth") return "AuthLayout";
  if (intent.category === "admin") return "DashboardLayout";
  return "DefaultLayout";
}
```

---

## ✔ Step 3 — 기능 컴포넌트 선택 (componentRules.ts)

예:

```ts
export function selectFunctionComponents(intent) {
  switch (intent.viewId) {
    case "seller-dashboard":
      return ["sellerDashboard"];
    case "product-list":
      return ["productList"];
    case "cart":
      return ["cart"];
    case "order-list":
      return ["orderList"];
    case "login":
      return ["login"];
    default:
      return [];
  }
}
```

여러 UI가 필요하면 2~3개의 function component를 선택.

---

## ✔ Step 4 — fetch 규칙 자동 생성 (fetchRules.ts)

예:

```ts
export function generateFetchConfig(viewId) {
  return {
    "product-list": {
      queryKey: ["product-list"],
      url: "/api/products"
    },
    "seller-dashboard": {
      queryKey: ["seller-dashboard"],
      url: "/api/seller/dashboard"
    }
  }[viewId];
}
```

---

## ✔ Step 5 — View Schema 조립 (viewGenerator.ts)

핵심 코드:

```ts
export async function generateView(input: string) {
  const intent = analyzeInput(input);
  const layout = selectLayout(intent);
  const components = selectFunctionComponents(intent);
  const fetchConf = generateFetchConfig(intent.viewId);

  const view = {
    viewId: intent.viewId,
    meta: { title: intent.viewId },
    layout: { type: layout },
    components: components.map((type) => ({
      type,
      props: fetchConf ? { fetch: fetchConf } : {}
    }))
  };

  const filePath = path.resolve(
    __dirname,
    `../views/${intent.viewId}.json`
  );

  fs.writeFileSync(filePath, JSON.stringify(view, null, 2));

  return filePath;
}
```

---

# 5. 개발 단계 (Phase A–F)

### **Phase A — 디렉토리/파일 생성 (1h)**

* generator 폴더
* rules 폴더
* viewGenerator.ts 파일 생성

### **Phase B — Input Analyzer 구현 (2h)**

* URL 패턴
* 명령 패턴
* 의도(intent) 구조 설계

### **Phase C — Layout Rules 구현 (1h)**

* Category → Layout 매핑 함수 적용

### **Phase D — Component Selection Rules 구현 (3h)**

* Function Component 매핑
* fallback rules

### **Phase E — Fetch Rule Engine 구현 (1h)**

* viewId → fetch 설정 자동화

### **Phase F — View Assembly + File Output 구현 (2h)**

* JSON 생성
* 저장
* Router 자동 반영 테스트

총 예상: **9~11시간**

---

# 6. 성공 기준 (DoD)

* [ ] 자연어 입력으로 View JSON 자동 생성
* [ ] `generateView("/product-list")` 실행 시 자동 view 파일 생성
* [ ] 모든 NextGen 화면 URL이 자동 라우팅됨
* [ ] 함수형 컴포넌트 자동 매핑 성공
* [ ] fetch 규칙 자동 삽입 정상
* [ ] Layout 자동 결정 정상
* [ ] 오류/TS 경고 없음
* [ ] 모든 JSON 파일 up-to-date

---

# ✔ Step 10 — ViewGenerator 구현 Work Order 생성 완료

---

이제 이 문서를 개발 채팅방에 붙여넣으면
Codex / Claude Code / Cursor IDE가 바로 **자동 페이지 생성기(ViewGenerator)** 구현을 시작합니다.

필요하시면 Step 11 (AI Generator 연결 / Antigravity 자동화)도 바로 만들어드릴까요?
