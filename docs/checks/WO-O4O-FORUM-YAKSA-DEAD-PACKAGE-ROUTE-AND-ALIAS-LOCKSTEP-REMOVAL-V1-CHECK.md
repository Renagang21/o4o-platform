# WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1 — CHECK

- **작업일**: 2026-08-06
- **유형**: Legacy dead package · route · alias lockstep 제거 (실행 코드 한정)
- **선행 감사**: [WO-O4O-FORUM-YAKSA-AND-LEGACY-BUILD-TEST-RESIDUE-BOUNDARY-AUDIT-V1-CHECK.md](WO-O4O-FORUM-YAKSA-AND-LEGACY-BUILD-TEST-RESIDUE-BOUNDARY-AUDIT-V1-CHECK.md) — 판정 `REMOVE_LEGACY`
- **판정**: **PASS_WITH_PUSH_HOLD** — 제거·검증·커밋 완료, **push 는 보호조건 10 발동으로 보류**

---

## §1. 제거한 패키지 · route · manifest · alias · 등록 참조

### 1-A. 패키지 삭제 (45 파일)

| 대상 | 내용 |
|---|---|
| `packages/forum-yaksa/**` | 43 파일 (entities · services · lifecycle · migrations · admin-ui · manifest · tsconfig) |
| `apps/api-server/packages/forum-yaksa/package.json` | vendor stub 1 파일 |
| `apps/api-server/src/app-manifests/forum-yaksa.manifest.ts` | 앱 매니페스트 1 파일 (import 소비처 0건) |

### 1-B. Frontend route · alias (lockstep)

| 파일 | 제거 내용 |
|---|---|
| `apps/admin-dashboard/src/routes/apps.routes.tsx` | `@o4o/forum-core-yaksa/src/admin-ui/pages/*` lazy import 3건 + `/yaksa/communities` 계열 route 3건 |
| `apps/admin-dashboard/vite.config.ts` | `resolve.alias['@o4o/forum-core-yaksa']` 1건 + `optimizeDeps.exclude` 1건 |

> route 와 alias 는 **같은 커밋에서 동시 제거**했다. alias 만 제거하면 bare specifier 가 미해결되어 admin 빌드가 깨진다.

### 1-C. Backend 카탈로그 · 정책 · 등록부

| 파일 | 제거 내용 |
|---|---|
| `apps/api-server/src/app-manifests/appsCatalog.ts` | `appId: 'forum-yaksa'` 카탈로그 항목 (감사 이전 HOLD 해제) |
| `apps/api-server/src/service-groups/index.ts` | cosmetics `incompatibleApps` · cosmetics `extensionRules.incompatible` · yaksa `requiredCoreApps` · hospital `incompatibleApps` 4개 site |
| `apps/api-server/src/validators/template-linter.ts` | `REQUIRED_CORE_APPS.yaksa` · `INCOMPATIBLE_EXTENSIONS.cosmetics` 2개 site |
| `apps/api-server/src/services/app-manager/app-manager.types.ts` | `PACKAGE_MAP['forum-yaksa']` |
| `apps/api-server/src/services/service-monitor.service.ts` | `detectServiceGroup()` 의 `apps.includes('forum-yaksa')` 분기 |
| `apps/api-server/src/service-templates/templates/yaksa-branch.json` | `coreApps` 항목 |
| `bundles/yaksa.bundle.json` | `apps[]` 항목 + `installOrder` 항목 |
| `apps/api-server/scripts/bootstrap-install-apps.ts` / `.mjs` | `CORE_APPS_INSTALL_ORDER` 항목 |
| `apps/main-site/src/appstore/registry.ts` | `@o4o/forum-core-yaksa` 앱스토어 등록 항목 |
| `apps/main-site/src/appstore/manifestLoader.ts` | `folderNameMap` 항목 + `manifestStubs['forum-yaksa']` |

### 1-D. Workspace · build 배선

| 파일 | 제거 내용 |
|---|---|
| `package.json` (root) | `build:app-store-packages` · `typecheck:app-store-packages` 의 `@o4o/forum-core-yaksa` 필터 |
| `apps/api-server/package.json` | `"@o4o-apps/forum-yaksa": "workspace:*"` 의존성 |
| `tsconfig.json` (root) | `references` 의 `./packages/forum-yaksa` |
| `.github/workflows/deploy-api.yml` | `pnpm --filter '@o4o-apps/forum-yaksa' run build \|\| true` |
| `scripts/dev.mjs` | `appStorePackages` 배열 2개 site |
| `pnpm-lock.yaml` | importer `packages/forum-yaksa` + api-server 의존성 링크 (**31줄 삭제, 추가 0**) |

> **root `package.json:33,35` 은 선행 감사 §17 목록에 누락되어 있던 site 다.** 또한 감사 §17 은 template-linter 경로를
> `src/service-templates/validators/template-linter.ts` 로 기재했으나 실제 경로는 `src/validators/template-linter.ts` 였다.
> 이번 제거는 재검색으로 확인한 실제 모집단을 기준으로 수행했다.

---

## §2. 보존한 KPA Society 공용 포럼과 fixture

| 대상 | 상태 |
|---|---|
| `/api/v1/forum` (`register-routes.ts:161`) | **무변경** |
| `/api/v1/kpa` → KPA 포럼 (`register-routes.ts:865`) | **무변경** |
| `services/**` (KPA Society 프런트) | `forum-yaksa` 참조 **0건** — 애초에 소비하지 않음 |
| `/forum` 계열 admin route 6건 (`@o4o/forum-core`) | **무변경** |
| `@o4o/forum-core` alias · `optimizeDeps` | **무변경** |
| 공용 forum-core · organization-forum 패키지 | **무변경** |
| 운영자 중심 포럼 생성·승인 흐름 | **무변경** |
| `service_audience_policies` · 의약품 접근정책 | **무변경** |
| `yaksa_*` 운영 DB 테이블 | **무변경 (조회조차 하지 않음)** |
| `app_registry` stale 행 | **무변경** |
| schema · migration · 운영 DB 데이터 | **무변경** |
| `apps/api-server/tests/multi-tenant/setup.ts` (fixture 파일 자체) | **보존** — provider 라벨 1개만 교체 (§3) |

---

## §3. legacy assertion → 현재 공용 구조 검증으로 대체

WO 실행 원칙에 따라 **삭제만 하지 않고 현재 구조를 검증하는 assertion 으로 대체**했다.
대체 기준은 카탈로그에 실재하는 yaksa 전용 앱 `pharmacy-ai-insight`(→ `organization-core` 의존) 와
공용 포럼 체인 `organization-forum`(global) → `forum-core` 다.

| `appstore.spec.ts` 위치 | 기존 | 대체 |
|---|---|---|
| cosmetics 카탈로그 격리 | `not.toContain('forum-yaksa')` | 위 유지 + `not.toContain('pharmacy-ai-insight')` 추가 |
| yaksa 카탈로그 노출 | `toContain('forum-yaksa')` | `toContain('pharmacy-ai-insight')` + `not.toContain('forum-yaksa')` |
| yaksa 앱 cosmetics 비노출 | 배열에 `forum-yaksa` | 배열 유지 + `pharmacy-ai-insight` 추가, 헬퍼 검증도 전환 |
| yaksa 추천 앱 | `toContain('forum-yaksa')` | `toContain('pharmacy-ai-insight')` |
| 서비스그룹별 추천 차이 | `yaksaIds` 에 `forum-yaksa` | `pharmacy-ai-insight` |
| incompatible 설치 차단 | `canInstallApp('forum-yaksa','cosmetics')` | `canInstallApp('pharmacy-ai-insight','cosmetics')` + 제거된 앱 비후보 검증 추가 |
| cross-service 차단 | `canInstallApp('forum-yaksa','tourist')` | `canInstallApp('pharmacy-ai-insight','tourist')` |
| 의존 체인 해석 | `forum-yaksa` → `forum-core` | **`organization-forum` → `forum-core`** (공용 구조) + `pharmacy-ai-insight` → `organization-core` |
| chained dependency | `toContain('forum-yaksa')` | `pharmacy-ai-insight` + `organization-core` |
| tourist 의존 격리 | `not.toContain('forum-yaksa')` | 유지 + `pharmacy-ai-insight` 추가 |

`setup.ts` — view fixture 는 **삭제하지 않고 provider 라벨만 교체**:
`registerView('yaksa.post.list', …, 'forum-yaksa')` → `… , 'organization-forum')`.
view id 와 serviceGroup 격리 검증 범위는 그대로이며, `view-system.spec.ts:282` 의 `yaksa.post.list` 기대값도 유지된다.

---

## §4. typecheck · build 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| api-server (프로덕션 build config) | `npx tsc -p tsconfig.build.json --noEmit` | **PASS (exit 0)** |
| admin-dashboard typecheck | `npx tsc --noEmit -p tsconfig.json` | **PASS (오류 0)** |
| main-site typecheck | `npx tsc --noEmit -p tsconfig.json` | **PASS (오류 0)** |
| admin-dashboard build | `npx vite build` | **PASS — `✓ built in 1m 29s`** (alias 제거 후에도 미해결 specifier 0) |

### 4-A. api-server 전체 tsconfig 의 기존 실패 (이번 작업과 무관)

`npx tsc --noEmit -p tsconfig.json` 은 **14개 파일에서 오류**가 발생하나 **전부 `src/scripts/**` 하위**이며,
모두 **커밋된 기존 파일(작업 트리 clean)** 로 origin/main 시점부터 존재하던 실패다.
`forum-yaksa` 참조 파일은 하나도 포함되지 않으며, 프로덕션 빌드 config(`tsconfig.build.json`)는
`src/scripts/**` 를 exclude 하므로 배포 빌드에 영향이 없다.
→ **이번 제거로 인한 회귀 아님** (보호조건 8 원인 분리 완료).

---

## §5. 실행한 spec 과 통과 테스트 수

| 러너 | 명령 | 결과 |
|---|---|---|
| vitest (멀티테넌트) | `cd apps/api-server/tests/multi-tenant && npx vitest run` | **4 spec / 75 tests 전부 PASS** |
| jest (api-server) | `npx jest --maxWorkers=1` | **70 suites / 1,176 tests 전부 PASS** |

vitest 내역: `data-isolation.spec.ts` 18 · `navigation.spec.ts` 14 · `view-system.spec.ts` 19 · `appstore.spec.ts` 24 = **75**.
→ **기준 모집단 4 spec / 75 tests 그대로 유지**.

---

## §6. DB · migration · 배포 변경 0 확인

| 항목 | 결과 |
|---|---|
| 운영 DB 접속 | **0회** (proxy 미기동, SQL 미실행) |
| `yaksa_*` 테이블 | 조회·변경 **0** |
| `app_registry` | 조회·변경 **0** |
| migration 파일 추가/수정 | **0** (삭제된 `packages/forum-yaksa/src/migrations/*` 3건은 **미적용 패키지 내부 파일**로, 운영 DB 스키마와 무관) |
| 배포 실행 | **0** (`deploy-api.yml` 은 빌드 스텝 1줄 제거뿐, 수동 배포 미실행) |

---

## §7. 변경 파일 목록 (66 files, +112 / −3,716)

**수정 21**
```
.github/workflows/deploy-api.yml
apps/admin-dashboard/src/routes/apps.routes.tsx
apps/admin-dashboard/vite.config.ts
apps/api-server/package.json
apps/api-server/scripts/bootstrap-install-apps.mjs
apps/api-server/scripts/bootstrap-install-apps.ts
apps/api-server/src/app-manifests/appsCatalog.ts
apps/api-server/src/service-groups/index.ts
apps/api-server/src/service-templates/templates/yaksa-branch.json
apps/api-server/src/services/app-manager/app-manager.types.ts
apps/api-server/src/services/service-monitor.service.ts
apps/api-server/src/validators/template-linter.ts
apps/api-server/tests/multi-tenant/appstore.spec.ts
apps/api-server/tests/multi-tenant/setup.ts
apps/main-site/src/appstore/manifestLoader.ts
apps/main-site/src/appstore/registry.ts
bundles/yaksa.bundle.json
package.json
pnpm-lock.yaml
scripts/dev.mjs
tsconfig.json
```

**삭제 45** — `packages/forum-yaksa/**` 43 + `apps/api-server/packages/forum-yaksa/package.json` + `apps/api-server/src/app-manifests/forum-yaksa.manifest.ts`

---

## §8. 잔존 문자열 검색 결과와 남긴 이유

전수 검색: `forum-yaksa|forum_yaksa|forumYaksa|forum-core-yaksa`
(제외: `node_modules` · `dist*` · `build` · `coverage` · `.vite-cache` · `.git`)

### 8-A. 실행·빌드·alias·route 참조 — **0건**

제거 후 남은 코드 파일의 hit 는 **전부 (a) 이번 WO 의 제거 주석, 또는 (b) 무관한 설명 주석**이다.

| 파일 | hit | 성격 |
|---|---|---|
| `apps/api-server/src/service-groups/index.ts` | 4 | (a) WO 제거 주석 |
| `apps/admin-dashboard/src/routes/apps.routes.tsx` | 3 | (a) WO 제거 주석 |
| `apps/admin-dashboard/vite.config.ts` | 2 | (a) WO 제거 주석 |
| `apps/api-server/src/validators/template-linter.ts` | 2 | (a) WO 제거 주석 |
| `apps/main-site/src/appstore/manifestLoader.ts` | 2 | (a) WO 제거 주석 |
| `scripts/dev.mjs` · `registry.ts` · `appsCatalog.ts` · `service-monitor.service.ts` · `app-manager.types.ts` · `bootstrap-install-apps.{ts,mjs}` · `setup.ts` | 각 1 | (a) WO 제거 주석 |
| `apps/api-server/tests/multi-tenant/appstore.spec.ts` | 17 | (a) 제거 주석 + **제거 사실을 검증하는 negative assertion** (`not.toContain('forum-yaksa')`) — 의도적 잔존 |
| `scripts/appstore-guard.ts:288` | 1 | (b) 명명 패턴 **예시 주석** — 실행 참조 아님 |
| `packages/forum-core/src/backend/types/index.ts:173` | 1 | (b) 확장 패키지 **예시 주석** |
| `packages/forum-core/src/backend/services/forum.search.service.ts:39` | 1 | (b) 확장 패키지 **예시 주석** |
| `apps/api-server/src/modules/types.ts:36` | 1 | (b) appId **예시 주석** |
| `apps/api-server/src/app-manifests/index.ts:10` | 1 | (b) Phase R1 이력 **주석** (registry 는 비어 있음) |

> (b) 항목은 문자열이 식별자·경로·설치 대상 어디에도 쓰이지 않는 순수 주석이다. 이름 언급만으로 수정하면
> 무관한 파일을 건드리게 되므로 WO 의 "관련 없는 리팩터링 금지" 원칙에 따라 남겼다.

### 8-B. 문서·역사 기록 — 실행 참조 아님 (남김)

`docs/checks/**` · `docs/archive/**` · `docs/investigations/**` · `docs/services/**` · `bundles/README.md` ·
`packages/forum-core/TODO.md` · `packages/organization-core/TODO.md` 등 **약 90 hit**.
전부 과거 감사·WO 의 **역사 기록**이며 실행되지 않는다. 기록 보존을 위해 유지한다.

### 8-C. 의도적 잔존 1건 — 후속 DB 감사로 이관

| 대상 | 이유 |
|---|---|
| `tmp/forum_yaksa_install.sql` | `yaksa_forum_community*` 테이블 **생성 SQL 아티팩트**. 빌드·실행 경로에서 호출되지 않는다. 운영 DB 잔재(`yaksa_*` 테이블) 처리와 **한 묶음으로 판단해야 하므로**, 이번 WO 범위(실행 코드 한정)에서 제외하고 후속 read-only DB 감사에 이관한다. |

### 8-D. 빌드 산출물 (추적 대상 아님)

`packages/forum-yaksa/dist/`, `apps/api-server/packages/forum-yaksa/dist/`, `apps/api-server/tsconfig.tsbuildinfo` —
git 미추적 로컬 산출물. 패키지 `package.json` 이 사라져 모듈 해석이 불가하므로 무해하며, 다음 clean build 시 소멸한다.

---

## §9. 커밋 · push 결과

- **커밋**: `chore(forum): remove dead forum-yaksa package and routes` — §9-A 참조
- **push**: **보류 (미실행)** — §10 참조

---

## §10. 병행 실행 보호조건 검증 (10항)

| # | 조건 | 결과 |
|:--:|---|---|
| 1 | 미커밋 파일 사전 기록 | ✅ 시작 시 16건(`apps/api-server/src/scripts/**` HFF ZH 계열) `/c/tmp/wip_before.txt` 스냅샷 |
| 2 | 타 세션 WIP 무수정 | ✅ 수정·삭제·이동·stash·stage·commit **0건** |
| 3 | checkout / pull / stash / `add .` / `add -A` 미실행 | ✅ **전부 미실행**. staging 은 66개 경로 명시 pathspec |
| 4 | HEAD == origin/main 확인 | ✅ 시작 시 `c5059aee6`, ahead/behind **0/0** 확인 후 진행 |
| 5 | 제거 대상 ↔ 상품 데이터 WIP 경로 분리 | ✅ WIP 16건 전부 `apps/api-server/src/scripts/**`, 제거 대상 66 경로와 **교집합 0** |
| 6 | 락파일은 forum-yaksa 범위만 | ✅ `pnpm install --lockfile-only` 결과 **31줄 삭제 / 0줄 추가**, 전부 forum-yaksa importer·링크 |
| 7 | 검증 전후 WIP 비교 | ⚠️ **타 세션이 작업 중 WIP 를 스스로 커밋** (`9ce1c3491`, 27 파일) → WIP 16 → 0. 해당 커밋과 이번 WO 대상 파일의 **교집합 0건** 확인. 내가 건드린 것은 아님 |
| 8 | 실패 원인 분리 | ✅ 유일한 실패는 `src/scripts/**` 14파일 typecheck — **커밋된 기존 파일의 선행 실패**이며 프로덕션 build config 는 exclude. 제거로 인한 회귀 0 (§4-A) |
| 9 | 이번 WO 파일만 path-specific stage | ✅ 66 경로 명시. 상품 데이터 스크립트·JSON **0건 포함** |
| 10 | push 직전 origin/main 확인 | ❌ **origin/main 이 3 커밋 전진** → **push 중지** (§10-A) |

### 10-A. push 중지 사유 (보호조건 10 / 즉시 중지 조건)

작업 도중 원격이 전진했다.

```
HEAD        9ce1c3491  (타 세션이 커밋한 HFF ZH 작업 — 이번 WO 와 무관, 파일 교집합 0)
origin/main 3 commits ahead of HEAD
git rev-list --left-right --count HEAD...origin/main  →  1  3
```

사용자 지정 즉시 중지 조건 **"origin/main 이 현재 HEAD 보다 전진함"** 및 보호조건 10
**"원격 main 이 전진했다면 pull·rebase 하지 말고 중지하여 보고한다"** 에 해당한다.

- ✅ 제거 · 검증 · CHECK · **path-specific 로컬 커밋** 까지 완료
- ⛔ `git pull` · `git rebase` · `git push` **미실행**
- 재개 시: 원격 3 커밋과의 정합을 사용자 승인 하에 처리한 뒤 push

> 로컬 커밋까지 수행한 이유: 같은 작업 트리에서 타 세션이 활발히 커밋 중이므로(작업 중 실제 발생),
> 66개 변경을 uncommitted 로 방치하면 타 세션의 광범위 staging 에 휩쓸릴 위험이 크다.
> 커밋은 로컬·되돌릴 수 있는 조작이며, 사용자가 차단한 원격 반영(push)은 수행하지 않았다.

---

## §11. 후속 권장 작업

1. **`IR-O4O-SERVICE-PHARMACY-PRODUCT-ACCESS-ENFORCEMENT-COVERAGE-AUDIT-V1`** (WO 지정 후속)
2. **`yaksa_*` 운영 DB 테이블 · `app_registry` stale 행 · `tmp/forum_yaksa_install.sql` 처리** — read-only 감사 선행 후 별도 WO
