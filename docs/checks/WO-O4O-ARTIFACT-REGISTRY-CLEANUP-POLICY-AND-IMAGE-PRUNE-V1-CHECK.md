# WO-O4O-ARTIFACT-REGISTRY-CLEANUP-POLICY-AND-IMAGE-PRUNE-V1 — CHECK

- **작업일**: 2026-08-19
- **프로젝트**: `netureyoutube` (표시명 `neture-services`)
- **판정**: **완료** — active digest 삭제 0 / UNKNOWN 0 / production 정상 / cleanup policy 적용

---

## 1. Census (정리 전)

### 1-1. Repository

| repository | location | format | digest 수 | sizeBytes (실측) |
|---|---|---|---:|---:|
| `o4o-api` | asia-northeast3 | DOCKER | 4,735 | 480,361,388,794 (480.4 GB) |
| `gcr.io` | us | DOCKER | 6,061 | 24,946,166,697 (24.9 GB) |
| `cloud-run-source-deploy` | asia-northeast3 | DOCKER | 198 | 2,980,997,822 (3.0 GB) |
| `siteguide` | asia-northeast3 | DOCKER | 3 | 103,351,323 (0.1 GB) |
| **합계** | | | **10,997** | **508,391,904,636 (508.4 GB)** |

별도 Container Registry 인스턴스는 없다. `gcr.io` 는 이미 Artifact Registry 로 이관된 `us-docker.pkg.dev/netureyoutube/gcr.io` 저장소이며, `gcr.io/netureyoutube/*` 는 그 alias 호스트다.

### 1-2. package 별

| repository | package | digest | oldest | newest |
|---|---|---:|---|---|
| o4o-api | api-server | 3,493 | 2025-12-23 | 2026-08-18 |
| o4o-api | admin-dashboard | 1,208 | 2025-12-23 | 2026-08-18 |
| o4o-api | main-site / admin-dashboard-dev / neture-web | 34 | 2025-12 | 2026-08 |
| gcr.io | kpa-society-web | 1,933 | 2025-12-20 | 2026-08-18 |
| gcr.io | neture-web | 1,486 | 2025-12-20 | 2026-08-18 |
| gcr.io | glycopharm-web | 1,281 | 2025-12-20 | 2026-08-18 |
| gcr.io | k-cosmetics-web | 1,033 | 2025-12-20 | 2026-08-18 |
| gcr.io | glucoseview-web / pharmacy-hub-web / kpa-branch-web / neture-api / siteguide-web / github.com~ | 328 | 2025-12 | 2026-08 |
| cloud-run-source-deploy | 12 package (glucoseview-web 69 · glycopharm-web 42 · o4o-core-api 27 · 기타) | 198 | 2025-12-31 | 2026-01 |
| siteguide | siteguide-core | 3 | 2026-01-19 | 2026-01-19 |

전체 tagged 10,294 / untagged 703. mediaType: `manifest.v2` 10,317 · `oci.manifest` 528 · **`oci.image.index` 152**.

### 1-3. Cloud Run

- 서비스 **12개** (전부 `asia-northeast3`, 다른 리전 0)
- revision **6,658개** (glycopharm-web 1,074 · neture-web 1,072 · o4o-core-api 1,070 · o4o-admin-dashboard 1,043 · kpa-society-web 1,043 · k-cosmetics-web 1,019 · 기타)
- revision 이 참조하는 unique digest **6,654** → 정규화 후 **6,652 가 Registry 에 존재**, 외부 2건만 미존재
  - `gcr.io/cloudrun/hello@sha256:52c53c…` — Google 샘플 이미지 (`account-center-web` placeholder)
  - `glucoseview-web` — digest 미해석 구형 revision 1건

> **정규화 주의**: revision 은 `gcr.io/netureyoutube/X@sha256:…`, Registry 목록은 `us-docker.pkg.dev/netureyoutube/gcr.io/X@sha256:…` 로 같은 이미지를 다른 호스트명으로 표기한다. 정규화 전에는 4,489건이 "Registry 에 없음"으로 잘못 집계된다.

---

## 2. 보호 목록

| 보호 근거 | digest 수 |
|---|---:|
| `ACTIVE_REVISION` — traffic 100% + latestReady/latestCreated revision | 11 (외부 `gcr.io/cloudrun/hello` 제외) |
| `REV_TOP30` — 서비스별 최신 revision 30개가 참조 | 293 |
| `REV_30D` — 최근 30일 생성 revision 이 참조 | 1,615 |
| `IMG_TOP30` — package 별 최신 이미지 30개 | 490 |
| `IMG_30D` — 최근 30일 생성 이미지 | 1,615 |
| **합집합 = PROTECTED** | **1,860** |

기준 시각 = 최신 이미지 시각 `2026-08-18T08:12:33Z`, 컷오프 `2026-07-19T08:12:33Z`.

### 2-1. 현재 서비스별 active digest 위치

| service | package | package 내 순위 | 이미지 나이 |
|---|---|---:|---:|
| glycopharm-web / k-cosmetics-web / kpa-branch-web / kpa-society-web / neture-web / o4o-admin-dashboard / pharmacy-hub-web | 각 package | **1** | 0일 |
| o4o-main-site | main-site | **1** | 6일 |
| glucoseview-web | glucoseview-web | **1** | 126일 |
| o4o-admin-dashboard-dev | admin-dashboard-dev | **1** | 220일 |
| o4o-core-api | api-server | **3** | 0일 |
| account-center-web | (외부 `gcr.io/cloudrun/hello`) | — | — |

**모든 active digest 가 package 내 상위 3위 이내**다. 이것이 §5 cleanup policy 안전성의 근거다.

### 2-2. manifest index 교차 참조

OCI image index 152개 중 보호 대상은 `siteguide-core` 1건뿐이며, 그 자식 manifest 2개(amd64 + attestation)도 모두 보호 집합에 포함됨을 manifest 직접 조회로 확인했다. 보호된 index 의 자식이 삭제 후보에 포함된 사례 **0건**.

---

## 3. Dry-run

- 총 digest **10,997**
- 보호 digest **1,860**
- 삭제 후보 **9,137** (untagged 527 우선, tagged 8,610)
- 후보 범위: `2025-12-23T02:31Z` ~ `2026-07-19T08:05Z` (컷오프 직전에서 정확히 끊김)
- 후보 nominal 용량 합 **837.7 GB** / 전체 nominal 1,056 GB (`imageSizeBytes` 단순합 — layer 공유분 중복 계산 포함)
- **현재 실행 image 포함 여부 = 0** ✅
- Artifact Registry `versions:batchDelete` 를 `validateOnly:true` 로 9,137건 전량 제출 → **ok 9,137 / err 0**

| repository | 총 digest | 삭제 후보 | 후보 nominal GB |
|---|---:|---:|---:|
| o4o-api | 4,735 | 3,830 | 607.0 |
| gcr.io | 6,061 | 5,256 | 229.8 |
| cloud-run-source-deploy | 198 | 51 | 0.9 |
| siteguide | 3 | 0 | 0.0 |

---

## 4. 실제 Prune

우선순위대로 untagged → tagged, 오래된 순으로 실행했다.

- `versions:batchDelete` 는 **한 요청당 최대 75개** 제한이 있다 (초과 시 `400 A maximum of 75 versions are allowed per request`).
- batchDelete 로 8,541건 삭제. 나머지 596건은 batchDelete LRO 가 `code 5 Requested entity was not found` 로 실패했으나, **동일 version 을 `DELETE …?force=true` 단건 호출하면 정상 삭제**된다 (version GET 은 200). 단건 병렬(16 thread) 삭제로 596건 전량 처리, 오류 0.

### 4-1. 결과

| repository | before | after | 감소 |
|---|---:|---:|---:|
| o4o-api | 4,735 | 909 | −3,826 |
| gcr.io | 6,061 | 805 | −5,256 |
| cloud-run-source-deploy | 198 | 147 | −51 |
| siteguide | 3 | 3 | 0 |
| **합계** | **10,997** | **1,864** | **−9,133 (−83.0%)** |

- 삭제 실행 digest **9,137**, 실패 0
- 잔존 삭제후보 **0**
- **보호 digest 1,860 전량 잔존 (MISSING 0)** ✅
- 작업 중 CI 가 새로 push 한 `api-server` 이미지 2건이 추가되어 after 합계는 1,864

### 4-2. 용량 지표 — 미반영 (정직 보고)

`gcloud artifacts repositories list` 의 `sizeBytes` 는 **즉시 갱신되지 않는다** (일 단위 재계산). 삭제 직후 재측정값은 여전히 508.4 GB → 508.7 GB 로 감소가 반영되지 않았다.

```text
repo                       before GB     after GB (즉시 재측정)
o4o-api                       480.36       480.65
gcr.io                         24.95        24.94
cloud-run-source-deploy         2.98         2.98
siteguide                       0.10         0.10
TOTAL                         508.39       508.67
```

따라서 **실제 절감 용량은 이 문서 시점에 확정 수치로 보고하지 않는다.** digest 기준 83.0% 감소 및 nominal 837.7 GB 삭제를 근거로 하되, 확정치는 24시간 이후 `sizeBytes` 재측정으로 확인해야 한다.

---

## 5. Cleanup Policy

4개 repository 전부에 동일 정책을 적용했다. 정책 정본: [`infra/artifact-registry/cleanup-policy.json`](../../infra/artifact-registry/cleanup-policy.json)

| name | action | 조건 |
|---|---|---|
| `keep-recent-50-versions` | **Keep** | package 별 최신 50개 version |
| `delete-untagged-older-than-30d` | Delete | `tagState=UNTAGGED` AND `olderThan=30d` |
| `delete-any-older-than-30d` | Delete | `tagState=ANY` AND `olderThan=30d` |

- WO §8 의 "최근 30일 / 최근 30개" 를 만족하되, **최소치 30 대신 keepCount 50** 을 적용해 안전 여유를 뒀다.
- Artifact Registry 에서 **Keep 정책이 Delete 정책보다 우선**하므로, 어떤 version 이 삭제되려면 `30일 초과` **그리고** `package 내 순위 50위 밖` 을 동시에 만족해야 한다.
- **active digest 삭제 가능성 검증**: §2-1 대로 현재 12개 서비스의 active digest 는 전부 package 내 1~3위다. 51위로 밀리려면 재배포 없이 50개 이상 신규 빌드가 push 되어야 하는데, 이 저장소는 빌드와 배포가 1:1(서비스별 revision 수 ≈ image 수)이라 해당 조합은 발생하지 않는다. 30일 초과 active 이미지(`glucoseview-web` 126일, `o4o-admin-dashboard-dev` 220일)도 순위 1위여서 Keep 규칙이 보호한다.
- **정책 로컬 dry-run**: 정리 후 상태에 정책을 그대로 적용하면 삭제 대상은 **5건**뿐이며(전부 `api-server`, 순위 713~717, 30일/215일 경과, tagged 3 + untagged 2), **active digest 포함 0**. 이번 prune 결과와 정책이 정합한다.
- 4개 repo 모두 `cleanupPolicyDryRun` 미설정(= live)으로 적용 확인 완료.

---

## 6. `gcr.io` 잔존 판정 — **ACTIVE (유지)**

`gcr.io/netureyoutube/*` 는 legacy 가 아니라 **현재 운영 중 7개 서비스의 배포 원본**이다.

| service | 현재 이미지 |
|---|---|
| neture-web · kpa-society-web · glycopharm-web · k-cosmetics-web · glucoseview-web · pharmacy-hub-web · kpa-branch-web | `gcr.io/netureyoutube/{service}:{commit}` |

→ **소비처 0 아님. 저장소 삭제·마이그레이션 금지.** 동일 보존 기준(최신 50 + 30일)으로만 정리했다.

Artifact Registry host/리전 통일(`us-docker.pkg.dev` → `asia-northeast3`)은 리전 이동·CI 변경을 수반하므로 이번 WO 범위 밖이며 별도 WO 로 분리한다.

---

## 7. Production 검증

| 항목 | 결과 |
|---|---|
| Cloud Run 12개 서비스 Ready | **12/12 True** ✅ |
| 전 서비스 run.app 응답 | 11개 200 / `o4o-core-api` 는 `/` 404 (기존 동작, 진입점은 `api.neture.co.kr`) |
| 공개 도메인 cold start | neture.co.kr · www.kpa-society.co.kr · glycopharm.co.kr · k-cosmetics.co.kr · glucoseview.com 전부 200 |
| `GET /health` | **200** `{"status":"alive","version":"0.5.0"}` |
| `GET /health/database` | **200** `{"status":"healthy","pingMs":4,"activeConnections":10}` |
| Cloud Run `severity>=ERROR` (2026-08-19T00:00Z~) | **0건** ✅ |
| image pull / revision startup error | **0건** ✅ |
| 실제 신규 revision 배포 | `o4o-admin-dashboard-dev` → **`o4o-admin-dashboard-dev-00008-gl8` Ready, traffic 100%** ✅ (220일 된 보호 이미지 pull 성공) |

> `pharmacy-hub.co.kr` 은 DNS 미해석(curl exit 6). Cloud Run 서비스 자체는 run.app 200 이며 prune 이전부터의 도메인 상태다 — 이번 작업과 무관, 보고만 한다.
>
> 신규 **이미지 push** 를 동반한 CI 배포는 강제 실행하지 않았다. 배포할 코드 변경이 없는 상태에서 production 웹/API 를 재배포하는 것은 WO 범위 밖 행위다. 대신 기존 이미지 기반 신규 revision 생성으로 pull 경로를 실증했다.

---

## 8. 저장소 정리

| 항목 | 처리 |
|---|---|
| `infra/artifact-registry/cleanup-policy.json` | **신규** — 적용된 정책 정본 |
| dead deployment script | **없음** — 삭제된 이미지/저장소를 참조하는 배포 스크립트·워크플로 0건 |
| 정상 deployment contract | **미변경** |

`gcr.io/netureyoutube/*` 언급은 `docs/investigations/**` 기록물 1건뿐이며 CLAUDE.md §16-1 상 정비 대상이 아니다.

---

## 9. 잔여 관찰 (별도 WO 후보)

1. **Cloud Run revision 6,658개 잔존** — revision 자체는 과금 대상이 아니지만, 보존 정책 밖 구형 revision 은 이제 이미지가 없어 rollback 불가다. revision 정리는 이번 WO 범위 밖.
2. **`siteguide` repository** — SiteGuide 는 O4O 에서 legacy 제거 완료된 미운영 서비스(`WO-O4O-SITEGUIDE-LEGACY-CODE-REMOVAL-V1`). 이미지 3건 0.1 GB 로 비용 영향은 없으나 저장소 은퇴 후보다.
3. **`cloud-run-source-deploy/cosmetics-api`** — 존재한 적 없는 서비스의 빌드 산출물 3건. 보존 규칙(package 당 50개)에 걸려 유지됨.
4. **`gcr.io` → Artifact Registry host/리전 통일** — §6 참조.

---

## 10. 결론

```text
active digest 삭제        0
UNKNOWN                   0
보호 digest 손실           0 (1,860 / 1,860 잔존)
삭제 digest           9,137 (10,997 → 1,864, −83.0%)
production                정상 (12/12 Ready · health 200 · ERROR 0)
신규 배포 검증             PASS (o4o-admin-dashboard-dev-00008-gl8)
cleanup policy            4개 repository 전체 적용
재누적 방지               확인 (정책 로컬 dry-run 결과와 prune 결과 정합)
```

용량 절감 확정치만 24시간 후 `sizeBytes` 재측정이 필요하다.
