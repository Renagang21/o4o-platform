# Digital Signage Playback System

> 최종 업데이트: 2025-12-10
> 디바이스 관리, 스케줄링, 재생 시스템

---

## 1. Device Management

### Device Entity

```typescript
interface SignageDevice {
  id: string;
  name: string;
  token: string;            // 인증 토큰 (unique)
  location?: string;        // "1층 로비", "매장 입구"
  resolution?: string;      // "1920x1080"
  orientation?: string;     // landscape | portrait
  lastHeartbeat?: Date;
  active: boolean;
  metadata?: Record<string, any>;
}
```

### 디바이스 등록 플로우

```
1. Admin에서 디바이스 생성 (token 자동 생성)
2. 디바이스에서 token으로 인증
3. /signage/player/:deviceId 접속
4. Heartbeat로 상태 모니터링
```

### API Endpoints

| Method | Path | 설명 |
|--------|------|------|
| GET | /signage/devices | 디바이스 목록 |
| POST | /signage/devices | 디바이스 등록 |
| GET | /signage/devices/:id | 디바이스 상세 |
| PUT | /signage/devices/:id | 디바이스 수정 |
| POST | /signage/devices/:id/heartbeat | Heartbeat 전송 |

---

## 2. Schedule System

### Schedule Entity

```typescript
interface SignageSchedule {
  id: string;
  deviceId: string;
  playlistId: string;
  startTime: string;        // "09:00"
  endTime: string;          // "18:00"
  daysOfWeek?: number[];    // [1,2,3,4,5] = 월~금
  startDate?: Date;
  endDate?: Date;
  priority: number;         // 높을수록 우선
  active: boolean;
}
```

### 스케줄 우선순위

```
priority: 100  ← 특별 이벤트 (최우선)
priority: 50   ← 캠페인 기간
priority: 10   ← 기본 스케줄
priority: 0    ← 폴백 (Default)
```

### 시간대별 스케줄 예시

```json
[
  {
    "playlistId": "morning-promo",
    "startTime": "09:00",
    "endTime": "12:00",
    "daysOfWeek": [1,2,3,4,5],
    "priority": 10
  },
  {
    "playlistId": "lunch-special",
    "startTime": "12:00",
    "endTime": "14:00",
    "daysOfWeek": [1,2,3,4,5],
    "priority": 10
  },
  {
    "playlistId": "default",
    "startTime": "00:00",
    "endTime": "23:59",
    "priority": 0
  }
]
```

---

## 3. Playback System

### Player URL

```
https://example.com/signage/player/{deviceId}?token={deviceToken}
```

### Playback Flow

```
1. 디바이스가 Player URL 접속
2. Token 검증
3. 현재 시간 기준 활성 스케줄 조회
4. 해당 플레이리스트 로드
5. SlideApp으로 자동 재생
6. 주기적으로 스케줄 갱신 확인
```

### Configuration

```typescript
config: {
  enableAutoPlay: true,       // 자동 재생
  defaultTransition: 'fade',  // 전환 효과
  defaultDuration: 10,        // 기본 슬라이드 시간(초)
  scheduleCheckInterval: 60,  // 스케줄 확인 주기(초)
}
```

---

## 4. Playback Logging

### Log Table

```sql
CREATE TABLE signage_playback_logs (
  id UUID PRIMARY KEY,
  device_id UUID,
  playlist_id UUID,
  slide_id UUID,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration INTEGER,
  metadata JSONB
);
```

### 분석 지표

| 지표 | 설명 |
|------|------|
| 슬라이드 노출 수 | 각 슬라이드별 재생 횟수 |
| 평균 재생 시간 | 슬라이드당 평균 노출 시간 |
| 디바이스 가동률 | 디바이스별 활성 시간 비율 |
| 스케줄 이행률 | 스케줄대로 재생된 비율 |

---

## 5. Admin Dashboard Views

### 디바이스 모니터링

```
┌────────────────────────────────────────────────┐
│  디바이스 현황                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ 1층 로비  │ 🟢 Online │ Morning Promo    │  │
│  │ 매장 입구 │ 🟢 Online │ Lunch Special    │  │
│  │ 2층 휴게실│ 🔴 Offline│ Last: 2h ago     │  │
│  └──────────────────────────────────────────┘  │
├────────────────────────────────────────────────┤
│  스케줄 캘린더                                  │
│  [시간대별 스케줄 시각화]                        │
└────────────────────────────────────────────────┘
```

### View Components

| View | 용도 |
|------|------|
| DeviceListView | 디바이스 목록/상태 |
| ScheduleCalendarView | 스케줄 캘린더 |
| PlaybackAnalyticsView | 재생 분석 대시보드 |

---

## 6. Offline Support

### 오프라인 캐싱

```typescript
// Service Worker로 콘텐츠 캐싱
- 현재 플레이리스트의 모든 슬라이드
- 이미지/비디오 미디어 파일
- 폴백 플레이리스트 (네트워크 장애 시)
```

### Heartbeat 실패 시

1. 마지막 로드된 플레이리스트 계속 재생
2. 로컬 캐시된 콘텐츠 사용
3. 재연결 시 최신 스케줄로 갱신

---

## Related Documents

- [Signage Overview](./signage-overview.md)
- [Content Data Model](./signage-content.md)
- [Cosmetics Campaign](../cosmetics/cosmetics-overview.md)

---

*Phase 12-3에서 생성*
