# WO-O4O-QUASI-DRUG-PUBLIC-SKU-BARCODE-SOURCE-AUDIT-V1

> 작업 성격: **read-only 공공 원천 audit + Gate B 재판정.** DB write 0, ProductMaster/ProductIdentifier/SharedProductDescription 생성 0, raw 대량 수집 0, secret 기록 0. 문서만.
> 작성일: 2026-07-04
> 트랙: **의약외품 전용** (건강기능식품/의료기기/약가마스터 등 타 트랙과 분리)
> 선행: `WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-IMPORT-MAPPER-AND-SERVICE-V1`(§9 Gate A apply 22,953 완료), `WO-O4O-QUASI-DRUG-PUBLIC-XML-DESCRIPTION-PARSER-DRYRUN-V1`(파서 준비, SPD 이연), `CHECK-O4O-QUASI-DRUG-PUBLIC-SEED-MAPPING-V1`

---

## 0. 한 줄 결론

**의약외품을 ProductMaster 로 승격할 barcode/GTIN/표준코드/포장(SKU) 축을 `ITEM_SEQ` 로 조인 가능하게 제공하는 공개 원천은 현재 존재하지 않는다. Gate B 는 계속 HOLD.** 다만 의약외품과 결정적 차이 하나 — **허가상태(취소/폐업/취하/행정취소)는 이미 `CANCEL_CODE_NAME` 으로 보유**하므로, 건강기능식품과 달리 상태 축은 Gate B 잠금 요인이 아니다. 유일한 잠금은 **SKU/barcode/포장 축 부재**다.

장래 잠금 해제 후보는 단 하나 — **2024년 신설 "의약외품 바코드 등록"(의약품안전나라)** — 이나, 자율·부분(다소비 품목)·공개 API/ITEM_SEQ 조인 미확인 상태라 **별도 verify WO 선행**이 필요하다.

---

## 1. 조사한 공공 원천 (6종)

| # | 원천 | ID/경로 | 대상 | barcode/SKU | 상태 |
|---|---|---|---|---|---|
| 1 | 식품의약품안전처_바코드연계제품정보 | data.go.kr `15060549` | **식품 전용** (foodsafetykorea) | 유통바코드 有 | ❌ 의약외품 아님. **2018 최신화 중단** |
| 2 | 식품의약품안전처_유통바코드 | data.go.kr `15064775` | **식품 전용** (품목보고번호=식품) | 바코드번호 有 | ❌ 의약외품 아님. **2018 중단** |
| 3 | 약가마스터 의약품표준코드 | data.go.kr `15067462` | **의약품(건보 급여)** | KD코드 13자리 有 | ❌ 의약외품 `ITEM_SEQ` 미포함 (의약품 registry) |
| 4 | 의약품 낱알식별 정보 | data.go.kr `15057639` | **의약품(정제)** | 표준코드 有 | ❌ 의약외품 아님 |
| 5 | 의료기기 표준코드(UDI) | data.go.kr `15073879` 등 | **의료기기** | UDI-DI 有 | ❌ 의약외품 아님 (별도 트랙) |
| 6 | **의약외품 바코드 등록** (의약품안전나라) | nedrug.mfds.go.kr, 2024-10~ | **의약외품(다소비 품목)** | 바코드 등록 有(자율) | ⚠ **유일 후보.** 공개 OpenAPI·ITEM_SEQ 조인 **미확인** |

> data.go.kr / 식약처 공공데이터 목록·의약품안전나라 공공데이터 개요에서 **의약외품 전용 barcode/표준코드 OpenAPI 는 확인되지 않음**. 식품 barcode 2종은 대상·키(품목보고번호)·중단연도(2018) 모두 부적합.

---

## 2. 확인 항목별 판정 (WO 7문항)

| # | 질문 | 판정 |
|---|---|---|
| 1 | 의약외품 표준코드/바코드/포장 공개 원천 존재? | **사실상 없음.** 식품 barcode 2종(식품 전용·2018중단) 외 의약외품 대상 공개 barcode/표준코드 데이터셋 미확인. 2024 의약외품 바코드 등록은 API/공개 여부 미확인 |
| 2 | `ITEM_SEQ` 와 join 가능한 키? | **현재 없음.** 식품 원천 키=품목보고번호(식품), 의약품 원천 키=KD코드/의약품 품목기준코드(별도 registry). 의약외품 `ITEM_SEQ`(품목기준코드)와 대응하는 barcode 원천 미확인 |
| 3 | 원천 grain (품목/허가 vs SKU) | 우리 보유 허가정보 = **품목/허가 단위**(ITEM_SEQ). barcode 축 자체 부재로 SKU grain 미확보 |
| 4 | barcode/GTIN check digit 검증 가능? | **불가** — barcode 값 자체가 없음. (의료기기 UDIDI_CD 처럼 check digit 검증할 축이 의약외품엔 없음) |
| 5 | 취소/폐업/행정처분 상태와 함께 사용 가능? | **가능 (이미 보유).** 의약외품 허가정보 API 의 `CANCEL_CODE_NAME`(정상/폐업/취하/행정(취소)/취소) 로 상태 판별. **건강기능식품과 결정적 차이** — HFF 는 상태 필드 부재였으나 의약외품은 상태 있음 |
| 6 | ProductMaster 승격 가능성 | **불가 (Candidate only 유지).** 전량 불가. 일부 가능성은 §3 의약외품 바코드 등록 검증 결과에 조건부 종속 |
| 7 | XML 파서 / SPD 파생 | 파서 **구현·검증 완료**(선행 WO, 99.8% 파싱). **SharedProductDescription 파생은 Gate B(ProductMaster) 이후로 이연** (master 부재로 파생 대상 1/22,953). 본 audit 도 이 결론 유지 |

---

## 3. 유일한 Gate B 잠금 해제 후보 — 2024 의약외품 바코드 등록

식약처는 2024-10 "의약외품 안전정보 접근성 개선" 으로 **제조·수입업체가 의약품안전나라를 통해 바코드를 직접 등록**하도록 개선했다. 대상은 **다소비 품목**(치약제, 반창고, 보건용 마스크, 구중청량제, 거즈, 비말차단용 마스크 등).

**우리 데이터와의 겹침이 크다** — 상위 CLASS_NO_NAME: 보건용 마스크 5,778 / 치약제 2,961 / 생리대 2,844 / 비말차단 마스크 2,155 / 반창고 1,741. 즉 마스크·치약·반창고류가 바코드 등록 대상과 상당 부분 일치 → **성사되면 다소비 품목 일부(sub-set)만 부분 승격 가능성**.

단, 확인되지 않은 3가지 때문에 지금은 잠금 해제로 볼 수 없다:

| 미확인 | 필요 검증 |
|---|---|
| (a) 공개 OpenAPI/파일데이터 제공 여부 | data.mfds.go.kr / data.go.kr 에 의약외품 바코드 데이터셋 실재 확인 |
| (b) `ITEM_SEQ`(품목기준코드) 조인 키 | 등록 데이터가 품목기준코드/품목번호로 join 되는지 |
| (c) barcode 형식 (GTIN-13/14?) + 등록 커버리지 | check digit 검증 가능 형식인지, 자율등록 커버율(전량 아님) |

**성격: 자율·부분 등록** → 전량 승격 불가. 최선의 경우도 **등록된 다소비 품목 부분집합만** ProductMaster 승격 후보.

---

## 4. Gate B 재판정

| 축 | 상태 | Gate B 영향 |
|---|---|---|
| 제품명 / 업체명 / 품목 식별자(ITEM_SEQ) | 보유 (Gate A 적재 완료) | 충족 (Candidate) |
| **허가상태 (CANCEL_CODE_NAME)** | **보유** | ✅ Gate B blocker 아님 (HFF 와 차별점) |
| barcode / GTIN / 표준코드 | **부재** | ❌ 잠금 |
| 포장단위 / SKU grain | **부재** | ❌ 잠금 |
| check digit 검증 | 불가 (코드 없음) | ❌ 잠금 |
| 이미지 | 부재 | Gate C 별도 |

**판정: Gate B = HOLD (등급 C 유지).** 원인은 **SKU/barcode/포장 축 부재 단 하나**. 상태 축은 이미 해결됨.

**승격 가능성 3분류:**
- 전량 가능: **아니오**
- 일부 가능: **조건부** — §3 의약외품 바코드 등록이 (a)(b)(c) 충족 시 다소비 품목 부분집합만
- 불가 / Candidate only 유지: **현재 상태** (원천 미확보 → 이것)

---

## 5. 다음 단계 (의약외품 트랙, 순서)

1. **의약외품 바코드 등록 원천 verify (권장 1순위, read-only)** — data.mfds.go.kr / data.go.kr / 의약품안전나라에서 2024 의약외품 바코드 데이터셋 실재·필드·`ITEM_SEQ` 조인·barcode 형식·커버리지 확인. 별도 CHECK. (`CHECK-O4O-QUASI-DRUG-BARCODE-REGISTRY-VERIFY-V1` 성격)
2. **(선택) candidate 파생 텍스트 스테이징** — 준비된 파서로 EE/UD/NB 평문을 candidate `raw_payload.derivedOfficialText` 보존 (master 불필요, apply 승인 필요).
3. **Gate B(ProductMaster 승격) 판단은 1의 결과에 종속** — 조인·형식 확인되면 다소비 품목 부분 승격 dry-run, 아니면 Candidate only 유지.

---

## 6. read-only / 준수 확인

| 항목 | 결과 |
|---|---|
| DB write / apply | 0 (원천 조사만) |
| ProductMaster / ProductIdentifier / SharedProductDescription 생성 | 0 |
| raw 대량 수집 | 0 (공개 데이터셋 메타만 조회) |
| serviceKey / secret 기록 | 0 |
| 코드 변경 | 0 |
| 범위 확장(건강기능식품/의료기기) | 0 |
| 병렬 세션 파일 수정 | 0 |

이번 변경 = 본 audit 문서 1건.

---

## 7. 참고 원천 (공개)

- 식품의약품안전처_바코드연계제품정보 (data.go.kr 15060549) — 식품, 2018 중단
- 식품의약품안전처_유통바코드 (data.go.kr 15064775) — 식품, 2018 중단
- 건강보험심사평가원_약가마스터_의약품표준코드 (data.go.kr 15067462) — 의약품 급여
- 식품의약품안전처_의약품 낱알식별 정보 (data.go.kr 15057639) — 의약품 정제
- 의약외품 바코드 등록 매뉴얼 배포 알림 (한국제약바이오협회, 2024-10) — 의약외품 자율 바코드 등록(다소비 품목)
- 의약품안전나라 공공데이터 개요 (nedrug.mfds.go.kr/cntnts/80) — 의약외품 barcode API 미확인

---

**최종: 의약외품 ProductMaster 승격을 뒷받침할 barcode/SKU/포장 공개 원천은 현재 없음 → Gate B HOLD 유지(Candidate only). 상태 축(CANCEL_CODE_NAME)은 이미 보유하므로 HFF 대비 blocker 하나(SKU/barcode)만 남는다. 유일한 해제 후보는 2024 의약외품 바코드 등록(다소비 품목·자율)이며, 공개 API·ITEM_SEQ 조인·barcode 형식을 별도 verify 한 뒤에야 다소비 품목 부분 승격을 검토할 수 있다.**
