
# 🧾 Task 12: 관리자 상품 / 주문 / 사용자 관리 기능 구현

## 📌 목적
관리자 패널 내에서 운영자가 상품, 주문, 사용자 정보를 실시간으로 조회/수정할 수 있도록 기능별 관리 UI를 구현한다.

---

## ✅ 요구 기능

### 1. 상품 관리 (`/admin/products`)
- 상품 목록 조회 (API: GET `/admin/products`)
- 상품 등록 버튼 → 상품 생성 폼 (모달 또는 별도 페이지)
- 상품 수정/삭제 기능 (편집 버튼 클릭 시 입력 가능)

### 2. 주문 관리 (`/admin/orders`)
- 주문 리스트 조회 (API: GET `/admin/orders`)
- 주문 상세 정보 보기 (`/admin/orders/:id`)
- 주문 상태 변경 드롭다운 (예: 처리중 → 배송중 → 완료)

### 3. 사용자 관리 (`/admin/users`)
- 회원 목록 조회 (API: GET `/admin/customers`)
- 사용자 상세 정보 보기
- 차단/탈퇴/관리자 권한 부여 등의 제어 버튼

---

## 🧱 구현 방식

- 레이아웃 유지: `AdminLayout.tsx` 그대로 사용
- 각 페이지 위치:
  - `src/pages/admin/Products.tsx`
  - `src/pages/admin/Orders.tsx`
  - `src/pages/admin/OrderDetail.tsx`
  - `src/pages/admin/Users.tsx`
- 테이블 UI: TailwindCSS + 테이블 컴포넌트 또는 커스텀 구성
- 모든 API 연동 시 관리자 인증 헤더 포함(JWT)

---

## 🔐 참고 API

- Medusa Admin API
  - `/admin/products`
  - `/admin/orders`
  - `/admin/orders/:id`
  - `/admin/customers`
- 또는 별도 백오피스 전용 API 설계 가능

---

## ⏭️ 다음 작업 연결

- Task-13: 관리자 활동 로그 또는 통계 차트 시각화
