# IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1 — PASS 2

> **이 문서는 같은 날 먼저 작성된 [`IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1`](IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1.md)(`e0a8e96c8`, base `e19aeb2aa`)의 **두 번째 독립 조사**다.**
> 첫 조사를 덮어쓰지 않는다. 두 조사는 도구와 base 가 다르며, 이 문서는 첫 조사 이후 main 에 들어온
> 5개 마감(KCos `/store-contents` wrapper · Neture `/store-assets` 제거 · POP legacy 즉시 PDF 제거 · admin legacy route 폐쇄 · archive disposition)을
> 반영한 `45ac4d052` 트리 기준이다.
>
> **PASS 2 가 더한 것**: ① 프로덕션 테이블 274 vs `@Entity` 287 전수 diff — *등록 entity 35개에 테이블이 없다*(§4-3) ·
> ② KPA 하드코딩 마운트의 **현재 HEAD 잔여 2곳**(§10) · ③ 5서비스 페이지 사본 heuristic(§4-8) · ④ 기능 단위 45 CSV.
> **첫 조사가 더 깊은 것**: route 3,047 리터럴 대조 · admin BROKEN_UI_API 17 · 패키지 내부 미도달 src · UNKNOWN 33 목록. 두 문서를 함께 읽는다.


- **WO**: IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1
- **작성일**: 2026-09-11
- **기준점**: `origin/main` = `45ac4d052` · 전용 worktree `C:\tmp\o4o-legacy-census` · branch `work/repo-legacy-census-v1` · working tree clean · 병렬 worktree 12개(미접촉)
- **입력**: `WO-O4O-ARCHIVE-RETENTION-AND-TRACKED-BACKUP-FINAL-DISPOSITION-V1 = CLOSED` (root archive 제거 완료 · `docs/archive/**` 보존 · `tmp/**` 169파일 인계)
- **성격**: 조사 전용 — **CODE CHANGE 0 · SCHEMA CHANGE 0 · PRODUCTION WRITE 0**
- **machine-readable**: [`data/repository-legacy-census-v1.csv`](data/repository-legacy-census-v1.csv) (45 기능 단위)

---

## 1. Executive Summary

> **이 저장소의 "옛 세대"는 파일이 아니라 세 겹의 층으로 남아 있다.**
>
> 1. **WordPress 형 CMS/테마/분류 계층** — TypeORM 에 등록된 entity ~35개가 **프로덕션에 테이블이 없다.** 호출되면 500. 프론트(admin) 쪽은 `45ac4d052` 로 이미 닫혔고 백엔드 entity·route 가 남았다.
> 2. **KPA 하드코딩 공용 컨트롤러** — `isStoreOwner(…,'kpa')` + `KpaMember` fallback 이 박힌 컨트롤러 5개. 직전 회차들이 KCos `/assets`·`/store-contents`·`/published-assets` 와 Neture `/store-assets` 를 닫았고, **live 잔여는 KCos `/store-assets` 1곳(P0)** 과 Neture `/assets`(consumer 0) 뿐이다.
> 3. **세대 교체가 끝났는데 남은 사본** — 인증 페이지 5종이 서비스마다 복제돼 있고(공통화 트랙 main 미병합), KPA `SignagePlaybackPage` 533줄 등 공통 View 를 안 쓰는 로컬 사본이 있다.
>
> 반면 **가장 큰 용량(`tmp/` 42MB)은 대부분 삭제 대상이 아니다** — 6개 배치가 `rollback.sql.gz` 를 동반한 운영 복구 자료다.
>
> POP legacy 즉시 PDF 축은 **이미 제거됐다**(체인 ④ 완료). 재조사할 것이 없다.

집계(기능 단위 45):

```text
CANONICAL_ACTIVE / SUPPORTING    3
LEGACY_ACTIVE                    4   (F01 P0 · F04 · F43 · F37 in-flight)
LEGACY_COMPATIBILITY             3
LEGACY_INTERMEDIATE              1
LEGACY_DUPLICATE                 3
CANONICAL_NEEDS_ALIGNMENT        2
RETIRE_READY                     1
DEAD_*  (code/route/package/schema/generated)   16
KEEP 계열 (historical/operational/migration)     3
UNKNOWN_STOP / NEEDS_BUSINESS_DECISION           5
RETIRED (이미 제거됨 · 확인만)                     1
─────────────────────────────────────────────
P0 2 · P1 4 · P2 16 · P3 14 · 등급 없음 9
```

---

## 2. Method

| 축 | 방법 | 한계 |
|---|---|---|
| repository surface | `git ls-files` 27,935 · 영역별 집계 | untracked 로컬 영역은 제외 |
| package | 66개 `package.json` 의존 그래프 + `from '@o4o/...'` import 카운트 | type-only import 미구분 |
| generated artifact | `src/**` 의 `.js/.d.ts/.map` 중 `.ts` 형제·`outDir`·`exports` 대조 | — |
| route (backend) | `register-routes.ts` 122 mount → 93 prefix vs 프론트 문자열 리터럴 | 템플릿 조립 경로는 0 으로 잡힐 수 있음 (§5 caveat) |
| route (frontend) | `App.tsx` `<Route>` / `<Navigate>` 카운트 | admin 은 registry 기반 → 선행 CHECK 인용 |
| schema | 프로덕션 `pg_stat_user_tables` 274 vs `@Entity` 287 vs raw SQL 참조 | n_live_tup 은 추정치 |
| duplicate | 5서비스 `pages/**` 동일 파일명 × 공통 core import 여부 × 줄수 | `@o4o/operator-core`(non-UI) 는 core 목록 제외 → 운영자 소형 페이지는 과탐 가능 |
| production | read-only SELECT 1회(테이블 인벤토리) + Cloud Run 서비스 목록 | 요청 로그 미조회 |

**판정 원칙**: "오래됨 ≠ dead", "row 0 ≠ dead", "frontend 0 ≠ 즉시 삭제". 모든 DEAD 판정은 runtime mount·frontend·test·CI·DB·대체 경로를 함께 봤다.

---

## 3. Repository census

```text
docs 15,623 · apps 8,826 (api-server 8,198 / admin 545 / page-generator 44 / forum-web 23 / forum-api 14 / mobile-app 1)
packages 1,462 (66 패키지) · services 1,329 (8) · tmp 169 · scripts 54 · tools 31 · e2e 30 · .github 22
```

### 3-1. 배포 실체 (Cloud Run, asia-northeast3)

```text
배포 중 : o4o-core-api · o4o-admin-dashboard · kpa-society-web · k-cosmetics-web · pharmacy-hub-web ·
          neture-web · kpa-branch-web · signage-player-web · glucoseview-web(★저장소에 소스 없음)
미배포  : apps/forum-api · apps/forum-web · apps/page-generator · services/web-account(Dockerfile 있음) · services/mobile-app(Expo 독립)
```

★ `glucoseview-web` 은 2026-04-14 이후 리비전 없음. 저장소에서 서비스는 삭제됐으나 **Cloud Run 서비스는 살아 있다** (F36 · 저장소 밖 잔재).

---

## 4. Feature-level findings (기능 단위)

### 4-1. P0 — tenant/security correctness

| ID | 기능 단위 | 상태 | 근거 |
|---|---|---|---|
| **F01** | **KCos `/store-assets` → KPA org resolver + `kpa_store_asset_controls` 읽기·쓰기** | **LEGACY_ACTIVE · P0** | `cosmetics.routes.ts:183` 가 `createStoreAssetControlController`(`isStoreOwner('kpa')`+`KpaMember`) 를 그대로 마운트. 소비처 = **메뉴 노출** `/store/channels`(`StoreChannelsPage`). KCos 사용자의 게시/채널 토글이 **KPA 조직 행**으로 기록된다. 직전 WO 가 `PRESERVED_WITH_REASON`(메뉴 dead link 회피)으로 남겼다. controls 7행 전부 KPA 조직 |
| **F02** | Neture `/api/v1/neture/assets` → KPA `createAssetSnapshotController`(`kpa:*` role) | **DEAD_ROUTE · P0** | `neture.routes.ts:55`. `web-neture` 에 `/assets` 호출 0. Neture 전용 사용자는 403, 두 서비스 가입자는 KPA 조직 스냅샷 노출. **consumer 0 이라 즉시 제거 가능** |

### 4-2. KPA 하드코딩 공용 컨트롤러 (F03)

```text
store-content.controller        25건   KPA 마운트만 (KCos 는 wrapper 로 전환 완료)
store-library-feed.controller   12건   KPA 마운트만 · kpa_store_asset_controls JOIN
asset-snapshot.controller        6건   KPA + Neture(F02)
store-asset-control.controller   5건   KPA + KCos(F01)
published-assets.controller      2건   KPA 만 (KCos 마운트 제거됨)
```

**판정 CANONICAL_NEEDS_ALIGNMENT** — KPA 마운트 자체는 정상. 규칙은 이미 DESIGN(`DESIGN-O4O-STORE-LIBRARY-AND-ASSET-CANONICAL-SOURCE-V1` §3)에 확정: *"공용 controller 에 `'kpa'` 가 박혀 있으면 다른 서비스에서 마운트하지 않는다."* 남은 위반 = F01·F02.

### 4-3. WordPress 형 CMS/테마/분류 계층 (F10 · F11 · F12 · F13 · F14)

프로덕션 테이블 274 vs `@Entity` 287. **entity 는 있으나 테이블이 없는 것 71개** — 그중 `database/entities.ts` 에 **등록된 것 35개**:

```text
categories · tags · terms · taxonomies · term_relationships · themes · theme_installations · widget_areas ·
template_parts · template_presets · view_presets · form_presets · customizer_presets · reusable_blocks ·
block_patterns · cms_pages · cms_views · cms_cpt_types · cms_fields · custom_field_groups/values · custom_posts ·
cms_media(+files/folders/tags) · partners · partner_contents/events/targets · linking_sessions ·
smtp_settings · approval_logs · role_applications · user_activity_logs
```

- TypeORM 은 metadata 를 로드하지만 **테이블이 없으므로 어떤 쿼리도 500** 이다.
- 프론트 소비처(admin CMS/테마/CPT 화면)는 `CHECK-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1` 에서 BROKEN 17/dead link 33 으로 이미 정리됐다.
- 등록되지 않은 36개(`cms-core` acf/menu/media/template 14 · `cosmetics-*` 12 · `neture-*` 4 · `partner-core` 5 · 기타)는 **DEAD_CODE** (런타임 미로드).
- `/api/v2/roles`(role_applications) · `/api/v1/userRole` 는 프론트 0 + 테이블 부재 → **DEAD_ROUTE**.

**판정**: 등록 35 = DEAD_SCHEMA_RESIDUE(entity 측). 삭제 순서는 §14 그래프대로 **route → controller/service → entities.ts 등록 해제 → entity 파일**. 테이블이 없으므로 DROP migration 은 불필요하다.

### 4-4. POP legacy (F05 · F06)

`POST /pharmacy/pop/generate` · `StorePopCreateModal` · `storePop` api 는 **`WO-O4O-STORE-POP-LEGACY-INSTANT-PDF-RETIREMENT-FINAL-CLOSURE-V1` 에서 제거 완료** — 소스에 파일 없음, 백엔드 주석으로 확인. 잔여는 `ProductPopBuilderPage`(KPA/KCos) **redirect-only** 호환 route 2개 + `marketing/pop → pop-v2` redirect. 체인 ④ 는 실행됐다. **재조사 대상 없음.**

### 4-5. Commerce / checkout (F08 · F09)

- `POST /initiate`·`/confirm` 은 이미 제거(플랫폼 직접판매 = NONE). 남은 `/api/checkout` 3 route(refund · orders 조회) 는 **프론트 0**, `/api/orders` 는 같은 라우터의 **중복 alias**, `/api/admin/orders` 는 admin UI 가 `REMOVE_BROKEN_UI` 로 제거돼 백엔드만 남음 → **RETIRE_READY**. 단 `checkout_orders`(23행) 테이블은 **B2B canonical 원장 — 보호**.
- `packages/partner-core`: 의존자 0 · import 0 · `/api/partner`·`/api/v1/partner` 프론트 0 · `partner_referrals/settlements/commissions` 0행 · entity 5개 테이블 부재 → **DEAD_PACKAGE / DEAD_ROUTE**. (Neture Partner Contract F7 은 별도 테이블 세트 — 혼동 금지)

### 4-6. Signage (F28 · F29)

- `signage_forced_content(+positions)` 0행 + `forced-content.controller` 마운트 → **LEGACY_INTERMEDIATE**(본사 강제 배포 축. HUB 큐레이션으로 대체됐는지 사업 판단 필요).
- `signage_playback_logs` 는 **2026-09-10 신설**(0행) — 신규 텔레메트리, 잔재 아님.
- `signage-player-web` 은 배포 중(00049) — CANONICAL.

### 4-7. Role / auth (F41 · F37)

- `types/roles.ts` 의 bare legacy role(`pharmacy`·`customer`)은 과도기 버킷으로 명시돼 있고 role migration 이력이 있다 → LEGACY_COMPATIBILITY, consumer 0 확인 전 후보화만.
- 인증 페이지 복제: `ResetPasswordPage` ×5 · `AccountRecoveryPage` ×3(251/238/237) · `VerifyEmailPage` ×3(**137/137/137 — 동일 사본**) · `LoginPage` ×3 · `HandoffPage` ×3 — `@o4o/auth-react` 공통화 트랙(worktree `o4o-auth-commonize`, main 미병합)이 이미 있다 → **LEGACY_DUPLICATE (in-flight)**, 새 WO 를 만들지 않고 그 트랙의 병합으로 닫는다.

### 4-8. Duplicate commonization (F38 · F39 · F40 · F43)

| 발견 | 판정 |
|---|---|
| `SignagePlaybackPage` KPA **533줄·공통 core 미사용** vs KCos 39·PH 70(공통) | **LEGACY_DUPLICATE** — KPA 만 세대 교체가 안 됨 |
| `InstructorDashboardPage` 564/121/277 | LEGACY_DUPLICATE (LMS 트랙) |
| 공통 View 를 쓰면서도 >150줄인 어댑터 12개 (`SupplierProductsPage` 1746 · `StoreCockpitPage` 677 · `ContentListPage` 762 …) | CANONICAL_NEEDS_ALIGNMENT — 얇은 어댑터 원칙 위반 후보 (DIFFERENT_BUSINESS_MODEL 가능성 개별 확인 필요) |
| 1세대 tablet view(`store-ui-core/tablet/`) · `StoreQrConsoleView` — KCos 만 소비 | LEGACY_ACTIVE — 2세대(`TabletCornerBoard`/`StoreQrOperationBoard`) 존재, KCos 채택 대기 |
| Neture `StoreCartPage` 213줄 공통 미사용 | DIFFERENT_BUSINESS_MODEL (Neture B2B) — 공통화 대상 아님 |

`web-kpa-branch` 25 페이지는 공통 store/operator core 를 하나도 쓰지 않는다 — 분회 서비스는 매장 모델이 없어 **의도된 분리**(INTENTIONAL).

### 4-9. Mock / placeholder (F17 · F10)

- `apps/admin-dashboard/public/mockServiceWorker.js` — `msw` import 0 → DEAD_GENERATED_ARTIFACT.
- "Admin Overview 목업 · Theme entity" — Theme 는 F10 계층(테이블 부재), Overview 목업은 admin 폐쇄 CHECK 의 `fake data 처분` 항목으로 이미 처리됨.

---

## 5. Route findings

### 5-1. Backend (mount 122 → prefix 93)

프론트 문자열 리터럴 호출 **0** 인 mount 19:

```text
/api/ai/admin  /api/auth  /api/checkout  /api/health  /api/market-trial  /api/operator  /api/orders  /api/partner
/api/v1/admin/o4o-product-db/product-contents  /api/v1/admin/security  /api/v1/auth/guest  /api/v1/auth/service
/api/v1/cafe24-b2b  /api/v1/neture/operator/market-trial  /api/v1/organizations  /api/v1/platform-services
/api/v1/platform/copilot  /api/v1/platform/slug  /api/v1/store/product-requests
```

**caveat**: `/api/auth`·`/api/health`·`/api/v1/auth/service`·`/api/v1/platform/copilot` 등은 클라이언트가 baseURL·템플릿으로 조립해 리터럴 검색에 안 잡힌다. **이 목록은 후보이지 판정이 아니다.** 판정 가능한 것만 §4 에 올렸다(`/api/checkout`·`/api/orders`·`/api/partner`·`/api/v2/roles`·`/api/v1/userRole`). 나머지는 **요청 로그 census(F42)** 후 판정.

### 5-2. Frontend

| 서비스 | route | redirect-only | 판정 |
|---|---|---|---|
| kpa-society | 227 | **40** | LEGACY_COMPATIBILITY (딥링크 호환) |
| neture | 296 | **41** | 〃 |
| k-cosmetics | 173 | 17 | 〃 |
| pharmacy-hub | 96 | 2 | — |
| kpa-branch | 34 | 0 | — |
| admin | registry 기반 | — | `45ac4d052` CHECK 인용 |

redirect-only 98개는 삭제가 아니라 **호환 기간 정책**(예: 60일 무접근 후 제거)이 필요하다. 이번 IR 은 개수만 확정한다.

---

## 6. Package findings

| 패키지 | 의존자 | import | 판정 |
|---|---|---|---|
| `@o4o/api-types` · `financial-core` · `@o4o-apps/forum-cosmetics` · `@o4o-extensions/organization-lms` | 0 | 0 | **DEAD_PACKAGE** |
| `@o4o/partner-core` | 0 | 0 | DEAD_PACKAGE (F09) |
| `@o4o/auth-core` | 0 | 0 | **UNKNOWN_STOP** — CLAUDE.md §3 동결 Core. 의존 0 이지만 동결 대상이라 명시 WO 없이 판정하지 않는다 |
| `apps/forum-api` | — | 미배포 · CI 없음 · 2025-12 이후 미변경 | DEAD_PACKAGE (api-server `/api/v1/forum` 이 대체) |
| `apps/forum-web` | — | 미배포 | DEAD_PACKAGE |
| `apps/page-generator` | — | 미배포 · CI 없음 | UNKNOWN_STOP (AI 페이지 생성기 — 사업 판단) |
| `services/web-account` | — | type-check 포함 · Dockerfile 있음 · **Cloud Run 서비스 없음** | **NEEDS_BUSINESS_DECISION** — `O4O-MYPAGE-CANONICAL-V1` 이 canonical 로 지정했으나 배포되지 않았다 |
| `apps/mobile-app` | 1파일(`android/.gitignore`) | — | DEAD_GENERATED_ARTIFACT |

---

## 7. Generated artifacts (tracked)

| 위치 | 파일 | 판정 | 근거 |
|---|---|---|---|
| `packages/forum-core/src/**` | 32 (`.js/.d.ts/.map`) | **DEAD_GENERATED_ARTIFACT** | `outDir=dist` · `exports` 전부 `dist/` · 모든 `.js` 에 `.ts` 형제 — **단 `ForumTag.js` 는 소스가 없다**(삭제된 소스의 stale 산출물) |
| `packages/auth-client/src/**` | 28 | **DEAD_GENERATED_ARTIFACT** | 동일 |
| `apps/admin-dashboard/public/mockServiceWorker.js` | 1 | DEAD_GENERATED_ARTIFACT | msw 미사용 |
| `tools/o4o-chrome-extension/src/*.js` | 7 | **소스** (확장 프로그램 JS) — 잔재 아님 | |
| `packages/utils/src/tailwind-merge.d.ts` | 1 | 수기 타입 shim — 유지 | |

`.gitignore:64-69` 에 `@o4o/types` 동일 잔재를 정리한 선례가 있다. 같은 방식(ignore + `git rm --cached`)으로 닫는다.

---

## 8. tmp/** (169 파일 · 42MB)

| 묶음 | 파일 | 판정 | 근거 |
|---|---|---|---|
| apply+rollback 배치 6개 (`cosmetics-guide-gap-enrichment` · `cosmetics-mfds-usage-caution` · `cosmetics-store-to-b2b-copy` · `cosmetics-productmaster-apply-pilot` · `cosmetics-name-cleanup` · `product-landing-coverage-closure`) | ~70 | **OPERATIONAL_RECOVERY_KEEP** | `rollback.sql.gz` + `apply-log.txt` + `baseline-before.txt` 동반 — 프로덕션 write 의 되돌리기 자료 |
| 대용량 census/pilot 데이터 (`cosmetics-retail-census` 12 · `cosmetics-pilot` 7 · `cosmetics-guide-production` 20, `.json.gz` ≈ 30MB) | ~39 | **UNKNOWN_STOP** | 적용된 배치의 **입력 모집단**. 재생성 스크립트가 같은 폴더에 있으나 외부 소스(무신사 등) 스냅샷은 재현 불가 → 감사 보존 여부는 사용자 판단 |
| 파이프라인 `.mjs` | 35 | **ACTIVE_FIXTURE_RELOCATE** | 실행 스크립트가 `tmp/` 에 있으면 "임시" 로 오인된다 → `apps/api-server/src/scripts/` 로 이동 |
| `*_install.sql` 4 (organization_core · membership_yaksa · forum_yaksa · forum_core) | 4 | **MIGRATION_HISTORY_KEEP** | `forum_yaksa_install.sql` 은 문서 4곳이 참조 |
| `delete_list_*.json` 4 | 4 | OPERATIONAL_RECOVERY_KEEP | 삭제 배치의 대상 원장 |
| 기타 (`product-db-write-authority` 7 · `product-ai-tags-ownership` 6 · `admin-product-description-auth-boundary` 3 · `supplier-productmaster-nondestructive-link` 2) | 18 | OPERATIONAL_RECOVERY_KEEP | smoke/검증 산출물 — 해당 CHECK 가 참조 |

**민감정보**: `password|token|cookie|private key|connection string` 패턴을 `tmp/**` 파일명·확장자 수준에서 확인 — `.sql.gz`/`.json.gz` 본문은 열지 않았다(§29). **SECURITY_STOP 없음**(파일명 기준). 본문 검사는 disposition WO 에서 압축 해제 없이 `zgrep` 으로 수행할 것.

---

## 9. Schema residue

### 9-1. 프로덕션 테이블 — entity 없음 + raw SQL 참조 없음 (21)

| 테이블 | 행 | 판정 |
|---|---|---|
| `_bak_orphan_representative_products_20260706` | **16,571** | DROP_CANDIDATE — 백업 테이블. 보존 기한 결정 필요 |
| `offer_curations_backup_20260409` | 0 | DROP_CANDIDATE |
| `yaksa_*` 9개 (`yaksa_categories` 5 외 전부 0) | 5/0 | DROP_CANDIDATE — organization-core/kpa_members 로 대체된 옛 세대 |
| `apps` 1 · `app_instances` 0 | | DROP_CANDIDATE — `app_registry`(2) 가 정본 |
| `custom_post_types` · `pages` · `views` · `role_permissions` · `forum_bookmark` · `kpa_stewards` | 0 | DEAD_SCHEMA_RESIDUE |
| `product_candidate_cleanup_audits` 3,624 · `_snapshots` 15,776 | | **OPERATIONAL_RECOVERY_KEEP** (감사 원장) |

### 9-2. raw SQL 참조는 있으나 entity 없는 활성 테이블 (37) — 잔재 아님

`product_landings` 272,040 · `store_tablet_screen_sets` 58 · `store_tablet_screen_blocks` 199 · `local_agent_*` · `handoff_tokens` 등은 **raw SQL 기반 canonical** 이다. entity 부재 = 설계(raw SQL 계약). DROP 대상 아님.

### 9-3. entity 있음 + 테이블 없음 (71) — §4-3

### 9-4. 컬럼 잔재

| 컬럼 | 판정 |
|---|---|
| `store_qr_codes.type` | **COMPAT_SCHEMA → DROP_CANDIDATE** — canonical 은 `landing_type`, 2행이 이미 어긋남(선행 CHECK 실측). 읽기·쓰기 0 |
| `kpa_store_contents` 이름 | COMPAT (legacy physical name · rename 은 별도 판단) |

**이번 IR 에서 DROP migration 은 만들지 않는다.**

---

## 10. Cross-service hardcoding

`isStoreOwner(…,'kpa') | resolveKpa* | KpaMember | sourceService:'kpa' | kpa_store_*` 가 KPA 외 route 에 mount 되는 사례:

| 마운트 | 상태 (2026-09-11 HEAD) |
|---|---|
| KCos `/assets` | ✅ 교정 (`cefec2e2d`) |
| KCos `/store-contents` | ✅ wrapper (`WO-…KCOS-STORE-CONTENTS-WRAPPER…`) |
| KCos `/published-assets` | ✅ 제거 |
| Neture `/store-assets` | ✅ 제거 |
| **KCos `/store-assets`** | ❌ **잔존 (F01 · P0)** |
| **Neture `/assets`** | ❌ **잔존 (F02 · P0 · consumer 0)** |
| PH 전 마운트 | ✅ PH 전용 resolver |

---

## 11. Security / tenant risks

| # | 위험 | 등급 | 조치 |
|---|---|---|---|
| 1 | F01 — KCos 채널 관리에서 KPA 조직 스냅샷 노출 + KCos 조작이 KPA 조직 행으로 기록 | **P0** | 사용자 승인 후 WO-B. 이번 IR 수정 0 |
| 2 | F02 — Neture 경로로 KPA 스냅샷 노출 가능(consumer 0) | **P0** | WO-C (1줄 제거) |
| 3 | F10 — 테이블 없는 entity route 호출 시 500 (정보 노출 아님·가용성) | P2 | WO-H |
| 4 | tracked secret | **없음** (파일명 기준) | disposition 시 `zgrep` |

---

## 12. Production evidence (read-only · write 0)

```text
pg_stat_user_tables 274 · @Entity 287 · 교집합 216
kpa_store_asset_controls 7 (KPA 3조직) · o4o_asset_snapshots 20 · kpa_store_contents 15 · store_execution_assets 49
store_pops 0 · store_pop_documents(V2) 16 · store_qr_codes 92 · checkout_orders 23 · store_cart_items 0
partner_* 0 · signage_forced_content 0 · signage_playback_logs 0(신설) · market_trials 1
_bak_orphan_representative_products_20260706 16,571 · yaksa_* 0(categories 5) · apps 1 / app_instances 0 / app_registry 2
Cloud Run: 9 services (glucoseview-web = 저장소 소스 없음) · jobs 8
```

---

## 13. Canonical vs legacy map (요약)

| 영역 | CANONICAL | LEGACY / DEAD |
|---|---|---|
| 매장 자료 | `kpa_store_contents` + `store_execution_assets` + POP V2 + QR (DESIGN 확정) | snapshot/asset-control 은 KPA 확장(KPA_SPECIFIC) |
| POP | `store_pop_documents` V2 | instant PDF 축 **제거 완료** · redirect 2 |
| QR | `landing_type`/`content_source`/`store_qr_placements` | `type` 컬럼 |
| Tablet | 2세대 `TabletCornerBoard` + `tablet-kiosk-core` | 1세대 `store-ui-core/tablet/`(KCos) |
| Signage | playlists/schedules/media + player-web + playback_logs | forced_content(0행) |
| 매장 실행 관리 | `StoreExecutionPage` KPA/PH (DESIGN 후 구현됨) | — |
| CMS | content-core/cms-core 활성 entity | WordPress 형 35 entity(테이블 없음) |
| Commerce | B2B `store_cart_items → checkout_orders` | 소비자 checkout 제거 완료 · `/api/checkout` 잔여 3 route |
| Forum | api-server `/api/v1/forum` + forum-core | `apps/forum-api` · `apps/forum-web` |
| Auth UI | `@o4o/auth-react`(미병합 트랙) | 서비스별 인증 페이지 사본 ×3~5 |
| Apps | `app_registry` | `apps` · `app_instances` |

---

## 14. Removal dependency graph (아래부터 지우면 위가 깨진다)

```text
[F10 WordPress 계층]
  admin route (제거됨 45ac4d052)
    → /api/v1/cms · /api/v1/cpt · /api/v1/settings · /api/v2/roles · /api/v1/userRole  (route)
      → controller/service (cms/theme/taxonomy/role-application)
        → database/entities.ts 등록 35
          → entity 파일 (테이블 없음 → DROP 불요)

[F01 KCos /store-assets]
  storeMenuConfig(store-ui-core) '/channels' 항목  ← 공통 config
    → StoreChannelsPage(KCos) listAssets/updatePublish/updateChannel
      → /cosmetics/store-assets mount
        → store-asset-control.controller (KPA 유지)
          → kpa_store_asset_controls (KPA 유지)
  ※ 순서: 화면의 자산 목록을 /assets 로 전환 + 게시/채널 편집 KCos 미채택 명시 → mount 제거

[F08 checkout 잔여]
  admin UI (제거됨) → /api/admin/orders · /api/checkout · /api/orders → CheckoutController.refund/getOrders
  ※ checkout_orders 테이블·checkoutService.createOrder 는 B2B canonical — 손대지 않음

[F15/F16 generated]  .gitignore 추가 → git rm --cached  (소스·dist 무관)

[F30/F31 forum apps]  workspace 제외 → 디렉터리 삭제  (api-server forum 무관)
```

---

## 15. Priority queue

| 등급 | 항목 |
|---|---|
| **P0** | F01 KCos `/store-assets` · F02 Neture `/assets` |
| **P1** | F03 공용 컨트롤러 정렬 규칙 · F37 인증 페이지 사본(트랙 병합) · F38 KPA SignagePlaybackPage · F43 1세대 tablet/QR view(KCos) |
| **P2** | F08 checkout 잔여 · F09 partner-core · F10~F14 WordPress 계층 · F28 forced content · F30~F33 미배포 앱 · F35 0-의존 패키지 · F39/F40 사본·비대 어댑터 · F42 리터럴 0 mount |
| **P3** | F06/F07 redirect 호환 · F15~F17 generated · F18~F21 tmp · F22~F27 schema · F34 · F36 glucoseview · F41 bare role |

---

## 16. Proposed large WOs

| WO | 범위 | prerequisite | blocked-by | 예상 제거 | 회귀 범위 |
|---|---|---|---|---|---|
| **WO-B** KCOS-STORE-CHANNELS-ASSET-AXIS-CLOSURE | F01: `StoreChannelsPage` 자산 목록을 `/assets` 로 전환 · 게시/채널 편집 KCos 미채택 명시 · `/store-assets` 마운트 제거 · `storeMenuConfig` 조정 없음(경로 유지) | DESIGN §3 | 없음 | route 1 · api 3함수 | KCos 채널 화면 · KPA 무영향 |
| **WO-C** NETURE-KPA-SNAPSHOT-MOUNT-REMOVAL | F02: `neture.routes.ts:55` 제거 + import | 없음 | 없음 | 1줄 | Neture 무영향(consumer 0) |
| **WO-D** DEAD-PACKAGE-AND-GENERATED-RESIDUE-CLEANUP | F15/F16/F17/F34 generated 61파일 · F30/F31 forum apps 37파일 · F35 0-의존 패키지 4(auth-core 제외) · F32/F33 은 **사업 판단 후** | 없음 | F32/F33 결정 | ~200 파일 | build:packages · type-check:frontend · CI |
| **WO-E** TMP-OPERATIONAL-RECOVERY-DISPOSITION | F18 KEEP(위치 이동 여부) · F19 사용자 판단 · F20 `.mjs` 35 이동 · F21 KEEP | 없음 | F19 결정 · `zgrep` 민감정보 | 삭제 0~39 · 이동 35 | 없음(런타임 무관) |
| **WO-F** SCHEMA-COMPATIBILITY-RESIDUE-CLEANUP | F22 백업 테이블 2 · F23 yaksa 9 · F24 apps/app_instances · F25 0행 6 · F27 `store_qr_codes.type` | 보존 기한 결정(F22) | DROP migration = 사용자 승인 | 테이블 19 · 컬럼 1 | migration 실행 · QR 회귀 |
| **WO-G** COMMERCE-AND-DEAD-ROUTE-RETIREMENT | F08 checkout 3 route + alias · F09 partner-core + routes · F14 roles routes · F42 리터럴 0 mount **요청 로그 census 후** | 요청 로그 60일 | commerce 경계 확인 | route ~8 · 패키지 1 | B2B cart/checkout 회귀 필수 |
| **WO-H** WORDPRESS-CMS-LAYER-ENTITY-RETIREMENT | F10~F13: route → controller → entities.ts → entity 71 | admin CHECK(완료) | consumer 정밀 추적(grep 과탐) | entity 71 · route ~5 | api-server 기동 · CMS content-core 회귀 |
| **WO-I** SIGNAGE-FORCED-CONTENT-DISPOSITION | F28 | 사업 판단 | — | controller 1 · 테이블 2 | signage 회귀 |
| **WO-J** INFRA-ORPHAN-SERVICE-CLEANUP | F36 glucoseview-web Cloud Run | 인프라 판단 | — | 저장소 밖 | 없음 |
| **WO-K** SERVICE-LOCAL-DUPLICATE-VIEW-CONVERGENCE | F38 KPA SignagePlayback · F39 Instructor · F40 비대 어댑터 12 · F43 KCos 1세대 tablet/QR | DESIGN 별도 | LMS/tablet 트랙 | 파일 ~15 | 각 서비스 화면 smoke |

**즉시 착수 가능**: WO-C · WO-D(F32/F33 제외) · WO-E(F19 제외) · WO-B(승인 후).
**선행 필요**: WO-F(보존 기한) · WO-G(요청 로그) · WO-H(consumer 정밀 추적) · WO-I(사업) · WO-K(DESIGN).

---

## 17. STOP items

| ID | 사유 |
|---|---|
| F19 tmp 대용량 census 데이터 | 외부 소스 스냅샷 재현 불가 — 감사 보존 여부 사용자 판단 |
| F32 `apps/page-generator` | 미배포 AI 페이지 생성기 — 사업 판단 |
| F33 `services/web-account` | baseline 은 canonical 이라 하나 배포 없음 — 배포/폐기 결정 |
| F35 `@o4o/auth-core` | 의존 0 이나 CLAUDE.md §3 동결 Core — 명시 WO 없이 판정 불가 |
| F28 signage forced content | 본사 강제 배포 축의 사업 존속 여부 |
| F22 `_bak_orphan_representative_products_20260706` | 16,571행 백업 — 보존 기한 |

---

## 18. 문서 정합

```text
문서 정합: 발견 1건 (DOC_DRIFT) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

DOC_DRIFT 1: `docs/baseline/O4O-MYPAGE-CANONICAL-V1.md` 가 `web-account` 를 최소 계정센터 canonical 로 지정하나 **배포 실체가 없다**(F33). 기준 문서이므로 인라인 수정하지 않고 보고한다.

---

## 19. 완료 조건

```text
REPOSITORY LEGACY CENSUS      = CLOSED
DEAD CODE SURFACES            = CLASSIFIED
ACTIVE LEGACY SURFACES        = CLASSIFIED
CROSS-SERVICE TENANT RISKS    = CLASSIFIED   (P0 2)
TRACKED GENERATED RESIDUE     = CLASSIFIED   (61 파일)
TMP / RECOVERY MATERIAL       = CLASSIFIED   (KEEP 우세 · STOP 1)
SCHEMA RESIDUE                = CLASSIFIED   (테이블 21 · entity 71 · 컬럼 1)
REMOVAL DEPENDENCIES          = CLOSED
FOLLOW-UP LARGE WOS           = READY        (10)
CODE CHANGE                   = 0
SCHEMA CHANGE                 = 0
PRODUCTION WRITE              = 0
```
