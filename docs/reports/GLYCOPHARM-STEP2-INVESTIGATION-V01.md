# GlycoPharm Step 2 Investigation Report

> **Work Order**: WO-O4O-TEST-ENV-STEP2-V01
> **작성일**: 2026-01-11
> **상태**: ⚠️ **구조 위험 발견**
> **조사 목적**: 주문 소유권 및 E-commerce Core 통합 여부 규명

---

## 🎯 핵심 발견 사항 (Executive Summary)

### ⚠️ **구조 위험 신호 (CRITICAL)**

```
┌─────────────────────────────────────────────────────────┐
│ **GlycoPharm이 자체 Commerce 엔진을 소유하고 있음**       │
│ E-commerce Core를 우회하여 독립 주문/결제 처리           │
└─────────────────────────────────────────────────────────┘
```

| 항목 | 현재 상태 | 예상 상태 | 위험도 |
|------|-----------|-----------|--------|
| 주문 생성 | **GlycoPharm 자체** | E-commerce Core | 🔴 HIGH |
| 결제 처리 | **GlycoPharm 자체** | E-commerce Core | 🔴 HIGH |
| 주문 원장 | **glycopharm_orders** | ecommerce_orders | 🔴 HIGH |
| 판매 데이터 통합 | ❌ 분산 | ✅ 통합 | 🔴 HIGH |

### 서비스 정체성 판정

```
❌ "데이터 중심 독립 서비스"가 아님
✅ "거래를 지배하는 플랫폼 중심 서비스"로 비대화
```

**핵심 문제**:
- GlycoPharm는 **약국 건강 데이터 허브**로 설계되어야 하나,
- 실제로는 **독립 Commerce 플랫폼**으로 구현됨
- E-commerce Core의 존재 이유를 훼손

---

## 📋 Step 2 체크리스트 결과

### ⚠️ A. 서비스 정체성 (Identity Check)

#### A-1. 서비스 정의 (코드 기준)

**질문**: GlycoPharm의 핵심은 무엇인가?

**발견 사항**:
1. **설계 의도** (문서):
   - CGM(연속혈당측정) 데이터 허브
   - 약국-환자-데이터 연결
   - "해석/요약/리포트" 서비스

2. **실제 구현** (코드):
   - 약국 쇼핑몰 (Store 기능)
   - 독립 주문/결제 시스템
   - 장바구니, 상품 관리, 재고 관리
   - Kiosk/Tablet 모드 지원

**정의문**:
> "GlycoPharm는 **약국 커머스**를 중심으로 한 **혼합형(데이터+거래)** 서비스이다."

**판정**: ❌ **정체성 혼란** (설계 ≠ 구현)

---

#### A-2. 단독 실행 가능성

- ✅ **Neture 없이 기동 가능**
- ✅ **Cosmetics 없이 주요 기능 동작**
- ✅ **Dropshipping(S2S) 없이 핵심 시나리오 성립**
- ⚠️ **E-commerce Core 없이도 주문 생성 가능** (문제!)

**판정**: ✅ 단독 실행 가능 (오히려 문제)

---

### 🔴 B. E-commerce Core 의존성 (핵심 ①)

#### B-1. 주문/결제 존재 여부

**발견 사항**:

```typescript
// apps/api-server/src/routes/glycopharm/entities/glycopharm-order.entity.ts
@Entity({ name: 'glycopharm_orders', schema: 'public' })
export class GlycopharmOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  pharmacy_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 20, default: 'CREATED' })
  status!: GlycopharmOrderStatus; // 'CREATED' | 'PAID' | 'FAILED'

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_amount!: number;

  @Column({ type: 'timestamp', nullable: true })
  paid_at?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_method?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_id?: string;
}
```

**판정**:
- ✅ **자체 Commerce 보유** (위험 신호!)
- ❌ E-commerce Core 소비 안 함
- ❌ E-commerce Core 연결 없음

---

#### B-2. 주문 소유권

**주문 생성 흐름**:

```typescript
// apps/api-server/src/routes/glycopharm/services/order.service.ts:103
async createOrder(dto: CreateOrderDto, userId: string): Promise<OrderResponseDto> {
  // 1. Validate pharmacy
  const pharmacy = await this.pharmacyRepo.findOneBy({ id: dto.pharmacy_id });

  // 2. Validate products and calculate totals
  for (const item of dto.items) {
    const product = await this.productRepo.findOneBy({ id: item.product_id });
    // ... stock validation, price calculation
  }

  // 3. Create order
  const order = this.orderRepo.create({
    pharmacy_id: dto.pharmacy_id,
    user_id: userId,
    status: 'CREATED',
    total_amount: totalAmount,
    // ... customer info, shipping address
  });

  const savedOrder = await this.orderRepo.save(order);
  // ... create order items
  return this.toOrderResponse(savedOrder);
}
```

**주문 원장 위치**:
- ❌ **E-commerce Core가 아님**
- ✅ **glycopharm_orders 테이블** (GlycoPharm 소유)

**ecommerceOrderId 참조**:
```bash
# grep 결과
No files found
```
→ ❌ **E-commerce Core와 연결 없음**

**판정**:
- 🔴 **GlycoPharm이 주문을 생성** (E-commerce Core 위반!)
- 🔴 **주문 원장 분산** (통합 불가)

---

### 🔴 C. Dropshipping(S2S) 의존성 (핵심 ②)

#### C-1. S2S 연계 방식

**발견 사항**:

```typescript
// apps/api-server/src/routes/glycopharm/entities/glycopharm-application.entity.ts:23
export type GlycopharmServiceType = 'dropshipping' | 'sample_sales' | 'digital_signage';
```

**Application Entity에 'dropshipping' 서비스 타입 존재**:
- 약국이 신청 시 Dropshipping 서비스 선택 가능
- 하지만 실제 Dropshipping-Core 연계 코드 없음

**grep 결과**:
```typescript
// controllers/pharmacy.controller.ts:129
isDropshipping: false,  // 하드코딩된 false 값
```

**판정**:
- ⚠️ **S2S 컨셉 존재하나 미구현**
- ❌ **Dropshipping-Core와 실제 연결 없음**
- ⚠️ **향후 통합 의도 추정 가능**

---

#### C-2. 상태 전환 책임

**GlycoPharmOrder 상태 흐름**:
```typescript
export type GlycopharmOrderStatus = 'CREATED' | 'PAID' | 'FAILED';
```

**발견**:
- ❌ **배송/이행 상태 없음**
- ✅ **결제 상태만 존재**
- ⚠️ **OrderRelay 개념 없음**

**판정**:
- ✅ GlycoPharm이 배송 상태를 변경하지 않음
- ⚠️ 하지만 E-commerce Core도 사용하지 않음

---

### ⚠️ D. 데이터(Core)와 서비스(UI) 분리

#### D-1. 데이터 소유권

**GlycoPharm 소유 테이블**:
```
glycopharm_pharmacies         ← 약국 정보
glycopharm_products           ← 상품 정보
glycopharm_orders             ← 주문 (문제!)
glycopharm_order_items        ← 주문 항목 (문제!)
glycopharm_product_logs       ← 상품 변경 로그
glycopharm_applications       ← 참가 신청
```

**CGM/헬스 데이터**:
- ❌ **발견되지 않음**
- ❌ GlucoseView 연계 Entity 없음
- ⚠️ 외부 서비스 (https://glucoseview.co.kr) 링크만 존재

**판정**:
- 🔴 **데이터 중심이 아님**
- 🔴 **Commerce 중심으로 구현됨**
- ⚠️ CGM 데이터는 외부 서비스에만 존재

---

#### D-2. 서비스 책임

**실제 기능 (코드 기준)**:
```
✅ 약국 쇼핑몰 운영
✅ 상품 CRUD
✅ 장바구니 관리
✅ 주문 생성
✅ 결제 처리 (Stub)
✅ Kiosk/Tablet 모드
✅ Store Template 관리
```

**설계 의도 (문서 기준)**:
```
⭕ CGM 데이터 요약
⭕ 환자 맞춤 제품 추천
⭕ 판매/설명용 인사이트 제공
❌ 주문/결제 (다른 Core가 담당해야 함)
```

**판정**:
- ❌ **"해석/요약/리포트"만 담당하지 않음**
- ✅ **의료 행위/결정 수행 안 함**
- 🔴 **주문을 직접 수행** (위반!)

---

### ✅ E. Neture / Cosmetics / Yaksa 의존성

#### E-1. Neture
- ✅ **의존성 없음**
- ✅ 정보 조회(Read) 행위도 없음

#### E-2. Cosmetics
- ✅ **의존성 없음**
- ✅ 상품/주문 직접 참조 없음

#### E-3. Yaksa
- ✅ **의존성 없음**
- ✅ 조직/회원 정보 의존 없음

**판정**: ✅ **다른 서비스와 완전 독립**

---

### ⚠️ F. 테스트 환경 관점

#### F-1. 단독 테스트 가능성

**필수 조건**:
- ✅ 테스트 약국 계정
- ✅ 테스트 상품 데이터
- ❌ 테스트 CGM/헬스 데이터 (없음)

**테스트 가능 시나리오**:
```
✅ 약국 CRUD
✅ 상품 CRUD
✅ 장바구니
✅ 주문 생성
⚠️ 결제 (Stub만 존재)
❌ CGM 데이터 연계 (외부 서비스)
```

**판정**: ✅ **Commerce 기능은 단독 테스트 가능**

---

#### F-2. 테스트 차단 요소

**현재 차단 요소**:
1. ❌ **E-commerce Core 통합 없음** (구조 위험)
2. ❌ **CGM 데이터 Entity 없음** (정체성 혼란)
3. ⚠️ **결제 Stub** (기능 미완성)

---

## 📊 서비스 정보 요약

### 기본 정보
| 항목 | 값 |
|------|-----|
| **서비스 ID** | `glycopharm` |
| **Core App** | ❌ 없음 (routes 계층에만 존재) |
| **상태** | **Development** |
| **DB 스키마** | `public` (테이블 prefix: `glycopharm_`) |
| **Frontend** | ✅ `services/web-glycopharm` |

### 소유 테이블
```
glycopharm_pharmacies         ← 약국 마스터
glycopharm_products           ← 상품 마스터
glycopharm_orders             ← 주문 (E-commerce Core 위반!)
glycopharm_order_items        ← 주문 항목
glycopharm_product_logs       ← 상품 변경 로그
glycopharm_applications       ← 참가 신청 (약국 → 서비스 신청)
```

### API 엔드포인트 (실제)
```
# Public
GET  /api/v1/glycopharm/pharmacies
GET  /api/v1/glycopharm/products
GET  /api/v1/glycopharm/products/:id

# Admin (glycopharm:admin)
GET  /api/v1/glycopharm/admin/pharmacies
POST /api/v1/glycopharm/admin/pharmacies
PUT  /api/v1/glycopharm/admin/pharmacies/:id
PUT  /api/v1/glycopharm/admin/pharmacies/:id/status

GET  /api/v1/glycopharm/admin/products
POST /api/v1/glycopharm/admin/products
PUT  /api/v1/glycopharm/admin/products/:id
PUT  /api/v1/glycopharm/admin/products/:id/status

# Order (glycopharm:order)
POST /api/v1/glycopharm/orders           ← 주문 생성 (E-commerce Core 우회!)
GET  /api/v1/glycopharm/orders
GET  /api/v1/glycopharm/orders/:id
POST /api/v1/glycopharm/orders/:id/pay   ← 결제 (Stub)
```

### Frontend 페이지 구조
```
services/web-glycopharm/src/pages/
├── store/
│   ├── StoreFront.tsx          ← 약국 쇼핑몰 메인
│   ├── StoreProducts.tsx       ← 상품 목록
│   ├── StoreProductDetail.tsx  ← 상품 상세
│   └── StoreCart.tsx           ← 장바구니
├── pharmacy/
│   ├── PharmacyOrders.tsx      ← 약국 주문 관리
│   ├── StoreApplyPage.tsx      ← Store 신청
│   └── b2b-order/
│       └── B2BOrderPage.tsx    ← B2B 주문
├── operator/
│   ├── StoreApprovalsPage.tsx  ← Store 승인 관리
│   └── store-template/         ← Store Template 관리
└── apply/
    └── PharmacyApplyPage.tsx   ← 약국 참가 신청
```

---

## 🔍 의존성 맵 (Dependency Map)

```
┌─────────────────────────────────────────────────────┐
│              E-commerce Core                         │
│  (주문/결제 원장 - Source of Truth)                   │
│                                                      │
│  ❌ GlycoPharm과 연결 없음!                          │
└──────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              GlycoPharm                              │
│  (독립 Commerce 플랫폼 - 구조 위험!)                   │
│                                                      │
│  ✅ 자체 주문 생성 (glycopharm_orders)                │
│  ✅ 자체 결제 처리 (Stub)                            │
│  ✅ 약국 쇼핑몰 (Store)                               │
│  ❌ CGM 데이터 Entity 없음                           │
│  ⚠️ GlucoseView 외부 링크만                         │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│         External: GlucoseView                        │
│  (https://glucoseview.co.kr)                        │
│  - CGM 데이터 요약/리포트                             │
└─────────────────────────────────────────────────────┘
```

**의존 방향**:
- ❌ GlycoPharm → E-commerce Core (없음, 문제!)
- ❌ GlycoPharm → Dropshipping-Core (없음)
- ❌ GlycoPharm → Neture (없음)
- ❌ GlycoPharm → Cosmetics (없음)
- ❌ GlycoPharm → Yaksa (없음)
- ⚠️ GlycoPharm → GlucoseView (외부 링크만)

---

## 🔴 구조 위험 신호 (Critical Issues)

### 1. E-commerce Core 우회
```
❌ GlycoPharm이 독자적으로 주문 생성
❌ E-commerce Core의 존재 이유 훼손
❌ 판매 원장 분산 (통합 불가)
```

**문제**:
- E-commerce Core는 "플랫폼 판매 원장"으로 설계됨
- GlycoPharm이 이를 우회하여 독립 Commerce 구축
- 다른 서비스도 같은 패턴을 따르면 **통합 불가능**

**코드 근거**:
```typescript
// apps/api-server/src/routes/glycopharm/services/order.service.ts:103
async createOrder(dto: CreateOrderDto, userId: string): Promise<OrderResponseDto> {
  // E-commerce Core 호출 없음
  const order = this.orderRepo.create({
    pharmacy_id: dto.pharmacy_id,
    user_id: userId,
    status: 'CREATED',
    total_amount: totalAmount,
  });
  return await this.orderRepo.save(order);
}
```

---

### 2. 정체성 혼란 (Identity Crisis)
```
설계: "CGM 데이터 허브"
구현: "약국 Commerce 플랫폼"
```

**문제**:
- 설계 문서와 실제 코드가 불일치
- CGM/헬스 데이터 Entity 부재
- GlucoseView는 외부 링크일 뿐
- 실제로는 약국 쇼핑몰에 집중

**코드 근거**:
```bash
# CGM/헬스 데이터 Entity 검색
find apps/api-server/src/routes/glycopharm -name "*.entity.ts" | xargs grep -i "cgm\|glucose\|health"
→ No matches found
```

---

### 3. Ops Apps와의 충돌 가능성
```
GlycoPharm = 약국 운영 전체 (Commerce 포함)
SupplierOps/SellerOps = S2S 역할별 운영

→ 책임 중복 가능성
```

**문제**:
- GlycoPharm이 약국 입장에서 "전체 운영"을 담당
- SupplierOps/SellerOps는 "S2S 역할별" 운영
- 약국이 Supplier/Seller 역할을 할 때 **UI 중복** 발생 가능

---

## ⚠️ 권장 조치 (Recommendations)

### 즉시 조치 (Immediate)

1. **E-commerce Core 통합 검토**
   - GlycoPharm 주문을 E-commerce Core로 이전
   - glycopharm_orders → ecommerce_orders 마이그레이션 계획

2. **정체성 재확정**
   - GlycoPharm의 핵심 가치 재정의
   - CGM 데이터 허브 vs Commerce 플랫폼 선택

3. **문서화**
   - 현재 구조 위험 공식 문서화
   - 리팩토링 Work Order 생성 (Phase 4+)

### 단기 조치 (Short-term)

1. **OrderType 추가**
   - E-commerce Core에 `OrderType.GLYCOPHARM` 추가
   - glycopharm_orders.ecommerceOrderId 컬럼 추가

2. **S2S 연계 구체화**
   - Dropshipping-Core 통합 여부 결정
   - Application의 'dropshipping' 타입 구현 또는 제거

### 장기 조치 (Long-term)

1. **CGM Data Core 분리**
   - GlucoseView 내재화 검토
   - CGM 데이터 Entity 설계

2. **약국 Ops 통합**
   - GlycoPharm vs SupplierOps/SellerOps 역할 정리
   - 약국 운영 UI 표준화

---

## 🎯 테스트 환경 준비 권장사항

### Phase 1: 현재 상태 테스트 (As-Is)
1. Organization-Core 활성화
2. Auth-Core 활성화
3. GlycoPharm Routes 활성화
4. 약국 CRUD 테스트
5. 상품 CRUD 테스트
6. ⚠️ 주문 생성 테스트 (독립 Commerce로)

### Phase 2: E-commerce 통합 (To-Be)
1. E-commerce Core 활성화
2. OrderType.GLYCOPHARM 추가
3. GlycoPharm → E-commerce Core 주문 생성 변경
4. 마이그레이션 실행
5. 통합 테스트

### Phase 3: S2S 연계 (Optional)
1. Dropshipping-Core 활성화
2. GlycoPharm Application 'dropshipping' 타입 구현
3. SupplierOps/SellerOps와 통합 테스트

---

## 📌 조사 결론 (Conclusion)

### 핵심 발견

1. **GlycoPharm은 주문을 소유함** → 🔴 E-commerce Core 위반
2. **독립 Commerce 플랫폼** → ⚠️ 정체성 혼란
3. **CGM 데이터 Entity 없음** → ⚠️ 설계 의도와 불일치
4. **다른 서비스와 독립적** → ✅ 의존성 없음

### Step 2 판정

#### G-1. 단독 테스트 가능 여부
- ✅ **가능** (Commerce 기능 기준)
- ❌ **불가능** (CGM 데이터 허브 기준)

#### G-2. 서비스 성격
- ❌ 데이터 중심 독립 서비스
- ❌ E-commerce 소비자
- ✅ **플랫폼 중심 서비스** (위험!)

#### G-3. 구조 위험 신호
- ✅ **있음**
  1. E-commerce Core 우회
  2. 정체성 혼란 (설계 ≠ 구현)
  3. CGM 데이터 부재

### Step 2 최종 결론 (3문장)

1. GlycoPharm는 **약국 Commerce 플랫폼** 서비스이다.
2. E-commerce / S2S에 대해 **우회 및 미통합** 상태이다.
3. 구조적 의존성은 **없으나, 구조 위험이 존재**한다.

### 조사 종료 조건 답변

> **"GlycoPharm은 거래(Core)를 소유하지 않고,
> 데이터와 인사이트에 집중하는 독립 서비스인가?"**

**답변**: ❌ **아니다.**
- GlycoPharm은 거래(Commerce)를 소유하고 있다.
- 데이터(CGM)와 인사이트는 외부 서비스(GlucoseView)에만 존재한다.
- 설계 의도와 구현이 불일치한다.

---

## 🔜 다음 단계

### 즉시 진행
- **Tourism Step 2 조사** (마지막 서비스)

### 조사 완료 후
- **Step 2 통합 보고서** 작성
  - Neture: Read-Only Hub ✅
  - Cosmetics: 독립 Commerce ✅
  - Yaksa: Forum/Community ✅
  - Dropshipping: S2S 엔진 (E-commerce 결합) ✅
  - **GlycoPharm: 독립 Commerce (구조 위험)** ⚠️
  - Tourism: ?

### Step 3 진입 조건
- 모든 서비스 조사 완료
- 구조 위험 조치 방안 확정
- 테스트 환경 최소 요구사항 정리

---

**조사 완료 일시**: 2026-01-11
**조사자**: Claude Code (AI Agent)
**검증 상태**: ⚠️ **구조 위험 발견, 조치 필요**
