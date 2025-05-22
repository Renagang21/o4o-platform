
# 🧾 Task 03: 장바구니 페이지 (`/cart`) 구현

## 📌 목적
사용자가 상품을 선택한 후 결제 전까지 확인하고 조정할 수 있도록 장바구니 페이지를 구현한다.

---

## ✅ 요구 기능

- 경로: `/cart`
- 표시 요소:
  - 장바구니에 담긴 상품 목록
  - 각 상품의 썸네일, 이름, 수량, 가격
  - 수량 조절 버튼 (+ / -)
  - 상품 삭제 버튼
  - 총 합계 금액 표시
  - 결제 페이지(`/checkout`)로 이동 버튼
- 상태 관리: React Context 또는 Zustand 등 사용 가능
- 로컬스토리지와 연동하여 새로고침 시에도 유지

---

## 🧱 구현 방식

- React 페이지 파일: `o4o-platform/services/ecommerce/web/src/pages/Cart.tsx`
- 상태 관리 로직은 별도 디렉터리(`/src/store/cartStore.ts`)로 분리 가능
- TailwindCSS 사용

---

## 📦 예시 로컬 상태 구조

```ts
type CartItem = {
  productId: string;
  title: string;
  thumbnail: string;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};
```

---

## ⏭️ 다음 작업 연결

- Task-04: 결제 및 주문 확인 페이지 (`/checkout`)
