# CHECK-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-REDUCTION-PHASE1-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-03 · **최종 갱신**: 2026-10-04
> **근거 WO/IR**: WO-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-REDUCTION-PHASE1-V1 · [IR-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-AUDIT-V1](../investigations/IR-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-AUDIT-V1.md)

GitHub Actions production SA(`github-actions@…`, WIF impersonation 대상)에서 감사상 미사용인 프로젝트 역할 3개를 제거했다.
**IAM mutation 은 완료**, **실제 배포 경로 검증은 제거 이후의 실제 배포 2건(API 2 · Web 2)에서 PASS** (§6).
검증만을 위한 수동 재배포는 만들지 않았다(내용 변화 없는 production revision 생성 금지 — 사용자 결정 2026-10-03).

---

## 0. 판정

```text
STORAGE_ADMIN_REMOVED              = YES
CLOUDBUILD_BUILDS_EDITOR_REMOVED   = YES
CLOUDSQL_CLIENT_REMOVED            = YES
GITHUB_ACTIONS_SA_ROLE_COUNT       = 4

GCR_REDIRECT_CONFIRMED             = PASS (REDIRECTION_FROM_GCR_IO_ENABLED)
WEB_IMAGE_PUSH                     = PASS (kpa-branch-web · store-web — gcr.io → AR)
WEB_VERIFIED_ROLLOUT               = PASS (0% 배포 → tag URL 직접 smoke → 100% 전환 · rollback step 미실행)
API_IMAGE_PUSH                     = PASS (2회)
MIGRATION_JOB_PATH                 = PASS (job update · execute 2회 — 1회는 실제 incremental 1건 적용)
API_VERIFIED_ROLLOUT               = PASS (Ready=True · 전환 100%)
API_HEALTH_READY                   = PASS (/health/ready 200 — 2회 + 2026-10-04 재확인)

ROLLBACK_PREPARED                  = YES
ROLLBACK_USED                      = NO
MANUAL_REDEPLOY_USED               = NO
UNEXPECTED_PERMISSION_FAILURE      = 0

PHASE1_LEAST_PRIVILEGE_REDUCTION   = CLOSED
```

## 1. 사전 확인 (변경 직전)

| 항목 | 결과 |
|---|---|
| SA 프로젝트 역할 | 7개 — 감사 당시와 동일 (`artifactregistry.writer` · `cloudbuild.builds.editor` · `cloudsql.client` · `iam.serviceAccountUser` · `run.admin` · `serviceusage.serviceUsageConsumer` · `storage.admin`) |
| GCR → Artifact Registry redirect | `REDIRECTION_FROM_GCR_IO_ENABLED` — web 이미지(`gcr.io/…`) push 는 AR writer 로 처리된다 |
| workflow · action 참조 (`origin/main`) | `gcloud storage` 0 · `gsutil` 0 · `gcloud builds` 0 · `gcloud sql` 0 |
| 진행 중 배포 | 0 (진행 중 run 은 PR CI 3개뿐 — main 아님) |
| 실행 중 migration | 0 (마지막 `o4o-api-migrations` 실행 2026-10-03T04:07Z 완료) |
| `DEPLOY_FREEZE` | `false` (변경하지 않음) |

## 2. 변경

역할마다 `gcloud projects remove-iam-policy-binding … --condition=None` 을 **하나씩** 실행하고, 매번 live readback 으로 그 역할만 사라졌는지 확인했다. 전체 IAM policy 를 다시 쓰지 않았다.

| 순서 | 제거 역할 | readback |
|---|---|---|
| 1 | `roles/storage.admin` | 6개 남음 · 대상만 제거 |
| 2 | `roles/cloudbuild.builds.editor` | 5개 남음 · 대상만 제거 |
| 3 | `roles/cloudsql.client` | 4개 남음 · 대상만 제거 |

남은 역할: `roles/artifactregistry.writer` · `roles/iam.serviceAccountUser` · `roles/run.admin` · `roles/serviceusage.serviceUsageConsumer` (WO KEEP 목록과 일치).
변경하지 않은 것: WIF provider · runtime SA · workflow · secret · DB · 다른 principal 의 binding.

## 3. Rollback (준비만 · 미사용)

권한 부족이 실제로 발생하면 **실패한 역할만** 재부여하고 readback 한다. 추측으로 다른 역할을 추가하지 않는다.

```text
gcloud projects add-iam-policy-binding netureyoutube --member=serviceAccount:github-actions@netureyoutube.iam.gserviceaccount.com --role=roles/storage.admin --condition=None
gcloud projects add-iam-policy-binding netureyoutube --member=serviceAccount:github-actions@netureyoutube.iam.gserviceaccount.com --role=roles/cloudbuild.builds.editor --condition=None
gcloud projects add-iam-policy-binding netureyoutube --member=serviceAccount:github-actions@netureyoutube.iam.gserviceaccount.com --role=roles/cloudsql.client --condition=None
```

## 4. 남은 검증 — 다음 자연 배포에서

변경 직후 최신 main(`7c840a63e`) 판정은 11개 서비스 모두 `NO_DEPLOY` 였다. 다음 실제 배포가 일어날 때 아래를 확인하고 이 문서에 절을 추가한다.

```text
Web (자연 배포 1회)   image push(gcr.io → AR) → Cloud Run deploy → tag URL 직접 smoke → traffic switch
API (자연 배포 1회)   AR push → migration Job create/update · execute → --set-cloudsql-instances 배포
                     → direct readiness → traffic switch → /health/ready 200
```

- `cloudsql.client` 제거 검증을 위해 GitHub runner 에서 DB 에 직접 연결하는 시험은 만들지 않는다 — DB 연결은 migration · runtime SA 의 책임이다.
- 어느 단계든 permission denied 가 나면: STOP → 실패한 역할만 §3 으로 재부여 → readback → 원인 기록.
- 두 검증이 모두 PASS 하면 상태를 COMPLETED 로 바꾸고 판정을 `PHASE1_LEAST_PRIVILEGE_REDUCTION = CLOSED` 로 고친다 → §6 에서 충족.

## 5. 다음 단계와의 관계

- **Runtime SA 최소권한 WO(`WO-O4O-CLOUD-RUN-RUNTIME-SA-LEAST-PRIVILEGE-V1`)는 이 자연 검증이 끝나기 전까지 착수하지 않는다** — IAM 축소를 겹치면 다음 배포 실패 시 원인 분리가 어렵다.
- 순서: runtime SA 분리(default compute SA · `roles/editor` 사용 종료) → `iam.serviceAccountUser` 를 새 runtime SA 리소스로 한정 → `run.admin` → `run.developer`(`--allow-unauthenticated` 반복 제거 후) → 선택: AR writer repo 단위 축소.
- §6 으로 자연 검증이 끝났으므로 Runtime SA WO 착수 조건은 충족됐다.

## 6. 실 배포 경로 검증 (2026-10-04 기록)

IAM 제거 시각(감사 로그 `SetIamPolicy` REMOVE): 2026-10-03 11:57:38Z `storage.admin` · 11:58:23Z `cloudbuild.builds.editor` · 11:58:59Z `cloudsql.client`.
그 이후 실제 배포는 아래 2건이다(같은 SA · 같은 reusable deploy 경로 — `promote.yml` → `delivery.yml` → `deploy-api` / `deploy-web-services`).
같은 시간대 Delivery 자동 run 6건은 전부 배포 job 0(NO_DEPLOY)이었다. 검증용으로 만든 배포는 0 이다.

| 배포 | API | Web |
|---|---|---|
| Promote run `37123488762` (2026-10-03 12:37Z · target `35979b119`) | AR push → migration Job `o4o-api-migrations-wmj9s` 성공(`INCREMENTAL_PENDING=1` · `EXECUTED=1`) → `o4o-core-api-03804-viw` 0% 배포 → Ready=True → 전환 100% → `/health/ready` 200 | `kpa-branch-web`: gcr.io push → `kpa-branch-web-00184-pef` 0% 배포 → tag URL 직접 smoke PASS → 전환 100% |
| Promote run `37130940852` (2026-10-03 14:48Z · target `a36a36741`) | AR push → migration Job `o4o-api-migrations-gbr55` 성공(`PENDING=0` · `EXECUTED=0`) → `o4o-core-api-03807-xos` 0% 배포 → Ready=True → 전환 100% → `/health/ready` 200 | `store-web`: gcr.io push → `store-web-00029-qun` 0% 배포 → tag URL 직접 smoke PASS → 전환 100% |

- 4개 배포 job 로그에서 `PERMISSION_DENIED` · `permission denied` · `does not have … permission` · `Forbidden` 0건.
- "Rollback after failed switch" step 은 4개 job 모두 `outcome=skipped` (전환 실패 0).
- 2026-10-04 재확인: `o4o-core-api` serving `o4o-core-api-03807-xos` 100% · `https://api.neture.co.kr/health/ready` 200.
- migration Job 의 update · execute 와 `--set-cloudsql-instances` 배포는 `run.admin` · `iam.serviceAccountUser` 로 동작했다 — 제거한 `cloudsql.client` 는 배포자 경로에 필요 없음이 실측으로 확인됐다.

결론: 제거한 3개 역할은 실제 배포 경로에 필요하지 않았다. rollback 0 · 추가 부여 0.

`문서 정합: 해당 없음`
