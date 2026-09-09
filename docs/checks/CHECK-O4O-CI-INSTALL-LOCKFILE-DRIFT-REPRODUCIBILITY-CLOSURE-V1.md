# CHECK-O4O-CI-INSTALL-LOCKFILE-DRIFT-REPRODUCIBILITY-CLOSURE-V1

CI build script 의 비-frozen install 이 `pnpm-lock.yaml` 을 변경하는 원인 규명 및 설치 계약 정정

- 작업 branch: `work/ci-install-lockfile-drift-closure-v1`
- 작업일: 2026-09-09

---

## 1. 시작 · 종료 HEAD

| 항목 | 값 |
|---|---|
| 시작 HEAD | `3dfd683576beaf367c779e2233d66321bf4f0437` |
| 시작 `origin/main` | `3dfd683576beaf367c779e2233d66321bf4f0437` (동일 확인) |
| 종료 HEAD | 본 문서를 포함한 커밋 (완료 보고에 기재) |
| 작업 트리 | `?? scratchpad/` (사용자 작업물 — 미접촉) |

작업 중 병렬 세션이 아래 4개 파일을 수정했다.

```text
apps/api-server/src/controllers/kpa-branch/BranchMemberController.ts
apps/api-server/src/routes/kpa-branch/kpa-branch.routes.ts
apps/api-server/src/services/kpa-branch/BranchMembershipService.ts
services/web-kpa-branch/src/lib/api/memberConsole.ts
```

**본 WO 는 이 파일들을 수정하지 않았고 stage 에도 올리지 않았다** (path-specific commit).

---

## 2. pnpm · Node 기준

| 항목 | 값 | 출처 |
|---|---|---|
| Node (로컬) | `v22.18.0` | — |
| Node (CI) | `22.18.0` | `ci-pipeline.yml` `env.NODE_VERSION` |
| pnpm (로컬) | `10.25.0` | — |
| pnpm (CI) | `10.25.0` | `.github/actions/setup-build-env/action.yml` `pnpm-version` 기본값 |
| 저장소 지정 pnpm | `10.25.0` | 루트 `package.json` 의 `volta.pnpm` |
| `packageManager` 필드 | **없음** | corepack 고정 미사용. 고정 지점은 `volta` + CI action 기본값 2곳 |

→ **로컬과 CI 의 pnpm 버전은 일치한다.** 이번 drift 는 pnpm 버전 차이가 원인이 아니다.
다만 고정 지점이 두 곳으로 나뉘어 있어 함께 어긋날 수 있으므로, 회귀 가드에서 두 값의 일치를 단언한다.

`.npmrc` 의 관련 설정: `auto-install-peers=true`, `resolution-mode=highest`,
`strict-peer-dependencies=false`, `node-linker=hoisted`, `shamefully-hoist=true`.

---

## 3. drift 재현 결과

초기 lockfile 을 수정하지 않은 상태에서 각 실험을 실행하고, 비-frozen install 이 만든 diff 를
되돌리기 전에 먼저 확인했다. 광범위 `reset` · `clean` 은 사용하지 않았고,
실험 사이에는 `pnpm-lock.yaml` 만 복원했다.

| 실험 | 명령 | `pnpm-lock.yaml` 변화 | 그 외 tracked 변화 |
|---|---|---|---|
| A | `pnpm install --frozen-lockfile` | **없음** (exit 0) | 없음 |
| B | `bash scripts/ci-build-app.sh admin-dashboard` (수정 전) | **있음** (아래 2건) | 없음 |
| C | `pnpm install` (저장소 지정 pnpm 10.25.0) | **있음** (B 와 동일) | 없음 |

- B 와 C 의 결과 lockfile 이 동일하다 → 스크립트가 특별한 일을 하는 것이 아니라
  **스크립트 안의 비-frozen `pnpm install` 이 그대로 원인**이다.
- C 를 2회 반복해 **2/2 재현**을 확인했다. 우발적 결과가 아니다.
- C 의 결과 상태에서 다시 `pnpm install` 을 실행하면 추가 변화가 없다 → 그 상태도 고정점이다.

drift 의 내용은 서로 독립인 2건이다. 하나의 원인으로 묶어 판정하지 않고 각각 분리 판정했다.

```text
1. services/web-glycopharm importer 블록(139줄) 제거
2. ts-jest optional peer 스냅샷에 (esbuild@0.27.0) 추가
```

### frozen install 이 이 상태를 잡지 못한 이유

`pnpm install --frozen-lockfile` 은 lockfile 에 **워크스페이스에 없는 extra importer 가 남아 있는 것**을
실패로 보지 않는다. 시작 시점 커밋본에서 frozen install 은 exit 0 으로 통과한다(실험 A).
CI 의 `setup-build-env` 는 `strict-lockfile: 'true'` 로 frozen install 을 강제하고 있었으나
같은 이유로 이 stale importer 를 통과시켰고, 뒤이어 `ci-build-app.sh` 의 비-frozen install 이
lockfile 을 고쳐 썼다. CI 는 그 결과를 커밋하지 않으므로 **결함이 보이지 않은 채 유지**됐고,
로컬에서만 무관한 diff 로 나타났다. 직전 WO(`3dfd68357`)에서 실제로 이 현상이 관측되어 본 WO 로 분리됐다.

---

## 4. GlycoPharm importer 판정

| 조사 | 결과 |
|---|---|
| lockfile 내 `services/web-glycopharm:` | `pnpm-lock.yaml` importers 블록 내 139줄 |
| 워크스페이스 실재 여부 | 디렉터리는 로컬에 남아 있으나 **`package.json` 없음**, git 추적 파일 **0건** (`dist/`, `node_modules/` 잔재만) |
| `pnpm-workspace.yaml` | `services/*` 로 포함 대상이나 `package.json` 이 없어 pnpm 이 package 로 인식하지 않는다 |
| 삭제 커밋 | `83853d8d3 feat(platform)!: GlycoPharm 서비스 완전 삭제 (WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1)` |
| 그 커밋이 `pnpm-lock.yaml` 을 변경했는가 | **아니다** — `git show --stat 83853d8d3 -- pnpm-lock.yaml` 출력 0 |

**판정: 판정 B(stale lockfile importer) — 정리한다.**

서비스는 별도 WO 로 완전 삭제되었는데 lockfile importer 만 방치된 것이다.
CLAUDE.md §4 에도 GlycoPharm OrderType 이 해당 WO 에서 제거되었다고 명시되어 있다.

정리 조건 5개를 모두 만족한다.

```text
package.json dependency 변경 0          ✅
dependency 버전 의도 변경 0              ✅
삭제된 workspace importer 정리 근거 명확  ✅ (삭제 커밋 83853d8d3 · package.json 부재 · 추적 파일 0)
동일 pnpm 버전에서 결과 재현 가능          ✅ (10.25.0, 2/2)
불필요한 전체 lockfile churn 없음         ✅ (해당 importer 블록 139줄만)
```

GlycoPharm 서비스 재생성 · 복구는 하지 않았다. 로컬 잔여 디렉터리도 삭제하지 않았다(금지 범위).
lockfile 잔재만 제거했다.

---

## 5. ts-jest / esbuild peer snapshot 판정

`ts-jest@29.4.1` 은 `esbuild` 를 **`peerDependencies` 에 선언하지 않고
`peerDependenciesMeta` 에 `optional: true` 로만** 선언한다(설치본에서 확인).
`.npmrc` 의 `auto-install-peers=true` 와 결합해, pnpm 이 **전면 재해석을 수행할 때에 한해**
트리에 이미 존재하는 `esbuild@0.27.0` 을 `apps/api-server` 쪽 ts-jest 인스턴스에
optional peer 로 붙인다. `apps/api-server` 자신은 `esbuild` 를 의존하지 않는다.

분리 실험으로 인과를 확정했다.

| 시작 상태 | 실행 | esbuild 가 붙은 ts-jest 스냅샷 |
|---|---|---|
| 커밋본 (glycopharm importer 있음) | `pnpm install` (비-frozen) | **생김** (2/2 재현) |
| 커밋본 − glycopharm importer 수동 제거 | `pnpm install --frozen-lockfile` | **안 생김**, 추가 변화 0 |
| 위 상태 | `pnpm install` (비-frozen) | **안 생김**, 추가 변화 0 |

→ esbuild 변화는 **독립적으로 필요한 정규화가 아니다.**
importer 불일치가 촉발한 전면 재해석의 부산물이며, importer 를 먼저 정리하면 나타나지 않는다.
esbuild 가 붙은 상태와 붙지 않은 상태가 **둘 다 안정적인 고정점**이므로 어느 쪽도 "필수 정규화"가 아니다.

판정 C 의 4개 후보 중 분류는 다음과 같다.

```text
필수 정규화              아니다 (importer 정리 후 재현되지 않음)
pnpm 버전 차이 churn      아니다 (로컬·CI 모두 10.25.0)
설치 환경 차이            아니다 (동일 환경에서 결정론적으로 2/2 재현)
실제 resolution 변화      아니다 (package.json·버전·의도 무변경. optional peer 부착일 뿐)
→ importer 불일치가 촉발한 전면 재해석의 부산물
```

**판정: 원인이 확정된 stale importer 만 정리하고, peer snapshot 은 커밋본 형태를 유지한다.**
설명되지 않는 churn 을 커밋에 포함하지 않는다. 원인은 확정됐으므로
`UNEXPLAINED_PEER_SNAPSHOT_DRIFT = 0` 이다.

---

## 6. 스크립트 install 필요성 판정 (판정 A)

`scripts/ci-build-app.sh` 는 build 전에 항상 두 가지를 실행했다.

```bash
pnpm run build:packages
pnpm install                 # 비-frozen
```

CI 경로에서 이 둘은 **이미 끝나 있다.**
`ci-pipeline.yml` 의 build job 은 `./.github/actions/setup-build-env` 를
`strict-lockfile: 'true'` 로 호출하고, 이 composite action 이
`pnpm install --frozen-lockfile` 과 `pnpm run build:packages` 를 모두 수행한다.
그 뒤 dist 검증 스텝을 거쳐서야 `ci-build-app.sh` 가 호출된다.

즉 CI 에서 스크립트의 install 은 **중복이며, 비-frozen 이라 유해**하다.
해당 줄의 주석은 "Reinstalling to pick up updated package.json" 이었으나
`build:packages` 는 `package.json` 을 변경하지 않으므로 근거가 이미 낡았다.

한편 `scripts/README.md` 가 이 스크립트의 단독 실행을 안내하므로,
install 자체를 삭제하면 clean clone 에서의 단독 실행이 깨진다.

**채택한 최소 수정: `pnpm install` → `pnpm install --frozen-lockfile`.**

- 단독 실행 지원은 유지된다.
- lockfile 은 어떤 경로로도 갱신되지 않는다.
- lockfile 이 어긋나면 우회하지 않고 **즉시 실패**한다.
- `--no-frozen-lockfile` 은 사용하지 않았다 (WO 금지 항목).

`build:packages` 중복은 실행이 성립하고 lockfile 을 오염시키지 않으므로 이번 범위에서 손대지 않았다 (§10-1).

---

## 7. 수정 파일 · lockfile 변경의 정확한 범위

| 파일 | 변경 |
|---|---|
| `scripts/ci-build-app.sh` | install 계약 1줄 변경 + 근거 주석 |
| `pnpm-lock.yaml` | `services/web-glycopharm` importer 블록 **139줄 삭제만** |
| `apps/api-server/src/__tests__/ci-install-lockfile-contract.spec.ts` | 신규 회귀 가드 |
| `docs/checks/CHECK-O4O-CI-INSTALL-LOCKFILE-DRIFT-REPRODUCIBILITY-CLOSURE-V1.md` | 본 문서 |

lockfile 변경은 **삭제 139줄 / 추가 0줄**이다.
`ts-jest` 스냅샷을 포함해 다른 어떤 줄도 변경하지 않았다.
dependency 추가·삭제·버전 변경은 0건이고, resolution 도 바뀌지 않았다.

---

## 8. 회귀 가드

`apps/api-server/src/__tests__/ci-install-lockfile-contract.spec.ts` — **정적 계약 검사** 5 단언.
실제 install · build 는 비용이 크므로 가드 안에서 실행하지 않고, WO 검증 절차(§9)에서 별도 실행 검증으로 분리했다.

| # | 단언 |
|---|---|
| 0 | 검사 대상 파일을 실제로 읽는다 (self-check) |
| 1 | `ci-build-app.sh` 의 모든 `pnpm install` 이 `--frozen-lockfile` 이다 |
| 2 | `--no-frozen-lockfile` 로 우회하지 않는다 |
| 3 | lockfile 의 모든 importer 가 실재하는 워크스페이스 package 다 (`package.json` 존재) |
| 4 | 저장소 지정 pnpm(`volta.pnpm`)과 CI `setup-build-env` 의 `pnpm-version` 기본값이 일치한다 |

주석(`#`)을 제거한 실행 라인만 모집단으로 삼아, 문서용 예시가 오탐을 만들지 않게 했다.

**실효성 검증 (negative test)**: ① install 을 비-frozen 으로 되돌리고
② 존재하지 않는 importer 를 lockfile 에 재삽입한 상태에서 단언 1 · 3 이 실패한다
(`Tests: 2 failed, 3 passed`). 주입분 복원 후 5/5 PASS 복귀를 확인했다.

"CI build script 실행 후 tracked diff 0" 은 정적으로 단언할 수 없으므로 §9 V3 의 실행 검증으로 분리했다.

---

## 9. build · type-check · test 결과 / 실행 전후 tracked diff

| # | 검증 | 결과 |
|---|---|---|
| V1 | `pnpm install --frozen-lockfile` | **PASS** — 이번 139줄 삭제 외 추가 변화 0 |
| V2 | 동일 pnpm 버전 비-frozen install ×2 | **추가 diff 0 / 0** — 수정 후 상태가 안정 고정점 |
| V3 | `bash scripts/ci-build-app.sh admin-dashboard` | **PASS** (`✅ Build completed successfully!`) |
| V3 | 실행 전후 새로 더러워진 tracked 파일 | **0건** |
| V3 | 실행 전후 `pnpm-lock.yaml` diff | **0** |
| V4 | `pnpm run build:packages` | **PASS** |
| V5 | `apps/api-server` type-check | **PASS** |
| V6 | 본 WO 회귀 가드 | **PASS** (5/5) |
| V7 | dependency 변경 | **0** |
| V8 | 불필요한 lockfile churn | **0** (삭제 139줄만) |

수정 전에는 V3 가 `pnpm-lock.yaml` 을 더럽혔고, 수정 후에는 0건이다. 이것이 본 WO 의 핵심 결과다.

### 범위 밖 기존 실패 (본 변경과 무관)

로컬 전체 jest 실행 시 다음 2개 suite 가 실패한다.

```text
apps/api-server/src/__tests__/legacy-wordpress-block-editor-retirement.spec.ts
apps/api-server/src/__tests__/shortcode-domain-retirement.spec.ts
```

원인은 `packages/block-core` 와 `packages/cosmetics-seller-extension` 디렉터리가
**git 추적 파일 0건인 채로 로컬에만 남아 있기 때문**이다(`dist/`·`node_modules/` 잔재).
`services/web-glycopharm` 과 같은 종류의 로컬 잔재이며, clean clone 인 CI 에서는 재현되지 않는다.
본 WO 의 변경 이전에도 동일하게 실패했고, 로컬 디렉터리 삭제는 금지 범위이므로 손대지 않았다(§10-3).

---

## 10. 후속 후보 (이번 범위 미포함)

1. **`ci-build-app.sh` 의 `build:packages` 중복** — CI 에서는 `setup-build-env` 가 이미 수행한다.
   실행이 성립하고 lockfile 을 오염시키지 않으므로 install 계약 정정과 분리했다.
2. **`packageManager` 필드 부재** — pnpm 고정이 `volta.pnpm` 과 CI action 기본값 2곳으로 나뉜다.
   corepack 기준 단일화는 별도 WO 대상. 이번에는 가드로 불일치만 차단해 두었다.
3. **로컬 잔여 디렉터리** — `services/web-glycopharm`, `packages/block-core`,
   `packages/cosmetics-seller-extension` 은 git 추적 파일 0건인데 `dist/`·`node_modules/` 가 남아 있다.
   로컬 디렉터리 삭제는 본 WO 금지 범위이며 clean CI 에서는 재현되지 않는다.
4. **배포 경로의 install fallback** — `setup-build-env` 의 `strict-lockfile` 기본값 경로는 여전히
   `pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile` 로 우회한다.
   이번 stale importer 정리로 fallback 이 발동할 이유는 사라졌으나, 계약 자체의 정비는 별도 WO 대상.

---

## 11. 최종 판정

**`CLOSED`**

| 완료 조건 | 값 |
|---|---|
| `CI_BUILD_NON_FROZEN_INSTALL` | 0 |
| `CI_BUILD_LOCKFILE_DRIFT` | 0 |
| `CI_BUILD_TRACKED_FILE_DRIFT` | 0 |
| `STALE_WORKSPACE_IMPORTER` | 0 |
| `UNEXPLAINED_PEER_SNAPSHOT_DRIFT` | 0 |
| `FROZEN_INSTALL` | PASS |
| `BUILD` | PASS |
| `TYPECHECK` | PASS |
| `DEPENDENCY_INTENT_CHANGE` | 0 |
| `UNRELATED_CHANGE` | 0 |
