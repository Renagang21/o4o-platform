# PartnerOps API Contract

> 최종 업데이트: 2025-12-10
> Base Path: `/api/v1/partnerops`

---

## 1. Dashboard

### GET /dashboard/summary

파트너 대시보드 요약 정보 조회.

**Response:**
```json
{
  "totalClicks": 1234,
  "totalConversions": 56,
  "conversionRate": 4.5,
  "totalCommission": 125000,
  "pendingCommission": 45000,
  "recentActivity": []
}
```

---

## 2. Profile

### GET /profile

현재 파트너 프로필 조회.

### PUT /profile

파트너 프로필 수정.

**Request:**
```json
{
  "name": "파트너명",
  "description": "소개",
  "snsAccounts": {
    "instagram": "@handle",
    "youtube": "channel_url"
  }
}
```

### POST /profile/apply

파트너 신청.

**Request:**
```json
{
  "name": "파트너명",
  "description": "활동 분야",
  "snsAccounts": {}
}
```

---

## 3. Routines (콘텐츠)

### GET /routines

파트너 루틴(콘텐츠) 목록 조회.

**Query:**
- `page`: 페이지 번호
- `limit`: 페이지 크기
- `isActive`: 활성 여부

### GET /routines/:id

루틴 상세 조회.

### POST /routines

루틴 생성.

**Request:**
```json
{
  "title": "루틴 제목",
  "description": "설명",
  "content": {},
  "products": ["product-id-1", "product-id-2"]
}
```

### PUT /routines/:id

루틴 수정.

### DELETE /routines/:id

루틴 삭제.

---

## 4. Links

### GET /links

어필리에이트 링크 목록.

### POST /links

링크 생성.

**Request:**
```json
{
  "targetUrl": "https://store.example.com/product/123",
  "targetType": "listing",
  "targetId": "product-uuid"
}
```

**Response:**
```json
{
  "id": "link-uuid",
  "shortCode": "abc123",
  "shortUrl": "https://s.example.com/abc123"
}
```

### GET /links/:id/stats

링크별 통계 조회.

**Response:**
```json
{
  "clicks": 500,
  "conversions": 25,
  "conversionRate": 5.0,
  "revenue": 75000
}
```

### DELETE /links/:id

링크 삭제 (비활성화).

---

## 5. Conversions

### GET /conversions

전환 목록 조회.

**Query:**
- `status`: pending | approved | paid
- `startDate`: 시작일
- `endDate`: 종료일

### GET /conversions/summary

전환 요약 통계.

**Response:**
```json
{
  "totalConversions": 100,
  "totalRevenue": 5000000,
  "totalCommission": 250000,
  "byStatus": {
    "pending": 20,
    "approved": 50,
    "paid": 30
  }
}
```

### GET /conversions/funnel

전환 퍼널 분석.

**Response:**
```json
{
  "clicks": 10000,
  "views": 5000,
  "carts": 1000,
  "orders": 500,
  "completed": 450
}
```

---

## 6. Settlement

### GET /settlement/summary

정산 요약.

**Response:**
```json
{
  "totalEarned": 500000,
  "totalPaid": 400000,
  "pending": 100000,
  "nextPayoutDate": "2025-01-15"
}
```

### GET /settlement/batches

정산 배치 목록.

### GET /settlement/transactions

정산 트랜잭션 상세.

---

## Error Codes

| Code | Message |
|------|---------|
| 40101 | Partner not found |
| 40102 | Partner not approved |
| 40103 | Link not found |
| 40104 | Invalid target URL |

---

## Related Documents

- [PartnerOps Overview](./partnerops-overview.md)
- [Event Handlers](./partnerops-events.md)

---

*Phase 12-1에서 생성*
