# PartnerOps Routines Specification

> 최종 업데이트: 2025-12-10
> 파트너 콘텐츠(루틴) 시스템 상세

---

## 1. Overview

Routines는 파트너가 작성하는 콘텐츠 단위이다.
제품 추천, 사용 후기, 루틴 가이드 등을 포함한다.

### 핵심 개념

| 용어 | 설명 |
|------|------|
| Routine | 파트너 콘텐츠 단위 |
| Products | 루틴에 포함된 제품 목록 |
| Content | Block 기반 콘텐츠 구조 |

---

## 2. Data Structure

### Routine Entity

```typescript
interface Routine {
  id: string;
  tenantId: string;
  partnerId: string;
  title: string;
  description: string;
  content: RoutineContent;
  products: string[];       // product IDs
  isActive: boolean;
  views: number;
  likes: number;
  conversions: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Content Structure

```typescript
interface RoutineContent {
  blocks: Block[];
  version: string;
}

interface Block {
  type: 'text' | 'image' | 'product' | 'video';
  data: Record<string, any>;
}
```

---

## 3. Workflow

```
파트너 → 루틴 작성 → 제품 연결 → 발행
                         ↓
              링크 자동 생성 (어필리에이트)
                         ↓
              사용자 클릭 → 전환 추적
```

### 상태 흐름

| 상태 | 설명 |
|------|------|
| draft | 작성 중 |
| active | 발행됨 |
| inactive | 비활성화 |

---

## 4. Product Integration

### 제품 연결

루틴에 포함된 제품은 자동으로 어필리에이트 링크가 생성된다.

```json
{
  "products": [
    {
      "productId": "uuid",
      "position": 1,
      "affiliateLink": "https://s.example.com/xyz789"
    }
  ]
}
```

### 전환 추적

1. 사용자가 루틴 내 제품 클릭
2. 어필리에이트 링크로 리다이렉트
3. 클릭 기록 (partnerops_clicks)
4. 주문 발생 시 전환 기록

---

## 5. Analytics

### 루틴별 지표

| 지표 | 설명 |
|------|------|
| views | 조회수 |
| clicks | 제품 클릭수 |
| conversions | 전환수 |
| revenue | 발생 매출 |
| commission | 커미션 |

### 집계 쿼리

```sql
SELECT
  r.id,
  r.title,
  r.views,
  COUNT(c.id) as conversions,
  SUM(c.commission_amount) as commission
FROM partnerops_routines r
LEFT JOIN partnerops_conversions c
  ON c.link_id IN (
    SELECT id FROM partnerops_links
    WHERE metadata->>'routineId' = r.id::text
  )
GROUP BY r.id
```

---

## 6. UI Components

### Admin Dashboard Views

| View | 용도 |
|------|------|
| RoutineListView | 루틴 목록 |
| RoutineFormView | 루틴 작성/수정 |
| RoutineDetailView | 루틴 상세 + 통계 |

### Frontend (Main Site)

| Component | 용도 |
|-----------|------|
| RoutineCard | 루틴 카드 |
| RoutineDetail | 루틴 상세 페이지 |
| ProductSlot | 제품 슬롯 (어필리에이트) |

---

## Related Documents

- [PartnerOps Overview](./partnerops-overview.md)
- [API Contract](./partnerops-api.md)
- [Blocks Development](../../reference/blocks/blocks-development.md)

---

*Phase 12-1에서 생성*
