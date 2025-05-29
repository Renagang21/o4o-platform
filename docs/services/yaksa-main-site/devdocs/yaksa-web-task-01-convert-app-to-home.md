
# 🧾 yaksa-web-task-01-convert-app-to-home.md

## 🎯 목적
현재 yaksa.site의 Vite + React 프로젝트 구조는 기본 JavaScript 템플릿 상태입니다. 이 구조를 TypeScript 기반으로 전환하고, 포털 홈 UI(Home.tsx)를 진입점으로 설정합니다.

---

## ✅ 변경 요청 내용

### 1. 파일 구조 변경 (JS → TS)

| 기존 | 변경 후 |
|------|----------|
| `src/App.jsx` | `src/App.tsx` |
| `src/main.jsx` | `src/main.tsx` |
| `vite.config.js` | `vite.config.ts` |

---

### 2. 신규 파일 생성

```bash
src/pages/Home.tsx
```

내용 예시:
```tsx
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">yaksa.site 포털에 오신 것을 환영합니다</h1>
    </main>
  );
}
```

---

### 3. TypeScript 지원 설정

- `tsconfig.json` 생성
- `vite.config.ts`에 타입 설정 포함
- 다음 패키지 설치:

```bash
npm install -D typescript @types/react @types/react-dom @types/react-router-dom
```

---

### 4. 진입점 교체

`App.tsx`에서 `Home.tsx`를 기본으로 렌더링:

```tsx
import Home from "./pages/Home";

export default function App() {
  return <Home />;
}
```

---

### 5. 테스트 및 빌드

```bash
npm run build
pm2 restart yaksa-web
```

---

## 🔁 결과 기대

- TypeScript 기반의 Vite + React 구조로 전환 완료
- 포털 홈(Home.tsx)이 yaksa.site에 정상 표시
- 향후 모든 페이지를 `.tsx`로 개발 가능

