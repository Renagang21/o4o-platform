
# 🧾 Task 06: 승인 대기 상태 처리 및 약사용 페이지 접근 제한

## 🎯 목적
yaksa.site에서 약사 회원이 가입 후 승인 대기 상태일 때는 일반 사용자로 로그인할 수 있도록 허용하지만, 약사용 페이지에 접근 시 경고 메시지를 보여주고 이동을 제한한다.

---

## ✅ 처리 규칙

### 1. 승인 대기 중 사용자
- 상태: `role = 'b2c'`, `yaksaStatus = 'pending'` (authStore 기준)
- 로그인은 가능
- 약사용 페이지 접근은 제한 (`yaksa` 권한 필요)

---

## 📋 구현 항목

### ✅ 약사용 보호 라우트 구성
- `YaksaProtectedRoute.tsx` 생성
- 조건:
  - `role !== 'yaksa'` → 경고 메시지 표시
  - "약사 인증이 필요합니다. 홈으로 이동합니다."  
  - 3초 후 이전 페이지 or `/` 로 이동

### ✅ 사용 위치 예시

```tsx
<YaksaProtectedRoute>
  <YaksaShop />
</YaksaProtectedRoute>
```

---

## 💡 UX 설계
- 경고 메시지 출력용 컴포넌트 분리 (`<AccessDenied />`)
- 리디렉션 타이머: `setTimeout(() => navigate(-1), 3000);` or `navigate("/")`
- Tailwind 기반 메시지 스타일링

---

## 📦 상태 구조 예시 (authStore.ts)

```ts
{
  role: 'b2c' | 'yaksa' | 'admin',
  yaksaStatus: 'pending' | 'approved' | null
}
```

---

## 📎 참고 문서

- `yaksa-portal-task-03-protected-route.md`
- `yaksa-portal-task-05-register-flow.md`
- `docs/yaksa-site/wireframes/08-role-permissions.md`
