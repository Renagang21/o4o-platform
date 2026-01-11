# Development Setup Checklist - Neture P0

## Pre-Development Checklist

**Work Order**: WO-NETURE-CORE-V1
**Phase**: P0 Prototype (Frontend Only)
**Target Branch**: `feature/neture-core-v1`

---

## 1. Repository Setup

### 1.1 브랜치 생성

```bash
# develop 브랜치에서 시작
git checkout main
git pull origin main

# feature 브랜치 생성
git checkout -b feature/neture-core-v1
```

### 1.2 브랜치 확인

```bash
git branch
# * feature/neture-core-v1 (현재 브랜치 확인)
```

---

## 2. Project Structure Setup

### 2.1 서비스 디렉터리 생성

```bash
mkdir -p services/web-neture/src/{pages,components,data}
mkdir -p services/web-neture/src/pages/{suppliers,partners}
mkdir -p services/web-neture/src/pages/partners/requests
mkdir -p services/web-neture/src/components/{layouts,common}
```

### 2.2 필수 파일 생성

```bash
cd services/web-neture

# package.json
# vite.config.ts
# tsconfig.json
# index.html
# src/main.tsx
# src/App.tsx
```

---

## 3. Dependencies Setup

### 3.1 필수 패키지

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.22.0",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^7.2.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### 3.2 설치 명령

```bash
pnpm install
```

---

## 4. Configuration Files

### 4.1 vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5003,
  },
});
```

### 4.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 4.3 tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
}
```

---

## 5. Mock Data Setup

### 5.1 Mock Data 파일 생성

```bash
touch src/data/mockData.ts
```

### 5.2 Mock Data 내용

참조: `docs/plan/active/EXEC-PROMPT-NETURE-FE-P0.md` 섹션 "MOCK DATA"

---

## 6. Development Server

### 6.1 서버 실행

```bash
cd services/web-neture
pnpm dev
```

### 6.2 브라우저 확인

```
http://localhost:5003
```

---

## 7. Reference Patterns

### 7.1 GlycoPharm HomePage 참조

```bash
cat services/web-glycopharm/src/pages/HomePage.tsx
```

**참조 포인트:**
- Hero 섹션 구조
- QuickAction 카드 레이아웃
- 섹션 간격 및 여백
- 반응형 디자인 패턴

### 7.2 K-Cosmetics HomePage 참조

```bash
cat services/web-k-cosmetics/src/pages/HomePage.tsx
```

**참조 포인트:**
- 섹션 구성 순서
- CTA 버튼 스타일
- 카드 hover 효과

---

## 8. Verification Checklist

### 8.1 개발 환경 확인

- [ ] `pnpm dev` 실행 성공
- [ ] `http://localhost:5003` 접속 가능
- [ ] Hot Module Replacement (HMR) 작동
- [ ] TypeScript 컴파일 에러 없음
- [ ] Tailwind CSS 적용 확인

### 8.2 라우팅 확인

- [ ] `/` - HomePage
- [ ] `/suppliers` - 공급자 목록 (미구현 시 404)
- [ ] `/suppliers/:slug` - 공급자 상세
- [ ] `/partners/requests` - 제휴 요청 목록
- [ ] `/partners/requests/:id` - 제휴 요청 상세

### 8.3 빌드 확인

```bash
pnpm build
```

- [ ] 빌드 성공
- [ ] dist/ 폴더 생성
- [ ] 빌드 경고 없음

---

## 9. Git Workflow

### 9.1 작업 중 커밋

```bash
# 작업 단위로 커밋
git add .
git commit -m "feat(neture): implement HomePage with Hero section"

git add .
git commit -m "feat(neture): add supplier detail page"

git add .
git commit -m "feat(neture): add partnership request pages"
```

### 9.2 커밋 메시지 규칙

```
feat(neture): <기능 설명>
fix(neture): <버그 수정>
style(neture): <스타일 변경>
refactor(neture): <리팩토링>
docs(neture): <문서 변경>
```

### 9.3 완료 후 푸시

```bash
git push origin feature/neture-core-v1
```

---

## 10. OUT OF SCOPE 재확인 (중요)

개발 중 다음 항목이 필요하다고 느껴지면 **즉시 중단**:

- [ ] 제휴 요청 생성 UI
- [ ] 상태 변경 버튼 (OPEN → MATCHED)
- [ ] 신청/승인/선택 버튼
- [ ] 주문/결제 관련 UI
- [ ] 내부 메시지/채팅
- [ ] 대시보드/관리 메뉴
- [ ] POST/PUT/DELETE API 호출

---

## 11. Next Steps After P0

P0 완료 후 검토 사항:

1. **UI/UX 검증**
   - 관리 콘솔로 오해되지 않는가?
   - 정보 플랫폼으로 이해되는가?
   - 문구가 중립적인가?

2. **기획 수정 필요성**
   - 섹션 순서 조정
   - 문구 개선
   - 시각적 톤 조정

3. **Backend 개발 착수 여부**
   - UI 검증 완료 후
   - API Contract 기준으로
   - DB 스키마 그대로 구현

---

## 12. Troubleshooting

### 12.1 포트 충돌

```bash
# 다른 포트 사용
vite --port 5004
```

### 12.2 의존성 오류

```bash
# 캐시 삭제 후 재설치
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 12.3 TypeScript 에러

```bash
# 타입 체크
pnpm tsc --noEmit
```

---

**Work Order**: WO-NETURE-CORE-V1
**Phase**: P0 Prototype
**생성일**: 2026-01-11
**업데이트**: 환경 설정 완료 시 체크리스트 업데이트
