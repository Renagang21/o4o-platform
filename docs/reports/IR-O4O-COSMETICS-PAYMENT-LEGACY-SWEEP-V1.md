# IR-O4O-COSMETICS-PAYMENT-LEGACY-SWEEP-V1

**Cosmetics Payment 경로 레거시 코드 잔존 여부 전수 조사**

| 항목 | 값 |
|------|------|
| Date | 2026-02-24 |
| Status | Complete |
| 선행 WO | WO-O4O-COSMETICS-PAYMENTCORE-INTEGRATION-V1 |
| 조사 유형 | 읽기 전용 (코드 수정 없음) |

---

## 1. 최종 판정

### **CLEAN WITH MINOR REMNANTS**

PaymentCore 통합은 완전하며, 결제 영역에 구조적 레거시(Structural Legacy)는 없음.
Minor cleanup 항목 5건과 주문 레이어 미완성(Structural Legacy) 1건이 존재하나,
결제 엔진 단일화와 무관한 별도 영역 이슈.

---

## 2. 조사 범위 및 결과 요약

### A. Controller 레이어 (`routes/cosmetics/controllers/`)

| 검사 항목 | 결과 | 판정 |
|-----------|------|------|
| axios import / 직접 Toss 호출 | 없음 | SAFE |
| paymentEventHub.emitCompleted 직접 호출 | 없음 | SAFE |
| confirm body에 amount 파라미터 | 없음 (제거됨) | SAFE |
| confirm-legacy 엔드포인트 | 없음 | SAFE |
| provider.confirm 직접 호출 | 없음 | SAFE |
| PaymentCore.confirm() 사용 | 확인됨 | SAFE |
| PaymentCore.prepare() 사용 | 확인됨 | SAFE |

### B. Service 레이어 (`services/cosmetics/`)

| 검사 항목 | 결과 | 판정 |
|-----------|------|------|
| Toss SDK 직접 사용 | 없음 | SAFE |
| 상태 직접 update (EventHandler) | 정상 패턴 (이벤트 수신 후 처리) | SAFE |
| PaymentCore 중복 로직 | 없음 | SAFE |

### C. Import 정리

| 검사 항목 | 결과 | 판정 |
|-----------|------|------|
| axios import | 없음 (전체 cosmetics 경로) | SAFE |
| PaymentEventHub 직접 import (routes/) | 없음 | SAFE |
| TossPaymentProviderAdapter import | 정상 (PaymentCore 어댑터) | SAFE |

### D. Route 등록

| 검사 항목 | 결과 | 판정 |
|-----------|------|------|
| main.ts 등록 | 단일 등록 (`app.use('/api/v1/cosmetics', ...)`) | SAFE |
| 중복 payment 경로 | 없음 | SAFE |
| KCosmeticsPaymentEventHandler 초기화 | 정상 (singleton, main.ts:877-879) | SAFE |

### E. 정적 검색 (전체 Repo)

| 키워드 | 결과 |
|--------|------|
| `cosmetics.*axios` | 없음 |
| `cosmetics.*toss` (docs 제외) | 어댑터 참조만 (정상) |
| `emitCompleted.*cosmetics` | 없음 |
| `emitFailed.*cosmetics` | 없음 |
| `confirmLegacy` | 없음 |
| `amount.*!==` (cosmetics) | 주문 스키마 검증만 (결제 무관) |
| `provider.confirm` (cosmetics) | 없음 |

### F. Frontend (`services/web-k-cosmetics/`)

| 검사 항목 | 결과 | 판정 |
|-----------|------|------|
| Toss SDK 의존성 | 없음 (package.json) | N/A |
| 결제 페이지 / checkout 라우트 | 없음 | N/A |
| snake_case 파라미터 (payment_key 등) | 없음 | N/A |
| camelCase 파라미터 (paymentKey 등) | 없음 (결제 UI 미구현) | N/A |

---

## 3. 발견 항목 상세

### MINOR CLEANUP (5건)

#### MC-1: `TOSS_PAYMENTS_CLIENT_KEY` 하드코딩 fallback

- **파일**: `cosmetics-payment.controller.ts:312`
- **내용**: `process.env.TOSS_PAYMENTS_CLIENT_KEY || 'test_ck_test_key'`
- **판단**: 클라이언트 키(공개 키)이므로 보안 위험 없음. GlycoPharm 동일 패턴.
- **권고**: 향후 config 파일 통합 시 정리

#### MC-2: `getKCosmeticsPaymentHandler()` 미사용 export

- **파일**: `KCosmeticsPaymentEventHandler.ts:258-260`
- **내용**: 외부에서 호출하는 곳 없음
- **권고**: 운영 모니터링 엔드포인트 연결 시 활용 가능. 당장 삭제 불필요.

#### MC-3: `getStats()` 미노출 메서드

- **파일**: `KCosmeticsPaymentEventHandler.ts:236-244`
- **내용**: MC-2의 getter를 통해서만 접근 가능하나 getter 자체가 미사용
- **권고**: MC-2와 동일 — 모니터링 확장 시 활용

#### MC-4: `controllers/index.ts` 불완전 barrel export

- **파일**: `routes/cosmetics/controllers/index.ts`
- **내용**: payment, store 컨트롤러 미포함 (cosmetics.routes.ts에서 직접 import)
- **판단**: 기능 영향 없음

#### MC-5: 문서 레이블 미갱신

- **파일**: `docs/baseline/CHECKOUT-STABLE-DECLARATION-V1.md:49,124`
- **파일**: `docs/investigation/IR-O4O-CHECKOUT-END-TO-END-STRUCTURE-V1.md:249`
- **내용**: Cosmetics payment를 "Legacy" / "직접 Toss 호출"로 표기
- **판단**: 마이그레이션 완료 후 문서 미갱신. 사실과 불일치.
- **권고**: 다음 문서 정비 시 갱신

---

### STRUCTURAL LEGACY (1건 — 결제 영역 아님)

#### SL-1: Cosmetics 주문 컨트롤러 미완성 (Stub)

- **파일**: `cosmetics-order.controller.ts`
- **내용**:
  - `POST /orders` — DB 미저장, `order-${Date.now()}` 임시 ID 반환 (line 515)
  - `GET /orders` — 항상 빈 배열 반환 (line 628-633)
  - `GET /orders/:id` — 무조건 404 반환 (line 690)
  - `applyOrderFilters()` — 빈 배열에 대해 실행 (line 374-427)
- **판단**: 주문 레이어 미완성. 결제 영역과 무관.
  결제 컨트롤러는 `EcommerceOrder` repository를 직접 사용하므로
  `checkoutService.createOrder()`로 생성된 실제 주문에 대해 정상 동작.
- **영향**: 결제 흐름에 영향 없음 (별도 주문 생성 경로 사용)

---

## 4. 결제 경로 유효 엔드포인트 목록

| 메서드 | 경로 | 역할 | 상태 |
|--------|------|------|------|
| POST | `/api/v1/cosmetics/payments/prepare` | PaymentCore 결제 레코드 생성 | ACTIVE |
| POST | `/api/v1/cosmetics/payments/confirm` | PaymentCore 결제 승인 | ACTIVE |
| GET | `/api/v1/cosmetics/payments/order/:orderId` | Toss 위젯 렌더링 정보 | ACTIVE |

Legacy 엔드포인트: **없음**
Dead 결제 엔드포인트: **없음**

---

## 5. PaymentCore 정렬 확인

| 항목 | GlycoPharm | Cosmetics | 일치 |
|------|------------|-----------|------|
| PaymentCoreService 사용 | ✅ | ✅ | ✅ |
| prepare() 호출 | ✅ | ✅ | ✅ |
| confirm() 호출 (amount 미전달) | ✅ | ✅ | ✅ |
| TypeORMPaymentRepository | ✅ | ✅ | ✅ |
| TossPaymentProviderAdapter | ✅ | ✅ | ✅ |
| EventHubPaymentPublisher | ✅ | ✅ | ✅ |
| sourceService 설정 | 'glycopharm' | 'cosmetics' | ✅ |
| 에러 매핑 일관성 | 동일 | 동일 | ✅ |
| paymentKey UNIQUE 방어 | ✅ | ✅ | ✅ |

**결제 엔진 구조 완전 동일. 단일화 확인.**

---

## 6. 삭제 가능 코드 목록

| 대상 | 파일 | 긴급도 | 비고 |
|------|------|--------|------|
| `getKCosmeticsPaymentHandler()` | KCosmeticsPaymentEventHandler.ts:258-260 | 낮음 | 모니터링 확장 시 재활용 가능 |
| 주문 stub 로직 | cosmetics-order.controller.ts | 중간 | 별도 WO 대상 |
| `applyOrderFilters()` on empty data | cosmetics-order.controller.ts:374-427 | 낮음 | 주문 구현 시 활용 |

---

## 7. 최종 결론

### Payment Layer: **CLEAN**

- Toss 직접 호출 코드: **완전 제거**
- PaymentCore 외 결제 경로: **없음**
- 금액 위변조 가능 경로: **없음**
- 중복 이벤트 발행 경로: **없음**
- Dead 결제 엔드포인트: **없음**

### 비결제 영역 잔존 항목: **MINOR REMNANTS**

- 문서 레이블 미갱신 (MC-5)
- 주문 stub 컨트롤러 (SL-1, 별도 영역)
- 미사용 export 2건 (MC-2, MC-3)

### 구조적 판정

```
Cosmetics Payment Layer = CLEAN
플랫폼 결제 엔진 단일화 = CONFIRMED
Legacy 경로 잔존 = NONE
```

---

*IR-O4O-COSMETICS-PAYMENT-LEGACY-SWEEP-V1*
*Date: 2026-02-24*
*Status: Complete*
