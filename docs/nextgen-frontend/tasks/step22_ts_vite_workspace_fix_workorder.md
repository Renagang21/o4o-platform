# 📄 Step 22 — TypeScript / Vite / Workspace 패키지 경로 Fix Work Order

## O4O Platform — NextGen Main-Site 패키지 해석 문제 해결

**Version**: 2025-12
**Author**: ChatGPT PM
**Status**: 🔄 In Progress

---

## 0. 목적

현재 main-site에서:

* `@o4o-apps/signage` 패키지를 import 하지 못함
* 상대 경로(`../../packages/...`)도 resolve되지 않음
* Vite → tsconfig → pnpm workspaces → legacy packages 사이에서 경로 충돌 발생

이 문제는 **기능의 문제가 아니라 환경 설정(tsconfig + workspace + alias)** 문제이다.

### 🎯 최종 목표

* main-site가 모든 패키지를 정상 import
* signage 패키지 resolve 성공
* forum-yaksa 등 레거시 패키지의 영향 제거
* workspace / symlink 구조 정상화
* Vite 설정 및 TS 설정 완전 통일

---

## 1. 문제 원인 분석 (Root Cause)

아래 다섯 가지 중 하나 또는 복합적으로 발생 중:

### 1) pnpm workspace 구조 문제

* legacy 패키지를 이동한 후 workspace 재정의 필요
* pnpm-lock.yaml에 outdated symlink 잔존 가능성

### 2) tsconfig paths 충돌

* main-site, signage 패키지 모두 TS project references 사용
* tsconfig.json의 `paths`, `baseUrl`, `rootDir`, `outDir` 불일치

### 3) Vite resolve.alias 부족

* signage 패키지에 대한 alias가 vite config에 없음
* workspace symlink가 깨졌을 때 import 실패

### 4) forum-yaksa 레거시 dist 구조 오류

* "nested dist" 문제
* prebuild hook이 symlink를 덮어써 버림
* ts-node path 문제 발생

### 5) NextGen main-site가 "isolated TS project"로 동작 중

* root-level compile이 불가능
* 패키지 간 import가 완전 manual 설정 필요

**Step 22는 이 다섯 가지 문제를 모두 해결한다.**

---

## 2. Phase 구조 (A ~ F)

```
Phase A — pnpm workspace 재정의 + install 재생성
Phase B — tsconfig 통합 (root + packages + apps)
Phase C — vite alias 정리
Phase D — 레거시 forum-yaksa 경로 차단
Phase E — signage 패키지 경로 테스트
Phase F — build / test / commit
```

---

## 3. Phase A — pnpm workspace 재정의

### 수정 파일: `/pnpm-workspace.yaml`

**현재 예상 문제**:
* legacy 폴더가 여전히 workspace 패키지로 감지됨
* signage 패키지가 workspace에 포함되지 않았을 가능성
* 잘못된 glob 패턴으로 인해 workspace가 불안정

**수정 후 워크스페이스 표준 형태**:

```yaml
packages:
  - apps/*
  - packages/*
  - services/*
  - "!legacy/**"
  - "!legacy/*"
  - "!legacy/apps/*"
  - "!legacy/packages/*"
```

> 중요: 반드시 `!legacy/**`를 추가하여 legacy 영향 완전 제거

### 적용 후:

```bash
pnpm install --force
```

→ stale symlink 완전 초기화
→ signage 패키지 link 재생성

---

## 4. Phase B — TSConfig 정리

### 파일 1: `/tsconfig.base.json`

다음 형태로 통일:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@o4o-apps/*": ["packages/@o4o-apps/*"],
      "@o4o/*": ["packages/@o4o/*", "apps/*"]
    },
    "jsx": "react-jsx",
    "moduleResolution": "node",
    "module": "esnext",
    "target": "es2020",
    "skipLibCheck": true,
    "strict": false
  },
  "exclude": ["legacy"]
}
```

→ signage 패키지가 자동 resolve됨
→ forum-yaksa 제거됨

### 파일 2: `apps/main-site/tsconfig.app.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@o4o-apps/signage/*": ["../../packages/@o4o-apps/signage/*"]
    }
  }
}
```

> **중요:** 상대경로는 실제 workspace 경로에 맞게 조정해야 함.

---

## 5. Phase C — Vite alias 정리

### 파일: `apps/main-site/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@o4o-apps/signage": path.resolve(__dirname, "../../packages/@o4o-apps/signage"),
    }
  }
});
```

> 경우에 따라 `dist` 폴더가 아니라 root를 바라보는 것이 안전합니다.

---

## 6. Phase D — forum-yaksa 경로 차단

### 조치 사항:

1. **pnpm workspace에서 제외됨** (Phase A 완료)
2. **tsconfig.exclude 적용** (Phase B 완료)
3. **vite alias 등록 안 함** (Phase C에서 제외)

즉: **forum-yaksa가 main-site에서 절대 import되지 않도록 환경에서 완전히 배제**

---

## 7. Phase E — signage 패키지 resolve 테스트

### 테스트 명령:

```bash
cd apps/main-site
pnpm run dev
```

### 테스트 코드:

```typescript
// Should work without errors
import { DeviceCard } from "@o4o-apps/signage/ui/DeviceCard";
import { signageDevices } from "@o4o-apps/signage/functions/signageDevices";
```

→ 오류가 없어야 정상.

---

## 8. Phase F — 최종 빌드 및 커밋

### 1. main-site dev 서버 빌드 테스트

```bash
cd apps/main-site
pnpm run dev
```

### 2. main-site build 테스트

```bash
pnpm --filter @o4o/main-site-nextgen build
```

### 3. signage 패키지 build

```bash
pnpm --filter @o4o-apps/signage build
```

### 4. API server build

```bash
pnpm --filter @o4o/api-server build
```

### 5. Commit & push

**커밋 메시지 예시**:

```
fix(build): unify TS/Vite/workspace paths for NextGen apps

- Add @o4o-apps/* paths to tsconfig.base.json
- Configure Vite alias for signage package
- Exclude legacy packages from workspace
- Fix pnpm-workspace.yaml patterns
- Enable main-site to import signage components

Resolves TypeScript module resolution issues.
Enables Digital Signage integration.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 9. 성공 기준 (DoD)

- [ ] main-site에서 signage import 가능
- [ ] vite dev server 정상 기동
- [ ] signage ViewRenderer 정상 표시
- [ ] tsconfig paths 충돌 없음
- [ ] workspace symlink 깨끗함
- [ ] forum-yaksa 완전 배제
- [ ] build 성공

---

## 10. 예상 소요 시간

- Phase A: 5분
- Phase B: 10분
- Phase C: 5분
- Phase D: 0분 (Phase A-C에 포함)
- Phase E: 5분
- Phase F: 10분

**총 예상 시간**: 30-40분

---

## 11. 참고 자료

### 관련 문서
- Step 21 Completion Report: `/docs/nextgen-frontend/reports/step21_digital_signage_completion_report.md`
- pnpm workspace: https://pnpm.io/workspaces
- Vite resolve.alias: https://vitejs.dev/config/shared-options.html#resolve-alias
- TypeScript paths: https://www.typescriptlang.org/tsconfig#paths

### 관련 파일
- `/pnpm-workspace.yaml`
- `/tsconfig.base.json`
- `/apps/main-site/tsconfig.json`
- `/apps/main-site/vite.config.ts`
- `/packages/@o4o-apps/signage/`

---

**작성일**: 2025-12-02
**작성자**: ChatGPT PM
**상태**: 🔄 Ready to Execute

---

## ✔ Step 22 — TypeScript/Vite/Workspace Fix Work Order Ready!

Next: Execute Phase A-F
