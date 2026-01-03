# Cosmetics Domain Boundary (H1-0)

> **Status**: Core Catalog Domain
> **Last Updated**: 2026-01-03
> **Work Order**: H1-0, H8-6 (K-Shopping 통합 완료)

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
| 가이드 판매 로직 | 외부 Sub-Domain | 미정의 |
| 세금 환급 흐름 | 외부 Sub-Domain | 미정의 |
| 채널별 주문 방식 | H1-1에서 설계 | 미구현 |

> **Note**: K-Shopping은 H8-6에서 Cosmetics에 통합되어 더 이상 별도 Sub-Domain이 아닙니다.

---

## 3. 외부 채널 관계

### 3.1 K-Shopping 통합 (H8-6 완료)

K-Shopping 기능은 Cosmetics 도메인에 통합되었습니다.
- 기존 K-Shopping API/엔티티: **제거됨**
- 여행자 서비스 기능: web-k-cosmetics에서 처리
- 데이터베이스 테이블: 별도 migration으로 정리 예정

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

// ❌ 직접 JOIN 쿼리 (예시)
SELECT * FROM external_service e
JOIN cosmetics_products cp ON e.product_id = cp.id
```

---

## 5. 데이터 흐름

```
[외부 요청]
     │
     ▼
[web-k-cosmetics / 외부 채널]
     │
     │ API 호출
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
