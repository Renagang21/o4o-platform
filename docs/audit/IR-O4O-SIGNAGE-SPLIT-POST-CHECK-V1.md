# IR-O4O-SIGNAGE-SPLIT-POST-CHECK-V1

> **작성일**: 2026-03-22
> **대상 커밋**: `b670d790b` (feature/signage-split)
> **기준 WO**: WO-O4O-SIGNAGE-SPLIT-V1
> **검증 방식**: 코드 정적 분석 (5개 병렬 감사 에이전트)

---

## 전체 판정: SAFE — 즉시 병합 가능

분해 품질 우수. 3개 oversized 파일(총 3,611줄)이 20개 focused 파일(최대 289줄)로 분해됨.
모든 56개 API 라우트 경로·HTTP 메서드·미들웨어 100% 동일 유지.
tsc --noEmit 신규 오류 0건. 기능 변경 없음.

| 등급 | 의미 | 해당 파일 수 |
|------|------|:-----------:|
| **SAFE** | 즉시 병합 가능 | 18 |
| **OBS** | 관찰 사항 (기존 설계 승계, split 결함 아님) | 4 |
| **BLOCK** | 병합 차단 | 0 |

---

## 1. 구조 안전성

### 1.1 파일 수 검증

| 항목 | 계획 | 실제 | 상태 |
|------|:----:|:----:|:----:|
| 신규 Repository | 6 | 6 | PASS |
| 신규 Service | 6+1(formatters) | 6+1 | PASS |
| 신규 Controller | 6+1(helpers) | 6+1 | PASS |
| 수정 파일 | 4 | 4 | PASS |
| 삭제 파일 | 3 | 3 | PASS |
| **총 신규** | **20** | **20** | **PASS** |

### 1.2 파일 크기 검증 (oversized 잔존 없음)

| 파일 | 줄 수 | 300줄 이내 |
|------|:-----:|:----------:|
| repositories/playlist.repository.ts | 182 | PASS |
| repositories/media.repository.ts | 148 | PASS |
| repositories/schedule.repository.ts | 170 | PASS |
| repositories/template.repository.ts | 146 | PASS |
| repositories/content.repository.ts | 202 | PASS |
| repositories/global-content.repository.ts | 147 | PASS |
| services/signage-formatters.ts | 226 | PASS |
| services/playlist.service.ts | 233 | PASS |
| services/media.service.ts | 105 | PASS |
| services/schedule.service.ts | 208 | PASS |
| services/template.service.ts | 196 | PASS |
| services/content.service.ts | 203 | PASS |
| services/global-content.service.ts | 199 | PASS |
| controllers/signage-helpers.ts | 28 | PASS |
| controllers/playlist.controller.ts | 220 | PASS |
| controllers/media.controller.ts | 120 | PASS |
| controllers/schedule.controller.ts | 157 | PASS |
| controllers/template.controller.ts | 201 | PASS |
| controllers/content.controller.ts | 209 | PASS |
| controllers/global-content.controller.ts | 289 | PASS |

**최대 파일**: global-content.controller.ts (289줄) — 13 handler, 4개 source(global/hq/community/statusTransition) 관리로 정당.

### 1.3 원본 파일 삭제 확인

| 원본 파일 | 줄 수 | 상태 |
|-----------|:-----:|:----:|
| signage.repository.ts | 1,041 | DELETED |
| signage.service.ts | 1,338 | DELETED |
| signage.controller.ts | 1,232 | DELETED |

잔존 import 검증: `grep -r "signage.repository\|signage.service\|signage.controller" --include="*.ts"` → 0건 (삭제된 파일 참조 없음)

---

## 2. 라우트 와이어링 검증

### 2.1 라우트 수 검증

| 항목 | Before | After |
|------|:------:|:-----:|
| 총 라우트 등록 | 56 | 56 |
| GET 라우트 | 23 | 23 |
| POST 라우트 | 14 | 14 |
| PATCH 라우트 | 12 | 12 |
| DELETE 라우트 | 7 | 7 |

### 2.2 미들웨어 배분 검증

| 미들웨어 | 사용 횟수 | 상태 |
|----------|:--------:|:----:|
| requireSignageStore | 14 | PASS |
| requireSignageOperator | 14 | PASS |
| requireSignageOperatorOrStore | 6 | PASS |
| allowSignageStoreRead | 14 | PASS |
| requireSignageCommunity | 2 | PASS |
| requireAuth (global) | 1 (router.use) | PASS |
| validateServiceKey (global) | 1 (router.use) | PASS |

### 2.3 Controller 인스턴스화 검증

```
signage.routes.ts:
  const playlistCtrl  = new SignagePlaylistController(dataSource);     ← PASS
  const mediaCtrl     = new SignageMediaController(dataSource);        ← PASS
  const scheduleCtrl  = new SignageScheduleController(dataSource);     ← PASS
  const templateCtrl  = new SignageTemplateController(dataSource);     ← PASS
  const contentCtrl   = new SignageContentController(dataSource);      ← PASS
  const globalCtrl    = new SignageGlobalContentController(dataSource); ← PASS
```

### 2.4 Cross-controller 재사용 (HQ Delete)

| Route | Controller | Method | 상태 |
|-------|-----------|--------|:----:|
| DELETE /hq/playlists/:id | playlistCtrl | deletePlaylist | PASS |
| DELETE /hq/media/:id | mediaCtrl | deleteMedia | PASS |

설계 의도: HQ 삭제는 Store 삭제와 동일 로직(soft delete). 별도 handler 불필요.

---

## 3. 계층별 책임 분리 검증

### 3.1 Repository Layer

| Repository | 엔티티 수 | Methods | 상태 |
|------------|:--------:|:-------:|:----:|
| PlaylistRepository | 2 (Playlist + PlaylistItem) | 14 | PASS |
| MediaRepository | 1 (Media) | 6 | PASS |
| ScheduleRepository | 1 (Schedule) | 7 | PASS |
| TemplateRepository | 2 (Template + TemplateZone) | 11 | PASS |
| ContentRepository | 3 (ContentBlock + LayoutPreset + AiGenerationLog) | 12 | OBS-1 |
| GlobalContentRepository | 0 (Playlist/Media 재사용) | 6 | PASS |

### 3.2 Service Layer

| Service | 의존 Repo | Methods | 상태 |
|---------|-----------|:-------:|:----:|
| PlaylistService | PlaylistRepo + MediaRepo | 11 | PASS |
| MediaService | MediaRepo | 6 | PASS |
| ScheduleService | ScheduleRepo + PlaylistRepo | 8 | PASS |
| TemplateService | TemplateRepo | 10 | PASS |
| ContentService | ContentRepo | 11 | PASS |
| GlobalContentService | GlobalContentRepo + PlaylistRepo + MediaRepo | 8 | PASS |

### 3.3 Controller Layer

| Controller | 의존 Service | Handlers | Arrow Function | 상태 |
|------------|-------------|:--------:|:--------------:|:----:|
| PlaylistController | PlaylistService | 11 | YES | PASS |
| MediaController | MediaService | 6 | YES | PASS |
| ScheduleController | ScheduleService | 7 | YES | PASS |
| TemplateController | TemplateService | 10 | YES | PASS |
| ContentController | ContentService | 11 | YES | PASS |
| GlobalContentController | GlobalContentService | 13 | YES | PASS |

---

## 4. 공유 유틸리티 검증

### 4.1 signage-formatters.ts (226줄)

| Formatter | 사용 Service | 상태 |
|-----------|-------------|:----:|
| toPlaylistResponse | Playlist, GlobalContent | PASS |
| toPlaylistDetailResponse | Playlist | PASS |
| toPlaylistItemResponse | Playlist, Schedule | PASS |
| toMediaResponse | Media, GlobalContent | PASS |
| toScheduleResponse | Schedule | PASS |
| toTemplateResponse | Template | PASS |
| toTemplateDetailResponse | Template | PASS |
| toTemplateZoneResponse | Template | PASS |
| toContentBlockResponse | Content | PASS |
| toLayoutPresetResponse | Content | PASS |
| toGlobalPlaylistResponse | GlobalContent | PASS |
| toGlobalMediaResponse | GlobalContent | PASS |

**12/12 사용 확인. 미사용 formatter 0건.**

### 4.2 signage-helpers.ts (28줄)

| Helper | 사용 Controller | 상태 |
|--------|----------------|:----:|
| extractScope | 6/6 controllers | PASS |
| extractUserId | 4/6 controllers (Playlist, GlobalContent, Schedule, Content) | PASS |

**미사용 helper 0건.** extractUserId가 Media/Template controller에서 미사용인 것은 정상 — 해당 도메인은 userId를 필요로 하지 않음.

---

## 5. Cross-domain 의존성 검증

| 의존 관계 | 방식 | 정당성 | 상태 |
|-----------|------|--------|:----:|
| PlaylistService → MediaRepo | Constructor injection | addPlaylistItem 시 media 존재 검증 | PASS |
| ScheduleService → PlaylistRepo | Constructor injection | resolveActiveContent에서 playlist→items 조회 | PASS |
| GlobalContentService → PlaylistRepo | Constructor injection | HQ/Community playlist CRUD | PASS |
| GlobalContentService → MediaRepo | Constructor injection | HQ/Community media CRUD | PASS |

순환 의존 없음. 모든 의존은 단방향.

---

## 6. Index 파일 (Barrel Export) 검증

| Index 파일 | Export 수 | 상태 |
|------------|:--------:|:----:|
| repositories/index.ts | 6 | PASS |
| services/index.ts | 6 | PASS |
| controllers/index.ts | 6 | PASS |

signage-formatters.ts와 signage-helpers.ts는 barrel에 미포함 — 내부 전용 모듈로 정당.

---

## 7. 관찰 사항 (OBS — 병합 차단 아님)

### OBS-1: content.repository.ts — 3개 엔티티 혼합 (202줄)

**현상**: ContentBlock + LayoutPreset + AiGenerationLog 3개 엔티티를 1개 repository에서 관리.

**판정**: **승계 설계**. 원본 signage.repository.ts에서 이미 동일 구조.
3개 엔티티가 "콘텐츠 구성 요소"라는 동일 도메인에 속하며, 202줄로 적정 크기.
추가 분해 시 오히려 과분해(over-decomposition) 위험.

**후속 조치**: 불필요. 현재 구조 유지.

### OBS-2: global-content.repository.ts — 중복 정렬 분기 (lines 50-54)

**현상**:
```typescript
if (sortBy === 'likeCount' || sortBy === 'downloadCount') {
  qb.orderBy(`playlist.${sortBy}`, sortOrder);
} else {
  qb.orderBy(`playlist.${sortBy}`, sortOrder);  // ← if/else 양쪽 동일
}
```

**판정**: **원본 승계**. 원본 signage.repository.ts lines 893-897에 동일 코드 존재.
기능 영향 없음 (분기 양쪽 동일 동작). 의도적 확장점이었을 가능성 있음 (likeCount/downloadCount에 대해 향후 다른 정렬 로직 적용 예정).

**후속 조치**: LOW 우선순위 정비 대상. 병합 차단 사유 아님.

### OBS-3: schedule.service.ts — presignedUploadUrl 도메인 배치

**현상**: `getPresignedUploadUrl()` 메서드가 Schedule 도메인에 위치.
의미적으로는 Media/Upload 도메인이 더 적합.

**판정**: **원본 승계**. 원본 signage.service.ts에서 이미 Schedule 관련 메서드 그룹에 포함.
Route 파일에서 `POST /upload/presigned → scheduleCtrl.getPresignedUploadUrl`로 연결 — 원본과 동일.

**후속 조치**: LOW 우선순위. 독립 Upload 도메인 분리 시 이동 고려. 병합 차단 사유 아님.

### OBS-4: media.service.ts — supplier 빈 배열

**현상**: `getMediaLibrary()` 반환값에 `supplier: []` 하드코딩.

**판정**: **원본 승계**. 원본 signage.service.ts에서 동일. 향후 supplier media 연동 시 구현 예정 placeholder.

**후속 조치**: 불필요. Supplier 연동 WO 시 자연 해소.

---

## 8. Dead Code 검증

| 검증 항목 | 결과 |
|-----------|------|
| 미사용 export | 0건 |
| 미사용 import | 0건 |
| 미사용 formatter | 0건 |
| 미사용 helper | 0건 |
| 미연결 route handler | 0건 |
| 삭제 파일 잔존 참조 | 0건 |

---

## 9. 다음 단계 추천

### 9.1 즉시 병합 가능

본 split의 품질은 우수하며, 기능 변경 0건, API 계약 변경 0건, tsc 오류 0건.
**즉시 main merge/push 권장.**

### 9.2 후속 정비 후보 (별도 WO)

| 우선순위 | 대상 | 설명 |
|:--------:|------|------|
| LOW | OBS-2 중복 정렬 분기 | dead branch 제거 (1줄 수정) |
| LOW | OBS-3 presignedUploadUrl | Upload 독립 분리 시 이동 |
| FUTURE | content.repository | 3→2 분리 검토 (AiGenerationLog 독립 — 현재 불필요) |

### 9.3 다음 oversized 정비 대상

IR-O4O-OVERSIZED-FILE-AUDIT-PHASE2-REBASE-V1 기준 잔여 P0 후보:

| 파일 | 줄 수 | 상태 |
|------|:-----:|------|
| `signage-public.routes.ts` | 289 | 300줄 이내, 정비 불필요 |
| Auth 관련 oversized 파일 | TBD | 별도 감사 필요 |

---

## 부록: tsc 검증 결과

```
$ npx tsc --noEmit
→ 신규 오류 0건 (기존 TS6305 참조 오류만 존재 — split 무관)
```

---

*조사 완료. 병합 판단은 ChatGPT 점검 후 결정.*
