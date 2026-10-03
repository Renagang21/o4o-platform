# CHECK-O4O-CLOUD-RUN-RUNTIME-SA-LEAST-PRIVILEGE-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-04 · **최종 갱신**: 2026-10-04
> **근거 WO/IR**: WO-O4O-CLOUD-RUN-RUNTIME-SA-LEAST-PRIVILEGE-V1 · [IR-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-AUDIT-V1](../investigations/IR-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-AUDIT-V1.md) · 선행 [CHECK-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-REDUCTION-PHASE1-V1](CHECK-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-REDUCTION-PHASE1-V1.md)

Cloud Run 서비스 12개와 migration job 이 `roles/editor` 를 가진 default compute SA 로 돌던 구조를 전용 최소권한 runtime SA(`o4o-runtime`)로 전환했다.
production 전환 · 검증은 완료, workflow 고정(이 PR)은 main 통합 대기다. 남은 실측은 **github-actions 가 좁혀진 actAs 로 배포하는 경로**(§7).

---

## 0. 판정

```text
O4O_RUNTIME_SA_CREATED                   = YES (o4o-runtime@netureyoutube.iam.gserviceaccount.com)
USER_MANAGED_KEY                         = 0
RUNTIME_EDITOR_ROLE                      = NO

ALL_CLOUD_RUN_SERVICES_USE_O4O_RUNTIME_SA = YES (12/12)
MIGRATION_JOB_USES_O4O_RUNTIME_SA        = YES
DEFAULT_COMPUTE_RUNTIME_SERVICE_COUNT    = 0
DEFAULT_COMPUTE_RUNTIME_JOB_COUNT        = 0

SECRET_ACCESS                            = MINIMAL (secret 4개 각각 · project-wide 0)
CLOUD_SQL_RUNTIME_ACCESS                 = PASS
LOGGING_RUNTIME_ACCESS                   = PASS (logWriter · 새 revision 로그 수집 정상)

API_DEPLOY                               = PASS (runtime SA revision 0% → Ready → 100% 전환 → /health/ready 200)
MIGRATION_PATH                           = PASS (runtime SA 로 실행 · Cloud SQL · DB secret · schema assertion PASS)
WEB_DEPLOY                               = PASS (11개 — 0% → tag URL smoke 200 → 원래 traffic 방식으로 전환)
PRODUCTION_SMOKE                         = PASS (공개 도메인 8개 200)

GITHUB_ACTIONS_ACTAS_SCOPE               = O4O_RUNTIME_ONLY
GITHUB_ACTIONS_ACTAS_DEFAULT_COMPUTE     = DENIED (IAM readback — §6)
GITHUB_ACTIONS_DEPLOY_PATH_NARROWED_ACTAS = PENDING (다음 promote / 배포 — §7)

PERMISSION_DENIED_COUNT                  = 0
ROLLBACK_USED                            = NO

CLOUD_RUN_RUNTIME_SA_LEAST_PRIVILEGE     = VALIDATION_PENDING (§7 실측 후 CLOSED)
```

## 1. 전환 전 / 후

```text
전  GitHub Actions SA ── actAs(project 전체 iam.serviceAccountUser) ──▶ default compute SA (roles/editor)
                                                                     └ Cloud Run 12 · migration job 1

후  GitHub Actions SA ── actAs(o4o-runtime SA 리소스 단위만) ──▶ o4o-runtime
                                                                     ├ secretAccessor × 4 (secret 단위)
                                                                     ├ cloudsql.client · logging.logWriter (project)
                                                                     └ storage.objectUser × 2 (bucket 단위)
                                                                     └ Cloud Run 12 · migration job 1
```

## 2. 필요 권한 census (부여 근거)

| 근거 | 결과 → 부여 |
|---|---|
| API `secretKeyRef` | `o4o-encryption-key` · `cafe24-client-id` · `cafe24-client-secret` · `o4o-db-password` → **각 secret 에만** `secretmanager.secretAccessor` |
| migration job `secretKeyRef` | `o4o-db-password` (위에 포함) |
| Cloud SQL 연결 (`run.googleapis.com/cloudsql-instances`) | `o4o-platform-db` → `cloudsql.client` (project — 인스턴스 단위 binding 미지원) |
| 코드의 ADC 사용 (`@google-cloud/storage`) | `o4o-media-library`(미디어 · 상품 이미지) · `o4o-video-temp-output`(영상 임시) 에서 save · delete · read 만, signed URL · ACL 0, 두 bucket 모두 uniform 접근 → **bucket 단위** `storage.objectUser` |
| 코드의 ADC 사용 — 그 외 | Secret Manager API · Vertex · Pub/Sub · Tasks · ID token · metadata server 호출 0. `google-auth-library` 는 Google ID token 검증(공개키)만. Gemini · OpenAI 는 API key |
| 로그 | `logging.logWriter` (project) |
| Web 11개 | env · secret · Cloud SQL 0 — GCP 권한 불필요 |
| compute SA 감사 로그 (최근 7일) | `cloudsql.instances.connect` 만 기록 (GCS data access 로그는 미수집 → 코드 census 로 판단) |

부여하지 않은 것: editor · owner · Cloud Run admin · Artifact Registry write · IAM · WIF · project-wide secret 접근.
`o4o-private-documents` bucket(공급자 문서 업로드 코드의 기본값)은 **존재하지 않아** 권한을 주지 않았다 — 해당 업로드는 전환 전에도 실패하는 경로다(별도 후속).

## 3. 전환 실행 (2026-10-03T22:5x ~ 23:xxZ · production)

| 순서 | 대상 | 방법 · 결과 |
|---|---|---|
| 1 | SA 생성 · 권한 부여 | §2 대로 · user-managed key 0 |
| 2 | github-actions → `o4o-runtime` actAs | SA 리소스 단위 `iam.serviceAccountUser` 먼저 부여 (전환 중 자동 배포가 끼어도 깨지지 않도록) |
| 3 | migration job | `--service-account` 갱신 → 실행 `o4o-api-migrations-drdtv`: Database configuration COMPLETE · PRE/POST schema assertion PASS · `INCREMENTAL_PENDING=0` · `EXECUTED=0` · SUCCESS |
| 4 | `o4o-core-api` | `--service-account --no-traffic --tag` → `o4o-core-api-03810-dus` Ready=True(API 는 DB 연결 · secret 주입 후에만 포트를 연다) · WARNING 이상 로그 0 → traffic 100%(pin) → `/health/ready` 200 × 3 |
| 5 | Web 11개 | 서비스마다 0% revision → runtime SA · Ready=True 확인 → tag URL `/` 200 → 원래 traffic 방식(latest 5 · pin 5 · glucoseview latest)으로 100% |
| 6 | 임시 traffic tag `sa-runtime` | 12개 서비스에서 제거 |
| 7 | github-actions project 범위 `iam.serviceAccountUser` | **제거** |

Web 전환 결과(새 serving revision): store-web-00032-qat · neture-web-01677-joz · k-cosmetics-web-01179-jen · kpa-society-web-02014-zul · pharmacy-hub-web-00269-qak · lecture-web-00028-hoy · kpa-branch-web-00187-zij · signage-player-web-00093-wot · hospital-pharmacy-web-00017-wot · o4o-admin-dashboard-01337-son · glucoseview-web-00184-maw(legacy — SA 만 전환 · 이미지 불변).

Rollback 대상(미사용): 각 서비스의 직전 revision 은 compute SA 로 남아 있다 — `gcloud run services update-traffic <svc> --to-revisions=<직전>=100`.
(단 7번 이후 github-actions 는 compute SA revision 으로 새로 배포할 수 없다 — rollback 은 기존 revision 으로의 traffic 전환으로 한다.)

## 4. 최종 census

```text
Cloud Run services   12/12  serviceAccountName = o4o-runtime@…  (default compute 0)
Cloud Run jobs        1/1   o4o-api-migrations = o4o-runtime@…
o4o-runtime project roles   roles/cloudsql.client · roles/logging.logWriter
o4o-runtime 리소스 binding  secret 4 (secretAccessor) · bucket 2 (storage.objectUser)
user-managed key            0
공개 smoke                  api /health/ready · neture.co.kr · store · pharmacy · retail · pharmacyhub.co.kr · study · admin — 전부 200
```

## 5. github-actions SA

```text
project 역할   전  artifactregistry.writer · iam.serviceAccountUser · run.admin · serviceusage.serviceUsageConsumer
              후  artifactregistry.writer · run.admin · serviceusage.serviceUsageConsumer
actAs          전  project 전체 SA
              후  o4o-runtime 리소스 단위만
```

## 6. compute SA actAs 거부 판정

Policy Troubleshooter API 가 프로젝트에서 비활성(`SERVICE_DISABLED`)이라 — 활성화도 프로젝트 변경이므로 하지 않고 — IAM 상속 경로를 직접 읽었다.
상위 조직 · folder 없음(단일 project) · github-actions 에 project 단위 `serviceAccountUser` · `serviceAccountTokenCreator` · `editor` · `owner` 0 ·
compute SA 의 SA 단위 policy 비어 있음 → **github-actions → compute SA actAs = 경로 없음(DENIED)**.

## 7. 남은 실측 — github-actions 배포 경로 (VALIDATION_PENDING)

위 전환은 소유자 자격으로 수행했다. github-actions 가 **좁혀진 actAs 로** 배포하는 경로는 아직 돌지 않았다.

- workflow 고정(이 PR): `deploy-api.yml`(job create · update · deploy) · `deploy-web-services.yml`(9) · `deploy-admin.yml`(1) 의 13개 명령에 `--service-account=${{ env.RUNTIME_SA }}` 명시 + 회귀 시험(`deploy-workflow-gates.test.mjs`).
  `gcloud run deploy` 는 미지정 설정을 유지하므로 기존 서비스는 이미 runtime SA 로 배포되지만, job 재생성 · 새 서비스는 플래그 없이 compute SA 가 기본값이 되어 actAs 거부로 실패한다 — 명시로 막는다.
- **이 PR merge 후 판정 영향**: 판정기(deploy-workflow-diff)가 11개 서비스 모두 `config` 변경으로 분류 → 다음 Delivery 는 11개 L3 HOLD → `promote.yml` 1회 필요. 값은 현재 SA 와 같아 runtime 영향은 없으며, 그 promote 가 §7 실측(API: AR push · job update · execute · deploy · /health/ready / Web: push · deploy · smoke · 전환)이다.
- permission denied 가 나면: 실패한 권한만 확인해 최소 보완(추측 부여 금지) · 필요 시 traffic 을 직전 revision 으로.

## 8. 후속 (이 WO 범위 밖)

1. default compute SA 의 `roles/editor` · project `iam.serviceAccountUser` 제거 — 이제 Cloud Run workload 는 이 SA 를 쓰지 않는다(다른 소비자 census 선행).
2. github-actions `run.admin` → `run.developer` (`--allow-unauthenticated` 반복의 setIamPolicy 제거 선행).
3. Artifact Registry writer repo 단위 축소 · Cloud Build SA 최소권한화.
4. `o4o-private-documents` bucket 부재 — 공급자 문서 업로드 경로 정리(별도).

`문서 정합: 해당 없음`
