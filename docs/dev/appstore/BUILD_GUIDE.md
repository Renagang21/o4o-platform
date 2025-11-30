# App Store 패키지 빌드 가이드

> 작성일: 2025-11-30
> 작성자: Claude Code
> 최종 업데이트: 앱 장터 도입 후 빌드 구조 정비

## 개요

O4O Platform의 App Store 패키지는 **두 가지 빌드 전략**을 사용합니다:

1. **Source-based Exports**: TypeScript 소스를 직접 export (Vite가 번들링)
2. **Hybrid Approach**: Backend는 TypeScript 컴파일, Frontend는 source export

## 빌드 전략 비교

### Source-based Exports (권장 - Frontend 전용)

**사용 패키지:**
- `@o4o/dropshipping-core`
- `@o4o/dropshipping-cosmetics`

**특징:**
```json
{
  "exports": {
    "./admin-ui": {
      "import": "./src/admin-ui/index.ts"
    }
  },
  "scripts": {
    "build": "echo 'Skipping TypeScript build - will be bundled by Vite'"
  }
}
```

**장점:**
- ✅ Vite가 빌드 시 최적화된 번들 생성
- ✅ 빌드 시간 단축 (TypeScript 컴파일 스킵)
- ✅ Tree-shaking 최적화
- ✅ Hot Module Replacement (HMR) 빠름

**단점:**
- ❌ API 서버에서 사용 불가 (Vite 없음)
- ❌ TypeScript paths alias 필요 (`@/*`)

**사용 조건:**
- Admin Dashboard 또는 Main Site **전용**
- API 서버에서 사용하지 않는 경우
- UI 컴포넌트, 페이지만 포함

### Hybrid Approach (Backend 포함 시 필수)

**사용 패키지:**
- `@o4o-apps/forum`
- `@o4o-apps/forum-neture`
- `@o4o-apps/forum-yaksa`

**특징:**
```json
{
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json"
  }
}
```

**tsconfig.json:**
```json
{
  "include": [
    "src/backend/entities/**/*",
    "src/manifest.ts",
    "src/index.ts"
  ],
  "exclude": [
    "src/admin-ui/**/*"
  ]
}
```

**장점:**
- ✅ API 서버에서 TypeORM entities 사용 가능
- ✅ 표준 Node.js import 방식
- ✅ Admin에서는 여전히 source import 가능 (Vite alias)

**단점:**
- ⚠️ TypeScript 컴파일 시간 필요
- ⚠️ Admin과 API에서 다른 빌드 산출물 사용

**사용 조건:**
- API 서버에서 **entities 사용**하는 경우
- Backend 로직이 포함된 경우
- Manifest, lifecycle hooks 포함

## 패키지별 빌드 방식

| 패키지 | 빌드 방식 | dist 생성 | 사용처 | TypeScript 컴파일 |
|--------|-----------|----------|--------|------------------|
| dropshipping-core | Source-based | dummy만 | Admin | ❌ |
| dropshipping-cosmetics | Source-based | dummy만 | Admin | ❌ |
| forum-app | Hybrid | entities만 | Admin, API | ✅ Backend만 |
| forum-neture | Hybrid | entities만 | Admin, API | ✅ Backend만 |
| forum-yaksa | Hybrid | entities만 | Admin, API | ✅ Backend만 |

## 빌드 프로세스

### 1. 로컬 개발

**Admin Dashboard 개발:**
```bash
cd apps/admin-dashboard
pnpm dev  # Vite dev server - App Store source를 직접 import
```

**API Server 개발:**
```bash
# Forum entities 빌드
pnpm --filter '@o4o-apps/forum*' run build

# API 서버 실행
cd apps/api-server
pnpm run dev
```

### 2. CI/CD 빌드

**GitHub Actions:**
```yaml
# .github/workflows/ci-pipeline.yml
- name: Run TypeScript check (App Store packages)
  run: pnpm run typecheck:app-store-packages

# .github/actions/setup-build-env
- name: Build shared packages
  run: pnpm run build:packages  # App Store 제외
```

**Admin Dashboard 배포:**
```bash
pnpm run build:packages  # 공통 패키지만
cd apps/admin-dashboard
pnpm run build:prod      # Vite가 App Store source 번들링
```

**API Server 배포:**
```bash
pnpm run build:packages  # 공통 패키지만
cd apps/api-server
pnpm run build           # prebuild에서 Forum entities 빌드
```

### 3. 타입 체크

**전체 타입 체크:**
```bash
pnpm run type-check              # Frontend + Backend + App Store
pnpm run typecheck:app-store-packages  # App Store 패키지만
```

**CI에서:**
- Frontend 타입 체크: ✅ 필수 (실패 시 빌드 중단)
- App Store 타입 체크: ⚠️ Non-blocking (경고만)

## 새 App Store 앱 만들기

### Source-based (Frontend 전용)

```bash
# 1. 패키지 생성
mkdir -p packages/my-app/src/admin-ui
cd packages/my-app

# 2. package.json 설정
cat > package.json <<EOF
{
  "name": "@o4o-apps/my-app",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    "./admin-ui": {
      "import": "./src/admin-ui/index.ts"
    }
  },
  "files": ["dist", "src"],
  "scripts": {
    "build": "echo 'Skipping TypeScript build' && mkdir -p dist && echo 'export {};' > dist/index.js",
    "typecheck": "tsc --noEmit"
  }
}
EOF

# 3. tsconfig.json 설정
cat > tsconfig.json <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["../../apps/admin-dashboard/src/*"]
    }
  }
}
EOF

# 4. Admin Dashboard에 추가
cd ../../apps/admin-dashboard
pnpm add @o4o-apps/my-app@file:../../packages/my-app

# 5. Vite alias 추가 (vite.config.ts)
resolve: {
  alias: {
    '@o4o-apps/my-app': path.resolve(__dirname, '../../packages/my-app/src')
  }
}

# 6. Admin tsconfig.json에 추가
"include": [
  "../../packages/my-app/src/**/*"
]
```

### Hybrid (Backend 포함)

```bash
# 1-2. package.json (exports는 dist로)
{
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json"
  }
}

# 3. tsconfig.json (backend만 포함)
{
  "include": [
    "src/backend/**/*",
    "src/manifest.ts",
    "src/index.ts"
  ],
  "exclude": [
    "src/admin-ui/**/*"
  ]
}

# 4. API Server package.json (prebuild에 추가)
{
  "scripts": {
    "prebuild": "pnpm --filter @o4o-apps/my-app run build"
  }
}
```

## Path Aliases 설정

**App Store 패키지에서 Admin/Main-site import:**

```typescript
// ❌ 잘못된 방법 - 상대 경로
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';

// ✅ 올바른 방법 - Path alias
import { useAuth } from '@o4o/auth-context';
import { api } from '@/api/client';
```

**tsconfig.json paths 설정:**
```json
{
  "paths": {
    "@/*": [
      "../../apps/admin-dashboard/src/*",
      "../../apps/main-site/src/*"
    ]
  }
}
```

## 문제 해결

### "Cannot resolve ../../contexts/AuthContext"

**원인:** Source-based exports에서 상대 경로 사용

**해결:**
```bash
# App Store 패키지에서 모든 상대 import 변경
find src -name "*.tsx" -exec sed -i "s|from '../../contexts/AuthContext'|from '@o4o/auth-context'|g" {} \;
find src -name "*.tsx" -exec sed -i "s|from '../../components/|from '@/components/|g" {} \;
find src -name "*.tsx" -exec sed -i "s|from '../../api/|from '@/api/|g" {} \;
```

### "Module not found: @o4o-apps/my-app"

**원인:** Admin Dashboard에 dependency 추가 안 됨

**해결:**
```bash
cd apps/admin-dashboard
pnpm add @o4o-apps/my-app@file:../../packages/my-app
pnpm install
```

### CI에서 타입 에러

**원인:** App Store 패키지가 CI 타입 체크에 포함 안 됨

**해결:**
1. `package.json`에 `typecheck:app-store-packages` 추가
2. `.github/workflows/ci-pipeline.yml`에서 실행

### API 서버에서 entities 못 찾음

**원인:** Forum entities 빌드 안 됨

**해결:**
```json
// apps/api-server/package.json
{
  "scripts": {
    "prebuild": "pnpm --filter '@o4o-apps/forum*' run build"
  }
}
```

## 참고 자료

- [Vite Source-based Exports](https://vitejs.dev/)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [pnpm Workspace](https://pnpm.io/workspaces)
- [BLOCKS_DEVELOPMENT.md](../BLOCKS_DEVELOPMENT.md)

---

**최종 업데이트:** 2025-11-30
**관련 커밋:** 앱 장터 도입 후 빌드 구조 정비
