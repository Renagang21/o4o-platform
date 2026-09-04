# WO-O4O-BLOCK-CORE-ORPHAN-PACKAGE-CENSUS-AND-RETIREMENT-V1 — CHECK

- **작업일**: 2026-09-04
- **시작 기준**: `origin/main = acb5c7243`
- **작업 worktree**: `/c/tmp/o4o-block-core-retire` · branch `work/o4o-block-core-orphan-v1`
- **최종 판정**: **`ORPHAN_PACKAGE_RETIRED`**
- **선행 CHECK**: [WO-O4O-WINDOW-WP-POLYFILL-RETIREMENT-V1-CHECK.md](WO-O4O-WINDOW-WP-POLYFILL-RETIREMENT-V1-CHECK.md) · [WO-O4O-WINDOW-WP-POLYFILL-RUNTIME-CENSUS-V1-CHECK.md](WO-O4O-WINDOW-WP-POLYFILL-RUNTIME-CENSUS-V1-CHECK.md)

---

## 1. package 구조 (삭제 전)

| 항목 | 결과 |
|---|---|
| package name | `@o4o/block-core` (v1.0.0, `o4o:packageType: infra-core`) |
| exports | `BlockManager` · `BlockRegistry` · `PluginLoader` · type 7종 · default `blockManager` 싱글턴 |
| build script | `tsup` (`build` / `build:js` / `dev`) |
| dist 존재 | **커밋된 dist 0** (`.gitignore:55 dist/`) — 로컬 빌드 산출물만 |
| source files | 5개 / 924 lines (`BlockManager.ts` 243 · `BlockRegistry.ts` 255 · `PluginLoader.ts` 271 · `types.ts` 119 · `index.ts` 36) |
| tests | **0개** (`"test": "jest --passWithNoTests"` 스크립트만) |
| config | `tsconfig.json` · `tsup.config.ts` |

`src/index.ts` 는 import 시점에 `BlockManager.getInstance().initialize()` 를 auto-run 하는 side-effect 진입점이었다. 즉 **import 되는 순간 동작하는 패키지**였고, import 하는 곳이 0 이라 실행된 적이 없다.

---

## 2. runtime consumer 전수 census

검색어: `@o4o/block-core` · `packages/block-core` · relative import · dynamic import · `require()` · path alias · barrel re-export.

| 분류 | 건수 | 내용 |
|---|:--:|---|
| `ACTIVE_RUNTIME` | **0** | 소스 import 0 |
| `BUILD_ONLY` | 2 | `scripts/dev.mjs:276` · `scripts/development/dev.sh:56,79` — 로컬 dev 헬퍼의 사전빌드 목록(둘 다 `existsSync` / `[ -d ]` 가드) |
| `TEST_ONLY` | 0 | |
| `DOC_ONLY` / `HISTORICAL` | 6 문서 | `docs/checks/**` — 과거 기록이므로 소비처로 세지 않는다 |
| `DEAD_REFERENCE` | 0 | |
| `UNKNOWN` | **0** | |

relative import · dynamic import · path alias · barrel re-export **전부 0**.

`apps/admin-dashboard/src/components/editor/BlockWrapper.tsx:137` 의 `wp-block-core-paragraph` 는 CSS class 문자열이며 패키지 참조가 아니다(오탐 배제).

---

## 3. package.json dependency census

저장소 전체 `package.json` 에서 `@o4o/block-core` 참조:

| 소비처 | 종류 |
|---|---|
| `packages/block-core/package.json` | **자기 자신(`name`)** |

`dependency` / `devDependency` / `peerDependency` / `optionalDependency` / workspace alias 소비처 = **0**.

루트 `build:packages` 체인(17개 패키지)에도 block-core 는 **포함되어 있지 않다**.

---

## 4. lock / workspace census

| 항목 | 결과 |
|---|---|
| `pnpm-workspace.yaml` | `packages/*` glob 로만 포함 — **개별 지정 없음** |
| `pnpm-lock.yaml` | `packages/block-core:` importer 1건 (react / react-dom / tsup / typescript — 전부 자기 자신용) |
| 다른 패키지의 transitive dependency | **아니오** |
| 루트 `build:packages` | 미포함 |

→ **workspace glob 때문에 존재만 하던 패키지**. 다른 무엇도 이 패키지를 필요로 하지 않았다.

---

## 5. CI / build ownership

| 대상 | 결과 |
|---|---|
| `.github/workflows/**` | `block-core` 참조 **0** |
| `Dockerfile*` | **0** |
| publish / release workflow | **존재하지 않음** (`npm publish` / changesets 0) |
| `scripts/**` | 로컬 dev 헬퍼 2개 (가드 있는 사전빌드 목록) |

**판정: `NO_CI_CONSUMER`** — dev 헬퍼는 `GENERIC_WORKSPACE_BUILD_ONLY` 성격이며 CI 경로가 아니다.

---

## 6. 독립 entrypoint 여부

CLI · worker · server · publish · docker image · Cloud Run · static asset — **전부 0**.
`publishConfig.access: public` 선언은 있으나 실제 publish 경로(workflow · 릴리즈 기록)가 없어 외부 계약으로 보지 않는다.

---

## 7. dist / build 실측

```
pnpm --filter @o4o/block-core build   → exit 0
  dist/index.js   16.63 KB
  dist/index.mjs  15.00 KB
  (dts 비활성 — tsup.config.ts `dts: false`)
```

**빌드는 성공하지만 소비처가 0 이다.** 본 WO 는 "build 성공 ≠ active package" 원칙에 따라 이를 active 근거로 쓰지 않는다.

---

## 8. `window.wp` residue (패키지 내부)

선행 census 가 기록한 4건을 현재 HEAD 에서 재확인:

| 위치 | 분류 |
|---|---|
| `src/BlockRegistry.ts:213,215` | `registerBlockType` 미러 등록 — `DEAD_COMPAT` |
| `src/BlockRegistry.ts:236,238` | `unregisterBlockType` 미러 해제 — `DEAD_COMPAT` |

`globalThis.wp` · `wp.domReady` = 0. `ACTIVE_INTERNAL` = 0 · `UNKNOWN` = 0.

---

## 9. `@wordpress/*` residue

선행 census 가 기록한 5건을 재확인:

| 위치 | 분류 |
|---|---|
| `tsup.config.ts:18-22` — `@wordpress/blocks` · `block-editor` · `components` · `element` · `i18n` | **`BUILD_CONFIG_RESIDUE`** |

실제 `import` 0 · types 참조 0 · dependency 선언 0. 설치되지도 않은 패키지를 external 로 선언한 무효 설정이었다.

---

## 10. exported symbol 실사용

| symbol | 저장소 전체 consumer |
|---|:--:|
| `BlockManager` | 0 |
| `PluginLoader` | 0 |
| `BlockRegistry` (block-core 것) | 0 |
| `BlockPlugin` · `BlockDefinition` · `BlockAttribute` · `BlockSupports` · `PluginSettings` · `LoadOptions` · `PluginMetadata` | 0 |

**exported symbol active consumers = 0.**

---

## 11. 다른 block 축과의 분리 증명

| 축 | block-core 의존 | 결론 |
|---|:--:|---|
| `apps/admin-dashboard/src/blocks/**` (자체 `registry/BlockRegistry.ts`) | **없음** — 이름만 같은 **별도 구현**, import 0 | 영향 0 |
| `@o4o/block-renderer` | **없음** (`block-core` · `BlockManager` · `PluginLoader` 참조 0) | 영향 0 |
| `DynamicRenderer` | 미접촉 | 영향 0 |
| `@o4o/content-editor` · `RichTextEditor` · CMS V2 | 미접촉 | 영향 0 |
| `scripts/audit/check-block-registry.ts` | admin `src/blocks/**` 만 검사 | audit contract 변화 0 |

---

## 12. Docs / current contract

현재형 기준 문서(`docs/baseline` · `docs/architecture` · `docs/rules` · `docs/platform` · `docs/guides`)에서 block-core 를 active package 로 설명하는 문서 = **0**.
`docs/checks/**` 6건은 전부 `HISTORICAL_DOC` 이며 소비처로 세지 않는다.

---

## 13. 판정

§19 조건 전수 충족:

```
runtime consumer             = 0
package dependency consumer  = 0
CI-specific consumer         = 0
independent deployment       = 0
external/public consumer     = 0
raw-source active consumer   = 0
current docs active contract = 0
UNKNOWN                      = 0
```

→ **`ORPHAN_PACKAGE_RETIRE_READY`** → §20 에 따라 본 WO 에서 즉시 삭제 → **`ORPHAN_PACKAGE_RETIRED`**

---

## 14. 실행 결과

### 14-1. 삭제 (DELETE 8)

```
packages/block-core/package.json
packages/block-core/tsconfig.json
packages/block-core/tsup.config.ts
packages/block-core/src/index.ts
packages/block-core/src/BlockManager.ts
packages/block-core/src/BlockRegistry.ts
packages/block-core/src/PluginLoader.ts
packages/block-core/src/types.ts
```

부분 보존 없음. `window.wp` 4건 · `@wordpress/*` 5건도 패키지와 함께 사라졌다.

### 14-2. 정합 수정 (EDIT 3)

| 파일 | 변경 |
|---|---|
| `pnpm-lock.yaml` | `packages/block-core:` importer stanza(22줄) 제거. **다른 importer · resolution 변화 0** |
| `scripts/dev.mjs:276` | 사전빌드 목록에서 `'block-core'` 제거 |
| `scripts/development/dev.sh:56,79` | 사전빌드 목록에서 `block-core` 제거 (2곳) |

### 14-3. guard 보강 (EDIT 1)

신규 spec 파일을 만들지 않고 기존 은퇴 spec 을 확장했다 —
`apps/api-server/src/__tests__/legacy-wordpress-block-editor-retirement.spec.ts` 에
`describe('9. packages/block-core orphan 패키지 은퇴 계약 …')` 추가.

고정 계약:

- `packages/block-core` 디렉터리 부재
- 활성 소스(`apps` · `packages` · `services` · `scripts`, `node_modules` / `dist` 제외)에 `@o4o/block-core` · `packages/block-core` 참조 0 — 주석 제거 후 판정
- `pnpm-lock.yaml` 에 block-core importer 부재
- 보존 축 존재: admin `blocks/registry/BlockRegistry.ts` · `blocks/index.ts` · `packages/block-renderer` · `scripts/audit/check-block-registry.ts`

---

## 15. 검증

| 항목 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | **PASS** (1m 42s) — lockfile 정합 확인 |
| `pnpm run build:packages` | **PASS** (exit 0) |
| `pnpm --filter @o4o/admin-dashboard type-check` | **PASS** |
| `pnpm --filter @o4o/block-renderer build` | **PASS** |
| `pnpm --filter @o4o/admin-dashboard test` | **PASS** — 13 files / 229 tests |
| `pnpm --filter @o4o/admin-dashboard build` | **PASS** — chunk **232개** (직전 WO 와 동일, 변화 0) |
| `npx jest src/__tests__` (api-server) | **PASS** — 120 suites / **2281 tests** (직전 2276 → +5) |
| 은퇴 guard spec 단독 | **81 tests PASS** (76 → +5) |
| `npx tsx scripts/audit/check-block-registry.ts` | **32/32 · Missing 0 · Dangling 0** — 직전과 동일 |

---

## 16. 삭제 후 zero-consumer 재검색

| 검색어 | 활성 소스 잔여 |
|---|---|
| `@o4o/block-core` | **0** (guard spec 2 · `docs/checks` 1) |
| `packages/block-core` | **0** (guard spec 6 · `docs/checks` 다수 — 전부 HISTORICAL) |
| `window.wp` / `globalThis.wp` | **0** (guard spec 주석 · 단언만) |
| `@wordpress/` | 아래 §17 참조 |

---

## 17. 범위 외 발견 (수정하지 않음 · 보고)

| 위치 | 내용 | 판단 |
|---|---|---|
| `apps/admin-dashboard/dist-node/apps/admin-dashboard/vite.config.js:85-90` | **커밋된 빌드 산출물**에 구버전 `optimizeDeps` 의 `@wordpress/*` 6종이 남아 있다. 소스(`vite.config.ts`)는 직전 WO 에서 이미 정리됨 | `DEAD_REFERENCE` — 런타임 영향 0(vite 가 소비하지 않는 산출물). `dist-node/**` 를 추적하는 것 자체가 별건이므로 본 WO 범위 밖 |
| `workspace-packages.json` | `node_modules` 인벤토리 덤프(Linux 경로)에 `@wordpress/*` 다수 | **다른 축** — block-core 참조 0. 미접촉 |

---

## 18. 변경 요약

| 구분 | 수 |
|---|:--:|
| DELETE | 8 |
| EDIT | 4 (`pnpm-lock.yaml` · `scripts/dev.mjs` · `scripts/development/dev.sh` · guard spec) |
| 신규 CHECK | 1 |
| dependency 변경 | **0** (workspace importer 제거 외 external resolution 변화 0) |
| DB write / migration | **0** |
| production deploy | **0** |
| `UNKNOWN` | **0** |

---

## 19. 완료 기준 대조

| 기준 | 결과 |
|---|:--:|
| `packages/block-core` = absent | ✅ |
| `@o4o/block-core` active consumer = 0 | ✅ |
| runtime consumer = 0 | ✅ |
| CI consumer = 0 | ✅ |
| workspace dependency consumer = 0 | ✅ |
| admin block registry preserved | ✅ |
| `@o4o/block-renderer` preserved | ✅ |
| block registry Missing / Dangling = 0 | ✅ |
| pnpm install / typecheck / tests / build PASS | ✅ |
| DB write = 0 / migration = 0 / UNKNOWN = 0 | ✅ |

**최종 판정: `ORPHAN_PACKAGE_RETIRED`**

---

## 20. 후속 후보

1. `apps/admin-dashboard/dist-node/**` — 커밋된 빌드 산출물 4개 파일의 추적 여부 재판정(§17).
2. `workspace-packages.json` — 로컬 `node_modules` 덤프가 저장소에 추적되는 이유 확인.
3. `scripts/development/dev.sh` 의 `forum-types` 등 나머지 사전빌드 목록 항목 실재 여부 점검.
