# CHECK-O4O-DOCS-ONLY-CI-SECURITY-FAST-PATH-AND-PUSH-CONCURRENCY-PRESERVATION-V1

문서-only 변경의 CI · CodeQL fast path · main push 검증 보존 — `detect-affected.mjs` SSOT 확장

- 작업 branch: `main` (직접 작업)
- 작업일: 2026-09-23
- 실행 commit: `6d1942b8e`
- 선행 정본: [`CHECK-O4O-ADMIN-CI-CD-AFFECTED-SCOPE-AND-DUPLICATE-WORK-REDUCTION-V1`](CHECK-O4O-ADMIN-CI-CD-AFFECTED-SCOPE-AND-DUPLICATE-WORK-REDUCTION-V1.md)

---

## 1. 수정 전 실측 baseline (§26-12 전반부)

| 구간 | commit | 실측 wall-clock | run id |
|---|---|---|---|
| 문서 1 파일 수정의 CI Pipeline | `63c36e11e` | **849s = 14분 09초** | 35735637972 |
| 같은 commit 의 CodeQL Analyze | `63c36e11e` | **452s = 7분 32초** | 35735638130 |
| 뒤따르는 push 에 취소된 CI Pipeline | `619c51a4f` | cancelled (4분 06초 지점) | 35735289127 |
| 뒤따르는 push 에 취소된 CodeQL | `619c51a4f` | cancelled | 35735289317 |

`63c36e11e` 의 실제 변경은 `docs/baseline/O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0.md` **1 파일**이다.
CodeQL 분석 대상은 `apps/api-server/src` 뿐이라 이 commit 에서 분석 대상 소스는 한 줄도 바뀌지 않았다.

취소 문제는 **문서/CHECK commit 이 앞선 코드 commit 의 full CI 를 죽이는** 형태였다 —
가장 검증이 필요한 쪽(코드)이 가장 덜 필요한 쪽(문서) 때문에 사라진다.

---

## 2. 문서를 실제로 소비하는 test 전수 조사 (§9 · §10 · §26-1)

`apps/api-server/src` 전체를 재귀 조사했다(top-level `__tests__` 만이 아니다).
`docs/<area>` 이상의 경로 문자열을 포함하는 spec/test 는 **12 건**이다.

| 분류 | spec | 소비 형태 |
|---|---|---|
| A. 기록물 보존 guard | `src/__tests__/archive-retention-and-tracked-backup-disposition.spec.ts` | `docs/archive` · `docs/checks` 폴더를 fs 로 훑고 문서 수·이동 규칙 단언 |
| A | `src/__tests__/database-migration-ownership-startup-health-final-closure.spec.ts` | 정본 문서 존재·본문 문자열 단언 |
| A | `src/__tests__/store-handled-products-dedupe.spec.ts` | 정본 문서 본문 단언 |
| A | `src/__tests__/wordpress-compat-field-and-theme-final-disposition.spec.ts` | 정본 문서 본문 단언 |
| A | `src/__tests__/channels-stack-retirement.spec.ts` | `docs/baseline/...` 문서 존재 단언 |
| A | `src/__tests__/b2b-buyer-order-read-core-contract.spec.ts` | baseline 계약 문서 본문 단언 |
| A | `src/__tests__/b2b-supplier-to-store-order-canonical-contract.spec.ts` | baseline 계약 문서 본문 단언 |
| A | `src/__tests__/ecommerce-core-and-commerce-residue-retirement.spec.ts` | baseline · WO 문서 단언 |
| A | `src/__tests__/legacy-partner-runtime-retirement.spec.ts` | baseline 문서 단언 |
| A | `src/__tests__/pharmacy-hub-member-model-contract.spec.ts` | baseline 문서 단언 |
| B. nested (top-level 조사로는 누락) | `src/modules/content-guard/__tests__/liquid-guard.test.ts` | `docs/checks/data/**` JSON fixture 를 읽는다 |
| C. 문자열 인자 · 제외 목록 용도 | `src/__tests__/cross-session-safe-commit-guard.spec.ts` | 스크립트에 `docs/...` 를 인자로 넘기는 형태(실 fs read 아님) — **그래도 선별 대상에 포함한다** |

- 분류 C 와, 주석에만 `docs/` 가 등장하는 spec(분류 D)은 **false positive 를 허용**하는 쪽으로 처리했다.
  선별기는 needle 문자열 매칭이며 `docs` 단독이 아니라 **`docs/<area>` 이상 + 변경 파일 전체 경로**를 본다.
- 판정 원칙: **false positive 허용 · false negative 불가**. 선별 실패는 곧 guard 유실이다.

---

## 3. Markdown 과 데이터 자산의 경계 (§6 · §22 · §26-2)

V1 fast path 는 **Markdown 문서의 추가(A) · 수정(M)** 만이다.

| 대상 | 판정 | 근거 |
|---|---|---|
| `docs/**/*.md` (A · M) | **docs fast** | 사람이 읽는 문서. 런타임·빌드 산출물에 들어가지 않는다 |
| `docs/**` 의 `.json` `.jsonl` `.csv` `.tsv` `.yaml` `.yml` `.xlsx` 등 | full path | 생산 대상 선정·rollback manifest·번역 등 **데이터 자산**. guard test 가 fs 로 읽는다 |
| 경로에 `data/` · `fixtures/` · `translations/` 세그먼트가 있으면 `.md` 라도 | full path | `docs/checks/data/**` 는 문서가 아니라 fixture 저장소다 |
| 문서 삭제(D) · 이동(R) | full path (global fallback) | 기록물 존재·문서 수를 단언하는 정적 spec 이 깨질 수 있다 |
| 문서 + 코드(`apps/**` `packages/**` `services/**` `scripts/**` `.github/**` root manifest) 혼합 | 기존 full/affected 경로 | §5-1 |
| 판정 불가(base SHA 이상 · diff 실패 · force push · shallow · 매핑 불가) | full path | §5-2 — false negative 대신 불필요한 full CI 한 번 |

---

## 4. 판정기 변경 (§8 · §26-3)

SSOT 는 그대로 `scripts/ci/detect-affected.mjs` 하나다. **새 판정 체계를 만들지 않았다.**

| 추가 | 내용 |
|---|---|
| `classifyDocs(changedFiles)` | `docs_only` · `docs_fast_eligible` · 사유 문자열 산출 |
| `classify()` 반환값 | `docs_only` · `docs_fast_eligible` 2 key 추가 (global fallback 경로에서는 fast 항상 false) |
| `selectDocsConsumerSpecs(changedFiles)` | `apps/api-server/src` 재귀 조사 후 변경 문서를 문자열로 참조하는 spec 선별 |
| CLI `--mode=docs-specs` | 선별 결과를 공백 구분으로 출력(읽기 실패 시 빈 줄 → 상위에서 안전 분기) |
| `GITHUB_OUTPUT` | `docs_only=` · `docs_fast_eligible=` 2 줄 추가 |

Admin 축 선별기 `selectPathGuardSpecs` 의 **조사 범위는 건드리지 않았다** — Admin fast path 기준선을 흔들지 않기 위해 docs 축은 별도 선별기로 추가했다(§23).

---

## 5. 회귀 시험 (§19 · §26-4)

`scripts/ci/__tests__/detect-affected.test.mjs` — 기존 12 건 **전부 유지**, Case D1~D10 및 선별·workflow 계약 시험 추가.

| Case | 내용 | 결과 |
|---|---|---|
| D1 | CHECK 문서 1건 수정 → docs fast | PASS |
| D2 | baseline 수정 + WO 추가 → docs fast | PASS |
| D3 | `docs/checks/data/**.json` · `translations/*.json` · `data/*.md` · `.yml` · `.csv` → fast 아님 | PASS |
| D4 | 문서 삭제 → full fallback | PASS |
| D5 | 문서 rename → full fallback | PASS |
| D6 | 문서 + API 코드 혼합 → `docs_only=false`, api 경로 | PASS |
| D6-b | 문서 + `scripts/` · `.github/` · root manifest 혼합 → global fallback | PASS |
| D7 | multi-commit push — 앞 commit 이 코드면 fast 아님(실제 git repo) | PASS |
| D8 | multi-commit push — 전부 문서면 fast | PASS |
| D9 | 판정 불가 입력 → fast 아님 | PASS |
| D10 | scheduled · `workflow_dispatch` CodeQL 은 항상 Analyze (YAML 계약) | PASS |
| 선별 | `docs/checks/*.md` → nested `content-guard/liquid-guard.test.ts` 포함 선별 / 비문서 변경 → `[]` | PASS |
| §17 | 두 workflow 의 `cancel-in-progress` 가 PR 한정 | PASS |

`node --test scripts/ci/__tests__/detect-affected.test.mjs` → **26/26 PASS** (로컬 · CI 양쪽).

---

## 6. CI Pipeline 조건 — 전 / 후 (§26-5)

| job | 전 | 후 |
|---|---|---|
| `detect` | 항상 | 항상 (출력 2건 추가) |
| `quality-check` | `admin_only != 'true'` | `admin_only != 'true' && docs_fast_eligible != 'true'` |
| `api-tests` | `admin_only != 'true'` | `admin_only != 'true' && docs_fast_eligible != 'true'` |
| `build` | `admin_only != 'true'` | `admin_only != 'true' && docs_fast_eligible != 'true'` |
| `admin-fast-*` | `admin_only == 'true'` | 변경 없음 |
| `docs-fast-validate` | 없음 | **신설** — `docs_fast_eligible == 'true'` |

`docs-fast-validate` 가 실제로 하는 일:

1. `node --test scripts/ci/__tests__/detect-affected.test.mjs` — 판정기 회귀를 docs 경로에서도 blocking 으로 막는다
2. 판정 재확인 후 `--mode=docs-specs` 로 **변경 문서를 읽는 api-server test 만 선별**해 `npx jest --maxWorkers=1 <specs>` 실행
3. 판정이 재현되지 않으면 전체 suite 로 되돌린다 / 선별 0건이면 아무 것도 실행하지 않는다(빈 인자를 jest 에 넘기면 전체가 도는 함정 회피)

저장소 전체 `build:packages` · Admin Vite build · API 전체 build 는 하지 않는다.
**테스트를 지우거나 blocking gate 를 약화한 곳은 없다.**

---

## 7. CodeQL — 전 / 후 (§15 · §16 · §26-6 · §26-11)

| 항목 | 전 | 후 |
|---|---|---|
| workflow 존재 | 있음 | **그대로 있음** (`paths-ignore` 로 없애지 않았다 — required check · 상태 보고 보존) |
| `detect` job | 없음 | 신설, **항상 실행** (가벼운 checkout + node 1회) |
| `Analyze` | 항상 | `schedule` \|\| `workflow_dispatch` \|\| `docs_fast_eligible != 'true'` |
| `schedule` (`cron: '30 5 * * 1'`) | 매주 | **변경 없음 — 판정과 무관하게 항상 full Analyze** |
| `workflow_dispatch` | 없음 | 추가. 수동 실행은 항상 full Analyze |

scheduled 실행을 보존하는 이유: 주간 스캔은 **변경분 분석이 아니라 시점 전수 검사**다.
같은 코드라도 CodeQL 질의 DB 가 갱신되면 새 결과가 나온다 — 변경 판정으로 건너뛰면 그 축이 사라진다.

---

## 8. concurrency — 전 / 후 (§17 · §18 · §26-7)

| workflow | 전 | 후 |
|---|---|---|
| `ci-pipeline.yml` | `cancel-in-progress: true` | `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` |
| `ci-security.yml` | `cancel-in-progress: true` | `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` |
| deploy workflow | — | **범위 밖 · 변경 없음** (§18) |

PR 은 새 revision 이 오면 이전 검사가 obsolete 이므로 취소를 유지한다.
main/develop push 는 각 commit 의 검증을 끝까지 남긴다 — 문서 push 가 코드 push 의 CI 를 죽이지 않는다.

---

## 9. 실제 GitHub Actions 검증 (§20 · §26-8 · §26-9 · §26-10)

전부 `main` tip(`6d1942b8e`) 기준 실행이다. B~E 는 `workflow_dispatch` 의 `base_sha`/`head_sha` 입력으로
**과거 실제 commit 의 변경 집합**을 재현했다.

| 시나리오 | 대상 변경 | run id | 판정 | 실행된 job | 결과 |
|---|---|---|---|---|---|
| 코드 push (기존 경로 비회귀) | 본 WO commit `6d1942b8e` (`scripts/` + `.github/`) | 35801247672 | `global_or_unknown=true` | quality-check · api-tests · build | **success** (docs fast skipped) |
| 같은 commit 의 CodeQL | `6d1942b8e` | 35801247529 | — | detect + **Analyze 실행** | success |
| B. baseline 문서 1건 (`63c36e11e`) | `docs/baseline/...md` M | **35802158968** | `docs_only=true` · `docs_fast_eligible=true` | **docs-fast-validate 만** | **success · 1분 44초** |
| C. 문서 + `docs/checks/data/**` JSON (`da8e05b42`) | md 1 + json 2 | 35802348990 | `docs_only=true` · **`fast=false`** | quality-check · api-tests (full 경로 진입 확인 후 수동 취소) | 판정 확인 |
| D. 문서 + API 코드 (`9414d54d9`) | md 1 + `apps/api-server/src` 1 | 35802515161 | `docs_only=false` · `api_affected=true` | quality-check · api-tests (진입 확인 후 수동 취소) | 판정 확인 |
| E. 문서 삭제 2 + 수정 1 (`dc9fe66ba`) | md D 2 · M 1 | 35802681073 | `docs_only=true` · `fast=false` · `global=true` | quality-check · api-tests (진입 확인 후 수동 취소) | 판정 확인 |
| Admin fast path 비회귀 (`1e69ef257`) | Admin src 1 + 문서 2 | 35802837666 | `admin_only=true` | admin-fast-* 2건만 | **success · 3분 02초** |

- C · D · E 는 **full 경로로 들어간 사실**(heavy job 이 skipped 가 아니라 실제 시작)까지 확인한 뒤
  runner 시간 절약을 위해 수동 취소했다. 전체 완주까지 돌리지 않았음을 그대로 적는다.
- 처음 dispatch 한 run 35802106798 은 head SHA 를 잘못 입력해 판정 불가로 떨어진 것이며,
  **판정 불가 → full CI** 동작만 확인하고 취소했다.

### 시나리오 B 의 docs-fast-validate 실측 로그

```
docs_fast_eligible(재확인): true
선별된 docs consumer test: src/__tests__/b2b-buyer-order-read-core-contract.spec.ts
  src/__tests__/b2b-supplier-to-store-order-canonical-contract.spec.ts
  src/__tests__/channels-stack-retirement.spec.ts
  src/__tests__/ecommerce-core-and-commerce-residue-retirement.spec.ts
  src/__tests__/legacy-partner-runtime-retirement.spec.ts
  src/__tests__/pharmacy-hub-member-model-contract.spec.ts
Test Suites: 6 passed, 6 total
Tests:       178 passed, 178 total
```

판정기 회귀 시험도 같은 job 에서 `# pass 26` 으로 통과했다.

### 시나리오 C · E 의 판정 사유(원문)

```
C: Markdown 이 아닌 문서 경로 자산 — docs fast 아님:
   docs/checks/data/product-description-guard/hff-liquid-a-shard0/liq-shard0-a1-target.json
E: 문서 삭제/이동(D) — 기록물 존재를 단언하는 정적 spec 때문에 중립 아님:
   docs/work-orders/WO-O4O-AUTOMATION-RECOVERY-COST-AWARE-POLICY-V1.md
```

---

## 10. 전 / 후 wall-clock (§21 · §26-12)

| 변경 유형 | 전 | 후 | 근거 run |
|---|---|---|---|
| 문서 Markdown 1건 — CI Pipeline | 14분 09초 | **1분 44초** | 35735637972 → 35802158968 |
| 문서 Markdown 1건 — CodeQL Analyze | 7분 32초 | **skip** (detect 만 ≈ 25초) | 35735638130 → 본 문서 §11 |
| Admin-only 변경 | 2분 57초 | 3분 02초 (동급 · 회귀 없음) | 35698331635 계열 → 35802837666 |
| 코드 변경 | 변화 없음 | 변화 없음 | 35801247672 success |

§21 목표(문서 변경 3분 이내)를 만족한다.

### 완료 기준 실측 (§21)

| 기준 | 결과 |
|---|---|
| docs fast 경로에서 API 전체 Jest | **0회** (`API Server Jest` skipped) |
| docs fast 경로에서 Admin build | **0회** (`Admin Fast — validate & build` skipped) |
| docs fast 경로에서 저장소 전체 package build | **0회** (`build-packages: 'false'`) |
| docs fast 경로에서 CodeQL heavy Analyze | **0회** |
| 문서 소비 guard 보존 | **보존** — 선별 6 suites / 178 tests 실행 |

---

## 11. Admin fast path 비회귀 (§23 · §26-13)

run 35802837666 (`1e69ef257` 재현) — `admin_only=true`, `docs-fast-validate` 는 skipped,
`Admin Fast — repo static guards` · `Admin Fast — validate & build` 만 실행, **3분 02초 success**.
Admin 축 선별기(`selectPathGuardSpecs`)와 그 시험 12건은 손대지 않았다.

---

## 12. 하지 않은 것 (§25)

- `deploy-web-services.yml` 의 `packages/** → 전 서비스 재배포` 정밀화 — 범위 밖(후속 WO 후보)
- API Jest 자체 성능 · `maxWorkers` 조정 · Admin CI 추가 최적화
- production 배포 · 대량 문서 정리 · production application source 수정 **0건**
- 테스트 삭제 · blocking gate 약화 **0건**

---

## 13. Git 상태

| 항목 | 값 |
|---|---|
| 구현 commit | `6d1942b8e` (판정기 · 시험 · workflow 2종) |
| 변경 파일 | `scripts/ci/detect-affected.mjs` · `scripts/ci/__tests__/detect-affected.test.mjs` · `.github/workflows/ci-pipeline.yml` · `.github/workflows/ci-security.yml` |
| 다른 세션 파일 | `packages/action-log-core/**` 삭제 7건 — **접촉하지 않음** |

---

*작성일: 2026-09-23*
*WO: WO-O4O-DOCS-ONLY-CI-SECURITY-FAST-PATH-AND-PUSH-CONCURRENCY-PRESERVATION-V1*
