# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-GATE0-V1

> WO: `WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-GATE0-CHECK-V1`
> 성격: **Gate 0 / read-only 판단 CHECK.** DB write·seed import·ProductMaster/Identifier 생성·설명 생성·배포 **없음**.
> 작성일: 2026-07-04 · 트랙: **건강기능식품 전용** (의료기기/의약외품/약가마스터/e약은요 등 타 트랙과 분리)
> 근거 코드/문서: mapper `health-functional-food-candidate.mapper.ts` · parser `health-functional-food-jsonl.parser.ts` · service `health-functional-food-candidate-import.service.ts` · CLI `scripts/health-functional-food-candidate-import.ts` · test `__tests__/health-functional-food-candidate-import.test.ts` · [`CHECK-...-LIVE-RESPONSE-V1`](CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-LIVE-RESPONSE-V1.md) · [`WO-...-CANDIDATE-APPLY-RUNBOOK-V1`](../work-orders/WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-APPLY-RUNBOOK-V1.md)

---

## 0. 중요 맥락 — 본 Gate 0 은 사후(post-hoc) 정리 CHECK

이 WO 는 "Gate A 이전의 사전 판단" 을 요구하나, **실제로는 건강기능식품 Gate A ProductCandidate apply 가 이미 실행·검증 완료(2026-07-04, commit `b64beb201`)** 되었다. 따라서 본 문서는 미지의 데이터를 사전 조사하는 것이 아니라, **이미 확보된 라이브 응답·매퍼·전량 dry-run·프로덕션 apply 결과를 근거로 grain / mapping / 식별자 / 승격 판단을 SSOT 로 고정** 하는 성격이다. §10 (현재 DB 존재 확인) 은 이 실행 결과를 read-only 로 확인한 결과다.

이 사실은 WO §6.7 ("현재 DB 에 이미 들어와 있는지 확인") 과 정합한다 — 충돌 아님.

---

## 1. 결론 요약

| 판단 항목 | 결론 |
|---|---|
| ProductCandidate 후보 수집 | **GO** — 제품명(`PRDUCT`)·업체명(`ENTRPS`)·신고번호(`STTEMNT_NO`) 존재, 이미 44,885건 적재 완료 |
| ProductMaster 승격 | **HOLD (등급 C)** — barcode/GTIN/포장(SKU)/허가상태 축 부재. 전건 `SKU_IDENTIFIER_MISSING` |
| grain | **품목제조신고 단위**(`STTEMNT_NO`) — 유통 SKU/barcode/package 단위 아님 |
| 신규 identifier type | **필요(단, Gate B 시점).** `MFDS_STTEMNT_NO` — 현재 `ProductIdentifierType` union 미포함. 후보에는 varchar 로 이미 저장됨 |
| 상태/취소/폐업 flag | **원천 부재.** 데이터셋에 상태/취소/신고말소 필드 없음(등록일자 `REGIST_DT` 뿐) → 취소/폐업 판별 **불가** |
| 매장용 설명 참고 | 사실정보 필드(성상/보관/유통기한)만 그대로 참고 가능. **기능성(`MAIN_FNCTN`)·주의사항은 효능·질병 표현 검수 필수** |
| 현재 DB 존재 | **존재.** `product_candidates` 44,885건 (source_label `MFDS_HEALTH_FUNCTIONAL_FOOD`), status pending. ProductMaster/Identifier 불변 |
| Gate A import 범위 | **이미 실행 완료.** 다음은 **Gate B(ProductMaster 승격)** — barcode/포장/허가상태 원천 확보 선행 |

**한 줄 결론:** 건강기능식품 공공데이터(건강기능식품정보, `HtfsInfoService03`)는 **ProductCandidate 후보풀/보조검색 목적으로 수용(GO, 실행 완료)** 하되, **ProductMaster 로의 직접 승격은 유통 식별자·포장·허가상태 부재로 보류(HOLD/등급 C)** 한다.

---

## 2. 조사한 공식 API / source 목록

### 2.1 확정 (라이브 200 확보)

| 항목 | 값 |
|---|---|
| 데이터셋명 | **건강기능식품정보** |
| 제공기관 | 식품의약품안전처(MFDS) |
| dataset ID | `15056760` |
| endpoint | `https://apis.data.go.kr/1471000/HtfsInfoService03/getHtfsItem01` |
| 인증 | data.go.kr `serviceKey` (활용신청 승인 필요 — 2026-07-02 403 → 2026-07-04 **200**) |
| 페이지네이션 | `pageNo` / `numOfRows` (numOfRows 최대 500 관측) |
| 응답 포맷 | `type=json` 정상. `header{resultCode,resultMsg}` + `body{pageNo,numOfRows,totalCount,items[]}` |
| ⚠️ 래핑 | `body.items[]` 의 **각 원소가 `{item:{...}}`** (이중 래핑). 표준 `items.item[]` 아님 → flatten 필요 |
| totalCount | **44,885** |
| 라이선스/이용조건 | 활용신청 승인 상태 = **내부 DB 후보 저장 가능** (승인 반영으로 라이브 확보). 원문 secret/키는 커밋·기록 금지(준수) |
| 근거 | [`CHECK-...-LIVE-RESPONSE-V1`](CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-LIVE-RESPONSE-V1.md) §2–3 |

### 2.2 미확보 (후보 — 본 트랙에서 라이브 미검증)

WO §5 가 후보로 제시한 나머지 2종은 이번 트랙에서 **라이브 응답을 확보하지 않았다**. 명칭/endpoint/필드 **미확인**으로 기록한다.

| 후보 source | 상태 | 비고 |
|---|---|---|
| 건강기능식품 품목제조 신고사항 현황 | **미확인** | `HtfsInfoService03` 의 `STTEMNT_NO`(품목제조신고번호) 와 개념 중복 가능성 — 별도 검증 필요 |
| 건강기능식품 기능성 원료인정 현황 | **미확인** | 원료/기능성 단위(제품 단위 아님). 제품 후보가 아니라 **원료·기능성 공통 가이드** 축일 가능성(§9 참조). 별도 WO |

> 미확인 항목은 명칭이 후보이며, 실제 데이터포털 명칭/API ID/필드는 확보 시 별도 CHECK 로 확정한다(추정 금지).

---

## 3. 각 source 의 grain 판단

### 건강기능식품정보 (`HtfsInfoService03`)

| 질문 | 판단 |
|---|---|
| 유통 SKU 인가 | **아니오** — 바코드/GTIN/포장단위 필드 없음 |
| 신고 품목인가 | **예** — row key = `STTEMNT_NO`(품목제조신고번호). 1 row = 1 신고 품목 |
| 제조/수입업소 단위인가 | 아니오(업체명 `ENTRPS` 는 속성일 뿐, row 단위는 품목) |
| 기능성 원료 단위인가 | 아니오(주된 기능성 `MAIN_FNCTN` 은 텍스트 속성) |
| 바코드/package 단위인가 | **아니오** — 포장/규격 축 없음 |
| 동일 제품명 중복 가능성 | 가능(동일 제품이 업체/신고번호별로 분리될 수 있음). 단 전량 dry-run 결과 **`STTEMNT_NO` 44,885 전량 유일** → row key 자체는 중복 0 |

**ProductMaster 로 바로 승격 가능한 grain 인가 → 아니오.** 신고 품목 단위이며 유통 식별자(barcode)·포장 단위·허가상태가 없어, "SKU/package/barcode 에 가까운 기본상품 단위"(WO §4-3) 요건을 만족하지 못한다.

---

## 4. 샘플 row 필드 표 (라이브 확정, item 11필드)

> flatten raw 1 line = 1 item. 전부 nullable(공공데이터 결측 관대). 원문은 `raw_payload.source` 에 무손실 보존.

| # | 필드 | 의미 | 후보 매핑 | 비고 |
|---|---|---|---|---|
| 1 | `ENTRPS` | 업체명 | `candidate_manufacturer` | |
| 2 | `PRDUCT` | 제품명 | `candidate_name` | **선행 공백 → trim.** varchar(255) 방어 truncate(전량 max 110 → 초과 0) |
| 3 | `STTEMNT_NO` | 품목제조신고번호 | `identifier_value` / `normalized_identifier_value` | **식별자.** 전량 유일 |
| 4 | `REGIST_DT` | 등록일자 | rawPayload | 상태 판별 불가(§7) |
| 5 | `DISTB_PD` | 유통기한 | rawPayload | 텍스트. 매장설명 사실정보 후보(§9) |
| 6 | `SUNGSANG` | 성상 | rawPayload | 텍스트. 매장설명 사실정보 후보 |
| 7 | `SRV_USE` | 섭취방법/용도 | rawPayload | 텍스트. 매장설명 재작성 후보(검수) |
| 8 | `PRSRV_PD` | 보관조건 | rawPayload | 텍스트. 매장설명 사실정보 후보 |
| 9 | `INTAKE_HINT1` | 섭취 시 주의사항 | rawPayload | 개행 포함. 매장설명 재작성 후보(검수) |
| 10 | `MAIN_FNCTN` | 주된 기능성 | rawPayload(`mainFunction`) | **효능·질병 표현 위험 — 상품 기본정보와 분리 보존** |
| 11 | `BASE_STANDARD` | 기준·규격 | rawPayload | 개행 포함. 내부 참고 |

**후보 컬럼 미존재 → rawPayload(jsonb) 보존 대상:** `regulatoryType`(=`HEALTH_FUNCTIONAL`), `mainFunction`, `reviewFlags`, `sourceAgency/DatasetName/DatasetId/Kind/RowKey`, `collectedAt`, truncate 흔적, 무손실 `source` item 전체.

---

## 5. ProductCandidate mapping 초안 (구현 확정본)

> mapper `mapHealthFunctionalFoodItem()` 에 이미 구현·테스트(19/19 PASS)됨. Gate A 에서 이 매핑으로 44,885건 적재.

| ProductCandidate 컬럼 | 값 | 규칙 |
|---|---|---|
| `source_type` | `external_api` | 상수 |
| `source_label` | `MFDS_HEALTH_FUNCTIONAL_FOOD` | 상수 |
| `identifier_type` | `MFDS_STTEMNT_NO` | `STTEMNT_NO` 있을 때만. 없으면 null + `STTEMNT_NO_MISSING` |
| `identifier_value` | `trim(STTEMNT_NO)` | |
| `normalized_identifier_value` | `trim(STTEMNT_NO)` | dedup 키 |
| `candidate_name` | `trim(PRDUCT)` slice(0,255) | 초과 시 `CANDIDATE_NAME_OVERLENGTH` (실측 0) |
| `candidate_manufacturer` | `trim(ENTRPS)` | |
| `candidate_category` | `HEALTH_FUNCTIONAL_FOOD` | 상수 |
| `candidate_spec` / `candidate_unit` / `candidate_image_url` | **null** | 포장·SKU·이미지 축 부재(WO 확정) |
| `raw_payload` | jsonb | §4 rawPayload 보존 필드 + 무손실 `source` |
| **dedup 키** | (`external_api`, `MFDS_STTEMNT_NO`, normalized STTEMNT_NO, sourceKind `health_functional_food`) | 재적재 idempotent |

**reviewFlags** (rawPayload 보존, DB 미컬럼): `STTEMNT_NO_MISSING` / `PRDUCT_MISSING` / `MANUFACTURER_MISSING` / `MAIN_FUNCTION_MISSING` / `PRESERVATION_MISSING` / `INTAKE_HINT_MISSING` / `CANDIDATE_NAME_OVERLENGTH` / **`SKU_IDENTIFIER_MISSING`(전건 부착 — 승격 보류 근거)**.

---

## 6. 식별자 후보와 identifier type 판단

| 값 | 판단 |
|---|---|
| `STTEMNT_NO` (품목제조신고번호) | **신규 identifier type 필요** — 추천명 `MFDS_STTEMNT_NO` |

- ProductCandidate 의 `identifier_type` 는 **varchar(40) free** → `MFDS_STTEMNT_NO` 를 그대로 저장(현재 44,885건 저장됨). **후보 단계에서는 신규 타입 등록 불필요.**
- 그러나 장래 ProductMaster 승격(Gate B) 시 STTEMNT_NO 를 `ProductIdentifier` 로 올리려면, `ProductIdentifierType` union(`GTIN/EAN13/…/MFDS_CODE/UNKNOWN`)에 **`MFDS_STTEMNT_NO` 가 없어 신규 타입 추가가 필요**하다.
  - 기존 `MFDS_CODE`(식약처 코드, 의약품 트랙에서 사용)로 대체 금지 — 품목제조신고번호는 의미가 다르고 의약품 코드와 충돌한다.
  - **조치: 지금 구현하지 않는다.** Gate B WO 에서 `ProductIdentifierType` 에 `MFDS_STTEMNT_NO` 추가 + 근거 기록.
- 기존 `MFDS_CODE` 로 수용 가능한 값: 없음(이 데이터셋엔 식약처 일반 코드 필드 부재).
- 단순 source metadata 로만 보존할 값: `REGIST_DT`, `DISTB_PD`, `SUNGSANG`, `BASE_STANDARD` 등 나머지 원문.

---

## 7. 상태 / 취소 / 폐업 / 중단 flag 판단

**결론: 데이터셋에 상태/취소/신고말소/폐업/중단 필드가 존재하지 않는다.**

- 11개 필드 중 시간 관련은 `REGIST_DT`(등록일자) 뿐이며, 유효/취소/말소 상태를 나타내는 필드가 없다.
- 따라서 이 데이터셋만으로는 **취소/폐업/중단 품목을 판별할 수 없다.** (WO §6.5 "상태 취소/폐업/중단 시 기본상품 승격 금지" 를 적용할 근거 자체가 없음)
- 후보 적재는 문제없으나, **"현재 유효 신고 품목" 임을 보증하지 못한다** → ProductMaster 승격 보류의 추가 근거.
- 유효성 상태가 필요하면, WO §5 후보 중 "품목제조 신고사항 현황"(상태 필드 포함 여부 미확인) 을 별도 확보해 교차검증해야 한다(후속).

---

## 8. ProductMaster 승격 가능성 판단

**판정: HOLD (등급 C — 보조검색/후보풀 보강 성격)**

| 승격 기준(WO §6.5) | 이 데이터셋 | 판정 |
|---|---|---|
| 제품명+업체명+안정 source key 만 존재 → 기본 보류 | `PRDUCT`+`ENTRPS`+`STTEMNT_NO`(전량 유일) | **보류 조건 해당** |
| 바코드/GTIN/package 존재 → 제한 승격 검토 | **부재** | 승격 불가 |
| 동일 신고번호가 복수 포장/SKU 대표 | 포장 축 자체 없음 | 승격 금지 근거 |
| 상태 취소/폐업/중단 | 상태 필드 부재(§7) | 유효성 미보증 → 승격 금지 강화 |

- 전건에 `SKU_IDENTIFIER_MISSING` 부착 = 승격 보류의 기계적 근거.
- 코드 보장: mapper 주석(§17) + service 는 `product_candidates` INSERT/UPDATE SQL 만 보유(ProductMaster/Identifier write 코드 없음). apply 검증에서 `product_masters`/`product_identifiers` **불변** 확인(§10).
- **승격 해제(→ GO) 조건(Gate B 선행):** ① barcode/GTIN 또는 포장·규격 SKU 축 확보(별도 원천), ② 신고 유효상태 확보(품목제조 신고사항 현황 교차), ③ `ProductIdentifierType` 에 `MFDS_STTEMNT_NO` 신설.

---

## 9. 매장용 설명 생성 참고 필드 분류

> 본 WO 는 설명 생성/저장/노출을 **구현하지 않는다**. 분류만 기록.

| 분류 | 필드 | 처리 지침 |
|---|---|---|
| A. 공식 사실정보 — 그대로 참고 가능 | `SUNGSANG`(성상), `PRSRV_PD`(보관조건), `DISTB_PD`(유통기한), `REGIST_DT`(등록일자) | 사실 전달. 재작성 최소 |
| B. 재작성 가능하나 표현 제한 | `SRV_USE`(섭취방법), `INTAKE_HINT1`(주의사항) | 소비자 문구 재작성 시 **과장·효능 암시 금지**. 원문 의미 보존 |
| C. 내부 검수 없이는 노출 금지 | `MAIN_FNCTN`(주된 기능성) | **효능/기능성 표현.** 의학적 효능·질병 치료/예방 암시 **금지**. 검수 필수 |
| D. 제품별이 아니라 원료/기능성 공통 가이드로만 | 기능성 원료·성분 일반 문구(본 데이터셋엔 제품 텍스트로만 존재) | 제품별 저장 대신 **공통 가이드/생성규칙**으로 처리(WO §4-5). 테이블 설계 대상 아님 |

**금지 기준(문서화):** 의학적 효능, 질병 치료/예방 암시, "면역력 강화로 질병 예방" 류 표현 금지. 건강기능식품 기능성 표시·광고 규정 준수 전제. AI 설명 생성·저장·노출은 별도 Gate/WO.

---

## 10. 현재 DB 건강기능식품 기초 데이터 존재 확인 (read-only)

**존재함.** 권위 근거 = 동일 날짜(2026-07-04) 프로덕션 apply + 검증 SQL([RUNBOOK §9](../work-orders/WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-APPLY-RUNBOOK-V1.md)).

| 지표 | 실측(프로덕션 SQL, 2026-07-04) |
|---|---|
| `product_candidates` where source_label=`MFDS_HEALTH_FUNCTIONAL_FOOD` (SQL-B) | **44,885** |
| distinct normalized `STTEMNT_NO` (SQL-C) / distinct identifier_value (SQL-D) | **44,885 / 44,885** (중복 0) |
| candidate_name / manufacturer / raw_payload null (SQL-E/F/G) | **0 / 0 / 0** |
| candidate_status 분포 | **pending 44,885** |
| reviewFlags | SKU_IDENTIFIER_MISSING 44,885 · INTAKE_HINT_MISSING 1,663 · PRESERVATION_MISSING 415 · MAIN_FUNCTION_MISSING 31 · OVERLENGTH 0 |
| `product_masters` / `product_identifiers` (SQL-I) | **230,843 / 703,483 — apply 전후 불변** |

- 실제 확인된 값만 기록(추정 금지): 존재하는 값은 `source_type='external_api'`, `source_label='MFDS_HEALTH_FUNCTIONAL_FOOD'`, `identifier_type='MFDS_STTEMNT_NO'`, `candidate_category='HEALTH_FUNCTIONAL_FOOD'`, `raw_payload.regulatoryType='HEALTH_FUNCTIONAL'`.
- admin `O4O 상품 DB` 화면(2026-07-04 smoke): 공공데이터 후보 API 라이브(200), 후보 총 378,119건(HFF 44,885 포함, 이후 타 트랙 추가분 반영). 기본 상품(ProductMaster) 화면에는 건강기능식품 미표시 = 정상(master 미승격).
- **본 Gate 0 에서 방화벽 기반 신규 gcloud SQL 재조회는 수행하지 않았다.** 사유: 동시 병렬 세션(easy-drug/drug-rep 등)이 활성이며, authorized-networks 리스트 전체 교체 특성상 임시 IP 추가가 **병렬 세션의 방화벽을 clobber** 하는 실측 리스크가 있다(RUNBOOK §9.2). 권위 근거는 동일 날짜 프로덕션 검증 SQL 로 충분.

---

## 11. Gate A 후보 import 작업 범위 (→ 실행 완료, 다음은 Gate B)

**Gate A(ProductCandidate import) 는 이미 실행·검증 완료됨.** 남은 것은 Gate B 이다.

### 11.1 Gate A (완료됨 — 재실행 불필요)
- source_label `MFDS_HEALTH_FUNCTIONAL_FOOD` / identifier_type `MFDS_STTEMNT_NO` / `product_candidates` INSERT only / 44,885 created / master·identifier 불변. (근거: RUNBOOK §9)

### 11.2 Gate B (ProductMaster 승격) — 후속 WO 로 넘길 범위
1. **유통 식별자·포장 축 원천 확보** — barcode/GTIN 또는 포장·규격 SKU. (건강기능식품정보 데이터셋 밖. 별도 원천 필요)
2. **신고 유효상태 확보** — 품목제조 신고사항 현황(상태/취소 필드 포함 여부 검증) 교차.
3. **`ProductIdentifierType` 에 `MFDS_STTEMNT_NO` 신규 타입 추가**(§6) + partial unique 정책 정합.
4. 승격 대상 grain 재정의(신고 품목 → SKU 매핑 규칙) 및 GO/HOLD 재판정.
5. (병행 가능) 매장용 설명 생성 Gate — 기능성 표현 검수 규칙(§9) 우선.

---

## 12. 리스크와 미확인 사항

| # | 항목 | 상태/리스크 |
|---|---|---|
| 1 | 상태/취소 필드 부재 | 취소·폐업·말소 품목을 판별 불가 → 후보에 무효 품목 포함 가능. 승격 전 교차검증 필수 |
| 2 | WO §5 후보 2종 미확보 | "품목제조 신고사항 현황" / "기능성 원료인정 현황" 라이브 미검증. 명칭/필드 미확인 |
| 3 | 기능성 원료인정 grain | 제품 단위 아닐 가능성(원료/기능성). ProductCandidate 축에 부적합할 수 있음 → 별도 판단 |
| 4 | 기능성 표현 규제 | `MAIN_FNCTN` 등 소비자 노출 시 효능·질병 암시 규제 위반 리스크. 검수 전 노출 금지 |
| 5 | 제품 중복(동일제품·복수신고) | STTEMNT_NO 는 유일하나, 동일 실제 제품이 복수 신고번호로 분산될 수 있음 → 승격 시 dedup 별도 설계 |
| 6 | numOfRows 최대 500 | 전량 재수집 시 페이지네이션(약 90페이지) — 원천 재확보는 별도 fetch WO |
| 7 | 이미지 부재 | 데이터셋에 이미지 축 없음. 가짜 이미지 생성 금지(WO §4-6). 매장 표시용 이미지는 별도 원천 |

---

## 부록 A. 준수 확인 (이 CHECK)

| 항목 | 결과 |
|---|---|
| 코드 변경 | **0** |
| DB mutation / seed import / apply | **0** (기존 실행 결과를 read-only 인용만) |
| ProductMaster/Identifier/Offer/Listing/StoreLocalProduct/SharedProductDescription 생성 | **0** |
| migration / Cloud Run Job / admin UI 수정 / 배포 | **0** |
| secret / API key / 토큰 문서화 | **0** (변수명·마스킹만) |
| 대량 raw response 커밋 | **0** (raw 는 repo 밖 G:드라이브, 미커밋) |
| 이번 변경 | **CHECK 문서 1건** |

**최종:** 건강기능식품 공공데이터는 ProductCandidate 후보로 **GO(실행 완료, 44,885)**, ProductMaster 승격은 **HOLD/등급 C**(유통 식별자·포장·허가상태 부재). 다음 게이트는 Gate B(승격) 이며 barcode/포장/상태 원천 확보와 `MFDS_STTEMNT_NO` identifier type 신설이 선행 조건이다.
