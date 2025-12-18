# Phase N-2 Operations Checklist (운영 체크리스트)

Phase N-2: 운영 안정화 - 결제/주문 운영 체크리스트

## 1. 환경 구성 확인

### 1.1 Toss Payments 설정
- [ ] `TOSS_CLIENT_KEY` 환경변수 설정 (테스트: `test_ck_...`, 운영: `live_ck_...`)
- [ ] `TOSS_SECRET_KEY` 환경변수 설정 (테스트: `test_sk_...`, 운영: `live_sk_...`)
- [ ] Toss 가맹점 관리자 → 개발자센터 → Webhook URL 설정 확인

### 1.2 데이터베이스 설정
- [ ] Checkout 관련 테이블 생성 확인
  - `checkout_order`
  - `checkout_payment`
  - `order_log`
- [ ] 마이그레이션 실행: `npm run migration:run`

### 1.3 Frontend URL 설정
- [ ] `FRONTEND_URL` 환경변수 설정 (예: `https://shop.neture.co.kr`)
- [ ] 결제 성공/실패 리다이렉트 URL 확인

---

## 2. 배포 전 체크리스트

### 2.1 API 서버
- [ ] `npm run build:api` 빌드 성공
- [ ] 환경변수 설정 완료 (.env 또는 PM2 ecosystem)
- [ ] PM2 서비스 재시작

### 2.2 Ecommerce Frontend
- [ ] `npm run build` 빌드 성공
- [ ] 빌드 산출물 배포 (nginx or CDN)

---

## 3. 운영 중 모니터링

### 3.1 로그 모니터링
```bash
# API 서버 로그 확인
pm2 logs o4o-api --lines 100

# 결제 관련 로그 필터링
pm2 logs o4o-api --lines 100 | grep -E "(payment|checkout|refund)"
```

### 3.2 주요 지표 확인
- 결제 성공률
- 평균 결제 처리 시간
- 환불 처리 건수

### 3.3 Admin 대시보드 접근
- 주문 관리: `/admin/orders`
- 통계 확인: `/admin/orders` (상단 통계 카드)

---

## 4. API Endpoints Reference

### 4.1 Consumer API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/checkout/initiate` | 주문 생성 + 결제 준비 |
| POST | `/api/checkout/confirm` | Toss 결제 승인 |
| GET | `/api/orders` | 내 주문 목록 |
| GET | `/api/orders/:id` | 주문 상세 |

### 4.2 Admin API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/admin/orders/stats` | 주문 통계 |
| GET | `/api/admin/orders` | 주문 목록 (필터: status, paymentStatus, partnerId) |
| GET | `/api/admin/orders/:id` | 주문 상세 + 결제 정보 |
| POST | `/api/admin/orders/:id/refund` | 환불 처리 |
| GET | `/api/admin/orders/:id/logs` | 주문 로그 |

---

## 5. 장애 대응 절차

### 5.1 결제 실패 시

1. **즉시 확인 사항**
   - Toss API 응답 로그 확인
   - 결제 상태: pending → failed 변경 여부
   - 주문 로그 확인

2. **일반적인 원인**
   - 카드 한도 초과
   - 잔액 부족
   - 네트워크 오류

3. **조치**
   - 고객에게 다른 결제 수단 안내
   - 필요시 Toss 고객센터 연락

### 5.2 환불 실패 시

1. **확인 사항**
   - Toss Admin에서 환불 가능 상태 확인
   - paymentKey 유효성 확인

2. **수동 환불 절차**
   - Toss 가맹점 관리자 로그인
   - 거래 내역 → 해당 결제 건 선택
   - 취소/환불 처리

3. **DB 동기화**
   - Admin 대시보드에서 환불 처리 재시도
   - 또는 직접 DB 상태 변경 (주의 필요)

---

## 6. Phase N-1 제약사항 (현재 적용)

| 항목 | 제약 | 비고 |
|------|------|------|
| 최대 상품 수 | 3개 | `PHASE_N1_CONFIG.MAX_ITEMS` |
| 최대 주문 금액 | 1,000,000원 | `PHASE_N1_CONFIG.MAX_AMOUNT` |
| PG | Toss Payments 단일 | 타 PG 미지원 |
| 자동 정산 | 미지원 | 수동 정산 필요 |
| Supplier | 단일 | `supplier-phase-n1` |

---

## 7. DB Schema Reference

### 7.1 CheckoutOrder
```sql
CREATE TABLE checkout_order (
  id UUID PRIMARY KEY,
  order_number VARCHAR(20) UNIQUE,
  buyer_id VARCHAR(255),
  seller_id VARCHAR(255),
  supplier_id VARCHAR(255),
  partner_id VARCHAR(255),
  items JSONB,
  subtotal DECIMAL(12,2),
  shipping_fee DECIMAL(12,2),
  discount DECIMAL(12,2),
  total_amount DECIMAL(12,2),
  status VARCHAR(50),  -- created, pending_payment, paid, refunded, cancelled
  payment_status VARCHAR(50),  -- pending, paid, refunded, failed
  shipping_address JSONB,
  paid_at TIMESTAMP,
  refunded_at TIMESTAMP,
  refund_reason TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 7.2 CheckoutPayment
```sql
CREATE TABLE checkout_payment (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES checkout_order(id),
  amount DECIMAL(12,2),
  status VARCHAR(50),  -- PENDING, SUCCESS, FAILED, REFUNDED
  payment_key VARCHAR(255),
  method VARCHAR(50),
  card_company VARCHAR(50),
  card_number VARCHAR(50),
  installment_months INTEGER,
  approved_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 7.3 OrderLog
```sql
CREATE TABLE order_log (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES checkout_order(id),
  action VARCHAR(50),  -- created, payment_initiated, payment_success, refunded, etc.
  previous_data JSONB,
  new_data JSONB,
  performed_by VARCHAR(255),
  performer_type VARCHAR(50),
  note TEXT,
  created_at TIMESTAMP
);
```

---

## 8. 연락처

- **Toss Payments 기술지원**: tech@tosspayments.com
- **Toss 가맹점 관리자**: https://biz.tosspayments.com

---

*Last Updated: 2025-12-18*
*Phase: N-2 운영 안정화*
