# CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1

## 1. 작업 일시

2026-07-07

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1`

이번 CHECK는 **운영 DB read-only 조사 결과 문서**다. 설명서 본문 작성·DB write·registry 상태 변경은 하지 않았다.

## 2. 사용한 기준 문서

확인:

```text
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-NONORAL-END-TO-END-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-V1.md
```

현재 checkout 누락(중단 사유 아님, 기록만):

```text
docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-REGISTRY-POPULATE-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-ROUTE-TEMPLATE-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-HIGH-RISK-GROUP-CURATION-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-DICTIONARY-SEED-V1.md
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md
```

## 3. DB 접속 방식과 read-only 확인

- 접속: `cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db` (127.0.0.1:15432) + `psql` user `o4o_api`, db `o4o_platform`.
- 인증: 프록시는 gcloud ADC, DB 비밀번호는 Cloud Run `o4o-core-api` env에서 읽어 세션 환경변수로만 사용(디스크 미저장).
- 실행: **SELECT 전용**. `INSERT/UPDATE/DELETE/DDL` 없음. 한글 정규식은 UTF-8 `.sql` 파일 + `psql -f`로 실행(인라인 한글은 CP949로 깨짐).

## 4. OTC ProductMaster 전체 count

| 구분 | 수 |
|---|---:|
| product_masters 전체 drug_category=otc | **57,572** |
| regulatory_type=DRUG 전체 | 177,413 |
| (참고) rx | 119,548 |
| (참고) quasi_drug | 17,148 |

`product_drug_extensions.drug_category='otc'` = 57,572 (1:1).

## 5. 비경구 후보 추출 조건 (중요 — 데이터 제약)

OTC 확장 테이블(`product_drug_extensions`)의 **임상/제형 필드는 OTC 전량 NULL**이다.

| 필드 | OTC 채움 |
|---|---|
| dosage_form | 0 (전량 NULL) |
| strength | 0 |
| ingredient_summary | 0 |
| active_ingredients | 0 |
| efficacy_text / dosage_text / caution_text | 0 |
| **atc_code** | **57,480 / 57,572 (99.8%)** |

따라서 route는 다음으로 파생:

- **1차 신호 = `product_masters.name` 제형 키워드** (실제 투여형을 직접 명시)
- **2차 교차검증 = `atc_code`**
- 함량/포장 = `product_masters.specification` (형식 `함량 / 개수 / 단위 / 포장`, 첫 토큰=함량)

### 5.1 핵심 검증: name 분류가 ATC보다 route에 정확

ATC는 **치료군**이라 같은 적응증의 경구제를 포함한다. name-route × ATC-signal 교차검증 결과:

- ATC `S01`(안과) 1,649 중 246건은 name상 비-점안 → 샘플 확인 시 **빌베리/빌베리건조엑스 연질캡슐(눈영양 경구제), 고본환정환(경구 환), 세안액**. 점안제 아님.
- ATC `R01`(비강) 누락 737건 → 대부분 **경구 비충혈제(정제)**. R01B(전신) 포함.
- ATC `C05`(치질/정맥) 예: `프라본정`(C05CA53) = **경구정**.

→ name 키워드 분류가 이 ATC 경구 오탐을 올바르게 배제한다. 본 조사는 name-route를 채택.

## 6. route별 ProductMaster 수

| route | ProductMaster | e약은요 원문(SPD content) 보유 | 원문 커버리지 |
|---|---:|---:|---:|
| topical (외용) | 2,710 | 1,562 | 58% |
| patch (파스/첩부) | 2,283 | 1,497 | 66% |
| ophthalmic (점안) | 1,392 | 913 | 66% |
| oral_local (구강국소) | 219 | 121 | 55% |
| nasal (점비/비강) | 177 | 122 | 69% |
| vaginal (질정) | 125 | 65 | 52% |
| rectal (좌제) | 46 | 28 | 61% |
| **비경구 합계** | **6,952** | **4,308** | **62%** |
| otic (점이) — route 범위 외 | 0 (name) / 14 (ATC) | — | — |

> **2단계 최대 호재**: 비경구의 **62%가 e약은요 원문(`shared_product_descriptions.content`) 보유**. 병렬 경구 batch-02와 동일하게 원문 grounding으로 초안 작성 가능. 원문 없는 38%는 hold_for_source.

## 7. route별 group 후보 수

group_key 축(성분/성분군 + 함량 + 제형 + route)의 프록시로 ATC7·(ATC7+함량) 사용:

| route | masters | 거친 그룹(ATC7) | 세밀 그룹(ATC7+함량) |
|---|---:|---:|---:|
| topical | 2,710 | 89 | 537 |
| patch | 2,283 | 26 | 315 |
| ophthalmic | 1,392 | 14 | 98 |
| oral_local | 219 | 19 | 55 |
| nasal | 177 | 11 | 48 |
| vaginal | 125 | 12 | 25 |
| rectal | 46 | 10 | 10 |

주의: 세밀 그룹은 spec 함량 토큰에 포장 노이즈가 섞여 **과분할** 경향(경구 조사와 동일 함정). 실제 설명서 그룹은 두 값 사이(예: 점안 14~98)로 수렴.

## 8. 포장 용량 / 성분 함량 분리 기준

- `specification` = `함량 / 개수 / 단위 / 포장` (예: `2.42그램 / 300 / 포 / 포`).
- group_key 함량 = 첫 토큰(`함량`)만. `개수/단위/포장`(300/포/PTP/병/매)은 **포장 정보이므로 제외**.
- 점안/외용은 함량 토큰이 **병 용량·농도 혼재** 위험 → 2단계에서 원문 대조 필수.

## 9. S01XA20 인공눈물 과병합 방지 적용 결과

점안 1,392의 ATC7 분포: **S01XA20=897(64%)** 로 인공눈물류에 집중 → 과병합 최대 위험.

name 기준 성분군 분리 실측:

| 성분군 | 수 | 처리 |
|---|---:|---|
| CMC(카르복시메틸셀룰로오스) | 441 | 별도 |
| trehalose(트레할로스) | 122 | 별도 |
| povidone(포비돈) | 25 | 별도 |
| hyaluronate(name 명시) | 6 | 별도 (실제 다수는 브랜드명만—원문 필요) |
| anti_allergy(케토티펜·크로몰린 등) | 126 | 별도, hold_for_pharmacist |
| decongestant(나파졸린 등) | 9 | 별도, hold_for_pharmacist |
| **other(브랜드명만, 성분 미표기)** | **640** | **hold_for_source** — 성분이 name에 없음(예: 비바리스·티어뮨), 원문 대조 필요. PDRN(폴리데옥시리보뉴클레오티드나트륨) 계열 다수 포함 |

→ 인공눈물은 **같은 ATC(S01XA20)로 병합 금지**, 성분군별 분리 원칙 확인. 성분이 name에 없는 640건은 원문(SPD content) 있는 것부터 성분 확정.

## 10. draft_ready 그룹 목록 (2단계 즉시 작성 후보)

> 작업상 분류. DB 상태값 아님(§9 WO 원칙). 근거=원문 보유 + 저위험 + 성분군 명확.

| batch | 대상 | 근거 |
|---|---|---|
| BATCH-EYE-DRAFT | 인공눈물 성분군(CMC 441 / trehalose 122 / povidone 25 / hyaluronate / PDRN) 중 **원문 보유분** | route 문구 안정, seed 5건 이미 작성(CHECK-...-BATCH-EYE-DRAFT-V1), 원문 66% |
| BATCH-TOPICAL-LOW-RISK-DRAFT | emollient(D02, 127) / 소독·antiseptic(D08, 104) / 단순 항진균(D01 일부, 622 중 저위험) | 저위험·소비자 설명수요, 원문 58% |

## 11. hold / exclude 그룹 목록과 사유

| 작업상 분류 | 대상 | 수(근사) | 사유 |
|---|---|---:|---|
| hold_for_source | 원문(SPD content) 없는 비경구 | ~2,644 (38%) | 성분·함량·용법 근거 부족. 특히 점안 'other' 640(브랜드명만) |
| hold_for_pharmacist | 외용 스테로이드(D07) | 558 | 장기·넓은부위·소아 주의 |
| hold_for_pharmacist | 외용 항생/항진균(D06) | 506 | 내성·감작 |
| hold_for_pharmacist | 국소마취(N01BB, 리도카인 등) | 234 | 용량·점막 흡수 |
| hold_for_pharmacist | 점안 항알레르기·충혈제거 | 135 | 연령·기간·렌즈·병용 |
| hold_for_pharmacist | 점비 혈관수축제(R01A) | 177 | 연속사용 제한·반동성 비충혈·심혈관 |
| hold_for_pharmacist | 질정/질좌제(G01/G02) | 125 | 민감부위·삽입법·임부 |
| hold_for_pharmacist | 좌제(rectal) | 46 | 경구금지·삽입법 |
| hold_for_source/pharmacist | 파스 NSAID(M02AA/M02AC) | ~1,900 | 광과민·NSAID중복·부착시간(원문 66%는 source 확보) |
| (분리 주의) 금연 패치 nicotine(N07BA01) | patch 내 | 90 | 니코틴, NSAID 파스와 별 batch |
| exclude_from_otc_description | 없음(실질) | 0 | otic는 route 범위 외로 분리, 세안액은 점안과 구분 필요 |

## 12. 2단계 batch 우선순위 (실측 반영)

| 순서 | batch | masters | 원문 | 근거 |
|---:|---|---:|---:|---|
| 1 | BATCH-EYE-DRAFT | 1,392 | 66% | route 문구 안정, seed 완료, 인공눈물 성분군 분리 확정 |
| 2 | BATCH-TOPICAL-LOW-RISK-DRAFT | ~350–950 | 58% | emollient/소독/단순항진균부터 |
| 3 | BATCH-PATCH-DRAFT | 2,283 | 66% | 수요 큼, NSAID 주의(M02AA/AC), 금연패치 분리 |
| 4 | BATCH-NASAL-DRAFT | 177 | 69% | 전량 R01A 국소, 연속사용 제한 |
| 5 | BATCH-ORAL-LOCAL-DRAFT | 219 | 55% | 트로키/가글, route 구분 |
| 6 | BATCH-RECTAL-VAGINAL-MANUAL-DRAFT | 171 | ~56% | 경구금지·민감부위·약사 검토 |

## 13. 금지사항 준수 확인

| 항목 | 결과 |
|---|---|
| DB write (INSERT/UPDATE/DELETE/DDL) | 0 (SELECT 전용) |
| 설명서 본문 작성 | 0 |
| `product_candidate_description_drafts` 변경 | 0 |
| `shared_product_descriptions` 변경 | 0 (read-only 조회만) |
| `ProductDrugExtension` 변경 | 0 |
| `ProductMaster`/`ProductCandidate` 상태 변경 | 0 |
| canonical 승격 | 0 |
| registry 상태 직접 변경 | 0 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | 0 |

## 14. 다음 제안

1. **BATCH-EYE-DRAFT 2단계 실행** — 인공눈물 성분군(CMC/trehalose/povidone/hyaluronate/PDRN) 중 원문(SPD content) 보유분을 grounding하여 초안 작성. 기존 seed 5건과 매칭.
2. 점안 'other' 640(브랜드명만)은 원문에서 성분 확정 후 그룹 편입.
3. BATCH-TOPICAL-LOW-RISK 성분군 확정(D02/D08/D01 저위험).
4. 파스는 M02AA/M02AC 성분별 그룹핑 + 금연 니코틴 패치 분리.
5. registry 파일(`O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md`) 복구 후 본 route 그룹 반영.

---

### 부록 A — 완료 보고

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1

결과:
- OTC ProductMaster 총수: 57,572
- 비경구 후보 ProductMaster: 6,952 (원문 보유 4,308 / 62%)
- route별 ProductMaster:
  - EYE(ophthalmic): 1,392 (원문 913)
  - TOPICAL: 2,710 (원문 1,562)
  - PATCH: 2,283 (원문 1,497)
  - NASAL: 177 (원문 122)
  - RECTAL: 46 (원문 28)
  - VAGINAL: 125 (원문 65)
  - ORAL_LOCAL: 219 (원문 121)
- route별 group 후보(ATC7 ~ ATC7+함량):
  - EYE 14~98 / TOPICAL 89~537 / PATCH 26~315 / NASAL 11~48 / RECTAL 10 / VAGINAL 12~25 / ORAL_LOCAL 19~55
- draft_ready: BATCH-EYE(원문 보유 인공눈물 성분군) + BATCH-TOPICAL-LOW-RISK 일부
- hold_for_source: 원문 없는 ~2,644 (점안 브랜드명만 640 포함)
- hold_for_pharmacist: 스테로이드558/항생506/국소마취234/점안항알레르기135/점비177/질125/좌46
- exclude_from_otc_description: 0

금지사항: DB write 0 / 설명서 본문 0 / drafts 0 / SPD 0 / ext 0 / canonical 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md

다음 제안: BATCH-EYE-DRAFT → BATCH-TOPICAL-LOW-RISK-DRAFT → BATCH-PATCH-DRAFT
```
