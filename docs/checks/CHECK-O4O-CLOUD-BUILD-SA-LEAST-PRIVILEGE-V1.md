# CHECK-O4O-CLOUD-BUILD-SA-LEAST-PRIVILEGE-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-04 · **최종 갱신**: 2026-10-04
> **근거 WO/IR**: WO-O4O-CLOUD-BUILD-SA-LEAST-PRIVILEGE-V1 · [IR-O4O-DEFAULT-COMPUTE-SA-CONSUMER-CENSUS-V1](../investigations/IR-O4O-DEFAULT-COMPUTE-SA-CONSUMER-CENSUS-V1.md) · 선행 [CHECK-O4O-DEFAULT-COMPUTE-SA-EDITOR-RETIREMENT-V1](CHECK-O4O-DEFAULT-COMPUTE-SA-EDITOR-RETIREMENT-V1.md) · [CHECK-O4O-GITHUB-ACTIONS-ARTIFACT-REGISTRY-WRITER-SCOPE-REDUCTION-V1](CHECK-O4O-GITHUB-ACTIONS-ARTIFACT-REGISTRY-WRITER-SCOPE-REDUCTION-V1.md)

Cloud Build 는 production 경로에서 쓰이지 않는다. 판정 A(미사용)로 처리했다. 남아 있던 build identity 권한을 제거했고, 전용 build SA 는 만들지 않았다(WO: 미사용이면 SA 신설 금지). workflow · WIF · o4o-runtime · Cloud Run runtime 권한 · secret 값 · repository · image 변경 0.

---

## 0. 판정

```text
CLOUD_BUILD_ACTIVE_CONSUMER     = NO
DEFAULT_COMPUTE_AS_BUILD_SA     = NOT_USED (설정상 기본값이나 build 0 · 역할 0 · 리소스 binding 0)
LEGACY_SOURCE_BUILD_PATH        = CLOSED
PRODUCTION_DEPLOY_REGRESSION    = PASS (store 통제 배포 37199015512)

PERMISSION_DENIED_COUNT         = 0
ROLLBACK_USED                   = NO

CLOUD_BUILD_SA_LEAST_PRIVILEGE  = CLOSED
```

## 1. Cloud Build 실제 사용 여부 (live · 2026-10-04)

| 항목 | 결과 |
|---|---|
| trigger (global · asia-northeast3 · us-central1) | 0 |
| repository connection (2nd gen · GitHub) | 0 |
| worker pool | 0 |
| build 2026-05-13 이후 (전 region) | 0 |
| 마지막 build | global 2026-01-26 SUCCESS · asia-northeast3 2026-05-12 FAILURE(`run deploy --source` 잔여) — 둘 다 build SA = default compute SA |
| `cloudbuild.googleapis.com` 감사 로그 2026-05-13 이후 | 0 |
| 레거시 SA `<N>@cloudbuild` 마지막 활동 | 2025-12-20 (CreateBuild) |
| Cloud Build service agent 마지막 활동 | 2026-01-26 (AR CreateAttachment) |
| Cloud Build 를 내부적으로 쓰는 다른 제품 | Cloud Functions API 비활성 · App Engine 앱 없음 |
| 저장소 참조 (`origin/main`, 기록물 제외) | `cloudbuild.yaml` · `gcloud builds` · `run deploy --source` 0. `--source` 검색 결과는 무관한 CLI 플래그뿐. `.gcloudignore` 2개(루트 · admin-dashboard)는 Source 배포 시절 잔여 — 동작 영향 없음 |
| production 배포 경로 | GitHub Actions(WIF) runner 에서 `docker build` → AR/GCR push → `gcloud run deploy --image` — Cloud Build 경유 0 |

→ production 경로에 Cloud Build 소비자가 없다. Source 배포는 CLAUDE.md §6 금지 경로이고 재도입 신호도 없다.

## 2. Build identity 와 IAM — 전 / 후

```text
                               전                                         후
기본 build SA (설정)            <N>-compute@developer                      <N>-compute@developer (변경 없음 · 아래 근거)
<N>-compute@developer          project 역할 0 (선행 WO 에서 editor 등 은퇴)   0
<N>@cloudbuild (레거시 build SA) roles/cloudbuild.builds.builder            0   ← 11:29:02Z 제거
Cloud Build service agent       cloudbuild.serviceAgent                     cloudbuild.serviceAgent (Google 관리 · 유지)
                                secretmanager.admin (조건부 · 만료)          제거   ← 11:30:02Z
```

- **기본 build SA 를 바꾸지 않은 이유**: 바꾸려면 새 SA 가 필요하고, WO 는 미사용이면 SA 를 새로 만들지 말라고 한다. compute SA 는 project 역할 0, AR repository binding 0, source bucket 개별 binding 0, SA 단위 IAM 0이다. 누군가 build 를 시작해도 source 읽기 · image push · Cloud Run 배포가 모두 막힌다. 그래서 실질적으로 NOT_USED 다.
- **service agent 의 `secretmanager.admin`**: Console 의 connection 설정이 자동으로 만든 binding 이다(`title: cloudbuild-connection-setup`, `request.time < 2025-12-20T13:09:55Z`). 이미 만료돼 실효 권한은 없었지만 정책 표면 정리를 위해 같은 condition 을 지정해 제거했다. secret 4개의 개별 IAM 에 Cloud Build 주체 binding 은 0이다.
- **build 를 만들 수 있는 주체**: project owner 1(사람)과 Google APIs service agent(`cloudservices`, editor · Google 관리)뿐이다. `cloudbuild.builds.editor` 같은 역할을 가진 주체는 0이다(github-actions 는 2026-10-03 제거).

## 3. 레거시 source-build 잔여 (기록만 · 삭제 0)

| 자원 | 상태 | 비고 |
|---|---|---|
| bucket `netureyoutube_cloudbuild` | 유지 | 개별 binding 은 project legacy 역할 외에 Cloud SQL service agent `objectAdmin` 1건(이번 범위 밖 · 별도 검토) |
| bucket `run-sources-netureyoutube-asia-northeast3` | 유지 | project legacy 역할만 |
| AR `asia-northeast3/cloud-run-source-deploy` · `siteguide` | 유지 | repository binding 0 · 쓰기 주체 없음 |
| Cloud Build API | 활성 유지 | 비활성화는 별도 결정(§6) |

repository · image · bucket 삭제는 WO 범위 밖이다.

## 4. Production 배포 회귀

IAM 변경(11:29~11:30Z) 뒤 자연 배포가 없어 대표 1개를 통제 배포했다.

| 경로 | run | 결과 |
|---|---|---|
| Web (통제 · store · verified) | `deploy-web-services.yml` `37199015512` (main `1666bec7e` · 11:31Z) | `gcr.io/netureyoutube/store-web:1666bec7e…` push → `store-web-00047-juq` 0% → 검증 → 전환 100% · runtime SA `o4o-runtime` |

- job 로그의 `PERMISSION_DENIED` · `permission denied` · `denied:` · `Forbidden` · `unauthorized` 는 0건이다.
- 공개 smoke: `store.neture.co.kr` 200 · `neture.co.kr` 200 · `api.neture.co.kr/health/ready` 200.
- API 경로는 Cloud Build 와 무관하다(직전 CHECK 의 자연 배포 `37195544741` 이후 build 경로 변경 0). 이번에 바꾼 identity 는 배포 경로 어디에도 등장하지 않는다.

## 5. Rollback (준비만 · 미사용)

```text
gcloud projects add-iam-policy-binding netureyoutube --member=serviceAccount:117791934476@cloudbuild.gserviceaccount.com --role=roles/cloudbuild.builds.builder --condition=None
```

secretmanager.admin 조건부 binding 은 만료된 것이라 복구 대상이 아니다.

## 6. 후속 (제안만)

- **Cloud Build API 비활성화 검토**: 실행하면 `run deploy --source` · `builds submit` 경로가 구조적으로 닫힌다. 다만 API 의존성 확인과 사용자 결정이 필요해 이번 범위에서는 하지 않았다.
- **Cloud Build 가 다시 필요해질 때**: compute SA 에 권한을 되돌리지 않는다. 전용 build SA 를 만들어 사용할 repository · bucket 범위로만 권한을 준다.
- `netureyoutube_cloudbuild` 의 Cloud SQL service agent `objectAdmin` 경위 확인과 레거시 bucket · AR repository 정리 여부는 별도 WO 로 다룬다.
- default compute SA 7일 관찰(~2026-10-11) 뒤 비활성화(삭제 아님) 검토 — 기존 후속을 유지한다.

`문서 정합: 해당 없음`
