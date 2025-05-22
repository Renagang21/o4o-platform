
# 🛒 Task 01: 상품 목록 화면 (`/shop`) 구현

## 📌 목적
o4o 플랫폼 사용자들이 상품을 탐색할 수 있도록, `/shop` 경로에 카드 UI 형태의 상품 목록 화면을 구성한다. Medusa Store API와 연동한다.

---

## ✅ 요구 기능

- 경로: `/shop`
- API: `GET /store/products`
- 표시 요소: 상품명, 이미지(썸네일), 가격, 상세 링크
- 스타일: TailwindCSS 사용
- 인증: 로그인 없이 접근 가능

---

## 🧱 구현 방식

- React 페이지 파일: `o4o-platform/services/ecommerce/web/src/pages/Shop.tsx`
- 카드 컴포넌트: `o4o-platform/services/ecommerce/web/src/components/ProductCard.tsx`
- 라우터 설정: `o4o-platform/services/ecommerce/web/src/routes/index.tsx`
- API 에러 처리 및 로딩 상태 처리 포함

---

## 🔗 참고 API
Medusa Store API: `/store/products`  
예상 응답: `{ products: [{ id, title, thumbnail, variants[{ prices[] }] }] }`

---

## ⏭️ 다음 작업 연결
- Task-02: `/product/:id` 상세 페이지 구성
- Task-03: 장바구니 상태관리 구성
