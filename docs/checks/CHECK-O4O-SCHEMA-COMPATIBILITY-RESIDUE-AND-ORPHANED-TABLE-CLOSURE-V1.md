# CHECK-O4O-SCHEMA-COMPATIBILITY-RESIDUE-AND-ORPHANED-TABLE-CLOSURE-V1

- **WO**: WO-O4O-SCHEMA-COMPATIBILITY-RESIDUE-AND-ORPHANED-TABLE-CLOSURE-V1
- **작업일**: 2026-09-12
- **입력**: `IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1-PASS2` §9 (Schema residue) · §13·§14
- **기준 SHA**: `origin/main` = `28b288dec` · 전용 worktree `.claude/worktrees/wo-schema-residue-v1` · branch `work/schema-compat-residue-closure-v1`
- **DB 실측**: Cloud SQL Auth Proxy `127.0.0.1:5442` 경유 · **read-only** (`default_transaction_read_only=on`) · production write 0 · 접속 성공 확인 (자격정보 값은 본 문서에 남기지 않는다)
- **성격**: schema 잔재 census + **안전한 2건만** migration 정리. 나머지는 분류·인계
- **schema 변경**: 컬럼 DROP 1 · CHECK 축소 1 (둘 다 대상 0행 영향) · **table DROP 0 · production data 변경 0**

---

## 1. 요약

> census 대상 5축(핵심 대상 #1~#5)을 전수 분류했다. **바로 DROP 하지 않고** entity ↔ table ↔ consumer 그래프와 프로덕션 실측(행수·write 흔적·FK·index·뷰 의존)으로 각 항목을 판정했다.
>
> **실제 schema 변경은 확정 안전 2건뿐**이다 — `store_qr_codes.type` 컬럼 DROP, `store_tablet_screen_blocks.block_type` CHECK 에서 `product_content` 제거. 둘 다 코드 소비 0 · 영향 행 0.
>
> entity-without-table 50 · table-without-consumer 잔재는 **CLASSIFIED** 로 닫고, 실제 제거는 대상이 얽힌 도메인 WO(WordPress/legacy entity · yaksa · apps)로 인계한다 — 이 WO 의 제외 범위(WordPress 계층 재설계)와 안전 원칙에 따른 것이다.

```text
production tables (pg_stat_user_tables) : 275
등록 entity (entities.ts)               : 255  → 고유 table 254
교집합(등록 entity ↔ 존재 table)        : 203
등록 entity without table               : 50   (핵심 대상 #3)
table without 등록 entity               : 72 → raw-SQL canonical 11+ · 잔재 후보
typeorm_migrations 적용                 : 671  (최신 MediaLibraryV2Foundation20270407000000)
```

---

## 2. 핵심 대상 #1 — `store_qr_codes.type` → **DROP_READY (제거)**

| 축 | 실측 |
|---|---|
| canonical | `landing_type` (선행 WO-O4O-STORE-QR-CANONICAL-TARGET-… 확정) |
| 프로덕션 행 | 92 · `type` NULL 0 · `landing_type` NULL 0 |
| type ≠ landing_type | **4 행** — 전부 최근(2026-09-09~10) 생성, `type='product'` 인데 `landing_type`='link'(3)·'page'(1) → `type` 은 이미 stale garbage, `landing_type` 이 정본임을 입증 |
| type 분포 | screen_set 40 · product 18 · page 16 · link 13 · (+어긋난 4) · video 1 |
| index / FK / CHECK / 뷰 의존 | **0** (컬럼 기본값 `NOT NULL DEFAULT 'product'` 뿐) |
| 코드 read/write | **0** — entity 컬럼 정의 + 계약 spec 외 소비 없음. `store-qr.service.ts` 는 `type` 을 수용하지 않음(주석 명시) |

**판정 = DROP_READY.** 선행 WO 가 "schema housekeeping 은 별도 회차" 로 이관한 그 회차가 이 WO.

- migration: `20270408000000-DropStoreQrCodesTypeColumn.ts` (up: DROP COLUMN, 방어적 존재 확인 / down: 컬럼 복구 후 `landing_type` 로 backfill)
- entity: `store-qr-code.entity.ts` 에서 `type` 컬럼 정의 제거
- spec: `store-qr-canonical-contract.spec.ts §2` 를 "DROP 완료" 계약으로 갱신

---

## 3. 핵심 대상 #2 — `product_content` schema residue → **DROP_READY (CHECK 축소)**

| 축 | 실측 |
|---|---|
| application contract | 이미 은퇴 (선행 WO-O4O-KPA-TABLET-GENERATION-CONSOLIDATION — 쓰기 허용목록·resolver·뷰어 0) |
| 남은 residue | `store_tablet_screen_blocks.block_type` CHECK 제약의 `'product_content'` 허용값 (`20270120000000` 원본 + `20270206000000`) |
| enum/column/table | 별도 enum 타입·컬럼·테이블 residue **없음** (CHECK 허용값 문자열뿐) |
| block_type='product_content' 행 | **0** — 프로덕션 분포: corner_description 46 · qr_guide 42 · content_list 41 · idle_media 38 · product_list 32 |

**판정 = DROP_READY (CHECK 축소).** 선행 CHECK 가 "제약 축소는 migration 이라 별도 승인" 으로 이관 → 이 WO 가 그 승인.

- migration: `20270409000000-RemoveProductContentFromTabletBlockTypeCheck.ts` (up: `product_content` 제거한 7종으로 재정의 + 사전 위반행 0 방어 / down: 8종 복구)
- spec: `kpa-tablet-generation-consolidation-contract.spec.ts §2` 방어 가드 주석만 갱신 (동작 불변)

> `store_tablet_displays.content_id` 는 **ACTIVE_SCHEMA** — INSERT 경로(`store-tablet.routes.ts`) + KPA UI(`StoreTabletDisplaysPage.tsx`) 가 살아 있어 손대지 않음 (PASS2 §9-1 의 "content_id DROP 보류" 와 일치).

---

## 4. 핵심 대상 #3 — entity 있음 + table 없음 (50) → **CLASSIFIED / 인계**

등록 entity 255 를 파일까지 해소해 table 명을 얻고, 프로덕션 275 table 과 대조. 50개가 table 부재.

계층별 분류 (전부 **DEAD_SCHEMA_RESIDUE (entity 측)** — table 없어 쿼리 시 500):

| 계층 | entity(table) | import 소비처 | 제거 경로 |
|---|---|---|---|
| WordPress CMS | Category(categories) · Tag(tags) · Term/Taxonomy/TermRelationship · Theme/ThemeInstallation · ReusableBlock · BlockPattern · WidgetArea · CustomizerPreset · Form/View/Template Preset · CMSPage/CMSView/CMSCustomField(cms_pages/views/fields) · CmsMedia(+File/Folder/Tag) · CustomPost/CustomPostType · FieldGroup/CustomFieldValue · Taxonomy · UserActivityLog · SmtpSettings · RoleApplication · ApprovalLog · LinkingSession · reusable/block/template | cpt/taxonomy/cms 컨트롤러·서비스에 **import 되어 mount 된 route 존재** → 잠재 500 | route→controller→service→entities.ts→entity 파일 순 (WordPress/legacy entity WO) |
| Cosmetics legacy | CosmeticsProduct/Brand/Line/Store*/Price* (12) | `routes/cosmetics/repositories`·`services` 가 import | Cosmetics legacy 제거 WO |
| Neture legacy | NetureProduct/OrderItem/Partner/ProductLog (4) | `routes/neture/repositories`·`services` 가 import | Neture 도메인 정리 WO |
| Partner | PartnerContent/Event/Target (3) | `modules/partner/services` 가 import | partner-core 제거 WO(PASS2 F09) |

- **왜 이 WO 에서 제거하지 않는가**: 이들 entity 는 살아 있는 repository/service 가 import 한다. entity 만 지우면 **빌드가 깨진다**(예: `cosmetics.repository.ts` 가 `CosmeticsProduct` 사용). 안전 제거는 PASS2 §14 그래프대로 route→controller→service→registration→entity 를 함께 걷어내는 작업이고, 이는 이 WO 의 **제외 범위**("WordPress 계층 전체 구조 재설계") 이자 후속 대형 WO 다.
- 17개는 비-entity import 소비처 0(순수 dead metadata: Theme·ThemeInstallation·ReusableBlock·BlockPattern·WidgetArea·CustomizerPreset·CMSPage/View/Fields·cms_media_files/folders/tags·UserActivityLog 등)이나, 같은 CMS 계층의 일부라 **한 WO 로 일괄 제거**해야 잔재가 반쪽 남지 않는다.
- **보호됨**: `FormPreset` 은 `unprovisioned-form-and-legacy-app-axis-…spec.ts` 가 등록 유지를 단언 → 개별 제거 금지. `SmtpSettings` 는 `@o4o/mail-core` 의 `mail-transport.service` 가 런타임 소비(테이블 부재 시 fallback null) → mail 계약과 함께 판단.

**ENTITY_WITHOUT_TABLE = CLASSIFIED.**

---

## 5. 핵심 대상 #4 — table 있음 + entity/consumer 정리

### 5-1. raw-SQL canonical (ACTIVE — 잔재 아님)

PASS2 §9-2 와 동일. entity 부재 = 설계(raw SQL 계약). **DROP 금지.**
`product_landings` 272,040 · `store_tablet_screen_sets` 58 · `store_tablet_screen_blocks` 199 · `signage_*`(playlists/media/schedules/…) · `local_agent_*` · `o4o_asset_snapshots` 20 · `product_master_notes` · `offer_service_prices` · `neture_shipments` · `handoff_tokens` · `cms_content_recommendations` · `kpa_content_recommendations` · `community_*` 등.
> 도구 주석: entity re-export(예: `AssetSnapshot`→`o4o_asset_snapshots`, `RoleAssignment`→`role_assignments`)는 정적 매퍼가 '미해소' 로 잡아 table-without-entity 로 오분류될 수 있다 — 수기 확인으로 ACTIVE 확정. 판정은 수기 결과 기준.

### 5-2. 백업/감사 원장 → **OPERATIONAL_RECOVERY_KEEP / STOP**

| table | live | write 흔적 | 판정 |
|---|---:|---|---|
| `_bak_orphan_representative_products_20260706` | **16,571** | ins 16,571 / upd·del 0 · 마지막 analyze 2026-07-06 | **UNKNOWN_STOP** (중지조건 1·2 — 보존 기한 불명 · 복구 목적 가능) |
| `product_master_cleanup_audits` | 57,864 | ins 297,937 | OPERATIONAL_RECOVERY_KEEP (감사 원장) |
| `product_candidate_cleanup_snapshots` | 15,776 | ins 15,776 | OPERATIONAL_RECOVERY_KEEP |
| `product_master_legacy_internal_code_snapshots` | 17,171 | ins 17,171 | OPERATIONAL_RECOVERY_KEEP |
| `product_candidate_cleanup_audits` | 3,624 | ins 4,323 | OPERATIONAL_RECOVERY_KEEP |
| `product_master_hff_*_snapshots` | 5·4 | — | OPERATIONAL_RECOVERY_KEEP |
| `offer_curations_backup_20260409` | **0** | 활동 없음(never) | **DROP_AFTER_DATA_RETENTION** — 이름이 backup, 0행이나 복구 정책 미확인 → 이 WO 에서 DROP 안 함 |

### 5-3. 확정 dead 0-row 잔재 → **DEAD_SCHEMA_RESIDUE (도메인 WO 인계)**

| table | live | 사유 | 인계 |
|---|---:|---|---|
| `app_instances` · `app_usage_logs` · `apps`(1행 self-seed) | 0·0·1 | 선행 CHECK(APP-INSTANCES·UNPROVISIONED-FORM)가 **DROP 을 별도 WO 로 명시 이관** | app 축 DROP WO |
| `custom_post_types` | 0 | inbound FK `custom_fields`(live) 존재 → 격리 제거 아님 | CMS 계층 WO |
| `forum_bookmark` · `forum_like` | 0·0 | entity 0 · FK users/forum_post | forum 정리 WO |
| `kpa_stewards` | 0 | entity 0 | kpa 정리 WO |
| `role_permissions` | 0 | RBAC SSOT=role_assignments(F9 **freeze**) → 스키마 변경 명시 승인 필요 | RBAC WO |
| `media_entity_links` | 0 | 소비 0 · migration 파일 부재(제거됨) · FK media_assets(live) → **AI video catalog WIP 가능** | UNKNOWN_STOP |
| `yaksa_member_*` · `yaksa_membership_*` (5) | 0 | 옛 세대 · organization-core/kpa_members 대체 | yaksa 처분 WO(tmp `*_install.sql` 와 한 쌍) |
| `yaksa_posts` · `yaksa_post_logs` · `yaksa_categories`(5행) | 0·0·5 | `register-routes.ts` 주석이 **보존 명시** | yaksa 처분 WO |

- 이들을 흩어진 개별 DROP migration 으로 이 WO 에서 처리하지 않는 이유: RBAC(F9 freeze)·forum·kpa·app·yaksa 등 **서로 다른 frozen/도메인 경계**에 걸쳐 있어, 한 WO 에서 5개 도메인 스키마를 동시에 건드리는 것은 안전 원칙("안전한 것만")과 회귀 격리에 어긋난다.

**TABLE_WITHOUT_CONSUMER = CLASSIFIED · BACKUP_TABLES = PRESERVED_WITH_REASON.**

---

## 6. 핵심 대상 #5 — compatibility column / legacy enum / duplicate axis

| 대상 | 판정 |
|---|---|
| `store_qr_codes.type` (deprecated column) | **DROP_READY → 제거** (§2) |
| `block_type` CHECK 의 `product_content` (obsolete enum-like) | **DROP_READY → 축소** (§3) |
| `kpa_store_contents` 물리명 (legacy) | COMPAT (canonical 문서 기준 rename 판단 — 별도) |
| old service_key axis · 기타 duplicate axis | 이번 census 에서 신규 확정 잔재 없음 (PASS2 대비 추가 발견 0) |

---

## 7. 판정 집계

```text
ACTIVE_SCHEMA               : raw-SQL canonical 다수 (§5-1) + store_tablet_displays.content_id
COMPAT_SCHEMA → DROP_READY  : 2 (store_qr_codes.type · block_type CHECK product_content) → 제거 완료
DROP_AFTER_DATA_RETENTION   : offer_curations_backup_20260409 (0행 backup)
OPERATIONAL_RECOVERY_KEEP   : cleanup audit/snapshot 원장 5
MIGRATION_HISTORY_KEEP      : typeorm_migrations 671 · 실행완료 migration 전부 보존
DEAD_SCHEMA_RESIDUE(인계)   : entity-without-table 50(CMS/cosmetics/neture/partner) + 0-row orphan(app·forum·kpa·rbac·yaksa)
UNKNOWN_STOP                : _bak_orphan_representative_products_20260706(16,571) · media_entity_links
```

---

## 8. 회귀 검증

| 항목 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm run build:packages` | PASS (TS error 0) |
| `pnpm --filter @o4o/api-server run type-check` (`tsc --noEmit`) | **PASS (error 0)** — 신규 migration 2 + entity 변경 포함 |
| Jest `store-qr-canonical-contract` · `kpa-tablet-generation-consolidation-contract` · `store-qr-placement-contract` | **78/78 PASS** |
| migration 무결성 | 신규 timestamp `20270408000000`·`20270409000000` 고유 · class 명 고유 · 최신순 · discovery glob 포함 |
| local migration apply/rollback | **NOT_RUN** — 로컬 dev DB(5432)에 `o4o_platform` 부재. up/down SQL 은 프로덕션 스키마 read-only 대조로 검증(현행 CHECK 정의 = down() 복구본, 컬럼/제약 존재·의존 0·영향행 0). 실적용은 CI(main 병합 시 typeorm_migrations job) |
| frontend type-check | **NOT_REQUIRED** — 백엔드 전용 schema 변경 · frontend/shared 가 `store-qr-code.entity` 를 import 하지 않음(literal scan 0) |
| production migration | **PASS** — 커밋 `11ae1acfb` push · CI 3/3 SUCCESS(CI Pipeline · Deploy API · CodeQL) · Deploy API migration job 자동 적용 |
| post-deploy 실측(read-only) | **PASS** — typeorm_migrations 에 2건 기록 · `store_qr_codes.type` DROPPED(landing_type 유지 · 92행 보존) · block_type CHECK NARROWED(product_content 제거) |

---

## 9. 변경 목록

```text
신규  apps/api-server/src/database/migrations/20270408000000-DropStoreQrCodesTypeColumn.ts
신규  apps/api-server/src/database/migrations/20270409000000-RemoveProductContentFromTabletBlockTypeCheck.ts
수정  apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts        (type 컬럼 정의 제거)
수정  apps/api-server/src/__tests__/store-qr-canonical-contract.spec.ts           (§2 DROP 완료 계약)
수정  apps/api-server/src/__tests__/kpa-tablet-generation-consolidation-contract.spec.ts (§2 방어 가드 주석)
신규  docs/checks/CHECK-…-SCHEMA-COMPATIBILITY-RESIDUE-AND-ORPHANED-TABLE-CLOSURE-V1.md
```

table DROP 0 · production data 변경 0 · entity 제거 0(핵심 대상 #3 은 인계).

---

## 10. STOP 항목

| ID | 대상 | 사유 |
|---|---|---|
| S1 | `_bak_orphan_representative_products_20260706` (16,571행) | 중지조건 1·2 — 보존 기한·복구 목적 불명. DROP 금지 |
| S2 | `media_entity_links` (0행, migration 부재) | AI video catalog foundation WIP 가능성 — 삭제 판단 보류 |

---

## 11. 후속 인계

1. **WordPress/legacy entity 제거 WO** — entity-without-table 50(CMS/cosmetics/neture/partner). PASS2 §14 그래프대로 route→controller→service→entities.ts→entity. `FormPreset`(spec 보호)·`SmtpSettings`(mail-core 런타임) 예외 처리.
2. **yaksa 처분 WO** — `yaksa_*` 9 table + tmp `*_install.sql` 4 (직전 tmp WO 인계분과 한 쌍).
3. **app 축 DROP WO** — `apps`/`app_instances`/`app_usage_logs` (선행 CHECK 가 이미 이관).
4. **S1 보존 기한 결정** — `_bak_orphan_representative_products_20260706` retention 정책 확정 후 DROP 여부.
5. **RBAC/forum/kpa 0-row 잔재** — 각 도메인 정리 시 `role_permissions`·`forum_bookmark`·`forum_like`·`kpa_stewards` 함께.

---

## 12. 완료 조건

```text
SCHEMA RESIDUE CENSUS          = CLOSED (5축 전수 분류 · 프로덕션 read-only 실측)
DROP_READY ITEMS               = CLOSED (2/2 제거 · 영향행 0)
STORE_QR_CODES.TYPE            = REMOVED (migration 20270408000000 · entity·spec 정합)
PRODUCT_CONTENT SCHEMA RESIDUE = REMOVED (block_type CHECK 축소 · migration 20270409000000)
ENTITY_WITHOUT_TABLE           = CLASSIFIED (50 · WordPress/legacy WO 인계)
TABLE_WITHOUT_CONSUMER         = CLASSIFIED (raw-SQL ACTIVE + dead 잔재 인계)
BACKUP_TABLES                  = PRESERVED_WITH_REASON (S1 STOP · audit 원장 KEEP)
MIGRATION HISTORY              = PRESERVED (typeorm_migrations 671 · 실행완료 전부)
SCHEMA REGRESSION              = PASS (build:packages · api tsc · Jest 78/78)
CI                             = SUCCESS (11ae1acfb · CI Pipeline / Deploy API / CodeQL)
WO                             = CLOSED
PRODUCTION MIGRATION           = PASS (11ae1acfb · Deploy API job · post-deploy read-only 검증 통과)
OTHER SERVICE REGRESSION       = PASS (백엔드 전용 · frontend import 0)
```

---

## 13. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 5건(§11)
```

기록물(PASS2 IR)의 schema 판정은 이 CHECK 가 실측으로 확정·정정한다(본문 수정 아님): (a) table-without-entity 에 entity re-export 오분류가 섞임 → §5-1 주석. (b) `store_qr_codes.type` 어긋남 2행 → 실측 4행으로 갱신.
