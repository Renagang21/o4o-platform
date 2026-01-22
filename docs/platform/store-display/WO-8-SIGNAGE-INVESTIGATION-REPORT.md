# WO-8 조사 요약: Signage ↔ CornerDisplay 연결 가능성

## 1. Signage 코드의 현재 책임

### 핵심 구조

```
digital-signage-core (Core)
├── Backend: RenderingEngine (재생 조율)
├── Frontend: PlaybackEngine (Web Player)
└── Entities: Display, DisplaySlot, Playlist, Schedule, MediaSource

signage-player-web (독립 서비스)
└── 브라우저 기반 display client

dropshipping-cosmetics (Extension)
└── SignageContentMapperService (실시간 콘텐츠 자동 생성)
```

### Signage의 책임 범위

| 책임 | 설명 |
|------|------|
| **물리 기기 관리** | Display 엔티티로 deviceCode, heartbeat, 온/오프라인 추적 |
| **화면 영역 분할** | DisplaySlot으로 하나의 화면을 여러 zone으로 분리 |
| **콘텐츠 시퀀스** | Playlist + PlaylistItem으로 순차 재생 |
| **시간 기반 스케줄** | Schedule로 "언제 무엇을" 제어 |
| **자동 재생** | RenderingEngine이 duration 기반 자동 전환 |

---

## 2. CornerDisplay와 겹치는 영역 / 겹치지 않는 영역

### 겹치는 영역 (주의 필요)

| 영역 | Signage | CornerDisplay | 충돌 여부 |
|------|---------|---------------|-----------|
| **물리 기기 식별** | Display.deviceCode | CornerDisplayDevice.deviceId | 🟡 개념 유사 |
| **화면 구성 단위** | DisplaySlot (zone) | CornerDisplay (corner) | 🟡 1:1 대응 가능 |
| **콘텐츠 소스** | MediaSource (URL/파일) | Listings API (제품) | 🟢 다름 |

### 겹치지 않는 영역 (안전)

| 영역 | Signage 담당 | CornerDisplay 담당 |
|------|-------------|-------------------|
| **콘텐츠 타입** | 비디오, 이미지, HTML | 제품 그리드/리스트 |
| **전환 방식** | 시간 기반 자동 슬라이드 | 정적 표시 (또는 수동 새로고침) |
| **상호작용** | 완전 차단 (zero-ui) | AI 버튼, 터치 가능 |
| **데이터 소스** | 관리자 업로드 미디어 | Phase 1 Listings API |

---

## 3. 연결 가능한 최소 지점

### 방안 A: DisplaySlot에 CornerDisplay 삽입 (권장)

```
기존 Signage Template
├── Zone 1: Header (로고, 시계)
├── Zone 2: Main (기존 Playlist - 비디오/이미지)
├── Zone 3: Sidebar (✅ CornerDisplay 삽입)
└── Zone 4: Footer (틱커, 날씨)
```

**구현 방식:**
1. SignageContentBlock에 `blockType: 'corner-display'` 추가
2. settings에 `{ cornerId: 'xxx', deviceType: 'signage' }` 저장
3. Web Player가 해당 블록 렌더링 시 CornerDisplayHost 호출

**장점:**
- 기존 Signage 구조 변경 최소화
- CornerDisplay는 "하나의 콘텐츠 블록"으로 동작
- Playlist의 다른 콘텐츠와 공존

### 방안 B: CornerDisplay 전용 Signage View (대안)

```
CornerDisplay (deviceType: 'signage')
├── 전체 화면 = 제품 그리드
├── 자동 새로고침 (30초/1분 간격)
└── Signage 시스템과 독립
```

**장점:**
- 완전한 분리로 충돌 없음
- Phase 2 구조 그대로 유지

**단점:**
- Signage의 스케줄/모니터링 기능 사용 불가
- 별도 관리 필요

---

## 4. 구조 충돌 포인트

### 충돌 1: 기기 식별 이중화

| 시스템 | 식별자 |
|--------|--------|
| Signage | Display.deviceCode |
| CornerDisplay | CornerDisplayDevice.deviceId |

**해결:** 동일 값 사용 규칙 정의
```
deviceId = deviceCode = 'signage_store_001'
```

### 충돌 2: 화면 제어 권한

- Signage: RenderingEngine이 화면 전체 제어
- CornerDisplay: 독립적 렌더링 원함

**해결:** Zone 단위 분리 (방안 A 채택 시)
- CornerDisplay Zone은 Signage가 "렌더링만 위임"
- ActionExecution에서 해당 Zone 건드리지 않음

### 충돌 3: 데이터 Refresh 주기

- Signage: duration 기반 (item마다 고정 시간)
- CornerDisplay: 실시간 또는 수동 새로고침

**해결:** CornerDisplay Zone은 자체 refresh 로직 사용
```typescript
// SignageContentBlock (corner-display)
settings: {
  refreshIntervalMs: 60000,  // 1분마다 Listings API 재조회
  cornerId: 'premium_zone'
}
```

---

## 5. "이 상태에서 바로 연결 가능한가?" 판단

### 결론: **조건부 가능 (방안 A 권장)**

| 조건 | 충족 여부 |
|------|----------|
| Signage가 상호작용 없는 화면인가 | ✅ zero-ui 모드 존재 |
| Zone 단위 분리 가능한가 | ✅ DisplaySlot/TemplateZone 구조 |
| 외부 데이터 주입 지점 있는가 | ✅ SignageContentBlock 확장 가능 |
| Phase 1 Listings API 호출 가능한가 | ✅ fetch 기반 (Web Player에서) |
| Extension OFF 시 영향 없는가 | ✅ Signage Core는 독립적 |

### 권장 접근

1. **SignageContentBlock 확장** (최소 변경)
   - `blockType: 'corner-display'` 추가
   - Web Player에서 CornerDisplayHost 컴포넌트 렌더링

2. **Signage Template에 Zone 추가**
   - 운영자가 "제품 표시 영역"을 Zone으로 지정
   - 해당 Zone에 corner-display 블록 배치

3. **자동 새로고침 구현**
   - CornerDisplay Zone만 주기적 API 재호출
   - 다른 Zone (비디오 등)은 기존 방식 유지

---

## 6. 다음 단계 권장

### WO-8-B: Signage ↔ CornerDisplay 연결 구현

**범위:**
1. SignageContentBlock에 `corner-display` 타입 추가
2. signage-player-web에 CornerDisplayHost 연동
3. Admin Dashboard에 Zone 설정 UI 추가

**예상 변경 파일:**
- `packages/digital-signage-core/src/backend/entities/signage-content-block.entity.ts`
- `services/signage-player-web/src/components/blocks/CornerDisplayBlock.tsx` (신규)
- `apps/admin-dashboard/src/pages/digital-signage/v2/TemplateBuilder.tsx`

**완료 기준:**
- Signage 화면의 특정 Zone에 CornerDisplay(제품 그리드) 표시
- 제품 목록이 주기적으로 새로고침
- 기존 Signage 기능 (비디오, 스케줄) 정상 동작

---

## 7. 요약

| 항목 | 결론 |
|------|------|
| Signage 현재 책임 | 물리 기기 + 콘텐츠 시퀀스 + 시간 스케줄 + 자동 재생 |
| CornerDisplay와 겹치는 영역 | 기기 식별, 화면 단위 (해결 가능) |
| 겹치지 않는 영역 | 콘텐츠 타입, 데이터 소스, 상호작용 방식 |
| 연결 최소 지점 | SignageContentBlock 확장 (blockType: 'corner-display') |
| 구조 충돌 | 3개 (모두 해결 가능) |
| 바로 연결 가능한가 | ✅ 조건부 가능 (방안 A 권장) |

---

*WO-8 조사 완료: 2026-01-22*
