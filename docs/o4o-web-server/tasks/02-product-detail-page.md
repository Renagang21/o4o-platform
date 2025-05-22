
# 🧾 Task 02: 상품 상세 페이지 (`/product/:id`) 구현

## 📌 목적
상품 목록에서 개별 상품을 클릭하면 상세 정보를 볼 수 있도록 상세 페이지를 구현한다.

---

## ✅ 요구 기능

- 경로: `/product/:id`
- API: `GET /store/products/:id`
- 표시 요소:
  - 상품명
  - 썸네일 이미지
  - 가격 (옵션 포함 시 가격 범위)
  - 설명 (없으면 placeholder)
  - "장바구니에 담기" 버튼 → 클릭 시 `addToCart()` + `navigate("/cart")`
- 로딩 및 에러 상태 처리

---

## 🧱 구현 방식

- 파일 경로: `o4o-platform/services/ecommerce/web/src/pages/ProductDetail.tsx`
- React Router의 `useParams`로 `:id` 추출
- Zustand의 `addToCart()` 상태 사용
- TailwindCSS 스타일 적용

---

## 🔗 참고 API

Medusa Store API: `/store/products/:id`

예상 응답: 
```json
{
  "product": {
    "id": "prod_123",
    "title": "제품명",
    "thumbnail": "url",
    "description": "설명",
    "variants": [
      {
        "prices": [{ "amount": 10000 }]
      }
    ]
  }
}
```

---

## ⏭️ 다음 작업 연결

- Task-03: 장바구니 페이지 (`/cart`)
