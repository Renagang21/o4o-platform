# Task: 관리자 주문 관리 UI 구성

## 🎯 목적
관리자가 전체 주문 목록을 확인하고, 주문 상태를 변경하거나 삭제할 수 있는 주문 관리 UI를 구성한다.  
기존 사용자 주문 흐름과 연동되며, 주문 데이터는 OrderProvider 또는 localStorage 기반으로 관리된다.

---

## ✅ 구현할 기능 목록

### 1. 관리자 주문 목록 (`/admin/orders`)
- 전체 주문 데이터를 테이블로 표시
- 컬럼: 주문번호, 주문일시, 상태, 결제수단, 총금액
- "상세보기" 버튼 → `/orders/:id` 페이지로 이동

### 2. 주문 상태 변경
- 상태 드롭다운 또는 버튼 (예: "결제 완료" → "배송 중" → "배송 완료")
- 변경 즉시 localStorage 또는 전역 상태에 반영

### 3. 주문 삭제
- 주문 목록 행에서 "삭제" 버튼 제공
- 클릭 시 해당 주문을 목록 및 상태에서 제거

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 저장: OrderProvider 또는 localStorage
- 보호 라우트: 관리자 전용 경로에 `ProtectedRoute` 적용

---

## 🧪 테스트 조건
- 주문 목록이 전체 주문을 정확히 표시해야 함
- 상태 변경이 실시간으로 반영되어야 함
- 삭제 시 주문이 즉시 사라지고, 새로고침 후에도 유지되지 않아야 함

---

## 📌 확장 계획
- 주문 필터링(상태별), 검색 기능 추가
- Medusa backend 연동 시 실제 주문 상태 업데이트 API와 연동
- 관리자 인증 기능 연계

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-09-admin-order-management.md`