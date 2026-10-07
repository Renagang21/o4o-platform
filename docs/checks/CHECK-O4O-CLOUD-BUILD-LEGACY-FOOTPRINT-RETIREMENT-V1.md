# CHECK-O4O-CLOUD-BUILD-LEGACY-FOOTPRINT-RETIREMENT-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-04 · **최종 갱신**: 2026-10-04
> **근거 WO/IR**: WO-O4O-CLOUD-BUILD-LEGACY-FOOTPRINT-RETIREMENT-V1 · 선행 [CHECK-O4O-CLOUD-BUILD-SA-LEAST-PRIVILEGE-V1](CHECK-O4O-CLOUD-BUILD-SA-LEAST-PRIVILEGE-V1.md)

production 이 쓰지 않는 Cloud Build API 와 Source 배포(`gcloud run deploy --source`) 시절 잔여 자원을 정리했다. 기준은 "미사용이니 전부 지운다"가 아니라 "현재 운영 경로에서 소비되지 않음이 입증된 것만 지운다"였다. 용도를 확인할 수 없는 것은 보존했다. workflow · 코드 · WIF · runtime SA · DB · secret 변경 0.

---

## 0. 판정

```text
CLOUD_BUILD_ACTIVE_CONSUMER    = 0
CLOUD_BUILD_API                = DISABLED (2026-10-04 · --force 없이 · 의존 서비스 거부 없음)
LEGACY_SOURCE_DEPLOY_PATH      = RETIRED
UNUSED_LEGACY_RESOURCES        = REMOVED 4 · 보존 사유 명확 4 (§2)
UNNEEDED_IAM_BINDINGS          = 0 (§3)
PRODUCTION_DEPLOY_REGRESSION   = PASS (store 통제 배포 37201734050)
PRODUCTION_SMOKE               = PASS
PERMISSION_DENIED_COUNT        = 0
ROLLBACK_USED                  = NO

CLOUD_BUILD_LEGACY_FOOTPRINT   = CLOSED
```

## 1. 소비자 0 재확인 (실행 직전 census)

- Cloud Build: trigger · connection · worker pool 0이다. 2026-05-13 이후 build 0 · `cloudbuild.googleapis.com` 감사 로그 0이다. Cloud Functions API 는 비활성이고 App Engine 앱은 없다(선행 CHECK §1).
- 12개 Cloud Run 서비스의 **트래픽 대상 revision** image 는 전부 `asia-northeast3/o4o-api` 또는 `gcr.io`(→ `us/gcr.io`)다. 삭제 대상 repository 를 참조하는 serving revision 은 0이다.
- 저장소(`origin/main`) 의 workflow · 스크립트 · 코드에 `cloud-run-source-deploy` · `run-sources-` · `netureyoutube_cloudbuild` · SiteGuide image 참조는 0이다(기록물 · CHECK 의 언급만 있음).
- Cloud SQL export/import 이력(최근 200 operation): EXPORT 1건(2026-09-04)이고 대상은 `neture-db-final-export` 다.

## 2. 자원별 분류 · 조치

| 자원 | 내용 | 판정 | 조치 |
|---|---|---|---|
| Cloud Build API | 소비자 0 | 비활성화 | `gcloud services disable cloudbuild.googleapis.com` (`--force` 없음) → 성공 |
| AR `asia-northeast3/cloud-run-source-deploy` | 2.0 GB · package 12개 · 마지막 push 2026-01-26 · description "Cloud Run Source Deployments" | 삭제 | 삭제 완료 |
| AR `asia-northeast3/siteguide` | 99 MB · `siteguide-core` 1개(2026-01-19) · SiteGuide 은퇴(DropSiteGuideSchema) | 삭제 | 삭제 완료 |
| bucket `run-sources-netureyoutube-asia-northeast3` | `run deploy --source` 업로드 zip 97개 · 590 MB · 마지막 2026-05-12 | 삭제 | bucket 째 삭제 완료 |
| `netureyoutube_cloudbuild` 안의 `source/` · `logs/` | build source tgz 53개(618 MB · 마지막 2026-01-26) · build log 1개 | 삭제 | 삭제 완료 |
| bucket `netureyoutube_cloudbuild` 자체 · 루트 CSV 8개 | CSV 합계 969 bytes · 2026-04 · 이름 `e2e-*.csv` | **보존** | 용도 불명. Cloud SQL service agent 가 이 bucket 에 `objectAdmin` 을 갖고 있어 export/import 산출물일 수 있다. 내용은 열람하지 않았다(개인정보 가능성) |
| Cloud SQL service agent `objectAdmin` (위 bucket) | 부여 경위 불명 | **보존** | 위 CSV 와 같은 사유. 별도 확인 후 판단 |
| `.gcloudignore` 2개 (루트 · `apps/admin-dashboard/`) | Source 배포 업로드 제외 목록 | **보존** | API 비활성으로 기능은 0이다. 다만 루트 파일 삭제는 `scripts/ci/detect-affected.mjs` GLOBAL_EXACT(빌드 컨텍스트)에 걸려 full CI 와 전 서비스 배포 fallback 을 일으킨다. 판정기 수정은 CI 인프라 변경이라 이번 경계 밖이다 |

삭제 합계는 약 3.3 GB(AR 2.1 GB + bucket 1.2 GB)다.

**받아들인 부수 효과**: `cloud-run-source-deploy` 삭제로 `glucoseview-web` 의 옛 비서빙 revision 23개는 image 가 없어져 롤백 대상으로 쓸 수 없다. 이 서비스의 현재 serving revision(`glucoseview-web-00184-maw`, 100%)은 `gcr.io` image 라 영향이 없다. 사용자가 이 영향을 수용했다(WO 승인 메시지).

## 3. 남은 IAM (Cloud Build 관련)

```text
project:  service-<N>@gcp-sa-cloudbuild  roles/cloudbuild.serviceAgent   — Google 관리 binding. API 비활성으로 효력 0 · API 재활성 시 필요 → 유지
          <N>@cloudbuild (레거시 build SA) 역할 0 (선행 CHECK)
          <N>-compute@developer            역할 0 (선행 CHECK)
bucket netureyoutube_cloudbuild: project legacy 역할 + Cloud SQL service agent objectAdmin(§2 보존)
AR o4o-api · gcr.io: github-actions writer 만 (변경 없음)
```

잉여(효력 있고 쓰이지 않는) Cloud Build binding 은 0이다.

## 4. Production 배포 회귀 · smoke

| 경로 | run | 결과 |
|---|---|---|
| Web (통제 · store · verified) | `deploy-web-services.yml` `37201734050` (main `b6b88dda2`) | `gcr.io/netureyoutube/store-web:b6b88dda2…` push → `store-web-00050-lez` 0% → 검증 → 전환 100% · runtime SA `o4o-runtime` |

- job 로그의 `PERMISSION_DENIED` · `permission denied` · `denied:` · `Forbidden` · `unauthorized` 는 0건이다.
- 공개 smoke: `store.neture.co.kr` 200 · `neture.co.kr` 200 · `kpa-society.co.kr` 200 · `api.neture.co.kr/health/ready` 200.

API · Admin 배포 경로는 GitHub Actions runner 의 `docker build` → `o4o-api` push → `run deploy --image` 이다. 삭제한 자원과 비활성화한 API 를 쓰는 단계가 없다.

## 5. Rollback 메모

- API: `gcloud services enable cloudbuild.googleapis.com --project=netureyoutube` 로 즉시 복구할 수 있다(필요 시 전용 build SA 와 함께 — compute SA 로 되돌리지 않는다).
- 삭제한 repository · bucket · object 는 복구할 수 없다. 내용은 git 이력에 있는 소스의 업로드본과 그 build image 다.

## 6. 실행 권한 경위

auto mode 분류기가 처음 시도한 API 비활성화를 차단했다. 사용자가 이 WO 의 정확한 명령 5개만 project-local allow 에 임시 추가한 뒤 실행했다(broad `gcloud services|artifacts|storage *` 0). 작업 종료 후 이 5줄의 제거를 사용자에게 요청했다(Claude 는 설정 파일 자가 편집 불가).

## 7. 후속 (제안만)

- `netureyoutube_cloudbuild` 루트 CSV 8개와 Cloud SQL service agent `objectAdmin` 의 용도를 확인한 뒤 보존 또는 정리를 결정한다.
- `.gcloudignore` 2개는 다음 번 정당한 global 변경과 함께 정리하거나, 판정기 목록 정비 WO 와 묶어서 정리한다.
- App Engine API(`appengine.googleapis.com`)가 앱 없이 활성 상태다. Cloud Build 범위 밖이라 그대로 두었다.

`문서 정합: 해당 없음`
