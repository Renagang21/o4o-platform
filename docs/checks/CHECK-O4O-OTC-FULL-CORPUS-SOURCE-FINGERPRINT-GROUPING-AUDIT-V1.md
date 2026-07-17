# CHECK-O4O-OTC-FULL-CORPUS-SOURCE-FINGERPRINT-GROUPING-AUDIT-V1

> **작업명:** OTC 전수 원문 지문 그룹화 감사 — 자동 처리 가능 범위 산출
> **유형:** read-only 전수조사 — **DB write 0 · draft 0 · canonical 0 · 번역 0 · ProductMaster 연결 0**
> **실측일:** 2026-07-17 (프로덕션 read-only, Cloud SQL Auth Proxy)
> **스크립트:** `apps/api-server/src/scripts/drug-otc-full-corpus-source-fingerprint-audit.ts`
> **데이터:** `apps/api-server/src/scripts/data/otc-full-corpus-fingerprint-{summary,groups,exceptions}-v1.json`

---

## 필수 결론 (WO §13)

| # | 질문 | 답 |
|---|------|-----|
| 1 | 실제 대상 제품 수 | **57,572** (OTC permit-master 전수) · 대표상품(representative) 기준 **14,876** |
| 2 | 원문 확보 제품 수 | **19,385 (33.7%)** — e약은요 공식 원문. 원문 없음 **38,187** |
| 3 | 원문 지문 그룹 총수 | **6,267** 안전 대표단위 (정규화-원문 3,572 그룹 → 성분·함량·제형·경로 안전 분리 후 6,267) |
| 4 | 자동 그룹화 가능 제품 | **17,233** (2건 이상 안전 동일 그룹) + singleton 2,152 = 원문-covered 19,385 전량 |
| 5 | 대표 설명서 N건으로 커버(원문-covered 19,385 기준) | **50% → 1,168그룹 · 70% → 2,353 · 80% → 3,253 · 90% → 4,329.** 상위 100그룹 = 2,831제품(14.6%), 상위 500 = 6,365(32.8%) |
| 6 | 기존 canonical 확장 활용 가능 제품 | **19,385** — 원문-covered 전량이 이미 e약은요 ko canonical 보유(재사용·dedup 대상) |
| 7 | 새 대표 설명서 작성이 필요한 그룹 | 원문-covered에는 **0**(전량 canonical 존재). **실제 공백 = 원문 없음 38,187** + en 미보유(현 en 1,213뿐) |
| 8 | 수동·특수 트랙 잔여 제품 | **38,187**(원문 없음) + **10,850**(Tier4 안전 하위분리 필요) |

> **핵심 재정의:** "~2만 개" 전제는 **대표상품(14,876)** 규모에 가깝다. permit 단위 실측 OTC는 **57,572**다. 그리고 원문(e약은요) 보유 제품은 **19,385(33.7%)뿐**이며 이들은 **이미 canonical이 있다.** 따라서 다음 대량 작업의 병목은 "그룹화"가 아니라 **원문 없는 38,187건의 원문 확보(허가상세 원문 트랙)** 와 **en 번역·품질 dedup(19,385→6,267)** 이다.

---

## 1. 무변경 확인

```text
DB write 0 · draft 0 · canonical 0 · 번역 0 · ProductMaster/식별자 연결 변경 0
접근 = SELECT only (product_masters · product_identifiers · product_candidates · shared_product_descriptions)
Batch 01·02 스크립트·번역 JSON·GUIDE·GLOSSARY 무수정 · path-specific stage만 사용
산출 = 조사 스크립트 + summary/groups/exceptions JSON + 본 CHECK (전체 rows 16.5MB는 미커밋, 스크립트로 재현)
```

## 2. 모집단 (실측)

| 항목 | 수 |
|---|---:|
| 전체 DRUG master | 177,413 |
| **OTC (drug_category='otc')** | **57,572** (전량 status=ACTIVE) |
| rx / quasi / drug_unspecified | 119,548 / 17,148 / 293 |
| OTC 대표상품(distinct representative_product_id) | 14,876 |
| OTC 식별자 보유 | MFDS_CODE 57,572 · KOREA_DRUG_CODE 57,572 · ATC_CODE 57,480 |

- OTC 전량 `specification`(함량/수량/제형/포장) 보유. Rx·원료·취소는 drug_category로 이미 분리(별도 배제 불필요).

## 3. 원문 데이터 (WO §2 우선순위)

- **1순위 e약은요 원문**: `product_candidates(source_label='MFDS_EASY_DRUG_INFO').raw_payload.source` — `efcyQesitm`(효능)·`useMethodQesitm`(용법)·`atpnQesitm`(주의)·`atpnWarnQesitm`(경고)·`intrcQesitm`(상호작용)·`seQesitm`(이상반응)·`depositMethodQesitm`(저장). 매핑 = master→MFDS_CODE(=itemSeq)→candidate.
- 원문 필드 충실도(4,757 e약은요): 효능 99.8% · 용법 99.9% · 주의 99.8% · 이상반응 95.1% · 상호작용 69.5%.
- **원문 확보 = 19,385 master** (distinct 원문 itemSeq **4,747**). 나머지 **38,187**은 e약은요 원문 없음(standard-code 성분/제형 메타데이터만 존재 → 효능/용법 산문 없음).
- 2~5순위(허가 상세·NB_DOC·canonical linked)는 현 DB에 **효능/용법 산문 원문 소스가 e약은요 외 미적재** — 38,187의 원문 확보는 **허가상세 원문 별도 수집 트랙** 필요(본 감사가 확정한 gap). 기존 소비자 설명서 문구로 원문 지문을 만들지 않음(WO §2).

## 4. 지문·안전 시그니처 (WO §3)

- **raw**: 효능+용법+주의+경고+상호작용+이상반응 원문 concat SHA. **normalized**: NFKC·HTML/불릿/제품명·제조사 제거·단위공백 정규화(숫자·연령·기간·경로·제형·성분·금기강도 **불변**).
- **안전 핵심**: dosage_numeric(용법 수치·단위)·age(만N세)·route(경구/외용/점안/점이/질/직장/흡입/구강)·dose_form(정/캡슐/시럽/과립/연고/좌제/질정…)·ingredient(ATC_CODE+함량). 브랜드명은 성분축에서 배제(ATC 사용).
- 실측: itemSeq 4,747 → raw 완전동일 3,619 → 정규화 동일 **3,572**(정규화가 47 raw변형·다품목 동일원문 병합). 안전 분리 후 **대표단위 6,267**.

## 5. Tier 분류 (WO §4)

| Tier | 정의 | 제품 |
|---|---|---:|
| **Tier1** 원문 완전 동일(안전 동일) | raw_full 동일 | **8,343** |
| **Tier2** 정규화 후 동일 | 정규화로 raw변형 병합 | 192 |
| **Tier3** 정보축별 동일(순서차) | efcy/usem/atpn 축 동일 | Tier2에 포함 산정 |
| **Tier4** 부분 차이 → 하위 분리 | 동일 원문이나 함량/제형/경로/연령 상이 | **10,850** (1,360 정규화그룹) |
| **Tier5** 자동화 불가 | 원문 없음 | **38,187** |

- 규모 분포(안전 대표단위 6,267): 1건 2,152 · 2–4건 3,159그룹/8,386제품 · 5–9건 729/4,550 · 10–19건 182/2,376 · 20–49건 33/942 · 50–99건 11/781 · **100+건 1그룹/198제품**(에르도스테인 캡슐).

## 6. 기존 canonical 비교 (WO §6)

- OTC ko canonical **22,259**(mfds_easy_drug 19,131 + nutrition_combo 1,915 + mfds_drug_otc 1,213) · en **1,213**.
- 원문-covered 19,385는 전량 e약은요 ko canonical 보유 → **새 작성 0, 확장·dedup 대상**. 성분 동일하나 원문 갈린 그룹(§5) = ATC+함량+제형+경로 동일 group 중 **925**가 복수 source 지문으로 분리(자동 병합 금지).

## 7. 시나리오 (WO §8, DB write 없이 계산)

| 시나리오 | 자동 처리 제품 | 대표 설명서 | 전체(57,572) 대비 |
|---|---:|---:|---:|
| **A 엄격**(Tier1) | 8,343 | 4,115 | 14.5% |
| **B 반자동**(Tier1+2+검토3) | 8,535 | 4,115 | 14.8% |
| **C 최대**(Tier4 안전 분리 포함) | 19,385 | 6,267 | 33.7% (원문 확보 한도) · 수동분리 10,850 · 별도트랙 38,187 |

## 8. 정확성 표본 감사 (WO §9)

상위 안전 그룹 원문 직접 열람 — 모두 **동일 성분·제형 제네릭 정상 그룹화** 확인:

```text
198건  에르도스테인 캡슐 (원문 49종 정규화 병합)  — 브랜드만 상이, 효능/용법 동일
 99건  트리메부틴말레산염 정
 96건  아세틸시스테인 캡슐 200mg
 95건  아스피린 장용정
 69건  아세틸시스테인 캡슐
```

- 정규화가 브랜드명 차이를 병합하고, 안전 시그니처(ATC+함량+제형)가 함량·제형 차이를 분리함을 확인. 성분 동일·원문 갈림(925)은 자동 병합 안 함(경계 우선). 의미 있는 오병합 미발견.

## 9. 금지·병렬 보호 (WO §10·§11)

- 해시 동일만으로 공유 확정 안 함(안전 시그니처 필수) · 성분명만으로 확정 안 함(원문 지문 별도) · 숫자/연령/기간/금기 정규화 안 함 · 경구↔비경구·정↔질정·단일↔복합·OTC↔Rx 통합 안 함.
- Batch 01·02 산출물·GUIDE·GLOSSARY·기존 canonical 무수정. 조사 전용 스크립트·결과 파일만 생성, path-specific commit.

## 10. 다음 대량 작업 단위 제안

1. **원문 없음 38,187 → 허가상세 원문 수집 트랙**(현 최대 병목).
2. **원문-covered dedup**: 19,385 → **6,267 대표 설명서**로 재구성(중복 canonical 정리).
3. **en 번역**: 커버리지 큰 상위 지문 그룹 순(상위 100그룹 = 2,831제품 = 원문-covered 14.6%).
4. 작업 단위를 "10개 그룹"이 아니라 **커버리지 상위 원문 지문 그룹 묶음**(예: top 50그룹 = 2,016제품)으로 전환.

## 11. 재현·산출물

- 전체 rows(57,572, ~16.5MB)는 미커밋 — `OTC_ROWS_OUT=<path>` 로 재생성 가능. 커밋 = summary + groups(top 500) + exceptions + 본 CHECK.
- 커밋: 스크립트 + data 3종 + CHECK. 배포 없음. DB write 0.
