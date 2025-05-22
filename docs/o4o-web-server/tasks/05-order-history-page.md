
# 🧾 Task 05: 주문 내역 페이지 (`/orders`, `/orders/:id`) 구현

## 📌 목적
사용자가 완료한 주문을 확인할 수 있도록 주문 목록 페이지와 주문 상세 페이지를 구현한다.

---

## ✅ 요구 기능

### `/orders` (주문 목록)
- Medusa API: `GET /store/orders`
- 표시 요소:
  - 주문 ID 또는 번호
  - 주문 일시
  - 총 주문 금액
  - 주문 상태
  - 각 주문 클릭 시 상세 페이지(`/orders/:id`)로 이동

### `/orders/:id` (주문 상세)
- Medusa API: `GET /store/orders/:id`
- 표시 요소:
  - 주문 ID, 상태, 날짜
  - 수령인 정보 (이름, 주소 등)
  - 주문한 상품 목록 (상품명, 수량, 가격)
  - 총 금액 요약

---

## 🧱 구현 방식

- 목록 페이지: `o4o-platform/services/ecommerce/web/src/pages/Orders.tsx`
- 상세 페이지: `o4o-platform/services/ecommerce/web/src/pages/OrderDetail.tsx`
- React Router 등록 필요
- API 호출 시 JWT 인증이 필요한 경우 추가
- TailwindCSS 사용

---

## 🔗 참고 API

Medusa Store API:
- `/store/orders`
- `/store/orders/:id`

---

## ⏭️ 다음 작업 연결

- Task-06: 주문 완료 후 확인 화면 또는 주문 추적 기능 (선택)
