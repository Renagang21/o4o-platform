# IR-O4O-CMS-MEDIA-PAGE-VIEW-LEGACY-RUNTIME-AND-MEDIA-V2-OWNERSHIP-CENSUS-V1

> **상태**: 조사 완료 (조사 전용 — 코드 · DB · schema · route · 운영 자원 변경 0)
> **작성일**: 2026-09-13
> **기준 SHA**: `c6a7ad1d1` (origin/main · 작업트리 clean)
> **선행 IR**: [`IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1`](IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1.md) — 본 IR 은 그 §4-2(항목 9) · §5 가 유보한 CMS 미디어 축을 전수로 확정한다.

---

## 1. 조사 채널

| 채널 | 사용 | 비고 |
|---|---|---|
| 코드 전수 (apps + packages, `dist` 제외) | O | entity · 테이블명 · 소비처 · 라우트 마운트 |
| 운영 API read-only (`https://api.neture.co.kr`) | O | platform:super_admin 로그인 후 GET 만 |
| 운영 로그 (`gcloud logging read`, 30일) | O | `relation ... does not exist` 집계 |
| 운영 DB 직접 조회 (Cloud SQL Auth Proxy) | X | 프록시 터널은 성립했으나 `apps/api-server/.env` 의 `o4o_api` 자격정보가 운영에서 거부됨(`password authentication failed`) — §9 미확인 |

**변경 0**: 코드 · schema · route · 운영 자원 모두 손대지 않았다. 운영 호출은 로그인 + GET 뿐이다.

---

## 2. 결론 요약

```text
CMS 스키마에는 소유자가 둘이다.
  (A) deploy migration job         → cms_contents · cms_content_slots (2개) = 실제로 존재
  (B) cms-core lifecycle install() → 나머지 16개                            = 호출자 0 → 생성된 적 없음
그리고 어느 쪽에도 속하지 않는 3개(cms_pages · cms_views · cms_fields)가 entity 로만 등록돼 있다.

Media 정본은 media_assets(+media_entity_links) 하나다.
cms_media 는 코드에만 살아 있고 운영에서는 500 이다.
```

---

## 3. 축 1 — CMS 테이블 생성 주체 전수

`packages/cms-core/src/lifecycle/install.ts` 가 `CREATE TABLE IF NOT EXISTS` 로 **16개**를 만든다. 그러나:

- `install` 을 import 하는 코드: **저장소 전체 0** (`@o4o-apps/cms-core` 의 lifecycle · install · activate import 0건)
- `app-manifests` · `AppRegistryService` 의 lifecycle 자동 실행: **없음**
- `synchronize: false` (`apps/api-server/src/database/connection.ts:94`)

즉 **생성 경로가 실행된 적이 없다.**

| 테이블 | migration | lifecycle install | 런타임 소비 파일 | 운영 존재 |
|---|:-:|:-:|:-:|---|
| `cms_contents` | O | — | 다수 | O (정본) |
| `cms_content_slots` | O | — | 다수 | O |
| `cms_media` | X | O | **5** | **부재 실증** (§4) |
| `cms_cpt_types` | X | O | 5 | **부재 실증** (§4) |
| `cms_cpt_fields` | X | O | 0 | 미확인 |
| `cms_media_files` · `cms_media_folders` · `cms_media_tags` | X | O | **0** | 미확인 |
| `cms_menus` · `cms_menu_items` · `cms_menu_locations` | X | O | **0** | 미확인 |
| `cms_templates` · `cms_template_parts` | X | O | **0** | 미확인 |
| `cms_settings` | X | O | **0** | 미확인 |
| `cms_acf_field_groups` · `cms_acf_fields` · `cms_acf_values` | X | O | **0** | 미확인 |
| `cms_views` | X | O | **0** | 미확인 |
| **`cms_pages`** | X | **X** | **0** | 생성 주체 **0** |
| **`cms_fields`** | X | **X** | **0** | 생성 주체 **0** |

**선례**: `lms-core` 도 같은 구조였고 `20260410000001-CreateLmsCoreTables` 가
*"lms-core lifecycle install hook이 실제 호출되지 않아 프로덕션 DB에 LMS 테이블이 생성되지 않은 문제 수정"* 이라는 사유로
migration 을 추가해 해소했다. **cms-core 에는 그 대응이 없다.**

이는 방금 마감한 `WO-O4O-DATABASE-MIGRATION-OWNERSHIP-STARTUP-HEALTH-AND-LEGACY-DEPLOY-TOOLING-FINAL-CLOSURE-V1` 의 계약
(`PRODUCTION_MIGRATION_OWNER = DEPLOY_MIGRATION_JOB_ONLY`)과 어긋나는 **두 번째 스키마 소유자**다.
다만 실행되지 않으므로 현재 운영 스키마를 바꾸고 있지는 않다 — 위험은 "미생성"이지 "이중 생성"이 아니다.

---

## 4. 축 2 — cms_media legacy runtime (운영 500)

### 4-1. 운영 실측 (2026-09-13, platform:super_admin GET)

| 경로 | 결과 |
|---|---|
| `GET /api/v1/content/assets?limit=1` | **500** `relation "cms_media" does not exist` |
| `GET /api/v1/content/assets/stats` | **500** 동일 |
| `GET /api/v1/content/media*` (레거시 클라이언트 대상) | **404** (route 자체 없음 — 선행 IR §4-2 항목 9 재확인) |
| `GET /api/v1/platform/media-library?limit=1` | **200** — `media_assets` 실데이터 반환 |

### 4-2. 운영 로그 30일 (`o4o-core-api`, `relation "..." does not exist`)

| relation | 건수 |
|---|---:|
| `cms_cpt_types` | **81** |
| `cms_media` | **46** |
| `kpa_member` | 8 |
| `kpa_applications` | 2 |
| `forum_category` | 2 |

→ 산발적 오류가 아니라 **상시 발생**이다.

### 4-3. `cms_media` 소비 코드 (테스트 · migration · entity 정의 제외)

| 파일 | 성격 |
|---|---|
| `routes/content/content-assets.routes.ts` | `/api/v1/content/assets` (requireAdmin) — 목록 · 상세 · stats · copy. **500 의 발생원** |
| `routes/dashboard/dashboard-assets.query-handlers.ts` | `/api/v1/dashboard/assets` 조회 3종 — **오류를 삼킴** (§7) |
| `routes/dashboard/dashboard-assets.mutation-handlers.ts` | PATCH · publish · archive |
| `routes/dashboard/dashboard-assets.copy-handlers.ts` | 허브 콘텐츠 → 대시보드 복사 (CmsContent → CmsMedia 쓰기) |
| `routes/dashboard/dashboard-assets.types.ts` | 투영 타입 |

`cms_media_files` · `cms_media_folders` · `cms_media_tags` 는 entity 정의뿐 **런타임 소비 0**.

---

## 5. 축 3 — Page · View · Field entity (스키마 없는 등록)

`apps/api-server/src/database/entities.ts:109-111, 648-650` 이 세 entity 를 TypeORM 에 등록한다.

| entity | 파일 | 테이블 | 생성 주체 | import 소비처 |
|---|---|---|---|---|
| `CMSPage` | `modules/cms/entities/Page.ts` | `cms_pages` | **없음** | `database/entities.ts` **단 1곳** |
| `CMSView` | `modules/cms/entities/View.ts` | `cms_views` | lifecycle(미실행) | `database/entities.ts` **단 1곳** |
| `CMSCustomField` | `modules/cms/entities/CustomField.ts` | `cms_fields` | **없음** | `database/entities.ts` **단 1곳** |

- `View.ts` 헤더는 스스로 `@owner cms-core (lifecycle creates table)` 라고 적어 **미실행 lifecycle 에 소유권을 위임**하고 있다.
- **테이블명 중복 선언**: `cms_views` 를 `modules/cms/entities/View.ts` 와 `packages/cms-core/src/entities/CmsView.entity.ts` 가 **둘 다** 선언한다
  (저장소 전체 중복은 `organizations` 3 · `cms_views` 2 · `cms_cpt_types` 2).
- `synchronize: false` 라 부팅은 무해하다 — 선행 IR 의 `themes` 와 같은 `DEAD_ENTITY` 유형이다.
- `cms-core` 의 `view-system/view-resolver` 소비처도 **0**.

---

## 6. 축 4 — Media V2 소유권 (정본)

| 축 | 테이블 | 소유 모듈 | 쓰기 주체 | 상태 |
|---|---|---|---|---|
| **Media Library V2** | `media_assets` | `modules/media` | `media-library.service`(업로드 · folder · metadata · 삭제) · `media-catalog.service`(external 등록 · catalog · links) | **ACTIVE_CANONICAL** — 운영 200 |
| Media 관계 | `media_entity_links` | `modules/media` (생성: `20270407000000-MediaLibraryV2Foundation`) | 위 2개 + `modules/automation`(VIDEO Job) | ACTIVE — `entity_type CHECK ∈ {product, brand, content, service, video-production-job}` |
| Signage 미디어 | `signage_media` | `routes/signage` + `modules/hub-content` | 다수(24파일) | **ACTIVE_SEPARATE** — V2 와 별개 축 |
| 매장 자료함 | `store_execution_assets` | `routes/platform` | 27파일 | ACTIVE_SEPARATE |
| 매장 영상 | `store_videos` | `routes/o4o-store` | 8파일 | ACTIVE_SEPARATE |
| 제품 이미지 | `product_images` | `modules/neture` | 50파일 | ACTIVE_SEPARATE |
| **CMS 미디어** | `cms_media` (+files/folders/tags) | `packages/cms-core` | `routes/content` · `routes/dashboard` | **BROKEN_LEGACY** (§4) |

API 표면은 `/api/v1/platform/media-library*` 하나로 통일돼 있다
(`media-catalog.controller` 도 같은 prefix 아래 `router.use` 로 합류 — 별도 `/media-catalog` 경로는 **없다**.
조사 중 관찰한 `/platform/media-catalog` 404 는 결함이 아니라 정상).

`AutomationJob` 은 별도 테이블 없이 `media_entity_links(entity_type='video-production-job')` 를 재사용한다 — V2 를 정본으로 쓰는 최신 소비 사례다.

---

## 7. 축 5 — 실패 삼킴 (false success)

`routes/dashboard/dashboard-assets.query-handlers.ts` 의 조회 핸들러 3개가
`error.message.includes('does not exist')` 를 잡아 **성공 응답**으로 바꾼다.

```text
:130  -> res.json({ success: true, data: [] })
:175  -> res.json({ success: true, sourceIds: [] })
:270  -> res.json({ success: true, data: { totalAssets: 0, activeAssets: 0, recentViewsSum: 0, topRecommended: null } })
```

실측: `GET /api/v1/dashboard/assets?dashboardId=<임의 UUID>` → **200 `{"success":true,"data":[]}`**
(테이블이 없는데 200 · 빈 목록. 호출자는 "자산 없음"과 "테이블 없음"을 구분할 수 없다.)

같은 계열:
- `services/cpt/cpt.service.ts:62-65` — `cms_cpt_types` 부재 시 `warn` 후 **빈 배열**. 로그의 81건이 화면에서는 "CPT 0개"로 보인다.
- `modules/hub-content/hub-content.service.ts` 8곳, `modules/content/content-query.service.ts:311`(`cms_content_recommendations`),
  `modules/survey/controllers/SurveyController.ts:38`, `modules/lms/controllers/CourseController.ts:165` 각 1곳.

> 이 패턴은 방금 마감한 migration WO 가 startup 에서 제거한 "실패를 warn 으로 삼키고 계속"과 **같은 성질**이다.
> 다만 위치가 조회 경로라 영향은 기동 실패가 아니라 데이터 왜곡(빈 결과)이다.

---

## 8. 축 6 — UI 노출 역전

| 화면 | route | backend | 메뉴 진입점 | 결과 |
|---|---|---|---|---|
| Content **Assets** (legacy) | `/content/assets` · `/content/assets/:assetId` | `/api/v1/content/assets` → `cms_media` | **있음** (`admin-menu.static.tsx:264-269` Content › Assets) | **클릭 시 500** |
| Media Assets (V2 정본) | `/content-resource/media-assets` | `/api/v1/platform/media-library` | **없음** | 정상 200 — URL 직접 입력 또는 `/media/*` redirect 로만 도달 |

`/content/policies` · `/content/analytics` 는 API 를 호출하지 않는 **정적 화면**이라 정상이다(오탐 확인).

즉 **깨진 legacy 는 메뉴에 노출돼 있고, 동작하는 정본은 메뉴에 없다.**

---

## 9. 미확인 (판정 유보)

| # | 항목 | 사유 |
|:-:|---|---|
| 1 | lifecycle 16개 중 `cms_media` · `cms_cpt_types` 를 뺀 **14개의 운영 존재 여부** | `information_schema` 조회를 시도했다. Cloud SQL Auth Proxy(v2 · access-token 방식) 터널은 성립했으나 로컬 `apps/api-server/.env` 의 `o4o_api` 비밀번호가 운영에서 거부됐다(`password authentication failed`). 운영 자격정보 확보는 사용자 승인 사항(CLAUDE.md 중지 조건)이라 더 진행하지 않았다. 자격정보가 갱신되면 단일 `information_schema.tables` SELECT 로 확정 가능하다 |
| 2 | `cms_media` 데이터 유실 여부 | 테이블이 없으므로 잃을 데이터도 없다고 추정되나 DB 조회 전 단정하지 않는다 |
| 3 | `/content/assets` 화면의 브라우저 실측 | 본 IR 은 API 계층까지만 확인(조사 전용). 화면의 오류 표시 방식은 미확인 |
| 4 | `dashboard-assets` 쓰기 경로(copy · publish · archive) 의 운영 동작 | GET 만 수행했다. 삼킴 없이 500 일 것으로 읽히나 미실측 |

---

## 10. 분류 요약

| 분류 | 대상 |
|---|---|
| `ACTIVE_CANONICAL` | `media_assets` · `media_entity_links` · `/api/v1/platform/media-library*` · `cms_contents` · `cms_content_slots` |
| `BROKEN_LEGACY_RUNTIME` | `cms_media` 소비 5파일 · `/api/v1/content/assets*` · admin 메뉴 Content › Assets |
| `SILENT_DEGRADATION` | `dashboard-assets` 조회 3 · `cpt.service` · `hub-content` 8 · `content-query` 1 · `survey` 1 · `lms` 1 |
| `DEAD_ENTITY` (스키마 없음 · 소비 0) | `CMSPage`/`cms_pages` · `CMSView`/`cms_views` · `CMSCustomField`/`cms_fields` |
| `DEAD_ENTITY_FAMILY` (lifecycle 전용 · 런타임 소비 0) | `cms_media_files` · `cms_media_folders` · `cms_media_tags` · `cms_menus` · `cms_menu_items` · `cms_menu_locations` · `cms_templates` · `cms_template_parts` · `cms_settings` · `cms_acf_*` 3 |
| `SECOND_SCHEMA_OWNER` | `packages/cms-core/src/lifecycle/install.ts` (호출자 0) |
| `DUPLICATE_TABLE_DECLARATION` | `cms_views` x2 · `cms_cpt_types` x2 (+ 기존 `organizations` x3) |

---

## 11. 후속 WO 제안 (본 IR 에서 실행하지 않음)

조사 전용이므로 아래는 **제안**이며 어느 것도 착수하지 않았다.

| # | 제안 | 근거 | 성격 |
|:-:|---|---|---|
| 1 | `cms_media` 축 처분 결정 — **(A)** 테이블 생성 migration 추가(lms-core 선례) vs **(B)** legacy runtime · 메뉴 제거 후 V2 로 일원화 | §4 · §8 | "Content Assets 기능을 유지하는가"라는 **사업 판단**이 선행 |
| 2 | admin 메뉴 정합 — 깨진 `/content/assets` 노출과 정본 `/content-resource/media-assets` 미노출 | §8 | 1번 결정에 종속 |
| 3 | `cms_pages` · `cms_views` · `cms_fields` entity 등록 해제 + 중복 선언 정리 | §5 | 낮은 위험(소비 0) |
| 4 | cms-core lifecycle 의 스키마 소유권 정리 — migration 이관 또는 install 삭제 | §3 · migration 단일 소유자 계약 | 계약 정합 |
| 5 | 조회 경로의 `does not exist` 삼킴 처리 기준 확정 | §7 | 별도 판단 |

---

## 12. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 5건
```

기준 문서(`docs/baseline/**` · `docs/architecture/**` 등)에서 본 조사와 어긋나는 서술은 발견하지 않았다.
`View.ts` 의 `@contract docs/contracts/cms-view-schema.md` 는 소스 주석이며 기준 문서가 아니다
(해당 경로 자체도 부재 — §11-3 정리 대상에 포함).
