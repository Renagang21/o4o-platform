# CHECK-O4O-QUASI-DRUG-PRODUCTMASTER-PROMOTION-DESIGN-AND-DRYRUN-V1

Status: DONE — 운영 DB read-only + 승격 설계 + dry-run (2026-07-07)
WO: `WO-O4O-QUASI-DRUG-PRODUCTMASTER-PROMOTION-DESIGN-AND-DRYRUN-V1`
Scope: 의약외품 ProductCandidate → ProductMaster 승격 설계 + collision dry-run. **DB write 0. ProductMaster/Identifier/Extension 생성 0.**

> **판정: GO.** 의약외품 ITEM_SEQ(허가 품목 단위)를 grain 으로, deterministic 내부 바코드 `200 + ITEM_SEQ(9) + EAN13 check` 로 승격 가능. 22,953 ITEM_SEQ 는 전부 9자리 숫자·유일 → 바코드 22,953 distinct, **intra-batch 중복 0 / 기존 master 충돌 0 / mfds_product_id 충돌 0**. eligible(정상 & 노이즈 제외) = **17,148** → wouldCreateProductMaster 17,148 + Identifier(INTERNAL_O4O primary + MFDS_CODE) 각 17,148. 취소류 4,883 + 노이즈(수출/군납) 922 = 5,805 는 HOLD(Candidate 보존). ProductDrugExtension 0(의약외품, 자동생성 없음).

---

## 1. 작업 일시 / 채널 / 준수

| 항목 | 값 |
| --- | --- |
| 조사 일시 | 2026-07-07 |
| 접속 | Cloud SQL Auth Proxy(`cloud-sql-proxy`, 127.0.0.1:5450~5452) → psql SELECT + 로컬 offline collision 계산 |
| write | **0** (SELECT 전용, ProductMaster/Identifier/Extension 생성 0, Candidate 변경 0) |

## 2. HOLD 정정 사유

기존 `CHECK-...-BARCODE-SKU-SOURCE-AUDIT-FOR-GATE-B-V1` 결론은 "barcode/SKU 공개 원천 부재 → ProductMaster 승격 HOLD" 였다. **정정 근거(WO §2):** O4O 의 목적은 완성된 유통 SKU DB 가 아니라 **매장 상품 등록을 쉽게 하는 기본상품 기준 데이터**다. 따라서 grain 을 아래로 재정의한다.

```text
ProductMaster grain = MFDS 의약외품 ITEM_SEQ 허가 품목 단위
실제 유통 barcode = 없음 → O4O 내부 생성 코드를 barcode mirror 로 사용(INTERNAL_O4O)
포장단위/SKU = 후속 보강 · 설명서 생성 = 안 함
```

> `product_masters.barcode` 는 `varchar(14) NOT NULL UNIQUE` 이므로 null 저장 불가 → 내부 코드 필수. 내부 코드는 **GTIN 을 사칭하지 않는다**(identifier_type = `INTERNAL_O4O`, GTIN/EAN13 아님).

## 3. 최신 DB read-only 실측

| 지표 | 값 |
| --- | ---: |
| 의약외품 Candidate total | **22,953** |
| distinct ITEM_SEQ | **22,953** (전량 유일) |
| ITEM_SEQ / ITEM_NAME / ENTP_NAME 결측 | 0 / 0 / 0 |
| 기존 quasi ProductMaster | **0** |
| ITEM_SEQ 형식 | **전량 9자리 숫자** (범위 196000044 ~ 220100001) |

**허가상태(CANCEL_CODE_NAME) 분포:**

| 상태 | 건수 | 정책 |
| --- | ---: | --- |
| 정상 | 18,070 | 승격 후보(노이즈 추가 제외) |
| 폐업 | 2,456 | HOLD(Candidate 보존) |
| 행정(취소) | 1,433 | HOLD |
| 취하 | 990 | HOLD |
| 취소 | 4 | HOLD |

## 4. 스키마/코드 재확인

| 항목 | 결과 |
| --- | --- |
| `product_masters.barcode` | varchar(14), **NOT NULL, UNIQUE** → 내부 코드 필수 |
| `product_masters.mfds_product_id` | varchar(100), **UNIQUE** |
| `regulatory_type` | free varchar(50), 관례값 `QUASI_DRUG` 수용 |
| `drug_category` | union 에 `quasi_drug` 존재(유효) |
| ProductIdentifier type | `INTERNAL_O4O` · `MFDS_CODE` 존재. 유니크는 **per-master**(product_master_id, type, normalized_value) — 전역 아님 |
| ProductIdentifier status | `system_generated` · `imported` 존재 |
| **generateInternalBarcode(seed)** | `200+hash6+**Date.now()%1000**+check` → **비결정적**(timestamp) + 문서상 MFDS 품목 사용 금지 → **재사용 불가, 신규 결정적 규칙 설계(§5)** |
| ProductDrugExtension | 자동 생성 경로 없음(cascade/subscriber 無). 명시 코드로만 생성 → 본 승격에서 **생성 0** |

## 5. 내부 바코드 규칙 (결정적, 검증됨)

```text
payload(12) = "200" + ITEM_SEQ(9자리 숫자)
barcode(13) = payload + EAN-13 check digit
- prefix 200 = GS1 in-store 예약대역(내부용)
- ITEM_SEQ 가 유일·9자리이므로 barcode 는 ITEM_SEQ 에 대해 injective → 중복 구조적 0
- 같은 ITEM_SEQ → 항상 같은 barcode (재실행/멱등 안전, timestamp 없음)
```

**collision 검증(22,953 전량 offline 계산):**

| 검사 | 결과 |
| --- | ---: |
| 생성 barcode distinct | **22,953** (= ITEM_SEQ, 1:1) |
| intra-batch 중복 | **0** |
| 기존 `200%` barcode(2건: 2003871659115/580) 충돌 | **0** (payload 중간 9자리가 ITEM_SEQ 범위 밖) |
| 비-200 기존 barcode 충돌 | **0** (구조상 불가) |

## 6. 승격 매핑

**ProductMaster:**

| 필드 | 값 |
| --- | --- |
| `barcode` | `200`+ITEM_SEQ+check (§5) |
| `regulatory_type` | `QUASI_DRUG` |
| `drug_category` | `quasi_drug` |
| `regulatory_name` / `name` | candidate_name(=ITEM_NAME, ≤255) |
| `manufacturer_name` | candidate_manufacturer(=ENTP_NAME) |
| `mfds_permit_number` | raw_payload.source.ITEM_NO 또는 null |
| `mfds_product_id` | `MFDS:QUASI_DRUG:{ITEM_SEQ}` |
| `specification` | null (SKU 규격 없음) |
| `is_mfds_verified` / `mfds_synced_at` | true / 실행일 |
| `tags` | `['import:mfds-quasi-drug-permit','drug_category:quasi_drug']` |

**ProductIdentifier (2건/master):**

| type | value | primary | status |
| --- | --- | --- | --- |
| `INTERNAL_O4O` | barcode | true | `system_generated` |
| `MFDS_CODE` | ITEM_SEQ | false | `imported` |

## 7. dry-run 지표

| 지표 | 값 |
| --- | ---: |
| total candidates | 22,953 |
| distinct ITEM_SEQ | 22,953 |
| ITEM_SEQ / ITEM_NAME / ENTP_NAME missing | 0 / 0 / 0 |
| 정상 | 18,070 |
| 정상 & 노이즈(수출/군납/비매/수출명) | 922 |
| **eligible (정상 & clean)** | **17,148** |
| excluded 취소류(폐업/행정/취하/취소) | 4,883 |
| excluded 노이즈(정상이나 수출/군납) | 922 |
| **wouldCreateProductMaster** | **17,148** |
| wouldCreateIdentifier INTERNAL_O4O(primary) | 17,148 |
| wouldCreateIdentifier MFDS_CODE | 17,148 |
| barcode collision in batch | **0** |
| barcode collision with existing master | **0** |
| mfds_product_id collision | **0** (기존 quasi master 0) |
| existing MFDS_CODE overlap | **1** (per-master 유니크 → DB 충돌 아님, §9 caveat) |
| wouldCreateProductDrugExtension | **0** |

## 8. 정상/취소 정책 (확정)

```text
CANCEL_CODE_NAME='정상' AND name 노이즈 없음(수출/군납/비매/수출명) → 승격(17,148)
정상이나 수출/군납/비매 노이즈 → HOLD(922, 국내 매장 기본상품 부적합)
폐업/행정(취소)/취하/취소 → HOLD(4,883, Candidate 보존, Core 오염 방지)
```
> 의약품 seed 교훈과 동일: 취소/노이즈 row 는 삭제하지 않고 Candidate 로 보존, ProductMaster 승격만 제외.

## 9. Caveat — MFDS_CODE 공유 네임스페이스

기존 identifier 중 MFDS_CODE 값이 quasi ITEM_SEQ 와 겹치는 건 **1건**. ProductIdentifier 유니크가 **per-master** 이므로 신규 quasi master 에 MFDS_CODE 를 붙이는 것은 DB 충돌이 아니다(정상 생성). 단 향후 candidate→master **자동 매칭** 시 MFDS_CODE 만으로 매칭하면 의약외품↔의약품 오매칭 위험 → 매칭은 `regulatory_type`/`sourceKind` 로 스코프해야 한다(apply 자체는 매칭 없음, 무관).

## 10. 샘플 preview (30건)

| # | ITEM_SEQ | 제품명 | 업체 | 상태 | internalBarcode | mfdsProductId | decision |
|--:|---|---|---|---|---|---|---|
| 1 | 197100246 | 반창고(수출용) | 신신제약(주) | 정상 | 2001971002466 | MFDS:QUASI_DRUG:197100246 | HOLD(노이즈) |
| 2 | 197100247 | 대일밴드 | 대일화학공업(주) | 정상 | 2001971002473 | MFDS:QUASI_DRUG:197100247 | promote |
| 3 | 197100248 | 성십자 탈지면 | 성십자(주) | 정상 | 2001971002480 | MFDS:QUASI_DRUG:197100248 | promote |
| 4 | 197200373 | 신신사리반(수출명:별첨) | 신신제약(주) | 정상 | 2001972003738 | MFDS:QUASI_DRUG:197200373 | HOLD(노이즈) |
| 5 | 197400536 | 신신밴드(수출명:별첨),군납용:반… | 신신제약(주) | 정상 | 2001974005365 | MFDS:QUASI_DRUG:197400536 | HOLD(노이즈) |
| 6 | 197400537 | 장성탈지면 | (주)장성 | 정상 | 2001974005372 | MFDS:QUASI_DRUG:197400537 | promote |
| 7 | 197400538 | 장성붕대1호 | (주)장성 | 정상 | 2001974005389 | MFDS:QUASI_DRUG:197400538 | promote |
| 8 | 197400539 | 장성붕대2호 | (주)장성 | 정상 | 2001974005396 | MFDS:QUASI_DRUG:197400539 | promote |
| 9 | 197400540 | 장성붕대3호 | (주)장성 | 정상 | 2001974005402 | MFDS:QUASI_DRUG:197400540 | promote |
| 10 | 197400541 | 장성가아제1호 | (주)장성 | 정상 | 2001974005419 | MFDS:QUASI_DRUG:197400541 | promote |
| 11 | 197400542 | 장성가아제2호 | (주)장성 | 정상 | 2001974005426 | MFDS:QUASI_DRUG:197400542 | promote |
| 12 | 197400543 | 장성가아제4호 | (주)장성 | 정상 | 2001974005433 | MFDS:QUASI_DRUG:197400543 | promote |
| 13 | 197400547 | 성십자 거즈1호 | 성십자(주) | 정상 | 2001974005471 | MFDS:QUASI_DRUG:197400547 | promote |
| 14 | 197400548 | 성십자 거즈 2호 | 성십자(주) | 정상 | 2001974005488 | MFDS:QUASI_DRUG:197400548 | promote |
| 15 | 197400549 | 성십자 거즈 4호 | 성십자(주) | 정상 | 2001974005495 | MFDS:QUASI_DRUG:197400549 | promote |
| 16 | 197400550 | 성십자 붕대1호 | 성십자(주) | 정상 | 2001974005501 | MFDS:QUASI_DRUG:197400550 | promote |
| 17 | 197400551 | 성십자 붕대2호 | 성십자(주) | 정상 | 2001974005518 | MFDS:QUASI_DRUG:197400551 | promote |
| 18 | 197400552 | 성십자 붕대3호 | 성십자(주) | 정상 | 2001974005525 | MFDS:QUASI_DRUG:197400552 | promote |
| 19 | 197400553 | 성진탈지면 | 성진양행 | 정상 | 2001974005532 | MFDS:QUASI_DRUG:197400553 | promote |
| 20 | 197400554 | 성진가아제3호 | 성진양행 | 정상 | 2001974005549 | MFDS:QUASI_DRUG:197400554 | promote |
| 21 | 197400555 | 성진붕대3호 | 성진양행 | 정상 | 2001974005556 | MFDS:QUASI_DRUG:197400555 | promote |
| 22 | 197500647 | 부직반창고 | 대일화학공업(주) | 정상 | 2001975006477 | MFDS:QUASI_DRUG:197500647 | promote |
| 23 | 196000044 | 비타민은단 | 고려은단(주) | 폐업 | 2001960000442 | MFDS:QUASI_DRUG:196000044 | HOLD(취소류) |
| 24 | 196100052 | 고려삼인단 | 고려은단(주) | 폐업 | 2001961000526 | MFDS:QUASI_DRUG:196100052 | HOLD(취소류) |
| 25 | 196600091 | 은단 | 고려은단(주) | 폐업 | 2001966000910 | MFDS:QUASI_DRUG:196600091 | HOLD(취소류) |
| 26 | 196600092 | 정력은단 | 고려은단(주) | 폐업 | 2001966000927 | MFDS:QUASI_DRUG:196600092 | HOLD(취소류) |
| 27 | 197700515 | 비씨단 | 고려은단(주) | 폐업 | 2001977005157 | MFDS:QUASI_DRUG:197700515 | HOLD(취소류) |
| 28 | 197800538 | 청량인단 | 고려은단(주) | 폐업 | 2001978005385 | MFDS:QUASI_DRUG:197800538 | HOLD(취소류) |
| 29 | 197900527 | 녹단 | 고려은단(주) | 폐업 | 2001979005278 | MFDS:QUASI_DRUG:197900527 | HOLD(취소류) |
| 30 | 197900532 | 대명스타키넷트 | 대명실업 | 폐업 | 2001979005322 | MFDS:QUASI_DRUG:197900532 | HOLD(취소류) |

## 11. 판정 = GO

| GO 기준 | 충족 |
| --- | --- |
| ITEM_SEQ 유일성 | ✅ 22,953/22,953 |
| 정상 후보 필수 필드 충분 | ✅ 결측 0 |
| internal barcode 중복 0 | ✅ (구조적 injective) |
| 기존 barcode 충돌 0 | ✅ |
| mfds_product_id 충돌 0 | ✅ |
| MFDS_CODE 충돌 | ✅ per-master 유니크로 해소(caveat 문서화) |
| 매핑 명확 | ✅ §6 |

## 12. 다음 WO

```text
WO-O4O-QUASI-DRUG-PRODUCTMASTER-PROMOTION-APPLY-V1
```
- 전제: 사용자 "의약외품 승격 apply 승인" + 사전 백업
- 허용 write: product_masters(17,148) + product_identifiers(34,296) only
- 금지: ProductDrugExtension/SPD/Image/Offer/Listing 생성, Candidate 상태변경(선택), 설명서
- 채널: Cloud Run Job(대량) 또는 배치 INSERT(멱등, deterministic barcode 로 재실행 안전)

## 13. 완료 기준 대조 (WO §12)

| 기준 | 충족 |
| --- | --- |
| DB write 0 | ✅ §1 |
| 최신 candidate/master/identifier count | ✅ §3·§7 |
| 승격 매핑 확정 | ✅ §6 |
| deterministic internal barcode 규칙 검증 | ✅ §5 (0 collision) |
| dry-run wouldCreate 수치 | ✅ §7 |
| 충돌/결측/상태 분포 | ✅ §3·§7 |
| 30건 preview | ✅ §10 |
| GO/HOLD/NO-GO 판정 | ✅ GO |
| CHECK 커밋·푸시 | ✅ 본 문서 |

---

**최종: 의약외품 22,953 은 ITEM_SEQ(전량 9자리 유일)를 grain 으로, deterministic 내부 바코드(200+ITEM_SEQ+check)로 ProductMaster 승격 가능(GO). collision(batch/기존/mfds_product_id) 전부 0 검증. eligible=17,148(정상 & 노이즈 제외), 취소류·노이즈 5,805 는 HOLD(Candidate 보존). ProductDrugExtension·SPD·Image·설명서 생성 0. 실제 승격은 APPLY WO 에서 사용자 승인 후. DB write 0.**
