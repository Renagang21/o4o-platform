# 로그인 기능 Task 문서 (`login-task.md`)

이 문서는 o4o-platform의 프론트엔드 SPA(`main-site`)에서 로그인 기능 구현을 위한 작업 지시 문서입니다.  
Cursor, Gemini Code Assist 등의 AI 개발 도구에서 자동화를 위해 사용될 수 있도록 작성되었습니다.

---

## 🎯 목표

- 사용자 로그인 UI 및 API 연결 구현
- 로그인 성공 시 토큰 저장 및 사용자 상태 전역 관리
- 인증 보호 라우터 적용 및 접근 제한 처리

---

## 📁 파일 위치 및 주요 대상

| 파일 | 설명 |
|------|------|
| `src/pages/Login.tsx` | 로그인 화면 UI 및 기능 |
| `src/context/AuthContext.tsx` | 사용자 상태 저장 및 관리 |
| `src/hooks/useAuth.ts` (또는 `AuthContext` 내부) | 인증 상태 접근 커스텀 훅 |
| `src/utils/auth.ts` | API 호출 함수 (axios 등) |
| `App.tsx` | 로그인 시 경로 보호 및 인증 분기 처리 |
| `vite-env.d.ts` | 환경 변수(`VITE_API_URL`) 정의 확인 |

---

## 🔧 구현 지시 사항

### 1. 로그인 화면 구현

- `Login.tsx`는 다음 필드를 포함해야 함:
  - `email`, `password` 입력
  - 로그인 버튼
  - 에러 메시지 출력

- 버튼 클릭 시 다음 API 호출:
  ```ts
  POST /auth/login
  body: { email, password }
  response: { token, user: { id, name, role } }
  ```

### 2. 로그인 성공 시 처리

- JWT 토큰을 `localStorage`에 저장
- 사용자 상태를 `AuthContext`에 저장
- 로그인 후 `/profile`로 리디렉션

### 3. 보호 라우팅 설정

- `App.tsx` 또는 `router.tsx`에서 다음과 같이 처리:
  - `/profile`, `/product/form`, `/admin` 경로는 로그인된 사용자만 접근 가능
  - 미인증 시 `/login`으로 리디렉션

### 4. 인증 미들웨어 (선택)

- `RequireAuth.tsx` HOC 또는 `<PrivateRoute>` 컴포넌트 형태로 구현 가능

---

## 📌 참고 사항

- 토큰 만료 시 자동 로그아웃 처리 여부는 `useEffect`에서 구현
- 향후 Refresh Token 전략 도입 가능
- 에러 메시지는 사용자 친화적으로 표시

---

이 문서는 Cursor에게 직접 전달되어 `Login.tsx` 및 인증 흐름을 생성하는 데 사용할 수 있습니다.
