# CHECK — WO-O4O-CLOUDRUN-JOB-IMAGE-REFERENCE-RECOVERY-AND-DEPLOYMENT-CONTRACT-V1
2026-08-25

## 1) 7개 job 이미지 참조 전수조사 : DONE
모두 단일 이미지 asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server 의 SHA 태그 고정.
entrypoint 는 전부 node dist/<name>-job.js.

## 2) Artifact Registry 실재 여부 : DONE
| job 참조 SHA | 상태 |
|---|---|
| 9b4d0cbe… (representative-grouping) | MISSING |
| b6a7db06… (drug-seed-candidate-import) | MISSING |
| 6ec36477… (drug-seed-promotion-apply) | MISSING |
| b2197e92… (shared-desc-bulk-canonical) | MISSING |
| 7f6f43cb… (easy-drug-image-copy) | MISSING |
| d8749a64… (easy-drug-seed-candidate-import) | MISSING |
| 2889c92d… (easy-drug-shared-description-derive) | MISSING |
| 4a692207… (o4o-api-migrations) | EXISTS |

## 3) 마지막 실행 이력 : DONE
- 7개 job: 2026-07-03 ~ 2026-07-04 (약 7주 전). promotion-apply 는 마지막 실행 실패(failedCount=1).
- o4o-api-migrations: 2026-08-25 (매 배포마다 실행) → 이미지 항상 최신 → 생존

## 4) 재빌드 가능성 : 재빌드 불필요
- 8개 entrypoint 원본 .ts 전부 현재 소스에 존재
- **핵심**: apps/api-server/Dockerfile 은 단일 이미지에 main.js + migrate.js + 7개 *-job.js 를 모두 COPY
  → 현재 존재하는 api-server 이미지가 7개 job entrypoint 를 이미 포함
  → 신규 빌드/push 없이 이미지 참조 교체만으로 복구 가능 (5번 항목 불요)

## 근본 원인 (배포 계약 결함)
Artifact Registry `o4o-api` cleanup policy:
- delete-any-older-than-30d : DELETE, olderThan 30d, **tagState=ANY** ← 태그가 붙어 있어도 삭제
- delete-untagged-older-than-30d : DELETE, UNTAGGED, 30d
- keep-recent-50-versions : KEEP 최근 50

deploy-api.yml 은 매 배포마다 새 SHA 이미지를 push 하고
**o4o-api-migrations 만** 새 이미지로 update. 나머지 7개 job 은 CI 가 전혀 갱신하지 않음.
→ 생성 당시 SHA 에 영구 고정 → 30일 경과 + 최근 50 밖으로 밀림 → GC 삭제 → "Image not found"
즉 정상 운영 job 을 정리 정책이 깨뜨리는 구조. Artifact Registry 는 Cloud Run 참조 여부를 알지 못함.

## 6) 이미지 참조 복구 : DONE
- 7개 job → api-server:23fdb013e8077ecb175c29c8a7d4876705b95625 (HEAD 커밋 빌드, 14:30 CI push)
- 서비스/migrations 와 동일 빌드로 정렬
- 전수 확인: 8개 job 전부 Ready=True
- env/secret/args 는 미변경 (DB_USERNAME=o4o_api, DB_PASSWORD→o4o-api-db-password:latest 유지)

## 7) 파이프라인 수정 : DONE (미커밋)
.github/workflows/deploy-api.yml 에 step 추가 (+50 lines, YAML 문법 검증 통과):
  "Refresh one-off Cloud Run job image references"
- migration 단계 직후 실행
- 7개 one-off job 의 --image 만 IMAGE_TAG 로 갱신
- env/secret/args 미변경 (*_APPLY 게이트·secretKeyRef 보호)
- job 미존재 시 skip, 갱신 실패 시 exit 1

## 9) canonical image reference 계약
확정: "api-server 이미지 1개 = 모든 Cloud Run Job entrypoint 포함.
       모든 one-off Job 은 매 배포마다 방금 push 한 IMAGE_TAG 로 재고정."
잔여 리스크: 30일 이상 api 배포가 없으면 동일 장애 재발 가능.
보완 권고(미적용, 승인 필요):
  delete-any-older-than-30d 의 tagState 를 ANY → UNTAGGED 로 변경
  (태그된 릴리스 이미지 보존, keep-recent-50-versions 는 유지)
  ※ 저장소 현재 약 84GB 이므로 스토리지 비용 영향 검토 필요

## 10) 실제 job 실행 검증 : 미수행 (별도 승인 필요)
7개 job 전부 현재 **APPLY 모드로 저장**되어 있어 실행 즉시 프로덕션 데이터 write 발생:
  DRUG_REP_APPLY=true / DRUG_SEED_APPLY=true / DRUG_PROMOTE_APPLY=true /
  DRUG_SHARED_DESC_BULK_CANONICAL_APPLY=I_UNDERSTAND / EASY_DRUG_IMG_APPLY=true /
  EASY_DRUG_APPLY=true / EASY_DRUG_DERIVE_APPLY=true
  (+ 전부 DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND)
소스상 APPLY 게이트를 끄면 dry-run 동작하므로, 검증은
execute 시 override 로 APPLY 를 꺼서 수행하는 것이 안전. 무단 실행하지 않음.

## 미수행/미변경 (금지 범위 준수)
- Artifact Registry cleanup 정책 임의 삭제/변경 없음
- 다른 서비스 이미지 정책 변경 없음
- 대량 태그 재작성 없음
- unrelated Cloud Run service 재배포 없음
- 데이터 write 수반 batch job 실행 없음
- deploy-api.yml 커밋/푸시 없음 (main 브랜치에 타 세션 WIP 34개 존재)

---

## 7-b) 파이프라인 수정 커밋·푸시 : DONE (격리 worktree)
- patch 보존: C:\tmp\deploy-api-job-refresh.patch (61행)
- 격리 worktree: C:\tmp\o4o-wo-job-image-refresh
  branch work/cloudrun-job-image-refresh-v1, base = origin/main 6f0ff82f1
- patch apply OK / 변경 파일 1건만
- 검증: YAML parse OK(step 12개), 신규 step 위치 = "Run database migrations" 직후 · "Verify deployment" 직전
        run 블록 bash -n 문법 OK, gcloud 호출은 --image 만 (env/secret/args 미전달)
- origin/main 재확인: 6f0ff82f1 변동 없음 → fast-forward 가능
- path-specific stage: .github/workflows/deploy-api.yml 만
- commit eb2c4db7f (+50 lines)
- push: 6f0ff82f1..eb2c4db7f HEAD -> main (fast-forward 성공)
- 원 작업트리: 내 변경만 checkout 으로 복원(.github 변경 0건). 타 세션 WIP 미접촉

## 9-b) 실제 CI 검증 : 진행 중
- deploy-api.yml 은 trigger paths 에 '.github/workflows/deploy-api.yml' 포함 → push 로 실배포 CI 1회 트리거됨
- run 32814873973 (sha eb2c4db7f) — 선행 run 32814678896 (sha 6f0ff82f1) 뒤에 큐 대기
  (concurrency group deploy-api-main, cancel-in-progress=false)
- 확인 예정: o4o-core-api 배포 / o4o-api-migrations 갱신 / 7개 one-off job image refresh
  가 모두 동일 image SHA 사용하는지

## 10-b) dry-run 대상 선정 : drug-representative-grouping
선정 근거 (소스 실사):
- APPLY 이중 가드: DRUG_REP_APPLY==='true' AND DRUG_IMPORT_ALLOW_APPLY==='I_UNDERSTAND'
  → apply = wantApply && guardOk. wantApply=false 면 예외 없이 dry-run 진입
    (throw 는 wantApply=true && guardOk=false 인 경우에만 발생 → override 로 APPLY=false 는 안전)
- write 대상은 representative_products INSERT + product_masters.representative_product_id UPDATE 둘뿐
- drug-master-representative-grouping.service.ts 실사:
  flushReps(INSERT) / linkMasters(UPDATE) 호출부가 전부 `if (opts.apply)` 내부 (line 217, 229)
  dry-run 은 카운터만 증가 → **호출 자체가 발생하지 않음. write 0 보장**
- DRUG_REP_LIMIT 로 처리량 제한 가능 → 짧은 실행
- JSON_REPORT 출력으로 결과 검증 용이

---

## 10-c) 대표 job dry-run 실행 (승인 범위 내, 1건)

### 실행 방식
- `gcloud run jobs execute` 는 클라이언트/서버 버전 불일치로 실패:
  `INVALID_ARGUMENT: Unknown name "priorityTier" at 'overrides'`
  → **execution 자체가 생성되지 않음. 상태 변경 없음.**
- 우회: Cloud Run Admin API v2 `jobs:run` 직접 호출.
  `overrides.containerOverrides[0].env = [DRUG_REP_APPLY=false, DRUG_REP_LIMIT=5]`
  → **저장된 job configuration 은 수정하지 않음 (execute-time override only)**

### 실행 전 기록 (C:\tmp\rep-job-before.json)
```
image      : eb2c4db7f98c078eb1a3fb4178f3b6d06c478832
command    : node dist/drug-representative-grouping-job.js
SA         : 117791934476-compute@developer.gserviceaccount.com
DB_USERNAME: o4o_api
DB_PASSWORD: secretKeyRef:o4o-api-db-password:latest
DRUG_REP_APPLY = true / DRUG_IMPORT_ALLOW_APPLY = I_UNDERSTAND
```

### DB write baseline (실행 전)
```
representative_products = 48101
masters_linked          = 177413
rep_max_created         = 2026-07-04 07:44:13.24708
```

### 실행 결과
execution `o4o-drug-representative-grouping-jf9ff` — Completed=True, succeeded=1, failed=0, exit(0)

```
mode = dry-run (read-only) | limit=5
DataSource 초기화 완료.
mode=dry-run (0s)
groups: total=5 existing=5 new=0
breakdown: single=2 multi=3 multiManuf=0 multiName=0 dupName=0
manufacturerFilled=0 masterLinksExpected=0
written: createdReps=0 linkedMasters=0 errored=0
JSON_REPORT_BEGIN / JSON_REPORT_END
Drug Representative Grouping Job — DONE (dry-run)
Container called exit(0).
```

| 검증 항목 | 결과 |
|---|---|
| image pull | PASS (컨테이너 기동) |
| container entrypoint 기동 | PASS (`Job — Starting`) |
| Secret Manager 주입 | PASS (DB_PASSWORD secretKeyRef 로 인증 성공) |
| DB authentication | PASS (`DataSource 초기화 완료.`) |
| dry-run 본체 진입 | PASS (`mode = dry-run (read-only) | limit=5`) |
| execution success | PASS (succeeded=1 / exit 0) |
| override 적용 | PASS (저장값 APPLY=true 인데 실행은 dry-run) |

### production write 0 확인 (실행 후 재측정)
```
representative_products = 48101   (변화 0)
masters_linked          = 177413  (변화 0)
rep_max_created         = 2026-07-04 07:44:13.24708  (변화 0)
```
job 보고서 `createdReps=0 linkedMasters=0 errored=0` 과 일치.
**production INSERT/UPDATE/DELETE = 0**

### 실행 후 저장 설정 drift (before vs after)
```
DRIFT = 0
image                   = eb2c4db7f98c078eb1a3fb4178f3b6d06c478832  (CI 갱신 image 와 동일)
DRUG_REP_APPLY          = true            (원래 값 유지)
DRUG_IMPORT_ALLOW_APPLY = I_UNDERSTAND    (미접촉)
DRUG_REP_LIMIT          = 미존재          (override 만 사용, 저장 안 됨)
DB_USERNAME             = o4o_api
DB_PASSWORD             = secretKeyRef:o4o-api-db-password:latest  (유지)
command/args/SA         = 동일
```

---

## 최종 판정

| 항목 | 판정 |
|---|---|
| JOB_IMAGE_REFERENCE_RECOVERY | **RECOVERED** |
| DEPLOYMENT_JOB_REFRESH_PIPELINE | **FIXED** (commit `eb2c4db7f`, CI run 32814873973 success) |
| JOB_RUNTIME_VALIDATION | **PASS** (dry-run 성공, write 0, drift 0) |
| ARTIFACT_RETENTION_CONTRACT | **NOT_CLOSED** (별도 잔여 항목 — 미착수) |

`ARTIFACT_RETENTION_CONTRACT` 는 지시에 따라 착수하지 않음.
현행 정책(`delete-any-older-than-30d`, tagState=ANY)은 유지 중이며,
CI 가 매 배포마다 8개 job 이미지를 최신 SHA 로 재고정하므로 재발은 차단된 상태.
단, 배포가 30일 이상 없으면 동일 장애가 재발할 수 있다 → 잔여 리스크로 기록.
