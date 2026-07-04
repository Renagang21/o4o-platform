# WO-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-APPLY-RUNBOOK-V1

> 작업 성격: **Gate A ProductCandidate apply 실행 전 runbook (문서만).** apply 미실행, DB write 0, migration 0, Cloud Run Job 0. 산출물 = 본 문서 1개.
> 작성일: 2026-07-04
> 기준 저장소: `C:\Users\sohae\o4o-platform` (집 PC). Linux `/workspace` 무시.
> 선행: `WO-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-IMPORT-V1`(구현·commit f6c39286b), `CHECK-O4O-MEDICAL-DEVICE-UDI-IDENTIFIER-CONFLICT-POLICY-V1`, `WO-O4O-MEDICAL-DEVICE-GTIN-UDI-PROMOTION-DRYRUN-GATE-B-V1`
> 참조 절차: `WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-APPLY-RUNBOOK-V1`
> 범위 고정: **의료기기 트랙 전용, 표본 20,000.** 의약외품/건강기능식품/약가 내용 혼입 금지. 병렬 세션 파일 무수정.
> **승인 게이트: 사용자가 명시적으로 "의료기기 apply 승인" 이라고 말하기 전 apply 실행 금지.**

---

## 0. 한 줄 요약 + 핵심 경계

의료기기 표준코드 ProductCandidate **19,996건**(표본 20,000 기준)을 `product_candidates` 에 적재하기 위한 apply 절차·검증 SQL·rollback·중단 조건을 고정한다. 이 문서는 **apply 를 실행하지 않는다.** ProductMaster/ProductIdentifier 생성은 **0** 이다.

```text
Gate A apply 는 ProductCandidate 적재 완료를 의미한다.
Gate B 승격 가능성을 의미하지 않는다.
의료기기 Gate B 는 status map 조인 + 별도 runbook + 사용자 명시 승인 후에만 진행한다.
```

```text
dedup 키 = rowSignature (PRDLST_NM|FOML_INFO|PERMIT_NO|MNFT_IPRT_ENTP_NM|MDEQ_CLSF_NO|UDIDI_CD).
UDIDI_CD 단독 dedup 금지.
사유: 같은 UDIDI_CD 가 서로 다른 제품/허가/업체를 가리키는 충돌행이 122키/244행 존재.
UDIDI 단독으로 dedup 하면 서로 다른 제품이 병합된다.
rowSignature 로 dedup 해야 완전 동일행(4건)만 skip 되고 충돌행은 별도 후보로 보존된다.
```

---

## 1. apply 대상

| 항목 | 값 |
|---|---|
| sourceType | `external_api` |
| sourceLabel | `MFDS_MEDICAL_DEVICE_STANDARD_CODE` |
| raw_payload sourceKind | `medical_device_standard_code` |
| raw 파일 (repo 밖) | `G:\내 드라이브\자료실\public-data-api-samples\mfds-medical-device-standard-code-raw.jsonl` (20,000 rows 표본) |
| **expected created** | **19,996** |
| expected updated | 0 (신규 적재. 최초 실행) |
| expected skipped | **4** (완전 동일 rowSignature 중복) |
| expected errored | 0 |
| identifierType 분포 | GTIN 19,845 / UDI_DI 155 / null 0 |
| dupConflict | 122 key / 244 row (matchStatus=conflict 로 보존) |
| **ProductMaster 승격** | **0** |
| **ProductIdentifier 생성** | **0** |

write 대상 테이블: **`product_candidates` 단 하나.** INSERT(기존 없음) / UPDATE(재실행 시 기존분).

> 이 수치는 **20,000 표본** 기준이다. 원천 2.65M 전량 apply 는 별도 WO(재수집·재계산 후).

---

## 2. 사전조건 (apply 직전 체크리스트)

| # | 항목 | 확인 방법 | 기대값 |
|---|---|---|---|
| 1 | git clean | `git status --short` | 의료기기 관련 미커밋 변경 없음 |
| 2 | origin/main 최신 | `git fetch origin main; git rev-list --left-right --count HEAD...origin/main` | `0  0` |
| 3 | 구현 커밋 존재 | `git log --oneline -1 -- apps/api-server/src/modules/neture/drug-import/medical-device-standard-code-candidate-import.service.ts` | f6c39286b |
| 4 | raw line count | PowerShell `Measure`(개행) | 20,000 (+trailing 1 blank) |
| 5 | offline dry-run 재실행 | §3-1 | created 19,996 / skip 4 / error 0 / GTIN 19,845 / UDI_DI 155 |
| 6 | `--use-db` dry-run | §3-2 | createdExpected 19,996 / updatedExpected 0 (최초) |
| 7 | product_candidates 전체 count snapshot | §4 SQL A | 값 기록(기준선) |
| 8 | 동일 sourceLabel/sourceKind count snapshot | §4 SQL B | **0** (미적재) |
| 9 | ProductMaster/Identifier 기준선 | §4 SQL G | 값 기록(apply 후 불변 확인용) |
| 10 | production DB 백업/스냅샷 | Cloud SQL 백업 id 확보 | 백업 id 기록 |
| 11 | APPLY 가드 | env `MEDICAL_DEVICE_IMPORT_ALLOW_APPLY=I_UNDERSTAND` | apply 시에만 설정 |

> **DB 접속(변수명만 — secret 원문 금지):** `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME` (`apps/api-server/.env`). 프로덕션 방화벽으로 로컬 직접 TCP 차단 → §5 채널 결정에 종속.

---

## 3. 실행 명령

> package.json 스크립트 미등록(병렬 세션 미커밋 흡수 회피) → `npx tsx` 직접 호출.

### 3-1. offline dry-run (DB 무관, 언제든 안전)
```bash
cd apps/api-server
npx tsx src/scripts/medical-device-standard-code-candidate-import.ts \
  --file "G:\내 드라이브\자료실\public-data-api-samples\mfds-medical-device-standard-code-raw.jsonl" --dry-run
```
기대: `createdExpected=19996 skipped=4 errored=0`, `dupConflict key=122 row=244`, `dedupChecked=false`.

### 3-2. dry-run --use-db (read-only SELECT, 기존 후보 대비 create/update 예측)
```bash
npx tsx src/scripts/medical-device-standard-code-candidate-import.ts \
  --file "<raw 경로>" --dry-run --use-db
```
기대: 최초면 `createdExpected=19996 updatedExpected=0`, `dedupChecked=true`. (SELECT 만, write 0)

### 3-3. apply --use-db — **⛔ 사용자 "의료기기 apply 승인" 전 실행 금지**
```bash
# ⛔ "의료기기 apply 승인" 후에만 실행.
MEDICAL_DEVICE_IMPORT_ALLOW_APPLY=I_UNDERSTAND \
npx tsx src/scripts/medical-device-standard-code-candidate-import.ts \
  --file "<raw 경로>" --apply --use-db
```
가드: `--apply` 는 CLI 에서 `MEDICAL_DEVICE_IMPORT_ALLOW_APPLY=I_UNDERSTAND` 없으면 `APPLY_BLOCKED` throw.

---

## 4. 검증 SQL (모두 read-only, apply 전/후 실행)

**write 범위:** `product_candidates` INSERT/UPDATE **only.** `product_masters` / `product_identifiers` / `supplier_product_offers` / `organization_product_listings` / `store_local_products` 생성 **금지.**

```sql
-- A. product_candidates 전체 count (apply 전/후 델타 = 19,996 기대)
SELECT count(*) FROM product_candidates WHERE deleted_at IS NULL;

-- B. 의료기기 source_label/sourceKind count (apply 전 0 → 후 19,996)
SELECT count(*) FROM product_candidates
 WHERE source_type='external_api' AND source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
   AND raw_payload->>'sourceKind'='medical_device_standard_code' AND deleted_at IS NULL;

-- C. identifier_type 분포 (GTIN 19,845 / UDI_DI 155 / null 0 기대)
SELECT identifier_type, count(*) FROM product_candidates
 WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
   AND raw_payload->>'sourceKind'='medical_device_standard_code' AND deleted_at IS NULL
 GROUP BY identifier_type ORDER BY 2 DESC;

-- D. candidate_status / match_status 분포 (status 전량 pending, match: conflict 244 / unmatched 나머지)
SELECT candidate_status, match_status, count(*) FROM product_candidates
 WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
   AND raw_payload->>'sourceKind'='medical_device_standard_code' AND deleted_at IS NULL
 GROUP BY candidate_status, match_status ORDER BY 3 DESC;

-- E. UDI_DI_DUP_CONFLICT 보존 확인 (matchStatus=conflict 244 = reviewFlags 포함 건과 정합)
SELECT count(*) AS conflict_rows FROM product_candidates
 WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
   AND raw_payload->>'sourceKind'='medical_device_standard_code'
   AND match_status='conflict' AND deleted_at IS NULL;
SELECT count(*) AS flagged_rows FROM product_candidates
 WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
   AND raw_payload @> '{"reviewFlags":["UDI_DI_DUP_CONFLICT"]}' AND deleted_at IS NULL;

-- F. rawPayload 존재율 + 필수 파생값 (rawPayload null 0, sourceRowSignature 전건 존재)
SELECT
  count(*) FILTER (WHERE raw_payload IS NULL)                                AS rawpayload_missing,
  count(*) FILTER (WHERE raw_payload->>'sourceRowSignature' IS NULL)         AS signature_missing,
  count(*) FILTER (WHERE raw_payload->>'statusJoined' = 'false')             AS status_unjoined
  FROM product_candidates
 WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
   AND raw_payload->>'sourceKind'='medical_device_standard_code' AND deleted_at IS NULL;

-- G. ProductMaster / ProductIdentifier count — apply 전후 **불변** 확인
SELECT (SELECT count(*) FROM product_masters)     AS masters,
       (SELECT count(*) FROM product_identifiers) AS identifiers;

-- H. idempotency: 동일 rowSignature 중복 0 (재실행해도 증가 없음 확인용)
SELECT count(*) AS dup_signatures FROM (
  SELECT raw_payload->>'sourceRowSignature' AS sig, count(*)
    FROM product_candidates
   WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
     AND raw_payload->>'sourceKind'='medical_device_standard_code' AND deleted_at IS NULL
   GROUP BY 1 HAVING count(*) > 1
) t;
```

기대 (apply 후): B=19,996 · C GTIN 19,845/UDI_DI 155 · D status 전량 pending · E conflict_rows=flagged_rows=244 · F 전부 0(except status_unjoined=19,996) · **G masters/identifiers = apply 전과 동일(불변)** · H dup_signatures=0.

---

## 5. apply 채널 (미결 결정 — 사용자)

프로덕션 DB 는 방화벽으로 로컬 직접 접속 불가. 두 채널 중 결정:

| 채널 | 방식 | 비고 |
|---|---|---|
| (a) local tsx + Cloud SQL Auth Proxy | `bin/cloud-sql-proxy-v2.exe --token=$(gcloud auth print-access-token) --port 5433 …` → `--apply --use-db` (DB_HOST=127.0.0.1:5433). 채널: `reference_prod_db_read_channel` | 20,000 표본에 적합. IP whitelist 불필요. **단 apply=write 이므로 사용자 승인 필수** |
| (b) Cloud Run Job 신설 | drug-seed/hff 패턴: src 루트 Job entry + GCS raw 업로드 + 이중가드 env | 전량 2.65M 시 권장 |

권장: **표본 20,000 은 (a) local + Auth Proxy** (재실행 안전, 소규모). 전량은 (b). **어느 채널이든 write 실행은 "의료기기 apply 승인" 후에만.**

---

## 6. rollback 기준

| 조건 | 조치 |
|---|---|
| §4 검증 실패 (count 불일치 / conflict 미보존 / master·identifier 증가 / dup_signature>0) | 의료기기 적재분만 롤백 |
| 트랜잭션 방식 | apply 를 트랜잭션으로 감싸고 커밋 직전 §4 B/G/H 확인 → 이상 시 ROLLBACK, 정상 시 COMMIT |

**롤백 대상 한정 (타 트랙 영향 금지):**
```sql
-- soft-delete: 의료기기 적재분만. drug/quasi_drug/health_functional_food/easy_drug 미영향.
UPDATE product_candidates SET deleted_at = NOW()
 WHERE source_type='external_api'
   AND source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
   AND raw_payload->>'sourceKind'='medical_device_standard_code'
   AND deleted_at IS NULL;
-- 실행 전 반드시 동일 WHERE 로 count 확인 (= 19,996 예상). 다른 sourceKind 포함 여부 재확인.
```
`sourceKind='medical_device_standard_code'` 가 **트랙 격리 키**다. 타 seed 트랙은 이 조건에 걸리지 않는다.

**재실행 idempotency:** 같은 raw 재-apply 시 rowSignature dedup 으로 기존분은 UPDATE(count 불변), 신규만 INSERT. 무한 중복 없음(§4 H로 검증).

---

## 7. 승인 게이트

```
[구현 f6c39286b] → [본 runbook] → ⛔사용자 "의료기기 apply 승인"⛔
   → pre-snapshot(§4 A/B/G) → offline dry-run(§3-1) → use-db dry-run(§3-2)
   → 채널 구축(§5) → apply(§3-3) → post 검증(§4) → 이상 시 rollback(§6)
```

**사용자가 명시적으로 "의료기기 apply 승인" 이라고 말하기 전에는 §3-3 apply·§5 채널 구축(Proxy write/Cloud Run Job)·GCS 업로드를 실행하지 않는다.** 그 전까지 허용은 §3-1 offline dry-run(DB 무관)뿐이다.

---

## 8. 금지 사항

| 항목 | 결과(본 문서) |
|---|---|
| ProductCandidate apply 실행 | **0** (runbook 문서만) |
| ProductMaster 승격 | 0 (Gate A 범위 밖) |
| ProductIdentifier 생성 | 0 |
| SupplierProductOffer / OrgProductListing / StoreLocalProduct 생성 | 0 |
| DB write / migration / Cloud Run Job | 0 |
| raw 대용량 파일 커밋 | 0 |
| serviceKey / DB secret 원문 기록 | 0 (변수명만) |
| 범위 확장(타 seed 트랙) | 0 |
| 병렬 세션 파일 수정 | 0 |

이번 변경 = 본 runbook 문서 1건.

---

## 9. 다음 단계

1. 사용자 "의료기기 apply 승인" → §5 채널 결정 → §3-3 apply → §4 검증.
2. **Gate B apply runbook** — status map(15057456 `RTRCN_DSCTN_DIVS_CD IS NULL`) 조인 + PROMOTABLE 19,606 승격. HIBCC 155 는 UDI_DI만(barcode 없음). 별도 runbook + 사용자 승인.
3. **전량 2.65M 재수집/재계산 WO** — 표본 확정 후.

**최종: 의료기기 Gate A apply 절차·검증 SQL·rollback·트랙 격리(`sourceKind='medical_device_standard_code'`)·rowSignature dedup(UDIDI 단독 금지)·승인 게이트를 고정했다. apply 는 "의료기기 apply 승인" 후 pre-snapshot → dry-run → apply → §4 검증 순으로만 진행한다. Gate A 완료 ≠ Gate B 승격.**
