# CHECK-O4O-INTERNAL-PRODUCT-CODE-STORAGE-AND-USAGE-AUDIT-V1

> WO: `WO-O4O-INTERNAL-PRODUCT-CODE-STORAGE-AND-USAGE-AUDIT-V1`
> 성격: **read-only 조사** — 데이터/코드/컬럼/migration/배포 변경 0
> 조사일: 2026-07-10 · DB: 운영(cloud-sql-proxy, o4o_api) read-only + 정적 코드 분석

---

## 0. 한 줄 결론

O4O "내부 코드"는 **별도 관리 코드가 아니라, `product_masters.barcode`(NOT NULL·UNIQUE·immutable, "물리적 제품 1건=barcode 1건" SSOT 키)를 채우기 위해 만든 합성 EAN-13**(GS1 `200` 내부예약 대역)이다. 설계는 이를 `barcode_source='INTERNAL'` + `product_identifiers.INTERNAL_O4O`로 **구분**하려 했으나, **현재 등록 경로가 그 표식을 남기지 않아**(barcode_source 엔티티 미매핑 → DB default `'GTIN'`, INTERNAL_O4O identifier 미생성) **최근 내부코드는 실제 GTIN 바코드와 구분 불가**하게 저장된다. → 사용자 정책(내부 코드 = 실제 바코드와 무관·별도 저장)과 **불일치 확인**.

---

## 1. 내부 코드의 공식 정의 · 생성 함수 · 경로

### 1.1 생성 함수 — [`utils/gtin.ts:generateInternalBarcode`](../../apps/api-server/src/utils/gtin.ts#L71)
`WO-NETURE-PRODUCT-REGISTRATION-REFACTOR-AND-AI-TAGGING-V1`.
- 형식: **`200`(GS1 매장 내부 예약 대역) + hash(seed) 6자리 + timestamp 3자리 + check digit = 13자리 유효 EAN-13**.
- seed = `${name}|${manufacturer}`(admin) 또는 `supplierId`(공급자). 충돌 시 `${seed}#${attempt}` 재생성(MAX 3).
- 체크디지트 = GS1 표준(계산해 붙여 **스캔 가능한 형식**으로 만듦).
- **prefix 200 배경**: GS1 200–299는 "restricted distribution / in-store" 대역(전역 유일 아님) → "내부용"을 의미. 그러나 형식상 실제 바코드와 동일해 겉보기 구분 불가.

### 1.2 생성 주체(경로)
| 경로 | 내부코드 생성 | 저장 |
|---|---|---|
| 관리자 직접 등록 (`admin.controller` → `catalog.resolveOrCreateMaster` → `createMasterWithInternalCode`) | 바코드 미입력 시 O | `barcode`(+`mfds_product_id`) |
| 공급자 등록 (`offer.service.validateCreateInput`) | 바코드 미입력 시 O (`generateInternalBarcode(supplierId)`) | `barcode` |
| 후보 승격 / 공공데이터 (drug promotion, `promoteOne`) | X — 표준코드/KOREA_DRUG_CODE를 barcode로 사용 | `barcode` + `product_identifiers(KOREA_DRUG_CODE)` |
| 이미지/모바일 등록 | 위 catalog 경로 경유(별도 규칙 없음) | 상동 |

> 핵심: **바코드리스 등록(관리자/공급자)만 내부코드를 생성**하며, 그 저장처는 `barcode` 컬럼이다. **별도 관리코드 컬럼/테이블을 쓰지 않는다.**

---

## 2. 저장 구조 (실측)

### 2.1 컬럼
| 컬럼 | 상태 |
|---|---|
| `product_masters.barcode` | varchar(14), **NOT NULL**, **UNIQUE(`uq_product_masters_barcode`)**, immutable. "물리적 제품 1건 = barcode 1건 = ProductMaster 1건" SSOT 키 |
| `product_masters.barcode_source` | varchar, NOT NULL, **DB default `'GTIN'`**. **ProductMaster 엔티티에 매핑 안 됨**(grep 0) → 앱 코드가 못 씀 |
| `product_masters.mfds_product_id` | NOT NULL. 내부코드 등록 시 barcode 값과 동일하게 채움 |
| `internal_code` / `product_code` / `management_code` | **존재하지 않음** |
| `product_identifiers.INTERNAL_O4O` | 별도 식별자 유형 존재(SUPPLIER_SKU/PHARMACY_LOCAL/STORE_LOCAL과 함께 내부·로컬 코드 수용 설계). `verification_status='system_generated'`, `is_primary=barcode mirror` |

### 2.2 4유형 실측 (product_masters 198,407)
| 유형 | 수량 | barcode | INTERNAL_O4O identifier |
|---|--:|---|---|
| 실제 외부 바코드(GTIN/표준코드) | **181,239** | 외부값 | 없음(대신 KOREA_DRUG_CODE/GTIN 등) |
| 내부코드(200…) · **표식 정상** | **17,148** | 200… | 있음(값=barcode 100%), barcode_source='INTERNAL' |
| 내부코드(200…) · **표식 누락(최근)** | **20** | 200… | **없음**, barcode_source=**'GTIN'**(오표기) |
| barcode NULL | **0** | (NOT NULL이라 불가) | — |

- barcode_source 분포: **GTIN 181,259 / INTERNAL 17,148**. (내부코드 총 17,168 = 17,148 정상 + 20 오표기)
- **INTERNAL_O4O identifier 17,148건 전부** `normalized_value = master.barcode` 이고 그 barcode가 200… → **identifier = barcode 완전 미러**(중복 저장). 신규 정보 0.
- **표식 누락 20건은 전량 최근 수동 등록**(2026-06~07): `징코Q 마그시아`, **`파워 본 케이투 엔 디 5000`**, `흑염소 진액 골드`, `콸콸포맨`, `헤파에이스 400`, `리얼 매스틱 1300`, `리포좀 콜라겐` 등.

### 2.3 근본 원인(표식 누락)
`createMasterWithInternalCode`/`offer.service`는 `barcode`만 세팅하고 **(a) barcode_source를 'INTERNAL'로 못 세팅**(엔티티 미매핑 → default 'GTIN'), **(b) INTERNAL_O4O identifier 미생성**. 17,148 정상 표식은 **초기 마이그레이션 백필**(`20260606000000`, barcode_source='INTERNAL' → identifier)로 생긴 것이며, 그 이후 신규 내부코드는 표식이 유지되지 않는다.

---

## 3. `POWER BONE K2 & D5000` 현재 상태
- master `a7f5272d-7099-491f-b2e8-21d5e13f44f5` · 이름 **`파워 본 케이투 엔 디 5000`** · 등록 2026-07-10
- `barcode` = **`2009353577229`** (200 내부코드) · `barcode_source` = **`GTIN`**(오표기) · `mfds_product_id` = 동일값 · regulatory_type=DRUG
- `product_identifiers` = **0건**(INTERNAL_O4O 없음)
- → **내부 합성코드가 실제 GTIN 바코드로 위장 저장**된 대표 사례. (사용자가 언급한 케이스 정확 재현)

---

## 4. 실제 사용처 (내부코드 vs 바코드 혼동 여부)
| 소비 | barcode 취급 | 혼동 위험 |
|---|---|---|
| 중복 검사(등록) | `findOne({where:{barcode}})` UNIQUE 키 | 내부코드도 UNIQUE 키로 동작(합성이라 매번 달라 name+mfr 보조 dedup) |
| 상품 조회 | `getProductMasterByBarcode(barcode)` | 200코드로도 조회됨 |
| 상품 검색 | `catalog.searchProductMasters` = `... OR m.barcode ILIKE :q` | **200코드가 바코드 검색에 매칭** |
| admin 목록/상세/생성 | ProductMastersPage/DetailPage/CreatePage `barcode` 표시 | **200코드를 "바코드"로 표시** |
| 매장 O4O picker | AddO4oStandardProductModal `barcode` 표시 | 매장경영자에게 "바코드"로 노출 |
| QR | `ProductLandingService` 공개키 `/p/{key}` 사용(**barcode 아님**) | QR URL은 무관(landing 데이터엔 barcode 포함) |
| 주문/POS 스캔 | 별도 스캔 엔드포인트 없음(현재). barcode는 SSOT 키 역할 | 실제 스캔 시 200코드는 매장 밖에서 무효 |

**판정:**
- `barcode`는 **"실제 포장 바코드"와 "ProductMaster 필수 고유키" 두 의미가 혼재**한다. NOT NULL·UNIQUE·immutable로 **필수 키**로 쓰이면서, 검색·표시·조회에선 **"바코드"로 노출**된다.
- 내부코드는 화면/검색에서 **스캔 가능한 외부 바코드처럼 노출**되며, `barcode_source`(구분 신호)가 앱에서 유지되지 않아 최근 건은 **구분 불가**.

**왜 UUID 외에 내부 관리 코드가 필요한가?** — 현재 구조상 **내부코드는 "관리 편의"가 아니라 `barcode` NOT NULL·UNIQUE 제약을 만족시키기 위한 합성값**이다. 사람이 읽고 검색하는 자체 관리 코드로서의 독립적 필요(UUID로 불충분한 지점)는 **코드상 확인되지 않는다**. 즉 내부코드는 barcode-중심 설계(바코드리스 이전)의 잔재이며, "별도 관리 코드가 반드시 필요"한 근거는 약하다.

---

## 5. 정책 대안 비교

| 안 | 내용 | 사용자 정책 부합 | 비용/리스크 |
|---|---|:---:|---|
| **A. 현행 유지** | 내부코드를 200 EAN-13로 barcode에 저장 | ✗ (바코드=내부코드 혼동) | 낮음. 단 최소 **표식 복구**(barcode_source/INTERNAL_O4O) 없이는 GTIN 위장 지속 |
| **B. ProductIdentifier 분리** | 실제 바코드 없으면 `barcode=NULL`, 내부코드는 **INTERNAL_O4O identifier에만** 저장. 실제 바코드 생기면 GTIN identifier 추가. 내부 관리 검색은 INTERNAL_O4O | ◎ (정책과 가장 근접) | **높음** — `barcode` NOT NULL·UNIQUE·immutable 해제 + `findOne({where:{barcode}})`·`getProductMasterByBarcode`·검색·중복검사 전면 재설계(F10/F12 Core 인접). "물리적 제품 1건=barcode 1건" SSOT 재정의 |
| **C. 전용 internal_code 컬럼** | `product_masters.internal_code` 신설, barcode=실제 바코드(nullable), 외부식별자=ProductIdentifier | △ | 중~높음. 단 **INTERNAL_O4O가 이미 존재** → 컬럼 신설은 identifier와 **개념 중복**(권장도 낮음) |

### 권장안 — **B 지향, 2단계(우선 표식 정합 → 이후 barcode NULL화)**
- **Phase 1 (작음·안전, 즉시 혼동 해소)**: 등록 경로가 내부코드 생성 시 **① barcode_source='INTERNAL' 세팅(엔티티에 barcode_source 매핑 추가) ② INTERNAL_O4O identifier 생성**. 화면/검색/API가 barcode_source로 "내부코드"와 "실제 바코드"를 **구분·라벨링**(예: 내부코드는 "바코드" 대신 "O4O 내부코드"로 표시, 바코드 검색에서 제외/구분). → barcode 컬럼 구조 무변경, F12 준수.
- **Phase 2 (큼·Core, 정책 완성)**: barcode nullable화 + 내부코드를 barcode에서 제거하고 INTERNAL_O4O identifier로만 관리. dedup/lookup/검색을 identifier·(name+mfr) 기반으로 이관. → 별도 대형 WO(Core 동결 검토).
- **C는 비권장**: INTERNAL_O4O identifier와 중복.

---

## 6. 기존 데이터 보정 대상 (수량)
- **즉시(Phase 1) 정합 대상 = 20건** — barcode 200… 이나 `barcode_source='GTIN'`·INTERNAL_O4O 없음(최근 수동 등록: 파워 본 K2, 흑염소, 콸콸포맨 등). barcode_source→'INTERNAL' + INTERNAL_O4O identifier 생성.
- **정상 표식 17,148건** — 이미 barcode_source='INTERNAL' + identifier. Phase 1에선 무변경.
- **Phase 2(정책 완성) 대상 = 내부코드 전체 17,168건** — barcode→NULL 이관(대형·Core, 별도 승인).
- **실제 외부 바코드 181,239건** — 무관.

---

## 7. 반드시 답해야 할 결론 (요약)
- **내부코드 공식 정의**: barcode NOT NULL·UNIQUE 키를 채우는 합성 EAN-13(GS1 200 대역). 관리코드가 아님.
- **생성 함수/경로**: `generateInternalBarcode`(gtin.ts) — 관리자/공급자 바코드리스 등록.
- **실제 저장 위치**: `product_masters.barcode`(+mfds_product_id). identifier는 백필분 17,148만 미러.
- **바코드와의 관계**: 동일 슬롯 공유(분리 안 됨). barcode_source로 구분 설계됐으나 앱 미유지.
- **DB 패턴**: 내부 17,168(정상 17,148/오표기 20), 외부 181,239, barcode NULL 0.
- **주요 소비처**: dedup·조회·검색·admin/picker 표시(모두 barcode) — 내부코드가 "바코드"로 노출.
- **barcode에서 분리 가능?**: 가능하나 barcode NOT NULL·UNIQUE·SSOT 해제 필요(대형).
- **ProductIdentifier만으로 관리 가능?**: 개념상 가능(INTERNAL_O4O 이미 존재). barcode 의존 코드 이관 전제.
- **전용 컬럼 필요?**: 불필요(INTERNAL_O4O와 중복) — C 비권장.
- **POWER BONE K2 상태**: 200 barcode·GTIN 오표기·identifier 0.
- **보정 대상**: 즉시 20건(표식 정합), 정책 완성 시 17,168건.
- **후속 안전 순서**: (1) 엔티티 barcode_source 매핑 + 등록 경로 표식 세팅(코드) → (2) 20건 표식 정합(데이터 보정) → (3) UI/API 내부코드 라벨 구분 → (4) [별도 대형] barcode nullable + identifier 단일 저장(Core).

---

## 8. 안전 확인 (write 0)
- 실행 쿼리 전량 SELECT/정보스키마 조회. INSERT/UPDATE/DELETE/DDL **0**.
- POWER BONE K2 등 데이터 무변경 · barcode/identifier 무변경 · 컬럼/migration/코드/배포 **0**.
- 산출물: 본 CHECK 문서 1건. **결론은 "barcode 저장이 잘못"이라 단정하지 않고**, 설계 의도(합성 barcode 키)와 표식 유지 실패(혼동 원인)를 구분해 제시.
