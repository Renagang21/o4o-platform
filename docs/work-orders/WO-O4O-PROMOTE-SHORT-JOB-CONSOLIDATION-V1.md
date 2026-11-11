# Promote · Delivery 짧은 job 통합 — 남은 로컬 검증

> **상태**: ACTIVE
> **작성일**: 2026-11-11 · **최종 갱신**: 2026-11-11
> **실행 위치**: LOCAL
> **인계**: `claude/peaceful-lamport-sjwtri-promote-cost` · `aad671261` · 다음 실행자 LOCAL
> **근거**: 사용자 지시(2026-11-11 「Promote workflow 비용 절감 1번 작업」 · 「환경이 준비되지 않아 못 한 것은 환경을 만들어 진행」 · 「로컬 작업은 별도로」) · [`IR-O4O-PRIVATE-CI-BUDGET-V1`](../investigations/IR-O4O-PRIVATE-CI-BUDGET-V1.md) §9-5 3번

## 1. 배경

클라우드 세션이 위 branch 에서 다음을 구현 · push 했다(commit `79d388afb`). PR 생성 · 병합은 통합 담당 절차를 따른다.

- `deploy-api.yml` · `deploy-admin.yml` · `deploy-web-services.yml` 의 `ci-gate` job 을 detect job 의 step(`id: ci_gate`)으로 옮겼다. 배포 job 은 `needs.<detect>.outputs.ci_gate == 'passed'` 를 요구한다. 게이트 조건식 · `ci-gate.mjs --enforce` · 30분 대기 · 권한은 그대로다.
- Web `summary` 는 직접 dispatch 에서만 돈다(`contains(github.workflow_ref, '/.github/workflows/deploy-web-services.yml@')`). Delivery · Promote 호출에서는 skip 한다.
- 실측(2026-10-27~11-10) 기준 1분 청구 job 약 665개/15일 제거, 월 약 1,300분 절감 예상.

클라우드에서 끝낸 검증:
- `scripts/ci/__tests__/*.test.mjs` 520 pass. 새 `promote-short-job-consolidation.test.mjs` 는 실제 조건식을 평가해 전 조합에서 종전 의미와 같은지 확인하고, 결함 6종을 넣으면 모두 잡는다.
- `deploy-risk.mjs` 판정은 LEVEL_1 · deploy_required=false 다.
- `github.workflow_ref` 의미는 GitHub 공식 문서 원본(`github/docs` `7c3387d` · `contexts.md` 의 `job.workflow_ref` 설명)으로 확인했다. reusable workflow 의 job 에서는 `github.workflow_ref` 가 `job.workflow_ref`(reusable 파일)와 다르다. 즉 호출한 최상위 workflow 를 가리킨다.

클라우드에서 하지 못한 것(이 지시서의 범위):
1. **actionlint 정적 검사** — 클라우드에서 외부 바이너리 다운로드 · 실행이 권한 판정으로 거부됐다(2026-11-11).
2. **실제 실행 확인** — 운영 배포를 수반하므로 클라우드 세션은 실행하지 않는다. 병합 후 자연 발생하는 Delivery run 을 read-only 로 본다.

## 2. 사용자 확정

- 배포 안전장치를 약화하지 않는다. 실제 Promote 실행 · 운영 배포 · GitHub 설정 변경은 이 작업에 포함하지 않는다.
- 로컬에서 필요한 작업은 이 지시서로 분리한다.

## 3. 설계 판단

| 결정 | 근거 |
|---|---|
| actionlint 는 LOCAL 에서 실행 | 클라우드 권한 판정이 외부 바이너리 실행을 거부. 우회하지 않는다 |
| 실제 실행 확인은 병합 후 자연 발생 run 으로 | 이 확인만을 위해 Promote · 배포를 실행하지 않는다 |
| main 기준선과 비교 | actionlint 지적 중 main 에도 있는 것은 이번 변경과 무관(보고만, 수정하지 않음 — AGENTS.md §3) |

## 4. 범위 밖

- actionlint 가 main 에서도 내는 기존 지적의 수정(별도 작업)
- Promote 묶음 실행 등 운영 절차 변경
- `Same-SHA guard` · `Classify` · `Report` job 구조

## 5. TODO

### A. 병합 전 — actionlint (LOCAL, 아무 PC)

- [ ] [LOCAL] 전용 worktree 로 branch 를 받는다(AGENTS.md §4-1(a) — 새 branch 를 만들지 않고 기존 원격 branch 를 checkout):

  ```bash
  git fetch origin
  WT_ROOT="$(dirname "$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")")/o4o-wt"
  git worktree add "$WT_ROOT/promote-cost-check" origin/claude/peaceful-lamport-sjwtri-promote-cost
  git worktree add "$WT_ROOT/promote-cost-base" origin/main
  ```

- [ ] [LOCAL] actionlint 설치(하나만, 버전 기록). 설치는 사용자 PC 에 외부 도구를 들이는 일이라 사용자가 고른다.
  - Windows: `winget install --id rhysd.actionlint`
  - Go 가 있으면: `go install github.com/rhysd/actionlint/cmd/actionlint@v1.7.7`
  - shellcheck 이 있으면 actionlint 가 `run:` 스크립트도 검사한다. 있는지 여부를 기록한다.
- [ ] [LOCAL] 두 worktree 에서 같은 파일을 검사한다:

  ```bash
  actionlint -version
  ```

  ```bash
  actionlint .github/workflows/deploy-api.yml .github/workflows/deploy-admin.yml .github/workflows/deploy-web-services.yml .github/workflows/delivery.yml .github/workflows/promote.yml .github/workflows/ci-pipeline.yml
  ```

- [ ] [LOCAL] 판정:
  - **PASS**: branch 의 지적 목록이 main 기준선과 같거나 더 적다.
  - **FAIL**: branch 에만 있는 지적이 있다. 특히 다음은 반드시 FAIL 이다.
    - `steps.ci_gate` · `steps.scope` · `steps.changes` 참조 오류
    - `needs.detect*.outputs.ci_gate` 의 undefined output 경고
    - 하이픈 키(`outputs.kpa-society`) 관련 오류
    - `github.workflow_ref` 타입 오류
    → 지적 원문과 줄 번호를 아래 §7 에 적고 클라우드 세션에 넘긴다. 직접 고치지 않는다.
- [ ] [LOCAL] 결과를 §7 에 적고, 이 지시서만 path-specific commit 으로 같은 branch 에 push 한다. PR 이 이미 병합됐다면 push 하지 않고 HANDOFF 에만 적는다(AGENTS.md §4-1(e)).
- [ ] [LOCAL] 검사용 worktree 2개를 정리한다(AGENTS.md §4-1(i) — Windows 는 junction 점검 후 `git worktree remove`).

### B. 병합 후 — 첫 실제 실행 확인 (통합 담당 · read-only)

배포를 일부러 일으키지 않는다. 병합 뒤 처음 **배포가 실제로 일어난** Delivery 또는 Promote run 하나를 본다.

- [ ] [LOCAL] run 찾기:

  ```bash
  gh run list --workflow delivery.yml --limit 10
  ```

- [ ] [LOCAL] job 목록 · 시간(배포가 있었던 run):

  ```bash
  gh run view <RUN_ID> --json jobs --jq '.jobs[] | [.name, .conclusion, ((.completedAt|fromdate)-(.startedAt|fromdate))] | @tsv'
  ```

- [ ] [LOCAL] 판정 — 네 가지 모두 맞으면 PASS:
  1. 각 deploy 호출에 `CI gate (target SHA must be green)` **job 이 없다**. 그 단계가 `Detect …` job 의 step 으로 있고 결과가 success 다.
  2. 배포 job(`build-and-deploy` · `deploy` · `deploy-<서비스>`)이 Detect 다음에 돌았다.
  3. Web 호출의 `summary` 가 skipped 다.
  4. `Detect …` job 시간이 60초 안이다. 60초를 넘으면 그 run 은 2분이 청구된다. 이것은 실패가 아니고 절감이 줄어드는 것이므로 시간만 기록한다.
- [ ] [LOCAL] 이상 시 복구: 1 · 2 가 다르면(게이트가 안 돌았는데 배포됐거나, 게이트를 통과했는데 배포가 skip 됐으면) 다음 배포 전에 이 PR 을 되돌리는 revert PR 을 연다. 데이터 · 설정 변경이 없어 revert 하나로 원상 복구된다. 3 만 다르면 비용 차이만 있으므로 보고만 한다.

## 6. 검증 계획

- A 의 actionlint PASS 가 PR 병합 전 조건이다. 통합 담당이 확인한다.
- B 는 병합 후 첫 배포 run 하나로 끝낸다.

## 7. 결과 (LOCAL 기록란)

- actionlint 버전 · shellcheck 유무:
- branch 지적 수 / main 기준선 지적 수:
- branch 에만 있는 지적(원문 · 파일:줄):
- 판정(A): PASS | FAIL
- 첫 실행 run ID · 판정(B):

## 문서 정합

해당 없음
