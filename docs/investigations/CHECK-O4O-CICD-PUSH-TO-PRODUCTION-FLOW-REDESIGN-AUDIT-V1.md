# CHECK-O4O-CICD-PUSH-TO-PRODUCTION-FLOW-REDESIGN-AUDIT-V1

> **WO**: WO-O4O-CICD-PUSH-TO-PRODUCTION-FLOW-REDESIGN-AUDIT-V1
> **성격**: AUDIT + ARCHITECTURE REDESIGN (조사 · 설계 전용 — workflow · 변수 · 배포 · DB 변경 0)
> **기준**: `origin/main` `17e77c9c2` (2026-10-01) · GitHub Actions 실행 이력 read-only 조회
> **선행 문서**: [CHECK-O4O-CICD-PRODUCTION-DEPLOY-CENSUS-AND-SIMPLIFICATION-V1](CHECK-O4O-CICD-PRODUCTION-DEPLOY-CENSUS-AND-SIMPLIFICATION-V1.md) · [CHECK-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1](../checks/CHECK-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1.md)

---

## 0. 결론 요약

| 완료 기준 | 판정 |
|---|---|
| CURRENT_PIPELINE_CENSUS | **PASS** (§1 · §2 · §3) |
| PUSH_DEPLOY_GAP_IDENTIFIED | **PASS** (§4) |
| WORKFLOW_SIMPLIFICATION | **PROPOSED** (§11 · §13) |
| TAG_NECESSITY | **DECIDED — 자동 경로에서 불필요 (workflow_dispatch 를 쓰기 때문에 생긴 우회 장치)** (§5) |
| DISPATCH_NECESSITY | **DECIDED — 자동 경로에서 제거, 수동 경로(승인 · break-glass)에만 남긴다** (§6) |
| BUILD_ONCE_STRATEGY | **DECIDED — 2단계로 Artifact Promotion (Option C), 1단계는 B** (§8) |
| LEVEL3_APPROVAL_MODEL | **DECIDED — `promote` 한 번 (SHA 하나 · 서비스 자동 산출)** (§7) |
| TARGET_ARCHITECTURE | **DECIDED — Option B (Unified Delivery) → Option C (Artifact Promotion)** (§12 · §13) |
| PRODUCTION_CHANGE | **0** |

**한 문장 결론**: 현재 구조는 **안전 판정은 맞게 하지만, 판정 이후의 "전달"을 수동 실행용 primitive(workflow_dispatch + 태그 + run 폴링)로 이어 붙여 놓았고, 그래서 자동 경로가 한 번도 실제로 배포하지 못했으며 사람이 하는 LEVEL_3 경로가 사실상 유일한 배포 경로가 되었다.** 판정 로직(scripts/ci)은 그대로 두고, 전달을 `workflow_call` 기반 단일 Delivery run 으로 바꾸고, LEVEL_3 승인을 "SHA 하나로 promote" 로 줄이면 목표 경험(push → 끝 / 위험 변경은 승인 1회)에 도달한다.

핵심 실측 (2026-09-28 ~ 10-01):

| 항목 | 값 |
|---|---|
| cutover(`f505e661d`, 09-30 17:0xZ) 이후 Deploy Auto 실행 | **30회** |
| 그중 자동 배포 dispatch | **0회** (`deploy/auto-*` 태그 **0개**) |
| 그중 GitHub API 소켓 오류로 run 자체 실패 | 14회 (`ac601b0d7` 에서 수정) |
| 같은 기간 사람이 만든 통제 배포 태그 | `deploy/2026-09-30-*` 2 · `deploy/2026-10-01-*` 4 → API 4회 · Web 5회 수동 dispatch |
| main first-parent commit (09-28 이후) | 68 — **LEVEL_1 48 (71%) · LEVEL_2 8 (12%) · LEVEL_3 12 (18%)** |
| runtime 변경(L2+L3) 중 LEVEL_3 비율 | **12/20 = 60%** |
| main push CI (09-28 이후 90회) | success 86 · p50 **6분** · max 21.5분 · cancelled 2 |
| 수동 배포 run 소요 | API 6~7분 · Web 서비스 1개 4~5분 |
| 현재 `DEPLOY_FREEZE` | **`true`** (2026-10-01 12:47Z 설정 — 이 WO 와 무관, 변경하지 않음) |

---

## 1. 현재 Push → Production 실제 흐름 (census)

### 1-1. 정상 변경 (LEVEL_2) — 설계상 경로

```text
git push main  (또는 PR merge → main)
 │
 ├─ CI Pipeline (ci-pipeline.yml · on: push main/develop · PR)          ── run #1
 │    detect → quality-check · api-tests(3 shard) · build(admin) | admin-fast | docs-fast
 │
 ├─ CodeQL (ci-security.yml · advisory)                                 ── run #2 (게이트 아님)
 │
 └─ [CI completed] ─ workflow_run ─▶ Deploy Auto (deploy-auto.yml)      ── run #3
        node scripts/ci/deploy-orchestrate.mjs --target <workflow_run.head_sha>
          ├─ ci-gate.mjs pollCiGate(target)            (CI 결과를 API 로 다시 조회)
          ├─ isFrozen(DEPLOY_FREEZE)
          ├─ GET heads/main == target ?                (아니면 SUPERSEDED)
          ├─ collectServingState()  gcloud read-only   (11 서비스 serving SHA)
          ├─ assessServingGap()  serving..target diff  → LEVEL / rollout_pending
          ├─ decideAll()  + API 의존 규칙
          └─ executeDecisions()
               ├─ POST git/refs  deploy/auto-<sha12>   (태그 생성)
               ├─ POST workflows/deploy-api.yml/dispatches  ref=태그 rollout_mode=verified
               ├─ 10초×12 폴링으로 run id 탐색 → 30초 간격 status 폴링 (최대 45분)
               └─ API success 후 web 서비스마다 deploy-web-services.yml dispatch (service=<key>) · admin dispatch
                         │
                         ▼
     Deploy API (deploy-api.yml)                                         ── run #4
       freeze-notice | detect (dispatch 라 base 없음 → 안전 fallback = affected=true)
       → ci-gate (CI 를 **또** 조회, wait 1800s) → build-and-deploy:
         tsc+tsup → docker buildx → AR push → migration Job 실행 → Cloud Run deploy --no-traffic
         → readiness smoke → traffic switch → LB /health/ready 검증 → 실패 시 rollback
     Deploy Web (deploy-web-services.yml, 서비스마다 run 1개)               ── run #5..N
       freeze-notice | detect-changes (service 입력) → ci-gate (또) → deploy-<svc>:
         docker build(vite build 포함) → GCR push → deploy --no-traffic --tag sha-<12>
         → cloud-run-verified-rollout(finish): tag URL smoke → switch → (neture 만) 공개 URL+serving SHA 검증 → 실패 시 rollback
     Deploy Admin (deploy-admin.yml)                                      ── run #N+1
       detect → ci-gate (또) → vite build(runner) → docker build → deploy → verified rollout
```

**단계 수 (L2, API+web 1개 기준)**: workflow run **5개** (CI · CodeQL · Deploy Auto · Deploy API · Deploy Web) · GitHub REST 호출로 이어지는 경계 **4곳**(workflow_run · 태그 생성 · dispatch × 2) · CI 결과 조회 **3회**(Deploy Auto · API ci-gate · Web ci-gate) · 변경 영향 판정 **3회**(Deploy Auto · API detect · Web detect — 뒤 둘은 dispatch 에서 의미 없음).

### 1-2. 위험 변경 (LEVEL_3) · 첫 rollout — 실제 운영 경로

```text
git push main → CI → Deploy Auto: AUTO_DEPLOY_BLOCKED / CONTROLLED_FIRST_ROLLOUT_REQUIRED (Job Summary 에만 기록)
 사람(또는 Claude Code 세션):
   1. Deploy Auto summary 또는 로그에서 어떤 서비스가 막혔는지 확인
   2. target SHA 결정
   3. git tag deploy/<날짜>-<이름> <sha> && git push origin <tag>
   4. gh workflow run deploy-api.yml --ref <tag> -f rollout_mode=verified
   5. run 완료 대기 · 결과 확인
   6. 서비스마다 gh workflow run deploy-web-services.yml --ref <tag> -f service=<svc> -f rollout_mode=verified (반복)
   7. admin 이면 deploy-admin.yml 별도 dispatch
   8. serving SHA · revision 확인, CHECK 문서 기록
```

실측: 2026-09-30 `pending-delta-release` = API 2 run(1 실패) + Web 4 run · 2026-10-01 = 태그 4개(API 3 · Web 1). **사람 조작 6~10회/릴리스.**

### 1-3. 실제 이력 — cutover 이후 Deploy Auto 30회 판정

| 결과 | run 수 | 비고 |
|---|---|---|
| run 실패 (`SocketError: other side closed`) | 14 | ensureTag 직전 GET 이 idle keep-alive 소켓 재사용 → `ac601b0d7` 재시도 추가로 해소. **이 기간 commit 페이지에 빨간 X** |
| 전 서비스 NO_DEPLOY | 5 | docs/CHECK commit |
| SUPERSEDED 포함 | 6 | 더 새 main commit 존재 |
| AUTO_DEPLOY_BLOCKED (LEVEL_3) 포함 | 5 | 최신 `17e77c9c2`: **7개 서비스가 `packages/auth-client/src/client.ts` 1건 때문에 L3 정체** |
| CONTROLLED_FIRST_ROLLOUT_REQUIRED (api) | 2 | `5f12c4acd`(AI 시간 예산 fix, 순수 L2) 도 사람이 태그 배포 |
| BLOCKED_CI_NOT_GREEN | 1 | |
| AUTO_DEPLOY 결정 | 1 | 수동 dry-run(workflow_dispatch) — dispatch 0 |

**LEVEL_3 은 "누적 부채"다.** 판정 기준이 `serving SHA → target` 이므로 한 번 들어온 L3 변경은 그 서비스가 통제 배포될 때까지 이후 모든 L2 변경을 L3 로 만든다. 승인이 무거우면 자동 배포는 영원히 열리지 않는다(§7).

---

## 2. Workflow graph (현재)

```text
                      ┌───────────── PR ─────────────┐
push main ────────────┤                              │
  │                   ▼                              ▼
  ├─▶ CI Pipeline ◀── pull_request      automation-pr-labeler · ci-guard-policy(paths)
  ├─▶ CodeQL (advisory)
  ├─▶ ci-appstore-guard (paths) · automation-repo-setup (paths)
  │
  └─ CI completed ══ workflow_run ══▶ Deploy Auto
                                        │  POST git/refs (tag)
                                        │  POST dispatches (ref=tag)
                                        ├══▶ Deploy API ──(polling 45m)──┐
                                        │                                ▼ success
                                        ├══▶ Deploy Web × service ◀──────┘
                                        └══▶ Deploy Admin
사람 ─ git tag + gh workflow run ═══════════▶ Deploy API / Web / Admin  (LEVEL_3 · 첫 rollout · migrate_only)
schedule ─▶ scheduled-api-full-jest · CodeQL(주간)
manual   ─▶ e2e-auth-runtime
```

═ 는 "GitHub REST 를 통한 비동기 경계" — 각 경계마다 별도 run 페이지 · 별도 실패 지점 · run id 추적이 필요하다.

---

## 3. Census

### 3-1. Workflow (13개)

| Workflow | 목적 | Trigger | 호출자 | Runtime 영향 | 향후 |
|---|---|---|---|---|---|
| `ci-pipeline.yml` (719줄) | 검증 (type · lint · guard · Jest · admin build) | push main/develop · PR · dispatch | git | 없음 | **KEEP** (Delivery 의 입력 게이트) |
| `ci-security.yml` | CodeQL (advisory) | push · PR · 주간 · dispatch | git | 없음 | KEEP |
| `ci-appstore-guard.yml` | manifest guard | push/PR paths | git | 없음 | KEEP |
| `ci-guard-policy.yml` | web guard | PR paths | git | 없음 | KEEP |
| `automation-pr-labeler.yml` | 라벨 | PR | git | 없음 | KEEP |
| `automation-repo-setup.yml` | 라벨 동기화 | push paths · dispatch | git | 없음 | KEEP |
| `scheduled-api-full-jest.yml` | 야간 full Jest | cron | 스케줄 | 없음 | KEEP |
| `e2e-auth-runtime.yml` | 인증 E2E | dispatch | 사람 | 없음 | KEEP (Delivery verify 후속 후보) |
| `deploy-auto.yml` (112줄) | 위험 판정 + dispatch 오케스트레이션 | workflow_run(CI) · dispatch | CI 완료 | 간접 (dispatch) | **REPLACE** → `delivery.yml` |
| `deploy-api.yml` (737줄) | API build · migration · deploy · verify | dispatch (push trigger 은퇴) | Deploy Auto · 사람 | **직접** | **MERGE** → `_deploy-api.yml`(reusable) + 얇은 수동 wrapper |
| `deploy-web-services.yml` (1184줄) | 9개 web build · deploy · verify | dispatch | Deploy Auto · 사람 | **직접** | **MERGE** → `_deploy-web.yml`(reusable, 서비스 1개 = 입력) — 거의 동일한 job 9개(≈110줄 × 9) 를 matrix/입력 1개로 |
| `deploy-admin.yml` (389줄) | admin build · deploy | dispatch | Deploy Auto · 사람 | **직접** | **MERGE** → `_deploy-web.yml` 또는 `_deploy-admin.yml` |
| (신규) `promote.yml` | LEVEL_3 · 첫 rollout 승인 실행 | dispatch (입력 `sha` 1개) | 사람 / Claude Code | 간접 | **NEW** |

RETIRE 대상(기능 기준, 이번 WO 에서 삭제 0): Deploy Auto 의 태그 생성 · dispatch · run 폴링 · 45분 대기 루프, 각 deploy workflow 안의 `detect`(dispatch 경로에서 항상 fallback=true 라 무의미), 중복 `ci-gate` 2회.

### 3-2. `scripts/ci` (9개 · 판정 logic 은 이미 script 에 있다)

| Script | 역할 | 분류 |
|---|---|---|
| `detect-affected.mjs` (1777줄) | 변경 파일 → CI 축 · API/Web/Admin 배포 축 (workspace dependency closure · lockfile importer 정밀 비교) | **판정 SSOT — KEEP** |
| `deploy-risk.mjs` (863줄) | serving SHA → target · LEVEL_1/2/3 · rollout_pending · serving 조회 | **판정 — KEEP** |
| `deploy-workflow-diff.mjs` | deploy workflow 변경을 job/줄 단위 control/build/config/rollout 로 분류 | 판정 — KEEP (reusable 전환 시 대상 파일 목록 갱신 필요) |
| `ci-gate.mjs` | target SHA 의 CI Pipeline 결론 조회 (MISSING 재시도) | 게이트 — KEEP (Delivery 안에서는 `workflow_run.conclusion` 으로 대체 가능, promote · break-glass 에는 유지) |
| `deploy-orchestrate.mjs` (335줄) | 결정(decideAll) + **실행(태그 · dispatch · 폴링)** | **분리**: `decideAll` 은 KEEP, `executeDecisions`·`githubClient.ensureTag/dispatch/findRun` 은 RETIRE (실행은 workflow `needs` 가 맡는다) |
| `cloud-run-rollout.mjs` · `cloud-run-env.mjs` | verified rollout · env 보존 | KEEP |
| `check-console-log.sh` | CI lint 보조 | KEEP |

**중복 logic**: (a) web detect-changes 의 서비스별 `echo key=true/false` 9줄 × 2 블록이 `WEB_SERVICES` 와 수동 동기화, (b) freeze 판정이 workflow `if: vars.DEPLOY_FREEZE == 'false'`(대소문자 무시 식) 와 `isFrozen()` 두 곳, (c) 서비스 → Cloud Run 이름 매핑이 `deploy-risk.mjs WEB_CLOUD_RUN` 과 workflow job 9개에 각각 하드코딩. 목표 원칙 "판정 = script, workflow = orchestration" 은 **판정 쪽은 이미 달성**, 실행 쪽이 script 로 새어 들어가(dispatch · 폴링) 있고 서비스 목록이 workflow 에 복제돼 있는 것이 남은 문제다.

---

## 4. 왜 push 와 deploy 가 분리되어 보이는가 (질문 1 · 2)

| # | 분리 지점 | 무엇을 보호하나 | 원인 | 필수? |
|---|---|---|---|---|
| G1 | CI run ↔ Deploy Auto run | CI 가 끝난 뒤에만 판정 | workflow_run 사용 (이벤트 체인) | **논리적 순서는 필수, 별도 run 은 아님** |
| G2 | Deploy Auto 의 표시 SHA ≠ 판정 SHA | — | `workflow_run` run 은 **default branch 최신 commit** 으로 표시된다. 실측: `5f12c4acd` commit 의 Actions 에 보이는 Deploy Auto 2개 중 하나는 실제로 `3f1e12261` 을 판정(SUPERSEDED)했다 | **불필요 — 혼란만 만든다** (`run-name` 으로 target 표기 가능) |
| G3 | Deploy Auto ↔ Deploy API/Web (태그 + dispatch + 폴링) | target SHA 고정 · 서비스별 1 rollout | workflow_dispatch 의 `ref` 가 branch/tag 만 받기 때문 (§5) | **불필요 — 역사적 우회** (cutover 시 "사람이 하던 태그 dispatch" 를 자동화가 흉내) |
| G4 | 서비스마다 별도 run | 서비스 독립 배포 · 실패 격리 | dispatch 단위 = run | 독립성은 필수, **별도 run 은 불필요** (job 단위로 충분) |
| G5 | CI 결과 3회 재조회 | CI green 보장 | 각 deploy workflow 가 독립 진입점이라 스스로 다시 확인 | 수동 진입점에는 필수, **자동 경로에서는 1회면 충분** |
| G6 | 판정 결과가 Job Summary 에만 | — | 상태를 commit 에 되돌려 쓰지 않음 | **불필요** — commit status 1줄로 해결 (§10) |
| G7 | LEVEL_3 = 사람이 태그 · workflow · 서비스 · rollout mode 를 직접 고름 | 고위험 통제 | 승인과 실행이 같은 수동 절차 | **승인은 필수, 수동 실행은 불필요** (§7) |
| G8 | `rollout_pending` 6개 서비스 | 바뀐 rollout 방식의 첫 실행 감시 | cutover 잔여 | 일시 — 다음 배포 때 자연 해소, **영구 구조 아님** (§9-4) |

**반드시 분리되어야 하는 것은 셋뿐이다**: ① 검증(CI) 이 끝나기 전에 production 을 건드리지 않는다 ② LEVEL_3 은 사람의 승인 없이 promotion 하지 않는다 ③ 같은 서비스에 rollout 은 동시에 1개. 셋 다 **같은 run 안의 job 의존 · concurrency · 승인 단계**로 표현할 수 있고, 별도 workflow · 태그 · dispatch 는 필요하지 않다.

---

## 5. `deploy/auto-*` 태그는 필요한가 (질문 3)

**판정: 현재 구현에서는 필요(workflow_dispatch 를 쓰는 한), 목표 구조에서는 불필요 → RETIRE.**

- GitHub REST `POST /actions/workflows/{id}/dispatches` 의 `ref` 는 공식 문서상 "branch or tag name" — **commit SHA 불가**. branch 로 dispatch 하면 run 시점의 branch 끝이 배포되므로, target 을 고정하려면 태그가 필요했다. 즉 태그는 **안전 요구 자체가 아니라 dispatch primitive 의 제약을 피한 우회**다.
- `workflow_call`(reusable workflow) 은 SHA 를 **입력값**으로 받을 수 있다. 호출된 workflow 는 `actions/checkout ref: ${{ inputs.target_sha }}` 로 정확한 commit 을 빌드한다. 단 주의점 2개:
  1. 호출된 workflow 안의 `github.sha` 는 호출자 것이다 — `workflow_run` 호출자에서는 **main 최신 commit** 이다. 현재 deploy workflow 들은 이미지 태그 · `o4o-commit-sha` label · `--tag=sha-<12>` · ci-gate 에 `github.sha` 를 쓰므로 **전부 `inputs.target_sha` 로 바꿔야 한다**(구현 WO 의 주 작업).
  2. reusable workflow 파일 자체는 호출자 ref(main HEAD)의 버전이 쓰인다. Delivery 는 `target == main HEAD` 일 때만 배포하므로(기존 SUPERSEDED 규칙 유지) 판정 시점에 둘은 같다.
- 태그가 해 주던 부수 기능(감사 추적)은 Cloud Run revision label `o4o-commit-sha` + Delivery run artifact(판정 JSON) + commit status 로 대체된다.
- 사람의 `deploy/<날짜>-<이름>` 태그도 `promote.yml`(입력 = SHA) 로 대체한다. **기존 태그 삭제는 하지 않는다**(이력).
- `migrate_only` 경로의 "refs/tags/deploy/* 만" 조건은 `expected_sha` 입력 + checkout SHA 일치 검사로 동등하게 바꿀 수 있다 — 구현 WO 에서 같은 수준의 fail-closed 를 증명한 뒤 전환.

---

## 6. 자동 경로의 workflow_dispatch 는 제거할 수 있는가 (질문 4)

**판정: 제거한다. 자동 = `workflow_call` + `needs`, 수동 = `workflow_dispatch`.**

| 대안 | SHA 전달 | 순서 (API → web) | 한 화면 | 판정 |
|---|---|---|---|---|
| workflow_dispatch (현재) | 태그 필요 | 스크립트 폴링(45분 루프) | ✗ run N개 | 수동 전용으로 축소 |
| **workflow_call (reusable)** | 입력값 | `needs:` | **✓ 한 run 안의 job** | **자동 경로 채택** |
| workflow_run 연쇄 | head_sha 만 | 체인 3단 제한 · 순서 표현 약함 | ✗ | 기각 |
| CI workflow 안의 deploy job | `github.sha` 그대로 | `needs:` | ✓ (CI 와 같은 run) | 차선 — 아래 이유로 기각 |
| repository_dispatch | payload | 폴링 | ✗ | 기각 |

"CI 안에 deploy job 을 넣는" 안을 기각하는 이유: CI Pipeline 은 PR 과 공유되고 workflow 수준 concurrency(`ci-…-refs/heads/main`)를 갖는다. 배포(API 6~7분 + web)가 같은 run 에 들어가면 main CI 가 직렬로 길어지고, 대기 중인 run 이 더 새 push 로 대체되면 **그 commit 의 CI 결론이 `cancelled`** 로 남아 이후 promote 의 ci-gate 가 막힌다. 또 CI 에 GCP 자격증명 step 이 섞인다. 반면 별도 `delivery.yml` 은 CI 결과(`workflow_run.conclusion`)만 받아 쓰고, PR 과 완전히 분리된다.

수동 경로의 `workflow_dispatch` 는 남긴다: `promote.yml`(LEVEL_3 · 첫 rollout) 과 각 서비스의 break-glass wrapper(`deploy-api.yml` 등 — 내부는 같은 reusable 호출).

부수 정리: dispatch 를 계속 쓰는 수동 경로에서도 `findRun` 10초×12 폴링은 불필요하다 — 2026 기준 dispatch API 응답이 `workflow_run_id` 를 돌려준다(공식 문서). 단 promote 는 reusable 호출이므로 이 폴링 자체가 사라진다.

---

## 7. LEVEL_3 승인을 한 번으로 줄일 수 있는가 (질문 6)

**판정: 가능. "SHA 하나를 promote" 한 번.** 서비스 · 태그 · workflow · rollout mode 는 사람이 고르지 않는다.

### 7-1. 왜 LEVEL_3 UX 가 핵심인가

09-28 이후 runtime 변경 20건 중 **12건(60%)이 LEVEL_3** 이었다(auth · identity 집중 기간이라 평균보다 높을 수 있음). 규칙별(commit 수, 중복 포함): `auth-frontend` 5 · `rbac` 3 · `access-control-layer` 2 · `db-migration` 2 · `deploy-config` 2 · `auth-backend` 1 · `auth-package` 1 · `secret-handling` 1 · `deploy-infra` 1. 그리고 §1-3 처럼 L3 는 누적되어 이후 L2 까지 막는다. **자동 배포를 늘려도 L3 승인이 무거우면 개발 경험은 개선되지 않는다.**

### 7-2. 목표 흐름

```text
push → CI → Delivery: classify → api=HELD_LEVEL_3(AUTH_CHANGE) · store=HELD_LEVEL_3 · neture=DEPLOYED(L2, API 의존 없음)
      └─ commit status "production: HELD — api,store (LEVEL_3: auth-backend) · promote 대기"
         summary 에 그대로 복사해 쓸 명령 1줄:
           gh workflow run promote.yml -f sha=<40자>
사람: 승인 = 위 명령 1회 (또는 Actions 화면에서 promote → SHA 붙여넣기 → Run)
promote.yml:
  ① sha == main HEAD? (아니면 거절 + 최신 SHA 안내 — 오래된 승인이 새 변경을 덮지 않게)
  ② CI green (ci-gate) · DEPLOY_FREEZE == false
  ③ classify 재실행 → 지금 HELD 인 서비스 목록 = 승인 범위 (summary 첫 줄에 고정 표기)
  ④ migration 이 있으면 API 경로 안에서 migration Job → deploy → verify (현재 deploy-api 순서 그대로)
  ⑤ 같은 reusable deploy job 들 (API 먼저 → 의존 web)
  ⑥ verified rollout · 실패 시 rollback · commit status = DEPLOYED / FAILED
```

- 승인 단위 = **commit SHA + 그 시점에 산출된 서비스 집합**. 입력은 SHA 하나, 서비스 집합은 결정론적으로 계산되어 run 제목과 summary 에 기록된다. 범위를 좁혀야 할 때만 선택 입력 `services` 를 쓴다.
- `rollout_mode` 입력은 은퇴(항상 verified, legacy 는 break-glass wrapper 에만).
- Claude Code 도 같은 명령 한 줄로 수행 가능 — 사람 승인 문구를 받은 뒤 실행.

### 7-3. GitHub Environment required reviewer 는?

공식 문서상 개인 계정 **GitHub Pro** 도 private repo 에 environment(required reviewer 포함)를 설정할 수 있다. 이 저장소는 `production` · `staging` environment 가 **존재하지만 protection rule 0** 이다(2026-10-01 read-only 확인). 현재 플랜에서 reviewer 설정이 가능한지는 **미검증**(설정 = 쓰기 작업이라 이번 WO 범위 밖).

설계는 이것에 **의존하지 않는다**. reviewer 가 가능해지면 promote 를 "Delivery run 안의 승인 대기 job"으로 바꿀 수 있지만, 그 경우 승인 대기 run 이 concurrency 를 붙잡거나 오래된 SHA 승인이 남는 문제가 있어 **promote(최신 SHA 재판정) 방식이 더 단순하고 안전**하다. reviewer 는 promote job 에 `environment: production-l3` 로 2차 확인을 붙이는 선택지로만 남긴다.

### 7-4. 별도 검토 권고 — L3 규칙 정밀도 (정책 판단 필요)

실측 L3 12건 중 5건이 `auth-frontend` 로, 예: `services/web-neture/src/components/LoginModal.tsx`(로그인 전 IA 정비) · `RegisterRedirect.tsx` · `ServiceApplyPanel.tsx`. frontend 의 로그인 UI 변경은 backend 인증을 약화시키지 못한다. **frontend 인증 UI 를 L2 + post-switch 검증으로 낮출지**는 보안 정책 판단이므로 이 문서는 판정하지 않고 별도 WO 로 제안한다(§14).

---

## 8. Build once — 동일 artifact 배포 (질문 7)

### 8-1. 현재 빌드 실측

| 대상 | CI 에서 | 배포 시 | 중복 | CI green 이 보장하지 않는 것 |
|---|---|---|---|---|
| API | tsc type-check · Jest (bundle 없음) | tsc + tsup bundle + docker buildx | 낮음 (production build 는 1회) | tsup bundle · Docker build 실패 |
| Web 9개 | `type-check:frontend` · 3개 서비스 Vitest (**vite build 없음**) | Dockerfile 안에서 vite build | 없음 | **vite production build 실패** — CI green 이후 배포 job 에서 처음 드러난다 |
| Admin | vite build + artifact 업로드 | runner 에서 **vite build 다시** → docker build | **2회** | — |

즉 문제는 "같은 빌드 반복"보다 **"production artifact 가 CI 에서 만들어지지 않는다"** 는 쪽이다. CI 성공 ≠ 배포 가능.

### 8-2. 전략

- **1단계 (Option B 와 함께)**: 배포는 reusable job 에서 빌드 (현재와 동일한 빌드 1회). 이미지 태그 = target SHA. admin 의 CI build 와 배포 build 중복은 1단계에서 유지(허용).
- **2단계 (Option C)**: main push 의 Delivery `build` 단계가 **affected 서비스만** 이미지를 빌드해 registry 에 `:<sha>` + digest 로 push → deploy 는 `--image <digest>` 만 수행. L2 는 같은 run 에서 즉시, L3 는 promote 가 **이미 만든 digest 를 그대로** 승격(재빌드 0 → 승인 후 반영 1~2분). 실측상 runtime commit 은 하루 ~5건이라(68 commit 중 20) build 비용 증가가 작다.
  - 전제: VITE build-arg 가 SHA 고정이어야 한다(현재 workflow env 상수 — 충족). PR 에서는 이미지 build/push 를 하지 않는다(secret 노출 경계).
  - registry 보존 정책(Artifact Registry cleanup policy) 필요 — 인프라 변경이므로 별도 승인.

---

## 9. 서비스 의존 · 확장성 (질문 8 · 9)

### 9-1. API ↔ frontend hold 규칙

현재(`decideAll`): **API 가 배포 대상인데 자동 배포되지 않으면 모든 프런트 AUTO_DEPLOY → HELD_API_NOT_DEPLOYED.** 근거는 2026-09-30 neture 프런트만 반영된 불일치. 실측 발동 1회(`773d6c54c`).

문제: API 가 L3(예: migration) 로 HELD 되면 **무관한** 프런트 L2 까지 같이 멈춘다 — L3 부채가 서비스 경계를 넘어 번진다.

제안 (fail-closed 유지):

```text
frontend X 를 hold 하는 경우 = API 가 배포 대상인데 아직 반영되지 않았고, 아래 중 하나:
  (a) serving_X..target 범위에 API runtime 파일과 X 의 파일을 **같은 commit** 에서 바꾼 commit 이 있다 (co-change)
  (b) X 의 변경이 API 와 공유하는 계약 package(@o4o/types · auth-client 등 api-server closure ∩ X closure)를 포함한다
  (c) 위 판정이 불가능하다 (diff 실패 등) → hold
그 외 → X 는 독립 배포
```

09-30 사례는 하나의 WO 가 API · neture 를 함께 바꾼 형태라 (a) 로 잡힌다. PR merge commit 은 first-parent diff 로 하나의 commit 이 되므로 (a) 가 자연스럽게 WO 단위로 동작한다.

### 9-2. 서비스 독립 배포 — 이미 대부분 달성

`detect-affected.mjs` 는 workspace dependency graph 의 **transitive closure** 로 서비스별 영향을 계산하고, `pnpm-lock.yaml` 도 importer 단위로 정밀 비교한다(package 이름 allowlist 없음). 실측 9/28 이후 68 commit 중 **5개 이상 서비스를 동시에 건드린 commit 은 1개**(#257 이메일 인증 merge).

### 9-3. Shared package 실제 소비 (package.json 기준)

| package | 소비 배포 대상 |
|---|---|
| `@o4o/auth-client` | api · admin · neture · k-cosmetics · kpa-society · pharmacy-hub · lecture · store · kpa-branch (9) |
| `@o4o/auth-react` | admin + web 7 (signage-player · hospital-pharmacy 제외) |
| `@o4o/types` | api · admin + web 6 |
| `@o4o/ui` | admin + web 5 |

global fallback 이 남는 곳: 루트 manifest(`package.json` · `pnpm-workspace.yaml` · tsconfig 등) · `.github/` · `scripts/` · `.dockerignore`. 이 중 deploy 축은 `API_DEPLOY_NEUTRAL_PREFIXES` · `CONTROL_ONLY` 로 이미 좁혀져 있다. **새 dependency map 을 손으로 만들 필요는 없다** — 그래프가 SSOT 다.

### 9-4. 복잡도가 서비스 수에 선형으로 늘지 않게

현재 서비스 1개 추가 = deploy-web-services.yml 에 job ≈110줄 복사 + detect-changes 의 echo 2줄 + summary needs + `WEB_SERVICES` + `WEB_CLOUD_RUN`. 목표 = **registry 1행**(`WEB_SERVICES` 에 key · dir · Cloud Run 이름 · Dockerfile · build-arg · smoke path) 추가 → classify 가 matrix 를 출력 → `_deploy-web.yml` 한 개가 처리. 9개 job 의 사소한 편차(예: verify-url 은 neture 만, kpa-branch 의 한 줄 docker build)는 registry 필드로 흡수.

`rollout_pending`: serving..target diff 에 rollout 방식 파일이 있으면 켜지는 **계산값**이라 별도 상태 저장이 없다. 각 서비스가 한 번 verified 배포되면 자연히 꺼진다. 새 구조에서도 판정 규칙은 유지하되, 처리 경로는 L3 와 같은 promote 로 합친다(별도 개념 노출 0 — 상태명만 `HELD_ROLLOUT_PENDING`).

---

## 10. Push 이후 상태 표현 (§17 · §18)

### 10-1. 상태 체계 — 현재 decision 과 1:1

| 상태 | 현재 decision | 의미 · 사람 행동 |
|---|---|---|
| `VALIDATING` | (CI 진행 중) | 없음 |
| `NO_DEPLOY` | NO_DEPLOY | 끝 |
| `READY_TO_DEPLOY` → `DEPLOYING` → `DEPLOYED` | AUTO_DEPLOY + 실행 결과 | 끝 |
| `HELD_LEVEL_3` | AUTO_DEPLOY_BLOCKED | `promote` 1회 |
| `HELD_ROLLOUT_PENDING` | CONTROLLED_FIRST_ROLLOUT_REQUIRED | `promote` 1회 |
| `HELD_DEPENDENCY` | HELD_API_NOT_DEPLOYED | API 가 처리되면 자동 |
| `SUPERSEDED` | SUPERSEDED_BY_NEWER_MAIN | 끝 (새 commit 이 누적 처리) |
| `FAILED` | dispatch/rollout 실패 | 조사 (rollback 은 자동) |
| `FROZEN` | BLOCKED_DEPLOY_FREEZE | 비상 정지 중 |
| `BLOCKED_CI` | BLOCKED_CI_NOT_GREEN | CI 수정 |

### 10-2. 한 곳에서 보기

새 dashboard 는 만들지 않는다.

1. **commit status 1개** `production` (Statuses API, `statuses: write`) — commit 페이지 · PR 에 CI 체크 옆에 한 줄로 표시. description 예: `HELD — api,store LEVEL_3(auth-backend) · gh workflow run promote.yml -f sha=…`. target_url = Delivery run.
2. **Delivery run 1개 = commit 1개** — `run-name: "Delivery ${{ github.event.workflow_run.head_sha }}"` 로 G2 혼란 제거. summary 표: SHA · CI 결론 · 서비스별 serving→target · level · 상태 · rollout 결과 · **배포 후 serving SHA**.
3. 판정 JSON artifact(30일)는 유지.

현재는 commit 1개당 CI · CodeQL · Deploy Auto(최대 3회 — 앞 commit 의 판정이 섞여 보임) · Deploy API · Deploy Web×N 을 각각 열어야 한다.

---

## 11. 목표 Architecture 후보 비교 (§29 · §30)

- **Option A — 현 구조 최소 단순화**: Deploy Auto 유지, dispatch 응답의 run id 사용 · 중복 detect/ci-gate 생략 · run-name · commit status 추가. 태그와 dispatch 는 남는다(SHA 고정 수단이 없으므로).
- **Option B — Unified Delivery**: `delivery.yml`(workflow_run) 한 run 안에서 classify → `_deploy-api` → `_deploy-web`(matrix) / `_deploy-admin` → verify → status. 수동은 `promote.yml` + break-glass wrapper. 태그 · dispatch · 폴링 0.
- **Option C — Artifact Promotion**: B 위에 build 를 classify 직후 단계로 올려 digest 를 만들고, deploy/promote 는 digest 승격만.

| 기준 | A | B | C |
|---|---|---|---|
| 개발자 사용성 (push 후 할 일) | L2 끝 · L3 수동 절차 유지 | **L2 끝 · L3 promote 1회** | B 와 같음 + 승인 후 반영 1~2분 |
| 안전성 | 현재와 동일 | 동일 (판정 script 불변 · fail-closed 유지) | 더 높음 (CI 단계에서 production build 검증 · 승인 대상 = 검증된 digest) |
| workflow 복잡도 | 그대로 (≈2,400줄 deploy) | **크게 감소** (web 9 job → 1 reusable) | B + build 단계 |
| GitHub 제약 | dispatch ref 제약 그대로 | workflow_call 입력으로 해소 · `github.sha` 치환 필요 | 동일 + registry 인증을 main push 에만 |
| 배포 속도 | 현재 | dispatch/폴링 대기 제거(수십 초~분) | 배포 = deploy+verify 만 |
| build 중복 | admin 2회 | admin 2회 | **0** |
| rollback | revision 복귀(현재) | 동일 | 동일 + 이전 digest 재승격 |
| LEVEL_3 승인 단순성 | 낮음 | **높음** | 높음 |
| 서비스 확장성 | job 복사 | **registry 1행** | registry 1행 |
| 유지보수 | 낮음 | 높음 | 중 (registry 정리 정책) |
| Claude Code 자동화 적합성 | 태그 · 다중 dispatch 절차 필요 | **`gh workflow run promote.yml -f sha=` 1줄** | 동일 |

---

## 12. 권장 Architecture

**Option B 를 먼저 완성하고, 그 위에 Option C 의 build 단계를 올린다.** A 는 태그 · dispatch 라는 근본 원인을 남기므로 채택하지 않는다.

```text
                          (사람이 보는 것)
push main ─▶ CI Pipeline ─▶ commit status "production: <상태>"   ← 끝 (L1 · L2)
                                     └ HELD 면 promote 명령 1줄    ← 승인 1회 (L3)

                          (내부)
CI Pipeline completed (main push)
  └ workflow_run ─▶ delivery.yml   run-name "Delivery <sha>"   concurrency: delivery-production (대기 run 은 새 것으로 대체)
       classify   : CI 결론 · DEPLOY_FREEZE · target==main HEAD · serving→target · LEVEL · 의존 규칙
                    → 서비스별 상태 + deploy matrix (decideAll 그대로)
       [C 단계] build : affected 서비스 이미지 → registry @digest
       deploy-api : uses ./_deploy-api.yml   (target_sha · migration Job · verified rollout · rollback)
       deploy-web : needs deploy-api(의존 서비스만) · matrix → uses ./_deploy-web.yml   서비스별 concurrency
       deploy-admin
       report     : commit status · summary · 판정 JSON

promote.yml (workflow_dispatch, 입력 sha)
  └ 같은 classify(allow HELD) → 같은 reusable deploy jobs → report
deploy-api.yml / deploy-web-services.yml / deploy-admin.yml (workflow_dispatch)
  └ break-glass: 얇은 wrapper → 같은 reusable (target = 실행 ref 의 SHA)

DEPLOY_FREEZE : 모든 진입점 classify 에서 1회 판정 (비상 정지 — 정상 운영값 false, 평시 사람이 만질 일 없음)
```

**유지(안전 경계 — 버리지 않는다)**: CI fail-closed(ci-gate 의미) · serving SHA → target 누적 판정 · LEVEL_3 규칙 · SUPERSEDED · 서비스별 rollout 1개 · verified rollout + 자동 rollback · migration Job 단일 소유(배포 전 실행) · `DEPLOY_FREEZE` fail-closed 해석 · 판정 JSON 기록.

---

## 13. Migration plan (구현 WO 순서 — 순서가 곧 안전)

> 전부 별도 구현 WO · 사용자 승인 후. 각 단계는 기존 경로를 끄기 전에 새 경로를 dry-run/fixture 로 증명한다.

| 단계 | 내용 | 위험 | 비고 |
|---|---|---|---|
| **P0** | 관찰성만: Deploy Auto 에 `run-name` · commit status 추가 | 0 (runtime 무영향) | 즉시 가치 — G2 · G6 해소 |
| **P1** | `_deploy-api.yml` · `_deploy-web.yml` · `_deploy-admin.yml` reusable 추출. `github.sha` → `inputs.target_sha` 전수 치환. 기존 dispatch workflow 는 wrapper 로 남겨 **수동 경로로 먼저 검증** (controlled release 1회씩) | 중 — 배포 workflow 수정 = 현재 규칙상 deploy-config L3 · 첫 실행은 통제 | `deploy-workflow-diff.mjs` · `deploy-workflow-gates.test.mjs` 대상 파일 목록 갱신 필수 |
| **P2** | `delivery.yml` 신설 (dry-run 기본) — Deploy Auto 와 병행해 판정 일치 비교 | 낮음 | `deploy-orchestrate.mjs` 의 decideAll 재사용, executeDecisions 미사용 |
| **P3** | `promote.yml` 신설 · 다음 LEVEL_3 1건을 promote 로 수행 | 중 (통제 배포 1회) | 사람 태그 절차 은퇴 시점 |
| **P4** | cutover: Delivery enforcement on · Deploy Auto 비활성 → 관찰 후 삭제 | 중 | 실패 시 되돌림 = Deploy Auto 재활성(파일 복구) |
| **P5** | API↔frontend 의존 규칙 정밀화(§9-1) | 낮음 (판정 script + 테스트) | |
| **P6** | Option C: build 단계 + digest 승격 + registry cleanup policy | 중 (인프라 · 비용) | Web vite build 를 CI 단계로 끌어오는 효과 |

---

## 14. 다음 구현 WO 범위 (제안)

1. **WO-O4O-CICD-UNIFIED-DELIVERY-PIPELINE-V1** — §13 P0~P4 (큰 목표 1 = WO 1). INITIAL_PURPOSE = "push 후 사람이 할 일 = L3 promote 1회뿐". OUT_OF_SCOPE = L3 규칙 변경 · Option C · Environment reviewer 설정.
2. **WO-O4O-CICD-LEVEL3-RULE-PRECISION-REVIEW-V1** (정책 판단 필요) — §7-4 frontend 인증 UI · `role-constants.ts` 류 L3 적정성 · API↔frontend 의존 규칙(§9-1).
3. **WO-O4O-CICD-ARTIFACT-PROMOTION-V1** — §13 P6.

---

## 15. 최종 질문 답

| # | 질문 | 답 |
|---|---|---|
| 1 | 왜 push 와 deploy 가 분리되어 보이나 | 판정 이후 전달을 수동용 primitive(태그 + dispatch + 폴링)로 이었고, 그래서 run 이 commit 당 4~N개로 흩어지며, Deploy Auto 의 표시 SHA 가 판정 SHA 와 다르고, 결과가 commit 으로 돌아오지 않는다. 게다가 cutover 이후 자동 배포 실적 0 · 실제 배포 100% 수동 태그 (§1-3 · §4) |
| 2 | 반드시 분리되어야 하는 단계 | CI 완료 전 production 금지 · L3 사람 승인 · 서비스별 rollout 1개 — 셋 다 한 run 안의 job 의존 · 승인 단계 · concurrency 로 표현 가능 (§4) |
| 3 | `deploy/auto-*` 태그 필요? | dispatch 를 쓰는 한 필요, workflow_call 로 SHA 를 입력 전달하면 **불필요 → 은퇴** (§5) |
| 4 | 자동 경로 dispatch 제거? | **가능** — workflow_call + needs. dispatch 는 promote · break-glass 에만 (§6) |
| 5 | 하나의 logical pipeline? | **가능** — `delivery.yml` 1 run = commit 1개 (§12) |
| 6 | L3 승인 1회? | **가능** — `promote.yml -f sha=<sha>`, 서비스 자동 산출 (§7) |
| 7 | build once? | 2단계(Option C)에서 digest 승격으로 가능. 현재 진짜 문제는 web production build 가 CI 에 없다는 것 (§8) |
| 8 | API/frontend hold 정밀화? | **가능** — co-change commit · 공유 계약 package · 판정 불가 시 hold (§9-1) |
| 9 | 서비스 증가에도 선형 복잡도 회피? | 판정은 이미 그래프 SSOT. 실행을 registry + reusable 1개로 바꾸면 서비스 추가 = 1행 (§9-4) |
| 10 | push 후 배포를 신경 쓰지 않아도 되나? | **B 완료 시 Yes (L1 · L2)**. L3 는 commit status 가 알려 주는 promote 1회. 단 L3 비율(실측 runtime 의 60%)이 그대로면 체감이 제한되므로 §14-2 규칙 검토가 짝으로 필요 |

---

## 16. 검증 기록 (이 문서의 근거 — 전부 read-only)

- 코드: `.github/workflows/*.yml` 13개 · `.github/actions/*` · `scripts/ci/*.mjs` 9개 정독/추출 (`origin/main` `17e77c9c2`).
- `gh run list/view`: Deploy Auto 30회(2026-09-30 17:21Z ~ 10-01 12:18Z) 판정 로그 집계 · Deploy API/Web/Admin 최근 25회 ref · CI Pipeline main push 90회 결론/소요.
- `git ls-remote --tags origin 'deploy/*'`: 24개, `deploy/auto-*` 0개.
- `gh api repos/.../environments`: `production` · `staging` protection_rules 0.
- `gh variable list`: `DEPLOY_FREEZE=true` (12:47Z 갱신 — 조회만).
- 위험 분포: `node scripts/ci/deploy-risk.mjs --base <parent> --head <sha>` 를 09-28 이후 first-parent commit 68개에 로컬 실행(판정 전용, 쓰기 0).
- GitHub 공식 문서: workflow dispatch `ref` = branch 또는 tag · dispatch 응답 `workflow_run_id` · Pro 사용자 private repo environment 설정 가능.
- **미검증**: 현재 계정 플랜에서 required reviewer 설정 가능 여부(쓰기 필요) · Option C 의 registry 비용.

## 17. 문서 정합

- 선행 CHECK `CICD-PRODUCTION-DEPLOY-CENSUS` §D-3 은 "무료 플랜에서는 required reviewer 불가 · Pro 전환 시 가능"으로 적었다. 이 문서는 플랜 실측을 하지 않았으므로 판정을 바꾸지 않는다(기록물 — 수정 대상 아님).
- `.github/workflows/README.md` "배포" 절은 현재 구조(Deploy Auto + 수동 태그)를 설명한다 — 구현 WO 에서 갱신 대상. 이번 WO 는 수정하지 않는다.

`문서 정합: 발견 1건(README 배포 절 — 구현 WO 에서 갱신) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건(§14)`
