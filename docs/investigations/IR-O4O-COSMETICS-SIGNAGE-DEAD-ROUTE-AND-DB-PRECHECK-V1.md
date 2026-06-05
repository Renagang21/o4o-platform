# IR-O4O-COSMETICS-SIGNAGE-DEAD-ROUTE-AND-DB-PRECHECK-V1

> `WO-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMOVE-V1` 진입 전 **제거 안전성 선행 검증**.
> K-Cosmetics 의 product 결합 사이니지 경로(B)가 런타임·프론트·DB 어디에도 살아 있지 않은지 확정한다.
>
> **조사 전용 — 코드/엔티티/마이그레이션/라우트/UI 수정 없음. DB write 없음.**

- **작성일:** 2026-06-05
- **분류:** Investigation (IR) — Removal Precheck
- **상태:** Complete (제거 진행 가능 판정 + 1개 잔여 게이트)
- **선행:** [`IR-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMEDIATION-V1`](IR-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMEDIATION-V1.md) (권장 B), [`IR-O4O-STORE-PRODUCT-TRADE-AND-ACTIVATION-FLOW-AUDIT-V1`](IR-O4O-STORE-PRODUCT-TRADE-AND-ACTIVATION-FLOW-AUDIT-V1.md) §12 R1
- **프로토콜:** [`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1`](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)

---

## 1. Summary

- **B 경로(product 결합)는 런타임에서 도달 불가능한 dead 코드로 확정.** 백엔드 모듈 routes 가 api-server 에 **마운트되지 않고**, 엔티티는 api-server TypeORM 연결에서 **이미 제거(Phase R1)**됨.
- admin-dashboard 에 B 엔드포인트(`/cosmetics/signage/playlists`, `/auto-playlist`)를 호출하는 페이지가 있으나, 그 엔드포인트는 **마운트되지 않아 404** → **client-only dead**.
- 활성 매장 사이니지(A, `/store-playlists`)는 **별도 구현**(snapshot/library/signage-media 기반, product 무관)이며 B 제거와 무관함을 재확인.
- **prod DB 라이브 확인은 차단**(로컬 env 에 prod 비밀번호 없음 + 방화벽) — 정적 증거상 테이블 미생성(DB_ABSENT) 고신뢰. 라이브 SELECT 는 Cloud SQL Admin API/Console 로 1회만 확인하면 게이트 종료.
- **판정: `ENTITY_ONLY_DEAD` + `DB_ABSENT(정적 확정)` → REMOVE-V1 진행 가능.** 단, 라이브 DB SELECT 1건을 제거 WO 착수 시 선실행 권장.

---

## 2. Scope

- 대상: `packages/dropshipping-cosmetics` 백엔드 모듈(signage-playlist / campaign), admin-dashboard cosmetics signage 페이지, 활성 매장 사이니지(A) 무영향 확인, prod DB 테이블 존재.
- 제외: 코드/엔티티/마이그레이션/라우트/UI 수정, DB write, A 경로·digital-signage-core 수정.

---

## 3. Background

K-Cosmetics 사이니지는 두 경로 공존:
- **(A) 활성** `cosmetics_store_playlists` / `store-playlist.controller` — snapshot 기반, product 무관.
- **(B) 제거 후보** `CosmeticsSignagePlaylist.items[].productId`, `CosmeticsCampaign.products[]`/`signagePlaylistId` — REMEDIATION IR 에서 dead 추정. 본 IR 이 이를 확정.

---

## 4. Route Mount Trace

| 항목 | 결과 | 근거 |
|---|---|---|
| B 모듈 routes 정의 | 존재 | `packages/dropshipping-cosmetics/src/backend/module.ts:50-84`(createSignagePlaylistRoutes/createCampaignRoutes 등록), `index.ts:56-70`(`routes()` 팩토리, Module Loader 호환) |
| api-server 가 B 모듈 `routes()`/`createCosmeticsModule` 를 호출/마운트 | **아니오** | api-server 전수 검색 결과 `@o4o/dropshipping-cosmetics` 의 backend routes import 없음. `createCosmeticsModule`/`createSignagePlaylistRoutes`/`createCampaignRoutes` 마운트 지점 없음 |
| 실제 마운트되는 cosmetics 라우트 | **api-server 자체 구현** | `apps/api-server/src/bootstrap/register-routes.ts:98,427` → `createCosmeticsRoutes`(`apps/api-server/src/routes/cosmetics/cosmetics.routes.ts`) |
| 그 라우트에 `/signage/playlists`·`/signage/auto-playlist`·`/campaigns` 존재 | **없음** | `cosmetics.routes.ts` 의 signage 관련은 `/store-playlists`(line 145)와 home feed용 `SignageQueryService`(line 270~) 뿐 |
| B 엔티티의 TypeORM 등록 | **제거됨(Phase R1)** | `apps/api-server/src/database/connection.ts:520-534` — "DOMAIN ENTITIES REMOVED … `@o4o/dropshipping-cosmetics`" |

→ **B 백엔드는 api-server 런타임에 마운트되지 않으며, 엔티티도 로드되지 않는다.** (= ENTITY_ONLY_DEAD)

---

## 5. Frontend/Admin Call Trace

| 소비처 | B 엔드포인트 호출 | 도달성 | 분류 |
|---|---|---|---|
| `services/web-k-cosmetics` | 없음 | — | 영향 없음 |
| `apps/admin-dashboard` | **있음** — `pages/cosmetics/signage/index.tsx`: GET/POST/DELETE `/cosmetics/signage/playlists`, POST `/cosmetics/signage/auto-playlist` | 해당 엔드포인트 **미마운트 → 404** | **CLIENT_ONLY_DEAD** |
| admin-dashboard `/cosmetics/campaigns` 호출 | 없음 | — | — |
| admin 페이지 라우팅 | `*Routes*.tsx` 에서 cosmetics/signage 페이지 등록 미발견 | 라우팅돼 있어도 엔드포인트 404 로 비작동 | orphaned/비작동 |

→ admin-dashboard 의 cosmetics signage 페이지는 **존재하지만 백엔드가 없어 작동하지 않는 client-only dead**. 제거 WO 범위에 함께 포함 권장.

---

## 6. Production DB Read-only Check

| 항목 | 결과 |
|---|---|
| 시도 방법 | `gcloud sql connect o4o-platform-db --user=o4o_user --database=o4o_platform` < (to_regclass 쿼리) |
| 결과 | **차단(blocked)** — 로컬 `apps/api-server/.env` 의 `DB_PASSWORD` 가 **빈 값(len=0)**, prod DB 는 방화벽으로 직접 접속 불가(CLAUDE.md §0). psql/gcloud 는 설치/인증됨(인스턴스 `o4o-platform-db` RUNNABLE 확인). 비밀번호 부재로 인증 실패(timeout) |
| 정적 추론 | **DB_ABSENT (고신뢰)** — `cosmetics_signage_playlists`/`cosmetics_campaigns` 생성 마이그레이션 없음 + B 엔티티가 TypeORM 연결에서 제거(synchronize 로도 생성 불가) → 테이블이 생성될 경로가 없음 |
| 잔여 게이트 | 라이브 1회 확인 권장(Cloud SQL Admin API 또는 Console SQL Editor): `SELECT to_regclass('public.cosmetics_signage_playlists'), to_regclass('cosmetics.cosmetics_signage_playlists'), to_regclass('public.cosmetics_campaigns'), to_regclass('cosmetics.cosmetics_campaigns');` 모두 NULL 이면 DB_ABSENT 확정 |

> 주의: read-only 만 시도. DROP/DELETE/UPDATE/ALTER 미수행.

---

## 7. Active Store Signage Non-Impact Check

| 항목 | 결과 |
|---|---|
| 활성 경로 | `/store-playlists` → `apps/api-server/src/routes/o4o-store/controllers/store-playlist.controller.ts` (각 서비스 라우트에서 마운트: cosmetics.routes.ts:145, kpa:387, glycopharm:394, neture:50) |
| item 소스 | snapshot / library / **signage-media**(`/items/from-signage`) — **product 없음** |
| 테이블 | `cosmetics_store_playlists` / `cosmetics_store_playlist_items`(`asset_type`+`reference_id`, migration 20260212000003) — product 컬럼 없음 |
| frontend | `services/web-k-cosmetics/.../store/StoreSignagePage.tsx` — `assetSnapshotApi.copy` 기반 |
| B 제거 영향 | **없음** — A 는 B 와 코드·테이블·라우트가 완전히 분리됨 |

---

## 8. Consumer Impact Matrix

| 소비처 | 사용 여부 | 조사 영향 | 확인 항목 | 결과 |
|---|---:|---|---|---|
| K-Cosmetics store | 사용 | 있음 | 활성 A(StoreSignagePage/store-playlists) 무영향 | PASS — B 제거 무관 |
| K-Cosmetics backend(api-server) | 사용 | 있음 | B route/entity runtime 마운트 | PASS — 미마운트·엔티티 제거됨 |
| admin-dashboard | 사용 | 있음 | B endpoint 호출 | NOTE — client-only dead(404), 함께 제거 권장 |
| KPA-Society | 미사용 | 없음 | digital-signage-core 표준 | PASS |
| GlycoPharm | 확인 필요 | 낮음 | 동일 패키지(B) 코드 — 동일하게 미마운트 | NOTE — 패키지 제거 시 동반 정리 |
| Neture | 미사용 | 없음 | 매장 사이니지 대상 아님 | PASS |

---

## 9. Classification

| 대상 | 분류 |
|---|---|
| B 백엔드(`dropshipping-cosmetics` signage-playlist/campaign route·service·entity) | **ENTITY_ONLY_DEAD** (마운트 없음 + 엔티티 미등록 + 마이그레이션 없음) |
| admin-dashboard cosmetics signage 페이지 | **CLIENT_ONLY_DEAD** (미마운트 엔드포인트 호출 → 404) |
| `cosmetics_signage_playlists` / `cosmetics_campaigns` 테이블 | **DB_ABSENT** (정적 확정, 라이브 1회 확인 보류) |
| 활성 매장 사이니지(A) | **ACTIVE — 제거 대상 아님** |

---

## 10. Removal Readiness Decision

**판정: REMOVE-V1 진행 가능 (READY).**

REMEDIATION IR §7 의 진행 조건 대조:
1. B route api-server 마운트 없음 → ✅ 충족
2. admin/K-Cosmetics frontend 실사용 경로 없음(admin 호출은 404 dead) → ✅ 충족
3. prod DB 테이블 부재 → ✅ 정적 확정(라이브 1회 확인 권장 — 잔여 게이트)
4. 활성 A 무영향 재확인 → ✅ 충족
5. StoreSignagePage / cosmetics_store_playlists(_items) 비대상 명확 → ✅ 충족

즉시 중단 트리거(REMEDIATION IR) 해당 없음(테이블·활성 호출·활성 마운트 모두 없음).

**권장:** REMOVE-V1 착수 시 **라이브 DB SELECT 1건(§6)을 선실행**하여 DB_ABSENT 를 최종 확정한 뒤 제거. 제거 범위에 **admin-dashboard cosmetics signage 페이지(client-only dead)**도 포함.

---

## 11. Risks

| # | Risk | 등급 | 비고 |
|---|---|---|---|
| 11-1 | 라이브 DB 미확인 — 정적상 DB_ABSENT 이나 1회 SELECT 미수행 | LOW | REMOVE 착수 시 선실행으로 종료 |
| 11-2 | B 패키지가 GlycoPharm 등 다른 소비처에도 노출 가능성(패키지 단위 제거 시) | LOW | 동일 미마운트 — 동반 정리, smoke 로 확인 |
| 11-3 | admin-dashboard signage 페이지 라우팅 잔존 시 빈 화면/404 UX | LOW | 페이지 동반 제거 권장 |

---

## 12. Recommended Next Step

`WO-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMOVE-V1` 진행. 범위:
- `packages/dropshipping-cosmetics` 의 B 계열(signage-playlist/campaign) entity·service·route·DTO·module 등록 제거(REMEDIATION 권장 B: deprecated→제거 또는 일괄 제거).
- admin-dashboard `pages/cosmetics/signage/*` (client-only dead) 동반 제거.
- 착수 시 §6 라이브 SELECT 선실행. 활성 A·digital-signage-core·store-playlists 무접촉.

---

## 13. Evidence

- B 모듈 정의/팩토리: `packages/dropshipping-cosmetics/src/backend/module.ts:50-84`, `backend/index.ts:56-70`
- api-server 마운트(B 없음, 네이티브만): `apps/api-server/src/bootstrap/register-routes.ts:98,427`, `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts:145,270`(signage 관련=store-playlists+home feed only)
- B 엔티티 미등록: `apps/api-server/src/database/connection.ts:520-534` (Phase R1 REMOVED — `@o4o/dropshipping-cosmetics`)
- admin 호출(404 dead): `apps/admin-dashboard/src/pages/cosmetics/signage/index.tsx:57,77,83,112`
- 활성 A: `apps/api-server/src/routes/o4o-store/controllers/store-playlist.controller.ts`(from-signage=SignageMedia, product 무관), `apps/api-server/src/database/migrations/20260212000003-CreateCosmeticsStorePlaylistTables.ts:37-55`
- DB 확인 시도: `gcloud sql instances list`(o4o-platform-db RUNNABLE), connect 차단(로컬 DB_PASSWORD 공백 + 방화벽)

---

**작성:** O4O Platform Team · 2026-06-05
**상태:** Complete — REMOVE-V1 진행 가능(라이브 DB SELECT 1건 선실행 권장)
