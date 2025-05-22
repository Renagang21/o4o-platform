# Task-11: Medusa API 기반 회원가입 / 로그인 연동 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 주요 구현 내역

### 1. AuthContext
- 로그인
  - `POST /store/customers/auth` 요청으로 JWT 토큰 발급
  - `GET /store/customers/me`로 사용자 정보 조회
  - localStorage에 "jwt" 및 사용자 정보 저장
- 회원가입
  - `POST /store/customers`로 가입 요청
  - 성공 시 자동 로그인 및 메인 페이지로 이동
- 로그아웃
  - localStorage에서 JWT 및 사용자 정보 제거
- 인증 상태 전역 제공 (`useAuth()` 훅 지원)

### 2. Register.tsx
- 이름, 이메일, 비밀번호 입력 폼
- 회원가입 후 자동 로그인 및 리디렉션 처리
- 실패 시 에러 메시지 표시

### 3. Login.tsx
- 이메일, 비밀번호 입력
- 로그인 성공 시 메인 페이지 이동
- 실패 시 에러 메시지 출력

### 4. apiFetch 유틸
- `requireAuth` 옵션이 true인 경우 localStorage의 JWT 토큰을 `Authorization: Bearer` 헤더로 자동 포함
- 모든 인증 API 요청에서 재사용 가능

## 🔐 인증 흐름
- 로그인된 사용자만 보호된 페이지(`/orders`, `/cart`, `/checkout`, `/admin/...`)에 접근 가능
- 인증 실패 시 자동으로 `/login`으로 리디렉션
- 로그아웃 시 인증 상태 초기화 및 인증 페이지 제외한 경로 접근 차단

## 🧪 테스트 기준 충족
- 정상 가입 및 로그인 시 토큰 저장 및 사용자 정보 유지
- 새로고침 후에도 인증 상태 유지
- 로그인 실패 시 메시지 출력
- 로그아웃 후 보호 페이지 접근 차단

## 📌 확장 가능 기능
- 사용자 정보 조회/수정 (`GET /store/customers/me`, `POST /store/customers/me`)
- 비밀번호 변경 기능
- 관리자 및 판매자 인증 기능 추가 분리

## 📂 관련 컴포넌트 및 훅
- `src/contexts/AuthContext.tsx`
- `src/components/Register.tsx`
- `src/components/Login.tsx`
- `src/utils/apiFetch.ts`