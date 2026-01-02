# K-Shopping Domain - FROZEN (H1-0)

> **Status**: 🔒 FROZEN
> **Last Updated**: 2025-01-02
> **Work Order**: H1-0

---

## 1. 동결 선언

**K-Shopping 도메인은 동결(FROZEN) 상태입니다.**

이 도메인은 현재 상태에서 더 이상 확장하지 않습니다.
향후 Cosmetics Core와 통합 또는 재설계될 수 있습니다.

---

## 2. 동결 범위

### 2.1 확장 금지 (PROHIBITED)

| 항목 | 금지 내용 |
|------|----------|
| 신규 엔티티 | 새로운 테이블/엔티티 추가 금지 |
| 컬럼 확장 | 기존 엔티티에 새 컬럼 추가 금지 |
| 타입 확장 | ParticipantType, ServiceType 값 추가 금지 |
| FK 설정 | Cosmetics 테이블과 FK 제약 설정 금지 |
| 화면/UX 전제 | 특정 화면/UX를 전제로 한 코드 금지 |

### 2.2 유지 대상 (MAINTAINED)

| 엔티티 | 역할 | 상태 |
|--------|------|------|
| `KShoppingApplication` | 참여 신청 | 동결 유지 |
| `KShoppingParticipant` | 승인된 참여자 | 동결 유지 |
| `enabledServices` | 승인된 서비스 목록 | 동결 유지 |

---

## 3. 고정된 타입 값

### 3.1 ParticipantType (확장 금지)

```typescript
type ParticipantType = 'store' | 'guide' | 'partner';
// 이 값들은 H1-0에서 동결됩니다. 새 값 추가 금지.
```

### 3.2 ServiceType (확장 금지)

```typescript
type ServiceType = 'tax_refund' | 'guide_sales' | 'travel_package';
// 이 값들은 H1-0에서 동결됩니다. 새 값 추가 금지.
```

---

## 4. Cosmetics Core와의 관계

### 4.1 도메인 관계

```
K-Shopping (Sub-Domain) ─── UUID 참조 ───▶ Cosmetics (Core Domain)
     │                                           │
     │  - 신청/참여자 관리                        │  - 상품/브랜드/가격 관리
     │  - enabledServices 승인                   │  - 단일 Source of Truth
     └───────────────────────────────────────────┘
```

### 4.2 참조 원칙

```typescript
// ✅ 허용: UUID 문자열 참조
interface KShoppingReference {
  productId: string;  // cosmetics_products.id 참조
  brandId: string;    // cosmetics_brands.id 참조
}

// ❌ 금지: TypeORM FK 관계
@ManyToOne(() => CosmeticsProduct)  // 금지!
product: CosmeticsProduct;
```

---

## 5. 향후 방향

### 5.1 현재 상태

- K-Shopping: **동결** (신규 기능 없음)
- Cosmetics Core: **Active** (상품/브랜드/가격 Source of Truth)

### 5.2 가능한 시나리오

| 시나리오 | 설명 | 결정 |
|----------|------|------|
| 통합 | K-Shopping → Cosmetics에 흡수 | 미정 |
| 분리 유지 | 별도 Sub-Domain으로 유지 | 미정 |
| 폐기 | K-Shopping 기능 폐기 | 미정 |

> 모든 결정은 별도 Work Order(H1-1+)에서 진행됩니다.

---

## 6. 참고 문서

- [Cosmetics Domain Boundary](../cosmetics/DOMAIN-BOUNDARY.md)
- H1-0 Work Order

---

*Document Version: 1.0*
*Created by: H1-0 Work Order*
