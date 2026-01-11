# GlycoPharm Legacy Postmortem

> **Phase 9-A 확정 문서**
> GlycoPharm 독립 주문 구조의 실패 사례 분석 및 재발 방지 기록

---

## 1. 개요

GlycoPharm(글라이코팜)은 O4O 플랫폼 초기에 **독립적인 주문/결제 시스템**을 구축했던 서비스입니다.
이 문서는 해당 구조가 왜 실패했는지, 어떻게 차단되었는지를 기록하여
**동일한 실수가 반복되지 않도록** 합니다.

### 현재 상태

| 항목 | 상태 |
|------|------|
| 주문 생성 | **영구 차단 (410 Gone)** |
| 기존 데이터 | **Read-Only 보존** |
| OrderType | `GLYCOPHARM` (이력 식별용) |
| 테이블 | 삭제 안 함, 신규 레코드 금지 |

---

## 2. 무엇이 잘못되었는가

### 2.1 독립 주문 테이블 생성

GlycoPharm은 플랫폼 공통 주문 시스템을 사용하지 않고
자체 테이블을 생성했습니다.

```
glycopharm_orders        ← 독립 주문 테이블
glycopharm_order_items   ← 독립 주문 아이템 테이블
```

### 2.2 발생한 문제들

| 문제 | 영향 |
|------|------|
| **통합 조회 불가** | Admin에서 전체 주문 조회 시 GlycoPharm 누락 |
| **정산 분리** | 정산 시스템에서 별도 로직 필요 |
| **리포트 불일치** | 플랫폼 매출 리포트와 GlycoPharm 매출 불일치 |
| **유지보수 비용** | 주문 관련 변경 시 두 곳 수정 필요 |
| **확장성 저하** | 새 서비스마다 독립 주문 구조 생성 유혹 |

### 2.3 근본 원인

1. **아키텍처 원칙 부재**: E-commerce Core 개념이 확립되기 전 개발
2. **도메인 경계 불명확**: 서비스별 책임 범위 미정의
3. **단기 편의 추구**: 빠른 개발을 위해 기존 구조 무시

---

## 3. 어떻게 차단되었는가

### Phase 5-A: 주문 생성 차단

```typescript
// GlycoPharm 주문 API → 410 Gone 반환
if (orderType === OrderType.GLYCOPHARM) {
  return res.status(410).json({
    error: 'GlycoPharm order creation is permanently disabled',
    reason: 'Legacy structure - use E-commerce Core instead'
  });
}
```

### Phase 5-D: Guardrails 구현

- **런타임 차단**: `OrderCreationGuard`에서 GLYCOPHARM 차단
- **스키마 검사**: `check-forbidden-tables.mjs`에서 `glycopharm_orders` 신규 생성 차단
- **CI 검증**: 금지 테이블 패턴 검사 자동화

### CLAUDE.md §20: 규칙 고정

```
차단된 OrderType: GLYCOPHARM (Phase 5-A에서 차단)
```

---

## 4. 다시 만들면 안 되는 이유

### 4.1 플랫폼 무결성

주문은 플랫폼의 **판매 원장(Ledger of Sales)**입니다.
분산되면 다음이 불가능해집니다:

- 전체 매출 집계
- 통합 정산
- 일관된 리포트
- 서비스 간 주문 이동

### 4.2 유지보수 비용

서비스가 N개면, 독립 구조 시:

- 주문 로직 수정: N회
- 결제 연동 수정: N회
- 정산 로직 수정: N회
- 버그 발생 확률: N배

### 4.3 확장 불가

신규 서비스 추가 시:

- 독립 구조: 주문/결제/정산 전체 재구현 (수주 소요)
- E-commerce Core: OrderType 추가 + 메타데이터 정의 (수시간 소요)

---

## 5. 현재 허용되는 유일한 패턴

모든 O4O 매장 서비스는 **E-commerce Core 위임 패턴**만 사용합니다.

```typescript
// 유일하게 허용되는 주문 생성 패턴
const order = await checkoutService.createOrder({
  orderType: OrderType.{SERVICE_TYPE},
  buyerId,
  sellerId,
  supplierId,
  items,
  metadata: { /* 서비스별 추가 정보 */ },
});
```

### 허용되는 OrderType

| OrderType | 서비스 | 상태 |
|-----------|--------|------|
| `COSMETICS` | Cosmetics | Active |
| `TOURISM` | Tourism | Active |
| `DROPSHIPPING` | Dropshipping | Active |
| `GENERIC` | 범용 | Active |
| `GLYCOPHARM` | GlycoPharm | **차단 (이력만)** |

---

## 6. GlycoPharm 기존 데이터 처리

### 6.1 데이터 보존 정책

| 항목 | 정책 |
|------|------|
| `glycopharm_orders` | Read-Only 보존 |
| `glycopharm_order_items` | Read-Only 보존 |
| 신규 레코드 | 금지 |
| 삭제/마이그레이션 | 현재 계획 없음 |

### 6.2 조회 허용

기존 GlycoPharm 주문 이력은 조회 가능합니다.
단, 신규 주문 생성은 영구 차단됩니다.

---

## 7. 교훈 (Lessons Learned)

1. **아키텍처 원칙 먼저**: 서비스 개발 전 Core 구조 확립
2. **도메인 경계 명확화**: 각 서비스의 책임 범위 문서화
3. **Guardrails 필수**: 규칙 위반을 런타임에서 차단
4. **템플릿 복제**: 신규 서비스는 검증된 템플릿에서 시작

---

## 8. 관련 문서

- [CLAUDE.md §7](../../../CLAUDE.md) - E-commerce Core 절대 규칙
- [CLAUDE.md §20](../../../CLAUDE.md) - Order Guardrails
- [CLAUDE.md §21](../../../CLAUDE.md) - O4O Store Template Rules
- [E-COMMERCE-ORDER-CONTRACT.md](../E-COMMERCE-ORDER-CONTRACT.md)
- [O4O Store Template](../../templates/o4o-store-template/STORE-TEMPLATE-README.md)

---

## 9. 변경 이력

| 날짜 | Phase | 내용 |
|------|-------|------|
| 2026-01-11 | Phase 5-A | GlycoPharm 주문 생성 차단 |
| 2026-01-11 | Phase 5-D | Guardrails 구현 |
| 2026-01-11 | Phase 9-A | Legacy Postmortem 문서화 |

---

*Phase 9-A (2026-01-11) - GlycoPharm Legacy Freeze*
