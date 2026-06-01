# IR-O4O-STORE-SIGNAGE-MEDIA-DETAIL-EDIT-FLOW-AUDIT-V1

**조사 유형:** Investigation Report (IR)  
**조사 대상:** Store Signage "내 동영상" media detail/edit flow  
**조사 날짜:** 2026-05-13  
**상태:** COMPLETE  

---

## 배경 및 목적

KPA Store Signage 페이지(`/store/signage`)의 "내 동영상" 테이블에서 항목 제목을 클릭해도 아무 반응이 없다는 문제가 보고되었다. 본 IR은 이 현상의 구조적 원인, 편집 API 존재 여부, snapshot 독립성, playlist cascade 영향, 삭제 흐름을 전방위 조사하고 canonical UX 방향을 제시한다.

---

## A. 현재 Store Media Detail/Edit 구조 요약

### 1. 프론트엔드 — 내 동영상 테이블 (`StoreSignagePage.tsx`)

| 위치 | 구현 상태 |
|------|----------|
| 비디오 테이블 `onRow` | `className` 설정만, **onClick 없음** → 행 클릭 죽어있음 |
| 제목 칼럼 | 문자열 렌더링만, 클릭 핸들러 없음 |
| 편집 버튼 | **존재하지 않음** |
| 상세보기 버튼 | **존재하지 않음** |
| 액션 칼럼 (direct) | 삭제 버튼만 |
| 액션 칼럼 (snapshot) | "플레이리스트에 추가" 네비게이션 버튼만 |
| 상태 칼럼 (snapshot) | toggle 버튼 (`handleToggleStatus`) |
| 상태 칼럼 (direct) | 읽기 전용 배지 |

**결론: 현재 내 동영상 테이블에는 상세보기/편집으로 진입하는 진입점이 전혀 없다.**

### 2. 프론트엔드 API 클라이언트 (`signageMedia.ts`)

```typescript
// 존재하는 함수 3개
fetchSignageMedia(serviceKey, params)
createSignageMedia(serviceKey, dto)
deleteSignageMedia(serviceKey, mediaId)

// 존재하지 않는 함수
// updateSignageMedia() — 미구현
// getSignageMediaDetail() — 미구현
```

`updateSignageMedia()` 함수가 존재하지 않으므로 프론트엔드에서 편집 저장 경로가 없다.

### 3. 백엔드 — 라우트 및 컨트롤러

```
GET    /api/signage/:serviceKey/media          (getMediaList)
GET    /api/signage/:serviceKey/media/:id      (getMedia)
POST   /api/signage/:serviceKey/media          (createMedia, requireSignageStore)
PATCH  /api/signage/:serviceKey/media/:id      (updateMedia, requireSignageStore)  ← 구현됨
DELETE /api/signage/:serviceKey/media/:id      (deleteMedia, soft)
DELETE /api/signage/:serviceKey/media/:id/hard (hardDeleteMedia)
```

백엔드에는 `PATCH /api/signage/:serviceKey/media/:id` 가 완전히 구현되어 있다.

---

## B. Store Owner 수정 가능 범위 판정

### 수정 가능 필드 (`UpdateMediaDto`)

| 필드 | 수정 가능 | 비고 |
|------|----------|------|
| `name` | ✅ | 미디어 제목 |
| `description` | ✅ | 설명 |
| `thumbnailUrl` | ✅ | 썸네일 교체 가능 |
| `duration` | ✅ | 재생 시간 |
| `content` | ✅ | 콘텐츠 메타데이터 |
| `tags` | ✅ | 태그 배열 |
| `status` | ✅ | active/inactive |
| `sourceUrl` | ❌ | **UpdateMediaDto 미포함 — 비디오 URL 불변** |

**sourceUrl은 생성 시 결정되며 이후 변경 불가.** 이는 의도된 설계로, 영상 URL 교체는 신규 미디어 등록으로 처리해야 한다.

### 권한 가드

`requireSignageStore` 미들웨어를 통해 `signage:store` 스코프 소유자만 수정 가능. 타 매장 미디어 수정 차단.

**판정: 영상 URL 제외 모든 메타데이터 수정 가능 (구조적으로 완성됨). 단, 프론트엔드 진입점 없음.**

---

## C. Snapshot 독립성 판정

### 스냅샷 저장 구조

```
o4o_asset_snapshots
  id             (PK)
  source_asset_id (UUID, no FK constraint)  ← signage_media.id를 값으로 저장
  asset_type     'signage'
  content_json   { title, mediaType, sourceUrl, thumbnailUrl, ... }
  lifecycle_status
```

`source_asset_id`는 **일반 UUID 컬럼** — DB 레벨 FK 제약 없음.

### 독립성 검증

| 항목 | 결과 |
|------|------|
| 원본 미디어 수정 → 스냅샷 자동 반영 | ❌ **없음** — 스냅샷은 복사 시점 데이터 고정 |
| 스냅샷이 미디어 변경을 감지하는 이벤트 | ❌ **없음** |
| `lifecycle_status` 동기화 로직 | 별도 동기화 필요 (현재 미구현) |

**판정: 스냅샷은 원본 미디어와 완전히 독립. 원본 편집이 스냅샷에 소급 적용되지 않는다.**  
이는 의도된 설계 — Asset Snapshot 패턴의 핵심 원칙 (capture-at-copy-time).

---

## D. Playlist 영향 분석

### 두 종류의 Playlist Item 구조

O4O Platform에는 signage 관련 playlist item이 두 종류 존재한다:

#### 1. `signage_playlist_items` (signage 서비스 플레이리스트)
- `mediaId` → `signage_media.id` FK (직접 참조)
- `onDelete: CASCADE` 설정 → 미디어 삭제 시 자동 삭제

#### 2. `store_playlist_items` (매장 플레이리스트)

```typescript
// store-playlist-item.entity.ts
@Column({ type: 'uuid' })
snapshot_id: string;  // o4o_asset_snapshots.id 참조 (FK 제약 없음)

@ManyToOne('StorePlaylist', 'items', { onDelete: 'CASCADE' })
@JoinColumn({ name: 'playlist_id' })
playlist?: unknown;
```

- `snapshot_id`는 `o4o_asset_snapshots.id`를 UUID 값으로 저장 (FK 제약 없음)
- `playlist_id`에만 CASCADE 설정 (플레이리스트 삭제 시 아이템 삭제)
- **스냅샷 삭제 시 store_playlist_items는 cascade 없음 → 고아 row 발생 가능**

### Hard Delete 시 cascade 흐름

```
hardDeleteMedia(id) 호출
  │
  ├─ 1. Manual: DELETE FROM o4o_asset_snapshots WHERE source_asset_id = id
  │     → 스냅샷 삭제 (FK 없으므로 수동)
  │     → store_playlist_items.snapshot_id 참조 무효화 (고아 발생) ⚠️
  │
  └─ 2. Physical: DELETE FROM signage_media WHERE id = id
        → signage_playlist_items: AUTO CASCADE (FK onDelete:CASCADE) ✅
        → signage_media_tags:     AUTO CASCADE (FK onDelete:CASCADE) ✅
        → signage_analytics:      고아 허용 (역사 데이터 보존 의도)
```

### 위험 항목

| 시나리오 | 결과 |
|---------|------|
| soft delete 미디어 | 스냅샷/playlist 영향 없음 (안전) |
| hard delete 미디어 | `store_playlist_items` 고아 발생 가능 ⚠️ |
| 미디어 메타데이터 수정 | 기존 스냅샷 불변 (독립), playlist 영향 없음 |

**판정: soft delete는 안전. hard delete 시 `store_playlist_items` 고아 row 발생 위험 존재 — WO 단계에서 manual cleanup 추가 또는 FK 제약 검토 필요.**

---

## E. 권장 UX 방향

### 현재 Gap 요약

| Gap | 설명 | 심각도 |
|-----|------|--------|
| G1 | 내 동영상 행 클릭 → 아무 반응 없음 | 높음 |
| G2 | `updateSignageMedia()` 프론트엔드 미구현 | 높음 |
| G3 | 상세보기/편집 UI 완전 없음 | 높음 |
| G4 | hard delete → store_playlist_items 고아 위험 | 중간 |
| G5 | 스냅샷-원본 drift 감지 없음 | 낮음 (의도된 설계) |

### 권장 UX 구현 방향

#### 1. 미디어 상세/편집 슬라이드오버 패턴

내 동영상 테이블 행 클릭 시 오른쪽에서 슬라이드오버(Drawer) 패널 진입:

```
[내 동영상 테이블]
  행 클릭 → MediaEditDrawer 열림
    ├─ 동영상 프리뷰 (읽기 전용, sourceUrl 기반)
    ├─ 제목 수정 (name)
    ├─ 설명 수정 (description)
    ├─ 썸네일 교체 (thumbnailUrl)
    ├─ 태그 편집 (tags)
    ├─ 상태 toggle (status)
    └─ 저장 → PATCH /api/signage/:serviceKey/media/:id
```

#### 2. 프론트엔드 구현 최소 범위

```typescript
// signageMedia.ts 에 추가 필요
updateSignageMedia(serviceKey: string, mediaId: string, dto: UpdateMediaDto): Promise<Media>

// StoreSignagePage.tsx 에 추가 필요
// - 비디오 테이블 onRow.onClick = () => openEditDrawer(record)
// - MediaEditDrawer 컴포넌트 (신규 또는 모달)
// - handleUpdateMedia() 저장 핸들러
```

#### 3. sourceUrl 변경 정책 UX 안내

편집 폼에서 `sourceUrl`은 읽기 전용 표시 + 안내 문구:
> "동영상 URL은 변경할 수 없습니다. 새 영상 등록은 '새 동영상 추가'를 이용하세요."

#### 4. hard delete 개선 (WO 범위)

`hardDeleteMedia` 실행 전 `store_playlist_items` 정리 추가:

```sql
-- 삭제 전 cleanup (o4o_asset_snapshots 삭제 후)
DELETE FROM store_playlist_items WHERE snapshot_id IN (
  SELECT id FROM o4o_asset_snapshots WHERE source_asset_id = $1
);
```

---

## 판정 요약

| 항목 | 판정 |
|------|------|
| 내 동영상 행 클릭 무반응 원인 | `onRow` onClick 미구현 (의도되지 않은 누락) |
| 편집 API 존재 여부 | 백엔드 완비 (`PATCH /api/signage/:serviceKey/media/:id`) |
| 프론트 편집 진입점 | 없음 (`updateSignageMedia` 미구현) |
| sourceUrl 수정 가능 여부 | 불가 (UpdateMediaDto 제외, 의도된 설계) |
| 스냅샷 독립성 | 완전 독립 (원본 편집이 스냅샷에 소급 미적용) |
| Playlist cascade 안전성 | soft delete 안전 / hard delete 시 store_playlist_items 고아 위험 |
| 권장 다음 WO | `WO-O4O-STORE-SIGNAGE-MEDIA-EDIT-UX-V1` — 편집 슬라이드오버 + API 클라이언트 추가 |

---

## 관련 파일 목록

| 파일 | 역할 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/StoreSignagePage.tsx` | UI 메인 (행 클릭 dead 확인) |
| `services/web-kpa-society/src/api/signageMedia.ts` | API 클라이언트 (updateSignageMedia 없음) |
| `apps/api-server/src/routes/signage/controllers/media.controller.ts` | 백엔드 컨트롤러 |
| `apps/api-server/src/routes/signage/services/media.service.ts` | 서비스 레이어 |
| `apps/api-server/src/routes/signage/repositories/media.repository.ts` | hard delete cascade 로직 |
| `apps/api-server/src/routes/signage/dto/index.ts` | UpdateMediaDto (sourceUrl 제외) |
| `apps/api-server/src/routes/signage/signage.routes.ts` | PATCH 라우트 등록 확인 |
| `apps/api-server/src/routes/kpa/entities/store-playlist-item.entity.ts` | store_playlist_items (snapshot_id, FK 없음) |
