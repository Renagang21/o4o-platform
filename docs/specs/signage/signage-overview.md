# Digital Signage App Specification

> 최종 업데이트: 2025-12-10
> 앱 타입: Standalone App

---

## 1. Overview

Digital Signage는 매장 디스플레이 콘텐츠 관리 및 자동화를 위한 Standalone App이다.

| 항목 | 값 |
|------|-----|
| appId | `signage` |
| type | Standalone |
| category | display |
| version | 1.0.0 |

### 핵심 기능

- **슬라이드 관리**: ViewRenderer JSON 기반 콘텐츠 제작
- **디바이스 관리**: 매장별 디스플레이 등록/모니터링
- **플레이리스트**: 슬라이드 조합 및 순서 관리
- **스케줄링**: 시간대별 자동 재생 스케줄
- **재생 추적**: Playback 로그 및 분석

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│               Digital Signage                    │
├─────────────────────────────────────────────────┤
│  Admin Dashboard                                 │
│  ├─ 슬라이드 에디터                              │
│  ├─ 플레이리스트 빌더                            │
│  ├─ 디바이스 모니터링                            │
│  └─ 스케줄 관리                                  │
├─────────────────────────────────────────────────┤
│  Signage Player (Main Site)                      │
│  └─ /signage/player/:deviceId                   │
├─────────────────────────────────────────────────┤
│  API Routes                                      │
│  ├─ /signage/slides                             │
│  ├─ /signage/devices                            │
│  ├─ /signage/playlists                          │
│  ├─ /signage/schedules                          │
│  └─ /signage/playback                           │
└─────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### 주요 테이블 (5개)

| 테이블 | 설명 |
|--------|------|
| `signage_slides` | 슬라이드 콘텐츠 |
| `signage_devices` | 디스플레이 디바이스 |
| `signage_playlists` | 플레이리스트 |
| `signage_playlist_items` | 플레이리스트-슬라이드 연결 |
| `signage_schedules` | 재생 스케줄 |

### signage_slides

```sql
id UUID PRIMARY KEY
title VARCHAR(255)
description TEXT
json JSONB               -- ViewRenderer JSON
thumbnail VARCHAR(500)
duration INTEGER         -- seconds (default: 10)
category VARCHAR(100)
tags JSONB
active BOOLEAN
```

### signage_devices

```sql
id UUID PRIMARY KEY
name VARCHAR(255)
token VARCHAR(500) UNIQUE  -- 디바이스 인증 토큰
location VARCHAR(255)
resolution VARCHAR(100)    -- "1920x1080"
orientation VARCHAR(100)   -- landscape | portrait
last_heartbeat TIMESTAMP
active BOOLEAN
```

### signage_schedules

```sql
id UUID PRIMARY KEY
device_id UUID
playlist_id UUID
start_time VARCHAR(10)    -- "09:00"
end_time VARCHAR(10)      -- "18:00"
days_of_week JSONB        -- [0,1,2,3,4,5,6]
priority INTEGER          -- 높을수록 우선
active BOOLEAN
```

---

## 4. Permissions

| Permission | 설명 |
|------------|------|
| `signage.read` | 콘텐츠 조회 |
| `signage.write` | 콘텐츠 생성/수정 |
| `signage.manage` | 전체 시스템 관리 |
| `signage.device.manage` | 디바이스 관리 |

---

## 5. Integration Points

### slide-app 패키지

슬라이드 렌더링에 `@o4o/slide-app` 패키지 사용:

```typescript
import { SlideApp } from '@o4o/slide-app';

<SlideApp
  slides={slides}
  autoplay={{ enabled: true, delay: 10000 }}
  loop={true}
/>
```

### Cosmetics 연동

- 캠페인 슬라이드 자동 생성
- 상품 프로모션 연동
- 매장별 디스플레이 타겟팅

---

## Related Documents

- [Content Data Model](./signage-content.md)
- [Playback System](./signage-playback.md)
- [Cosmetics Storefront](../cosmetics/cosmetics-storefront.md)

---

*Phase 12-3에서 생성*
