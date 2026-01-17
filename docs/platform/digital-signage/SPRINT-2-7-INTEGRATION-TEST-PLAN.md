# Sprint 2-7 Integration Test Plan

> Digital Signage Phase 2 - Final Integration Sprint
> Version: 1.0
> Date: 2026-01-17
> Status: Active

---

## 1. 개요

Sprint 2-7은 Digital Signage Phase 2의 **최종 통합 테스트 스프린트**입니다.
모든 기능을 필드 시뮬레이션 환경에서 검증하고, 버그를 수정합니다.

**Feature Freeze 적용**: 신규 기능 추가 금지, 버그 수정만 허용

---

## 2. 테스트 범위

### 2.1 Core API 테스트

| API | 엔드포인트 | 테스트 항목 |
|-----|----------|------------|
| Playlist CRUD | `/api/signage/:serviceKey/playlists` | 생성, 조회, 수정, 삭제, 페이지네이션 |
| Media CRUD | `/api/signage/:serviceKey/media` | 생성, 조회, 수정, 삭제, 타입별 필터 |
| Schedule CRUD | `/api/signage/:serviceKey/schedules` | 생성, 조회, 수정, 삭제, 시간 충돌 검사 |
| Template CRUD | `/api/signage/:serviceKey/templates` | 생성, 조회, 수정, 삭제 |
| Content Block | `/api/signage/:serviceKey/content-blocks` | CRUD, 타입별 테스트 |
| Layout Preset | `/api/signage/:serviceKey/layout-presets` | CRUD, 시스템 프리셋 |

### 2.2 Global Content API 테스트 (Sprint 2-6)

| API | 엔드포인트 | 테스트 항목 |
|-----|----------|------------|
| Global Playlists | `/api/signage/:serviceKey/global/playlists` | HQ/Supplier/Community 조회 |
| Global Media | `/api/signage/:serviceKey/global/media` | 소스별 필터, 검색 |
| HQ Playlist 생성 | `/api/signage/:serviceKey/hq/playlists` | source: 'hq', scope: 'global' 확인 |
| HQ Media 생성 | `/api/signage/:serviceKey/hq/media` | 글로벌 미디어 생성 |
| Clone Playlist | `/api/signage/:serviceKey/playlists/:id/clone` | 아이템 복제, 미디어 복제 옵션 |
| Clone Media | `/api/signage/:serviceKey/media/:id/clone` | parentMediaId 연결 확인 |

### 2.3 Player API 테스트

| API | 엔드포인트 | 테스트 항목 |
|-----|----------|------------|
| Active Content | `/api/signage/:serviceKey/player/active-content` | 현재 재생 콘텐츠 반환 |
| Heartbeat | `/api/signage/:serviceKey/player/heartbeat` | 디스플레이 상태 업데이트 |
| Display 등록 | `/api/signage/:serviceKey/displays` | 신규 디스플레이 등록 |

---

## 3. 필드 시뮬레이션 시나리오

### 3.1 매장 오픈 시나리오

```
시나리오: 신규 매장이 사이니지 시스템에 온보딩
1. 디스플레이 등록 (POST /displays)
2. 디스플레이 슬롯 설정 (POST /display-slots)
3. 글로벌 콘텐츠 브라우징 (GET /global/playlists)
4. HQ 플레이리스트 클론 (POST /playlists/:id/clone)
5. 스케줄 설정 (POST /schedules)
6. Player에서 active-content 수신 확인
```

### 3.2 본사 콘텐츠 배포 시나리오

```
시나리오: HQ 운영자가 새 프로모션 콘텐츠 배포
1. HQ 미디어 생성 (POST /hq/media)
2. HQ 플레이리스트 생성 (POST /hq/playlists)
3. 플레이리스트에 아이템 추가 (POST /playlists/:id/items)
4. 매장에서 글로벌 콘텐츠 확인 (GET /global/playlists)
5. 매장에서 클론 실행 (POST /playlists/:id/clone)
6. 클론된 플레이리스트에 forced 아이템 확인
```

### 3.3 공급자 콘텐츠 시나리오

```
시나리오: Supplier가 브랜드 홍보 콘텐츠 제공
1. Supplier 미디어 업로드 (source: 'supplier')
2. Supplier 플레이리스트 생성
3. 매장에서 Supplier 탭에서 콘텐츠 확인
4. 클론 후 매장 자체 수정 가능 확인
```

### 3.4 오프라인 복구 시나리오

```
시나리오: 네트워크 끊김 후 복구
1. Player가 마지막 캐시된 콘텐츠 재생 (캐시 확인)
2. 네트워크 복구 시 heartbeat 재개
3. active-content 갱신 확인
4. 신규 콘텐츠 동기화 확인
```

---

## 4. UI 통합 테스트

### 4.1 Admin Dashboard V2 페이지

| 페이지 | 경로 | 테스트 항목 |
|--------|------|------------|
| Monitoring Dashboard | `/v2/monitoring` | 디스플레이 상태 표시, 실시간 업데이트 |
| Channel List | `/v2/channels` | 채널 목록, 필터, 검색 |
| Channel Editor | `/v2/channels/:id` | 채널 편집, 저장 |
| Playlist List | `/v2/playlists` | 플레이리스트 목록 |
| Playlist Editor | `/v2/playlists/:id` | 드래그앤드롭 아이템 편집 |
| Schedule Calendar | `/v2/schedules` | 캘린더 뷰, 스케줄 생성/수정 |
| Media Library | `/v2/media` | 미디어 업로드, 필터, 검색 |
| Template List | `/v2/templates` | 템플릿 목록 |
| Template Builder | `/v2/templates/:id` | 템플릿 편집기 |
| Content Block Library | `/v2/content-blocks` | 콘텐츠 블록 관리 |
| Layout Preset List | `/v2/layout-presets` | 레이아웃 프리셋 관리 |

### 4.2 Sprint 2-6 신규 페이지

| 페이지 | 경로 | 테스트 항목 |
|--------|------|------------|
| Store Dashboard | `/v2/store` | 3탭 UI (HQ/Community/Supplier) |
| HQ Content Manager | `/v2/hq` | 글로벌 콘텐츠 생성/관리 |

---

## 5. 버그 분류 및 우선순위

### 5.1 Critical (즉시 수정)

- Player 크래시
- 데이터 손실
- 보안 취약점
- API 서버 다운

### 5.2 High (24시간 내 수정)

- 주요 기능 동작 불가
- UI 렌더링 실패
- 인증/권한 오류

### 5.3 Medium (Sprint 내 수정)

- UI/UX 불편
- 성능 저하
- 비핵심 기능 오류

### 5.4 Low (백로그)

- 코스메틱 이슈
- 문서 오류

---

## 6. 테스트 체크리스트

### 6.1 API 테스트

- [ ] Playlist CRUD 전체 동작
- [ ] Media CRUD 전체 동작
- [ ] Schedule CRUD 전체 동작
- [ ] Template CRUD 전체 동작
- [ ] Content Block CRUD 전체 동작
- [ ] Layout Preset CRUD 전체 동작
- [ ] Global Playlists 조회 (source 필터)
- [ ] Global Media 조회 (source/mediaType 필터)
- [ ] HQ Playlist 생성 (scope: global 확인)
- [ ] HQ Media 생성 (scope: global 확인)
- [ ] Clone Playlist (includeItems: true)
- [ ] Clone Playlist (cloneMedia: true)
- [ ] Clone Media (parentMediaId 연결)
- [ ] Player active-content 조회
- [ ] Player heartbeat 업데이트

### 6.2 UI 테스트

- [ ] V2 Monitoring Dashboard 렌더링
- [ ] V2 Channel List/Editor 동작
- [ ] V2 Playlist List/Editor 동작
- [ ] V2 Schedule Calendar 동작
- [ ] V2 Media Library 동작
- [ ] V2 Template List/Builder 동작
- [ ] V2 Content Block Library 동작
- [ ] V2 Layout Preset List 동작
- [ ] Store Dashboard 3탭 전환
- [ ] Store Dashboard 클론 다이얼로그
- [ ] HQ Content Manager 플레이리스트 생성
- [ ] HQ Content Manager 미디어 생성

### 6.3 통합 테스트

- [ ] HQ → Store 콘텐츠 흐름
- [ ] Clone 후 수정 가능 확인
- [ ] Forced 아이템 잠금 확인
- [ ] Player에서 콘텐츠 수신 확인
- [ ] Schedule에 따른 콘텐츠 변경 확인

---

## 7. Sprint 완료 기준 (DoD)

- [ ] 모든 API 테스트 통과
- [ ] 모든 UI 테스트 통과
- [ ] 필드 시뮬레이션 4개 시나리오 통과
- [ ] Critical/High 버그 0개
- [ ] Player 24시간 무중단 테스트 통과
- [ ] 빌드 에러 0개 (Sprint 2-6 관련)

---

## 8. 관련 문서

- [Sprint 2-5 Work Order](../../../docs/_work-orders/WO-DIGITAL-SIGNAGE-PHASE2-ADMIN-V3.md)
- [Sprint 2-6 Work Order](../../../docs/_work-orders/WO-DIGITAL-SIGNAGE-GLOBAL-CONTENT-V2.md)
- [Digital Signage Phase 2 Architecture](./PHASE-2-ARCHITECTURE.md)

---

*Last Updated: 2026-01-17*
