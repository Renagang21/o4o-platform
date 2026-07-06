# IR-O4O-PRODUCT-STRUCTURE-REFINEMENT-ASSESSMENT-V1

Status: ASSESSMENT (평가 리포트 — 원 제안서에 대한 재검토)
Date: 2026-07-06
Scope: `PROPOSAL-O4O-PRODUCT-STRUCTURE-REFINEMENT-FOR-MFDS-PUBLIC-DATA-V1` 제안서를 실제 코드 기준으로 재평가하고, 실질 미결 결정만 추린다.

관련 엔티티:
- `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts`
- `apps/api-server/src/modules/neture/entities/ProductIdentifier.entity.ts`
- `apps/api-server/src/modules/neture/entities/ProductDrugExtension.entity.ts`
- `apps/api-server/src/modules/neture/entities/RepresentativeProduct.entity.ts`
- `apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts`

---

## 0. 결론 요약

원 제안서의 **방향(ProductMaster를 억지로 키우지 말고 RepresentativeProduct + Domain Extension을 쓴다)은 옳다.**
그러나 그 3계층 구조는 **이미 이 팀이 결정했고 코드로 서 있다.** 따라서 이 문서는 "새 구조 제안"이 아니라, 원 제안서의 넓은 범위를 걷어내고 **실제로 아직 안 정해진 3개 결정**만 남긴 판단서다.

미결 결정 3개:
1. **코드 이중저장(denormalization) SSOT 명문화** — Identifier=매칭/유일성, DrugExtension=표시/정책(코드 컬럼은 read-only mirror)
2. **RepresentativeProduct 그룹핑 키** — MFDS_CODE 다업체 혼입 7~8% 처리 규칙 확정 전까지 grouping apply 금지
3. **건강기능식품 Extension 신설** — 유일한 실질 신규 작업, 지금 타이밍

---

## 1. 제안서가 가정하는 구조는 이미 구현되어 있다

| 제안서가 "만들자/강화하자"고 한 것 | 실제 코드 상태 | 파일 |
| --- | --- | --- |
| ProductIdentifier를 외부코드 수용 계층으로 | **이미 존재.** `KOREA_DRUG_CODE / MFDS_CODE / KOREA_INSURANCE_CODE / ATC_CODE / UDI_DI` 타입 전부 정의. 의료기기 UDI_DI까지 추가됨 | `ProductIdentifier.entity.ts:52-66` |
| Domain Extension을 도메인별로 | **의약품은 이미 완비.** `mfds_code / drug_code / insurance_code / atc_code` + 효능/용법/주의/저장 텍스트 + 노출·광고·판매 정책 컬럼 전부 존재 | `ProductDrugExtension.entity.ts` |
| RepresentativeProduct 강화 | **이미 존재.** `display_name` + `metadata jsonb` + `ProductMaster.representative_product_id` additive FK. 제안서의 `metadata.mfdsCode` 저장 방식과 동일 설계 | `RepresentativeProduct.entity.ts` |
| SharedProductDescription V1 = master 파생 | **이미 존재하고 V1대로 동작 중.** `source_type`에 `mfds_easy_drug`, `drug_extension` 이미 포함. e약은요 파생 서비스 구현됨 | `SharedProductDescription.entity.ts:40`, `easy-drug-shared-description-derive.service.ts` |

즉 제안서 §2.1~§2.5의 결론(3계층 분리 + Identifier 수용 + Extension 활용 + 설명은 master 파생)은 **이미 내려진 결정이고 코드로 서 있다.** 제안서를 그대로 채택하면 "이미 한 일을 다시 하자"가 된다.

---

## 2. 제안서에서 이미 낡았거나 사실과 어긋난 부분

### (a) `barcode = 표준코드`를 "재검토 필요/보류"로 둔 것 (§2.1, §3.3, CHECK-B)

이미 종결된 사안이다. 약가마스터 dry-run에서 active 230,842건 중 GTIN check-digit fail이 **단 1건**이었고, 그래서 "barcode = 표준코드"로 확정됐다(KR 의약품 표준코드가 사실상 유효한 GTIN-13). 표준코드를 barcode에 넣는 건 정책 위반이 아니라 **정책 그 자체**다. CHECK-B가 "불일치를 찾아라"라고 전제하는데, 불일치가 아니라 의도된 설계다. CHECK-B는 "불일치 조사"가 아니라 "이 결정이 baseline 문서에 남아있는지 확인"으로 격하한다.

### (b) "공공데이터를 ProductMaster로 바로 승격하지 말라"는 대원칙 (§1)

맞고, 이미 그렇게 하고 있다. candidate → Gate A(candidate 적재) → Gate B(promotion) 게이트가 의약품·의료기기·quasi-drug·HFF 전부에 이미 깔려 있다. 제안서가 경고하는 안티패턴("가져온 데이터로 ProductMaster를 채운다")은 현재 코드에서 이미 게이트로 막혀 있다. 이 원칙은 새 규칙이 아니라 **기존 규칙의 재확인**이다.

---

## 3. 진짜 열려 있는 결정 3가지

### 결정 1 — 코드 이중저장(denormalization) SSOT 명문화 (제안서에 없음)

`mfds_code / drug_code / insurance_code / atc_code`가 **ProductIdentifier에도, ProductDrugExtension에도** 들어간다. 제안서 §2.5는 "identifier와 extension에 병기, 매칭은 identifier 기준"이라 했으나, 이미 이중화가 굳어진 상태라 **어느 쪽이 조회/매칭 SSOT인지**를 못 박지 않으면 두 값이 갈라질 때 정합성이 깨진다.

- **권고:** 매칭·유일성 = **ProductIdentifier** / 표시·정책·상세 = **ProductDrugExtension**.
- Extension의 코드 컬럼은 **편의 사본(read-only mirror)** 임을 baseline 문서에 명시.
- 향후 코드 조회/매칭 로직은 Extension 컬럼이 아니라 Identifier를 참조하도록 통일.

### 결정 2 — RepresentativeProduct 그룹핑 키 (제안서가 과소평가)

제안서는 "MFDS_CODE 하나로 여러 상품을 묶으면 된다"고 단순화했으나, 엔티티 주석이 정면으로 경고한다: *"동일 품목기준코드에 여러 업체 혼입 7~8% 존재 → 단일 자동파생 위험"* (`RepresentativeProduct.entity.ts:14-16`). 즉 **MFDS_CODE = 대표상품 1:1이 깨끗하지 않다.** grouping 서비스는 이미 있으나(dry-run만) apply되지 않았고, 이 7~8% 오염 처리가 실제 미결 사안이다.

- **권고:** 그룹핑 키를 `MFDS_CODE` 단독이 아니라 `(MFDS_CODE, manufacturer)`로 하거나, 오염 케이스는 대표상품을 분리 생성.
- **이 규칙 확정 전 grouping apply 금지.**
- 근거 숫자는 CHECK-A(§4)로 실측.

### 결정 3 — 건강기능식품 Extension 신설 (제안서가 맞는 유일한 신규 지점)

`ProductHealthFunctionalFoodExtension`은 정말 없다. HFF는 이미 candidate/Gate0 단계까지 와 있어(`CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-GATE0`, `GATE-B-PREREQUISITE`) 곧 이 결정이 필요하다. 제안서 §4·§2.5의 HFF extension 필드 설계는 타당하고, `ProductDrugExtension`을 거의 그대로 미러링하면 된다.

- **권고:** `ProductDrugExtension` 구조를 미러링하되 HFF 고유 필드(`hffItemCode`, `functionalIngredientCodes`, `functionalClaims`, `intakeMethodText`, `nutritionFacts`)만 치환.
- ProductIdentifier 신규 type 후보: `MFDS_HFF_ITEM_CODE`, `MFDS_HFF_INGREDIENT_CODE`.
- **이것이 원 제안서에서 실질 가치가 가장 큰 부분.**

---

## 4. 조사(CHECK) 재조정

| CHECK | 원 제안서 목적 | 재조정 |
| --- | --- | --- |
| CHECK-A (DB 실측) | "구조가 있나" | **"대표상품 연결률 · drug extension 생성률 · MFDS_CODE당 master 분포(오염율 7~8% 실측)"** → 결정 2 근거. read-only SQL로 즉시 수행 가능 |
| CHECK-B | "barcode 정책 불일치 조사" | **"barcode=표준코드 결정이 baseline 문서에 남아있는지 확인 + representative/extension apply 미실행 범위 확인"** 으로 격하 |
| CHECK-C (HFF API grain) | 그대로 | **가장 가치 높음. 그대로 진행.** HFF Gate 진행 중이라 타이밍 적합 |

---

## 5. 실행 순서 (재조정)

| 순서 | 작업 | 결과물 |
| --- | --- | --- |
| 1 | CHECK-A: 대표상품 연결률·MFDS_CODE 오염율 read-only 실측 | 결정 2 근거 숫자 |
| 2 | 결정 1 명문화 (Identifier=매칭 / Extension=표시) | baseline 문서 갱신 |
| 3 | 결정 2 그룹핑 키 확정 → grouping apply WO | migration/service |
| 4 | CHECK-C: HFF API grain 조사 | grain 리포트 |
| 5 | 결정 3: HFF Extension 설계·신설 WO | entity/migration |

---

*Assessment by Claude Code — 원 제안서 `PROPOSAL-O4O-PRODUCT-STRUCTURE-REFINEMENT-FOR-MFDS-PUBLIC-DATA-V1` 대비.*
