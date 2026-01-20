# Digital Signage - Operator Workspace V2

> **Phase:** 3 Pre-Design
> **Status:** Draft
> **Date:** 2025-01-20

---

## 1. Overview

Phase 3에서는 산업별 Operator들이 각자의 콘텐츠를 제작하고 관리할 수 있는
**전용 Workspace**를 제공합니다.

---

## 2. Workspace 구조

### 2.1 Phase 2 Operator Workspace (Baseline)

```
HQ Operator Workspace
├── Global Content
│   ├── Playlists
│   ├── Media
│   └── Publish
├── Templates
│   ├── Template List
│   ├── Template Editor
│   └── Layout Presets
└── Analytics
    ├── Content Performance
    └── Store Usage
```

### 2.2 Phase 3 Operator Workspace (Extended)

```
Operator Workspace V2
├── [HQ] Core Workspace (Phase 2)
│   └── ... (기존 기능)
│
├── [Pharmacy] Pharmacy Operator Workspace
│   ├── Seasonal Campaigns
│   ├── Health Content
│   ├── Medication Guides
│   └── Pharmacy Templates
│
├── [Cosmetics] Cosmetics Operator Workspace
│   ├── Brand Content
│   ├── Trend Cards
│   ├── Product Launches
│   └── Beauty Templates
│
├── [Tourist] Tourism Operator Workspace
│   ├── Multilingual Content
│   ├── Location Cards
│   ├── Event Schedules
│   └── Tourist Templates
│
└── [Seller] Seller Portal
    ├── Promo Cards
    ├── Self-Edit Templates
    ├── Performance Analytics
    └── Partner Settings
```

---

## 3. Pharmacy Operator Workspace

### 3.1 화면 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  Pharmacy Operator Workspace                           [Profile]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Sidebar]                    [Main Content Area]               │
│  ┌──────────┐                ┌───────────────────────────────┐  │
│  │ Dashboard│                │                               │  │
│  │ ───────  │                │   Selected Feature Content    │  │
│  │ Seasonal │                │                               │  │
│  │ Health   │                │                               │  │
│  │ Guides   │                │                               │  │
│  │ Templates│                │                               │  │
│  │ Analytics│                │                               │  │
│  └──────────┘                └───────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 주요 기능

| Feature | Description |
|---------|-------------|
| **Seasonal Campaigns** | 계절별 건강 캠페인 관리 |
| **Health Content** | 건강 정보/팁 콘텐츠 제작 |
| **Medication Guides** | 복약지도 템플릿 관리 |
| **Pharmacy Templates** | 약국 전용 템플릿 편집 |
| **Category Management** | OTC/건기식 카테고리 관리 |

### 3.3 Seasonal Campaign Editor

```
┌─────────────────────────────────────────────────────────────────┐
│  Seasonal Campaign Editor                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Campaign Name: [_______________]                                │
│                                                                  │
│  Season:  [Spring ▼]   Condition: [Allergy ▼]                   │
│                                                                  │
│  Date Range: [2025-03-01] ~ [2025-05-31]                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Content Preview                                         │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │                                                 │    │    │
│  │  │     [Template Preview Area]                     │    │    │
│  │  │                                                 │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Products: [+ Add Product]                                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                   │
│  │ Product 1  │ │ Product 2  │ │ Product 3  │                   │
│  └────────────┘ └────────────┘ └────────────┘                   │
│                                                                  │
│  [Cancel]                              [Save Draft] [Publish]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Cosmetics Operator Workspace

### 4.1 화면 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  Cosmetics Operator Workspace                          [Profile]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Sidebar]                    [Main Content Area]               │
│  ┌──────────┐                ┌───────────────────────────────┐  │
│  │ Dashboard│                │                               │  │
│  │ ───────  │                │   Brand Content / Trends      │  │
│  │ Brands   │                │                               │  │
│  │ Trends   │                │                               │  │
│  │ Launches │                │                               │  │
│  │ Templates│                │                               │  │
│  │ Analytics│                │                               │  │
│  └──────────┘                └───────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 주요 기능

| Feature | Description |
|---------|-------------|
| **Brand Management** | 브랜드별 콘텐츠 관리 |
| **Trend Cards** | 트렌드/룩북 카드 제작 |
| **Product Launches** | 신제품 출시 콘텐츠 |
| **Color Palette** | 색상 조합 관리 |
| **Beauty Templates** | 뷰티 전용 템플릿 |

### 4.3 Trend Card Editor

```
┌─────────────────────────────────────────────────────────────────┐
│  Trend Card Editor                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Trend Title: [_______________]                                  │
│                                                                  │
│  Type: [Color Trend ▼]   Season: [2025 Spring ▼]                │
│                                                                  │
│  Color Palette:                                                  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ [+ Add Color]                      │
│  │#FF │ │#EE │ │#CC │ │#AA │                                    │
│  └────┘ └────┘ └────┘ └────┘                                    │
│                                                                  │
│  Associated Products:                                            │
│  [Search Products...                                    ]        │
│                                                                  │
│  Preview:                                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │     [Visual Card Preview]                               │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Cancel]                              [Save Draft] [Publish]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Tourism Operator Workspace

### 5.1 화면 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  Tourism Operator Workspace                            [Profile]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Sidebar]                    [Main Content Area]               │
│  ┌──────────┐                ┌───────────────────────────────┐  │
│  │ Dashboard│                │                               │  │
│  │ ───────  │                │   Locations / Events          │  │
│  │ Locations│                │                               │  │
│  │ Events   │                │                               │  │
│  │ Languages│                │                               │  │
│  │ Templates│                │                               │  │
│  │ Analytics│                │                               │  │
│  └──────────┘                └───────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 주요 기능

| Feature | Description |
|---------|-------------|
| **Location Cards** | 명소/장소 정보 카드 |
| **Event Management** | 행사/축제 스케줄 관리 |
| **Multilingual** | 다국어 콘텐츠 관리 |
| **AI Translation** | AI 자동 번역 |
| **Tourist Templates** | 관광 전용 템플릿 |

### 5.3 Multilingual Content Editor

```
┌─────────────────────────────────────────────────────────────────┐
│  Multilingual Content Editor                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Content Title: [_______________]                                │
│                                                                  │
│  Source Language: [Korean ▼]                                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Korean (Original)                                         │   │
│  │ [                                                       ] │   │
│  │ [                                                       ] │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Target Languages:                                               │
│  [x] English  [x] Japanese  [x] Chinese  [ ] Spanish            │
│                                                                  │
│  [AI Translate All]                                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ English                                    [Edit] [Verify]│   │
│  │ [                                                       ] │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Japanese                                   [Edit] [Verify]│   │
│  │ [                                                       ] │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Cancel]                              [Save Draft] [Publish]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Seller Portal (Partner Workspace)

### 6.1 화면 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  Seller Portal                                         [Profile]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Sidebar]                    [Main Content Area]               │
│  ┌──────────┐                ┌───────────────────────────────┐  │
│  │ Dashboard│                │                               │  │
│  │ ───────  │                │   Promo Cards / Analytics     │  │
│  │ Promos   │                │                               │  │
│  │ Templates│                │                               │  │
│  │ Analytics│                │                               │  │
│  │ Settings │                │                               │  │
│  └──────────┘                └───────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 주요 기능

| Feature | Description |
|---------|-------------|
| **Promo Cards** | 제품 홍보 카드 제작 |
| **Self-Edit Templates** | 직접 편집 가능 템플릿 |
| **Performance Analytics** | 노출/전환 성과 분석 |
| **Partner Settings** | 파트너 설정 관리 |

### 6.3 Promo Card Editor (Self-Edit)

```
┌─────────────────────────────────────────────────────────────────┐
│  Promo Card Editor                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Template: [Product Showcase ▼]                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  [Live Preview]                                         │    │
│  │                                                         │    │
│  │  ┌───────────────────────────────────────────────┐     │    │
│  │  │                                               │     │    │
│  │  │  [Product Image]                              │     │    │
│  │  │                                               │     │    │
│  │  │  Product Name: [Editable Text]                │     │    │
│  │  │  Price: [Editable]   Sale: [Editable]         │     │    │
│  │  │                                               │     │    │
│  │  │  [CTA Button]                                 │     │    │
│  │  │                                               │     │    │
│  │  └───────────────────────────────────────────────┘     │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Editable Fields:                                                │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Product Name: [_________________]                       │     │
│  │ Original Price: [_______]  Sale Price: [_______]        │     │
│  │ CTA Text: [Shop Now ▼]                                  │     │
│  │ Image: [Upload] or [Select from Library]                │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  [Cancel]                              [Save Draft] [Submit]     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 공통 컴포넌트

### 7.1 Content Status Badge

```typescript
type ContentStatus = 'draft' | 'pending' | 'published' | 'expired';

<StatusBadge status="published" /> // 녹색
<StatusBadge status="pending" />   // 노란색
<StatusBadge status="draft" />     // 회색
<StatusBadge status="expired" />   // 빨간색
```

### 7.2 Preview Panel

모든 Editor에서 사용하는 실시간 미리보기 패널

```typescript
<PreviewPanel
  content={currentContent}
  aspectRatio="16:9"
  showDeviceFrame={true}
/>
```

### 7.3 Publish Flow

```
Draft → Review → Publish → Active
         ↓
      Rejected
```

---

## 8. Role-Based Access

| Workspace | Required Role |
|-----------|---------------|
| HQ Core | `signage:operator` |
| Pharmacy | `signage:pharmacy:operator` |
| Cosmetics | `signage:cosmetics:operator` |
| Tourist | `signage:tourist:operator` |
| Seller | `signage:seller:partner` |

---

## 9. Navigation Structure

### 9.1 Sidebar Menu (Operator)

```typescript
const operatorMenu = [
  {
    title: 'HQ Workspace',
    icon: 'building',
    children: [
      { title: 'Global Content', path: '/signage/hq/content' },
      { title: 'Templates', path: '/signage/hq/templates' },
    ],
  },
  {
    title: 'Pharmacy',
    icon: 'pill',
    visible: hasRole('pharmacy:operator'),
    children: [
      { title: 'Campaigns', path: '/signage/pharmacy/campaigns' },
      { title: 'Health Content', path: '/signage/pharmacy/health' },
    ],
  },
  // ... other extensions
];
```

---

## 10. 다음 단계

1. 각 Workspace의 상세 화면 설계
2. 컴포넌트 라이브러리 확장
3. API 엔드포인트 연결
4. 역할 기반 접근 제어 구현

---

*Document: OPERATOR-WORKSPACE-V2.md*
*Phase 3 Pre-Design*
