# 결제 게이트웨이 설계 문서

## 📋 개요

O4O 플랫폼의 결제 시스템 설계 문서입니다. 드롭셀링 비즈니스 모델에 맞는 결제 흐름과 정산 시스템을 구축합니다.

---

## 🎯 요구사항

### 1. 비즈니스 요구사항
- **구매자 결제**: 일반 사용자가 파트너 사이트에서 상품 구매 시 결제
- **공급자 정산**: 판매 발생 시 공급자에게 공급가 정산
- **파트너 커미션**: 판매 발생 시 파트너에게 커미션 지급
- **플랫폼 수수료**: 거래 시 플랫폼 수수료 차감

### 2. 기술 요구사항
- 다양한 결제 수단 지원 (카드, 계좌이체, 간편결제)
- 결제 이력 추적 및 관리
- 환불 처리
- 웹훅을 통한 결제 상태 실시간 업데이트
- PCI-DSS 준수 (카드 정보 미저장)

---

## 🏗️ 아키텍처

### 결제 게이트웨이 선택: **토스페이먼츠 (Toss Payments)**

**선택 이유:**
1. 현대적이고 깔끔한 REST API
2. 우수한 문서화 및 개발자 경험
3. 다양한 결제 수단 지원
4. 정산 API 제공
5. 에스크로 지원
6. 국내 시장 점유율 1위

### 결제 흐름

```
[구매자] → [파트너 사이트] → [O4O API] → [토스페이먼츠]
                                    ↓
                              [결제 승인]
                                    ↓
                   [정산 처리: 공급자 + 파트너 + 플랫폼]
```

---

## 📊 데이터베이스 설계

### 1. Payment 엔티티

```typescript
@Entity('payments')
export class Payment {
  id: uuid                        // Primary key
  orderId: uuid                   // 주문 ID (FK to orders)
  paymentKey: string              // 토스페이먼츠 결제 키 (unique)
  transactionId: string           // 토스페이먼츠 거래 ID
  
  // 금액 정보
  amount: decimal                 // 결제 금액
  currency: string                // 통화 (KRW)
  
  // 결제 수단
  method: PaymentMethod           // card, transfer, etc.
  methodDetails: jsonb            // 결제 수단 상세 정보
  
  // 상태
  status: PaymentStatus           // pending, completed, failed, cancelled, refunded
  
  // 타임스탬프
  requestedAt: timestamp          // 결제 요청 시간
  approvedAt: timestamp           // 결제 승인 시간
  cancelledAt: timestamp          // 결제 취소 시간
  
  // 웹훅 데이터
  gatewayResponse: jsonb          // 게이트웨이 응답 원본
  webhookReceived: boolean        // 웹훅 수신 여부
  
  // 환불 정보
  refundAmount: decimal           // 환불 금액
  refundReason: text              // 환불 사유
  
  // 메타데이터
  failureReason: text             // 실패 사유
  customerIp: string              // 고객 IP
  userAgent: text                 // User Agent
}
```

### 2. PaymentSettlement 엔티티 (정산)

```typescript
@Entity('payment_settlements')
export class PaymentSettlement {
  id: uuid
  paymentId: uuid                 // 결제 ID (FK)
  
  // 정산 대상
  recipientType: enum             // 'supplier', 'partner', 'platform'
  recipientId: uuid               // 정산 대상 ID
  
  // 금액
  amount: decimal                 // 정산 금액
  
  // 상태
  status: enum                    // pending, completed, failed
  
  // 타임스탬프
  scheduledAt: timestamp          // 정산 예정일
  completedAt: timestamp          // 정산 완료일
  
  // 메타데이터
  bankAccount: jsonb              // 입금 계좌 정보
  transactionProof: text          // 거래 증빙
}
```

### 3. PaymentWebhook 엔티티 (웹훅 로그)

```typescript
@Entity('payment_webhooks')
export class PaymentWebhook {
  id: uuid
  eventType: string               // PAYMENT_CONFIRMED, PAYMENT_CANCELLED, etc.
  paymentKey: string              // 결제 키
  orderId: string                 // 주문 번호
  
  payload: jsonb                  // 웹훅 페이로드 원본
  
  processed: boolean              // 처리 완료 여부
  processedAt: timestamp          // 처리 시간
  
  retryCount: int                 // 재시도 횟수
  errorMessage: text              // 에러 메시지
  
  createdAt: timestamp
}
```

---

## 🔄 결제 프로세스

### 1. 결제 요청 (Client → API)

```typescript
POST /api/v1/payments/prepare
{
  orderId: "uuid",
  amount: 50000,
  orderName: "상품명 외 2건",
  customerEmail: "buyer@example.com",
  customerName: "홍길동",
  successUrl: "https://partner.example.com/payment/success",
  failUrl: "https://partner.example.com/payment/fail"
}

Response:
{
  paymentKey: "tpk_xxx",
  checkoutUrl: "https://toss.im/payments/xxx",
  orderId: "uuid"
}
```

### 2. 결제 승인 (Client → API after redirect)

```typescript
POST /api/v1/payments/confirm
{
  paymentKey: "tpk_xxx",
  orderId: "uuid",
  amount: 50000
}
```

### 3. 웹훅 처리 (Toss → API)

```typescript
POST /api/v1/payments/webhook
{
  eventType: "PAYMENT_CONFIRMED",
  paymentKey: "tpk_xxx",
  orderId: "uuid",
  status: "DONE",
  ...
}
```

### 4. 정산 처리 (Scheduled Job)

- 매일 자정: 전날 확정된 주문의 정산 생성
- 공급자: D+3 정산
- 파트너: D+7 정산
- 플랫폼: 즉시

---

## 💰 정산 로직

### 판매가 100,000원 상품 판매 시:

```
총 판매가: 100,000원
├─ 공급가: 70,000원 → 공급자에게 정산
├─ 파트너 커미션: 10,000원 (10%) → 파트너에게 정산
├─ 플랫폼 수수료: 5,000원 (5%)
└─ 파트너 마진: 15,000원 (파트너 수익)
```

**계산 공식:**
```typescript
const supplierAmount = product.supplierPrice;
const partnerCommission = product.calculatePartnerCommission(salePrice);
const platformFee = (salePrice - supplierAmount) * PLATFORM_FEE_RATE;
const partnerMargin = salePrice - supplierAmount - partnerCommission - platformFee;
```

---

## 🔐 보안

### 1. 결제 정보 보안
- ✅ 카드 정보 미저장 (PCI-DSS 준수)
- ✅ 토스페이먼츠 토큰 사용
- ✅ HTTPS 필수
- ✅ 웹훅 서명 검증

### 2. API 키 관리
```env
TOSS_CLIENT_KEY=test_ck_xxx      # 클라이언트 키 (공개)
TOSS_SECRET_KEY=test_sk_xxx      # 시크릿 키 (서버)
TOSS_WEBHOOK_SECRET=whsec_xxx    # 웹훅 시크릿
```

### 3. 금액 검증
- 클라이언트 요청 금액 vs 서버 계산 금액 비교
- 주문 금액 vs 결제 금액 일치 확인
- 이중 결제 방지

---

## 📈 Phase 2 구현 단계

### Phase 2-1: 현재 결제 시스템 분석 ✅
- Order 엔티티 확인
- 기존 결제 로직 없음 확인

### Phase 2-2: 결제 게이트웨이 선정 및 설계 ✅
- 토스페이먼츠 선택
- 아키텍처 설계

### Phase 2-3: Payment 엔티티 및 마이그레이션
- Payment, PaymentSettlement, PaymentWebhook 엔티티 생성
- 마이그레이션 작성 및 실행

### Phase 2-4: 결제 API 구현
- `/payments/prepare` - 결제 준비
- `/payments/confirm` - 결제 승인
- `/payments/cancel` - 결제 취소
- `/payments/webhook` - 웹훅 처리

### Phase 2-5: 정산 시스템 구현
- 정산 스케줄러
- 정산 내역 생성
- 정산 완료 처리

---

## 🧪 테스트 계획

### 1. 단위 테스트
- Payment 엔티티 메서드
- 정산 계산 로직
- 웹훅 서명 검증

### 2. 통합 테스트
- 결제 준비 → 승인 플로우
- 웹훅 수신 → 주문 상태 업데이트
- 환불 플로우

### 3. E2E 테스트
- 실제 토스페이먼츠 테스트 환경 사용
- 전체 구매 플로우 테스트

---

**작성일**: 2025-10-21  
**작성자**: Claude AI  
**버전**: 1.0
