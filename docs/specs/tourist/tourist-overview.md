# Tourist App Specification

> 최종 업데이트: 2025-12-10
> 앱 타입: Service App

---

## 1. Overview

Tourist App은 개인 관광객 및 단체 관광 시나리오를 지원하는 Service App이다.

| 항목 | 값 |
|------|-----|
| appId | `tourist` |
| type | Service App |
| dependsOn | `dropshipping-core`, `organization-core` |
| version | 1.0.0 |

### 핵심 시나리오

| 시나리오 | 설명 |
|----------|------|
| **Personal Traveler** | 개인 여행객의 매장 방문, 상품 구매, 픽업 |
| **Group Tour** | 단체 관광객 + 가이드 인솔, 단체 주문/픽업 |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│                 Tourist App                      │
├─────────────────────────────────────────────────┤
│  Traveler Mode                                   │
│  ├─ ProductBrowseView (상품 탐색)               │
│  ├─ CartView (장바구니)                         │
│  ├─ OrderView (주문/결제)                       │
│  └─ PickupView (픽업 확인)                      │
├─────────────────────────────────────────────────┤
│  Guide Mode                                      │
│  ├─ GroupManageView (단체 관리)                 │
│  ├─ GroupOrderView (단체 주문 취합)             │
│  ├─ GroupPickupView (단체 픽업)                 │
│  └─ CommissionView (가이드 수수료)              │
├─────────────────────────────────────────────────┤
│  Dependencies                                    │
│  ├─ dropshipping-core (상품, 주문)              │
│  └─ organization-core (가이드 조직)             │
└─────────────────────────────────────────────────┘
```

---

## 3. User Types

### TouristType (enum)

| 값 | 설명 |
|----|------|
| `personal` | 개인 관광객 |
| `group_member` | 단체 구성원 |
| `guide` | 가이드 (인솔자) |

### GuideAccount

가이드는 organization-core의 조직 멤버로 관리된다.

```typescript
interface GuideAccount {
  userId: string;
  organizationId: string;   // tourist org ID
  role: 'guide';
  commissionRate: number;   // 가이드 수수료율
  metadata: {
    languages: string[];
    certifications: string[];
  };
}
```

---

## 4. Database Schema

### 자체 테이블

| 테이블 | 설명 |
|--------|------|
| `tourist_groups` | 단체 관광 그룹 |
| `tourist_group_members` | 그룹 멤버 |
| `tourist_pickups` | 픽업 정보 |
| `tourist_guide_commissions` | 가이드 수수료 |

### tourist_groups

```sql
id UUID PRIMARY KEY
guide_id UUID               -- 가이드 user_id
name VARCHAR(255)           -- 그룹명 (예: "ABC 투어 12/10")
pickup_location VARCHAR(255)
pickup_time TIMESTAMP
status VARCHAR(50)          -- pending, active, completed
member_count INTEGER
metadata JSONB
created_at TIMESTAMP
```

### tourist_pickups

```sql
id UUID PRIMARY KEY
order_id UUID               -- SellerOps order
group_id UUID               -- 단체 (nullable for personal)
tourist_type VARCHAR(50)    -- personal | group_member
pickup_code VARCHAR(50)     -- 픽업 확인 코드
pickup_status VARCHAR(50)   -- pending, ready, picked_up
picked_up_at TIMESTAMP
```

---

## 5. Integration

### SellerOps 연동

모든 Tourist 주문은 SellerOps Order로 매핑된다.

```
Tourist Order → SellerOps Order → dropshipping-core OrderRelay
```

### Organization 연동

가이드 계정은 organization-core 멤버로 관리:

```typescript
// 가이드 조직 생성 시
organization: {
  type: 'tourist-agency',
  members: [{ userId, role: 'guide' }]
}
```

---

## 6. Permissions

| Permission | 설명 |
|------------|------|
| `tourist.browse` | 상품 탐색 |
| `tourist.order` | 주문 생성 |
| `tourist.pickup` | 픽업 확인 |
| `tourist.guide.manage` | 가이드 단체 관리 |
| `tourist.guide.commission` | 수수료 조회 |

---

## Related Documents

- [Order Flow](./tourist-order-flow.md)
- [Storefront Integration](./tourist-storefront.md)
- [SellerOps Overview](../sellerops/sellerops-overview.md)
- [Organization Core](../organization/core-overview.md)

---

*Phase 12-4에서 생성*
