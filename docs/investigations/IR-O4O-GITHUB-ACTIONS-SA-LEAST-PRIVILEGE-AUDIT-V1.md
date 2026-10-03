# IR-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-AUDIT-V1

> **조사 전용 IR — IAM · 배포 · DB 변경 없음 (AUDIT ONLY · NO IAM MUTATION).**
> GitHub Actions production 배포가 사용하는 GCP Service Account 의 현재 권한과, workflow 가 실제로 필요로 하는 권한을 비교한다.
> 실제 축소는 후속 `WO-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-REDUCTION-V1` 의 책임이다.

- **작성일:** 2026-10-03
- **분류:** Investigation Report (read-only)
- **WO:** WO-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-AUDIT-V1
- **기준 시점:** `origin/main` = `f324173b1`
- **선행 기록:** [CHECK-O4O-GITHUB-ACTIONS-GCP-WIF-CUTOVER-V1](../checks/CHECK-O4O-GITHUB-ACTIONS-GCP-WIF-CUTOVER-V1.md) (WIF 전환 · "SA 프로젝트 역할 7개 무변경") · [CHECK-O4O-PRODUCTION-SECRET-ENVIRONMENT-MIGRATION-AND-COLLABORATOR-SAFETY-CLOSURE-V1](../checks/CHECK-O4O-PRODUCTION-SECRET-ENVIRONMENT-MIGRATION-AND-COLLABORATOR-SAFETY-CLOSURE-V1.md)

---

## 0. 결론 요약

```text
LEAST_PRIVILEGE_RISK       = HIGH
IAM_REDUCTION_RECOMMENDED  = YES
```

- 직접 부여된 `owner` / `editor` 는 **없다.** Secret Manager 접근도 **없다.** user-managed key 도 **0** 이다.
- 그러나 7개 역할 중 **3개는 workflow 가 쓰지 않는다** (`storage.admin` · `cloudbuild.builds.editor` · `cloudsql.client`).
  그중 `storage.admin` 은 전 bucket 의 **IAM 변경 + 데이터 읽기/삭제**, `cloudbuild.builds.editor` 는 **editor 권한 SA 로 임의 빌드 실행** 경로를 연다.
- **구조적 상한:** github-actions SA 는 runtime SA(default compute SA) 에 `actAs` 할 수 있고, 그 runtime SA 는 **`roles/editor`** 를 갖는다.
  따라서 배포 권한만으로도 "editor 로 실행되는 코드 배포" 가 가능하다 — 배포라는 목적상 피할 수 없는 경로이며,
  **github-actions SA 역할만 줄여서는 이 상한이 내려가지 않는다.** 이 부분은 runtime SA 분리 WO 로 따로 다뤄야 한다 (§11).
- 실제 악용 가능성은 WIF provider 조건(저장소 · `production` environment · main/`deploy/*` · 소유자 dispatch · 허용 workflow 5종)이 크게 낮춘다.
  이번 위험도는 "그 경계가 뚫렸을 때 피해 범위" 기준이다.

---

## 1. 조사 방법과 한계

| 항목 | 방법 |
|---|---|
| SA 식별 | `.github/workflows/*.yml` 의 `google-github-actions/auth` 블록 전수 grep |
| 역할 census | `gcloud projects get-iam-policy` · `get-ancestors` · SA / Cloud Run service · job / Artifact Registry repo / GCS bucket / Secret 별 `get-iam-policy` |
| 역할 내용 | `gcloud iam roles describe` (setIamPolicy · serviceAccountKeys 포함 여부) |
| 실제 사용 | Cloud Audit Logs **Admin Activity** 30일 (`principalEmail` = github-actions SA) · Cloud Build 생성 이력 400일 |
| workflow capability | workflow 의 `gcloud` · `docker` 명령 + `scripts/ci/*.mjs` 가 호출하는 `gcloud` |

**한계 (판정에 반영):**

- **Cloud Asset API · Recommender API 가 비활성**이다. 활성화는 변경 행위이므로 하지 않았다. 그래서
  ① 리소스 IAM 은 주요 유형(Cloud Run · AR · GCS · Secret Manager · SA)만 개별 조회했고,
  ② IAM Recommender 의 "미사용 권한" 판정은 없다.
- **Data Access 로그는 기본 비활성**이라 읽기 · 이미지 push(AR) · describe/list 사용은 로그로 증명되지 않는다 → workflow 정적 분석으로 판정.
- 프로젝트는 조직/폴더 아래가 아니다(`get-ancestors` = 프로젝트 단독) → 상속 binding 없음.

---

## 2. 조사 대상 SA 식별 (§3)

```text
GITHUB_ACTIONS_SA = github-actions@netureyoutube.iam.gserviceaccount.com   (uniqueId 115151270512333331237)
WIF provider      = projects/117791934476/locations/global/workloadIdentityPools/github-actions/providers/o4o-platform
```

- 사용 workflow: `delivery.yml` · `deploy-api.yml` · `deploy-admin.yml` · `deploy-web-services.yml` · `gcp-wif-auth-smoke.yml` — 모두 같은 SA · 같은 provider.
  `deploy-auto.yml` 에도 auth 블록이 남아 있으나 은퇴 workflow 이며 provider 조건의 허용 목록에 없어 인증 불가.
- 프로젝트의 SA 는 2개뿐: github-actions SA · default compute SA (`117791934476-compute@…`). **production 용 SA 다중 사용 없음.**

---

## 3. WIF 경계 (A) vs 리소스 권한 (B) (§5)

**A. GitHub principal → SA (WIF boundary) — 이번 축소 대상 아님**

- SA IAM policy: `roles/iam.workloadIdentityUser` → `principalSet://…/github-actions/attribute.repository_id/964347291` **1건만**.
- provider `attributeCondition` 요지: repository_id · owner_id · repository 일치 + `environment == 'production'` + ref ∈ {`refs/heads/main`, `refs/tags/deploy/*`} +
  event ∈ {`workflow_run`, `workflow_dispatch`} + dispatch 는 소유자 actor 만 + `job_workflow_ref` 가 위 5개 workflow 중 하나.
- 30일 `GenerateAccessToken` 43건의 대상은 **전부 github-actions SA 자기 자신**(uniqueId 일치) — WIF 로그인 단계. 다른 SA 토큰 발급 0건.

**B. SA → GCP 리소스 권한 — 이번 감사 대상 (아래)**

---

## 4. 현재 IAM binding census (§4)

### 4-1. 프로젝트 수준 (`netureyoutube`) — 7개, 조건 없음

| # | ROLE | SCOPE | GRANTED_TO | SOURCE |
|---|---|---|---|---|
| 1 | `roles/artifactregistry.writer` | project | github-actions SA | project IAM policy |
| 2 | `roles/cloudbuild.builds.editor` | project | 〃 | 〃 |
| 3 | `roles/cloudsql.client` | project | 〃 | 〃 |
| 4 | `roles/iam.serviceAccountUser` | project | 〃 | 〃 |
| 5 | `roles/run.admin` | project | 〃 | 〃 |
| 6 | `roles/serviceusage.serviceUsageConsumer` | project | 〃 | 〃 |
| 7 | `roles/storage.admin` | project | 〃 | 〃 |

### 4-2. 리소스 수준 — github-actions SA binding **0건**

| 유형 | 조회 대상 | github-actions SA binding |
|---|---|---|
| Cloud Run service | 12개 전부 (각각 `allUsers → run.invoker` 만) | 0 |
| Cloud Run job | `o4o-api-migrations` (policy 비어 있음) | 0 |
| Artifact Registry | `o4o-api` · `cloud-run-source-deploy` · `siteguide` (asia-northeast3) · `gcr.io` (us) — 모두 policy 비어 있음 | 0 |
| GCS bucket | 6개 | 0 |
| Secret Manager | 4개 — 각각 `secretAccessor` 가 **default compute SA 에만** 있음 | 0 |
| Service Account | github-actions SA (WIF 1건만) · compute SA (policy 비어 있음) | 0 |

### 4-3. 참고 — runtime SA (default compute SA) 의 프로젝트 역할

`roles/editor` · `roles/run.admin` · `roles/iam.serviceAccountUser` · `roles/artifactregistry.writer` · `roles/logging.logWriter`
— 12개 Cloud Run service 와 migration job 이 **모두** 이 SA 로 실행된다. Cloud Build 기본 SA 도 이 SA 다.

---

## 5. Workflow capability census (§6)

| workflow / script | GCP 동작 | API 호출 성격 |
|---|---|---|
| `deploy-api.yml` | `gcloud auth configure-docker asia-northeast3-docker.pkg.dev` · `docker buildx build --push` (`o4o-api` repo, `:sha` · `:latest` · `:buildcache`) · `imagetools inspect` | AR push / read |
| 〃 | `gcloud run jobs create\|update o4o-api-migrations` (`--set-secrets DB_PASSWORD=o4o-db-password` · `--set-cloudsql-instances`) · `jobs execute --wait` · `jobs executions list` | Run job write / run / read · runtime SA 로 actAs |
| 〃 | `gcloud run deploy o4o-core-api --allow-unauthenticated --ingress … --update-secrets … --add-cloudsql-instances … [--no-traffic --tag]` · `services describe` | Run service write · **service setIamPolicy** · actAs |
| `scripts/ci/cloud-run-env.mjs` | `run services describe` | Run read |
| `scripts/ci/cloud-run-rollout.mjs` | `run services describe` · `run revisions describe` · `run services update-traffic` (switch · rollback · `--remove-tags`) | Run read / traffic write |
| `deploy-admin.yml` | AR push (`o4o-api` repo) · `run deploy o4o-admin-dashboard --allow-unauthenticated` · `services describe` | 〃 |
| `deploy-web-services.yml` (9 서비스) | `gcloud auth configure-docker gcr.io` · `docker push gcr.io/netureyoutube/<svc>` · `run deploy <svc> --allow-unauthenticated [--no-traffic --tag]` · `services describe` | AR push (gcr.io redirect) · Run write · setIamPolicy |
| `delivery.yml` → `scripts/ci/deploy-orchestrate.mjs` · `deploy-risk.mjs` | serving 상태 read-only 조회: `run services describe` · `run revisions describe` · `container images list-tags` | Run read · AR read |
| `gcp-wif-auth-smoke.yml` | `auth list` · `projects describe` · `run services describe o4o-core-api` | project read · Run read |

**workflow 에 없는 것:** `gcloud builds` · `gsutil` / `gcloud storage` · `gcloud secrets` · `gcloud sql` · `gcloud logging` · Monitoring API · `gcloud iam` · `--service-account` 지정.

**GCR 경로:** `gcloud artifacts settings` = `REDIRECTION_FROM_GCR_IO_ENABLED`, AR repo `gcr.io`(us) 존재 → `gcr.io/...` push 는 **Artifact Registry** 로 간다. 레거시 GCR bucket(`artifacts.*`)은 존재하지 않는다.

### 5-1. 실제 호출 (Admin Activity 30일, github-actions SA)

| method | 건수 | 대응 workflow 동작 |
|---|---|---|
| `iam.serviceAccounts.actAs` | 2144+ | deploy / job 갱신 시 runtime SA 로 실행 |
| `run.v1.Jobs.ReplaceJob` | 1250+ | migration job update |
| `run.v1.Services.ReplaceService` | 719+ | `run deploy` · `update-traffic` |
| `run.v1.Services.SetIamPolicy` | 670+ | **`--allow-unauthenticated`** (매 deploy 마다 호출) |
| `run.v1.Jobs.CreateJob` | 262 | `jobs create` 시도(실패 시 update 로 fallback) |
| `iamcredentials GenerateAccessToken` | 43 | WIF 로그인 (자기 자신) |
| `run.v1.Services.CreateService` | 3 | `lecture-web` · `hospital-pharmacy-web` · `store-web` 최초 생성 |

(첫 조회가 5000건 limit 에 걸려 상위 4개는 하한값.)
**Cloud Build · Storage 관리 · Secret Manager · Cloud SQL Admin · IAM 관리 호출은 0건.**
Cloud Build `CreateBuild` 는 400일 이력 전부 사용자 계정 수행이며 github-actions SA 수행은 0건.

---

## 6. Capability → Permission map (§7 · §19)

| capability (실제 workflow 기준) | 필요한 권한 | 현재 제공 역할 |
|---|---|---|
| 컨테이너 이미지 push (`o4o-api` · `gcr.io` repo) | `artifactregistry.repositories.uploadArtifacts` · `downloadArtifacts` 등 | `artifactregistry.writer` (project) |
| 이미지 tag / digest 조회 | `artifactregistry.*.get/list` | 〃 |
| Cloud Run service deploy / update / create | `run.services.create/update/get` | `run.admin` |
| 서비스 공개 invoker 설정 (`--allow-unauthenticated`) | `run.services.setIamPolicy` | `run.admin` (developer 에는 없음) |
| revision 조회 · traffic 전환 · rollback · tag 제거 | `run.services.get/update` · `run.revisions.get` | `run.admin` |
| migration job create / update / execute / executions 조회 | `run.jobs.create/update/run/get` · `run.executions.list` | `run.admin` |
| runtime SA 로 실행 (deploy · job) | `iam.serviceAccounts.actAs` **(compute SA 에 대해서만)** | `iam.serviceAccountUser` (project) |
| secret 참조 배선 (`--set-secrets`) | 배포자 권한 불필요 — runtime SA 의 accessor 로 검증됨 | (없음 — 정상) |
| Cloud SQL 인스턴스 배선 (`--add/--set-cloudsql-instances`) | 배포자 권한 불필요 — 연결은 runtime SA 가 함 | `cloudsql.client` (미사용) |
| API 사용 / quota | `serviceusage.services.use` | `serviceusage.serviceUsageConsumer` |
| 로그 · 모니터링 조회 | 불필요 (workflow 미사용) | (없음) |

---

## 7. 역할별 필요성 판정 (§8 · §20)

| Role | Scope | Actual use | 판정 | Risk | Recommendation |
|---|---|---|---|---|---|
| `artifactregistry.writer` | project | 이미지 push 2개 repo + tag 조회 | **REQUIRED** | LOW | 유지. 선택적으로 `o4o-api` · `gcr.io` repo 단위로 축소 |
| `run.admin` | project | deploy · traffic · job · **setIamPolicy(매 deploy)** | **OVERBROAD** | MEDIUM | `run.developer` 로 축소 + invoker 설정 경로 정리 (§9-3). 현재 상태에서 그냥 빼면 `--allow-unauthenticated` 가 실패 |
| `iam.serviceAccountUser` | project | compute SA actAs (2144+/30일) | **OVERBROAD** (scope) | MEDIUM | compute SA 리소스 단위 binding 으로 이동. 현재 SA 가 2개뿐이라 실효 차이는 작지만 신규 SA 생성 시 자동 확대를 막음 |
| `serviceusage.serviceUsageConsumer` | project | API 사용 (`services.use`) | **LIKELY_REQUIRED** | LOW | 유지 |
| `storage.admin` | project | 0 — gcr.io 는 AR redirect, workflow 에 GCS 명령 없음 | **APPARENTLY_UNUSED** | **HIGH** | 제거 후보 1순위. 전 bucket(DB export bucket 포함) 읽기 · 삭제 · **bucket/object IAM 변경** 가능 |
| `cloudbuild.builds.editor` | project | 0 — workflow 에 `gcloud builds` 없음, 400일 호출 0 | **APPARENTLY_UNUSED** | **HIGH** | 제거 후보. `builds.create` = 기본 build SA(= compute SA, `editor`) 로 임의 단계 실행 |
| `cloudsql.client` | project | 0 — runner 가 DB 에 직접 붙지 않음(연결은 migration job 의 runtime SA) | **APPARENTLY_UNUSED** | LOW | 제거 후보 (권한 2개 · 연결만) |

- **역할 판정 집계:** REQUIRED 1 · LIKELY_REQUIRED 1 · OVERBROAD 2 · APPARENTLY_UNUSED 3 · UNKNOWN 0
- **CRITICAL_OVERPRIVILEGE 2건** — workflow 에 필요 없는데 열려 있는 IAM 변경 · 권한 상승 경로:
  1. `storage.admin` → `storage.buckets.setIamPolicy` · `storage.objects.setIamPolicy` (미사용)
  2. `cloudbuild.builds.editor` → editor SA 로 임의 빌드 실행 (미사용)

---

## 8. 항목별 점검 (§9 ~ §18)

| WO 절 | 점검 | 결과 |
|---|---|---|
| §9 basic role | `owner` / `editor` / `viewer` 직접 부여 | **없음.** 단 actAs 대상 runtime SA 에 `editor` 있음 (간접 — §11) |
| §10 impersonation | `serviceAccountTokenCreator` | 없음 (누구에게서도 github-actions SA 가 대상 아님, github-actions SA 도 보유 안 함) |
| 〃 | `serviceAccountUser` | github-actions SA 가 **project 범위**로 보유 → compute SA actAs 가능 (실사용) |
| 〃 | `workloadIdentityUser` | github-actions SA 리소스에 WIF principalSet 1건만 |
| 〃 | SA impersonation chain | **YES (actAs 기반, 알려진 경로)** — 배포로 compute SA 권한의 코드 실행. 토큰 발급(`getAccessToken`) 경로는 없음. 미확인 chain 없음 |
| §11 Secret Manager | github-actions SA 의 secret 접근 | **NONE** — project · per-secret 둘 다 없음. 4개 secret 의 accessor 는 compute SA 뿐. `--set-secrets` 배선에는 배포자 접근이 필요 없음 |
| §12 Cloud SQL | admin / instanceUser / user admin | 없음. `cloudsql.client`(connect · get) 만 있고 미사용 → **MINIMAL** |
| §13 Cloud Run | 범위 | `run.admin` project 범위 — 삭제 · 모든 service/job IAM 변경 포함 → **BROAD**. 실사용은 deploy/update/read/traffic/job + service setIamPolicy |
| §14 AR / Storage | push 대상 | AR `o4o-api`(asia-northeast3) · AR `gcr.io`(us, GCR redirect). 레거시 GCR bucket 없음 → `storage.admin` 불필요 |
| §15 Logging / Monitoring | 사용 여부 | workflow 미사용, 역할도 없음 (해당 없음) |
| §16 IAM mutation | project IAM · SA 생성/삭제 · WIF provider 변경 · Secret IAM · SQL user 비번 | **직접 권한 없음.** 리소스 IAM 변경은 있음: Cloud Run service/job `setIamPolicy` (`run.admin`, 사용 중) · GCS bucket/object `setIamPolicy` (`storage.admin`, 미사용) → **YES (리소스 수준)** |
| §17 key 생성 | user-managed key · `serviceAccountKeys.create` | user-managed key **0** (SYSTEM_MANAGED 2개만). 7개 역할 중 `serviceAccountKeys.*` 포함 0 → **직접 NO**. 간접: compute SA(`editor` 는 `iam.serviceAccountKeys.create` 포함) 로 실행되는 코드는 key 생성 가능 |
| §18 scope | 리소스 단위 binding | 0건 — 7개 모두 project 범위 |

---

## 9. 축소 제안 (§21 · §22) — **제안만, 적용 안 함**

```text
CURRENT                                   TARGET CANDIDATE
roles/artifactregistry.writer (project) → roles/artifactregistry.writer (o4o-api repo + gcr.io repo)   [선택]
roles/run.admin (project)               → roles/run.developer (project)                               [Phase 3]
roles/iam.serviceAccountUser (project)  → roles/iam.serviceAccountUser (compute SA 리소스만)          [Phase 2]
roles/serviceusage.serviceUsageConsumer → 유지
roles/storage.admin                     → 제거                                                        [Phase 1]
roles/cloudbuild.builds.editor          → 제거                                                        [Phase 1]
roles/cloudsql.client                   → 제거                                                        [Phase 1]
```

### Phase 1 — 미사용 역할 제거 (가장 효과 큼 · 위험 낮음)

- 대상: `storage.admin` · `cloudbuild.builds.editor` · `cloudsql.client`
- 선확인: GCR redirect `ENABLED` 유지 확인 (이번 조사 시점 확인 완료).
- 검증: web 1개(gcr.io push 경로) + API(AR push · migration job `--set-cloudsql-instances` · deploy `--add-cloudsql-instances`) 를 각각 실제 배포.
- 복구: 같은 role 재부여 1줄 (binding 추가만).

### Phase 2 — 범위 축소 (권한 종류는 동일)

- `iam.serviceAccountUser`: compute SA 리소스에 **먼저 추가** → 배포 1회 확인 → project binding 제거.
- (선택) `artifactregistry.writer`: `o4o-api` · `gcr.io` repo 에 먼저 추가 → `deploy-risk.mjs` 의 `list-tags` 포함 확인 → project binding 제거.

### Phase 3 — `run.admin` → `run.developer`

`run.developer` 에는 `run.services.setIamPolicy` 가 없어 현재 매 deploy 의 `--allow-unauthenticated` 가 깨진다. 두 길 중 하나를 택해야 한다:

| 안 | 내용 | 장점 | 비용 |
|---|---|---|---|
| **A (권장)** | workflow 에서 `--allow-unauthenticated` 제거 (12개 서비스는 이미 `allUsers → run.invoker` 보유) | predefined role 만 사용 · 배포 경로에서 IAM 변경 제거 | 코드 변경(workflow) · **신규 서비스 최초 생성 시 invoker binding 을 사람이 1회 부여** (30일 내 신규 생성 3건 있었음) |
| B | custom role = `run.developer` + `run.services.setIamPolicy` | workflow 무변경 | custom role 유지보수 · service IAM 변경 권한 잔존 |

### Phase 4 — 배포 · rollback smoke

각 Phase 후 `deploy-api` (verified rollout: tag → smoke → switch → verify) 와 web 1개 배포, 그리고 rollback 경로(`update-traffic`) 1회 확인. 한 번에 전부 줄이지 않는다.

---

## 10. 위험도 판정 (§23)

```text
LEAST_PRIVILEGE_RISK = HIGH
```

- HIGH 근거: admin 급 역할 3개(`run.admin` · `storage.admin` · `cloudbuild.builds.editor`), 그중 2개는 미사용이며 리소스 IAM 변경 / editor SA 실행 경로를 연다.
- CRITICAL 로 올리지 않은 근거: `owner` 없음 · project IAM / SA / WIF 변경 권한 없음 · 직접 key 생성 없음 · secret 접근 없음.
  다만 WO §23 의 "IAM mutation" 을 리소스 수준까지 넓게 읽으면 `storage.admin` 은 CRITICAL 항목이다 — §7 에서 CRITICAL_OVERPRIVILEGE 로 따로 셌다.
- 완화 요인: WIF 조건상 이 SA 를 쓰려면 main · `deploy/*` tag 에 코드가 들어가야 하고(dispatch 는 소유자만), 허용 workflow 는 5개뿐이다.

---

## 11. 범위 밖 발견 — 별도 WO 제안

**runtime SA 가 `roles/editor` 를 가진 default compute SA 다.**

- 12개 Cloud Run service · migration job · Cloud Build 가 모두 이 SA 로 실행된다.
- github-actions SA 의 배포 권한 = "이 SA 로 실행되는 코드를 올릴 권한" 이므로, github-actions SA 를 Phase 1~3 까지 줄여도 **실효 상한은 editor 로 남는다.**
  API 서버 자체가 침해돼도 같은 상한이 적용된다.
- 제안: `WO-O4O-CLOUD-RUN-RUNTIME-SA-LEAST-PRIVILEGE-V1` — 전용 runtime SA(필요 secret accessor · `cloudsql.client` · `logging.logWriter` 등만) 생성 후 서비스별 `--service-account` 지정,
  github-actions SA 의 actAs 를 그 SA 로 한정. 본 IR 의 Phase 2 와 순서를 맞춰야 한다.

---

## 12. 최종 플래그 (§26)

```text
GITHUB_ACTIONS_SA_IDENTIFIED          = YES  (github-actions@netureyoutube, 단일)
CURRENT_ROLE_CENSUS                   = PASS (project 7 · 리소스 0 · Asset API 미사용 한계는 §1)
WORKFLOW_CAPABILITY_CENSUS            = PASS
ROLE_TO_CAPABILITY_MAPPING            = PASS

BASIC_OWNER_ROLE_PRESENT              = NO
BASIC_EDITOR_ROLE_PRESENT             = NO   (간접: actAs 대상 runtime SA 에 editor — §11)
IAM_MUTATION_CAPABILITY               = YES  (리소스 수준: Cloud Run setIamPolicy 사용 중 · GCS setIamPolicy 미사용. project/SA/WIF 수준 NO)
SA_KEY_CREATE_CAPABILITY              = NO   (직접. 간접 경로는 runtime SA editor)
CROSS_SA_IMPERSONATION                = YES  (actAs → default compute SA, 알려진 배포 경로. 토큰 발급 경로 없음)

SECRET_ACCESS_SCOPE                   = NONE
CLOUD_SQL_ACCESS_SCOPE                = MINIMAL
CLOUD_RUN_ACCESS_SCOPE                = BROAD

APPARENTLY_UNUSED_ROLE_COUNT          = 3
OVERBROAD_ROLE_COUNT                  = 2
CRITICAL_OVERPRIVILEGE_COUNT          = 2

PRODUCTION_CHANGE                     = 0
IAM_MUTATION                          = 0
DB_WRITE                              = 0

LEAST_PRIVILEGE_RISK                  = HIGH
IAM_REDUCTION_RECOMMENDED             = YES
```

**STOP 조건 (§27):** "IAM mutation 권한 광범위"(run.admin · storage.admin 의 리소스 IAM 변경) 에 해당 → 변경 금지 · 보고 우선으로 처리. owner/editor 직접 부여 · key 생성 · secret admin · Cloud SQL admin · 미확인 impersonation chain · 다중 SA 는 해당 없음.

**다음 단계 (§28):** `WO-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-REDUCTION-V1` (Phase 1 부터) · `WO-O4O-CLOUD-RUN-RUNTIME-SA-LEAST-PRIVILEGE-V1` (§11).
