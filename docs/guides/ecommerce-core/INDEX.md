# E-commerce Core 가이드 인덱스

**Last Updated**: 2025-12-13
**Status**: Operational (운영 규칙 고정 완료)

---

## 개요

이 디렉토리는 E-commerce Core 운영 규칙에 관한 가이드 문서를 포함합니다.
모든 개발 에이전트(Claude Code 포함)는 주문/결제 기능 개발 시 이 문서들을 참조해야 합니다.

---

## 문서 목록

| 문서 | 용도 | 대상 |
|------|------|------|
| [agent-guidelines.md](./agent-guidelines.md) | 개발 에이전트용 고정 지침 | Claude Code, 개발자 |
| [new-service-order-checklist.md](./new-service-order-checklist.md) | 신규 서비스 주문 생성 체크리스트 | 모든 개발자 |
| [exemption-policy.md](./exemption-policy.md) | E-commerce Core 미적용 예외 규칙 | 모든 개발자 |

---

## 핵심 규칙 요약

### 1. 주문 생성 = E-commerce Core

```typescript
// ✅ 올바른 방식
const ecommerceOrder = await ecommerceOrderService.create({
  orderType: OrderType.SUBSCRIPTION,
  // ...
});
const serviceEntity = await serviceEntityService.create({
  ecommerceOrderId: ecommerceOrder.id,
  // ...
});
```

### 2. OrderType 불변성

- OrderType은 생성 시 결정
- 이후 변경 절대 금지
- 선택지: `retail`, `dropshipping`, `b2b`, `subscription`

### 3. ecommerceOrderId 필수 연결

- 모든 주문/결제 Entity는 ecommerceOrderId FK 보유
- `findByEcommerceOrderId()` 조회 메서드 필수

---

## 관련 문서

### 스펙 문서
- [Phase 4 화장품 서비스 분석](../../specs/ecommerce-core/phase4-cosmetics-service-analysis.md)
- [Phase 5 약사회 서비스 분석](../../specs/ecommerce-core/phase5-yaksa-service-analysis.md)
- [E-commerce Core 적용 현황](../../specs/ecommerce-core/application-status.md)

### 보고서
- [Phase X Audit 보고서](../../reports/ecommerce-core-phasex-audit-report.md)
- [Phase Y 완료 보고서](../../reports/ecommerce-core-phasey-followup-completion.md)

### CLAUDE.md
- [Section 9: E-commerce Core 운영 규칙](../../../CLAUDE.md#9-e-commerce-core-운영-규칙-주문결제-개발-필수)

---

*이 문서는 E-commerce Core 운영 규칙의 인덱스입니다.*
