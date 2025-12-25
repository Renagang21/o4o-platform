# E-Commerce & Dropshipping Extensions Analysis (C1-3)

> **Phase**: C1 - Core Extension Cleanup
> **Core**: ecommerce-core, dropshipping-core
> **분석일**: 2025-12-25
> **상태**: 분석 및 수정 완료

---

## 1. Core 패키지 상태

### ecommerce-core (FROZEN)
- **버전**: 1.0.0
- **역할**: Sales Ledger (Source of Truth)
- **Entities**: EcommerceOrder, EcommerceOrderItem, EcommercePayment
- **OrderType**: RETAIL, DROPSHIPPING, B2B, SUBSCRIPTION
- **Lifecycle**: ✅ 완결

### dropshipping-core
- **버전**: 1.0.0
- **역할**: Multi-vendor dropshipping engine
- **Entities**: Supplier, Seller, ProductMaster, SupplierProductOffer, SellerListing, OrderRelay, SettlementBatch
- **E-commerce 연동**: `OrderRelay.ecommerceOrderId` → FK
- **Lifecycle**: ✅ 완결

---

## 2. 확장앱 분류

### 2.1 Cosmetics Suite (3-sided Platform)

| 패키지 | 역할 | 의존성 | Lifecycle |
|--------|------|--------|-----------|
| dropshipping-cosmetics | 화장품 특화 메타데이터 | dropshipping-core | ✅ 완결 |
| cosmetics-seller-extension | 판매원 운영 (Display, Sample, KPI) | dropshipping-cosmetics | ✅ 수정됨 |
| cosmetics-supplier-extension | 공급사 운영 (Price, Campaign) | dropshipping-cosmetics | ✅ 수정됨 |
| cosmetics-partner-extension | 파트너 운영 (Routine, Earnings) | dropshipping-cosmetics | ✅ 완결 |
| cosmetics-sample-display-extension | 샘플/디스플레이 통합 | seller + supplier | ✅ 수정됨 |

### 2.2 Operations Apps (AppStore 비대상)

| 패키지 | 역할 | Type |
|--------|------|------|
| sellerops | 범용 판매자 앱 | application |
| supplierops | 범용 공급자 앱 | application |
| partnerops | 범용 파트너 앱 | application |

### 2.3 Experimental

| 패키지 | 역할 | 상태 |
|--------|------|------|
| market-trial | 시범판매 펀딩 | Experimental |

---

## 3. 의존성 그래프

```
ecommerce-core (FROZEN - Source of Truth)
└── OrderType 정의 (RETAIL, DROPSHIPPING, B2B, SUBSCRIPTION)

dropshipping-core
├── OrderRelay.ecommerceOrderId → EcommerceOrder (FK)
└── dropshipping-cosmetics
    ├── cosmetics-seller-extension
    │   └── cosmetics-sample-display-extension
    ├── cosmetics-supplier-extension
    │   ├── cosmetics-sample-display-extension
    │   └── cosmetics-partner-extension
    └── cosmetics-partner-extension
        └── market-trial (optional)
```

---

## 4. 수정 완료 항목

### 4.1 Lifecycle 파일 생성

| 패키지 | 생성된 파일 |
|--------|-------------|
| cosmetics-seller-extension | install.ts, activate.ts, deactivate.ts, uninstall.ts |
| cosmetics-supplier-extension | install.ts, activate.ts, deactivate.ts, uninstall.ts |
| cosmetics-sample-display-extension | install.ts, activate.ts, deactivate.ts, uninstall.ts |
| annualfee-yaksa | install.ts, activate.ts, deactivate.ts, uninstall.ts |
| organization-lms | install.ts, activate.ts, deactivate.ts, uninstall.ts |
| signage-pharmacy-extension | install.ts, activate.ts, deactivate.ts, uninstall.ts |

---

## 5. CLAUDE.md §7 준수 확인

### 5.1 준수 항목

| 항목 | 상태 |
|------|------|
| OrderType 불변성 | ✅ Enum으로 정의 |
| ecommerceOrderId FK | ✅ OrderRelay에 구현 |
| EcommerceOrderService.create() | ✅ 중앙 주문 생성 |

### 5.2 권고 사항 (선택)

- Extension에서 주문 생성 시 EcommerceOrderService 호출 문서화
- OrderType 검증 미들웨어 추가 (Phase 2+)

---

## 6. 존치 근거 명확화

| 패키지 | 존치 이유 | 삭제/병합 필요 |
|--------|-----------|----------------|
| ecommerce-core | FROZEN Core | ❌ 불가 |
| dropshipping-core | 도메인 Core | ❌ 불필요 |
| dropshipping-cosmetics | 화장품 특화 | ❌ 불필요 |
| cosmetics-seller-extension | 판매원 역할 | ❌ 불필요 |
| cosmetics-supplier-extension | 공급사 역할 | ❌ 불필요 |
| cosmetics-partner-extension | 파트너 역할 | ❌ 불필요 |
| cosmetics-sample-display-extension | 샘플 통합 | ❌ 불필요 |
| market-trial | 실험적 기능 | ❌ Experimental |

---

## 7. 결론

**E-commerce/Dropshipping 확장앱 생태계 판정: ✅ 건강함**

- 3-sided platform 구조: 올바름 (Seller-Supplier-Partner)
- E-commerce Core 연동: ecommerceOrderId FK 정상
- Lifecycle: 모든 패키지 완결 (6개 파일 생성)

---

*Phase C1-3 분석 완료*
*작성일: 2025-12-25*
