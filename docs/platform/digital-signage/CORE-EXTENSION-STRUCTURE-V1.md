# Digital Signage Core/Extension Structure V1

> Phase 2 Refinement (R-3)
> Version: 1.0
> Date: 2026-01-17
> Status: Active

---

## 1. 개요

Digital Signage 시스템은 **Core**와 **Extension**으로 분리되어 있습니다.
이 문서는 각 영역의 경계와 책임을 정의합니다.

---

## 2. Core 영역

### 2.1 Core 정의

Core는 모든 Digital Signage 서비스에서 공통으로 사용되는 핵심 기능입니다.

### 2.2 Core Entities

| Entity | 패키지 | 설명 |
|--------|--------|------|
| SignagePlaylist | digital-signage-core | 플레이리스트 |
| SignagePlaylistItem | digital-signage-core | 플레이리스트 항목 |
| SignageMedia | digital-signage-core | 미디어 파일 |
| SignageSchedule | digital-signage-core | 스케줄 |
| SignageScheduleItem | digital-signage-core | 스케줄 항목 |
| SignageChannel | digital-signage-core | 채널 |
| SignageDisplay | digital-signage-core | 디스플레이 장치 |
| SignageDisplaySlot | digital-signage-core | 디스플레이 슬롯 |
| SignageTemplate | digital-signage-core | 템플릿 |
| SignageContentBlock | digital-signage-core | 콘텐츠 블록 |
| SignageLayoutPreset | digital-signage-core | 레이아웃 프리셋 |

### 2.3 Core APIs

| API 그룹 | 엔드포인트 | 설명 |
|---------|-----------|------|
| Playlist | `/api/signage/:serviceKey/playlists/*` | 플레이리스트 CRUD |
| Media | `/api/signage/:serviceKey/media/*` | 미디어 CRUD |
| Schedule | `/api/signage/:serviceKey/schedules/*` | 스케줄 CRUD |
| Channel | `/api/signage/:serviceKey/channels/*` | 채널 CRUD |
| Display | `/api/signage/:serviceKey/displays/*` | 디스플레이 CRUD |
| Template | `/api/signage/:serviceKey/templates/*` | 템플릿 CRUD |
| ContentBlock | `/api/signage/:serviceKey/content-blocks/*` | 콘텐츠 블록 |
| LayoutPreset | `/api/signage/:serviceKey/layout-presets/*` | 레이아웃 프리셋 |
| Player | `/api/signage/:serviceKey/player/*` | 플레이어 API |
| Global | `/api/signage/:serviceKey/global/*` | 글로벌 콘텐츠 |
| HQ | `/api/signage/:serviceKey/hq/*` | HQ 콘텐츠 관리 |
| Clone | `/api/signage/:serviceKey/*/clone` | 복제 API |

### 2.4 Core 서비스

| 서비스 | 파일 | 설명 |
|--------|------|------|
| SignageService | signage.service.ts | 메인 비즈니스 로직 |
| SignageRepository | signage.repository.ts | 데이터 접근 |
| SignageController | signage.controller.ts | HTTP 핸들러 |

---

## 3. Extension 영역

### 3.1 Extension 정의

Extension은 서비스별로 커스터마이징되는 기능입니다.
Core를 확장하거나 보완합니다.

### 3.2 Extension 유형

| 유형 | 설명 | 예시 |
|------|------|------|
| Service Extension | 서비스별 커스텀 로직 | 약국 전용 템플릿 |
| Supplier Extension | 공급업체 연동 | 브랜드 프로모션 자동화 |
| Analytics Extension | 분석/리포팅 | 콘텐츠 성과 분석 |
| AI Extension | AI 기능 | 콘텐츠 자동 생성 |

### 3.3 Extension Entities (예정)

| Entity | 패키지 | 설명 |
|--------|--------|------|
| SignageSupplier | digital-signage-supplier-ext | 공급업체 |
| SignageSupplierContent | digital-signage-supplier-ext | 공급업체 콘텐츠 |
| SignageAnalyticsEvent | digital-signage-analytics-ext | 분석 이벤트 |
| SignageContentRecommendation | digital-signage-ai-ext | AI 추천 |

### 3.4 Extension APIs (예정)

| API 그룹 | 엔드포인트 | 설명 |
|---------|-----------|------|
| Supplier | `/api/signage/:serviceKey/ext/suppliers/*` | 공급업체 관리 |
| Analytics | `/api/signage/:serviceKey/ext/analytics/*` | 분석 API |
| AI | `/api/signage/:serviceKey/ext/ai/*` | AI 기능 |

---

## 4. Core/Extension 분리 원칙

### 4.1 분리 기준

| Core에 포함 | Extension에 포함 |
|-------------|-----------------|
| 모든 서비스에서 공통 사용 | 특정 서비스에서만 사용 |
| 기본 CRUD 기능 | 고급 기능/커스텀 로직 |
| 표준 데이터 모델 | 확장 데이터 모델 |
| 필수 기능 | 선택적 기능 |

### 4.2 의존성 규칙

```
Extension → Core (허용)
Core → Extension (금지)
Extension → Extension (조건부 허용)
```

### 4.3 패키지 구조

```
packages/
├── digital-signage-core/          # Core 패키지
│   ├── src/
│   │   ├── backend/
│   │   │   ├── entities/          # Core Entities
│   │   │   ├── dto/               # Core DTOs
│   │   │   └── types/             # Core Types
│   │   └── frontend/
│   │       └── components/        # Core Components
│   └── package.json
│
├── digital-signage-supplier-ext/  # Supplier Extension (예정)
│   ├── src/
│   │   ├── entities/
│   │   ├── services/
│   │   └── components/
│   └── package.json
│
├── digital-signage-analytics-ext/ # Analytics Extension (예정)
│   └── ...
│
└── digital-signage-ai-ext/        # AI Extension (예정)
    └── ...
```

---

## 5. 현재 상태 분석

### 5.1 Core에 올바르게 위치한 것

- [x] SignagePlaylist, SignagePlaylistItem
- [x] SignageMedia
- [x] SignageSchedule, SignageScheduleItem
- [x] SignageChannel
- [x] SignageDisplay, SignageDisplaySlot
- [x] SignageTemplate
- [x] SignageContentBlock
- [x] SignageLayoutPreset
- [x] Global Content 필드 (source, scope, parent*Id)

### 5.2 Extension으로 분리해야 할 것 (Phase 3)

| 기능 | 현재 위치 | 목표 Extension |
|------|----------|----------------|
| Supplier 관리 | 미구현 | digital-signage-supplier-ext |
| Analytics 이벤트 | 미구현 | digital-signage-analytics-ext |
| AI 콘텐츠 생성 | Core (부분) | digital-signage-ai-ext |
| 서비스별 템플릿 | 미구현 | 서비스별 Extension |

### 5.3 Core 동결 대상

Phase 2 완료 후 다음 Core 영역은 동결됩니다:

| Entity | 동결 범위 | 변경 허용 |
|--------|----------|----------|
| SignagePlaylist | 스키마 | 비즈니스 로직만 |
| SignageMedia | 스키마 | 비즈니스 로직만 |
| SignageSchedule | 스키마 | 비즈니스 로직만 |
| SignageTemplate | 부분 동결 | Extension 연동 |

---

## 6. Extension 개발 가이드

### 6.1 Extension 생성

```bash
# 새 Extension 패키지 생성
pnpm create @o4o/signage-extension digital-signage-{name}-ext
```

### 6.2 Extension 구조

```typescript
// packages/digital-signage-{name}-ext/src/index.ts

export interface SignageExtension {
  id: string;
  name: string;
  version: string;
  dependencies: string[];

  // Lifecycle hooks
  onInstall?: () => Promise<void>;
  onUninstall?: () => Promise<void>;
  onActivate?: () => Promise<void>;
  onDeactivate?: () => Promise<void>;

  // API routes
  routes?: (router: Router) => void;

  // Entity extensions
  entities?: EntityClass[];

  // UI components
  components?: ComponentMap;
}

// Extension 정의
export const extension: SignageExtension = {
  id: 'signage-{name}-ext',
  name: 'Digital Signage {Name} Extension',
  version: '1.0.0',
  dependencies: ['digital-signage-core'],

  routes: (router) => {
    router.get('/ext/{name}/*', controller.handle);
  },

  entities: [MyExtensionEntity],

  components: {
    'ext.{name}.dashboard': MyDashboardComponent,
  },
};
```

### 6.3 Extension 등록

```typescript
// apps/api-server/src/extensions/signage-extensions.ts

import { extension as supplierExt } from '@o4o-apps/digital-signage-supplier-ext';
import { extension as analyticsExt } from '@o4o-apps/digital-signage-analytics-ext';

export const signageExtensions = [
  supplierExt,
  analyticsExt,
];
```

---

## 7. API 표준화 (R-3)

### 7.1 응답 구조 표준

```typescript
// 단일 리소스
{
  data: T
}

// 목록 리소스
{
  data: T[],
  meta: {
    page: number,
    limit: number,
    total: number,
    totalPages: number,
    hasNext: boolean,
    hasPrev: boolean
  }
}

// 에러 응답
{
  error: string,
  code?: string,
  details?: any
}
```

### 7.2 필드명 규칙

| 규칙 | 예시 |
|------|------|
| camelCase | `createdAt`, `updatedAt` |
| ID 접미사 | `playlistId`, `mediaId` |
| Boolean 접두사 | `isActive`, `isForced` |
| Count 접미사 | `itemCount`, `downloadCount` |

### 7.3 Soft Delete 규칙

```typescript
// 모든 Entity
{
  deletedAt: Date | null,  // null = 활성, Date = 삭제됨
  deletedByUserId?: string | null
}
```

### 7.4 Global Content 필드 규칙

```typescript
// Playlist, Media
{
  source: 'hq' | 'supplier' | 'community' | 'store',
  scope: 'global' | 'store',
  parentPlaylistId?: string | null,  // Playlist
  parentMediaId?: string | null,     // Media
}
```

---

## 8. 마이그레이션 계획

### 8.1 Phase 2 완료 시점 (현재)

- Core 기능 완성
- Global Content 구현 완료
- Store/HQ UI 분리 완료

### 8.2 Phase 3: Extension 분리 (예정)

1. Supplier Extension 분리
2. Analytics Extension 분리
3. AI Extension 분리
4. Core 동결 적용

### 8.3 Phase 4: 서비스별 커스터마이징 (예정)

1. 약국 전용 템플릿 Extension
2. 화장품 전용 템플릿 Extension
3. 관광 전용 템플릿 Extension

---

## 9. 관련 문서

- [Role Structure V2](./ROLE-STRUCTURE-V2.md)
- [Signage Routing Map V2](./SIGNAGE-ROUTING-MAP-V2.md)
- [API Standard Response](./API-STANDARD-RESPONSE-V1.md)

---

*Last Updated: 2026-01-17*
