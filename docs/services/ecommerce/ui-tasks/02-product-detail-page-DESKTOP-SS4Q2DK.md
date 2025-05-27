
# 🧾 Task 02: 상품 상세 페이지 (`/product/:id`) 구현

## 📌 목적
사용자가 상품 목록에서 상품을 클릭하면 해당 상품의 상세 정보를 확인할 수 있도록 상세 페이지를 구현한다.

---

## ✅ 요구 기능

- 경로: `/product/:id`
- API: `GET /store/products/:id`
- 표시 요소:
  - 상품명
  - 이미지(썸네일)
  - 가격
  - 설명 (필요 시 메타 정보 활용)
  - 장바구니에 담기 버튼
- 로딩 및 에러 상태 처리 포함

---

## 🧱 구현 방식

- React 페이지 파일: `o4o-platform/services/ecommerce/web/src/pages/ProductDetail.tsx`
- React Router의 `useParams`를 사용하여 `:id` 추출
- API 호출 후 데이터 렌더링
- TailwindCSS 사용

---

## 🔗 참고 API

Medusa Store API: `/store/products/:id`  
예상 응답: `{ product: { id, title, thumbnail, description, variants[{ prices[] }] } }`

---

## ⏭️ 다음 작업 연결

- Task-03: 장바구니 상태 관리 및 장바구니 페이지 (`/cart`)
