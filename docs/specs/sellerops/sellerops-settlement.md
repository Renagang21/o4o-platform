# SellerOps Settlement Specification

> 최종 업데이트: 2025-12-10
> 판매자 정산 대시보드 및 플로우

---

## 1. Overview

SellerOps는 dropshipping-core의 정산 시스템을 판매자 관점에서 조회한다.
정산 로직은 dropshipping-core에서 처리하고, SellerOps는 조회/알림만 담당.

```
dropshipping-core                SellerOps
      │                              │
      │── SettlementBatch ──────────→│ 조회/표시
      │── CommissionTransaction ────→│ 수수료 내역
      │── settlement.closed ────────→│ 알림 생성
      │                              │
```

---

## 2. Settlement Flow

### 정산 주기

```
주문 완료 → 커미션 계산 → 정산 배치 마감 → 지급
   D+0         D+1           D+7~14        D+15~30
```

### 상태 흐름

| 상태 | 설명 |
|------|------|
| `pending` | 정산 대기 |
| `processing` | 정산 처리 중 |
| `closed` | 마감 완료 |
| `paid` | 지급 완료 |

---

## 3. Settlement Components

### 정산 요약

| 항목 | 설명 |
|------|------|
| 총 매출 | 판매자 리스팅의 총 주문 금액 |
| 총 공급가 | 공급자에게 지급할 금액 |
| 총 수수료 | 플랫폼 수수료 |
| 순수익 | 매출 - 공급가 - 수수료 |

### 계산 공식

```
순수익 = Σ(sellingPrice × quantity) - Σ(supplyPrice × quantity) - 수수료
```

---

## 4. API Endpoints

### GET /sellerops/settlement/summary

정산 요약 조회.

**Response:**
```json
{
  "totalSales": 5000000,
  "totalSupplyCost": 3500000,
  "totalCommission": 250000,
  "netRevenue": 1250000,
  "pendingSettlement": 450000,
  "lastSettlementDate": "2025-12-01"
}
```

### GET /sellerops/settlement/batches

정산 배치 목록.

**Query:**
- `status`: pending | closed | paid
- `dateFrom`, `dateTo`

**Response:**
```json
{
  "batches": [{
    "id": "batch-uuid",
    "periodStart": "2025-11-01",
    "periodEnd": "2025-11-30",
    "orderCount": 150,
    "totalSales": 3000000,
    "netAmount": 750000,
    "status": "closed",
    "closedAt": "2025-12-01"
  }]
}
```

### GET /sellerops/settlement/transactions

수수료/정산 트랜잭션 상세.

**Response:**
```json
{
  "transactions": [{
    "id": "tx-uuid",
    "orderId": "order-uuid",
    "orderAmount": 50000,
    "supplyAmount": 35000,
    "commissionAmount": 2500,
    "netAmount": 12500,
    "status": "approved",
    "createdAt": "2025-11-15"
  }]
}
```

---

## 5. Dashboard View

### 정산 대시보드 구성

```
┌────────────────────────────────────────────────┐
│  이번 달 수익                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ 총 매출  │  │  수수료  │  │ 순수익   │     │
│  │ 5,000만  │  │  25만    │  │ 125만    │     │
│  └──────────┘  └──────────┘  └──────────┘     │
├────────────────────────────────────────────────┤
│  정산 배치 목록                                 │
│  ┌─────────────────────────────────────────┐  │
│  │ 2025-11 │ 150건 │ 75만원 │ 마감완료   │  │
│  │ 2025-10 │ 120건 │ 60만원 │ 지급완료   │  │
│  └─────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

---

## 6. Notifications

### 정산 관련 알림

| 트리거 | 알림 내용 |
|--------|-----------|
| `settlement.closed` | 정산 마감 완료, 예정 금액 |
| 정산일 도래 | 지급 예정 알림 |

### 알림 예시

```json
{
  "type": "info",
  "title": "정산 마감",
  "message": "11월 정산이 마감되었습니다. 정산 예정 금액: 750,000원",
  "data": { "batchId": "...", "netAmount": 750000 }
}
```

---

## Related Documents

- [SellerOps Overview](./sellerops-overview.md)
- [Dropshipping API Contract](../dropshipping/api-contract.md)
- [PartnerOps Settlement](../partnerops/partnerops-overview.md)

---

*Phase 12-2에서 생성*
