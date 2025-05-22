# Task-06: 사용자 및 판매자 로그인 / 회원가입 UI 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 구현된 기능 요약

### 1. 회원가입 및 로그인
- `/register`: 사용자 또는 판매자 회원가입 (이름, 이메일, 비밀번호 등 입력)
- `/login`: 로그인 후 localStorage에 사용자 정보 저장
- 역할 구분 필드 포함 (user / seller)

### 2. 인증 상태 관리
- `AuthProvider`로 전역 인증 상태 관리
- `useAuth()` 훅을 통해 로그인 여부, 사용자 정보 접근 가능
- 로그인 시 자동 리디렉션, 로그아웃 기능 포함

### 3. 보호 라우트 적용
- 장바구니(`/cart`), 주문(`/orders`), 판매자 화면(`/seller/*`) 등 인증이 필요한 경로에 `ProtectedRoute` 적용
- 로그인하지 않은 사용자가 접근 시 `/login`으로 자동 이동

## 🔐 인증 흐름
- 인증 정보는 localStorage 기반 저장
- 로그인 상태 유지 (새로고침 후에도 유지됨)
- 로그인 실패/성공 여부 처리 및 리디렉션 구현

## 🧪 실행 방법

```bash
cd services/ecommerce/admin
npm install
npm run dev
```

- 주요 경로 예시:
  - `/login`
  - `/register`
  - `/cart` (인증 필요)
  - `/orders` (인증 필요)
  - `/seller/store` (인증 필요)

## 📌 향후 확장 가능 항목
- Medusa의 인증 API(`@medusajs/auth`)로 연동 전환
- JWT 기반 보안 강화
- 관리자 인증 도입 및 접근 권한 세분화

## 🗂️ 주요 컴포넌트 위치
- `src/components/Auth/`
- `src/providers/AuthProvider.tsx`
- `src/routes/ProtectedRoute.tsx`