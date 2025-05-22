# Task: 관리자 대시보드 (요약 카드 기반) 구성

## 🎯 목적
관리자가 로그인 후 가장 먼저 확인할 수 있는 홈 화면에서 전체 서비스 상태를 한눈에 파악할 수 있도록 요약 정보를 카드 형태로 제공한다.

---

## ✅ 구현할 기능

### 1. 관리자 대시보드 페이지 (`/admin/dashboard`)
- 보호 라우트 적용 (`AdminProtectedRoute`)
- 관리자 로그인 시 진입 가능

### 2. 요약 카드 UI 구성
- 총 상품 수 (`GET /admin/products`)
- 총 주문 수 (`GET /admin/orders`)
- 최근 주문 수 / 오늘 등록된 상품 수 등 (가능한 경우)
- 각 카드 클릭 시 해당 상세 페이지로 이동 (선택사항)

### 3. 시각 요소 구성
- Tailwind 기반 카드 레이아웃
- 각 항목별 아이콘, 수치 강조
- 에러 또는 로딩 처리 포함

---

## 🧩 기술 스택
- React + TailwindCSS
- 데이터 API: Medusa Admin API
- 보호 라우트: `AdminProtectedRoute`

---

## 🧪 테스트 조건
- `/admin/dashboard`에서 관리자 요약 정보 정상 출력
- API 응답값 반영 확인
- 인증되지 않은 경우 접근 차단

---

## 📌 확장 계획
- 시간대별 차트 (차후 Chart.js, Recharts 등)
- 상품/주문 상태별 통계 시각화
- 관리자 개인화 정보 (로그인 시간, 역할 등)

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-21-admin-dashboard.md`