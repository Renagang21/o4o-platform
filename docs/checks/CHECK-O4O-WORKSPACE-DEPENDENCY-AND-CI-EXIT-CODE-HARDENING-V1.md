# CHECK-O4O-WORKSPACE-DEPENDENCY-AND-CI-EXIT-CODE-HARDENING-V1

> WO: `WO-O4O-WORKSPACE-DEPENDENCY-AND-CI-EXIT-CODE-HARDENING-V1`
> 작성일: 2026-08-04
> 판정: **PASS (범위 확장 1건 · 잔존 부채 1건 명시)**

---

## 1. 목표

1. 잔존 `file:` 워크스페이스 의존성을 `workspace:*` 로 정비
2. 빌드·typecheck 실패가 CI 에서 정상적으로 **실패 처리**되게 한다

---

## 2. 축 1 — `file:` → `workspace:*` 정비

### 2.1 전수 실측 (WO 가정 대비 정정)

WO 는 잔존 대상을 "6개 패키지(block-renderer, forum-core, operator-ux-core, pharmacy-ai-insight,
shortcodes, utils)" 로 기술했으나, `git grep '"file:' -- '*package.json'` 실측 결과 **14 entry / 3 파일**이었다.
동일 결함 유형이므로 전수 정비 대상으로 처리했다.

| 파일 | 전 | 후 | 처리 |
|------|---:|---:|------|
| `apps/admin-dashboard/package.json` | 10 | 0 | 전환 |
| `apps/api-gateway/package.json` | 2 | 0 | 전환 |
| `apps/api-server/packages/auth-context/package.json` | 2 | 2 | **불가피한 예외 (아래 §2.3)** |
| **합계** | **14** | **2** | |

### 2.2 전환한 의존성 목록 (12건)

`apps/admin-dashboard/package.json` — `file:../../packages/{X}` → `workspace:*`

| # | 패키지 |
|---:|--------|
| 1 | `@o4o/content-editor` |
| 2 | `@o4o/forum-core` |
| 3 | `@o4o/ai-prompts` |
| 4 | `@o4o/block-renderer` |
| 5 | `@o4o/shortcodes` |
| 6 | `@o4o/slide-app` |
| 7 | `@o4o/pharmacy-ai-insight` |
| 8 | `@o4o/types` |
| 9 | `@o4o/operator-ux-core` |
| 10 | `@o4o/utils` |

`apps/api-gateway/package.json`

| # | 패키지 |
|---:|--------|
| 11 | `@o4o/types` |
| 12 | `@o4o/utils` |

**패키지 버전 필드는 한 건도 변경하지 않았다.** protocol 문자열만 교체.

### 2.3 예외 — `apps/api-server/packages/auth-context` (2건)

- `"@o4o/auth-client": "file:../auth-client"` / `"@o4o/types": "file:../types"`
- `pnpm-workspace.yaml` 의 glob 은 **단일 레벨**이므로 `apps/*` 는 `apps/api-server/packages/*` 를 포함하지 않는다.
  → 해당 디렉터리는 **워크스페이스 멤버가 아니며**, `workspace:*` 로 바꾸면 해석되지 않는다.
- 해당 경로에는 source 없이 package.json stub 만 추적되고 있다.
- **판정: 전환 불가. 현행 유지가 정답.** 워크스페이스 편입 여부는 별도 WO 판단 사항.

### 2.4 검증

| 항목 | 결과 |
|------|------|
| `pnpm-lock.yaml` 내 `file:../` 참조 수 | **0** |
| lockfile diff | `146` lines 변경 (중복 `file:` snapshot entry 제거) |
| 전환 대상 12건 링크 실체 | 전부 Windows **Junction** → `packages/*` 실디렉터리 |
| 새 `file:` 실체화 연쇄 | 없음 |

예: `apps/admin-dashboard/node_modules/@o4o/operator-ux-core` →
`C:\Users\home\coding\o4o-platform\packages\operator-ux-core`

---

## 3. 축 2 — CI 종료코드 전파 정상화 (`scripts/dev.mjs`)

### 3.1 확정한 결함

| # | 결함 | 영향 |
|---|------|------|
| D1 | `exec()` 가 실패 시 `false` 를 반환하지만, 모든 러너(`runTypeCheck` / `runTypeCheckFrontend` / `runTests` / `runBuild` / `buildPackages` / `cleanProject`)가 그 값을 버리고 **무조건 `true`** 를 반환. main switch 도 반환값을 쓰지 않음 | **tsc / build / test 실패가 CI 에서 GREEN 통과** |
| D2 | `hasScript()` 가 ESM 파일에서 `require('fs')` 호출 → `ReferenceError` → `catch` 에서 `false` 로 삼켜짐 | `pnpm test` / `pnpm build` 가 **아무 패키지도 실행하지 않는 no-op** |
| D3 | 자체 `tsconfig.json` 이 없는 대상(`packages/forum-app`, `apps/ecommerce`)에 `npx tsc --noEmit` 실행 → tsc 가 상위로 올라가 **루트 tsconfig** 를 집어듦 | 이름은 "forum-app 타입체크"인데 실제로는 모노레포 전체(api-server 포함) 검사 → composite 출력 부재로 **TS6305 대량 발생** |

D2·D3 는 WO 본문에 없던 항목이나, D1 을 고치는 순간 표면화되는 동일 결함 계열이라 함께 처리했다.

### 3.2 수정 내용

1. **실패 누적기 `createFailureTracker()` 도입** — 모든 단계를 끝까지 실행해 전체 오류 목록을 확보하되,
   실패 항목을 모아 `report(taskName)` 이 boolean 을 반환.
2. 모든 러너가 `t.track(label, exec(...))` 로 결과를 누적하고 `return t.report(...)`.
   `buildPackages(tracker)` 는 상위 tracker 를 공유 받을 수 있게 옵션 인자화.
3. **`finish(ok) { process.exit(ok ? 0 : 1) }`** 를 main switch 전 명령에 적용.
4. `hasScript()` 를 `readFileSync` + `JSON.parse` 로 교체하고 `fs` import 에 `readFileSync` 추가.
5. **`hasOwnTsconfig(relPath)` 가드 신설** — 자체 tsconfig 가 없는 대상은 검사하지 않고
   `Skipping <name> (no tsconfig.json)` 경고를 남긴다 (조용한 누락 금지).

### 3.3 전파 검증

| 명령 | 기대 | 실측 |
|------|------|------|
| `node scripts/dev.mjs lint` | 0 | **0** |
| `node scripts/dev.mjs bogus` | 1 | **1** |
| `node scripts/dev.mjs type-check:frontend` (수정 전, 실패 3건 존재) | 1 | **1** (하드닝 전에는 0 이었음) |
| `node scripts/dev.mjs type-check:frontend` (최종) | 0 | **0** |

---

## 4. 하드닝으로 표면화된 기존 결함 — `TS2709` (범위 확장 1건)

### 4.1 현상

```
../../packages/operator-ux-core/src/blocks/ActionIcon.tsx(41,37): error TS2709: Cannot use namespace 'LucideIcon' as a type.
../../packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx(49,44): error TS2709: Cannot use namespace 'LucideIcon' as a type.
```

### 4.2 근본 원인 (실측 확인)

- `apps/admin-dashboard/src/global.d.ts:1` 과 `apps/admin-dashboard/src/types/index.d.ts:1` 에
  **`declare module 'lucide-react';`** shorthand ambient 선언이 있다 (commit `e30dd6f7c`, 기존 코드).
- shorthand ambient 선언은 실제 `lucide-react` 타입을 **가려버린다**. 그 프로그램 안에서
  `LucideIcon` 은 타입이 아닌 namespace 로 잡혀 TS2709 가 난다.
- `@o4o/operator-ux-core` 의 `types` 필드는 `./src/index.ts` 이므로, 소비처는 **항상 소스를 직접 타입체크**한다.

### 4.3 `file:` → `workspace:*` 전환과 무관함 (증명)

| 근거 | 내용 |
|------|------|
| 링크 형태 동일 | 전환 전후 모두 `apps/admin-dashboard/node_modules/@o4o/operator-ux-core` → `packages/operator-ux-core` junction |
| 해석 경로 동일 | `types: "./src/index.ts"` 로 두 protocol 모두 소스 해석 |
| shim 이 원인임을 실험으로 확인 | 두 shim 을 비활성화하면 TS2709 2건이 **사라지고** 대신 admin-dashboard 기능 코드에서 실제 타입 오류 **7건** 노출 |
| CI 가 못 잡은 이유 | §3.1 D1 로 `type-check:frontend` 실패가 항상 삼켜지고 있었음 |

즉 **본 WO 이전부터 존재하던 잠복 결함**이며, 종료코드 하드닝이 그것을 드러낸 것이다.

### 4.4 처리 — 최소 타입 표기 수정 (런타임 무변경)

근본 치료(shim 삭제)는 admin-dashboard 기능 코드 7건 수정을 동반하므로 본 WO 의
"기능 코드 변경 금지" 및 "대규모 연쇄" 중지 조건에 걸린다. 대신 **런타임과 무관한 타입 표기**만 조정했다.

| 파일 | 변경 |
|------|------|
| `packages/operator-ux-core/src/blocks/ActionIcon.tsx` | `import { type LucideIcon } from 'lucide-react'` 제거, `import type { ComponentType } from 'react'` 추가, `Record<string, LucideIcon>` → `Record<string, IconComponent>` |
| `packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx` | 동일 패턴 (`type IconComponent = ComponentType<Record<string, unknown>>`) |

- JSX 렌더 코드·아이콘 매핑 값·런타임 동작 **변경 0**.
- 소비처 shim 유무와 무관하게 성립하는 표기이므로 회귀 위험이 낮다.

### 4.5 잔존 부채 (후속 WO 권고)

`declare module 'lucide-react';` shorthand shim 3종(+`packages/shortcodes/src/lucide-react.d.ts`,
루트 `types/lucide-react.d.ts` 수동 재선언)은 **lucide-react 실제 타입을 전면 무력화**하고 있다.
제거 시 노출되는 admin-dashboard 실제 오류 7건:

| 파일 | 오류 |
|------|------|
| `src/components/editor/blocks/ConditionalBlock.tsx` (124, 126) | TS2322 ×2 |
| `src/components/editor/blocks/media/ImageEditingTools.tsx:21` | TS2305 `AspectRatio` 없음 |
| `src/components/editor/blocks/StandardBlockTemplate.tsx:36` | TS2693 `LucideIcon` 을 값으로 사용 |
| `src/hooks/useAdminMenu.ts:272` | TS2769 |
| `src/pages/cms/slots/CMSSlotList.tsx:359` | TS2322 |
| `src/utils/block-icons.tsx:183` | TS2724 `Shift` → `Shirt` 오타 |

→ **별도 WO 권고**: `WO-O4O-LUCIDE-AMBIENT-SHIM-REMOVAL-V1` (본 WO 범위 밖).

---

## 5. 검증 결과

| 항목 | 명령 | 결과 |
|------|------|------|
| Frontend typecheck | `node scripts/dev.mjs type-check:frontend` | **EXIT 0** |
| admin-dashboard typecheck | `npx tsc --noEmit` | **0 errors** |
| web-kpa-society typecheck | `npx tsc --noEmit` | **0 errors** |
| web-neture / web-k-cosmetics / web-glycopharm typecheck | `npx tsc --noEmit` | **각 0 errors** |
| store-ui-core typecheck | `npx tsc --noEmit` | **0 errors** |
| admin-dashboard test | `npx vitest run --pool=forks --poolOptions.forks.maxForks=1` | **12 files / 220 tests PASS** |
| api-gateway test | `npx vitest run --passWithNoTests` | **1 test PASS** |
| api-server test | `npx jest --maxWorkers=1` | **73 suites / 1339 tests PASS** |
| admin-dashboard build | `pnpm --filter=@o4o/admin-dashboard run build` | **EXIT 0** (built in 1m 40s) |
| main-site build | `pnpm run build` | **EXIT 0** (built in 17.89s) |
| api-server build | `pnpm run build` (`tsc -p tsconfig.build.json`) | **EXIT 0** |

`packages/operator-core-ui` 는 `TS2339 Property 'env' does not exist on type 'ImportMeta'` 1건이 있으나
**본 WO 이전부터 존재**하며 CI 의 typecheck 대상이 아니다 (별건).

### 5.1 CI 경로 확인

`.github/workflows/ci-pipeline.yml` 기준 `scripts/dev.mjs` 가 관여하는 step 은 다음 2개뿐이다.

- `pnpm run type-check:frontend` (blocking) → 하드닝 대상
- `pnpm run lint` (현재 stub, 항상 성공)

테스트·빌드는 `npx jest` / `npx vitest` / `bash scripts/ci-build-app.sh` 로 **직접 호출**되므로
원래부터 종료코드가 정상 전파되고 있었다. `build:packages` 도 dev.mjs 가 아닌 pnpm filter 체인이다.
즉 본 하드닝이 CI 를 새로 RED 로 만드는 지점은 `type-check:frontend` 단 하나이며,
그 유일한 실패 원인(§4)은 해소되었다.

---

## 6. 완료 기준 대조

| 완료 기준 | 결과 |
|-----------|------|
| 잔존 `file:` 실체화 0 또는 불가피한 예외 명시 | ✅ 14 → 2, 잔존 2건은 §2.3 에 사유 명시 |
| 각 패키지 junction·symlink 연결 | ✅ 12/12 Junction 확인 |
| `dev.mjs` 하위 명령 실패 시 non-zero 종료 | ✅ §3.3 |
| admin-dashboard 및 관련 앱 테스트 PASS | ✅ 220 + 1339 + 1 PASS |
| API·웹 build PASS | ✅ api-server / admin-dashboard / main-site 전부 EXIT 0 |
| CI Pipeline 전체 GREEN | push 후 확인 (§7) |

---

## 6-A. 후속 — CI 전용으로만 재현되던 잠복 실패 2건 (commit 2)

첫 커밋(`16b15d502`) push 후 CI Pipeline 이 RED 로 떨어졌다. 로컬은 `type-check:frontend` EXIT 0 이었다.
**로컬 `node_modules`/`dist` 에 남아 있던 과거 산출물이 실패를 가리고 있었기 때문**이며,
CI 의 fresh checkout + `pnpm install` 에서만 재현되는 유형이다. 두 건 모두 §3.1 D1 로 **원래부터 삼켜지던** 오류다.

| # | 대상 | 오류 | 근본 원인 |
|---|------|------|-----------|
| E1 | `packages/dropshipping-cosmetics` | `TS2307: Cannot find module '@o4o/dropshipping-core'` ×8 | `@o4o/dropshipping-core` 를 **package.json 에 아예 선언하지 않음**. 로컬은 hoist 된 잔여물로 해석되던 undeclared dependency |
| E2 | `apps/admin-dashboard` | `TS2307: Cannot find module '@o4o/cgm-pharmacist-app'` ×4 | 의존성 선언은 정상(`workspace:*`)이나, 해당 패키지의 `types` 가 `dist/index.d.ts` 인데 **`build:packages` 체인에 빌드가 없어 CI 에 dist 가 존재하지 않음** (`dropshipping-core` 도 동일) |

### 수정

| 파일 | 변경 |
|------|------|
| `packages/dropshipping-cosmetics/package.json` | `"@o4o/dropshipping-core": "workspace:*"` 선언 추가 (미선언 의존성 정정 — 본 WO 의 "내부 패키지 의존성 `workspace:*` 수렴" 범위) |
| `package.json` | `build:app-store-packages` 에 `@o4o/dropshipping-core` 추가 · `build:cgm-pharmacist-app` 신설 후 `build:packages` 체인에 편입 |
| `.github/workflows/ci-pipeline.yml` | dist 검증 루프에 `dropshipping-core` · `cgm-pharmacist-app` 추가 ("must stay in sync" 주석 준수) |

### 검증

- `pnpm --filter @o4o/dropshipping-core run build` · `pnpm --filter @o4o/cgm-pharmacist-app run build` → **각 EXIT 0**, `dist/index.d.ts` 생성 확인
- `pnpm install` 후 `node scripts/dev.mjs type-check:frontend` → **EXIT 0**

### 실측 함정 기록

`packages/dropshipping-core` 는 `composite: true` 라서, `dist` 만 지우고 재빌드하면
`tsconfig.tsbuildinfo` 가 "최신" 으로 판단해 **아무것도 emit 하지 않는다** (build EXIT 0 인데 dist 없음).
로컬에서 CI 조건을 재현할 때는 `tsbuildinfo` 도 함께 제거해야 한다. CI 는 fresh checkout 이라 해당 없음.

---

## 7. 지키지 않은 것 / 하지 않은 것

- 패키지 **버전 변경 0**
- 기능 코드 변경 0 (§4.4 는 타입 표기 전용, 런타임 무변경)
- 무차별 전체 의존성 변경 없음 — 실제 워크스페이스 내부 패키지만 정비
- 병렬 세션 WIP(`apps/admin-dashboard/src/routes/*`, `src/config/rolePermissions.ts`,
  `packages/auth-context/src/adminRouteAccess.ts`, `src/tests/*`) **미접촉** — commit 도 path-specific 수행
- `apps/api-server/packages/*` 의 워크스페이스 편입 시도 안 함
- lucide ambient shim 제거 안 함 (§4.5 후속 WO 권고)
