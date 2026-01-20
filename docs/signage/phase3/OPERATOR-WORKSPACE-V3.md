# Digital Signage - Operator Workspace V3 (Final)

> **Phase:** 3 Design
> **Status:** FROZEN
> **Date:** 2025-01-20
> **Authority:** 이 문서는 UI 구현의 기준이며, 메뉴/화면 구조 변경 시 Work Order 필요

---

## 1. 문서 상태

| Status | Description |
|--------|-------------|
| **FROZEN** | UI 설계 확정, 구현 시 구조 임의 변경 금지 |

---

## 2. Workspace 전체 구조 (확정)

```
┌─────────────────────────────────────────────────────────────────┐
│                    OPERATOR WORKSPACE V3                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  CORE HQ WORKSPACE (Phase 2 - 불변)                      │    │
│  │  ├── Global Content                                      │    │
│  │  ├── Templates                                           │    │
│  │  └── Analytics                                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  PHARMACY WORKSPACE (P1)                                 │    │
│  │  ├── Dashboard                                           │    │
│  │  ├── Categories                                          │    │
│  │  ├── Seasonal Campaigns                                  │    │
│  │  ├── Template Presets                                    │    │
│  │  ├── Contents                                            │    │
│  │  └── AI Tools                                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  COSMETICS WORKSPACE (P2)                                │    │
│  │  ├── Dashboard                                           │    │
│  │  ├── Brands                                              │    │
│  │  ├── Trend Cards                                         │    │
│  │  ├── Content Presets                                     │    │
│  │  └── Brand Contents                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  SELLER PORTAL (P3)                                      │    │
│  │  ├── Dashboard                                           │    │
│  │  ├── My Promos                                           │    │
│  │  ├── Templates                                           │    │
│  │  ├── Analytics                                           │    │
│  │  └── Settings                                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Pharmacy Operator Workspace (확정)

### 3.1 메뉴 구조

```
Pharmacy Signage
├── Dashboard
│   ├── Active Campaigns (현재 진행 중)
│   ├── Pending Contents (발행 대기)
│   └── Quick Actions
├── Categories
│   ├── Category List
│   └── Category Editor
├── Seasonal Campaigns
│   ├── Campaign List
│   ├── Campaign Editor
│   └── Campaign Schedule
├── Template Presets
│   ├── Preset List
│   ├── Preset Editor
│   └── Preview
├── Contents
│   ├── Content List
│   ├── Content Editor
│   ├── Publish Management
│   └── Force Content
└── AI Tools
    ├── Product Card Generator
    └── Health Tip Generator
```

### 3.2 화면 상세

#### Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Pharmacy Signage Dashboard                            [Profile]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ Active         │  │ Pending        │  │ Stores         │     │
│  │ Campaigns: 3   │  │ Contents: 12   │  │ Connected: 45  │     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Current Season: Spring 2025                             │    │
│  │  ├── 알레르기 시즌 캠페인 (Active)                         │    │
│  │  ├── 꽃가루 주의 안내 (Active)                             │    │
│  │  └── 봄철 피부 관리 (Scheduled)                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Quick Actions:                                                  │
│  [+ New Campaign] [+ New Content] [+ AI Generate]                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Seasonal Campaign Editor

```
┌─────────────────────────────────────────────────────────────────┐
│  Campaign Editor                               [Save] [Publish] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Campaign Name: [봄철 알레르기 예방 캠페인___________________]   │
│                                                                  │
│  Season: [Spring ▼]     Health Condition: [알레르기 ▼]          │
│                                                                  │
│  Date Range: [2025-03-01] ~ [2025-05-31]                        │
│                                                                  │
│  Category: [OTC - 알레르기 ▼]                                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Associated Contents                        [+ Add]     │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐               │    │
│  │  │ Content1 │ │ Content2 │ │ Content3 │               │    │
│  │  │ [Remove] │ │ [Remove] │ │ [Remove] │               │    │
│  │  └──────────┘ └──────────┘ └──────────┘               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [ ] Force to all stores (강제 배포)                             │
│  [ ] Allow store customization (매장 편집 허용)                   │
│                                                                  │
│  Priority: [High ▼]                                              │
│                                                                  │
│  [Cancel]                              [Save Draft] [Publish]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Content Editor

```
┌─────────────────────────────────────────────────────────────────┐
│  Content Editor                                [Save] [Publish] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Title: [알레르기 약 복용 가이드_____________________________]   │
│                                                                  │
│  Content Type: [Medication Guide ▼]                              │
│                                                                  │
│  Category: [OTC - 알레르기 ▼]                                    │
│  Campaign: [봄철 알레르기 예방 캠페인 ▼]                         │
│  Template: [복약 안내 기본형 ▼]                                   │
│                                                                  │
│  ┌───────────────────────┐  ┌───────────────────────┐           │
│  │  Media Upload         │  │  Live Preview         │           │
│  │  ┌─────────────────┐  │  │  ┌─────────────────┐  │           │
│  │  │                 │  │  │  │                 │  │           │
│  │  │  [Upload Image] │  │  │  │   Preview Area  │  │           │
│  │  │  [Upload Video] │  │  │  │                 │  │           │
│  │  │                 │  │  │  │                 │  │           │
│  │  └─────────────────┘  │  │  └─────────────────┘  │           │
│  └───────────────────────┘  └───────────────────────┘           │
│                                                                  │
│  Force Settings:                                                 │
│  [ ] Force content (강제 표시)                                   │
│  [ ] Deletable by store (매장 삭제 허용)                         │
│                                                                  │
│  Valid Period: [2025-03-01] ~ [2025-05-31]                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Cosmetics Operator Workspace (확정)

### 4.1 메뉴 구조

```
Cosmetics Signage
├── Dashboard
│   ├── Brand Overview
│   ├── Trending Now
│   └── New Arrivals
├── Brands
│   ├── Brand List
│   └── Brand Content Manager
├── Trend Cards
│   ├── Trend List
│   ├── Trend Editor
│   └── Color Palette Manager
├── Content Presets
│   ├── Preset List
│   └── Preset Editor
└── Brand Contents
    ├── Content List
    ├── Content Editor
    └── Publish Management
```

### 4.2 화면 상세

#### Trend Card Editor

```
┌─────────────────────────────────────────────────────────────────┐
│  Trend Card Editor                             [Save] [Publish] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Title: [2025 Spring Color Trend_____________________________]  │
│                                                                  │
│  Trend Type: [Color ▼]     Season: [Spring 2025 ▼]              │
│                                                                  │
│  Color Palette:                                                  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ [+ Add]                    │
│  │#FF │ │#EE │ │#CC │ │#AA │ │#88 │                            │
│  │Rose│ │Peach│ │Cream│ │Nude│ │Beige│                          │
│  └────┘ └────┘ └────┘ └────┘ └────┘                            │
│                                                                  │
│  Associated Products:                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [Search Products...                                    ] │   │
│  │ ┌────────┐ ┌────────┐ ┌────────┐                        │   │
│  │ │Product1│ │Product2│ │Product3│                        │   │
│  │ └────────┘ └────────┘ └────────┘                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Preview                                                   │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                                                     │  │  │
│  │  │              [Visual Trend Card]                    │  │  │
│  │  │                                                     │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Seller Portal (확정)

### 5.1 메뉴 구조

```
Seller Portal
├── Dashboard
│   ├── Performance Summary
│   ├── Active Promos
│   └── Pending Approvals
├── My Promos
│   ├── Promo List
│   ├── Create Promo
│   └── Edit Promo
├── Templates
│   ├── Available Templates
│   ├── My Customized Templates
│   └── Template Editor
├── Analytics
│   ├── Overview
│   ├── Content Performance
│   └── Daily Report
└── Settings
    ├── Profile
    └── Branding
```

### 5.2 화면 상세

#### Promo Card Editor (Self-Edit)

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Promo Card                              [Save] [Submit] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Template: [Product Showcase ▼]                                  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Live Preview                                              │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                                                     │  │  │
│  │  │  ┌─────────────────────────────────────┐           │  │  │
│  │  │  │                                     │           │  │  │
│  │  │  │      [Product Image]                │           │  │  │
│  │  │  │                                     │           │  │  │
│  │  │  └─────────────────────────────────────┘           │  │  │
│  │  │                                                     │  │  │
│  │  │  [Product Name Here]                               │  │  │
│  │  │  ₩99,000 → ₩79,000                                 │  │  │
│  │  │                                                     │  │  │
│  │  │  [Shop Now]                                        │  │  │
│  │  │                                                     │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Editable Fields:                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Product Image: [Upload] [Select from Library]            │   │
│  │ Product Name: [프리미엄 에센스___________________]        │   │
│  │ Original Price: [99000]  Sale Price: [79000]             │   │
│  │ CTA Button: [Shop Now ▼]                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Valid Period: [2025-03-01] ~ [2025-03-31]                      │
│                                                                  │
│  Note: Submitted promos require approval before publishing       │
│                                                                  │
│  [Cancel]                             [Save Draft] [Submit]      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Analytics Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Analytics Overview                                    [Export] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Period: [Last 30 Days ▼]                                        │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ Impressions    │  │ Unique Displays│  │ Avg Duration   │     │
│  │ 125,432        │  │ 45             │  │ 8.5 sec        │     │
│  │ +12.3%         │  │ +5             │  │ +0.8 sec       │     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Performance Chart                                         │  │
│  │  [Daily Impressions Line Chart]                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Top Performing Contents:                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1. 봄 신상품 프로모션      45,231 impressions              │  │
│  │ 2. 할인 이벤트 카드        32,108 impressions              │  │
│  │ 3. 베스트셀러 소개         28,093 impressions              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 공통 컴포넌트 (확정)

### 6.1 Status Badge

```typescript
type ContentStatus = 'draft' | 'pending' | 'approved' | 'published' | 'rejected' | 'archived';

const statusColors = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'blue',
  published: 'green',
  rejected: 'red',
  archived: 'gray',
};
```

### 6.2 Preview Panel

모든 Editor에서 사용:
- 실시간 미리보기
- 16:9 비율 고정
- Device frame 표시 옵션

### 6.3 Force Indicator

강제 콘텐츠 표시:
- 빨간색 아이콘
- "매장에서 삭제 불가" 툴팁
- Store Dashboard에서 자물쇠 아이콘

---

## 7. 접근 권한 (확정)

| Workspace | Required Role | Access Level |
|-----------|---------------|--------------|
| Core HQ | `signage:operator` | Full |
| Pharmacy | `signage:pharmacy:operator` | Full |
| Cosmetics | `signage:cosmetics:operator` | Full |
| Seller Portal | `signage:seller:partner` | Own content only |
| Admin Review | `signage:operator` | Approval only |

---

## 8. Store Dashboard 영향 (확정)

### 8.1 Global Content 탭 구조

```
Global Content
├── All
├── HQ (Core)
├── Supplier (Core)
├── Community (Core)
├── Pharmacy (Extension) *if enabled*
├── Cosmetics (Extension) *if enabled*
└── Partner Promos (Extension) *if enabled*
```

### 8.2 Store에서 수정 가능 범위

| Content Type | View | Clone | Edit | Delete |
|--------------|------|-------|------|--------|
| HQ Normal | ✅ | ✅ | Clone만 | Clone만 |
| HQ Forced | ✅ | ❌ | ❌ | ❌ |
| Pharmacy Normal | ✅ | ✅ | Clone만 | Clone만 |
| Pharmacy Forced | ✅ | ❌ | ❌ | ❌ |
| Cosmetics | ✅ | ✅ | Clone만 | Clone만 |
| Partner Promo | ✅ | ✅ | Clone만 | Clone만 |

---

## 9. 네비게이션 구조 (확정)

```typescript
const operatorNavigation = [
  {
    section: 'Core',
    items: [
      { name: 'HQ Workspace', path: '/signage/hq', icon: 'building' },
    ],
  },
  {
    section: 'Extensions',
    items: [
      {
        name: 'Pharmacy',
        path: '/signage/ext/pharmacy',
        icon: 'pill',
        requiredRole: 'signage:pharmacy:operator',
      },
      {
        name: 'Cosmetics',
        path: '/signage/ext/cosmetics',
        icon: 'sparkles',
        requiredRole: 'signage:cosmetics:operator',
      },
    ],
  },
  {
    section: 'Partner',
    items: [
      {
        name: 'Seller Portal',
        path: '/signage/ext/seller',
        icon: 'store',
        requiredRole: 'signage:seller:partner',
      },
    ],
  },
];
```

---

*Document: OPERATOR-WORKSPACE-V3.md*
*Status: FROZEN*
*Phase 3 Design*
