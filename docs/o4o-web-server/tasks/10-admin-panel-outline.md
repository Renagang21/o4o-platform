
# 🧾 Task 10: 관리자 패널 초기 구성 (`/admin/*`) 구현

## 📌 목적
플랫폼 운영을 위한 관리자 전용 UI를 구성하고, 역할 기반 접근 제어와 초기 관리 기능을 준비한다.

---

## ✅ 요구 기능

### 관리자 홈 대시보드 (`/admin`)
- 운영 요약 정보 표시 (예: 총 주문 수, 총 매출, 신규 가입자 수)
- 관리자 전용 네비게이션 메뉴 제공

### 관리자 기능 초기 항목
- 상품 관리 (`/admin/products`)
- 주문 관리 (`/admin/orders`)
- 사용자 관리 (`/admin/users`)
- 대시보드 (`/admin/dashboard`)

---

## 🔐 인증 및 접근 제어

- 별도 관리자 로그인 페이지 (`/admin/login`)
- 상태 저장 방식: `adminAuthStore.ts` 또는 공통 `authStore.ts` 확장
- 보호 라우트: `AdminProtectedRoute.tsx`
- 일반 사용자 접근 시 `/403` 또는 `/login` 리디렉션

---

## 🧱 구현 방식

- 폴더 구조 예시:
  - `src/pages/admin/Dashboard.tsx`
  - `src/pages/admin/Products.tsx`
  - `src/pages/admin/Orders.tsx`
  - `src/pages/admin/Users.tsx`
- 관리자 메뉴는 왼쪽 사이드바 또는 상단 탭으로 구성
- TailwindCSS 및 아이콘 사용

---

## 💡 참고 포인트

- 관리자/사용자 역할 구분은 JWT에 포함된 정보 또는 로그인 시점의 API 응답 기반
- Medusa Admin API 또는 별도 내부 API로 연결 가능

---

## ⏭️ 다음 작업 연결

- Task-11: 관리자 로그인 및 권한 기반 메뉴 렌더링
