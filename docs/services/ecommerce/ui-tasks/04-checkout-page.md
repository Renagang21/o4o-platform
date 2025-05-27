
# 🧾 Task 04: 결제 및 주문 확인 페이지 (`/checkout`) 구현

## 📌 목적
사용자가 장바구니를 확인하고 주문을 완료할 수 있도록 결제 및 주문 확인 페이지를 구현한다.

---

## ✅ 요구 기능

- 경로: `/checkout`
- 표시 요소:
  - 배송지 정보 입력 (이름, 주소, 연락처 등)
  - 장바구니 상품 목록 요약
  - 총 주문 금액 표시
  - 주문 버튼 클릭 시 API 호출하여 주문 생성
  - 주문 완료 후 확인 메시지 또는 주문 상세로 이동
- 상태 관리: 기존 장바구니 상태 활용
- 에러 및 로딩 처리 포함

---

## 🧱 구현 방식

- React 페이지 파일: `o4o-platform/services/ecommerce/web/src/pages/Checkout.tsx`
- 상태: 장바구니 정보는 Zustand에서 불러오기
- TailwindCSS 사용
- 폼 유효성 검사 적용 (기본 validation 또는 라이브러리 사용 가능)

---

## 🔗 참고 API

Medusa Store API:
- `/store/carts`
- `/store/orders`
- 또는 커스텀 결제 API 연동 가능

---

## ⏭️ 다음 작업 연결

- Task-05: 주문 내역 페이지 (`/orders`)
