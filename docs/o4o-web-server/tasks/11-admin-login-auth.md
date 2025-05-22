
# 🧾 Task 11: 관리자 로그인 및 권한 기반 메뉴 렌더링 구현

## 📌 목적
운영자만 접근할 수 있는 관리자 페이지를 위해 별도의 로그인 기능과 권한 기반 라우팅 및 UI 렌더링을 구현한다.

---

## ✅ 요구 기능

### 관리자 로그인 페이지 (`/admin/login`)
- 이메일/비밀번호 입력 → 인증 요청
- 성공 시 JWT 및 관리자 정보 저장
- 로그인 후 `/admin/dashboard`로 이동
- 실패 시 에러 메시지 출력

### 관리자 인증 상태 관리
- `adminAuthStore.ts` 또는 `authStore.ts` 확장
- 상태 정보: 관리자 여부, 토큰, 이름 등
- localStorage에 JWT 저장

### 보호 라우트
- `AdminProtectedRoute.tsx` 컴포넌트
- 비인증 관리자 접근 시 `/admin/login` 또는 `/403` 리디렉션

### 관리자 메뉴 렌더링
- 네비게이션에서 일반 사용자와 구분
- 관리자만 접근 가능한 메뉴는 조건부 렌더링

---

## 🧱 구현 방식

- 로그인 페이지: `src/pages/admin/AdminLogin.tsx`
- 상태 관리: `adminAuthStore.ts`
- 보호 라우트: `AdminProtectedRoute.tsx`
- 메뉴 컴포넌트에서 `isAdminAuthenticated` 체크 후 조건부 렌더링

---

## 🔐 참고 API

Medusa Admin API 또는 커스텀 관리자 로그인 API  
(초기에는 사용자 로그인 API를 그대로 활용하여 관리자 권한만 필터링 가능)

---

## ⏭️ 다음 작업 연결

- Task-12: 관리자 기능별 실제 관리 UI (상품, 주문, 회원)
