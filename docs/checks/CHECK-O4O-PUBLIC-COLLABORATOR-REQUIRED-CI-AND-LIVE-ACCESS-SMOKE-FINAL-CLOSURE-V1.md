# CHECK-O4O-PUBLIC-COLLABORATOR-REQUIRED-CI-AND-LIVE-ACCESS-SMOKE-FINAL-CLOSURE-V1

> **WO**: WO-O4O-PUBLIC-COLLABORATOR-REQUIRED-CI-AND-LIVE-ACCESS-SMOKE-FINAL-CLOSURE-V1
> **일자**: 2026-10-03
> **경과**: 1차 실행 §5 STOP(`NO_STABLE_CANONICAL_PR_CHECK`) → 선행 [`CHECK-O4O-CI-CANONICAL-FINAL-GATE-AND-REQUIRED-CHECK-READINESS-V1`](CHECK-O4O-CI-CANONICAL-FINAL-GATE-AND-REQUIRED-CHECK-READINESS-V1.md) CLOSED → **§6 재개**
> **값 기록 0** — secret · token · credential 값 없음. 계정은 GitHub login 만.

---

## 0. 판정

```text
MAIN_RULESET_READBACK                    = PASS

REQUIRED_STATUS_CHECK_ENABLED            = YES
REQUIRED_STATUS_CONTEXT                  = CI Gate (integration_id 15368 = github-actions)
REQUIRED_STATUS_CONTEXT_STABLE           = PASS (선행 CHECK — full · frontend · docs · red 경로)

OWNER_PR_PENDING_BLOCK                   = PASS
OWNER_PR_GREEN_RELEASE                   = PASS (status 요건 충족 · 남은 차단 = 독립 승인)

COLLABORATOR_INVITATION                  = PENDING (Businnect · write · 미만료)
COLLABORATOR_INVITATION_ACCEPTED         = NO
LIVE_SMOKE                               = BLOCKED_BY_ACCEPTANCE

REPOSITORY_SECRET_COUNT                  = 0
PRODUCTION_ENV_SECRET_COUNT              = 7

RULESET_MUTATION                         = required_status_checks 1건 추가만
NO_UNINTENDED_PRODUCTION_ACTION          = YES

PUBLIC_COLLABORATOR_SECURITY             = BLOCKED (BLOCKED_BY_ACCEPTANCE — ruleset · owner-side 완료, collaborator 실계정 smoke 대기)
```

---

## 1. 시작 상태

- `origin/main` 에 `ci-pipeline.yml` `ci-gate` (`name: CI Gate`) 존재 확인.
- 공유 로컬 작업트리는 다른 세션 미커밋 변경이 있어 clean 아님 — 이번 작업은 **GitHub live 설정만** 대상, 저장소 파일 변경은 이 CHECK 1개(작업트리 비접촉 plumbing commit).
- `CHERRY_PICK_HEAD` · `MERGE_HEAD` · `REBASE_HEAD` · `index.lock` 없음.

## 2. Ruleset `main-collaborator-pr-required` (id 24351641 · branch · `~DEFAULT_BRANCH`)

| 항목 | before (live) | after (live readback) |
|---|---|---|
| enforcement | active | active |
| pull_request | 필수 · 승인 1 · stale 승인 무효화 · merge/squash/rebase | 동일 |
| non_fast_forward | 있음 | 있음 |
| deletion | 있음 | 있음 |
| bypass | RepositoryRole 5(admin) · always | 동일 |
| required_status_checks | **없음** | **`CI Gate` · integration_id 15368** · strict off |

- 변경은 `required_status_checks` rule 1개 추가뿐 — 그 외 필드 before/after 동일을 스크립트로 비교(`UNCHANGED_EXCEPT_STATUS_RULE = true`).
- `integration_id` 고정 이유: write 권한자는 commit status API 로 같은 이름(`CI Gate`) status 를 직접 올릴 수 있다. GitHub Actions app(15368)의 check run 만 인정하도록 묶었다.
- `strict`(branch 최신화 요구) 는 끈 상태 유지 — 이번 WO 의 변경 범위 밖.

## 3. Required context 선정 근거

선행 CHECK 요약: 기존 job 은 path 별 배타 skip · matrix 이름 변동(`Build Applications (admin-dashboard)` · 미렌더 `API Server Jest (${{ matrix.shard }}/3)`) · `Detect affected scope` 는 판정 job 이고 CodeQL 과 이름 중복 → 후보 없음.
`CI Gate` = 다른 CI job 8개 전부를 needs · `always()` · success/skipped 통과 · failure/cancelled 실패. PR #270(full) · #271(frontend · red) · #272(docs) · main push 에서 이름 동일 · 판정 정확 · 배포 의존 0.

## 4. Owner-side status smoke — PR #273 (이 CHECK · docs-only)

GraphQL 로 `mergeStateStatus` · `reviewDecision` · `CI Gate` check run 의 `isRequired(pullRequestNumber)` 를 10초 간격 기록:

| 시각 | CI Gate | required | rollup | mergeStateStatus | reviewDecision |
|---|---|---|---|---|---|
| 13:44:50 | 아직 생성 전 | — | — | — | — |
| 13:46:35 | IN_PROGRESS | **true** | PENDING | **BLOCKED** | REVIEW_REQUIRED |
| 13:46:46 | COMPLETED / SUCCESS | **true** | SUCCESS | BLOCKED | REVIEW_REQUIRED |

- 등록된 context 가 실제 PR 의 check run 과 매칭됨(`isRequired = true`) — 잘못된 이름으로 인한 영구 pending 아님.
- green 후 남은 차단 사유는 `REVIEW_REQUIRED` 뿐 — status 요건 충족, 독립 승인 1 이 다음 gate.
- owner 는 admin bypass(always) 라 owner 계정의 실제 merge 시도는 차단 검증이 되지 않는다 → 시도하지 않고 상태 판정으로 확인.
- red 상태 차단: ruleset 등록 이후 red PR 사례 없음. gate 의 red 판정 자체는 선행 CHECK(#271 · `CI Gate = failure`) 에서 실측 — 등록된 required check 가 failure 일 때 merge 차단은 collaborator PR 에서 확인 예정.

## 5. Collaborator

| 항목 | live 결과 |
|---|---|
| 초대 | `Businnect` · permission `write` · expired = false · 2026-10-02 생성 → **PENDING** |
| direct collaborator | `Renagang21`(admin) 1명 — Businnect 미포함 |

WO §12 에 따라 정지: 초대를 대신 수락하거나 계정에 대신 로그인하지 않는다. §13 이후(실제 권한 · branch push · PR · main push 차단 · deploy tag 차단 · 승인 gate · red 차단 · 수동 배포 · WIF · environment)는 수락 후 재개.

secret 상태(이름 · 개수만): repository **0** · `production` environment **7** (`GCP_DB_NAME` · `GCP_DB_USERNAME` · `GCP_JWT_SECRET` · `GEMINI_API_KEY` · `OPENAI_API_KEY` · `SMTP_PASS` · `SMTP_USER`) — 정본과 일치.

## 6. 정리

- 원격 smoke branch · tag 생성 0 (collaborator 단계 미진입).
- 이 CHECK 의 PR branch 는 merge 시 삭제.

## 7. 재개 조건

Businnect 초대 수락 → 이 CHECK 의 WO §13 부터 재개. 그때 이 문서 §0 · §5 를 갱신하고 `PUBLIC_COLLABORATOR_SECURITY = FINAL CLOSED` 여부를 판정한다.

`문서 정합: 해당 없음`
