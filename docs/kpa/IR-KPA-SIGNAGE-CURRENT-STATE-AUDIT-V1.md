# IR-KPA-SIGNAGE-CURRENT-STATE-AUDIT-V1

> **KPA Society Digital Signage — Current State Investigation Report**
>
> 조사 전용 WO (investigation-only). 코드 수정 없음.
>
> 작성 일자: 2026-04-16
> 조사 기준: 실제 코드 기준, 추측 배제. dead code/UI-API 불일치/legacy 명시.

---

## 1. 전체 판정

| 판정 | **PARTIAL** |
|------|-------------|

**근거 요약:**

- ✅ **KPA 매장 핵심 재생 흐름은 동작** — `store_playlists` + `store_playlist_items` (스냅샷 기반) + PublicSignagePage (`/public/signage`) 가 실제 매장 태블릿에서 재생되는 경로로 정상 작동.
- ⚠️ **구조적 파편화 심각** — 3개 병렬 구현체 공존 (Signage Core framework / Store Playlist Engine / Cosmetics Store Playlist). Framework 테이블 12+개가 사실상 dead code.
- ⚠️ **Entity 충돌** — 동일 테이블(`store_playlists`)에 매핑되는 TypeORM 엔티티 클래스 2개 존재. KPA 컨트롤러는 양쪽 모두 사용하지 않고 raw SQL 수행.
- ⚠️ **UI-API 불일치** — HQ 경로에서 GET 은 `?source=hq` 쿼리, 변이(POST/PATCH/DELETE)는 `/hq/` 경로 prefix 혼용.
- ⚠️ **화면 관심사 혼합** — `ContentHubPage` 한 컴포넌트가 `operatorMode` prop 분기로 커뮤니티/운영자 양쪽 사용.
- ⚠️ **매장 페이지 legacy 공존** — `StoreSignagePage` 가 신규 Playlist 탭 + legacy Asset 탭 2-tab 구조로 방치.
- ⚠️ **Copy API 경로 혼재** — Signage 전용 복사 API 는 제거됨 (WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1). 현재 asset-snapshot-copy 서비스로 이전되었으나 화면 문구/위치가 이전 흔적을 남김.

결론: **"사용자 흐름은 뚫려 있으나 구조가 흔들려 있음"** → 다음 단계는 IA 재설계 WO 에서 구조 정리 후 구현.

---

## 2. 화면별 상태 요약

| 영역 | 상태 | 핵심 문제 |
| -------------- | ------- | --------------------------------------------------------- |
| 커뮤니티 signage | PARTIAL | `ContentHubPage` 가 `operatorMode` prop 으로 운영자와 공유. 실제 "커뮤니티 소비자" 타겟 UX 가 별도 정의되어 있지 않음. `/signage` → 목록, `/signage/media/:id` · `/signage/playlist/:id` → 상세 존재. BaseTable 미적용. |
| 운영자 signage | PARTIAL | 5개 운영자 페이지 존재 (`/operator/signage/content`, `/operator/signage/hq-media`, `/operator/signage/hq-playlists`, `/operator/signage/templates`, `/operator/signage/categories`). HQ Media/HQ Playlists 가 별도 페이지이나 `ContentHubPage` 도 operatorMode 로 동일 기능 제공 → 진입점 중복. API path 규칙 비일관 (`?source=hq` vs `/hq/` prefix). |
| 매장 HUB signage | PARTIAL | `/store/marketing/signage` → `StoreSignagePage` (1622 줄). 2-tab 구조: ① 신규 Playlist 탭 (store_playlists 기반, 스냅샷 엔진) ② legacy Asset 탭. `/hub/signage` → `HubSignageLibraryPage` 별도. 신-legacy 공존으로 사용자 혼란. PublicSignagePage 재생 경로만 정상. |

### 2.1 화면 인벤토리

| # | Route | 페이지 컴포넌트 | 스코프 | 비고 |
|---|-------|----------------|--------|------|
| 1 | `/signage` | `ContentHubPage` (operatorMode=false) | 커뮤니티 | 소비용, 목록 |
| 2 | `/signage/media/:id` | `MediaDetailPage` | 커뮤니티 | 미디어 상세 |
| 3 | `/signage/playlist/:id` | `PlaylistDetailPage` | 커뮤니티 | 플레이리스트 상세 |
| 4 | `/public/signage?playlist=:id` | `PublicSignagePage` | public | **매장 태블릿 재생 경로 (실사용 active)** |
| 5 | `/operator/signage/content` | `ContentHubPage` (operatorMode=true) | 운영자 | 관심사 혼합 |
| 6 | `/operator/signage/hq-media` | `HQMediaPage` | 운영자 | HQ 전용 미디어 관리 |
| 7 | `/operator/signage/hq-playlists` | `HQPlaylistsPage` | 운영자 | HQ 전용 플레이리스트 |
| 8 | `/operator/signage/templates` | `TemplatesPage` | 운영자 | Template DB 활용도 낮음 |
| 9 | `/operator/signage/categories` | `CategoriesPage` | 운영자 | 분류 관리 |
| 10 | `/store/marketing/signage` | `StoreSignagePage` (2-tab) | 매장 | 신-legacy 공존 |
| 11 | `/hub/signage` | `HubSignageLibraryPage` | 매장 | HUB 라이브러리 |

- **BaseTable 미적용** — 전 페이지 custom `<table>` 사용.
- **Design Core 적합성** — 미검증 (외형만 유사, 컴포넌트 계약 없음).

---

## 3. 데이터 모델 요약

### 3.1 테이블 그룹 상태

| 그룹 | 테이블 | 상태 | 용도 |
|------|--------|------|------|
| **Active — KPA 매장** | `store_playlists` | ACTIVE | 매장 재생 대상 플레이리스트 (SINGLE / LIST type) |
| | `store_playlist_items` | ACTIVE | 스냅샷 기반 아이템 (source 스냅샷) |
| **Active — 공용** | `media_assets` | ACTIVE | 공개 라이브러리 |
| | `signage_categories` | ACTIVE | 카테고리 참조 |
| **Active — Cosmetics 격리** | `cosmetics.cosmetics_store_playlists` | ACTIVE (격리) | K-Cosmetics 독립 스키마 |
| | `cosmetics.cosmetics_store_playlist_items` | ACTIVE (격리) | 동상 |
| **Dead — Signage Core framework** | `signage_media` | DEAD | 사용처 없음 (KPA 에서 미참조) |
| | `signage_playlists` | DEAD | 상동 |
| | `signage_playlist_items` | DEAD | 상동 |
| | `signage_schedules` | DEAD | 스케줄링 로직 불활성 |
| | `signage_templates` | DEAD | 템플릿 DB 불활성 |
| | `signage_template_zones` | DEAD | 상동 |
| | `signage_layout_presets` | DEAD | 상동 |
| | `signage_content_blocks` | DEAD | 상동 |
| | `signage_playlist_shares` | DEAD | 공유 로직 부재 |
| | `signage_ai_generation_logs` | DEAD | AI 생성 파이프라인 미구현 |
| | `signage_analytics` | DEAD | 분석 파이프라인 미구현 |
| | `signage_media_tags` | DEAD | 태그 시스템 부재 |
| | `playlist_items` (legacy) | DEAD | 최초 세대 legacy |

### 3.2 Entity 충돌 (CRITICAL)

- 두 개의 `StorePlaylist` 엔티티 클래스가 **동일한 `store_playlists` 테이블**에 매핑됨:
  - Legacy: `apps/api-server/src/entities/StorePlaylist.ts`
  - Active: `apps/api-server/src/routes/kpa/entities/store-playlist.entity.ts`
- KPA 운영 경로 컨트롤러는 **TypeORM 엔티티를 거치지 않고 raw SQL 직접 수행** → 양쪽 엔티티 모두 코드 기준으로는 "살아있으나 실사용 없음" 상태.
- 스키마 변경 시 엔티티 정합성 자동 검증 불가 → 휴먼 에러 위험 영역.

### 3.3 핵심 스냅샷 계약 (Active)

`store_playlist_items`:
- `source_type` + `source_id` — 원본 참조
- `snapshot_*` 컬럼 — 재생 시점의 **완전한 스냅샷** (제목/URL/썸네일/duration 등)
- 원본 소스 삭제/변경과 무관하게 **재생 안정성 보장** 구조
- WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1 의 결과물

---

## 4. API 목록 정리

### 4.1 총괄

| 유형 | 엔드포인트 수 |
|------|-------------|
| Authenticated | 44 |
| Public (signage-public.routes.ts) | 4 |
| **합계** | **48** |

경로 prefix: `/api/signage/:serviceKey` (인증), `/api/signage/public/*` (공개)

### 4.2 Permission Guard 구조

| Guard | 용도 |
|-------|------|
| `requireSignageCommunity` | 커뮤니티 소비자 경로 |
| `requireSignageStore` | 매장 소유자 (X-Organization-Id 필수) |
| `allowSignageStoreRead` | 매장 읽기 전용 |
| `requireSignageOperator` | 운영자 전용 변이 |
| `requireSignageOperatorOrStore` | 운영자 또는 매장 — 읽기 혼합 경로 |

### 4.3 도메인별 엔드포인트

#### Media
| Method | Path | Guard | 비고 |
|--------|------|-------|------|
| GET | `/api/signage/:serviceKey/media` | operatorOrStore | `?source=hq` 필터로 운영자/커뮤니티 분기 |
| GET | `/api/signage/:serviceKey/media/:id` | operatorOrStore | 상세 |
| POST | `/api/signage/:serviceKey/media` | operator | 업로드 — community 경로 |
| POST | `/api/signage/:serviceKey/hq/media` | operator | HQ 업로드 — **path prefix 불일치** |
| PATCH | `/api/signage/:serviceKey/hq/media/:id` | operator | HQ 수정 |
| DELETE | `/api/signage/:serviceKey/hq/media/:id` | operator | HQ 삭제 |

#### Playlist
| Method | Path | Guard | 비고 |
|--------|------|-------|------|
| GET | `/api/signage/:serviceKey/playlists` | operatorOrStore | `?source=hq` 분기 |
| GET | `/api/signage/:serviceKey/playlists/:id` | operatorOrStore | 상세 |
| POST | `/api/signage/:serviceKey/playlists` | operator | 커뮤니티 생성 |
| POST | `/api/signage/:serviceKey/hq/playlists` | operator | HQ 생성 |
| PATCH | `/api/signage/:serviceKey/playlists/:id` | operator | 수정 |
| DELETE | `/api/signage/:serviceKey/playlists/:id` | operator | 삭제 |
| POST | `/api/signage/:serviceKey/playlists/:id/items` | operator | 아이템 추가 (스냅샷 생성) |
| DELETE | `/api/signage/:serviceKey/playlists/:id/items/:itemId` | operator | 아이템 삭제 |
| PATCH | `/api/signage/:serviceKey/playlists/:id/items/reorder` | operator | 순서 변경 |

#### Store Playlist (매장 소유)
| Method | Path | Guard | 비고 |
|--------|------|-------|------|
| GET | `/api/signage/:serviceKey/store/playlists` | store | 자기 매장 소유 목록 |
| POST | `/api/signage/:serviceKey/store/playlists` | store | 매장 소유 생성 |
| PATCH | `/api/signage/:serviceKey/store/playlists/:id` | store | 매장 소유 수정 |
| DELETE | `/api/signage/:serviceKey/store/playlists/:id` | store | 매장 소유 삭제 |
| POST | `/api/signage/:serviceKey/store/playlists/:id/items` | store | 아이템 추가 |
| DELETE | `/api/signage/:serviceKey/store/playlists/:id/items/:itemId` | store | 아이템 삭제 |
| PATCH | `/api/signage/:serviceKey/store/playlists/:id/items/reorder` | store | 순서 변경 |

#### Copy / Snapshot (변경됨)
- **Copy API 제거됨** — WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1 결과.
- 현재는 `asset-snapshot-copy` 서비스가 공통 스냅샷 복사를 담당. Signage 전용 `/copy` 엔드포인트는 더이상 존재하지 않음.
- 프론트 일부 화면에 "복사" 문구/버튼이 남아있을 수 있으나, 실제 경로는 스냅샷 생성 API (`POST .../items`) 으로 수렴.

#### Playback (Public)
| Method | Path | Guard | 비고 |
|--------|------|-------|------|
| GET | `/api/signage/public/playlists/:id` | — | PublicSignagePage 재생 소스 |
| GET | `/api/signage/public/playlists/:id/items` | — | 스냅샷 아이템 목록 |
| GET | `/api/signage/public/media/:id` | — | 단독 미디어 재생 |
| GET | `/api/signage/public/health` | — | 헬스체크 |

#### Category / Template
| Method | Path | Guard | 비고 |
|--------|------|-------|------|
| GET | `/api/signage/:serviceKey/categories` | operatorOrStore | 목록 |
| POST/PATCH/DELETE | `/api/signage/:serviceKey/categories/...` | operator | CRUD |
| GET/POST/PATCH/DELETE | `/api/signage/:serviceKey/templates/...` | operator | **Template DB 화면 활용 낮음** |

### 4.4 UI-API 불일치 기록

| # | 영역 | 현상 |
|---|------|------|
| 1 | HQ 경로 | GET 은 `/media?source=hq` · 변이는 `/hq/media` → 읽기/쓰기 경로 표기 불일치 |
| 2 | Template | API 존재하나 운영자 화면(`/operator/signage/templates`) 의 사용량 희박 |
| 3 | Copy 문구 | 화면 일부에 "복사" 노출되나 실제 API는 스냅샷 생성 경로 |
| 4 | Schedule | `signage_schedules` 테이블 존재하나 API/화면 모두 부재 |

---

## 5. 현재 사용자 흐름

### 5.1 매장 운영자 — 플레이리스트 구성 및 재생 (ACTIVE 경로)

```
매장 로그인
  ↓
/store/marketing/signage (StoreSignagePage)
  ↓ [탭 선택]
  ├─ 신규 Playlist 탭
  │   → GET /api/signage/kpa-society/store/playlists
  │   → POST .../store/playlists/:id/items  (스냅샷 생성)
  │   → 미리보기 / 저장
  │
  └─ legacy Asset 탭 (정리 필요)
      → 구 자산 관리 경로
  ↓
매장 태블릿에서 /public/signage?playlist=:id 접속
  ↓ GET /api/signage/public/playlists/:id/items
재생 (스냅샷 컬럼 기반)
```

### 5.2 운영자(HQ) — 공통 콘텐츠 등록

```
/operator/signage/hq-media  또는  /operator/signage/content (operatorMode)
  ↓
POST /api/signage/kpa-society/hq/media  (path prefix)
  ↓
/operator/signage/hq-playlists
  ↓
POST /api/signage/kpa-society/hq/playlists
POST .../playlists/:id/items
  ↓
매장은 해당 HQ 플레이리스트/미디어를 스냅샷 복사로 가져가 사용
```

### 5.3 커뮤니티 — 콘텐츠 탐색

```
/signage (ContentHubPage, operatorMode=false)
  ↓
GET /api/signage/kpa-society/media
GET /api/signage/kpa-society/playlists
  ↓
/signage/media/:id  또는  /signage/playlist/:id
  ↓
(실질 소비 액션 미정 — 재생? 매장 태블릿? Unclear)
```

### 5.4 흐름 관찰 요약

- **매장 재생 경로는 뚫림** (태블릿 `/public/signage` → 스냅샷 기반 재생).
- **운영자 ↔ 매장 컨텐츠 이동**은 스냅샷 복사로 일원화됨 (별도 Copy API 없이 item 생성 시 자동 스냅샷).
- **커뮤니티 소비 목적**이 구조에서 명확히 분리되어 있지 않음. `ContentHubPage` 가 운영자와 컴포넌트를 공유하여 "커뮤니티 전용 목적"이 희석.
- `StoreSignagePage` 의 2-tab 구조가 "어느 탭을 쓰는 게 맞는가" 라는 운영 질문을 그대로 노출.

---

## 6. 주요 문제 Top 5

### P1. Entity 충돌 + raw SQL 이원화 (데이터 계약 리스크)
- 동일 테이블(`store_playlists`) 에 매핑된 엔티티 클래스 2종 존재 + 실제 KPA 컨트롤러는 raw SQL 사용.
- 결과: 스키마 변경 시 타입 시스템 방어 없음. 휴먼 에러가 그대로 프로덕션 반영 가능.
- 영향 범위: 매장 운영 핵심 테이블 — 사실상 가장 중요한 경로.

### P2. Signage Core framework dead code 12+ 테이블
- `signage_media`, `signage_playlists`, `signage_templates`, `signage_schedules`, `signage_analytics` 등 프레임워크 테이블들이 설계 의도(종합 Signage 프레임워크)와 무관하게 실사용되지 않음.
- 신규 개발자 학습 비용 증가, 잘못된 테이블 수정 위험, 마이그레이션 잡음.
- 삭제/archive 의사결정 필요.

### P3. UI-API 경로 규칙 불일치 (HQ 경로)
- GET: `?source=hq` 쿼리 파라미터.
- 변이: `/hq/` path prefix.
- 동일 도메인(HQ) 의 CRUD 가 읽기/쓰기에서 서로 다른 규약을 따름 → API 문서화/디버깅 비용 상승.

### P4. 화면 관심사 혼합 및 legacy 공존
- `ContentHubPage` 가 `operatorMode` prop 분기로 커뮤니티/운영자 겸용 → 책임 분리 원칙 위반.
- `StoreSignagePage` 의 신규 Playlist 탭 + legacy Asset 탭 공존 → 사용자 혼란 + 코드 정리 미완 (1622 줄 단일 파일).

### P5. Design Core / BaseTable 미적용
- 11개 signage 화면 모두 custom `<table>` 사용. Design Core 컴포넌트 계약 없음.
- `docs/rules/design-core-governance.md` 의 "모든 신규 화면은 Design Core v1.0" 규칙과 어긋남.
- 장기적으로 UX 일관성/접근성/검증 비용 증가.

---

## 7. 리팩토링 필요 영역

### 7.1 IA (Information Architecture)
- **커뮤니티/운영자/매장** 의 3-스코프 책임을 페이지 레벨에서 명확히 분리.
  - `ContentHubPage` 의 operatorMode 분기 해체 → 커뮤니티용 페이지와 운영자용 페이지를 독립 엔티티로.
- 운영자 진입점 중복 정리 (`/operator/signage/content` vs `/operator/signage/hq-media` vs `/operator/signage/hq-playlists`).
- `StoreSignagePage` 2-tab → 단일 Playlist UX 로 수렴, legacy Asset 탭은 sunset 일정 확정.
- `/hub/signage` (HubSignageLibraryPage) 와 `/store/marketing/signage` 관계 재정의.

### 7.2 데이터
- **Entity 충돌 해소** — `store_playlists` 에 대한 단일 엔티티 클래스로 통일. KPA 컨트롤러는 raw SQL → QueryService/Repository 패턴으로 재구성 (APP 표준화 규칙 13 참조).
- **Dead code 정리** — `signage_*` framework 테이블 12+개 archive 또는 drop 여부 결정. 설계 의도(종합 프레임워크)를 살릴지, 현실(스냅샷 기반 playlist) 로 수렴할지 선언 필요.
- **Schedule / Analytics / Template 정책 확정** — 현재 테이블만 존재하고 로직 부재. "하지 않음" 을 공식화하거나, 로드맵에 편입.
- 스냅샷 계약을 Freeze 항목으로 승격 고려 (F-시리즈) — WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1 의 결과물이 core 에 가까움.

### 7.3 UX
- Design Core 기반 BaseTable / Card / Dialog 적용.
- 매장 운영자가 "HQ 콘텐츠 → 내 매장 플레이리스트" 로 가져오는 흐름을 단일 플로우로 설계 (현재: 탐색 → 스냅샷 item 생성 이 암묵적).
- PublicSignagePage 재생 품질 기준 (해상도/네트워크 단절/fallback) 문서화.

### 7.4 권한
- Guard 5종 (`requireSignageCommunity`, `requireSignageStore`, `allowSignageStoreRead`, `requireSignageOperator`, `requireSignageOperatorOrStore`) 의 매트릭스를 단일 문서화.
- `X-Organization-Id` 헤더 계약을 Boundary Policy F6 (Store Ops = organizationId) 와 정합 검증.
- `requireSignageOperatorOrStore` — 읽기 전용 공용 Guard 가 실제 운영에서 어떻게 동작하는지 테스트 케이스화.

### 7.5 API 계약
- HQ 경로 규칙 통일 — 읽기/쓰기 모두 `/hq/` prefix 또는 모두 `?source=hq` 중 하나로 수렴.
- Copy 의미가 남은 화면 문구/버튼 정리 (asset-snapshot-copy 서비스로 경로 수렴 확인).
- OpenAPI 계약 문서 초안화 (APP 표준화 규칙 13 + Business Service Rules 연계).

---

## 부록 A. 주요 파일 위치

| 영역 | 경로 |
|------|------|
| Signage 라우트 | `apps/api-server/src/routes/signage/signage.routes.ts` |
| Public 라우트 | `apps/api-server/src/routes/signage/signage-public.routes.ts` |
| KPA 전용 컨트롤러 | `apps/api-server/src/routes/kpa/controllers/` (raw SQL) |
| Legacy Entity | `apps/api-server/src/entities/StorePlaylist.ts` |
| Active Entity | `apps/api-server/src/routes/kpa/entities/store-playlist.entity.ts` |
| 커뮤니티 Content Hub | `services/web-kpa-society/src/pages/signage/ContentHubPage.tsx` |
| 매장 Signage | `services/web-kpa-society/src/pages/store/StoreSignagePage.tsx` |
| Public 재생 | `services/web-kpa-society/src/pages/public/PublicSignagePage.tsx` |

## 부록 B. 다음 단계 후보

1. **IA 재설계 초안 WO** — 본 감사 보고서를 근거로 스코프 분리/진입점 정리/legacy sunset 스케줄 기록.
2. **Entity 통일 WO** — `store_playlists` 단일 엔티티 계약 확정 + raw SQL → Repository 이행.
3. **Dead code 정리 WO** — `signage_*` framework 테이블 archive/drop 의사결정.
4. **HQ 경로 규칙 통일 WO** — API 계약 정합화.
5. **Design Core 적용 WO** — BaseTable / Card / Dialog 로 전면 치환.

---

*조사자: Claude (Opus 4.6)*
*조사 일자: 2026-04-16*
*원본 조사 근거: 3개 병렬 Explore agent (Frontend / Data Model / API) + 직접 코드 검증*
*범위: KPA Society Digital Signage 현황 — 수정 없음, 판단/권고만 수록*
