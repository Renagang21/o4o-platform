# WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-APPLY-RUNBOOK-V1

> 작업 성격: **Gate A ProductCandidate apply 실행 runbook (문서화 전용 — 이 WO 에서 apply 미실행).**
> DB write 0, apply 0, migration 0, Cloud Run Job 0. 문서만 commit/push.
> 작성일: 2026-07-04
> 트랙: **건강기능식품 전용** (의료기기/의약외품 확장 금지)
> 선행: [`CHECK-...-LIVE-RESPONSE-V1`](../checks/CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-LIVE-RESPONSE-V1.md) · [`WO-...-RAW-SAMPLE-FETCH-DRYRUN-V1`](WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-RAW-SAMPLE-FETCH-DRYRUN-V1.md) · [`WO-...-CANDIDATE-IMPORT-DRYRUN-V1`](WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-IMPORT-DRYRUN-V1.md) · [`WO-...-FULL-RAW-FETCH-AND-FULL-DRYRUN-V1`](WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-FULL-RAW-FETCH-AND-FULL-DRYRUN-V1.md) · [`WO-...-CANDIDATE-IMPORT-MAPPER-AND-SERVICE-V1`](WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-IMPORT-MAPPER-AND-SERVICE-V1.md)

---

## 0. 목적

건강기능식품 ProductCandidate **44,885건 apply 실행 전**, 백업 / 사전검증 / 실행명령 / 검증SQL /
rollback 기준 / 사용자 승인 조건을 문서로 고정한다. **이 WO 는 문서화까지만.** apply 실행은
사용자의 명시적 "apply 승인" 이후 별도 진행한다.

### 준비 완료 근거 (모두 완료)
| 단계 | 상태 |
|---|---|
| live 200 CHECK | ✅ (403→200, totalCount 44,885) |
| 100건 raw dry-run | ✅ |
| Candidate import 매핑 dry-run | ✅ |
| 전량 44,885 dry-run | ✅ (STTEMNT_NO 전량 유일, created 44,885) |
| mapper/service/CLI/test 구현 | ✅ (commit 1ea61cc67 / 167937eb8) |
| 단위 테스트 | ✅ **19/19 PASS** |
| CLI 전량 dry-run | ✅ created 44,885 / skipped 0 / errored 0 |

---

## 1. apply 대상

| 항목 | 값 |
|---|---|
| source_type | `external_api` |
| source_label | `MFDS_HEALTH_FUNCTIONAL_FOOD` |
| identifier_type | `MFDS_STTEMNT_NO` |
| raw file (repo 밖) | `G:\내 드라이브\자료실\public-data-api-samples\mfds-health-functional-food-info-raw.jsonl` |
| expected created | **44,885** |
| expected skipped / errored | 0 / 0 |
| ProductMaster / ProductIdentifier 생성 | **0 (금지)** |
| write 테이블 | `product_candidates` **only** (INSERT/UPDATE) |

---

## 2. 사전 조건 (apply 전 전부 충족)

| # | 조건 | 확인 방법 |
|---|---|---|
| 1 | git status clean | `git status --porcelain` 빈 출력 |
| 2 | origin/main 최신 | `git fetch && git status -sb` → `up to date` |
| 3 | **production DB 백업 존재** | Cloud SQL 자동 백업 or `gcloud sql backups list --instance=o4o-platform-db` 최근 백업 확인 |
| 4 | product_candidates 현재 총 row count 스냅샷 | §5 SQL-A (apply 전 값 기록) |
| 5 | 동일 source_label 기존 row count | §5 SQL-B (HFF 최초면 **0** 예상) |
| 6 | raw 파일 line count = 44,885 | 개행(0x0A) 바이트로 카운트 |
| 7 | **CLI dry-run 재실행 PASS** | §3 dry-run → created 44,885 / skipped 0 / errored 0 재확인 |
| 8 | 단위 테스트 PASS | `jest health-functional-food-candidate-import` 19/19 |
| 9 | apply 가드 해제 준비 | `HFF_IMPORT_ALLOW_APPLY=I_UNDERSTAND` (apply 시에만, 셸 env) |
| 10 | DB 접속 env 준비 | `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`/`DB_NAME` (값은 로컬 env, **문서 미기재**) |

> 프로덕션 DB 는 방화벽 차단 — 로컬 직접 TCP 접속 불가. apply 는 Cloud Run Job / Cloud SQL Admin API /
> `gcloud sql connect` 경로 중 승인된 방식으로 실행한다. (CLAUDE.md §0)

---

## 3. 실행 명령

### 3.1 dry-run (사전 조건 #7 — DB write 없음, 재확인용)
```bash
pnpm --filter @o4o/api-server hff:candidate-import -- \
  --file "G:\내 드라이브\자료실\public-data-api-samples\mfds-health-functional-food-info-raw.jsonl" \
  --dry-run
# 기대: created 44,885 / skipped 0 / errored 0 / truncate 0
```

### 3.2 dry-run + DB dedup 예측 (읽기 전용 — 기존 후보와의 update 예측 확인)
```bash
pnpm --filter @o4o/api-server hff:candidate-import -- \
  --file "<raw jsonl 경로>" --dry-run --use-db
# 기대(HFF 최초): createdExpected 44,885 / updatedExpected 0
```

### 3.3 apply (⚠️ 사용자 "apply 승인" 이후에만)
```bash
HFF_IMPORT_ALLOW_APPLY=I_UNDERSTAND \
pnpm --filter @o4o/api-server hff:candidate-import -- \
  --file "<raw jsonl 경로>" --apply --use-db
# 가드: HFF_IMPORT_ALLOW_APPLY 없으면 APPLY_BLOCKED / DataSource 미초기화면 거부
```

> ⚠️ **실제 serviceKey / DB URL / DB_PASSWORD / secret 원문을 명령·문서·로그에 쓰지 않는다.**
> env 는 로컬/실행환경에 주입하고 문서에는 변수명만 기재한다.

---

## 4. DB write 범위 (엄격)

| 허용 | 금지 |
|---|---|
| `product_candidates` INSERT | `product_master` 생성 |
| `product_candidates` UPDATE(dedup 존재 시) | `product_identifiers` 생성 |
| | `supplier_product_offers` 생성 |
| | `organization_product_listings` 생성 |
| | `kpa_store_contents`(StoreLocalProduct 계열) 생성 |
| | migration / DDL / Cloud Run Job |

코드 레벨 보장: service 는 `product_candidates` INSERT/UPDATE SQL 만 보유(다른 테이블 write 코드 없음).

---

## 5. 검증 SQL (apply 전/후 비교)

```sql
-- SQL-A: 전체 후보 총량 (apply 전/후 델타 = 44,885 여야 함)
SELECT COUNT(*) AS total_candidates FROM product_candidates WHERE deleted_at IS NULL;

-- SQL-B: HFF source_label 적재량 (apply 후 = 44,885)
SELECT COUNT(*) AS hff_count
FROM product_candidates
WHERE source_type = 'external_api'
  AND source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD'
  AND deleted_at IS NULL;

-- SQL-C: dedupKey(정규화 식별자) distinct = 44,885 (중복 적재 0 검증)
SELECT COUNT(DISTINCT normalized_identifier_value) AS distinct_sttemnt
FROM product_candidates
WHERE source_type = 'external_api'
  AND identifier_type = 'MFDS_STTEMNT_NO'
  AND raw_payload->>'sourceKind' = 'health_functional_food'
  AND deleted_at IS NULL;

-- SQL-D: identifier_value distinct (= 44,885, SQL-C 와 일치)
SELECT COUNT(DISTINCT identifier_value) AS distinct_identifier
FROM product_candidates
WHERE source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL;

-- SQL-E: 필수 필드 null/blank (candidate_name — 0 이어야 함)
SELECT COUNT(*) AS name_null_blank
FROM product_candidates
WHERE source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
  AND (candidate_name IS NULL OR btrim(candidate_name) = '');

-- SQL-F: candidate_manufacturer null/blank (0 예상)
SELECT COUNT(*) AS manufacturer_null_blank
FROM product_candidates
WHERE source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
  AND (candidate_manufacturer IS NULL OR btrim(candidate_manufacturer) = '');

-- SQL-G: raw_payload 존재 (0 = 모두 존재해야 함)
SELECT COUNT(*) AS raw_payload_missing
FROM product_candidates
WHERE source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
  AND raw_payload IS NULL;

-- SQL-H: candidate_status / reviewFlags 분포 (status=pending 전건, flag 분포 확인)
SELECT candidate_status, COUNT(*) FROM product_candidates
WHERE source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
GROUP BY candidate_status;

SELECT flag, COUNT(*) FROM (
  SELECT jsonb_array_elements_text(raw_payload->'reviewFlags') AS flag
  FROM product_candidates
  WHERE source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
) t GROUP BY flag ORDER BY 2 DESC;
-- 기대: SKU_IDENTIFIER_MISSING 44,885 / INTAKE_HINT_MISSING 1,663 / PRESERVATION_MISSING 415 / MAIN_FUNCTION_MISSING 31 / CANDIDATE_NAME_OVERLENGTH 0

-- SQL-I: ProductMaster / ProductIdentifier 불변 확인 (apply 전/후 동일)
-- ⚠️ 실제 테이블명은 product_masters(복수) / product_identifiers (2026-07-04 실측 확정)
SELECT COUNT(*) AS master_count FROM product_masters;        -- apply 전후 불변
SELECT COUNT(*) AS identifier_count FROM product_identifiers; -- apply 전후 불변
```

**합격 기준:** SQL-B=44,885 · SQL-C=SQL-D=44,885 · SQL-E=SQL-F=SQL-G=0 · SQL-I(master/identifier) apply 전후 **불변**.

### 5.1 Pre-snapshot 실측 (2026-07-04, apply 전 read-only)
| 지표 | apply 전 | apply 후 기대 |
|---|---:|---:|
| total product_candidates (SQL-A) | **310,281** | 354,166 (+44,885) |
| HFF source_label (SQL-B) | **0** (최초) | 44,885 |
| product_masters (SQL-I) | **230,843** | 230,843 (불변) |
| product_identifiers (SQL-I) | **703,483** | 703,483 (불변) |

기존 분포: `csv_import` drug-master 305,522 · `external_api` MFDS_EASY_DRUG_INFO 4,757 · smoke 2.
방화벽: 실행 시점 IP 를 authorized-networks 임시 추가 후 **반드시 원복**(원상태 `124.194.156.36/32` only).

---

## 6. rollback 기준

```sql
-- rollback (apply 후 문제 발견 시): HFF 적재분만 삭제 (다른 트랙/후보 무영향)
-- ⚠️ 실행 전 apply 전/후 count 비교로 삭제 범위(=44,885 근처) 확인 필수
DELETE FROM product_candidates
WHERE source_type = 'external_api'
  AND source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD'
  AND raw_payload->>'sourceKind' = 'health_functional_food';
```

- rollback 원칙:
  1. 삭제 범위는 **source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' + sourceKind 일치**로 한정(타 트랙 무영향).
  2. 삭제 전 `SELECT COUNT(*)`로 대상 수 = (apply 후 SQL-B − apply 전 HFF count) 확인.
  3. 트랜잭션(`BEGIN … COMMIT/ROLLBACK`) 내에서 삭제 후 count 확인하고 COMMIT.
  4. 광범위 손상 시 §2 #3 의 프로덕션 백업으로 복구(최후 수단).
- soft delete 사용 시 `deleted_at` set 도 가능하나, HFF 최초 적재 rollback 은 물리 DELETE 권장(재적재 idempotent).

---

## 7. 승인 조건 (게이트)

1. **사용자가 명시적으로 "apply 승인" 이라고 말하기 전 apply 실행 금지.**
2. 본 WO 는 **runbook 문서 작성·commit·push 까지만** 수행한다.
3. apply 승인 후: §2 사전조건 10개 전부 충족 → §3.3 실행 → §5 검증SQL 합격 → 완료 보고.
4. 검증 불합격(예: SQL-I master/identifier 증가) 시 즉시 §6 rollback + 원인 조사.

---

## 8. read-only 준수 확인 (이 WO)

| 항목 | 결과 |
|---|---|
| DB write / apply 실행 | 0 |
| ProductMaster/ProductIdentifier 생성 | 0 |
| migration / Cloud Run Job | 0 |
| raw 대용량 파일 커밋 | 0 |
| serviceKey / DB secret 출력·기록 | 0 (변수명만 기재) |
| 병렬 세션 파일 수정 | 0 |
| 범위 확장(의료기기/의약외품) | 0 |

이번 변경 = runbook 문서 1건.

**최종: 건강기능식품 Gate A apply 는 실행 준비(코드·검증·근거) 완료 상태다. 본 runbook 은 백업·사전조건 10개·실행명령·검증SQL 9종·rollback·승인게이트를 고정한다. apply 실행은 사용자의 명시적 "apply 승인" 이후에만 별도 진행하며, 승인 전까지 DB write 는 발생하지 않는다.**

---

## 9. Apply 실행 완료 기록 (2026-07-04, 사용자 "write 진행" 승인)

**실행:** `NODE_ENV=production HFF_IMPORT_ALLOW_APPLY=I_UNDERSTAND pnpm --filter @o4o/api-server hff:candidate-import -- --file <raw> --apply --use-db`
- CLI 리포트: mode=apply, processedRows 44,885, **created 44,885 / updated 0 / skipped 0 / errored 0**, nameTruncated 0.

### 9.1 프로덕션 검증 SQL 결과 (전부 합격)
| 검증 | 기대 | 실측 |
|---|---|---|
| SQL-B HFF count | 44,885 | **44,885** ✅ |
| SQL-A total candidates | 355,166 | **355,166** ✅ |
| SQL-C distinct normalized STTEMNT_NO | 44,885 | **44,885** ✅ |
| SQL-D distinct identifier_value | 44,885 | **44,885** ✅ |
| SQL-E/F/G name·mfr·raw null | 0/0/0 | **0/0/0** ✅ |
| SQL-I product_masters (불변) | 230,843 | **230,843** ✅ |
| SQL-I product_identifiers (불변) | 703,483 | **703,483** ✅ |
| flags | SKU 44,885·INTAKE_HINT 1,663·PRSRV 415·MAIN_FUNCTION 31 | 일치 ✅ |
| candidate_status | pending 44,885 | **pending 44,885** ✅ |

**ProductMaster/ProductIdentifier 완전 불변 → Gate A 격리 성공(후보만 적재).**

### 9.2 실행 gotcha (기록)
1. **SSL/env**: 프로덕션 DB TCP 접속은 SSL 필수. CLI 를 `NODE_ENV=production` 으로 실행(→ env-loader 가 `.env.production` 없으면 `apps/api-server/.env` 폴백, connection ssl 활성).
2. **AppDataSource 회피**: tsx 로컬 실행 시 전체 엔티티 메타데이터 오류(`DeploymentInstance#domain`) → CLI 를 최소 `entities:[]` DataSource 로 수정(commit 7905010d3, raw ds.query 전용).
3. **numOfRows / 방화벽**: 프로덕션 DB 방화벽에 실행 IP 임시 추가 → **병렬 세션이 authorized-networks 를 "원복"하며 내 임시 IP 를 clobber**(리스트 전체 교체 특성) → 1차 apply ETIMEDOUT(0 write, idempotent 라 무해) → 2차 성공. 교훈: 동시 세션이 있을 때 방화벽 기반 로컬 apply 는 창을 최소화하거나 Cloud Run Job(방화벽 무관) 권장.
4. **firewall 원복**: 완료 후 `124.194.156.36/32` only 로 원복 확인.

### 9.3 rollback (미사용 — 검증 합격)
문제 없어 rollback 불필요. 필요 시 §6 (`source_label='MFDS_HEALTH_FUNCTIONAL_FOOD'` 삭제).

**Gate A 완료: 건강기능식품 ProductCandidate 44,885건 프로덕션 적재·검증 완료. ProductMaster 승격(Gate B)은 barcode/포장/허가상태 원천 확보 후 별도.**
