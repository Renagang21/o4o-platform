# CHECK-O4O-CMS-LIFECYCLE-SCHEMA-CPT-ACF-AND-DEAD-ENTITY-FINAL-RETIREMENT-V1

> **상태**: 구현·로컬 검증 완료 → CI·배포·운영 검증 _(§9 갱신)_
> **작성일**: 2026-09-13
> **WO**: WO-O4O-CMS-LIFECYCLE-SCHEMA-CPT-ACF-AND-DEAD-ENTITY-FINAL-RETIREMENT-V1
> **기준 조사**: [`IR-O4O-CMS-LIFECYCLE-TABLE-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1`](../investigations/IR-O4O-CMS-LIFECYCLE-TABLE-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1.md) — 권고 A 승인
> **기준 SHA**: `70756b839` (origin/main · 작업트리 clean)

---

## 1. 판단 근거 (실측 · WordPress 계열 명칭 때문이 아님)

| 근거 | 실측 |
|---|---|
| 운영 `cms_cpt_types` 부재 | 30일 로그 `relation "cms_cpt_types" does not exist` **116건** |
| 정상 데이터 응답 | **0** — 모든 응답이 `cpt.service:62-65` 의 삼킴을 거친 빈 배열 |
| 호출 성격 | `/public/cpt/types` 120회 전부 referer `admin.neture.co.kr` = `useAdminMenu → useDynamicCPTMenu` **자동 호출**. `/api/v1/cpt/*` 실사용 **0** |
| 은폐 | `does not exist` → `warn` + `[]` + **200** |
| 관리자 진입점 | `/cpt-engine/*` 라우트는 있으나 메뉴 **0** (선행 IA WO 가 제거하며 "별도 판정" 으로 남김) |
| 사용자 데이터 · 저장소 밖 소비자 | **0** (`services/**` 포함 전수 · 30일 로그) |
| 대체해야 할 운영 기능 | 확인되지 않음. 콘텐츠 정본은 `cms_contents` |

---

## 2. 삭제 전 경계 확인 (WO §B "디렉터리 이름만 보고 일괄 삭제하지 않는다" · §C 인접 축)

### 2-1. 사슬 밖 소비처 조사 (import 경로 · 클래스명 두 축)

| 대상 | 사슬 밖 소비처 | 판정 |
|---|---|---|
| `entities/CustomPostType` · `CustomPost` · `CustomField`(3 클래스) | `services/cpt/*` · `controllers/cpt/*` · `modules/cpt-acf` · `MetaDataService` · `dto/post.dto` · `modules/cms/entities/CustomPostType`(re-export) — **전부 사슬 내부** | 제거 |
| `entities/{Form,Template,View}Preset` | import **0**. `@ManyToOne('CustomPostType')` 로 CPT entity 에 FK → CustomPostType 제거 시 TypeORM 관계 해석 실패 | **인접 축, 함께 제거** (migration 0 · backend preset API 0 · 운영 호출 0) |
| `entities/Taxonomy`(`taxonomies` · `terms` · `term_relationships`) | `controllers/cpt/TaxonomiesController` · `routes/cpt.ts` 뿐 | **인접 축, 함께 제거** (migration 0 — `terms` 매치 2건은 법률 문서 "이용약관" 텍스트) |
| `services/MetaDataService` | `services/cpt/modules/meta.module` 뿐 | 제거 |
| `routes/public.routes.ts` | 라우트가 `/cpt/types` **하나뿐** | 파일 제거 (다른 `/api/v1/public/*` 마운트 무영향) |
| `entities/TemplatePart`(`template_parts`) | `services/settingsService.ts` 가 소비 | **보존** (CPT 사슬 아님) |
| cms-core `view-system/*` | 인메모리 레지스트리 · entity 미의존 · `resolveCmsView` 는 이름만 같은 다른 개념 | **보존** (WO §A "이름이 같은 다른 현행 View 개념") |
| `@o4o/types` 의 `CustomPostType`/`ViewPreset` 등 **인터페이스** | block-renderer · shared-space-ui · packages/utils 가 타입으로 소비 | **보존** (api entity 와 별개) |
| admin `features/cpt-acf` (27) · `pages/cpt-engine` (15) · `hooks/cpt` (2) · `components/cpt` (5) · `useDynamicCPTMenu` | 서로만 import. 밖 = `useAdminMenu`(주입부) · `rolePermissions`(접두사) · `content.routes`(라우트) · tests | 제거 + 연결부 정리 |
| admin `services/ai/reference-fetcher.service.ts` | AI 페이지 생성기(정상 기능)가 `/cpt/types` 를 **선택적**으로 참조 | 기능 보존, **CPT 분기만 제거** |
| O4O Editor · block-renderer · content-editor | CPT/ACF API 참조 **0** | 독립 — 불변 |

### 2-2. CmsContent · CmsContentSlot 독립성

`CmsContentSlot → CmsContent` 관계뿐. 제거 대상 12 entity 로부터 `CmsContent` 로의 참조 0, 역방향 0.

---

## 3. 구현

### A. dead entity 14 (12 lifecycle + `cms_pages` · `cms_fields`)

| 계층 | 처분 |
|---|---|
| `packages/cms-core/src/entities/Cms{Acf*3, Cpt*2, Menu*3, Setting, Template*2, View}.entity.ts` (12) | **삭제** · `entities/index.ts` 는 `CmsContent` · `CmsContentSlot` · `Channel*`3 만 export |
| `apps/api-server/src/modules/cms/entities/{Page,View,CustomField,CustomPostType}.ts` | **삭제** (디렉터리 소멸) — `cms_pages` · `cms_fields` · 중복 `cms_views` · CPT re-export |
| `database/entities.ts` | `CMSCustomField` · `CMSView` · `CMSPage` 등록 제거 |

`cms_views` 중복 2 entity(cms-core `CmsView` + api `View`) 모두 제거. `view-system` 의 `resolveCmsView` 는 보존.

### B. CPT/ACF runtime 제거

| 계층 | 파일 | 처분 |
|---|---|---|
| backend route | `routes/cpt.ts`(`/api/v1/cpt`) · `routes/public.routes.ts`(`/api/v1/public/cpt/types`) | **삭제** + `register-routes.ts` 마운트 2 제거 (alias 없음) |
| backend service/controller | `services/cpt/{cpt.service, modules/acf,meta,post}` · `controllers/cpt/{FieldGroups,Taxonomies}Controller` · `modules/cpt-acf/controllers/cpt.controller` · `services/MetaDataService` · `dto/post.dto` | **삭제** — `cpt.service:62-65` 의 삼킴도 함께 소멸 |
| backend entity | `entities/{CustomPostType,CustomPost,CustomField,FormPreset,TemplatePreset,ViewPreset,Taxonomy}.ts` | **삭제** + `entities.ts` 등록 11 클래스 제거 |
| admin | `pages/cpt-engine`(15) · `features/cpt-acf`(27) · `hooks/cpt`(2) · `components/cpt`(5) · `hooks/useDynamicCPTMenu.tsx` | **삭제** |
| admin 연결부 | `hooks/useAdminMenu.ts` — 동적 CPT 주입·`cptLoading` 제거 → **admin 로드 시 dead API 호출 0** | 수정 |
| | `routes/content.routes.tsx` — `/cpt-engine/*` Route · lazy import 제거 | 수정 |
| | `config/rolePermissions.ts` — `custom-posts` 항목 · `DYNAMIC_MENU_ID_PREFIXES` 의 `cpt-` 제거 (빈 배열 = deny-by-default 유지, 함수는 보존) | 수정 |
| | `services/ai/reference-fetcher.service.ts` — `fetchCptReference` · formatter 의 CPT 분기 제거 (AI 생성기 본체 보존) | 수정 |

### C. 인접 테이블 (§2-1) — preset 3 · taxonomy 3 · `custom_posts` · `custom_field_*` 3: 전부 CPT 전용 · migration 0 · 운영 호출 0 → 함께 제거. `CmsContent`/O4O Editor 의존 **0** → 중지 조건 미발동.

### D. lifecycle schema ownership 제거

14개 제거 후 `install.ts` 가 만들 테이블 = **0** → WO §D 발동.

| 파일 | 처분 |
|---|---|
| `packages/cms-core/src/lifecycle/install.ts` · `uninstall.ts` | **삭제** (CREATE/DROP 계약 자체 제거) |
| `lifecycle/index.ts` | `activate` · `deactivate` 만 export (둘 다 `app_registry` 상태 갱신만, 스키마 무관) |
| `manifest.ts` | `ownsTables: []` · `lifecycle.{install,uninstall}` 제거 · `uninstallPolicy` 제거 · `backend.entities/services/controllers` 와 `frontend.admin.pages` 를 **실제 존재하는 것**으로 정정 (구현된 적 없는 Template/Cpt/Acf/Menu/Media 계열 선언 제거) |

**만들지 않은 것**: 대체 installer · startup fallback · synchronize · `.up()` 직접 호출. 스키마 소유자 = deploy migration job (선행 `WO-O4O-DATABASE-MIGRATION-OWNERSHIP-…` 계약 유지).

### E. 오류 은폐

`cms_cpt_types does not exist → []` 는 `cpt.service` 와 함께 소멸. compatibility alias · 빈 응답 API 없음. signal 핸들러의 `product_approvals` catch 와 shared-space-ui copy props 는 **손대지 않음** (WO §E 지시 — §10 인계).

### F. 회귀 가드

- 신규 `apps/api-server/src/__tests__/cms-lifecycle-schema-cpt-acf-dead-entity-retirement.spec.ts` — **A~E 5절**: install/uninstall 부재 · lifecycle export = activate/deactivate 만 · cms-core 전체 `CREATE TABLE` 0 · `ownsTables: []` · 14 entity 부재 · 14 테이블 `@Entity` 선언 0 · CREATE migration 0 · CPT 사슬 파일 부재 · 마운트 0 · 등록 0 · 은폐 문구 0 · admin 사슬 부재 · `useAdminMenu` 주입 0 · `/cpt/` 호출 0 · 라우트/권한 0 · 정본 5종 보존
- 기존 spec 갱신 7: `unprovisioned-form-and-legacy-app-axis-final-disposition`(CPT 보존 → 제거 확정) · `wordpress-legacy-dead-entity-teardown-contract`(preset 3 보존 → 제거) · `cms-legacy-media-…`(install 부재 허용) · `legacy-wordpress-block-editor-retirement`(cpt-engine 부재) · `shortcode-domain-retirement`(`routes/cpt.ts` 부재) · admin `admin-information-architecture`(`/cpt-engine` 제거 확정) · `admin-authorization-registry-…`(cpt 접두사 → deny) · `admin-legacy-route-api-…`(acf.api 부재)

---

## 4. 변경 규모

**102 파일** = 삭제 86 · 수정 15 · 신규 1 (spec). **schema 변경 0 · migration 추가 0 · 운영 DB write 0 · dependency/lockfile 0.**

```text
D 86   packages/cms-core (entities 12 · lifecycle 2)
       apps/api-server  (entities 7 · modules/cms/entities 4 · services/cpt 4 · controllers/cpt 2 ·
                         modules/cpt-acf 1 · routes 2 · MetaDataService · post.dto)
       apps/admin-dashboard (pages/cpt-engine 15 · features/cpt-acf 27 · hooks/cpt 2 · components/cpt 5 ·
                         useDynamicCPTMenu)
M 15   cms-core entities/index · lifecycle/index · manifest / api entities.ts · register-routes / admin
       useAdminMenu · content.routes · rolePermissions · reference-fetcher / spec 6
A  1   cms-lifecycle-schema-cpt-acf-dead-entity-retirement.spec.ts
```

---

## 5. 로컬 검증

| 단계 | 결과 |
|---|---|
| `@o4o-apps/cms-core` build | ✅ 0 errors |
| `pnpm run build:packages` | ✅ exit 0 |
| api-server type-check | ✅ 0 errors |
| admin-dashboard type-check | ✅ 0 errors |
| `type-check:frontend` | ✅ 0 errors |
| admin test | ✅ **16/16** |
| admin lint · build | ✅ 0 problems · exit 0 |
| api-server lint | 44 errors = baseline 동일 · 내 파일 0 |
| 신규 spec + 갱신 spec 4 (api) | ✅ **206/206** |
| api-server 전체 Jest (`--runInBand`) | 1차: 270/273 suites · 4,472 pass — 실패 3 = `main-site-full-source-deletion`(로컬 미추적 잔여물, 무관) + **선행 WO 가 CPT 런타임을 "보존"으로 고정한 spec 2**(`unprovisioned-form-…` · `wordpress-legacy-dead-entity-…`). 후자 2건은 판정 변경을 반영해 갱신 → 재실행 **24/24**. 갱신은 spec 파일만이므로 나머지 270 suite 결과는 유효 |
| `check-unsafe-routes` | ✅ 1119 파일 · 위반 0 |
| `check-typeorm-entities` | ✅ DEFINED_BUT_UNREGISTERED 0 / 중복 0 / stale 0 |
| `appstore-guard` | ✅ **PASSED** — 경고 1: `cms-core: missing lifecycle files: install.ts` (비차단 · WO §D 의 의도된 결과. 가드는 "Lifecycle warnings don't fail the build") |

---

## 6. 보존 확인

`CmsContent` · `cms_contents` · `cms_content_slots` · `routes/cms-content/*` · Media V2(`media_assets` · `media_entity_links` · `/platform/media-library*`) · O4O Editor(`ContentFormModal` · `content-editor`) · `block-renderer` · forum-core/LMS content type · `supplier-signal`/`seller-signal` · Signage/Store/Product 미디어 축 · cms-core `view-system` · `TemplatePart`(settingsService 소비) — 전부 불변. spec E 절이 고정.

---

## 7. 중지 조건 점검 (WO §I)

| 조건 | 결과 |
|---|---|
| 실제 운영 데이터 | 테이블 부재(로그 실증) — 없음 |
| 저장소 밖 API 소비자 | 30일 로그 0 (`services/**` 포함) |
| CmsContent · O4O Editor 직접 의존 | 0 |
| 다른 서비스의 작동 중인 CPT/ACF | `services/*/src` 호출 0 |
| inbound FK · 데이터 이전 | 해당 없음 |
| 다른 세션 겹치는 미커밋 | 0 (`o4o-work-scope` 1건은 무관 경로) |
| schema/data 변경 필요 | 없음 |

→ **미발동.**

---

## 8. 미실행 · 인계 (§10 참조)

| # | 항목 | 처분 |
|:-:|---|---|
| 1 | 운영 물리 테이블 14 + 인접 `custom_*` · preset · taxonomy 의 존재 확인 · DROP 판정 | WO §F — 자격정보 확보 후 `information_schema` read-only 조회로 별도 단계 |
| 2 | signal 핸들러 `product_approvals` bare catch | 저우선순위 잔재 — 미수정 (WO §E) |
| 3 | `@o4o/shared-space-ui` copy props (소비 0) | 전역 dead-code 후보 — 미혼합 (WO §E) |
| 4 | `packages/utils` `usePreset` · `@o4o/types` preset/CPT 인터페이스 — backend preset API 가 없는데 프런트 훅이 남아 있음 | 이번 범위 밖(패키지 계약). 전역 dead-code census 인계 |
| 5 | 다른 core(auth · platform · organization · lms)의 `lifecycle/install.ts` 에도 `CREATE TABLE` 이 남아 있다(각 8·3·4·8) — 호출자 유무는 미조사 | 별도 IR 후보 (스키마 단일 소유자 계약의 잔여 위험) |

---

## 9. CI · 배포 · 운영 검증

_(push 후 갱신)_

---

## 10. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§8-1 물리 테이블 · §8-5 타 core lifecycle)
```

기준 문서에서 CPT/ACF · cms-core lifecycle 을 현행 기능으로 서술하는 곳은 없다.
