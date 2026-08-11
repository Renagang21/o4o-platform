# CHECK-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1

| 항목 | 값 |
|------|-----|
| WO | `WO-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1` |
| 판정 | **PASS** — 모집단 33,106 전량 한국어 설명서 생산 완료, 미생성 0, 자동 검증 위반 0 |
| 검증일 | 2026-08-11 |
| 선행 | `WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1` (`74657c931`) |
| 기준문서 | [O4O-COSMETICS-PRODUCT-GUIDE-PRODUCTION-STANDARD-V0](../cosmetics/O4O-COSMETICS-PRODUCT-GUIDE-PRODUCTION-STANDARD-V0.md) |
| 산출물 | `tmp/cosmetics-guide-production/` ([README](../../tmp/cosmetics-guide-production/README.md)) |
| 운영 DB write | **0건** (WO §11) |
| 영어 설명서 | **0건** (WO §7 — 이번 WO 범위 아님) |

---

## 1. 전체 수치 (WO §15)

| 항목 | 수 |
|------|---:|
| 입력 후보 | 33,106 |
| KO 설명서 생산 완료 | **33,106** |
| 미생성 | **0** |
| 필수 6항목 완전 충족 (`COMPLETE`) | 20,949 (63.3%) |
| 부분 충족 (`PARTIAL`) | 12,157 (36.7%) |
| 문제 큐 | 21,115 |
| 기능성 정보 사용 | 4,259 (`RETAIL_FUNCTIONAL_MATCHED` 전량) |
| 시스템 실패 | 0 |
| 자동 검증 위반 | 0 |
| census 단계 사람 검수 큐 (이월) | 872 (이번 WO 에서 추가 해소하지 않음 — WO §2) |

**부분 충족 사유** — `mainFeatures` 12,076 / `usage` 519 / `productType` 42.
`PARTIAL` 은 실패가 아니라 **판매명만으로 사실값이 안 나온 상태**다. 없는 정보를 추론해 채우지 않았다(WO §4).

## 2. 배치별 (WO §3 · §15)

| 배치 | 입력 | 생성 | COMPLETE | PARTIAL | 문제 | 시스템 실패 | 검증 위반 |
|------|-----:|-----:|---------:|--------:|-----:|-----------:|----------:|
| batch-01 | 10,000 | 10,000 | 6,982 | 3,018 | 4,765 | 0 | 0 |
| batch-02 | 10,000 | 10,000 | 6,328 | 3,672 | 7,371 | 0 | 0 |
| batch-03 | 10,000 | 10,000 | 6,492 | 3,508 | 5,541 | 0 | 0 |
| batch-04 | 3,106 | 3,106 | 1,147 | 1,959 | 3,438 | 0 | 0 |
| **계** | **33,106** | **33,106** | **20,949** | **12,157** | **21,115** | **0** | **0** |

배치 간 중단·중간 승인 없이 생산 → 자동 검증 → 문제 큐 적재를 연속 수행했다(WO §3).

## 3. 문제 유형별 (WO §15)

| 축 | 유형 | 수 | 의미 |
|----|------|---:|------|
| source | `NO_OBSERVED_FEATURE` | 12,076 | 판매명·분류 외에 사실로 확인된 특징이 없다. **상세 페이지 수집 없이는 줄지 않는다** |
| productType | `TYPE_NAME_MISMATCH` | 8,270 | 카테고리 유형과 상품명 핵심어가 어긋난다. census 유형을 유지하고 큐로만 남겼다 (규칙 T6) |
| productType | `PRODUCT_TYPE_AXIS_NOT_FORM` | 67 | 판매 마디가 제형이 아닌 축(용도·대상)이다 (규칙 T3) |
| productType | `PRODUCT_TYPE_UNDETERMINED` | 26 | 유형 미확정 — 추정하지 않고 비웠다 |
| productType | `TYPE_NAME_CONTRADICTION` | 16 | `헤어컬러/펌` 병합 마디의 펌 제품에 염모제가 붙었다 (규칙 T7) |
| merge/bundle | `NON_COSMETIC_SUSPECT` | 410 | 화장품이 아닌 품목 혼입 의심 (규칙 T5) |
| identity | `NAME_TOO_SHORT` | 193 | 상품명이 식별에 부족 |
| identity | `NAME_EQUALS_TYPE` | 57 | 상품명이 유형어와 같아 개체 식별 불가 |

축 합계 — source 12,076 / productType 8,379 / merge·bundle 410 / identity 250.
어느 항목도 생산을 중단시키지 않았다(WO §9). 큐는 전량 1차 생산 이후 일괄 처리 대상이다.

## 4. 육안 검수 (WO §14)

계통표본 `index = floor(k × 33,106 / 100)` 로 **100건**을 뽑아(규칙 S2 — 유명 제품 고르기 금지)
"매장에서 해당 제품을 확인하고 소비자에게 설명하는 기본 자료로 사용할 수 있는가?" 기준으로 전건 확인했다.

| 항목 | 수 |
|------|---:|
| 육안 검수 | 100 |
| 발견 오류 | 9 (반복 오류군 2개) |
| 수정 후 재생산 | **33,106 (전량 재생산)** |

**반복 오류군 1 — 증정·동봉 구성품 용량 혼입 (4건).** `… 140ml 2입+클렌저 30ml 증정` 에서 30ml 를 읽어
**다른 제품 정보가 섞였다**(WO §8 검사 7). 판매명을 `증정`·`사은품`·(숫자 뒤가 아닌) `+` 앞에서 잘라 그 앞 구간에서만
용량을 읽도록 고쳤다. `SPF50+`·`1+1` 은 자르지 않는다. → 기준문서 **규칙 G5**.

**반복 오류군 2 — 병합 마디 유형 어긋남 (5건).** `스킨/토너/패드` 마디의 토너패드가 `토너` 로 나갔다.
상품명 핵심어가 **그 마디 자신의 토큰**일 때만 좁히도록 하고(1,867건 적용), 마디 밖 어긋남은 유형을 바꾸지 않고
큐로만 남겼다(8,270건). → 기준문서 **규칙 T6**.

넓은 이름 기반 재분류는 **채택하지 않았다.** 실측 결과 3,549건 중 상당수가 열화(`바디로션→로션`, `헤어에센스→에센스`)
또는 부분일치 오탐(`팩트→팩` 89건, `선스틱→스틱` 136건)이었다. 한두 건으로 일반 규칙을 만들지 않는다(기준문서 §10).

수정 후 전량 재생산 → 자동 검증 위반 0 → 같은 표본 100건 2차 육안 확인에서 두 오류군 모두 해소, 새 오류군 없음.
`COMPLETE` 는 21,144 → **20,949** 로 줄었다. 증정품 용량이 유일한 특징이던 건이 정직하게 `PARTIAL` 로 내려간 결과이며
수치를 유지하지 않았다.

## 5. 자동 검증 (WO §8)

`03-validate.mjs` 는 생산 엔진 `guide-core.mjs` 를 **import 하지 않는다.** 허용 동작을 검증기에서 독립적으로 다시 유도해
엔진 버그가 스스로를 통과시키지 못하게 했다. 검사 항목:

후보 식별자 유지(`IDENTITY_COUNT`/`IDENTITY_KEY`) · 브랜드·상품명 존재 및 census 일치 · 유형 존재 또는 미확정 표기
(`TYPE_UNMARKED`/`TYPE_MISMATCH`/`TYPE_SOURCE_UNMARKED`/`TYPE_SILENTLY_DROPPED`) · 한 줄 설명 존재 · 주요 특징 근거 태그
· **다른 제품 정보 혼입**(`FEATURE_CAPACITY_UNSOURCED` — 증정 구간 유래 용량을 별도 문구로 구분, `FEATURE_VARIANT_MISMATCH`,
`FEATURE_SPF_UNSOURCED`) · **근거 없는 성분·효능 추가**(`UNSOURCED_EFFICACY_CLAIM`, `FEATURE_FUNCTIONAL_NOT_MATCHED`,
`OPTIONAL_FIELD_UNSOURCED`) · 사용방법 존재 또는 `CATEGORY_GENERIC` 표기(`USAGE_UNMARKED`/`USAGE_SOURCE_WRONG`/
`USAGE_TYPE_INCONSISTENT`).

**전 배치 위반 0.** 품질 점수는 만들지 않았다(WO §8).

## 6. 자원 · 비용 (WO §15)

| 항목 | 값 |
|------|-----|
| 총 처리시간 | 생산 파이프라인 1회 약 2분 (01~05 합계, 전량 재생산 포함 2회 수행) |
| 외부 LLM 호출 | **0건** |
| 외부 API 호출 | **0건** (census 산출물만 입력. 제품별 추가 웹 조사 불필요 — WO §5 범위에서 종결) |
| 실비 | **0원** |

생성은 census 사실값에서 결정적으로 조립한다. 같은 입력이면 같은 산출물이 나온다.

## 7. WO 제약 준수

| 제약 | 결과 |
|------|------|
| §2 모집단 33,106 전량, census 큐 872 사전 제거 금지 | 준수 — 872 이월 기록만 |
| §4 빈 정보를 추론해 채우지 않는다 | 준수 — 미확보는 `PARTIAL` + 큐 |
| §6 `CHECK 1,239` · `FUNCTIONAL_UNMATCHED 175,788` 추가 매칭 금지 | 준수 — `RETAIL_FUNCTIONAL_MATCHED 4,259` 만 사용 |
| §7 영어 설명서 생산 금지 | 준수 — 0건 |
| §8 품질 점수 금지 | 준수 |
| §11 DB write 금지 (ProductMaster/설명서/Identifier/schema/migration) | 준수 — 0건, 파일 산출물만 |
| §13 중지 조건 | 해당 없음 — 모집단 정합, 대량 혼입 없음, 외부 차단 우회 없음, 타 세션 WIP 충돌 없음 |

## 8. 후속

1. **`NO_OBSERVED_FEATURE` 12,076** — 제품 상세 페이지 수집이 있어야 줄어든다. 다음 확대의 최대 항목.
2. **`TYPE_NAME_MISMATCH` 8,270** — 규칙 T6 좁힘 표를 넓힐 수 있는지 실측 판단.
3. **ProductMaster 적용** — 별도 WO (WO §11).
4. **영어 설명서** — 별도 WO. 공식 영문명 확보가 선행이다(규칙 G4).

## 9. 기준문서 갱신 (WO §10 · §12)

반복 확인된 사례만 [O4O-COSMETICS-PRODUCT-GUIDE-PRODUCTION-STANDARD-V0](../cosmetics/O4O-COSMETICS-PRODUCT-GUIDE-PRODUCTION-STANDARD-V0.md) 에 올렸다.

- **규칙 T6** — 유형 좁히기는 같은 판매 마디 안에서만. 마디 밖 어긋남은 큐로.
- **규칙 T7** — 마디가 서로 다른 제품군을 묶었으면 유형을 주장하지 않는다.
- **규칙 G5** — 증정·동봉 구성품의 용량은 이 제품의 용량이 아니다.
- **규칙 G6** — 판매 분류는 주요 특징이 아니다 (별도 필드, 완성도 계산 제외).
- §8 갱신 항목에 7·8번(위 후속 1·2) 추가.
