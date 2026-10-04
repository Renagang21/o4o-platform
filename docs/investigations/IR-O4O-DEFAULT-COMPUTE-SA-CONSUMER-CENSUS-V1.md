# IR-O4O-DEFAULT-COMPUTE-SA-CONSUMER-CENSUS-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-04 · **최종 갱신**: 2026-10-04
> **근거 WO/IR**: WO-O4O-DEFAULT-COMPUTE-SA-CONSUMER-CENSUS-V1 · 선행 [CHECK-O4O-CLOUD-RUN-RUNTIME-SA-LEAST-PRIVILEGE-V1](../checks/CHECK-O4O-CLOUD-RUN-RUNTIME-SA-LEAST-PRIVILEGE-V1.md)

default compute SA(`<project-number>-compute@developer.gserviceaccount.com`)를 Cloud Run 외에 누가 실제로 쓰는지 read-only 로 전수 조사했다.
IAM · SA · Cloud Build · 배포 · DB · secret 변경 0.

---

## 0. 판정

```text
DEFAULT_COMPUTE_SA_ACTIVE_CONSUMER_COUNT = 0
CLOUD_BUILD_CONSUMER                     = NO   (기본 build SA 로 설정돼 있으나 마지막 실행 2026-05-12 · trigger 0 → LEGACY / 잠재 경로)
OTHER_ACTIVE_CONSUMERS                   = 0
UNKNOWN_CONSUMERS                        = 0    (한계: Data Access 로그 미수집 — §5)

EDITOR_ROLE_STILL_REQUIRED               = NO
SERVICE_ACCOUNT_USER_STILL_REQUIRED      = NO

SAFE_TO_RETIRE_DEFAULT_COMPUTE_EDITOR    = YES
SAFE_TO_RETIRE_DEFAULT_COMPUTE_SA_USER   = YES

NEXT_ACTION = WO-O4O-DEFAULT-COMPUTE-SA-EDITOR-RETIREMENT-V1 — editor · iam.serviceAccountUser 와 함께 같은 이유로 미사용인
              run.admin · artifactregistry.writer · secret binding 1 도 제거, 관찰 기간 후 SA 비활성화 검토 (§6)
```

## 1. 현재 IAM

| 범위 | 역할 / binding |
|---|---|
| project | `roles/editor` · `roles/iam.serviceAccountUser` · `roles/run.admin` · `roles/artifactregistry.writer` · `roles/logging.logWriter` |
| secret | `o4o-encryption-key` 에 SA 단위 binding 1개 (나머지 secret 0) — **정정(2026-10-04)**: 실제로는 `o4o-db-password` · `cafe24-client-id` · `cafe24-client-secret` 에도 있어 4개였다. 순회가 `\r` 붙은 이름으로 3개를 건너뛰었다. 판단(실행 주체 0)은 불변 · 4개 모두 제거 — [CHECK-O4O-DEFAULT-COMPUTE-SA-EDITOR-RETIREMENT-V1](../checks/CHECK-O4O-DEFAULT-COMPUTE-SA-EDITOR-RETIREMENT-V1.md) §8 |
| bucket | 0 |
| user-managed key | 0 |
| 이 SA 를 actAs 할 수 있는 SA 단위 binding | 0 (2026-10-04 github-actions project 범위 actAs 제거 후) |

`run.admin` · `artifactregistry.writer` 는 과거 Cloud Build source 배포(빌드가 이 SA 로 이미지를 올리고 Cloud Run 에 배포)를 위해 붙은 것으로 보인다(§3 근거).

## 2. 소비자 census

| 범주 | 실제 설정 · 사용 흔적 | 분류 |
|---|---|---|
| Cloud Run services · jobs | 12/12 · 1/1 = `o4o-runtime` (2026-10-03 전환) | 소비 0 |
| Cloud Build | 기본 build SA = compute SA · trigger 0 · 최근 build: global 2026-01-26(SUCCESS) · asia-northeast3 2026-05-12(FAILURE, `run-sources-…` bucket = `gcloud run deploy --source`) | **LEGACY / 잠재** |
| Compute Engine VM · instance template | 0 | 없음 |
| GKE | 0 | 없음 |
| App Engine | 애플리케이션 없음 (API 만 활성) | 없음 |
| Cloud Functions · Scheduler · Tasks · Eventarc · Workflows | API 비활성 | 없음 |
| Pub/Sub | subscription 0 · topic 3 = Container Analysis 시스템 topic | 없음 |
| Dataflow (active) · Workbench · Vertex endpoint · Redis | 0 | 없음 |
| 저장소 workflow · script | 명시적 참조 0 (`gcloud builds` · `--source` 배포 · `cloudbuild.yaml` · Functions · Scheduler 0). 유일한 문자열은 compute SA 사용을 **금지**하는 회귀 시험 단언 | 없음 |

## 3. 감사 로그 근거 (Admin Activity · 최근 30일)

```text
compute SA 를 principal 로 한 호출   cloudsql.instances.connect 1,659 회 — 전부 Cloud Run runtime (전환 전 revision)
마지막 활동                          2026-10-03T21:59Z cloudsql.instances.connect
runtime 전환(22:5xZ) 이후 활동       0
iamcredentials(토큰 발급 · impersonation) 대상이 compute SA 인 호출   0
compute SA 에 대한 actAs 사용자        github-actions 453 회 · 소유자 계정 47 회 — 전부 전환 이전 배포 · 전환 작업
```

→ 이 SA 는 Cloud Run runtime 으로만 쓰였고 그 역할은 끝났다. 예상 밖 production workload · editor 를 전제로 한 자동화 · 알 수 없는 impersonation chain 은 발견되지 않았다(중지 조건 해당 없음).
Cloud Build 는 production 배포에 관여하지 않는다 — 배포는 GitHub Actions(WIF) 경로뿐이고 Source 배포는 CLAUDE.md §6 금지.

## 4. 소비자별 필요 권한

ACTIVE 소비자가 없어 분리할 대상이 없다. 잠재 경로만 정리한다.

| 잠재 경로 | 발생 조건 | 권한 제거 시 | 판단 |
|---|---|---|---|
| Cloud Build 기본 SA | 누군가 `gcloud builds submit` · `gcloud run deploy --source` 실행 | 빌드 · 배포가 권한 부족으로 실패 (fail-closed) | 금지된 경로이므로 실패가 맞다. 필요해지면 전용 build SA 를 만든다(WO-O4O-CLOUD-BUILD-SA-LEAST-PRIVILEGE-V1) |
| 새 Cloud Run 리소스가 SA 미지정으로 생성 | workflow 밖 수동 생성 | compute SA 로 생성돼도 권한 0 → 기동 시 secret · SQL 접근 실패 | workflow 는 `--service-account` 명시가 시험으로 고정돼 있다 |

## 5. 확인 한계

- **Data Access 감사 로그 미수집**(`auditConfigs` 없음) — compute SA 의 GCS 객체 · Secret 값 읽기는 로그로 확인할 수 없다.
  대신 이 SA 를 실행 신분으로 쓰는 리소스가 0 이고(§2), 토큰 발급(iamcredentials) 0 · actAs 할 수 있는 binding 0 이므로 **그 접근을 일으킬 주체가 없다**고 판단했다.
- `<project-number>@cloudservices.gserviceaccount.com`(Google APIs service agent)도 `roles/editor` 를 갖는다 — Google 관리 SA 라 이번 범위가 아니다(제거 비권장).
- 프로젝트 소유자 계정은 `owner` · `iam.serviceAccountAdmin` 으로 언제든 actAs 가능하다 — 사람 계정 경계는 별도.

## 6. 다음 WO 제안 — WO-O4O-DEFAULT-COMPUTE-SA-EDITOR-RETIREMENT-V1

```text
1. 제거 (역할 하나씩 · readback): roles/editor → roles/iam.serviceAccountUser → roles/run.admin → roles/artifactregistry.writer
   (roles/logging.logWriter 도 쓰는 workload 가 없다 — 함께 제거 가능)
2. secret o4o-encryption-key 의 compute SA binding 제거
3. Cloud Build 기본 SA: 그대로 두면 권한 0 SA 로 빌드가 실패(의도) — 필요 시 전용 build SA 로 변경은 별도 WO
4. 관찰: 다음 자연 배포(API · Web) + 1주 감사 로그 — compute SA principal 호출 0 유지 확인
5. 관찰 PASS 후 선택: SA 비활성화(gcloud iam service-accounts disable · 삭제는 비권장 — 되돌리기 어려움)
rollback: 제거한 역할만 add-iam-policy-binding 으로 재부여 (복원 명령은 WO 실행 전 기록)
```

`문서 정합: 해당 없음`
