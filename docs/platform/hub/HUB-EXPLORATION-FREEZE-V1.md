# HUB Exploration Core — Structure Freeze v1

> **WO-O4O-HUB-EXPLORATION-UNIFORM-STRUCTURE-V1**
> **Date: 2026-02-23**
> **Status: FROZEN**

---

## 1. Purpose

`@o4o/hub-exploration-core` is the **platform-common Market Exploration Layout**.
All O4O services share the same HUB exploration structure. No per-service UI structure deviation is permitted.

---

## 2. Frozen Section Order

```
HubExplorationLayout
  ├── beforeSections?        (slot — service-specific header)
  ├── HeroCarousel           ← MANDATORY
  ├── RecentUpdatesTabs      ← MANDATORY (HUB_FIXED_TABS)
  ├── AdSection?             ← Optional (admin-controlled)
  ├── CoreServiceBanners     ← MANDATORY
  ├── ServicePromotionBanners? ← Optional (admin-controlled)
  ├── AIPlaceholder          ← MANDATORY
  ├── afterSections?         (slot — service-specific content)
  └── footerNote?
```

### Mandatory Sections

| Section | Behavior when no data |
|---------|-----------------------|
| HeroCarousel | Always rendered (at least 1 slide required) |
| RecentUpdatesTabs | Always rendered with `HUB_FIXED_TABS`; shows "이 카테고리의 업데이트가 없습니다." |
| CoreServiceBanners | Always rendered; shows "등록된 서비스가 없습니다." |
| AIPlaceholder | Always rendered with default text |

### Optional Sections

| Section | Condition |
|---------|-----------|
| AdSection | Rendered only when `ads` prop is provided |
| ServicePromotionBanners | Rendered only when `promotions` prop is provided |

---

## 3. Fixed Tab Constants

```typescript
export const HUB_FIXED_TABS = [
  { key: 'all',     label: '전체' },
  { key: 'b2b',     label: 'B2B' },
  { key: 'content', label: '콘텐츠' },
  { key: 'service', label: '서비스' },
];
```

All services MUST use `HUB_FIXED_TABS` for the RecentUpdates section.
Adding, removing, or reordering tabs per-service is **forbidden**.

---

## 4. Service Wrappers

Each service creates a thin wrapper that provides **data only**:

| Service | Wrapper | Theme Color |
|---------|---------|-------------|
| KPA Society | `PharmacyHubMarketPage` | `#1E3A8A` (blue) |
| GlycoPharm | `GlycoPharmHubPage` | `#0d9488` (teal) |
| K-Cosmetics | `KCosmeticsHubPage` | `#DB2777` (pink) |

### What wrappers CAN customize
- `theme.primaryColor` — brand color
- `hero.slides` — hero content
- `recentUpdates.items` — data items (fetched from API)
- `coreServices.banners` — service list with onClick callbacks
- `afterSections` — service-specific content below the standard layout
- `footerNote` — footer message

### What wrappers CANNOT customize
- Section order
- Tab labels or tab keys
- Removing any mandatory section
- Adding conditional rendering that skips a section
- Inline UI overrides that break the standard layout

---

## 5. Prohibited Changes

| Action | Status |
|--------|--------|
| Remove a mandatory section | FORBIDDEN |
| Change `HUB_FIXED_TABS` values | FORBIDDEN |
| Add per-service tab variations | FORBIDDEN |
| Add per-service conditional rendering | FORBIDDEN |
| Import `@o4o/store-ui-core` in hub-exploration-core | FORBIDDEN |
| Import `@o4o/hub-core` in hub-exploration-core | FORBIDDEN |
| Fetch data inside hub-exploration-core | FORBIDDEN |

---

## 6. Permitted Changes

| Action | Condition |
|--------|-----------|
| Bug fix | Immediate |
| Performance improvement | Immediate |
| New optional section | Work Order required |
| Theme token addition | Work Order required |
| New service wrapper | Follow exact same pattern |

---

## 7. Applied Services

| Service | Route | Status |
|---------|-------|--------|
| KPA Society | `/hub` (PharmacyHubMarketPage) | Applied |
| GlycoPharm | `/hub` | Applied |
| K-Cosmetics | `/hub` | Applied |

---

*Created: 2026-02-23*
*WO: WO-O4O-HUB-EXPLORATION-UNIFORM-STRUCTURE-V1*
