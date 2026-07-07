# CHECK-O4O-QUASI-DRUG-BARCODE-SKU-SOURCE-AUDIT-FOR-GATE-B-V1

> 작업 성격: **read-only investigation / Gate B prerequisite audit.** 운영 DB write 0, ProductMaster/ProductIdentifier/ProductImage/SharedProductDescription 생성 0, Candidate 상태변경·삭제 0, 배포 0.
> 작성일: 2026-07-07
> WO: `WO-O4O-QUASI-DRUG-BARCODE-SKU-SOURCE-AUDIT-FOR-GATE-B-V1`
> 트랙: **의약외품 전용**
> 선행: `CHECK-O4O-QUASI-DRUG-CURRENT-STATE-AUDIT-V1`(Candidate 22,953·Master 0), `WO-O4O-QUASI-DRUG-PUBLIC-SKU-BARCODE-SOURCE-AUDIT-V1`(8439541e9), `CHECK-O4O-QUASI-DRUG-BARCODE-REGISTRY-VERIFY-V1`(Gate B HOLD 1차 판정)
> 채널: `cloud-sql-proxy` (netureyoutube:asia-northeast3:o4o-platform-db, port 5434) → `psql` read-only SELECT + `WebSearch`/`WebFetch` 공개 카탈로그. DB secret 미출력.

---

## 0. 한 줄 결론

**Gate B = HOLD (재확정, 등급 유지).** 의약외품 `ITEM_SEQ` 와 조인 가능한 barcode/GTIN/표준코드/포장(SKU) 공개 원천은 **존재하지 않는다.** 두 축에서 동시 확인됨:
1. **내부(DB):** Candidate 22,953건의 `raw_payload` 에 구조화된 barcode/표준코드/포장단위 필드가 **0건** — `source` 객체는 허가정보 20필드뿐(barcode 없음).
2. **외부(공개 카탈로그):** data.go.kr 에서 유일한 의약외품 데이터셋은 `15095679`(허가정보 — 우리가 이미 적재한 그것, barcode 무). 존재하는 표준코드/바코드 데이터셋은 전부 **의약품·의료기기·식품(2018중단)** — 의약외품 대상 barcode/표준코드 데이터셋 **부재**.

이는 선행 `BARCODE-REGISTRY-VERIFY-V1` 이 도구 한계로 남긴 §5 잔여 확인(의약외품 데이터셋 열거)을 **닫는다**. 의약외품 seed 는 **Gate A(Candidate 22,953) 완료 + Gate B(ProductMaster 승격) HOLD** 로 종료한다.

---

## 1. 운영 DB read-only 재확인 (2026-07-07)

| 지표 | 실측값 | SQL | 판정 |
|---|---:|---|---|
| 의약외품 Candidate (`MFDS_QUASI_DRUG_PERMIT`, `deleted_at IS NULL`) | **22,953** | §7.1 | ✅ 재확인 |
| distinct `ITEM_SEQ` | **22,953** | §7.1 | ✅ 전량 유일 |
| candidate_status | **pending = 22,953** (전량) | §7.1 | ✅ unmatched |
| 의약외품 Master (regulatory/drug_category/mfds_product_id 광범위) | **0** | §7.4 | ✅ Master 부재 |

---

## 2. rawPayload barcode/포장단위 스캔 (WO §7.2 — 신규 확인)

`raw_payload::text ILIKE` 스캔 (22,953건 전량):

| 패턴 | 매칭 | 해석 |
|---|---:|---|
| `%barcode%` | **0** | barcode 필드·값 부재 |
| `%바코드%` | **0** | 동일 |
| `%gtin%` | 1 | 노이즈 (구조 필드 아님) |
| `%표준코드%` | **0** | 표준코드 부재 |
| `%포장%` | 679 | **EE/UD/NB 공식문서 본문의 자유텍스트** (용법/주의 안에 "포장" 언급). 구조화된 포장단위 식별자 아님 |
| `%pack%` | 6 | 노이즈 |

**`raw_payload->'source'` 객체 키 (실측 20필드):**
`BIZRNO, ENTP_NO, ITEM_NO, CLASS_NO, ENTP_SEQ, ITEM_SEQ, ADIT_INGR, ENTP_NAME, ITEM_NAME, MAIN_INGR, CANCEL_DATE, EE_DOC_DATA, INDUTY_CODE, NB_DOC_DATA, UD_DOC_DATA, CLASS_NO_NAME, CANCEL_CODE_NAME, ITEM_PERMIT_DATE, MANUF_COUNTRY_NAMES, PERMIT_KIND_CODE_NM`

→ **barcode / GTIN / 표준코드 / 포장단위 컬럼 없음.** 679건 "포장" 은 전부 공식설명 원문(officialRegulatoryText / EE·UD·NB) 안의 서술어이며 SKU grain 근거가 되지 못한다. **내부 축 결론: rawPayload 로는 Gate B 불가.**

---

## 3. 외부 공개 원천 열거 (WO §6 — §5 잔여 gap 종료)

data.go.kr / 식의약데이터포털(data.mfds.go.kr) / 의약품안전나라(nedrug) 공개 카탈로그 재조사.

### 3.1 표준코드/바코드 계열 데이터셋 — 전부 非의약외품

| 데이터셋 | data.go.kr ID | 대상 | 키/바코드 | 의약외품 |
|---|---|---|---|---|
| 약가마스터_의약품표준코드 | `15067462` | **의약품** | KD코드 13자리 | ❌ |
| 묶음의약품정보서비스 | `15063908` | **의약품** | 대표 품목기준코드(의약품) | ❌ |
| 의약품 낱알식별 정보 | `15057639` | **의약품** | 품목기준코드(의약품) | ❌ |
| 의료기기 표준코드별 제품정보 | `15073875` | **의료기기** | UDI-DI | ❌ |
| 의료기기 표준코드별 제조수입업자 | `15073868` | **의료기기** | UDI-DI | ❌ |
| 유통바코드 | `15064775` | **식품** | 품목보고번호(식품) | ❌ (2018 중단) |
| 바코드연계제품정보 | `15060549` | **식품** | 품목보고번호(식품) | ❌ (2018 중단) |

### 3.2 의약외품 데이터셋 — 유일 = 허가정보 (barcode 무)

| 데이터셋 | data.go.kr ID | 필드 | barcode/SKU |
|---|---|---|---|
| **식품의약품안전처_의약외품 제품 허가 정보** | **`15095679`** | 품목명·용법용량·효능효과·주의사항·ITEM_SEQ 등 20필드 (§2 목록) | **없음** |

→ **data.go.kr 상 의약외품 데이터셋은 `15095679` 단 하나**이며, 그것이 우리가 이미 적재한 원천이다. 별도 의약외품 barcode/표준코드 데이터셋은 **존재하지 않는다.**

### 3.3 2024 "의약외품 바코드 등록" — bulk 공개 API 아님

선행 판정 유지. 식약처 2024-10 "의약외품 안전정보 접근성 개선" = **업체 직접 등록 + 소비자 mobile 간편검색** 채널이며, `ITEM_SEQ` 조인 가능한 bulk export OpenAPI/파일로 공개되지 않는다(nedrug 공공데이터 개요에서 의약외품 barcode 데이터셋 미확인).

---

## 4. WO §2 8개 질문 — 판정

| # | 질문 | 판정 |
|---|---|---|
| 1 | barcode/SKU/포장단위 원천 존재? | **아니오.** 내부 rawPayload·외부 공개 카탈로그 양쪽 부재 |
| 2 | 공개 API/다운로드 가능? | **N/A** (원천 자체 부재) |
| 3 | `ITEM_SEQ` 조인 가능? | **불가** (조인 대상 원천 없음) |
| 4 | 안정 매칭 건수? | **0** |
| 5 | barcode GTIN/EAN 유효? | **N/A** (barcode 값 없음) |
| 6 | 1 ITEM_SEQ → 다 SKU/barcode 표현 가능? | **N/A** (SKU 축 부재) |
| 7 | Gate B dry-run 진행 가능? | **아니오** |
| 8 | Candidate-only 유지? | **예 — Candidate-only 유지** |

---

## 5. Gate B 판정 = HOLD

WO §10.2 HOLD 조건 **"barcode/SKU 원천이 없다"** 에 해당.

| 축 | 상태 |
|---|---|
| 제품명 / 업체명 / ITEM_SEQ / 허가상태 | ✅ 보유 (Gate A 완료) |
| **barcode / GTIN / 표준코드** | ❌ 내부·외부 양축 부재 |
| **포장단위 / SKU grain** | ❌ 부재 (679 "포장" = 자유텍스트) |
| check digit 검증 | ❌ N/A |

**GO 아님** (barcode·조인키 부재). **NO-GO 아님** (원천 자체가 없어 "오염 위험" 판단 이전 단계 — 데이터가 나쁜 게 아니라 없음). → **HOLD.**

---

## 6. 다음 단계

Gate B 승격 경로는 종료. 남은 것은 선택적·대기 작업뿐.

| 항목 | 상태 | 트리거 |
|---|---|---|
| candidate `derivedOfficialText` 스테이징 (EE/UD/NB 평문 → raw_payload) | **선택** | 파서 구현 완료(`quasi-drug-permit-official-text.parser.ts`, 52d3e4e2a). 운영자 검토·검색용. apply 시 승인 필요. SharedProductDescription 아님 |
| Gate B 재개 | **대기** | 식약처가 의약외품 barcode/표준코드를 `ITEM_SEQ` 조인 **공개 API/파일**로 배포 시 → §3 방법으로 재확인 후 다소비 품목 부분 승격 dry-run 재개 |
| candidate → master 자동매칭 | 미착수 | `MFDS_CODE` 공유 네임스페이스 → `sourceKind` 스코프 필수 |

**신규 WO `WO-O4O-QUASI-DRUG-GATE-B-PRODUCTMASTER-PROMOTION-DRYRUN-V1` 은 작성하지 않는다** (GO 조건 미충족).

---

## 7. 준수 확인

| 항목 | 결과 |
|---|---|
| 운영 DB write / apply | 0 (SELECT only) |
| ProductMaster / ProductIdentifier / ProductImage / SharedProductDescription 생성 | 0 |
| Candidate insert/update/delete/상태변경 | 0 |
| 방화벽 변경 | 0 (cloud-sql-proxy 채널) |
| 배포 / migration / Cloud Run Job | 0 |
| raw 대량 수집 | 0 (공개 카탈로그 메타만) |
| DB secret 원문 기록 | 0 |
| 범위 확장 (의약품/의료기기/건기식) | 0 |

---

**최종: 의약외품 `ITEM_SEQ` 와 조인 가능한 barcode/SKU 공개 원천은 내부 rawPayload·외부 공개 카탈로그 어디에도 없다. data.go.kr 의약외품 데이터셋은 허가정보(`15095679`) 하나뿐이며 barcode 필드가 없다. Gate B = HOLD 재확정. 의약외품 seed 는 Candidate-only(22,953)로 유지하며, 향후 식약처가 조인 가능한 공개 barcode 원천을 배포할 때만 재개한다.**

---

### 참고 원천 (공개)

- 식품의약품안전처_의약외품 제품 허가 정보 — data.go.kr [15095679](https://www.data.go.kr/data/15095679/openapi.do) (우리 원천, barcode 무)
- 건강보험심사평가원_약가마스터_의약품표준코드 — data.go.kr [15067462](https://www.data.go.kr/data/15067462/fileData.do) (의약품)
- 식품의약품안전처_의료기기 표준코드별 제품정보 — data.go.kr [15073875](https://www.data.go.kr/data/15073875/openapi.do) (의료기기)
- 식품의약품안전처_유통바코드 — data.go.kr [15064775](https://www.data.go.kr/data/15064775/openapi.do) (식품, 2018 중단)
- 식품의약품안전처_바코드연계제품정보 — data.go.kr [15060549](https://www.data.go.kr/data/15060549/openapi.do) (식품, 2018 중단)
- 의약품안전나라 공공데이터 개요 — [nedrug.mfds.go.kr/cntnts/80](https://nedrug.mfds.go.kr/cntnts/80) (의약외품 barcode 데이터셋 미확인)
