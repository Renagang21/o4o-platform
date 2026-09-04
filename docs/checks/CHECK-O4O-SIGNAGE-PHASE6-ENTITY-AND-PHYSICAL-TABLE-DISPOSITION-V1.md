# CHECK-O4O-SIGNAGE-PHASE6-ENTITY-AND-PHYSICAL-TABLE-DISPOSITION-V1

- 작업: `WO-O4O-SIGNAGE-PHASE6-ENTITY-AND-PHYSICAL-TABLE-DISPOSITION-V1`
- 일자: 2026-09-04
- 브랜치: `work/signage-phase6-entity-table-disposition-v1` / base `origin/main` = `108346e6d`
- worktree: `C:/tmp/o4o-ph6-disp` (격리 — main 저장소의 다른 세션 WIP 미접촉)
- 성격: **entity 코드 은퇴** (schema 변경 0 / migration 0 / DROP 0 / production write·DELETE 0)

---

## 1. 대상 7 entity ↔ 물리 테이블 매핑 (소스 실측)

`@Entity(...)` 데코레이터 인자를 소스에서 직접 읽어 확정했다. **추정 없음.**

| Entity | 물리 테이블명 | production 존재 |
|---|---|---|
| `MediaSource` | `signage_media_source` | ❌ 없음 |
| `MediaList` | `signage_media_list` | ❌ 없음 |
| `MediaListItem` | `signage_media_list_item` | ❌ 없음 |
| `Display` | `signage_display` | ❌ 없음 |
| `DisplaySlot` | `signage_display_slot` | ❌ 없음 |
| `Schedule` | `signage_schedule` | ❌ 없음 |
| `ActionExecution` | `signage_action_execution` | ❌ 없음 |

### 단수/복수 충돌 주의 (census 시 함정)

legacy 7종은 **단수** 테이블명, 살아 있는 production 9종은 **복수** 테이블명이다.

```
signage_schedule      (legacy, 없음)   vs  signage_schedules   (ACTIVE, 존재)
signage_media_source  (legacy, 없음)   vs  signage_media       (ACTIVE, 존재)
signage_media_list    (legacy, 없음)   vs  signage_playlists   (ACTIVE, 존재)
```

테이블 리터럴 grep 은 전부 `grep -w` 로 단수/복수를 분리해 수행했다.

---

## 2. production 실측 (SELECT ONLY)

접속: cloud-sql-proxy `127.0.0.1:5442` → `o4o_platform` / `current_user = o4o_api`.
**수행한 쿼리는 `SELECT` 뿐이다. write / DELETE / DDL 0건.**

```sql
SELECT t.n, to_regclass('public.'||t.n) IS NOT NULL AS exists FROM (VALUES ...) AS t(n);
```

결과:

```
signage_media_source      | f
signage_media_list        | f
signage_media_list_item   | f
signage_display           | f
signage_display_slot      | f
signage_schedule          | f
signage_action_execution  | f
signage_media             | t   ← ACTIVE (보호)
signage_playlists         | t   ← ACTIVE (보호)
signage_schedules         | t   ← ACTIVE (보호)
```

**7개 legacy 테이블은 production 에 존재하지 않는다.**
→ row count 는 "테이블 부재" 이므로 `0` 이고, `ACTIVE_DATA` / `STALE_DATA` / `ORPHAN_DATA` /
`HISTORICAL_DATA` 판정 대상 자체가 없다. `BLOCKED_ENV` 아님(실측 완료).

### FK census

```sql
SELECT conrelid::regclass, confrelid::regclass FROM pg_constraint
WHERE contype='f' AND confrelid::regclass::text LIKE 'signage_%';
```

```
signage_playlist_items -> signage_playlists
signage_playlist_items -> signage_media
signage_schedules      -> signage_playlists
signage_template_zones -> signage_templates
```

→ 7 legacy 테이블을 참조하는 FK **0건**. 실재 FK 4건은 전부 ACTIVE 9종 내부 관계다. UNKNOWN 0.

### 논리 참조 census

```sql
SELECT table_name||'.'||column_name FROM information_schema.columns
WHERE table_schema='public'
  AND (column_name LIKE '%media_source%' OR column_name LIKE '%media_list%'
       OR column_name LIKE '%display_slot%' OR column_name LIKE '%action_execution%'
       OR column_name='display_id' OR column_name='slot_id');
```

→ **0행.** production 스키마 어디에도 legacy id 컬럼이 없다.

---

## 3. TypeORM registration 판정

`apps/api-server/src/database/entities.ts` 가 `@o4o-apps/digital-signage-core/entities` 에서
import 하는 것은 **`SignageCoreEntities` 하나뿐**이다 (505행 import / 966행 spread).

```ts
import { SignageCoreEntities } from '@o4o-apps/digital-signage-core/entities';
...
  ...SignageCoreEntities,
```

| 배열 | 소비처 |
|---|---|
| `SignageCoreEntities` (9종) | api-server registry — **REGISTERED_AND_USED** |
| `SignageEntities` (legacy 7종) | 저장소 전체 소비처 **0** |
| `AllSignageEntities` | 저장소 전체 소비처 **0** |

→ 7 entity 판정 = **`NOT_REGISTERED`**. TypeORM metadata 에 애초에 올라간 적이 없다.
등록돼 있다는 이유로 `KEEP_ACTIVE` 로 본 항목 없음.

---

## 4. 코드 소비처 census (미조사 0)

### 4-1. import 전수

`@o4o-apps/digital-signage-core` 를 import 하는 저장소 전체 지점을 전수 조사했다
(`apps` · `packages` · `services` · `scripts` · `.github`). import 되는 심볼은 다음뿐이다.

```
SignageCoreEntities  (database/entities.ts)
SignagePlaylist, SignagePlaylistItem, SignageMedia, SignageSchedule,
SignageTemplate, SignageTemplateZone, SignageLayoutPreset,
SignageContentBlock, SignageAiGenerationLog
```

→ **7 legacy entity 클래스를 import 하는 코드 0건.** repository / service / controller /
frontend / test 어디에도 없다.

### 4-2. 테이블 리터럴 전수

7개 테이블명(`grep -w`)을 `apps` · `packages` · `scripts` 전체에서 검색:
**entity 정의 파일 밖 0건**, migration 디렉터리 **0건**.

### 4-3. 열거형 / 타입 참조

`ActionExecutionStatus` · `ExecuteMode` (ActionExecution 이 export 하던 enum) 소비처 **0건**.

### 4-4. 동명이인(오탐) 분리

| 문자열 | 실체 | 판정 |
|---|---|---|
| `services/web-glycopharm/src/types/signage.ts` 의 `interface MediaSource` | glycopharm 프론트 **로컬 타입 정의** (entity 아님) | 무관 — 이번 WO 범위 밖 |
| `Display` / `Schedule` 다수 매칭 | 블록 설명문·주석·`BackupService` 등 일반 영어 단어 | 오탐 |
| `apps/admin-dashboard` 의 `digital-signage-core` | **appId 문자열** (AppStore 카탈로그) | entity 무관 — 보존 |

> 참고(범위 밖 보고): `services/web-glycopharm/src/types/signage.ts` 의 로컬 타입 파일은
> 현재 importer 가 0 이다(소비처는 전부 `@o4o/types/signage`). 이번 WO 범위가 아니므로
> **손대지 않았다.** 별도 판단 대상으로 보고만 한다.

### 4-5. 소비처 분류 (§7)

| Entity | 분류 |
|---|---|
| 7종 전부 | **`NONE`** (ACTIVE_RUNTIME 0 / TEST_ONLY 0 / MIGRATION_ONLY 0 / DOC_ONLY 는 archive 기록물뿐) |

---

## 5. migration history

`apps/api-server/src/database/migrations/**` 에서 7개 테이블명 검색 → **0건.**
즉 **이 7개 테이블을 만든 migration 이 애초에 존재하지 않는다.**
(`2026011700001-CreateSignageCoreEntities.ts` 는 복수형 ACTIVE 9종만 생성한다.)

`20260417100000-DropSignageDeadTables.ts` 가 드랍한 것은
`signage_playlist_shares` / `signage_analytics` / `signage_media_tags` 로 이번 7종과 무관하다.

→ migration 존재만으로 active 판정한 항목 없음. 이번 WO 도 migration 을 **추가하지 않는다**
(드랍할 테이블이 물리적으로 없으므로 DDL 이 성립하지 않는다).

---

## 6. 보호 대상 무영향 확인 (§13 · §14 · §15 · §21 · §22)

| 보호 대상 | 이번 변경과의 관계 |
|---|---|
| Tablet ScreenSet (`StoreTablet` → `current_screen_set_id` → `ScreenSet` → `ScreenBlock` → `idle_media`) | 7 entity 를 참조하지 않음 (import 0 / 테이블 참조 0) — **무영향** |
| `signage_forced_content` · `store_tablet_operator_idle_selections` · `target_surface` | 동일 — **무영향** |
| store-playlist active runtime | 동일 — **무영향** |
| `cms_content_slots` · `organization_channels` · `external_channel_product_links` | 동일 — **무영향** |
| Channel runtime (`/api/v1/channels*` · ChannelPlayer · heartbeat · playback-log) | **은퇴 상태 유지.** entity 보존을 위해 되살린 것 없음 |
| ACTIVE 9 entity (`SignageCoreEntities`) | 배열 정의·구성원 **불변** |

---

## 7. 최종 처분 판정 (entity 별 독립)

| Entity | 코드 | 물리 테이블 | 처분 |
|---|---|---|---|
| `MediaSource` | 소비처 0 → 삭제 | production 부재 | `RETIRE_CODE_AND_TABLE` (테이블 부재 → DDL 불필요) |
| `MediaList` | 〃 | 〃 | 〃 |
| `MediaListItem` | 〃 | 〃 | 〃 |
| `Display` | 〃 | 〃 | 〃 |
| `DisplaySlot` | 〃 | 〃 | 〃 |
| `Schedule` | 〃 | 〃 | 〃 |
| `ActionExecution` | 〃 | 〃 | 〃 |

**UNKNOWN 0 / 미조사 0 / DEFER_POLICY 0.**

§18 의 테이블 DROP 5조건은 "드랍할 테이블이 존재할 때" 의 조건이다. 여기서는
`to_regclass = NULL` 이므로 **DROP 대상이 없고, migration 을 만들지 않는 것이 정답**이다.
없는 테이블에 대해 `DROP TABLE IF EXISTS` 를 넣어 schema 변경 이력을 만들지 않았다.

---

## 8. 변경 내역

| 파일 | 변경 |
|---|---|
| `packages/digital-signage-core/src/backend/entities/MediaSource.entity.ts` | 삭제 |
| `.../MediaList.entity.ts` | 삭제 |
| `.../MediaListItem.entity.ts` | 삭제 |
| `.../Display.entity.ts` | 삭제 |
| `.../DisplaySlot.entity.ts` | 삭제 |
| `.../Schedule.entity.ts` | 삭제 |
| `.../ActionExecution.entity.ts` | 삭제 |
| `.../entities/index.ts` | legacy export/import 7 + `SignageEntities` + `AllSignageEntities` 제거, 근거 주석 추가 |
| `packages/digital-signage-core/package.json` | `description` 이 삭제된 도메인(Display/Action)을 서술하고 있어 실제 9 entity 기준으로 교정 |
| `docs/services/_core/apps/digital-signage-core/app-definition.md` | 책임 표 · 외부 노출 Types → 실제 9 entity 로 교정, 은퇴 근거 1줄 추가 |

**entity 수 16 → 9.** 왜 줄었는지는 `index.ts` 상단 주석과 본 CHECK 에 근거를 남겼다 (§25).

api-server 쪽 registration 은 원래부터 `SignageCoreEntities` 만 참조하므로 **수정할 것이 없었다**
(deploy copy handler · repository · service · test 모두 ACTIVE 9종만 import).

---

## 9. 검증 결과

| 항목 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | PASS (lockfile 변경 0 — dependency 미변경) |
| `node scripts/lint-ratchet.mjs` | PASS (ESLint 59 errors / baseline 62 — 이번 변경으로 3 감소) |
| `node scripts/check-typeorm-entities.mjs` | PASS (@Entity 정의 221 · 미등록 5 = 동결 재고 등재 5 · DEFINED_BUT_UNREGISTERED 0) |
| `pnpm --filter '@o4o-apps/digital-signage-core' run build` (tsc) | PASS |
| api-server `tsc --noEmit` — signage 관련 오류 | **0건** (삭제된 7 entity 관련 오류 0) |
| api-server `tsc --noEmit` — 전체 오류 수 | 221 — 217 = TS2307 (`@o4o/security-core` 34 · `@o4o/platform-core/store-identity` 29 등 **미빌드 workspace dist**), 나머지 4 도 signage 무관. `@o4o-apps/digital-signage-core` 는 목록에 없다(정상 해석됨) (사전 존재 · 이번 변경과 무관) |
| Jest 전체 | **PASS — 220 suites / 3,693 tests 전부 통과** (skip 0) |

### 잔여 census (§27)

| 분류 | 내용 |
|---|---|
| `EXPECTED_ACTIVE` | ACTIVE 9 entity · `SignageCoreEntities` · signage repository/service/route |
| `EXPECTED_HISTORY` | `docs/archive/**` · `docs/checks/**` 의 과거 기록 언급 (기록물 — CLAUDE.md §16-1 에 따라 미수정) |
| `UNEXPECTED_RESIDUAL` | **0** |

`packages/digital-signage-core/dist/**` 에 삭제 전 빌드 산출물이 로컬에 남을 수 있으나
`dist` 는 추적 대상이 아니며 CI/배포는 매번 새로 빌드한다 (`.github/workflows/deploy-api.yml`).

### 미적용 사항 (의도적)

- `scripts/lint-ratchet.mjs` 의 `ERROR_BASELINE` 하향 안내 → **적용하지 않았다.**
  다른 세션의 진행 중 브랜치가 현재 기준선에 맞춰져 있어 낮추면 무관한 브랜치가 CI 에서 깨진다.
  별도 WO 로 분리 제안 (이전 2개 WO 에서도 동일 판단).
- `app-definition.md` 의 `## API Routes` 절은 이미 은퇴한 backend 를 서술하고 있다.
  이번 WO 는 entity 처분 범위이므로 **문서 재설계는 하지 않았다.** 별도 판단 대상으로 보고.

---

## 10. 안전 계약 이행

```
schema change      = 0
migration 추가     = 0
DROP TABLE         = 0
production write   = 0
production DELETE  = 0
production 조회    = SELECT ONLY (테이블 존재 여부 · FK · 컬럼명 메타데이터)
개인정보 조회      = 0 (payload 미조회)
dependency 변경    = 0
lockfile 변경      = 0
Channel 재기동     = 0
Tablet/forced-content 변경 = 0
```

- stage 는 path-specific 으로만 수행했고 `git add .` 를 쓰지 않았다.
- 격리 worktree 에서 작업해 main 저장소의 다른 세션 WIP(B2B 트랙)를 접촉하지 않았다.

---

## 11. 문서 정합

```
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

- 발견 1건 = `app-definition.md` 의 `## API Routes` 절(은퇴한 backend 서술) → 별도 WO 제안.
- 같은 문서의 **삭제 entity 서술**은 이번 변경으로 사실이 바뀐 부분이라 함께 교정했다.

---

## 12. 결론

```
SIGNAGE PHASE6 ENTITY/TABLE DISPOSITION: PASS
```
