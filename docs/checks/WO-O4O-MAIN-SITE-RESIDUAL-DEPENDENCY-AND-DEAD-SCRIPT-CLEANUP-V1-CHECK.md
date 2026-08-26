# WO-O4O-MAIN-SITE-RESIDUAL-DEPENDENCY-AND-DEAD-SCRIPT-CLEANUP-V1 — CHECK

> **판정 요약**
> `axios` → `REMOVE_DEPENDENCY` · `tsx` → `REMOVE_DEVDEPENDENCY` ·
> `verify:shortcodes` · `scripts/verify-shortcodes.ts` · `scripts/audit/check-shortcode-registry.ts`
> → **전부 `KEEP_ACTIVE`** (살아 있는 shortcode 도메인을 검사한다 — §25 중지 조건 해당)
> `UNKNOWN` 0 / 기능 코드 변경 0 / DB 변경 0

---

## 1. 목적

`apps/main-site` 가 선행 WO 들을 거쳐 `MINIMAL_SHELL`(live 27 파일 · lazy route 8)로
줄어든 뒤 남은 **미사용 dependency · devDependency · dead script · dead audit helper** 를
전수조사하고, 현재 live 소스가 실제로 필요로 하지 않는 잔재만 최소 범위로 제거한다.

후보 4개(`axios` · `tsx` · `verify:shortcodes` · `check-shortcode-registry.ts`)를
그대로 삭제하는 작업이 아니라, **consumer 0 을 다시 확인하고 root/package/CI 계약과
lockfile 파급을 검증한 뒤** 정리하는 작업이다.

---

## 2. 기준선 고정 (§3)

| 항목 | 값 |
|---|---|
| 브랜치 | `main` |
| 시작 HEAD | `d56bd7c77` |
| `origin/main` | `be35f160b` (WO #7 push 결과) |
| 상태 | ahead 5 / behind 13 (다른 세션과 분기) |
| foreign staged | 5개 (다른 세션 WIP — **접촉 0**) |

이번 WO 작업 경로에 대해 `git diff HEAD origin/main -- apps/main-site package.json
pnpm-lock.yaml scripts/verify-shortcodes.ts scripts/audit/ README.md CLAUDE.md` = **empty**.
→ 공유 worktree 에서 작업해도 origin 과 충돌하는 축이 없음을 먼저 확인했다.
pull / rebase / autostash 는 수행하지 않았다.

foreign staged 5개 (상태 변경 없음):
`.github/workflows/ci-pipeline.yml` · `apps/api-server/src/database/entities.ts` ·
`scripts/check-typeorm-entities.mjs` · `typeorm-entity-registry-guard.spec.ts` ·
`WO-O4O-TYPEORM-ENTITY-REGISTRY-INTEGRITY-GUARD-AND-CI-ADOPTION-V1-CHECK.md`

---

## 3. Main-site package 계약 Census (§4)

후보 4개만 보지 않고 `apps/main-site/package.json` 전체를 훑었다.
분류 근거는 **live 26 code file 의 bare import 실측**이다 (`src/main.tsx` 기준 도달 집합).

### 3-1. dependencies

| 패키지 | live import 수 | 분류 | 처분 |
|---|---:|---|---|
| `react` | 18 | `ACTIVE_RUNTIME_DEP` | 유지 |
| `react-router-dom` | 12 | `ACTIVE_RUNTIME_DEP` | 유지 |
| `@o4o/auth-client` | 8 | `ACTIVE_RUNTIME_DEP` | 유지 |
| `@o4o/content-editor` | 3 | `ACTIVE_RUNTIME_DEP` | 유지 |
| `react-dom` | 1 | `ACTIVE_RUNTIME_DEP` | 유지 |
| `@tanstack/react-query` | 1 | `ACTIVE_RUNTIME_DEP` | 유지 (§16 보호 대상) |
| `@o4o/ui` | 1 | `ACTIVE_RUNTIME_DEP` | 유지 |
| **`axios`** | **0** | **`ORPHAN_DEP`** | **제거** |

### 3-2. devDependencies

| 패키지 | 근거 | 분류 | 처분 |
|---|---|---|---|
| `vite` · `@vitejs/plugin-react` | `dev` · `build` · `preview` script | `ACTIVE_BUILD_DEP` | 유지 |
| `typescript` | `build` · `typecheck` (`tsc`) | `ACTIVE_BUILD_DEP` | 유지 |
| `tailwindcss` · `postcss` · `autoprefixer` | `tailwind.config.js` · `postcss.config.js` | `ACTIVE_BUILD_DEP` | 유지 |
| `@types/react` · `@types/react-dom` · `@types/node` | `tsc` 타입 해석 | `ACTIVE_DEV_DEP` | 유지 |
| **`tsx`** | main-site script 4종 전부 `vite`/`tsc` — 호출 0 | **`ORPHAN_DEVDEP`** | **제거** |

`UNKNOWN` 0. 이번 WO 의 삭제 범위는 위 **명확한 orphan 2개**로 한정했다.

---

## 4. `axios` 판정 (§5)

**판정: `MAIN_SITE_ORPHAN_DEP` → `REMOVE_DEPENDENCY`**

| 확인 축 | 결과 |
|---|---|
| runtime import (`from 'axios'`) | main-site src 전체 **0** |
| `require('axios')` | 0 |
| dynamic import | 0 |
| script 사용 | 0 (script 4종 전부 vite/tsc) |
| config 파일 (`vite.config.ts` · `tailwind.config.js` · `postcss.config.js`) | 0 |
| raw-source 참조 | 0 |
| `apps/main-site` 내 유일 등장 | `package.json:17` (선언 그 자체) |

main-site 의 HTTP 는 전부 `@o4o/auth-client` 의 `authClient.api.*` 를 경유한다
(CLAUDE.md §1 API 호출 규칙과 일치).

**`ROOT_SHARED_DEP` 아님** — root `package.json` 이 아니라 workspace 자체 선언이고,
`axios` 를 선언한 workspace 는 main-site 를 포함해 9개다. 나머지 8개
(admin-dashboard · api-server · digital-signage-agent · forum-api · auth-client ·
digital-signage-contract · mobile-app · web-kpa-society)는 그대로 소유를 유지한다.
→ **dependency ownership 공유 문제 없음** (§25 중지 조건 미해당).

---

## 5. `tsx` 판정 (§6)

**판정: `ORPHAN_MAIN_SITE_DEVDEP` → `REMOVE_DEVDEPENDENCY`**

> **root 의 tsx 사용 ≠ main-site devDependency 사용.** 두 축을 분리해 판정했다.

| 확인 축 | 결과 |
|---|---|
| main-site script 에서 `tsx` 호출 | **0** (`dev`=vite · `build`=tsc && vite build · `preview`=vite preview · `typecheck`=tsc --noEmit) |
| main-site 소스/설정에서 `tsx` 실행 참조 | 0 |
| `apps/main-site` 내 유일 등장 | `package.json:31` (선언 그 자체) |
| root `package.json` 의 `tsx` 선언 | **없음** — root 는 `ts-node` 를 쓴다 |
| `tsx` 를 선언한 다른 workspace | `apps/forum-api` · `apps/page-generator` · `packages/api-types` |

`ACTIVE_ROOT_TOOL` 축은 **다른 workspace 소유로 그대로 살아 있다.**
저장소 루트에서의 `npx tsx <script>` 사용(본 CHECK 의 검증 절차 포함)은 영향받지 않는다.
`node-linker=hoisted` 환경이라 실제 바이너리는 root `node_modules/tsx` 에 그대로 있다.

---

## 6. `verify:shortcodes` 판정 (§7)

**판정: `ACTIVE_VALIDATION` → `KEEP_ACTIVE`**

> ⚠ **선행 WO 기록 정정.** WO #7 완료 보고에서 이 script 를 "WO #5 잔재"로 적었다.
> 그 판단은 **경로 grep 만으로 내린 것이며 틀렸다.** 실제로 읽고 실행해 보니
> 이 script 는 **살아 있는** shortcode 도메인을 검증한다.

실행 결과 (`npx ts-node scripts/verify-shortcodes.ts`), **exit 0**:

```
📋 Found 16 shortcodes in SSOT metadata
✅ Admin Dashboard is using SSOT metadata (@o4o/shortcodes)
✅ VERIFICATION PASSED
```

검사 대상의 존재 여부:

| 검사 대상 | 존재 | 성격 |
|---|:---:|---|
| `packages/shortcodes/src/metadata.ts` (SSOT) | ✅ | **live** |
| `apps/admin-dashboard/src/services/ai/shortcode-registry.ts` | ✅ | **live** |
| `apps/api-server/src/services/shortcode-registry.service.ts` | ❌ | 다른 은퇴 축 — 이번 WO 범위 밖 |
| `apps/main-site/src/components/shortcodes` | ❌ | WO #5 에서 은퇴 |

없는 경로는 `result.errors` 가 아니라 `result.warnings` 로 들어가므로 exit code 는 0 이다
(graceful degradation). 즉 **깨진 script 가 아니다** → `BROKEN_DEAD_SCRIPT` 아님.

§25 중지 조건 **"shortcode checker 가 다른 active domain 도 검사"** 에 해당하므로
script 자체는 삭제하지 않는다.

---

## 7. `scripts/verify-shortcodes.ts` 판정 (§8)

**판정: `KEEP_ACTIVE` — 단, 은퇴 경로 스캔 코드만 제거**

은퇴한 것은 script 가 아니라 그 안의 **main-site 경로 스캔 함수**였다.

| 제거 대상 | 크기 | 제거 사유 |
|---|---:|---|
| `getImplementedShortcodes()` | ~62줄 | `apps/main-site/src/components/shortcodes` 를 glob 스캔 — 경로가 사라진 뒤 **항상 빈 집합** |
| `compareShortcodes()` | ~40줄 | 위 결과를 소비 — 빈 집합이라 비교 자체가 건너뛰어졌다 |
| `import { glob } from 'glob'` | 1줄 | 위 두 함수 전용 |

**제거 전에도 실행되지 않던 코드**다. 헤더의 `Checks:` 목록도 4항목 → 3항목으로 맞췄다.

> **은퇴 경로를 다른 살아 있는 디렉터리로 억지로 재연결하지 않았다** (§8 · §9 원칙).
> `verify()` 는 SSOT metadata → API Server → Admin Dashboard 3단계로 남았고,
> 활성 검증 내용은 그대로다.

제거 후 재실행: **exit 0 / `✅ VERIFICATION PASSED`**,
main-site 관련 warning 은 사라졌다.

---

## 8. `scripts/audit/check-shortcode-registry.ts` 판정 (§9)

**판정: `ACTIVE_AUDIT` → `KEEP_ACTIVE` — 은퇴 경로 참조만 제거**

### 8-1. `BROKEN_SCRIPT` 오판을 정정한 근거

`npx ts-node` 로는 `ERR_MODULE_NOT_FOUND`
(`packages/shortcodes/src/utils/shortcodeNaming.js`)가 난다. 그러나 이는 **script 의 결함이 아니다** —
파일은 `.ts` 로 존재하며, ts-node 가 `.js` 접미 specifier 를 ESM 해석하지 못하는 것이다.
script 의 shebang 이 명시한 대로 **`npx tsx` 로 실행하면 정상 동작**한다.
→ `BROKEN_SCRIPT` 아님.

### 8-2. 검사 대상

| 대상 | 존재 | 성격 |
|---|:---:|---|
| `apps/admin-dashboard/src/components/shortcodes` | ✅ | **live** |
| `packages/shortcodes/src` | ✅ | **live** |

### 8-3. 제거한 은퇴 경로 참조 2곳

| 위치 | 내용 | 제거 사유 |
|---|---|---|
| `findShortcodeFiles()` 의 `searchDirs` | `apps/main-site/src/components/shortcodes` 항목 | 경로 부재 → 항상 0건 기여 |
| `findRegisteredShortcodes()` 의 main-site 블록 (38줄) | 은퇴 디렉터리의 `index.ts` 에서 등록 배열 추출 | 경로 부재 → 항상 빈 결과 |

동반 정리: 위 블록 전용이던 `toShortcodeName` import 제거.

제거 후 재실행 (`npx tsx`): **정상 동작**

```
Total component files:     33
Total registered:          3
Missing in registry:       32
Dangling registry entries: 2   (login_form · oauth_login — packages/shortcodes/src/auth/index.ts)
Naming mismatches:         0
```

`Missing 32` · `Dangling 2` 는 **이번 변경으로 생긴 것이 아니라 원래 있던 live 도메인의 상태**다
(이 script 는 어떤 CI/required check 에도 걸려 있지 않다 — 아래 §9). 별도 축이므로 손대지 않았다.

### 8-4. 감사 산출물 `scripts/audit/shortcode-registry-report.json`

이 script 가 매 실행 시 덮어쓰는 **생성 산출물**인데 tracked 상태다.
직전 커밋(`d0d8fc6dd`, 2025-11-21) 버전에는 이미 삭제된 main-site shortcode 파일 경로가
**54회**, 다른 머신의 절대경로(`/home/dev/…`)가 **108회** 남아 있었다.
위 수정 후 재생성해 **main-site 참조 0** 이 됐다 (§27 "retired shortcode path reference 0" 충족).

> **후속 제안 (이번 WO 범위 밖):** 이 파일은 실행 머신의 절대경로를 담는 생성 산출물이므로
> `.gitignore` 대상이 맞다. tracked 해제는 별도 WO 로 분리한다.

---

## 9. Script Consumer Census (§10)

| script / 도구 | consumer | 분류 |
|---|---|---|
| `verify:shortcodes` | root `package.json:84` (정의) | — |
| | root `package.json:87` `verify:registry` 집계 | `ACTIVE_CALLER` |
| | root `package.json:88` `verify` → `verify:registry` | `ACTIVE_CALLER` |
| `scripts/verify-shortcodes.ts` | 위 script 가 직접 실행 | `ACTIVE_CALLER` |
| `scripts/audit/check-shortcode-registry.ts` | package.json / workflow **0** | `CONSUMER_ZERO` |
| | `scripts/audit/README.md:25,38` | `DOC_CALLER` |
| | `scripts/audit/REGISTRY_AUDIT_REPORT.md:46` | `HISTORICAL` |

`.github/` 전체에서 `verify:shortcodes` · `verify:registry` · `check-shortcode-registry`
참조 **0** → **required check 아님** (§25 중지 조건 미해당).

`check-shortcode-registry.ts` 는 `CONSUMER_ZERO` 지만 **살아 있는 도메인을 검사하는 수동 감사 도구**이며
문서화된 실행 절차(`scripts/audit/README.md`)가 있다. §13 의 "dead script 를 '혹시 필요할 수 있음'으로
유지하지 않는다" 는 **dead** script 에 대한 규정이고, 이 도구는 dead 가 아니다.

---

## 10. Lockfile 영향 (§11)

**Case A — 다른 importer 가 남아 있으므로 importer 블록만 축소.**

| | `axios` | `tsx` |
|---|---|---|
| 제거 전 importer 선언 | 8 workspace + main-site | 3 workspace + main-site |
| 제거 후 importer 선언 | 8 | 3 |
| `pnpm-lock.yaml` 패키지 엔트리 (`axios@` / `tsx@`) | **유지** | **유지** |

최종 lockfile diff — **삭제 6줄 / 추가 0줄, 전부 `apps/main-site:` importer 블록 내부**:

```diff
@@ importers: apps/main-site (dependencies) @@
-      axios:
-        specifier: ^1.6.0
-        version: 1.13.2
@@ importers: apps/main-site (devDependencies) @@
-      tsx:
-        specifier: ^4.19.0
-        version: 4.21.0
```

> **부수 drift 1줄을 되돌렸다.** `pnpm install` 재해석 과정에서 `@vitest/ui@3.2.4` 의
> snapshot 이 참조하는 vitest 키가 `@types/node@24.10.1`/`terser@5.43.1` →
> `@types/node@22.17.2`/`terser@5.44.1` 로 바뀌었다. **이번 제거와 무관한 기존 drift** 이고
> 두 snapshot 키가 lockfile 에 **모두 존재**하므로(HEAD·현재 양쪽 확인) 원래 값으로 되돌려
> diff 를 의도한 범위로만 한정했다. → "lockfile diff 가 과도하거나 의미 불명확"(§25) 미해당.

---

## 11. Install 검증 (§19)

| 명령 | 결과 |
|---|---|
| `pnpm install --lockfile-only` | Done (1m 11s) |
| `pnpm install --frozen-lockfile` | **exit 0** (19.5s) |
| 재실행 후 `git diff --stat -- pnpm-lock.yaml` | `1 file changed, 6 deletions(-)` — **추가 drift 0** |

**lockfile drift 0.** `package.json` 만 고치고 install 검증을 생략하지 않았다 (§12).

`node-linker=hoisted` 환경이므로 두 패키지의 실제 바이너리/모듈은 root `node_modules` 에
그대로 있다(다른 workspace 소유). 이번 변경은 **선언 계약의 정리**이며,
main-site 전용 링크가 사라진 것은 확인했다.

---

## 12. Dependency 제거 기준 충족 (§12)

`axios` · `tsx` 각각에 대해 6개 축이 전부 0:

| 조건 | `axios` | `tsx` |
|---|:---:|:---:|
| runtime import 0 | ✅ | ✅ |
| build 사용 0 | ✅ | ✅ |
| script 사용 0 | ✅ | ✅ |
| test 사용 0 | ✅ | ✅ |
| config 사용 0 | ✅ | ✅ |
| raw-source consumer 0 | ✅ | ✅ |

---

## 13. Live shell 보호 (§17)

| 항목 | 결과 |
|---|---|
| live route loss | **0** — build 산출물에 lazy chunk 8종 전부 생성 |
| `main.tsx` import break | **0** |
| router break | **0** |
| `@tanstack/react-query` (§16 보호) | 유지 · `main.tsx` 의 `QueryClientProvider` 그대로 |
| main-site script 4종 | 유지 |

---

## 14. 검증 (§20 · §21 · §22)

| 검증 | 명령 | 결과 |
|---|---|---|
| main-site typecheck | `npx tsc --noEmit` | **exit 0** |
| main-site lint | `npx eslint .` | **exit 0** — 0 errors / 3 warnings (선행 WO 와 동일한 기존 warning) |
| 변경 범위 lint | `npx eslint <변경 4파일>` | **exit 0** |
| main-site build 1회 | `bash scripts/ci-build-app.sh main-site` | **exit 0** — `✓ built in 26.02s` |
| 신규 guard spec | jest | **30 tests PASS** |
| WO #7 guard spec 회귀 | jest | **45 tests PASS** |
| retirement/closure guard 전량 | `jest --testPathPattern "retirement\|closure\|cleanup\|census"` | PASS |

기존 lint warning 3건(변경과 무관, 그대로 둠):
`context/OrganizationContext.tsx:145,225` · `pages/auth/LoginPage.tsx:42`

### 14-1. Root script 회귀 (§21)

```
verify:shortcodes => ts-node scripts/verify-shortcodes.ts
verify:blocks     => ts-node scripts/verify-blocks.ts
verify:cpts       => ts-node scripts/verify-cpts.ts
verify:registry   => pnpm run verify:shortcodes && pnpm run verify:blocks && pnpm run verify:cpts
verify            => pnpm run verify:registry
```

`verify:shortcodes` 를 **유지**했으므로 `verify:registry` · `verify` 집계 script 는
그대로 해석된다. 끊어진 참조 0.

### 14-2. CI 영향 (§22)

| 항목 | 결과 |
|---|---|
| `.github/` 의 `verify:shortcodes` / `check-shortcode-registry` 참조 | **0** — required check 변경 없음 |
| `quality-check` 의 `type-check:frontend` · `eslint` | 영향 없음 (둘 다 통과) |
| main-site full build matrix | **재등록하지 않았다** (§20 · WO #6 의 `REDUCE_TO_LIGHTWEIGHT_CHECK` 계약 유지) |
| deploy workflow | 변경 0 |

---

## 15. Production 검증 (§23)

**production runtime impact = 0.**

- `apps/main-site` 는 `RETIRED_RUNTIME` — Cloud Run `o4o-main-site` 와
  `deploy-main-site.yml` 은 이미 폐기됐다(선행 WO). 배포 대상이 아니다.
- DB schema change 0 / migration 0 / production write 0.
- 변경된 script 2개는 **로컬·수동 검증 도구**이며 어떤 배포 경로에도 없다.
- 다른 workspace 의 `axios` · `tsx` 소유권은 그대로 → 다른 서비스 빌드/런타임 영향 0.

---

## 16. 구현 범위 (§15)

**기능 코드 변경 0.** 변경 파일 6개:

| 파일 | 변경 | 성격 |
|---|---|---|
| `apps/main-site/package.json` | `axios` · `tsx` 선언 2줄 제거 | 계약 |
| `pnpm-lock.yaml` | importer 블록 6줄 제거 | 계약 |
| `scripts/verify-shortcodes.ts` | 은퇴 경로 스캔 코드 제거 + 사유 주석 | 도구 |
| `scripts/audit/check-shortcode-registry.ts` | 은퇴 경로 참조 2곳 제거 + 사유 주석 | 도구 |
| `scripts/audit/shortcode-registry-report.json` | 재생성 (은퇴 경로 0) | 생성 산출물 |
| `apps/main-site/README.md` | package 계약 정리 절 추가 | 현재형 문서 |

추가 2개: 신규 guard spec, 본 CHECK 문서.
WO #7 spec 의 "후속 정리 대상" 주석은 이번 WO 로 종결됐으므로 현재 상태에 맞게 갱신했다.

---

## 17. 문서 정합 (§14)

기록물(`docs/checks/**` · `docs/archive/**` · `docs/investigations/**`)은 **수정하지 않았다**
(CLAUDE.md §16-1: 기록물은 정비 대상이 아니다).

현재형 문서 점검 결과:

| 문서 | 결과 |
|---|---|
| root `README.md` · `CLAUDE.md` · `SETUP.md` · `AGENTS.md` | main-site 문맥의 `axios`/`tsx` 참조 **0** |
| `docs/baseline/**` · `docs/architecture/**` · `docs/rules/**` | `axios` 언급 2건 — 전부 **GlycoPharm / K-Cosmetics** 의 HTTP 클라이언트 규약(`LMS-CLIENT-CONVENTION-V1.md` · `OPERATOR-CORE-DESIGN-V1.md`)으로 main-site 와 무관. **drift 아님** |
| `apps/main-site/README.md` | 현재형 문서이므로 이번 정리 내용을 반영 (§16-3 범위 내 갱신) |

**`문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건`**
(별도 WO 제안 = `scripts/audit/shortcode-registry-report.json` 의 tracked 해제)

---

## 18. 중지 조건 점검 (§25)

| 중지 조건 | 해당 | 처리 |
|---|:---:|---|
| 다른 workspace 가 같은 dependency ownership 공유 | ❌ | main-site 자체 선언만 제거, 다른 소유자 유지 |
| script 가 CI/required check 에서 사용 | ❌ | `.github/` 참조 0 |
| **shortcode checker 가 다른 active domain 도 검사** | ✅ | **script 3종 전부 `KEEP_ACTIVE` 로 판정, 삭제하지 않음.** 은퇴 경로 참조만 제거 |
| lockfile diff 과도/의미 불명확 | ❌ | 6줄 삭제, 전부 main-site importer 블록. 무관한 1줄 drift 는 되돌림 |
| live shell build/typecheck 깨짐 | ❌ | 둘 다 exit 0 |
| `UNKNOWN` 발생 | ❌ | 0 |

---

## 19. 완료 기준 대조 (§27)

| 기준 | 결과 |
|---|:---:|
| main-site orphan dependency 0 | ✅ |
| dead shortcode validation script 0 | ✅ (dead 아님이 확정 — 은퇴 경로 코드만 제거) |
| live dependency 오삭제 0 | ✅ |
| lockfile 정상 | ✅ `--frozen-lockfile` exit 0 / drift 0 |
| retired shortcode path reference 0 | ✅ (실행 코드 · 감사 산출물 모두) |
| main-site typecheck 정상 | ✅ |
| 경량 CI 계약 유지 | ✅ full build matrix 재등록 0 |
| DEAD_REFERENCE 0 | ✅ (아래 1건은 다른 축으로 분리 보고) |
| UNKNOWN 0 | ✅ |
| foreign WIP 상태 변경 0 | ✅ |

> **다른 축으로 분리한 참조 1건:** `scripts/verify-shortcodes.ts` 의
> `apps/api-server/src/services/shortcode-registry.service.ts` warning.
> 이 경로는 main-site 축이 아니라 **api-server 쪽의 별개 은퇴**이므로 이번 WO 에서
> 판정·수정하지 않았다. warning 이라 exit code 에 영향 없음. 후속 조사 대상.

---

## 20. Git 안전 (§24)

| 항목 | 결과 |
|---|---|
| autostash | **0** — pull/rebase/autostash 미수행 |
| foreign staged/unstaged 상태 변경 | **0** — 5개 foreign staged 파일 접촉 0 |
| staged scope guard | `node scripts/git/check-staged-scope.mjs <경로...>` 실행 |
| commit 방식 | **path-specific** (`git commit -m "..." -- <경로...>`) — `git add .` 미사용 |
| commit delta 검증 | `git show --stat` 로 이번 WO 경로만 포함됨을 확인 |

---

*작성: 2026-08-26*
*판정: `REMOVE_DEPENDENCY` (axios) · `REMOVE_DEVDEPENDENCY` (tsx) · `KEEP_ACTIVE` (shortcode 검증 자산 3종)*
