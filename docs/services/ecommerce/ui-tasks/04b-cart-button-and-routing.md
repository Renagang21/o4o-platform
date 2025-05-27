
# 🧾 Task 04b: 장바구니 담기 버튼 및 라우터 연결

## 📌 목적
상품 상세 페이지에서 장바구니에 상품을 담고, `/cart`로 이동할 수 있도록 UI와 기능을 마무리하고,
`/checkout` 경로를 라우터에 등록하여 전체 사용자 흐름을 완성한다.

---

## ✅ 요구 작업

### 1. 장바구니 담기 버튼 연결
- 위치: `ProductDetail.tsx`
- 작업:
  - Zustand의 `addToCart()` 함수 사용
  - 담은 후 `navigate("/cart")`로 이동

### 2. `/checkout` 라우터 연결
- 위치: `routes/index.tsx` 또는 메인 라우터 구성
- 작업:
  - `/checkout` 경로에 `Checkout.tsx` 컴포넌트 연결
  - 이미 생성된 파일 사용: `src/pages/Checkout.tsx`

---

## 🧱 구현 방식 예시

```tsx
// 상품 상세 페이지에서 장바구니에 추가
<button onClick={() => {
  addToCart(product); // 상태 저장
  navigate("/cart");  // 페이지 이동
}}>
  Add to Cart
</button>
```

```tsx
// 라우터 등록 예시 (React Router)
<Route path="/checkout" element={<Checkout />} />
```

---

## ⏭️ 다음 작업 연결

- Task-05: 주문 내역 페이지 (`/orders`)
