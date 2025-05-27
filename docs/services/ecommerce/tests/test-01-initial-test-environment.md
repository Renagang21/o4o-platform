
# 🧪 Test 01: 초기 테스트 환경 구성 문서

## 🎯 목적
o4o-platform의 주요 사용자 흐름과 관리자 기능을 통합적으로 점검할 수 있는 테스트 환경을 구성하기 위함입니다.

---

## ✅ 테스트 계정 정보

### 사용자 계정
- 이메일: testuser@example.com
- 비밀번호: test1234
- 역할: 일반 사용자
- 용도: 상품 탐색, 장바구니, 주문 테스트

### 관리자 계정
- 이메일: admin@super.com
- 비밀번호: admin1234
- 역할: superadmin
- 용도: 전체 관리자 패널 기능 점검

---

## 📦 테스트 데이터 샘플

### 테스트 상품
- 상품명: 테스트 혈당기 A
- 가격: 25,000원
- 재고: 100개
- 설명: 테스트용 기본 상품입니다.
- 생성 위치: /admin/products 또는 DB seed 스크립트

### 테스트 주문
- 주문번호: 자동 생성됨
- 사용자는 testuser@example.com
- 결제 상태: unpaid 또는 mock paid
- 확인 위치: /orders 또는 /admin/orders

---

## 🧭 점검 경로 목록 (우선 점검 대상)

| 항목 | 경로 |
|------|------|
| 사용자 상품 목록 | `/shop` |
| 상품 상세 페이지 | `/product/:id` |
| 장바구니 | `/cart` |
| 결제 페이지 | `/checkout` |
| 주문 완료 화면 | `/order/confirmation` |
| 주문 내역 페이지 | `/orders`, `/orders/:id` |
| 관리자 로그인 | `/admin/login` |
| 관리자 대시보드 | `/admin/dashboard` |
| 관리자 상품 관리 | `/admin/products` |
| 관리자 주문 관리 | `/admin/orders`, `/admin/orders/:id` |
| 관리자 사용자 관리 | `/admin/users` |

---

## 🛠️ 테스트 주의사항

- mock 데이터를 사용한 경우 상태 동기화 필요
- 관리자 보호 라우트가 적용되어 있어 권한 확인 필수
- localStorage에 JWT/token이 남아 있을 수 있음 → 브라우저 새로고침 후 확인

---

## 🧪 다음 테스트 문서

- `test-02-user-flow-checklist.md` (사용자 구매 흐름 점검 시나리오)
- `test-03-admin-panel-checklist.md` (관리자 기능별 UI/데이터 반응 점검)
