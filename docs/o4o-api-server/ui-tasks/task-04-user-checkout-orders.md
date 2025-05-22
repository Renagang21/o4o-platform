# Task: 사용자 주문 생성 및 주문 목록 확인 UI

## 🎯 목적
사용자가 장바구니에 담은 상품을 주문으로 전환하고, 주문 내역을 확인할 수 있는 UI를 구현한다.  
실제 결제(PG)는 추후 연동 예정이며, 현재는 더미 처리 기반으로 구현한다.

---

## ✅ 구현할 기능 목록

### 1. 주문 페이지 (`/checkout`)
- localStorage의 장바구니 데이터를 기반으로 주문 생성
- 입력 필드: 이름, 연락처, 주소, 메모
- "주문하기" 버튼 클릭 시 주문 정보 localStorage에 저장 또는 Medusa API로 전송
- 주문 완료 시 `/orders`로 이동

### 2. 주문 목록 페이지 (`/orders`)
- localStorage에 저장된 주문 목록을 테이블로 출력
- 상품명, 수량, 총합계, 주문일시 표시
- 최신 주문이 위로 정렬

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 저장: localStorage
- Router: `react-router-dom`

---

## 🧪 테스트 조건
- 장바구니에서 `/checkout`으로 이동 가능해야 함
- 주문 후 새로고침해도 `/orders`에 기록이 남아야 함
- 빈 주문 목록일 경우 "주문 내역이 없습니다" 메시지 출력

---

## 📌 확장 계획
- 향후 Medusa 주문 API 연동으로 실제 주문 데이터와 연결
- PG사 결제 연동 전, 내부 주문 흐름 테스트 목적

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-04-user-checkout-orders.md`