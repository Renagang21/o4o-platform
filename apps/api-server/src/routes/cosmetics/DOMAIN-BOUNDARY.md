# Cosmetics Domain Boundary (H1-0)

> **Status**: Core Catalog Domain
> **Last Updated**: 2025-01-02
> **Work Order**: H1-0

---

## 1. 도메인 정의

**Cosmetics 도메인은 화장품 상품/브랜드/가격의 단일 Source of Truth입니다.**

```
Cosmetics Core
├── Products (상품)
├── Brands (브랜드)
├── Lines (라인)
├── Price Policies (가격 정책)
└── Audit Logs (변경 이력)
```

---

## 2. 책임 범위

### 2.1 Core Responsibility (담당)

| 영역 | 설명 | 테이블 |
|------|------|--------|
| 상품 관리 | 화장품 상품 CRUD | `cosmetics_products` |
| 브랜드 관리 | 브랜드 정보 CRUD | `cosmetics_brands` |
| 라인 관리 | 제품 라인 CRUD | `cosmetics_lines` |
| 가격 정책 | 정가/할인가 관리 | `cosmetics_price_policies` |
| 감사 로그 | 변경 이력 추적 | `cosmetics_product_logs`, `cosmetics_price_logs` |

### 2.2 NOT Responsible (담당하지 않음)

| 영역 | 담당 | 비고 |
|------|------|------|
| 여행자 신청 UX | K-Shopping (동결) | 향후 통합 가능 |
| 가이드 판매 로직 | 외부 Sub-Domain | 미정의 |
| 세금 환급 흐름 | 외부 Sub-Domain | 미정의 |
| 채널별 주문 방식 | H1-1에서 설계 | 미구현 |

---

## 3. Sub-Domain 관계

### 3.1 K-Shopping (동결 상태)

```
K-Shopping (FROZEN)
├── Applications (신청)
├── Participants (참여자)
└── enabledServices (승인 서비스)
     │
     ▼ (UUID 참조만 허용)
Cosmetics Core
├── Products
├── Brands
└── Prices
```

**관계 원칙**:
- K-Shopping → Cosmetics: UUID 참조만 허용
- Cosmetics → K-Shopping: 참조 없음 (단방향)
- FK 제약 설정 금지

### 3.2 향후 채널 (미정의)

```
Travel Channel (예정)
Local Channel (기존)
├── 동일한 Cosmetics Core 사용
└── 채널별 UX/비즈니스 로직 분리
```

---

## 4. 연결 포인트 원칙

### 4.1 허용되는 연결

```typescript
// ✅ UUID 문자열 참조
interface ExternalReference {
  productId: string;  // cosmetics_products.id 참조
  brandId: string;    // cosmetics_brands.id 참조
}

// ✅ API를 통한 조회
const product = await fetch(`/api/v1/cosmetics/products/${productId}`);
```

### 4.2 금지되는 연결

```typescript
// ❌ TypeORM FK 관계 설정
@ManyToOne(() => CosmeticsProduct)
@JoinColumn({ name: 'product_id' })
product: CosmeticsProduct;

// ❌ 직접 JOIN 쿼리
SELECT * FROM kshopping_participants p
JOIN cosmetics_products cp ON p.product_id = cp.id
```

---

## 5. 데이터 흐름

```
[외부 요청]
     │
     ▼
[K-Shopping / Travel Channel]
     │
     │ UUID 참조
     ▼
[Cosmetics API]
     │
     ▼
[cosmetics_* 테이블]
```

---

## 6. 변경 영향 범위

### Cosmetics 스키마 변경 시

| 변경 유형 | 외부 영향 | 조치 |
|----------|----------|------|
| 컬럼 추가 | 없음 | 자유롭게 가능 |
| 컬럼 삭제 | 없음 | 외부에서 UUID만 참조하므로 |
| 테이블 삭제 | 외부 참조 깨짐 | 사전 협의 필요 |
| ID 타입 변경 | 외부 참조 깨짐 | 금지 |

### K-Shopping 스키마 변경 시

| 변경 유형 | Cosmetics 영향 |
|----------|---------------|
| 모든 변경 | **없음** (Cosmetics는 K-Shopping을 참조하지 않음) |

---

## 7. 다음 단계 (H1 시리즈)

| Work Order | 내용 | 상태 |
|------------|------|------|
| H1-0 | 도메인 경계 고정 | ✅ 완료 |
| H1-1 | 주문/결제 모델 설계 | 대기 |
| H1-2 | 채널 타입 분기 설계 | 대기 |

---

*Document Version: 1.0*
*Created by: H1-0 Work Order*
