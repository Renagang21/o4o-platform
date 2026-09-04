# WO-O4O-WINDOW-WP-POLYFILL-RETIREMENT-V1 — CHECK

> **최종 판정**: **`WINDOW_WP_POLYFILL_RETIRED`**
> **작성일**: 2026-09-04
> **시작 기준선**: `origin/main = 50f6d9449` (PR #201 merge) · 작업 브랜치 `work/o4o-window-wp-retire-v1` · 시작 시 worktree clean
> **선행 census**: [WO-O4O-WINDOW-WP-POLYFILL-RUNTIME-CENSUS-V1-CHECK.md](WO-O4O-WINDOW-WP-POLYFILL-RUNTIME-CENSUS-V1-CHECK.md) (`LEGACY_RETIRE_READY`)

이번 WO 는 **production 에 이미 존재하지 않는 `window.wp` 를 기대하던 compatibility residue 만 제거**하고,
살아 있는 자체 block registry · renderer · AI extractor 본체는 그대로 보존했다.

---

## 1. before consumer census (현재 HEAD 재확인)

활성 소스 기준(`node_modules` · `dist*` · `archive/**` · `docs/**` · `*.md` · `workspace-packages.json` 제외):

| 패턴 | before 합계 | 분포 |
|---|---:|---|
| `window.wp` | 17 | post-build.js 7 · block-core 4 · extractor 2 · admin BlockRegistry 2 · blocks/index 1 · spec 1 |
| `globalThis.wp` | 0 | — |
| `wp.domReady` | 3 | post-build.js 1 · spec 2 |
| `wp.blocks` | 5 | post-build.js 1 · extractor 1 · admin BlockRegistry 1 · block-core 2 |
| `@wordpress/` | 18 | vite.config.ts 6 · block-core/tsup.config.ts 5 · **public/wordpress-cdn.html 7** |
| `initializeCustomBlocks` | 1 | blocks/index.ts |

`post-build.js` 호출자 재확인 결과 **0 유지** — package script(`prebuild`=update-version.cjs, `postbuild`=인라인 `node -e`, `build:prod`=vite only) · `.github/workflows/deploy-admin.yml` · Dockerfile · shell script 어디에도 없음. 저장소 내 `post-build` 문자열은 CHECK 문서에만 존재.

### 1-1. census 이후 신규 발견 — `public/wordpress-cdn.html`

직전 census 가 잡지 못한 **동일 축 잔재**를 이번 시작 시점 재검색에서 발견했다.

```html
<!-- WordPress Dependencies from CDN -->
<script crossorigin src="https://unpkg.com/@wordpress/hooks@3.47.0/build/hooks.min.js"></script>
... (총 7줄, unpkg CDN 에서 @wordpress 7종 로드)
```

- 참조처 **0건** (어떤 HTML/TS 도 include 하지 않는 조각 파일)
- `public/` 이므로 빌드마다 `dist/wordpress-cdn.html` 로 그대로 복사되고 있었다
- 역할은 `post-build.js` 와 동일 — **`window.wp` 를 만들어 주는 두 번째 provider**

`post-build.js` 와 같은 축이고 소비처 0 이므로 이번 범위에 포함해 제거했다.

---

## 2. `post-build.js` 처리

| 항목 | 결과 |
|---|---|
| 조치 | **삭제** (`git rm apps/admin-dashboard/scripts/post-build.js`) |
| 근거 | 호출자 0 · 주입 결과가 어떤 산출물에도 없음 · 주입 없이 production 정상 동작 (census §14 3조건 전부 부정) |
| 삭제 후 잔여 | 활성 소스의 `post-build.js` 문자열 = 은퇴 설명 주석 1건 + guard spec 2건뿐 |

함께 삭제: `apps/admin-dashboard/public/wordpress-cdn.html` (§1-1).

---

## 3. `initializeCustomBlocks` 처리

- `apps/admin-dashboard/src/blocks/index.ts` 에서 `initializeCustomBlocks()` **와** 그 전용 payload 인 `blockStyles` 상수를 제거하고 은퇴 주석으로 대체했다.
- `blockStyles` 참조처는 `initializeCustomBlocks()` 내부 1곳뿐이어서 dead payload 로 확정 (WO §8 조건 충족).
- **보존**: `registerAllBlocks()` · `export { blockRegistry }` · `export * from './registry/types'` · `CUSTOM_BLOCKS`.
- `registerAllBlocks()` 는 `App.tsx:107` 에서 동적 import 로 살아 있으며 이번에 손대지 않았다.

---

## 4. admin `BlockRegistry.ts` 처리

`register()` 말미의 외부 WordPress 미러 등록 분기(`if (window.wp?.blocks?.registerBlockType) { … }` try/catch 포함)만 제거했다.

**보존**: `this.blocks` Map · `categoryIndex` · 등록/조회 API 전체. 등록 SSOT 는 내부 자료구조이며 제거 대상은 그 뒤의 부가 통지였다.

---

## 5. `block-registry-extractor.ts` 처리

- 파일 삭제 금지 준수 — 함수는 `services/ai/reference-fetcher.service.ts` 가 소비하는 live 코드다.
- 제거한 것은 소스 주석에 `하위 호환성` 이라 명시돼 있던 `window.wp?.blocks?.getBlockTypes` fallback 분기뿐이다.
- **보존**: `blockRegistry.getAll()` 기반 canonical 추출 · return contract · AI consumer 경로.
- canonical 추출이 전량을 채우고 WP 분기는 런타임에 한 번도 실행되지 않았으므로 반환 목록 불변.

---

## 6. `global.d.ts` 처리

`apps/admin-dashboard/src/types/global.d.ts` 의 `Window.wp` 선언(약 39줄)만 제거. `grecaptcha` · `ethereum` · `React` · `ReactDOM` 선언은 보존.

**미사용 확인**: `pnpm --filter @o4o/admin-dashboard type-check` PASS — 선언을 지워도 컴파일 오류가 없다는 것이 곧 실제 소비처 0 의 증거다.

---

## 7. config residue 판정

| 위치 | 문자열 | 판정 | 조치 |
|---|---|---|---|
| `apps/admin-dashboard/vite.config.ts:93-98` | `optimizeDeps.include` 의 `@wordpress/*` 6종 | **LEGACY_WP_RESIDUE** | 제거 (설치되지 않은 패키지의 pre-bundle 지정) |
| 동 `:144-145` | `modulePreload.resolveDependencies` 의 `!dep.includes('wp-') && !dep.includes('@wordpress')` | **LEGACY_WP_RESIDUE** | 제거 (대상 chunk 생성 0건) |
| 동 `:189-190` | `manualChunks` 의 `if (id.includes('@wordpress')) return 'wp-all'` | **LEGACY_WP_RESIDUE** | 제거 (한 번도 매칭된 적 없음) |
| `packages/block-core/tsup.config.ts:18-22` | `external` 의 `@wordpress/*` 5종 | **범위 외** | **미변경** — §3 명시적 제외 대상 |

판정 조건 충족: package dependency 0 · source import 0 · build artifact consumer 0.

### 7-1. config 변경 regression 검증 (§15 중지 조건 대응)

config 변경 **전후로 각각 production build 를 실행**해 hash 를 제거한 chunk 이름 집합을 비교했다.

```text
before(config 미변경, 소스 은퇴만 적용) = 232 chunks
after (config 정리 적용)                = 232 chunks
diff                                     = 0 (집합 완전 동일)
```

`wp-` 로 시작하는 chunk = 0건. dependency resolution · chunk 이름 · shared package build 영향 모두 없음 → 중지 조건 미해당.

---

## 8. guard 보강

기존 `apps/api-server/src/__tests__/legacy-wordpress-block-editor-retirement.spec.ts` 를 확장했다(**신규 spec 파일 0**, WO §16 우선순위 준수).

추가된 `describe('8. window.wp polyfill 축 은퇴 계약 …')` 이 고정하는 계약:

| 계약 | 비고 |
|---|---|
| 활성 소스에 `window.wp` · `globalThis.wp` · `wp.domReady` · **`wp?.domReady`** · `wp.blocks` · `@wordpress/` 잔재 0 | 직전 census 가 지적한 **optional chaining 사각지대**를 여기서 함께 고정 |
| `scripts/post-build.js` 부재 | |
| `public/wordpress-cdn.html` 부재 | |
| `initializeCustomBlocks` 진입점 0 | |
| canonical 보존 — `registerAllBlocks` · `CUSTOM_BLOCKS` · `BlockRegistry.ts` · `DynamicRenderer.tsx` · `block-registry-extractor.ts` 존재 | 은퇴가 canonical 축을 침범하지 않았음을 고정 |

검사 범위는 **admin-dashboard 활성 소스**(`src/**/*.{ts,tsx}` + `vite.config.ts` + `public/**` + `scripts/**`)로 한정하고, 은퇴 설명 주석을 오탐시키지 않도록 기존 `stripComments()` 헬퍼를 재사용한다.
`packages/block-core` 는 별도 WO 대상이므로 검사 범위에서 명시적으로 제외했다(spec 주석에 사유 기재).

spec 결과: **66 → 76 tests, 전부 PASS** (+10).

---

## 9. after zero census

| 패턴 | 활성 소스 잔여 | 분류 |
|---|---|---|
| `window.wp` | `packages/block-core` 4 · guard spec 4 | 범위 외 / TEST |
| `globalThis.wp` | guard spec 1 | TEST |
| `wp.domReady` | guard spec 4 | TEST |
| `wp?.domReady` | guard spec 2 | TEST |
| `wp.blocks` | `packages/block-core` 2 · guard spec 1 | 범위 외 / TEST |
| `@wordpress/` | `block-core/tsup.config.ts` 5 · vite.config 주석 1 · guard spec 2 | 범위 외 / CONFIG(주석) / TEST |
| `post-build.js` | admin BlockRegistry 주석 1 · guard spec 2 | CONFIG(주석) / TEST |
| `initializeCustomBlocks` | blocks/index 주석 2 · guard spec 2 | CONFIG(주석) / TEST |

**ACTIVE unexplained = 0.** `DEAD_REFERENCE = 0` · `UNKNOWN = 0`.

---

## 10. registry before / after

| 항목 | before | after |
|---|---:|---:|
| definition files | 32 | 32 |
| registered | 32 | 32 |
| Missing | 0 | 0 |
| Dangling | 0 | 0 |

`npx tsx scripts/audit/check-block-registry.ts` 실측. **변화 0.**
`DynamicRenderer` 는 import·본문 모두 `wp` 참조가 없어 이번 변경의 영향을 받지 않는다(census §11 `INDEPENDENT` 유지, 파일 미변경).

---

## 11. 검증 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| packages build | `pnpm run build:packages` | PASS (exit 0) |
| admin typecheck | `pnpm --filter @o4o/admin-dashboard type-check` | **PASS** |
| admin tests | `pnpm --filter @o4o/admin-dashboard test` | **PASS** — 13 files / 229 tests |
| registry audit | `npx tsx scripts/audit/check-block-registry.ts` | **32/32 · Missing 0 · Dangling 0** |
| api-server specs | `npx jest src/__tests__` | **PASS** — 120 suites / **2276 tests** |
| retirement spec | 동 spec 단독 | **76/76 PASS** (기존 66 + 신규 10) |
| production build | `pnpm --filter @o4o/admin-dashboard build` | **PASS** (config 전/후 2회 모두) |

### 11-1. dist residue

```text
dist/**  window.wp            = 0
dist/**  wp.domReady          = 0
dist/**  @wordpress           = 0
dist/assets  wp-* chunk       = 0
dist/wordpress-cdn.html       = 부재
```

(직전 census 시점 dist 에는 `window.wp` 히트 2파일/4건이 남아 있었다 → **이번 은퇴로 0.**)

---

## 12. browser smoke

### 12-1. 로컬 production build smoke (실시)

`npx vite preview --port 4178` + 실제 브라우저(Playwright) 접속.

| 측정 | 값 |
|---|---|
| HTTP | 200 · 서빙 HTML 의 `window.wp` 0건 |
| `typeof window.wp` (App 마운트 5초 후) | `"undefined"` |
| `Object.keys(window.wp \|\| {})` | `[]` |
| admin shell 렌더 | 정상 — `/login` 리다이렉트, `#root` innerHTML 4,296자 |
| JS fatal error | **0** — 콘솔 오류는 `https://api.neture.co.kr/api/v1/auth/status` CORS 2건뿐(localhost origin 이므로 예상된 결과, `wp` 무관) |

### 12-2. production smoke

**미실시** — 이번 WO 는 배포를 수행하지 않았다(§O 19 항목: production deploy 0).
직전 census 에서 배포본이 이미 `typeof window.wp === "undefined"` 임을 실측했고, 이번 변경은 그 상태를 코드에서 확정한 것이므로 값이 바뀔 여지가 없다. 배포 후 재확인은 후속 배포 시점에 수행 권장.

---

## 13. `packages/block-core` 분리 상태

```text
수정 0 / 삭제 0 / dependency 변경 0
```

WO §26 준수. 해당 패키지의 `window.wp` 분기(`src/BlockRegistry.ts:213,215,236,238`)는 **consumer 0 orphan 패키지 문제**이므로 축을 섞지 않고 그대로 두었다. guard spec 검사 범위에서도 명시적으로 제외했다.

후속: `WO-O4O-BLOCK-CORE-ORPHAN-PACKAGE-CENSUS-AND-RETIREMENT-V1`

---

## 14. 변경 요약

| 항목 | 값 |
|---|---|
| 변경 파일 | **8** (삭제 2 · 수정 5 · CHECK 신규 1) |
| 삭제 | `apps/admin-dashboard/scripts/post-build.js` · `apps/admin-dashboard/public/wordpress-cdn.html` |
| 수정 | `src/blocks/index.ts` · `src/blocks/registry/BlockRegistry.ts` · `src/services/ai/block-registry-extractor.ts` · `src/types/global.d.ts` · `vite.config.ts` · (test) `legacy-wordpress-block-editor-retirement.spec.ts` |
| dependency 변경 | **0** (package.json · lockfile 미변경) |
| route 변경 | 0 |
| DB write / migration | **0** |
| production deploy | 0 |
| `packages/block-core` | 미변경 |

---

## 15. 완료 기준 대조

```text
active source window.wp                 = 0   ✅ (범위 외 block-core · guard spec 제외)
active source wp.domReady               = 0   ✅
active source wp.blocks compat branch   = 0   ✅
post-build.js                           = absent ✅
initializeCustomBlocks                  = absent ✅
admin block registry                    = 정상 ✅ (32/32)
Missing / Dangling                      = 0 / 0 ✅
DynamicRenderer                         = 정상(미변경) ✅
AI extractor                            = 정상(본체 보존) ✅
@wordpress/* runtime dependency         = 0   ✅
typecheck / tests / build               = PASS ✅
production DB write / migration         = 0   ✅
UNKNOWN                                 = 0   ✅
```

**최종 판정: `WINDOW_WP_POLYFILL_RETIRED`**

---

## 16. 다음 WO

1. `WO-O4O-BLOCK-CORE-ORPHAN-PACKAGE-CENSUS-AND-RETIREMENT-V1` — `packages/block-core` (consumer 0 · dist 미생성 · `@wordpress` external 5종 · `window.wp` 4건). 이번 WO 가 남긴 유일한 동일 축 잔재.
2. (선택) 배포 후 production smoke 재확인 — §12-2.
