# WO-O4O-PAYMENT-CORE-V0.1 구현 계획

> **Work Order**: WO-O4O-PAYMENT-CORE-V0.1
> **Status**: Implementation Phase
> **Date**: 2026-01-26

---

## 1. 코드 탐색 결과 요약

### 1.1 재사용 가능 자산

| 구성요소 | 위치 | 판정 | 활용 방안 |
|----------|------|------|-----------|
| `EcommercePayment` Entity | packages/ecommerce-core | **KEEP** | Payment Core 표준 엔티티로 사용 |
| `EcommercePaymentService` | packages/ecommerce-core | **KEEP** | 핵심 결제 상태 관리 재사용 |
| `TossPaymentsService` | packages/ecommerce-core | **KEEP** | PG 통합 서비스 재사용 |
| `CheckoutController` | apps/api-server | **KEEP** | 검증된 흐름 참조 |
| `checkout.service.ts` | apps/api-server | **MOVE** | DB 로직 Payment Core로 이전 |
| `CheckoutPayment` Entity | apps/api-server | **DEPRECATE** | EcommercePayment로 통합 |

### 1.2 신규 구현 필요

| 구성요소 | API | 설명 |
|----------|-----|------|
| `PaymentEventLog` Entity | GET /api/payment-events | 결제 이벤트 기록 저장 |
| `PaymentController` | 6 APIs | Payment Core 전용 컨트롤러 |
| `PaymentCoreService` | - | 결제 흐름 조율 서비스 |

---

## 2. 패키지 구조

```
packages/payment-core/
├── src/
│   ├── types/
│   │   ├── PaymentTypes.ts         # 결제 타입 정의
│   │   ├── PaymentEvents.ts        # 이벤트 타입 정의
│   │   └── index.ts
│   │
│   ├── entities/
│   │   ├── PaymentEventLog.entity.ts  # 이벤트 로그 엔티티
│   │   └── index.ts
│   │
│   ├── services/
│   │   ├── PaymentCoreService.ts   # 결제 흐름 조율
│   │   ├── PaymentEventService.ts  # 이벤트 발행/저장
│   │   └── index.ts
│   │
│   ├── controllers/
│   │   └── PaymentController.ts    # 6 API 엔드포인트
│   │
│   └── index.ts
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. 구현 단계 (3 Phase)

### Phase 1: 타입 및 이벤트 정의 (Foundation)

**목표**: Payment Core의 타입 시스템과 이벤트 계약 정립

**작업 항목**:
1. `packages/payment-core` 패키지 생성
2. `PaymentTypes.ts` - 결제 상태, 요청/응답 타입
3. `PaymentEvents.ts` - 이벤트 타입 정의
4. `PaymentEventLog.entity.ts` - 이벤트 저장 엔티티

**이벤트 정의**:
```typescript
// v0.1 이벤트 (최소 집합)
export enum PaymentEventType {
  PAYMENT_INITIATED = 'payment.initiated',     // 결제 요청 생성
  PAYMENT_CONFIRMED = 'payment.confirmed',     // PG 승인 완료
  PAYMENT_COMPLETED = 'payment.completed',     // 최종 완료 (확장 앱 트리거)
  PAYMENT_FAILED = 'payment.failed',           // 결제 실패
}
```

---

### Phase 2: API 엔드포인트 구현

**목표**: 6개 핵심 API 구현

| # | Endpoint | Method | 설명 | 우선순위 |
|---|----------|--------|------|----------|
| 1 | `/api/payments/prepare` | POST | 결제 요청 생성 | P0 |
| 2 | `/api/payments/pg/callback` | POST | PG 콜백 수신 | P0 |
| 3 | `/api/payments/{paymentId}/confirm` | POST | 서버 측 검증 ⭐ | P0 |
| 4 | `/api/payments/{paymentId}` | GET | 결제 상태 조회 | P1 |
| 5 | `/api/payment-events` | GET | 이벤트 로그 조회 | P1 |
| 6 | `/api/payments/health` | GET | 헬스 체크 | P2 |

**핵심 흐름 (confirm)**:
```
Client → POST /confirm → PaymentController
  → PaymentCoreService.confirmPayment()
    → TossPaymentsService.confirmPayment() (PG API 호출)
    → EcommercePaymentService.completePayment() (상태 업데이트)
    → PaymentEventService.emit('payment.completed') (이벤트 발행)
  → Response
```

---

### Phase 3: 이벤트 로그 및 헬스체크

**목표**: 운영 관측성 확보

**작업 항목**:
1. `PaymentEventService` - 이벤트 발행 + DB 저장
2. `GET /api/payment-events` - 이벤트 로그 조회 API
3. `GET /api/payments/health` - PG 연결 상태 확인

**이벤트 저장 구조**:
```typescript
@Entity('payment_event_logs')
export class PaymentEventLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventType: PaymentEventType;

  @Column('uuid')
  paymentId: string;

  @Column({ nullable: true })
  orderId?: string;

  @Column('jsonb')
  payload: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

## 4. 기존 코드 활용 전략

### 4.1 ecommerce-core 재사용

```typescript
// Payment Core에서 ecommerce-core 활용
import { EcommercePayment, PaymentTransactionStatus } from '@o4o/ecommerce-core';
import { TossPaymentsService } from '@o4o/ecommerce-core/pg';
import { EcommercePaymentService } from '@o4o/ecommerce-core';
```

### 4.2 checkout.service.ts 로직 이전

| 기존 함수 | Payment Core 대응 |
|-----------|-------------------|
| `createPayment()` | `PaymentCoreService.prepare()` |
| `completePayment()` | `PaymentCoreService.confirm()` |
| `findPaymentByOrderId()` | `PaymentCoreService.findByOrderId()` |

---

## 5. 검증 기준

### 5.1 빌드 성공
```bash
cd packages/payment-core && pnpm build
```

### 5.2 타입 검사
```bash
pnpm tsc --noEmit
```

### 5.3 API 테스트
| API | 검증 항목 |
|-----|-----------|
| POST /prepare | 결제 요청 생성 → paymentId 반환 |
| POST /confirm | PG 승인 → payment.completed 이벤트 발행 |
| GET /events | 이벤트 로그 조회 가능 |
| GET /health | PG 설정 상태 반환 |

---

## 6. Out of Scope (명시적 제외)

- ❌ 정산/분배 (Settlement)
- ❌ 회계 연동 (Accounting)
- ❌ 환불 처리 (Refund) → v0.2에서 추가
- ❌ Event Store / CQRS
- ❌ 매출 배분 (Revenue Distribution)

---

## 7. 완료 기준 (Definition of Done)

- [ ] `packages/payment-core` 패키지 생성 및 빌드 성공
- [ ] 6개 API 엔드포인트 구현
- [ ] `payment.completed` 이벤트 발행 확인
- [ ] PaymentEventLog 저장 확인
- [ ] 기존 checkout 흐름과 호환성 유지
- [ ] CLAUDE.md 규칙 준수 (ESM Entity 규칙 등)

---

*Generated: 2026-01-26*
