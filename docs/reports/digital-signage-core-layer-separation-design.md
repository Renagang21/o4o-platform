# Digital Signage Core Layer Separation Design

> **Status:** Phase2 설계 완료 - Phase3 실행 대기
> **Date:** 2025-12-22
> **Target Phase:** Phase3

---

## 1. Executive Summary

`digital-signage-core`는 v0.1.0 초기 버전으로, 공통 레이어와 Extension 포인트의 명확한 분리가 필요합니다.

### 1.1 현재 상태

| 항목 | 현재 값 |
|------|--------|
| Version | 0.1.0 (초기) |
| App Type | core |
| Dependencies | platform-core, cms-core |
| Extensions | signage-pharmacy-extension |

### 1.2 설계 목표

1. **공통 레이어 명확화**: Media, Display, Schedule 등 범용 기능
2. **Extension 포인트 정의**: 산업군별 확장 지점
3. **API 안정화**: 외부 Extension이 의존할 수 있는 안정적 API

---

## 2. 현재 구조 분석

### 2.1 파일 구조

```
packages/digital-signage-core/src/backend/
├── controllers/
│   ├── action/
│   │   ├── ActionController.ts
│   │   ├── ActionExecutionController.ts
│   │   └── index.ts
│   ├── display/
│   │   ├── DisplayController.ts
│   │   ├── DisplaySlotController.ts
│   │   └── index.ts
│   ├── media/
│   │   ├── MediaListController.ts
│   │   ├── MediaListItemController.ts
│   │   ├── MediaSourceController.ts
│   │   └── index.ts
│   ├── schedule/
│   │   ├── ScheduleController.ts
│   │   └── index.ts
│   └── index.ts
├── dto/
├── engine/
│   ├── EngineManager.ts
│   ├── RenderingEngine.ts
│   └── index.ts
├── entities/
│   ├── MediaSource.entity.ts
│   ├── MediaList.entity.ts
│   ├── MediaListItem.entity.ts
│   ├── Display.entity.ts
│   ├── DisplaySlot.entity.ts
│   ├── Schedule.entity.ts
│   ├── ActionExecution.entity.ts
│   └── index.ts
├── lifecycle/
├── player/
├── services/
├── types/
├── manifest.ts
├── routes.ts
└── index.ts
```

### 2.2 소유 테이블

| 테이블 | 레이어 | 용도 |
|--------|--------|------|
| `signage_media_source` | Common | 미디어 소스 (URL, 파일) |
| `signage_media_list` | Common | 미디어 목록 |
| `signage_media_list_item` | Common | 미디어 목록 항목 |
| `signage_display` | Common | 디스플레이 장치 |
| `signage_display_slot` | Common | 디스플레이 슬롯 |
| `signage_schedule` | Common | 스케줄 |
| `signage_action_execution` | Common | 액션 실행 기록 |

### 2.3 주요 컴포넌트

| 컴포넌트 | 역할 | 레이어 |
|----------|------|--------|
| RenderingEngine | 미디어 렌더링 엔진 | Common |
| EngineManager | 엔진 오케스트레이션 | Common |
| MediaSourceController | 미디어 소스 CRUD | Common |
| DisplayController | 디스플레이 관리 | Common |
| ScheduleController | 스케줄 관리 | Common |

---

## 3. 레이어 분리 설계

### 3.1 레이어 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXTENSION LAYER                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  signage-pharmacy-extension                                  ││
│  │  - PharmacyPlaylistService                                   ││
│  │  - PharmacyContentProvider                                   ││
│  │  - AI Insight Integration                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  (Future) signage-cosmetics-extension                        ││
│  │  (Future) signage-retail-extension                           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CORE COMMON LAYER                            │
│                     (digital-signage-core)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │    Media     │  │   Display    │  │   Schedule   │           │
│  │   System     │  │   System     │  │   System     │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Action     │  │  Rendering   │  │   Player     │           │
│  │   System     │  │   Engine     │  │   Runtime    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Common Layer (Core)

#### 3.2.1 Media System

| 컴포넌트 | 역할 | 안정성 |
|----------|------|--------|
| MediaSource | URL/파일 기반 미디어 소스 | Stable |
| MediaList | 미디어 목록 컬렉션 | Stable |
| MediaListItem | 목록 항목 (순서, 지속시간) | Stable |
| MediaSourceService | 미디어 소스 CRUD | Stable |

#### 3.2.2 Display System

| 컴포넌트 | 역할 | 안정성 |
|----------|------|--------|
| Display | 디스플레이 장치 정의 | Stable |
| DisplaySlot | 디스플레이 내 슬롯 구성 | Stable |
| DisplayService | 디스플레이 관리 | Stable |

#### 3.2.3 Schedule System

| 컴포넌트 | 역할 | 안정성 |
|----------|------|--------|
| Schedule | 스케줄 정의 (시간, 반복) | Stable |
| ScheduleService | 스케줄 관리 | Stable |

#### 3.2.4 Rendering Engine

| 컴포넌트 | 역할 | 안정성 |
|----------|------|--------|
| RenderingEngine | 미디어 렌더링 | Beta |
| EngineManager | 엔진 오케스트레이션 | Beta |

### 3.3 Extension Interface (신규)

```typescript
// 제안: packages/digital-signage-core/src/extension-interface.ts

interface SignageCoreExtension {
  appId: string;
  displayName?: string;
  version?: string;

  // === Content Provider ===
  /**
   * 확장앱이 제공하는 콘텐츠 소스
   */
  contentProviders?: ContentProvider[];

  // === Playlist Hooks ===
  /**
   * 재생목록 생성 전 Hook
   */
  beforePlaylistCreate?: (context: PlaylistContext) => Promise<ValidationResult>;

  /**
   * 재생목록 아이템 선택 Hook
   * AI 기반 동적 콘텐츠 선택에 사용
   */
  selectPlaylistItems?: (context: SelectionContext) => Promise<MediaItem[]>;

  // === Display Hooks ===
  /**
   * 디스플레이 설정 전 Hook
   */
  beforeDisplayConfig?: (context: DisplayContext) => Promise<ValidationResult>;

  // === Schedule Hooks ===
  /**
   * 스케줄 실행 전 Hook
   */
  beforeScheduleExecute?: (context: ScheduleContext) => Promise<ValidationResult>;

  // === Rendering Hooks ===
  /**
   * 렌더링 전 전처리
   */
  beforeRender?: (context: RenderContext) => Promise<RenderContext>;

  /**
   * 렌더링 후 후처리
   */
  afterRender?: (context: RenderContext) => Promise<void>;
}

interface ContentProvider {
  id: string;
  name: string;
  type: 'static' | 'dynamic' | 'ai-generated';
  fetchContent: (params: ContentParams) => Promise<MediaContent[]>;
}
```

---

## 4. 분리 작업 목록

### 4.1 Phase3 작업

| Step | 작업 | 위험도 | 시간 |
|------|------|--------|------|
| 1 | Extension Interface 파일 생성 | Low | 1시간 |
| 2 | Content Provider 인터페이스 정의 | Low | 30분 |
| 3 | Playlist Hooks 인터페이스 정의 | Low | 30분 |
| 4 | signage-pharmacy-extension 연동 업데이트 | Medium | 2시간 |
| 5 | 문서화 | Low | 1시간 |

### 4.2 파일 생성 목록

```
packages/digital-signage-core/src/
├── extension-interface.ts     (NEW)
├── hooks/
│   ├── extension-registry.ts  (NEW)
│   ├── content-provider.ts    (NEW)
│   └── index.ts               (NEW)
```

### 4.3 signage-pharmacy-extension 업데이트

```typescript
// packages/signage-pharmacy-extension/src/extension.ts (예시)

import { SignageCoreExtension, ContentProvider } from '@o4o/digital-signage-core';

export const pharmacySignageExtension: SignageCoreExtension = {
  appId: 'signage-pharmacy-extension',
  displayName: '약국 사이니지 확장',

  contentProviders: [
    {
      id: 'pharmacy-ai-content',
      name: 'AI 약국 콘텐츠',
      type: 'ai-generated',
      fetchContent: async (params) => {
        // AI 인사이트 기반 콘텐츠 생성
        return await pharmacyAIContentService.generate(params);
      },
    },
  ],

  async selectPlaylistItems(context) {
    // 시간대/고객 세그먼트 기반 동적 콘텐츠 선택
    return await pharmacyPlaylistService.selectItems(context);
  },
};
```

---

## 5. API 안정화 계획

### 5.1 현재 API 상태

| API | 상태 | 비고 |
|-----|------|------|
| Media CRUD | Beta | 안정화 필요 |
| Display CRUD | Beta | 안정화 필요 |
| Schedule CRUD | Beta | 안정화 필요 |
| Rendering Engine | Alpha | 개발 중 |

### 5.2 안정화 목표 (Phase4)

| API | 목표 상태 | 기준 |
|-----|----------|------|
| Media CRUD | Stable | 버전 1.0.0 |
| Display CRUD | Stable | 버전 1.0.0 |
| Schedule CRUD | Stable | 버전 1.0.0 |
| Extension Interface | Stable | 버전 1.0.0 |

---

## 6. 마이그레이션 영향

### 6.1 영향 받는 패키지

| 패키지 | 필요 조치 |
|--------|----------|
| signage-pharmacy-extension | Extension Interface 구현 |
| pharmacyops | 변경 없음 |
| admin-dashboard | 변경 없음 |

### 6.2 하위 호환성

- 기존 API는 유지
- Extension Interface는 추가 기능
- Breaking Change 없음

---

## 7. 테스트 계획

### 7.1 단위 테스트

- [ ] ContentProvider interface 테스트
- [ ] PlaylistHooks 테스트
- [ ] Extension Registry 테스트

### 7.2 통합 테스트

- [ ] signage-pharmacy-extension 연동 테스트
- [ ] AI 콘텐츠 생성 테스트
- [ ] 동적 재생목록 테스트

---

## 8. 결론

digital-signage-core의 레이어 분리는 다음과 같이 진행합니다:

1. **Phase2 (완료)**: 설계 문서 작성
2. **Phase3 (예정)**: Extension Interface 구현
3. **Phase4 (예정)**: API 안정화 및 버전 1.0.0 릴리스

### 핵심 원칙

1. Common Layer는 산업 중립적 유지
2. Extension을 통한 산업별 기능 확장
3. AI 콘텐츠 생성은 Extension에서 처리
4. Breaking Change 방지

---

*Document Version: 1.0.0*
*Created: 2025-12-22*
*Part of: WO-APPSTORE-CORE-BOUNDARY-PHASE2*
