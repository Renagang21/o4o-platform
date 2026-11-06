# KPA Signage Structure — Baseline V1

> **기준일:** 2026-04-17  
> **상태:** Frozen (구조 정비 완료)
> **최종 갱신:** 2026-11-05 — 사용자 승인으로 매장 재생 일정 폐기. [현행 매장 재생 정책](O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1.md#0-1-현재-매장-재생-정책--2026-11-05-사용자-승인)이 매장 시간표 부분을 대체한다. 공통 모델/과거 데이터는 보존한다.
> **관련 WO:** WO-KPA-SIGNAGE-DEAD-CODE-CLEANUP-V1 · WO-KPA-SIGNAGE-UI-RESTRUCTURE-V1 · WO-KPA-SIGNAGE-UI-FINAL-CLEANUP-V1

---

## 1. 3분리 구조 (Canonical)

| 역할 | URL | 대상 |
|------|-----|------|
| **커뮤니티 탐색** | `/signage`, `/intranet/signage/content` | 약사회 회원 — 영상 탐색·공유 |
| **운영자 관리** | `/operator/signage/*` | KPA 운영자 — HQ 미디어·플레이리스트·카테고리 관리 |
| **매장 운영** | `/store/marketing/signage` | 약국 — 콘텐츠 가져오기·재생목록·디스플레이 재생 |

> `/hub/signage` — 매장 진입 전 탐색 전용 (copy-to-store 게이트)

---

## 2. 사용자 흐름

```
탐색 (/hub/signage)
  → 내 매장에 추가 (assetSnapshotApi.copy)
  → 동영상 (/store/marketing/signage/videos)
  → 재생목록 구성·게시 (/store/marketing/signage/playlist)
  → 디스플레이 재생 화면 열기 (/store/marketing/signage/display)
  → 목록 선택·사용자 시작 (/store/marketing/signage/play/:playlistId)
```

---

## 3. 핵심 테이블

| 테이블 | 역할 |
|--------|------|
| `signage_media` | HQ + 커뮤니티 원본 미디어 |
| `signage_playlists` | HQ 원본 플레이리스트 |
| `signage_playlist_items` | 플레이리스트 항목 |
| `signage_schedules` | 공통 entity/과거 데이터 보존. 매장 시간표 기능은 폐기 |
| `signage_templates` | 레이아웃 템플릿 |
| `signage_ai_generation_logs` | AI 생성 이력 |
| `o4o_asset_snapshots` | 매장 복사본 (Hub→Store 전달 경로) |
| `store_playlists` | 매장 플레이리스트 (재생 단위) |

> **삭제됨 (WO-KPA-SIGNAGE-DEAD-CODE-CLEANUP-V1):**  
> `signage_analytics`, `signage_playlist_shares`, `signage_media_tags`

---

## 4. 핵심 API

| 메서드 | 경로 | 역할 |
|--------|------|------|
| GET | `/api/signage/kpa-society/media` | 공개 미디어 목록 (ContentHubPage) |
| GET/POST | `/api/signage/kpa-society/hq/media` | HQ 미디어 CRUD |
| GET/POST | `/api/signage/kpa-society/hq/playlists` | HQ 플레이리스트 CRUD |
| POST | `/api/asset-snapshot/copy` | Hub → 매장 복사 (단일 경로) |
| GET/POST | `/api/store/playlists` | 매장 플레이리스트 CRUD |
| GET | `/store-playlists/public/:id` | 게시된 매장 snapshot 재생 조회 (API client의 서비스별 `/api/v1/<service>` base 사용) |
| GET | `/public/signage?playlist=:id` | 공개 재생 엔드포인트 |

---

## 5. 컴포넌트 맵

```
커뮤니티
  └─ ContentHubPage.tsx         /signage, /intranet/signage/content

Hub (탐색 게이트)
  └─ HubSignageLibraryPage.tsx  /hub/signage

매장
  └─ StoreSignagePage.tsx       /store/marketing/signage
       ├─ [Tab 1] 가져올 콘텐츠  → /hub/signage CTA
       ├─ [Tab 2] 내 동영상      asset snapshots (toggle/filter/search)
       ├─ [Tab 3] 내 플레이리스트 DataTable + 편집 인라인
  ├─ SignagePlayerSelectPage.tsx  디스플레이 재생 · 새 탭에서 목록 선택
  └─ SignagePlaybackPage.tsx      URL의 목록을 사용자 시작 후 반복 재생

운영자
  ├─ HqMediaPage.tsx            /operator/signage/hq-media       (DataTable)
  ├─ HqPlaylistsPage.tsx        /operator/signage/hq-playlists   (DataTable)
  ├─ TemplatesPage.tsx          /operator/signage/templates
  └─ CategoriesPage.tsx         /operator/signage/categories

공개 재생
  └─ PublicSignagePage.tsx      /public/signage?playlist=:id
```

---

## 6. 설계 원칙

1. **Hub = 원본** — `signage_media`, `signage_playlists` (불변)
2. **Store = snapshot** — `o4o_asset_snapshots` → `store_playlist_items`
3. **복사 단일 경로** — `assetSnapshotApi.copy()` 외 clone 금지
4. **재생 단위** — `store_playlists` (매장 플레이리스트)
5. **공개 렌더링** — `/public/signage?playlist=:id`
6. **실행 격리** — 커뮤니티·운영자·매장 간 API 분리

---

## 7. 확장 가이드

| 신규 작업 | 진입 위치 |
|----------|----------|
| 새 HQ 미디어 추가 | `/operator/signage/hq-media` |
| 커뮤니티 콘텐츠 등록 | `/signage` (콘텐츠 등록 버튼) |
| 매장 콘텐츠 확보 | `/hub/signage` → 내 매장에 추가 |
| 디스플레이별 재생목록 선택 | `/store/marketing/signage/player` > 재생 화면 열기 |
| AI 콘텐츠 생성 | `/operator/signage/hq-media` > AI 초안 생성 |

---

*Frozen: 구조 변경은 명시적 WO 필수. 버그 수정·기능 추가·테스트는 허용.*
