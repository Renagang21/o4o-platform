# Digital Signage - Extension Boundaries Specification v1.0

> **Work Order**: WO-DIGITAL-SIGNAGE-ARCHITECTURE-V1
> **Phase**: 1-D (Extension Definition)
> **Status**: Draft
> **Created**: 2026-01-17

---

## 1. Core vs Extension 원칙

### 1.1 기본 원칙

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     DIGITAL SIGNAGE ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────────┘

                          ┌────────────────────────┐
                          │   digital-signage-core │
                          │                        │
                          │  • Channel Engine      │
                          │  • Playlist Engine     │
                          │  • Schedule Engine     │
                          │  • Media Engine        │
                          │  • Playback Logging    │
                          │  • Heartbeat System    │
                          │  • Player URL Router   │
                          └───────────┬────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
           ┌────────▼────────┐ ┌─────▼──────┐ ┌───────▼───────┐
           │signage-pharmacy │ │signage-    │ │signage-seller │
           │                 │ │cosmetics   │ │-promo         │
           │ • 약국 콘텐츠   │ │            │ │               │
           │ • 본부 공지     │ │ • 제품정보 │ │ • 광고 입찰   │
           │ • 약국 오버레이 │ │ • 프로모션 │ │ • 노출 통계   │
           └─────────────────┘ └────────────┘ └───────────────┘
```

### 1.2 책임 분리 표

| 기능 | Core | Extension |
|------|------|-----------|
| Channel CRUD | ✅ | ❌ |
| Playlist CRUD | ✅ | ❌ |
| Schedule CRUD | ✅ | ❌ |
| Media CRUD | ✅ | ❌ |
| Playback Logging | ✅ | ❌ |
| Heartbeat System | ✅ | ❌ |
| Player Rendering | ✅ | ❌ |
| Content Resolution | ✅ | ❌ |
| 비즈니스 로직 | ❌ | ✅ |
| 산업별 UI | ❌ | ✅ |
| 콘텐츠 추천 | ❌ | ✅ |
| 오버레이 커스텀 | ❌ | ✅ |
| HQ 콘텐츠 배포 | ❌ | ✅ |

---

## 2. Extension App 정의

### 2.1 signage-pharmacy-extension (약국 사이니지)

**목적**: 약국 매장에서 사용하는 디지털 사이니지 기능

**소유 테이블**: 없음 (Core 테이블 참조만)

**기능 범위**:
| 기능 | 설명 | Core API 호출 |
|------|------|---------------|
| 약국 콘텐츠 관리 | 약국에서 직접 등록한 콘텐츠 | `POST /media` |
| 본부 공지 배포 | HQ에서 전체 약국에 배포 | `POST /playlists/:id/items` (isForced=true) |
| 약국 정보 오버레이 | 재생 화면에 약국 정보 표시 | Player 커스텀 |
| 플레이리스트 구성 | 약국별 재생 목록 편집 | `PUT /playlists/:id` |
| 채널 바인딩 | TV1, TV2 등 채널 연결 | `PUT /channels/:id` |

**UI 구성**:
```
약국 운영자 대시보드
├── 내 사이니지 (MySignagePage)
│   ├── 채널 선택 (TV1, TV2)
│   ├── 플레이리스트 구성
│   └── 저장/미리보기
├── 콘텐츠 라이브러리 (ContentLibraryPage)
│   ├── 필터: 본부/공급자/매장
│   └── 콘텐츠 추가
└── 미리보기 (SignagePreviewPage)
    ├── 실시간 재생
    └── 설정 (시계, 약국정보)
```

**Contract 사용 예시**:
```typescript
import { SignageContractClient } from '@o4o/digital-signage-contract';

class PharmacySignageService {
  constructor(private signage: SignageContractClient) {}

  // 약국 플레이리스트 구성
  async composePlaylist(pharmacyId: string, items: ContentItem[]) {
    const playlist = await this.signage.playlists.getOrCreate({
      name: `${pharmacyId} 기본 플레이리스트`,
      serviceKey: 'glycopharm',
      organizationId: pharmacyId,
    });

    // 기존 항목 중 isForced가 아닌 것만 제거
    const existingItems = await this.signage.playlists.getItems(playlist.id);
    for (const item of existingItems) {
      if (!item.isForced) {
        await this.signage.playlists.removeItem(playlist.id, item.id);
      }
    }

    // 새 항목 추가
    let order = existingItems.filter(i => i.isForced).length;
    for (const item of items) {
      await this.signage.playlists.addItem(playlist.id, {
        mediaId: item.mediaId,
        sortOrder: order++,
        sourceType: 'store',
        isForced: false,
      });
    }

    return playlist;
  }
}
```

---

### 2.2 signage-cosmetics-extension (화장품 매장 사이니지)

**목적**: 화장품 매장(드럭스토어, 뷰티샵)에서 사용하는 디지털 사이니지

**소유 테이블**: 없음

**기능 범위**:
| 기능 | 설명 |
|------|------|
| 제품 정보 표시 | 현재 진열 제품 정보 연동 |
| 프로모션 콘텐츠 | 할인, 이벤트 자동 노출 |
| 브랜드 템플릿 | 브랜드별 디자인 템플릿 |
| 재고 연동 | 재고 상태에 따른 콘텐츠 변경 |

**UI 구성**:
```
화장품 매장 대시보드
├── 제품 사이니지
│   ├── 제품 카테고리별 표시
│   └── 프로모션 자동 연동
├── 브랜드 템플릿
│   └── 템플릿 선택/적용
└── 노출 통계
    └── 제품별 노출 시간
```

---

### 2.3 signage-tourist-extension (관광 사이니지)

**목적**: 관광지, 면세점, 호텔 등에서 사용하는 다국어 안내 사이니지

**소유 테이블**: 없음

**기능 범위**:
| 기능 | 설명 |
|------|------|
| 다국어 콘텐츠 | 한/영/중/일 자동 전환 |
| 실시간 정보 | 환율, 날씨, 교통 정보 |
| 관광지 안내 | 주변 관광지 정보 표시 |
| QR 코드 연동 | 스캔하여 상세 정보 확인 |

**UI 구성**:
```
관광 사이니지 관리
├── 다국어 콘텐츠 관리
│   ├── 언어별 콘텐츠 등록
│   └── 자동 전환 스케줄
├── 실시간 정보 위젯
│   └── 환율/날씨/교통 설정
└── QR 코드 생성
    └── 랜딩 페이지 연결
```

---

### 2.4 signage-seller-promo-extension (판매자 광고)

**목적**: 판매자/공급자가 매장 사이니지에 광고를 노출하는 시스템

**소유 테이블**:
- `signage_ad_campaigns` (광고 캠페인)
- `signage_ad_bids` (입찰 정보)
- `signage_ad_exposures` (노출 기록)

**기능 범위**:
| 기능 | 설명 |
|------|------|
| 광고 캠페인 생성 | 판매자가 광고 콘텐츠 등록 |
| 매장 타겟팅 | 노출 대상 매장 선택 |
| 입찰 시스템 | CPM/CPC 기반 입찰 |
| 노출 통계 | 실시간 노출/클릭 집계 |
| 정산 시스템 | 월별 광고비 정산 |

**UI 구성**:
```
판매자 광고 대시보드
├── 캠페인 관리
│   ├── 신규 캠페인 생성
│   ├── 콘텐츠 업로드
│   └── 타겟 매장 선택
├── 입찰 관리
│   ├── 예산 설정
│   └── 입찰가 조정
└── 리포트
    ├── 노출 통계
    ├── ROI 분석
    └── 정산 내역
```

**Core와의 연동**:
```typescript
// Extension이 Core API를 통해 광고 콘텐츠 주입
class AdInjectionService {
  async injectAd(channelId: string, adCampaign: AdCampaign) {
    // 1. 미디어 등록 (Core API)
    const media = await this.signage.media.create({
      name: adCampaign.title,
      mediaType: 'video',
      sourceType: 'url',
      sourceUrl: adCampaign.videoUrl,
      serviceKey: 'signage-ad',
    });

    // 2. 채널의 플레이리스트에 광고 추가 (isForced=true)
    const channel = await this.signage.channels.get(channelId);
    await this.signage.playlists.addItem(channel.playlistId, {
      mediaId: media.id,
      sortOrder: 0, // 맨 앞에 배치
      sourceType: 'operator_ad',
      isForced: true, // 매장에서 삭제 불가
    });

    // 3. 노출 기록 (Extension 테이블)
    await this.adRepository.recordInjection({
      campaignId: adCampaign.id,
      channelId,
      injectedAt: new Date(),
    });
  }
}
```

---

## 3. Extension 개발 규칙

### 3.1 금지 사항

| 금지 항목 | 이유 |
|-----------|------|
| Core 테이블 직접 수정 | 데이터 정합성 보장 |
| Core API 우회하여 DB 접근 | 캐시/트리거 무효화 방지 |
| Core 엔드포인트 오버라이드 | API 일관성 유지 |
| 다른 Extension 테이블 접근 | 서비스 격리 |

### 3.2 허용 사항

| 허용 항목 | 방법 |
|-----------|------|
| Core API 호출 | SignageContractClient 사용 |
| Extension 전용 테이블 생성 | manifest.ownsTables 선언 |
| UI 컴포넌트 커스텀 | 메뉴 등록 및 페이지 추가 |
| Player 오버레이 | 오버레이 컴포넌트 주입 |

### 3.3 Manifest 구조

```typescript
// apps/api-server/packages/signage-pharmacy-extension/manifest.ts
import { AppManifest } from '@o4o/app-framework';

export const manifest: AppManifest = {
  id: 'signage-pharmacy-extension',
  version: '1.0.0',
  name: 'Signage Pharmacy Extension',
  nameKo: '약국 사이니지 확장',

  // Dependencies
  dependencies: [
    'digital-signage-core@^0.1.0',
    'digital-signage-contract@^1.0.0',
  ],

  // Service scope
  serviceKey: 'glycopharm',

  // Owned tables (Extension 전용)
  ownsTables: [], // 이 확장은 Core 테이블만 사용

  // Menu registration
  menus: [
    {
      id: 'pharmacy-signage',
      label: '사이니지',
      icon: 'tv',
      path: '/pharmacy/signage',
      children: [
        { id: 'my-signage', label: '내 사이니지', path: '/my' },
        { id: 'content-library', label: '콘텐츠', path: '/contents' },
        { id: 'preview', label: '미리보기', path: '/preview' },
      ],
    },
  ],

  // Routes
  routes: [
    { path: '/pharmacy/signage/my', component: 'MySignagePage' },
    { path: '/pharmacy/signage/contents', component: 'ContentLibraryPage' },
    { path: '/pharmacy/signage/preview', component: 'SignagePreviewPage' },
  ],

  // API routes
  apiRoutes: [
    { method: 'GET', path: '/pharmacy/signage/channels', handler: 'getChannels' },
    { method: 'GET', path: '/pharmacy/signage/my-signage', handler: 'getMySignage' },
    { method: 'PUT', path: '/pharmacy/signage/my-signage', handler: 'saveMySignage' },
  ],
};
```

---

## 4. Contract Library 정의

### 4.1 SignageContractClient Interface

```typescript
// packages/digital-signage-contract/src/client.ts

export interface SignageContractClient {
  // Channels
  channels: {
    list(params: ChannelListParams): Promise<Channel[]>;
    get(id: string): Promise<Channel>;
    getByCode(code: string): Promise<Channel>;
    create(data: ChannelCreateData): Promise<Channel>;
    update(id: string, data: ChannelUpdateData): Promise<Channel>;
    updateStatus(id: string, status: ChannelStatus): Promise<void>;
    delete(id: string): Promise<void>;
    getContents(id: string): Promise<ChannelContent[]>;
  };

  // Playlists
  playlists: {
    list(params: PlaylistListParams): Promise<Playlist[]>;
    get(id: string): Promise<Playlist>;
    create(data: PlaylistCreateData): Promise<Playlist>;
    update(id: string, data: PlaylistUpdateData): Promise<Playlist>;
    delete(id: string): Promise<void>;
    getItems(id: string): Promise<PlaylistItem[]>;
    addItem(id: string, item: PlaylistItemCreateData): Promise<PlaylistItem>;
    removeItem(playlistId: string, itemId: string): Promise<void>;
    reorderItems(id: string, itemIds: string[]): Promise<void>;
    clone(id: string, newName: string): Promise<Playlist>;
  };

  // Schedules
  schedules: {
    list(params: ScheduleListParams): Promise<Schedule[]>;
    get(id: string): Promise<Schedule>;
    create(data: ScheduleCreateData): Promise<Schedule>;
    update(id: string, data: ScheduleUpdateData): Promise<Schedule>;
    delete(id: string): Promise<void>;
    evaluate(channelId: string): Promise<Schedule | null>;
  };

  // Media
  media: {
    list(params: MediaListParams): Promise<Media[]>;
    get(id: string): Promise<Media>;
    create(data: MediaCreateData): Promise<Media>;
    update(id: string, data: MediaUpdateData): Promise<Media>;
    delete(id: string): Promise<void>;
    upload(file: File): Promise<Media>;
    createExternal(data: ExternalMediaData): Promise<Media>;
  };

  // Logging
  logging: {
    recordPlayback(channelId: string, data: PlaybackLogData): Promise<void>;
    sendHeartbeat(channelId: string, data: HeartbeatData): Promise<void>;
    getPlaybackLogs(params: PlaybackLogParams): Promise<PlaybackLog[]>;
    getAnalytics(params: AnalyticsParams): Promise<AnalyticsResult>;
  };

  // Device
  devices: {
    getStatus(params: DeviceStatusParams): Promise<DeviceStatus[]>;
    getHealth(): Promise<DeviceHealthSummary>;
  };
}
```

### 4.2 Type Definitions

```typescript
// packages/digital-signage-contract/src/types.ts

export type ChannelType = 'tv' | 'kiosk' | 'signage' | 'web';
export type ChannelStatus = 'active' | 'inactive' | 'maintenance';
export type MediaType = 'video' | 'image' | 'html' | 'text' | 'rich_text' | 'link';
export type SourceType = 'upload' | 'youtube' | 'vimeo' | 'url' | 'cms';
export type ContentSource = 'platform' | 'hq' | 'supplier' | 'store' | 'operator_ad';
export type TransitionType = 'none' | 'fade' | 'slide';

export interface Channel {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: ChannelType;
  status: ChannelStatus;
  resolution?: string;
  orientation?: 'landscape' | 'portrait';
  playlistId?: string;
  slotKey?: string;
  autoplay: boolean;
  refreshIntervalSec: number;
  location?: string;
  metadata?: Record<string, any>;
  serviceKey: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'draft';
  loopEnabled: boolean;
  defaultItemDuration: number;
  transitionType: TransitionType;
  transitionDuration: number;
  totalDuration: number;
  itemCount: number;
  isPublic: boolean;
  serviceKey: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  mediaId: string;
  media?: Media;
  sortOrder: number;
  duration?: number;
  transitionType?: TransitionType;
  isActive: boolean;
  isForced: boolean;
  sourceType: ContentSource;
  createdAt: Date;
}

export interface Media {
  id: string;
  name: string;
  description?: string;
  mediaType: MediaType;
  sourceType: SourceType;
  sourceUrl: string;
  embedId?: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  fileSize?: number;
  mimeType?: string;
  content?: string;
  tags?: string[];
  category?: string;
  status: 'active' | 'inactive' | 'processing';
  serviceKey: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Schedule {
  id: string;
  name: string;
  channelId?: string;
  playlistId: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  validFrom?: Date;
  validUntil?: Date;
  priority: number;
  isActive: boolean;
  serviceKey: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 5. Migration from Glycopharm

### 5.1 현재 Glycopharm 코드 → Extension 전환

| 현재 위치 | 전환 후 |
|-----------|---------|
| `web-glycopharm/pages/pharmacy/signage/` | `signage-pharmacy-extension/frontend/pages/` |
| `api-server/routes/glycopharm/controllers/signage.controller.ts` | `signage-pharmacy-extension/backend/controllers/` |
| `api-server/routes/glycopharm/entities/display-*.entity.ts` | 제거 (Core 엔터티 사용) |

### 5.2 API 전환

| 현재 API | 전환 후 |
|----------|---------|
| `GET /glycopharm/signage/channels` | Core API 호출 |
| `GET /glycopharm/signage/my-signage` | Extension → Core API |
| `PUT /glycopharm/signage/my-signage` | Extension → Core API |
| `GET /glycopharm/signage/contents` | Core API 호출 |

---

## 6. Appendix

### 6.1 Extension 개발 체크리스트

- [ ] manifest.ts 작성 완료
- [ ] dependencies에 Core 버전 명시
- [ ] ownsTables 정의 (필요시)
- [ ] menus 등록
- [ ] routes 정의
- [ ] apiRoutes 정의
- [ ] Core API만 사용하여 데이터 접근
- [ ] 테스트 코드 작성

### 6.2 Related Documents
- Digital Signage Core Feature Specification v1.0
- Unified Entity Diagram v0.1
- UX Flow Specification v1.0

---

**Document Version**: 1.0 Draft
**Author**: AI Assistant (Phase 1-D)
**Review Required**: Platform Architect
