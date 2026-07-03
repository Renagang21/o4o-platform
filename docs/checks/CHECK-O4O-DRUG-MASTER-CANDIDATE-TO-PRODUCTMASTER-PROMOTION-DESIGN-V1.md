# CHECK-O4O-DRUG-MASTER-CANDIDATE-TO-PRODUCTMASTER-PROMOTION-DESIGN-V1

> 작업: **CHECK-O4O-DRUG-MASTER-CANDIDATE-TO-PRODUCTMASTER-PROMOTION-DESIGN-V1**
> 성격: **read-only 설계 CHECK** — 코드/DB/migration 변경 0, ProductMaster/ProductIdentifier/RepresentativeProduct 생성 0, ProductCandidate apply 0.
> 선행: `06e007fb1`(표준상품 대표상품 그룹핑), `CHECK-O4O-EASY-DRUG-TO-DRUG-MASTER-OFFLINE-MATCH-SIMULATION-V1`, `CHECK-O4O-DRUG-CANDIDATE-IMPORT-PIPELINE-V1`.
> 목적: 약가마스터 `ProductCandidate` → `ProductMaster` / `ProductIdentifier` **승격 정책**을 실 apply 전에 코드/DB 구조 기준으로 확정한다.

---

## 0. 요약 (결정 5줄)

1. **승격 대상**: `active`(취소일자 공란) + **표준코드 GTIN check-digit 통과** row 만. `cancelled`/형식이상/check-digit fail 은 candidate 보존, Master 생성 보류.
2. **grain**: `ProductMaster` 1건 = **표준코드 1건** = 포장단위/SKU 1건. (파일 내 표준코드는 row당 유일 — sim §4.2)
3. **primary 식별자**: `ProductMaster.barcode = 표준코드`, `ProductIdentifier(KOREA_DRUG_CODE, isPrimary=true) = 표준코드`.
4. **UNIQUE 충돌 회피**: `mfds_product_id = HIRA:DRUG_MASTER:{표준코드}` (품목기준코드는 N개 표준코드가 공유 → UNIQUE 불가). 품목기준코드는 `ProductIdentifier(MFDS_CODE)` 로 저장.
5. **대표상품(representative_products) 자동 생성은 V1 보류.** 다제조사 그룹 flag 만 남기고, `e약은요` 설명 파생(SharedProductDescription)은 승격 이후 별도 WO.

---

## 1. 현재 구조 요약 (코드 실측)

### 1.1 `product_masters` (SSOT) — [ProductMaster.entity.ts](../../apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts), [20260301100000-ProductMasterCoreReset.ts](../../apps/api-server/src/database/migrations/20260301100000-ProductMasterCoreReset.ts)

| 컬럼 | 타입/제약 | 승격 시 관점 |
|---|---|---|
| `barcode` | `VARCHAR(14)` **NOT NULL**, `UNIQUE(uq_product_masters_barcode)`, **immutable** | GTIN. 표준코드(13자리) 투입 대상 — **check digit 필수** |
| `regulatory_type` | `VARCHAR(50)` **NOT NULL**, immutable | `'DRUG'` 고정 |
| `drug_category` | `VARCHAR(32)` nullable, **mutable** | `전문일반구분` → `rx`/`otc` 직접 확정 가능 |
| `regulatory_name` | `VARCHAR(255)` **NOT NULL**, immutable | `한글상품명` |
| `name` | `VARCHAR(255)` **NOT NULL** | `한글상품명` (canonical) |
| `manufacturer_name` | `VARCHAR(255)` **NOT NULL**, immutable | `업체명` |
| `mfds_permit_number` | `VARCHAR(100)` nullable, immutable | 약가마스터에 허가**번호** 컬럼 없음 → **null** |
| `mfds_product_id` | `VARCHAR(100)` **NOT NULL**, `UNIQUE(uq_product_masters_mfds_product_id)`, immutable | **`HIRA:DRUG_MASTER:{표준코드}`** |
| `specification` | `text` nullable | 규격/수량/제형/포장 합성 |
| `is_mfds_verified` | `boolean` default true | 공공데이터 원천 → `true` |
| `mfds_synced_at` | `timestamp` nullable | `sourceBaseDate` |
| `representative_product_id` | `uuid` nullable, `SET NULL` | **V1 미지정(null)** |
| `tags` | `jsonb default '[]'` | import 추적 태그 저장처 (아래 §11) |

> ⚠️ ProductMaster 에는 `metadata jsonb` 컬럼이 **없다**. import 추적은 `tags`(배열) + `ProductIdentifier.metadata`(jsonb) 로만 가능.
> Immutable 필드 런타임 Guard: `catalog.service.ts` `MASTER_IMMUTABLE_FIELDS = [barcode, regulatoryType, regulatoryName, manufacturerName, mfdsPermitNumber, mfdsProductId]`.

### 1.2 `product_identifiers` (additive 계층) — [ProductIdentifier.entity.ts](../../apps/api-server/src/modules/neture/entities/ProductIdentifier.entity.ts)

- `ProductMaster 1 : N`. 전역 UNIQUE 없음. 중복 방지 = partial unique `(product_master_id, identifier_type, normalized_value, deleted_at IS NULL)`.
- 유형(varchar union): `KOREA_DRUG_CODE`(표준코드), `MFDS_CODE`(품목기준코드), `KOREA_INSURANCE_CODE`(제품코드 개정후), `ATC_CODE`, `INTERNAL_O4O`, `GTIN/EAN13/UPC/JAN` …
- `verification_status`: `imported` 사용 예정.
- `metadata jsonb`: import batch 추적 저장처.
- `ProductIdentifierService.addIdentifier` 는 idempotent (동일 master+type+normalized 활성 row 재사용). `setPrimaryIdentifier` 존재. **단 `ProductMaster.barcode` 와의 동기화는 서비스가 하지 않음(별도 책임).**

### 1.3 `product_candidates` (완충 큐) — [ProductCandidate.entity.ts](../../apps/api-server/src/modules/neture/entities/ProductCandidate.entity.ts)

약가마스터 import 시 채워지는 값 (mapper 기준):

| candidate 필드 | 약가마스터 원천 |
|---|---|
| `identifierType` / `identifierValue` / `normalizedIdentifierValue` | `KOREA_DRUG_CODE` / 표준코드(형식통과분) |
| `candidateName` | 한글상품명 |
| `candidateManufacturer` | 업체명 |
| `candidateCategory` | 전문일반구분 |
| `candidateSpec` | 약품규격 |
| `candidateUnit` | 포장형태(결측 시 null) |
| `rawPayload.source` | **22컬럼 무손실 원본** |
| `rawPayload.{standardCode,mfdsCode,atcCode,groupKey,isCancelled,cancelledAt,reviewFlags,manufacturerCount,multiManufacturerDetected,sourceBaseDate,rowNumber}` | 승격 입력 |

- `candidate_status` union 에 이미 `approved_new_master` 존재.
- **승격 경로는 아직 미구현**: `product-candidate.service.ts` `approveAsNewProductMaster()` = `throw NOT_IMPLEMENTED` (guarded skeleton). 즉 본 설계가 그 skeleton 을 채우는 후속 WO 의 기준선이다.

### 1.4 GTIN — [gtin.ts](../../apps/api-server/src/utils/gtin.ts)

- `validateGtin(barcode)`: 숫자-only + 길이 8/12/13/14 + **check digit** 검증. 실패 시 사유 문자열, 통과 시 null.
- **핵심 gap**: import mapper 의 표준코드 검증은 `/^\d{13}$/` (형식만). offline sim `invalidStandardCodeRows=0` 도 형식 기준. **check digit 유효성은 아직 어디서도 확인 안 됨.** `product_masters.barcode` 는 GTIN semantics 이므로 승격 시 `validateGtin()` 을 **반드시** 통과시켜야 하며, check-digit fail 은 별도 skip 사유로 집계한다.

### 1.5 대표상품 — [RepresentativeProduct.entity.ts](../../apps/api-server/src/modules/neture/entities/RepresentativeProduct.entity.ts)

- `display_name` 만 필수, `manufacturer_name` **nullable(자동파생 금지 — 동일 품목기준코드 다업체 혼입)**. 문서 원칙에 "자동생성/backfill/공공데이터 import 는 범위 아님" 명시. → V1 승격에서 생성하지 않는다.

---

## 2. 승격 대상 row 기준 (결정)

| 분류 | 조건 | V1 처리 |
|---|---|---|
| **eligible** | `취소일자` 공란 AND 표준코드 13자리 AND `validateGtin` 통과 | ✅ Master 승격 |
| skippedCancelled | `취소일자` 존재 | ⏸ candidate 보존, Master 생성 안 함 |
| skippedMissingStandardCode | 표준코드 결측/형식이상(`/^\d{13}$/` 실패) | ⏸ candidate 보존 (식별자 없음) |
| skippedInvalidStandardCode | 형식통과 but **check digit fail** | ⏸ candidate 보존 + `reviewFlags` 에 기록 |
| skippedMissingRequired | `한글상품명` 또는 `업체명` 결측 (NOT NULL 위반) | ⏸ candidate 보존 |

**근거**: sim §4.2 — 약가마스터 취소 row 74,680(24.4%). 설명/이미지는 active SKU 에만 붙어야 함(sim §7-4). cancelled 를 Master 로 만들면 catalog 오염 + 중단품 노출 위험.

> `취소일자` 는 mapper `rawPayload.isCancelled` / `rawPayload.cancelledAt` 로 이미 보존됨 → apply 시 재파싱 불필요.

---

## 3. ProductMaster grain 결정

- **1 표준코드 = 1 ProductMaster.** 표준코드는 파일 전역 유일(sim: distinctStandardCode 305,522 = totalRows). → 파일 내 barcode 충돌 없음.
- 표준코드 없는 row 는 **승격 보류**(barcode NOT NULL 이라 대상 불가). INTERNAL_O4O 대체코드 자동생성은 V1 금지(중단품/불완전 데이터에 인공 barcode 부여 지양).
- 표준코드 중복/형식이상 → §2 skip.

---

## 4. ProductMaster 필드 매핑표 (결정)

| ProductMaster 컬럼 | 값 | 비고 |
|---|---|---|
| `barcode` | `표준코드` | **`validateGtin` 통과 필수**. 실패 시 미승격 |
| `regulatory_type` | `'DRUG'` | 약가마스터 = 의약품 |
| `drug_category` | `전문` → `rx` / `일반` → `otc` / 그외·결측 → `drug_unspecified` | `전문일반구분` 직접 사용 (아래 §7) |
| `regulatory_name` | `한글상품명` | immutable |
| `name` | `한글상품명` | canonical |
| `manufacturer_name` | `업체명` | immutable. 결측 시 미승격 |
| `mfds_permit_number` | **`null`** | 약가마스터에 허가**번호** 컬럼 없음(`품목허가일자`만 존재) |
| `mfds_product_id` | **`HIRA:DRUG_MASTER:{표준코드}`** | UNIQUE 충돌 회피 (§4.1) |
| `specification` | `약품규격` + `제품총수량` + `제형구분` + `포장형태` 합성 | §6 fallback |
| `is_mfds_verified` | `true` | 공공데이터 원천(심평원/식약처) |
| `mfds_synced_at` | `sourceBaseDate`(예 2025-10-31) | rawPayload 보존값 |
| `representative_product_id` | `null` | V1 미지정 |
| `tags` | `['import:hira-drug-master', 'src:{sourceLabel}']` 등 | import 추적 (§11) |
| `origin_country` / `brand_*` / `category_id` | `null` | 약가마스터 미제공 |

### 4.1 `mfds_product_id` = `HIRA:DRUG_MASTER:{표준코드}` (핵심 결정)

- **품목기준코드 사용 불가**: sim §5 — itemSeq 1개당 평균 4.08 표준코드 → 품목기준코드는 N개 row 가 공유. `mfds_product_id UNIQUE` 위반 확정.
- **표준코드 그대로 사용 지양**: barcode 와 값 중복(혼동) + 향후 비-약가 소스와 네임스페이스 충돌. → source-prefixed 문자열.
- `VARCHAR(100)` 한도 충분(`HIRA:DRUG_MASTER:` 16자 + 13 = 29자).
- 기존 catalog 경로(`resolveOrCreateMaster`)는 MFDS 미연동 시 `mfds_product_id = barcode` 를 쓰므로, prefix 네임스페이스는 그 경로와도 충돌하지 않음(barcode = 표준코드 순수 숫자 vs `HIRA:...`).

---

## 5. ProductIdentifier 매핑표 (결정)

| identifier_type | value | isPrimary | verification_status | 조건 |
|---|---|:---:|---|---|
| `KOREA_DRUG_CODE` | 표준코드 | **true** | `imported` | 항상 (primary, barcode mirror) |
| `MFDS_CODE` | 품목기준코드 | false | `imported` | 항상 (그룹핑/e약은요 매칭 축) |
| `KOREA_INSURANCE_CODE` | `제품코드(개정후)` | false | `imported` | 값 존재 시 |
| `ATC_CODE` | `국제표준코드(ATC코드)` | false | `imported` | 값 존재 시 |

- **primary = `KOREA_DRUG_CODE`(표준코드)** = `ProductMaster.barcode` mirror. `isPrimary=true` 는 이 하나만.
- `EAN13/GTIN` 을 별도로 만들지 않음 — 표준코드는 `KOREA_DRUG_CODE` 로만 저장(의미 명확). barcode 컬럼이 GTIN 검증을 이미 담당.
- 중복 identifier: `addIdentifier` idempotent → 재실행 안전.
- **동일 값이 타 master 에 존재**(예: 기존 O4O barcode 와 표준코드 우연 일치) → `verification_status='conflict'` 로 기록 + apply report `wouldConflict*` 집계. 자동 강제 링크 금지.
- `metadata`: `{ sourceType:'drug_master_import', sourceLabel, sourceBaseDate, sourceRowNumber, dataset:'HIRA_DRUG_MASTER' }` (§11 rollback 추적).
- `country`: `'KR'`.

> normalize 규칙(util): `KOREA_DRUG_CODE`/`MFDS_CODE` 등 비-바코드류는 `공백·하이픈·언더바·점 제거 + 대문자`. 표준코드/품목기준코드는 숫자열이라 사실상 trim 과 동일.

---

## 6. specification / package fallback (결정)

합성 규칙:

```
specification = [약품규격, 제품총수량, 제형구분, 포장형태] 중 non-null 을 구분자로 조인
```

- **포장형태 결측(약 35%)** → 포장형태만 빼고 나머지로 합성. `candidateUnit`(포장형태) null 이어도 **승격 허용**(name/manufacturer/표준코드가 있으면 충분).
- 전부 결측이면 `specification = null` 허용(nullable 컬럼).
- **결측이 승격 차단 사유가 아니다** — 차단은 §2(표준코드/필수필드/취소)만.

---

## 7. drugCategory / regulatoryType (결정)

| 전문일반구분 | drug_category | 근거 |
|---|---|---|
| `전문` | `rx` | 약가마스터가 OTC/Rx 를 **직접 제공** |
| `일반` | `otc` | 동일 |
| 그외/결측 | `drug_unspecified` | 보수 처리 |

- `regulatory_type = 'DRUG'` 고정. `QUASI_DRUG`(의약외품)와 혼동 없음 — 약가마스터는 의약품 표준코드 데이터셋.
- **중요**: [product-type.util.ts](../../apps/api-server/src/modules/neture/utils/product-type.util.ts) 는 "regulatoryType 이 DRUG 까지만 구분 → OTC/Rx 미구분 → drug_unspecified" 한계를 전제로 하나, **약가마스터는 `전문일반구분` 으로 이 한계를 데이터로 해소**한다. 따라서 승격 시 `drug_category` 를 `unspecified` 로 두지 말고 확정값으로 채운다.
- 허용값 정합: `PRODUCT_DRUG_CATEGORIES = [non_drug, otc, rx, quasi_drug, drug_unspecified]` — `rx`/`otc` 모두 유효.
- **Rx Master 도 승격한다**(catalog SSOT 목적). 단 **판매/노출 권한을 여는 것이 아니다** — `ProductDrugExtension`(보수 기본값: pharmacy_only, online_sale_allowed=false, public_display_policy=blocked) 은 **V1 미생성**(설명 파생 WO 로 분리). 즉 승격 = SSOT 등록만, 노출 게이트는 후속.

---

## 8. 다제조사 / 대표상품 (결정)

- sim §5.2 — 매칭 itemSeq 의 10%(476건)가 다제조사. mapper 가 이미 `rawPayload.manufacturerCount` / `multiManufacturerDetected` 주입.
- **표준코드 grain 이라 manufacturer_name 은 row 업체명 그대로 저장 → 다제조사 문제는 Master 층에서 발생하지 않음**(각 표준코드가 자기 업체를 가짐).
- **representative_products 자동 생성 V1 보류.** 근거: RepresentativeProduct 문서 원칙(자동파생/공공데이터 import 범위 아님) + manufacturer_name 단일화 위험.
- V1 산출: 품목기준코드별 그룹 flag(`multiManufacturerDetected`)만 report/candidate 에 유지. 대표상품 생성 시점 = **별도 WO**(품목기준코드 그룹 → RepresentativeProduct 1건, member Master 들 `representative_product_id` 링크).

---

## 9. 기존 Master 충돌 처리 (결정)

| 충돌 축 | 감지 | V1 처리 |
|---|---|---|
| `barcode`(표준코드) 동일 Master 존재 | `getProductMasterByBarcode` | **link**(기존 Master 재사용) + 누락 identifier(MFDS/보험/ATC) additive 부착. immutable 필드 덮어쓰기 **금지** |
| `mfds_product_id`(`HIRA:...`) 동일 존재 | UNIQUE 조회 | 재실행 idempotent → skip(이미 승격) |
| `ProductIdentifier` 동일 normalized 가 **다른** master 에 | `findByNormalizedValue` | `verification_status='conflict'` 기록 + report 집계, 자동 병합 안 함(운영자 검토) |

- 원칙: **immutable 필드 자동 덮어쓰기 절대 금지**(Guard 존재). 값 불일치 발견 시 candidate `reviewNote`/report 에 기록만.
- link 시 candidate: `candidateStatus='matched'` 또는 `linked`, `matchedProductMasterId` 세팅.
- 신규 생성 시 candidate: `candidateStatus='approved_new_master'`, `matchStatus='manually_matched'`(또는 승격 전용 값 신설은 후속).

---

## 10. dry-run report 형식 (결정)

승격 구현 WO 는 apply 전 아래 report 를 낸다(기존 `DrugImportReport` 패턴 재사용):

```
{
  mode: 'dry-run' | 'apply',
  sourceLabel, sourceBaseDate,
  totalCandidates,            // 대상 candidate 수
  eligibleActive,             // §2 eligible
  skippedCancelled,
  skippedMissingStandardCode,
  skippedInvalidStandardCode, // check-digit fail (신규 집계 — mapper 형식검증과 구분)
  skippedMissingRequired,     // name/manufacturer 결측
  wouldCreateMaster,
  wouldLinkExistingMaster,
  wouldCreateIdentifiers: { KOREA_DRUG_CODE, MFDS_CODE, KOREA_INSURANCE_CODE, ATC_CODE },
  wouldConflictBarcode,
  wouldConflictMfdsProductId,
  wouldConflictIdentifierCrossMaster,
  multiManufacturerGroups,
  packageMissingCount,
  errors: [{ standardCode, reason }]
}
```

- **dry-run 기본**, `--apply` 명시 시에만 write (import 파이프라인 안전 경계 계승).
- offline(DB 미연결) dry-run 은 파일 내부 판정만(충돌/link 예측 제외, created 는 상한값)으로 표기.

---

## 11. rollback / 추적 설계 (결정)

ProductMaster 에 `metadata` 컬럼이 없으므로 **추적 앵커를 이원화**한다:

1. `ProductMaster.tags` 에 추적 태그 append: `import:hira-drug-master`, `src:{sourceLabel}`(예 `src:...20251031`).
2. `ProductIdentifier.metadata`(jsonb) 에 batch 상세: `{ sourceType:'drug_master_import', sourceLabel, sourceBaseDate, sourceRowNumber, dataset:'HIRA_DRUG_MASTER' }`.
3. `ProductIdentifier.sourceType='drug_master_import'` + `sourceLabel` 로 batch 조회 가능.

**rollback 규칙**:
- **신규 생성 Master**: `tags @> ['import:hira-drug-master']` AND 해당 sourceLabel identifier 로 식별 → Master + 그 CASCADE(identifiers/images) 삭제 가능.
- **기존 Master 에 부착한 identifier**: Master 는 남기고 `sourceType='drug_master_import'` + sourceLabel 인 identifier 만 soft-delete(`deleted_at`).
- rollback CLI 자체는 **별도 WO**(본 설계는 추적 앵커만 확정).
- 주의: 승격 Master 에 offer/listing 이 붙은 뒤에는 `ON DELETE RESTRICT`(supplier_product_offers.master_id) 로 삭제 차단됨 → rollback 은 offer 부착 전에만 안전. report 에 "링크 발생 후 rollback 불가" 명시.

---

## 12. 코드/DB 정합 검증 결과

| 가설(작업요청 §권장 결론) | 정합 | 근거 |
|---|:---:|---|
| active row 만 승격 | ✅ | `rawPayload.isCancelled` 보존, sim §7-4 |
| grain = 표준코드 1건 | ✅ | 표준코드 row당 유일(sim §4.2) |
| barcode = 표준코드 | ⚠️ **조건부** | barcode 는 GTIN → **check digit 검증 필수**(gtin.ts). 형식만 통과한 표준코드는 불충분 |
| mfds_product_id = `HIRA:DRUG_MASTER:{표준코드}` | ✅ | 품목기준코드 공유로 UNIQUE 불가, VARCHAR(100) 여유 |
| 품목기준코드 = ProductIdentifier(MFDS_CODE) | ✅ | union 에 `MFDS_CODE` 존재 |
| 대표상품 자동생성 V1 보류 | ✅ | RepresentativeProduct 문서 원칙 |
| e약은요 설명 = 후속 SharedProductDescription | ✅ | master 선행 필요(sim §7-3/7-4), `shared_product_descriptions` 테이블 존재 |

**추가 발견(가설 밖)**:
- `drug_category` 를 `전문일반구분` 으로 **확정** 가능 → `drug_unspecified` 로 두지 말 것(데이터 우위).
- `mfds_permit_number` 는 약가마스터에 없음 → **null**(가설 미언급, 명시 필요).
- ProductMaster 에 `metadata` 없음 → 추적은 `tags` + identifier.metadata 이원화(§11).
- 승격 경로(`approveAsNewProductMaster`)는 현재 `NOT_IMPLEMENTED` → 본 설계가 그 구현 기준선.

---

## 13. 다음 구현 WO 제안

**WO-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-DRYRUN-V1** (권장 착수)
- 범위: 약가마스터 candidate(또는 CSV 직결) → **승격 dry-run report(§10) 생성**. write 0.
- 산출: PURE 판정기(eligible/skip 분류 + `validateGtin` check-digit) + report + 단위테스트. 실 전체파일 1회 dry-run 수치.
- 목적: `skippedInvalidStandardCode`(check-digit fail) 실측 — barcode 정책 확정의 마지막 미지수 해소.

**후속(순서 고정)**:
1. `PROMOTION-APPLY-V1` — `approveAsNewProductMaster` skeleton 구현(§2~9 정책, `--apply`, idempotent, 충돌 report). 프로덕션 apply 는 사용자 승인.
2. `SHARED-PRODUCT-DESCRIPTION-DERIVE-V1` — e약은요 itemSeq → 품목기준코드 그룹 master 들에 설명 1벌 파생(sim §7-3, 모수 4,757 전량).
3. `REPRESENTATIVE-PRODUCT-GROUPING-V1` — 품목기준코드 그룹 → RepresentativeProduct + member link(§8).
4. `IMAGE-COPY-V1` — 이미지 보유 itemSeq 2,789(58.6%) → member master ProductImage 복사(sim §7-5).
5. `PROMOTION-ROLLBACK-CLI-V1` — §11 앵커 기반 rollback CLI.

---

## 14. 금지/완료 기준 준수

- 코드 변경 0 / DB 변경 0 / migration 0 / ProductMaster·Identifier 생성 0 / candidate apply 0.
- 산출물 = 본 CHECK 문서 1건. raw 대용량/serviceKey 없음.
- 결론: **§0 결정 5줄 + §4 매핑표 + §10 report 형식**으로 승격 정책 확정. 다음 착수 = **PROMOTION-DRYRUN-V1**(check-digit 실측).
