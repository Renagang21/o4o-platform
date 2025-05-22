
# 🧾 Task 07: 사용자 로그인 및 인증 흐름 구현

## 📌 목적
사용자가 로그인하고, 인증된 상태에서 주문 내역 등을 확인할 수 있도록 인증 기능을 구현한다.

---

## ✅ 요구 기능

- 로그인 페이지 (`/login`)
  - 이메일, 비밀번호 입력
  - Medusa API: `POST /store/auth`
  - 성공 시 JWT 토큰 저장 (localStorage 또는 Zustand)
  - 로그인 후 `/` 또는 `/profile`로 이동

- 로그아웃 기능
  - 로그아웃 버튼 클릭 시 JWT 제거 및 `/login`으로 이동

- 인증 상태 관리
  - Zustand 또는 Context API로 로그인 상태 전역 관리
  - 인증이 필요한 페이지 보호 (예: `/orders`, `/profile` 등)
  - 인증되지 않은 사용자가 접근 시 `/login`으로 리디렉션

---

## 🧱 구현 방식

- 로그인 페이지: `o4o-platform/services/ecommerce/web/src/pages/Login.tsx`
- 인증 상태: `src/store/authStore.ts`
- 보호 라우트: `src/components/ProtectedRoute.tsx`
- API 연동: Medusa `/store/auth` 사용
- TailwindCSS 스타일 적용

---

## 🔐 참고 API

Medusa Store API:
- 로그인: `POST /store/auth`
- 사용자 정보 확인: `GET /store/customers/me`
- 로그아웃: 클라이언트에서 토큰 제거

---

## ⏭️ 다음 작업 연결

- Task-08: 사용자 프로필 페이지 (`/profile`)
