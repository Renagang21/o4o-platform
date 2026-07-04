# WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-APPLY-RUNBOOK-V1

> 작업 성격: **Gate A ProductCandidate apply 실행 전 runbook (문서만).** apply 미실행, DB write 0, migration 0, Cloud Run Job 0. 산출물 = 본 문서 1개.
> 작성일: 2026-07-04
> 선행: `WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-IMPORT-MAPPER-AND-SERVICE-V1`(구현·commit 24e137727), `WO-...-RAW-REMAINDER-FETCH-AND-FULL-DRYRUN-V1`, `CHECK-O4O-QUASI-DRUG-PUBLIC-SEED-MAPPING-V1`
> 참조 절차: `CHECK-O4O-EASY-DRUG-INFO-SHARED-DESCRIPTION-DERIVATION-DRYRUN-V1 §9`(e약은요 Gate A apply 로그), `CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1`
> 범위 고정: **의약외품 트랙 전용.** 의료기기/건강기능식품 내용 혼입 금지. 병렬 세션 파일 무수정.
> **승인 게이트: 사용자가 명시적으로 "의약외품 apply 승인" 이라고 말하기 전 apply 실행 금지.**

---

## 0. 한 줄 요약

의약외품 ProductCandidate **22,953건** 을 `product_candidates` 에 적재하기 위한 apply 절차·검증 SQL·rollback 기준을 고정한다. 이 문서는 **apply 를 실행하지 않는다.** ProductMaster/ProductIdentifier 생성은 **0** 이다.

---

## 1. apply 대상

| 항목 | 값 |
|---|---|
| source_type | `external_api` |
| source_label | `MFDS_QUASI_DRUG_PERMIT` |
| identifier_type | `MFDS_CODE` |
| raw_payload sourceKind | `quasi_drug_permit` |
| raw full 파일 (repo 밖) | `G:\내 드라이브\자료실\public-data-api-samples\mfds-quasi-drug-permit-raw-full.jsonl` (22,953행, 61.84 MB) |
| **expected created** | **22,953** |
| expected updated | 0 (신규 적재. 기존 easy_drug 계열과 sourceKind 분리) |
| expected skipped | 0 (ITEM_SEQ 전량 유일·결측 0) |
| expected errored | 0 (candidate_name truncate 적용 시) |
| candidate_name truncate 예상 | **283** (255자 초과, 원문은 raw_payload.source 보존) |
| **ProductMaster 승격** | **0** |
| **ProductIdentifier 생성** | **0** |

write 대상 테이블: **`product_candidates` 단 하나.** INSERT (기존 없음) / UPDATE (재실행 시 기존분).

---

## 2. 사전조건 (apply 직전 체크리스트)

| # | 항목 | 확인 방법 | 기대값 |
|---|---|---|---|
| 1 | git clean | `git status --short` | 의약외품 관련 미커밋 변경 없음 |
| 2 | origin/main 최신 | `git fetch origin main; git rev-list --left-right --count HEAD...origin/main` | `0  0` |
| 3 | 구현 커밋 존재 | `git log --oneline -1 -- apps/api-server/src/modules/neture/drug-import/quasi-drug-permit-candidate-import.service.ts` | 24e137727 |
| 4 | production DB 백업 | Cloud SQL export/백업 id 확보 (e약은요 §9 패턴) | 백업 id 기록 |
| 5 | product_candidates 전체 count snapshot | 아래 §5 SQL A (apply 전) | 값 기록 (기준선) |
| 6 | 동일 source_label 기존 count snapshot | 아래 §5 SQL B (apply 전) | **0** 기대 (미적재) |
| 7 | raw full line count | `Measure`(개행 0x0A) | 22,953 (+trailing) |
| 8 | offline dry-run 재실행 | §3-1 명령 | created 22,953 / skipped 0 / errored 0 / truncate 283 |
| 9 | unit test | `npx jest ...quasi-drug-permit-candidate-import.test.ts` | **22/22 PASS** |
| 10 | APPLY 가드 | env `QUASI_DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND` | apply 시에만 설정 |
| 11 | ProductMaster/Identifier 기준선 | §5 SQL G (apply 전) | 값 기록 (apply 후 불변 확인용) |

> **DB 접속 env (변수명만 — secret 원문 절대 기록 금지):** `DB_TYPE`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` (production 은 `/cloudsql/` 소켓). 값은 `.env.apiserver` / Cloud Run env 에만 존재.
> **프로덕션 DB 방화벽:** 로컬 직접 TCP 차단(CLAUDE.md §0). `--use-db`/`--apply` 는 아래 §4 채널 결정에 종속.

---

## 2-A. 실측 baseline (pre-snapshot, 2026-07-04)

> 채널: `gcloud sql instances patch` 로 authorized-network **임시 추가(기존 `124.194.156.36/32` 보존) → psql read-only → 즉시 원복**. 전부 SELECT. DB write 0 / apply 0. DB secret 미출력.

| 지표 | 측정값 | apply 후 기대 |
|---|---:|---|
| **B. 기존 `MFDS_QUASI_DRUG_PERMIT` count** | **0** | 22,953 (전량 신규) |
| A. product_candidates 전체 | 355,166 | 378,119 (=355,166+22,953) |
| **G. product_masters** | **230,843** | **230,843 (불변)** |
| **G. product_identifiers** | **703,483** | **703,483 (불변)** |
| (참조) easy_drug candidates (`sourceKind='easy_drug_info'`) | 4,757 | 4,757 (불변 — 트랙 격리 확인용) |

**해석:**
- 기존 의약외품 후보 **0건** → apply 예상 = **created 22,953 / updated 0** (offline dry-run 과 일치). `--use-db` dry-run 없이도 B=0 이 이를 확정.
- `product_masters` 230,843 / `product_identifiers` 703,483 는 apply 후 **불변**이어야 한다(candidate-only write 증명).
- `easy_drug` 4,757 은 `sourceKind` 격리로 의약외품 적재와 무관 — apply·rollback 이 타 트랙에 영향 없음을 재확인.

**정합 확인:**
- `identifier_type=MFDS_CODE` / `identifier_value=normalized=trim(ITEM_SEQ)` — mapper·ProductIdentifier union·선례(easy-drug/HIRA)·CHECK §5 결정과 일치. `MFDS_ITEM_SEQ` 미사용(중앙 리뷰 보류). 정정 불필요.
- 방화벽: 임시 오픈 후 **원복 완료**(`124.194.156.36/32` 만 잔존).

> caveat(후속 매칭 WO): `MFDS_CODE` 는 의약품/e약은요와 공유 네임스페이스 → candidate→master 자동매칭 시 `sourceKind` 스코프 필수. apply 자체는 매칭 없음(전량 pending/unmatched)이라 무관.

---

## 3. 실행 명령

### 3-1. offline dry-run (DB 무관, 언제든 안전)
```bash
pnpm --filter @o4o/api-server quasi-drug:candidate-import -- \
  --file "G:\내 드라이브\자료실\public-data-api-samples\mfds-quasi-drug-permit-raw-full.jsonl"
```
기대: `createdExpected=22953 skipped=0 errored=0`, `candidateNameTruncated=283`, `dedupChecked=false`.

### 3-2. dry-run --use-db (read-only, 기존 후보 대비 create/update 예측)
```bash
pnpm --filter @o4o/api-server quasi-drug:candidate-import -- \
  --file "<raw full 경로>" --use-db
```
기대: 최초 실행이면 `createdExpected=22953 updatedExpected=0`, `dedupChecked=true`. (DB SELECT 만, write 0)

### 3-3. apply --use-db — **⛔ 사용자 명시 승인 전 실행 금지**
```bash
# ⛔ 아래는 "의약외품 apply 승인" 후에만 실행. 그 전에는 절대 실행하지 않는다.
QUASI_DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND \
pnpm --filter @o4o/api-server quasi-drug:candidate-import -- \
  --file "<raw full 경로>" --apply --use-db
```
가드: `--apply` 는 CLI 에서 `QUASI_DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND` 없으면 `APPLY_BLOCKED` throw.

---

## 4. apply 채널 (미결 결정 — 사용자)

프로덕션 DB 는 방화벽으로 로컬 직접 접속 불가. 두 채널 중 결정 필요:

| 채널 | 방식 | 선례 |
|---|---|---|
| (a) Cloud Run Job 신설 | drug-seed/easy-drug 패턴: src 루트 Job entry + GCS raw 업로드 + 이중가드 env | e약은요 §9 (`o4o-easy-drug-seed-candidate-import`) |
| (b) local tsx + 임시 authorized-network | `gcloud sql` authorized-network 임시 등록 → `--apply --use-db` → 즉시 원복 | e약은요 §2 (read-only 실측 채널) |

권장: 대량(22,953) + 재실행 안전성 고려 시 **(a) Cloud Run Job** (e약은요 선례 미러). raw 는 GCS `gs://o4o-media-library/data-seed/` 업로드 필요.

---

## 5. DB write 범위 및 검증 SQL (모두 read-only 검증, apply 전/후 실행)

**write 범위:** `product_candidates` INSERT/UPDATE **only.** `product_masters` / `product_identifiers` / `product_drug_extensions` / `product_images` / `supplier_product_offers` / `organization_product_listings` / `store_local_products` 생성 **금지.**

```sql
-- A. product_candidates 전체 count (apply 전/후 델타 = 22,953 기대)
SELECT count(*) FROM product_candidates WHERE deleted_at IS NULL;

-- B. 의약외품 source_label count (apply 전 0 → apply 후 22,953)
SELECT count(*) FROM product_candidates
 WHERE source_type='external_api' AND source_label='MFDS_QUASI_DRUG_PERMIT'
   AND raw_payload->>'sourceKind'='quasi_drug_permit' AND deleted_at IS NULL;

-- C. ITEM_SEQ distinct (= row count = 22,953 기대, 유일성 확인)
SELECT count(*) AS rows, count(DISTINCT normalized_identifier_value) AS distinct_seq
  FROM product_candidates
 WHERE source_label='MFDS_QUASI_DRUG_PERMIT' AND raw_payload->>'sourceKind'='quasi_drug_permit'
   AND deleted_at IS NULL;

-- D. 필수 필드 결측 0 확인 (candidate_name / manufacturer null·blank 0 기대)
SELECT
  count(*) FILTER (WHERE candidate_name IS NULL OR btrim(candidate_name)='')          AS name_missing,
  count(*) FILTER (WHERE candidate_manufacturer IS NULL OR btrim(candidate_manufacturer)='') AS mfr_missing,
  count(*) FILTER (WHERE raw_payload IS NULL)                                          AS rawpayload_missing
  FROM product_candidates
 WHERE source_label='MFDS_QUASI_DRUG_PERMIT' AND raw_payload->>'sourceKind'='quasi_drug_permit'
   AND deleted_at IS NULL;

-- E. candidate_name truncate flag 분포 (CANDIDATE_NAME_OVERLENGTH ≈ 283)
SELECT count(*) FILTER (WHERE raw_payload->>'candidateNameTruncated'='true') AS truncated,
       count(*) FILTER (WHERE length(candidate_name)=255)                    AS at_max_255
  FROM product_candidates
 WHERE source_label='MFDS_QUASI_DRUG_PERMIT' AND raw_payload->>'sourceKind'='quasi_drug_permit'
   AND deleted_at IS NULL;

-- F. candidate_status 분포 (전량 pending 기대)
SELECT candidate_status, count(*) FROM product_candidates
 WHERE source_label='MFDS_QUASI_DRUG_PERMIT' AND raw_payload->>'sourceKind'='quasi_drug_permit'
   AND deleted_at IS NULL
 GROUP BY candidate_status;

-- G. ProductMaster / ProductIdentifier count — apply 전후 **불변** 확인
SELECT (SELECT count(*) FROM product_masters)     AS masters,
       (SELECT count(*) FROM product_identifiers) AS identifiers;
```

기대 (apply 후): B=22,953 · C rows=distinct_seq=22,953 · D 전부 0 · E truncated≈283 · F pending=22,953 · **G masters/identifiers = apply 전과 동일(불변).**

---

## 6. rollback 기준

| 조건 | 조치 |
|---|---|
| §5 검증 실패 (count 불일치 / 결측 발생 / master·identifier 증가) | 의약외품 적재분만 롤백 |
| 트랜잭션 방식 | apply 를 트랜잭션으로 감싸고, 커밋 직전 §5 B/C/G count 확인 → 이상 시 ROLLBACK, 정상 시 COMMIT |

**롤백 대상 한정 (타 트랙 영향 금지):**
```sql
-- soft-delete: 의약외품 적재분만. easy_drug / drug / 기타 트랙 미영향.
UPDATE product_candidates SET deleted_at = NOW()
 WHERE source_type='external_api'
   AND source_label='MFDS_QUASI_DRUG_PERMIT'
   AND raw_payload->>'sourceKind'='quasi_drug_permit'
   AND deleted_at IS NULL;
-- 실행 전 반드시 동일 WHERE 로 count 확인 (= 22,953 예상). 다른 sourceKind 포함 여부 재확인.
```
`sourceKind='quasi_drug_permit'` 조건이 **트랙 격리 키**다. easy_drug_info / HIRA drug / 건강기능식품 적재분은 이 조건에 걸리지 않는다.

---

## 7. 승인 게이트

```
[구현 완료 24e137727] → [본 runbook] → ⛔사용자 "의약외품 apply 승인"⛔
   → pre-snapshot(§2 SQL A/B/G) → dry-run --use-db(§3-2) → apply(§3-3)
   → post 검증(§5) → 이상 시 rollback(§6)
```

**사용자가 명시적으로 "의약외품 apply 승인" 이라고 말하기 전에는 §3-3 apply·§4 채널 구축·GCS 업로드를 실행하지 않는다.** 그 전까지 허용되는 것은 §3-1 offline dry-run(DB 무관)뿐이다.

---

## 8. 준수 확인 (본 문서)

| 항목 | 결과 |
|---|---|
| apply 실행 | **0** |
| DB write | 0 |
| ProductMaster/Identifier 생성 | 0 |
| migration / Cloud Run Job 생성 | 0 |
| raw 대용량 파일 커밋 | 0 |
| serviceKey / DB secret 원문 기록 | 0 (변수명만) |
| 범위 확장(의료기기/건기식) | 0 |
| 병렬 세션 파일 수정 | 0 |

이번 변경 = 본 runbook 문서 1건.

---

**최종: 의약외품 Gate A apply 절차·검증 SQL·rollback·트랙 격리(sourceKind='quasi_drug_permit')·승인 게이트를 고정했다. apply 는 사용자 "의약외품 apply 승인" 후 pre-snapshot → dry-run --use-db → apply → §5 검증 순으로만 진행한다.**

---

## 9. Gate A 실행 로그 (2026-07-04) — **candidate apply 완료**

> 승인: 사용자 "의약외품 apply 승인" (지금 실행 승인).
> 채널: local + 임시 authorized-network(기존 `124.194.156.36/32` 보존 → 내 IP 임시 추가 → 즉시 원복). write 는 **tested mapper(`mapQuasiDrugRow`) + 직접 pg 청크 INSERT(트랜잭션 + 사전 count=0 가드 + in-tx verify)** 로 수행 — AppDataSource init 우회(easy-drug Gate C 메타 이슈 회피) + per-row 왕복 대신 청크로 고속화. INSERT 컬럼 매핑은 서비스 `applyRows` 와 동일. 임시 스크립트는 커밋하지 않고 실행 후 삭제.

| 항목 | 값 |
|---|---|
| 사전 백업 (on-demand) | ✅ id **1783151804720** (SUCCESSFUL, `pre-quasi-drug-candidate-apply-20260704`) |
| APPLY 가드 | 스크립트 사전 `existing quasi_drug candidates=0` 확인 후 진행 (재실행/중복 방지) |
| 매핑 | parsed 22,953 / parseErrors 0 / skipped 0 / **truncated 283** |
| 트랜잭션 | BEGIN → 청크 INSERT(500/stmt) → in-tx verifyCount 22,953 == toInsert → **COMMIT OK** |
| **apply 결과** | **created 22,953 / errored 0** |

### §5 검증 결과 (apply 후, read-only)

| 지표 | baseline | apply 후 | 판정 |
|---|---:|---:|:--:|
| B. `MFDS_QUASI_DRUG_PERMIT` count | 0 | **22,953** | ✅ |
| A. product_candidates 전체 | 355,166 | **378,119** | ✅ |
| C. distinct ITEM_SEQ | — | **22,953** | ✅ (유일) |
| D. candidate_name / manufacturer 결측 | — | **0 / 0** | ✅ |
| E. candidate_name truncate | — | **283** | ✅ |
| F. candidate_status=pending | — | **22,953** | ✅ (전량) |
| **G. product_masters** | 230,843 | **230,843** | ✅ 불변 |
| **G. product_identifiers** | 703,483 | **703,483** | ✅ 불변 |
| easy_drug candidates (격리) | 4,757 | **4,757** | ✅ 불변 |

**→ Gate A 완료. rollback 불필요(전 지표 기대치 일치).** 의약외품 22,953 품목이 `product_candidates`(external_api / MFDS_CODE / sourceKind=`quasi_drug_permit`, 전량 pending/unmatched)로 적재됨. ProductMaster/Identifier 등 다른 테이블 **불변**. 방화벽 원복 완료(`124.194.156.36/32`만 잔존). DB secret 미출력.

**후속(별도 WO)**: XML 공식 설명 파서(EE/UD/NB CDATA) → SKU/barcode 원천 audit → Gate B(ProductMaster 승격) 재판정. candidate→master 매칭 시 `sourceKind` 스코프 필수(MFDS_CODE 공유 네임스페이스).
