# CHECK-O4O-DELIVERY-CANCELLED-RUN-REPORT-V1

> **WO**: WO-O4O-DELIVERY-CANCELLED-RUN-REPORT-V1 (GitHub 배포 과정 정비 — 사용자 지시 2026-11-07)
> **일자**: 2026-11-07
> **변경**: `scripts/ci/deploy-orchestrate.mjs` (report 판정) · `.github/workflows/delivery.yml` (report step env 1줄) ·
> `scripts/ci/__tests__/deploy-orchestrate.test.mjs` (계약 4건)

## 판정

```text
ROOT_CAUSE_IDENTIFIED            = YES
CANCELLED_RUN_REPORTED_AS_FAILED = FIXED (CANCELLED · commit status 'error')
FAILED_SEMANTICS                 = 불변 (취소가 아닌 run 의 미도달 = FAILED · 섞이면 FAILED 우선)
DEPLOY_RISK_OF_THIS_CHANGE       = LEVEL_1 · deploy_required=false (deploy-risk.mjs --base origin/main --head HEAD)
TESTS                            = PASS (scripts/ci 451/451 · deploy-orchestrate 61/61)
ACTIONLINT                       = PASS (delivery.yml)

PRODUCTION_DB_WRITE              = 0
MANUAL_PRODUCTION_DEPLOY         = 0
DEPLOY_FREEZE_CHANGED            = NO
```

## 1. 조사 범위

2026-10-24 ~ 11-07 의 Delivery run 195건 · job 2,831건(Actions jobs API), 같은 기간 deploy-web-services 수동 run 33건.

| 항목 | 결과 |
|---|---|
| Delivery run 결론 | success 193 · cancelled 2 |
| 배포 job(API · Admin · Web) 실패 | 0 |
| Report job | success 56 · **failure 1** · skipped 137 |
| 배포가 실제로 일어난 run | 56 / 194 |

배포 job 자체는 2주간 실패가 없었다. 유일한 Report 실패 1건이 아래 오기록이다.

## 2. 원인 — 취소된 run 을 배포 실패로 기록

Delivery `009d8f4f…` (run 42183805373 · 2026-11-06):

1. `classify` 의 모든 step 이 success 였고 `store = AUTO_DEPLOY` 결정과 commit status `DEPLOYING` 을 남겼다.
2. 그 직후 run 이 취소됐다 → `classify` job 결론 = `cancelled`, 배포 job 4개는 `skipped`(시작 전).
3. `report` 는 `if: always() && …` 라 취소된 run 에서도 돌았고, store 의 serving SHA 가 target 이 아니므로
   **`FAILED` · commit status `failure`** 로 기록했다. 실제로는 배포를 시도하지 않았다.

`report` 는 classify 기록과 serving SHA 만 보고, 배포 job 이 **돌았는지**는 보지 않았다.

## 3. 수정

- `delivery.yml` report step 에 `DELIVERY_NEEDS: ${{ toJSON(needs) }}` 를 넘긴다.
- `deliveryJobs(needs)` — classify · deploy-api · deploy-web-after-api · deploy-web-parallel · deploy-admin 결과 중
  하나라도 `cancelled` 면 이 run 은 취소된 것으로 본다(run 이 취소되면 진행 중 job 은 cancelled, 시작 전 job 은 skipped).
  needs 를 못 읽으면 종전 판정 그대로(취소 아님).
- `finalizeStates` 판정 순서:

  | 조건 | 상태 | commit status |
  |---|---|---|
  | serving == target | `DEPLOYED` | success |
  | run 취소 · target 미도달 | **`CANCELLED`** (신규) | **error** |
  | API 실패 뒤 의존 프런트 | `HELD_DEPENDENCY` | pending |
  | 그 밖 target 미도달 | `FAILED` | failure |

- 전체 상태 우선순위는 `FAILED` > `CANCELLED` > 나머지 — 실패를 취소로 가리지 않는다.
- description 에 `cancelled: <서비스> (re-run Delivery)` 를 붙인다. report job 은 `FAILED` 와 같이 exit 1 이다
  (취소된 run 이라 run 결론은 어차피 cancelled).

## 4. 남은 판단 · 범위 밖

- job 이 `timeout-minutes` 로 끝나면 결과가 `cancelled` 로 보고될 수 있다. 그 경우도 `CANCELLED`(error · 빨간 표시)로
  남아 성공으로 보이지 않는다. 원인 확인은 해당 job 로그로 한다.
- 취소된 target 이 main HEAD 이면 다음 main push 의 Delivery 가 누적 diff 로 처리한다. 다음 push 가 없으면
  Delivery run 을 다시 실행(re-run)한다 — 별도 배포 경로는 만들지 않았다.
- deploy-web-services 수동 실패 14건 중 12건은 `pharmacy-private-preparation`(약국 서비스 전환 작업)의 안전 gate 거절
  (`Production write gate requires the current main SHA` 등)이다. 설계대로의 거절이며 이번 범위 밖이다.

## 문서 정합

발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건

- `deploy-web-services.yml` 상단 `on:` 주석 · `scripts/ci/deploy-orchestrate.mjs` 머리 주석이 은퇴한 `deploy-auto.yml` 을
  현행 진입점으로 설명한다(코드 주석 · 기준 문서 아님). 배포 workflow 주석 정리는 다음 정비 항목에서 처리한다.
