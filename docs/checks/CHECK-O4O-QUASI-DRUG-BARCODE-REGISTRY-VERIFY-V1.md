# CHECK-O4O-QUASI-DRUG-BARCODE-REGISTRY-VERIFY-V1

> 작업 성격: **read-only 원천 verify + Gate B 최종 판정.** DB write 0, ProductMaster/ProductIdentifier 생성 0, raw 대량 수집 0, secret 0, 코드 변경 0. 문서만.
> 작성일: 2026-07-04
> 트랙: **의약외품 전용** (건강기능식품/의료기기/약가마스터 등 타 트랙과 분리)
> 선행: `WO-O4O-QUASI-DRUG-PUBLIC-SKU-BARCODE-SOURCE-AUDIT-V1`(§3 유일 해제 후보 = 2024 의약외품 바코드 등록)

---

## 0. 목적

선행 audit 이 유일한 Gate B 잠금 해제 후보로 지목한 **2024 "의약외품 바코드 등록"(의약품안전나라)** 이 실제로 **공개 API/파일로 존재하고, `ITEM_SEQ` 로 조인 가능하며, barcode 형식·커버리지가 다소비 품목 부분 승격에 충분한지** read-only 로 검증한다. 결과에 따라 Gate B HOLD 를 확정하거나(대부분 시나리오) 부분 승격 dry-run 으로 넘긴다.

---

## 1. 5개 verify 질문 — 판정

| # | 질문 | 판정 | 근거 |
|---|---|---|---|
| 1 | 2024 의약외품 바코드 등록 데이터가 **공개 API/파일**로 제공되는가? | **아니오 (미확인/부재)** | data.go.kr·data.mfds.go.kr·의약품안전나라(nedrug) 전반에서 **의약외품 전용 barcode/표준코드/낱알식별 공개 데이터셋 미발견**. 확인된 barcode·표준코드·낱알 데이터셋은 전부 **의약품/식품/의료기기** (§2). 2024 등록은 **업체 직접 등록 + 소비자 mobile 간편검색**(안전정보 접근성 개선) 채널이지 bulk export API 아님 |
| 2 | `ITEM_SEQ`(품목기준코드) 조인 키가 있는가? | **불가** | 바코드 값을 담은 의약외품 공개 원천 자체가 없어 조인 대상 부재. 우리 보유 의약외품 허가정보 API(`QdrgPrdtPrmsnInfoService`) 20필드에 barcode/표준코드 없음(기수집 실측) |
| 3 | barcode 형식이 GTIN-13/14 등 check digit 검증 가능한가? | **N/A** | 검증할 barcode 값 원천 부재 |
| 4 | 커버리지(다소비 품목: 마스크·치약·반창고·생리대)는? | **측정 불가** | 자율 등록 + 소비자 검색용이라 공개 데이터로 커버율 산출 불가. 등록 대상(다소비 품목)이 우리 상위 카테고리와 겹치나, **공개 조인 데이터가 없어 활용 불가** |
| 5 | 공개가 아니고 내부 등록/소비자검색 전용이면 Gate B HOLD 확정할 것인가? | **예 — HOLD 확정** | 조건 성립(내부 등록 + mobile 간편검색 전용, bulk 공개 API 아님) → Gate B HOLD 확정 |

---

## 2. 확인된 barcode/표준코드/낱알 공개 데이터셋 (전부 非의약외품)

| 데이터셋 | ID | 대상 | 키 | 의약외품 |
|---|---|---|---|---|
| 의약품 낱알식별 정보 | data.go.kr `15057639` | 의약품 정제 | 품목기준코드(의약품) | ❌ |
| 묶음의약품정보서비스 | data.go.kr `15063908` | 의약품 | 대표 품목기준코드(의약품) | ❌ |
| 의약품 안전사용 정보 | (MFDS) | 의약품 | 품목일련번호+표준코드(의약품) | ❌ |
| 유통바코드 | data.go.kr `15064775` | 식품 | 품목보고번호(식품) | ❌ (2018 중단) |
| 바코드연계제품정보 | data.go.kr `15060549` | 식품 | 품목보고번호(식품) | ❌ (2018 중단) |
| 의료기기 표준코드(UDI) | data.go.kr `15073879` 등 | 의료기기 | UDI-DI | ❌ (별도 트랙) |

> `data.mfds.go.kr` 필터에 "의약외품" 데이터셋이 소수(약 5종) 존재하나, SPA 검색으로 개별 서비스명을 열거하지 못했다(도구 한계). **단, barcode/표준코드/낱알 계열로 확인된 것은 위 6종뿐이며 모두 非의약외품**이고, 의약외품 허가정보 API 에도 barcode 필드가 없으므로 결론은 유지된다. (잔여 확인법: §5)

---

## 3. Gate B 최종 판정

**Gate B = HOLD 확정 (Candidate only, 등급 C).**

| 축 | 상태 |
|---|---|
| 제품명/업체명/ITEM_SEQ | ✅ 보유 (Gate A 22,953 적재 완료) |
| 허가상태 (CANCEL_CODE_NAME) | ✅ 보유 (HFF 와 차별점 — 상태는 blocker 아님) |
| **barcode/GTIN/표준코드** | ❌ **공개 원천 부재 (verify 결과 확정)** |
| **포장단위/SKU grain** | ❌ 부재 |
| check digit 검증 | ❌ N/A |

**의약외품 seed 는 여기서 Gate A 완료 + Gate B HOLD 확정으로 닫는다.** ProductMaster 승격에 필요한 유통 식별자(barcode/SKU)를 조인 가능하게 제공하는 공개 원천이 없으며, 유일 후보(2024 의약외품 바코드 등록)는 소비자 검색·내부 등록 전용이라 bulk 승격 근거가 되지 못한다.

---

## 4. 그래서 다음은 (선택적, 축소)

Gate B 가 닫혔으므로 승격 경로는 종료. 남은 **선택적** 작업만:

1. **(선택) candidate `derivedOfficialText` 스테이징** — 준비된 파서(`quasi-drug-permit-official-text.parser.ts`, test 9 PASS)로 EE/UD/NB 평문을 candidate `raw_payload.derivedOfficialText`(efficacy/dosage/caution)로 보존. master 불필요, 운영자 검토·검색용. apply 시 승인 필요. (SharedProductDescription 아님)
2. **(대기) 장래 재개 트리거** — 식약처가 의약외품 바코드/표준코드를 `ITEM_SEQ` 조인 공개 API/파일로 배포하면, 그때 §5 방법으로 재확인 후 다소비 품목 부분 승격 dry-run 재개.

그 외 Gate B/C 관련 작업은 위 트리거 전까지 진행하지 않는다.

---

## 5. 잔여 확인법 (도구 한계 보완 — 필요 시 사람/브라우저)

- `data.mfds.go.kr` → 공공데이터 → 분류 "의약외품" 필터로 5종 데이터셋 서비스명·필드 직접 확인 (barcode/표준코드 필드 유무 최종 확인).
- 의약품안전나라(nedrug) → 의약외품 검색 → 상세에 barcode/표준코드 노출 여부 관측.
- 위에서 barcode + `ITEM_SEQ`(또는 품목기준코드) 동시 제공이 확인되면 본 판정을 갱신.

---

## 6. read-only / 준수 확인

| 항목 | 결과 |
|---|---|
| DB write / apply | 0 |
| ProductMaster / ProductIdentifier 생성 | 0 |
| raw 대량 수집 | 0 (공개 데이터셋 메타만) |
| secret / serviceKey 기록 | 0 |
| 코드 변경 | 0 |
| 범위 확장(건강기능식품/의료기기) | 0 |
| 병렬 세션 파일 수정 | 0 |

이번 변경 = 본 CHECK 문서 1건.

---

## 7. 참고 원천 (공개)

- 식품의약품안전처_의약품 낱알식별 정보 (data.go.kr 15057639) — 의약품
- 식품의약품안전처_묶음의약품정보서비스 (data.go.kr 15063908) — 의약품
- 식품의약품안전처_유통바코드 (data.go.kr 15064775) — 식품, 2018 중단
- 식품의약품안전처_바코드연계제품정보 (data.go.kr 15060549) — 식품, 2018 중단
- 식의약 데이터 포털 (data.mfds.go.kr) — 의약외품 barcode/표준코드 공개 데이터셋 미확인
- 의약품안전나라 (nedrug.mfds.go.kr) — 의약외품 바코드 = 업체 등록 + 소비자 mobile 간편검색(2024-10), bulk 공개 API 미확인

---

**최종: 의약외품 바코드 등록(2024)은 소비자 검색·업체 내부 등록 채널로, `ITEM_SEQ` 조인 가능한 공개 barcode/표준코드 API/파일로 제공되지 않는다. Gate B = HOLD 확정. 의약외품 seed 는 Gate A(ProductCandidate 22,953) 완료 + Gate B(ProductMaster 승격) HOLD 로 닫으며, 이후는 선택적 `derivedOfficialText` 스테이징만 검토한다.**
