# CHECK-O4O-DEFAULT-COMPUTE-SA-EDITOR-RETIREMENT-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-04 · **최종 갱신**: 2026-10-04
> **근거 WO/IR**: WO-O4O-DEFAULT-COMPUTE-SA-EDITOR-RETIREMENT-V1 · [IR-O4O-DEFAULT-COMPUTE-SA-CONSUMER-CENSUS-V1](../investigations/IR-O4O-DEFAULT-COMPUTE-SA-CONSUMER-CENSUS-V1.md) · 선행 [CHECK-O4O-CLOUD-RUN-RUNTIME-SA-LEAST-PRIVILEGE-V1](CHECK-O4O-CLOUD-RUN-RUNTIME-SA-LEAST-PRIVILEGE-V1.md)

소비자가 없는 default compute SA(`<project-number>-compute@developer.gserviceaccount.com`)의 project 역할 5개와 secret binding **4개**를 제거했다(§8 — 1차에 1개, 누락 3개는 2차).
SA 자체는 삭제 · 비활성화하지 않았다. IAM 제거 · runtime 회귀 · 배포 회귀(자연 API 배포 + 통제 Web 배포) 모두 PASS(§8). 7일 감사 로그 관찰은 후속으로 분리했다.

---

## 0. 판정

```text
DEFAULT_COMPUTE_EDITOR_REMOVED               = YES
DEFAULT_COMPUTE_SERVICE_ACCOUNT_USER_REMOVED = YES
DEFAULT_COMPUTE_RUN_ADMIN_REMOVED            = YES
DEFAULT_COMPUTE_AR_WRITER_REMOVED            = YES
DEFAULT_COMPUTE_LOG_WRITER_REMOVED           = YES
DEFAULT_COMPUTE_SECRET_BINDING_REMOVED       = YES (4/4)
DEFAULT_COMPUTE_PROJECT_ROLE_COUNT           = 0
DEFAULT_COMPUTE_SECRET_BINDING               = 0
DEFAULT_COMPUTE_BUCKET_BINDING               = 0

DEFAULT_COMPUTE_ACTIVE_CONSUMER_COUNT        = 0
DEFAULT_COMPUTE_ACTIVITY_AFTER_RETIREMENT    = 0 (00:39Z ~ 05:4xZ)

CLOUD_RUN_RUNTIME_REGRESSION                 = PASS
MIGRATION_RUNTIME_REGRESSION                 = PASS
API_DEPLOY                                   = PASS (자연 L2 Delivery 37179088557)
MIGRATION_PATH                               = PASS
WEB_DEPLOY                                   = PASS (store-web 통제 배포 37180648718)
DEPLOYMENT_REGRESSION                        = PASS
PRODUCTION_SMOKE                             = PASS
PERMISSION_DENIED                            = 0

UNEXPECTED_PERMISSION_FAILURE                = 0
ROLLBACK_USED                                = NO

DEFAULT_COMPUTE_SA_PRIVILEGE_RETIREMENT      = CLOSED
POST_RETIREMENT_ACTIVITY_OBSERVATION         = DEFERRED_7D
```

## 1. 제거 전 재확인 (2026-10-04T00:3xZ)

| 항목 | 결과 — IR 과 일치 |
|---|---|
| project 역할 | `editor` · `iam.serviceAccountUser` · `run.admin` · `artifactregistry.writer` · `logging.logWriter` |
| secret binding | `o4o-encryption-key` 에 `secretAccessor` 1 |
| 실행 주체 | Cloud Run 12/12 · migration job 1/1 = `o4o-runtime` — compute SA 0 |
| compute SA 활동 (runtime 전환 2026-10-03T23:00Z 이후) | 0 |
| Cloud Build | 새 build 0 (마지막 2026-05-12) |
| 진행 중 배포 | 0 (PR CI 1 뿐) |

## 2. 제거 (역할마다 단독 실행 · 매번 readback)

| 시각 (감사 로그 SetIamPolicy) | 제거 | readback 남은 역할 |
|---|---|---|
| 00:38:47Z | `roles/editor` | 4 |
| 00:38:56Z | `roles/iam.serviceAccountUser` | 3 |
| 00:39:03Z | `roles/run.admin` | 2 |
| 00:39:10Z | `roles/artifactregistry.writer` | 1 |
| 00:39:17Z | `roles/logging.logWriter` | **0** |
| 00:39Z | secret `o4o-encryption-key` 의 compute SA `secretAccessor` | 그 secret 의 compute SA binding 0 · `o4o-runtime` binding 유지 |

전체 IAM policy 를 다시 쓰지 않았다. 다른 principal 의 binding 은 바꾸지 않았다.

## 3. Rollback (준비만 · 미사용)

```text
gcloud projects add-iam-policy-binding netureyoutube --member=serviceAccount:<project-number>-compute@developer.gserviceaccount.com --role=<제거한 역할> --condition=None
gcloud secrets add-iam-policy-binding o4o-encryption-key --project=netureyoutube --member=serviceAccount:<project-number>-compute@developer.gserviceaccount.com --role=roles/secretmanager.secretAccessor
```

권한 부족이 실제로 나면 실패한 권한만 복원하고 원인을 기록한다.

## 4. 회귀 확인 (제거 직후)

```text
runtime census     Cloud Run 12/12 · migration job 1/1 = o4o-runtime (변화 없음)
github-actions     project 역할 artifactregistry.writer · run.admin · serviceusage.serviceUsageConsumer · actAs = o4o-runtime 리소스 단위만 (변화 없음)
공개 smoke         api /health/ready · neture.co.kr · store · pharmacy · retail · pharmacyhub.co.kr · study · admin — 전부 200
API 오류 로그      제거 이후 permission · secret · cloudsql · 403 관련 ERROR 0
migration runtime  o4o-api-migrations-88txj 실행 SUCCESS (INCREMENTAL_PENDING=0 · EXECUTED=0)
```

## 5. 남은 검증 — 다음 자연 배포

github-actions 배포 경로는 2026-10-03 부터 compute SA 를 쓰지 않는다(actAs 대상 = `o4o-runtime`). 그래도 확인 전에는 PASS 로 적지 않는다.
다음 자연 API · Web 배포에서 build · push · migration Job · deploy · smoke · 전환이 정상인지 확인하고 이 문서에 절을 추가한다.

## 6. 감사 로그 관찰

- 제거 직후: compute SA principal 호출 0.
- 관찰 기간: 다음 자연 배포 1회를 포함해 최소 7일. Admin Activity 로그로 compute SA principal 호출과 actAs 시도를 본다.
  Data Access 로그는 수집하지 않으므로(IR §5) GCS · Secret 읽기는 실행 주체 0 근거로 판단한다.

## 7. 후속

- **SA 비활성화 권고: 관찰 통과 후 YES.** `gcloud iam service-accounts disable` (삭제는 비권장 — 되돌리기 어렵고 일부 Google 기능이 기본 SA 존재를 가정한다).
  비활성화하면 Cloud Build 기본 SA 경로는 실행 자체가 실패한다 — Source 배포 금지(CLAUDE.md §6)와 일치.
- 다음 hardening: github-actions `run.admin` → `run.developer` · github-actions AR writer repo 단위 축소 · Cloud Build SA 최소권한화.

## 8. 마감 검증 (2026-10-04T05:1x ~ 05:4xZ)

**secret binding 누락 정정** — IR census 와 §1 은 compute SA 의 secret binding 을 1개(`o4o-encryption-key`)로 적었으나, 실제로는
`o4o-db-password` · `cafe24-client-id` · `cafe24-client-secret` 에도 `secretAccessor` 가 있었다. census 의 secret 순회가 Windows 줄바꿈(`\r`)이 붙은
secret 이름으로 실패해 3개를 건너뛴 것이다(이름을 직접 지정해 재확인). 실행 주체 0 판단은 같으므로 3개를 제거했다 → compute SA secret binding **0/4** ·
`o4o-runtime` binding 4/4 유지. IR §1 에 정정 주석을 남겼다.

| 검증 | 근거 | 결과 |
|---|---|---|
| API 배포 (자연) | Delivery run `37179088557` (main `1497a9d26` · workflow_run · LEVEL_2 자동) — job 05:12~05:16Z | AR push → migration Job `o4o-api-migrations-4q6pm` SUCCESS(pending 0) → `o4o-core-api-03816-jiw` Ready=True → 전환 → `/health/ready` 200 · 권한 오류 0 |
| migration (secret 3 제거 후) | 직접 실행 `o4o-api-migrations-2bkb6` 05:42Z | SUCCESS · `INCREMENTAL_PENDING=0` · `EXECUTED=0` |
| Web 배포 (통제) | `deploy-web-services.yml` service=store · run `37180648718` (main · 소유자 dispatch · github-actions WIF) | gcr.io push → `store-web-00038-tex` 0% → tag URL 직접 smoke → 100% 전환 · 권한 오류 0 · runtime SA `o4o-runtime` |
| 최종 readback | — | compute SA project 역할 0 · secret binding 0 · bucket binding 0 · 00:39Z 이후 principal 호출 0 · Cloud Run 12/12 `o4o-runtime` |
| 공개 smoke | api `/health/ready` · neture.co.kr · store · pharmacy · retail · pharmacyhub.co.kr · study · admin | 전부 200 |

대규모 재배포는 하지 않았다 — API 는 자연 배포 1회, Web 은 대표 1개(store)만 통제 배포했다.

**판정: `DEFAULT_COMPUTE_SA_PRIVILEGE_RETIREMENT = CLOSED`** · 7일 감사 로그 관찰은 `POST_RETIREMENT_ACTIVITY_OBSERVATION = DEFERRED_7D`(2026-10-11 무렵 단순 확인).

`문서 정합: 해당 없음`
