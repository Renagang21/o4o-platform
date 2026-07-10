# CHECK-O4O-LEGACY-INTERNAL-BARCODE-TO-NULL-MIGRATION-V1

> WO-O4O-LEGACY-INTERNAL-BARCODE-TO-NULL-MIGRATION-V1 (Phase D) 실행·검증 기록
> 선행: WO-O4O-PRODUCT-BARCODE-NULLABLE-AND-INTERNAL-CODE-GENERATION-STOP-V1 (Phase A~C)

| 항목 | 값 |
|------|-----|
| 실행일 | 2026-07-10 |
| 대상 환경 | 프로덕션 (`o4o-platform-db` / `o4o_platform`) |
| 마이그레이션 | `20270102000000-LegacyInternalCodeBarcodeToNull.ts` |
| 마이그레이션 커밋 | `7ce8cbc15` |
| 배포 | `deploy-api.yml` → Cloud Run Job `o4o-api-migrations` 자동 실행 (SUCCESS) |
| 상태 | ✅ 완료 (모든 사후 불변식 통과, 무회귀) |

---

## 1. 목적

상품 정체성을 `ProductMaster.id(UUID)` 단일로 확정한 뒤, **기존 데이터**에 남아 있던
합성 200 대역 내부코드를 실제 barcode/mfds 슬롯에서 제거한다.

- 합성 `200…` barcode → `NULL`
- 활성 `INTERNAL_O4O` 식별자 → soft delete
- 합성값으로 오용된 `mfds_product_id`(= barcode) → `NULL`
- 공식 식별자(`MFDS_CODE`/`KOREA_DRUG_CODE`/`UDI_DI`, `MFDS:`/`HIRA:` mfds) → **무변경**
- `barcode_source` `DEFAULT 'GTIN'` 오태깅 문제 종료(신규 barcode-less 상품 GTIN 오표기 중단)

하위 연결(offer/listing/image/description/order 등)은 전부 UUID(`master_id`/`product_master_id`) 기반이므로
barcode/mfds 를 NULL 로 만들어도 끊기지 않는다.

---

## 2. 사전 실측 (프로덕션 read-only, Cloud SQL Auth Proxy)

| 항목 | 실측 | WO 기준 | 비고 |
|------|-----:|--------:|------|
| `barcode LIKE '200%'` | **17,171** | 17,171 | 전부 13자리 (generateInternalBarcode 형식) |
| └ `barcode_source='INTERNAL'` | 17,148 | 17,148 | 합성 barcode + **실제 공식 mfds**(`MFDS:`/`HIRA:`) |
| └ `barcode_source='GTIN'` (오태깅) | **23** | (검증 대상) | 합성 barcode = **합성 mfds**, `[E2E_TEST]`·POWER BONE 등 |
| 활성 `INTERNAL_O4O` 식별자 | **17,148** | 17,148 | INTERNAL barcode 미러 |
| 합성 `mfds_product_id`(숫자만 = barcode) | **23** | (실측 필요) | 전부 200% 집합. 공식 mfds 는 전부 `MFDS:`/`HIRA:` 접두 |
| `barcode IS NULL` (기존) | 1 | — | smoke 상품 `f1919180…` |

### 2.1 23건 판정 (WO 사전검증 요구 항목)

`barcode LIKE '200%'` 17,171 과 `INTERNAL` 17,148 의 **차이 23건**은 실제 GS1 바코드가 아니라
**동일한 합성코드**로 확정:

- 전부 13자리 200 대역 (generateInternalBarcode 산출 형식)
- 전부 `mfds_product_id = barcode` (합성 mfds — 공식 mfds 는 예외 없이 `MFDS:`/`HIRA:` 접두)
- `[E2E_TEST] Neture B2B 테스트 상품`, `파워 본 케이투 엔 디 5000`(POWER BONE K2 & D5000, WO 명시 대상) 등 포함
- GS1 200~299 대역은 in-store/restricted 대역이라 정식 등록 GTIN 아님

→ **17,171 전량을 barcode→NULL 대상으로 확정**하고, 그중 합성 mfds 를 가진 23건만 mfds→NULL 처리.

### 2.2 하위 연결 안전성 (UUID 기반 확인)

- `product_masters` 를 참조하는 모든 FK 는 UUID (`master_id`/`product_master_id`). barcode/mfds 로 조인하는 테이블 **0개**.
- 17,171 합성 집합 하위: **offer 0 / listing 10 / image 1 / shared_desc 64** — 전부 `master_id` 기반 → barcode NULL 무영향.
- `mfds_product_id` UNIQUE 인덱스는 다중 NULL 허용(PostgreSQL) → 23건 NULL 안전.
- `barcode_source` 는 코드에서 **읽기 전용**(offer 목록 필터 `WHERE pm.barcode_source = $n`)만 사용, 쓰기 경로 없음 → DEFAULT/NOT NULL 완화 안전.

---

## 3. 처리 (단일 트랜잭션, `transaction: 'each'`)

`up()` 내부에서 순차 실행, 사후 불변식 위반 시 `throw` → 전체 롤백:

0. 전용 스냅샷 테이블 `product_master_legacy_internal_code_snapshots` 생성 (복원 가능)
1. 대상(`barcode LIKE '200%'`) 스냅샷 INSERT — `old_barcode` / `old_barcode_source` / `old_mfds_product_id` / soft-delete 대상 식별자 `id[]`
2. 활성 `INTERNAL_O4O` 식별자 soft delete (`deleted_at = NOW()`)
3. 합성 `mfds_product_id`(= barcode) → NULL **(barcode NULL 이전 — 등호 조건 유지)**
4. 합성 barcode(200%) → NULL
5. `barcode_source`: `DROP DEFAULT` + `DROP NOT NULL` → `barcode IS NULL` 행 `barcode_source = NULL` 정리
6. 사후 불변식 검증(=0)

**범위 외(후속 타입정리 WO)**: `ProductIdentifierType` union 삭제, `STORE_LOCAL`/`PHARMACY_LOCAL`/`SUPPLIER_SKU` 정리. — 이번 WO 에서 하지 않음.

---

## 4. 사후 검증 (프로덕션 census)

| 검증 | 기대 | 실측 | 결과 |
|------|-----:|-----:|:----:|
| `barcode LIKE '200%'` | 0 | 0 | ✅ |
| 활성 `INTERNAL_O4O` | 0 | 0 | ✅ |
| soft-deleted `INTERNAL_O4O` | 17,148 | 17,148 | ✅ |
| 합성(숫자) `mfds_product_id` | 0 | 0 | ✅ |
| `barcode IS NULL` 합계 | 17,172 (1 + 17,171) | 17,172 | ✅ |
| 스냅샷 테이블 rows | 17,171 | 17,171 | ✅ |
| `barcode_source='INTERNAL'` | 0 | 0 | ✅ |
| `barcode_source` 분포 | GTIN 유지 / NULL 신설 | GTIN 181,239 · NULL 17,172 | ✅ |
| `barcode_source` 컬럼 | nullable + no default | `is_nullable=YES`, `default=∅` | ✅ |
| 공식 `MFDS:`/`HIRA:` mfds 보존 | 무변경 | 198,387 | ✅ |

- `barcode_source` GTIN 181,263 → 181,239 = **−24** = 오태깅 23 + smoke 1 (정확히 일치).

### 4.1 세그먼트별 정합

| 세그먼트 | total | barcode NULL | 공식 mfds 유지 | mfds NULL |
|----------|------:|------------:|-------------:|---------:|
| INTERNAL-set (`old_barcode_source='INTERNAL'`) | 17,148 | 17,148 | **17,148** | 0 |
| GTIN-오태깅 23건 | 23 | 23 | — | **23** |

→ INTERNAL-set 은 barcode 만 제거하고 **공식 mfds 전량 보존**, 23건은 barcode·mfds 모두 합성이라 둘 다 제거. WO 원칙과 정확히 일치.

### 4.2 POWER BONE K2 & D5000 (`a7f5272d-7099-491f-b2e8-21d5e13f44f5`)

- `barcode = NULL`, `barcode_source = NULL`, `mfds_product_id = NULL`
- `regulatory_type = 건강기능식품` (유지)
- STORE 설명서 `ko` / `zh` (canonical) **2건 유지**
- UUID·상품명 유지

### 4.3 smoke 상품 (`f1919180…`)

Phase D 대상 아님. barcode 는 이미 NULL 이었고, 오태깅되어 있던 `barcode_source='GTIN'` 이
"barcode 없으면 source 없음" 규칙으로 `NULL` 정규화됨(정체성/유형 무변경). 삭제하지 않음.

---

## 5. 회귀·brower smoke

### 5.1 API (실 토큰, 배포된 엔드포인트)

- `GET /neture/products/library/search` (admin 기본상품 목록): **HTTP 200**, total 198,412, 정상 렌더 — 대량 NULL barcode 에도 무오류.
- `q=파워 본`: total 1, `barcode=null`·`mfds=null`·상품명 유지 (UUID 조회 정상).
- `GET /health/database`: healthy (PG 15.17).

### 5.2 실브라우저 (Playwright, admin.neture.co.kr)

로그인 → 클라이언트 사이드 네비게이션(딥링크 hard-nav 은 /login 바운스 → 문서화된 우회):

| 단계 | 결과 |
|------|:----:|
| admin 로그인 | ✅ |
| O4O 상품 DB → 기본 상품 목록 (바코드 컬럼 렌더) | ✅ |
| `파워 본` 검색 → POWER BONE row + "바코드 없음" cell | ✅ |
| POWER BONE 상세 → 상품명 + "바코드 없음" | ✅ |
| Console errors / API 4xx-5xx | **0 / 0** |

null-safe 표시(`{barcode || '바코드 없음'}`) 정상 동작 확인.

---

## 6. 복원(롤백) 경로

`down()` — 스냅샷 기반 best-effort 복원:
- soft-delete 식별자 `deleted_at = NULL` 복원 (`soft_deleted_identifier_ids`)
- `barcode` / `barcode_source` / `mfds_product_id` 스냅샷 값으로 복원
- `barcode_source` `DEFAULT 'GTIN'` 복원 (NOT NULL 은 신규 NULL 행 존재로 재설정 안 함)

스냅샷 테이블은 감사 목적으로 유지.

---

## 7. 결론

Phase D 완료. 상품 정체성 = UUID 전환의 **기존 데이터 정합**까지 마무리:

- 합성 200 대역 barcode(17,171) 실제 슬롯에서 제거, 활성 INTERNAL_O4O(17,148) soft delete
- 공식 mfds/식별자 전량 보존, 하위 연결 무영향
- barcode_source GTIN 오태깅 종료(nullable + no default)
- 신규(Phase A~C)·기존(Phase D) 양쪽 모두 UUID 단일 정체성으로 수렴

**다음 WO(범위 외)**: ProductIdentifier 타입 union 및 `STORE_LOCAL`/`PHARMACY_LOCAL`/`SUPPLIER_SKU` 타입 정리.
