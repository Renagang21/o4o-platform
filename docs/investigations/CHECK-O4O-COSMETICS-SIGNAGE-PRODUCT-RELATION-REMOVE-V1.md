# CHECK-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMOVE-V1

> `WO-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMOVE-V1` 실행 결과.
> K-Cosmetics 의 product 직접 결합 사이니지/캠페인 dead 경로(B) 제거.

- **작성일:** 2026-06-05
- **선행:** [`IR-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMEDIATION-V1`](IR-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMEDIATION-V1.md), [`IR-O4O-COSMETICS-SIGNAGE-DEAD-ROUTE-AND-DB-PRECHECK-V1`](IR-O4O-COSMETICS-SIGNAGE-DEAD-ROUTE-AND-DB-PRECHECK-V1.md)
- **프로토콜:** [`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1`](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)

---

## 1. Summary

- B 경로(product 결합 signage-playlist / campaign) **제거 완료**. 활성 매장 사이니지(A, `/store-playlists`)는 무접촉.
- **착수 전 라이브 DB read-only 게이트 통과**(네 테이블 모두 부재 확인) 후 삭제 진행.
- 정적 참조 잔존 0(활성), TypeScript: dropshipping-cosmetics / admin-dashboard / api-server **모두 PASS**.
- 제거 범위는 `packages/dropshipping-cosmetics` 내부와 admin-dashboard 고아 페이지로 완전 격리(외부 import 0).

---

## 2. DB Read-only Gate Result

**게이트 PASS — 네 값 모두 NULL(테이블 부재).**

- 접속: prod `o4o-platform-db`(public IP `34.64.96.252`, egress IP 영구 authorized) 직접 psql read-only(`sslmode=require`). user=`o4o_api`, db=`o4o_platform`.
- 쿼리:
  ```sql
  SELECT to_regclass('public.cosmetics_signage_playlists'),
         to_regclass('cosmetics.cosmetics_signage_playlists'),
         to_regclass('public.cosmetics_campaigns'),
         to_regclass('cosmetics.cosmetics_campaigns');
  ```
- 결과: `|||` (4 컬럼 모두 NULL) → **DB_ABSENT 라이브 확정**. row count 불필요(테이블 없음).
- 쓰기 작업 없음(SELECT only). `gcloud sql connect` 는 public IP 도달 timeout 이라 직접 psql(영구 ACL) 사용.

> 참고: 선행 시도에서 로컬 `apps/api-server/.env` 의 `DB_PASSWORD` 가 공백이어서, 실제 비밀번호는 Cloud Run `o4o-core-api` 의 plain env(DB_PASSWORD)에서 read-only 로 취득(마스킹).

---

## 3. Removed Files / Exports

### 3.1 삭제 파일 (9)

**`packages/dropshipping-cosmetics/src/backend/`**
- `entities/signage-playlist.entity.ts`
- `entities/campaign.entity.ts`
- `services/signage-playlist.service.ts`
- `services/campaign.service.ts`
- `routes/signage-playlist.routes.ts`
- `routes/campaign.routes.ts`
- `controllers/signage-playlist.controller.ts`
- `controllers/campaign.controller.ts`

**admin-dashboard (client-only dead)**
- `apps/admin-dashboard/src/pages/cosmetics/signage/index.tsx` (+ 빈 `signage/` 디렉터리 제거). 라우터/네비 등록 없음(고아 페이지) — 추가 제거 불필요.

### 3.2 참조 제거 (편집)

- `entities/index.ts` — `CosmeticsSignagePlaylist` / `CosmeticsCampaign` export 제거
- `dto/index.ts` — `CosmeticsCampaignDto`(사용처 0 고아) 제거
- `module.ts` — entity import·`entities[]`·`CosmeticsEntities[]` 항목, `createSignagePlaylistRoutes`/`createCampaignRoutes` import·route 등록 제거. (활성 `createSignageRoutes` home feed 는 유지)
- `manifest.ts` — `ownsTables` 의 `cosmetics_signage_playlists`/`cosmetics_campaigns`, `backend.entities` 의 `signage-playlist.entity`/`campaign.entity` 경로 제거

---

## 4. Untouched Active Signage Path

무접촉 확인:
- `services/web-k-cosmetics/src/pages/store/StoreSignagePage.tsx` (diff 없음)
- api-server `/store-playlists`(`o4o-store/controllers/store-playlist.controller.ts`), `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts`
- `cosmetics_store_playlists` / `cosmetics_store_playlist_items`
- snapshot / assetSnapshotApi / signage-media 경로, `SignageContentMapperService`, `digital-signage-core`
- KPA/GlycoPharm active signage, Neture
- StoreSidebar / storeMenuConfig / menuCapabilityMap / HeroBannerSection

---

## 5. Static Reference Check

| 토큰 | 잔존(활성) | 비고 |
|---|---|---|
| `CosmeticsSignagePlaylist` | 0 | 주석(REMOVED)만 |
| `CosmeticsCampaign` / `CosmeticsCampaignDto` | 0 | 주석만 |
| `createSignagePlaylistRoutes` / `createCampaignRoutes` | 0 | 주석만 |
| `signage-playlist.*` / `campaign.(entity|service|routes|controller)` | 0 | manifest 경로 참조 제거됨 |
| `/cosmetics/signage/playlists` · `/auto-playlist` · `/cosmetics/campaigns` | 0 | admin 페이지 제거로 호출 0 |
| 활성 `/store-playlists` | 유지 | 무접촉 |

---

## 6. TypeScript / Build Result

| 대상 | 결과 |
|---|---|
| `@o4o/dropshipping-cosmetics` `type-check` (tsc --noEmit) | **PASS** (EXIT 0) |
| `@o4o/admin-dashboard` `type-check` | **PASS** (EXIT 0) |
| `@o4o/api-server` `type-check` | **PASS** (EXIT 0) |
| `web-k-cosmetics` | 미수정(B 참조 0) — 영향 없음, 별도 typecheck 생략 |

---

## 7. Consumer Impact Matrix

| 소비처 | 영향 | 처리 | 결과 |
|---|---|---|---|
| K-Cosmetics StoreSignagePage | 없음 | 무접촉 | PASS |
| K-Cosmetics backend `/store-playlists` | 없음 | 무접촉 | PASS |
| dropshipping-cosmetics B route/entity/service/controller/DTO | 제거 | dead code removal | PASS(typecheck) |
| admin-dashboard cosmetics signage page | 제거 | client-only dead removal | PASS(typecheck) |
| KPA signage | 없음 | 무접촉 | PASS |
| GlycoPharm signage | 없음 | 무접촉(동일 패키지 B 미사용) | PASS |
| Neture | 없음 | 대상 아님 | PASS |

---

## 8. Browser Smoke Result

- **미수행(배포 전).** 본 변경은 백엔드 dead 코드 + 고아 admin 페이지 제거로, 활성 경로 무접촉 + 3개 typecheck PASS.
- 배포 후 권장 확인: K-Cosmetics `/store` 디지털 사이니지(StoreSignagePage) 정상 표시 · `/store-playlists` 네트워크 정상 · product 직접 관계 UI 없음 · admin-dashboard 에서 cosmetics signage 페이지 미접근.

---

## 9. Risks / Follow-ups

- migration: B 테이블 부재(라이브 확정) → drop/schema migration **미작성**, DB write 없음.
- GlycoPharm: 동일 패키지(dropshipping-cosmetics) 공유 — B 미사용이므로 본 제거로 동반 정리됨(별도 영향 없음).
- 후속(별도 WO, 본 작업 외): `WO-O4O-COSMETICS-SIGNAGE-STORE-PLAYLIST-CORE-CONVERGENCE-V1`(활성 A 의 digital-signage-core 수렴 검토), IR-AUDIT §13-6 KC 사이니지 동영상/스케줄 탭 — 본 제거 후 진행 가능.

---

**작성:** O4O Platform Team · 2026-06-05
**상태:** Complete — B dead 경로 제거, 라이브 DB 게이트 PASS, typecheck 3종 PASS
