# CHECK-O4O-GITHUB-ACTIONS-RUN-ADMIN-TO-DEVELOPER-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-04 · **최종 갱신**: 2026-10-04
> **근거 WO/IR**: WO-O4O-GITHUB-ACTIONS-RUN-ADMIN-TO-DEVELOPER-V1 · [IR-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-AUDIT-V1](../investigations/IR-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-AUDIT-V1.md)

GitHub Actions production 배포 SA 의 Cloud Run 권한을 `roles/run.admin` → `roles/run.developer` 로 줄이기 위해, 반복 배포의 IAM 변경(`--allow-unauthenticated`)을 먼저 제거한다.
1단계 workflow 정리(PR #293 · merge `2bfa3ee55`) → 2단계 역할 교체 + promote 실측(§6) 모두 완료.

---

## 0. 판정

```text
GITHUB_ACTIONS_RUN_ADMIN_REMOVED     = YES
GITHUB_ACTIONS_RUN_DEVELOPER_ADDED   = YES

DEPLOY_IAM_MUTATION_DEPENDENCY       = REMOVED
PUBLIC_INVOKER_POLICY_PRESERVED      = PASS (12/12 allUsers → run.invoker · 배포 중 Cloud Run SetIamPolicy 호출 0)

API_DEPLOY                           = PASS
MIGRATION_PATH                       = PASS
WEB_DEPLOY                           = PASS (Admin 1 · Web 9)
TRAFFIC_SWITCH                       = PASS
ROLLBACK_PATH                        = PASS (복귀 = 전환과 같은 update-traffic · run.services.update — §6)
PRODUCTION_SMOKE                     = PASS (공개 도메인 8개 200)

PERMISSION_DENIED_COUNT              = 0
ROLLBACK_USED                        = NO

GITHUB_ACTIONS_RUN_LEAST_PRIVILEGE   = CLOSED
```

## 1. run.admin 과 run.developer 차이 (gcloud iam roles describe)

`run.admin` 에만 있는 권한: `run.services.setIamPolicy` · `run.jobs.setIamPolicy` · `run.instances.setIamPolicy` · `run.workerpools.setIamPolicy` ·
`run.{services,jobs}.{create,delete}TagBinding`(리소스 관리 tag — traffic tag 아님).
배포 경로에 필요한 `run.services.{create,get,update}` · `run.revisions.{get,list}` · `run.jobs.{create,update,run,runWithOverrides}` · `run.executions.get` ·
`run.routes.*` · `run.services.getIamPolicy` 는 모두 `run.developer` 에 있다. traffic tag(`--tag`) · `update-traffic` 는 `run.services.update`.

## 2. IAM 변경 의존 census

| 위치 | IAM 변경 | 조치 |
|---|---|---|
| `deploy-api.yml` `gcloud run deploy` | `--allow-unauthenticated` → 매 배포 `run.services.setIamPolicy` | **제거** |
| `deploy-web-services.yml` 9개 deploy | 같음 | **제거** |
| `deploy-admin.yml` deploy | 같음 | **제거** |
| `cloud-run-rollout.mjs` · verified rollout action | `services describe` · `revisions describe` · `update-traffic` 만 | 없음 |
| job create · update · execute | IAM 무관 | 없음 |

`--allow-unauthenticated` 를 빼고 기존 서비스에 배포하면 gcloud 는 서비스 IAM 을 건드리지 않는다 — 기존 `allUsers → run.invoker` 가 그대로 유지된다.
회귀 시험: `deploy-workflow-gates.test.mjs` "Cloud Run IAM 무변경 배포" — deploy workflow 3 · delivery · promote · verified rollout action 에 `--allow-unauthenticated` · IAM policy 명령 0, rollout 스크립트 IAM 호출 0.

## 3. 공개 invoker 현황 (변경 전 · 2026-10-04)

12/12 서비스 `roles/run.invoker: allUsers` — o4o-core-api(ingress = 내부 + LB) · o4o-admin-dashboard · neture · k-cosmetics · kpa-society · pharmacy-hub ·
lecture · store · kpa-branch · signage-player · hospital-pharmacy · glucoseview(legacy). 정책 변경 0.

## 4. 새 서비스 최초 생성 시

`run.developer` 는 서비스를 만들 수 있지만 IAM 을 설정할 수 없다 → 새 서비스는 **비공개로 생성**된다(배포 자체는 성공).
공개가 필요한 새 서비스는 소유자가 최초 1회 부여한다:

```text
gcloud run services add-iam-policy-binding <service> --region=asia-northeast3 --project=netureyoutube --member=allUsers --role=roles/run.invoker
```

이 1회 작업을 이유로 배포 SA 에 `run.admin` 을 두지 않는다. 새 서비스 추가는 workflow 수정을 수반하는 통제된 작업이라 그 WO 의 체크리스트에 포함한다.

## 5. 2단계 계획 (main 통합 후)

```text
1. Delivery: 11 서비스 config 변경 → L3 HOLD (예상)
2. github-actions: roles/run.developer 추가 → readback → roles/run.admin 제거 → readback
3. promote.yml 1회 (서비스 전체) — API(AR push · migration job update/execute · 0% → Ready → 전환 → /health/ready) · Admin · Web 9
4. 확인: 권한 오류 0 · 12 서비스 allUsers invoker 유지 · 공개 smoke
5. rollback 경로: cloud-run-rollout 의 복귀는 traffic 전환과 같은 update-traffic(run.services.update) — 전환 실측으로 같은 권한 경로를 검증
실패 시: run.admin 재부여(1줄) 후 원인 기록
```

## 6. 2단계 실행 · 실측 (2026-10-04)

```text
역할 교체   roles/run.developer 추가 → readback(4) → roles/run.admin 제거 → readback
            github-actions project 역할: artifactregistry.writer · run.developer · serviceusage.serviceUsageConsumer
Delivery    run 37187018601 (main 2bfa3ee55) — 11 서비스 LEVEL_3 (deploy-config) AUTO_DEPLOY_BLOCKED → HOLD (예상)
promote     run 37187730630 (sha 2bfa3ee55 · 서비스 전체 · 08:04Z) — success · commit status production = DEPLOYED
  API       AR push → migration Job o4o-api-migrations-vjr6s SUCCESS (INCREMENTAL_PENDING=0 · EXECUTED=0)
            → o4o-core-api-03819-del Ready=True (traffic 0%) → 전환 100%(pin) → /health/ready 200
  Admin·Web o4o-admin-dashboard-01343-kuh · neture-web-01683-fon · k-cosmetics-web-01185-buh · kpa-society-web-02020-zab ·
            pharmacy-hub-web-00275-yef · lecture-web-00034-siw · store-web-00041-ceq · kpa-branch-web-00193-mar ·
            signage-player-web-00099-vav · hospital-pharmacy-web-00023-sef — Report 11/11 DEPLOYED (revision-label 2bfa3ee55)
            예: store-web 0% 배포 → tag URL 직접 smoke → 전환 100%(--to-latest)
권한 오류   11 배포 job 로그에서 PERMISSION_DENIED · permission denied · setIamPolicy · "Setting IAM policy failed" · Forbidden 0
IAM 무변경  promote 시간대 Cloud Run SetIamPolicy 감사 로그 0 · 12/12 서비스 allUsers → run.invoker 유지
공개 smoke  api /health/ready · neture.co.kr · store · pharmacy · retail · pharmacyhub.co.kr · study · admin — 전부 200
```

rollback 경로: `cloud-run-rollout.mjs` 의 복귀는 `gcloud run services update-traffic --to-revisions=<직전>=100` 으로, 위 전환과 같은 API(`run.services.update`)다.
그 권한은 이번 전환 11회로 run.developer 에서 실측됐다(복귀만을 위해 배포를 일부러 실패시키지 않았다).

## 7. 후속

1. github-actions Artifact Registry writer 를 repository 단위로 축소.
2. Cloud Build SA 최소권한화 · default compute SA 비활성화 검토(7일 관찰 후).

`문서 정합: 해당 없음`
