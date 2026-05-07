# WO-KPA-SIGNAGE-DEAD-CODE-RETIREMENT-PLAN-V1

> **KPA Society Digital Signage — Dead Code Retirement Plan (Plan-Only)**
>
> 본 문서는 **계획 수립 전용** WO 산출물이다.
> **DB drop / migration 생성 / 코드 삭제 / API 변경을 수행하지 않는다.**
> 오직 "안전하게 제거하기 위한 설계"만 수록한다.
>
> **CLAUDE.md의 앱 개발 시 작업 규칙에 따라 작성한다.**
>
> 근거 문서:
> - [docs/kpa/IR-KPA-SIGNAGE-CURRENT-STATE-AUDIT-V1.md](IR-KPA-SIGNAGE-CURRENT-STATE-AUDIT-V1.md)
> - [docs/kpa/WO-KPA-SIGNAGE-IA-RESTRUCTURE-DRAFT-V1.md](WO-KPA-SIGNAGE-IA-RESTRUCTURE-DRAFT-V1.md)
>
> 조사 근거: 실제 코드 전수 조사 (entities / migrations / controllers / services / repositories / routes / frontend API 클라이언트)
>
> 작성 일자: 2026-04-16
> 범위: `signage_*` framework 테이블 13개 + 관련 local legacy entity/service 18개 + transitive dependency chain

---

## 1. Overview

### 1.1 목적

KPA Society 디지털 사이니지 도메인에 잔존하는 **dead code (테이블 · 엔티티 · 서비스 · 컨트롤러)** 를 **단계적으로 안전하게 제거하기 위한 실행 계획**을 확정한다.

본 WO 는 **계획 문서만 생성**한다. 실 삭제/migration/코드 변경은 후속 WO 에서 단계별로 수행.

### 1.2 현재 상태 요약 (IR 재확인)

| 축 | 상태 |
|----|------|
| 매장 재생 흐름 | ✅ `store_playlists` + `store_playlist_items` + `/public/signage` ACTIVE |
| digital-signage-core 패키지 | ✅ `@o4o-apps/digital-signage-core/entities` → `SignageCoreEntities` 배열이 `connection.ts:869` 에 등록됨 |
| signage_* 테이블 (12개) | 마이그레이션 존재 · 엔티티 등록 · 일부 라우트 실재 · **KPA 사용도 낮음** (audit 판정) |
| Local legacy entity (api-server/src/entities/) | ❌ 미등록 · 미사용 · orphaned |
| Legacy service/controller chain | ❌ AnalyticsService / PerformanceMonitoringInitializer / ScheduledReportingService / SignageService / SignageController — 외부 호출 없음 |

### 1.3 본 WO 의 핵심 판정

> **"모든 signage_* 테이블이 DEAD" 는 과장된 판정이다.**
>
> 실 코드 검증 결과 **12개 테이블 중 3~4개만 진성 DEAD**, 나머지는 cross-service(네처·글라이코팜·K-화장품·KPA)에서 routes/repository/frontend 를 통해 **wired** 되어 있음.
>
> 반면 **local legacy entity 7개 + legacy service/controller 6개** 는 완전 orphan (runtime 진입점 0 건) → **제거 우선 대상**.

---

## 2. 조사 결과 요약

### 2.1 데이터 소스 등록 현황

| 그룹 | 등록 파일 | 등록된 엔티티 수 |
|------|----------|--------------|
| digital-signage-core | [connection.ts:402-403](apps/api-server/src/database/connection.ts#L402-L403) | 12 (`SignageCoreEntities` spread at line 869) |
| KPA canonical (Store Playlist Engine) | [connection.ts](apps/api-server/src/database/connection.ts) (WO-KPA-SIGNAGE-STORE-PLAYLIST-ENTITY-UNIFICATION-V1) | `StorePlaylist`, `StorePlaylistItem` |
| Local legacy (api-server/src/entities/) | **미등록** | `SignagePlaylist`, `SignageSchedule`, `SignageSlide`, `SignageDevice`, `SignageContent`, `PlaylistItem`, `ContentUsageLog`, `StorePlaylist`(legacy) |

### 2.2 현실 검증

| 검증 항목 | 결과 |
|----------|------|
| `signage.routes.ts` 에 `/media`, `/playlists`, `/schedules`, `/templates`, `/content-blocks`, `/layout-presets`, `/ai/generate` 라우트 존재 여부 | ✅ 모두 존재 |
| 이 라우트들이 어떤 서비스 Frontend 에서 호출되는지 | Template: neture/glycopharm/k-cosmetics (TemplatesPage) · KPA 는 `signageTemplate.ts` api 클라이언트만 존재, 화면 사용도 낮음 |
| `SignagePlaylistShare`, `SignageAnalytics`, `SignageMediaTag` 에 대한 Repository / Controller 진입 여부 | ❌ 없음 (comment-only 참조) |
| `SignageAiGenerationLog` 진입 여부 | ✅ `POST /ai/generate` 가 `content.service.ts:169` 에서 `createAiGenerationLog()` 호출 (**write-only audit trail**) |
| Local legacy entity 7개 import 여부 | 외부 참조 없음 · 자기들끼리만 참조 (transitive cycle) |
| AnalyticsService 호출 여부 | Performance/Reporting 서비스 3개가 import 하나, 해당 3개도 외부 호출 없음 (barrel export 만 존재) → **runtime 도달 불가** |
| `SignageController` 등록 여부 | register-routes 에서 import 안 됨 → **완전 dead** |

### 2.3 데이터 vs 코드 불일치

| 구분 | 상태 |
|------|------|
| 데이터베이스에 테이블은 존재 (migration 2026011700001 로 생성) | YES — 13 테이블 |
| 테이블에 실제 행이 들어가는지 | 본 조사 범위 아님 (운영 DB read 는 별도 검증 필요) |
| 코드에서 writer/reader 가 있는지 | 테이블별로 상이 — § 3 에서 분류 |

---

## 3. 테이블별 분석

### 범례

- ✅ **REACHABLE** : 라우트 → 컨트롤러 → repository → entity 가 실제로 연결되어 있음
- ⚠️ **COMMENT-ONLY** : 코드에 엔티티/테이블 이름이 comment 로만 나옴
- ❌ **DEAD** : 어떤 진입점으로도 도달 불가

| # | 테이블 | Entity | 등록 | 라우트 | Repository 메소드 | 분류 |
|---|--------|--------|------|--------|------------------|------|
| 1 | `signage_media` | `digital-signage-core/SignageMedia` | ✅ | `/media/*` (GET/POST/PATCH/DELETE) + `/hq/media/*` | `media.repository.ts` | **KEEP** |
| 2 | `signage_playlists` | `digital-signage-core/SignagePlaylist` | ✅ | `/playlists/*` + `/hq/playlists/*` | `playlist.repository.ts` | **KEEP** |
| 3 | `signage_playlist_items` | `digital-signage-core/SignagePlaylistItem` | ✅ | `/playlists/:id/items/*` | `playlist.repository.ts` | **KEEP** |
| 4 | `signage_schedules` | `digital-signage-core/SignageSchedule` | ✅ | `/schedules/*`, `/active-content` | `schedule.repository.ts` + `schedule.service.ts` | **KEEP** |
| 5 | `signage_templates` | `digital-signage-core/SignageTemplate` | ✅ | `/templates/*`, `/templates/preview` | `template.repository.ts` | **HOLD** (cross-service 사용, KPA 사용도 낮음) |
| 6 | `signage_template_zones` | `digital-signage-core/SignageTemplateZone` | ✅ | `/templates/:id/zones/*` | `template.repository.ts` | **HOLD** (Template 에 종속) |
| 7 | `signage_layout_presets` | `digital-signage-core/SignageLayoutPreset` | ✅ | `/layout-presets/*` | `content.repository.ts` | **HOLD** (KPA 화면 사용 미확인) |
| 8 | `signage_content_blocks` | `digital-signage-core/SignageContentBlock` | ✅ | `/content-blocks/*` | `content.repository.ts` | **HOLD** (KPA 화면 사용 미확인) |
| 9 | `signage_playlist_shares` | `digital-signage-core/SignagePlaylistShare` | ✅ | 없음 | ⚠️ comment-only (FK cascade note) | **DROP** |
| 10 | `signage_ai_generation_logs` | `digital-signage-core/SignageAiGenerationLog` | ✅ | `/ai/generate` → write-only | ✅ `content.repository.ts: createAiGenerationLog()` | **HOLD** (write-only audit log) |
| 11 | `signage_analytics` | `digital-signage-core/SignageAnalytics` | ✅ | 없음 | ⚠️ comment-only (loose-ref note) | **DROP** |
| 12 | `signage_media_tags` | `digital-signage-core/SignageMediaTag` | ✅ | 없음 | ⚠️ media.repository.ts comment | **DROP** |
| 13 | `playlist_items` (legacy) | `entities/PlaylistItem.ts` | ❌ 미등록 | 없음 | 없음 | **DROP (entity file only)** |

### 3.1 KEEP 대상 — § 4.1 에서 상세

> `signage_media` / `signage_playlists` / `signage_playlist_items` / `signage_schedules` — **cross-service 실사용 중**. HQ 콘텐츠 배포 파이프라인의 핵심.

### 3.2 HOLD 대상 — § 4.2 에서 상세

> Templates/TemplateZones/LayoutPresets/ContentBlocks/AiGenerationLogs — 라우트와 repository 는 있으나 KPA 에서 사용도 낮음. **DROP 여부는 다른 서비스(neture/glycopharm/k-cosmetics)와 함께 재평가 필요**.

### 3.3 DROP 대상 — § 4.3 에서 상세

> PlaylistShares / Analytics / MediaTags / playlist_items(legacy) — **모든 서비스에서 진입점 0건**. 코드·라우트·프론트 모두 참조 없음. 안전 제거 가능.

---

## 4. 코드 분석

### 4.1 KEEP — Reachable stack (건드리지 않음)

```
Route (signage.routes.ts)
  → Controller (controllers/media|playlist|schedule.controller.ts)
    → Service (services/media|playlist|schedule.service.ts)
      → Repository (repositories/media|playlist|schedule.repository.ts)
        → Entity (@o4o-apps/digital-signage-core/entities)
          → Table (signage_media | signage_playlists | signage_playlist_items | signage_schedules)
```

Frontend 소비자:
- KPA Society: `/operator/signage/hq-media`, `/operator/signage/hq-playlists`, `ContentHubPage`, `StoreSignagePage` (legacy Asset 탭)
- Neture/Glycopharm/K-Cosmetics: 자체 operator signage pages 존재

### 4.2 HOLD — Partial stack (usage 재확인 필요)

#### 4.2.1 Templates / TemplateZones

```
/templates/*, /templates/:id/zones/* (signage.routes.ts:125-153)
  → controllers/template.controller.ts
    → repositories/template.repository.ts
      → SignageTemplate, SignageTemplateZone entities
```

Frontend 소비자 (확인됨):
- `services/web-kpa-society/src/api/signageTemplate.ts` — API 클라이언트 존재
- `services/web-neture/src/pages/operator/signage/TemplatesPage.tsx` ✅
- `services/web-glycopharm/src/pages/operator/signage/TemplatesPage.tsx` ✅
- `services/web-k-cosmetics/src/pages/operator/signage/TemplatesPage.tsx` ✅

**KPA 에서는 TemplatesPage 화면 존재 여부 미확인** → 후속 WO 에서 KPA 특정 사용도 검증 필요.

#### 4.2.2 Content Blocks / Layout Presets

```
/content-blocks/*, /layout-presets/* (signage.routes.ts:157-185)
  → controllers/content.controller.ts
    → repositories/content.repository.ts
```

Frontend 소비자: **0건 확인됨**. 라우트는 있으나 어떤 서비스에서도 API 클라이언트가 호출하지 않음.
→ **잠재 DROP 후보** 이나, 본 KPA-scoped WO 에서 단독 판정하기에는 다른 서비스 영향 범위 확인 필요. HOLD.

#### 4.2.3 AI Generation Logs

```
POST /ai/generate (signage.routes.ts:201)
  → contentCtrl.generateWithAi
    → content.service.ts:143 generateWithAi()
      → content.service.ts:169 this.repository.createAiGenerationLog(...)
        → content.repository.ts:184 aiGenerationLogRepo.save(...)
```

- **write-only audit trail** (리드 경로 없음)
- Frontend 에서 AI 생성 기능을 실제 호출하는지 확인 필요
- 호출되지 않으면 write 경로 자체가 dead → table 도 DROP 가능
- 호출된다면 audit 보존 차원에서 KEEP

**판정 보류 (HOLD)**: `/ai/generate` 엔드포인트 호출 여부 확인 후 DROP/KEEP 재판정.

### 4.3 DROP — 진성 Dead stack

#### 4.3.1 Entity-only dead tables (signage_playlist_shares / signage_analytics / signage_media_tags)

- **Entity 파일은 `digital-signage-core` 패키지에 존재하고 DataSource 에 등록됨**
- 어떤 라우트·컨트롤러·서비스·repository 메소드도 읽기/쓰기 수행하지 않음
- 코드의 comment 에서만 언급 (FK cascade-note · loose-ref note)
- 테이블은 DB 에 존재하나 데이터 write 경로 없음

**근거 (코드 grep 결과):**

```
signage_playlist_shares:
  - packages/digital-signage-core/.../SignagePlaylistShare.entity.ts (정의)
  - apps/api-server/src/routes/signage/repositories/playlist.repository.ts:103 (주석만)
  - 2026011700001 migration (DDL 만)
  ⇒ 어떤 코드도 save/find/delete 수행 안 함

signage_analytics:
  - packages/digital-signage-core/.../SignageAnalytics.entity.ts (정의)
  - media.repository.ts:112 + playlist.repository.ts:110 (주석만)
  - 2026011700001 migration (DDL 만)
  ⇒ 어떤 코드도 save/find/delete 수행 안 함

signage_media_tags:
  - packages/digital-signage-core/.../SignageMediaTag.entity.ts (정의)
  - repositories/media.repository.ts (comment)
  - 2026011700001 migration (DDL 만)
  ⇒ 태그 생성/조회/삭제 경로 없음
```

#### 4.3.2 Local legacy entities (apps/api-server/src/entities/)

| 파일 | @Entity | 등록 | 참조처 | 판정 |
|------|---------|------|--------|------|
| `entities/SignageContent.ts` | `signage_contents` | ❌ | `PlaylistItem.ts` · `ContentUsageLog.ts` (FK only) | DROP |
| `entities/SignageDevice.ts` | `signage_devices` | ❌ | `services/SignageService.ts` | DROP |
| `entities/SignageSchedule.ts` | `signage_schedules` (conflict) | ❌ | `services/SignageService.ts` | DROP (digital-signage-core 로 대체됨) |
| `entities/SignageSlide.ts` | `signage_slides` | ❌ | `services/SignageService.ts` | DROP |
| `entities/SignagePlaylist.ts` | `signage_playlists` (conflict) | ❌ | `services/SignageService.ts` | DROP (digital-signage-core 로 대체됨) |
| `entities/PlaylistItem.ts` | `playlist_items` | ❌ | `ContentUsageLog.ts` (FK only) | DROP |
| `entities/ContentUsageLog.ts` | `content_usage_logs` | ❌ | `services/AnalyticsService.ts` (runtime throw 예정) | DROP |
| `entities/StorePlaylist.ts` | `store_playlists` (legacy) | ❌ | `PlaylistItem.ts` · `ContentUsageLog.ts` · 이미 `@deprecated` 마킹됨 (WO-KPA-SIGNAGE-STORE-PLAYLIST-ENTITY-UNIFICATION-V1) | DROP (선행 WO 완료 후) |

#### 4.3.3 Legacy service/controller (orphan chain)

| 파일 | 외부 호출 | 판정 |
|------|----------|------|
| `services/AnalyticsService.ts` | `PerformanceOptimizationService` + `PerformanceMonitoringInitializer` + `ScheduledReportingService` (3개 모두 자기 외 caller 없음) | DROP |
| `services/PerformanceOptimizationService.ts` | `PerformanceMonitoringInitializer` | DROP |
| `services/PerformanceMonitoringInitializer.ts` | 없음 (barrel export 만) | DROP |
| `services/ScheduledReportingService.ts` | 없음 (barrel export 만) | DROP |
| `services/SignageService.ts` | `controllers/SignageController.ts` | DROP |
| `controllers/SignageController.ts` | 없음 (register-routes 에서 import 안 됨) | DROP |

**체인 결론**: `SignageController` 도 `register-routes.ts` 에 등록되지 않음 → 6개 파일 모두 **runtime 불가달**. Orphan cluster.

---

## 5. Transitive dependency 분석

### 5.1 Chain A: Local legacy Signage cluster

```
SignageController (orphan, not in register-routes)
  └─ SignageService
      ├─ SignageDevice (entity, not registered)
      ├─ SignageSlide (entity, not registered)
      ├─ SignagePlaylist (local, not registered — shadowed)
      └─ SignageSchedule (local, not registered — shadowed)
```

**진입점**: 없음
**제거 영향**: 없음 (runtime 에서 호출 불가한 dead cluster)

### 5.2 Chain B: Analytics/Performance/Reporting cluster

```
PerformanceMonitoringInitializer (orphan, only barrel-exported)
  └─ PerformanceOptimizationService (orphan)
      └─ AnalyticsService (orphan)
          └─ ContentUsageLog (entity, not registered)
              ├─ PlaylistItem (entity, not registered)
              │   ├─ StorePlaylist (legacy, not registered)
              │   └─ SignageContent (entity, not registered)
              └─ StorePlaylist (legacy, not registered)

ScheduledReportingService (orphan, only barrel-exported)
  └─ AnalyticsService (같은 노드)
```

**진입점**: 없음 (`app.ts`/`startup.service.ts`/`register-routes.ts` 에서 초기화 없음)
**런타임 위험**: 만약 누군가 실수로 `performanceMonitoringInitializer.initialize()` 를 호출하면 `ContentUsageLog` 리포지토리 resolve 시 runtime throw ("No metadata for ContentUsageLog was found") — **침묵 폭탄** 상태.
**제거 영향**: 제거가 오히려 안전성 상승.

### 5.3 Chain C: KPA 통합 엔티티 (활성 — 건드리지 않음)

```
StorePlaylist (canonical, routes/kpa/entities/store-playlist.entity.ts) ✅ 등록
  └─ StorePlaylistItem (canonical) ✅ 등록

(Legacy StorePlaylist 는 @deprecated — § 4.3.2 로 DROP 예정)
```

### 5.4 Cross-service 영향 (CRITICAL)

- `signage_*` 테이블은 migration `2026011700001-CreateSignageCoreEntities.ts` 에서 **전 서비스 공용** 으로 생성됨
- `/api/signage/:serviceKey/*` 라우트도 serviceKey 를 path param 으로 받아 모든 서비스 공유
- **따라서 DB 테이블 DROP 은 KPA 단독 결정 불가** — neture/glycopharm/k-cosmetics 에서의 사용도 확인 필수

| 서비스 | signage_* 사용 확인 |
|--------|---------------------|
| kpa-society | ContentHubPage · HQMediaPage · HQPlaylistsPage · TemplatesPage(?) · StoreSignagePage legacy 탭 |
| neture | TemplatesPage · TemplateDetailPage ✅ |
| glycopharm | TemplatesPage · TemplateDetailPage ✅ |
| k-cosmetics | TemplatesPage · TemplateDetailPage ✅ |

→ `signage_templates` 는 최소 3개 서비스 이상에서 사용 → **DROP 불가**, KEEP 계속.
→ `signage_playlist_shares`, `signage_analytics`, `signage_media_tags` 는 **모든 서비스에서 진입점 0건** → DROP 가능.

---

## 6. 제거 대상 목록 (DROP)

### 6.1 테이블 (3건)

| 테이블 | 사유 | 선행 조건 |
|--------|------|----------|
| `signage_playlist_shares` | 코드 진입점 0건, migration DDL 만 존재 | DB row count = 0 확인 |
| `signage_analytics` | 코드 진입점 0건, migration DDL 만 존재 | DB row count = 0 확인 |
| `signage_media_tags` | 코드 진입점 0건, migration DDL 만 존재 | DB row count = 0 확인 |

### 6.2 패키지 엔티티 export (3건 · 테이블 DROP 과 연동)

- `packages/digital-signage-core/src/backend/entities/SignagePlaylistShare.entity.ts`
- `packages/digital-signage-core/src/backend/entities/SignageAnalytics.entity.ts`
- `packages/digital-signage-core/src/backend/entities/SignageMediaTag.entity.ts`
- 연동: `SignageCoreEntities` 배열에서 3개 제거

### 6.3 Local legacy entity 파일 (8건)

- `apps/api-server/src/entities/SignageContent.ts`
- `apps/api-server/src/entities/SignageDevice.ts`
- `apps/api-server/src/entities/SignageSchedule.ts`
- `apps/api-server/src/entities/SignageSlide.ts`
- `apps/api-server/src/entities/SignagePlaylist.ts`
- `apps/api-server/src/entities/PlaylistItem.ts`
- `apps/api-server/src/entities/ContentUsageLog.ts`
- `apps/api-server/src/entities/StorePlaylist.ts` (WO-KPA-SIGNAGE-STORE-PLAYLIST-ENTITY-UNIFICATION-V1 의 @deprecated 파일 — 다른 의존 파일과 함께 cascade DROP)

### 6.4 Legacy service/controller (6건)

- `apps/api-server/src/services/AnalyticsService.ts`
- `apps/api-server/src/services/PerformanceOptimizationService.ts`
- `apps/api-server/src/services/PerformanceMonitoringInitializer.ts`
- `apps/api-server/src/services/ScheduledReportingService.ts`
- `apps/api-server/src/services/SignageService.ts`
- `apps/api-server/src/controllers/SignageController.ts`
- 연동: `apps/api-server/src/services/index.ts` 의 barrel export 3줄 제거

### 6.5 Migration (1건 · optional)

- 신규 migration 작성하여 DROP TABLE 수행:
  - `DROP TABLE IF EXISTS signage_playlist_shares CASCADE;`
  - `DROP TABLE IF EXISTS signage_analytics CASCADE;`
  - `DROP TABLE IF EXISTS signage_media_tags CASCADE;`
- 기존 migration `2026011700001-CreateSignageCoreEntities.ts` 는 **절대 수정하지 않음** (히스토리 보존 원칙)

---

## 7. 보류 대상 (HOLD)

### 7.1 Cross-service 사용도 재평가 필요

| 테이블 | HOLD 사유 | 재평가 기준 |
|--------|----------|-----------|
| `signage_templates` | 최소 3개 서비스에서 TemplatesPage 사용 | KPA 에서 사용 여부 확인 후에도 KEEP 결정 우세 |
| `signage_template_zones` | `signage_templates` 에 FK 종속 | `signage_templates` 와 함께 결정 |
| `signage_content_blocks` | 라우트/repo 존재, Frontend 소비자 미확인 | 4개 서비스 전수 검증 후 결정 |
| `signage_layout_presets` | 라우트/repo 존재, Frontend 소비자 미확인 | 4개 서비스 전수 검증 후 결정 |

### 7.2 Audit log 성격

| 테이블 | HOLD 사유 |
|--------|----------|
| `signage_ai_generation_logs` | `/ai/generate` endpoint 에서 write-only 기록. AI 생성 기능의 실 사용 여부 확인 후 결정 (사용 시 KEEP, 미사용 시 DROP) |

---

## 8. 유지 대상 (KEEP)

| 테이블 | 이유 |
|--------|------|
| `signage_media` | `/media/*`, `/hq/media/*` 라우트 · KPA HQ 콘텐츠 배포 파이프라인 |
| `signage_playlists` | `/playlists/*`, `/hq/playlists/*` 라우트 · KPA HQ 배포 |
| `signage_playlist_items` | 위 라우트 아래 아이템 관리 · 핵심 구조 |
| `signage_schedules` | `/schedules/*`, `/active-content` — 스케줄 해석 경로 |
| `store_playlists` | KPA 매장 재생 엔진 (WO-KPA-SIGNAGE-STORE-PLAYLIST-ENTITY-UNIFICATION-V1 canonical) |
| `store_playlist_items` | 매장 재생 스냅샷 구조 |
| `media_assets` | 공개 라이브러리 (범위 외) |
| `signage_categories` | 카테고리 참조 (범위 외) |

> 본 WO 의 제거 대상에서 KEEP 테이블은 절대 건드리지 않는다.

---

## 9. 제거 실행 계획

### 9.1 단계 구조

Phase 단위로 분리하여, 각 Phase 가 독립적으로 배포 가능하고 롤백 가능하도록 설계한다.

#### **Phase 0 — 선행 조건 검증 (본 WO 는 수행하지 않음)**

| # | 작업 | 담당 |
|---|------|------|
| 0.1 | 프로덕션 DB 에서 `SELECT count(*) FROM signage_playlist_shares` / `signage_analytics` / `signage_media_tags` 실행 → 모두 0 인지 확인 | 후속 WO |
| 0.2 | `/api/signage/*/ai/generate` 호출 빈도 확인 (Cloud Run 로그 · 최근 30일) | 후속 WO |
| 0.3 | KPA TemplatesPage 화면 존재 여부 확인 | 후속 WO |

#### **Phase 1 — Local legacy entity/service 제거 (KPA 독립, 영향 범위 가장 작음)**

| # | 작업 | 파일 |
|---|------|------|
| 1.1 | `SignageController.ts` 삭제 | `apps/api-server/src/controllers/SignageController.ts` |
| 1.2 | `SignageService.ts` 삭제 | `apps/api-server/src/services/SignageService.ts` |
| 1.3 | `SignageDevice.ts`, `SignageSlide.ts`, `SignagePlaylist.ts`(local), `SignageSchedule.ts`(local) 삭제 | `apps/api-server/src/entities/` |
| 1.4 | `SignageContent.ts`, `PlaylistItem.ts`, `ContentUsageLog.ts` 삭제 | `apps/api-server/src/entities/` |
| 1.5 | `StorePlaylist.ts`(legacy) 삭제 | `apps/api-server/src/entities/StorePlaylist.ts` |
| 1.6 | `AnalyticsService.ts`, `PerformanceOptimizationService.ts`, `PerformanceMonitoringInitializer.ts`, `ScheduledReportingService.ts` 삭제 | `apps/api-server/src/services/` |
| 1.7 | `services/index.ts` 의 barrel export 4줄 제거 | — |
| 1.8 | `connection.ts:108` 의 "SignageDevice, SignageSlide replaced by digital-signage-core entities" 주석 갱신 | — |
| 1.9 | TypeScript `tsc -b --noEmit` 검증 — 0 errors | — |

**영향 범위**: runtime 진입점 없는 파일들만 대상 → **기능적 영향 0**
**롤백**: git revert 만으로 복원 가능 (DB 무관)

#### **Phase 2 — 진성 DEAD 엔티티 export 제거 (패키지 레벨)**

| # | 작업 | 파일 |
|---|------|------|
| 2.1 | `packages/digital-signage-core/src/backend/entities/index.ts` (있다면) 에서 `SignagePlaylistShare`, `SignageAnalytics`, `SignageMediaTag` export 제거 | — |
| 2.2 | `SignageCoreEntities` 배열에서 3개 제거 | `packages/digital-signage-core/...` |
| 2.3 | Entity 파일 3개 삭제 | `packages/digital-signage-core/src/backend/entities/SignagePlaylistShare.entity.ts` 등 |
| 2.4 | `media.repository.ts`, `playlist.repository.ts` 의 comment 참조 정리 (선택적) | — |
| 2.5 | `tsc -b --noEmit` + build 검증 | — |

**영향 범위**: DataSource 에서 3개 엔티티 제거 → 테이블 자체는 DB 에 남아있으나 TypeORM 스키마 동기화 대상에서 빠짐
**롤백**: git revert

#### **Phase 3 — DB 테이블 DROP migration**

| # | 작업 |
|---|------|
| 3.1 | 새 migration 파일 작성: `YYYYMMDDHHMM-DropSignageDeadTables.ts` |
| 3.2 | `up()` 에서 `DROP TABLE IF EXISTS signage_playlist_shares CASCADE;` 등 3문장 + SAVEPOINT 패턴 |
| 3.3 | `down()` 에서 2026011700001 migration 의 CREATE 문을 복제하여 복원 DDL 제공 (rollback 안전망) |
| 3.4 | main 배포 → CI/CD 가 migration 실행 → Cloud SQL 에서 테이블 3개 DROP |
| 3.5 | 프로덕션 검증: `\d signage_*` 로 3개 테이블 사라졌는지 확인 |

**영향 범위**: DB schema 변경
**롤백**: `down()` migration 실행 (CREATE TABLE 복원 후 데이터는 빈 상태)

#### **Phase 4 — Cleanup (선택적)**

| # | 작업 |
|---|------|
| 4.1 | `media.repository.ts`, `playlist.repository.ts` 의 comment-only 참조 제거 |
| 4.2 | 본 WO 문서를 deprecated 표시 후 retire |

### 9.2 제거 순서 (FK 기준)

```
Phase 1 (코드만):
  Controllers → Services → Entities (orphan cluster 는 순서 무관)

Phase 2 (패키지 + DataSource):
  Export 제거 → SignageCoreEntities 수정 → 파일 삭제

Phase 3 (DB):
  DROP signage_media_tags (FK to signage_media — 자식)
  DROP signage_playlist_shares (FK to signage_playlists — 자식)
  DROP signage_analytics (FK 없음 — 독립)
```

- FK cascade 관계 기반 **자식 → 부모** 순으로 DROP
- `CASCADE` 옵션은 안전망 차원에서 붙이되, 실제로는 3 테이블 모두 다른 테이블이 참조하지 않으므로 영향 없음

### 9.3 리스크 매트릭스

| # | 리스크 | 확률 | 영향 | 완화책 |
|---|--------|------|------|--------|
| R1 | `signage_*` 테이블 중 KEEP 대상을 실수로 DROP | 매우 낮음 | 매우 높음 | migration 파일에 DROP 대상 테이블 3개만 명시적 열거, 다른 테이블은 언급조차 안 함 |
| R2 | Phase 3 migration 실행 후 프론트가 해당 엔드포인트 호출 → 500 | 매우 낮음 | 낮음 | Phase 0.1 에서 코드 전수 검증 완료. 엔드포인트 자체 없음 |
| R3 | 로컬 legacy entity 삭제 후 미처 발견 못한 import 가 존재해 빌드 깨짐 | 낮음 | 중간 | 각 Phase 마다 `tsc -b --noEmit` 검증 필수. CI 에서 Docker build 까지 완주 확인 |
| R4 | HOLD 판정 테이블 (Templates 등) 을 성급히 DROP | 낮음 | 높음 | 본 문서의 HOLD 분류 준수. 재평가 WO 생성 후에만 후속 판정 |
| R5 | AI generation log 사용 중인데 DROP | 낮음 | 중간 | Phase 0.2 로그 확인 선행. 사용 시 KEEP 유지 |
| R6 | 다른 서비스(네처/글라이코팜/K-화장품) 운영 중인 operator signage 화면 영향 | 중간 | 높음 | DROP 대상 3 테이블은 어떤 서비스도 사용 안 함 (code grep 완료). HOLD 대상은 4개 서비스 전수 검증 후 판정 |

---

## 10. 롤백 전략

### 10.1 Phase 1 롤백 (코드 단위)

- `git revert <commit>` 으로 전체 복구
- DB 영향 없음 → 즉시 복구 가능
- 검증: `tsc -b --noEmit` 통과 확인

### 10.2 Phase 2 롤백 (패키지 단위)

- `git revert <commit>` 으로 entity 파일·배열 복원
- DataSource 에 다시 엔티티 등록됨 → 테이블 스키마와 정합 확인
- 검증: `npm run build` + API 서버 기동 테스트

### 10.3 Phase 3 롤백 (DB 단위) ⚠️

- migration `down()` 실행으로 CREATE TABLE 복원
- **데이터 복원은 불가** (DROP 시점에서 이미 row 소실)
- 사전 조건: Phase 0.1 에서 row count = 0 확인됨 → 복원할 데이터가 없음
- 백업 권장: Cloud SQL 자동 백업이 일일 실행되므로, 장애 발생 시 PITR (Point-in-Time Recovery) 이용 가능
- 절차:
  ```bash
  # 1. Migration 롤백 (rollback 방향)
  AppDataSource.undoLastMigration()

  # 2. 필요 시 Cloud SQL PITR 로 DROP 직전 시점 복구
  gcloud sql backups restore ...
  ```

### 10.4 긴급 복구 절차

1. 프론트 화면에서 error (signage_* 관련) 발생 시
2. `gcloud logging read "resource.type=cloud_run_revision AND textPayload:\"signage_\""` 로 에러 확인
3. Phase 별로 역순 revert + redeploy
4. 확인: `/health/database` · `/api/signage/kpa-society/playlists` · `/public/signage` 3개 엔드포인트 200 응답

---

## 11. 최종 판정

### 11.1 전체 판정: **PARTIAL**

본 조사 결과:
- ✅ **제거 계획이 명확히 정의됨** (Phase 1~3 · 파일·순서·롤백 모두 포함)
- ✅ **진성 DEAD 확정** (3 테이블 · 8 local entities · 6 legacy services)
- ⚠️ **HOLD 대상 4건** 은 KPA scope 밖 재평가 필요 (cross-service 검증)
- ⚠️ **Phase 0 선행 검증** 이 본 WO 범위 밖 (DB row count · AI 생성 사용도 · KPA TemplatesPage 확인)

### 11.2 완료 조건 충족 확인

| 완료 조건 | 충족 |
|----------|------|
| 모든 signage_* 테이블이 분류됨 (12 + 1 legacy) | ✅ |
| Transitive dependency 가 분석됨 (Chain A/B/C) | ✅ |
| DROP 대상이 명확히 정의됨 (3 테이블 + 8 entity + 6 service) | ✅ |
| 제거 순서가 정의됨 (Phase 1→2→3, FK 기준) | ✅ |
| 롤백 전략이 포함됨 (§ 10) | ✅ |

### 11.3 WO §11 중단 조건 점검

| 중단 조건 | 현 상태 | 판정 |
|----------|--------|------|
| 실 운영 기능이 DROP 대상 테이블에 의존 | DROP 3 테이블 모두 진입점 0건 | 미해당 |
| API 계약 변경 없이는 제거 불가 | DROP 대상은 API 가 아예 없음 | 미해당 |
| DB 구조 변경이 광범위 | 3 테이블만 DROP, 나머지는 보존 | 미해당 |
| Core 영역 영향 | digital-signage-core 패키지 일부 entity 만 제거, core 아키텍처 무관 | 미해당 |

→ 중단 조건 0건. 본 계획대로 후속 WO 에서 단계적 실행 가능.

### 11.4 후속 WO 제안

| WO 이름 후보 | 내용 |
|--------------|------|
| WO-KPA-SIGNAGE-DEAD-CODE-PHASE0-PRECHECK-V1 | DB row count 0 확인 + AI generation 사용도 확인 + KPA TemplatesPage 확인 |
| WO-KPA-SIGNAGE-DEAD-CODE-PHASE1-LOCAL-ENTITIES-V1 | 로컬 legacy entity/service 제거 (코드만, DB 무관) |
| WO-KPA-SIGNAGE-DEAD-CODE-PHASE2-PACKAGE-PRUNE-V1 | `digital-signage-core` 패키지에서 3 엔티티 export 제거 |
| WO-KPA-SIGNAGE-DEAD-CODE-PHASE3-DB-DROP-V1 | 3 테이블 DROP migration 작성·배포·검증 |
| WO-KPA-SIGNAGE-TEMPLATES-USAGE-ASSESSMENT-V1 | HOLD 대상 Templates/ContentBlocks/LayoutPresets 의 KPA 사용도 재평가 |

---

## 12. 요약 카드

```
전체 signage 관련 테이블/엔티티: 20+ 건

KEEP (건드리지 않음):              8 건 (4 table + 2 store table + 2 support)
HOLD (재평가 필요, 보류):            5 건 (4 table + 1 audit log)
DROP (제거 확정, 진성 dead):       17 건 (3 table + 8 local entity + 6 legacy service)

Phase 1 — 로컬 파일만:           14 파일
Phase 2 — 패키지 entity:           3 파일
Phase 3 — DB migration:            1 신규 migration (3 DROP TABLE)

총 런타임 영향 (DROP 후):            0 (모든 제거 대상은 진입점 없음)
```

---

*작성자: Claude (Opus 4.6)*
*작성 일자: 2026-04-16*
*조사 근거: 실제 코드 grep + Explore agent 조사 + 4개 서비스 Frontend 교차 검증*
*범위: KPA Society signage 도메인 dead code 제거 계획 — **설계 전용**, 실행 없음*
