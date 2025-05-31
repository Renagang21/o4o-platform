
# 🎨 Wireframe 09: UI 테마 및 다크모드 시스템 설계

## 🎯 목적
yaksa.site 전체 서비스에서 일관된 UI 테마를 유지하고, 다크모드/라이트모드 전환이 가능한 유연한 테마 시스템을 설계한다.

---

## ✅ 기본 전략

- TailwindCSS `dark` 클래스를 기반으로 전체 다크모드 지원
- 사용자 설정을 `localStorage` 또는 `themeStore.ts`에 저장
- 기본값: 라이트 모드
- 테마는 모든 서비스에 공통 적용

---

## 📋 테마 저장 방식

```ts
// Zustand 예시
const themeStore = create((set) => ({
  theme: "light", // or "dark"
  setTheme: (value) => set({ theme: value })
}));
```

- 저장 위치: `localStorage.theme = 'dark'`
- 초기 진입 시 적용

---

## 💡 Tailwind 다크모드 구성 예시

```tsx
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
  <button className="bg-gray-200 dark:bg-gray-700">버튼</button>
</div>
```

---

## 🧱 UI 구성 요소

- 테마 토글 버튼 (`<ThemeToggle />`)
  - 라이트 ☀️ → 다크 🌙 전환
  - 헤더 상단 우측에 배치
- 전역 적용: `body` 또는 `html`에 `class="dark"` 적용

---

## 🎯 동작 흐름

```
[ThemeToggle 클릭]
    ↓
[Zustand 상태 변경 + localStorage 저장]
    ↓
[body class 변경 → UI에 dark 클래스 적용]
```

---

## 🧩 확장 고려

- 테마 시스템을 Figma MCP에도 반영 가능
- 추후 고대비 / 저시력 모드 등도 테마 설정에 포함
- 관리자 테마와 사용자 테마 분리 고려

---

## ⏭️ 관련 문서

- `07-common-ui-and-menu-structure.md`
- `08-role-permissions.md`
