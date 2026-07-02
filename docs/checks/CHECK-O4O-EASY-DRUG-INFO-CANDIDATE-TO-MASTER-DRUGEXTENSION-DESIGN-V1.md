# CHECK-O4O-EASY-DRUG-INFO-CANDIDATE-TO-MASTER-DRUGEXTENSION-DESIGN-V1

> **작업명**: CHECK-O4O-EASY-DRUG-INFO-CANDIDATE-TO-MASTER-DRUGEXTENSION-DESIGN-V1
> **일자**: 2026-07-02 · **성격**: read-only 설계 CHECK (코드/DB/migration/import/git 변경 0, 산출물 = 본 문서 1개)
> **선행**: `CHECK-O4O-EASY-DRUG-INFO-CANDIDATE-IMPORT-V1`(e약은요 → ProductCandidate dry-run, commit de3e0964a), `CHECK-O4O-DRUG-STANDARD-CODE-CSV-SAMPLE-MAPPING-V1`(약가마스터 305,522행 전수 실측), `IR-O4O-STANDARD-PRODUCT-REPRESENTATIVE-GROUPING-AND-STORE-CONTENT-DIRECTION-V1`, `IR-O4O-DRUG-STANDARD-CODE-CANDIDATE-IMPORT-DESIGN-V1`
> **최우선 원칙**: **포장단위(SKU) ≠ 설명단위(품목/itemSeq)**. e약은요는 ProductMaster 승격 소스가 아니라 **itemSeq(=품목기준코드) 기준 공통 공식 소비자 설명·이미지 소스**다.

---

## 1. 조사 대상 (존재 여부 — read-only 실측)

| 대상 | 경로 | 존재 | 핵심 실측 |
|---|---|:---:|---|
| ProductCandidate | `entities/ProductCandidate.entity.ts` | ✅ | 후보 큐. 전역 UNIQUE 없음. `matched_product_master_id`(단방향 nullable), `identifier_type/value/normalized`, `raw_payload`(jsonb), status enum에 `matched/linked/approved_new_master/merged` |
| ProductMaster | `entities/ProductMaster.entity.ts` | ✅ | **포장단위/SKU SSOT**. `barcode` UNIQUE(GTIN 14), `mfds_product_id` **UNIQUE·immutable**, `representative_product_id` nullable FK, `drugExtension` 1:1 |
| ProductIdentifier | `entities/ProductIdentifier.entity.ts` | ✅ | Master 1:N additive. enum에 **`MFDS_CODE`/`KOREA_DRUG_CODE`/`ATC_CODE`** 실존. 전역 UNIQUE 없음, `(master_id,type,normalized_value)` partial unique만 |
| **ProductDrugExtension** | `entities/ProductDrugExtension.entity.ts` | ✅ | **`product_master_id` UNIQUE(1:1)** (`@Column({unique:true})` L59). **설명 컬럼 존재**: `efficacy_text/dosage_text/caution_text/storage_text/contraindication_text/ingredient_summary`. 식별(`mfds_code/drug_code/insurance_code/atc_code`)·정책(`pharmacy_only/customer_display_allowed/tablet_display_allowed/online_sale_allowed/advertising_review_status/public_display_policy`) 컬럼 보유 |
| ProductImage | `entities/ProductImage.entity.ts` | ✅ | `master_id`(Master 1:N). `image_url`(text) + **`gcs_path`(text, NOT NULL)**, `is_primary`, `type: thumbnail\|detail\|content`. itemSeq 등 상위 키 없음 |
| RepresentativeProduct | `entities/RepresentativeProduct.entity.ts` | ✅ | `representative_products`. **`display_name`(유일 NOT NULL)** + `manufacturer_name`/`thumbnail_image_id`/`metadata`(jsonb) nullable. **`product_group` 컬럼 부재**(그룹핑 키 전용 컬럼 없음 → metadata에 담아야 함). `productMasters` OneToMany |
| SharedProductDescription | `entities/SharedProductDescription.entity.ts` + migration `20261114000000` | ✅ | `shared_product_descriptions`. **키축 = `master_id`(ProductMaster) NOT NULL FK**. `content`/`summary`, `source_type`(enum에 **`drug_extension`/`migration`/`operator` 실존**), `status`(candidate/canonical/…), **canonical partial-unique = master당 1개**. **itemSeq/품목기준코드 기준 컬럼은 없음** |
| shared-product-description.service | `services/shared-product-description.service.ts` | ✅ | `createCandidate`(sanitize on write), `setCanonical`(트랜잭션 강등), **`seedFromDrugExtension(masterId)`** — DrugExtension 텍스트 조합 → `source_type='drug_extension'`, `status='needs_review'`(법적 검수). masterId 단위 |
| drug-import (약가마스터) | `neture/drug-import/drug-*.ts` | ✅ | `drug-master-csv.parser`/`drug-master-row.mapper`/`drug-candidate-import.service` |
| drug-import (e약은요) | `neture/drug-import/easy-drug-info-*.ts` | ✅ | parser/mapper/service (선행 WO 산출) |
| image-storage 버킷 | (MEMORY 이력) | ⚠ | 과거 `o4o-neture-product-images` 부재 → 실버킷 `o4o-media-library`. 이미지 GCS 사본 시 버킷 정합 확인 필수 |

### 참조 문서 존재 여부
- 존재: `CHECK-O4O-EASY-DRUG-INFO-CANDIDATE-IMPORT-V1`, `CHECK-O4O-DRUG-STANDARD-CODE-CSV-SAMPLE-MAPPING-V1`, `IR-O4O-STANDARD-PRODUCT-REPRESENTATIVE-GROUPING-AND-STORE-CONTENT-DIRECTION-V1`, `IR-O4O-DRUG-STANDARD-CODE-CANDIDATE-IMPORT-DESIGN-V1`.
- **부재**: `CHECK-O4O-PUBLIC-PRODUCT-SEED-END-TO-END-DESIGN-AUDIT-V1`, `CHECK-O4O-PUBLIC-PRODUCT-SEED-COLLECTION-DECISION-V1`, `IR-O4O-CURRENT-PRODUCT-STRUCTURE-FOR-PUBLIC-SEED-V1` — repo에 없음(참조 불가).

---

## 2. e약은요 candidate 필드 요약 (선행 CHECK 기준)

- 4,774행 / distinct itemSeq **4,757** / 파일내 중복 **17** / 이미지 present **2,806(59%)** / missing **1,968** / officialConsumerText present **100%**.
- 매핑(ProductCandidate): `itemSeq→identifier(MFDS_CODE)+normalized`, `itemName→candidateName`, `entpName→candidateManufacturer`, `itemImage→candidateImageUrl`, `source_type='external_api'`, `source_label='MFDS_EASY_DRUG_INFO'`.
- **officialConsumerText**(효능 efcy / 용법 useMethod / 경고 atpnWarn / 주의 atpn / 상호작용 intrc / 부작용 se / 보관 depositMethod)는 `candidate_*` 컬럼이 아니라 **`raw_payload.officialConsumerText`** 에 원문 보존. spec/unit은 항상 null.
- 즉 candidate 단계에서 e약은요는 **품목(itemSeq) 단위 설명·이미지 덩어리**이며, 포장/규격/총수량/표준코드 등 **SKU 확정 정보가 없다**.

---

## 3. 포장단위 vs 설명단위 분리 원칙 (핵심)

**결론: e약은요 itemSeq는 "설명 단위(품목)"이고 ProductMaster는 "포장 단위(SKU)"다. 둘은 1:N이며, e약은요는 Master를 만드는 소스가 아니라 여러 Master가 공유하는 공식 설명/이미지 소스다.**

근거(실측):
1. **grain 불일치.** 약가마스터 실측(CHECK-…-CSV §11)에서 **품목기준코드 1개당 표준코드(=포장/SKU) 2개 이상이 82.4%**, 최대 487개. 즉 한 itemSeq(=품목기준코드)에 다수의 ProductMaster가 정상적으로 대응한다. e약은요 itemSeq는 이 품목 레벨이다.
2. **DrugExtension은 Master당 1개(UNIQUE).** `ProductDrugExtension.product_master_id`는 `@Column({ unique:true })`(L59) + `@OneToOne`. **같은 itemSeq에 포장 3개면 DrugExtension도 3개 → 동일 효능/용법/주의가 3번 복사**된다. 정합성·갱신비용·법적문구 검수 중복 측면에서 **V1 무조건 복사 부적절**.
3. **officialConsumerText는 공식 원문**(식약처 e약은요)이지 매장 제작물이 아니다 → Store 설명 제작물(kpa_store_contents 등)과 **물리적으로 분리**된 영역에 두어야 한다(원문 불변, 매장 편집 대상 아님).

따라서 설계는 **"itemSeq 단위 공통 설명·이미지 계층 1곳에 저장 → 다수 ProductMaster가 참조/공유"** 구조여야 한다. Master별 복사(DrugExtension)는 최소화하거나 캐시/파생 수준으로만 허용한다.

---

## 4. 공통 설명 계층 A/B/C 비교·결론

| 안 | 저장 위치 | 키 축 | 중복 | 실 구조 적합성 |
|---|---|---|:---:|---|
| **A** | 각 Master의 `ProductDrugExtension`(설명 컬럼) | product_master_id(UNIQUE) | itemSeq당 N배 복사 | 구현 쉬움. 하지만 다포장 82.4%에서 N배 복사·N배 검수. **V1 부적절**(캐시 수준만) |
| **B** | `representative_products`(itemSeq→대표상품) | representative_product_id | 대표당 1회 | 개념 적합하나 **product_group 컬럼 부재** → itemSeq→대표 매핑을 metadata에 넣어야 하고, 대표상품 자동생성은 다제조사 7~8%(§9) 위험 → 운영자 검토 전제. 설명 저장 슬롯도 없음(display 메타뿐) |
| **C** | `shared_product_descriptions` | **master_id** (canonical per master) | (아래 단서) | 공용 설명 후보 풀·큐레이션·canonical 승격·sanitize·seedFromDrugExtension 이미 존재. **단 키축이 master_id라 "itemSeq 1곳 저장"과는 다름** |

### 결론: **C(SharedProductDescription)를 canonical 설명 저장소로 채택하되, itemSeq 공통 원문은 별도 원천(Candidate.raw_payload / 신설 itemSeq 원문 계층)에서 관리하고 C로 파생**하는 **C 우선 + 보완** 안.

핵심 단서(중요): `SharedProductDescription`은 **master_id 기준**이므로 "itemSeq 1행에 원문 1벌, 여러 Master가 그 1행을 참조"하는 순수 공유 저장소가 **아니다**. 그럼에도 C를 택하는 이유:
- SharedProductDescription은 이미 **큐레이션·canonical·sanitize·seed 파이프라인**을 갖춘 O4O 표준 설명 계층이고, `source_type='drug_extension'`/`'migration'`/`'operator'` union이 e약은요를 수용한다.
- e약은요 원문 자체(itemSeq 1벌)는 **ProductCandidate.raw_payload.officialConsumerText**에 이미 무손실 보존되어 있어, "itemSeq 원천 1벌"은 이미 존재한다(=사실상의 공통 원천 계층).
- 따라서 권장 구조는 **2계층**:
  - **원천(canonical source, itemSeq 1벌)** = ProductCandidate.raw_payload.officialConsumerText (이미 존재). 필요 시 이를 정규화한 경량 원문 테이블은 후속 판단.
  - **소비/큐레이션(master별)** = 승격된 각 ProductMaster에 대해 SharedProductDescription 후보를 **원천에서 파생 생성**(source_type='drug_extension' 또는 신설 'mfds_easy_drug', status='needs_review'). 여러 Master가 같은 itemSeq를 공유하더라도, **원문은 raw_payload 1벌에서 파생**되므로 "설명의 진실은 1곳"이 유지된다.

**A는 캐시 수준만 허용**(런타임 노출 최적화 목적, SSOT 아님). **B는 대표상품(그룹핑) 계층으로 유지하되 설명 저장소로 쓰지 않음**(product_group 부재·설명 슬롯 부재). → **최종: C 우선, 원천=raw_payload(itemSeq 1벌), 대표그룹핑=B(별도 축).**

---

## 5. ProductMaster 승격 A/B/C/D 결론

정책 후보: A(e약은요 단독 Master 생성) / B(약가마스터 표준코드 매칭 시만) / C(설명·보강 소스로만, Master 미생성) / D(내부코드 Master 생성 후 병합).

**itemSeq ↔ 약가마스터 체계 동일성(실측 근거):** CHECK-…-CSV §6·§9·§15에서 **품목기준코드 = `ProductIdentifier(MFDS_CODE)`**, e약은요 itemSeq도 선행 CHECK에서 **MFDS_CODE**로 매핑됨. 즉 **e약은요 itemSeq = 약가마스터 품목기준코드와 동일 체계(품목/허가 단위)** 로 취급 가능. 반면 **포장/SKU 식별은 표준코드(13자리, KOREA_DRUG_CODE)** 이며 **e약은요에는 표준코드가 없다**.

### 결론: **C 우선(설명·이미지 보강 소스, Master 미생성) + B 조건부(약가마스터 표준코드 매칭 시 그 Master에 설명·이미지 연결)**. A·D는 보류.

- **A 보류(단독 Master 생성 금지):** e약은요는 포장/규격/총수량/표준코드가 없어 **SKU를 확정할 수 없다**. itemSeq만으로 Master를 만들면 grain이 품목 레벨이 되어 "1 itemSeq = 1 Master"가 되고, 실제 다포장 82.4%와 충돌한다(과대표준화). 또 `mfds_product_id` UNIQUE라 후속 약가마스터 표준코드 유입 시 병합·충돌 처리 부담.
- **B 조건부 채택:** 약가마스터 표준코드 Master가 이미/장차 존재하고 그 Master의 품목기준코드(MFDS_CODE identifier)가 itemSeq와 일치하면, **e약은요 설명·이미지를 그 Master(들)에 연결**한다. Master는 약가마스터 축(표준코드=SKU)에서 생성되고, e약은요는 **보강**만 한다.
- **C 기본:** 표준코드 Master가 아직 없으면 e약은요는 **ProductCandidate로만 남아** 설명·이미지 원천을 보존하고 Master는 만들지 않는다(선행 CHECK와 동일 유지). 매칭될 Master가 생기면 그때 연결.
- **D 보류:** 내부코드 Master 생성 후 병합은 병합 로직·고아 Master 위험이 커서 V1 범위 밖.

요약: **Master의 grain·생성권한은 약가마스터(표준코드/SKU) 축이 갖고, e약은요는 itemSeq(품목) 축의 공식 설명·이미지 보강 소스**다.

---

## 6. ProductIdentifier 매핑

- **itemSeq → `ProductIdentifier(MFDS_CODE)`** (normalized = trim(itemSeq)). 약가마스터 품목기준코드와 **동일 type·동일 값 체계** → 두 소스가 같은 MFDS_CODE identifier로 **자연 조인**된다(§9).
- **sourceKind/데이터셋 보존:** identifier의 `source_type`(varchar 64)에 `'mfds_easy_drug_info'`, `source_label`에 `'MFDS_EASY_DRUG_INFO'`, `metadata`에 datasetId 등 보존. Candidate 단계에서는 이미 `raw_payload.sourceKind='easy_drug_info'`로 보존됨.
- **primary 가능성:** **아니오.** primary identifier는 `barcode` mirror(GTIN)여야 한다. MFDS_CODE는 품목 코드이지 유통 바코드가 아니므로 `is_primary=false`, `verification_status='imported'`.
- **중복 17건 처리:** 파일내 itemSeq 중복 17건은 candidate dedup(선행 §2 dedupKey)에서 skip됨 → distinct 4,757만 유효. identifier도 `(master_id, MFDS_CODE, normalized)` partial unique로 Master 연결 시 1개만.
- **barcode mirror 관계:** e약은요는 barcode를 제공하지 않으므로 barcode/primary는 **약가마스터 표준코드→내부 GTIN(prefix 200, INTERNAL_O4O) 또는 실제 GTIN** 경로가 담당. e약은요는 barcode 계층에 관여하지 않는다.

---

## 7. ProductDrugExtension 역할 재정의

- **실측:** DrugExtension은 `product_master_id` **UNIQUE(1:1)** 이고 **설명 컬럼(efficacy/dosage/caution/storage/contraindication/ingredient_summary)이 실재**한다. 즉 스키마상 설명을 담을 수는 있으나, itemSeq 다포장에서 **Master 수만큼 원문 복사**가 발생한다.
- **재정의 결론:** DrugExtension은 **SKU별 규제·약가·노출 정책·식별(mfds_code/drug_code/insurance_code/atc_code, verification, pharmacy_only, customer_display_allowed, tablet/online, advertising/public policy)** 을 담는 계층으로 사용한다.
- **설명 컬럼은 "요약/파생 캐시" 수준으로만** 허용하고 **설명 SSOT로 쓰지 않는다.** e약은요 officialConsumerText의 진실은 **원천(raw_payload) → SharedProductDescription(C)** 경로가 갖는다. DrugExtension.efficacy_text 등에 무조건 복사 저장은 **V1 보류**.
- 참고: 이미 `seedFromDrugExtension(masterId)`가 DrugExtension 텍스트를 SharedProductDescription 후보(`status='needs_review'`)로 흡수하는 경로가 있으므로, e약은요→SharedProductDescription 직행이 **DrugExtension 경유보다 중복이 적다**(원천 1벌에서 master별 후보 파생).

---

## 8. ProductImage / 공통 이미지

- **실측:** `ProductImage`는 `master_id`(Master 1:N) 기준이며 **itemSeq/품목 상위 키가 없다**. `gcs_path`가 **NOT NULL** → 외부 URL 직접저장 불가, **GCS 사본이 사실상 강제**.
- **결론(itemSeq 공통 이미지):** e약은요 itemImage는 **itemSeq(품목) 단위 공통 이미지**로 취급하되, 물리 저장은 Master별 ProductImage로 **파생 복사**한다(itemSeq 공통 이미지 전용 테이블은 신설하지 않음 — grain은 대표상품/원천에 두고 소비는 Master).
  - itemSeq 공통 이미지의 원천 참조 = ProductCandidate.candidateImageUrl / raw_payload.itemImage(이미 보존).
  - 대표상품(RepresentativeProduct)이 있으면 `thumbnail_image_id`로 대표 썸네일 지정 가능(대표 단위 공통 노출).
- **URL 직접 vs GCS 사본:** **GCS 사본 필수**(gcs_path NOT NULL + 외부 `nedrug.mfds.go.kr` 직참조 회피). 버킷은 **`o4o-media-library`로 정합**(과거 `o4o-neture-product-images` 부재 이슈, MEMORY).
- **이미지 없음 1,968건 placeholder 시점:** import/승격 시 placeholder를 **만들지 않는다**(빈 ProductImage 금지 — gcs_path NOT NULL이라 더미 유발). 노출 계층(프론트)에서 이미지 부재 시 placeholder를 렌더한다. 즉 placeholder는 **DB가 아니라 UI 시점**.

---

## 9. 약가마스터 ↔ e약은요 조인 정책

- **체계 동일성:** e약은요 **itemSeq = 약가마스터 품목기준코드**(둘 다 MFDS_CODE, 품목/허가 단위). 약가마스터 **표준코드(13자리) = 포장/SKU(KOREA_DRUG_CODE)** 로 e약은요에는 없음.
- **조인 축:** `MFDS_CODE(=itemSeq=품목기준코드)`. 약가마스터가 한 품목기준코드에 여러 표준코드(Master)를 제공하므로, **e약은요 1건(itemSeq)이 약가마스터 다수 Master와 조인**된다(1:N).
- **Master 생성 기준:** **표준코드(약가마스터)** 가 Master를 만들고, e약은요는 그 Master 그룹(같은 품목기준코드)에 설명·이미지를 **1:N 보강**. e약은요 itemSeq만으로 Master 생성 금지(§5).
- **과대표준화/중복 위험:** e약은요 itemSeq만으로 Master를 만들면 **품목 레벨 Master**가 되어 약가마스터 표준코드 유입 시 (a)`mfds_product_id` UNIQUE 충돌 또는 (b)품목 Master 1개 + 포장 Master N개 **이중 grain 혼재**가 발생한다. → e약은요는 Master grain을 만들지 않는 것이 안전.
- **다제조사 주의:** 품목기준코드 그룹에 **7~8% 다제조사 혼입**(CHECK-…-CSV §13.1). e약은요 entpName을 대표상품 manufacturer로 단일 파생 시 부정확 → **대표상품 manufacturer_name 자동 단일 파생 금지**(비우거나 검토 플래그).

---

## 10. 추천 승격·연결 flow

```
[1] e약은요 raw JSONL
      → ProductCandidate(external_api, MFDS_CODE=itemSeq, raw_payload.officialConsumerText)  ← 선행 WO(이미 구현, --apply 대기)

[2] itemSeq(MFDS_CODE) 로 매칭
      ├─ (a) 같은 MFDS_CODE 를 가진 ProductMaster(들) 존재?  (약가마스터 표준코드 Master 축)
      │        YES → 그 Master 그룹(1:N)에 연결 대상 확정 → [3]
      │        NO  → candidate 로 대기(status=pending/matched). Master 생성 안 함(C 기본). 종료
      └─ 매칭은 ProductIdentifier(MFDS_CODE) 조회로 수행 (candidate.matched_product_master_id 는 대표 1건만 담김 → 다건은 서비스 로직에서 그룹 처리)

[3] 공통 설명 계층 저장 (원천 1벌 → master별 파생)
      원천(itemSeq 1벌) = candidate.raw_payload.officialConsumerText  (이미 존재)
      각 매칭 Master 마다:
        SharedProductDescription.createCandidate(
           masterId, content=officialConsumerText 조합,
           source_type='drug_extension'|'mfds_easy_drug'(신설), status='needs_review')
        → 큐레이션 후 setCanonical (master당 1개)
      * DrugExtension 설명 컬럼 무조건 복사 X (정책/식별만)

[4] 이미지 (itemSeq 공통 → master별 파생)
      itemImage 있으면 GCS 사본(o4o-media-library) → 각 매칭 Master 의 ProductImage(is_primary/type=thumbnail)
      대표상품 있으면 thumbnail_image_id 지정
      이미지 없음(1,968) → DB placeholder 안 만듦(UI 시점 처리)

[5] 대표상품(선택, 별도 축)
      약가마스터 품목기준코드 그룹핑으로 RepresentativeProduct(운영자 검토 전제)
      → itemSeq↔대표 매핑은 metadata(product_group 컬럼 부재)
      → e약은요 설명/이미지를 대표 단위 공통 노출로 승격(후속)
```

핵심: **Master는 약가마스터(표준코드) 축이 만들고, e약은요는 itemSeq(MFDS_CODE)로 그 Master 그룹에 붙어 설명·이미지를 1:N 보강한다. 설명의 진실은 원천 1벌(raw_payload) → SharedProductDescription으로 흐른다.**

---

## 11. ProductMaster 직접생성 위험 (요약)

1. **grain 파괴** — itemSeq(품목)로 Master 생성 시 포장(SKU) grain과 이중화, 다포장 82.4%와 충돌.
2. **`mfds_product_id` UNIQUE 충돌** — 품목기준코드를 Master UNIQUE 컬럼에 넣으면 후속 표준코드 다포장 유입 시 광범위 충돌.
3. **표준코드/포장/규격 부재** — e약은요엔 SKU 확정 정보 없음 → 무의미·불완전 Master 양산.
4. **설명 N배 복사** — DrugExtension 1:1 UNIQUE로 다포장 시 원문 중복·검수 중복.
5. **다제조사 혼입 7~8%** — 대표/제조사 자동 단일 파생 부정확.
6. **Core 동결(CLAUDE.md §3)** — product_masters 직접 대량 생성은 명시적 WO·소비처 영향평가 필요.

→ **e약은요 단독 ProductMaster 대량 생성은 보류.**

---

## 12. 다음 WO 제안

1. **WO-O4O-EASY-DRUG-INFO-CANDIDATE-APPLY-V1** — 선행 dry-run(4,757 distinct)을 dev/local DB `--use-db` dry-run으로 update 예측 확인 후 `--apply`. `product_candidates` INSERT/UPDATE만. (사용자 승인 + DB 연결 전제)
2. **WO-O4O-EASY-DRUG-INFO-DESCRIPTION-LINK-V1** — candidate(MFDS_CODE)로 매칭된 Master(들)에 **SharedProductDescription 후보 파생 생성**(source_type 신설 `'mfds_easy_drug'` 또는 기존 `'drug_extension'` 재사용, status='needs_review'). 원천=raw_payload.officialConsumerText 1벌. DrugExtension 설명 복사 없음.
3. **WO-O4O-EASY-DRUG-INFO-IMAGE-COPY-V1** — itemImage 2,806건 GCS 사본(`o4o-media-library`) → 매칭 Master ProductImage. 이미지 없음 1,968 placeholder=UI 시점.
4. **WO-O4O-DRUG-STANDARD-CODE-CANDIDATE-IMPORT-V1** — 약가마스터 표준코드 → ProductCandidate(csv_import) → Master 승격 축 확립(Master grain의 주 소스). e약은요 link의 선행 인프라.
5. **(후속) WO-O4O-REPRESENTATIVE-PRODUCT-FROM-MFDS-GROUP-V1** — 품목기준코드 그룹핑 RepresentativeProduct(운영자 검토·다제조사 플래그), e약은요 설명/이미지 대표 단위 공통 노출.
6. **(선택 IR) 원천 정규화 판단** — raw_payload.officialConsumerText를 itemSeq 원문 경량 테이블로 승격할지(현재는 candidate 보존으로 충분).

---

## 부록. 완료 기준 자기점검

- ✅ **공통 설명 계층 결론(A/B/C)**: **C 우선(SharedProductDescription, master_id canonical) + 원천=Candidate.raw_payload(itemSeq 1벌) 파생. A=캐시만, B=대표 그룹핑 축(설명 저장 아님)**. 근거: SharedProductDescription의 큐레이션/canonical/sanitize/seedFromDrugExtension 실존, 단 키축이 master_id라 itemSeq 순수 공유가 아님 → 원천 1벌 파생 구조로 보완.
- ✅ **Master 승격 결론(A/B/C/D)**: **C 기본 + B 조건부. A/D 보류.** 근거: itemSeq=품목기준코드(MFDS_CODE, 동일 체계), 표준코드=SKU 부재 → Master grain은 약가마스터 축.
- ✅ **DrugExtension product_master_id UNIQUE**: 확인됨(L59 `unique:true` + OneToOne). 설명 컬럼 실재 → 다포장 N배 복사 문제 → 무조건 복사 V1 보류(정책/식별만).
- ✅ ProductIdentifier(MFDS_CODE, primary 아님)·이미지(GCS 사본 필수·버킷 o4o-media-library·placeholder=UI)·약가마스터 조인(MFDS_CODE 1:N, Master는 표준코드 축) 요지 도출.
- ✅ 다음 WO 6건 제안.
- ✅ **참조 부재**: PUBLIC-PRODUCT-SEED-END-TO-END / PUBLIC-PRODUCT-SEED-COLLECTION-DECISION / CURRENT-PRODUCT-STRUCTURE-FOR-PUBLIC-SEED 3건.
- ✅ **코드/DB/migration/import/git 무변경** — 본 문서 1개만 생성.

---

**작성:** O4O Platform 설계 CHECK · 2026-07-02 · read-only. 코드/DB/migration/import/git 변경 0. serviceKey·raw 미출력.
