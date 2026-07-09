# CHECK-O4O-STORE-HANDLED-PRODUCT-DESCRIPTION-SELECTION-V1

Status: DONE — 코드 완료 + typecheck PASS + 배포 성공 + 프로덕션 DB/API/브라우저 smoke PASS (2026-07-09)
WO: `WO-O4O-STORE-HANDLED-PRODUCT-DESCRIPTION-SELECTION-V1`
Baseline: [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](../baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md) (F12)
선행: [`CHECK-O4O-PRODUCT-DESCRIPTION-TYPE-IMPLEMENTATION-V1`](CHECK-O4O-PRODUCT-DESCRIPTION-TYPE-IMPLEMENTATION-V1.md)

Scope: KPA `/store/handled-products` 매장 경영활용 제품(O4O 기반)이 사용할 **DESCRIPTION Resource(STORE / SUPPLIER_STORE) 선택** 기능.

---

## 1. 변경 파일 (커밋 `f4b350e1a`)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/database/migrations/20261224000000-CreateStoreProductDescriptionSelections.ts` | 신규 연결 테이블 마이그레이션 |
| `apps/api-server/src/routes/platform/store-handled-products.routes.ts` | GET/PUT `/handled-products/:id/description-selections` |
| `apps/api-server/src/routes/o4o-store/controllers/store-product-library.controller.ts` | 등록(POST /list, master) 시 STORE canonical 자동 선택 |
| `services/web-kpa-society/src/api/handledProducts.ts` | `fetchDescriptionSelections` / `saveDescriptionSelections` + 타입 |
| `services/web-kpa-society/src/pages/pharmacy/DescriptionSelectionModal.tsx` | 신규 사용 설명서 선택 모달 |
| `services/web-kpa-society/src/pages/pharmacy/StoreHandledProductsPage.tsx` | listing 행 '사용 설명서' 버튼 + 모달 연결 |

## 2. 신규 테이블 스키마 — `store_product_description_selections`
```
id                              uuid pk default gen_random_uuid()
organization_id                 uuid not null       -- 매장 경계
master_id                       uuid not null       -- ProductMaster (FK 아님 — Freeze #6)
organization_product_listing_id uuid null           -- handled product(listing)
description_id                  uuid not null       -- shared_product_descriptions.id (계층1 Resource)
description_type                varchar(32) not null -- STORE | SUPPLIER_STORE
is_enabled                      boolean not null default true
created_at / updated_at         timestamptz not null default now()
deleted_at                      timestamptz null
```
인덱스: `idx_spds_org_master` · `idx_spds_listing` · **`uniq_spds_active` UNIQUE (org, master, description_type, description_id) WHERE deleted_at IS NULL**.

## 3. API 경로
- `GET  /api/v1/store/handled-products/:id/description-selections` — :id=listing. 선택 가능(STORE/SUPPLIER_STORE canonical) + 현재 선택 상태.
- `PUT  /api/v1/store/handled-products/:id/description-selections` — body `{ selectedDescriptionIds: [] }` 로 재조정(upsert).
- 서버 검증: listing 이 현재 org 소유 · description_id 가 해당 master 의 STORE/SUPPLIER_STORE canonical 집합에 속함 · 아니면 400 `INVALID_SELECTION`. ProductMaster 수정 없음.

## 4. UI 위치
- `/store/handled-products` 표의 **관리 열** — O4O 기반 제품(listing) 행에만 **'사용 설명서'** 버튼. 클릭 → `DescriptionSelectionModal`(STORE/SUPPLIER_STORE 체크박스, 저장). 매장 경영활용(local) 행에는 미노출(master 없음).

## 5. 자동 선택 정책
- O4O 표준 상품 등록(POST /store/products/list, master) 시 **STORE canonical 있으면 자동 선택**(is_enabled=true). SUPPLIER_STORE 는 자동 선택하지 않음(매장 경영자 수동). 자동 선택 실패는 등록 성공을 막지 않음(경고 로그만).

## 6. Freeze 준수
- **Freeze #6**: ProductMaster 무변경. 선택 관계는 별도 테이블(`Resource.product_master_id` 방향 유지, product_masters 에 FK 신설 없음).
- **Freeze #5**: 계층1(Product Resource=shared_product_descriptions) 참조만. 계층2(매장 실행 자산) 미접촉.

## 7. typecheck
- api-server 변경 파일 EXIT 0 · web-kpa-society EXIT 0 (병렬 세션 `drug-otc-*` 스크립트 에러는 무관·build 제외).

## 8. 배포
- 커밋 `f4b350e1a` → **Deploy API Server + Deploy Web Services 모두 `completed success`** (내 SHA). 마이그레이션 CI/CD 자동 실행.

## 9. 프로덕션 검증 (2026-07-09)

### 9.1 DB (read-only, cloud-sql-proxy)
- `store_product_description_selections` 테이블 존재 · 인덱스 4종(pkey/idx_spds_org_master/idx_spds_listing/uniq_spds_active) 생성 확인.

### 9.2 API end-to-end (kpa-society.co.kr, 약국 경영자 renagang21, 인증 fetch)
테스트 제품 = "뇌선"(canonical STORE 보유 master).

| # | 항목 | 결과 |
|---|---|:---:|
| 1 | 등록(POST /store/products/list) | **PASS** — 201 NEW, listing 생성 |
| 2 | **STORE 자동 선택** | **PASS** — 등록 직후 GET: STORE `selected:true`(canonical), SUPPLIER_STORE `exists:false, selected:false` |
| 3 | 해제(PUT []) | **PASS** — STORE `selected:false` |
| 4 | 재선택(PUT [storeId]) | **PASS** — STORE `selected:true` |
| 5 | 잘못된 description_id | **PASS** — 400 `INVALID_SELECTION` |

### 9.3 브라우저 UI smoke
- `/store/handled-products` — 뇌선(O4O 기반) 행에 **'사용 설명서' 버튼** 노출.
- 모달: **O4O 매장내 사용 설명서 = 체크(사용중)** · 공급업체 제공 매장내 설명서 = 비활성(**없음**) · "상품 원본(ProductMaster)은 변경되지 않습니다" 안내. (스크린샷 확인)

## 10. 이번 WO 미포함 (후속)
SUPPLIER_STORE 설명서 생성/등록 화면 · 설명서 본문 편집 · 승인 workflow · B2B/B2C 선택 · `/r/{id}` · Resource QR · POP/Video/Tablet/Blog/Signage/OSMU.

## 11. 완료 기준 체크
- [x] 신규 테이블 생성 · ProductMaster 무변경(Freeze #6) · 계층2 미접촉(Freeze #5)
- [x] 기존 매장 경영활용 제품 목록 정상 · 상품 등록 시 STORE 자동 선택
- [x] 사용 설명서 섹션(모달) 표시 · O4O STORE 선택/해제 · SUPPLIER_STORE 존재 시 선택/해제(구조 준비, 뇌선은 미보유로 비활성)
- [x] 다른 org listing 수정 불가(소유 검증) · description_id 타 master 시 400 거부
- [x] typecheck PASS · browser smoke PASS · CHECK 작성 · commit/push 완료
