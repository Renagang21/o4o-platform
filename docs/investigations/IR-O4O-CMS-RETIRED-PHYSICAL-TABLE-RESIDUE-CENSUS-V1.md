# IR-O4O-CMS-RETIRED-PHYSICAL-TABLE-RESIDUE-CENSUS-V1

> **상태**: 조사 완료 — 운영 DB read-only 실측 · schema/데이터/권한 변경 0 · DROP 실행 0
> **작성일**: 2026-09-13
> **기준 SHA**: `3161f2d74` (origin/main · 이번 범위 clean · 다른 세션 dirty 1건 `IR-O4O-CROSSSERVICE-…` 불가침)
> **선행**: `WO-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1` · `IR-O4O-CMS-LIFECYCLE-TABLE-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1` · `WO-O4O-CMS-LIFECYCLE-SCHEMA-CPT-ACF-AND-DEAD-ENTITY-FINAL-RETIREMENT-V1` · `WO-O4O-DATABASE-MIGRATION-OWNERSHIP-…-FINAL-CLOSURE-V1` · `WO-O4O-API-DATABASE-READINESS-…-FINAL-CLOSURE-V1`

---

## 1. 조사 기준점 · 연결 · read-only 보장

| 항목 | 값 |
|---|---|
| 조사 일시 | 2026-09-13 19:17 ~ 19:40 KST |
| GCP project · instance · database | `netureyoutube` · `asia-northeast3:o4o-platform-db` · `o4o_platform` |
| 연결 방식 | Cloud SQL Auth Proxy v2 (`bin/cloud-sql-proxy-v2.exe`, gcloud 사용자 access-token 인증) → `127.0.0.1:5442` → `psql 17` |
| 자격정보 | 승인된 채널인 로컬 `apps/api-server/.env` 의 API 서비스 계정. **환경변수(`PGPASSWORD`)로만 전달** — 명령 인자 · 출력 · 문서 · 커밋 0. 조사 SQL 임시파일도 자격정보 미포함, 조사 후 삭제 |
| PostgreSQL | 15.18 |
| schema · `search_path` | `public` · `"$user", public` |
| migration history | 675행 · 최신 `AddAutomationJobTempOutput20270411000000` |
| read-only 보장 | 모든 스크립트를 `BEGIN READ ONLY; … ROLLBACK;` 로 실행. SELECT · `information_schema` · `pg_catalog` · `COUNT(*)` 만 사용. 행 값 출력 0 |
| 연결 계정 권한 | 대상 테이블에 write 권한을 갖지만(§6) 이번 조사에서 SELECT 외 SQL 실행 0 |

---

## 2. 결론 요약

```text
1차 대상 14 + cms_media 계열 4 = 18개 → 운영 DB 전부 ABSENT.
인접 발견 4개(custom_post_types · custom_fields · pages · views) → 0행 · 소비 0 · 상호 FK 뿐 → DROP_CANDIDATE.
이름 패턴에 걸린 현행 테이블 9개 → KEEP (legacy 아님).
STOP_DATA_PRESENT 0 · STOP_DEPENDENCY_PRESENT 0 · UNVERIFIED 0.
```

---

## 3. 1차 대상 (14 + cms_media 계열) — 전부 ABSENT

| 객체 | 종류 | 운영 존재 | 행 수 | 크기 | 생성 주체 | Runtime 소비 | Inbound FK | 기타 의존 | 외부 소비 | 정본 대체축 | 판정 |
|---|---|:-:|--:|-:|---|:-:|:-:|---|---|---|---|
| `cms_acf_field_groups` | — | **부재** | — | — | lifecycle DDL(미호출, 코드 제거됨) | 0 | — | — | 0 | `cms_contents` | **ABSENT** |
| `cms_acf_fields` | — | 부재 | — | — | 동상 | 0 | — | — | 0 | 동상 | ABSENT |
| `cms_acf_values` | — | 부재 | — | — | 동상 | 0 | — | — | 0 | 동상 | ABSENT |
| `cms_cpt_fields` | — | 부재 | — | — | 동상 | 0 | — | — | 0 | 동상 | ABSENT |
| `cms_cpt_types` | — | 부재 (30일 로그 `does not exist` 116건이 부재 실증) | — | — | 동상 | 0 (사슬 제거됨) | — | — | admin 자동 호출만(제거됨) | 동상 | ABSENT |
| `cms_menus` · `cms_menu_items` · `cms_menu_locations` | — | 부재 | — | — | 동상 | 0 | — | — | 0 | 코드 config 네비게이션 | ABSENT ×3 |
| `cms_settings` | — | 부재 | — | — | 동상 | 0 | — | — | 0 | `settings` | ABSENT |
| `cms_templates` · `cms_template_parts` | — | 부재 | — | — | 동상 | 0 | — | — | 0 | `content_templates` | ABSENT ×2 |
| `cms_views` | — | 부재 | — | — | 동상 + api entity(제거됨) | 0 | — | — | 0 | (옛 물리명 `views` → §4) | ABSENT |
| `cms_pages` | — | 부재 | — | — | 생성 주체 없음(entity 만, 제거됨) | 0 | — | — | 0 | (옛 물리명 `pages` → §4) | ABSENT |
| `cms_fields` | — | 부재 | — | — | 생성 주체 없음(entity 만, 제거됨) | 0 | — | — | 0 | (옛 물리명 `custom_fields` → §4) | ABSENT |
| `cms_media` · `cms_media_files` · `cms_media_folders` · `cms_media_tags` | — | 부재 (`cms_media` 30일 로그 46건 실증) | — | — | lifecycle DDL(미호출, 제거됨) | 0 (선행 WO 에서 제거) | — | — | admin `/content/assets` 호출만(제거됨) | `media_assets` · `media_entity_links` | ABSENT ×4 |

`cms_media` 와 함께 생성됐던 관련 테이블은 삭제된 `lifecycle/install.ts` 기준 `cms_media_files` · `cms_media_folders` · `cms_media_tags` 3개이며 위에 포함했다.

---

## 4. 인접 객체 전수 발견

### 4-1. 운영 DB 이름 패턴 검색 (`cms_%` · `%cpt%` · `%acf%` · `custom_%` · `%preset%` · `%taxonom%` · `%template%` · `%menu%`, table/partitioned/view/matview/sequence/foreign)

| 객체 | 종류 | est/exact 행 | 크기 | 판정 | 근거 |
|---|---|--:|-:|---|---|
| **`custom_post_types`** | table | **0** (exact) | 40 KB (index 32 KB) | **DROP_CANDIDATE** | §5 |
| **`custom_fields`** | table | **0** (exact) | 40 KB | **DROP_CANDIDATE** | §5 |
| `cms_contents` | table | 63 | 304 KB | **KEEP** | 정본 (`1736500000000-CreateCmsContentTables`) |
| `cms_content_slots` | table | 2 | 96 KB | **KEEP** | 정본 |
| `cms_content_recommendations` | table | 4 | 72 KB | **KEEP** | 현행 — `modules/content/content-query.service.ts` 가 소비(추천 기능). 이름만 `cms_` |
| `content_templates` | table | — | 56 KB | **KEEP** | 현행 `routes/content/content-templates.routes.ts` |
| `annual_report_templates` | table | — | 184 KB | **KEEP** | KPA 분회 신상신고 template(현행) |
| `operator_qr_templates` | table | — | 64 KB | **KEEP** | 운영자 QR(현행) |
| `signage_templates` · `signage_template_zones` · `signage_layout_presets` | table | — | 112/32/40 KB | **KEEP** ×3 | Signage 축(현행 · WO §11 별도 분리 대상) |

### 4-2. 명시 이름 확인 (Git 이력에서 나온 인접 이름)

| 이름 | 운영 존재 | 판정 |
|---|:-:|---|
| **`pages`** | **있음 · 0행 · 64 KB** | **DROP_CANDIDATE** (§5) |
| **`views`** | **있음 · 0행 · 40 KB** | **DROP_CANDIDATE** (§5) |
| `custom_posts` · `custom_field_groups` · `custom_field_values` | 부재 | ABSENT |
| `taxonomies` · `terms` · `term_relationships` | 부재 | ABSENT |
| `form_presets` · `template_presets` · `view_presets` | 부재 | ABSENT |
| `posts` · `post_meta` · `postmeta` · `menus` · `menu_items` · `templates` · `template_parts` | 부재 | ABSENT |

### 4-3. Git 이력 대조

| 출처 | 내용 |
|---|---|
| 삭제된 `packages/cms-core/src/lifecycle/install.ts` (`f8f041970` 에서 제거) | `cms_*` 16 테이블 DDL — 호출자 0 · **운영 부재 전부 일치** |
| 삭제된 migration 124개 (`d8e18cd84`, 2026-01-08 "remove 124 unexecuted migrations") | `1745000000000-CreateACFAndShortcodeTables`(`custom_post_types` · `custom_field_values` DDL, 인덱스명 `IDX_custom_post_types_*`) · `1759103000000-CreateCustomPostTypeTables`(`custom_post_types` · `custom_posts`) · `1800000001000-CreateCPTEngineEntities`(`taxonomies` · `terms` · `term_relationships`) 등 — **전부 `typeorm_migrations` 에 실행 기록 없음** |
| `typeorm_migrations` 675행 | CPT · CustomPost · CustomField · ACF · Preset · Taxonomy · CmsMedia · lifecycle 관련 실행 기록 **0** (CMS 는 `CreateCmsContentTables` · `SeedCmsContent` · `cms_contents` 컬럼 4건뿐) |
| 제거된 entity (`f8f041970` · `cd09110fd`) | `Page.ts`(`cms_pages`) · `View.ts`(`cms_views`) · `CustomField.ts`(`custom_fields` 등) — **운영 `pages` · `views` · `custom_fields` 의 컬럼 구조와 정확히 일치**(§5-2) |

→ `custom_post_types` · `custom_fields` · `pages` · `views` 4개는 **기록된 migration 이 만든 적이 없다.** PK/FK 가 TypeORM 해시명(`PK_c5cd…`, `FK_d472…`)인 점에서 과거 `synchronize` 또는 미기록 runner 가 entity 로부터 생성한 잔재로 판단한다(생성 주체 = **기록 없음**).

---

## 5. DROP_CANDIDATE 4개 — 물리 정밀 조사

### 5-1. 기본 속성 (exact `COUNT(*)` · `pg_stat_user_tables`)

| 객체 | 종류 | 소유자 | persistence | exact 행 | total / table / index | 삽입·갱신·삭제 누적 (stats_reset 2025-12-25 이후) | autovacuum/analyze |
|---|---|---|---|--:|---|---|---|
| `custom_post_types` | ordinary table | API 서비스 계정 | permanent | **0** | 40 KB / 0 / 32 KB | **0 / 0 / 0** | 없음 |
| `custom_fields` | ordinary table | 동상 | permanent | **0** | 40 KB / 0 / 32 KB | 0 / 0 / 0 | 없음 |
| `pages` | ordinary table | 동상 | permanent | **0** | 64 KB / 0 / 56 KB | 0 / 0 / 0 | 없음 |
| `views` | ordinary table | 동상 | permanent | **0** | 40 KB / 0 / 32 KB | 0 / 0 / 0 | 없음 |

table 크기 0 = 데이터 페이지 자체가 없다. 4개 모두 통계 리셋(2025-12-25) 이후 **한 번도 쓰인 적 없다.**

### 5-2. 컬럼 구조 (값 미출력)

| 객체 | 컬럼 (타입) | PK / UNIQUE |
|---|---|---|
| `custom_post_types` | id uuid · slug varchar · name varchar · description text · schema jsonb · status varchar · siteId uuid · createdBy varchar · createdAt · updatedAt | PK id · UQ(slug) |
| `custom_fields` | id uuid · postTypeId uuid · name · label · type varchar · groupName varchar · order int · required bool · config jsonb · conditional jsonb · createdAt · updatedAt | PK id |
| `pages` | id uuid · slug · title varchar · content jsonb · viewId uuid · seoTitle varchar · seoDescription text · status · publishedAt · scheduledAt · versions jsonb · currentVersion int · siteId uuid · createdBy · createdAt · updatedAt | PK id · UQ(slug) |
| `views` | id uuid · slug · name varchar · description text · schema jsonb · status varchar · siteId uuid · createdBy · createdAt · updatedAt | PK id · UQ(slug) |

`pages` = 제거된 `modules/cms/entities/Page.ts` 와 동형(`versions` · `currentVersion` · `viewId`), `views` = `View.ts` 와 동형, `custom_fields` = 제거된 `entities/CustomField.ts` 와 동형. identity/sequence 없음(uuid default).

### 5-3. 의존성 (양방향)

| 축 | 결과 |
|---|---|
| inbound FK | `custom_fields.postTypeId → custom_post_types` (**후보 내부 상호 참조**) · `pages.viewId → views` (**후보 내부**) · 그 외 **0** |
| outbound FK | 위 2건 외 0 (현행 테이블로 나가는 FK 0) |
| view / materialized view 의존 | **0** |
| trigger · trigger function | 0 |
| index | PK/UQ + 보조 인덱스 (`IDX_custom_post_types_{slug,status}` · `IDX_custom_fields_{post_type,type,group}` · `IDX_pages_{slug,status,view,published,scheduled}` · `IDX_views_{slug,status}`) — 테이블과 함께 소멸 |
| check constraint | 0 |
| RLS · policy | off · 0 |
| owned sequence | 0 |
| publication / subscription | 0 |
| partition parent/child · extension 의존 | 0 |

`CASCADE` 를 전제하지 않아도 된다 — 후보 밖으로 나가는 의존이 없고, 후보 간 FK 는 §12 의 순서로 해소된다.

### 5-4. 권한

4개 모두 grant = **API 서비스 계정 1개**(ALL). `public` grant 0 · 별도 분석 계정 grant 0 · view 경유 노출 0.

---

## 6. 최신 코드 소비처 재확인 (origin/main `3161f2d74`, `apps/**` · `packages/**` · `services/**` · `scripts/**` · `.github/**` · 설정)

| 객체 | 매치 | 분류 |
|---|---|---|
| `custom_post_types` | `apps/api-server/src/init/cpt.init.ts:26` **주석** ("운영 DB 에 … 0 row") · `reports/cpt-vs-product-scalability/**` 벤치마크 SQL(과거 보고서 산출물) · docs 5건 | COMMENT_ONLY · GENERATED_OUTPUT · DOCUMENTATION_HISTORY → **runtime ZERO** |
| `custom_fields` | docs 2건(선행 IR) | DOCUMENTATION_HISTORY → **ZERO** |
| `pages` · `views` (SQL 형태 `FROM/JOIN/INTO/UPDATE "pages|views"` · `@Entity('pages'|'views')` · `getRepository('…')`) | `scripts/fix-e2e-test-view-text.ts` 1개 — 일회성 e2e 픽스처 수정 스크립트(선행 IR 이 NO_REF · DEAD_SCRIPT 후보로 분류) | 운영 경로 아님 → **runtime ZERO** |
| 18개 ABSENT 이름 | 선행 spec 이 `@Entity` 선언 0 · CREATE migration 0 · 사슬 파일 부재를 고정 | TEST_ABSENCE_GUARD |

entity registration 0 · repository 0 · raw SQL 0 · route 0 · scheduler 0 · seed 0 · admin/서비스 API client 0 · CI/배포 스크립트 0.

---

## 7. 운영 소비 증거 (30일 요청 로그 · `o4o-core-api`)

| 경로 | 건수 · status · referer | 해석 |
|---|---|---|
| `/public/cpt/types` | 65×304 + 52×200 (admin.neture.co.kr) · 3×200 · 2×404 (no referer) | admin **자동 boot 호출**(제거됨) + 조사 probe. 200 은 `cms_cpt_types` 부재를 삼킨 빈 배열 — 실제 성공 아님 |
| `/cpt/types` · `/cpt/taxonomies` · `/cpt/field-groups` | 각 1×404 (no referer) | 조사 probe |
| `/content/assets` · `/stats` | 500 ×6 (admin · probe) · 404 ×2 | `cms_media` 부재 500(제거 전) · 제거 후 404 |
| `/cms/views` | 1×404 (no referer) | 조사 probe |
| `custom_post_types` · `custom_fields` · `pages` · `views` 를 조회하는 요청/오류 | **0** (테이블이 존재하므로 `does not exist` 도 없고, 소비 코드도 없음) | — |

외부 User-Agent 의 legacy 경로 호출 **0**. 저장소 밖 소비자 증거 **0**. Cloud Run job · scheduler 의 대상 테이블 접근 0(코드 소비 0).

---

## 8. 현행 정본 대조

| 정본 | 상태 |
|---|---|
| `cms_contents`(63행) · `cms_content_slots`(2행) | 존재 · 소비 중 · **불변** |
| `media_assets` · `media_entity_links` | 존재(선행 WO 운영 200) · **불변** |
| O4O Editor · block-renderer | 코드 불변 |
| forum · LMS · Signage · Store · Product · Neture supplier · KPA community · homepage CMS · hub content | 이번 대상과 FK · view · 이름 충돌 없음 |

DROP 후보 4개는 정본과 **데이터 중복이 아니라 빈 껍데기**다(행 0). 데이터 이전 대상 없음.

---

## 9. 최종 분류

```text
ABSENT                  = 32   (1차 18 + 인접 이름 14)
DROP_CANDIDATE          = 4    (custom_post_types · custom_fields · pages · views)
KEEP                    = 9    (이름 패턴에 걸린 현행 테이블)
STOP_DATA_PRESENT       = 0
STOP_DEPENDENCY_PRESENT = 0
UNVERIFIED              = 0
```

---

## 10. 중지 · 미확인

| # | 항목 | 결과 |
|:-:|---|---|
| WO §14 1~15 | 자격정보 유효 · read-only txn 보장 · 값 노출 0 · 대상 전부 소형(≤184 KB) · 운영 데이터 0 · inbound FK 후보 내부뿐 · 외부 소비 0 · 정본 소비 0 · schema 변경 불요 · 겹치는 세션 변경 0(IR 문서 1건만 추가) · 자격정보 노출 0 · 위험 연결 없음 · CI 무관 · 선행 CLOSED 판정과 정합(오히려 강화) | **미발동** |
| 로그 보존 | 90일 범위는 확인하지 않았다(30일로 충분 — 소비 코드 자체가 0) | 보고 |
| 90일 이전 `pages`/`views` 사용 이력 | 통계 리셋(2025-12-25) 이후 0. 그 이전 사용 여부는 통계로 알 수 없으나 **현재 행 0** 이므로 결론 불변 | 보고 |

---

## 11. 별도 분리 대상 (변경 · 혼합 없음 — WO §11)

`apps` · `app_usage_logs` · `app_instances`(선행 IR ORPHAN) · 다른 core lifecycle · `signage_*`(이번 패턴 매치 3개는 KEEP) · `cms_content_recommendations`(현행 · 삼킴 catch 는 별도 정비 후보) · `scripts/fix-e2e-test-view-text.ts`(DEAD_SCRIPT 후보) · `reports/cpt-vs-product-scalability/**`(과거 벤치마크 산출물).

---

## 12. 후속 DROP 설계 초안 — `WO-O4O-CMS-RETIRED-PHYSICAL-TABLE-FINAL-DROP-V1` (구현하지 않음)

| 항목 | 초안 |
|---|---|
| 대상 (exact match · wildcard 금지) | `public.custom_fields` → `public.custom_post_types` → `public.pages` → `public.views` |
| 순서 근거 | FK 자식 먼저: `custom_fields`(→`custom_post_types`) · `pages`(→`views`). 두 쌍은 서로 독립 |
| migration 파일 | `apps/api-server/src/database/migrations/20270412000000-DropRetiredCmsCptResidueTables.ts` (실행 완료 migration 수정 0) |
| transaction | 가능 — 4개 모두 소형 · 의존 0 · `transaction: 'each'` 기본 |
| `up()` 가드 | 각 테이블에 대해 (a) 존재하면 (b) `COUNT(*) = 0` 확인 (c) 후보 밖 inbound FK 0 확인 — 하나라도 어긋나면 **throw** (삭제 없이 job 실패 = 배포 중단). 존재하지 않으면 skip. `DROP TABLE … CASCADE` 사용 금지(`RESTRICT` 기본) |
| `down()` | **no-op + 명시 사유**: 데이터 0 · 정본 대체축 존재 · 재생성할 계약이 코드에 없음(entity 제거됨). 복원이 필요하면 별도 WO |
| 예상 영향 | 0 (소비 0 · 행 0 · 의존 0). 총 184 KB 회수 |
| rollback | migration job 실패 시 deploy 미실행(선행 계약). 성공 후 되돌릴 데이터 없음 |
| 적용 경로 | deploy workflow 의 Cloud Run Job `o4o-api-migrations`(`dist/migrate.js`) — API startup 미실행 계약 유지 |
| 운영 검증 | (1) job 로그 `Migrations executed: 1` (2) read-only `information_schema.tables` 에서 4개 부재 (3) `/health/ready` 200 (4) `cms_contents` API 200 (5) 신규 revision ERROR 0 |

---

## 13. 최종 판정

```text
TARGET_TABLE_CENSUS_COMPLETE        = PASS   (14 + cms_media 계열 4)
ADJACENT_OBJECT_DISCOVERY           = PASS   (패턴 8종 + 명시 19 이름 + Git 이력)
PRODUCTION_EXISTENCE_VERIFIED       = PASS   (pg_class 실측)
ROW_COUNTS_VERIFIED                 = PASS   (exact COUNT · 4개 전부 0)
INBOUND_FK_CENSUS                   = PASS
OUTBOUND_FK_CENSUS                  = PASS
VIEW_TRIGGER_SEQUENCE_CENSUS        = PASS   (+ policy · RLS · publication · partition · extension)
RUNTIME_CONSUMER_RECHECK            = PASS   (ZERO)
EXTERNAL_CONSUMER_EVIDENCE_REVIEW   = PASS   (30일 로그 · 외부 0)
CANONICAL_CONTENT_PRESERVED         = PASS
MEDIA_V2_PRESERVED                  = PASS
PRODUCTION_SCHEMA_CHANGE            = ZERO
PRODUCTION_DATA_CHANGE              = ZERO
PRODUCTION_AUTHORIZATION_CHANGE     = ZERO
CREDENTIAL_EXPOSURE                 = ZERO
UNSUPPORTED_ASSUMPTION              = ZERO

CMS_RETIRED_PHYSICAL_TABLE_RESIDUE_CENSUS = COMPLETE
```

Git 변경 = 이 IR 문서 1건. 운영 변경 0.

---

## 14. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (§12)
```
