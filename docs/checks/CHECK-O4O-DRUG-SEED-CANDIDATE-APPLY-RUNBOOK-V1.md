# CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1

> 성격: **실행 런북(read-only 문서)** — 코드/DB 변경 0. 약가마스터 seed 의 실제 DB 적재 절차·명령어·백업·승인·검증·rollback 을 고정한다.
> 선행: `CHECK-O4O-DRUG-CANDIDATE-IMPORT-PIPELINE-V1`, `CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-DRYRUN-V1`, `CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1`.
> ⚠️ 이 문서는 절차 확정용이다. 실제 `--apply` 실행은 아래 **승인 게이트**를 통과한 뒤에만 한다.

---

## 0. 환경 판정 (실측)

| 항목 | 결과 |
|---|---|
| 전용 **스테이징 DB** | **없음** — `apps/api-server/src/database/connection.ts`·워크플로에 staging DB 참조 0. `deploy:staging` 은 금지된 PM2 레거시(CLAUDE.md §6). |
| 운영 DB | Cloud SQL `o4o-platform-db` (host 34.64.96.252, db `o4o_platform`) — **방화벽**(Cloud Run/Console/`gcloud sql` 외 차단, CLAUDE.md §0) |
| 로컬 직접 TCP | 불가(방화벽). candidate import CLI(local tsx) 는 **cloud-sql-proxy** 또는 Cloud Run one-off 로만 write 접속 |

**→ 실효 경로 = B (운영에 ProductCandidate 만 선적재).** A(스테이징 우선)는 스테이징 DB 확보 시에만 적용(현재 대상 없음).
**→ ProductMaster 승격(promotion `--apply`)은 이 런북 범위 밖.** candidate 적재 + promotion **dry-run 리포트**까지만. Master apply 는 별도 승인.

---

## 1. 목표 / 비목표

**목표(B 경로)**
```
1. 운영 DB 백업 확인
2. ProductCandidate import dry-run 재확인
3. ProductCandidate --apply (약가마스터 active+표준코드 후보 적재)
4. 적재 건수 검증
5. promotion apply dry-run 실행 (write 0) → create/link/conflict 리포트
6. ProductMaster 승격 apply 여부 별도 승인 (이 런북에서 실행 안 함)
```

**비목표**
```
- ProductMaster / ProductIdentifier 생성 (promotion --apply) — 실행 안 함
- RepresentativeProduct / SharedProductDescription / DrugExtension / Image 생성
- migration
```

---

## 2. 사전 조건 체크리스트

- [ ] 약가마스터 CSV 확보: `C:\Users\home\coding\o4o-public-data-samples\mfds-drug-master-standard-code.csv` (54,880,067 B / 305,522행 / CP949). repo 밖·미커밋.
- [ ] `gcloud` 인증 및 프로젝트 설정 완료(`gcloud auth list`, `gcloud config get-value project`).
- [ ] Cloud SQL 접속 채널 확보: **cloud-sql-proxy** (`--port 15432`) 또는 Cloud Run one-off job. DB 자격증명 = Cloud Run env(비번 문서 기록 금지).
- [ ] candidate import 안전 가드 env 이해: `--apply` 는 `DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND` 없으면 **차단**(CLI 자체 가드, drug-candidate-import.ts:82).
- [ ] 본 런북 §7 승인 문구를 사용자에게 확인받음.

---

## 3. 백업 / 스냅샷 확인 (apply 직전 필수)

```bash
# 최근 자동 백업 확인
gcloud sql backups list --instance=o4o-platform-db --limit=5

# 적재 직전 온디맨드 백업 생성 (rollback 안전망)
gcloud sql backups create --instance=o4o-platform-db \
  --description="pre-drug-candidate-seed $(date +%Y%m%d)"

# 생성 완료(status=SUCCESSFUL) 확인 후 backup id 기록
gcloud sql backups list --instance=o4o-platform-db --limit=3
```

- [ ] 백업 id 기록: `__________`  · status SUCCESSFUL 확인.
- 참고: product_candidates 는 검토 큐(완충 계층)라 Core(product_masters) 를 건드리지 않으나, 대량 INSERT 이므로 백업을 원칙으로 한다.

---

## 4. 실행 절차 (B 경로)

### 4-1. dry-run 재확인 (offline — DB 무접속)

```powershell
cd C:\Users\home\coding\o4o-platform
pnpm --filter @o4o/api-server drug:candidate-import -- `
  --file "C:\Users\home\coding\o4o-public-data-samples\mfds-drug-master-standard-code.csv" `
  --base-date 2025-10-31
```
- 기대: `mode=dry-run`, `totalRows=305522`, `classification active≈230842 cancelled≈74680`. (offline 은 created 상한값 — DB dedup 미반영.)

### 4-2. dry-run + DB dedup (read-only, 기존 후보와 update 예측)

```powershell
# cloud-sql-proxy 기동(별도 터미널) 후, DB env 주입 상태에서:
pnpm --filter @o4o/api-server drug:candidate-import -- `
  --file "...\mfds-drug-master-standard-code.csv" --base-date 2025-10-31 --use-db
```
- `--use-db` 는 **읽기 전용**(dedup 예측만). `dedupChecked(DB)=true` 확인. 재실행 시 updated 예측 증가 = 정상.

### 4-3. **APPLY** (운영 ProductCandidate 적재) — 승인 후에만

```powershell
# 안전 가드 해제 env + --apply (동일 세션에서만)
$env:DRUG_IMPORT_ALLOW_APPLY = "I_UNDERSTAND"
pnpm --filter @o4o/api-server drug:candidate-import -- `
  --file "...\mfds-drug-master-standard-code.csv" --base-date 2025-10-31 --apply
Remove-Item Env:\DRUG_IMPORT_ALLOW_APPLY
```
- write 대상 = `product_candidates` **뿐** (ProductMaster/Identifier 미생성 — 파이프라인 계약).
- dedup 키 = (source_type='csv_import', 표준코드, sourceBaseDate). 재실행 idempotent(기존 후보 update).
- 산출 JSON(`JSON_REPORT_BEGIN…END`) 을 repo 밖 파일로 저장. **커밋 금지.**

---

## 5. 검증 SQL (적재 후 — read-only)

> 실행: Cloud Console SQL Editor 또는 `gcloud sql connect o4o-platform-db --user=postgres --database=o4o_platform`. 결과의 민감데이터 없음(공공 약가데이터).

```sql
-- 5-1. 적재 총량 (약가마스터 candidate)
SELECT count(*) AS total,
       count(*) FILTER (WHERE (raw_payload->>'isCancelled')::bool IS NOT TRUE) AS active,
       count(*) FILTER (WHERE (raw_payload->>'isCancelled')::bool IS TRUE)     AS cancelled
FROM product_candidates
WHERE source_type='csv_import'
  AND identifier_type='KOREA_DRUG_CODE'
  AND deleted_at IS NULL
  AND raw_payload->>'sourceBaseDate' = '2025-10-31';

-- 5-2. 표준코드 유일성 (중복 0 기대)
SELECT normalized_identifier_value, count(*) c
FROM product_candidates
WHERE source_type='csv_import' AND identifier_type='KOREA_DRUG_CODE' AND deleted_at IS NULL
GROUP BY 1 HAVING count(*) > 1 LIMIT 20;

-- 5-3. sourceLabel / batch 확인
SELECT source_label, count(*) FROM product_candidates
WHERE source_type='csv_import' AND identifier_type='KOREA_DRUG_CODE' AND deleted_at IS NULL
GROUP BY 1;

-- 5-4. sample
SELECT id, candidate_name, candidate_manufacturer, normalized_identifier_value,
       raw_payload->>'mfdsCode' AS mfds_code
FROM product_candidates
WHERE source_type='csv_import' AND identifier_type='KOREA_DRUG_CODE' AND deleted_at IS NULL
ORDER BY created_at DESC LIMIT 10;
```

- [ ] total ≈ import 리포트 created 수와 일치.
- [ ] 5-2 결과 0행(표준코드 유일).

---

## 6. promotion dry-run (candidate 적재 후, write 0)

```powershell
# cloud-sql-proxy 기동 상태(DB read) — --apply 없음 = dry-run
pnpm --filter @o4o/api-server drug-master:promotion:apply -- --source-label 2025-10-31
```
- 기대(빈 Master 기준): `wouldCreateMaster≈230841`, `conflict*≈0`, `skippedInvalidStandardCodeCheckDigit=1`(원본 오타 1건).
- create/link/conflict 리포트를 근거로 **ProductMaster 승격 apply 여부**를 §7-B 승인으로 별도 결정.

---

## 7. 승인 게이트 (문구 고정)

**게이트 A — ProductCandidate 운영 적재 (§4-3)**
> "약가마스터 305,522행 중 active 표준코드 후보를 운영 `product_candidates` 에 적재한다(ProductMaster 미생성). 백업 id `____` 확인함. 진행을 승인한다."

**게이트 B — ProductMaster 승격 apply (이 런북 밖, 후속)**
> "promotion dry-run 리포트(wouldCreate/link/conflict 수치)를 확인했다. eligible `____` 건을 `product_masters`+`product_identifiers` 로 승격 apply 한다. 백업 id `____` 확인함. `--apply --i-understand-apply`(운영은 `--confirm-production`) 실행을 승인한다."

- 게이트 미승인 시 해당 단계 실행 금지. 승인은 단계별로 분리(A 승인이 B 를 포함하지 않음).

---

## 8. Rollback 기준

**8-1. ProductCandidate 적재 rollback (soft-delete)**
```sql
-- batch 한정 soft-delete (물리 삭제 아님, deleted_at)
UPDATE product_candidates
SET deleted_at = NOW()
WHERE source_type='csv_import'
  AND identifier_type='KOREA_DRUG_CODE'
  AND raw_payload->>'sourceBaseDate' = '2025-10-31'
  AND deleted_at IS NULL;
```
- 데이터 변경(UPDATE)이므로 **사용자 승인 필수**(CLAUDE.md §0). candidate 는 완충 계층이라 이 rollback 이 Core 에 영향 없음.

**8-2. 대규모 오류 시**: §3 백업 id 로 Cloud SQL 복원(`gcloud sql backups restore`). 전체 DB 롤백이므로 최후 수단.

**8-3. ProductMaster 승격 rollback (게이트 B 이후 해당)**: 승격 Master 는 `tags @> ['import:hira-drug-master']` + `product_identifiers.metadata->>'importBatchId'` 로 추적. 단 offer/listing 부착 후에는 `ON DELETE RESTRICT` 로 삭제 차단 → 부착 전에만 안전. 전용 rollback CLI 는 별도 WO.

---

## 9. 실행 로그 (2026-07-03 실행 — 게이트 A)

> 채널: **Cloud Run one-off Job** `o4o-drug-seed-candidate-import`(region asia-northeast3). CSV=GCS `gs://o4o-media-library/data-seed/mfds-drug-master-standard-code.csv`. 이미지=커밋 `b6a7db06b`.

| 단계 | 결과 |
|---|---|
| 백업 생성 (§3) | ✅ backup id **1783044238390** (SUCCESSFUL) |
| 게이트 A 승인 (§7) | ✅ 사용자 승인, 채널=Cloud Run one-off |
| candidate apply (§4-3) | ✅ exit(0), **created=145,415 / updated=160,107 / skipped=0 / errored=0** (총 305,522). active=230,842 cancelled=74,680 |
| 검증 SQL (§5) | ✅ total=**305,522** (active 230,842 / cancelled 74,680), 표준코드 중복 **0** |
| promotion dry-run (§6) | ⏸ 미실행 (게이트 B 영역) |

**실행 중 해소한 파이프라인 이슈**:
- `src/scripts/**` 는 tsup entry/build 제외 → 이미지 미포함. **src 루트 전용 Job entry** `drug-seed-candidate-import-job.ts`(GCS 다운로드) 신설 + tsup entry + Dockerfile COPY + `.dockerignore` 허용 추가.
- 수출명 병기로 한글상품명/약품규격>255·포장형태>64 → varchar overflow. mapper 절단(원본은 rawPayload.source 무손실).
- per-row SELECT+INSERT(≈460k)가 Job 1h timeout 초과 → **배치(단일 SELECT + 청크 multi-row INSERT)** 로 전환, ~2분 완료.

**보존 자산**(재시드용): GCS CSV, Cloud Run Job `o4o-drug-seed-candidate-import`(idempotent). 재실행 시 기존분 updated(write 생략)+신규분만 insert.

---

## 10. 완료 기준

```
- 환경 판정(스테이징 무 → B 경로) 명시
- 백업/승인/검증/rollback 절차·SQL 고정
- 실제 --apply 는 게이트 승인 후 별도 실행 (이 문서는 절차 확정만)
- 코드/DB 변경 0, raw/report/key 미커밋
```

**다음**: 사용자가 게이트 A 를 승인하면 §3→§4→§5→§6 순으로 실행하고, promotion dry-run 결과를 근거로 게이트 B(ProductMaster 승격)를 별도 판단한다.
