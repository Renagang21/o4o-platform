# Signage Phase 3 - Development Foundation

> **Work Order:** WO-SIGNAGE-PHASE3-DEV-FOUNDATION
> **Status:** Complete
> **Date:** 2025-01-20

---

## 1. 개요

Phase 3 Extension 개발을 위한 기반 구조를 구축합니다.

### 1.1 구현 범위

| 구성요소 | 설명 | 상태 |
|---------|------|------|
| Extension Types | 공통 타입 정의 | ✅ |
| Extension Config | Feature Flags 및 설정 관리 | ✅ |
| Extension Guards | Role 기반 접근 제어 | ✅ |
| Core Adapter | Core ↔ Extension 연계 레이어 | ✅ |
| Router Factory | Extension Router 생성 팩토리 | ✅ |

---

## 2. 디렉토리 구조

```
apps/api-server/src/routes/signage/extensions/
├── common/                     # 공통 모듈
│   ├── extension.types.ts      # 타입 정의
│   ├── extension.config.ts     # 설정 및 Feature Flags
│   ├── extension.guards.ts     # Role Guards
│   ├── extension.adapter.ts    # Core Adapter
│   ├── extension.router.ts     # Router Factory
│   └── index.ts                # Re-exports
├── pharmacy/                   # Pharmacy Extension (Sprint 3-2)
├── cosmetics/                  # Cosmetics Extension (Sprint 3-3)
├── seller/                     # Seller Extension (Sprint 3-5)
├── tourist/                    # Tourist Extension (Sprint 3-6, optional)
└── index.ts                    # Extension 라우터 등록
```

---

## 3. 사용법

### 3.1 Extension 활성화 확인

```typescript
import { extensionRegistry, isExtensionEnabled } from './extensions/common';

// 방법 1: Registry 직접 사용
if (extensionRegistry.isEnabled('pharmacy')) {
  // pharmacy extension 활성화됨
}

// 방법 2: 헬퍼 함수 사용
if (isExtensionEnabled('cosmetics')) {
  // cosmetics extension 활성화됨
}
```

### 3.2 Feature Flag 확인

```typescript
import { canForceContent, canUseAiGeneration, canSelfEdit } from './extensions/common';

// Pharmacy는 Force 허용
canForceContent('pharmacy'); // true

// Cosmetics는 Force 불허
canForceContent('cosmetics'); // false

// Seller는 Self Edit 허용
canSelfEdit('seller'); // true
```

### 3.3 Role Guard 사용

```typescript
import {
  requireExtensionOperator,
  requireExtensionStore,
  allowExtensionStoreRead,
  createExtensionGuards
} from './extensions/common';

// 개별 Guard 사용
router.post('/contents', requireExtensionOperator('pharmacy'), handler);
router.get('/contents/:id', allowExtensionStoreRead('pharmacy'), handler);

// Guard 세트로 사용
const guards = createExtensionGuards('pharmacy');
router.post('/contents', guards.operator, handler);
router.get('/contents', guards.storeRead, handler);
```

### 3.4 Extension Router 생성

```typescript
import { createExtensionRouter, registerExtensionRoutes } from './extensions/common';
import type { ExtensionRouteDefinition, ExtensionRequest } from './extensions/common';

// Router 생성
const router = createExtensionRouter({
  extensionType: 'pharmacy',
  dataSource,
});

// Route 정의
const routes: ExtensionRouteDefinition[] = [
  {
    method: 'get',
    path: '/global/contents',
    guards: ['storeRead'],
    handler: async (req: ExtensionRequest, res) => {
      // req.coreAdapter를 통해 Core 기능 접근
      const { data, total } = await req.coreAdapter.getCoreGlobalPlaylists(
        { serviceKey: req.serviceKey },
        { page: 1, limit: 20 }
      );
      res.json({ data, meta: { total } });
    },
  },
  {
    method: 'post',
    path: '/contents',
    guards: ['operator'],
    handler: async (req: ExtensionRequest, res) => {
      // Extension 콘텐츠 생성 로직
    },
  },
];

// Route 등록
registerExtensionRoutes(router, 'pharmacy', routes);
```

### 3.5 Core Adapter 사용

```typescript
import { createCoreAdapter } from './extensions/common';

const adapter = createCoreAdapter(dataSource, 'pharmacy');

// Core Global Content 조회
const playlists = await adapter.getCoreGlobalPlaylists(
  { serviceKey: 'my-service' },
  { source: 'hq', page: 1, limit: 20 }
);

// Core Playlist Clone
const result = await adapter.cloneCorePlaylist(
  'source-playlist-id',
  { serviceKey: 'my-service', organizationId: 'org-id' },
  { name: 'My Cloned Playlist', includeItems: true }
);

// Force Content 조회 (Player Merge용)
const forcedContent = await adapter.getForcedContent(
  { serviceKey: 'my-service' },
  ['pharmacy-hq'] // Extension force sources
);

// Force 가능 여부 확인
adapter.canSourceForceContent('pharmacy-hq'); // true
adapter.canSourceForceContent('cosmetics-brand'); // false
```

---

## 4. Extension Role 체계

### 4.1 Role 형식

```
signage:{extension}:{role}
```

### 4.2 Extension별 Role

| Extension | Operator Role | Store Role |
|-----------|--------------|------------|
| Pharmacy | `signage:pharmacy:operator` | `signage:pharmacy:store` |
| Cosmetics | `signage:cosmetics:operator` | `signage:cosmetics:store` |
| Seller | `signage:seller:admin` | `signage:seller:partner` |
| Tourist | `signage:tourist:operator` | `signage:tourist:store` |

### 4.3 Role 상속

- Core `signage:operator`는 모든 Extension에 접근 가능
- Core `signage:store`는 모든 Extension Store Read에 접근 가능
- Extension Operator는 해당 Extension Store 기능도 접근 가능

---

## 5. Feature Flags

| Extension | AI Generation | Force Content | Analytics | Self Edit |
|-----------|--------------|---------------|-----------|-----------|
| Pharmacy | ✅ | ✅ | ✅ | ❌ |
| Cosmetics | ✅ | ❌ | ✅ | ❌ |
| Seller | ❌ | ❌ | ✅ | ✅ |
| Tourist | ✅ | ❌ | ✅ | ❌ |

---

## 6. Force 규칙 (FROZEN)

### 6.1 Force 허용 Source

- Core: `hq`
- Extension: `pharmacy-hq`

### 6.2 Force 불허 Source

- `supplier`, `community`
- `cosmetics-brand`, `tourism-authority`, `seller-partner`

---

## 7. 다음 단계

| Sprint | Work Order | 내용 |
|--------|-----------|------|
| 3-2 | WO-SIGNAGE-PHASE3-DEV-PHARMACY | Pharmacy Extension 구현 |
| 3-3 | WO-SIGNAGE-PHASE3-DEV-COSMETICS | Cosmetics Extension 구현 |
| 3-5 | WO-SIGNAGE-PHASE3-DEV-SELLER | Seller Extension 구현 |
| 3-6 | WO-SIGNAGE-PHASE3-DEV-TOURIST | Tourist Extension 구현 (optional) |

---

## 8. 참조 문서

- [PHASE3-DESIGN-BASELINE.md](./PHASE3-DESIGN-BASELINE.md) - Phase 3 설계 기준선
- [EXTENSION-BOUNDARIES-V3.md](./EXTENSION-BOUNDARIES-V3.md) - Extension 경계 정의
- [EXTENSION-ENTITY-DESIGN-V1.md](./EXTENSION-ENTITY-DESIGN-V1.md) - Entity 설계
- [EXTENSION-API-CONTRACT-V1.md](./EXTENSION-API-CONTRACT-V1.md) - API 계약
- [GLOBAL-CONTENT-FLOW-V4.md](./GLOBAL-CONTENT-FLOW-V4.md) - Global Content Flow

---

*Document: DEV-FOUNDATION-README.md*
*Work Order: WO-SIGNAGE-PHASE3-DEV-FOUNDATION*
*Status: Complete*
