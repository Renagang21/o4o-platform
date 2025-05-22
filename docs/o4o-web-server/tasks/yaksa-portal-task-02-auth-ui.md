
# 🧾 Task 02: 로그인 및 회원가입 UI 구현

## 🎯 목적
yaksa.site 사용자(B2C, 약사, 관리자 포함)의 공통 로그인/회원가입 화면을 구현하고, 기본 인증 UI 흐름을 구성한다.

---

## ✅ 작업 위치

- 로그인 페이지: `src/pages/Login.tsx`
- 회원가입 페이지: `src/pages/Register.tsx`
- 상태 관리 파일: `src/store/authStore.ts` (초기화만 가능)
- 보호 라우트: `src/components/ProtectedRoute.tsx` (다음 Task로 분리 가능)

---

## 📋 구현 요구 사항

### 1. 로그인 화면 (`/login`)
- 이메일 / 비밀번호 입력
- 로그인 버튼
- 로그인 실패 메시지
- 라우팅 후 리디렉션은 현재 dummy 처리

### 2. 회원가입 화면 (`/register`)
- 이메일, 비밀번호, 이름
- 사용자 유형 선택 (일반 / 약사)
- 약사 선택 시 인증절차 또는 라벨 추가
- 약관 동의 체크박스

### 3. 공통 UI 요소
- Tailwind 기반 반응형 폼 UI
- 가운데 정렬된 카드형 로그인 박스
- `text-sm`, `bg-white`, `shadow-xl`, `rounded-xl` 등 활용

---

## 💡 인증 로직 처리
- 실제 로그인 요청은 아직 구현하지 않음
- 로그인 버튼 클릭 시 상태 저장 또는 토큰 mock 저장 가능
- 추후 `/auth.yaksa.site` 연동 예정

---

## 📎 참고 문서

- `docs/yaksa-site/wireframes/02-auth-ui-wireframe.md`
- `docs/yaksa-site/wireframes/09-ui-theme-system.md`
