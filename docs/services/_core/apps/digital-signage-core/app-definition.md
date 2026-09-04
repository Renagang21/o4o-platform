# digital-signage-core

> **Status**: Active | **Version**: 0.1.0 | **Package**: @o4o-apps/digital-signage-core

## 역할

디지털 사이니지 **entity 패키지**. signage 미디어 · 플레이리스트 · 스케줄 · 템플릿의
TypeORM entity 정의만 제공한다. **backend runtime(route · controller · service) 은 제공하지 않는다.**

| 책임 | 경계 |
|------|------|
| Signage Media / Playlist / Playlist Item | 업종별 콘텐츠 → Extension |
| Signage Schedule | |
| Signage Template / Template Zone / Layout Preset / Content Block | |
| Signage AI Generation Log | |

## 외부 노출

**Entities (9)**: SignagePlaylist, SignagePlaylistItem, SignageMedia, SignageSchedule, SignageTemplate, SignageTemplateZone, SignageLayoutPreset, SignageContentBlock, SignageAiGenerationLog

**Entity 배열**: `SignageCoreEntities` (api-server `database/entities.ts` 가 등록하는 유일한 배열)

이 패키지의 export 는 위 entity 와 배열이 전부다.

## API Routes

**이 패키지는 API route 를 제공하지 않는다.**

signage HTTP runtime 은 api-server 가 소유한다 — `apps/api-server/src/routes/signage/`,
mount 는 `/api/signage/:serviceKey` · `/api/signage/:serviceKey/public`
(`bootstrap/register-routes.ts`).

> 과거 서술이던 `/api/v1/signage/media` · `/api/v1/signage/displays` · `/api/v1/signage/schedules`
> 는 현재 존재하지 않는다.

## Dependencies

- `typeorm` (peer: `reflect-metadata`)

## 비고

- Extension Interface: Phase 3에서 구현 예정
- Phase-6 legacy entity 7종(MediaSource / MediaList / MediaListItem / Display / DisplaySlot / Schedule / ActionExecution)은 은퇴했다 (WO-O4O-SIGNAGE-PHASE6-ENTITY-AND-PHYSICAL-TABLE-DISPOSITION-V1) — 소비처 0 · 생성 migration 0 · production 물리 테이블 부재
- digital-signage-agent 는 은퇴했다 (WO-O4O-DIGITAL-SIGNAGE-AGENT-DEAD-RUNTIME-RETIREMENT-V1 · main `57df27e5e`) — 연동 대상 없음
- Channel runtime(`/api/v1/channels*` · ChannelPlayer · heartbeat · playback-log)도 은퇴 상태다 — 되살리지 않는다
