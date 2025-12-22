# Pharmaceutical-Core Extension Transition Plan

> **Status:** Phase2 준비 완료 - Phase3 실행 대기
> **Date:** 2025-12-22
> **Target Phase:** Phase3

---

## 1. Executive Summary

`pharmaceutical-core`는 현재 `appType: 'core'`로 분류되어 있지만, 실제로는 `dropshipping-core`의 Extension 역할을 수행합니다.

### 1.1 현재 상태

| 항목 | 현재 값 |
|------|--------|
| Package Name | `@o4o/pharmaceutical-core` |
| App Type | `core` |
| Dependencies | `dropshipping-core` |
| Extension Interface | `targetCore: 'dropshipping-core'` |
| Supported ProductTypes | `['pharmaceutical']` |

### 1.2 문제점

1. **Core 오분류**: 산업군 특화 기능이 Core로 분류됨
2. **의존성 역전**: Core가 다른 Core에 의존 (dropshipping-core)
3. **명명 불일치**: Core인데 Extension처럼 동작

### 1.3 권장 조치

| 항목 | 현재 | 목표 |
|------|------|------|
| App Type | `core` | `extension` |
| Package Name | `pharmaceutical-core` | `pharmaceutical-extension` (선택) |
| 분류 | Domain Core | Industry Extension |

---

## 2. 현재 구조 분석

### 2.1 파일 구조

```
packages/pharmaceutical-core/
├── src/
│   ├── backend/
│   │   └── index.ts
│   ├── controllers/
│   │   ├── dispatch.controller.ts
│   │   ├── offers.controller.ts
│   │   ├── orders.controller.ts
│   │   ├── products.controller.ts
│   │   ├── settlement.controller.ts
│   │   └── index.ts
│   ├── entities/
│   │   ├── PharmaProductMaster.entity.ts
│   │   ├── PharmaOffer.entity.ts
│   │   ├── PharmaOrder.entity.ts
│   │   ├── PharmaDispatch.entity.ts
│   │   ├── PharmaSettlementBatch.entity.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── pharmaceutical-extension.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── PharmaProductService.ts
│   │   ├── PharmaOfferService.ts
│   │   ├── PharmaOrderService.ts
│   │   ├── PharmaDispatchService.ts
│   │   ├── PharmaSettlementService.ts
│   │   └── index.ts
│   ├── lifecycle/
│   ├── manifest.ts
│   └── index.ts
└── package.json
```

### 2.2 소유 테이블

| 테이블 | 용도 |
|--------|------|
| `pharma_product_masters` | 의약품 상품 마스터 |
| `pharma_offers` | 도매 Offer |
| `pharma_orders` | B2B 주문 |
| `pharma_settlement_batches` | 정산 배치 |

### 2.3 Extension Interface

이미 `extensionInterface` 필드가 manifest에 존재:

```typescript
extensionInterface: {
  targetCore: 'dropshipping-core',
  extensionExport: 'pharmaceuticalExtension',
  supportedProductTypes: ['pharmaceutical'],
  hooks: {
    validateOfferCreation: true,
    validateListingCreation: true,  // Always block
    validateOrderCreation: true,
    beforeSettlementCreate: true,
    beforeCommissionApply: true,
    afterCommissionApply: true,
  },
}
```

### 2.4 의존성 현황

```
pharmaceutical-core
    └── dropshipping-core (Core 의존 - 문제)
```

---

## 3. 전환 계획

### 3.1 Phase3 작업 목록

| Step | 작업 | 위험도 |
|------|------|--------|
| 1 | manifest.ts의 `appType: 'core'` → `appType: 'extension'` 변경 | Low |
| 2 | AppStore Catalog 업데이트 | Low |
| 3 | admin-dashboard 메뉴 그룹 재분류 | Low |
| 4 | 문서 업데이트 | Low |

### 3.2 변경 대상 파일

```
1. packages/pharmaceutical-core/src/manifest.ts
   - appType: 'core' → 'extension'

2. apps/api-server/src/app-manifests/appsCatalog.ts
   - Core 그룹에서 제거
   - Extension 그룹에 추가

3. docs/reports/2025-12-22-appstore-core-boundary-phase1.md
   - Core 목록에서 제거
   - Extension 목록에 추가
```

### 3.3 영향 범위

| 영향 대상 | 필요 조치 |
|----------|----------|
| `pharmacyops` | 의존성 유지 (변경 없음) |
| `signage-pharmacy-extension` | 의존성 유지 (변경 없음) |
| AppStore UI | Core 그룹에서 Extension 그룹으로 이동 |

---

## 4. 패키지 이름 변경 검토

### 4.1 옵션 A: 이름 유지 (권장)

| 항목 | 값 |
|------|-----|
| 패키지명 | `@o4o/pharmaceutical-core` |
| 폴더명 | `packages/pharmaceutical-core` |
| appType | `extension` |

**장점:**
- 영향 범위 최소화
- 기존 import 경로 유지
- 의존하는 패키지 변경 불필요

### 4.2 옵션 B: 이름 변경

| 항목 | 현재 | 변경 후 |
|------|------|--------|
| 패키지명 | `@o4o/pharmaceutical-core` | `@o4o/dropshipping-pharmaceutical` |
| 폴더명 | `pharmaceutical-core` | `dropshipping-pharmaceutical` |

**단점:**
- 영향 범위 증가
- 의존 패키지 업데이트 필요 (pharmacyops 등)

### 4.3 권장

**옵션 A (이름 유지)** 권장

- appType만 변경하여 최소 영향
- 명명 규칙 일관성보다 안정성 우선

---

## 5. 변경 코드 예시

### 5.1 manifest.ts 변경

```typescript
// Before
export const pharmaceuticalCoreManifest = {
  appId: 'pharmaceutical-core',
  displayName: '의약품 유통',
  version: '1.0.0',
  appType: 'core' as const,
  // ...
};

// After
export const pharmaceuticalCoreManifest = {
  appId: 'pharmaceutical-core',
  displayName: '의약품 유통',
  version: '1.0.0',
  appType: 'extension' as const,  // Changed
  // ...
};
```

### 5.2 AppsCatalog 변경

```typescript
// apps/api-server/src/app-manifests/appsCatalog.ts

// Before: Core 그룹에 포함
export const coreApps = [
  'cms-core',
  'auth-core',
  'organization-core',
  'ecommerce-core',
  'dropshipping-core',
  'pharmaceutical-core',  // 제거
  // ...
];

// After: Extension 그룹으로 이동
export const extensionApps = [
  'dropshipping-cosmetics',
  'pharmaceutical-core',  // 추가
  'forum-yaksa',
  // ...
];
```

---

## 6. 테스트 계획

### 6.1 변경 전 확인

- [ ] pharmacyops 정상 동작
- [ ] signage-pharmacy-extension 정상 동작
- [ ] 의약품 주문 워크플로우 정상

### 6.2 변경 후 확인

- [ ] manifest 로딩 정상
- [ ] Extension hooks 정상 등록
- [ ] pharmacyops 의존성 해결 정상
- [ ] AppStore UI에서 Extension 그룹으로 표시

### 6.3 빌드 확인

```bash
pnpm -F @o4o/pharmaceutical-core build
pnpm -F @o4o/pharmacyops build
```

---

## 7. 롤백 계획

변경 실패 시 즉시 롤백 가능:

```typescript
// manifest.ts
appType: 'extension' as const  // 이 줄만 'core'로 복원
```

---

## 8. 결론

`pharmaceutical-core`의 Extension 전환은 다음과 같이 진행합니다:

1. **Phase2 (완료)**: 전환 계획 수립 및 문서화
2. **Phase3 (예정)**: manifest.ts appType 변경
3. **검증**: 빌드 및 기능 테스트

### 예상 소요 시간

| 작업 | 시간 |
|------|------|
| manifest 변경 | 5분 |
| AppsCatalog 업데이트 | 10분 |
| 테스트 | 30분 |
| 문서 업데이트 | 15분 |
| **Total** | **1시간** |

---

*Document Version: 1.0.0*
*Created: 2025-12-22*
*Part of: WO-APPSTORE-CORE-BOUNDARY-PHASE2*
