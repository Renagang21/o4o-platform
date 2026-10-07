# WO-O4O-CICD-WEB-VERIFIED-ROLLOUT-POST-SWITCH-VERIFY-ROLLBACK-V1

> 상태: 코드 완료 · 실 runner 검증 = 다음 neture verified 배포(`deploy/2026-10-01-email-password-auth`) · 작성 2026-10-01

## 1. 문제

`deploy-web-services.yml` neture job 의 `rollout_mode=verified` 는 0% 배포 → tag URL smoke → 100% 단일 전환까지만 했다.

| 빈틈 | 결과 |
|---|---|
| 전환 후 공개 URL 검증 · 자동 rollback 없음 | 전환 뒤 이상이 생기면 사람이 수동 rollback (API job 은 `verify` 로 이미 자동 rollback) |
| serving revision / SHA 검증 없음 | label `o4o-commit-sha` 를 붙이기만 하고, 실제로 서빙 중인 revision 이 배포 대상 SHA 인지 확인하지 않음 |
| `switch` 사후 확인 실패 시 | step 실패만 — traffic 은 그대로 둠 |

## 2. 수정 (기존 구조 재사용 · 새 배포 체계 없음)

- `scripts/ci/cloud-run-rollout.mjs`
  - `verify` 에 선택 인자 `--expect-sha` · `--expect-revision`. 공개 URL 2xx 뒤 serving 검증:
    traffic 단일 100% · 그 revision == 새 revision · revision label `o4o-commit-sha` == 기대 SHA. 하나라도 어긋나면 rollback.
  - rollback(공개 검사 실패 · serving 검증 실패 · `rollback` 명령) 뒤 실제 traffic 을 다시 읽어 plan 과 같은지 확인
    (`rollbackConfirmed`). `rollback` 명령은 확인 실패 시 exit 1.
  - `--expect-sha` 없으면 종전과 같다(API `verify` 경로 — 성공 시 gcloud 호출 0).
- `.github/actions/cloud-run-verified-rollout/action.yml`
  - 선택 입력 `verify-url` (기본 `''` = 종전 동작). 주면 finish 끝에
    ① `verify --expect-sha $GITHUB_SHA --expect-revision <smoke 출력 new_revision>`
    ② 전환 step 자체가 실패하면 `rollback`.
- `.github/workflows/deploy-web-services.yml` — **neture job 만** `verify-url: ${{ env.VITE_SERVICE_URL_NETURE }}`.
  다른 서비스 rollout 은 변경 없음.

흐름: `--no-traffic` → tag URL smoke → 100% 전환 → `https://neture.co.kr` 검사 → serving revision·SHA 확인 → PASS 종료 /
FAIL → plan 의 이전 revision 100% → 복귀 확인 → workflow FAIL.

참고: plan 이 `latest` 추종이어도 rollback 은 `--to-revisions=<이전>=100` (pin) 으로 복원한다(API 와 같은 기존 `rollbackArgs`).
rollback 이 일어나면 다음 배포 plan 은 `pinned` 로 기록되고 switch 가 새 revision 에 pin 한다.

## 3. 검증

- `scripts/ci/__tests__/cloud-run-rollout.test.mjs` §S 9건 추가 (SHA 일치 PASS · SHA 불일치/다른 revision/split → rollback ·
  공개 FAIL → rollback · rollback 미반영 → 확인 false · 전환 실패 경로 rollback · expect 없으면 종전 동작).
- CI node:test 목록 8 파일 235/235 PASS (로컬). action/workflow YAML parse OK.
- 실 runner: 다음 neture verified 배포에서 `serving 검증 PASS` 요약 확인 — PENDING.
