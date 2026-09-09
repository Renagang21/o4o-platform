# CHECK-O4O-WINDOWS-PNPM-FILTER-NOOP-GUARD-CLOSURE-V1

- **대상 WO**: WO-O4O-WINDOWS-PNPM-FILTER-NOOP-GUARD-CLOSURE-V1
- **작업 브랜치**: `work/windows-pnpm-filter-noop-guard-v1` (기점 `origin/main` = `d2d72daf5`)
- **환경**: Windows 11 / pnpm 10.25.0 / Node 22 / 워크스페이스 패키지 70개
- **판정**: **CLOSED**

---

## 1. 결함 정의

`cmd.exe` 는 작은따옴표를 문자열 구분자로 취급하지 않는다. 따라서
`package.json` script 안의

```
pnpm --filter '@o4o/capabilities' run build
```

은 selector 가 `'@o4o/capabilities'` (따옴표 포함) 로 전달돼 어떤 패키지도 매칭하지 않는다.
pnpm 은 경고만 출력하고 **exit 0** 으로 끝난다.

```text
No projects matched the filters → exit 0 → 빌드 성공으로 오판 → 기존 stale dist 소비
```

이 결함은 WO-O4O-PLATFORM-CORE-BUILD-PACKAGES-REPRODUCIBILITY-V1 작업 중
루트 `build:api-deps` 를 CI 와 동일한 작은따옴표로 작성했다가 Windows 에서
아무것도 빌드되지 않은 것을 관측하면서 확인됐다.

---

## 2. 저장소 전수 census (수정 전 기준 · 필터 토큰 125개)

`--filter` 토큰을 실행 셸 기준으로 분류했다. markdown 문서 293줄은 DOCUMENTATION_ONLY 로 제외했다.

| 분류 | 토큰 | 인용부호 (single / double / none) | Windows 위험 | 처리 |
|---|---:|---|---|---|
| WINDOWS_PACKAGE_SCRIPT (`package.json` scripts) | 41 | 19 / 1 / 21 | **있음** — cmd.exe 실행 | 작은따옴표 19개 수정 |
| CI_YAML (`.github/workflows/*.yml`) | 21 | 19 / 0 / 2 | 없음 — POSIX bash runner | 미변경 |
| DOCKERFILE (서비스 이미지 7종) | 48 | 0 / 0 / 48 | 없음 — Linux 컨테이너 | 미변경 |
| POSIX_SHELL_ONLY (`*.sh`) | 5 | 0 / 1 / 4 | 없음 — bash | selector 1건만 보강 |
| TS_SOURCE (사용법 주석) | 10 | 0 / 0 / 10 | 없음 — 실행 코드 아님 | 미변경 |
| POWERSHELL_ONLY / `.cmd` / `.bat` | 0 | — | — | 사용처 없음 |
| FALSE_POSITIVE | 1 | — | — | `apps/api-server/deploy-cloudrun.sh:51` 의 `--filter status:ACTIVE` 는 gcloud 플래그 |

**핵심 원칙**: 기계적 일괄 따옴표 치환을 하지 않았다. cmd.exe 에서 동작해야 하는
`package.json` 만 고쳤고, 작은따옴표가 정상인 POSIX 전용 사용처(CI YAML 19건 포함)는 건드리지 않았다.

---

## 3. `--fail-if-no-match` 지원 확인

pnpm 10.25.0 에서 `pnpm run --help` 에 문서화돼 있으며, **`run` 앞의 pnpm 레벨 플래그**로 배치해야 한다.
Windows 실측 결과는 §5 참조 (무매칭 시 exit 0 → exit 1).

---

## 4. 수정 내역 (3파일 / 4줄)

| 파일 | 변경 |
|---|---|
| `apps/api-server/package.json` | `build:deps` 의 작은따옴표 필터 19개 → JSON 이스케이프 큰따옴표 + `--fail-if-no-match`. 사유 주석 1줄 추가 |
| `package.json` (루트) | `build:api-deps` 토폴로지 필터에 `--fail-if-no-match` 추가 (따옴표는 이미 정상) |
| `scripts/ci-build-app.sh` | L43 `@o4o/storefront` 케이스에 `--fail-if-no-match` 추가 (§7 참조) |

`apps/api-server/src/__tests__/windows-pnpm-filter-noop-guard.spec.ts` 신규 (§6).

의존성 · lockfile · 패키지 구조 · CI YAML 변경 0건.

---

## 5. Windows 실증 (필수 3항목)

`package.json` 에 임시 probe script 4개를 넣고 실제 `pnpm run` 으로 측정한 뒤 제거했다.
Git Bash 에서 호출해도 pnpm 은 win32 에서 `cmd.exe` 로 script 를 실행하므로 유효한 재현이다.

### 5-1. 유효 selector 가 Windows 에서 실제로 선택·실행된다 — **PASS**

| probe | 결과 | exit |
|---|---|---:|
| `--filter '@o4o/capabilities'` (작은따옴표) | `No projects matched the filters` — **아무것도 빌드 안 함** | **0** |
| `--filter "@o4o/capabilities"` (큰따옴표) | `> tsc -p tsconfig.json` 실제 실행 | 0 |

### 5-2. 존재하지 않는 selector 가 성공으로 끝나지 않는다 — **PASS**

| probe | 결과 | exit |
|---|---|---:|
| `--filter "@o4o/definitely-not-a-package"` | `No projects matched the filters` | **0** (결함) |
| `--fail-if-no-match --filter "@o4o/definitely-not-a-package"` | `No projects matched the filters` | **1** (수정 후 계약) |

### 5-3. stale dist 의존성 없음 — **PASS**

무관한 디렉터리를 지우지 않고, 대상 패키지의 정확한 `dist` · `tsconfig.tsbuildinfo` 만
세션 scratchpad 로 이동한 뒤 재빌드했다.

이동: `packages/capabilities`, `packages/payment-core`, `packages/action-log-core` 의 `dist` + `tsconfig.tsbuildinfo`

```
pnpm run build:deps   (apps/api-server)   → EXIT 0 · 20개 패키지 실제 실행
packages/capabilities/dist     entries 12  (재생성)
packages/payment-core/dist     entries  7  (재생성)
packages/action-log-core/dist  entries 20  (재생성)
```

수정 전 같은 조건이었다면 19개 필터가 전부 무매칭으로 exit 0 을 반환해
`dist` 가 없는 채로 "빌드 성공" 이 된다.

---

## 6. 회귀 가드

`apps/api-server/src/__tests__/windows-pnpm-filter-noop-guard.spec.ts` (raw-source · DB/네트워크 0).

하드코딩 문자열 1개를 보는 가드가 아니라 **census 방식**이다. `pnpm-workspace.yaml` 과 같은
디렉터리 축으로 워크스페이스 `package.json` 을 모두 읽고 `scripts` 안의 모든 `--filter` 를 수집한다.
CI YAML · Dockerfile · `*.sh` · markdown 은 모집단에 넣지 않아 POSIX 정상 사용처를 오탐하지 않는다.

| # | 단언 |
|---|---|
| 0 | census 모집단 자체 검증 (워크스페이스 패키지 > 50, `@o4o/api-server` 포함, filter 사용처 > 10) |
| 1 | `package.json` script 의 `--filter` selector 에 작은따옴표 0건 |
| 2 | 이름 selector 가 실재하는 워크스페이스 패키지를 가리킴 (토폴로지 `^...` / 경로 glob 정규화 후) |
| 3 | 루트 `build:api-deps` 와 api-server `build:deps` 의 모든 필터 단계가 `--fail-if-no-match` 사용 |

**역검증**: 임시로 `--filter '@o4o/ui'` (작은따옴표) 와 `--filter "@o4o/storefront"` (미존재)
2건을 넣자 단언 1·2 가 정확히 그 2건을 지목하며 실패했다. 되돌린 뒤 4/4 PASS.

---

## 7. 별도 발견 — `scripts/ci-build-app.sh` 의 `@o4o/storefront`

- L43 `"storefront")` 케이스가 워크스페이스에 **존재하지 않는** `@o4o/storefront` 를 필터한다
  (L39·L65 는 유효한 `@o4o/admin-dashboard`).
- 유일한 호출처는 `.github/workflows/ci-pipeline.yml:262` 이며 matrix 는 `app: [admin-dashboard]`
  뿐이라 **현재 도달하지 않는 경로**다.
- POSIX 셸이므로 인용부호 문제는 없다. 대체할 실재 패키지가 없으므로 selector 를 임의로
  바꾸거나 케이스를 삭제하지 않았다(범위 외 정리 금지). 대신 `--fail-if-no-match` 를 붙여
  향후 호출되면 조용히 통과하지 않고 실패하도록만 보강했다.
- 케이스 자체의 존치/삭제 판단은 별도 WO 로 분리 권고.

---

## 8. 검증 결과

| 항목 | 명령 | 결과 |
|---|---|---|
| 설치 | `pnpm install --frozen-lockfile` | PASS |
| 루트 패키지 빌드 | `pnpm run build:packages` | **EXIT 0** |
| api-server 의존 빌드 | `pnpm run build:deps` (apps/api-server) | **EXIT 0** · 20 패키지 실행 |
| api-server 타입체크 | `pnpm run type-check` | **EXIT 0** · `error TS` 0건 |
| 신규 회귀 가드 | `npx jest windows-pnpm-filter-noop-guard` | **4/4 PASS** |
| 전체 테스트 | `npx jest` (apps/api-server) | 3,788 PASS / 2 FAIL (§9 기존 실패) |
| lockfile | `git status` | 변경 0 |
| dependency | `git diff` | 변경 0 |

---

## 9. 이번 WO 와 무관한 기존 로컬 실패 2건

| suite | 원인 |
|---|---|
| `legacy-wordpress-block-editor-retirement.spec.ts` | `packages/block-core` 가 존재하지 않아야 한다고 단언 |
| `shortcode-domain-retirement.spec.ts` | `packages/cosmetics-seller-extension` 가 존재하지 않아야 한다고 단언 |

두 디렉터리는 **git 추적 파일 0개**이며 무시 대상 `dist/` · `node_modules/` · `tsconfig.tsbuildinfo`
만 남은 로컬 잔재다. clean 체크아웃(CI)에서는 재현되지 않는다.
본 WO 는 로컬 orphan 디렉터리 삭제를 금지하므로 손대지 않고 별도 보고한다.

---

## 10. 완료 조건 대비

| 지표 | 목표 | 실측 |
|---|---|---|
| `ACTIVE_WINDOWS_FILTER_QUOTING_DEFECT` | 0 | **0** (PACKAGE_SCRIPT single 19 → 0) |
| `REQUIRED_FILTER_SILENT_NOOP` | 0 | **0** |
| `WINDOWS_SCRIPT_EXECUTION` | PASS | **PASS** (§5-1) |
| `MISSING_SELECTOR_FAILURE` | PASS | **PASS** (§5-2) |
| `STALE_DIST_DEPENDENCY` | 0 | **0** (§5-3) |
| `LOCKFILE_CHANGE` | 0 | **0** |
| `DEPENDENCY_CHANGE` | 0 | **0** |
| `UNRELATED_CHANGE` | 0 | **0** |

---

## 11. 제외 범위 (손대지 않음)

로컬 `packages/block-core` · `packages/cosmetics-seller-extension` 잔재 / ops-metrics 재설계 /
Channel 스키마 / Cafe24 / dependency 구조 개편 / monorepo 빌드 재설계 /
CI YAML · Dockerfile 의 POSIX 인용부호 / `scratchpad/`

---

## 12. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (§7 `@o4o/storefront` 케이스 존치 판단)
