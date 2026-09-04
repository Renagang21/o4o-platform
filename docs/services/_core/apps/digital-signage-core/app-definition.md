# digital-signage-core

> **Status**: Active | **Version**: 0.1.0 | **Package**: @o4o-apps/digital-signage-core

## 역할

디지털 사이니지 Core 엔진. 미디어, 디스플레이, 스케줄, 액션 관리.

| 책임 | 경계 |
|------|------|
| Signage Media / Playlist / Playlist Item | 업종별 콘텐츠 → Extension |
| Signage Schedule | |
| Signage Template / Template Zone / Layout Preset / Content Block | |
| Signage AI Generation Log | |

## 외부 노출

**Entities (9)**: SignagePlaylist, SignagePlaylistItem, SignageMedia, SignageSchedule, SignageTemplate, SignageTemplateZone, SignageLayoutPreset, SignageContentBlock, SignageAiGenerationLog

**Entity 배열**: `SignageCoreEntities` (api-server `database/entities.ts` 가 등록하는 유일한 배열)

## API Routes

- `/api/v1/signage/media`
- `/api/v1/signage/displays`
- `/api/v1/signage/schedules`

## Dependencies

- platform-core, cms-core

## 비고

- Extension Interface: Phase 3에서 구현 예정
- Phase-6 legacy entity 7종(MediaSource / MediaList / MediaListItem / Display / DisplaySlot / Schedule / ActionExecution)은 은퇴했다 (WO-O4O-SIGNAGE-PHASE6-ENTITY-AND-PHYSICAL-TABLE-DISPOSITION-V1) — 소비처 0 · 생성 migration 0 · production 물리 테이블 부재
- digital-signage-agent 는 은퇴했다 (WO-O4O-DIGITAL-SIGNAGE-AGENT-DEAD-RUNTIME-RETIREMENT-V1 · main `57df27e5e`) — 연동 대상 없음
