# IR-NETURE-STRUCTURE-FREEZE-V1

> **Neture Structure Freeze v1.0**
> Declared at: 2026-03-03
> Scope: Neture Domain Only

---

## 1. 선언

Neture 도메인의 1차 구조를 기준선으로 확정한다.
이 문서에 명시된 테이블, API, 엔티티 구조는 명시적 Work Order 없이 변경할 수 없다.

**적용 범위:** `apps/api-server/src/modules/neture/` 및 관련 마이그레이션

**허용:** 버그 수정, 성능 개선, 문서, 테스트
**금지:** 구조 변경 (WO 필수)

---

## 2. 도메인 정의

- Neture는 **공급자 중심 유통 플랫폼**이다.
- 공급자는 **콘텐츠 생산자가 아니다.** (CMS Producer 역할 없음)
- 공급자 자료실(`neture_supplier_contents`)은 **자산 저장소**이며, HUB 실행 콘텐츠가 아니다.
- HUB 자동 연동은 존재하지 않는다.
- 상품 구조는 **ProductMaster(물리 상품 SSOT) + SupplierProductOffer(유통 조건)** 이원 구조이다.

---

## 3. 현재 테이블 목록

### Core Tables

| 테이블 | 엔티티 | 설명 |
|--------|--------|------|
| `neture_suppliers` | NetureSupplier | 공급자 마스터 |
| `product_masters` | ProductMaster | 물리 상품 SSOT (바코드, MFDS) |
| `supplier_product_offers` | SupplierProductOffer | 공급자별 유통 조건 (가격, 분배) |
| `store_product_profiles` | StoreProductProfile | 매장별 상품 프로필 |

### Content & Library Tables

| 테이블 | 엔티티 | 설명 |
|--------|--------|------|
| `neture_supplier_contents` | NetureSupplierContent | 공급자 자료실 (이미지, 설명, 가이드) |

### Partnership & Contract Tables

| 테이블 | 엔티티 | 설명 |
|--------|--------|------|
| `neture_partnership_products` | NeturePartnershipProduct | 파트너십 상품 |
| `neture_partnership_requests` | NeturePartnershipRequest | 파트너십 요청 |
| `neture_seller_partner_contracts` | NetureSellerPartnerContract | 판매자-파트너 계약 |
| `neture_partner_recruitments` | NeturePartnerRecruitment | 파트너 모집 |
| `neture_partner_applications` | NeturePartnerApplication | 파트너 지원 |

### Dashboard Tables

| 테이블 | 엔티티 | 설명 |
|--------|--------|------|
| `neture_partner_dashboard_items` | NeturePartnerDashboardItem | 파트너 대시보드 항목 |
| `neture_partner_dashboard_item_contents` | NeturePartnerDashboardItemContent | 대시보드 항목 콘텐츠 링크 |

### CSV Import Tables

| 테이블 | 엔티티 | 설명 |
|--------|--------|------|
| `supplier_csv_import_batches` | SupplierCsvImportBatch | CSV 일괄 가져오기 배치 |
| `supplier_csv_import_rows` | SupplierCsvImportRow | CSV 행 단위 검증/처리 |

---

## 4. API 기준선

### Supplier API (`/api/v1/neture/supplier/*`)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/supplier/register` | 공급자 등록 |
| GET | `/supplier/products` | 내 상품 목록 |
| POST | `/supplier/products` | 상품 등록 |
| PATCH | `/supplier/products/:id` | 상품 수정 |
| GET | `/supplier/contents` | 자료실 목록 |
| POST | `/supplier/contents` | 자료 등록 |
| PATCH | `/supplier/contents/:id` | 자료 수정 |
| DELETE | `/supplier/contents/:id` | 자료 삭제 |
| GET | `/supplier/dashboard/summary` | 대시보드 요약 |
| GET | `/supplier/profile` | 프로필 조회 |
| PATCH | `/supplier/profile` | 프로필 수정 |

### CSV Import API (`/api/v1/neture/supplier/csv-import/*`)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/supplier/csv-import/upload` | CSV 업로드 |
| GET | `/supplier/csv-import/batches` | 배치 목록 |
| GET | `/supplier/csv-import/batches/:id` | 배치 상세 |
| POST | `/supplier/csv-import/batches/:id/apply` | 배치 적용 |

### Partner API (`/api/v1/neture/partner/*`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/partner/recruiting-products` | 모집 상품 목록 |
| GET | `/partner/recruitments` | 모집 목록 |
| POST | `/partner/applications` | 지원 신청 |
| POST | `/partner/applications/:id/approve` | 지원 승인 |
| POST | `/partner/applications/:id/reject` | 지원 거절 |
| POST | `/partner/contracts/:id/terminate` | 계약 해지 |
| GET | `/partner/dashboard/summary` | 대시보드 요약 |
| GET | `/partner/contracts` | 계약 목록 |
| GET | `/partner/contents` | 콘텐츠 목록 |

### Seller API (`/api/v1/neture/seller/*`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/seller/my-products` | 내 판매 상품 |
| GET | `/seller/available-supply-products` | 공급 가능 상품 |
| POST | `/seller/service-products/:productId/apply` | 판매 신청 |
| GET | `/seller/service-applications` | 신청 목록 |
| GET | `/seller/contracts` | 계약 목록 |

### Admin API (`/api/v1/neture/admin/*`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/admin/suppliers` | 공급자 목록 |
| GET | `/admin/suppliers/pending` | 승인 대기 공급자 |
| POST | `/admin/suppliers/:id/approve` | 공급자 승인 |
| POST | `/admin/suppliers/:id/reject` | 공급자 거절 |
| GET | `/admin/products` | 상품 목록 |
| GET | `/admin/products/pending` | 승인 대기 상품 |
| POST | `/admin/products/:id/approve` | 상품 승인 |
| POST | `/admin/products/:id/reject` | 상품 거절 |
| GET | `/admin/masters` | 마스터 목록 |
| POST | `/admin/masters/resolve` | 마스터 해석 |
| PATCH | `/admin/masters/:id` | 마스터 수정 |
| GET | `/admin/dashboard/summary` | 대시보드 요약 |

---

## 5. 변경 시 승인 필요 항목

다음 변경은 **명시적 Work Order**가 필요하다:

1. **테이블 구조 변경** — 컬럼 추가/삭제/타입 변경
2. **Enum 수정** — `distribution_type`, 계약 상태 등
3. **Supplier → HUB 연결 추가** — Producer 역할, 콘텐츠 자동 배포
4. **계약/정산 계산 로직 변경** — Commission 비율, 정산 주기
5. **API 엔드포인트 추가/삭제** — 기존 API 계약 변경
6. **엔티티 관계 변경** — FK 추가/삭제, 새로운 JOIN 경로

---

## 6. 제거된 구조 요약

| 항목 | 상태 | WO |
|------|------|-----|
| `NetureSupplierProduct` 엔티티 | 제거됨 | WO-O4O-PRODUCT-MASTER-CORE-RESET-V1 |
| `NetureSupplierRequest` 엔티티 | 제거됨 | WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1 |
| `NetureSupplierRequestEvent` 엔티티 | 제거됨 | WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1 |
| `NetureCampaignAggregation` 엔티티 | 제거됨 | WO-NETURE-CAMPAIGN-CLEAN-CORE-V1 |
| `NetureTimeLimitedPriceCampaign` 엔티티 | 제거됨 | WO-NETURE-CAMPAIGN-CLEAN-CORE-V1 |
| CMS supplier authorship | 해당 없음 | 구현된 적 없음 |
| Signage supplier 생성 | 해당 없음 | 구현된 적 없음 |
| HUB producer=supplier | 해당 없음 | 구현된 적 없음 |

---

## 7. 관련 Freeze 문서

| Freeze | 문서 | 일자 |
|--------|------|------|
| Neture Partner Contract | `docs/baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md` | 2026-02-24 |
| Neture Distribution Engine | `docs/baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md` | 2026-02-27 |
| Neture Domain Architecture | `docs/baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V1.md` | 2026-03-01 |

---

## 8. Git 태그

```
Tag: v-neture-1.0-freeze
Commit: main HEAD at 2026-03-03
```

---

*Declared: 2026-03-03*
*Status: FROZEN*
