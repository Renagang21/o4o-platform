# WO-O4O-POST-CLEANUP-FINAL-RESIDUE-AND-CLOSURE-CENSUS-V1 — CHECK

> **성격**: 조사 전용(read-only census). runtime · route · dependency · DB write · migration · production config · CI 변경 0.
> **산출물**: 본 CHECK 1개.
> **작성일**: 2026-09-04

---

## 1. 기준선 (Baseline)

| 항목 | 값 |
|---|---|
| START_HEAD | `ef75f8e100fb597ec77f2455114ac8dbb018ed8b` |
| START_ORIGIN_MAIN | `ef75f8e100fb597ec77f2455114ac8dbb018ed8b` |
| 작업 트리 | `C:/tmp/o4o-block-core-retire` (격리 worktree · 시작 시 clean) |
| 브랜치 | `work/o4o-post-cleanup-closure-census-v1` (origin/main 기준 신규) |
| 선행 WO 커밋 확인 | `ebe408446` (main 에 포함됨) |
| 조사 종료 시 origin/main | `be8cff23fc4856c0ded070a63fbcdb0906d02b93` (이동함 → §26 cherry-pick 프로토콜 적용) |

**모든 숫자는 과거 CHECK 에서 복사하지 않고 현재 HEAD 에서 재측정했다 (WO §4).**

---

## 2. 은퇴 도메인 잔재 census

### 2-1. 디렉터리 존재 여부 (전부 ABSENT)

| 은퇴 축 | 경로 | 현재 상태 |
|---|---|---|
| shortcode | `packages/shortcodes` | ABSENT |
| block-core | `packages/block-core` | ABSENT |
| ecommerce app | `apps/ecommerce` | ABSENT |
| digital-signage app | `apps/digital-signage` | ABSENT |
| tracked 생성물 | `apps/admin-dashboard/dist-node` | ABSENT (+ `.gitignore` 방어 유지) |
| forum-types | `packages/forum-types` | ABSENT |

tracked 생성 산출물(`dist-node/`, `workspace-packages.json`, `scripts/audit/block-registry-report.json`) = **0건**.

### 2-2. 리터럴 hit 분류 (WO §12)

`git grep -n -I --fixed-strings` 기준, tracked 파일 전수. 총 **439 hit**.

| 리터럴 | hits | HISTORICAL_DOC | TEST_GUARD | COMMENT | ACTIVE |
|---|---:|---:|---:|---:|---:|
| `@o4o/shortcodes` | 24 | 17 | 7 | 0 | 0 |
| `packages/shortcodes` | 48 | 44 | 4 | 0 | 0 |
| `StandaloneEditor` | 26 | 22 | 3 | 1 | 0 |
| `/editor/posts` | 11 | 11 | 0 | 0 | 0 |
| `/editor/pages` | 6 | 6 | 0 | 0 | 0 |
| `/gutenberg` | 26 | 11 | 3 | 1 | 11 |
| `window.wp` | 75 | 70 | 5 | 0 | 0 |
| `@o4o/block-core` | 10 | 8 | 2 | 0 | 0 |
| `packages/block-core` | 42 | 35 | 7 | 0 | 0 |
| `dist-node` | 60 | 54 | 5 | 0 | 1 |
| `workspace-packages.json` | 29 | 26 | 2 | 0 | 1 |
| `forum-types` | 6 | 6 | 0 | 0 | 0 |
| `apps/ecommerce` | 11 | 10 | 0 | 1 | 0 |
| `apps/digital-signage` | 65 | 46 | 5 | 0 | 14 |
| **합계** | **439** | **366** | **43** | **3** | **27** |

**UNKNOWN = 0.** ACTIVE 27건 전수 확인 결과, **은퇴 도메인의 살아 있는 소비처는 0건**이다.

| ACTIVE 분류 | 건수 | 판정 근거 |
|---|---:|---|
| `@o4o-apps/digital-signage-core` (workflow · package.json · entities · signage repositories · lockfile) | 14 | `apps/digital-signage` 문자열의 **부분 일치**. 은퇴된 앱이 아니라 살아 있는 사이니지 core 패키지 → `UNRELATED_NAME_MATCH` |
| `apps/admin-dashboard/src/components/editor/(blocks/)gutenberg/*` import | 11 | 현행 admin 블록 에디터 구성요소(`RichText` · `BlockToolbar` · `NewColumnBlock`). 은퇴한 legacy WordPress block editor 축과 무관한 **이름 일치** → ACTIVE_REQUIRED |
| `.gitignore:59` `dist-node` · `.gitignore:62` `workspace-packages.json` | 2 | 재발 방지 ignore 규칙 → 의도된 ACTIVE |

`StandaloneEditor` ACTIVE 후보 1건(`apps/admin-dashboard/src/pages/cpt-engine/index.tsx:31`)은 실제로 **제거 마커 주석 블록 내부**였다 → COMMENT 로 정정 반영(위 표 기준).

**DEAD_REFERENCE = 0.**

---

## 3. 빌드/개발 설정 정합

| 검증 | 결과 |
|---|---|
| tsconfig 전수 (`paths` · `references` · `extends` 대상 존재) | `files=94 parse_fail=0 targets_checked=106 missing=0` |
| 루트 dev 스크립트 경로 | 13개 경로 전부 존재 |
| 루트 pnpm filter | 19개 전부 실재 패키지에 해석됨 |
| `scripts/development/dev.sh` | 앱 목록 = `api-server main-site admin-dashboard` / `main-site admin-dashboard`, 각 항목 `if [ -d ... ]` 가드. dead entry 0 |
| `scripts/dev.mjs` | `apps/ecommerce` 는 제거 마커 주석으로만 잔존 |

루트 `tsconfig.json` 의 `composite`/`outDir`/`declaration` 조합은 **호출자 0** (`tsc -b` · `tsc -p` 루트 호출 없음) → latent config, 이번 범위에서는 판정만 하고 수정하지 않는다.

---

## 4. Active core 보호 확인 (spot-check)

| 대상 | 측정값 | 판정 |
|---|---:|---|
| `@o4o/content-editor` | 134 tracked files | PASS |
| `RichTextEditor` 참조 | 91 | PASS |
| `@o4o/block-renderer` | 14 files | PASS |
| `DynamicRenderer` | 8 | PASS |
| `ViewPreview` | 5 | PASS |
| `cms_contents` 소비 (api-server) | 49 files | PASS |
| `apps/admin-dashboard/src/blocks` | 44 tracked files | PASS |
| B2B 주문 축 (`checkout_orders`) | 프로덕션 최근 30일 19건 | ACTIVE |
| 알림 (`notifications`) | 최근 30일 11건 | ACTIVE |

---

## 5. 프로덕션 read-only 확인 (WO §15)

`BEGIN READ ONLY; ... ROLLBACK;` 로 감쌈. **production write = 0** (`SELECT` / `information_schema` / count 만 사용).

| 항목 | 실측 | 판정 |
|---|---|---|
| `to_regclass('store_events')` | `store_events` (존재 · 0 rows) | DEFERRED_APPROVED |
| `users.permissions` 컬럼 | 존재 (1) | DEFERRED_APPROVED |
| 최대 적용 migration | id 652 `AddChannelsCodeUniqueIndex20270319000000` (총 651건) | — |
| `20270320000000-DropUsersPermissionsColumn` / `20270321000000-DropStoreEventsTable` | HEAD(`ee629917a`)에 존재하나 **미적용** | 배포 시 자동 적용 대기 |
| `organization_product_applications` | ABSENT | 종료됨 |
| `app_instances` / `app_usage_logs` | 0 rows / 0 rows | 종료됨 |
| `apps` | 1 row | — |
| `app_registry` | 6 rows (전부 active · 2026-01-22 설치) | 테이블은 ACTIVE (런타임 writer 존재) |
| ↳ stale row | `annualfee-yaksa` · `digital-signage` · `membership-yaksa` · `reporting-yaksa` (패키지 없음 + 카탈로그 항목 없음) | RETIRE_READY (DB write 승인 필요) |
| ↳ 정상 row | `digital-signage-core` · `partnerops` | ACTIVE |
| `cosmetics-seller-extension` 설치 row | 0 | 미설치 |
| `seller_%` 테이블 | 0 | 없음 |
| `settlements` | 0 rows | — |
| `organization_channels` | B2C row 최종 2026-05-15 (stale) · TABLET 2026-09-04 (active) | — |

> **선행 CHECK 와의 사실 불일치 정정**
> `CHECK-O4O-LEGACY-PRODUCTION-SCHEMA-AND-LOCAL-HOUSEKEEPING-FINAL-CLOSURE-V1.md:260` 은
> "프로덕션 재조회: `users` 에 `permissions` 컬럼 부재 · `to_regclass('store_events')` = NULL" 이라고 기록했으나,
> 현재 read-only 재조회에서는 **둘 다 존재**한다. 원인은 두 DROP migration 이 main 에는 병합됐지만
> 프로덕션에 아직 적용되지 않았기 때문이다(최대 적용 id 652). 잔재가 아니라 **배포 대기 상태**이므로
> `DEFERRED_APPROVED` 로 분류한다. 본 CHECK 는 판정만 기록하고 migration 을 실행하지 않는다.

---

## 6. 외부 의존 (HOLD_EXTERNAL)

| 항목 | 상태 |
|---|---|
| `account.neture.co.kr` | CNAME → `ghs.googlehosted.com` 로 여전히 dangling. 소스 참조 0건. 등록기관 = Gabia (GCP 통제 밖) → **HOLD_EXTERNAL** (변동 없음) |

---

## 7. 이월 항목 현재 상태

| 이월 항목 | 현재 HEAD 상태 | 분류 |
|---|---|---|
| Neture admin 승인 표면 (`AdminProductApprovalPage.tsx` 외) | 존재 | RETIRE_READY |
| `channels/b2c` activate/deactivate (`store-policy.routes.ts:354,428`) | 존재 | RETIRE_READY |
| service-approval 읽기 테이블 정합 | 미해소 | ACTIVE_REQUIRED (후속) |
| 서비스별 RoleGuard 공통화 | 미해소 | DEFERRED_APPROVED |
| `packages/cosmetics-seller-extension` 의 `@o4o/ui` 미선언 dependency | **해소됨** (`package.json` 에 `@o4o/ui: workspace:*` 선언) | 종료 |
| `cosmetics-seller-extension` 자체 | 패키지 38 files 존재 · 라우트 마운트 0 (`register-routes.ts:393-395` 주석으로 명시) · frontend import 0 · api-server 런타임 import 0 · 프로덕션 설치 row 0. 단 `appsCatalog.ts:309-321` 은 `status: 'active'` | RETIRE_READY |
| `store_events` · `users.permissions` DROP | migration 병합 완료 · 프로덕션 미적용 | DEFERRED_APPROVED |
| `app_registry` stale 4 rows | 존재 | RETIRE_READY (DB write 승인 필요) |
| `archive/` 53 tracked legacy source copies | 모든 tsconfig `include` 밖. 선행 CHECK 에서 `HISTORICAL_DOC` 로 이미 판정 | HISTORICAL_DOC (범위 외) |

---

## 8. 최종 분류표 (WO §19)

| # | 항목 | 분류 |
|---:|---|---|
| 1 | shortcode 도메인 | 종료 (잔재 0) |
| 2 | block-core 도메인 | 종료 (잔재 0) |
| 3 | legacy WordPress block editor 축 | 종료 (잔재 0 · 가드 유지) |
| 4 | `apps/ecommerce` · `apps/digital-signage` dead entry | 종료 (주석 마커만) |
| 5 | tracked 생성 산출물 | 종료 (+ ignore 방어) |
| 6 | 빌드/개발 설정 dead reference | 종료 (missing 0) |
| 7 | 루트 `tsconfig.json` latent composite 설정 | DEFERRED_APPROVED (호출자 0) |
| 8 | `store_events` 테이블 DROP | DEFERRED_APPROVED (배포 대기) |
| 9 | `users.permissions` 컬럼 DROP | DEFERRED_APPROVED (배포 대기) |
| 10 | `app_registry` stale 4 rows | RETIRE_READY (DB write 승인) |
| 11 | `cosmetics-seller-extension` 패키지 + 카탈로그 `status:'active'` | RETIRE_READY |
| 12 | Neture admin 승인 표면 | RETIRE_READY |
| 13 | `channels/b2c` activate/deactivate | RETIRE_READY |
| 14 | `account.neture.co.kr` DNS | HOLD_EXTERNAL |
| 15 | active core (content-editor · block-renderer · cms_contents · B2B 주문 · 알림) | ACTIVE_REQUIRED (보호 PASS) |

**UNKNOWN = 0.**

---

## 9. Health 검증 (WO §17)

| 검증 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | PASS (15.8s · pnpm v10.25.0) |
| `build:packages` | PASS |
| `admin-dashboard type-check` (`tsc --noEmit`) | PASS |
| 대표 frontend build (`@o4o/web-kpa-society`) | PASS (built in 25.87s · chunk size 경고만) |
| block registry audit (`pnpm run verify:blocks`) | **VERIFICATION PASSED** (경고만: SSOT 미구현 블록 · SSOT 미등재 3건 — 기존 상태) |
| api-server Jest 전수 (은퇴 가드 포함) | **225 suites / 3786 tests 전부 PASS** — `sites-domain-retirement` · `partner-application-retirement` · `deployment-domain-retirement` · `service-monitor-retirement` · `app-instances-retirement` · `legacy-residual-runtime-final-closure` · `auth-runtime-and-legacy-package-final-closure` 포함 |

---

## 10. 변경/부작용 확인 (WO §18 · §24)

| 항목 | 값 |
|---|---|
| 검증 후 `git status --porcelain` | **0 line** (unexpected generated dirty 없음) |
| runtime 수정 | 0 |
| route 수정 | 0 |
| dependency 수정 | 0 |
| DB write | 0 |
| migration | 0 |
| production config 수정 | 0 |
| CI 수정 | 0 |
| 실제 변경 파일 | 본 CHECK 1개 |

---

## 11. 최종 판정 (WO §28)

| 완료 기준 | 결과 |
|---|---|
| retired domain active residue = 0 | PASS |
| DEAD_REFERENCE = 0 | PASS |
| UNKNOWN = 0 | PASS |
| active core protected = PASS | PASS |
| current main health = PASS | PASS |
| runtime 수정 = 0 | PASS |
| dependency 수정 = 0 | PASS |
| DB write = 0 | PASS |
| migration = 0 | PASS |
| RETIRE_READY = 0 | **미충족** — 4건 잔존 (§8 의 10~13) |

### 판정: `POST_CLEANUP_FOLLOWUP_REQUIRED`

은퇴 도메인 잔재·dead reference·UNKNOWN 은 모두 0 이고 active core 도 온전하므로 **cleanup 트랙의 "잔재 제거" 축은 실질적으로 종료 가능**하다.
다만 승인이 필요한 `RETIRE_READY` 4건이 남아 있어 §28 기준상 closure 선언은 아직 불가하며, 아래 **2개 그룹**의 후속 승인으로 마감한다.

---

## 12. 후속 제안 — 최대 2개 그룹 (WO §22)

### 그룹 A — 은퇴 표면 코드 정리 (code-only · DB 무관)

- Neture admin 승인 표면 은퇴 (`AdminProductApprovalPage.tsx` 외)
- `channels/b2c` activate/deactivate 라우트 은퇴 (`store-policy.routes.ts:354,428`)
- `cosmetics-seller-extension` 패키지 은퇴 + `appsCatalog.ts` 의 `status:'active'` 정정
- 각 항목 은퇴 시 raw-source 가드 spec 추가

### 그룹 B — 데이터/스키마 적용 마감 (DB write 승인 필요)

- `20270320000000` · `20270321000000` DROP migration 의 프로덕션 적용 확인(배포 후 재조회) 및 선행 CHECK 문구 정정
- `app_registry` stale 4 rows (`annualfee-yaksa` · `digital-signage` · `membership-yaksa` · `reporting-yaksa`) 제거

> 작은 항목을 1건씩 쪼개지 않는다 (WO §22).

---

## 13. 문서 정합

- 발견 1건: `docs/checks/CHECK-O4O-LEGACY-PRODUCTION-SCHEMA-AND-LOCAL-HOUSEKEEPING-FINAL-CLOSURE-V1.md:260` 의 프로덕션 재조회 기술이 현재 실측과 불일치 (§5 참조). 단 `docs/checks/**` 는 **기록물**이므로 CLAUDE.md §16-1 에 따라 인라인 수정 대상이 아니다 → 본 CHECK 에 정정 사실만 기록하고 그룹 B 후속으로 넘긴다.
- SUPERSEDED 표기 0건 / 링크 수정 0건.
