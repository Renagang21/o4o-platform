# WO-O4O-MEDICAL-DEVICE-FULL-SCALE-GATE-A-APPLY-RUNBOOK-V1

> 🛑 **HOLD — 실행하지 않음 (2026-07-05 결정).**
> 유통 증거 우선 원칙([`O4O-DISTRIBUTION-EVIDENCE-SEED-PRINCIPLE-V1`](../baseline/O4O-DISTRIBUTION-EVIDENCE-SEED-PRINCIPLE-V1.md))에 따라
> 전량 2.66M 는 유통 증거 0(공급자/매장/판매/이미지/가격 전무)인 **규제 SKU 덤프**이므로 적재하지 않는다.
> 본 문서는 절차 기록으로만 보존한다. 재개하려면 유통 증거 기반 선별 기준을 먼저 정의해야 한다.

> 작업 성격: **전량 2.66M Gate A ProductCandidate apply 실행 전 runbook (문서만).** apply 미실행, DB write 0, migration 0, Cloud Run Job 0. 산출물 = 본 문서 1개.
> 작성일: 2026-07-05 · 기준 저장소: `C:\Users\sohae\o4o-platform` (집 PC). Linux `/workspace` 무시.
> 선행: `WO-O4O-MEDICAL-DEVICE-STREAMING-IMPORTER-DRYRUN-V1`(streaming dry-run 완주, commit 356f9aa6d), `WO-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-APPLY-RUNBOOK-V1`(표본 20k), `CHECK-O4O-MEDICAL-DEVICE-FULL-SCALE-RAW-FETCH-AND-GATE-A-IMPORT-DRYRUN-V1`
> 범위 고정: **의료기기 트랙 전용, 전량 2,657,803.** 의약외품/건강기능식품/약가 혼입 금지. 병렬 세션 파일 무수정.
> **승인 게이트: 사용자가 명시적으로 "의료기기 전량 apply 승인" 이라고 말하기 전 apply 실행·streaming-apply 구현·Cloud Run Job 신설 금지.**

---

## 0. 한 줄 요약 + 핵심 경계

의료기기 표준코드 ProductCandidate **전량 2.66M**(streaming dry-run 확정 distinct signature 2,656,075)을
`product_candidates` 에 적재하기 위한 apply 절차·선결 구현·검증 SQL·rollback·중단 조건을 고정한다.
**이 문서는 apply 를 실행하지 않으며, streaming-apply 코드도 구현하지 않는다.** ProductMaster/ProductIdentifier 생성 = **0**.

```text
Gate A apply = ProductCandidate 적재. Gate B 승격 아님.
전량은 단일 트랜잭션/단일 문자열/전량 배열이 불가 → streaming-apply(청크 커밋) 선결 구현 필요.
dedup 키 = rowSignature. UDIDI_CD 단독 dedup 금지(충돌행 49,715키/105,597행 병합 방지).
표본 20k baseline(approved_new_master 19,602)은 절대 훼손 금지 → 재import UPDATE 대상에서 제외.
```

---

## 1. apply 대상 (streaming dry-run 확정치, 2026-07-05)

| 항목 | 값 |
|---|---|
| sourceType | `external_api` |
| sourceLabel | `MFDS_MEDICAL_DEVICE_STANDARD_CODE` |
| raw_payload sourceKind | `medical_device_standard_code` |
| raw 파일 (repo 밖, G:) | `…\full-fetch\medical-device\md-full-20260705-142323\raw.jsonl` (2,561,589,662 bytes ≈ 2.56GB) |
| raw line count | **2,657,803** (manifest rawLineCount 일치, checksum `2befbfaf…`) |
| totalRows(파싱)/errored/invalidJson | 2,657,803 / 0 / 0 |
| **distinct rowSignature (createdExpected 상한)** | **2,656,075** |
| within-file 완전중복 skip | 1,728 |
| identifierType 분포 | GTIN 2,574,214 / UDI_DI 83,588 / null 1 |
| dupConflict (matchStatus=conflict 보존) | 49,715 key / 105,597 row |
| multiUdiPermit / distinctPermit | 46,856 / 77,146 |
| manufacturerMissing | 36,777 |
| **ProductMaster 승격 / ProductIdentifier 생성** | **0 / 0** |

write 대상 테이블: **`product_candidates` 단 하나.**

### 1.1 baseline 대비 실제 create/update/protected (추정 — DB 조인으로 확정 필요)

프로덕션 현재 의료기기 candidate baseline (2026-07-05 read-only 실측):

| candidate_status | count | apply 시 처리 |
|---|---:|---|
| approved_new_master | 19,602 | **protectedBaselineSkipped** (UPDATE 금지 — Gate B 승격 baseline 보호) |
| pending | 394 | updatedExpected (재import UPDATE) |
| **MD baseline 합계** | **19,996** | — |

**추정 델타** (표본 19,996 signature 가 전량 distinct set 의 부분집합이라는 가정):

| 항목 | 추정 |
|---|---:|
| wouldInsert (신규) | ≈ 2,656,075 − 19,996 = **2,636,079** |
| wouldUpdate (pending 재import) | ≈ 394 |
| protectedBaselineSkipped (approved_new_master) | ≈ 19,602 |

> ⚠️ 이 델타는 **추정**이다. 표본 20k(2026-07-02 fetch)와 전량(2026-07-05 fetch)은 수집 시점이 다르므로,
> 필드 변경 시 rowSignature 가 달라져 baseline 이 전량 set 에 없을 수 있다(그 경우 해당 baseline 은
> UPDATE 대상에서 빠지고 신규 signature 로 INSERT). **apply 전 §3-2 DB-connected streaming dry-run 으로
> wouldInsert/wouldUpdate/protectedBaselineSkipped 실수치를 반드시 확정한다.**

### 1.2 적재 후 테이블 규모

현재 `product_candidates`(deleted_at IS NULL) ≈ 398,115 → apply 후 ≈ **3,034,194** (+2.63M).
대형 테이블이나 Postgres 정상 범위. 인덱스/쿼리 계획 영향은 §5 채널 결정 시 점검.

---

## 2. 선결 구현 (⛔ 미구현 — apply 승인 후 별도 착수)

현 `MedicalDeviceStandardCodeCandidateImportService.applyRows()` 는 **전량 `mapped` 배열을 메모리에
보관**하고 단일 트랜잭션으로 처리한다. 2.66M 에서는 (a) readFileSync 문자열 한계, (b) 매핑배열 RAM 폭증,
(c) 단일 트랜잭션 장시간 잠금으로 불가. streaming dry-run 경로는 **집계 전용(apply 미지원)**.

→ **streaming-apply executor** 를 선결 구현해야 한다. 설계:

```text
readline(파일) → 한 줄씩 parse+map (원본 배열 미보관)
  · seenSig: Set<string>        // within-file rowSignature dedup
  · existing: Map<sig,status>   // 시작 시 1회 로드 (MD baseline 19,996건 — 소규모, 전량 preload)
  · batchBuffer: MappedRow[]    // BATCH(예: 2,000) 채워지면 flush
flush(batch):
  · classify: existing 없음→INSERT / approved_new_master|merged→SKIP(protected) / else→UPDATE
  · 배치 INSERT(다중행 VALUES) + 배치 UPDATE
  · **청크 커밋**: 배치마다(또는 N배치마다) COMMIT. 단일 2.66M 트랜잭션 금지.
  · importRunId 마커: raw_payload.importRunId = 'md-full-20260705-142323' 부착 → rollback 표적화
진행 로그(stderr): committed=… inserted=… updated=… protected=… heapUsed=…
재개(resume): 중단 시 seenSig/existing 로 idempotent 재실행(이미 INSERT 된 signature 는 UPDATE 로 흡수)
```

핵심 불변(기존 정책 재사용): 파서/매퍼/rowSignature/교차행/baseline 보호(`approved_new_master`,`merged`)
동일. **UDIDI 단독 dedup 금지.** 신규 컬럼/스키마 변경 없음(`raw_payload` JSONB 에 importRunId 추가만).

> 이 구현은 **본 runbook 범위 밖**이다. "의료기기 전량 apply 승인" 후 별도 착수 → 다시 dry-run(§3-2) → apply(§3-3).

---

## 3. 실행 명령

### 3-1. offline streaming dry-run (DB 무관, 언제든 안전 — 이미 완주)
```bash
cd apps/api-server
cross-env NODE_OPTIONS=--max-old-space-size=8192 \
npx tsx src/scripts/medical-device-standard-code-streaming-dryrun.ts \
  --file "…\md-full-20260705-142323\raw.jsonl" --progress-every 250000
```
기대: `totalRows=2,657,803 createdExpected=2,656,075 skipped=1,728 errored=0`, dupConflict 49,715/105,597. (write 0)

### 3-2. DB-connected streaming dry-run — **선결 구현 후**, read-only SELECT
```text
streaming-apply executor 를 --dry-run --use-db 모드로:
  existing(19,996) preload → 전량 스트림 → wouldInsert/wouldUpdate/protectedBaselineSkipped 집계만, write 0.
기대(확정 대상): wouldUpdate≈394 / protectedBaselineSkipped≈19,602 / wouldInsert≈2,636,079 (§1.1 추정 검증).
```

### 3-3. apply — **⛔ 사용자 "의료기기 전량 apply 승인" + streaming-apply 구현 후에만**
```text
env MEDICAL_DEVICE_IMPORT_ALLOW_APPLY=I_UNDERSTAND + --apply --use-db + 청크 커밋.
채널: §5. 실행 중 §4 진행 카운트 모니터. 이상 시 중단→§6 rollback.
```

---

## 4. 검증 SQL (모두 read-only, apply 전/후)

**write 범위:** `product_candidates` INSERT/UPDATE only. `product_masters`/`product_identifiers`/`supplier_product_offers`/`organization_product_listings`/`store_local_products` 생성 금지.

```sql
-- A. product_candidates 전체 count (apply 전/후 델타 ≈ wouldInsert)
SELECT count(*) FROM product_candidates WHERE deleted_at IS NULL;

-- B. 의료기기 track count (apply 전 19,996 → 후 ≈ 2,656,075)
SELECT count(*) FROM product_candidates
 WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
   AND raw_payload->>'sourceKind'='medical_device_standard_code' AND deleted_at IS NULL;

-- C. importRunId 별 분포 (전량 신규분 = md-full-20260705-142323, baseline 은 NULL/구값)
SELECT raw_payload->>'importRunId' AS run_id, count(*) FROM product_candidates
 WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE' AND deleted_at IS NULL
 GROUP BY 1 ORDER BY 2 DESC;

-- D. baseline 보호 확인 (approved_new_master 19,602 불변 — status/matched master 미변경)
SELECT candidate_status, count(*) FROM product_candidates
 WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE' AND deleted_at IS NULL
 GROUP BY 1 ORDER BY 2 DESC;

-- E. identifier_type 분포 (GTIN 2,574,214 / UDI_DI 83,588 / null 1 근사)
SELECT identifier_type, count(*) FROM product_candidates
 WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE' AND deleted_at IS NULL
 GROUP BY 1 ORDER BY 2 DESC;

-- F. conflict 보존 (matchStatus=conflict ≈ 105,597 = reviewFlags 포함건과 정합)
SELECT count(*) FROM product_candidates
 WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE' AND match_status='conflict' AND deleted_at IS NULL;

-- G. ProductMaster/Identifier — apply 전후 **불변**
SELECT (SELECT count(*) FROM product_masters) AS masters,
       (SELECT count(*) FROM product_identifiers) AS identifiers;

-- H. idempotency: 동일 rowSignature 중복 0
SELECT count(*) FROM (
  SELECT raw_payload->>'sourceRowSignature' sig, count(*) FROM product_candidates
   WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE' AND deleted_at IS NULL
   GROUP BY 1 HAVING count(*)>1) t;
```

기대(apply 후): B≈2,656,075 · C run_id=md-full-… ≈ 2,636,079 신규 · **D approved_new_master 19,602 불변** ·
E GTIN 2,574,214 근사 · F conflict ≈ 105,597 · **G masters/identifiers 불변** · H = 0.

---

## 5. apply 채널 (미결 — 사용자 결정)

| 채널 | 방식 | 비고 |
|---|---|---|
| (a) local tsx + Cloud SQL Auth Proxy | proxy 5433 + streaming-apply `--apply --use-db`, 청크 커밋 | 2.66M 을 로컬 장시간 스트림. 네트워크/토큰 만료(≈1h) 리스크 → 재개(resume) 필수 |
| (b) **Cloud Run Job 신설** (권장) | drug-seed/hff 패턴: Job entry + GCS raw 업로드(2.56GB) + 이중 env 가드 + 청크 커밋 | 전량 2.66M 에 적합. 내부망 안정. 재시도/타임아웃 제어 |

권장: **전량은 (b) Cloud Run Job.** 어느 채널이든 write 는 "의료기기 전량 apply 승인" 후에만.
Cloud SQL Auth Proxy 토큰은 ≈1시간 만료 → (a) 는 장시간 apply 중 갱신/재개 설계 필요(§2 resume).

---

## 6. rollback 기준

| 조건 | 조치 |
|---|---|
| §4 검증 실패(count 불일치 / baseline approved_new_master 변동 / master·identifier 증가 / H>0) | 전량 신규분만 롤백 |
| 청크 커밋 특성 | 단일 트랜잭션 아님 → 부분 커밋 가능. importRunId 로 표적 롤백 |

**롤백 대상 한정 (baseline·타 트랙 보호):**
```sql
-- soft-delete: md-full-20260705-142323 신규분만. approved_new_master baseline(19,602)·타 트랙 미영향.
UPDATE product_candidates SET deleted_at = NOW()
 WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
   AND raw_payload->>'importRunId' = 'md-full-20260705-142323'
   AND candidate_status NOT IN ('approved_new_master','merged')   -- baseline 이중 보호
   AND deleted_at IS NULL;
-- 실행 전 동일 WHERE count 확인 (≈ 2,636,079 예상). baseline 포함 여부 재확인.
```
`importRunId` + `sourceKind` = 트랙·실행 격리 키. 표본 20k baseline 은 importRunId 마커가 없어 걸리지 않는다.

**재실행 idempotency:** 같은 raw 재-apply 시 rowSignature dedup 으로 기존분 UPDATE(count 불변), 신규만 INSERT.

---

## 7. 승인 게이트

```
[streaming dry-run 356f9aa6d] → [본 runbook]
  → ⛔사용자 "의료기기 전량 apply 승인"⛔
  → streaming-apply executor 구현(§2) → DB dry-run(§3-2, write 0) 로 델타 확정
  → 채널 구축(§5) → pre-snapshot(§4 A/B/D/G) → apply(§3-3, 청크 커밋)
  → post 검증(§4) → 이상 시 rollback(§6)
```

**"의료기기 전량 apply 승인" 전에는 §2 구현·§3-3 apply·§5 채널 구축(Proxy write/Cloud Run Job/GCS 업로드)를 실행하지 않는다.** 그 전 허용은 §3-1 offline streaming dry-run(DB 무관)뿐.

---

## 8. 금지 사항 (본 문서)

| 항목 | 결과 |
|---|---|
| streaming-apply 구현 | **0** (설계 명세만) |
| ProductCandidate apply 실행 | **0** |
| ProductMaster 승격 / ProductIdentifier 생성 | 0 |
| Offer / Listing / StoreLocal 생성 | 0 |
| DB write / migration / Cloud Run Job / GCS 업로드 | 0 |
| raw 대용량 커밋 | 0 |
| serviceKey / DB secret 원문 기록 | 0 (변수명만) |
| 범위 확장(타 seed 트랙) / 병렬 세션 파일 수정 | 0 |

이번 변경 = 본 runbook 문서 1건.

---

## 9. 다음 단계

1. 사용자 "의료기기 전량 apply 승인" → §2 streaming-apply 구현 → §3-2 DB dry-run 델타 확정 → §5 채널 → §3-3 apply → §4 검증.
2. **전량 permit status map build** — distinct PERMIT_NO 77,146 대상 status lookup(15057456 `RTRCN_DSCTN_DIVS_CD IS NULL`). Gate A candidate 는 STATUS_UNCHECKED 이므로 Gate B 전 필수. 별도 WO.
3. **전량 Gate B dry-run(batch-commit executor)** → 승인 → Gate B apply → CHECK.

**최종: 전량 2.66M Gate A apply 의 선결 구현(streaming-apply executor)·기대 델타(≈2,636,079 insert / baseline 19,602 protect)·검증 SQL·importRunId 기반 표적 rollback·트랙 격리·승인 게이트를 고정했다. apply 와 구현은 "의료기기 전량 apply 승인" 후에만. Gate A 완료 ≠ Gate B 승격.**
