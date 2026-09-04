# WO-O4O-TRACKED-GENERATED-ARTIFACT-AND-DEV-TOOLING-RESIDUE-CLEANUP-V1 — CHECK

**최종 판정: `TRACKED_GENERATED_AND_DEV_RESIDUE_CLEANED`**

| 항목 | 값 |
|---|---|
| 기준 커밋 | `097831c41` (origin/main) |
| 작업 worktree | `/c/tmp/o4o-block-core-retire` · branch `work/o4o-tracked-artifact-cleanup-v1` |
| 축 | A `apps/admin-dashboard/dist-node/**` · B `workspace-packages.json` · C `scripts/development/dev.sh` 사전빌드 목록 |
| DB write | 0 |
| migration | 0 |
| dependency 변경 | 0 (`package.json` · `pnpm-lock.yaml` 미변경) |
| runtime 기능 변경 | 0 |

---

## 1. 배경

직전 3개 WO(`LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-RETIREMENT` · `WINDOW-WP-POLYFILL-RETIREMENT` ·
`BLOCK-CORE-ORPHAN-PACKAGE-CENSUS-AND-RETIREMENT`)가 각각의 CHECK 에서 **범위 밖으로 남겨둔**
세 가지 잔재를 하나의 정리 축으로 묶어 닫는다.

핵심 질문: **이 파일/설정이 현재 runtime · build · CI · 개발 흐름에서 실제 필요한가?**

---

## 2. 축 A — `apps/admin-dashboard/dist-node/**`

### 2-1. 모집단

Git 추적 파일 **4개** (저장소 전체에서 `dist-node` 추적 파일은 이 4개가 전부):

```
apps/admin-dashboard/dist-node/vite.config.shared.d.ts
apps/admin-dashboard/dist-node/vite.config.shared.js
apps/admin-dashboard/dist-node/apps/admin-dashboard/vite.config.d.ts
apps/admin-dashboard/dist-node/apps/admin-dashboard/vite.config.js
```

최초 추적 커밋 `2dcfb2860` (2025-08-11). `.gitignore` 에 `dist-node` 규칙 없음
(`dist/` 규칙은 `dist-node` 에 적용되지 않는다 — `git check-ignore` 종료코드 1).

### 2-2. 생성 방식

`apps/admin-dashboard/tsconfig.node.json` 의 산출물이다.

```jsonc
"composite": true, "declaration": true,
"outDir": "./dist-node", "rootDir": "../..",
"include": ["vite.config.ts", "../../vite.config.shared.ts"]
```

`apps/admin-dashboard/tsconfig.json` 이 `references: [{ "path": "./tsconfig.node.json" }]` 로 참조한다.
즉 `tsc -b` 실행 시 재생성되는 **컴파일 산출물**이며 소스가 아니다.

### 2-3. 소비처 전수 (§7 분류)

| 후보 | 결과 | 분류 |
|---|---|---|
| `import` / `require` / 경로 참조 | 0건 (`rg 'dist-node'` 히트는 `tsconfig.node.json:14` 의 `outDir` 와 과거 CHECK 문서뿐) | — |
| admin `package.json` scripts | `build: vite build` · `type-check: tsc --noEmit` — **`tsc -b` 없음** | `ACTIVE_BUILD` 아님 |
| `scripts/dev.mjs` type-check | admin tsconfig 는 solution tsconfig(`files: []`)가 아니므로 `tsc --noEmit` 경로 → emit 없음 | — |
| `.github/workflows/deploy-admin.yml` | `dist-node` 참조 0. 배포는 `dist/` 만 사용 | `ACTIVE_CI` 아님 |
| `apps/admin-dashboard/Dockerfile` | `COPY dist /usr/share/nginx/html` — `dist-node` 참조 0 | `ACTIVE_RUNTIME` 아님 |
| Vite 실행 | `vite.config.ts` **원본**을 직접 읽는다 | — |

### 2-4. drift 실측 (판정의 결정적 근거)

`npx tsc -b --force tsconfig.node.json` 로 재생성한 결과를 추적본(`HEAD`)과 비교하면
추적본은 **이미 제거된 패키지들의 alias 를 그대로 담고 있다**:

| 추적본에만 있는 내용 | 실제 상태 |
|---|---|
| `'@o4o/forum-core-yaksa': .../packages/forum-yaksa` | `WO-O4O-FORUM-YAKSA-...-REMOVAL-V1` 에서 제거됨 |
| `'@o4o/dropshipping-core': .../packages/dropshipping-core/src` | 패키지 부재 |
| `'@o4o/cgm-pharmacist-app': .../packages/cgm-pharmacist-app/src` | `CHECK-O4O-CGM-PHARMACIST-APP-RETIREMENT-V1` 에서 제거됨 |
| 구버전 `optimizeDeps` 의 `@wordpress/*` 6종 | `WO-O4O-WINDOW-WP-POLYFILL-RETIREMENT-V1` 에서 제거됨 |

반대로 재생성본에만 있는 `'@o4o/security-core'` alias 는 추적본에 없다.
직전 `810097c63` 이 이 산출물을 **손으로 3줄 수정**해 소스와 맞추려 한 이력도 있다 —
생성물을 소스처럼 유지해 온 anti-pattern 의 직접 증거다.

### 2-5. 판정

**`GENERATED_TRACKED_ARTIFACT`** — runtime/build/CI consumer 0, 소스 아님, 추적본은 stale.

### 2-6. 조치

- `git rm -r --cached apps/admin-dashboard/dist-node` (파일은 디스크에 남는 정상 산출물)
- `.gitignore` 에 anchored 규칙 `/apps/admin-dashboard/dist-node/` 추가

---

## 3. 축 B — `workspace-packages.json`

### 3-1. 모집단

루트 추적 파일 1개. 264,841 bytes / 7,410 lines. 추가 커밋 `4b4dde931` (2025-09-20).

내용은 `pnpm ls --json` 형태의 **node_modules 인벤토리 덤프**이며, 최상위가 배열(길이 1)이고
모든 `path` 가 **다른 머신의 Linux 경로**를 가리킨다:

```
"path": "/home/sohae21/o4o-platform/node_modules/@wordpress/block-editor"
```

이미 저장소에서 사라진 패키지(`@o4o/forum-types` · `@wordpress/*` · `date-fns` 등)를 그대로 담고 있다.

### 3-2. 소비처 전수

| 후보 | 결과 |
|---|---|
| 코드/스크립트/CI/Docker 참조 | **0건** |
| `rg 'workspace-packages'` 히트 | `.npmrc` · `.npmrc.pnpm` 의 `prefer-workspace-packages=true` (**동명이의 설정어 — 무관**) + 과거 CHECK 문서 |
| 생성기(generator) 스크립트 | 저장소 내 **0건** (외부 머신에서 1회 생성돼 커밋된 것) |

### 3-3. 판정

**`LOCAL_ENV_SNAPSHOT` / `DEAD_ARTIFACT`** — tool input 아님, 소비처 0, 재생성 경로 0.

### 3-4. 조치

- `git rm workspace-packages.json` — 다른 머신의 1회성 스냅샷이라 디스크 보존 가치가 없다
- `.gitignore` 에 anchored 규칙 `/workspace-packages.json` 추가 (재커밋 방지)
- 제거할 generator 없음 (§13 의 "generator 까지 제거" 해당 없음)

---

## 4. 축 C — `scripts/development/dev.sh` 사전빌드 목록

### 4-1. `dev.sh` 자체는 살아 있다

루트 `package.json` 이 5개 script 에서 호출한다 (`type-check:sh` · `type-check:frontend:sh` ·
`lint:sh` · `lint:fix:sh` · `test:sh`, L67-71). → **보존** (§16 의 "아무도 호출하지 않으면 기록" 해당 없음).

### 4-2. 사전빌드 목록 실재 검증

| 위치 | 목록 | 실재 여부 |
|---|---|---|
| `dev.sh:56` (`run_type_check`) | types utils ui auth-client auth-context **forum-types** | `packages/forum-types` **부재** |
| `dev.sh:79` (`run_type_check_frontend`) | 동일 | 동일 |
| `dev.sh:134` (`build_packages`) | 동일(배열 형태) | 동일 |
| `scripts/dev.mjs:276` | types utils ui auth-client auth-context account-ui | **전부 실재** — 변경 없음 |

`packages/` 실측 56개 디렉터리에 `forum-types` 없음. 저장소 전체에서 `@o4o/forum-types` 문자열은
`workspace-packages.json`(축 B, 이번에 제거)과 `dev.sh` 3곳뿐이다.

### 4-3. 판정

**`STALE_PACKAGE_REFERENCE`** — `[ -d "packages/$pkg" ]` 가드 덕에 런타임 오류는 없지만
존재하지 않는 패키지를 가리키는 죽은 항목이다.

### 4-4. 조치

3곳에서 `forum-types` 만 제거. `dev.sh` 자체와 나머지 항목·함수는 그대로 둔다.

### 4-5. 같이 발견했으나 **제거하지 않은** 항목 (설명하고 보존)

`dev.sh` 의 **앱 순회 목록**(`for app in ...`, L65 · L88 · L121)에 부재 앱 2개가 있다:

| 항목 | 상태 | 처리 |
|---|---|---|
| `apps/ecommerce` | 디렉터리 부재 | **미변경** — 사전빌드(package) 목록이 아니라 앱 순회 목록이며, WO §14 대상 축 밖 |
| `apps/digital-signage` | 디렉터리 부재 | **미변경** — 동일 |

둘 다 `[ -d "apps/$app" ]` 가드 안이라 무해하다. 범위를 넓히지 않기 위해(§18) 기록만 한다.
→ **후속 후보 1**.

---

## 5. 변경 목록

| 종류 | 파일 |
|---|---|
| UNTRACK (디스크 보존) | `apps/admin-dashboard/dist-node/**` 4개 |
| DELETE | `workspace-packages.json` |
| EDIT | `.gitignore` (anchored 2줄 추가) · `scripts/development/dev.sh` (3곳) · guard spec |
| ADD | 본 CHECK 문서 |

`.gitignore` 추가분:

```gitignore
# tsc project-reference 산출물 (apps/admin-dashboard/tsconfig.node.json 의 outDir)
# WO-O4O-TRACKED-GENERATED-ARTIFACT-AND-DEV-TOOLING-RESIDUE-CLEANUP-V1
/apps/admin-dashboard/dist-node/

# 로컬 node_modules 인벤토리 스냅샷 (생성물 · 소스 아님)
/workspace-packages.json
```

상위에 이미 존재하는 `dist/` 규칙은 두 경로를 덮지 않으므로 중복이 아니다.
광범위 규칙(`*.json` 류)은 추가하지 않았다.

### 5-1. 커밋이 2개인 이유 (§27 사고 기록)

첫 커밋 `ca6b70171` 은 `git commit -- <pathspec...>` 의 pathspec 에
`apps/admin-dashboard/dist-node` 를 포함했는데, 그 사이에 §22 재생성 검증
(`npx tsc -b --force`)으로 산출물이 다시 만들어져 있었다.
pathspec commit 이 작업트리 상태를 다시 읽어 **삭제가 수정으로 바뀌었고 4파일이 다시 추적**됐다.
WO §27 이 경고한 바로 그 상황이다.

`--amend` 는 §26 금지이므로 **후속 커밋**에서
`git rm -r --cached apps/admin-dashboard/dist-node` 를 **pathspec 없이** 커밋해 바로잡았다
(staged 범위는 `check-staged-scope.mjs` 로 사전 확인). 최종 상태에서 추적 파일은 0개다.

---

## 6. Guard (§19-20)

새 spec 파일을 만들지 않고 기존
`apps/api-server/src/__tests__/legacy-wordpress-block-editor-retirement.spec.ts` 에
`describe 10` 을 추가했다 (raw-source + `git ls-files`, DB·네트워크 접근 0).

| 고정 계약 | 방식 |
|---|---|
| `apps/admin-dashboard/dist-node` 추적 0 | `git ls-files -- <pathspec>` 결과 `[]` |
| `workspace-packages.json` 추적 0 | 동일 |
| anchored ignore 2줄 존재 | `.gitignore` 라인 단언 |
| 광범위 `*.json` ignore 0 | `.gitignore` 정규식 단언 |
| 소스 vite config 보존 | `vite.config.ts` · `vite.config.shared.ts` · `tsconfig.node.json` 존재 |
| dev 사전빌드 목록에 부재 패키지 0 | `dev.sh` 목록 파싱 후 `packages/<name>` 실재 검사 |

`.git` 이 없는 환경에서는 추적 판정을 건너뛴다(오탐 방지).

---

## 7. 검증 결과

| 검증 | 결과 |
|---|---|
| `git ls-files apps/admin-dashboard/dist-node` | **0건** |
| `git ls-files workspace-packages.json` | **0건** |
| `git check-ignore -v` | `.gitignore:59` · `.gitignore:62` — 정확히 anchored 규칙에만 매칭 |
| ignore 범위 오염 (`git ls-files \| git check-ignore --stdin`) | **0건** — 다른 추적 파일을 먹지 않는다 |
| **생성물 재생성 후 `git status --porcelain`** | `npx tsc -b --force` 로 `dist-node/**` + `tsbuildinfo` 재생성 → **신규 항목 0** |
| admin `tsc --noEmit` | **PASS** (exit 0) |
| admin `vite build` | **PASS** (exit 0 · 19.87s · `dist/assets/*.js` 229개) |
| admin vitest | **13 files / 229 tests PASS** |
| api-server Jest 전체 | **222 suites / 3,758 tests PASS** (164.7s) |
| guard spec | **86/86 PASS** (직전 81 → 신규 5) |
| `bash -n scripts/development/dev.sh` | **PASS** (문법 정상) |
| dependency | `package.json` · `pnpm-lock.yaml` diff **0** |

### 7-1. 비고

- admin build 의 chunk 수는 229 다. 직전 WO CHECK 의 232 는 계수 방식이 달랐던 값이며,
  이번 WO 는 **admin 소스 diff 가 0** 이므로 빌드 결과에 영향을 줄 수 없다.
- `dist-node` 는 untrack 후에도 디스크에 정상 재생성되며 build 는 깨지지 않는다 (§24 확인).

---

## 8. 중지 조건 점검 (§30)

| 조건 | 해당 |
|---|---|
| dist-node 실제 CI/runtime consumer 발견 | 없음 |
| `workspace-packages.json` 실제 tool input 발견 | 없음 (`.npmrc` 의 `prefer-workspace-packages` 는 동명이의) |
| dev prebuild 대상이 실제 필수 package | 없음 (`forum-types` 부재 확정) |
| untrack 후 build 실패 | 없음 (build PASS) |
| ignore 가 다른 파일까지 먹음 | 없음 (오염 0건) |
| UNKNOWN consumer | **0** |

---

## 9. 후속 후보

1. `scripts/development/dev.sh` 의 앱 순회 목록 부재 항목 2건(`apps/ecommerce` · `apps/digital-signage`) — §4-5.
2. `apps/admin-dashboard/tsconfig.node.json` 의 `composite`/`declaration` 이 실제로 필요한지
   (현재 `tsc -b` 를 호출하는 script 가 없다) — build 인프라 판단이라 별도 WO.

---

## 10. 문서 정합 (CLAUDE.md §16)

기준 문서(`docs/baseline/**` · `docs/architecture/**` · `docs/rules/**`) 대상 drift 발견 **0건**.
`dist-node` / `workspace-packages.json` 언급은 전부 `docs/checks/**`(기록물, §16-1 대상 외)이다.

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```
