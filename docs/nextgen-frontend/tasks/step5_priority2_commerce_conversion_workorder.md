# 📄 **Priority 2 — Commerce Function Component 변환 Work Order**

## NextGen Frontend Commerce Migration Package

Version: 2025-12
Author: ChatGPT PM
경로: `/docs/nextgen-frontend/tasks/step5_priority2_commerce_conversion_workorder.md`

---

## 0. 목적

Commerce 영역은 전체 O4O 플랫폼의 "고객-facing 핵심 기능"입니다.
Priority 2 단계에서는 기존 main-site와 ecommerce 패키지에 흩어져 있는
**Commerce 관련 Shortcode 9개**를 NextGen Function Component + UI Component로 재구성합니다.

결과적으로:

* 상품 목록
* 상품 상세
* 장바구니
* 주문 화면
* 결제
* 카테고리 네비게이션

등의 화면이 NextGen ViewRenderer 기반으로 완전히 전환됩니다.

---

## 1. 변환 대상 목록 (총 9개)

다음 컴포넌트를 변환합니다:

| 카테고리     | 항목                | 설명            |
| -------- | ----------------- | ------------- |
| Product  | ProductList       | 상품 목록         |
| Product  | ProductGrid       | 카드 레이아웃 기반 목록 |
| Product  | ProductDetail     | 상품 상세 정보      |
| Category | CategoryNavigator | 카테고리 필터       |
| Cart     | CartItems         | 장바구니 상품 목록    |
| Cart     | CartSummary       | 장바구니 합계 정보    |
| Checkout | CheckoutForm      | 결제 폼          |
| Order    | OrderList         | 주문 내역         |
| Order    | OrderDetail       | 주문 상세         |

이들은 100% UI+데이터 구조로 분리되므로 NextGen 구조와 가장 잘 맞습니다.

---

## 2. 생성할 디렉토리 구조

```
apps/main-site-nextgen/src/
  shortcodes/_functions/commerce/
      productList.ts
      productDetail.ts
      cart.ts
      checkout.ts
      orderList.ts
      orderDetail.ts

  hooks/queries/commerce/
      useProductList.ts
      useProductDetail.ts
      useCart.ts
      useCheckout.ts
      useOrderList.ts
      useOrderDetail.ts

  components/ui/commerce/
      ProductCard.tsx
      ProductGrid.tsx
      ProductDetailView.tsx
      CartItem.tsx
      CartSummary.tsx
      CheckoutForm.tsx
      OrderRow.tsx
      OrderDetailView.tsx

  views/
      product-list.json
      product-detail.json
      cart.json
      checkout.json
      order-list.json
      order-detail.json
```

---

## 3. Fetch Hook 템플릿

예: 상품 목록

**파일:** `useProductList.ts`

```ts
export function useProductList() {
  return useQuery({
    queryKey: ["product-list"],
    queryFn: () => axios.get("/api/products").then(r => r.data)
  });
}
```

동일 패턴:

* useProductDetail
* useCart
* useCheckout
* useOrderList
* useOrderDetail

---

## 4. Function Component 템플릿

상품 목록:

**파일:** `productList.ts`

```ts
export const productList = (props, context) => {
  const data = props.data || [];

  return {
    type: "ProductGrid",
    props: {
      items: data.map(product => ({
        id: product.id,
        title: product.title,
        price: product.price,
        thumbnail: product.thumbnail,
      }))
    }
  };
};
```

상품 상세:

```ts
export const productDetail = (props, context) => {
  const data = props.data || {};

  return {
    type: "ProductDetailView",
    props: {
      title: data.title,
      price: data.price,
      description: data.description,
      image: data.image
    }
  };
};
```

---

## 5. UI Component 템플릿

### ProductCard.tsx

```tsx
export function ProductCard({ title, price, thumbnail }) {
  return (
    <div className="bg-white p-4 rounded shadow-sm">
      <img src={thumbnail} className="w-full mb-3 rounded" />
      <div className="font-semibold">{title}</div>
      <div className="text-gray-600">{price}원</div>
    </div>
  );
}
```

### ProductGrid.tsx

```tsx
export function ProductGrid({ items }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <ProductCard key={i} {...item} />
      ))}
    </div>
  );
}
```

---

## 6. View JSON 템플릿

**상품 목록 화면:**

`views/product-list.json`

```json
{
  "viewId": "product-list",
  "layout": { "type": "ShopLayout" },
  "components": [
    {
      "type": "productList",
      "props": {
        "fetch": {
          "queryKey": ["product-list"],
          "url": "/api/products"
        }
      }
    }
  ]
}
```

**상품 상세:**

```json
{
  "viewId": "product-detail",
  "layout": { "type": "ShopLayout" },
  "components": [
    {
      "type": "productDetail",
      "props": {
        "fetch": {
          "queryKey": ["product-detail"],
          "url": "/api/products/:id"
        }
      }
    }
  ]
}
```

---

## 7. URL 매핑

`view/loader.ts`에 추가:

```ts
"/shop": "product-list",
"/product/:id": "product-detail",
"/cart": "cart",
"/checkout": "checkout",
"/orders": "order-list",
"/orders/:id": "order-detail",
```

---

## 8. Component Registry 등록

`registry/function.ts`:

```ts
import {
  productList,
  productDetail,
  cart,
  checkout,
  orderList,
  orderDetail
} from "@/shortcodes/_functions/commerce";

export const FunctionRegistry = {
  productList,
  productDetail,
  cart,
  checkout,
  orderList,
  orderDetail,
};
```

`registry/ui.ts`:

```ts
export const UIComponentRegistry = {
  ProductCard,
  ProductGrid,
  ProductDetailView,
  CartItem,
  CartSummary,
  CheckoutForm,
  OrderRow,
  OrderDetailView,
};
```

---

## 9. 성공 판정 기준 (DoD)

* [ ] `product-list` View 렌더링 성공
* [ ] 상품 목록 UI 정상 표시
* [ ] 상품 상세 View 정상 렌더링
* [ ] 장바구니 View 정상 표시
* [ ] Checkout 화면 정상 작동
* [ ] Order 목록/상세 정상 표시
* [ ] 콘솔 에러 없음
* [ ] TypeScript 오류 없음
* [ ] Function Component → UI Component 흐름 정상

---

## 10. 예상 개발 시간

총 작업량: **약 24시간**

* Fetch Hooks: 4h
* Function Components: 8h
* UI Components: 6h
* View JSON: 3h
* Registry 등록: 1h
* 테스트/디버깅: 2h

---

## ✔ Priority 2 Commerce Work Order 생성 완료

---
