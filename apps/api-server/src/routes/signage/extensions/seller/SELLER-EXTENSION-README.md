# Seller Extension - Digital Signage Phase 3

## Work Order: WO-SIGNAGE-PHASE3-DEV-SELLER

### 개요

Digital Signage Phase 3의 세 번째 Extension입니다.
판매자/파트너 기반 광고/프로모션 콘텐츠 관리를 위한 수익 창출 모듈입니다.

### 핵심 특징

1. **Global Content + Clone 모델 (Force 미지원)**
   - 판매자가 등록한 콘텐츠를 Store에서 자율적으로 Clone
   - Force 기능 **없음** (Pharmacy와 다름)
   - Store는 언제든 콘텐츠 제거 가능

2. **캠페인 기반 관리**
   - SellerPartner: 판매자/파트너 프로필
   - SellerCampaign: 캠페인 (기간, 타겟팅, 예산)
   - SellerContent: 광고/프로모션 콘텐츠
   - SellerContentMetric: 성과 지표 (노출/클릭/QR)

3. **승인 워크플로우**
   - 콘텐츠/캠페인 생성 → 승인 대기 → 승인/거절
   - Admin만 승인 권한 보유

4. **수익 구조 기반**
   - Metrics 수집으로 KPI 측정 가능
   - 향후 과금/정산 연동 준비 (Phase 4)

---

## API 엔드포인트

Base URL: `/api/signage/:serviceKey/ext/seller`

### 파트너 관리 (Admin)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/partners` | 파트너 목록 조회 |
| GET | `/partners/:id` | 파트너 상세 조회 |
| POST | `/partners` | 파트너 생성 |
| PATCH | `/partners/:id` | 파트너 수정 |
| DELETE | `/partners/:id` | 파트너 삭제 |

### 캠페인 관리 (Operator/Partner)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/campaigns` | 캠페인 목록 조회 |
| GET | `/campaigns/:id` | 캠페인 상세 조회 |
| POST | `/campaigns` | 캠페인 생성 |
| PATCH | `/campaigns/:id` | 캠페인 수정 |
| POST | `/campaigns/:id/approve` | 캠페인 승인/거절 (Admin) |
| DELETE | `/campaigns/:id` | 캠페인 삭제 |

### 콘텐츠 관리 (Operator/Partner)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/contents` | 콘텐츠 목록 조회 |
| GET | `/contents/:id` | 콘텐츠 상세 조회 |
| POST | `/contents` | 콘텐츠 생성 |
| PATCH | `/contents/:id` | 콘텐츠 수정 |
| POST | `/contents/:id/approve` | 콘텐츠 승인/거절 (Admin) |
| DELETE | `/contents/:id` | 콘텐츠 삭제 (soft delete) |

### 글로벌 콘텐츠 (Store)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/global/contents` | 글로벌 콘텐츠 목록 (매장용) |
| POST | `/global/contents/:id/clone` | 콘텐츠 Clone |

### Metrics (Player/Admin)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/metrics` | 지표 이벤트 기록 (Player) |
| GET | `/metrics` | 지표 요약 조회 (Admin) |

### 통계 (Admin)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | 콘텐츠 통계 조회 |

---

## 데이터 모델

### SellerPartner

```typescript
{
  id: string;              // UUID
  organizationId: string;  // 조직 ID
  displayName: string;     // 표시명
  code: string;            // 파트너 코드 (unique)
  description: string;     // 설명
  logoUrl: string;         // 로고 URL
  category: 'manufacturer' | 'distributor' | 'brand' | 'agency' | 'local-business' | 'other';
  tier: 'basic' | 'standard' | 'premium' | 'enterprise';
  status: 'pending' | 'active' | 'suspended' | 'terminated';
  contactInfo: {
    name?: string;
    email?: string;
    phone?: string;
  };
  contractInfo: {
    contractId?: string;
    startDate?: string;
    endDate?: string;
    terms?: string;
  };
  isActive: boolean;
}
```

### SellerCampaign

```typescript
{
  id: string;
  organizationId: string;
  partnerId: string;              // 파트너 참조
  title: string;
  description: string;
  campaignType: 'promotion' | 'awareness' | 'launch' | 'seasonal' | 'event';
  status: 'draft' | 'pending' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected';
  startAt: Date;
  endAt: Date;
  targeting: {
    serviceKeys?: string[];       // 특정 서비스
    regions?: string[];           // 지역
    storeTypes?: string[];        // 매장 유형
    storeIds?: string[];          // 특정 매장
    excludeStoreIds?: string[];   // 제외 매장
  };
  budget: {
    totalBudget?: number;
    dailyBudget?: number;
    currency?: string;
    costPerImpression?: number;
    costPerClick?: number;
  };
  approvedBy: string;
  approvedAt: Date;
  rejectionReason: string;
  priority: number;
  isActive: boolean;
}
```

### SellerContent

```typescript
{
  id: string;
  organizationId: string;
  partnerId: string;
  campaignId: string;             // 캠페인 참조 (optional)
  title: string;
  description: string;
  contentType: 'product-ad' | 'brand-video' | 'promotion' | 'event' | 'banner';
  mediaAssets: {
    imageUrl?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    qrCodeUrl?: string;
    landingUrl?: string;
    additionalAssets?: string[];
  };
  source: 'seller-partner';       // 항상 고정
  scope: 'global' | 'store';
  isForced: false;                // 항상 false (Seller 특성)
  parentContentId: string;        // Clone된 경우 원본 ID
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';
  metricsEnabled: boolean;
  approvedBy: string;
  approvedAt: Date;
  rejectionReason: string;
  displayOrder: number;
  cloneCount: number;
  totalImpressions: number;
  totalClicks: number;
  isActive: boolean;
}
```

### SellerContentMetric

```typescript
{
  id: string;
  organizationId: string;
  contentId: string;
  campaignId: string;
  partnerId: string;
  storeId: string;
  date: string;                   // 일별 집계
  metricType: 'impression' | 'click' | 'qr_scan' | 'video_start' | 'video_complete' | 'conversion';
  impressions: number;
  clicks: number;
  qrScans: number;
  videoStarts: number;
  videoCompletes: number;
  totalDurationSeconds: number;
}
```

---

## 다른 Extension과의 비교

| 특성 | Pharmacy | Cosmetics | Seller |
|------|----------|-----------|--------|
| Source | `pharmacy-hq`, `supplier` | `cosmetics-brand` | `seller-partner` |
| Force 기능 | ✅ 지원 (HQ만) | ❌ 미지원 | ❌ 미지원 |
| Clone 제한 | Force된 콘텐츠 불가 | 모든 콘텐츠 가능 | 모든 콘텐츠 가능 |
| 승인 필요 | ❌ | ❌ | ✅ (Admin 승인) |
| Metrics | 기본 | 기본 | 상세 (수익 연동용) |
| 주요 엔티티 | Category, Campaign | Brand, TrendCard | Partner, Campaign |

---

## 승인 워크플로우

### 캠페인 승인

```
Partner 생성 → draft
    ↓
제출 → pending
    ↓
Admin 검토
    ↓
  ┌───┴───┐
approved  rejected
  ↓         ↓
active    (종료)
```

### 콘텐츠 승인

```
Partner 생성 → draft
    ↓
제출 → pending
    ↓
Admin 검토
    ↓
  ┌───┴───┐
approved  rejected
  ↓         ↓
(노출 가능) (종료)
```

---

## 파일 구조

```
seller/
├── SELLER-EXTENSION-README.md
├── index.ts
├── seller.routes.ts
├── controllers/
│   └── seller.controller.ts
├── services/
│   └── seller.service.ts
├── repositories/
│   └── seller.repository.ts
├── entities/
│   ├── index.ts
│   ├── SellerPartner.entity.ts
│   ├── SellerCampaign.entity.ts
│   ├── SellerContent.entity.ts
│   └── SellerContentMetric.entity.ts
└── dto/
    └── index.ts
```

---

## 사용 예시

### 파트너 등록

```bash
POST /api/signage/my-service/ext/seller/partners
Content-Type: application/json

{
  "displayName": "ABC 제조사",
  "code": "abc-mfg",
  "category": "manufacturer",
  "tier": "standard",
  "contactInfo": {
    "name": "홍길동",
    "email": "hong@abc.com",
    "phone": "010-1234-5678"
  }
}
```

### 캠페인 생성

```bash
POST /api/signage/my-service/ext/seller/campaigns
Content-Type: application/json

{
  "partnerId": "uuid-of-partner",
  "title": "2025년 봄 프로모션",
  "campaignType": "promotion",
  "startAt": "2025-03-01T00:00:00Z",
  "endAt": "2025-03-31T23:59:59Z",
  "targeting": {
    "regions": ["seoul", "gyeonggi"]
  },
  "budget": {
    "totalBudget": 1000000,
    "currency": "KRW"
  }
}
```

### 콘텐츠 생성

```bash
POST /api/signage/my-service/ext/seller/contents
Content-Type: application/json

{
  "partnerId": "uuid-of-partner",
  "campaignId": "uuid-of-campaign",
  "title": "신제품 출시 광고",
  "contentType": "product-ad",
  "mediaAssets": {
    "imageUrl": "https://cdn.example.com/ad.jpg",
    "thumbnailUrl": "https://cdn.example.com/thumb.jpg",
    "landingUrl": "https://partner.com/product"
  },
  "metricsEnabled": true
}
```

### 글로벌 콘텐츠 Clone (Store)

```bash
POST /api/signage/my-service/ext/seller/global/contents/{contentId}/clone
Content-Type: application/json

{
  "title": "우리 매장 광고"
}
```

### Metrics 기록 (Player)

```bash
POST /api/signage/my-service/ext/seller/metrics
Content-Type: application/json

{
  "contentId": "uuid-of-content",
  "eventType": "impression",
  "storeId": "uuid-of-store",
  "playerId": "player-001",
  "eventValue": 1
}
```

---

## Feature Flags

| Flag | 기본값 | 설명 |
|------|--------|------|
| `seller.globalContent` | ON | Global Content 기능 |
| `seller.metrics` | ON | Metrics 수집 |
| `seller.forceContent` | OFF | Force 기능 (항상 OFF) |
| `seller.billing` | OFF | 과금 연동 (Phase 4) |

---

## KPI 지표

Seller Extension을 통해 측정 가능한 지표:

- **노출 수 (Impressions)**: 콘텐츠가 표시된 횟수
- **클릭 수 (Clicks)**: 상호작용 횟수
- **QR 스캔 수**: QR 코드 스캔 횟수
- **CTR (Click-through Rate)**: 클릭률 (clicks / impressions)
- **VTR (Video Completion Rate)**: 영상 완료율
- **Clone 수**: Store 채택 횟수

---

## 참고 문서

- [CLAUDE.md](../../../../../../../../../CLAUDE.md) - 플랫폼 개발 규칙
- [Extension 공통 모듈](../common/README.md)
- [Pharmacy Extension](../pharmacy/PHARMACY-EXTENSION-README.md)
- [Cosmetics Extension](../cosmetics/COSMETICS-EXTENSION-README.md)

---

*Version: 1.0.0*
*Created: 2026-01-20*
*Work Order: WO-SIGNAGE-PHASE3-DEV-SELLER*
