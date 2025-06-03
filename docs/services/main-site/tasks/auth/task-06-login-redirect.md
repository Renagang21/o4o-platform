# 🧾 Task 06: 로그인/회원가입 후 공통 메인페이지 리디렉션 적용 요청

## 📌 목적

모든 사용자가 로그인 또는 회원가입 후 **일관되게 메인페이지 (`/`)** 로 리디렉션되도록 구현합니다.  
역할에 따라 다른 화면으로 이동하지 않고, 홈 화면에서 콘텐츠로 분기합니다.

---

## ✅ 적용 위치

- `Coding/o4o-platform/services/main-site/src/pages/Login.tsx`
- `Coding/o4o-platform/services/main-site/src/pages/Register.tsx`

---

## ⚙️ 구현 세부 내용

### 1. 로그인 성공 후

```ts
navigate('/');
```

- 로그인 성공 시, `useNavigate()`를 사용하여 무조건 `/`으로 이동
- `useAuth()`에서 역할 확인은 내부 UI 분기에서 사용

### 2. 회원가입 후 로그인 시도

- 회원가입 후 자동 로그인 또는 별도 로그인 처리 → 동일하게 `/` 이동
- 회원가입 UI에도 `navigate('/')` 적용

---

## 🧱 고려사항

- 기존에 역할에 따라 라우팅 분기를 하지 않도록 해야 함
- 향후 편집기에서 역할별로 다르게 보이도록 구성 예정

---

## ✨ 확장 고려 (선택)

- `useRedirectAfterLogin()` 커스텀 훅 구성 가능
- `usePreviousRoute`로 원래 위치 기억해 이동하는 기능은 이후 Task로 분리 가능

---

## 📎 참조 문서

- [o4o-role-definition-guideline.md](./o4o-role-definition-guideline.md)
- 사용자 역할은 로그인 후 화면 내용에만 영향을 주며, 이동 경로에는 영향 없음
