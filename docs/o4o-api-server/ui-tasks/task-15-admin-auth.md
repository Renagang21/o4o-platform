# Task: 관리자 인증 및 관리자 전용 페이지 분리 구성

## 🎯 목적
기존 사용자/판매자 인증 흐름에서 "관리자" 역할을 분리하여, 관리자 전용 페이지 접근을 보호하고 인증된 관리자만 접근할 수 있도록 구성한다.

---

## ✅ 구현할 기능 목록

### 1. 관리자 전용 로그인 페이지 (`/admin/login`)
- 관리자용 이메일/비밀번호 입력 폼
- 관리자 전용 인증 API 연동 방식 2안:
  - (A) 더미 인증: 지정된 관리자 이메일/비밀번호와 일치 시 로그인 처리
  - (B) Medusa Admin API 연동: `POST /admin/auth` (인증 토큰 발급)
- 로그인 성공 시 `/admin/orders`, `/admin/products` 등으로 이동
- 실패 시 오류 메시지 출력

### 2. 관리자 인증 상태 관리
- `AdminAuthContext` 또는 `useAdminAuth()` 훅 생성
- 관리자 JWT 토큰 localStorage 저장: `"admin_jwt"`
- 전역 상태로 관리자 인증 여부 제공

### 3. 관리자 보호 라우트 구성
- `AdminProtectedRoute` 컴포넌트 생성
- 인증된 관리자만 접근 가능, 미인증 시 `/admin/login`으로 리디렉션

### 4. 기존 관리자 페이지 적용
- `/admin/orders` 등 기존 관리자 UI 경로에 `AdminProtectedRoute` 적용
- 네비게이션에서 관리자 메뉴 분리(로그인 상태일 때만 노출)

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 관리: React Context
- 인증 저장소: localStorage (`admin_jwt`)
- 보호 라우트 구성: `react-router-dom`

---

## 🧪 테스트 조건
- 지정된 관리자 계정으로 로그인 성공 시 관리자 페이지 접근 가능
- 인증되지 않은 상태에서 관리자 페이지 접근 시 `/admin/login`으로 이동
- 로그아웃 시 관리자 상태 초기화 및 보호 페이지 접근 차단

---

## 📌 확장 계획
- 관리자 계정 관리 UI 추가
- 관리자 활동 로그 기록
- 관리자와 판매자/사용자 계정 권한 세분화

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-15-admin-auth.md`