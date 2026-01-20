# Digital Signage - Global Content Flow V3

> **Phase:** 3 Pre-Design
> **Status:** Draft
> **Date:** 2025-01-20

---

## 1. Overview

Phase 2의 Global Content Flow를 확장하여 산업별 Extension 콘텐츠를 포함합니다.

---

## 2. Phase 2 Flow (Baseline)

```
┌─────────────────────────────────────────────────────────┐
│                    GLOBAL CONTENT POOL                   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐    ┌──────────┐    ┌───────────┐          │
│  │   HQ    │    │ Supplier │    │ Community │          │
│  │ (본사)   │    │ (공급자)  │    │ (커뮤니티) │          │
│  └────┬────┘    └────┬─────┘    └─────┬─────┘          │
│       │              │                │                 │
│       └──────────────┼────────────────┘                 │
│                      ▼                                  │
│              ┌──────────────┐                           │
│              │    Store     │                           │
│              │   Browse &   │                           │
│              │    Clone     │                           │
│              └──────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

**Source Types (Phase 2):**
- `hq`: 본사 발행 콘텐츠
- `supplier`: 공급자 제공 콘텐츠
- `community`: 커뮤니티 공유 콘텐츠

---

## 3. Phase 3 Flow (Extended)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GLOBAL CONTENT POOL V3                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────── CORE SOURCES ────────────────────────┐           │
│  │  ┌─────────┐    ┌──────────┐    ┌───────────┐               │           │
│  │  │   HQ    │    │ Supplier │    │ Community │               │           │
│  │  └─────────┘    └──────────┘    └───────────┘               │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                              │
│  ┌──────────────────── EXTENSION SOURCES ───────────────────────┐           │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │           │
│  │  │ pharmacy-hq │  │ cosmetics-  │  │  tourism-   │          │           │
│  │  │             │  │   brand     │  │  authority  │          │           │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │           │
│  │                                                              │           │
│  │  ┌─────────────┐                                            │           │
│  │  │   seller-   │                                            │           │
│  │  │   partner   │                                            │           │
│  │  └─────────────┘                                            │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                              │
│                              ▼                                               │
│                    ┌──────────────────┐                                     │
│                    │      Store       │                                     │
│                    │   Browse/Clone   │                                     │
│                    │   + Extension    │                                     │
│                    │     Filters      │                                     │
│                    └──────────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Extended Source Types

### 4.1 Core Sources (Phase 2)

| Source | Description | Managed By |
|--------|-------------|------------|
| `hq` | 본사 발행 콘텐츠 | Operator (HQ) |
| `supplier` | 공급자 제공 콘텐츠 | Supplier |
| `community` | 커뮤니티 공유 콘텐츠 | Store → Approved |

### 4.2 Extension Sources (Phase 3)

| Source | Description | Managed By |
|--------|-------------|------------|
| `pharmacy-hq` | 약국 본사 콘텐츠 | Pharmacy Operator |
| `cosmetics-brand` | 화장품 브랜드 콘텐츠 | Brand Supplier |
| `tourism-authority` | 관광청 콘텐츠 | Tourism Authority |
| `seller-partner` | 파트너/셀러 콘텐츠 | Partner |

---

## 5. Content Type Matrix

### 5.1 Source × Content Type

| Source | Playlist | Media | Template | isForced |
|--------|----------|-------|----------|----------|
| hq | ✅ | ✅ | ✅ | ✅ |
| supplier | ✅ | ✅ | ❌ | ❌ |
| community | ✅ | ✅ | ❌ | ❌ |
| pharmacy-hq | ✅ | ✅ | ✅ | ✅ |
| cosmetics-brand | ✅ | ✅ | ❌ | ❌ |
| tourism-authority | ✅ | ✅ | ✅ | ❌ |
| seller-partner | ✅ | ✅ | ❌ | ❌ |

### 5.2 isForced 규칙

**강제 콘텐츠 권한:**
- `hq`: 항상 가능
- `pharmacy-hq`: Extension 범위 내 가능
- 나머지: 불가

---

## 6. Store 수신 Flow

### 6.1 기본 수신

```typescript
// Store가 수신하는 글로벌 콘텐츠
interface StoreGlobalContent {
  // Core sources
  hq: PlaylistContent[];
  supplier: PlaylistContent[];
  community: PlaylistContent[];

  // Extension sources (optional, based on store type)
  pharmacy?: PharmacyContent[];
  cosmetics?: CosmeticsContent[];
  tourism?: TouristContent[];
  seller?: SellerContent[];
}
```

### 6.2 필터링 로직

```typescript
// Store는 자신의 산업에 맞는 Extension만 수신
function getGlobalContentForStore(storeId: string): StoreGlobalContent {
  const store = getStore(storeId);
  const content: StoreGlobalContent = {
    hq: getCoreHqContent(),
    supplier: getCoreSupplierContent(),
    community: getCoreCommunityContent(),
  };

  // Extension 필터링
  if (store.extensions.includes('pharmacy')) {
    content.pharmacy = getPharmacyContent();
  }
  if (store.extensions.includes('cosmetics')) {
    content.cosmetics = getCosmeticsContent();
  }
  // ...

  return content;
}
```

---

## 7. API Endpoints

### 7.1 Core Global Content API (Phase 2)

```
GET /api/signage/:serviceKey/global/playlists
GET /api/signage/:serviceKey/global/playlists/:source
GET /api/signage/:serviceKey/global/media
GET /api/signage/:serviceKey/global/media/:source
```

### 7.2 Extension Global Content API (Phase 3)

```
# Pharmacy
GET /api/signage/:serviceKey/ext/pharmacy/global/content
GET /api/signage/:serviceKey/ext/pharmacy/global/templates

# Cosmetics
GET /api/signage/:serviceKey/ext/cosmetics/global/content
GET /api/signage/:serviceKey/ext/cosmetics/brands/:brandId/content

# Tourist
GET /api/signage/:serviceKey/ext/tourist/global/content
GET /api/signage/:serviceKey/ext/tourist/locations
GET /api/signage/:serviceKey/ext/tourist/events

# Seller
GET /api/signage/:serviceKey/ext/seller/global/promos
GET /api/signage/:serviceKey/ext/seller/partners/:partnerId/content
```

---

## 8. Clone Flow

### 8.1 Core Clone (Phase 2)

```
Global Playlist (scope: global)
        │
        ▼ Clone
Store Playlist (scope: store, parentPlaylistId: original)
```

### 8.2 Extension Clone (Phase 3)

```
Extension Content (source: pharmacy-hq)
        │
        ▼ Clone to Core
Store Playlist (scope: store, source: pharmacy-hq-clone)
        │
        ▼ Edit
Store Customized Playlist
```

**Extension Clone 규칙:**
- Extension 콘텐츠는 Core Playlist로 Clone
- Clone 시 `source` 필드에 origin 기록
- Clone 후 Store가 자유롭게 편집 가능

---

## 9. Player Merge Logic

### 9.1 Phase 2 Merge

```typescript
function mergeContent(channelId: string): PlaylistItem[] {
  const global = getGlobalContent(channelId);
  const store = getStoreContent(channelId);

  // Forced content first
  const forced = [...global, ...store].filter(item => item.isForced);

  // Then global
  const globalItems = global.filter(item => !item.isForced);

  // Then store
  const storeItems = store.filter(item => !item.isForced);

  return [...forced, ...globalItems, ...storeItems];
}
```

### 9.2 Phase 3 Merge (Extended)

```typescript
function mergeContentV3(channelId: string): PlaylistItem[] {
  const coreGlobal = getCoreGlobalContent(channelId);
  const extensionGlobal = getExtensionGlobalContent(channelId);
  const store = getStoreContent(channelId);

  // Priority order:
  // 1. Core HQ Forced
  // 2. Extension Forced (pharmacy-hq only)
  // 3. Core Global
  // 4. Extension Global
  // 5. Store

  const coreForced = coreGlobal.filter(item =>
    item.source === 'hq' && item.isForced
  );

  const extForced = extensionGlobal.filter(item =>
    item.source === 'pharmacy-hq' && item.isForced
  );

  const coreNormal = coreGlobal.filter(item => !item.isForced);
  const extNormal = extensionGlobal.filter(item => !item.isForced);
  const storeItems = store;

  return [
    ...coreForced,
    ...extForced,
    ...coreNormal,
    ...extNormal,
    ...storeItems,
  ];
}
```

---

## 10. UI/UX Flow

### 10.1 Store Dashboard 탭 구조

```
Global Content
├── [All]
├── [HQ]
├── [Supplier]
├── [Community]
└── [Extensions]
    ├── [Pharmacy]
    ├── [Cosmetics]
    ├── [Tourist]
    └── [Seller]
```

### 10.2 Extension 필터 UI

```typescript
// Store에 활성화된 Extension만 탭 표시
function getAvailableExtensionTabs(storeId: string): string[] {
  const store = getStore(storeId);
  return store.enabledExtensions; // ['pharmacy', 'cosmetics']
}
```

---

## 11. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          PUBLISH                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  HQ Operator ──────────► Core Global Pool                       │
│                                                                  │
│  Pharmacy Operator ────► Pharmacy Extension Pool                │
│                                                                  │
│  Cosmetics Brand ──────► Cosmetics Extension Pool               │
│                                                                  │
│  Tourism Authority ────► Tourist Extension Pool                  │
│                                                                  │
│  Partner/Seller ───────► Seller Extension Pool                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          BROWSE                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Store Dashboard                                                 │
│    │                                                            │
│    ├── Browse Core Global                                       │
│    ├── Browse Enabled Extensions                                │
│    └── Filter by Source/Type/Category                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           CLONE                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Select Content ──► Clone to Store ──► Customize ──► Schedule   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           PLAYBACK                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Player                                                          │
│    │                                                            │
│    ├── Fetch Core + Extension Global                            │
│    ├── Fetch Store Playlist                                     │
│    ├── Merge (Forced → Global → Extension → Store)              │
│    └── Play                                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Migration from V2 to V3

1. **Phase 1**: Extension Pool 테이블 생성
2. **Phase 2**: API 엔드포인트 추가
3. **Phase 3**: Store Dashboard Extension 탭 추가
4. **Phase 4**: Player Merge 로직 확장

기존 V2 Flow는 그대로 유지되며, Extension은 **추가**됩니다.

---

*Document: GLOBAL-CONTENT-FLOW-V3.md*
*Phase 3 Pre-Design*
