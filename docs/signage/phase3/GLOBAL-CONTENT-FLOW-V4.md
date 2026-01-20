# Digital Signage - Global Content Flow V4 (Contract)

> **Phase:** 3 Design
> **Status:** FROZEN
> **Date:** 2025-01-20
> **Authority:** 이 문서는 Global Content 구현의 계약이며, Flow 변경 시 Work Order 필요

---

## 1. 문서 상태

| Status | Description |
|--------|-------------|
| **FROZEN** | Flow 계약 확정, 구현 시 Flow 변경 금지 |

---

## 2. Flow 전체 구조 (확정)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GLOBAL CONTENT FLOW V4 (CONTRACT)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PUBLISH LAYER                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    │ │
│  │  │  HQ (Core)  │  │  Supplier   │  │  Community  │  ← Core Sources   │ │
│  │  │   source:   │  │   source:   │  │   source:   │                    │ │
│  │  │     hq      │  │   supplier  │  │  community  │                    │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                    │ │
│  │                                                                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │ │
│  │  │ Pharmacy HQ │  │  Cosmetics  │  │   Tourism   │  │   Seller    │  │ │
│  │  │   source:   │  │   source:   │  │   source:   │  │   source:   │  │ │
│  │  │ pharmacy-hq │  │ cosmetics-  │  │  tourism-   │  │   seller-   │  │ │
│  │  │             │  │   brand     │  │  authority  │  │   partner   │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │ │
│  │  ↑ Extension Sources                                                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              │                                               │
│                              ▼                                               │
│  GLOBAL POOL                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     scope: 'global'                                    │ │
│  │                     Accessible by all Stores                           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              │                                               │
│                              ▼                                               │
│  STORE LAYER                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  Browse → Filter by Source → Clone → Customize → Schedule             │ │
│  │                                                                        │ │
│  │  Result: scope: 'store', parentId: original                           │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              │                                               │
│                              ▼                                               │
│  PLAYER LAYER                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  Merge Order:                                                          │ │
│  │  1. Core Forced (hq + isForced)                                       │ │
│  │  2. Extension Forced (pharmacy-hq + isForced)                         │ │
│  │  3. Core Global (hq, supplier, community)                             │ │
│  │  4. Extension Global                                                   │ │
│  │  5. Store Content                                                      │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Source Types (확정)

### 3.1 Core Sources (Phase 2 - 불변)

| Source | Description | Force 가능 | 발행 주체 |
|--------|-------------|-----------|----------|
| `hq` | 본사 콘텐츠 | ✅ | Core Operator |
| `supplier` | 공급자 콘텐츠 | ❌ | Supplier |
| `community` | 커뮤니티 공유 | ❌ | Store → Approval |

### 3.2 Extension Sources (Phase 3)

| Source | Description | Force 가능 | 발행 주체 |
|--------|-------------|-----------|----------|
| `pharmacy-hq` | 약국 HQ 콘텐츠 | ✅ | Pharmacy Operator |
| `cosmetics-brand` | 화장품 브랜드 | ❌ | Cosmetics Operator |
| `tourism-authority` | 관광청 콘텐츠 | ❌ | Tourist Operator |
| `seller-partner` | 파트너 프로모션 | ❌ | Partner (승인 후) |

---

## 4. Force 규칙 (계약)

### 4.1 Force 허용 Source

```typescript
const FORCE_ALLOWED_SOURCES = ['hq', 'pharmacy-hq'] as const;
```

### 4.2 Force 동작

| 조건 | Store에서 |
|------|----------|
| `isForced = true` | 삭제 불가, 순서 변경 불가 |
| `isForced = false` | Clone 후 자유 편집 |

### 4.3 Force 콘텐츠 표시

```
┌─────────────────────────────────────────┐
│  [🔒] 알레르기 복약 안내 (강제)          │
│       HQ에서 배포한 필수 콘텐츠입니다     │
│       삭제/수정 불가                      │
└─────────────────────────────────────────┘
```

---

## 5. Clone 규칙 (계약)

### 5.1 Clone 가능 여부

| Source | Clone 가능 | 조건 |
|--------|-----------|------|
| `hq` | ✅ | `isForced = false`인 경우 |
| `supplier` | ✅ | 항상 |
| `community` | ✅ | 항상 |
| `pharmacy-hq` | ✅ | `isForced = false`인 경우 |
| `cosmetics-brand` | ✅ | 항상 |
| `tourism-authority` | ✅ | 항상 |
| `seller-partner` | ✅ | 승인된 콘텐츠만 |

### 5.2 Clone 결과

```typescript
// Original
{
  id: 'original-id',
  scope: 'global',
  source: 'pharmacy-hq',
  isForced: false
}

// After Clone
{
  id: 'new-cloned-id',
  scope: 'store',
  source: 'pharmacy-hq',  // source 유지
  parentPlaylistId: 'original-id',  // 원본 참조
  isForced: false  // Clone은 항상 false
}
```

### 5.3 Clone 후 편집 범위

| 항목 | 편집 가능 |
|------|----------|
| 제목 | ✅ |
| 설명 | ✅ |
| 미디어 | ✅ (교체 가능) |
| 순서 | ✅ |
| 스케줄 | ✅ |
| source 필드 | ❌ (원본 유지) |
| parentPlaylistId | ❌ (원본 유지) |

---

## 6. Store Filter 규칙 (계약)

### 6.1 Extension 활성화

```typescript
interface StoreExtensionConfig {
  enabledExtensions: ('pharmacy' | 'cosmetics' | 'tourist' | 'seller')[];
}

// Example
const storeConfig: StoreExtensionConfig = {
  enabledExtensions: ['pharmacy', 'cosmetics']
};
```

### 6.2 Filter 로직

```typescript
function getAvailableGlobalContent(storeId: string): GlobalContent {
  const store = getStore(storeId);

  return {
    // Core sources (항상 포함)
    core: {
      hq: getHqContent(),
      supplier: getSupplierContent(),
      community: getCommunityContent(),
    },
    // Extension sources (활성화된 것만)
    extensions: store.enabledExtensions.reduce((acc, ext) => {
      acc[ext] = getExtensionContent(ext);
      return acc;
    }, {}),
  };
}
```

---

## 7. Player Merge 로직 (계약)

### 7.1 Merge 우선순위 (확정)

```typescript
function mergePlaylistContent(channelId: string): PlaylistItem[] {
  const items: PlaylistItem[] = [];

  // 1. Core HQ Forced (최우선)
  items.push(...getCoreContent('hq').filter(c => c.isForced));

  // 2. Extension Forced (pharmacy-hq만)
  items.push(...getExtensionContent('pharmacy-hq').filter(c => c.isForced));

  // 3. Core Global (non-forced)
  items.push(...getCoreContent('hq').filter(c => !c.isForced));
  items.push(...getCoreContent('supplier'));
  items.push(...getCoreContent('community'));

  // 4. Extension Global (non-forced)
  for (const ext of getEnabledExtensions()) {
    items.push(...getExtensionContent(ext).filter(c => !c.isForced));
  }

  // 5. Store Content
  items.push(...getStoreContent());

  return items;
}
```

### 7.2 Merge 결과 예시

```
Channel Playlist (After Merge):
┌─────────────────────────────────────────────────────────────┐
│ 1. [FORCED] 복약 안내 (pharmacy-hq, isForced=true)          │
│ 2. [FORCED] 법적 고지 (hq, isForced=true)                   │
│ 3. HQ 봄맞이 이벤트 (hq)                                    │
│ 4. 공급자 신제품 소개 (supplier)                            │
│ 5. 약국 건강 캠페인 (pharmacy-hq)                           │
│ 6. 화장품 트렌드 (cosmetics-brand)                          │
│ 7. 파트너 프로모션 (seller-partner)                         │
│ 8. 매장 자체 콘텐츠 (store)                                 │
│ 9. 매장 Clone 콘텐츠 (store, parent: pharmacy-hq)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. API 엔드포인트 (계약)

### 8.1 Store Global Content API

```
# Core Global
GET /api/signage/:serviceKey/global/playlists
GET /api/signage/:serviceKey/global/playlists/:source
GET /api/signage/:serviceKey/global/media
GET /api/signage/:serviceKey/global/media/:source

# Extension Global
GET /api/signage/:serviceKey/ext/pharmacy/global/contents
GET /api/signage/:serviceKey/ext/cosmetics/global/contents
GET /api/signage/:serviceKey/ext/seller/global/promos

# Clone
POST /api/signage/:serviceKey/playlists/:id/clone
POST /api/signage/:serviceKey/ext/{extension}/global/contents/:id/clone
```

### 8.2 Response Format

```typescript
interface GlobalContentResponse {
  data: {
    items: GlobalContentItem[];
    meta: {
      total: number;
      sources: string[];
      hasForced: boolean;
    };
  };
}

interface GlobalContentItem {
  id: string;
  title: string;
  source: ContentSource;
  scope: 'global';
  isForced: boolean;
  canClone: boolean;
  thumbnailUrl?: string;
  createdAt: string;
}
```

---

## 9. Store UI 계약

### 9.1 Global Content 탭 순서

```
[All] [HQ] [Supplier] [Community] | [Pharmacy] [Cosmetics] [Partners]
 ↑ Core (항상 표시)                 ↑ Extension (활성화 시)
```

### 9.2 콘텐츠 카드 표시

```
┌─────────────────────────────────────────────────────────────┐
│  Normal Content                    Forced Content           │
│  ┌───────────────────┐             ┌───────────────────┐   │
│  │                   │             │ 🔒               │   │
│  │    [Thumbnail]    │             │    [Thumbnail]    │   │
│  │                   │             │                   │   │
│  │  Title            │             │  Title            │   │
│  │  [Clone] [Preview]│             │  [Preview]        │   │
│  └───────────────────┘             └───────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. 통계/수익 연결점 (계약)

### 10.1 추적 가능 데이터

| Data | Core | Extension |
|------|------|-----------|
| Impressions | ✅ | ✅ |
| Play Duration | ✅ | ✅ |
| Clone Count | ✅ | ✅ |
| Store Count | ✅ | ✅ |

### 10.2 Extension별 추가 데이터

| Extension | Additional Data |
|-----------|-----------------|
| Pharmacy | 카테고리별 노출 |
| Cosmetics | 브랜드별 노출 |
| Seller | 파트너별 성과, 전환 |

---

## 11. 버전 관리

| Version | Date | Changes |
|---------|------|---------|
| V1 | Phase 2 | Core only (hq, supplier, community) |
| V2 | Phase 2.5 | Clone flow 추가 |
| V3 | Phase 3 Pre | Extension source 설계 |
| **V4** | Phase 3 Design | **계약 확정 (현재)** |

---

*Document: GLOBAL-CONTENT-FLOW-V4.md*
*Status: FROZEN*
*Phase 3 Design*
