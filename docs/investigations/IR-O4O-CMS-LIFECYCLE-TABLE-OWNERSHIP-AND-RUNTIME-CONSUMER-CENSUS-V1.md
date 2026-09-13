# IR-O4O-CMS-LIFECYCLE-TABLE-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1

> **상태**: 조사 완료 (조사 전용 — schema · 데이터 · route · 코드 변경 0)
> **작성일**: 2026-09-13
> **기준 SHA**: `0b95a31f0` (origin/main · 작업트리 clean)
> **선행**: [`IR-O4O-CMS-MEDIA-PAGE-VIEW-LEGACY-RUNTIME-AND-MEDIA-V2-OWNERSHIP-CENSUS-V1`](IR-O4O-CMS-MEDIA-PAGE-VIEW-LEGACY-RUNTIME-AND-MEDIA-V2-OWNERSHIP-CENSUS-V1.md) → [`CHECK-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1`](../checks/CHECK-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1.md) (cms_media 계열 4 종결)

---

## 1. 조사 대상과 채널

**대상**: `packages/cms-core/src/lifecycle/install.ts` 가 만드는 잔여 **12개** 테이블 + 생성 주체 없이 entity 로만 등록된 **2개**(`cms_pages` · `cms_fields`) + 중복 선언 **2건**(`cms_views` · `cms_cpt_types`).

| 채널 | 사용 | 비고 |
|---|---|---|
| 코드 전수 — `apps/**` · `packages/**` · **`services/**`** (`dist` 제외) | O | 선행 IR 이 `services/` 를 누락한 것을 반영해 이번엔 포함 |
| 테이블명 grep **+ entity 클래스명 grep** | O | `getRepository(Class)` 형 소비를 놓치지 않기 위해 두 축 모두 |
| 운영 로그 30일 (`relation "..." does not exist`, 요청 URL·referer) | O | |
| 운영 API read-only | O | 로그인 + GET |
| 운영 DB 직접 조회 | X | 자격정보 미확보(선행 IR §9). **존재 여부가 결론을 바꾸는 테이블만 `UNVERIFIED`** |

**변경 0.** 조사 중 코드 · schema · 데이터 · route · 운영 자원을 손대지 않았다.

### 1-1. 조사 방법의 전제 (제한 사항 준수)

- lifecycle 12개를 일괄 migration 으로 만들지 않는다 → 테이블별 독립 판정.
- "운영에 존재한다" 만으로 보존하지 않고, "entity 가 있다" 만으로 만들지 않으며, "소비처 0" 만으로 DROP 하지 않는다.
- 이름이 비슷해도(`cms_views`×2 · `cms_cpt_types`×2 · `cms_fields`/`custom_fields`) **각각 독립 판정**.

---

## 2. 결론 요약

```text
lifecycle install() 호출자 = 0 (변함없음). 따라서 이 12개는 migration 이 만든 적도, lifecycle 이 만든 적도 없다.

12 + 2 중 런타임 소비가 있는 테이블 = 1개 (cms_cpt_types — 단, cms-core 의 CmsCptType 이 아니라
  api-server 자체 entity CustomPostType 을 통해서다). 나머지 13개 = 런타임 소비 0 · 프런트 소비 0.

cms_cpt_types 는 관리자 화면이 로드될 때마다 호출돼 30일간 116회 "does not exist" 를 냈고,
  cpt.service 가 이를 빈 배열로 삼켜 "CPT 0개" 로 보이게 한다. 이 하나만 사업 판단(CPT 엔진 유지 여부)이 필요하다.
```

---

## 3. 테이블별 판정표 (12 + 2)

범례 — 생성: `M`=migration · `L`=lifecycle DDL(미실행) · `-`=없음 / Entity: `core`=cms-core · `api`=api-server 자체 / 소비: 테이블명·클래스명 두 축 모두 0 이면 `0`

| # | 테이블 | 생성 주체 | 운영 존재 | Entity 등록 | Runtime 소비 | Frontend 소비 | 운영 증거 | 정본 대체축 | **최종 분류** |
|:-:|---|:-:|---|---|:-:|:-:|---|---|---|
| 1 | `cms_acf_field_groups` | L | 미확인 | core `CmsAcfFieldGroup` | 0 | 0 | 로그 0 · 호출 0 | ACF 개념 자체가 `custom_field_groups`(api entity, #15) 로 이중화 | **REMOVE** (entity · lifecycle DDL) |
| 2 | `cms_acf_fields` | L | 미확인 | core `CmsAcfField` | 0 | 0 | 로그 0 | `custom_fields`(api) | **REMOVE** |
| 3 | `cms_acf_values` | L | 미확인 | core `CmsAcfValue` | 0 | 0 | 로그 0 | `custom_field_values`(api) | **REMOVE** |
| 4 | `cms_cpt_fields` | L | 미확인 | core `CmsCptField` | 0 | 0 | 로그 0 | — | **REMOVE** |
| 5 | **`cms_cpt_types`** | L | **부재 실증** | **중복** core `CmsCptType`(소비 0) + **api `entities/CustomPostType.ts`(소비 O)** | **1 사슬** — `services/cpt/cpt.service.ts` → `routes/cpt.ts`(`/api/v1/cpt`) · `modules/cpt-acf/controllers/cpt.controller.ts` · `routes/public.routes.ts`(`/public/cpt/types`) | **admin** — `hooks/useDynamicCPTMenu` (사이드바 동적 메뉴, `useAdminMenu` 가 항상 호출) · `pages/cpt-engine/**` 15파일(`/cpt-engine/*` route, 메뉴 진입점 없음) · `features/cpt-acf/**` 26파일 | **30일 로그 116건** `relation "cms_cpt_types" does not exist` · `/public/cpt/types` 120회(referer `admin.neture.co.kr`) → `cpt.service:62-65` 가 삼켜 **200 빈 배열** | 없음 (CPT 는 WordPress 계열 개념. 현행 콘텐츠 정본은 `cms_contents`) | **DECISION_REQUIRED** — §4 |
| 6 | `cms_menu_items` | L | 미확인 | core `CmsMenuItem` | 0 | 0 | 로그 0 | 서비스별 네비게이션은 코드 config(`config/navigation.ts` 등) | **REMOVE** |
| 7 | `cms_menu_locations` | L | 미확인 | core `CmsMenuLocation` | 0 | 0 | 로그 0 | 동상 | **REMOVE** |
| 8 | `cms_menus` | L | 미확인 | core `CmsMenu` | 0 | 0 | 로그 0 | 동상 | **REMOVE** |
| 9 | `cms_settings` | L | 미확인 | core `CmsSetting` | 0 | 0 | 로그 0 | `settings`(api-server `Settings` entity) | **REMOVE** |
| 10 | `cms_template_parts` | L | 미확인 | core `CmsTemplatePart` | 0 | 0 | 로그 0 | `content-templates.routes`(별도 축) | **REMOVE** |
| 11 | `cms_templates` | L | 미확인 | core `CmsTemplate` | 0 | 0 | 로그 0 | 동상 | **REMOVE** |
| 12 | `cms_views` | L | 미확인 | **중복** core `CmsView` + api `modules/cms/entities/View.ts` | 0 (클래스명 매치 3건은 `types/listing-display.ts` · `ui/corner-display/*` 의 **주석**뿐) | 0 | 로그 0 | 코너 디스플레이 설정은 `store_*`/listing 축이 담당 | **REMOVE** (양쪽 entity 모두) |
| 13 | `cms_pages` | **-** | 미확인 | api `modules/cms/entities/Page.ts` | 0 (import = `database/entities.ts` 1곳) | 0 | 로그 0 · admin `Pages` 메뉴는 이미 제거됨(backend 404 사유) | 페이지 콘텐츠는 `cms_contents` | **REMOVE** |
| 14 | `cms_fields` | **-** | 미확인 | api `modules/cms/entities/CustomField.ts`(class `CustomField`) | 0 | 0 | 로그 0 | `custom_fields`(api `entities/CustomField.ts`, #16) — **같은 클래스명, 다른 테이블** | **REMOVE** |

**`UNVERIFIED` 판정 0건.** 13개는 소비 0 이라 물리 테이블 존재 여부가 **코드 처분(entity · lifecycle DDL 제거)** 을 바꾸지 않는다. 존재 여부는 물리 테이블 DROP 여부에만 영향하며, 그건 §5 의 별도 단계다. `cms_cpt_types` 는 로그로 부재가 실증됐다.

### 3-1. 조사 중 함께 드러난 인접 테이블 (12 밖 · 판정 참고)

CPT 사슬(#5)이 함께 쓰는 api-server 자체 entity. **migration 0 · lifecycle 0** 으로 생성 주체가 없다.

| # | 테이블 | entity | 소비 | 비고 |
|:-:|---|---|---|---|
| 15 | `custom_field_groups` · `custom_fields` · `custom_field_values` | `apps/api-server/src/entities/CustomField.ts` (3 클래스) | `services/cpt/modules/acf.module.ts` · `controllers/cpt/FieldGroupsController.ts` | #1~3 과 **같은 개념의 이중 구현**. #5 결정에 종속 |
| 16 | `custom_posts` | `apps/api-server/src/entities/CustomPost.ts` | `cpt.service` | #5 결정에 종속 |

---

## 4. `cms_cpt_types` — 결정이 필요한 유일한 항목

### 4-1. 사실

- 테이블은 **존재한 적이 없다** (생성 주체 = 미호출 lifecycle, 로그 116건).
- 그런데 **admin 이 로드될 때마다** `useAdminMenu → useDynamicCPTMenu → GET /public/cpt/types` 가 호출된다. 서버는 `cpt.service.ts:62-65` 에서 `does not exist` 를 `warn` + `[]` 로 바꿔 **200** 을 낸다 → 사이드바에 동적 CPT 메뉴 0개. 사용자는 아무 이상을 못 본다.
- `/cpt-engine/*` 화면 15파일 + `features/cpt-acf` 26파일이 살아 있지만 **메뉴 진입점은 없다** (선행 admin IA WO 가 `Post Types/Fields/Views/Pages` 메뉴를 backend 404 사유로 제거하며 "entity·테이블 삭제는 별도 판정" 으로 남겼다 — 본 IR 이 그 판정 자리다).
- 선례: `WO-O4O-LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-RETIREMENT-V1` · `WO-O4O-WORDPRESS-COMPAT-…` 가 WordPress 계열 개념을 순차 은퇴시켜 왔다. CPT/ACF 는 같은 계열이다.

### 4-2. 선택지

| 안 | 내용 | 결과 |
|---|---|---|
| **A. REMOVE** | CPT/ACF 사슬 전체 은퇴 — `routes/cpt.ts` · `modules/cpt-acf` · `services/cpt` · `public.routes` 의 cpt · api entity 4종(#5 api, #15, #16) · admin `cpt-engine`/`features/cpt-acf`/`useDynamicCPTMenu` · cms-core `CmsCptType/CmsCptField` + lifecycle DDL | 로그 116건/월 소멸 · 삼킴 제거 · admin 로드마다 나가는 무의미한 호출 1건 제거. **동작한 적 없는 기능**이므로 사용자 손실 0 |
| B. MIGRATE | `cms_cpt_types` + #15 #16 을 정식 migration 으로 생성해 CPT 엔진을 살린다 | 새 기능을 사실상 신규 도입하는 것과 같다. "entity 가 있다는 이유만으로 테이블을 만들지 않는다" 원칙과 충돌 |
| C. 유지 | 현 상태 | 삼킴·오류 로그·중복 선언 잔존 |

**권고: A.** 단, 이건 "CPT 엔진을 O4O 에서 쓸 것인가" 라는 사업 판단이므로 본 IR 은 결정하지 않는다.

---

## 5. 후속 단계 제안 (구현하지 않음)

| 순서 | 내용 | 성격 |
|:-:|---|---|
| 1 | §4 결정 (A 권고) | **사용자 판단** |
| 2 | REMOVE 13개(+A 시 #5·#15·#16) 의 **코드 처분** — cms-core entity 12 · api entity 2(+CPT 4) · `database/entities.ts` 등록 · lifecycle `install/uninstall/manifest` 의 해당 DDL. 끝나면 `install.ts` 는 만들 테이블이 0 이 되므로 **lifecycle 스키마 소유권 자체를 제거** (`lifecycle/` 디렉터리 · `manifest.tables`) — 선행 IR §3 의 "두 번째 스키마 소유자" 해소 | 구현 WO |
| 3 | **물리 테이블 정리** — 운영 DB 자격정보 확보 후 `information_schema` 로 14개 존재 확인. 존재하는 것만 row 수·FK 확인 후 DROP migration (존재하지 않으면 할 일 없음) | 구현 WO · DB 승인 |
| 4 | 조회 경로 삼킴 정비 — `cpt.service:62-65` 는 2번에서 사슬째 사라진다. 나머지(`hub-content` 8 · `content-query` 1 · `survey` 1 · `lms` 1) 는 §6-2 기준으로 분류 후 별도 | 별도 판단 |

---

## 6. 부수 잔재 2건 (선행 CHECK §11 이관)

### 6-1. `@o4o/shared-space-ui` ContentHubTemplate 의 copy props — DEAD_UI_CONTRACT 후보

`loadCopiedIds` · `onCopy` · `copyLabel/copiedLabel/copyingLabel/recopyLabel` · `afterCopyAction` · `ContentHubItemContext.{copiedIds,copyingId,justCopiedId,onCopy,…}` 와 `ContentHubCardGrid` 의 복사 버튼 분기.
소비자: `web-neture ContentLibraryPage` 가 유일했고 선행 WO 에서 제거 → **현재 소비자 0** (`web-k-cosmetics HubContentPage` · `web-kpa-society HubContentLibraryPage` 는 원래 미사용).
테이블 조사와 무관한 **전역 dead-code 정비 후보**로 넘긴다. 이번 WO 재개 불필요.

### 6-2. signal 핸들러의 `product_approvals` catch — 분류

```ts
// dashboard-assets.query-handlers.ts:45-47, :84-86
} catch {
  // Table may not exist — silent fallback
}
```

- 범위: **bare catch** — `relation does not exist` 를 포함한 **모든** 오류를 삼키고 `hasApproved* = false` 로 응답한다. "조회 결과 없음" 만 처리하는 코드가 아니다.
- 다만 `product_approvals` 는 운영에 **존재**하며(응답이 실제 `false` 를 반환, 로그에 해당 relation 오류 0) 결과가 boolean 신호라 데이터 왜곡 폭이 작다.
- **분류: 스키마 오류 은폐형(정비 대상)** — 단 우선순위 낮음. `does not exist` 만 걸러 500 을 내거나, 최소한 `warn` 로그를 남기도록 정비하는 것이 맞다. 이번 IR 범위 밖.

---

## 7. 미확인

| # | 항목 | 사유 · 영향 |
|:-:|---|---|
| 1 | 14개 테이블의 **물리적 운영 존재** | DB 자격정보 미확보. 코드 처분 결론은 바뀌지 않으며 §5-3(DROP) 에만 필요 |
| 2 | `/cpt-engine/*` 화면의 브라우저 동작 | URL 직접 진입 시 무엇이 보이는지 미실측 (API 는 빈 배열 200 이므로 "CPT 없음" 화면으로 추정) |

---

## 8. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§5-2 코드 처분 · §5-3 물리 테이블)
```

기준 문서에서 CPT/ACF · cms-core lifecycle 을 현행 기능으로 서술하는 곳은 없다. `admin-menu.static.tsx` 의 주석(“entity·테이블은 보존, 삭제는 별도 판정”)이 본 IR 로 연결된다.
