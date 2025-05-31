
# 🧾 Task 04: 로그인 후 리디렉션 및 메뉴 상태 동기화 구현

## 🎯 목적
로그인 성공 후 사용자의 역할에 따라 자동으로 적절한 페이지로 이동시키고, 상단 네비게이션 등 UI에 로그인/로그아웃 상태를 반영한다.

---

## ✅ 작업 위치

- 상태 관리: `src/store/authStore.ts`
- 리디렉션 처리: `src/pages/Login.tsx` 또는 전역 `App.tsx`
- UI 연동:
  - 헤더: `src/components/AppHeader.tsx`
  - 메뉴 항목: 로그인 상태 및 역할에 따라 동적 표시

---

## 📦 기능 상세

### 1. 로그인 후 리디렉션
| 역할 | 리디렉션 경로 |
|------|----------------|
| b2c | `/shop` |
| yaksa | `/yaksa-shop` |
| admin / superadmin | `/admin/main` 또는 지정된 관리자 URL |

- 로그인 성공 시 역할(role)에 따라 자동 이동
- 상태에서 `role` 값 판단

### 2. 로그아웃 기능
- 로그아웃 버튼 클릭 시:
  - 상태 초기화 (`authStore`)
  - localStorage 초기화
  - `/login`으로 이동

### 3. 네비게이션 연동
- 로그인 상태에 따라 메뉴 변경:
  - [로그인] → [내 계정], [로그아웃]
  - 역할에 따라 관리자 진입 메뉴 보임 여부 조절

---

## 🔐 상태 구조 예시

```ts
{
  token: string;
  isAuthenticated: boolean;
  role: "b2c" | "yaksa" | "admin" | "superadmin";
  email: string;
}
```

---

## 📎 참고 문서

- `yaksa-portal-task-02-auth-ui.md`
- `yaksa-portal-task-03-protected-route.md`
- `docs/yaksa-site/wireframes/07-common-ui-and-menu-structure.md`
