# IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1

> 성격: **read-only 표준화 문서** — 코드/DB 변경 0. 의약품 약가마스터 seed 트랙에서 검증된 절차를
> O4O 공공상품 데이터 구축의 **공통 표준 프로세스**로 고정한다. 이후 의약외품·의료기기·건강기능식품·
> 화장품·생활용품 seed 를 여러 에이전트가 병렬 진행할 때의 기준선이다.
>
> 선행 완료: `CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1`(§11·§12), `CHECK-O4O-DRUG-CANDIDATE-IMPORT-PIPELINE-V1`,
> `CHECK-O4O-DRUG-MASTER-CANDIDATE-TO-PRODUCTMASTER-PROMOTION-DESIGN-V1`, `CHECK-O4O-DRUG-MASTER-PROMOTION-APPLY-BATCHING-V1`.
> 상위 규칙: `CLAUDE.md` §0(환경/DB), §4(E-commerce Core), §7(Boundary Policy).

---

## 1. 한 줄 결론

**의약품 약가마스터 seed 에서 검증된 절차 — `공공 raw → ProductCandidate(완충) → dry-run → 게이트 승인 → ProductMaster/ProductIdentifier 승격 apply → SQL 검증 → 문서화` — 를 모든 공공상품 분류의 표준 데이터 구축 프로세스로 고정한다.** Core(product_masters) 직접 적재를 금지하고, candidate 완충 계층을 반드시 경유한다.

### 의약품 트랙 확정 결과 (기준선)

| 항목 | 값 |
|---|---:|
| ProductCandidate 적재 | 305,522 |
| ProductMaster (HIRA) 생성 | 230,841 |
| ProductIdentifier 생성 | 703,483 |
| barcode 중복 | 0 |
| KOREA_DRUG_CODE 누락 master | 0 |
| conflict (barcode/mfdsProductId/idOtherMaster) | 0 |
| candidate 상태 | approved_new_master 229,841 / matched 1,000 / pending 74,681 |

> pending 74,681 = cancelled 74,680 + checkDigit fail 1 (승격 대상 아님, candidate 로 보존).

---

## 2. 적용 범위

| 분류 | 이 IR 적용 | 별도 CHECK 에서 확정할 것 |
|---|:---:|---|
| 의약품 | ✅ (완료·기준선) | — |
| 의약외품 | ✅ | grain, identifier type, 취소/중복 표기 |
| 의료기기 | ✅ | grain(UDI-DI 단위), identifier type(UDI 신규 여부) |
| 건강기능식품 | ✅ | grain, 인정번호/품목 식별자 |
| 화장품 | ✅ | grain, 식별자(대부분 GTIN/내부코드) |
| 생활용품/일반소비재 | ✅ | grain, GTIN 유무 |

각 분류별 **grain 과 identifier 는 반드시 분류별 CHECK 에서 확정**한다. 이 IR 은 공통 뼈대만 고정한다.

---

## 3. O4O 상품 구조 기준 (실 스키마)

> 실제 엔티티: `apps/api-server/src/modules/neture/entities/*`. 아래는 코드 확인 결과다(작문 아님).

| 계층 | 테이블/엔티티 | grain / 역할 | 핵심 사실 |
|---|---|---|---|
| **완충** | `product_candidates` / `ProductCandidate` | 공공 raw·draft·candidate 검토 큐 | 전역 UNIQUE 없음. `raw_payload` jsonb 원형 보존. status/match_status/source_type 는 varchar union(enum 아님) |
| **Core SSOT** | `product_masters` / `ProductMaster` | **물리적 제품 1건 = barcode(GTIN) 1건 = SKU/포장단위** | `barcode` varchar(14) UNIQUE. immutable: barcode·regulatory_type·regulatory_name·manufacturer_name·mfds_permit_number·mfds_product_id. `drug_category` 는 mutable |
| **식별자** | `product_identifiers` / `ProductIdentifier` | Master 1:N additive 식별자 보관 | primary barcode 는 Master.barcode 의 mirror. partial unique `(product_master_id, identifier_type, normalized_value) WHERE deleted_at IS NULL`. type 은 varchar union |
| **대표상품** | `representative_products` / `RepresentativeProduct` | 여러 ProductMaster 를 묶는 상위 대표상품 | Master.`representative_product_id` nullable FK(SET NULL). 미연결 허용. **주문/공급 단위 아님** |
| **이미지** | `product_images` / `ProductImage` | 사본 이미지 저장 | 외부 URL 직참조가 아닌 GCS 사본 경로 기준(§9) |
| **설명 파생** | `shared_product_descriptions` / `SharedProductDescription` | 설명 파생 저장소 | 공식 원천 설명의 파생분 저장(§10) |
| **매장 실행** | `store_local_product` / `StoreLocalProduct` | 매장 경영활용 제품 | 공공 seed 에서 **자동 생성 금지**(§11) |
| **거래/주문** | `supplier_product_offers` / `organization_product_listings` | 공급/거래·listing 영역 | 공공 seed 에서 **자동 생성 금지**(§11). 주문은 `checkoutService.createOrder()`(CLAUDE.md §4) |

**grain 오해 금지**: `ProductMaster` = SKU/포장단위. 품목(허가단위)이 아니다. `mfds_product_id`(품목기준코드) 1개가 **여러 barcode(SKU)** 로 확장된다(의약품 실측: multiPackage 그룹 존재).

---

## 4. Core 직접 적재 금지 (불변 원칙)

공공 raw 데이터를 **바로 `product_masters` 에 넣지 않는다.** 반드시 candidate 완충을 경유한다.

```text
raw / public source
  → product_candidates  (완충: 검증·dedup·취소표기 보존)
  → dry-run 판정         (write 0)
  → 게이트 승인
  → product_masters + product_identifiers 승격 (apply)
```

이유: candidate 경유가 Core 오염을 막았다(의약품 실측 — 취소 74,680 + checkDigit fail 1 이 Core 에 들어가지 않고 candidate 에 pending 으로 격리됨).

---

## 5. 표준 게이트 프로세스

의약품에서 검증된 게이트 구조를 일반화한다. 게이트는 **단계별 분리 승인**(앞 게이트 승인이 뒤 게이트를 포함하지 않음).

| 게이트 | 해야 할 것 | 금지 |
|---|---|---|
| **Gate 0** — source / sample / field CHECK | 원천 확보, 샘플 분석, 필드·grain·identifier·취소표기 CHECK 문서화, offline dry-run | DB write, Core 생성 |
| **Gate A** — ProductCandidate 적재 | 백업 확인 → candidate `--apply`. write 대상 = `product_candidates` 뿐 | ProductMaster/Identifier 생성, offer/listing 생성 |
| **Gate B** — ProductMaster/Identifier 승격 | dry-run 리포트(create/link/conflict) 확인 → 승격 apply. write = Master+Identifier 뿐 | 설명/이미지/대표상품/offer/listing 생성 |
| **Gate C** — 설명/이미지/대표상품 보강 | SharedProductDescription 파생, ProductImage GCS 사본, RepresentativeProduct 그룹핑 | offer/listing/store_local_product/주문 생성 |

각 게이트는 **백업 → 승인 문구 확인 → 실행 → 검증 → 문서화** 순서를 지킨다(런북 §3·§7 참조).

---

## 6. Candidate 표준 원칙

**candidate 에 반드시 담는 것** (실 컬럼/rawPayload 기준):

```text
source_type          (csv_import / xlsx_import / external_api / operator_import …)
source_label         (분류·batch 식별: 예 "2025-10-31")
identifier_type      (KOREA_DRUG_CODE 등 — 매칭 입력)
normalized_identifier_value
candidate_* 필드      (name / manufacturer / category / spec / unit …)
raw_payload (jsonb)  ← 원본 무손실 보존 (source.* 원문 포함)
  · sourceDataset / sourceBaseDate / sourceCollectedAt / rowNumber
  · isCancelled 등 상태 플래그
candidate_status     (pending → reviewing → matched/approved_new_master …)
match_status
service_key / organization_id  (경계 필요 시)
```

**원본 손실 금지**:
- 정규화·절단된 값이 있어도 **`raw_payload` 에는 원본 그대로 보존**(의약품: varchar overflow 절단분도 `rawPayload.source` 무손실 — 런북 §9).
- 인코딩(CP949 등)/CDATA/XML 원문 파싱 주의. 깨진 인코딩을 candidate 에 그대로 굳히지 말 것.
- **취소/폐기 상태도 candidate 에는 보존**한다(Core 승격만 제외). 삭제하지 않는다.

---

## 7. ProductMaster 승격 표준 원칙

분류마다 grain 은 다를 수 있으나 공통 원칙은 고정한다.

```text
✅ 승격 대상 = active / valid 데이터만        (취소·checkdigit fail·invalid format 제외)
✅ ProductMaster grain 반드시 확인            (SKU/포장단위인지 사전 확정 — Gate 0)
✅ identifier 충돌 시 write 금지              (conflict → candidate 에 남김, Core 오염 방지)
✅ 기존 Master 자동 overwrite 금지            (immutable 필드 재작성 금지)
✅ idempotent                                (기존 barcode → link, 기존 identifier → skip)
✅ dry-run 이 기본                            (apply 는 이중 가드 + 명시 승인)
✅ 대량 write 는 batch (청크 multi-row INSERT) (per-row round-trip = Job timeout 초과)
```

**의약품에서 검증된 멱등·배치 구조**(참고 구현):
- app 측 `randomUUID` 로 master id 선생성 → identifier 가 FK 참조 가능 → masters→identifiers→candidate 마킹 순 flush.
- 기존 barcode 는 link, 기존 (master,type,normalized) identifier 는 skip → 재실행 안전.
- apply 이중 가드: `DRUG_PROMOTE_APPLY=true` **AND** `DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND` 둘 다여야 write. 하나라도 없으면 dry-run.

---

## 8. Identifier 표준 원칙

식별자는 `product_identifiers` 에 **additive** 로 보관한다. **ProductMaster PK 나 유일 기준으로 오해 금지.**

**현재 코드가 아는 identifier_type** (`ProductIdentifierType` union — DB enum 아님):

```text
GTIN / EAN13 / UPC / JAN        (국제 상품 바코드)
INTERNAL_O4O                    (바코드 미입력 시 내부 생성)
SUPPLIER_SKU / PHARMACY_LOCAL / STORE_LOCAL
KOREA_DRUG_CODE                 (약품 표준코드)
KOREA_INSURANCE_CODE            (보험코드)
ATC_CODE                        (ATC 분류)
MFDS_CODE                       (식약처 코드 = 품목기준코드 대응)
UNKNOWN
```

**분류별 신규 식별자**(예: 의료기기 **UDI-DI**, 건기식 인정번호, 허가번호 등)는:
- `identifier_type` 이 **varchar + application-level union** 이므로 **enum migration 없이 코드 union 확장**으로 흡수한다(설계 의도 — 반복 migration 회피).
- 신규 type 추가는 **분류별 CHECK 에서 제안 → 중앙 리뷰**(§13). 임의 추가 금지.

**주의 — 혼동하기 쉬운 매핑**:
- `barcode`(GTIN) = ProductMaster 컬럼(UNIQUE, primary). identifier 의 GTIN 은 이 mirror.
- `mfds_product_id`(품목기준코드) = ProductMaster 컬럼(immutable). MFDS_CODE identifier 로도 병행 보관.
- 값 없는 식별자는 row 를 만들지 않는다(의약품: ATC/보험코드는 값 존재분만 — 703,483 = KOREA_DRUG 230,841 + MFDS 230,841 + ATC 177,056 + INSURANCE 64,745).

---

## 9. 이미지 표준 원칙

```text
✅ ProductImage.gcs_path 기준         (GCS 사본 경로)
✅ 공공 이미지가 있으면 GCS 사본 후 연결
🚫 외부 URL 직참조 금지               (원천 URL 을 그대로 렌더 소스로 쓰지 않음)
🚫 이미지 없는 상품에 가짜 이미지 row 생성 금지
→ 이미지 없는 상품은 UI/후속 작업에서 상품명 기반 placeholder 처리 (DB 오염 아님)
```

Gate C 영역. 공공 seed(Gate A/B)에서는 이미지 생성하지 않는다.

---

## 10. 설명 표준 원칙

**공식 설명과 매장 설명을 분리**한다.

```text
공식/공공 설명        = raw_payload 또는 보강 원천 (예: e약은요)
SharedProductDescription = 공식 설명의 파생 저장소 (Gate C)
매장용 설명           = 별도 AI 제작 메뉴/작업 (Operator Workspace B — CLAUDE.md §11)
```

- 공식(B2B/B2C) 설명과 매장 AI 설명을 **혼동 금지**.
- 동일성분/동일허가 활용은 **정규 테이블을 새로 만들기보다** 설명서 생성 시 **참고 가이드**로 우선 사용한다(신규 관계 테이블 신설은 별도 WO).

---

## 11. 자동 생성 금지 영역 (공공 seed 불변)

공공 데이터 seed(Gate A/B/C)에서 **절대 자동 생성하지 않는다**:

```text
🚫 SupplierProductOffer
🚫 OrganizationProductListing
🚫 StoreLocalProduct        (매장 경영활용 제품)
🚫 ProductApproval
🚫 주문 / 거래 / 결제 데이터  (checkoutService.createOrder() 외 생성 금지 — CLAUDE.md §4)
🚫 매장별 취급 상품
```

이들은 공급자·운영자·매장의 능동 행위(거래·큐레이션·등록)로만 생성된다. seed 는 **카탈로그 사실(Master/Identifier)까지만** 책임진다.

---

## 12. 분류별 CHECK 템플릿

각 분류 에이전트는 seed 착수(Gate 0) 전에 아래 질문에 **반드시 답한 CHECK 문서**를 남긴다.

```text
Q1. 이 데이터의 grain 은 무엇인가?
Q2. SKU/포장단위인가, 품목(허가단위)인가, 허가단위인가?
Q3. 유통 식별자(GTIN/바코드 등)로 쓸 수 있는 값이 있는가?
Q4. ProductMaster 승격 가능한가, Candidate 까지만 두어야 하는가?
Q5. identifier_type 은 기존 union 으로 충분한가? (부족 시 신규 type 제안 + 사유)
Q6. 취소/폐기/중복 상태는 원본에서 어떻게 표시되는가? (승격 제외 규칙)
Q7. 이미지/설명은 공식 원천인가? (Gate C 대상 여부)
Q8. O4O 설명 제작에 참고 가능한 필드는 무엇인가?
```

> 산출물 예: `docs/checks/CHECK-O4O-QUASIDRUG-SEED-*` 등. Gate 0 통과 없이 Gate A 진입 금지.

---

## 13. 병렬 작업 운영 원칙

여러 에이전트가 분류를 나눠 진행할 때:

```text
✅ 분류별 CHECK(Gate 0) 는 병렬 가능
✅ 각 에이전트는 CHECK 문서 + dry-run report 를 반드시 남긴다
⚠️ ProductMaster 승격 정책 / 신규 identifier_type 은 중앙 리뷰 필요 (스키마 파급)
⚠️ Core write(Gate A/B/C 실행)는 게이트 승인 필요 (병렬 자율 실행 금지)
🚫 대용량 raw 파일 repo 커밋 금지  (GCS 또는 로컬 밖 — CLAUDE.md 원칙)
🚫 serviceKey / secret / DB password / report 원문 커밋 금지
```

**공유 계층 변경 주의**(CLAUDE.md Shared Module Rule): `product_masters`/`product_identifiers`/`product_candidates` 는 KPA/GlycoPharm/Cosmetics/Neture 공통 Core 다. 한 분류 전용 변경으로 처리하지 말고 **공통 정책 문제로 먼저 판단**한다.

---

## 14. 의약품 트랙에서 얻은 교훈 (필수 반영)

```text
1. 표준코드 GTIN check-digit 검증 필요        (원본 오타 1건 → candidate pending 격리, Core 미오염)
2. 품목기준코드 1개 → 다수 표준코드/SKU 확장    (multiPackage 그룹 실존 → grain=SKU 확정)
3. 설명 단위 ≠ 포장단위                        (설명은 품목/성분 단위, Master 는 SKU 단위)
4. 다제조사 그룹 존재                          (multiManufacturer MFDS 코드 → 대표상품 그룹핑 시 고려)
5. candidate 경유가 Core 오염을 막음            (취소 74,680 이 Core 에 안 들어감)
6. 대량 write 는 batch 필수                    (per-row ≈934k round-trip → Job 1h timeout 초과)
7. Cloud Run Job / 사전 백업 / 검증 SQL 세트 필요 (timeout 7200 연장 + backup id 기록 + read-only 검증)
8. varchar overflow 절단은 mapper 에서, 원본은 raw_payload 무손실
```

---

## 15. 다음 작업 제안

```text
1. e약은요 → master별 SharedProductDescription 파생        (Gate C)
2. RepresentativeProduct 그룹핑                             (multiPackage/multiManufacturer 기준)
3. e약은요 이미지 GCS 사본                                  (Gate C)
4. 의약외품 CHECK/seed 전략   ← 의약품과 최근접, 우선 착수 권장
5. 의료기기 CHECK             (UDI-DI grain·identifier 신규 검토)
6. 건강기능식품 CHECK
7. 화장품 CHECK
```

**병렬화 지침**: 의약외품은 의약품과 가장 가까우므로 의약품 트랙 컨텍스트에서 이어가고, 의료기기/건기식/화장품은 **이 IR 을 기준 문서로 각 에이전트에 배정**한다. 각 에이전트의 첫 산출물은 §12 템플릿을 채운 분류별 CHECK 다.

---

## 16. 완료 기준

```text
✅ IR 문서 작성 완료 (본 문서)
✅ 코드 변경 없음 / DB 변경 없음 / raw 파일 커밋 없음 / secret 노출 없음
✅ 의약품 seed 완료 결과(230,841 / 703,483 / conflict 0) 반영
✅ 다른 분류 에이전트가 사용할 공통 기준선 + §12 CHECK 템플릿 제시
✅ commit / push 완료
```

---

*작성: 2026-07-04 · 성격: read-only 표준화 IR · 기준선: 의약품 seed 트랙 완주(230,841)*
