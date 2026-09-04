# WO-O4O-DEV-BUILD-CONFIG-AND-STALE-APP-REFERENCE-FINAL-CLEANUP-V1 — CHECK

| 항목 | 값 |
|---|---|
| WO | `WO-O4O-DEV-BUILD-CONFIG-AND-STALE-APP-REFERENCE-FINAL-CLEANUP-V1` |
| 성격 | dev/build residue 정리 (조사 + 최소 수정) |
| 축 | A `scripts/development/dev.sh` 의 부재 앱 참조 · B `apps/admin-dashboard/tsconfig.node.json` 의 stale build-output 설정 |
| 최종 판정 | **DEV_BUILD_CONFIG_AND_STALE_APP_RESIDUE_CLEANED** |
| 작성일 | 2026-09-04 |

---

## 1. Baseline (§4)

| 항목 | 값 |
|---|---|
| `START_HEAD` | `43a483ce949073a6876d70136a31fb185c88f4ba` |
| `START_ORIGIN_MAIN` | `b2f7c419060ad430bedda2a66b699deaf7e84b7c` |
| `WORKTREE_STATUS` | clean (전용 worktree `C:/tmp/o4o-block-core-retire`) |
| 작업 브랜치 | `work/o4o-dev-build-config-cleanup-v1` (`b2f7c4190` 기점) |

공유 worktree 는 건드리지 않았다. DB 접속 0 / migration 0 / dependency 변경 0.

---

## 2. 축 A — dev.sh 앱 참조 census (§6·§7)

### 2-1. 앱 디렉터리 존재 여부

| 참조 | 디렉터리 | `package.json` | build·dev script | 대체 경로 | 판정 |
|---|---|---|---|---|---|
| `apps/ecommerce` | **부재** | — | — | 없음 | `STALE_REFERENCE` |
| `apps/digital-signage` | **부재** | — | — | 없음 (아래 주의) | `STALE_REFERENCE` |
| `apps/api-server` | 존재 | ✅ | ✅ | — | `ACTIVE_DEV` |
| `apps/main-site` | 존재 | ✅ | ✅ | — | `ACTIVE_DEV` |
| `apps/admin-dashboard` | 존재 | ✅ | ✅ | — | `ACTIVE_DEV` |

현재 `apps/` 실제 내용: `admin-dashboard/ api-server/ forum-api/ forum-web/ main-site/ mobile-app/ page-generator/`.

### 2-2. 이름 변경 · 대체 앱 확인 (§6 단서)

- `apps/ecommerce` — 삭제 커밋 `99762e165` *(chore(platform): remove apps/ecommerce experimental app, WO-PHASE16-STEP4-ECOMMERCE-APP-REMOVAL-V1)*. 대체 앱 없음.
- `apps/digital-signage` — 삭제 커밋 `ab4efc842` *(feat(P2-B): Remove deprecated apps (crowdfunding, forum, digital-signage))*. 대체 **앱** 없음.
- `git ls-files apps/ecommerce apps/digital-signage` = **0건**.

### 2-3. literal census 분류 (§7)

| 히트 | 분류 |
|---|---|
| `packages/digital-signage-core` (`@o4o-apps/digital-signage-core`) + `apps/api-server` 의 15개 import · `entities.ts:506` · signage spec 4건 · `apps/api-server/package.json:116` · `deploy-api.yml` 빌드 대상 · `docs/services/_core/apps/digital-signage-core/app-definition.md` | `UNRELATED_NAME_MATCH` — **살아 있는 workspace 패키지**이며 삭제된 `apps/digital-signage`(프론트 앱)와 다른 대상. 손대지 않는다 |
| `packages/types/src/ecommerce.*`, `packages/types/src/template.ts` 의 `'ecommerce'` 카테고리 리터럴, `packages/ui/src/index.tsx:383` 주석 | `UNRELATED_NAME_MATCH` — 타입/카테고리 이름 |
| `scripts/dev.mjs:106` 주석 — *"검증에서 빠졌고, 존재하지 않는 dead entry('apps/ecommerce')가 남아 있었다"* | `HISTORICAL` — 과거 수정 이유를 남긴 주석. 유지 |
| `CHANGELOG.md:89`, `docs/archive/investigations/**` | `HISTORICAL` — 기록물(CLAUDE.md §16-1 대상 외) |
| `scripts/development/dev.sh` L65 · L88 · L121 | **`STALE_REFERENCE`** — 이번 제거 대상 |

`UNKNOWN` = 0.

### 2-4. 역할 확인 (§8)

- 세 곳 모두 **단순 순회 목록**이며 각각 `if [ -d "apps/$app" ]; then` **guard 가 실제로 존재**한다(수정 전 L66 · L89 · L122 에서 확인). 실패도 `|| true` 로 무시된다.
- 따라서 부재 앱은 이미 **no-op** 이었고, 제거는 동작 변경이 아니라 목록 정합성 회복이다.
- 다른 배열과 연동되지 않는다(패키지 목록 `packages=(...)` 는 별개, 직전 WO 에서 이미 정리됨).
- `dev.sh` 자체는 살아 있다 — root `package.json` L67-71 의 `type-check:sh` / `type-check:frontend:sh` / `lint:sh` / `lint:fix:sh` / `test:sh` 가 호출한다. **스크립트는 보존**한다.

### 2-5. 변경 (§9)

제거 조건 4가지 모두 충족(디렉터리 부재 / 대체 경로 없음 / active dev consumer 0 / historical 호환 이유 없음).

```diff
-    for app in api-server main-site admin-dashboard ecommerce digital-signage; do   # L65
+    for app in api-server main-site admin-dashboard; do
-    for app in main-site admin-dashboard ecommerce digital-signage; do              # L88
+    for app in main-site admin-dashboard; do
-    for app in api-server main-site admin-dashboard ecommerce digital-signage; do   # L121
+    for app in api-server main-site admin-dashboard; do
```

세 줄만 수정했다. 전체 스크립트 재작성 없음. `bash -n scripts/development/dev.sh` → **PASS**.

---

## 3. 축 B — `apps/admin-dashboard/tsconfig.node.json` (§10~§17)

### 3-1. 변경 전 설정 (§10)

```jsonc
"composite": true, "declaration": true,
"outDir": "./dist-node", "rootDir": "../..",
"include": ["vite.config.ts", "../../vite.config.shared.ts"]
```

`declarationMap` · `emitDeclarationOnly` · 명시적 `tsBuildInfoFile` 은 원래 없다.

### 3-2. caller census (§11)

| 대상 | 결과 | 판정 |
|---|---|---|
| `apps/admin-dashboard/package.json` scripts | `build: vite build` / `type-check: tsc --noEmit` / `build:with-typecheck: tsc --noEmit && vite build` — **`tsc -b` 0건** | 빌드 계약 아님 |
| `scripts/**` (`dev.mjs` 포함) | `npx tsc -b` 는 solution tsconfig(`"files": []` + `references`)에만 사용. admin 은 solution 이 아니므로 `tsc --noEmit` 경로 | caller 0 |
| `.github/workflows/**` | `deploy-admin.yml` 은 `dist/` 만 사용. `dist-node` 참조 0 | caller 0 |
| `Dockerfile*` | `COPY dist ...` — `dist-node` 참조 0 | caller 0 |
| 저장소 전체 `rg 'dist-node'` | 소스 히트는 `tsconfig.node.json` 의 `outDir` **한 곳**뿐. 나머지는 전부 `docs/checks/**` 기록물 + 직전 WO 의 guard spec | consumer 0 |
| `apps/admin-dashboard/tsconfig.json:72` | `"references": [{ "path": "./tsconfig.node.json" }]` | **project reference 소비처 1건** |

종합 판정: **`LEGACY_TSC_BUILD_OUTPUT`** (파일 자체는 `EDITOR_IDE_SUPPORT` + project reference 로 살아 있음).

### 3-3. Vite 계약 재확인 (§12)

- Vite 는 `apps/admin-dashboard/vite.config.ts` **원본을 직접** 읽는다. `dist-node/vite.config.js` 를 읽는 경로는 없다.
- `tsc -b` 없이 `pnpm --filter @o4o/admin-dashboard build` 가 정상 완료된다(§5 검증).

### 3-4. 저장소 관례 대조

| 파일 | composite | declaration | outDir |
|---|:---:|:---:|:---:|
| `apps/main-site` · `apps/forum-web` · `apps/page-generator` · `services/web-kpa-society` · `services/web-neture` · `services/web-k-cosmetics` | ✅ | ❌ | ❌ |
| `services/web-pharmacy-hub` · `web-account` · `web-glycopharm` · `web-kpa-branch` · `signage-player-web` | ❌(`noEmit`) | ❌ | ❌ (`tsBuildInfoFile: ./node_modules/.tmp/...`) |
| **`apps/admin-dashboard` (변경 전)** | ✅ | ✅ | **`./dist-node`** |

`declaration` + `dist-node` 는 **admin 단독 이상치**였다.

### 3-5. 키별 판정 (§13·§14·§15)

| 키 | 판정 | 처리 |
|---|---|---|
| `composite` | **`ACTIVE_PROJECT_REFERENCE`** — `tsconfig.json` 의 `references` 대상이므로 TypeScript 가 요구한다. 6개 형제 config 도 동일 | **유지** (guard 로 유지 강제) |
| `declaration` | consumer 0. admin 은 publish 패키지가 아니고(`main`/`types`/`exports`/`files` 전부 없음) `dist-node/*.d.ts` 를 읽는 소비처 0. `composite` 가 이미 declaration 을 강제하므로 **중복 키** | **제거** |
| `outDir: ./dist-node` | 생성 자체가 불필요(caller 0 · consumer 0). 다만 `composite` 는 `noEmit` 을 허용하지 않아 emit 대상 경로는 필요하다 | **재지정** (아래) |
| `rootDir: ../..` | **유지 필요**로 확인됨 (아래 §3-6) | **유지** |
| `tsBuildInfoFile` | 원래 없음 | 변경 없음 |

### 3-6. 중간 시행착오 — `rootDir` 제거는 회귀 (§29 검증)

1차 시도로 `declaration` · `outDir` · `rootDir` 를 모두 제거해 형제 config 와 동일하게 맞췄으나, `npx tsc -b apps/admin-dashboard/tsconfig.node.json --force` 가 **새 에러**를 냈다:

```
apps/admin-dashboard/vite.config.ts(5,34): error TS6059:
File '.../vite.config.shared.ts' is not under 'rootDir' '.../apps/admin-dashboard'.
```

`composite` 프로젝트는 `rootDir` 를 config 디렉터리로 기본 설정하는데, `include` 에 저장소 루트의 `vite.config.shared.ts` 가 들어 있어 위반이 된다. 또한 `outDir` 없이 emit 하면 산출물이 **소스 옆**(`apps/admin-dashboard/vite.config.js`, 루트 `vite.config.shared.js`)에 떨어지고 이 경로들은 `.gitignore` 에 없어 오히려 오염 위험이 커진다.

→ §29(“config 변경 후 typecheck·build regression”)에 걸리므로 되돌리고, **`rootDir` 유지 + `outDir` 를 `node_modules` 하위 임시 경로로 재지정**하는 방식을 택했다. 이는 `services/web-*` 계열이 이미 쓰는 `./node_modules/.tmp/...` 관례와 같은 축이다.

### 3-7. 변경 후 (§16 — 최소 diff)

```diff
     "composite": true,
-    "declaration": true,
-    "outDir": "./dist-node",
-    "rootDir": "../.."
+    "rootDir": "../..",
+    "outDir": "./node_modules/.tmp/tsconfig-node"
   },
```

`target` · `lib` · `module` · `moduleResolution` · `types` · `strict` · `isolatedModules` · `include` 등 무관 옵션은 건드리지 않았다. 파일은 **유지**한다(§17 — project reference + vite config typecheck 용도가 확인됨).

### 3-8. 산출물 위치 확인

`npx tsc -b apps/admin-dashboard/tsconfig.node.json --force` → 종료코드 0, 산출물:

```
apps/admin-dashboard/node_modules/.tmp/tsconfig-node/apps/admin-dashboard/{vite.config.js,vite.config.d.ts,tsconfig.node.tsbuildinfo}
apps/admin-dashboard/node_modules/.tmp/tsconfig-node/{vite.config.shared.js,vite.config.shared.d.ts}
```

- 소스 옆 오염 **0** (`apps/admin-dashboard/vite.config.js` · 루트 `vite.config.shared.js` 생성 안 됨).
- `node_modules/` 는 `.gitignore` 최상위 규칙이라 Git 추적 위험 **0**.
- 디스크에 남아 있던 stale `apps/admin-dashboard/dist-node/` 디렉터리는 **삭제**했다(추적 0 · 생성자 없음). `.gitignore` 의 `/apps/admin-dashboard/dist-node/` 규칙은 **재발 방지용으로 유지**한다.

---

## 4. 추가 stale residue (§18)

| 후보 | 조사 결과 | 처리 |
|---|---|---|
| `scripts/dev.mjs` 패키지 목록 | `['types','utils','ui','auth-client','auth-context','account-ui']` — **전부 존재** | 변경 없음 |
| `scripts/dev.mjs:106` 주석의 `'apps/ecommerce'` | 과거 수정 사유를 설명하는 주석(코드 아님) | 유지 |
| root `tsconfig.json` 의 `declaration`/`outDir: ./dist`/`composite` | root config 는 이번 축(부재 앱·admin build output)과 다른 대상이며 영향 범위가 크다 | **범위 밖 · 미변경** |
| `.gitignore` 의 dist-node 규칙 | 생성자는 사라졌으나 재발 방지 anchored 규칙으로 유효 | 유지 |
| 형제 config 6개(`composite` + `outDir` 없음)의 소스-옆 emit 가능성 | `tsc -b` 실 caller 0 이라 현재 발생하지 않음. 저장소 전반 관례 문제 | **보고만** (별도 판단) |

unrelated runtime/API/DB cleanup 으로 확대하지 않았다.

---

## 5. 검증 (§19~§24)

| 항목 | 결과 |
|---|---|
| `bash -n scripts/development/dev.sh` | **PASS** |
| `pnpm --filter @o4o/admin-dashboard type-check` (`tsc --noEmit`) | **PASS** (에러 0) |
| `pnpm --filter @o4o/admin-dashboard build` | **PASS** — `✓ built in 21.19s`, JS chunk **229개** + CSS 3개 (직전 WO 측정치 229 와 동일 · 회귀 없음), `postbuild` 정상 |
| build 후 `dist-node` 재생성 여부 | **생성되지 않음** (vite build 는 `tsc -b` 를 호출하지 않는다) |
| `npx tsc -b apps/admin-dashboard/tsconfig.node.json --force` | **종료코드 0** · 산출물은 `node_modules/.tmp/tsconfig-node/**` |
| build·tsc 후 `git status --porcelain` | 이번 WO 의도 변경 3파일뿐. **범위 밖 신규 dirt 0** |
| guard spec (`legacy-wordpress-block-editor-retirement.spec.ts`) | **88/88 PASS** (직전 86 + 신규 2) |
| admin `vitest run --passWithNoTests` | **PASS** — 13 files / 229 tests |

---

## 6. Guard (§25)

새 spec 파일을 만들지 않고 기존 `apps/api-server/src/__tests__/legacy-wordpress-block-editor-retirement.spec.ts` 에 `describe 11` 을 추가했다.

| 고정 계약 | 구현 |
|---|---|
| `dev.sh` 에 absent app reference 0 | `for app in ...` 목록 전수 → `apps/<name>` 존재 단언 |
| admin `tsconfig.node.json` 이 dead `dist-node` output 을 강제하지 않음 | `outDir` 에 `dist-node` 문자열 불포함 단언 |
| `composite` 는 **유지** 강제 | `composite === true` 단언 — §25 의 "유지 필요성이 확인된 옵션은 제거를 강제하지 않는다" 적용 |
| `dist-node` tracked 0 / `workspace-packages.json` tracked 0 | 직전 WO 의 `describe 10` 이 이미 커버(계속 PASS) |

`outDir` 자체의 존재는 강제하지도 금지하지도 않는다 — `composite` 가 emit 을 요구하는 한 경로 지정이 필요하기 때문이다.

---

## 7. Git

| 항목 | 값 |
|---|---|
| 변경 파일 | `scripts/development/dev.sh` · `apps/admin-dashboard/tsconfig.node.json` · `apps/api-server/src/__tests__/legacy-wordpress-block-editor-retirement.spec.ts` · 본 CHECK |
| 금지 항목 | autostash 0 / rebase 0 / `--amend` 0 / `git add .` 0 / force push 0 / foreign 변경 0 |
| staging | `git add -- <paths...>` → `check-staged-scope.mjs` PASS 후 pathspec 커밋 |

---

## 8. 최종 판정

**`DEV_BUILD_CONFIG_AND_STALE_APP_RESIDUE_CLEANED`**

| 완료 기준 (§32) | 결과 |
|---|---|
| stale app reference unexplained | **0** |
| dead dev prebuild·reference unexplained | **0** |
| tsconfig.node ownership · composite · declaration · dist-node 생성 필요성 판정 | **완료** (§3-5) |
| typecheck · build · tests | **PASS** |
| build 후 unintended git dirty | **0** |
| runtime 기능 변경 | **0** |
| dependency 변경 | **0** |
| DB write / migration | **0 / 0** |
| UNKNOWN | **0** |

---

## 9. 문서 정합 (CLAUDE.md §16)

- 기준 문서(`docs/baseline/**` · `docs/architecture/**` · `docs/rules/**`) 중 이번 변경으로 낡아진 서술 **없음**.
- `dist-node` · `apps/ecommerce` · `apps/digital-signage` 언급은 전부 `docs/checks/**` · `docs/archive/**` 기록물(§16-1 대상 외)이다.

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```
