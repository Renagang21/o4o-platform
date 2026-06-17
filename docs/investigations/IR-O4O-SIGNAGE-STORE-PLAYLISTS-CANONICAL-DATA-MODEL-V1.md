# IR-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-DATA-MODEL-V1

> **유형:** 조사(Investigation) — 코드/DB/API 변경 없음. 문서 산출만.
> **일자:** 2026-06-17
> **선행:** `WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1` (등록 UI 표준화, frontend only)
> **한 줄 정의:** 내 매장 디지털 사이니지의 `store_playlists` 저장 구조를 canonical `signage_playlists` 로 통합할 수 있는지, 기존 목록·스케줄·재생기·HUB 복사 흐름을 깨지 않고 전환 가능한 방식을 조사한다.

---

## 1. 목적

디지털 사이니지 플레이리스트는 surface별 저장 구조가 이원화되어 있다.

- **운영자/HQ·커뮤니티**: canonical `signage_playlists` (`POST /api/signage/:serviceKey/{hq|community}/playlists`).
- **내 매장**: `store_playlists` (`/{service}/store-playlists`).

선행 WO 로 등록 **UI Shell** 은 표준화됐으나, 내 매장의 **데이터 모델** 은 canonical 로 통합되지 않았다. 본 IR 은 통합 가능 여부·안전한 방식을 조사·판정한다.

---

## 2. 배경 — 선행 WO에서 내 매장을 전환하지 않은 이유

내 매장 목록은 `store_playlists` 를 읽는다. 저장만 `signage_playlists` 로 바꾸면 "등록했는데 목록에 안 보임" (테이블 상이). 따라서 데이터 모델 정합은 frontend WO 가 아니라 본 backend IR 로 분리했다.

---

## 3. 테이블 구조 (실측)

### 3.1 store_playlists
파일: `apps/api-server/src/routes/kpa/entities/store-playlist.entity.ts`
마이그레이션: `apps/api-server/src/database/migrations/20260222600000-CreateStorePlaylistTables.ts`

| 컬럼 | 타입 | nullable | 비고 |
|---|---|---|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | 스코핑(단일). **serviceKey 없음** |
| name | varchar(255) | NO | |
| playlist_type | varchar(20) | NO | SINGLE \| LIST |
| publish_status | varchar(20) | NO | draft \| published |
| is_active | boolean | NO | hard-delete 대용(소프트 플래그) |
| source_playlist_id | uuid | YES | 복제 원본 |
| created_at / updated_at | timestamp | NO | |

- soft-delete 컬럼 없음 / 버전 컬럼 없음 / tags·metadata·description·createdBy 없음.

### 3.2 store_playlist_items
파일: `apps/api-server/src/routes/kpa/entities/store-playlist-item.entity.ts`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid | PK |
| playlist_id | uuid | FK → store_playlists (CASCADE) |
| **snapshot_id** | uuid | **o4o_asset_snapshots 참조 (불변 스냅샷)** |
| display_order | int | 정렬(unique 아님, 중복 허용) |
| is_forced / is_locked | boolean | |
| forced_start_at / forced_end_at | timestamp | 강제 콘텐츠 시간창 |
| created_at / updated_at | timestamp | |

### 3.3 signage_playlists
파일: `packages/digital-signage-core/src/backend/entities/SignagePlaylist.entity.ts`

| 컬럼 | 타입 | nullable | 비고 |
|---|---|---|---|
| id | uuid | NO | PK |
| serviceKey | varchar(50) | NO | 멀티테넌트 |
| organizationId | uuid | YES | store scope 시 채움 |
| name | varchar(255) | NO | |
| description | text | YES | |
| status | varchar(20) | NO | draft\|pending\|active\|archived (CHECK) |
| loopEnabled / defaultItemDuration / transitionType / transitionDuration | | NO | 재생 설정 |
| totalDuration / itemCount | int | NO | 계산 필드 |
| source | varchar(20) | NO | hq\|supplier\|community\|store |
| scope | varchar(20) | NO | global\|store |
| parentPlaylistId | uuid | YES | 복제 원본 |
| isPublic / likeCount / downloadCount | | NO | 소셜 |
| createdByUserId | uuid | YES | 소유자 |
| metadata | jsonb | NO | |
| tags | text[] | NO | |
| createdAt / updatedAt | timestamp | NO | |
| **deletedAt** | timestamp | YES | **soft-delete** |
| version | int | NO | 낙관적 락 |

### 3.4 signage_playlist_items
파일: `packages/digital-signage-core/src/backend/entities/SignagePlaylistItem.entity.ts`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid | PK |
| playlistId | uuid | FK → signage_playlists (CASCADE) |
| **mediaId** | uuid | **signage_media 직접 참조 (CASCADE)** |
| sortOrder | int | **UNIQUE(playlistId, sortOrder)** |
| duration / transitionType | | 항목별 override |
| isActive / isForced | boolean | |
| sourceType | varchar(30) | platform\|hq\|supplier\|store\|operator_ad |
| metadata | jsonb | |

### 3.5 (신규 발견) cosmetics_store_playlists — 3번째 변종
파일: `apps/api-server/src/routes/cosmetics/entities/cosmetics-store-playlist.entity.ts`
마이그레이션: `20260212000003-CreateCosmeticsStorePlaylistTables.ts`

K-Cosmetics 내 매장은 **cosmetics 격리 스키마의 별도 테이블**(`storeId` 기반)을 쓴다 — `store_playlists` 도 `signage_playlists` 도 아니다. 통합 논의 시 반드시 별도 축으로 취급.

---

## 3.6 필드 비교 요약

| 항목 | store_playlists | signage_playlists | 호환 |
|---|---|---|---|
| 스코핑 | organization_id only | serviceKey + organizationId | ✗ |
| 상태 | publish_status(2) + is_active | status(4, CHECK) + deletedAt | ✗ |
| 타입 | playlist_type(SINGLE/LIST) | — | ✗ |
| source/scope | — | source/scope/parentPlaylistId | ✗ |
| tags/metadata/description/소유자 | 없음 | 있음 | ✗ |
| **항목 콘텐츠 참조** | **snapshot_id (o4o_asset_snapshots)** | **mediaId (signage_media)** | **✗ 근본 비호환** |
| 항목 정렬 unique | 없음(중복 허용) | UNIQUE(playlistId,sortOrder) | ✗ |
| 강제 콘텐츠 | is_forced + 시간창(start/end) | isForced + sourceType | ✗ 모델 다름 |

→ **헤더(playlist) 차이는 매핑 가능**(필드 보강·status/scope 추론)하나, **항목(item) 모델은 스냅샷 vs 미디어 직접참조로 근본 비호환**. 이것이 통합의 핵심 난점.

---

## 4. API 조사 (실측)

### 4.1 현행 내 매장 API
파일: `apps/api-server/src/routes/o4o-store/controllers/store-playlist.controller.ts` (+ repository)
마운트: KPA `kpa.routes.ts` / GP `glycopharm.routes.ts` 가 `/store-playlists` 로 **공유 컨트롤러** 호출. (K-Cosmetics 는 cosmetics 격리 — 별도)

| Method | Path | R/W 테이블 | 스코핑/가드 |
|---|---|---|---|
| GET | `/store-playlists` | store_playlists | requireAuth + resolveStoreAccess(organizationId) |
| POST | `/store-playlists` | store_playlists | `{name, playlistType?}` |
| PATCH | `/store-playlists/:id` | store_playlists | verifyOwnership |
| DELETE | `/store-playlists/:id` | store_playlists (is_active=false) | |
| GET | `/store-playlists/:id/items` | store_playlist_items + o4o_asset_snapshots (+ forced 가상병합) | |
| POST | `/store-playlists/:id/items` | store_playlist_items | `{snapshotId}` |
| POST | `.../items/from-library` | + o4o_asset_snapshots(write) | `{libraryItemId}` |
| POST | `.../items/from-signage` | + o4o_asset_snapshots(write), signage_media(read) | `{mediaId, organizationId?}` |
| PATCH | `.../items/reorder` | store_playlist_items | `{order:[id...]}` |
| DELETE | `.../items/:itemId` | store_playlist_items (hard) | forced- prefix → 403 |
| GET | `/store-playlists/public/:id` | store_playlists(published) | **무인증(재생기 공개)** |

### 4.2 canonical signage API
파일: `apps/api-server/src/routes/signage/{controllers,services,repositories}/playlist.*`, `signage.routes.ts`

| Method | Path | R/W | 가드 |
|---|---|---|---|
| GET/POST | `/api/signage/:serviceKey/playlists` | signage_playlists (store scope) | requireSignageOperatorOrStore / **requireSignageStore** |
| GET/POST | `.../playlists/:id/items` (+ `/bulk`, `/reorder`) | signage_playlist_items + signage_media | |
| POST | `.../hq/playlists` | signage_playlists (source=hq, scope=global) | requireSignageOperator |
| POST | `.../community/playlists` | signage_playlists (source=community) | requireSignageCommunity |
| GET | `.../global/playlists[/:source]` | signage_playlists (hq/community) | allowSignageStoreRead |

**핵심:** canonical **store CRUD 경로가 이미 존재**한다 (`POST .../playlists` + requireSignageStore → organizationId 기반 signage_playlists write, GET 동일 필터 read). 단 store 측 가드는 `X-Organization-Id` 헤더를 요구하고, 항목은 `mediaId` 기반.

---

## 5. 사용처 / ID 참조 / 재생기 영향 (실측)

### 5.1 스케줄 — 이미 dual-reference 구조
- `packages/digital-signage-core/src/backend/entities/SignageSchedule.entity.ts`: **`playlistId`(nullable) + `storePlaylistId`(nullable)** 둘 다 보유.
- 마이그레이션 `20260425200000-AddStorePlaylistIdToSchedules.ts` 가 `storePlaylistId` 추가 + `playlistId` nullable 화.
- `apps/api-server/src/routes/signage/services/schedule.service.ts` `resolveActiveContent()`: **storePlaylistId 우선** → store_playlist_items 직접 조회. 없으면 core signage_playlists.
- → **기존 schedule 은 전환 후에도 동작**(아키텍처가 분기를 이미 흡수). 단, 헤더를 signage_playlists 로 옮기면 `playlistId` 로 재배선 필요.

### 5.2 재생기 — transport-agnostic
- `services/web-kpa-society/src/pages/pharmacy/SignagePlaybackPage.tsx`: `playlistId='_schedule'` → 스케줄 해석, UUID → 직접 fetch. 재생기는 **API 응답 items 를 소비**할 뿐 테이블을 직접 조회하지 않음.
- `services/signage-player-web/src/types/signage.ts`: storePlaylistId 개념 없음 — id 출처 무관.
- → **ID 변경이 재생기 자체를 깨지 않음**. 깨질 수 있는 건 (a) 스케줄 id 재배선, (b) `/play/:playlistId` 라우트가 가리키는 id 공간, (c) frontend 캐시된 selectedPlaylistId.

### 5.3 HUB 복사 흐름
- `HubSignageLibraryPage` → `assetSnapshotApi.copy()` → **o4o_asset_snapshots 생성** (store_playlists row 생성 아님). 사용자가 별도로 store playlist 만들고 스냅샷을 항목으로 추가.
- `dashboard-assets.copy-handlers.ts copySignagePlaylist()`: canonical 안에서만 복제(store_playlists 미접촉, itemCount=0).
- `o4o-store/services/store-asset-derivation.service.ts`: derivedKind `signage_playlist`/`signage_item` 추적 — 전환 시 보존 대상.

### 5.4 주요 사용처 파일
백엔드: store-playlist.controller/repository, kpa.routes, glycopharm.routes, cosmetics.routes(격리), schedule.service, SignageSchedule.entity, dashboard-assets.copy-handlers, store-asset-derivation.service, 마이그레이션 3종.
프론트: web-kpa-society·web-k-cosmetics `api/storePlaylist.ts`, StorePlaylistCreatePage, StoreSignagePage(KPA)/StoreSignageMainPage(GP)/StoreSignagePage(KCos), SignagePlayerSelectPage, SignagePlaybackPage, HubSignageLibraryPage.

---

## 6. 핵심 쟁점

### 6.1 통합 가능 여부
- 헤더: signage_playlists 가 `scope='store'` + organizationId 로 내 매장 playlist 를 수용 가능(canonical store 경로 이미 존재). **가능.**
- 항목: **불가에 가까움.** store=스냅샷(불변 복사본 + forced 시간창), signage=signage_media 직접참조. 단순 dual-write/복사 불가 — 스냅샷↔미디어 의미가 다름.

### 6.2 기존 데이터 보존
후보: A 현행유지 / B dual-read / C mirror-write 후 migration / D 일괄 migration / E 통합 비권장.

### 6.3 ID 호환성 (가장 중요)
- 스케줄: `storePlaylistId` → `playlistId` 재배선 필요(매핑 테이블). 미반영 시 dangling.
- `/play/:playlistId`·detail 라우트: old store id 노출 → 전환 시 1~2 릴리스 동안 양 id 공간 지원 필요.
- 재생기 자체는 영향 없음(5.2).

### 6.4 권한·스코핑
- 내 매장: organizationId 단독으로 충분(현행). canonical store 가드는 `X-Organization-Id` 헤더 요구 → frontend 헤더 주입 필요.
- 동일 organizationId 가 복수 serviceKey 에 걸칠 가능성 검토 필요(현재 store_playlists 는 serviceKey 무지).

---

## 7. 전환 후보안 (실측 반영)

| 안 | 내용 | 평가 |
|---|---|---|
| **A. 현행 유지** | store_playlists 유지, Shell 만 공통 | 리스크 0. 스케줄/재생기/목록 무영향. 단 이원화 지속 |
| **B. dual-read** | 신규는 canonical, 기존은 store 읽기, 목록 합산 | `/play/:id` id 공간 모호 + 목록 정렬/중복/수정대상 구분 복잡 → 버그 위험 |
| **C. mirror-write 후 migration** | 헤더를 양쪽 기록 후 검증·이전 | **항목 모델 비호환으로 항목 단계는 mirror 불가** — 헤더만 가능. 부분적 |
| **D. 일괄 migration + 단일화** | store→signage 전수 이전, store API 폐기 | 스냅샷→미디어 해석 필요(손실/복잡) + 스케줄 id 재배선 + 라우트 id 전환. 고위험·rollback 난해 |
| **E. 통합 비권장(의도적 분리 유지)** | store=실행자산(스냅샷/forced) vs signage=방송 카탈로그(미디어)를 별개 도메인으로 인정 | 항목 모델 차이가 도메인 의도일 가능성 |

---

## 8. 판정

> **권장: A(현행 유지) — 단기. 항목 모델 비호환은 "사고적 drift"가 아니라 도메인 경계(매장 실행자산=불변 스냅샷+forced vs 방송 카탈로그=미디어 직접참조)일 가능성이 높다. 따라서 "전면 canonical 단일화(D)"는 비권장.**

세부:
- **헤더 수준** 통합은 기술적으로 가능하고 canonical store 경로도 이미 있으나, **항목 수준** 을 통합하지 않으면 실익이 작다(목록은 헤더가 아니라 항목·스냅샷·forced 까지 묶여 있음).
- 진짜 통합을 추진한다면 **선결 조건은 "항목 모델 reconciliation"**: store 의 스냅샷/forced-content 의미를 signage_playlist_items(mediaId) 위에서 어떻게 보존할지부터 설계해야 한다. 이것이 미해결인 상태의 D 는 데이터 손실·장애 위험.
- 부분 추진 시 유일하게 안전한 경로는 **per-org opt-in + 헤더 mirror + 스케줄 id 매핑 + 양 id 공간 1~2 릴리스 병행(C 변형)**, 절대 big-bang 금지.
- **K-Cosmetics 는 cosmetics 격리 스키마라 별도 트랙**(이 IR 의 store_playlists 논의에 직접 포함되지 않음).

판정 근거 기록:
| 기준 | 결과 |
|---|---|
| 데이터 손실 위험 | D 높음(스냅샷→미디어 해석) / A 없음 |
| 스케줄 영향 | dual-reference 이미 존재 → 재배선만 필요(D/C) / A 없음 |
| 재생기 영향 | transport-agnostic → 직접 영향 없음 |
| 목록 영향 | B 높음(혼합) / A 없음 |
| 권한 가드 | canonical store 는 X-Organization-Id 헤더 요구 |
| migration 필요 | D 필수 / C 부분 / A·B 불필요 또는 부분 |
| rollback | A 즉시 / D 난해 |
| 서비스 차이 | KCos cosmetics 격리 스키마 별도 |

---

## 9. 금지 사항 (본 IR 범위)
코드/DB/migration/API/frontend/package/lockfile/Dockerfile/배포 변경 **전부 금지**. 본 문서 외 산출물 없음.

---

## 10. 산출물 체크
1. store_playlists 구조 — §3.1 ✅
2. signage_playlists 구조 — §3.3 ✅
3. 필드 비교표 — §3.6 ✅
4. 현행 store-playlists API — §4.1 ✅
5. canonical signage API — §4.2 ✅
6. 각 API read/write 테이블 — §4 ✅
7. frontend/backend 사용처 — §5.4 ✅
8. schedule/replayer/id 참조 영향 — §5.1–5.3 ✅
9. 전환 후보안 비교 — §7 ✅
10. 최종 권장안 — §8 ✅
11. 후속 WO 필요 여부 — §12 ✅
12. (추가) cosmetics 격리 스키마 변종 — §3.5 ✅

---

## 11. 결론 (한 줄)
내 매장 사이니지는 **헤더는 canonical 통합 가능하나 항목(스냅샷 vs 미디어) 모델이 근본 비호환**이며, 스케줄은 이미 dual-reference·재생기는 transport-agnostic 이라 ID 전환 리스크는 "스케줄 재배선 + 라우트 id 병행"에 국한된다. **단기 권장은 현행 유지(A)**, 통합은 항목 모델 reconciliation 설계가 선결된 뒤 per-org opt-in(C 변형)으로만 추진한다.

---

## 12. 후속 WO 후보 (IR 결과 분기)
```text
WO-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-KEEP-LEGACY-V1      ← 권장(현행 유지 명문화 + 이원화 문서화)
WO-O4O-SIGNAGE-STORE-ITEMS-MODEL-RECONCILIATION-IR-V1        ← 통합 추진 시 선결(스냅샷↔미디어 의미 정합 조사)
WO-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-MIRROR-WRITE-V1     ← 헤더 한정 부분 전환(선결 충족 후)
WO-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-MIGRATION-V1        ← big-bang, 비권장
```
별도: K-Cosmetics `cosmetics_store_playlists` 격리 스키마 정합은 독립 트랙으로 다룬다.
