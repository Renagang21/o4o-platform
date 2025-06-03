# 🧾 Task: neture.co.kr 로그인 및 회원가입 기능 구현 요청

## 📌 목적

현재 로그인 UI는 구성되어 있으나 실제 로그인/회원가입 동작이 구현되어 있지 않습니다.  
Cursor는 아래 파일들을 기준으로 인증 기능을 완성해야 합니다.

---

## ✅ 작업 위치 및 기준

- 로그인 UI 위치:  
  `Coding/o4o-platform/services/main-site/src/pages/Login.tsx`

- 회원가입 UI 위치:  
  `Coding/o4o-platform/services/main-site/src/pages/Register.tsx`

- 인증 상태 관리:  
  `Coding/o4o-platform/services/main-site/src/context/AuthContext.tsx`

- 보호 라우트 관련:  
  - `ProtectedRoute.tsx`, `RoleProtectedRoute.tsx`, `YaksaProtectedRoute.tsx`

---

## 🔐 구현 요구 사항

### 1. 로그인 처리
- 이메일/비밀번호 입력
- 로그인 성공 시 토큰(localStorage) 저장
- 실패 시 메시지 표시
- 로그인 성공 후 역할(role)에 따라 리디렉션
  - `b2c` → `/shop`
  - `yaksa` → `/yaksa-shop`
  - `admin` → `/admin/...`

### 2. 회원가입 처리
- 이메일/비밀번호/이름/역할 선택
- 약사 선택 시 면허번호, 전화번호 입력 필드 추가
- 가입 후 로그인 화면으로 이동 또는 상태에 따라 안내 메시지

### 3. 상태 관리
- 상태 저장소 또는 Context API로 로그인 상태 보존
- localStorage에 저장된 토큰 기반 로그인 상태 유지 처리

---

## ⚠️ 주의 사항
- 실 서버 인증 API가 없을 경우 mock 데이터로 구성
- redirect 처리, useNavigate 등 React Router 방식 고려
- 역할/승인 상태 판단을 위한 구조 설계 반영

---

## 🗂️ 참고할 파일들

- `AuthContext.tsx` (context/Auth)
- `Login.tsx`, `Register.tsx` (pages/)
- `ProtectedRoute.tsx`, `YaksaProtectedRoute.tsx`, `RoleProtectedRoute.tsx` (components/)
