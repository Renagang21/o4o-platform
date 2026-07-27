# CHECK — O4O KPA Signage Media Usage Guard & Safe Delete V1

> **WO:** WO-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1
> **정책:** "HQ 플레이리스트, 매장 snapshot 또는 매장 플레이리스트에서 사용 중인 사이니지 미디어는 삭제할 수 없다. 모든 사용처에서 연결을 제거한 뒤에만 삭제할 수 있다."
> **Commit:** `55e3ea14f`
> **Date:** 2026-07-27
> **Status:** ✅ 구현·검증 완료 / 배포 CI 진행 / 기존 dangling 1건 report-only (별도 보정 WO 권고)

---

## 1. 삭제 경로 맵 (read-only 재확인)

| # | 경로 | Route | Controller | Service | Repo/실행 | 삭제 유형 |
|---|------|-------|-----------|---------|-----------|-----------|
| 1 | HQ 미디어 완전 삭제 | `DELETE /hq/media/:id` | `media.controller.hardDeleteMedia` | `media.service.hardDeleteMedia` | `media.repository.hardDeleteMedia` | **hard delete** (row 물리 삭제) |
| 2 | 커뮤니티 미디어 삭제 | `DELETE /community/media/:id` | `global-content.controller.deleteCommunityMedia` | `global-content.service.deleteCommunityMedia` | soft-delete (`deletedAt`) | soft |
| 3 | 공급자 미디어 삭제 | `DELETE /api/v1/kpa/supplier/signage/media/:id` | `supplier-signage-media.controller` | (컨트롤러 인라인) | soft-delete (`deletedAt`) | soft |

**참조 경로 (삭제가 깨뜨릴 수 있는 것):**
- **FK 직접**: `signage_playlist_items."mediaId"` → `signage_media.id` (`onDelete CASCADE`) — hard delete 시 playlist item 이 조용히 사라짐.
- **태그**: `signage_media.tags`(`text[]` 컬럼)에 저장 — 별도 `signage_media_tags` 테이블은 migration `20260417100000` 에서 **DROP**(dead table). 차단 사유 아님, media row 삭제로 함께 제거.
- **비-FK snapshot**: `store_playlist_items.snapshot_id` → `o4o_asset_snapshots.id` (**FK 없음**). snapshot 은 `source_asset_id = mediaId AND asset_type='signage'` 로 원본 미디어에 느슨하게 연결(FK 없음). 이 snapshot 을 삭제하면 `store_playlist_items.snapshot_id` 가 **dangling** 되어 매장 재생이 깨짐.

→ **차단 대상 2경로**: (A) FK 직접 playlist item, (B) snapshot 을 참조 중인 store_playlist_items.

---

## 2. 사용처 계산 방식 (canonical service)

`apps/api-server/src/routes/signage/services/media-usage.service.ts` — `SignageMediaUsageService.computeUsage(mediaId, exec?)`

- **단일 진입점(SSOT)**. 삭제 가드가 CASCADE 에 기대지 않고 이 결과로만 차단.
- `exec?: SqlExecutor` 선택 파라미터 — 삭제 트랜잭션 내부에서 트랜잭션 `EntityManager` 를 넘겨 **동일 락 컨텍스트에서 재검사**(TOCTOU 방지). 미지정 시 `DataSource` 로 단순 조회.
- **경로 A (HQ 직접)**: `signage_playlist_items` ⋈ `signage_playlists`(`"deletedAt" IS NULL`) — soft-deleted 플레이리스트는 재생 안 되므로 집계 제외.
- **경로 B (매장 snapshot)**: `o4o_asset_snapshots`(`source_asset_id=$1 AND asset_type='signage'`) ⋈ `store_playlist_items`(snapshot_id) ⋈ `store_playlists` ⋈ `organizations`.
- `inUse = directPlaylistUsageCount > 0 || referencedSnapshotCount > 0`.
- **차단 사유 아님(참고 표시만)**: `signage_media_tags`(additive 메타), `signage_forced_content`(video_url 독립 복사·미디어 FK 없음), `signage_schedules`(playlistId 참조 → 이미 playlist 사용처로 커버).
- Raw SQL 전부 **파라미터 바인딩** ($1) — Boundary Policy Guard Rule 2 준수.

---

## 3. 사용처 조회 API 응답

**`GET /hq/media/:id/usage`** (`requireSignageOperator` 가드) — `signage.routes.ts`, `media.controller.getMediaUsage`

```jsonc
{
  "success": true,
  "data": {
    "mediaId": "…",
    "inUse": true,
    "directPlaylistUsageCount": 2,      // HQ 플레이리스트 수
    "snapshotCount": 3,                  // 파생 snapshot 총수(참조 무관)
    "referencedSnapshotCount": 1,        // 매장이 참조 중인 snapshot 수
    "storePlaylistUsageCount": 1,        // 매장 플레이리스트 수
    "storeCount": 1,                     // 매장 수
    "tagCount": 4,                       // 참고용(차단 사유 아님)
    "usages": {
      "hqPlaylists":  [{ "playlistId","playlistName","itemCount","status","source","scope" }],
      "storePlaylists":[{ "storeId","storeName","playlistId","playlistName","snapshotId","itemCount" }]
    }
  }
}
```

미디어가 scope 밖이거나 없으면 404.

---

## 4. 삭제 409 가드 (전 경로)

공통 코드 **`SIGNAGE_MEDIA_IN_USE`** → HTTP **409**. **CASCADE-then-delete 미사용, 강제 삭제 기능 없음.**

| 경로 | 가드 위치 | 동작 |
|------|-----------|------|
| HQ hard | `media.repository.hardDeleteMedia` (트랜잭션 내) | in-txn `computeUsage` → `inUse` 면 `{ deleted:false, code:'SIGNAGE_MEDIA_IN_USE', usage }` 반환, controller 가 409 + usage payload |
| community soft | `global-content.service.deleteCommunityMedia` | 소유권 확인 후 `computeUsage` → inUse 면 409 |
| supplier soft | `supplier-signage-media.controller` DELETE | 소유(OWN_WHERE) 확인 → `computeUsage` → inUse 면 409 → (기존) active-status 가드 `DELETE_BLOCKED_ACTIVE` → soft-delete |

---

## 5. HQ hard delete — TOCTOU 안전 트랜잭션

`media.repository.hardDeleteMedia` 를 `dataSource.transaction` 으로 재작성:

1. `SELECT id FROM signage_media WHERE id=$1 AND "serviceKey"=$2 [AND "organizationId"=$3] FOR UPDATE` — 행 락 + scope 확인 (없으면 `MEDIA_NOT_FOUND`).
2. `computeUsage(id, manager)` — **동일 트랜잭션**에서 재확인 (락 이후 사용처 재계산).
3. `inUse` 면 `SIGNAGE_MEDIA_IN_USE` 반환 (삭제 안 함).
4. 미사용이면: `signage_media_tags` 삭제 → **orphan snapshot 만** 삭제(§6) → `signage_media` 삭제.

→ 이전의 무조건 `DELETE FROM o4o_asset_snapshots WHERE source_asset_id=$1` (dangling 유발 위험) 제거.

---

## 6. snapshot 삭제 정책 정정

**변경 전:** hard delete 시 `source_asset_id` 매칭 snapshot 을 **무조건 삭제** → `store_playlist_items.snapshot_id` dangling 유발.

**변경 후:** 미사용 확정(§5) 이후에만, **참조 없는 orphan snapshot 만** 삭제:
```sql
DELETE FROM o4o_asset_snapshots s
 WHERE s.source_asset_id = $1 AND s.asset_type = 'signage'
   AND NOT EXISTS (SELECT 1 FROM store_playlist_items spi WHERE spi.snapshot_id = s.id)
```
참조 중 snapshot 은 §5-3 에서 이미 삭제 차단되므로 이 지점에 도달하지 않음. **dangling 신규 생성 0 보장.**

---

## 7. 공급자 경로 결과

- 기존 active-status 가드(`DELETE_BLOCKED_ACTIVE`) **보존** + 사용처 가드(`SIGNAGE_MEDIA_IN_USE`) **추가**.
- 순서: OWN_WHERE(`"deletedAt" IS NULL` 포함) 소유 확인 → usage 409 → active 409 → soft-delete.
- 공급자 미디어는 `source='supplier'`, `serviceKey='kpa-society'` 로 동일 `signage_media` 테이블 사용 → 동일 usage 계산 재사용.

---

## 8. 운영자 UI 경고 & 이동

`MediaDeleteDialog.tsx` (신규, 재사용) — `HqMediaPage`(행 액션) / `HqMediaDetailPage`(상세) 소비:

- 삭제 클릭 → 먼저 usage API 조회(`checking`).
- **미사용** → destructive confirm(`confirm`) → 삭제.
- **사용 중** → `in-use` 경고 화면: HQ/매장 카운트 + 목록. HQ 플레이리스트는 실화면 `/operator/signage/hq-playlists/:id` **링크**(실재 route). 매장 플레이리스트는 전용 운영자 화면이 없으므로 **텍스트만**(가상 route 미생성). **강제 삭제 버튼 없음** — "먼저 플레이리스트에서 제거" 안내.
- 삭제 중 409 수신 시 usage 재조회 후 `in-use` 로 되돌림.
- usage 조회 실패 시에도 강제 삭제 안 함 — confirm 단계로 두고 서버 가드가 최종 차단.

---

## 9. 기존 dangling 데이터 census (read-only, 자동보정 없음)

프로덕션 `o4o_platform` (cloud-sql-proxy read-only) census 결과:

| 항목 | 값 |
|------|-----|
| signage_media 총 / soft-deleted | 7 / 2 |
| signage_playlist_items | 3 |
| store_playlist_items | 1 |
| asset_type='signage' snapshots | 0 |
| orphan playlist_items (FK 위반) | 0 |
| **dangling store_playlist_items.snapshot_id** | **1** |
| snapshot missing source media | 0 |
| soft-deleted media 를 활성 playlist 가 참조 | 0 |
| 중복 snapshot(source_asset_id 당 >1) | 0 |

**dangling 1건 상세:**
- `store_playlist_items.id = d53b6711-0689-406b-b955-9b58d3a95aee`
- `playlist_id = 8781cc03-e4f5-4734-8a64-9f25193767d0`
- `snapshot_id = b1247751-8581-4013-91ac-1b9309c1766f` (해당 `o4o_asset_snapshots` row 없음)

**재생 영향:** 해당 매장 플레이리스트가 이 item 을 재생하려 할 때 snapshot 조회 실패 → 항목 스킵 또는 오류. 이번 정책 위반의 전형적 산물(과거 무조건 snapshot 삭제로 추정).

**조치:** WO 원칙에 따라 **report-only, 자동 보정 안 함**. 별도 보정 WO 권고 (해당 item 제거 또는 snapshot 재생성, 매장 운영자 협의 필요).

> census 스크립트: 세션 scratchpad `signage-dangling-census.cjs` (read-only, 자격증명 masking).

---

## 10. 타 서비스 영향

- `signage_media`·`media.repository`·`SignageMediaUsageService` 는 GlycoPharm / K-Cosmetics / Neture 포함 **전 서비스 공용**. 이번 변경은 **additive·global 가드**(삭제 차단 조건 추가 + orphan-only snapshot 삭제)로 기존 정상 삭제 흐름을 넓히지 않고 좁힘.
- serviceKey/organizationId scope 는 기존과 동일하게 유지 → cross-service 노출 없음.
- 사용 중이지 않은 미디어의 삭제 동작은 이전과 동일(회귀 없음). 사용 중 미디어만 새로 차단.
- Shared Module Change Protocol: 소비처 = signage(HQ/community) + kpa supplier 3 경로 전수 반영 확인.

---

## 11. 배포 & 검증

- **Typecheck**: api-server `tsc -p tsconfig.build.json` **exit 0** (기존 `src/scripts/**` 오류는 build 에서 exclude 되어 무관). web-kpa-society `tsc --noEmit` **exit 0**.
- **배포**: push `55e3ea14f`(구현) → `c963a3dba`(smoke 중 발견한 버그 수정) → CI `Deploy API Server (Cloud Run)` + `Deploy Web Services (Cloud Run)` 모두 **success**.

### 11-a. Smoke 중 발견·수정한 버그 (배포 검증의 실효성)

최초 배포(`55e3ea14f`) 후 실브라우저 smoke 에서 `GET /hq/media/:id/usage` 가 **HTTP 500** 반환:
```
{"success":false,"error":{"code":"INTERNAL_ERROR","message":"relation \"signage_media_tags\" does not exist"}}
```
원인: `signage_media_tags` 테이블은 migration `20260417100000-DropSignageDeadTables` 에서 **dead table 로 DROP** 되었고, 태그는 `signage_media.tags`(`text[]`) 컬럼에 저장된다. 최초 구현이 존재하지 않는 테이블을 조회/삭제.
- 영향: usage API 500 + hard delete 트랜잭션이 태그 DELETE 에서 실패했을 것.
- 수정(`c963a3dba`): usage 의 tagCount 를 `array_length(tags,1)` 로 계산, hard delete 의 `signage_media_tags` DELETE 제거(태그는 media row 삭제로 함께 제거).
> 정적 typecheck 만으로는 못 잡는 런타임 스키마 계약 위반을 실브라우저 smoke 가 포착 — CLAUDE.md §8 절차의 실효성 확인.

### 11-b. Smoke 결과 (재배포 `c963a3dba` 후, 프로덕션)

KPA 운영자 로그인 → `/operator/signage/hq-media` (미디어 5건):

1. **usage API 200** — media `bbfdb8b8…` → `inUse:true, directPlaylistUsageCount:1`, HQ 플레이리스트 "테스트 플레이리스트" 참조. 500 재현 없음.
2. **삭제 다이얼로그(사용 중)** — 제목 "삭제할 수 없는 미디어", 경고 문구, 카운트(HQ 1 / 매장 0 / 매장 0), HQ 플레이리스트 목록 표시. **강제 삭제 버튼 없음, "닫기"만** — Scope 8 충족.
3. **사용처 이동** — "테스트 플레이리스트" 링크 클릭 → 실재 화면 `/operator/signage/hq-playlists/64bcf16f…` 로 이동, 해당 미디어가 항목 2번으로 표시 + "항목 제거" 버튼 제공. **가상 route 없음** — Scope 9 충족.
4. **파괴적 쓰기 미수행** — 사용 중 미디어는 409 로 차단되어 실제 삭제 발생 0. 미사용 미디어 강제 삭제로 프로덕션 데이터를 지우지 않음(승인 범위 밖 destructive write 회피).

---

## 12. Commit

- `55e3ea14f` — feat(signage): guard media deletion against HQ/store playlist usage (11 files, +617/−76)
- `68a3d4089` — docs(check): 본 CHECK 문서
- `c963a3dba` — fix(signage): use signage_media.tags column, not dropped signage_media_tags table (smoke 중 발견한 500 버그 수정, 2 files)

**변경 파일:**
- `apps/api-server/src/routes/signage/services/media-usage.service.ts` (신규)
- `apps/api-server/src/routes/signage/repositories/media.repository.ts`
- `apps/api-server/src/routes/signage/services/media.service.ts`
- `apps/api-server/src/routes/signage/controllers/media.controller.ts`
- `apps/api-server/src/routes/signage/signage.routes.ts`
- `apps/api-server/src/routes/signage/services/global-content.service.ts`
- `apps/api-server/src/routes/signage/controllers/global-content.controller.ts`
- `apps/api-server/src/routes/kpa/controllers/supplier-signage-media.controller.ts`
- `services/web-kpa-society/src/pages/operator/signage/MediaDeleteDialog.tsx` (신규)
- `services/web-kpa-society/src/pages/operator/signage/HqMediaPage.tsx`
- `services/web-kpa-society/src/pages/operator/signage/HqMediaDetailPage.tsx`
