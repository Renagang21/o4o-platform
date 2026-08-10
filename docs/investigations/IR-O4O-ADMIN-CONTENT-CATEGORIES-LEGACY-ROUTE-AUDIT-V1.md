# IR-O4O-ADMIN-CONTENT-CATEGORIES-LEGACY-ROUTE-AUDIT-V1

- **성격**: read-only 감사 (코드 0 변경 · DB 0 변경 · 배포 없음)
- **작성일**: 2026-08-10
- **판정**: **REMOVE** — `/api/v1/content/categories` 는 2025-12-11 Phase 8-3 legacy 제거에서
  **의도적으로 삭제된 route** 이며, Categories 화면은 WordPress 계열 orphan admin UI 다.
  **404 route 를 복구하면 안 된다.**

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| HEAD | `f465e63b0cec460e255c272b5193bfc83376388e` |
| 브랜치 | `main` (worktree clean) |
| 실측 환경 | `https://admin.neture.co.kr` · 계정 `sohae2100@gmail.com` |

---

## 2. 프론트 호출 위치

`content/categories` 계열을 호출하는 곳은 **7개 파일**이다.

| # | 파일 | 호출 | client | 최종 URL |
|---|---|---|---|---|
| 1 | `pages/posts/Categories.tsx:74` | `/content/categories` | `authClient.api` | `…/api/v1/content/categories` |
| 2 | `components/editor/EditorSidebar.tsx:135` | `/content/categories` | `authClient.api` | 동일 |
| 3 | `components/posts/QuickEditRow.tsx:33` | `/content/categories` | `authClient.api` | 동일 |
| 4 | `api/unified-client.ts:223-227` | `/content/categories` (CRUD 5개) | `unifiedApi` | 동일 |
| 5 | `hooks/useCategories.ts:27` | `/categories` | `authClient.api` | `…/api/v1/categories` |
| 6 | `services/api/postApi.ts:536,556` | `/categories` | `apiV1Client` | `…/api/v1/categories` |
| 7 | `features/cpt-acf/services/acf.api.ts:236` | `/posts/categories` | `authClient.api` | `…/api/v1/posts/categories` |
| (별건) | `api/categoriesApi.ts:9-33` | `/api/categories` | `apiClient` | **`/api` 중복** (아래 §4-2) |

`pages/posts/CategoryEdit.tsx` 의 저장 경로는 `ContentApi.createCategory/updateCategory`
→ `api/contentApi.ts` → `unifiedApi.content.categories` 로 이어지므로 **쓰기 경로도 같은 dead endpoint** 다.

---

## 3. route / menu 도달성

| 항목 | 결과 |
|---|---|
| route 등록 | **있음** — `routes/content.routes.tsx` 에 `/posts/categories`, `/categories`, `/categories/new`, `/categories/edit/:id` (+ `/posts/tags`) |
| guard | `AdminProtectedRoute requiredPermissions={['categories:read']}` (쓰기는 `categories:write`) |
| 좌측 메뉴 | **없음** — `admin/menu/admin-menu.static.tsx` 에 `/categories`·`/posts/categories` 항목 0건. Content 그룹은 Overview/Assets/Collections/Policies/Analytics 5개뿐이고, `categor` 검색 결과는 `/forum/categories`(별개 기능) 하나뿐이다 |
| 백엔드 navigation | `/api/v1/navigation/admin` 에 categories 항목 0건 |
| 실제 접근 | **직접 URL 로만 가능** (menu-less). 브라우저에서 `/categories` 진입 시 화면 자체는 렌더된다 |
| 화면 성격 | "Screen Options" · "Bulk Actions" · "Add New" · breadcrumb `Admin > 글 > 카테고리` — **WordPress 관리자 UI 그대로** |

---

## 4. 최종 요청 URL 분석

### 4-1. Categories 화면 — **접두는 정상이다**

`authClient` 는 `getApiUrl()` 에서 `VITE_API_URL` 을 정규화한다
(`packages/auth-client/src/cookie-client.ts:378-402`).

```text
envUrl.endsWith('/api/v1') → 그대로
envUrl.endsWith('/api')    → `${envUrl}/v1`
그 외                       → `${envUrl}/api/v1`
```

배포값 `https://api.neture.co.kr/api` → `https://api.neture.co.kr/api/v1`.

**프로덕션 실측**:

```text
GET https://api.neture.co.kr/api/v1/content/categories → 404
세션 전체 요청 중 `/api/api` 0건
화면: "카테고리 목록을 불러오지 못했습니다. / Request failed with status code 404" 배너 + 0 items
```

즉 **LMS 와 달리 접두 버그가 아니다.** 경로는 정확하고 **백엔드에 route 가 없다.**
`unified-client.ts` 도 baseURL 을 `/api` 로 정규화한 뒤 `/v1` 을 붙이므로 역시 정상 접두다.

### 4-2. `categoriesApi.ts` — 별개의 접두 불일치 (dead code)

`apiClient` 의 배포 `baseURL` 은 이미 `/api` 로 끝나는데 `categoriesApi.ts` 는 `/api/categories` 를 쓴다
→ `/api` 가 중복된다. **다만 이 파일의 유일한 소비처인 `components/content/CategoryTagSelector.tsx`
자체를 import 하는 곳이 0건**이라 실제로 호출되지 않는다. 즉 dead code 위의 결함이다.

> 직전 CHECK(`CHECK-…-LMS-INSTRUCTOR-…-V1` §13)에서 "categoriesApi 가 404 의 원인" 으로 적었던 추정은
> 이번 조사로 정정한다. 프로덕션 404 를 낸 것은 **`Categories.tsx` 의 `authClient` 경로** 이고,
> 그 경로의 접두는 정상이다.

---

## 5. 백엔드 route 존재 여부

`apps/api-server/src/bootstrap/register-routes.ts` 에서 `/api/v1/content/**` 로 mount 된 것은 **2개뿐**이다.

```text
app.use('/api/v1/content/assets', contentAssetsRoutes)      // :954
app.use('/api/v1/content/templates', createContentTemplateRoutes(...))  // :963
```

| 후보 경로 | 존재 |
|---|:---:|
| `/api/v1/content/categories` | ❌ |
| `/api/content/categories` | ❌ |
| `/api/categories` | ❌ |
| `/api/v1/categories` | ❌ |
| `/api/v1/posts/categories` | ❌ (`/api/v1/posts` mount 자체가 없음) |
| `/api/v1/cpt/taxonomies` | ✅ (CPT taxonomy — 카테고리 term 관리와 동일 기능 아님) |
| `/api/v1/forum/categories` | ✅ (Forum 전용 · 별개 도메인) |

### 삭제 이력 — 의도적 제거임이 확인된다

```text
commit 6354e8755  2025-12-11
refactor(api-server): Phase 8-3 Legacy Entity Removal & Service Cleanup
  Deleted Legacy Entities:
    - Posts/Pages: Post, PostMeta, Page, PostAutosave, PageRevision
  Deleted Legacy Controllers:
    - All legacy v1 controllers (channels, content, platform, tracking, userRole)
```

삭제된 `apps/api-server/src/routes/v1/content.routes.ts` 는 직전 커밋 시점에 다음을 갖고 있었다.

```text
137: router.get('/categories', …)
138: router.get('/categories/:id', …)
139: router.post('/categories', …)
140: router.put('/categories/:id', …)
141: router.delete('/categories/:id', …)
```

즉 **route 가 사고로 유실된 것이 아니라, AppStore + CMS-Core 전환 과정에서 Post/Page 엔티티와 함께
계획적으로 제거**되었고 프론트 화면만 남았다.

---

## 6. 관련 데이터 모델 존재 여부

| 항목 | 상태 |
|---|---|
| `Category` 엔티티 (`@Entity('categories')`) | DataSource 에 **등록되어 있음** (`database/entities.ts:34,558`) |
| `Category` 엔티티 소비처 | **0건** — `getRepository(Category)` · `Repository<Category>` 사용처 없음. import 하는 곳은 `entities.ts` 뿐 |
| `Taxonomy` 엔티티 | `controllers/cpt/TaxonomiesController` 에서 사용 (`/api/v1/cpt/taxonomies`) — 살아 있으나 **글 카테고리와 다른 개념** |
| `Post` / `Page` 엔티티 | 위 Phase 8-3 에서 삭제됨 |
| CMS Contents (`/api/v1/cms/contents`) | 살아 있음. 다만 **category/taxonomy 필드·필터 없음** — 카테고리 기능의 대체가 아니다 |

정리하면 **분류 대상(Post)이 이미 없고, 분류 자체를 읽는 서버 코드도 없다.**
`categories` 테이블만 orphan 으로 남아 있다.

---

## 7. 관련 문서 / 과거 IR

**선행 판정이 이미 존재한다** — `docs/investigations/IR-O4O-ADMIN-INCOMPLETE-SCREEN-DISPOSITION-V1.md`

```text
| 8 | /posts | Posts | 글 목록 (WP 계열) | legacy endpoint | menu-less
  | /api/v1/posts?per_page=1000 → 404 | 대체: /admin/cms/contents | 판정 REDIRECT | P2 |

후보 WO: ADMIN-POSTS-LEGACY-REDIRECT
대상: /posts (+ /posts/categories, /posts/tags 동반 검토)
예상 변경 범위: content.routes.tsx redirect 1~3건
선행 조건: /admin/cms/contents 가 동등 기능인지 확인, 외부 bookmark 영향 검토
```

같은 문서 §9 에 **정책 판단**도 기록되어 있다.

```text
REVIEW_REMOVE 0건 — 외부 bookmark 사용을 코드로 배제할 수 없어
어떤 route 도 제거 대상으로 확정하지 않았다. /posts 도 제거가 아니라 REDIRECT 로 두었다.
```

본 IR 은 그 선행 판정과 **정합한다**. `/posts/categories` 는 이미 "동반 검토" 대상으로 지목돼 있었고,
이번 조사로 legacy 근거(삭제 커밋 · orphan 엔티티 · menu-less)가 확정됐다.

---

## 8. 판정

### **REMOVE** (legacy / dead UI)

| 근거 | 내용 |
|---|---|
| 1 | 백엔드 route 가 **의도적으로 삭제**됨 (`6354e8755`, Phase 8-3) |
| 2 | 분류 대상인 `Post`/`Page` 엔티티도 같은 커밋에서 삭제됨 |
| 3 | `Category` 엔티티는 **소비처 0건** orphan |
| 4 | 좌측 메뉴·백엔드 navigation 어디에도 노출되지 않음 (menu-less) |
| 5 | 화면 UI 가 WordPress 관리자 그대로이며 현재 O4O IA(Content/CMS 그룹)와 무관 |
| 6 | 읽기뿐 아니라 **쓰기 경로(CategoryEdit)도 같은 dead endpoint** — 복구 없이는 어떤 조작도 불가 |
| 7 | 선행 IR 이 형제 화면 `/posts` 를 이미 legacy 로 판정 |

**PRODUCE(route 복구)를 배제하는 이유**: 복구하려면 삭제된 `content.controller` · `Post`/`Page` 엔티티
계열을 되살려야 한다. 이는 Phase 8-3 의 아키텍처 결정을 되돌리는 일이며 현재 운영 IA 에 해당 업무가 없다.

**실행 형태는 hard delete 가 아니라 redirect / hide 를 권고한다.** 선행 IR §9 의 정책
("외부 bookmark 를 코드로 배제할 수 없다")을 그대로 따른다. 즉 REMOVE 판정의 구체적 이행은
`/categories`·`/posts/categories`·`/posts/tags` 를 `/admin/cms/contents` 로 redirect 하거나
route 를 비노출 처리하는 방식이며, **파일 즉시 삭제는 권고하지 않는다.**

> 남는 유의점: `/admin/cms/contents` 는 카테고리 필드가 없어 **기능적 등가물이 아니다.**
> 카테고리 분류 업무 자체가 현재 운영에 필요한지는 제품 판단이 필요하며, 필요하다고 판정되면
> WP 계열 화면 복구가 아니라 CMS-Core 위의 신규 설계로 가야 한다.

---

## 9. 후속 WO 후보 (이번 IR 에서 구현하지 않음)

1. **`WO-O4O-ADMIN-POSTS-CATEGORIES-TAGS-LEGACY-REDIRECT-V1`**
   — 선행 IR 의 `ADMIN-POSTS-LEGACY-REDIRECT` 와 **통합 권고**. 대상: `/posts`, `/posts/categories`,
   `/categories`, `/categories/new`, `/categories/edit/:id`, `/posts/tags`.
   범위: `content.routes.tsx` redirect. 선행 조건: 외부 bookmark 영향 검토.
2. **`WO-O4O-ADMIN-DEAD-CONTENT-CATEGORY-CALLSITE-CLEANUP-V1`**
   — dead endpoint 를 호출하는 잔여 코드 정리: `EditorSidebar.tsx`, `QuickEditRow.tsx`,
   `useCategories.ts`, `postApi.ts`, `acf.api.ts`, `unified-client.ts content.categories`,
   `categoriesApi.ts` + 소비처 0인 `CategoryTagSelector.tsx`.
   **주의**: EditorSidebar·QuickEditRow 는 살아 있는 편집 화면에 붙어 있으므로 개별 영향 확인 필요.
3. **`WO-O4O-ADMIN-API-CLIENT-PREFIX-CONVENTION-AUDIT-V1`**
   — `apiClient`(`/api` 로 끝나는 baseURL) 소비 3파일이 서로 다른 접두 관례를 쓴다:
   `categoriesApi.ts`(`/api/...`) · `lmsInstructor.ts`(직전 WO 에서 교정) · `registerWidgets.ts`(`/v1` 없음).
   `authClient`·`unified-client` 는 각자 정규화 로직을 별도로 갖고 있다. 관례 통일 여부 판단.
4. **`IR-O4O-ORPHAN-ENTITY-CATEGORIES-TABLE-DISPOSITION-V1`** (낮은 우선순위)
   — 소비처 0인 `Category` 엔티티 / `categories` 테이블 처분 판단. 테이블 DROP 은 별도 승인 필요.

---

## 10. read-only 준수 확인

| 금지 항목 | 준수 |
|---|:--:|
| 코드 수정 | ✅ 0건 (`git status --short` 비어 있음, 본 문서 외 변경 없음) |
| route 추가 | ✅ 0 |
| 프론트 호출 경로 수정 | ✅ 0 |
| DB write | ✅ 0 (SQL 실행 자체를 하지 않음) |
| migration | ✅ 0 |
| 배포 | ✅ 0 |
| 메뉴 제거 | ✅ 0 |
| 권한 / role / 인증 정책 변경 | ✅ 0 |
| content model 변경 | ✅ 0 |

브라우저 확인은 **GET 조회와 화면 렌더 관찰만** 수행했다. "Add New" · "Bulk Actions" · "Apply" 등
쓰기 조작은 누르지 않았다.

---

## 11. 한계

- **`categories` 테이블의 실제 row 수는 확인하지 않았다.** 소비처 0건이 코드로 확정되어 판정에
  필요하지 않았고, 불필요한 프로덕션 조회를 피했다. §9-4 IR 에서 필요하면 확인한다.
- **외부 bookmark 사용 여부는 코드로 배제할 수 없다.** 이것이 REMOVE 의 이행 형태를
  hard delete 가 아니라 redirect/hide 로 권고하는 이유다.
- `/posts/tags` · `Tags.tsx` 는 본 IR 범위 밖이라 호출 경로를 전수 확인하지 않았다.
  다만 route 구조상 동일 계열로 보인다.
- `/admin/cms/contents` 를 브라우저로 재확인하지는 않았다. 카테고리 필드 부재는 코드
  (`cms-content-query.handler.ts` · `cms-content-utils.ts` 에 categor/tag 참조 0건) 기준 판단이다.

---

*조사 전용 · 코드 0 변경 · 운영 데이터 0 변경 · 배포 없음*
