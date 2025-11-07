# Analytics KPIs - Partner Performance Metrics

**Version**: 1.0
**Phase**: 7
**Last Updated**: 2025-11-07

## Overview

This document defines all Key Performance Indicators (KPIs) used in the Partner Analytics system. Each metric includes precise calculation formulas, data sources, edge cases, and examples.

---

## Core KPIs

### 1. Clicks (유효 클릭 수)

**Definition**: Total number of valid referral clicks within the attribution window.

**Formula**:
```
Clicks = COUNT(referral_clicks WHERE status = 'VALID' AND timestamp >= start_date AND timestamp <= end_date)
```

**Data Source**: `referral_clicks` table

**Filters**:
- Status: Only 'VALID' clicks (excludes 'INVALID', 'FRAUD', 'DUPLICATE')
- Timestamp: Within specified date range
- Partner ID: Specific partner or ALL for admin

**Edge Cases**:
- Duplicate clicks from same user/session → counted once (handled by status='VALID')
- Bot traffic → excluded via fraud detection (status='FRAUD')
- Clicks without conversions → still counted

**Example**:
```
Period: 2025-11-01 to 2025-11-07
Partner: PTR-ABC123
Valid clicks: 1,234
Invalid clicks: 45 (not counted)
Total displayed: 1,234
```

---

### 2. Conversions (전환 수)

**Definition**: Number of successful conversions (orders) attributed to partner referrals.

**Formula**:
```
Conversions = COUNT(conversions WHERE status = 'CONFIRMED' AND conversion_date >= start_date AND conversion_date <= end_date)
```

**Data Source**: `conversions` table (or `orders` with `partnerId`)

**Filters**:
- Status: 'CONFIRMED' only
- Attribution: Within 30-day window (configurable via ANALYTICS_ATTRIBUTION_DAYS)
- Partner ID: Linked via referral code

**Edge Cases**:
- Multiple conversions from same customer → all counted
- Cancelled orders → excluded (status != 'CONFIRMED')
- Partial refunds → still counted as conversion if order confirmed

**Example**:
```
Clicks: 1,234
Confirmed orders: 87
Cancelled orders: 3 (not counted)
Total conversions: 87
```

---

### 3. CVR (Conversion Rate - 전환율)

**Definition**: Percentage of clicks that resulted in confirmed conversions.

**Formula**:
```
CVR = (Conversions / Clicks) × 100
```

**Unit**: Percentage (%)

**Precision**: 2 decimal places

**Range**: 0% - 100% (theoretical max, typically 0.1% - 10%)

**Edge Cases**:
- Zero clicks → CVR = 0%
- CVR > 10% → potential fraud flag
- Negative values → impossible, indicates data corruption

**Example**:
```
Clicks: 1,234
Conversions: 87
CVR = (87 / 1,234) × 100 = 7.05%
```

---

### 4. AOV (Average Order Value - 평균 주문 금액)

**Definition**: Average monetary value per confirmed order.

**Formula**:
```
AOV = SUM(order_amount WHERE status = 'CONFIRMED') / COUNT(conversions)
```

**Unit**: Currency (KRW, USD, etc.)

**Data Source**: `conversions.order_amount` or `orders.summary->total`

**Edge Cases**:
- Zero conversions → AOV = 0
- Outlier orders (>10x median) → consider capping or flagging
- Multiple currency → convert to partner's primary currency

**Example**:
```
Order 1: ₩50,000
Order 2: ₩75,000
Order 3: ₩65,000
Total: ₩190,000
Conversions: 3
AOV = ₩190,000 / 3 = ₩63,333
```

---

### 5. EPC (Earnings Per Click - 클릭당 수익)

**Definition**: Average confirmed commission earned per click.

**Formula**:
```
EPC = SUM(commissions.amount WHERE status = 'CONFIRMED') / Clicks
```

**Unit**: Currency (KRW, USD, etc.)

**Precision**: 2 decimal places

**Data Source**: `commissions` table

**Edge Cases**:
- Zero clicks → EPC = 0
- Pending commissions → excluded (only 'CONFIRMED')
- Negative commissions (refunds) → included in calculation

**Example**:
```
Clicks: 1,234
Confirmed commissions: ₩4,350,000
EPC = ₩4,350,000 / 1,234 = ₩3,525.93
```

---

### 6. Paid Rate (지급 비율)

**Definition**: Percentage of confirmed commissions that have been paid out.

**Formula**:
```
Paid Rate = (SUM(paid_commissions) / SUM(confirmed_commissions)) × 100
```

**Unit**: Percentage (%)

**Data Source**: `payment_settlements` table

**Status Mapping**:
- Paid: status = 'completed'
- Confirmed: commission.status = 'confirmed'

**Edge Cases**:
- Zero confirmed commissions → Paid Rate = 0%
- Future scheduled payments → excluded from "paid"
- Failed payments → not counted as paid

**Example**:
```
Confirmed commissions: ₩4,350,000
Paid out (completed): ₩3,915,000
Pending/Processing: ₩435,000
Paid Rate = (₩3,915,000 / ₩4,350,000) × 100 = 90.00%
```

---

### 7. Pending Exposure (예정 정산 금액)

**Definition**: Total amount of commissions awaiting payment.

**Formula**:
```
Pending Exposure = SUM(settlement.netAmount WHERE status IN ('pending', 'scheduled', 'processing'))
```

**Unit**: Currency (KRW, USD, etc.)

**Data Source**: `payment_settlements` table

**Inclusions**:
- Scheduled payments (future date)
- Processing payments (in progress)
- Pending approvals

**Exclusions**:
- Completed payments
- Failed payments
- Cancelled settlements

**Example**:
```
Scheduled (7 days): ₩200,000
Processing (now): ₩150,000
Pending approval: ₩85,000
Total Pending Exposure: ₩435,000
```

---

### 8. Returning Ratio (재구매 비율)

**Definition**: Percentage of conversions from returning customers.

**Formula**:
```
Returning Ratio = (Returning Customer Conversions / Total Conversions) × 100
```

**Identification Logic**:
- Returning customer: customer_id appears in previous conversions (before current)

**Data Source**: `conversions` table with customer de-duplication

**Edge Cases**:
- First-time platform users → always 0% returning
- Guest checkouts → may not track properly (requires email matching)
- Multiple referral codes → counted per partner

**Example**:
```
Total conversions: 87
First-time customers: 72
Returning customers: 15
Returning Ratio = (15 / 87) × 100 = 17.24%
```

---

## Attribution Window

**Default**: 30 days
**Configurable**: `ANALYTICS_ATTRIBUTION_DAYS` environment variable

**Rules**:
- Click timestamp → Conversion timestamp must be within N days
- Multiple clicks → Last-click attribution (most recent click wins)
- Expired windows → conversion not attributed to partner

**Example**:
```
Click: 2025-11-01 10:00
Window: 30 days
Valid conversion: 2025-11-01 to 2025-12-01
Expired: After 2025-12-01 23:59:59
```

---

## Data Freshness & Reliability Levels

### L1 (Real-time)
- **Metrics**: Clicks, Conversions
- **Latency**: < 10 seconds
- **Source**: Direct table queries

### L2 (Daily Batch)
- **Metrics**: Commissions, Settlements, Paid Rate
- **Latency**: Updated once daily (2 AM KST)
- **Source**: Aggregated snapshots

**Conflict Resolution Priority**:
1. Settlement data (highest priority)
2. Commission data
3. Conversion data
4. Click data (lowest priority)

---

## Calculation Examples

### Scenario 1: High-Performance Partner

```
Period: Last 30 days
Clicks: 5,432
Conversions: 489
Order Total: ₩48,900,000
Confirmed Commissions: ₩4,890,000
Paid Out: ₩4,401,000
Pending: ₩489,000

Results:
- CVR = 9.00%
- AOV = ₩100,000
- EPC = ₩900.29
- Paid Rate = 90.00%
- Pending Exposure = ₩489,000
```

### Scenario 2: New Partner (First Week)

```
Period: 7 days
Clicks: 124
Conversions: 3
Order Total: ₩180,000
Confirmed Commissions: ₩18,000
Paid Out: ₩0
Pending: ₩18,000

Results:
- CVR = 2.42%
- AOV = ₩60,000
- EPC = ₩145.16
- Paid Rate = 0.00% (no settlements processed yet)
- Pending Exposure = ₩18,000
```

---

## Validation Rules

### Data Quality Checks

1. **Non-negative**: All counts and amounts must be >= 0
2. **Percentage bounds**: CVR, Paid Rate must be 0-100%
3. **Temporal consistency**: Conversion date >= Click date
4. **Sum consistency**: Total = Confirmed + Pending + Failed
5. **Referential integrity**: All conversions must link to valid clicks

### Anomaly Detection Thresholds

- CVR > 15%: Manual review required
- EPC > ₩50,000: Potential data error
- Paid Rate < 50% after 60 days: Alert finance team
- Clicks spike > 500% vs baseline: Fraud check

---

## API Response Format

All KPIs returned in consistent structure:

```json
{
  "metric": "cvr",
  "value": 7.05,
  "unit": "percent",
  "precision": 2,
  "period": {
    "start": "2025-11-01T00:00:00Z",
    "end": "2025-11-07T23:59:59Z"
  },
  "confidence": "L1",
  "components": {
    "numerator": 87,
    "denominator": 1234
  }
}
```

---

## Glossary

- **Attribution**: Linking a conversion back to the originating referral click
- **Confirmed**: Order or commission verified and approved
- **Valid Click**: Click that passes fraud detection and quality checks
- **Settlement**: Payment disbursement to partner
- **Exposure**: Outstanding liability (money owed but not yet paid)

---

## Version History

- **1.0** (2025-11-07): Initial KPI definitions for Phase 7
