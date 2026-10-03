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

OWNER_PR_PENDING_BLOCK                   = §4
OWNER_PR_GREEN_RELEASE                   = §4

COLLABORATOR_INVITATION_ACCEPTED         = §5
LIVE_SMOKE                               = §5

PUBLIC_COLLABORATOR_SECURITY             = §7
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

## 4. Owner-side status smoke

(이 CHECK 의 PR 에서 기록)

## 5. Collaborator

(초대 상태 확인 후 기록)

## 6. 정리

(기록 예정)

## 7. 최종

(기록 예정)

`문서 정합: 해당 없음`
