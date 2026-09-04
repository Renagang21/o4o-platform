# WO-O4O-WINDOW-WP-POLYFILL-RUNTIME-CENSUS-V1 — CHECK

> **성격**: 조사 전용 (census). runtime 수정 0 / build script 수정 0 / route 수정 0 / dependency 수정 0 / DB write 0 / migration 0
> **작성일**: 2026-09-04
> **기준 커밋**: `d6a291632` (origin/main, PR #200 merge)
> **작업 브랜치**: `work/o4o-window-wp-census-v1`
> **최종 판정**: **`LEGACY_RETIRE_READY`** · UNKNOWN = 0

---

## 1. 목적

`window.wp` 축이 **지금도 런타임에 필요한지**를 증명한다. 이번 WO는 `window.wp` 를 지우는 작업이 아니라,
지울 수 있는지를 판정하기 위한 근거를 수집하는 조사다.

---

## 2. 결론 요약 (먼저)

| 질문 | 실측 결과 |
|---|---|
| production admin 번들에 polyfill 주입이 들어가는가 | **아니오** — `dist/index.html` · 프로덕션 `https://admin.neture.co.kr/` 응답 모두 `window.wp` **0건** |
| 실제 브라우저 런타임에 `window.wp` 가 존재하는가 | **아니오** — `typeof window.wp === "undefined"` · `Object.keys(window.wp \|\| {}) = []` |
| `window.wp` 없이 화면·블록 등록이 동작하는가 | **예** — 현재 프로덕션이 이미 `window.wp` 없이 동작 중 |
| `@wordpress/*` 패키지 의존성이 남아 있는가 | **아니오** — package.json 0건 / pnpm-lock.yaml 0건 / src import 0건 |
| 서비스(KPA·GlycoPharm·PharmacyHub·K-Cosmetics·Neture) 소비처가 있는가 | **없음** — `services/**` 전체 0건 |

→ `window.wp` 를 참조하는 모든 코드는 **optional guard 또는 fallback 뒤에 있고, 그 분기는 현재 어떤 빌드에서도 실행되지 않는다.**

---

## 3. 전수 census (분류 포함)

`node_modules` · `dist*` · `archive/**` 제외, 저장소 전역 검색.

| # | 파일 · 위치 | 형태 | 분류 |
|---|---|---|---|
| 1 | `apps/admin-dashboard/scripts/post-build.js:15,18,38,70,77,82,88` | `dist/index.html` 에 polyfill `<script>` 주입 | **BUILD_INJECTION (미실행)** |
| 2 | `apps/admin-dashboard/src/blocks/index.ts:179` | `window.wp?.domReady \|\| (fallback)` — `initializeCustomBlocks()` 내부 | **DEAD_RESIDUE** |
| 3 | `apps/admin-dashboard/src/blocks/registry/BlockRegistry.ts:83,85` | `if (window.wp?.blocks?.registerBlockType)` | **OPTIONAL_RUNTIME (미실행 분기)** |
| 4 | `apps/admin-dashboard/src/services/ai/block-registry-extractor.ts:56,57` | `if (window.wp?.blocks?.getBlockTypes)` — 주석 "하위 호환성" | **OPTIONAL_RUNTIME (미실행 분기)** |
| 5 | `packages/block-core/src/BlockRegistry.ts:213,215,236,238` | `typeof window !== 'undefined' && window.wp?.blocks?.…` | **DEAD_RESIDUE** (패키지 자체 소비처 0) |
| 6 | `apps/admin-dashboard/src/types/global.d.ts:3` | `interface Window { wp: {...} }` 타입 선언 | **OPTIONAL_RUNTIME (타입 전용)** |
| 7 | `apps/api-server/src/__tests__/legacy-wordpress-block-editor-retirement.spec.ts:20,131,138` | 은퇴 계약 단언 (`initializeWordPress` 0 / `wp.domReady` 0) | **TEST_CONTRACT** |
| 8 | `docs/checks/WO-O4O-LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-{CENSUS,RETIREMENT}-V1-CHECK.md` 외 CHECK 문서 | 과거 조사 기록 | **HISTORICAL_DOC** |
| 9 | `workspace-packages.json:7138~` | 타 머신(`/home/sohae21/…`) 스냅샷 덤프의 `@wordpress/*` 경로 나열 | **HISTORICAL_DOC** |
| 10 | `archive/2025-01-06-duplicate-cleanup/WordPressBlockEditor*.tsx` | 아카이브된 legacy 편집기 사본 | **HISTORICAL_DOC** (범위 외) |

**UNKNOWN = 0.**

#### 3-1. 2번(`blocks/index.ts`)을 DEAD_RESIDUE 로 판정한 근거

`window.wp?.domReady` 는 `initializeCustomBlocks()` 함수 안에만 있고, **이 함수의 살아있는 호출자가 0**이다.
호출자는 `archive/2025-01-06-duplicate-cleanup/WordPressBlockEditor{,Dynamic}.tsx` 두 아카이브 파일뿐이다.
프로덕션 번들 실측에서도 `dist/assets/**` 전체에 문자열 `domReady` 가 **0건** — 즉 tree-shaking 으로 제거되었다.

#### 3-2. 5번(`packages/block-core`)을 DEAD_RESIDUE 로 판정한 근거

`"@o4o/block-core"` 를 dependency 로 선언한 package.json 은 **자기 자신 1건뿐**이고, 소스 import 0건,
빌드 산출물(`dist/`) 자체가 존재하지 않는다. 사용자 WO 의 후보 목록에 없던 **5번째 사이트**이며 이번 census 에서 신규 발견했다.

---

## 4. `post-build.js` ownership

**핵심 질문: post-build.js 가 실제 production admin build 때 실행되는가? → 아니오.**

| 항목 | 실측 |
|---|---|
| package script caller | **없음.** `apps/admin-dashboard/package.json` 의 `postbuild` 는 `node -e "… copyFileSync('public/version.json','dist/version.json')"` 인라인 스크립트이며 `scripts/post-build.js` 를 호출하지 않는다. `prebuild` 는 `scripts/update-version.cjs`. |
| CI caller | **없음.** `.github/workflows/deploy-admin.yml` 은 `pnpm run prebuild` → `pnpm run build:prod` 만 실행하고, `dist/version.json` 복사는 워크플로 안에서 `cp` 로 직접 한다. 저장소 전체에서 `post-build` 문자열은 CHECK 문서 2건에만 존재. |
| local build caller | **없음.** `build:prod = vite build --mode production` — npm lifecycle `postbuild` 훅은 `build` 스크립트에만 붙으므로 `build:prod` 경로에서는 그 인라인 훅조차 실행되지 않는다. |
| production artifact 반영 | **미반영.** 로컬 `dist/index.html` `window.wp` 0건, 프로덕션 `https://admin.neture.co.kr/` (HTTP 200, 2058 bytes) 응답 HTML 도 `window.wp` **0건**. |
| injected code 위치 | 주입 대상은 `dist/index.html` 의 `<div id="root"></div>` 직후. 주입 내용은 `wp.i18n` · `wp.hooks` · `wp.data` · `wp.element` · `wp.blocks` · `wp.domReady` 스텁. **현재 어느 산출물에도 존재하지 않는다.** |

판정: `post-build.js` = **BUILD_ARTIFACT_RESIDUE (호출자 0)**.

---

## 5. production bundle 실측

| 항목 | 값 |
|---|---|
| `dist/assets` 파일 수 | 243 |
| `window.wp` 히트 파일 | 2건 — `dist/assets/AIPageGeneratorTest-zCbv2Pqg.js`, `dist/assets/SlideApp-CD7xonAs.js` |
| `window.wp` 총 히트 수 | 4 (파일당 2 — guard 1 + 사용 1) |
| `wp.domReady` 히트 | **0** |
| `dist/index.html` 의 `window.wp` | **0** |
| 주입 source | 없음 (post-build.js 미실행). 번들의 4건은 전부 **소스 consumer 의 optional guard 코드**가 그대로 minify 된 것 |

실제 히트 컨텍스트(요약):

- `AIPageGeneratorTest-*.js` — `window.wp?.blocks?.getBlockTypes && window.wp.blocks.getBlockTypes().forEach(...)` → §3 4번
- `SlideApp-*.js` — `if(…, window.wp?.blocks?.registerBlockType) try { window.wp.blocks.registerBlockType(...) }` → §3 3번

즉 번들에 남은 `window.wp` 는 **주입된 polyfill 이 아니라 읽기 전용 optional 분기**이며, 값이 항상 `undefined` 이므로 실행되지 않는다.

---

## 6. `blocks/index.ts` 판정

- 사용 지점: `initializeCustomBlocks()` 내부 1곳 (`:179`), `window.wp?.domReady` + 즉시 fallback 제공.
- 살아있는 호출자 **0** (아카이브 2건 제외).
- 프로덕션 번들에 `domReady` 문자열 0건 → tree-shaken.
- 같은 파일의 `registerAllBlocks()` 는 `App.tsx:107` 에서 동적 import 로 **살아 있다** — 파일 자체는 ACTIVE, `window.wp` 사용 함수만 DEAD.

판정: **DEAD_RESIDUE** (파일 삭제가 아니라 `initializeCustomBlocks` 단위 제거 대상).

---

## 7. `blocks/registry/BlockRegistry.ts` 판정

`register()` 말미의 `if (window.wp?.blocks?.registerBlockType) { … }` 블록 하나.

| 조건 | `window.wp` 있을 때 | `window.wp` 없을 때(현재 프로덕션) |
|---|---|---|
| `this.blocks.set(...)` 내부 등록 | 수행 | 수행 |
| 카테고리 인덱스 갱신 | 수행 | 수행 |
| WP 전역 등록 | 추가 수행 | **건너뜀** |
| `blockRegistry.getAll()` 결과 | 동일 | 동일 |
| `DynamicRenderer` 렌더 | 동일 | 동일 |

내부 자료구조(`this.blocks`, `categoryIndex`)가 SSOT 이고 WP 등록은 그 뒤의 부가 동작이므로,
**with/without 차이는 "외부 WP 레지스트리에 추가로 알리는가" 뿐이며 앱 동작 차이 0.**

판정: **OPTIONAL_RUNTIME — 현재 실행되지 않는 호환 분기.**

---

## 8. `services/ai/block-registry-extractor.ts` 판정

- 함수 자체는 **살아 있다** — `services/ai/reference-fetcher.service.ts` 가 `generateCompleteReference` / `extractBlocksMetadata` 를 소비한다.
- 그러나 `window.wp?.blocks?.getBlockTypes` 분기는 소스 주석에 명시적으로 `// WordPress 블록 레지스트리에서도 추출 (하위 호환성)` 이라 적혀 있고, 그 앞에서 이미 `blockRegistry.getAll()` 로 전량을 채운다.
- 런타임 `window.wp === undefined` 이므로 이 분기는 **한 번도 실행되지 않는다.**

판정: **`OPTIONAL_COMPAT`**

---

## 9. 서비스별 소비처

| 서비스 | `window.wp` 소비 |
|---|---|
| KPA-Society (`services/web-kpa-society`) | 0 |
| GlycoPharm | 0 |
| PharmacyHub | 0 |
| K-Cosmetics | 0 |
| Neture | 0 |
| admin-dashboard | 3 (§3 2·3·4번, 전부 optional/dead) |
| packages/block-core | 1 (§3 5번, 소비처 0인 orphan 패키지) |

**service-specific required consumer = 0.**

---

## 10. Block Registry 정합성

`npx tsx scripts/audit/check-block-registry.ts` 실행 결과:

```
Total definition files:    32
Total registered:          32
Missing in registry:       0
Dangling registry entries: 0
```

이 audit 은 **소스 파일 정적 스캔**이며 `window.wp` 를 읽지 않는다. 또한 §7 에서 확인했듯 등록 SSOT 는 `BlockRegistry` 내부 Map 이다.
따라서 **with `window.wp` / without `window.wp` 결과는 동일(32/32, Missing 0, Dangling 0).**
현재 프로덕션이 이미 `window.wp` 없는 상태이므로, 위 수치가 곧 "without" 조건의 실측값이다.

---

## 11. DynamicRenderer 영향

`apps/admin-dashboard/src/blocks/registry/DynamicRenderer.tsx` 의 import 는
`react` · `./BlockRegistry` · `./types` · `@/types/post.types` · `lucide-react` 뿐이고, 파일 내 `wp` 참조 **0건**.
렌더 경로는 `blockRegistry` 내부 Map 만 조회한다.

판정: **`INDEPENDENT`**

---

## 12. 브라우저 런타임 실측

대상: `https://admin.neture.co.kr/` (프로덕션, v0.5.9, 미로그인 → `/login` 리다이렉트)

| 측정 | 값 |
|---|---|
| `typeof window.wp` | `"undefined"` |
| `Object.keys(window.wp \|\| {})` | `[]` |
| App 마운트 4초 후 재측정 (`registerAllBlocks` 실행 이후) | 동일 — `"undefined"` · `[]` |
| 콘솔 오류 | `apps/availability` 401, `permissions` 401, AuthClient refresh 경고 — **모두 미로그인 세션에 기인, `wp` 관련 오류 0** |

민감정보 없음. 사용된 세션은 미인증 상태이며 자격증명을 입력하지 않았다.

---

## 13. `@wordpress/*` dependency census

| 위치 | 건수 |
|---|---|
| 전체 `package.json` (node_modules 제외) | **0** |
| `pnpm-lock.yaml` | **0** |
| src import (`from '@wordpress…'` / `require('@wordpress…')`, archive 제외) | **0** |
| build script 언급 | `packages/block-core/tsup.config.ts:18-22` (external 목록), `apps/admin-dashboard/vite.config.ts:93-97` (optimizeDeps 목록) — **둘 다 설치되지 않은 패키지를 가리키는 무효 설정** |
| 생성 dist | 0 |
| test | 0 |
| 기타 | `workspace-packages.json` — 타 머신 스냅샷 덤프 (HISTORICAL_DOC) |

**의존성이 남아 있는 이유: 남아 있지 않다.** 이미 0건이며, 설정 파일의 문자열 언급만 잔존한다.
(§17 금지 조항에 따라 이번 WO 에서 제거하지 않는다.)

---

## 14. build artifact ownership 3조건 판정

| 조건 | 결과 |
|---|---|
| ① production build 파이프라인이 `post-build.js` 를 호출하는가 | **아니오** (§4) |
| ② 배포된 산출물에 주입 결과가 존재하는가 | **아니오** — 로컬 `dist/index.html` 0건, 프로덕션 HTML 0건 (§4·§5) |
| ③ 주입이 없을 때 앱이 깨지는가 | **아니오** — 현재 프로덕션이 주입 없이 정상 동작 (§12) |

3조건 모두 부정 → `post-build.js` 는 **소유자 없는 build artifact residue**.

---

## 15. test / guard ownership

| 파일 | 단언 | 상태 |
|---|---|---|
| `apps/api-server/src/__tests__/legacy-wordpress-block-editor-retirement.spec.ts:131` | admin src 에 `initializeWordPress` 0 | 유효 |
| 동 `:138` | admin src 에 `wp.domReady` 0 | **통과하지만 사각지대 있음** — 현존 코드는 `window.wp?.domReady` (`wp?.domReady`) 형태라 문자열 `wp.domReady` 에 걸리지 않는다. 후속 은퇴 WO 에서 optional-chaining 형태까지 포함하도록 계약을 넓히는 것이 맞다. |

`window.wp` 잔존을 금지하는 guard 는 **현재 없다** (은퇴 시 신규 계약 추가 필요).

---

## 16. 최종 판정

```
LEGACY_RETIRE_READY
```

근거 (모두 실측):

1. polyfill 주입기(`post-build.js`) 호출자 **0** — package script · CI · local 어디에도 없음
2. 로컬/프로덕션 산출물 HTML 의 `window.wp` **0건**
3. 프로덕션 브라우저 런타임 `typeof window.wp === "undefined"` — 그 상태로 정상 동작 중
4. 모든 소비처가 optional guard(3곳) 또는 fallback 보유(1곳) 또는 orphan 패키지(1곳)
5. `@wordpress/*` 의존성 **0** (package.json · lockfile · src import)
6. 서비스 5종 소비처 **0**
7. Block Registry 32/32 · Missing 0 · Dangling 0 이 `window.wp` 와 무관하게 성립
8. `DynamicRenderer` = `INDEPENDENT`

UNKNOWN = **0**.

서브축 판정: `scripts/post-build.js` 단독으로는 **BUILD_ARTIFACT_RESIDUE** 이며, 이는 위 최종 판정의 부분집합이다.

---

## 17. 추천 후속 WO

`WO-O4O-WINDOW-WP-POLYFILL-RETIREMENT-V1` (구현 WO) — 제안 범위:

| # | 대상 | 조치 |
|---|---|---|
| 1 | `apps/admin-dashboard/scripts/post-build.js` | 파일 삭제 (호출자 0) |
| 2 | `apps/admin-dashboard/src/blocks/index.ts` | `initializeCustomBlocks()` 제거 (`registerAllBlocks` 는 보존) |
| 3 | `apps/admin-dashboard/src/blocks/registry/BlockRegistry.ts` | `window.wp` 등록 분기 제거 |
| 4 | `apps/admin-dashboard/src/services/ai/block-registry-extractor.ts` | `window.wp` 하위호환 분기 제거 (함수 본체 보존) |
| 5 | `apps/admin-dashboard/src/types/global.d.ts` | `Window.wp` 선언 제거 |
| 6 | 은퇴 guard spec | `wp?.domReady` 포함 패턴 + `window.wp` 잔존 0 계약 추가 |
| 7 | `packages/block-core` | **별도 WO 로 분리** — `window.wp` 문제가 아니라 "소비처 0 orphan 패키지" 문제다. 이번 축과 섞지 않는다. |
| 8 | `tsup.config.ts` / `vite.config.ts` 의 `@wordpress/*` 문자열 | 무해하지만 무효 설정 — 6번과 함께 정리 가능 |

검증 계약 제안: 제거 후 `pnpm --filter @o4o/admin-dashboard type-check|test|build` + registry audit 32/32 유지 + dist `window.wp` 0건.

---

## 18. 이번 WO 변경 사항

| 항목 | 값 |
|---|---|
| 변경 파일 | 본 CHECK 문서 1개 |
| runtime 수정 | 0 |
| build script 수정 | 0 |
| route 수정 | 0 |
| dependency 수정 | 0 |
| DB write / migration | 0 |
| production deploy | 0 |
