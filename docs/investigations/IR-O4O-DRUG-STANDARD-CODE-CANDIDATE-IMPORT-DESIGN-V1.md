# IR-O4O-DRUG-STANDARD-CODE-CANDIDATE-IMPORT-DESIGN-V1

> 약가마스터(의약품표준코드) 공공데이터를 O4O 표준상품 구조에 **안전하게 후보(candidate) 적재**하기 위한 설계 IR.
> 작성일: 2026-06-30 · 성격: **read-only 설계 IR** (코드/DB/migration/API/UI/import 변경 없음 · 산출물 = 본 문서 1개)
> 선행: `IR-O4O-STANDARD-PRODUCT-REPRESENTATIVE-GROUPING-AND-STORE-CONTENT-DIRECTION-V1`(종합 IR), `CHECK-O4O-DRUG-STANDARD-CODE-CSV-SAMPLE-MAPPING-V1`(실측 CHECK)

---

## 1. 목적

약가마스터 CSV 실측 결과(2025-10-31 기준, 305,522행, EUC-KR/CP949)를 바탕으로 **의약품 공공데이터를 O4O 표준상품 구조에 어떻게 적재할지**를 설계한다. 본 IR은 import 구현 전 단계로서 다음을 확정한다.

1. 원본을 `ProductMaster` Core에 직접 적재할지, candidate/draft 계층을 거칠지.
2. 표준코드/품목기준코드/ATC의 식별자 매핑 정책.
3. 다제조사 그룹 · 포장형태 결측 · 취소(cancelled) 데이터 처리 정책.
4. CP949 인코딩 처리 정책.
5. FOUNDATION WO(스키마)와 import WO(데이터)의 경계·선후관계.
6. 후속 WO 후보.

**구현·migration·스크립트는 만들지 않는다.** 매핑 가능성·위험·정책·진행 순서만 판단한다.

---

## 2. 선행 IR / CHECK 요약

| 문서 | 핵심 확정 |
|---|---|
| 종합 IR | 포장단위/SKU = 기존 `ProductMaster`(신규 아님), 대표상품 = 신규 `representative_products` 1계층(미구현). 1차 = 테이블 1개 + `product_masters.representative_product_id` nullable FK 1개. 공공데이터 1차 = **의약품 한정**. import는 ProductMaster 직접 확정이 아닌 **candidate/draft 경유가 정합**(후속 설계 = 본 IR). |
| 실측 CHECK | CSV 본문 1회 실확보. **표준코드 = 결측 0% / 형식이상 0% / 중복 0%(13자리 100% 유일)**. 품목기준코드 96,236개 중 **82.4%가 다포장**(표준코드 2개+). **다제조사 혼입 active 기준 7.887%(5,101 그룹)**. **포장형태 결측 35.8%**. 취소일자 nonempty 24.4%(active 75.56%). 인코딩 **CP949 고정**. `ProductCandidate(csv_import)` 이미 구현 확인. IR enum 오차 정정: `MFDS_ITEM_CODE`→실값 `MFDS_CODE`. |

---

## 3. 약가마스터 실측 결과의 의미 (설계 관점 재해석)

| 실측 사실 | 설계적 의미 |
|---|---|
| 표준코드 결측0·중복0·13자리100% | `ProductIdentifier(KOREA_DRUG_CODE).normalized_value` 에 **무가공 적재 가능**. 약가마스터 1행 = 표준코드 1개 = 포장단위(ProductMaster) 1건 grain 데이터로 입증. |
| 품목기준코드 다포장 82.4% | 품목기준코드 = **대표상품 그룹핑 키**가 데이터로 확정. 단 ProductMaster의 UNIQUE 슬롯에 직접 넣으면 충돌이 지배적(§7,§13). |
| 다제조사 active 7.887% | 양도양수로 동일 품목기준코드에 여러 제조사 현재형 공존 → **manufacturer_name 자동 단일 파생 금지**(§9). |
| 포장형태 결측 35.8% / 총수량 0 다수 | 포장단위명·specification 자동 생성 시 **fallback 우선순위 필수**(§10). |
| 취소일자 24.4% | candidate 보존 + 승격은 active 우선(§11). |
| CP949 / trailing space / 따옴표 인용 | 정규화 전처리(인코딩 변환·trim·CSV 파서) 필수(§12). |

---

## 4. import 설계에서 해결해야 할 문제

```text
P1. ProductMaster.barcode(varchar14, NOT nullable, UNIQUE, immutable) — 표준코드(13)를 barcode로 직투입?
P2. ProductMaster.mfds_product_id(varchar100, NOT nullable, UNIQUE) — 품목기준코드 직투입 시 다포장 82% 충돌
P3. 대표상품(representative_products) 미구현 — 그룹핑 결과를 어디에 보관?
P4. 다제조사 7.9% — manufacturer 단일 파생 불가 그룹 처리
P5. 포장형태 35.8% 결측 — 포장단위명/specification 생성 fallback
P6. 취소 24.4% — active/cancelled 분리
P7. CP949 / trailing space / 따옴표 — 전처리 규칙
P8. Core 동결(CLAUDE.md §3) — ProductMaster/대표상품 스키마 변경은 명시적 WO + 영향평가
```

본 IR은 P1~P8을 candidate 계층으로 흡수하는 설계를 제시한다.

---

## 5. Core 직접 적재 vs candidate 적재 비교

### A안 — 직접 적재 (`representative_products`/`ProductMaster`/`ProductIdentifier` 즉시)

| 장점 | 위험 |
|---|---|
| 구조 단순, 빠른 활용 | **barcode NOT nullable + UNIQUE**(P1) — 표준코드≠GTIN인데 박으면 정정 불가·향후 실 GTIN 충돌 |
| 중복 저장 적음 | **mfds_product_id NOT nullable + UNIQUE**(P2) — 다포장 82%가 충돌 → 적재 자체 불가 |
| | 미검증 데이터가 SSOT 오염, 다제조사 오표시(P4), 결측 라벨 양산(P5), 취소 데이터 혼입(P6) |
| | Core 동결 위반, 재수집(연1회) diff·롤백 불가 |

→ **A안은 구조적으로 불가능에 가깝다.** ProductMaster의 두 NOT-nullable UNIQUE 슬롯(barcode, mfds_product_id)이 약가마스터 grain과 맞지 않는다.

### B안 — candidate 적재 후 승격 (권장)

```text
약가마스터 CSV → ProductCandidate(csv_import) → [매칭/검토/그룹핑] → 운영자 승격 → ProductMaster + ProductIdentifier (+ representative_products)
```

| 장점 | 비용 |
|---|---|
| Core 무오염, 미검증 데이터 격리(baseline 원칙 일치) | candidate ↔ master 2계층 저장 |
| barcode/mfds_product_id UNIQUE 충돌을 승격 시점에 해소 | 승격 로직 별도 필요(후속 WO) |
| raw_payload로 원본 보존 → 재수집 diff·재처리 가능 | |
| 다제조사·결측·취소를 status/flag로 분리 검토 가능 | |
| **`ProductCandidate`가 이미 존재** — `csv_import` source·`raw_payload`·identifier 매칭 입력 보유 | |

> **결정 1: B안(candidate 경유) 채택.** A안은 ProductMaster의 NOT-nullable UNIQUE 제약(barcode·mfds_product_id)과 약가마스터 다포장 grain의 구조적 불일치로 불가. candidate 계층은 baseline 원칙(*"미검증 데이터를 ProductMaster에 직접 저장하지 않는다"*)과도 정합하며, **이미 구현된 `ProductCandidate`를 재사용**한다.

---

## 6. 권장 candidate 구조

### 6.1 기존 `ProductCandidate` 재사용 (검증된 실 엔티티)

`apps/api-server/src/modules/neture/entities/ProductCandidate.entity.ts` 기준 — 약가마스터 1행을 그대로 수용 가능:

| candidate 필드 | 약가마스터 매핑 |
|---|---|
| `sourceType = 'csv_import'` | 고정 |
| `sourceLabel` | `약가마스터_의약품표준코드_20251031` |
| `identifierType / identifierValue / normalizedIdentifierValue` | `KOREA_DRUG_CODE` / 표준코드 / trim(표준코드) |
| `candidateName` | 한글상품명 |
| `candidateManufacturer` | 업체명 |
| `candidateSpec` | 약품규격 |
| `candidateUnit` | 포장형태(결측 시 null) |
| `candidatePrice` | (약가마스터엔 가격 없음 → null) |
| `rawPayload` (jsonb) | **22컬럼 원본 1행 통째 보존** (품목기준코드·대표코드·일반명코드·ATC·취소일자·총수량·제형구분·전문일반 등 전부) |
| `candidateStatus` | `pending` |
| `matchStatus` | Identifier Core로 기존 Master 매칭 결과 |
| `matchedProductMasterId` | exact_identifier_match 시 연결 |

→ **표준코드·상품명·업체명·규격·포장형태는 전용 컬럼, 그 외 약가마스터 고유 필드(품목기준코드/대표코드/ATC/취소일자/총수량/제형/전문일반)는 `rawPayload`에 무손실 보존.**

### 6.2 부족한 부분 (그룹핑·정책 메타)

`ProductCandidate`는 **개별 후보 큐**라 대표상품 그룹핑·import 배치·정책 플래그 전용 컬럼이 없다. 두 안:

- **V1-경량(권장)**: 그룹핑 키(품목기준코드)·다제조사 수·취소여부·기준일을 모두 `rawPayload`에 넣고, 그룹핑/검토는 조회 쿼리(GROUP BY raw_payload->>'품목기준코드')로 수행. 신규 컬럼 0.
- **V1.5-additive**: 조회·인덱싱 성능이 필요하면 candidate에 nullable 컬럼 소수 추가(`group_key`, `group_manufacturer_count`, `is_cancelled`, `source_base_date`, `review_required`). 단 이는 별도 candidate-foundation WO(§17).

> **결정 2: V1은 기존 `ProductCandidate` + `rawPayload`로 시작.** 그룹핑/검토 메타는 raw_payload 기반 쿼리로 처리하고, 인덱싱 필요가 입증되면 additive 컬럼을 후속 WO로 추가. 신규 candidate 테이블(`drug_standard_code_candidates`)은 **만들지 않는다**(ProductCandidate와 grain 중복).

### 6.3 import 배치 추적

연1회 갱신·재수집 diff를 위해 배치 식별이 필요하나, V1은 `sourceLabel`(파일명+기준일)로 식별하고 별도 `import_batches` 테이블은 후속 검토(§17). 동일 표준코드 재유입은 `(identifierType, normalizedIdentifierValue)` 기준 upsert(service logic, 전역 UNIQUE 없음).

---

## 7. 표준코드 매핑 정책

```text
표준코드(13자리)
→ ProductIdentifier.identifierType = 'KOREA_DRUG_CODE'   (enum 실존 확인)
→ identifierValue = 원본 표준코드
→ normalizedValue = trim(표준코드)                         (trailing space 제거)
→ verificationStatus = 'imported'                          (enum 실존 확인)
→ sourceType = 'import', sourceLabel = '약가마스터_..._20251031'
```

- candidate 단계: `ProductCandidate.identifierType='KOREA_DRUG_CODE'` 로 보관 → Identifier Core 매칭에 사용.
- 승격 단계: 매칭 없으면 신규 ProductMaster 후보, 있으면 기존 Master에 `ProductIdentifier` 부착.
- `ProductIdentifier`는 **전역 UNIQUE 없음**(partial unique = master_id+type+normalized_value+deleted_at) → **표준코드 중복/충돌 수용 구조 이미 존재**.

> **결정 3: 표준코드 = `ProductIdentifier(KOREA_DRUG_CODE)` 무가공 적재(trim만).** 결측0·중복0·13자리100%이므로 정제 불필요.

---

## 8. 품목기준코드와 대표상품 그룹핑 정책

### 8.1 grain 모델 (데이터로 확정)

```text
품목기준코드 (허가 품목)        = 대표상품 그룹핑 키   → representative_products (그룹 보관: §8.1a)
   └─ 표준코드 (보험청구 포장)  = 포장단위(ProductMaster) → ProductIdentifier(KOREA_DRUG_CODE)
```

### 8.1a 그룹핑 키 보관 위치 — FOUNDATION 실제 스키마 정정 (중요)

> ⚠️ **실 엔티티 확인 결과 정정**: 본 IR 다른 절(§8.2/§15/§17/§19/필수답변)이 `representative_products.product_group` 컬럼을 그룹핑 키 슬롯으로 표기하나, **이미 커밋된 FOUNDATION(`RepresentativeProduct` 엔티티, CHECK-O4O-PRODUCT-MASTER-REPRESENTATIVE-LINK-FOUNDATION-V1 §6)에는 `product_group` 컬럼이 존재하지 않는다.** 실제 컬럼 = `displayName`(NOT NULL) / `manufacturerName`(nullable) / `thumbnailImageId`(nullable) / `metadata`(jsonb nullable) 뿐이다.
>
> 따라서 품목기준코드(그룹핑 키)는:
> - **V1 권장**: `representative_products.metadata`(jsonb) 에 보관 (예: `{ "mfdsItemCode": "199905709" }`). **스키마 무변경.**
> - **조건부 후속**: 그룹 조회/조인 인덱싱 성능이 입증되면 별도 WO로 `group_key`(품목기준코드) nullable additive 컬럼 추가.
>
> 본 IR 내 `representative_products.product_group` 표기는 전부 위 보관 위치(metadata 우선 / additive 컬럼은 후속)로 읽는다.

### 8.2 품목기준코드를 어디에 두는가 (P2 해소)

`ProductMaster.mfds_product_id`(NOT nullable, UNIQUE)에 품목기준코드를 직접 넣으면 **다포장 82.4%가 UNIQUE 충돌**. 따라서:

```text
품목기준코드 →
  ① representative_products.product_group   (대표상품 그룹핑 키 — 동일 품목기준코드 = 동일 대표상품 후보)
  ② ProductIdentifier(MFDS_CODE)            (포장단위 식별자 — enum 실존)
  ③ ProductDrugExtension.mfdsCode           (의약품 확장 — 컬럼 실존)
```

→ **`ProductMaster.mfds_product_id`(UNIQUE 슬롯)에는 품목기준코드를 넣지 않는다.** 승격 시 mfds_product_id에 무엇을 채울지(표준코드 = 행당 유일 / 합성값)는 **승격 WO의 결정사항**(본 candidate import 범위 밖, §16).

### 8.3 자동 생성 vs 검토

- 품목기준코드 그룹핑은 **representative_products 승격 후보**로 유효(82.4% 다포장이 근거).
- 단 **자동 확정 금지** — 다제조사(§9)·과대묶음(묶음의약품 성분유사) 위험. candidate 그룹을 운영자 검토 후 승격.
- 묶음의약품 대표코드(15063908)는 "성분 유사"라 과대묶음 위험 → **보조 참고만**, 1차 그룹핑 키는 **품목기준코드**.

> **결정 4: 대표상품 그룹핑 키 = 품목기준코드(우선), 묶음의약품 대표코드 = 보조.** 품목기준코드는 `representative_products.product_group` + `ProductIdentifier(MFDS_CODE)` + `DrugExtension.mfdsCode`로 귀속하고, `ProductMaster.mfds_product_id` UNIQUE 슬롯에는 직접 넣지 않는다. 자동 확정 금지, 운영자 검토 후 승격.

---

## 9. 다제조사 그룹 처리 정책

실측: 품목기준코드 그룹핑 시 **active 기준 7.887%(5,101 그룹)**에서 여러 제조사 공존(양도양수). active 필터로도 사라지지 않음.

**금지**: 첫 업체 자동 채택 / active 필터로 해결됐다고 가정 / 혼입 그룹을 단일 제조사 대표상품으로 표시.

**후보 평가**:

| 안 | 평가 |
|---|---|
| A: 다제조사 그룹 `manufacturer_name = null` | ✅ 단순·안전 |
| B: candidate `review_required = true` (또는 candidateStatus 검토 상태) | ✅ 검토 유도 |
| C: 업체별로 대표상품 분리 | △ 동일제품 분할 위험(대표상품 취지 약화) |
| D: 품목기준코드+업체명 복합키로 대표 후보 생성 | △ 그룹 과분할 |
| E: 묶음의약품/허가정보로 보정 | △ 후속 데이터 필요 |

> **결정 5: A+B 결합.** 그룹 내 distinct 업체 수>1 이면 → 대표상품 후보의 `manufacturer_name = null` + 해당 candidate 그룹을 **검토 대상으로 표기**(V1=rawPayload 플래그 또는 candidateStatus='reviewing', V1.5=`review_required`/`group_manufacturer_count` 컬럼). 단일 업체 그룹만 manufacturer_name 자동 파생. C/D/E는 후속 정제 옵션.

---

## 10. 포장형태 결측 fallback 정책

실측: 포장형태 35.8% 결측, 제품총수량 0 다수. 포장단위명·`specification`(`ProductMaster.specification` text) 생성 시 fallback 필요.

> **결정 6: 포장단위 표시명/specification 생성 우선순위**

```text
1순위: 약품규격 + 제품총수량 + 포장형태   (예: "500mg 30정 병")
2순위: 약품규격 + 제품총수량              (예: "0.4mL 30")
3순위: 약품규격                          (예: "500그램")
4순위: 한글상품명 원문 보존
5순위: specification = null              (생성 불가 시 빈 값 허용 — 오류 아님)
```

- 총수량 0 / 포장형태 공란은 결측으로 간주하고 다음 순위로 강등.
- candidate 단계에서는 원본을 `candidateSpec`(약품규격) + `candidateUnit`(포장형태) + rawPayload(총수량/제형)로 분리 보존하고, **표시명 합성은 승격/검토 시점**에 위 우선순위로 수행(원본 비파괴).

---

## 11. active / cancelled 데이터 처리 정책

실측: 취소일자 nonempty 24.4% / active(취소일자 공란) 75.56%.

> **결정 7**

```text
candidate 적재   : active/cancelled 모두 보존 (취소일자는 rawPayload, V1.5=is_cancelled 컬럼)
ProductMaster 승격: active(취소일자 공란) 우선
cancelled        : 기본 승격 제외. 단 식별자 중복 확인·과거 이력용으로 candidate에는 잔존
                   (candidateStatus='archived' 또는 rawPayload 플래그)
```

- ProductMaster에 별도 status 컬럼을 신설하지 않는다(Core 동결). active/cancelled 판정은 **candidate 단계 + DrugExtension.regulatoryStatus**(컬럼 실존)에서 관리.
- cancelled 표준코드가 이미 승격된 Master에 재유입되면 `ProductIdentifier.verificationStatus='deprecated'` 부착으로 표기(후속 승격 WO).

---

## 12. CP949 인코딩 처리 정책

> **결정 8**

```text
입력 인코딩  : CP949 / EUC-KR (UTF-8 아님 — 실측 확정)
변환         : iconv -f cp949 -t utf-8  (strict EUC-KR은 CP949 전용문자 1건에서 실패)
필수 전처리  :
  - 원본 인코딩·기준일(2025-10-31)·파일명 기록
  - CSV 따옴표 인용 필드 파서 사용 (단순 split 금지 — 비고 "한약재, 갈근" 등)
  - 표준코드/품목기준코드 trailing space trim
  - 변환 실패 / 깨진 문자 row → 적재 보류 + 검토 대상 기록 (무음 손실 금지)
```

- 인코딩 가정(UTF-8) 금지. import 진입 전 UTF-8 정규화 단계를 별도로 둔다.

---

## 13. ProductMaster.barcode 직접 저장 여부

- `barcode` = `varchar(14)`, **NOT nullable**, 전역 UNIQUE, immutable, GTIN 슬롯(check digit 포함).
- 표준코드(13 KD코드)는 GTIN-13 근간이나 **실 유통 GTIN과 동일 보장 없음**. 직투입 시: 정정 불가(immutable) + 향후 실 GTIN 충돌 + 표준코드 단위 중복행 충돌 위험.
- 단 barcode가 NOT nullable이므로 **승격 시 무언가는 반드시 채워야 함** → 옵션: ① 표준코드를 barcode로(보류) ② 내부 GTIN 자동생성(prefix 200, `INTERNAL_O4O`, 기존 경로 존재) 후 표준코드는 identifier로.

> **결정 9: 표준코드 → barcode 직접 저장 보류.** candidate/승격에서 표준코드는 `ProductIdentifier(KOREA_DRUG_CODE)`로 관리하고, ProductMaster.barcode는 **승격 시점에 내부 GTIN 자동생성으로 채우는 것을 우선 검토**(승격 WO 결정사항). candidate 단계는 barcode를 다루지 않는다(표준코드만 identifier 후보로 보존).

---

## 14. ProductIdentifier 적재 정책

> **결정 10: 식별자 매핑 (enum 전부 실존 확인)**

| 약가마스터 컬럼 | identifierType | 비고 |
|---|---|---|
| 표준코드(13) | `KOREA_DRUG_CODE` | normalized=trim, verification='imported' |
| 품목기준코드 | `MFDS_CODE` | (IR 오차 `MFDS_ITEM_CODE` 아님) + DrugExtension.mfdsCode 병기 |
| ATC코드 | `ATC_CODE` | 결측 가능 → 있을 때만 |
| (보험코드 존재 시) | `KOREA_INSURANCE_CODE` | 약가마스터엔 직접 없음 → 후속 소스 |

- `ProductIdentifier`는 전역 UNIQUE 없음 + partial unique(master+type+normalized+deleted_at) → 동일 표준코드 충돌 수용. 중복 시 `verificationStatus='conflict'` 표기 가능.
- candidate 단계는 `KOREA_DRUG_CODE` 1개만 매칭 입력으로 사용(표준코드). 나머지(MFDS/ATC)는 **승격 시 부착**(raw_payload에서 추출).

---

## 15. representative_products 자동 생성 가능성

- `representative_products` 는 **미구현**(grep 0, 종합 IR §6). FOUNDATION WO에서 신설 예정.
- 자동 생성 가능성: 품목기준코드 그룹핑 키는 데이터로 충분(82.4% 다포장)하나, **다제조사 7.9% + 과대묶음 위험** → **완전 자동 생성 금지**.
- 권장: candidate 그룹핑 결과를 **representative 승격 후보**로 제시 → 운영자 검토 → 승격. 단일 제조사·단일 품목기준코드 그룹은 낮은 위험으로 일괄 승격 후보, 다제조사 그룹은 검토 필수.
- 승격 시 `display_name` = 묶음 대표 제품명 또는 대표 한글상품명, `manufacturer_name` = §9 규칙(다제조사 null).

> **결정 11: representative_products 자동 생성은 "후보 제시 + 운영자 검토 승격" 모델.** 완전 자동 금지.

---

## 16. FOUNDATION WO와의 경계

| FOUNDATION WO (스키마) | 본 IR 후속 import WO (데이터) |
|---|---|
| `representative_products` 테이블 신설 | 약가마스터 CSV 정제·candidate 적재 |
| `product_masters.representative_product_id` nullable FK | CP949 전처리·표준코드/품목기준코드 매핑 |
| Core 동결 해제 절차 + 소비처 영향평가 | 다제조사/결측/취소 처리, 그룹핑 후보 산출 |
| import 없음 | 스키마 변경 없음(기존 ProductCandidate 재사용) |

**선후관계 후보**: A(FOUNDATION 먼저) / B(import 설계 먼저) / C(병행, 실제 import는 둘 다 후).

- candidate 적재는 **기존 `ProductCandidate`만으로 가능** → `representative_products` 미구현과 **무관하게 candidate import는 독립 진행 가능**.
- representative 승격(품목기준코드 → representative_products)은 FOUNDATION 완료가 전제.

> **결정 12: C안(병행) 채택.** FOUNDATION WO(스키마)와 candidate import WO(데이터)는 의존이 없으므로 병행한다. 단 **representative_products 승격 단계만 FOUNDATION 완료 후** 수행. 즉 candidate 적재·표준코드 식별자화는 즉시 가능, 대표상품 그룹 승격은 FOUNDATION 뒤.

---

## 17. 후속 WO 후보

### WO-O4O-DRUG-STANDARD-CODE-CSV-CANDIDATE-IMPORTER-V1 (핵심)
- CP949 → UTF-8 정규화, CSV 따옴표 파서, trailing-space trim.
- 약가마스터 1행 → `ProductCandidate(csv_import)` upsert(표준코드 기준), rawPayload 원본 22컬럼 보존.
- 표준코드 → `KOREA_DRUG_CODE` 매칭 입력. active/cancelled 분리. 대용량 CSV 미커밋.

### WO-O4O-DRUG-REPRESENTATIVE-PRODUCT-CANDIDATE-GROUPING-V1
- 품목기준코드 group_key 집계, 다제조사 감지(distinct 업체>1 → manufacturer null + 검토 플래그), 포장단위 수 집계.
- representative_products 승격 후보 산출(FOUNDATION 완료 전제).

### WO-O4O-PRODUCT-IDENTIFIER-KOREA-DRUG-CODE-ATTACHMENT-V1
- candidate 승격 시 표준코드→`KOREA_DRUG_CODE`, 품목기준코드→`MFDS_CODE`, ATC→`ATC_CODE` 부착.
- barcode 직접 저장 여부 재검토(내부 GTIN 자동생성 우선). 중복→`conflict`/`deprecated` 표기.

### (조건부) WO-O4O-DRUG-CANDIDATE-FOUNDATION-ADDITIVE-V1
- 조회/인덱싱 성능 입증 시에만 `ProductCandidate`에 nullable additive(`group_key`/`group_manufacturer_count`/`is_cancelled`/`source_base_date`/`review_required`). V1은 rawPayload로 충분 → 보류 가능.

> 신규 candidate 테이블(`drug_standard_code_candidates`)·별도 import_batches 테이블은 **1차 만들지 않는다**(ProductCandidate 재사용).

---

## 18. 위험 요소와 유보 사항

1. **승격 시 mfds_product_id 채움 규칙 미확정** — NOT nullable+UNIQUE 슬롯에 무엇을(표준코드/합성값) 넣을지는 승격 WO 결정(§8.2). 본 IR 범위 밖.
2. **barcode NOT nullable** — 승격 시 내부 GTIN 자동생성 경로가 약가마스터 import에 안전한지 별도 검증 필요(§13).
3. **묶음의약품 성분유사 과대묶음** — 대표상품 그룹핑에 직접 쓰면 위험 → 품목기준코드 우선(§8.3).
4. **연1회 재수집 diff/롤백** — 배치 추적을 sourceLabel로만 하면 부분 재처리 한계. import_batches 필요성 후속 판단(§6.3).
5. **rawPayload 기반 그룹핑 성능** — 305,522행 GROUP BY raw_payload->>'품목기준코드' 비용 → additive 컬럼 전환 시점 판단(§6.2).
6. **Core 동결** — representative_products·product_masters 변경은 명시적 WO + 소비처 전수 영향평가(CLAUDE.md §3).
7. **공공저작물 제1유형(출처표시)** — import 결과 노출 시 출처표시 의무.

---

## 19. 최종 결론

> 약가마스터 CSV는 표준코드 품질이 매우 높아(결측0·중복0·13자리100%) O4O 의약품 표준상품 후보 데이터로 활용 가치가 높다. 그러나 CP949 인코딩, 다제조사 그룹(active 7.9%), 포장형태 결측(35.8%), 취소 데이터(24.4%)와 함께, 무엇보다 **`ProductMaster.barcode`/`mfds_product_id` 두 NOT-nullable UNIQUE 슬롯이 약가마스터의 다포장 grain(품목기준코드당 표준코드 82.4% 다수)과 구조적으로 충돌**하므로 **원본을 ProductMaster Core에 직접 적재하는 것은 불가능에 가깝다.**
>
> 따라서 **이미 구현된 `ProductCandidate(csv_import)`를 재사용**하여 candidate/draft 계층에 적재하고, 표준코드는 `ProductMaster.barcode`가 아니라 **`ProductIdentifier(KOREA_DRUG_CODE)`** 로 관리한다. 품목기준코드는 `representative_products.product_group` + `ProductIdentifier(MFDS_CODE)` + `DrugExtension.mfdsCode`로 귀속하되 ProductMaster의 UNIQUE 슬롯에는 직접 넣지 않는다. 다제조사 그룹은 `manufacturer_name`을 자동 파생하지 않고 null + 검토 플래그로 처리한다. 실제 import 전 FOUNDATION WO(스키마)와 candidate import WO(데이터)를 분리·병행하고, representative_products 승격만 FOUNDATION 완료 후 수행한다.

### 필수 답변 요약

| # | 질문 | 결론 |
|---|---|---|
| 1 | ProductMaster 직접 적재? | **NO** — barcode·mfds_product_id NOT-nullable UNIQUE가 다포장 grain과 충돌 |
| 2 | candidate/draft 필요? | **YES, 이미 구현됨** — `ProductCandidate(csv_import)` 재사용, 신규 테이블 0 |
| 3 | 표준코드 = KOREA_DRUG_CODE? | **YES (우선)** — trim 외 무가공 |
| 4 | barcode 직접 저장? | **보류** — 승격 시 내부 GTIN 자동생성 우선 |
| 5 | 품목기준코드 = 대표 group_key? | **YES** — product_group + MFDS_CODE + DrugExtension.mfdsCode (UNIQUE 슬롯 직투입 금지) |
| 6 | 다제조사 그룹? | **manufacturer_name null + 검토 플래그** — 자동 단일파생 금지 |
| 7 | 포장형태 결측 fallback | 규격+총수량+포장형태 → 규격+총수량 → 규격 → 상품명 → null |
| 8 | active/cancelled | candidate=전부 보존, 승격=active 우선, cancelled=archived/이력 |
| 9 | FOUNDATION vs import 선후 | **C안 병행** — candidate 적재는 독립, representative 승격만 FOUNDATION 후 |
| 10 | 다음 실행 WO | **WO-O4O-DRUG-STANDARD-CODE-CSV-CANDIDATE-IMPORTER-V1** |

---

**작성:** O4O Platform 설계 IR · 2026-06-30
**성격:** read-only 설계 IR — 코드/DB/migration/API/UI/import 변경 없음. 실 엔티티(`ProductMaster`/`ProductIdentifier`/`ProductCandidate`/`ProductDrugExtension`) 컬럼·enum·제약 직접 대조. 구현은 §17 후속 WO로 위임.

> 출처표시: 본 문서가 참조한 약가마스터 데이터 = 건강보험심사평가원_약가마스터_의약품표준코드 (공공데이터포털 15067462, 공공저작물 제1유형).
