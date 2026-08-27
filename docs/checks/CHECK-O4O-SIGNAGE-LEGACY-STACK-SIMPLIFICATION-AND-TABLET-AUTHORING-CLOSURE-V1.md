# CHECK-O4O-SIGNAGE-LEGACY-STACK-SIMPLIFICATION-AND-TABLET-AUTHORING-CLOSURE-V1

> **WO**: `WO-O4O-SIGNAGE-LEGACY-STACK-SIMPLIFICATION-AND-TABLET-AUTHORING-CLOSURE-V1` (§1–§22)
> **작업일**: 2026-08-27
> **기준점**: `origin/main = e485baba96e9d9675a30a6d1a72031dfac495b22` (§1 — 최신 origin/main)
> **worktree**: `C:\tmp\o4o-integration` / branch `work/signage-legacy-stack-simplification-v2`
> **선행 baseline**: [`O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1`](../baseline/O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md)

---

## 0. 결론 요약

- **§2 census 미조사 0.** 1차 census 는 admin-dashboard 범위에 한정돼 있어 **오판이 있었고, 전 저장소 sweep 으로 교정했다** (§2-0).
- **§9 `signage_forced_content` = `ACTIVE`** — baseline 의 "DEFER · 소비처 미추적" 을 뒤집는다. canonical Tablet idle resolver 가 실제로 JOIN 한다 (§8).
- **§19 retirement 실행 완료** — 파일 **103개 삭제**, endpoint **67 → 55**, config **10 파일 수정**. schema DROP 0 / production data delete 0.
- **§21 검증 통과** — lint **69 → 63** (build 전 실행), tsc 4개 앱 clean, §17 guard 42/42, admin boundary 3/3.
- **§3 프로덕션 SELECT 5/7 미측정** → `BLOCKED_ENV`. 단 판정은 row count 가 아니라 **코드 consumer** 근거이므로 흔들리지 않는다 (§3-2).
- `createCampaignForcedContent()` 의 `target_surface` 누락은 **이번 작업에 섞지 않았다** — 별도 기능 결함 (§8-1).

---

## 1. 기준점 (§1)

| 항목 | 값 |
|---|---|
| 기준 `origin/main` | `e485baba96e9d9675a30a6d1a72031dfac495b22` |
| 작업 branch | `work/signage-legacy-stack-simplification-v2` (최신 origin/main 에서 신규 생성) |
| 이전 기준 `449568b0` → `e485baba` delta | 32 파일 (cart / glycopharm / audit script) — **삭제 후보와 교집합 0** |
| 다른 세션 파일 수정·삭제·stash | **0건** |
| `git add .` | **미사용** (path-specific stage) |
| 임의 rebase | **미수행** — clean worktree 에서 새 branch 생성으로 정렬 |

---

## 2. 축 B / Signage legacy 전수 census (§2)

판정 기준은 §4 단일 기준: **"StoreTablet + ScreenSet 경로로 YouTube/Vimeo 를 재생하는 데 실제로 필요한가?"**

### 2-0. 1차 census 의 오판과 교정 (중요)

1차 census 는 소비처를 `apps/admin-dashboard` 에서만 찾았다. 전 저장소 sweep 결과 **3개 surface 를 놓쳤음이 드러났다.**

| 놓친 surface | 실체 | 교정된 영향 |
|---|---|---|
| `packages/operator-core-ui/src/modules/signage-hq/**` (11 파일) | glycopharm · k-cosmetics · kpa-society **3개 배포 서비스에서 라우팅됨** (`App.tsx` → `signage/templates`) | `/templates` · `/media` · `/playlists` · `/hq/*` 가 **live 소비처를 가진다** → `DEFER`/`RETIRE` 가 아니라 **KEEP** |
| `apps/admin-dashboard/src/pages/digital-signage/{operations,media,display,schedule,action}/**` (19 파일) | `DigitalSignageRouter` 에서 **라우팅됨** — 그러나 전부 `lib/api/digitalSignage.ts` (`API_BASE='/signage'`) 사용 | 존재하지 않는 4번째 축. 프로덕션 실측 `/api/v1/signage/*` → **404**. 신규 RETIRE 후보 (§12-2) |
| `apps/admin-dashboard/src/pages/digital-signage/v2/MonitoringDashboard.tsx` | 라우팅되지만 `/api/signage/monitoring/*` 호출 — `monitoring` 은 route family 에도, `validateServiceKey` allowlist 에도 없다 | 신규 RETIRE 후보 (§12-2) |

**"라우팅되어 있다"는 사실만으로 live 로 판정하지 않았다.** base path 를 끝까지 해석해 mount 존재까지 확인했다.

### 2-1. 인증 endpoint — `signage.routes.ts` (교정 후 최종)

mount: `apps/api-server/src/bootstrap/register-routes.ts:1040` → `app.use('/api/signage/:serviceKey', signageRoutes)`
전 endpoint 가 `router.use(requireAuth); router.use(validateServiceKey);` 뒤에 있다.
signage mount 는 저장소 전체에서 **2개뿐**이다 (`/api/signage/:serviceKey`, `/api/signage/:serviceKey/public`).

| family | 개수 | table / entity | live consumer | 프로덕션 행수 | canonical 중복 | 판정 |
|---|---|---|---|---|---|---|
| `/templates` (+zones) | 10 | signage template tables | **`signage-hq/SignageTemplatesPage`·`SignageTemplateDetailPage` — 3서비스 라우팅** | 4 (미재산출) | 무관 | **KEEP** ← 교정 |
| `/media` + `/media/library` | 6 | `signage_media` | **`signage-hq/HqMediaPage`·`HqMediaDetailPage`** | **5** (재산출) | 중복 — canonical 은 직접 URL | **KEEP** ← 교정 |
| `/playlists` + `/playlists/:id/items*` | 11 | `signage_playlists`·`signage_playlist_items` | **`signage-hq/HqPlaylist{s,Create,Detail}Page`** | playlists **1** / items 3 | 중복 | **KEEP** ← 교정 |
| `/hq/{playlists,media,forced-content}` | 13 | `signage_forced_content` 외 | **`signage-hq/ForcedContentPage`** + canonical idle resolver (§8) | forced-content 2 | forced-content 를 canonical 이 **소비** | **KEEP** |
| `/global/*` | 4 | 전역 콘텐츠 | `v2/ContentHub` (`globalContentApi`) — 라우팅됨 | — | 무관 | **KEEP** |
| `/community/{media,playlists}` | 4 | `signage_media` (`source: community`) | `web-kpa-society/pages/signage/ContentHubPage.tsx` | 5 (전부 community) | 축 B 전용 | **KEEP** ← 교정 |
| `/schedules` + `/schedules/calendar` | 6 | `signage_schedules` | `web-kpa-society/api/signageSchedule.ts` 만 남음 (v2/ScheduleCalendar 삭제) | **0** (미재산출) | 무관 | **DEFER** — route 유지, 소비 축소 |
| `/active-content` | 1 | `signage_schedules` → `store_playlist_items` | `services/signage-player-web/ScheduleResolver.ts` | schedules 0 → **항상 empty** | 무관 | **동결** (§7) |
| `/content-blocks` | 5 | content block tables | **0** (v2/ContentBlockLibrary 가 유일했음) | 0 | 무관 | **RETIRE — 실행됨** |
| `/layout-presets` | 5 | layout preset table | **0** (v2/LayoutPresetList 가 유일했음) | 0 | 무관 | **RETIRE — 실행됨** |
| `/upload/presigned` | 1 | — | **0** | — | 무관 | **RETIRE — 실행됨** |
| `/ai/generate` | 1 | — | **0** (라우팅 안 된 `AiContentGenerationModal` 이 유일했음) | 0 | 무관 | **RETIRE — 실행됨** |

**endpoint 67 → 55** (12개 제거).

### 2-2. 공개 endpoint — `signage-public.routes.ts` (5개)

mount: `register-routes.ts:1031` → `/api/signage/:serviceKey/public`

| endpoint | consumer | 판정 |
|---|---|---|
| `GET /media` · `GET /playlists` · `GET /media/:id` · `GET /playlists/:id` | 없음 (이번 §3 재산출에만 사용) | **DEFER** — 유일한 무인증 read 창구 |
| `POST /playback/log` (`signage-public.routes.ts:310`) | `apps/digital-signage-agent` — **Cloud Run 미배포** | **DEFER** — `signage_playback_logs` 0행의 직접 원인 |

### 2-3. UI / package census (최종)

| 대상 | 상태 | 판정 |
|---|---|---|
| `packages/operator-core-ui/src/modules/signage-hq/**` (11) | 3서비스 라우팅 | **KEEP** ← 교정 |
| `apps/admin-dashboard/.../v2/ContentHub.tsx` | 라우팅 + `/global/*` live | **KEEP** |
| `apps/admin-dashboard/src/lib/api/signageV2.ts` | ContentHub 가 사용 | **KEEP** (dead section 4개는 제거, §12-1) |
| `apps/admin-dashboard/.../v2/` 나머지 **29 파일** | 라우터가 `RemovedRouteRedirect` 로 대체 | **RETIRE — 실행됨** |
| `apps/api-server/src/routes/signage/extensions/**` (**42**) | import 0 · mount 0 · entity 등록 0 | **RETIRE — 실행됨** |
| `packages/@o4o-apps/signage` (**18**) | 소스 import 0, alias/build 참조만 6곳 | **RETIRE — 실행됨** |
| `packages/digital-signage-contract` + `apps/api-server/packages/digital-signage-contract` | dep 선언 **0** | **RETIRE — 실행됨** |
| `web-kpa-society` `AiContentGenerationModal.tsx` · `api/signageAi.ts` | 라우팅 0 (참조는 주석 1건) | **RETIRE — 실행됨** |
| `packages/@o4o-apps/digital-signage-core` | entity 제공 — live | **KEEP** |
| `.../digital-signage-core/src/backend/{controllers,lifecycle,manifest}` | consumer 0 | **DEFER** — 이번 batch 범위 외 |
| `apps/admin-dashboard/.../digital-signage/{operations,media,display,schedule,action}` (19) | 라우팅되지만 `/api/v1/signage/*` = **404** | **RETIRE 후보 (신규)** — §12-2 |
| `apps/admin-dashboard/.../v2/MonitoringDashboard.tsx` | 라우팅되지만 `/api/signage/monitoring/*` mount 없음 | **RETIRE 후보 (신규)** — §12-2 |
| `apps/admin-dashboard/.../digital-signage/admin/**` (4) | 라우팅, API 호출 없음 (정적) | **DEFER** — 축 B 무관 |
| `apps/digital-signage-agent` | Cloud Run 미배포 | **DEFER** |

**미조사 0** (§22).

---

## 3. 프로덕션 실측 (§3)

### 3-1. 재산출한 값 (무인증 공개 endpoint · read-only)

| 테이블 | 이번 재산출 | baseline(2026-08-26) |
|---|---|---|
| `signage_media` | **5** (전부 YouTube · 전부 `kpa-society` · 전부 `source: community`) | 7 |
| `signage_playlists` | **1** ("테스트 플레이리스트" · items 3) | 1 |

> 공개 endpoint 는 draft/archived 를 제외하므로 **게시본 기준 하한**이다.

### 3-2. `BLOCKED_ENV` — 재산출 실패 5개

`signage_playlist_items` · `signage_schedules` · `signage_forced_content` · `signage_playback_logs` · store playlist 계열.

차단 사유:
1. `gcloud secrets versions access latest --secret=o4o-db-password` → **auto mode classifier 거부**
2. `gcloud run services describe o4o-core-api ... env` → **auto mode classifier 거부**
3. Cloud SQL `o4o-platform-db` 의 `authorizedNetworks` **비어 있음** (작업 IP `124.194.156.36` 미허용)

**우회 credential 생성·self-grant 를 시도하지 않았다** (§15).

**판정 유지 근거**: 이번 WO 의 판정은 전부 **코드 consumer** 로 내렸다. 특히
`signage_forced_content = ACTIVE` 는 row count 가 아니라 **canonical Tablet idle resolver 의 실제 JOIN** 으로 확정됐고,
RETIRE 4건은 **소비처 0** 이라는 정적 사실로 확정됐다. row count 는 어느 판정도 뒤집지 않는다.

---

## 4. §5 — `signage_media` 는 canonical 에 필요한가

**canonical 재생에는 필요하지 않다.**

canonical 경로는 `store_tablet_screen_blocks.config` 의
`{ source: 'custom_media', items: [{ mediaType: 'youtube', url: '...' }] }` 에서 **URL 을 직접** 읽는다.
`resolveIdleMediaItems()` (`apps/api-server/src/routes/platform/store-tablet-idle-block.ts`) 는
`signage_media` 를 **조회하지 않는다**.

단 `/media` 계열은 `signage-hq/HqMediaPage` 라는 **live 저작 UI** 를 가진다 (§2-0 교정).
→ **KEEP**. canonical 로 승격하지 않고, 축 B 자체 저작 기능으로만 남긴다. 테이블·행 보존.

---

## 5. §6 — `idleCfg.items[0]` 단일 URL 구조

- 재생기: `packages/tablet-kiosk-core/src/TabletKioskPage.tsx:1262`
  `const first = items && items.length > 0 ? items[0] : null;`
- 편집기: `packages/tablet-screen-set-editor/src/index.tsx:1135`
  `const idleUrl: string = idleCfg.source === 'custom_media' && Array.isArray(idleCfg.items) ? (idleCfg.items[0]?.url ?? '') : '';`

`resolveIdleMediaItems()` 는 배열 전체를 반환하지만 **소비 측이 첫 항목만 쓴다.**
→ **단일 영상이 현재 제품 요구다. playlist 를 억지로 canonical 로 만들지 않았다** (§6).
다중 URL 이 필요해지면 새 테이블이 아니라 이 `items` 배열을 확장한다 (baseline §3-2).

---

## 6. §7 — schedules

`signage_schedules` **0행**. `v2/ScheduleCalendar` 삭제 후 남은 소비처는
`services/web-kpa-society/src/api/signageSchedule.ts` 하나다.
"향후 시간대 편성이 필요할 수 있다" 는 추측은 KEEP 근거로 쓰지 않았다 (§7).
→ **DEFER** (route 유지, 소비 축소). 테이블은 §19 에 따라 보존.

---

## 7. §8 — `/api/signage/:serviceKey/active-content` 동결

`apps/api-server/src/routes/signage/services/schedule.service.ts:143-202` 의 `resolveActiveContent()` 는
전적으로 `findActiveSchedule` (over `signage_schedules`) 에 의존한다. **0행이므로 항상 empty 를 반환한다.**
`schedule.storePlaylistId` 가 있을 때만 `store_playlist_items JOIN o4o_asset_snapshots` 로 내려간다.
**forced content 를 읽지 않는다.**

프로덕션 실측: `GET /api/signage/kpa-society/active-content` → **401**.
소비처는 `services/signage-player-web/src/services/ScheduleResolver.ts` 하나뿐이다.

→ **이 경로를 고쳐서 새로운 canonical player 로 만들지 않았다** (§8). 동결.

---

## 8. §9 — `signage_forced_content` 소비처 추적 → **`ACTIVE`**

**baseline 의 "DEFER · 소비처 미추적" 판정을 뒤집는다. UNKNOWN 0.**

소비처 정본: `apps/api-server/src/routes/platform/store-public/store-public-tablet-idle-resolve.ts`

```sql
SELECT fc.id, fc.video_url AS "videoUrl", fc.source_type AS "sourceType",
       fc.tablet_duration_seconds AS "tabletDurationSeconds"
FROM store_tablet_operator_idle_selections s
JOIN signage_forced_content fc ON fc.id = s.forced_content_id
WHERE s.tablet_id = $1 AND s.cleared_at IS NULL
  AND fc.service_key = ANY($2) AND fc.is_active = true AND fc.deleted_at IS NULL
  AND fc.target_surface IN ('tablet_idle','both')
  AND NOW() BETWEEN fc.start_at AND fc.end_at
LIMIT 1
```

선택이 없으면 `tabletId:YYYY-MM-DD` 결정적 해시로 후보 전체에서 하나를 고르는 fallback 이 이어진다.

- 연결 migration: `apps/api-server/src/database/migrations/20261203000000-AddTabletIdleToForcedContentAndSelections.ts`
  — `signage_forced_content` 에 `target_surface VARCHAR(20) NOT NULL DEFAULT 'signage'` · `tablet_duration_seconds` 추가,
  `store_tablet_operator_idle_selections` 신설 (`uq_stois_active_per_tablet` partial unique on `tablet_id WHERE cleared_at IS NULL`).
- 호출 지점: canonical 공개 태블릿 경로 `GET /api/v1/stores/:slug/tablet/idle` · `.../screen`.
- 저작 UI: `packages/operator-core-ui/src/modules/signage-hq/ForcedContentPage.tsx` (3서비스 라우팅).

→ **판정 `ACTIVE`. `/hq/forced-content` 는 KEEP. 이 경로는 삭제하지 않았다.**

### 8-1. 별도 결함 — 이번 작업에 섞지 않음

`apps/api-server/src/routes/kpa/services/content-approval.service.ts:244-292` 의
`createCampaignForcedContent()` 는 `signage_forced_content` INSERT 시
`media_id` · `campaign_request_id` 는 넣지만 **`target_surface` 를 생략한다.**
→ DEFAULT `'signage'` 적용 → **캠페인 승인분이 태블릿 idle 에 영원히 도달하지 못한다.**

`signage_forced_content` 가 canonical 경로에서 ACTIVE 로 확정됐으므로 이 결함의 우선순위는 높다.
그러나 **감축 작업과 섞지 않고 별도 WO 로 남긴다.** 이번 커밋에 해당 파일 수정 없음.

---

## 9. §10 · §12 · §14 · §17 · §18 — 하지 않은 것 (준수 확인)

| 조항 | 내용 | 결과 |
|---|---|---|
| §10 | Channel 축 heartbeat/playback endpoint 재생성 금지 | **생성 0** |
| §12 | Channel/Signage playlist 우회 계층 신설 금지 | **신설 0** |
| §14 | 새 auth 구조 신설 금지 | **신설 0** |
| §17 | Channel dependency 재생성 시 FAIL | **재생성 0** — `channels-stack-retirement.spec.ts` **42/42 PASS** |
| §18 | `cms_content_slots` · CMS serviceKey 경계 · `organization_channels` · `external_channel_product_links` 미접촉 | **미접촉** (guard spec 이 확인) |
| §19 | table DROP / 대규모 schema migration / production data delete 금지 | **0 / 0 / 0** |

### 9-1. §11 — dead UI 와 테스트의 관계

`apps/admin-dashboard/src/tests/admin-operation-boundary.test.ts` 의 `KNOWN` 배열은
`'pages/digital-signage/v2/ChannelEditor.tsx'` · `'...ChannelList.tsx'` 를 포함하지만,
이는 **prefix 중복 명명 관용 목록**이며 assertion 은

```ts
expect(offenders().filter((f) => !KNOWN.includes(f))).toEqual([]);
```

이다. 삭제 후 **실제 실행 결과 3/3 PASS** 로 확인했다.
→ **"테스트가 참조한다"는 이유로 runtime 기능으로 간주하지 않았다** (§11).

`apps/api-server/src/__tests__/channels-stack-retirement.spec.ts:48` 이 지키는 경로는
`apps/admin-dashboard/src/pages/cms/channels/ChannelList.tsx` 로 **다른 파일**이다. 충돌 없음.

---

## 10. §13 · §15 · §16 — 태블릿 저작 흐름 검증

### 10-1. 저작 API (인증)

`apps/api-server/src/routes/platform/store-tablet.routes.ts`, mount `/api/v1/store`. screen-set 블록 `1378–2306`:

```
GET/POST      /screen-sets            PATCH/DELETE /screen-sets/:id
PUT           /screen-sets/:id/blocks         ← idle_media 저장 지점
POST          /screen-sets/preview
GET           /screen-set-hub/templates (+ /:id, /:id/import, /supplier-templates*)
POST/DELETE   /tablets/:id/current-screen-set ← canonical 지정 지점
GET/POST/DELETE/PATCH /tablets/:id/screen-sets*
```

프로덕션 실측(무인증): `GET /api/v1/store/screen-sets` → **401**, `GET /api/v1/store/tablets` → **401**
= 라우트 존재 + 인증 강제 정상. **이번 작업에서 이 파일은 수정하지 않았다.**

### 10-2. 재생 경로 (무인증) — 축 B 와의 결정적 차이

`GET /api/v1/stores/:slug/tablet/{idle,screen,settings}`
(`apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts:379,441,486`)
프로덕션 실측: 미존재 slug 호출 시 **`STORE_NOT_FOUND` 응답까지 도달** — 즉 **401 이 아니다.**

| 축 | 무인증 재생 |
|---|---|
| 축 C (canonical) | **가능** — resolver 까지 도달 |
| 축 B (`/api/signage/*`) | **불가** — 전 endpoint **401** |

**이것이 축 C 가 실사용 경로인 구조적 이유다** (baseline §5-1 결함 2 재확인).

### 10-3. §15 write smoke — `AUTHORING_SMOKE_BLOCKED_AUTH`

§15 는 "기존 테스트 계정/테스트 매장으로 명확히 한정되고 완전 원복 가능할 때만" write smoke 를 허용한다.
사용 가능한 기존 테스트 credential 이 확인되지 않았고, §15 는 **우회 credential 생성·self-grant 를 금지**한다.
→ **`AUTHORING_SMOKE_BLOCKED_AUTH`**. write 시도 0건.

### 10-4. §16 — idle 판정 계약

`IDLE_TIMEOUT_MS = 60_000` 계약 유지.
**"3~5초 대기 후 iframe 0" 을 실패/성공으로 판정하지 않았다.** iframe 기반 판정 자체를 수행하지 않았다.

---

## 11. §20 — raw-source consumer census (삭제 파일 전체)

삭제한 103 파일 전체 파일명에 대해 import · 문자열 · `readFileSync` 기반 spec · package.json dep 를 재검색했다.

| 삭제 대상 | import | raw-source spec | dep / alias / CI |
|---|---|---|---|
| `routes/signage/extensions/**` (42) | 0 | 0 | — |
| admin `digital-signage/v2/**` (29) | 0 | `admin-operation-boundary.test` 의 **KNOWN 관용 목록**뿐 → 실행 3/3 PASS | — |
| `digital-signage-contract` × 2 | 0 | 0 | 0 |
| `packages/@o4o-apps/signage` (18) | 0 | 0 | **6곳** — 전부 제거 (§12-1) |
| `AiContentGenerationModal.tsx` · `signageAi.ts` | 0 (참조는 주석 1건) | 0 | — |

추가로 수정한 config 를 검사하는 spec 도 확인했다:
`deployment-domain-retirement.spec.ts` · `ecommerce-core-and-commerce-residue-retirement.spec.ts` (deploy-api.yml / build:deps) →
전체 Jest 결과로 확인 (§13).

**§20 완료.**

---

## 12. §19 retirement 실행 결과

§19 준수: **route / menu / dead UI / unused client / dead runtime handler 수준**만 손댔다.
`table DROP` · 대규모 schema migration · production data delete **0**.

### 12-1. 실행한 batch

| batch | 내용 | 규모 |
|---|---|---|
| **D1** | admin `digital-signage/v2` dead UI (`ChannelEditor` `ChannelList` `PlaylistList` `PlaylistEditor` `ScheduleCalendar` `MediaLibrary` `TemplateList` `TemplateBuilder` `ContentBlockLibrary` `LayoutPresetList` `index.ts` + `template-builder/` `content-blocks/` `hq/` `store/`) | 29 파일 삭제 |
| **D2** | `packages/@o4o-apps/signage` 삭제 + `apps/api-server/package.json` dep·`build:deps` 체인 + `apps/api-server/tsconfig.json` alias + `apps/main-site/tsconfig.json` alias 2줄 + `apps/main-site/vite.config.{ts,js}` alias + `.github/workflows/deploy-api.yml` build step + `pnpm-lock.yaml` (53줄 감소) | 18 파일 삭제 · 7 파일 수정 |
| **D3** | `packages/digital-signage-contract` + `apps/api-server/packages/digital-signage-contract` | 삭제 |
| **D4** | `apps/api-server/src/routes/signage/extensions/**` | 42 파일 삭제 |
| **D5** | `web-kpa-society` `AiContentGenerationModal.tsx` · `api/signageAi.ts` + `/ai/generate` route 등록 | 2 파일 삭제 · route 1 |
| **D6** | `/content-blocks`(5) · `/layout-presets`(5) · `/upload/presigned`(1) route 등록 + `signageV2.ts` 의 `contentBlockApi` · `layoutPresetApi` · `aiGenerationApi` · `getPresignedUrl` | route 11 · client 4 section |

**합계: 파일 103 삭제 · 10 파일 수정 · endpoint 67 → 55.**

`signage.routes.ts` 에는 **왜 지웠는지 추적 가능한 `[RETIRED]` 주석**을 남겼다 (controller 메서드·entity·테이블은 보존).

### 12-2. 실행하지 않은 신규 RETIRE 후보 (승인 대상)

§2-0 sweep 으로 새로 드러났으나 **확정된 D1–D6 범위를 넘으므로 손대지 않았다.**

| 후보 | 근거 | 규모 |
|---|---|---|
| admin `digital-signage/{operations,media,display,schedule,action}/**` | 전부 `digitalSignage.ts` (`API_BASE='/signage'` → `/api/v1/signage/*`) 사용. 해당 mount 는 저장소에 **없고** 프로덕션 실측 **404** | 19 파일 + router 21 entry + `digitalSignage.ts` |
| admin `v2/MonitoringDashboard.tsx` | `/api/signage/monitoring/*` — route family 에도 `validateServiceKey` allowlist 에도 `monitoring` 없음 | 1 파일 + router entry |
| `digital-signage-core/src/backend/{controllers,lifecycle,manifest}` | consumer 0 | 미집계 |

이 3건은 **다음 지시를 기다린다.** 임의 확대하지 않았다.

---

## 13. §21 검증 결과 (CI 순서 = build 산출물 생성 전)

| 단계 | 결과 |
|---|---|
| `node scripts/lint-ratchet.mjs` (**build 전**) | **PASS — 오류 69 → 63**, 경고 2141. ratchet 지시에 따라 `ERROR_BASELINE` 을 **63** 으로 하향 |
| `tsc --noEmit` api-server | **PASS** |
| `tsc --noEmit` admin-dashboard | **PASS** |
| `tsc --noEmit` web-kpa-society | **PASS** |
| `tsc --noEmit` main-site | **PASS** |
| Jest `channels-stack-retirement.spec.ts` (§17) | **PASS 42/42** |
| Vitest `admin-operation-boundary.test.ts` (§11) | **PASS 3/3** |
| Jest 전체 (api-server) | §13-1 |

> `build:packages` 로 생성된 `dist/` 가 `eslint .` 에 섞이면 오류 수가 64 → 1502 로 부풀기 때문에
> **lint 를 build 앞에 두는 CI 순서를 그대로 따랐다.**

### 13-1. api-server 전체 Jest

**최종: Test Suites 216 passed / 217, Tests 3630 passed / 3631.**

1차 실행에서 4 suite 가 실패했고, **전부 이번 은퇴의 정당한 귀결이라 원인을 고쳤다. 테스트 삭제·skip 은 하지 않았다.**

| 실패 | 원인 | 조치 |
|---|---|---|
| `typeorm-entity-registry-guard.spec.ts` | D4 로 extensions subtree 를 지우자 `check-typeorm-entities.mjs` 의 `UNREGISTERED_INVENTORY` 12건이 **STALE_INVENTORY_ENTRY** 가 됐다 | guard 가 지시한 대로 재고 12건 제거 (해당 entity 는 애초에 `entities` 배열에 등록된 적 없음 → **TypeORM metadata 영향 0**). 이 재고 목록 자체가 "route 미등록으로 도달 불가" 라고 적혀 있어 **D4 판정의 독립 확증**이 됐다 |
| `signage-resource-id-validation.spec.ts` | UUID param route 39 → 33 (`content-blocks/:id`·`layout-presets/:id` 의 get·patch·delete 6건 은퇴) | 기대값 33 으로 갱신 + 근거 주석 |
| `app-management-runtime-residue-retirement.spec.ts` | `packages` 하위 `manifest.ts` 16 → 15 (`@o4o-apps/signage` 은퇴) | 기대값 15 로 갱신 + 근거 주석 (직전 WO 의 17 → 16 주석과 동일 패턴) |
| `ecommerce-core-and-commerce-residue-retirement.spec.ts` | **이번 작업과 무관.** 로컬 worktree 에 git 미추적 빌드 잔여물(`packages/ecommerce-core/{dist,node_modules,tsconfig.tsbuildinfo}`, 타임스탬프 2026-08-25~26)이 남아 있어 "디렉토리가 존재하지 않는다" assertion 이 실패 | **미조치.** 저장소에는 존재하지 않으므로 clean checkout(CI)에서는 통과한다. 잔여물은 손대지 않았다 |

재실행 후 남은 실패는 위 4번째 환경 잔여물 1건뿐이다.

---

## 14. §22 완료 기준 대조

| 기준 | 결과 |
|---|---|
| census 미조사 0 | **달성** — 1차 오판을 전 저장소 sweep 으로 교정 (§2-0) |
| 전 항목 KEEP/SIMPLIFY/RETIRE/DEFER 판정 | **달성** (§2) |
| Channel stack 재활성화 0 | **달성** — guard 42/42 |
| schema DROP 0 | **달성** |
| production data delete 0 | **달성** |
| §19 retirement 실행 | **달성** — 103 파일 삭제 · endpoint 67 → 55 |
| §3 최신 수치 재산출 | **부분** — 2/7 재산출, 5/7 `BLOCKED_ENV` (§3-2). 판정은 코드 consumer 근거로 유지 |

### 14-1. 남긴 후속 항목

1. `createCampaignForcedContent()` 의 `target_surface` 누락 (§8-1) — **우선순위 높음**, 별도 WO
2. §12-2 신규 RETIRE 후보 3건 — 승인 후 별도 batch
3. §3 `BLOCKED_ENV` 5개 테이블 — 승인된 DB read 경로 확보 시 재산출
4. `apps/digital-signage-agent` 미배포 / `signage-player-web-00001-qjh` revision 고정 여부 — 별도 판단

---

## 15. main 병합 정렬 및 재검증 (PR #184)

최초 작업 기준선(`e485baba`) 이후 `origin/main` 이 10커밋 진행하여, PR 생성 전 최신 main 을 병합했다.

| 항목 | 값 |
|---|---|
| merge commit | `a929be253` (`origin/main = 063e811a5` 병합) |
| PR | [#184](https://github.com/Renagang21/o4o-platform/pull/184) |
| 충돌 | **1건** — `scripts/lint-ratchet.mjs` |
| 병합 후 삭제 파일 수 | **103 유지** |
| 보호 대상 diff | **0건** (`cms_content_slots` / `organization_channels` / `external_channel_*`) |

### 15-1. lint baseline 충돌 해소 — 실측 재산출

main `1b5e15fe2` 가 `ERROR_BASELINE` 을 69 → **65** 로, 본 브랜치가 69 → **63** 으로 각각 낮춰 같은 줄에서 충돌했다.
어느 쪽 값도 병합 트리의 사실이 아니므로 **추정하지 않고 병합 트리에서 다시 측정**했다.

```text
병합 트리 실측: 64 errors / 2141 warnings   (44 파일)
→ ERROR_BASELINE = 64  (근거 주석 동반)
→ lint-ratchet exit 0
```

44개 파일의 오류는 전부 본 작업과 무관한 기존 오류다
(cpt-engine · neture · otc 스크립트 · block-core 등. signage 경로 0건).

### 15-2. 병합 트리 재검증

| 검사 | 결과 |
|---|---|
| `lint-ratchet.mjs` (**build 산출물 생성 전**) | 64 / baseline 64 → **PASS** |
| `tsc --noEmit` api-server | clean |
| `tsc --noEmit` admin-dashboard · web-kpa-society · main-site | clean |
| api-server 전체 Jest | **3675 / 3676** |

전체 Jest 의 유일한 실패는 §13-1 에 기록한 것과 동일한 로컬 build 잔여물
(`packages/ecommerce-core/{dist,node_modules,tsconfig.tsbuildinfo}`, `git ls-files` 빈 출력)이며
본 변경과 무관하다. 삭제하지 않았고 clean checkout(CI)에서는 통과한다. 테스트 삭제·skip 0.

### 15-3. 후속 WO 진행 상황

§14-1 의 1번(`createCampaignForcedContent()` `target_surface` 누락)은 별도 WO 로 **수정 완료**되어
`work/signage-campaign-forced-content-tablet-surface-v1` 에 있다.
머지 순서는 **본 PR(구조 감축 기준선) → forced-content fix(기능 수정)** 이다.
CHECK: `CHECK-O4O-SIGNAGE-CAMPAIGN-FORCED-CONTENT-TABLET-SURFACE-DELIVERY-FIX-V1.md`
