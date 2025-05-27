
# 🧾 Task 03: 장바구니 페이지 (`/cart`) 구현

## 📌 목적
사용자가 담은 상품을 확인하고 수량을 조절하거나 삭제할 수 있는 장바구니 페이지를 구현한다.

---

## ✅ 요구 기능

- 경로: `/cart`
- 표시 요소:
  - 담긴 상품 리스트
  - 썸네일, 상품명, 가격, 수량
  - 수량 조절 버튼 (+ / -)
  - 삭제 버튼
  - 총 금액 표시
  - `/checkout` 페이지로 이동 버튼
- 로컬스토리지 연동

---

## 🧱 구현 방식

- 파일 경로: `o4o-platform/services/ecommerce/web/src/pages/Cart.tsx`
- Zustand 기반 상태 관리 (파일: `/src/store/cartStore.ts`)
- TailwindCSS 적용
- 총 합계 계산 포함
- 반응형 디자인 적용

---

## 🔗 상태 예시

```ts
type CartItem = {
  productId: string;
  title: string;
  thumbnail: string;
  price: number;
  quantity: number;
};
```

---

## ⏭️ 다음 작업 연결

- Task-04: 결제 및 주문 페이지 (`/checkout`)
