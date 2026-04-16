# Event Offer (이벤트/특가) — Final Summary

> **상태**: 운영 중 (설계–구현–검증–대시보드 연결 완료)
> **최종 확정**: WO-EVENT-OFFER-FINAL-SUMMARY-DOCUMENT-V1

---

## 1. 개요

Event Offer는 **공급자의 상품을 이벤트 형태로 KPA 약국 네트워크에 노출**하는 기능이다.

- 공급자가 자신의 APPROVED 상품을 이벤트로 제안
- 운영자가 노출 여부를 관리
- 매장(약국)이 HUB에서 직접 확인하고 주문

이 구조를 통해 공급자는 별도 채널 없이 약국에 이벤트 상품을 공급할 수 있고, 운영자는 노출 품질을 관리할 수 있다.

---

## 2. 전체 구조

```
supplier_product_offers (APPROVED)
        │
        ▼  공급자 제안 (POST /kpa/supplier/event-offers)
organization_product_listings
  service_key = 'kpa-groupbuy'
  is_active   = false            ← 제안됨 (미노출)
        │
        ▼  운영자 노출 설정 (PATCH /groupbuy-admin/products/:id/visibility)
organization_product_listings
  is_active = true               ← 노출중
        │
        ▼  HUB 이벤트/특가 목록 노출 (GET /groupbuy/enriched)
매장(약국) 확인 → 선택 → 주문
        │
        ▼  주문 생성 (POST /groupbuy/:id/participate)
checkout_orders
  metadata.serviceKey       = 'kpa-groupbuy'
  metadata.productListingId = OPL.id
  status                    = 'paid'
```

---

## 3. 역할별 흐름

### 공급자 (Neture 공급자)

| 단계 | 화면 / API |
|------|-----------|
| 내 SPO 목록 확인 | `GET /kpa/supplier/my-offers` |
| 이벤트 제안 | `POST /kpa/supplier/event-offers` |
| 제안 상태 확인 | `GET /kpa/supplier/event-offers` (active / pending) |
| 성과 확인 | Neture 대시보드 → 이벤트/특가 현황 블록 |

### 운영자 (KPA 서비스 운영자)

| 단계 | 화면 / API |
|------|-----------|
| 노출할 이벤트 추가 | `POST /groupbuy-admin/products` |
| 노출 / 미노출 토글 | `POST /groupbuy-admin/products/:id/visibility` |
| 이벤트 목록 관리 | `GET /groupbuy-admin/products` |
| 통계 확인 | `GET /groupbuy-admin/stats` |
| 대시보드 KPI | KPA 운영자 대시보드 → 이벤트/특가 섹션 |

### 매장 (약국 운영자)

| 단계 | 화면 / 경로 |
|------|-----------|
| 이벤트 목록 확인 | `/hub/event-offers` |
| 주문 | `POST /groupbuy/:id/participate` |
| 참여 이력 조회 | `/event-offers/history` |
| 대시보드 요약 | 매장 마케팅 대시보드 → 이벤트/특가 섹션 |

---

## 4. 상태 정의

| 상태 | 조건 | 의미 |
|------|------|------|
| 제안됨 | OPL + `is_active = false` | 미노출. 운영자 검토 대기 |
| 노출중 | OPL + `is_active = true` | HUB에 표시. 주문 가능 |
| 종료 | `end_date` 경과 또는 `is_active = false` 재설정 | 주문 불가. 이력은 보존 |

- 승인/심사 단계 없음
- 운영자가 노출 여부를 직접 토글

---

## 5. 주문 구조

- 매장은 HUB 테이블에서 여러 이벤트 상품을 선택해 **한 번에 주문** 가능
- **공급업체별로 주문 분리**: 같은 화면에서 선택해도 업체 단위로 별도 `checkout_orders` 생성
- 이벤트 주문은 일반 매장 상품 주문과 완전히 분리 (식별자: `metadata.serviceKey = 'kpa-groupbuy'`)
- 매장 상품으로 복사하지 않음 — HUB에서 직접 주문

```
선택: A업체 상품 2종 + B업체 상품 1종
  ↓
A업체 → checkout_orders #1 (totalAmount = A업체 합계)
B업체 → checkout_orders #2 (totalAmount = B업체 합계)
```

---

## 6. 데이터 흐름

```
neture_suppliers (공급자 계정)
  └─ supplier_product_offers (SPO, APPROVED)
       └─ organization_product_listings (OPL, service_key='kpa-groupbuy')
            ├─ is_active=false → 미노출
            └─ is_active=true  → 노출
                  └─ checkout_orders
                       metadata.serviceKey       = 'kpa-groupbuy'
                       metadata.productListingId = OPL.id
                       status                    = 'paid'
```

**공급자 성과 집계 경로**:
`neture_suppliers` → `supplier_product_offers` → `organization_product_listings` → `checkout_orders`

---

## 7. 대시보드 연결

| 역할 | 대시보드 | 표시 항목 |
|------|---------|---------|
| 공급자 | Neture SupplierDashboardPage | 전체 이벤트, 노출중, 이벤트 주문, 이벤트 매출 |
| 운영자 | KpaOperatorDashboardPage | 이벤트/특가 전체, 노출중, 이벤트 주문 |
| 매장 | StoreMarketingDashboardPage | 최근 참여 이벤트 5건, 이력/HUB 바로가기 |

- 모두 **기존 API 재사용** (신규 API: 공급자 stats 1개만 추가)
- API 실패 시 각 섹션만 조용히 숨김 (대시보드 전체 영향 없음)

---

## 8. UI 구조 (/hub/event-offers)

| 요소 | 내용 |
|------|------|
| 레이아웃 | 테이블형 리스트 |
| 상태 탭 | 진행중 / 종료 / 전체 |
| 컬럼 | 이벤트명, 공급업체, 가격, 기간, 상태, 주문 |
| 주문 방식 | 체크박스 선택 → 하단 주문 패널 → 공급업체별 분리 제출 |
| 단건 주문 | 각 행에서 바로 주문 가능 |
| 운영자 뷰 | 동일 화면에서 통계 카드(총 주문, 매출, 참여 매장, 등록 상품) 추가 노출 |

---

## 9. 핵심 정책

| 정책 | 내용 |
|------|------|
| 기간 기반 노출 | `start_date` ~ `end_date` 기준 자동 필터 |
| 기본 필터 | 진행중 이벤트만 표시 (종료 이벤트는 탭 전환으로 확인) |
| 종료 이벤트 | 주문 불가, 이력/통계는 보존 |
| 주문 분리 | 공급업체별 독립 주문 (`checkout_orders` 별도 생성) |
| 상품 분리 | 이벤트 상품은 매장 일반 상품과 무관 |
| 노출 관리 | 운영자 전용 (공급자는 노출 직접 변경 불가) |

---

## 10. 금지 사항

- DB schema 변경 금지 (OPL 구조, `offer_id` nullable 변경 불가)
- 신규 승인 단계 추가 금지 (제안→노출 2단계 유지)
- Event Offer를 일반 상품 구조(`products` 테이블)로 흡수 금지
- `service_key = 'kpa-groupbuy'` 변경 금지
- 기존 주문(`checkout_orders`)과 통계 분리 원칙 유지

---

## 11. 관련 파일

| 역할 | 파일 |
|------|------|
| 백엔드 주문 처리 | `apps/api-server/src/routes/kpa/services/groupbuy.service.ts` |
| 백엔드 운영자 API | `apps/api-server/src/routes/kpa/controllers/groupbuy-operator.controller.ts` |
| 백엔드 공급자 API | `apps/api-server/src/routes/kpa/controllers/supplier-offers.controller.ts` |
| 매장 HUB 화면 | `services/web-kpa-society/src/pages/event-offer/KpaEventOfferPage.tsx` |
| 운영자 관리 화면 | `services/web-kpa-society/src/pages/intranet/event-offer/EventOfferManagePage.tsx` |
| 공급자 제안 화면 | `services/web-kpa-society/src/pages/supplier/SupplierEventOfferPage.tsx` |
| 매장 이력 화면 | `services/web-kpa-society/src/pages/event-offer/EventOfferHistoryPage.tsx` |
| 운영 정책 문서 | `docs/event-offer/EventOffer-Operation-Policy.md` |

---

## 한 줄 정의

> Event Offer는 공급자가 APPROVED 상품을 이벤트로 제안하고, 운영자가 노출을 관리하며, 매장이 HUB에서 직접 선택·주문하고, 공급업체별로 분리된 주문으로 처리되는 구조이다.
