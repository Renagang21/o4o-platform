
# 🧾 Task 06: 주문 완료 후 확인 페이지 (`/order/confirmation`) 구현

## 📌 목적
사용자가 주문을 성공적으로 완료한 후, 주문 요약 정보를 확인할 수 있는 확인 페이지를 제공한다.

---

## ✅ 요구 기능

- 경로: `/order/confirmation`
- 표시 요소:
  - 주문 성공 메시지
  - 주문 번호
  - 총 금액
  - 주문 날짜
  - "주문 내역 보기" 버튼 (`/orders`로 이동)
- 상태: 주문 완료 시 전달된 정보를 localStorage 또는 상태로 유지
- TailwindCSS 스타일 적용

---

## 🧱 구현 방식

- 파일: `o4o-platform/services/ecommerce/web/src/pages/OrderConfirmation.tsx`
- 주문 완료 시 API 응답에서 필요한 정보를 로컬 상태나 로컬스토리지에 저장
- 페이지 진입 시 해당 정보가 없을 경우 `/`로 리디렉션 처리

---

## ⏭️ 다음 작업 연결

- Task-07: 사용자 인증 기능 (로그인 / 로그아웃)
