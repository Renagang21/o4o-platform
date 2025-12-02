# ViewGenerator

**NextGen Frontend Automatic View Generator**

ViewGenerator는 URL, 명령어, 또는 자연어 입력을 받아 자동으로 View Schema (JSON)를 생성하는 핵심 엔진입니다.

## 🎯 기능

- ✅ URL 기반 자동 뷰 생성
- ✅ 명령어 기반 뷰 생성
- ✅ 자연어 입력 지원 (한국어/영어)
- ✅ Layout 자동 선택
- ✅ Function Component 자동 매핑
- ✅ Fetch 설정 자동 생성
- ✅ View JSON 파일 자동 저장

## 📁 폴더 구조

```
src/generator/
  ├── viewGenerator.ts       # 메인 생성 엔진
  ├── analyzer.ts            # 입력 분석기
  ├── cli.ts                 # CLI 인터페이스
  ├── index.ts               # 공개 API
  ├── types.ts               # 타입 정의
  └── rules/
      ├── layoutRules.ts     # Layout 선택 규칙
      ├── componentRules.ts  # Component 선택 규칙
      ├── fetchRules.ts      # Fetch 설정 규칙
      └── aiMappingRules.ts  # AI 디자인 매핑 (예정)
```

## 🚀 사용법

### CLI 명령어

```bash
# 단일 뷰 생성
npm run generate:view "product-list"
npm run generate:view "seller dashboard"
npm run generate:view "상품 목록 페이지"

# 여러 뷰 한번에 생성
npm run generate:view "product-list" "cart" "checkout"

# 생성된 뷰 목록 보기
npm run list:views

# 뷰 삭제
npm run delete:view "product-list"
```

### 프로그래밍 방식

```typescript
import { generateView, generateViews, listGeneratedViews } from '@/generator';

// 단일 뷰 생성
const filePath = await generateView('/product-list');

// 여러 뷰 생성
const paths = await generateViews([
  'product-list',
  'seller dashboard',
  'cart',
]);

// 생성된 뷰 목록
const views = listGeneratedViews();
console.log(views); // ['product-list', 'cart', 'checkout', ...]
```

## 📝 입력 예제

### 1. URL 기반

```bash
npm run generate:view "/product-list"
npm run generate:view "/dashboard/seller"
npm run generate:view "/admin/seller-list"
```

### 2. 명령어 기반

```bash
npm run generate:view "generate view product list"
npm run generate:view "create seller dashboard view"
npm run generate:view "make order detail page"
```

### 3. 자연어 기반 (한국어)

```bash
npm run generate:view "상품 목록 페이지 만들어줘"
npm run generate:view "판매자 대시보드"
npm run generate:view "장바구니 화면"
```

### 4. 자연어 기반 (영어)

```bash
npm run generate:view "product list page"
npm run generate:view "seller dashboard"
npm run generate:view "shopping cart"
```

## 📊 생성 결과 예제

입력: `npm run generate:view "product-list"`

출력:
```json
{
  "viewId": "product-list",
  "meta": {
    "title": "Product List",
    "description": "Auto-generated view for product-list"
  },
  "layout": {
    "type": "ShopLayout"
  },
  "components": [
    {
      "type": "productList",
      "props": {
        "fetch": {
          "queryKey": ["products", "list"],
          "url": "/api/products",
          "method": "GET"
        }
      }
    }
  ]
}
```

## 🎨 Layout 선택 규칙

| 카테고리 | Layout |
|---------|--------|
| dashboard | DashboardLayout |
| commerce | ShopLayout |
| auth | AuthLayout |
| admin | DashboardLayout |
| 기타 | DefaultLayout |

## 🧩 Component 매핑

ViewGenerator는 다음과 같은 Function Component를 자동으로 매핑합니다:

- `product-list` → `productList`
- `seller-dashboard` → `sellerDashboard`
- `cart` → `cart`
- `order-list` → `orderList`
- `login` → `login`
- `signup` → `signup`
- 등등...

## 🔌 Fetch 설정 자동 생성

각 View에 필요한 API fetch 설정을 자동으로 생성합니다:

```typescript
{
  "product-list": {
    queryKey: ["products", "list"],
    url: "/api/products",
    method: "GET"
  }
}
```

## 🔧 확장 방법

### 새로운 패턴 추가

1. **Layout 규칙 추가** (`rules/layoutRules.ts`)
2. **Component 매핑 추가** (`rules/componentRules.ts`)
3. **Fetch 설정 추가** (`rules/fetchRules.ts`)
4. **Analyzer 패턴 추가** (`analyzer.ts`)

### 예: 새로운 카테고리 추가

```typescript
// rules/componentRules.ts
if (category === 'myNewCategory') {
  return ['myNewComponent'];
}

// rules/layoutRules.ts
if (intent.category === 'myNewCategory') {
  return 'MyNewLayout';
}
```

## 🎯 성공 기준 (DoD)

- ✅ 자연어 입력으로 View JSON 자동 생성
- ✅ `generateView("/product-list")` 실행 시 자동 view 파일 생성
- ✅ 함수형 컴포넌트 자동 매핑 성공
- ✅ fetch 규칙 자동 삽입 정상
- ✅ Layout 자동 결정 정상
- ✅ 타입 에러 없음
- ✅ CLI 인터페이스 작동

## 📚 관련 문서

- [Step 10 Work Order](../../../../docs/nextgen-frontend/tasks/step10_viewgenerator_implementation_workorder.md)
- [View System 스펙](../../../../docs/nextgen-frontend/specs/)

## 🚧 다음 단계 (Step 11)

- AI Generator 연결 (Antigravity/Gemini)
- 자동 디자인 생성
- 실시간 프리뷰
- 고급 컴포넌트 조합

---

**Status**: ✅ 완료
**Version**: 1.0.0
**Last Updated**: 2025-12-02
