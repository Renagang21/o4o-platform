# WO-KPA-SIGNAGE-IA-RESTRUCTURE-DRAFT-V1

> **KPA Society Digital Signage — Information Architecture Restructure Draft**
>
> 본 문서는 설계 문서이다. **코드 수정 / API 수정 / DB 수정 금지**.
> 오직 구조 정의만 수행한다.
>
> 근거 문서: `docs/kpa/IR-KPA-SIGNAGE-CURRENT-STATE-AUDIT-V1.md`
>
> **CLAUDE.md의 앱 개발 시 작업 규칙에 따라 작성한다.**
>
> 작성 일자: 2026-04-16
> 범위: KPA Society (service_key = `kpa-society`) Signage 도메인 구조 재설계 초안

---

## 1. Overview

### 1.1 현재 상태 요약

- **매장 재생 흐름**: `store_playlists` + `store_playlist_items` (스냅샷 기반) + `/public/signage` 태블릿 경로 → **정상 동작**.
- **구조 상태**: 3개 병렬 구현체 공존 — Signage Core framework (DEAD 12+ 테이블) / Store Playlist Engine (ACTIVE) / Cosmetics Store Playlist (격리).
- **화면 상태**: `ContentHubPage` 가 커뮤니티/운영자 겸용 (`operatorMode` prop 분기). `StoreSignagePage` 는 신규 Playlist + legacy Asset 2-tab 공존. BaseTable/Design Core 미적용.
- **API 상태**: HQ 경로 규칙이 GET(`?source=hq`) 와 변이(`/hq/` prefix) 에서 불일치. Copy 전용 API 는 `asset-snapshot-copy` 서비스로 이전됨.
- **Entity 상태**: `store_playlists` 테이블에 매핑된 TypeORM 엔티티 클래스 2종 존재 + KPA 컨트롤러는 raw SQL → 타입 시스템 방어 없음.

### 1.2 문제 정의

| # | 문제 | 영향 |
|---|------|------|
| 1 | 서비스 스코프 혼합 (커뮤니티/운영자/매장 경계가 코드에 드러나지 않음) | 책임 추적 곤란, 권한 실수 가능 |
| 2 | Framework dead code 12+ 테이블 | 신규 개발자 학습 비용, 마이그레이션 잡음 |
| 3 | Entity 충돌 + raw SQL 이원화 | 스키마 변경 시 타입 방어 없음 |
| 4 | HQ 경로 규칙 불일치 | API 문서화/디버깅 비용 상승 |
| 5 | StoreSignagePage 2-tab legacy | 사용자 혼란 + 1622 줄 단일 파일 |
| 6 | Design Core 미적용 | UX 일관성/접근성 결손 |

### 1.3 이 문서의 목적

> **"KPA Signage 를 앞으로 어떤 구조로 운영할 것인지" 를 문서로 확정한다.**

본 문서가 PASS 로 확정되면, 이후 모든 Signage 리팩토링 WO 는 본 구조를 근거로 한다.

---

## 2. As-Is 구조 요약

### 2.1 서비스 관점

```
[Community]       [Operator]            [Store]
    ↓                 ↓                    ↓
/signage         /operator/signage/*   /store/marketing/signage
ContentHubPage   ContentHubPage(HQ)    StoreSignagePage (2-tab)
                 HQMediaPage              ├─ 신규 Playlist
                 HQPlaylistsPage          └─ legacy Asset
                 TemplatesPage
                 CategoriesPage
                                       /hub/signage
                                       HubSignageLibraryPage

                    [Public/재생]
                    /public/signage
                    PublicSignagePage
                    ← store_playlists 스냅샷
```

### 2.2 데이터 관점

```
ACTIVE:
  store_playlists
  store_playlist_items     ← 스냅샷 기반 (snapshot_*)
  media_assets             ← 공개 라이브러리
  signage_categories

ACTIVE (격리):
  cosmetics.cosmetics_store_playlists
  cosmetics.cosmetics_store_playlist_items

DEAD (12+):
  signage_media
  signage_playlists
  signage_playlist_items
  signage_schedules
  signage_templates
  signage_template_zones
  signage_layout_presets
  signage_content_blocks
  signage_playlist_shares
  signage_ai_generation_logs
  signage_analytics
  signage_media_tags
  playlist_items (legacy)
```

### 2.3 API 관점 (요약)

- 총 48 엔드포인트 (44 authenticated + 4 public).
- Guard 5종: `requireSignageCommunity`, `requireSignageStore`, `allowSignageStoreRead`, `requireSignageOperator`, `requireSignageOperatorOrStore`.
- HQ 경로: GET `?source=hq` / 변이 `/hq/` prefix (불일치).
- Copy 전용 API 제거됨 → `asset-snapshot-copy` 서비스로 일원화 (WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1).

---

## 3. To-Be 구조

### 3.1 서비스 구조 3분리 (핵심 원칙)

To-Be 에서는 Signage 를 **완전히 분리된 3개 서비스 역할** 로 정의한다.

---

#### 3.1.1 커뮤니티 Signage

| 항목 | 내용 |
|------|------|
| **목적** | KPA 커뮤니티 참여자(약사/회원)가 콘텐츠를 **탐색** 하고 공유하는 공간 |
| **주요 사용자** | KPA 회원 (약사, 커뮤니티 멤버) |
| **가능한 행동** | 목록 조회 / 상세 조회 / 즐겨찾기·공유 (옵션) |
| **데이터 접근 범위** | `media_assets` (공개 라이브러리) + `store_playlists` 중 공개 플래그 + `signage_categories` 참조 |
| **불가** | 업로드 / 편집 / 삭제 / 매장 재생 설정 |
| **Guard** | `requireSignageCommunity` |

**커뮤니티는 "소비" 전용** 이다. 생성/편집 기능은 일절 제공하지 않는다.

---

#### 3.1.2 운영자(HQ) Signage

| 항목 | 내용 |
|------|------|
| **목적** | KPA 본부 운영자가 **공용 콘텐츠를 등록·관리** 하고, 매장이 가져갈 수 있도록 큐레이션 |
| **주요 사용자** | KPA Operator (본부 관리자, Admin/Operator role) |
| **가능한 행동** | HQ Media/Playlist CRUD / 카테고리 관리 / 공개 범위 설정 |
| **데이터 접근 범위** | `media_assets` (HQ 소유 전체) + `store_playlists` (HQ 소유분) |
| **불가** | 매장 개별 플레이리스트 직접 수정 (매장 스코프 진입 없음) |
| **Guard** | `requireSignageOperator` |

**운영자는 "도매 창고" 를 관리**한다. 매장이 그 창고에서 **가져가는** 모델을 유지.

---

#### 3.1.3 매장 HUB Signage

| 항목 | 내용 |
|------|------|
| **목적** | 개별 매장(약국) 소유자가 **자기 매장 플레이리스트** 를 구성하고 태블릿에서 재생 |
| **주요 사용자** | Pharmacy Owner / Store Manager |
| **가능한 행동** | HUB 탐색 → 스냅샷으로 가져오기 → 내 플레이리스트 편집 → Public 재생 |
| **데이터 접근 범위** | `store_playlists` (자기 조직 소유분) + `store_playlist_items` (스냅샷) + HUB 라이브러리(읽기 전용) |
| **불가** | 타 매장 플레이리스트 접근 / HQ 원본 편집 |
| **Guard** | `requireSignageStore` (X-Organization-Id 필수) |

**매장은 "내 가게의 재생 대상" 만 다룬다**. HUB 에서 가져오기 + 자기 편집이 전부.

---

### 3.2 핵심 흐름 정의 (단일 표준 흐름)

```
[1. 콘텐츠 등록]                    [2. 탐색]                      [3. 가져오기]
  운영자(HQ)                          매장 / 커뮤니티                 매장
  POST /hq/media                      GET /hub/... (HUB)             POST /store/playlists/:id/items
  POST /hq/playlists                  GET /signage (커뮤니티)          (source 스냅샷 자동 생성)
         ↓                                    ↓                             ↓
  [공용 라이브러리 등록]                 [원본/큐레이션 참조]              [스냅샷으로 매장 소유화]

[4. 편집]                           [5. 재생]
  매장                                매장 태블릿 (Public)
  PATCH/DELETE .../store/playlists    GET /public/signage?playlist=:id
  순서 변경                              GET /api/signage/public/playlists/:id/items
         ↓                                    ↓
  [매장 소유 플레이리스트 확정]          [스냅샷 기반 재생]
```

**현재와의 차이:**

| 구분 | As-Is | To-Be |
|------|-------|-------|
| 커뮤니티 진입 | ContentHubPage (operatorMode=false) | 독립 CommunitySignagePage |
| 운영자 진입 | ContentHubPage (operatorMode=true) + HQMedia + HQPlaylists | HQMedia + HQPlaylists (ContentHubPage 운영자 모드 **제거**) |
| 매장 구성 | StoreSignagePage 2-tab (신 Playlist + legacy Asset) | StoreSignagePage 단일 Playlist |
| HUB 진입 | `/hub/signage` + `/store/marketing/signage` 이원화 | `/hub/signage` = 탐색 전용, `/store/marketing/signage` = 내 플레이리스트 편집 (역할 분리 명시) |

---

### 3.3 페이지 / 라우트 구조 재정의

다음 표는 각 경로에 대한 Keep/Merge/Drop/Sunset 결정이다.

| # | Route | 현재 컴포넌트 | 결정 | 비고 |
|---|-------|--------------|------|------|
| 1 | `/signage` | `ContentHubPage` (operatorMode=false) | **Keep (개명 권장)** | 커뮤니티 전용 컴포넌트로 **분리**. 내부에서 operatorMode 분기 제거 |
| 2 | `/signage/media/:id` | `MediaDetailPage` | **Keep** | 커뮤니티 상세 |
| 3 | `/signage/playlist/:id` | `PlaylistDetailPage` | **Keep** | 커뮤니티 상세 |
| 4 | `/public/signage?playlist=:id` | `PublicSignagePage` | **Keep** | 태블릿 재생 경로 (변경 없음) |
| 5 | `/operator/signage/content` | `ContentHubPage` (operatorMode=true) | **Drop** | `/operator/signage/hq-media`, `/operator/signage/hq-playlists` 와 기능 중복. operatorMode 분기 해체 시 자동 소멸 |
| 6 | `/operator/signage/hq-media` | `HQMediaPage` | **Keep** | 운영자 HQ 미디어 관리 |
| 7 | `/operator/signage/hq-playlists` | `HQPlaylistsPage` | **Keep** | 운영자 HQ 플레이리스트 관리 |
| 8 | `/operator/signage/templates` | `TemplatesPage` | **Sunset** | Template DB 사용 희박. 단기 유지, 중기 제거 |
| 9 | `/operator/signage/categories` | `CategoriesPage` | **Keep** | `signage_categories` Active 테이블 관리 |
| 10 | `/store/marketing/signage` | `StoreSignagePage` (2-tab) | **Keep (단일화)** | legacy Asset 탭 제거, 신규 Playlist 탭만 유지 |
| 11 | `/hub/signage` | `HubSignageLibraryPage` | **Keep (역할 명시)** | 매장이 HQ/공용 라이브러리를 **탐색** 하는 전용 진입점. 편집 없음 |

### 3.3.1 핵심 의사결정 명시

1. **`ContentHubPage operatorMode` 유지 여부** — **제거**.
   - 커뮤니티 페이지와 운영자 페이지를 독립 컴포넌트로 분리.
   - operatorMode prop 분기는 책임 분리 원칙 위반으로 판정.

2. **`/operator/signage/content` 존치 여부** — **제거**.
   - `/operator/signage/hq-media`, `/operator/signage/hq-playlists` 로 완전 수렴.

3. **`/hub/signage` 와 `/store/marketing/signage` 관계** — **역할 분리 유지**.
   - `/hub/signage` = **탐색(Browse)** 전용 — 매장이 HQ/공용 콘텐츠를 둘러보는 창구. 편집 없음.
   - `/store/marketing/signage` = **내 플레이리스트 편집(Manage)** — 매장이 자기 소유 플레이리스트를 구성·수정·재생 설정.
   - 두 페이지는 동일한 `store_playlists` 데이터 소스를 공유하나 **역할이 다르다** 를 코드 주석·문서·UX 상 명시.

---

## 4. 데이터 구조 방향

### 4.1 엔진 확정

**`store_playlists` + `store_playlist_items` 를 최종 Signage 엔진으로 확정한다.**

| 결정 항목 | 결정 |
|----------|------|
| Signage 엔진 표준 | `store_playlists` + `store_playlist_items` (스냅샷 기반) |
| `signage_*` framework 테이블 | **제거 방향** (archive 후 drop) |
| 스냅샷 계약 | **표준 확정** — `snapshot_*` 컬럼이 재생 단독 기준. 원본 변경·삭제와 독립 |
| Freeze 승격 검토 | WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1 의 결과물을 F-시리즈 Freeze 항목으로 승격 **권고** |

### 4.2 테이블별 Keep / Hold / Drop

| 분류 | 테이블 | 결정 | 근거 |
|------|--------|------|------|
| **Keep** | `store_playlists` | Keep | 매장 플레이리스트 엔진 — 표준 확정 |
| | `store_playlist_items` | Keep | 스냅샷 기반 재생 단위 — 표준 확정 |
| | `media_assets` | Keep | 공개 라이브러리 |
| | `signage_categories` | Keep | 분류 체계 (Active) |
| | `cosmetics.cosmetics_store_playlists` | Keep | K-Cosmetics 도메인 격리 유지 |
| | `cosmetics.cosmetics_store_playlist_items` | Keep | 상동 |
| **Hold** | `signage_templates` | Hold | Template 기능 정책 결정 전까지 보류. 결정 후 Keep 또는 Drop |
| | `signage_template_zones` | Hold | 상동 |
| | `signage_layout_presets` | Hold | 상동 |
| | `signage_content_blocks` | Hold | 상동 |
| **Drop** | `signage_media` | Drop | KPA 어디에도 참조되지 않음 |
| | `signage_playlists` | Drop | `store_playlists` 로 대체됨 |
| | `signage_playlist_items` | Drop | `store_playlist_items` 로 대체됨 |
| | `signage_schedules` | Drop | 스케줄링 로직 미구현 — "하지 않음" 공식화 |
| | `signage_analytics` | Drop | 분석 파이프라인 미구현 — "하지 않음" 공식화 |
| | `signage_playlist_shares` | Drop | 공유 로직 부재 |
| | `signage_ai_generation_logs` | Drop | AI 생성 파이프라인 미구현 |
| | `signage_media_tags` | Drop | 태그 시스템 부재 |
| | `playlist_items` (legacy) | Drop | 최초 세대 legacy |

### 4.3 Entity 통일 방향

- `store_playlists` 테이블에 매핑된 TypeORM 엔티티 클래스 2종 → **1종으로 통일** (후속 WO 에서 수행).
- Legacy: `apps/api-server/src/entities/StorePlaylist.ts` → 제거 대상.
- Active: `apps/api-server/src/routes/kpa/entities/store-playlist.entity.ts` → 표준 채택.
- KPA 컨트롤러의 raw SQL → QueryService/Repository 패턴으로 이행 (APP 표준화 규칙 13 참조).

### 4.4 Schedule / Analytics / Template 정책 확정

| 영역 | 정책 |
|------|------|
| **Schedule** | **Out of Scope** 공식화. `signage_schedules` Drop. 향후 필요 시 Work Order 로 별도 정의 |
| **Analytics** | **Out of Scope** 공식화. `signage_analytics` Drop. 재생 통계는 장기 로드맵 |
| **Template** | **Hold** — Template DB(`signage_templates`, `signage_template_zones`, `signage_layout_presets`, `signage_content_blocks`) 는 유지하되 화면 활용도 재평가 후 Keep/Drop 재결정 |

---

## 5. Legacy 처리 방안

### 5.1 StoreSignagePage 2-tab

**결정: 신규 Playlist 탭 단일화, legacy Asset 탭 제거.**

| 단계 | 조치 |
|------|------|
| 현재 | Tab 1: 신규 Playlist (ACTIVE) / Tab 2: legacy Asset (관리 미스 공존) |
| 중간 | legacy Asset 탭에 "이 기능은 곧 제거됩니다" 배너 표시 (옵션) |
| 최종 | Tab 구조 제거 → 단일 페이지(Playlist 관리) 로 재구성. 1622 줄 파일 분리 |

### 5.2 ContentHubPage operatorMode

**결정: operatorMode prop 분기 해체, 두 개 독립 컴포넌트로 분리.**

| 대상 | 조치 |
|------|------|
| Community | `CommunitySignagePage` (신규) — `/signage` 매핑 |
| Operator | 기존 `HQMediaPage`, `HQPlaylistsPage` 로 수렴. `/operator/signage/content` 라우트 제거 |

### 5.3 legacy Entity

**결정: `apps/api-server/src/entities/StorePlaylist.ts` 제거.**

- 후속 Entity 통일 WO 에서 수행.
- KPA 전용 Entity (`routes/kpa/entities/store-playlist.entity.ts`) 를 표준으로 채택.

### 5.4 Template / Schedule / Analytics

- **Template**: Hold — 후속 결정.
- **Schedule**: Drop — Out of Scope 공식화.
- **Analytics**: Drop — Out of Scope 공식화.

---

## 6. API 방향

본 절은 **방향만 정의**한다. 구현은 별도 WO 에서 수행한다.

### 6.1 HQ 경로 규칙 통일

**결정: `/hq/` path prefix 로 통일.**

| 구분 | As-Is | To-Be |
|------|-------|-------|
| HQ Media GET | `GET /media?source=hq` | `GET /hq/media` |
| HQ Media POST | `POST /hq/media` | `POST /hq/media` (유지) |
| HQ Media PATCH | `PATCH /hq/media/:id` | `PATCH /hq/media/:id` (유지) |
| HQ Media DELETE | `DELETE /hq/media/:id` | `DELETE /hq/media/:id` (유지) |
| HQ Playlist GET | `GET /playlists?source=hq` | `GET /hq/playlists` |
| HQ Playlist (나머지) | 기존 `/hq/` prefix 유지 | 유지 |

**근거**: 변이 경로가 이미 `/hq/` prefix 를 사용하고 있으므로, GET 경로를 이에 맞추는 것이 변경 비용 최소.

**호환성**: 기존 `?source=hq` 는 일정 기간 backward-compatible 로 유지 후 deprecation 공지 → 후속 WO 에서 제거.

### 6.2 Copy 개념 정리

**결정: Snapshot 기반으로 일원화 확정.**

- Signage 전용 `/copy` 엔드포인트는 이미 제거됨 (WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1).
- 매장이 HQ/공용 콘텐츠를 "가져오는" 동작 = `POST .../store/playlists/:id/items` 호출 시 **source 스냅샷 자동 생성**.
- 프론트 화면에 남은 "복사" 문구/버튼은 "매장으로 가져오기" 또는 "내 플레이리스트에 추가" 로 **문구 정리** (후속 WO).

### 6.3 Guard 매트릭스 정합

| Guard | 용도 | Boundary Policy 정합성 |
|-------|------|------------------------|
| `requireSignageCommunity` | 커뮤니티 소비 | 커뮤니티 = organizationId=NULL 패턴과 정합 |
| `requireSignageOperator` | HQ 운영자 | serviceKey 기반 (Broadcast 도메인) |
| `requireSignageStore` | 매장 편집 | organizationId + X-Organization-Id 헤더 (Store Ops 도메인, F6 정합) |
| `allowSignageStoreRead` | 매장 읽기 | 상동 (read-only) |
| `requireSignageOperatorOrStore` | 혼합 읽기 | **재검토 필요** — 단일 Guard 로 수렴 또는 읽기 전용 명시화 후속 WO |

---

## 7. Keep / Hold / Drop 표 (종합)

### 7.1 화면

| Route | 결정 |
|-------|------|
| `/signage` | Keep (독립 컴포넌트로 분리) |
| `/signage/media/:id` | Keep |
| `/signage/playlist/:id` | Keep |
| `/public/signage` | Keep |
| `/operator/signage/content` | **Drop** |
| `/operator/signage/hq-media` | Keep |
| `/operator/signage/hq-playlists` | Keep |
| `/operator/signage/templates` | **Sunset** (Hold 후 재평가) |
| `/operator/signage/categories` | Keep |
| `/store/marketing/signage` | Keep (2-tab → 단일화) |
| `/hub/signage` | Keep (탐색 전용 명시) |

### 7.2 데이터

| 테이블 | 결정 |
|--------|------|
| `store_playlists` | Keep |
| `store_playlist_items` | Keep |
| `media_assets` | Keep |
| `signage_categories` | Keep |
| `cosmetics.cosmetics_store_playlists` | Keep |
| `cosmetics.cosmetics_store_playlist_items` | Keep |
| `signage_templates` / `signage_template_zones` / `signage_layout_presets` / `signage_content_blocks` | **Hold** |
| `signage_media` | Drop |
| `signage_playlists` | Drop |
| `signage_playlist_items` | Drop |
| `signage_schedules` | Drop |
| `signage_analytics` | Drop |
| `signage_playlist_shares` | Drop |
| `signage_ai_generation_logs` | Drop |
| `signage_media_tags` | Drop |
| `playlist_items` (legacy) | Drop |

### 7.3 Entity

| Entity | 결정 |
|--------|------|
| `routes/kpa/entities/store-playlist.entity.ts` | Keep (표준 채택) |
| `entities/StorePlaylist.ts` (legacy) | Drop |

### 7.4 API 경로

| 패턴 | 결정 |
|------|------|
| `/hq/` path prefix | Keep (표준 채택) |
| `?source=hq` query | **Sunset** (호환성 유지 후 제거) |
| `/copy` 전용 엔드포인트 | Drop (이미 제거 완료, 문구만 정리) |

---

## 8. 후속 WO 계획

본 IA 초안이 PASS 로 확정된 후, 다음 순서로 진행한다.

### WO-1: HQ API 경로 통일
- GET `?source=hq` → `/hq/` prefix 로 통일.
- Backward-compatible 기간 설정 후 deprecation.
- **선행 조건**: 본 문서 PASS.

### WO-2: Entity 통일
- `store_playlists` 단일 엔티티 확정 (`routes/kpa/entities/store-playlist.entity.ts`).
- Legacy `entities/StorePlaylist.ts` 제거.
- KPA 컨트롤러 raw SQL → QueryService/Repository 이행.
- **선행 조건**: WO-1 완료 (API 경로 안정화).

### WO-3: Dead code 정리
- `signage_*` framework 테이블 12+개 중 **Drop** 결정분 archive 후 drop 마이그레이션.
- `playlist_items` (legacy) 제거.
- Hold 항목(Template DB)은 재평가 완료 시점에 별도 결정.
- **선행 조건**: WO-2 완료 (엔티티 참조 정리 후).

### WO-4: Design Core 적용
- 11개 signage 화면 custom `<table>` → Design Core BaseTable / Card / Dialog 치환.
- `ContentHubPage` operatorMode 분리 → `CommunitySignagePage` 신설.
- `StoreSignagePage` 2-tab → 단일 Playlist UX 로 수렴 + 파일 분리.
- **선행 조건**: WO-3 완료 (데이터 정리 후 UX 리팩토링).

### 추가 후속 (별도 WO 후보)
- **Template 정책 확정 WO**: Hold 테이블 재평가 → Keep/Drop 결정.
- **Snapshot 계약 Freeze WO**: WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1 결과물을 F-시리즈로 승격 검토.
- **Guard 매트릭스 정합 WO**: `requireSignageOperatorOrStore` 재검토 및 Boundary Policy F6 정합 검증.

---

## 9. 최종 판정

| 항목 | 상태 |
|------|------|
| 서비스 3분리 정의 | ✅ 작성 완료 |
| 흐름 재정의 (5-step) | ✅ 작성 완료 |
| 페이지/라우트 Keep/Drop/Merge/Sunset | ✅ 11개 전부 결정 |
| 데이터 구조 방향 (엔진·Keep/Hold/Drop) | ✅ 결정 |
| Legacy 처리 방안 | ✅ 4개 항목 결정 |
| API 방향 (경로·Copy·Guard) | ✅ 결정 |
| 후속 WO 계획 (순서·선행조건) | ✅ 4개 + 추가 3개 |

### 판정: **PASS**

**근거:**
- 완료 조건 6개 전부 충족.
- 커뮤니티/운영자/매장 3-스코프 경계가 목적·사용자·행동·데이터 범위까지 명확히 분리됨.
- 페이지/라우트 11개 전부 Keep/Drop/Sunset 결정.
- 데이터 구조 방향(엔진 확정, 스냅샷 표준, 테이블 Keep/Hold/Drop) 명시됨.
- legacy 처리(StoreSignagePage 2-tab, ContentHubPage operatorMode, legacy Entity) 계획됨.
- 후속 WO 순서와 선행 조건 정의됨.

---

## 부록 A. 준수 원칙 체크리스트

| 원칙 | 준수 |
|------|------|
| 코드 수정 금지 | ✅ |
| API 수정 금지 | ✅ |
| DB 변경 금지 | ✅ |
| 구현 지시 금지 | ✅ |
| 실제 코드 기준 (추측 금지) | ✅ (감사 보고서 근거) |
| 감사 보고서와 충돌 없음 | ✅ |
| 매장 운영 흐름 최우선 | ✅ (매장 스냅샷 재생이 중심축) |
| 복잡한 이상 구조 → 운영 가능 구조 | ✅ (framework 대신 playlist 엔진 수렴) |
| CLAUDE.md 앱 개발 규칙 준수 | ✅ |

## 부록 B. 즉시 중단 조건 (본 WO 수행 중 해당 없음)

다음 상황 발생 시 작업을 즉시 중단한다.
- Core 구조 변경이 필요한 경우
- API 계약 변경이 필요한 경우
- DB 구조 수정이 필요한 경우

본 문서는 **방향 정의만 수행** 하였으며, 상기 항목에 해당하는 변경은 모두 **후속 WO 로 이관** 되었다.

## 부록 C. 근거 문서

- `docs/kpa/IR-KPA-SIGNAGE-CURRENT-STATE-AUDIT-V1.md` — 현황 감사
- `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` (F6) — Boundary Policy
- `docs/rules/design-core-governance.md` — Design Core 거버넌스
- `docs/baseline/CONTENT-STABLE-DECLARATION-V1.md` (F5) — Content Stable
- `docs/baseline/PLATFORM-CONTENT-POLICY-V1.md` (F4) — Platform Content Policy
- `CLAUDE.md` — 개발 최상위 규칙

---

*작성자: Claude (Opus 4.6)*
*작성 일자: 2026-04-16*
*종류: 설계 문서 (IA Draft)*
*상태: PASS — 후속 WO 착수 준비 완료*
