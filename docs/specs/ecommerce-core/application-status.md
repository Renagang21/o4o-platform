# E-commerce Core 적용 현황 및 종료 선언

**Date**: 2025-12-13
**Version**: 1.0
**Status**: E-commerce Core Introduction Complete

---

## 1. E-commerce Core 소개

E-commerce Core는 O4O 플랫폼의 판매/주문 통합 원장 시스템입니다.

### 1.1 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **Single Source of Truth** | 모든 주문/매출의 단일 원장 |
| **OrderType 기반 분기** | retail, dropshipping, b2b, subscription |
| **확장 가능 구조** | 서비스별 ecommerceOrderId FK 연결 |

### 1.2 주요 컴포넌트

```
packages/ecommerce-core/
├── entities/
│   └── EcommerceOrder.entity.ts  # 판매 원장
├── services/
│   ├── EcommerceOrderService.ts  # 주문 생성/관리
│   └── EcommerceOrderQueryService.ts  # 통합 조회
└── types.ts  # OrderType 정의
```

---

## 2. 적용 완료 서비스

### 2.1 Phase 4: 화장품 서비스

| 패키지 | Entity | ecommerceOrderId | OrderType |
|--------|--------|------------------|-----------|
| dropshipping-core | OrderRelay | ✅ 적용 | dropshipping |
| sellerops | OrderIntegrationService | ✅ 적용 | - |

**통합 조회**: `OrderIntegrationService.getIntegratedOrders()`

### 2.2 Phase 5: 약사회 서비스

| 패키지 | Entity | ecommerceOrderId | OrderType |
|--------|--------|------------------|-----------|
| pharmaceutical-core | PharmaOrder | ✅ 적용 | b2b |
| annualfee-yaksa | FeePayment | ✅ 적용 | subscription / retail |

---

## 3. 적용 제외 서비스

### 3.1 관광객 서비스 (적용 제외)

| 항목 | 상태 | 사유 |
|------|------|------|
| tourism-core | 미존재 | 패키지 미개발 |
| tourism-extension | 미존재 | 패키지 미개발 |

**ProductType 'tourism'**: 정의됨 (Dropshipping Core에 타입으로 존재)
**향후 계획**: 관광객 서비스 개발 시 E-commerce Core 적용 원칙 준수

### 3.2 파트너 서비스 (적용 제외)

| 패키지 | 사유 |
|--------|------|
| partnerops | 전환 추적 시스템 (직접 주문 생성 없음) |

**연계 가능**: partnerops.Conversion.orderId → ecommerceOrderId 연결 가능 (선택적)

### 3.3 인프라/UI 패키지 (적용 대상 아님)

| 분류 | 패키지 |
|------|--------|
| 인증 | auth-client, auth-context, auth-core |
| CMS | cms-core, cpt-registry, block-core, block-renderer |
| 조직 | organization-core, organization-forum, organization-lms |
| LMS | lms-core, lms-yaksa |
| UI | ui, types, utils, shortcodes, appearance-system |
| 포럼 | forum-app, forum-yaksa, forum-cosmetics |
| 회원 | membership-yaksa, reporting-yaksa |

**사유**: 주문/결제 기능 없음

---

## 4. OrderType 매핑 현황

### 4.1 확정된 매핑

| OrderType | 서비스 | 설명 |
|-----------|--------|------|
| `retail` | - | 일반 소매 (직접 재고 판매) |
| `dropshipping` | dropshipping-core | 공급자 직배송 |
| `b2b` | pharmaceutical-core | 사업자 간 거래 |
| `subscription` | annualfee-yaksa | 정기 구독/회비 |

### 4.2 향후 예상 매핑

| OrderType | 예상 서비스 | 조건 |
|-----------|------------|------|
| `retail` | tourism-core | 관광객 일반 구매 |
| `b2b` | tourism-core | 가이드/업체 단체 주문 |
| `dropshipping` | tourism-core | 공급자 직배송 |

---

## 5. Dropshipping Core 연계 현황

### 5.1 연계 필요

| 서비스 | OrderRelay 사용 | 이유 |
|--------|----------------|------|
| dropshipping-core | ✅ | Relay 상태 관리 |
| dropshipping-cosmetics | ✅ (Core 경유) | 화장품 확장 |

### 5.2 연계 불필요

| 서비스 | 이유 |
|--------|------|
| pharmaceutical-core | B2B 직거래, Listing 불필요 |
| annualfee-yaksa | 상품 배송 없음 |

---

## 6. 통합 조회 서비스 현황

| 서비스 | 조회 방식 | 비고 |
|--------|----------|------|
| EcommerceOrderQueryService | E-commerce Core 직접 | 판매 원장 기준 |
| OrderIntegrationService | E-commerce + Dropshipping | SellerOps 전용 |
| PharmaOrderService.findByEcommerceOrderId() | 연결 조회 | Pharma 전용 |

---

## 7. 신규 서비스 개발 원칙

### 7.1 필수 적용 조건

다음 조건을 만족하는 신규 서비스는 **E-commerce Core를 반드시 적용**해야 합니다:

1. ✅ 주문 생성 기능이 있는 경우
2. ✅ 결제 처리 기능이 있는 경우
3. ✅ 매출 통계가 필요한 경우

### 7.2 적용 방법

```typescript
// 1. Entity에 ecommerceOrderId FK 추가
@Column({ type: 'uuid', nullable: true })
ecommerceOrderId?: string;

// 2. 주문 생성 시 E-commerce Core 경유
const ecommerceOrder = await ecommerceOrderService.createOrder({
  orderType: OrderType.RETAIL, // 서비스에 맞는 타입 선택
  ...
});

// 3. 서비스 Entity 생성 시 연결
const myOrder = await myOrderService.create({
  ...data,
  ecommerceOrderId: ecommerceOrder.id,
});
```

### 7.3 예외 조건

다음 조건의 서비스는 적용 대상에서 제외됩니다:

- ❌ 주문/결제 기능이 없는 순수 컨텐츠 서비스
- ❌ 인프라/UI 컴포넌트
- ❌ 외부 시스템 연동만 담당하는 서비스

---

## 8. E-commerce Core Introduction 완료 선언

### 8.1 Phase 진행 현황

| Phase | 작업 | 상태 |
|-------|------|------|
| Phase 1 | Core Entity 정의 | ✅ 완료 |
| Phase 2 | Service 구현 | ✅ 완료 |
| Phase 3 | OrderType 확정 | ✅ 완료 |
| Phase 4 | 화장품 서비스 적용 | ✅ 완료 |
| Phase 5 | 약사회 서비스 적용 | ✅ 완료 |
| Phase 6 | 관광객/기타 적용 & 종료 선언 | ✅ 완료 |

### 8.2 완료 선언

**E-commerce Core Introduction Phase를 공식적으로 종료합니다.**

- 핵심 서비스(화장품, 약사회)에 E-commerce Core 적용 완료
- 미존재 서비스(관광객)는 향후 개발 시 적용 원칙 수립
- 적용 제외 사유 문서화 완료
- 신규 서비스 개발 원칙 확립

### 8.3 향후 작업

E-commerce Core Introduction 이후:

1. **기존 서비스 유지보수**: 적용된 ecommerceOrderId 활용
2. **신규 서비스 개발**: 적용 원칙 준수
3. **통합 대시보드 개발**: EcommerceOrderQueryService 활용
4. **관광객 서비스 개발 시**: E-commerce Core + Dropshipping Core 연계

---

## 부록: 문서 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-13 | 1.0 | 최초 작성 및 종료 선언 |

---

*E-commerce Core Introduction Phase Complete*
*O4O Platform Team*
