# CHECK-O4O-PRODUCT-IDENTITY-UUID-AND-EXTERNAL-IDENTIFIER-SEPARATION-DESIGN-V1

> WO: `WO-O4O-PRODUCT-IDENTITY-UUID-AND-EXTERNAL-IDENTIFIER-SEPARATION-DESIGN-V1`
> 선행: `CHECK-O4O-INTERNAL-PRODUCT-CODE-STORAGE-AND-USAGE-AUDIT-V1`
> 성격: **read-only 조사·설계** — 코드/DB/migration/데이터/배포 변경 0. 구현은 별도 승인.
> 작성일: 2026-07-10 · DB: 운영(cloud-sql-proxy, o4o_api) read-only

---

## 0. 요약 (결정적 census)

| 항목 | 실측 | 설계 함의 |
|---|--:|---|
| `STORE_LOCAL` identifier | **0** | 삭제 대상 상품 **없음** → Phase E 사실상 no-op(타입만 제거) |
| `PHARMACY_LOCAL` identifier | **0** | 상동 |
| `SUPPLIER_SKU` identifier | **0** | ProductIdentifier 이관 대상 **없음** → 공급자 관계 이관 no-op(타입만 제거) |
| `INTERNAL_O4O` identifier | **17,148** | 전부 `barcode`(200…) 미러. Phase D 이관 대상 |
| barcode `200…`(합성) | **17,168** | =17,148(identifier 有) + ~20(최근·표식 누락). barcode→NULL 대상 |
| barcode 외부값 | **181,239** | 무관(실제 바코드/표준코드) |
| barcode NULL | **0** | barcode NOT NULL 이라 현재 불가 |

→ **가장 큰 발견: STORE_LOCAL/PHARMACY_LOCAL/SUPPLIER_SKU 는 실데이터 0건**이므로 "상품 삭제"·"SKU 이관"은 데이터 작업이 아니라 **타입/코드 정리**로 축소된다. 실제 이관 부담은 **INTERNAL_O4O 17,148 + 합성 barcode 17,168**에 집중된다.

---

## 1. 확정 상품 식별 정책

```
O4O 상품 정체성 = product_masters.id (UUID) 단일.
- UUID = 시스템 내부 연결 전용. 관리자/공급자/매장경영자에게 "관리 코드"로 노출 안 함.
- 사용자가 입력·기억하지 않음. URL/API 내부 ID로는 사용 가능. 이름·바코드·제조사 변경돼도 UUID 유지.
- 별도 O4O 내부 관리 코드(생성/노출) 없음.
barcode = 실제 포장 바코드만. 없으면 NULL.
ProductIdentifier = 상품에 부여된 공식 외부 식별자만.
```

**UUID로 충분한 근거(선행 조사)**: 내부 코드는 관리 편의가 아니라 `barcode` NOT NULL·UNIQUE 제약을 채우기 위한 합성값이었고, 사람이 읽는 별도 관리코드의 독립적 필요는 코드상 확인되지 않았다. → UUID 단일 정체성으로 대체 가능.

---

## 2. ProductIdentifier 유지 / 제거

| 유형 | 방향 | 근거(실측) |
|---|---|---|
| GTIN·EAN13·UPC·JAN | **유지** | 국제 상품 바코드 |
| KOREA_DRUG_CODE(177,413)·KOREA_INSURANCE_CODE(64,692)·MFDS_CODE(194,561)·UDI_DI(3,826)·ATC_CODE(176,962) | **유지** | 공식 기관 식별자 |
| **INTERNAL_O4O**(17,148) | **제거** | barcode 200 미러(신규 정보 0). 정체성=UUID로 대체 |
| **STORE_LOCAL**(0)·**PHARMACY_LOCAL**(0) | **제거(타입)** | 실데이터 0 |
| **SUPPLIER_SKU**(0) | **제거(전역 식별자에서)** | 실데이터 0. 필요 시 공급자 관계 데이터로 |

### 2.1 SUPPLIER_SKU 이관 판단
- ProductIdentifier 저장 **0건** → 이관할 데이터 없음.
- `supplier_product_offers`에 sku/supplier_code/product_code 컬럼 **없음**(정보스키마 확인).
- **판단**: SUPPLIER_SKU 를 ProductMaster 전역 식별자에서 제거. 향후 공급자 SKU 가 실제 필요해지면 `supplier_id + offer + supplier_sku` 형태로 **공급자 관계 테이블에 신설**(이번 정체성 분리 범위 밖, 별도 요건 발생 시).

### 2.2 STORE_LOCAL / PHARMACY_LOCAL 삭제 대상
- 연결 상품 **0건**(orders/offers/listings/spd/images 모두 0). → **삭제할 상품 없음.**
- 안전한 제거 순서: 타입·enum·코드·문서에서만 제거(데이터 작업 불필요). "잘못된 공통 O4O 상품 연결" 사례도 0.

---

## 3. barcode 컬럼 전환 설계

### 3.1 nullable 전환
- 현재 `barcode varchar(14) NOT NULL`, `UNIQUE (barcode)`(plain). immutable(엔티티 정책).
- 목표: `DROP NOT NULL`. **PostgreSQL plain UNIQUE 는 NULLS DISTINCT 기본** → 다중 NULL 허용(문제없음). 명확성을 위해 partial index 전환 권장:
  ```sql
  -- 대안(권장): 명시적 partial unique
  ALTER TABLE product_masters DROP CONSTRAINT uq_product_masters_barcode;
  CREATE UNIQUE INDEX uq_product_masters_barcode ON product_masters (barcode) WHERE barcode IS NOT NULL;
  ```
- immutable 정책은 유지하되 "실제 바코드가 나중에 붙는 경우" NULL→값 1회 세팅 허용을 명문화(현 immutable 과 충돌 검토 필요).

### 3.2 barcode_source
- 현재 `NOT NULL default 'GTIN'`, **엔티티 미매핑**(앱이 못 씀) → 최근 내부코드가 'GTIN'으로 오표기.
- **정책 대안**:
  - (권장) barcode_source **제거** — barcode=실제 바코드만 남으면 출처가 항상 실제 바코드라 GTIN/INTERNAL 구분 불필요. INTERNAL 값 종료.
  - (대안) 실제 바코드 출처 추적이 필요하면 유지하되 값 도메인에서 'INTERNAL' 삭제, 엔티티 매핑 추가.
- Phase 진행 중 임시로 엔티티 매핑 후 'INTERNAL' 세팅하는 방식은 **비권장**(어차피 제거 대상).

### 3.3 mfds_product_id (반드시 함께 정리)
- `NOT NULL`. 분포(198,409): **HIRA 프리픽스 177,413**(의약품, `HIRA:DRUG_MASTER:...`) / **MFDS 프리픽스**(의약외품 17,148, `MFDS:QUASI_DRUG:permit` — **공식 신고번호 기반**) / **합성 200 = ~22**(최근 바코드리스, `mfds_product_id=barcode` 오용).
- 즉 mfds_product_id 는 "공식 제품 ID 슬롯"인데 **바코드리스 등록에서 합성코드로 오용**됨.
- **설계**:
  - 의약품/의약외품(대다수): mfds_product_id = 공식 식별자 → **유지**(또는 ProductIdentifier 로 정규화 이관 검토).
  - 합성 200 인 ~22건: mfds_product_id 는 공식 ID 가 아니므로 **정리**(NULL 또는 실제 신고번호로 교체). 단 컬럼이 NOT NULL 이라 **nullable 전환 필요**.
  - **결론**: `mfds_product_id` 도 `DROP NOT NULL` + 합성값 정리. 장기적으로 이 슬롯을 ProductIdentifier(MFDS_CODE/KOREA_DRUG_CODE)로 정규화하고 컬럼 제거하는 것을 후속 검토.

---

## 4. 기존 데이터 이관 계획

| 대상 | 수량 | 처리 |
|---|--:|---|
| INTERNAL_O4O identifier | 17,148 | **삭제**(soft delete: deleted_at 세팅) |
| 합성 barcode(200…) | 17,168 | **barcode→NULL** (실제 바코드 부재 재검증 후) |
| ↳ 의약외품 17,148 | | 공식 식별자(mfds_product_id=MFDS permit, MFDS_CODE identifier) **유지**. 합성 barcode·INTERNAL_O4O 만 정리 |
| ↳ 최근 ~20 | | barcode→NULL + mfds_product_id 합성값 정리(신고번호 있으면 공식 식별자로) |
| barcode_source='INTERNAL' | 17,148 | 컬럼 제거 or 값 정리 |
| STORE_LOCAL/PHARMACY_LOCAL 상품 | **0** | 없음 |
| SUPPLIER_SKU | **0** | 없음 |

> 원칙: **ProductMaster UUID·상품정보·공식 외부 식별자는 전량 유지.** 합성 barcode·INTERNAL_O4O·barcode_source(INTERNAL)만 제거. 자동 이름-유사 매칭 재도입 금지.

---

## 5. 코드 의존성 (전환 영향 범위)

### 5.1 barcode 필수 가정 — 핵심 경로
| 위치 | 역할 | 전환 |
|---|---|---|
| `catalog.service.resolveOrCreateMaster(barcode\|null)` | **단일 master 생성 관문** | barcode 없으면 `createMasterWithInternalCode` → **barcode=NULL 로 생성**(내부코드 생성 중단). 중복 = name+제조사(이미 존재) + 공식 식별자 |
| `catalog.service.createMasterWithInternalCode` | 내부코드 생성 | **generateInternalBarcode 호출 제거**, barcode=NULL, mfds_product_id 정책 반영 |
| `offer.service.validateCreateInput` (공급자) | 바코드 미입력→generateInternalBarcode | **generateInternalBarcode 제거**, barcode=NULL 허용 |
| `catalog.searchProductMasters` | `... OR m.barcode ILIKE :q` | null-safe(내부코드 검색 노출 제거) |
| `getProductMasterByBarcode` / `findOne({where:{barcode}})` (catalog·neture·csv-import·store-tablet) | 바코드 조회/중복 | barcode NULL 대응(NULL 조회 금지, 실제 바코드만) |
| `store-tablet.routes POST /products/register-by-barcode` | **실제 바코드 스캔 등록** | 유지(실제 바코드 필수 = 정당). null 무관 |
| `csv-import.service` (barcode upsert) | CSV | barcode 없는 행 → NULL 생성, 공식 식별자/이름 dedup |
| `product-master-create.controller` / `admin.controller` | admin 등록 | 이미 **barcode-optional**(`resolveOrCreateMaster(...||null)`) — 내부코드 생성만 제거하면 됨 |
| `utils/gtin.ts:generateInternalBarcode` | 합성 생성 | **호출 0 이후 제거** |

### 5.2 API 계약
- `ProductMasterRow.barcode: string`(admin api 여러 곳) → **`string | null`** 전환. 상세/검색 응답 nullable.
- 생성 DTO `barcode?: string`(이미 optional) 유지.
- CSV export: barcode 빈값 처리.

### 5.3 UI 표시 (합성코드가 "바코드"로 노출되는 곳)
- admin: ProductMastersPage/ProductMasterDetailPage/ProductMasterCreatePage — barcode 표시.
- 매장 picker `AddO4oStandardProductModal` — 컬럼 "**바코드**" + "바코드 검색" placeholder.
- **UI 정책**: 실제 바코드 있으면 표시 / 없으면 "**바코드 없음**" / UUID 미표시 / 내부코드 개념 제거. 매장 picker 의 "바코드 검색"은 실제 바코드만 대상(내부코드 매칭 제거).

---

## 6. 중복 방지 정책 (합성 barcode 제거 후)

barcode UNIQUE 만으로 불가 → **등록 트랜잭션 내부 결정적 검증**(자동 이름-유사 매칭 재도입 금지). 유형별 우선순위:

- **공통**: ① 실제 GTIN/EAN/UPC ② 공식 기관 식별자 ③ 허가·신고번호 ④ 제품명+제조사+규격 ⑤ 운영자 검토
- **의약품**: 표준코드 → 품목기준코드 → 제품명+제조업체+함량·제형·포장
- **건강기능식품**: 신고번호/제품코드 → 제품명+제조원+규격
- **의료기기**: UDI-DI → 허가·인증·신고번호 → 모델명+제조업체
- **의약외품·일반**: 실제 바코드 → 공식 신고번호 → 제품명+제조사+규격

> 현행 `createMasterWithInternalCode` 는 이미 name+제조사 dedup 보유 → 이를 유형별 공식 식별자 우선으로 확장.

---

## 7. 배포·이관 순서 (롤링, 각 단계 후 검증)

- **Phase A — nullable 대응 코드(DB 무변경)**: API 타입 barcode `string|null`, 검색·정렬·표시 null-safe, 등록 barcode optional 확정, generateInternalBarcode 호출 제거 준비. 배포·검증.
- **Phase B — DB 제약 변경**: `barcode DROP NOT NULL` + partial unique index, `mfds_product_id DROP NOT NULL`, barcode_source 정책 확정. (신규 등록 NULL 허용)
- **Phase C — 신규 등록 전환**: 관리자/공급자/이미지/모바일/바코드리스 경로에서 `generateInternalBarcode()` 사용 중단 → barcode=NULL. `gtin.ts` 합성 함수 제거.
- **Phase D — 기존 내부코드 이관(migration/스크립트)**: 17,168 실제 외부 바코드 부재 재검증 → 합성 barcode→NULL, INTERNAL_O4O soft delete, barcode_source(INTERNAL) 정리, 합성 mfds_product_id 정리. **공식 식별자 유지**.
- **Phase E — STORE_LOCAL/PHARMACY_LOCAL**: 데이터 0 → 타입/코드/문서 제거만.
- **Phase F — 타입 정리**: `INTERNAL_O4O`/`STORE_LOCAL`/`PHARMACY_LOCAL`/`SUPPLIER_SKU` 를 `ProductIdentifierType` union·코드·문서에서 제거.

### 롤백 전략
- Phase A: 코드 revert.
- Phase B: migration down(NOT NULL 재적용 — 단 NULL 행 존재 시 실패하므로 D 이전엔 NULL 미발생 유지, 또는 down 시 NULL→합성 재생성은 지양). **B 는 D 직전에만**, D 이후 롤백은 barcode 재생성 불가(합성값 소실) → **비가역 경계 명시**.
- Phase D: INTERNAL_O4O soft delete(복원 가능), barcode→NULL 전 스냅샷(원 barcode 값 백업 테이블/컬럼) 보관해 재적용 가능하게.

---

## 8. POWER BONE K2 & D5000 (별도 사례)
- 현재: master `a7f5272d` · barcode `2009353577229`(합성 200) · barcode_source `GTIN`(오표기) · **mfds_product_id `2009353577229`(합성=오용)** · **regulatory_type `건강기능식품`(정합·DRUG 아님)** · ProductIdentifier **0** · STORE 설명서 한국어·중국어 canonical 유지.
- 최종 보정 방향(Phase C/D 에 포함, 이번 WO 는 미수정):
  - 실제 바코드 없음 → **barcode NULL**, 합성 코드 제거, 내부코드 생성 안 함.
  - **mfds_product_id 합성값 정리**(공식 신고번호 있으면 그것으로/없으면 NULL).
  - regulatory_type 건강기능식품 **유지**(이미 정합). UUID 로 상품 유지.
  - STORE 한국어·중국어 설명서 **유지**.

---

## 9. 후속 구현 WO 분할(권장)
1. `WO-...-BARCODE-NULLABLE-AND-REGISTRATION-STOP-INTERNAL-CODE-V1` — Phase A~C(코드 nullable + 신규 내부코드 생성 중단 + DB nullable). barcode/mfds_product_id NOT NULL 해제.
2. `WO-...-LEGACY-INTERNAL-CODE-BACKFILL-MIGRATION-V1` — Phase D(17,168 barcode→NULL + INTERNAL_O4O soft delete + 백업/롤백). 승인·이중게이트.
3. `WO-...-IDENTIFIER-TYPE-CLEANUP-V1` — Phase E~F(INTERNAL_O4O/STORE_LOCAL/PHARMACY_LOCAL/SUPPLIER_SKU 타입 제거 + barcode_source 정리). 데이터 0.
4. (선택) `WO-...-MFDS-PRODUCT-ID-NORMALIZE-V1` — mfds_product_id → ProductIdentifier 정규화·컬럼 제거 검토.

---

## 10. 안전 확인 (이번 WO)
- 실행 쿼리 전량 SELECT/정보스키마. INSERT/UPDATE/DELETE/DDL **0**.
- 코드/DB/migration/데이터/상품삭제/배포 **0**. POWER BONE K2 등 무변경.
- 산출물: 본 설계 CHECK 1건. 구현은 §9 후속 WO 로 분할, **별도 승인 후 착수**.
