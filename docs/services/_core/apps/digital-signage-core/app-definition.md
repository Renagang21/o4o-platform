# digital-signage-core

> **Status**: Active | **Version**: 0.1.0 | **Package**: @o4o-apps/digital-signage-core

## 역할

디지털 사이니지 Core 엔진. 미디어, 디스플레이, 스케줄, 액션 관리.

| 책임 | 경계 |
|------|------|
| Media Source (URL/file) | 업종별 콘텐츠 → Extension |
| Media List, Display, Display Slot | 렌더링 소비처 없음 (digital-signage-agent 은퇴) |
| Schedule, Action Execution | |

## 외부 노출

**Types**: MediaSource, MediaList, Display, Schedule, ActionExecution

## API Routes

- `/api/v1/signage/media`
- `/api/v1/signage/displays`
- `/api/v1/signage/schedules`

## Dependencies

- platform-core, cms-core

## 비고

- Extension Interface: Phase 3에서 구현 예정
- digital-signage-agent 는 은퇴했다 (WO-O4O-DIGITAL-SIGNAGE-AGENT-DEAD-RUNTIME-RETIREMENT-V1 · main `57df27e5e`) — 연동 대상 없음
