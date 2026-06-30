# CHECK-O4O-PRODUCT-MASTER-REPRESENTATIVE-LINK-FOUNDATION-V1

> WO-O4O-PRODUCT-MASTER-REPRESENTATIVE-LINK-FOUNDATION-V1 구현 검증 문서.
> 성격: 스키마 foundation (additive only). 동결 Core(`product_masters`) 변경 — 명시적 WO 기준.
> 작성일: 2026-06-30
> 선행: `docs/investigations/IR-O4O-STANDARD-PRODUCT-REPRESENTATIVE-GROUPING-AND-STORE-CONTENT-DIRECTION-V1.md`, `docs/checks/CHECK-O4O-DRUG-STANDARD-CODE-CSV-SAMPLE-MAPPING-V1.md`

---

## 1. 목적

O4O 표준상품 구조에 **대표상품(그룹핑) 계층**을 추가하기 위한 최소 DB foundation 을 additive 로 도입한다.

- 포장단위/SKU SSOT = 기존 `ProductMaster`(`product_masters`) 유지 (의미 불변).
- 대표상품 = 신규 `representative_products` 1개 테이블 + `product_masters.representative_product_id` nullable FK 1개.
- 대표상품은 콘텐츠/소비자안내/대표노출/그룹핑 기준이며 **주문 단위 아님**. 주문·공급은 기존 ProductMaster / SupplierProductOffer / OrganizationProductListing 유지.

## 2. 작업 범위

**포함**: `representative_products` 테이블 / `product_masters.representative_product_id` nullable FK / RepresentativeProduct entity / ProductMaster nullable relation field(additive) / entity registry 등록 / migration.

**아님**(금지 준수): 약가마스터 CSV import, candidate import 설계, 대표상품 자동생성, ProductMaster 자동매칭/backfill, ProductIdentifier 자동부착, StoreLocalProduct 연결, 공급자 등록 검색/prefill, 운영자 대표상품 UI, 바코드 검증/신고, B2C/B2B 설명 병합, AI 설명.

## 3. Core 동결 정책 확인

- 대상 = neture 모듈 `product_masters` (barcode/MFDS 실물 SSOT). `dropshipping_product_masters`(legacy)와 무관 — 손대지 않음.
- `O4O-CORE-FREEZE-V1`(F10)에 ProductMaster 미포함(Auth/Membership/Approval/RBAC만). grep 0건.
- ProductMaster 를 동결하는 근거: 엔티티 헤더 `WO-O4O-PRODUCT-MASTER-CORE-RESET-V1`(immutable 필드 명시) + `NETURE-DISTRIBUTION-ENGINE-FREEZE-V1`(F8). 두 동결 모두 "구조 변경은 명시적 WO 필수" 원칙.
- **본 WO 가 그 명시적 WO**. immutable 필드(barcode/regulatory_*/manufacturer_name/mfds_* 등) 무변경, additive nullable 컬럼 1개만 추가 → 동결 원칙 충족.
- Boundary(CLAUDE.md §7): `product_masters → representative_products` nullable FK 는 Commerce 경계(ecommerce_order_items/organization_product_listings/organization_product_channels 참조 금지)에 해당하지 않음 → 위반 아님.

## 4. ProductMaster 소비처 영향평가

| 소비처 | 소비방식 | nullable 추가 영향 | 수정 |
|---|---|---|---|
| `modules/neture/services/catalog.service.ts` (주 생성경로) | `masterRepo.create({...})` 부분객체 → `save()` | 누락 필드 = NULL, 안전 | 없음 |
| `modules/admin/seed-neture-offers.controller.ts` | raw `INSERT (명시 컬럼리스트) VALUES` | 새 컬럼 미포함 → NULL, 안전 | 없음 |
| `csv-import.service.ts` / `catalog-import.service.ts` / `product-candidate.service.ts` / `product-drug-extension.service.ts` | repo create/save·부분 SELECT | additive nullable 무영향 | 없음 |
| `SupplierProductOffer` (master 1:1) | 관계 참조 | 무관 | 없음 |
| `OrganizationProductListing` (master_id 필수 FK) | 관계 참조 | 무관 | 없음 |
| `ProductImage` / `ProductIdentifier` (master 1:N) | 자식 관계 | 무관 | 없음 |
| `StoreLocalProduct` | ProductMaster와 관계 없음(Display Domain 분리) | 무관 | 없음(범위 외) |
| API 응답(ProductMaster 직렬화) | 엔티티 반환 | nullable 필드 additive 노출, 기존 필드 무변경 | 없음(contract breaking 아님) |
| `database/entities.ts` | 엔티티 registry | RepresentativeProduct 등록 필요 | 추가(additive) |

**결론: breaking 위험 0건.** 필수값 추가 없음 / 기존 흐름 무변경 / additive only.

## 5. DB 변경 내역

migration: `apps/api-server/src/database/migrations/20261202000000-CreateRepresentativeProductsAndLink.ts`

- `CREATE TABLE representative_products` (신규 빈 테이블).
- `ALTER TABLE product_masters ADD COLUMN representative_product_id UUID NULL` + FK(`ON DELETE SET NULL`).
- `CREATE INDEX idx_product_masters_representative_product_id` (UNIQUE 아님).
- 기존 row UPDATE/backfill 없음. down() 으로 전부 역전 가능.

## 6. representative_products 스키마

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | UUID | PK, default gen_random_uuid() |
| display_name | VARCHAR(255) | **NOT NULL (유일 필수)** |
| manufacturer_name | VARCHAR(255) | **nullable** (업체 혼입 7~8% → 자동파생 금지) |
| thumbnail_image_id | UUID | nullable |
| metadata | JSONB | nullable |
| created_at / updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() |

## 7. product_masters.representative_product_id nullable FK

- `UUID NULL`, 기본값 없음 → 기존/신규 row 전부 NULL 허용.
- FK → `representative_products(id)` `ON DELETE SET NULL` (대표상품 삭제 시 멤버 ProductMaster 보존, 링크만 해제. ProductMaster 삭제 금지).
- 인덱스 1개(대표상품→ProductMaster 목록 조회). UNIQUE 없음(자동 중복방지 정책 미생성).

## 8. 기존 흐름 보존 확인

- `catalog.service.ts` create 경로: 부분객체 create → 새 컬럼 미지정 시 NULL. 정상.
- raw INSERT(seed): 명시 컬럼리스트 → 새 컬럼 자동 NULL. 정상.
- 조회·주문·공급자·매장 흐름에 필수값 추가 없음. `SupplierProductOffer`/`OrganizationProductListing`/`ProductImage`/`ProductIdentifier` 조회 contract 변화 없음.
- ESM 규칙 준수(`import type` + 문자열 관계명 `@ManyToOne('RepresentativeProduct', 'productMasters', ...)` / `@OneToMany('ProductMaster', 'representativeProduct')`).

## 9. 금지 범위 준수 확인

import/parser/candidate/자동생성/backfill/자동부착/StoreLocalProduct 연결/UI 변경/검색 UX/바코드 검증/설명 병합/AI 설명 — **전부 미구현**. UNIQUE 자동 중복방지도 미생성. grep `representative_products` 사전 0건(클린 신규).

## 10. 테스트 결과

- `npx tsc --noEmit`(api-server): PASS (오류 0).
- migration 정적 검토: up/down 대칭, IF NOT EXISTS/IF EXISTS 가드, FK 중복생성 가드(DO $$).
- 브라우저 smoke: UI 변경 없음 → 불필요(WO 명시).

## 11. 위험 요소

- 운영 적용은 prod DB 마이그레이션을 동반(CI/CD 자동). 단 additive + nullable + backfill 0 → 기존 데이터/흐름 영향 없음.
- push 보류: 동결 Core 변경이므로 사용자 확인 후 별도 push.

## 12. 후속 작업

- `IR-O4O-DRUG-STANDARD-CODE-CANDIDATE-IMPORT-DESIGN-V1` (약가마스터 정제·candidate import 설계)
- `WO-O4O-SUPPLIER-PRODUCT-STANDARD-MASTER-LOOKUP-PREFILL-V1`
- `WO-O4O-STORE-LOCAL-PRODUCT-REPRESENTATIVE-LINK-V1`
- `WO-O4O-STORE-LOCAL-PRODUCT-CONTENT-REFERENCE-VIEW-COPY-V1`

---

## 최종 결론

본 WO 는 대표상품 계층 foundation 이다. 포장단위/SKU 는 기존 `ProductMaster` 가 계속 담당하고, 대표상품은 신규 `representative_products`, ProductMaster 는 nullable `representative_product_id` 로 선택 연결한다. 기존 공급자상품/주문가능상품/이미지/식별자는 ProductMaster 중심 구조를 재사용한다. 이번엔 공공데이터 import / 대표상품 자동생성 / backfill / candidate import 설계를 하지 않는다. 약가마스터 정제·candidate import 는 별도 IR 로 위임한다.
