# O4O-MEDICAL-DEVICE-FULL-SCALE-SEED-EXPANSION-RUNBOOK-V1

> 작업 성격: **전량(~2.65M) 확장 실행 전 runbook (문서 전용).** 전량 fetch/Gate A import/Gate B promotion apply 미실행. DB write 0.
> 작성일: 2026-07-05
> 기준 저장소: `C:\Users\sohae\o4o-platform` (집 PC). Linux `/workspace` 무시.
> 선행 완주: 표본 20,000 Gate A→B (CHECK-O4O-MEDICAL-DEVICE-GATE-B-PROMOTION-APPLY-RESULT-V1, commit d83aa5785)

---

## 0. 한 줄 요약 + 핵심 경계

의료기기 표준코드 전량 ~2,656,054건을 재수집 → Gate A(ProductCandidate) → Gate B(ProductMaster/ProductIdentifier 승격)로 확장하기 위한 실행 절차·batch·resume·rollback·승인 게이트를 고정한다. **이 runbook 은 실행하지 않는다.**

```text
전량 확장 = 표본 파이프라인의 스케일업. 파이프라인/배치 write 는 표본에서 검증됨.
표본 승격분 19,602 는 baseline — 전량 재실행 시 훼손/중복생성 금지.
Gate B 는 여전히 status map 조인(active=RTRCN_DSCTN_DIVS_CD IS NULL) + 사용자 명시 승인 후에만.
Offer/Listing/StoreLocal/설명/이미지/노출 write = 0 (전 구간).
```

---

## 1. 현재 확정 상태 (표본 완주, Gate B apply 직후)

| 테이블 | 값 (2026-07-05 Gate B apply 후) |
|---|---|
| `product_masters` | **250,445** (표본 승격 +19,602 반영) |
| `product_identifiers` | **742,687** (+39,204: GTIN 19,602 + UDI_DI 19,602) |
| `product_candidates` (의료기기) | 19,996 = `approved_new_master` 19,602 + `pending` 394 |
| Offer / Listing / StoreLocal | 0 / 0 / 35 (불변 baseline) |

표본 보류 394: NON_GTIN_HIBCC 155 / DUP_CONFLICT 220 / PERMIT_NOT_FOUND 10 / PERMIT_INACTIVE_RTRCN 3 / REQUIRED_FIELD_MISSING 6.

승격 원칙(불변): barcode=GTIN 통과 UDI-DI, identifier=master당 GTIN+UDI_DI, `mfds_product_id=MFDS:MEDICAL_DEVICE:{UDIDI}`, 추적 `mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'` + identifier `source_type='medical_device_standard_code_promotion'`.

> **경로 정정:** 이 트랙의 WO/CHECK 문서는 전부 `docs/checks/` 에 있다(`docs/work-orders/` 아님). 원본 확장 WO 의 참조 경로는 정정 필요.

---

## 2. 코드/자원 위치 (preflight 확인 완료)

| 자원 | 위치 |
|---|---|
| Gate A importer CLI | `apps/api-server/src/scripts/medical-device-standard-code-candidate-import.ts` |
| Gate A service/parser/mapper | `.../drug-import/medical-device-standard-code-{candidate-import.service, jsonl.parser, candidate.mapper}.ts` |
| Gate B promotion CLI | `apps/api-server/src/scripts/medical-device-gate-b-promotion.ts` |
| Gate B service | `.../drug-import/medical-device-gate-b-promotion.service.ts` |
| UDI_DI identifier type | `.../entities/ProductIdentifier.entity.ts` (union+배열 반영됨) |
| DB read/write 채널 | Cloud SQL Auth Proxy v2 (`bin/cloud-sql-proxy-v2.exe`) + `gcloud auth print-access-token`, 5433 |
| serviceKey | env `PUBLIC_DATA_SERVICE_KEY` (`G:\...\public-data-api-samples\.env.public-data`, repo 밖) |
| 표본 raw | `G:\...\public-data-api-samples\mfds-medical-device-standard-code-raw.jsonl` (20,000) |
| 표본 status map | `permit-status-map.tsv` (786 permit, coverage WO 산출) |

핵심 값(불변): sourceLabel=`MFDS_MEDICAL_DEVICE_STANDARD_CODE`, sourceKind=`medical_device_standard_code`, dedup 키=`raw_payload->>'sourceRowSignature'`(=`PRDLST_NM|FOML_INFO|PERMIT_NO|MNFT_IPRT_ENTP_NM|MDEQ_CLSF_NO|UDIDI_CD`).

> **주의:** candidate 조회 시 `source_kind` 컬럼은 **없다** → `raw_payload->>'sourceKind'='medical_device_standard_code'` 사용. 원본 WO §5 SQL 의 `WHERE source_kind=...` 는 오류.

---

## 3. 전량 재수집 계획

### 3.1 데이터셋 / endpoint
| 항목 | 값 |
|---|---|
| 데이터셋 | 의료기기 표준코드별 제품정보 (data.go.kr 15073875) |
| endpoint | `https://apis.data.go.kr/1471000/MdeqStdCdPrdtInfoService03/getMdeqStdCdPrdtInfoInq03` |
| serviceKey 파라미터 | `serviceKey` (env `PUBLIC_DATA_SERVICE_KEY`, len 64, 특수문자 없음) |
| page 파라미터 | `pageNo` / `numOfRows` |
| type | `json` |
| totalCount 위치 | `body.totalCount` (기존 2,656,054) |
| wrapper | 수집 시 `{sourceDataset,fetchedAt,pageNo,rowIndex,item:{...20 fields}}` 로 감싼다(표본과 동일) |

### 3.2 fetch 방식 (확정값)
| 항목 | 값 |
|---|---|
| numOfRows(page size) | **500** (권장. 표본은 100. 500 검증 후 사용) |
| 예상 page 수 | ~5,313 (2,656,054 / 500) |
| concurrency | **2~4** (낮게 시작, 429/500 관찰 후 조정) |
| retry | page당 3회, backoff 1s→2s→4s |
| timeout | page당 30s |
| failed page | `failed-pages.jsonl` 기록 후 전량 종료 뒤 재시도 |
| resume | manifest 의 완료 pageNo 기준 재개 |
| totalCount 변동 | manifest 에 fetch 시작·종료 totalCount 기록, Gate A dry-run 에서 중복/누락 재검증 |
| 중복 page | pageNo + item rowIndex 로 검출 |

> serviceKey 는 URL/로그에 노출 금지(표본과 동일 마스킹). 대량 호출이므로 저부하 시간 실행.

### 3.3 raw 저장 (repo 밖 필수)
```text
G:\내 드라이브\자료실\public-data-api-samples\full-fetch\medical-device\{RUN_ID}\
  raw.jsonl              # 원본 JSONL (wrapper 포함)
  manifest.json          # endpoint, totalCount(start/end), pages, numOfRows, RUN_ID, startedAt/endedAt
  failed-pages.jsonl     # 실패 page 목록
  checksums.txt          # raw.jsonl sha256
  sample-head.jsonl / sample-tail.jsonl
```
RUN_ID 예: `md-full-YYYYMMDD-HHMMSS`. **raw 2.65M git commit 금지 / serviceKey 기록 금지.**

---

## 4. Gate A 전량 Import 계획

### 4.1 목적/범위
전량 raw → `product_candidates` 적재만. ProductMaster/Identifier 무변경. sourceLabel/sourceKind 유지, RUN_ID 는 rawPayload(예 `fetchRunId`)에 추가해 추적성 확보.

### 4.2 dry-run 산출 (apply 전 필수)
raw input / parsed / invalidJsonLines / rowSignature dedup(skip) / createdExpected / updatedExpected(기존 후보 대비) / identifierType 분포(GTIN/UDI_DI/null) / formatCounts(gtin14/gtin13/checkFail/hibcc) / dupConflict key·row / multiUdiPermit / reviewFlags 분포. → 기존 CLI `--dry-run [--use-db]` 그대로 사용.

### 4.3 표본 row와 전량 row 관계 (§핵심 결정)
전량 재수집은 표본 20,000을 **포함**한다(같은 원천). dedup 키가 rowSignature 이므로:
- 동일 rowSignature = 기존 후보 → **UPDATE**(신규 INSERT 아님). idempotent.
- **채택: 옵션 1(동일 sourceKind/signature upsert 흡수)** + rawPayload 에 fetchRunId 추가.

**⚠️ baseline 보호 (필수 코드 가드 — 후속 WO):**
현재 Gate A importer 의 UPDATE 경로는 rowSignature 매칭 시 `match_status`/`raw_payload`/`source_label` 등을 덮어쓴다. **이미 승격된(candidate_status IN ('approved_new_master','merged')) 후보의 raw_payload/match_status 를 덮어쓰면 안 된다**(reviewFlags 가 전량 스케일에서 재계산되어 dup-conflict 판정이 바뀔 수 있음). 다음을 후속 Gate A import 실행 WO 에서 구현:
```text
UPDATE ... WHERE ... AND candidate_status NOT IN ('approved_new_master','merged')
또는 approved/merged 후보는 SKIP(카운트만).
```
불변식(필수): approved/matched candidate 를 pending 으로 되돌리지 않는다 / `matched_product_master_id` 를 null 로 덮지 않는다. (현 importer 는 candidate_status/matched_product_master_id 를 건드리지 않으나 match_status/raw_payload 는 덮으므로 위 가드 필요.)

### 4.4 apply 조건 (별도 실행 WO)
dry-run count ↔ manifest 정합 / invalid·failed page 허용범위 / dedup 산식 표본과 동일 / baseline 가드 반영 / batch 재개 가능 / rollback 기준 명확.

---

## 5. Gate B 전량 Promotion 계획

### 5.1 dry-run 산출 (apply 전 필수)
candidateInput / promotableRows / wouldCreateMasters / wouldCreateIdentifiers / **alreadyPromoted(=기존 barcode 존재로 dbBarcodeConflict 에 포함)** / dbBarcodeConflict / dbIdentifierConflict / holdBreakdown(NON_GTIN_HIBCC, DUP_CONFLICT, PERMIT_NOT_FOUND, PERMIT_INACTIVE_RTRCN, REQUIRED_FIELD_MISSING, GTIN_CHECKDIGIT_FAIL). → 기존 Gate B CLI `--dry-run --use-db --permit-status-map <map>`.

### 5.2 상태소스 조인
```text
endpoint: https://apis.data.go.kr/1471000/MdlpPrdlstPrmisnInfoService05/getMdlpPrdlstPrmisnList04
필터: prductPrmisnNo (camelCase)
join key: candidate raw_payload.permitNo = 허가 PRDUCT_PRMISN_NO (exact)
active := RTRCN_DSCTN_DIVS_CD IS NULL
PRMISN_STTEMNT 단독 사용 금지. 상태 미확인(PERMIT_NOT_FOUND) row 승격 금지.
```
**전량 status map:** 표본은 distinct PERMIT_NO 786. 전량은 distinct PERMIT_NO 가 수만~십수만 규모일 수 있음 → status map 생성이 **대량 API 호출**이 된다. 전량 status map 생성은 별도 pre-step WO(재수집처럼 batch/resume/manifest 필요). Gate B dry-run/apply 는 이 map 파일을 `--permit-status-map` 로 입력(fail-fast).

### 5.3 write 범위 / 금지
INSERT product_masters / INSERT product_identifiers / UPDATE product_candidates(status + matched master) **만.** Offer/Listing/StoreLocal/설명/이미지/노출 = 0.

### 5.4 batch 전략 (표본과 다름 — 코드 변경 필요)
표본 19,602 는 **단일 트랜잭션** 성공. 전량 수백만은 단일 트랜잭션 불가(lock/WAL/메모리).
```text
결정(후속 Gate B apply 실행 WO 에서 구현):
- batch 단위 COMMIT (예: 1,000 master/commit). 전체 단일 트랜잭션 금지.
- 각 batch = master INSERT RETURNING → identifier INSERT → candidate UPDATE (batch 내 원자성).
- batch 실패 시 그 batch 만 rollback + 재시도. 이미 commit 된 batch 는 idempotency(barcode/mfds_product_id 존재)로 재실행 시 skip.
- checkpoint: 처리된 마지막 barcode/candidate id 또는 batch seq 를 run manifest 에 기록 → resume.
- 각 batch 후 경량 검증(생성 수 == 기대) 로그.
```
현 `executePromotion` 은 단일 트랜잭션 호출측 전제 → 전량은 **batch-commit executor 로 확장**(idempotent precheck: dry-run 의 DB barcode/identifier 충돌 대조를 batch 시작마다 재적용하거나, INSERT ... ON CONFLICT DO NOTHING 검토). 코드 변경 = 후속 WO.

---

## 6. 예상치 산정

표본 기준: candidateInput 19,996 / promotable 19,602 / hold 394 / 승격률 98.03% / identifier ×2.

```text
expected_new_masters =
  full_promotable_distinct_gtin_barcode
  - existing_product_master_barcode_conflict   (표본 승격 19,602 포함 — 이미 존재하므로 자동 제외)
  - already_promoted/matched

expected_new_identifiers = expected_new_masters * 2
```

- 단순 외삽(2,656,054 × 0.98 ≈ 2.6M master, ×2 ≈ 5.2M identifier)은 **참고치일 뿐.** 전량은 제조사/연도/품목 분포가 달라 dup-conflict·orphan·inactive 비율이 표본과 다를 수 있음 → **전량 dry-run 결과 우선.**
- 규모 함의: product_identifiers 가 742k → 최대 ~6M 로 급증 가능 → §5.4 batch-commit 필수.
- 불변: 표본 19,602 중복 생성 0(기존 barcode 충돌로 제외) / ProductMaster.barcode 중복 0 / ProductIdentifier(master,type,normalized) 중복 0 / 기존 약가·타 카테고리 barcode 충돌 시 승격 보류.

---

## 7. 성능/운영 리스크와 완화

| 리스크 | 완화 |
|---|---|
| API rate limit/429/500 | concurrency 2~4, retry+backoff, failed-pages 재시도, 저부하 시간 |
| totalCount 변동 | manifest start/end 기록, Gate A dry-run 재검증 |
| raw 대용량 | repo 밖 저장, checksum, sample-head/tail 만 참조 |
| Gate A upsert 장시간 | batch INSERT(기구현) + progress log + rowSignature resume |
| Gate B 대량 insert/update | **batch-commit executor(신규)** + checkpoint + batch 검증 |
| DB lock/IO 부하 | batch commit, 저부하 시간, 필요 시 batch 간 pause |
| 표본 승격분 중복/훼손 | barcode/identifier conflict precheck + baseline 가드(§4.3) + run_id 구분 |
| rollback 난이도 | run_id/batch_id/trace key(mfds_product_id prefix) 확보 |
| 병렬 세션 방화벽 clobber | Cloud SQL Auth Proxy 우선, authorized-networks 변경 회피, 포트 5433 잔여 proxy 정리 |
| Auth Proxy 토큰 만료(1h) | 장시간 작업 시 batch 경계에서 proxy 재기동/토큰 갱신 |

---

## 8. Rollback / 복구

추적 키: `mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'` + identifier `source_type='medical_device_standard_code_promotion'` + **run_id/batch_id**(전량 실행 WO 에서 identifier.metadata 또는 candidate rawPayload 에 기록) + candidate `fetchRunId`.

**표본 baseline 보호:** 표본 승격분 19,602 는 정상 완료 baseline. 전량 rollback 은 **run_id/batch_id 로 전량분만** 대상. 표본분(2026-07-05 apply, 특정 시각/run_id 없음)과 구분하려면 전량 실행 WO 가 반드시 run_id 를 남겨야 한다.

rollback 순서(schema 확인 결과 반영):
```text
1. ProductIdentifier soft-delete (deleted_at 존재):
   UPDATE product_identifiers SET deleted_at=NOW()
    WHERE source_type='medical_device_standard_code_promotion'
      AND metadata->>'runId' = '<RUN_ID>' AND deleted_at IS NULL;
2. ProductCandidate 원복 (해당 run 갱신분):
   UPDATE product_candidates SET candidate_status='pending', matched_product_master_id=NULL
    WHERE ... (run_id 로 한정);
3. ProductMaster hard-delete (deleted_at 컬럼 없음 → DELETE):
   DELETE FROM product_masters
    WHERE mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%' AND <run_id 조건>;
4. count/중복/불변(Offer/Listing/StoreLocal) 재검증.
```
> ProductMaster 는 soft-delete 불가(deleted_at 없음) → hard-delete. FK 참조(offer/listing) 0 확인 후. batch-commit 이므로 부분 완료분도 run_id 로 정밀 rollback.

---

## 9. 실행 전 승인 게이트

다음 실행 WO(전량 apply) 전 사용자에게 제시할 값: 전량 raw totalCount / Gate A dry-run 결과 / Gate B dry-run 결과 / expected new masters·identifiers / hold breakdown / 예상 실행 시간 / batch size / rollback 범위(run_id) / write 범위 / 금지 테이블 불변 기준.

승인 문구 예:
```text
의료기기 전량 Gate A/B apply 승인.
범위: ProductCandidate upsert + ProductMaster/ProductIdentifier 승격 + candidate status update.
금지: Offer/Listing/StoreLocal/설명/이미지/노출 write.
```
승인 없이는 전량 fetch(대량)·Gate A apply·Gate B apply 금지.

---

## 10. 검증 SQL 세트 (전량 실행 전/후)

> 실제 컬럼: candidate 는 `source_label` + `raw_payload->>'sourceKind'`(source_kind 컬럼 없음). ProductMaster 추적 = mfds_product_id prefix.

```sql
-- 1. PRE snapshot
SELECT (SELECT count(*) FROM product_masters) AS masters,
       (SELECT count(*) FROM product_identifiers) AS identifiers,
       (SELECT count(*) FROM supplier_product_offers) AS offers,
       (SELECT count(*) FROM organization_product_listings) AS listings,
       (SELECT count(*) FROM store_local_products) AS store_local;

-- 2. Gate A candidate status/source 분포
SELECT candidate_status, count(*) FROM product_candidates
 WHERE source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'
   AND raw_payload->>'sourceKind'='medical_device_standard_code' AND deleted_at IS NULL
 GROUP BY 1 ORDER BY 2 DESC;

-- 3. Gate B dry-run expected (CLI JSON_REPORT 로 산출; SQL 은 교차검증)
-- 4. ProductMaster.barcode 중복
SELECT count(*) FROM (SELECT barcode FROM product_masters GROUP BY barcode HAVING count(*)>1) t;
-- 5. ProductIdentifier 중복
SELECT count(*) FROM (SELECT product_master_id,identifier_type,normalized_value
  FROM product_identifiers WHERE deleted_at IS NULL GROUP BY 1,2,3 HAVING count(*)>1) t;
-- 6. 기존 barcode 충돌 (승격 대상 barcode = ANY(...) 로 targeted, dry-run 이 산출)
-- 7. HIBCC/non-GTIN 승격 0
SELECT count(*) FROM product_masters
 WHERE mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%' AND barcode !~ '^\d{13,14}$';
-- 8. inactive/orphan hold (dry-run holdBreakdown)
-- 9. required missing hold (dry-run holdBreakdown)
-- 10. Offer/Listing/StoreLocal 불변 (PRE와 동일)
-- 11. run_id/batch 추적
SELECT count(*) FROM product_masters WHERE mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%';
-- 12. rollback 검증 (run_id 한정 identifier/candidate/master count)
```

---

## 11. Acceptance (전량 실행 WO 로 넘어가기 위한 조건)
전량 fetch+manifest 완료 / Gate A dry-run 정합 / Gate B dry-run + status map / expected 수치 산정 / baseline 가드·batch-commit·run_id 반영(코드 후속 WO) / PRE·POST 검증 SQL / 승인 문구 확보.

---

## 12. 다음 실행 WO (순서)

1. **`WO-O4O-MEDICAL-DEVICE-FULL-SCALE-RAW-FETCH-AND-GATE-A-IMPORT-DRYRUN-V1`** — 전량 fetch(batch/resume/manifest) + Gate A dry-run. (baseline 가드 코드 포함)
2. **`WO-O4O-MEDICAL-DEVICE-FULL-SCALE-GATE-A-IMPORT-APPLY-V1`** — candidate upsert(approved 보호), 승인 후.
3. **`WO-O4O-MEDICAL-DEVICE-FULL-SCALE-PERMIT-STATUS-MAP-BUILD-V1`** — 전량 distinct PERMIT_NO status map 생성(batch/resume).
4. **`WO-O4O-MEDICAL-DEVICE-FULL-SCALE-GATE-B-PROMOTION-DRYRUN-V1`** — batch-commit executor + 전량 dry-run.
5. **사용자 승인** → **`...GATE-B-PROMOTION-APPLY-V1`** — batch-commit 승격 + run_id.
6. **결과 CHECK.**

의료기기 설명/이미지 보강, Neture/Store 노출 정책은 이 흐름과 **분리.**

**최종: 전량 ~2.65M 확장 절차·batch-commit/resume/rollback(run_id)·baseline 보호(가드)·상태 map 전량 생성·승인 게이트를 고정했다. 이 runbook 은 실행하지 않는다(fetch/apply/write 0). 다음은 전량 fetch+Gate A dry-run WO.**
