# Task-12: 사용자 정보 조회 및 수정 기능 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 주요 구현 내역

### 1. Profile.tsx
- 페이지 진입 시 `GET /store/customers/me` 호출 → 사용자 정보 조회
- 입력 필드: 이름, 이메일, 전화번호, 주소
- 저장 버튼 클릭 시 `POST /store/customers/me` 호출 → 정보 업데이트
- 저장 성공 시 "저장되었습니다." 메시지 표시
- 실패 시 에러 메시지 출력

### 2. App.tsx 라우팅
- `/profile` 경로에 `Profile` 컴포넌트 연결
- `ProtectedRoute`로 보호되어 로그인된 사용자만 접근 가능
- 네비게이션에 "내 프로필" 링크 추가

## 🔐 인증 흐름
- `AuthContext`의 JWT 토큰을 이용하여 `Authorization` 헤더 자동 포함
- 인증 실패 시 `/login`으로 자동 리디렉션

## 🧪 테스트 기준 충족
- 로그인된 사용자가 `/profile`에서 정보를 실시간으로 확인/수정 가능
- 저장 시 Medusa 서버에 실제 데이터 반영됨
- 새로고침 시 수정된 정보가 그대로 유지됨

## 📌 확장 계획
- 비밀번호 변경 기능 (`POST /store/customers/password`)
- 배송지 주소 관리 연동
- 회원 탈퇴 기능

## 📂 관련 컴포넌트
- `src/components/Profile.tsx`
- `src/routes/App.tsx`
- `src/contexts/AuthContext.tsx`