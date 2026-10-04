# CHECK-O4O-GITHUB-ACTIONS-ARTIFACT-REGISTRY-WRITER-SCOPE-REDUCTION-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-04 · **최종 갱신**: 2026-10-04
> **근거 WO/IR**: WO-O4O-GITHUB-ACTIONS-ARTIFACT-REGISTRY-WRITER-SCOPE-REDUCTION-V1 · [IR-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-AUDIT-V1](../investigations/IR-O4O-GITHUB-ACTIONS-SA-LEAST-PRIVILEGE-AUDIT-V1.md) · 선행 [CHECK-O4O-GITHUB-ACTIONS-RUN-ADMIN-TO-DEVELOPER-V1](CHECK-O4O-GITHUB-ACTIONS-RUN-ADMIN-TO-DEVELOPER-V1.md)

GitHub Actions production 배포 SA 의 `roles/artifactregistry.writer` 를 project 범위에서 실제로 쓰는 repository 2개 범위로 줄였다. workflow · repository · image · GCR redirect 정책 변경 0.

---

## 0. 판정

```text
PROJECT_WIDE_AR_WRITER_REMOVED = YES
REPOSITORY_SCOPED_AR_WRITER    = YES (asia-northeast3/o4o-api · us/gcr.io)

API_IMAGE_PUSH                 = PASS (자연 배포 Delivery 37195544741)
WEB_IMAGE_PUSH                 = PASS (store 통제 배포 37196103904 — gcr.io redirect)
IMAGE_READ / TAG_LOOKUP        = PASS (§4)
DEPLOYMENT_REGRESSION          = PASS
PRODUCTION_SMOKE               = PASS (공개 도메인 8개 200)

PERMISSION_DENIED_COUNT        = 0
ROLLBACK_USED                  = NO

GITHUB_ACTIONS_AR_WRITER_SCOPE = CLOSED
```

## 1. 축소 전 / 후

```text
전  project 역할: artifactregistry.writer · run.developer · serviceusage.serviceUsageConsumer
후  project 역할: run.developer · serviceusage.serviceUsageConsumer
    repository:   asia-northeast3/o4o-api → artifactregistry.writer
                  us/gcr.io               → artifactregistry.writer
actAs: o4o-runtime 리소스 단위 (변화 없음)
```

순서: repository 2개에 writer 부여 → readback(각 1) → project writer 제거(감사 로그 2026-10-04T10:29:14Z) → readback.

## 2. 실제 사용 repository (workflow · live 대조)

| 소비 | 경로 | 실제 repository | 근거 |
|---|---|---|---|
| API (`deploy-api.yml`) | `asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server` | `asia-northeast3/o4o-api` | `REPOSITORY_NAME: o4o-api` · serving revision image |
| Admin (`deploy-admin.yml`) | `…/o4o-api/admin-dashboard` | `asia-northeast3/o4o-api` | 같음 |
| Web 9 (`deploy-web-services.yml`) | `gcr.io/netureyoutube/<svc>-web` | **`us/gcr.io`** (GCR → AR redirect `REDIRECTION_FROM_GCR_IO_ENABLED`) | store-web serving image `gcr.io/…@sha256` · 같은 tag 가 `us-docker.pkg.dev/netureyoutube/gcr.io/store-web` 에 존재 |
| 판정기 (`deploy-risk.mjs`) | revision label 우선 · fallback `gcloud container images list-tags` (gcr.io · o4o-api) | 위 2개 | 쓰기 명령 0 |

사용하지 않는 repository: `asia-northeast3/siteguide` · `asia-northeast3/cloud-run-source-deploy`(Source 배포 잔여 — CLAUDE.md §6 금지 경로) → 권한 부여 0.

## 3. 배포 실측 (project writer 제거 10:29Z 이후)

| 경로 | run | 결과 |
|---|---|---|
| API (자연 L2 자동) | Delivery `37195544741` (main `bc1a0bcdd` · job 10:31~10:36Z) | `o4o-api/api-server:bc1a0bcdd…` push · digest 조회(`docker buildx imagetools inspect`) → migration Job `o4o-api-migrations-fh9bf` SUCCESS → `o4o-core-api-03822-quk` Ready=True → 전환 → `/health/ready` 200 |
| Web (통제 · store) | `deploy-web-services.yml` `37196103904` | `gcr.io/netureyoutube/store-web:bc1a0bcdd…` · `:latest` push(digest `sha256:78c7…`) → `store-web-00044-jiv` 0% → tag URL 직접 smoke → 전환 100% |

두 job 로그의 `PERMISSION_DENIED` · `permission denied` · `denied:` · `Forbidden` · `unauthorized` 0. 대규모 재배포 없음(API 는 자연 배포, Web 은 대표 1개).

## 4. image read / tag lookup

- **manifest · digest 읽기**: API job 의 `imagetools inspect`(push 직후 digest 확정)가 o4o-api 에서 성공. docker push 자체도 blob 존재 확인(읽기)을 거친다 — 두 repository 모두 성공.
- **판정기 serving 조회**: 권한 축소 후 돈 Delivery classify 에서 11/11 서비스 serving SHA 확인(`revision-label`) · UNKNOWN 0 · 오류 0.
- **registry tag fallback**: 현재 11개 모두 revision label 이 있어 `list-tags` fallback 은 실행되지 않았다. 그 조회 대상은 이번에 writer 를 준 두 repository 뿐이고 `artifactregistry.writer` 는 `reader` 권한(목록 · tag 조회)을 포함한다 → 권한상 유지된다.

## 5. Rollback (준비만 · 미사용)

```text
gcloud projects add-iam-policy-binding netureyoutube --member=serviceAccount:github-actions@netureyoutube.iam.gserviceaccount.com --role=roles/artifactregistry.writer --condition=None
```

## 6. 후속

- 새 서비스가 다른 repository · region 을 쓰게 되면 그 repository 에 writer 를 추가한다(project 범위로 되돌리지 않는다).
- 다음: Cloud Build SA 최소권한화 · default compute SA 비활성화 검토(7일 관찰 후).

`문서 정합: 해당 없음`
