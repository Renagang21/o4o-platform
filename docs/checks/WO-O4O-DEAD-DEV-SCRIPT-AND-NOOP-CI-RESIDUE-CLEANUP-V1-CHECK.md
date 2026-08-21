# WO-O4O-DEAD-DEV-SCRIPT-AND-NOOP-CI-RESIDUE-CLEANUP-V1 — CHECK

> **작업일**: 2026-08-21
> **대상**: 개발·CI 잔재 (dead dev script / dead devDependency / no-op CI build step)
> **판정 원칙**: 이름·문자열 잔존이 아니라 **실제 소비처 0 입증**된 항목만 제거

---

## 1. 결론 요약

| # | 대상 | 판정 | 조치 |
|:--:|------|------|------|
| ① | `scripts/optimize-npm-immediate.sh` | `DEAD_SCRIPT` | **제거** (`git rm`) |
| ② | root `package.json` 의 `concurrently` devDependency | `DEAD_DEPENDENCY` | **제거** + lockfile 갱신 |
| ③ | `deploy-api.yml` 의 `@o4o/cosmetics-sample-display-extension` build step | `NOOP_CI` | **제거** |
| ④ | `deploy-api.yml` 의 `@o4o/cosmetics-supplier-extension` build step | `NOOP_CI` (§9 연쇄) | **제거** |
| — | `.npmrc` / `.npmrc.pnpm` | 불변 (§5) | **미변경** |
| — | `@o4o/cosmetics-seller-extension` | `ACTIVE_PACKAGE` | **미변경** |
| — | `appsCatalog.ts` / `appstore.spec.ts` 의 sample-display 등록 | `ACTIVE` (runtime 계약) | **미변경** · 후속 후보 |

`UNKNOWN` 0건 · `DEAD_REFERENCE` 0건 · 중지 조건 해당 없음.

---

## 2. Census (§3)

검색 패턴 5종: `optimize-npm-immediate` · `concurrently` · `@o4o/cosmetics-sample-display-extension` · `cosmetics-sample-display-extension` · `npm-immediate`

`concurrently` 는 OTC 의약품 설명서 JSON(`apps/api-server/src/scripts/data/**`)에 **영어 단어**로 다수 등장한다.
이는 문자열 우연 일치이므로 census 에서 제외했다 (`:!apps/api-server/src/scripts/data/**`).

| 패턴 | 유효 참조 | 내역 |
|------|:---:|------|
| `optimize-npm-immediate` / `npm-immediate` | 3 | 스크립트 자기 자신 1(85행 echo) + 직전 WO CHECK 문서 2 (`HISTORICAL_DOC`) |
| `concurrently` (data/lock 제외) | 5 | 직전 WO CHECK 2 (`HISTORICAL_DOC`) + `workspace-packages.json` 3 (stale 생성물) |
| `cosmetics-sample-display-extension` | 12 | `deploy-api.yml` 1 · `appsCatalog.ts` 1 · `register-routes.ts` 주석 1 · `entities.ts` 주석 1 · 테스트 5 · archive 문서 3 |

---

## 3. ① `scripts/optimize-npm-immediate.sh` — `DEAD_SCRIPT`

**실제 호출처: 0건.**

| 확인 항목 | 결과 |
|------|------|
| root `package.json` scripts 참조 | 0 |
| 다른 앱/패키지 `package.json` 참조 | 0 |
| `.github/workflows/**` 참조 | 0 |
| Dockerfile / 배포 스크립트 참조 | 0 |
| 다른 shell script 에서 호출 | 0 |
| 유일한 문자열 일치 | 스크립트 **자기 자신의 85행 안내 echo** (`./scripts/optimize-npm-immediate.sh --selective`) |

### 3-1. §4 예외 조항 미해당 판정

§4 는 *"호출처 0이어도 npm 설정 복구/초기화에 유일한 기능이 있으면 유지한다"* 고 규정한다. 다음 이유로 **미해당**이다.

1. 이 스크립트의 `.npmrc` 생성 블록은 **복구가 아니라 파괴**다. 저장소에 git 추적되는 `.npmrc` 는 pnpm 전용 설정(`node-linker=hoisted`, `shamefully-hoist`, `hoist-pattern[]`, `shared-workspace-lockfile` 등)인데, 스크립트는 이를 npm 지향 설정(`package-lock=true`, `legacy-peer-deps=true`, `workspaces-update=false`, `install-links=true`)으로 **덮어쓴다**.
2. `.npmrc` 는 git 추적 파일이므로 복구 수단이 이미 존재한다 (`git checkout -- .npmrc`). 스크립트가 유일한 복구 경로가 아니다.
3. `pnpm install --workspace=@o4o/main-site` (61행) 의 `--workspace` 는 **npm 플래그로 pnpm 에서 동작하지 않으며**, 대상 패키지명 `@o4o/main-site` 도 존재하지 않는다 (실제는 `@o4o/main-site-nextgen`).

→ 고유 기능 0 + 실행 시 유해. **제거.**

### 3-2. `.npmrc` 영향 판정 (§5)

| 파일 | 조치 | 근거 |
|------|------|------|
| `.npmrc` | **미변경** | §5 "현재 `.npmrc` 계약은 변경하지 않는다" |
| `.npmrc.pnpm` | **미변경** | `.npmrc` 와 byte-identical (`diff` 결과 동일). 과거 스크립트가 `.npmrc` 를 덮어쓴 뒤 복구용으로 남긴 사본으로 추정 |

두 파일 모두 **credential / token 없음** (registry URL·hoist·fetch-retry 설정만). 출력·커밋한 민감정보 0건.

---

## 4. ② `concurrently` — `DEAD_DEPENDENCY`

**Direct consumer: 0건.**

| 확인 항목 | 결과 |
|------|------|
| root `package.json` scripts 사용 | 0 (직전 WO 에서 `dev` 를 `pnpm run dev:admin` 으로 재정의하며 소멸) |
| 하위 workspace `package.json` 의 direct dependency | 0 |
| CI workflow 사용 | 0 |
| 소스코드 import | 0 |
| 잔존 문자열 | 직전 WO CHECK 문서 2건 (`HISTORICAL_DOC`) + `workspace-packages.json` (stale 생성물) |

### 4-1. 조치

root `devDependencies` 에서 `"concurrently": "~7.6.0"` 1줄 제거 후 `pnpm install --lockfile-only`.

**lockfile 변경: 39줄 삭제 (추가 0).** 제거된 항목:

| 항목 | 성격 |
|------|------|
| `concurrently` (importers 의 specifier/version) | direct devDependency 해제 |
| `concurrently@7.6.0` | 패키지 snapshot |
| `date-fns@2.30.0` · `shell-quote@1.8.3` · `spawn-command@0.0.2` | `concurrently` **전용** transitive (다른 소비처 없어 함께 소멸) |

`concurrently` 를 indirect 로 요구하는 다른 패키지가 없어 lockfile 에서 완전히 사라졌다.
(§6 의 "indirect dependency 로 lockfile 에 남는 것은 정상" 조항은 이번에는 해당 사항 없음.)

---

## 5. ③④ Cosmetics Extensions build step — `NOOP_CI`

### 5-1. package 정체 확인 (§7) — **이름만 보고 판단하지 않기 위한 실측**

`pnpm --filter '<name>' exec true` 는 **존재하지 않는 패키지에도 exit 0** 을 반환해 판정에 쓸 수 없다.
실제 `run build` 를 실행해 stdout 을 확인하는 방식으로 재검증했다.

| 패키지 | 실행 결과 | git 추적 파일 | `package.json` | 판정 |
|------|------|:---:|:---:|------|
| `@o4o/cosmetics-seller-extension` | 실제 `tsc` 빌드 수행 | 39 | 있음 | `ACTIVE_PACKAGE` |
| `@o4o/cosmetics-supplier-extension` | `No projects matched the filters` (exit 0) | **0** | 없음 | `PACKAGE_MISSING` / `BUILD_ARTIFACT_ONLY` |
| `@o4o/cosmetics-sample-display-extension` | `No projects matched the filters` (exit 0) | **0** | 없음 | `PACKAGE_MISSING` / `BUILD_ARTIFACT_ONLY` |

두 패키지의 소스는 **commit `2d5be046b`** (`WO-O4O-DEADCODE-CLEANUP-PHASE-A-V1`, "dead 패키지 17개 제거") 에서 이미 삭제됐다.
로컬 `packages/cosmetics-{supplier,sample-display}-extension/` 디렉터리는 **`dist` · `node_modules` · `tsconfig.tsbuildinfo` 만** 남은 과거 빌드 잔재였고, `package.json` 이 없어 `pnpm-workspace.yaml` 의 `packages/*` glob 에도 잡히지 않는다 (= workspace 멤버 아님). 로컬 전용 산출물이므로 삭제했으며 **git 변경 없음**.

### 5-2. `NOOP_CI` 판정 근거 (§8)

| 조건 | sample-display | supplier |
|------|:---:|:---:|
| package match 0 | ✅ | ✅ |
| build 결과 소비 0 (산출물 자체가 생성되지 않음) | ✅ | ✅ |
| deploy artifact 영향 0 (Docker 이미지에 반영되는 파일 없음) | ✅ | ✅ |
| runtime consumer 0 (`apps/api-server/package.json` dependency 에 없음 — seller 만 `workspace:*`) | ✅ | ✅ |
| UNKNOWN 0 | ✅ | ✅ |

`register-routes.ts:371-374` 는 `// Still disabled (Phase R2):` **주석 블록**이며 실제 mount 가 없다 → `COMMENT_RECORD`.

### 5-3. 조치

`.github/workflows/deploy-api.yml` 의 "Cosmetics Extensions" 블록에서 no-op 2줄 제거. seller 라인은 보존.

```
# Cosmetics Extensions
echo "📦 Cosmetics Extensions..."
pnpm --filter '@o4o/cosmetics-seller-extension' run build
```

### 5-4. 제거하지 **않은** 것 (§9 범위 분리)

| 위치 | 내용 | 미조치 사유 |
|------|------|------|
| `apps/api-server/src/app-manifests/appsCatalog.ts:345` | `cosmetics-sample-display-extension` 을 설치 가능 앱으로 등록 | catalog 메타 삭제 = **runtime/기능 변경**. §9 의 "범위 확대 시 별도 WO" 에 해당 |
| `apps/api-server/tests/multi-tenant/appstore.spec.ts` (5개 단언) | 위 catalog 항목을 검증하는 **살아있는 테스트 계약** | catalog 와 lockstep. 함께 판단해야 함 |

두 항목은 `ACTIVE` 이므로 이번 WO 에서 손대지 않았다. **후속 후보로 보고.**

---

## 6. 재검색 결과 (§10) — `DEAD_REFERENCE` 0

| 패턴 | 잔존 | 분류 |
|------|:---:|------|
| `optimize-npm-immediate` | 2 | `HISTORICAL_DOC` (직전 WO CHECK 2건) |
| `@o4o/main-site` | 10 | 전부 `@o4o/main-site-nextgen` (**존재하는 별개 ACTIVE 패키지**) 또는 `HISTORICAL_DOC` |
| `@o4o/lms-marketing` | 9 | `COMMENT_RECORD` 3 (제거 이력 주석: `entities.ts:554` · `lms-marketing.routes.tsx:12` · `main-site/router/index.tsx:28`) + `HISTORICAL_DOC` 6 |
| `@o4o/cosmetics-sample-display-extension` | 11 | `ACTIVE` 6 (`appsCatalog.ts` 1 + 테스트 5) · `COMMENT_RECORD` 2 · `HISTORICAL_DOC` 3 |
| `@o4o/cosmetics-supplier-extension` | 4 | `COMMENT_RECORD` 1 · `HISTORICAL_DOC` 3 |
| `concurrently` (data/lock 제외) | 5 | `HISTORICAL_DOC` 2 + `workspace-packages.json` 3 (stale 생성물 · 소비처 0) |

**`DEAD_REFERENCE` = 0.** (실행 계약을 가리키면서 대상이 없는 참조가 남아 있지 않음)

`workspace-packages.json` 은 과거 다른 머신(`/home/sohae21/...` 경로)에서 생성된 인벤토리 스냅샷으로, 저장소 내 소비처가 0이다
(`git grep "workspace-packages"` 의 일치는 `.npmrc` 의 `prefer-workspace-packages` 설정어뿐 — 무관). 이번 WO 대상이 아니므로 **후속 후보로만 보고**한다.

---

## 7. 검증 (§11)

| 항목 | 명령 | 결과 |
|------|------|------|
| root `package.json` JSON parse | `node -e "...JSON.parse..."` | **PASS** · `devDependencies.concurrently === undefined` |
| lockfile 정합 | `pnpm install --lockfile-only` | **PASS** (exit 0) |
| lockfile drift 없음 | `pnpm install --frozen-lockfile --lockfile-only` | **PASS** — `Scope: all 79 workspace projects / Done in 1.2s` |
| root scripts 문법 | 전체 scripts 키 파싱 | **PASS** — dead 참조 0 |
| `deploy-api.yml` YAML parse | python `yaml.safe_load` | **PASS** — `steps = 11` |
| **수정된 build step 실측 (전)** | 원본 블록 실행 | 2개 filter 가 `No projects matched the filters` 출력 (no-op 확인) |
| **수정된 build step 실측 (후)** | 해당 run 블록을 `set -e` 로 추출해 실제 실행 | **PASS** — `📦 Cosmetics Extensions...` → seller `tsc` → `✅ All API-specific packages built successfully!` · exit 0 |
| api-server typecheck | `npx tsc --noEmit -p tsconfig.json` | **PASS** (exit 0) |
| api-server build | `pnpm run build` | **PASS** (exit 0) |

§11 의 *"단순 parser PASS만으로 CI 계약 정상이라고 선언하지 않는다"* 요구에 따라,
YAML 파싱과 별개로 **수정된 `Build API-specific packages` step 의 run 블록을 그대로 추출해 로컬에서 실행**했고 전후 모두 성공을 실측했다.
(검증용 임시 파일 `ci_step.sh` 는 검증 직후 삭제했으며 커밋에 포함되지 않는다.)

---

## 8. CI 실행 대체 (§12)

이번 변경은 **application code 변경 0** 이며 production 재배포가 불필요하다.
`deploy-api.yml` workflow trigger 를 의도적으로 발생시키지 않았고, §12 에 따라 다음으로 대체했다.

1. 동일 command 로컬 실행 (§7 의 build step 실측 — exit 0)
2. YAML parse 검증 (steps = 11)
3. 기존 deploy artifact contract 검증 — 제거한 2개 filter 는 산출물을 생성하지 않으므로 Docker 이미지·배포 산출물에 차이가 없음

**GitHub Actions 실제 실행은 하지 않았다.** 다음 API 배포 시 자연 검증된다.

---

## 9. Production 검증 (§13)

| 항목 | 결과 |
|------|------|
| `o4o-core-api` Ready | **True** (`o4o-core-api-03412-lnx`) |
| `/health` | **200** |
| `/health/database` | **healthy** — PostgreSQL 15.17 · pingMs 3 · activeConnections 10 · longRunningQueries 0 |
| 신규 Cloud Run ERROR | **0** |
| deploy·build 관련 error | **0** |

당일(2026-08-21) `severity>=ERROR` 30건이 조회되나 **전부 00:15:24~00:15:39 의 15초 버스트**이며,
`.../signage/kpa-society/**/not-a-uuid` 형태의 **의도적 invalid UUID 프로브**다
(다른 세션의 `WO-O4O-SIGNAGE-RESOURCE-ID-VALIDATION-AND-INVALID-UUID-NORMALIZATION-V1` smoke).
이전 리비전(`03410-n4r`)에서 발생했고 본 작업 착수 이전 시각이며, 배포·빌드와 무관하다.

§13 규정대로 기능 변경이 아니므로 광범위한 사용자 E2E 는 수행하지 않았다.

---

## 10. 변경 파일

| 파일 | 변경 |
|------|------|
| `scripts/optimize-npm-immediate.sh` | **삭제** (-90) |
| `.github/workflows/deploy-api.yml` | -2 (no-op filter 2줄) |
| `package.json` | -1 (`concurrently` devDependency) |
| `pnpm-lock.yaml` | -39 (추가 0) |

**합계 4 파일 · -132 라인 · 추가 0.**

로컬 전용 삭제 (git 변경 없음): `packages/cosmetics-sample-display-extension/` · `packages/cosmetics-supplier-extension/` (각각 `dist`/`node_modules`/`tsbuildinfo` 만 보유)

---

## 11. 중지 조건 점검 (§14)

| 조건 | 해당 |
|------|:---:|
| 스크립트의 현재 호출처 발견 | 없음 |
| `concurrently` active consumer 발견 | 없음 |
| sample-display package 실제 runtime consumer 발견 | 없음 (catalog 메타는 runtime consumer 가 아니며 미변경) |
| CI artifact 가 후속 step 에서 실제 소비됨 | 없음 (산출물 자체 미생성) |
| package ownership 불명확 | 없음 |
| 다른 세션 WIP 와 충돌 | 없음 (`git status` 에 타 세션 dirty/untracked 0) |
| UNKNOWN 발생 | 없음 |

---

## 12. 후속 후보 (이번 WO 범위 밖)

1. **`appsCatalog.ts:345` + `appstore.spec.ts` (5 단언)** — 삭제된 `cosmetics-sample-display-extension` / `cosmetics-supplier-extension` 을 설치 가능 앱으로 계속 광고한다. catalog·테스트 lockstep 정리 필요 (runtime 계약 변경이므로 별도 WO).
2. **`workspace-packages.json`** — 외부 머신 경로(`/home/sohae21/...`)를 담은 stale 생성 인벤토리. 소비처 0.
3. **`.npmrc.pnpm`** — `.npmrc` 와 byte-identical 중복 사본. dead script 제거로 존재 이유가 사라졌다.
4. **`register-routes.ts:371-374` / `entities.ts:553-554`** — Phase R1/R2 제거 이력 주석. 기록 가치가 있어 유지했으나 정리 여부 판단 필요.

---

## 13. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건 (§12)

기준 문서(`docs/baseline/` · `docs/architecture/` · `docs/rules/` 등) 및 `CLAUDE.md` 상세 규칙 문서 목록에서 이번 변경으로 인한 drift 는 발견되지 않았다.
`docs/checks/**` 잔존 참조는 §16-1 에 따라 **기록물이므로 정비 대상이 아니다.**
