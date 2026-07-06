# CHECK-O4O-HFF-O4O-DB-CURRENT-STATE-SQL-VERIFY-V1

> WO: `docs/work-orders/WO-O4O-HFF-O4O-DB-CURRENT-STATE-SQL-VERIFY-V1.md`
> 상태: **COMPLETE** (프로덕션 read-only 실측 완료)
> 실측일: 2026-07-06 (KST) / DB now() = 2026-07-06 12:00 UTC
> 모드: read-only. **DB write 0 / migration 0 / 코드 변경 0.**

---

## 1. 결론 요약

| 축 | 실측 결과 | 판정 |
|---|---|---|
| HFF candidate 총수 | **41,261건** (live, `deleted_at IS NULL`) | 존재 확정. WO 예상 44,885과 차이 → §3 설명 |
| source_label | `MFDS_HEALTH_FUNCTIONAL_FOOD` (실운영 기준 일치) | ✅ 문서 기준 그대로 |
| candidate_status / match_status | **전량 `pending` / `unmatched`** | master 미승격·미매칭 상태 (정상) |
| STTEMNT_NO 보존 | identifier 컬럼 (`identifier_type='MFDS_STTEMNT_NO'`) + `raw_payload.source.STTEMNT_NO`. distinct = 41,261 (전량 유일) | ✅ SKU/barcode로 승격 안 됨 |
| rawPayload 원문 | **`raw_payload.source.*` 아래 원본 MFDS item 전량 무손실 보존** (96~100% 커버리지) | ✅ parser dry-run 가능 |
| ProductMaster HFF | **0건** (DRUG 177,413 / MEDICAL_DEVICE 3,826 / GENERAL 2) | ✅ HOLD 유지 확정 |
| ProductIdentifier HFF | **0건** (`MFDS_STTEMNT_NO` 등 master identifier 없음) | ✅ 승격 흔적 없음 |
| RepresentativeProduct HFF | **0건** (48,101건 전부 anchorType/sourceLabel 없음) | anchor 미생성 |
| admin UI | sourceLabel 필터 **이미 존재** + 상세 rawPayload JSON 노출 | WO 가정("필터 없음")은 outdated |

**핵심 정정 2건:**

1. **WO §5.5 SQL의 경로 가정이 틀렸다.** WO는 `raw_payload->>'STTEMNT_NO'`(top-level)를 가정했으나, Gate A mapper(`health-functional-food-candidate.mapper.ts:140-157`)는 원본 item을 **`raw_payload.source`** 아래에 중첩 저장한다. top-level 경로로 조회하면 전 필드 0으로 나오지만, `raw_payload->'source'->>'FIELD'`로 조회하면 96~100% 커버리지다. **원문은 드롭되지 않았다.**
2. **admin UI에 sourceLabel 필터가 이미 있다.** `ProductCandidatesPage.tsx:46-48,142`에 sourceLabel 텍스트 입력 필터가 구현돼 있고, 목록에 sourceLabel이 표시되며(`:203`), 상세 페이지는 전체 rawPayload를 JSON으로 노출한다(`ProductCandidateDetailPage.tsx:92-93`).

**다음 작업:** parser 인프라(`health-functional-food-official-text.parser.ts` + `-parser-dryrun.ts`)가 이미 존재하고 `raw_payload.source`를 읽는다. 다음 단계는 **parser dry-run 실행/집계(`WO-O4O-HFF-RAWPAYLOAD-PARSER-DRYRUN-V1` 계열)** 로 좁혀진다. import 복구는 불필요.

---

## 2. 실행 환경과 DB 접속 방식 (비밀값 제외)

- 대상: 프로덕션 `o4o_platform` (`netureyoutube:asia-northeast3:o4o-platform-db`, POSTGRES_15)
- 채널: Cloud SQL Auth Proxy v2 (`bin/cloud-sql-proxy-v2.exe`) + `gcloud auth print-access-token`, 로컬 127.0.0.1:5433 → psql 17
- 계정: `o4o_api` (`.env` 주입, literal 비기재)
- 안전장치: 모든 세션 `SET default_transaction_read_only = on;` 선실행 → 쓰기 물리 차단
- 접속 확인: `current_database=o4o_platform`, `current_user=o4o_api`
- 주의: 프록시 링크 latency가 높아(394k seq scan 기준 분 단위) 무거운 jsonb 집계는 백그라운드로 분할 실행

---

## 3. HFF candidate 총수

```
product_candidates TOTAL (all)   = 394,491
product_candidates (deleted_at IS NULL, source_label=MFDS_HEALTH_FUNCTIONAL_FOOD)
  = 41,261 live / 0 deleted
distinct normalized_identifier_value (=STTEMNT_NO) = 41,261  (전량 유일)
```

**44,885 → 41,261 차이 설명:** 44,885는 원본 raw item 건수(mapper 주석·seed 메모리 기준)이고, import는 dedupKey(`sourceType + MFDS_STTEMNT_NO + normalized STTEMNT_NO + sourceKind`)로 upsert한다. live distinct STTEMNT_NO = total = 41,261 이므로 **중복 STTEMNT_NO 3,624건이 dedup으로 병합된 결과**로 해석된다(soft-delete 0). 데이터 손실이 아니라 정규화다.

### product_candidates 전체 source_label 분포 (참고)

| source_label | source_type | live | deleted |
|---|---|---|---|
| mfds-drug-master-standard-code_2025-10-31 | csv_import | 305,522 | 0 |
| **MFDS_HEALTH_FUNCTIONAL_FOOD** | **external_api** | **41,261** | **0** |
| MFDS_QUASI_DRUG_PERMIT | external_api | 22,953 | 0 |
| MFDS_MEDICAL_DEVICE_STANDARD_CODE | external_api | 19,996 | 0 |
| MFDS_EASY_DRUG_INFO | external_api | 4,757 | 0 |
| phase5-smoke / phase6-smoke | operator_import | 1 / 1 | 0 |

---

## 4. source_type / source_label / candidate_status / match_status 분포

HFF subset (`source_label='MFDS_HEALTH_FUNCTIONAL_FOOD'`, live) 전량:

| source_type | candidate_status | match_status | count |
|---|---|---|---|
| external_api | pending | unmatched | **41,261** |

단일 분포 — 전 건이 미검토·미매칭 pending 후보 상태. 승격/매칭/거절/아카이브 이력 0.

---

## 5. STTEMNT_NO 저장 위치와 distinct 수

STTEMNT_NO는 **두 곳에 보존**된다 (원문 손실 없음):

| 위치 | 컬럼/경로 | 값 예 | 용도 |
|---|---|---|---|
| identifier 컬럼 | `identifier_type = 'MFDS_STTEMNT_NO'` | — | 식별자 타입 태그 |
| identifier 컬럼 | `identifier_value` / `normalized_identifier_value` | `20040017015247` | 매칭 축 (SKU 아님) |
| rawPayload | `raw_payload.source.STTEMNT_NO` | `20040017015247` | 원문 무손실 보존 |
| rawPayload | `raw_payload.sourceRowKey = 'STTEMNT_NO'` | — | 식별자 출처 표기 |

- distinct STTEMNT_NO = **41,261** = total → 1:1, 중복 없음
- `raw_payload.reviewFlags = ["SKU_IDENTIFIER_MISSING"]` (전건) → mapper가 **barcode/SKU 축 부재를 명시적으로 플래그**. STTEMNT_NO를 SKU/barcode로 취급하지 않음(WO 금지사항 준수 확인).

---

## 6. rawPayload 주요 필드 커버리지

⚠️ **경로 주의:** 원문 MFDS 필드는 **`raw_payload.source.*`** 아래에 있다 (top-level 아님).

`raw_payload.source` 실제 키: `STTEMNT_NO, PRDUCT, ENTRPS, MAIN_FNCTN, SRV_USE, INTAKE_HINT1, PRSRV_PD, SUNGSANG, BASE_STANDARD, DISTB_PD, REGIST_DT`

| 필드 | 존재 건수 | 커버리지 | (WO 필드명) |
|---|---|---|---|
| `source` 래퍼 | 41,261 | 100% | — |
| STTEMNT_NO | 41,261 | 100% | STTEMNT_NO |
| PRDUCT (제품명) | 41,261 | 100% | PRDLST_NM 상당 |
| ENTRPS (업체명) | 41,261 | 100% | BSSH_NM 상당 |
| BASE_STANDARD | 41,260 | 99.998% | BASE_STANDARD |
| DISTB_PD | 41,259 | 99.995% | (유통기한) |
| SUNGSANG | 41,245 | 99.96% | SUNGSANG |
| MAIN_FNCTN | 41,253 | 99.98% | MAIN_FNCTN |
| SRV_USE | 40,947 | 99.24% | SRV_USE |
| PRSRV_PD | 40,878 | 99.07% | PRSRV_PD |
| INTAKE_HINT1 | 39,760 | 96.36% | INTAKE_HINT1 |

> 참고: mapper는 top-level에 `mainFunction`(=MAIN_FNCTN 사본) 1개만 별도 승격 보존. 나머지 원문은 전부 `.source` 아래.
> WO §7.3 기준: 핵심 필드 커버리지 높음 → **official text parser dry-run 진행 조건 충족.**

### rawPayload top-level 키 (mapper envelope)

`sourceAgency, sourceDatasetName, sourceDatasetId, sourceKind, sourceRowKey, regulatoryType, mainFunction, collectedAt, candidateNameTruncated, candidateNameOriginalLength, reviewFlags, source`

---

## 7. ProductMaster HFF 존재 여부

```
product_masters TOTAL = 181,241
```

| regulatory_type | count |
|---|---|
| DRUG | 177,413 |
| MEDICAL_DEVICE | 3,826 |
| GENERAL | 2 |

- `HEALTH_FUNCTIONAL` / `HFF` 계열 regulatory_type = **0건**
- **판정: HFF ProductMaster 0건 → HOLD 유지 (§11.2). STTEMNT_NO를 SKU처럼 승격한 흔적 없음.**

---

## 8. ProductIdentifier HFF 관련 type 존재 여부

```
product_identifiers TOTAL (deleted_at IS NULL) = 604,132
```

| identifier_type | count | distinct_masters |
|---|---|---|
| KOREA_DRUG_CODE | 177,413 | 177,413 |
| MFDS_CODE | 177,413 | 177,413 |
| ATC_CODE | 176,962 | 176,962 |
| KOREA_INSURANCE_CODE | 64,692 | 64,692 |
| GTIN | 3,826 | 3,826 |
| UDI_DI | 3,826 | 3,826 |

- `%STTEMNT%` / `%HEALTH%` / `%FUNCTIONAL%` / `%HFF%` 필터 = **0건**
- **판정: HFF identifier는 master 레벨에 없음.** MFDS_STTEMNT_NO는 `product_candidates`에만 존재(후보 단계). 승격 파이프라인 미진입.

---

## 9. RepresentativeProduct HFF anchor 존재 여부

```
representative_products TOTAL = 48,101
```

- 48,101건 전부 `metadata->>'anchorType'` = null, `metadata->>'sourceLabel'` = null
- HFF anchor = **0건**
- `shared_product_descriptions` TOTAL = 19,431 (기존 e약은요 파생분, HFF 무관)

---

## 10. admin 화면 확인 결과 (정적 분석 — CLAUDE.md §8 허용)

`admin.neture.co.kr > O4O 상품 DB` 프론트엔드 코드 실측:

| 항목 | 결과 | 근거 |
|---|---|---|
| 후보 목록 | 서버 페이지네이션(limit ≤ 100) | `ProductCandidatesPage.tsx:243` |
| status / matchStatus / sourceType 필터 | select 드롭다운 3종 | `ProductCandidatesPage.tsx:125-133` |
| **sourceLabel 필터** | **텍스트 입력 존재** (Enter/버튼 commit) | `ProductCandidatesPage.tsx:46-48,104,142` |
| search 필터 | candidate_name 검색 | `product-candidate.service.ts:272` |
| sourceLabel 목록 표시 | 행에 표시됨 | `ProductCandidatesPage.tsx:203` |
| 후보 상세 rawPayload | 전체 JSON 접기/펼치기 (`.source` 중첩 원문 포함) | `ProductCandidateDetailPage.tsx:92-93` |
| 백엔드 필터 지원 | `sourceLabel` query param 수용 | `product-candidate.controller.ts:57,62` → `product-candidate.service.ts:250` |
| mutation | 목록/상세 read-only (매칭/거절은 별도 액션 엔드포인트) | — |

**⇒ HFF 후보는 admin에서 `sourceLabel=MFDS_HEALTH_FUNCTIONAL_FOOD`로 즉시 필터·조회 가능.** WO §6의 "sourceLabel 필터 없을 가능성" 가정은 현 코드 기준 outdated.

**부족한 UI (HFF 특화):**
- 상세의 원문은 **raw JSON blob**으로만 보인다 — MAIN_FNCTN / SRV_USE / INTAKE_HINT1 / PRSRV_PD / SUNGSANG / BASE_STANDARD가 **라벨링된 구조화 필드로 분리 표기되지 않음**. HFF 공식 텍스트 전용 뷰어 없음.
- `sourceLabel` 필터가 자유 텍스트라 오탈자 위험 — enum/select 승격 여지(경미).

---

## 11. ProductMaster 승격 가능성 판단

| 항목 | 판단 |
|---|---|
| 전량 승격 | **금지 유지** — barcode/SKU/포장 축 부재(전건 `SKU_IDENTIFIER_MISSING`) |
| HOLD | **유지** — HFF master/identifier 0건, 승격 트리거 없음 |
| 가능 subset | 현 시점 없음 — STTEMNT_NO는 매칭 축이지 SKU 아님. master 승격은 별도 barcode 원천 확보 후 판단(seed 트랙 Gate B 대기) |

STTEMNT_NO를 SKU로 오승격한 데이터는 **없음**(§7·§8 교차 확인). 긴급 audit 불요.

---

## 12. 다음 작업 추천

| 우선 | 후속 WO | 근거 |
|---|---|---|
| **1 (권장)** | `WO-O4O-HFF-RAWPAYLOAD-PARSER-DRYRUN-V1` (official text parser dry-run 실행/집계) | 파서·스크립트 이미 구현(`health-functional-food-official-text-parser-dryrun.ts`), `raw_payload.source` 커버리지 96~100%. 오프라인(`--file` Google Drive JSONL) 또는 `--use-db` 둘 다 read-only 가능 |
| 2 (선택) | `WO-O4O-ADMIN-HFF-OFFICIAL-TEXT-STRUCTURED-VIEWER-V1` | 상세 rawPayload를 라벨 필드로 분리 표기 (원문 소비자 노출 아님, 검수용) |
| — | import 복구 WO | **불필요** — 후보·원문 정상 보존 확인 |
| — | ProductMaster subset audit | **불필요** — HFF master 0건 |

---

## 13. DB write 0 / 코드 변경 0 확인

- 실행 쿼리: 전부 `SELECT` / `information_schema` / `\d` (DDL 조회) — 트랜잭션 `default_transaction_read_only=on`
- INSERT / UPDATE / DELETE / DDL / migration: **0**
- 코드 변경: **0** (문서 산출물만)
- rawPayload 전문 대량 저장: 없음 (샘플 3건·집계 수치만 기록)
- secret / 접속 문자열 / token: 문서 미기재

---

## 부록 A. 샘플 (HFF candidate, 공개 규제 데이터)

| candidate_name | manufacturer | identifier_type | STTEMNT_NO | main_function (일부) |
|---|---|---|---|---|
| 정상적인 면역기능에 필요한 원데이 면역 아연MK | (주)바이오 로제트 | MFDS_STTEMNT_NO | 20040017015247 | ①정상적인 면역기능에 필요 ②정상적인 세포분열에 필요 |
| 심플리갱년기 | 주식회사 상상바이오 | MFDS_STTEMNT_NO | 2017286000728 | [피크노제놀] 활성산소 제거·갱년기 여성 건강 / [테아닌] 긴장완화 |
| 맘스그린 액상 철분 | 주식회사 상상바이오 | MFDS_STTEMNT_NO | 2017286000729 | [철] 산소운반·혈액생성·에너지 생성에 필요 |

(전건 `candidate_status=pending`, `match_status=unmatched`, `candidate_category=HEALTH_FUNCTIONAL_FOOD`)
