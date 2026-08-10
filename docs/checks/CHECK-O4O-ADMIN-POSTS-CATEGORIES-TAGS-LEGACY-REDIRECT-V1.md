# CHECK-O4O-ADMIN-POSTS-CATEGORIES-TAGS-LEGACY-REDIRECT-V1

- **WO**: `WO-O4O-ADMIN-POSTS-CATEGORIES-TAGS-LEGACY-REDIRECT-V1`
- **작성일**: 2026-08-10
- **판정**: **PASS** — 6개 legacy route 전부 `/admin/cms/contents` 로 redirect, legacy API 호출 0건

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 시점 HEAD | `c5e8bbf9845a1b10e8174fdb349508827fd93b35` |
| 브랜치 | `main` (작업 시작 시 worktree clean) |
| 수정 commit | `27fc9a98b59343febaf523df0dfd260d2a3cc894` |

선행 판정: [`IR-O4O-ADMIN-CONTENT-CATEGORIES-LEGACY-ROUTE-AUDIT-V1`](../investigations/IR-O4O-ADMIN-CONTENT-CATEGORIES-LEGACY-ROUTE-AUDIT-V1.md) — **REMOVE**

---

## 2. redirect 대상 route

`apps/admin-dashboard/src/routes/content.routes.tsx` **1개 파일만** 수정했다.

| # | route | 수정 전 | 수정 후 |
|---|---|---|---|
| 1 | `/posts` | `AdminProtectedRoute['content:read']` + `Posts` | `Navigate` |
| 2 | `/posts/categories` | `['categories:read']` + `Categories` | `Navigate` |
| 3 | `/categories` | `['categories:read']` + `Categories` | `Navigate` |
| 4 | `/categories/new` | `['categories:write']` + `CategoryEdit` | `Navigate` |
| 5 | `/categories/edit/:id` | `['categories:write']` + `CategoryEdit` | `Navigate` |
| 6 | `/posts/tags` | `['categories:read']` + `Tags` | `Navigate` |

`Posts` · `Categories` · `CategoryEdit` · `Tags` 4개 `lazy()` 선언은 참조가 사라져 함께 제거했다
(파일 자체는 삭제하지 않았다 — §4). 전수 확인 결과 이 6개 path 를 등록하는 곳은 이 파일이 유일하다.

---

## 3. redirect 목적지

```tsx
const LEGACY_CONTENT_REDIRECT = '/admin/cms/contents';
<Navigate to={LEGACY_CONTENT_REDIRECT} replace />
```

- `/admin/cms/contents` 는 최신 main 에 실재하는 route 다 (`content.routes.tsx:278` · `CMSContentList`).
- `replace` 를 써서 뒤로가기 시 legacy URL 로 되돌아가지 않게 했다.
- **guard 를 붙이지 않았다.** 이동 대상이 자체 `AdminProtectedRoute requiredRoles={['admin']}` 를
  갖고 있고, dead 화면 접근을 권한 오류로 막는 것보다 현재 화면으로 보내는 편이 WO 목적에 맞다.
  결과적으로 `categories:read` / `categories:write` 권한 의존이 사라졌다.

> 주의(WO §2.2 그대로): `/admin/cms/contents` 는 **카테고리 기능의 등가물이 아니다.**
> legacy 화면 접근을 살아 있는 CMS 화면으로 보내는 것뿐이다.

---

## 4. 삭제하지 않은 파일과 이유

WO §5.3 에 따라 **route redirect 만** 했다. 다음은 전부 유지했다.

| 대상 | 이유 |
|---|---|
| `pages/posts/Categories.tsx` · `CategoryEdit.tsx` · `Tags.tsx` · `Posts.tsx` | 후속 cleanup WO 범위 |
| `Category` 엔티티 / `categories` 테이블 | backend 미변경. 처분은 별도 IR |
| `api/categoriesApi.ts` · `components/content/CategoryTagSelector.tsx` | dead code 이나 삭제는 후속 |
| `api/unified-client.ts` 의 `content.categories` | 공용 client — 개별 영향 확인 필요 |
| `components/editor/EditorSidebar.tsx` · `components/posts/QuickEditRow.tsx` | **살아 있는 편집 화면**에 붙어 있어 WO §6 에서 수정 금지 |
| `hooks/useCategories.ts` · `services/api/postApi.ts` · `features/cpt-acf/services/acf.api.ts` | 후속 cleanup WO 범위 |

---

## 5. 실브라우저 route smoke (프로덕션)

환경: `https://admin.neture.co.kr` · 계정 `sohae2100@gmail.com` · 빌드 스탬프 `2026. 8. 10. 오후 3:43:59`

| # | 진입 URL | 최종 URL | 결과 |
|---|---|---|---|
| 0 | `/login` | `/home` | **PASS** — 로그인 정상 |
| 1 | `/posts` | `/admin/cms/contents` | **PASS** — CMS Contents 126건 렌더 |
| 2 | `/posts/categories` | `/admin/cms/contents` | **PASS** |
| 3 | `/categories` | `/admin/cms/contents` | **PASS** |
| 4 | `/categories/new` | `/admin/cms/contents` | **PASS** |
| 5 | `/categories/edit/test-id` | `/admin/cms/contents` | **PASS** |
| 6 | `/posts/tags` | `/admin/cms/contents` | **PASS** |

| 확인 | 결과 |
|---|---|
| WordPress UI("Screen Options"·"Bulk Actions"·breadcrumb `Admin > 글 > 카테고리`) 렌더 | **0건** |
| 404 화면 / 빈 화면 | **없음** |
| 콘솔 에러 | **0건** |

---

## 6. legacy API 호출 0 확인

세션 전체 resource 30건에 대해 정규식
`content/categories | /v1/categories | posts/categories | /api/categories | /api/api` 로 검사한 결과
**매칭 0건**이다.

관측된 API 호출은 다음과 같다(전부 정상 접두).

```text
https://api.neture.co.kr/api/v1/cms/contents
https://api.neture.co.kr/api/v1/navigation/admin
https://api.neture.co.kr/api/v1/apps/availability
https://api.neture.co.kr/api/v1/public/cpt/types
https://api.neture.co.kr/api/v1/userRole/{userId}/permissions
https://api.neture.co.kr/api/v1/auth/status
```

즉 **404 를 유발하던 `GET /api/v1/content/categories` 호출 자체가 사라졌다.**

---

## 7. 회귀 확인

| 대상 | 결과 |
|---|---|
| `/admin/cms/contents` (redirect 목적지) | **PASS** — 126 contents · 필터 4종 정상 |
| `/forum/categories` | **PASS** — "포럼 카테고리" 정상. redirect 에 걸리지 않음 (혼동 없음) |
| `/content-resource/media-assets` | **PASS** — 총 35건 정상 (직전 WO 수정 화면) |
| 좌측 메뉴 | **PASS** — Content·CMS 등 14항목 정상. 원래 categories 항목이 없었으므로 변화 없음 |
| 로그인 | **PASS** |

---

## 8. typecheck · build · 배포

| 항목 | 결과 |
|---|---|
| admin-dashboard typecheck (`tsc --noEmit`) | **PASS** — 오류 0 |
| `VITE_API_URL=… pnpm run build:prod` | **PASS** — `✓ built in 1m 38s` |
| workflow | `deploy-admin.yml` · run id `31362855723` |
| headSha | `27fc9a98b59343febaf523df0dfd260d2a3cc894` |
| 결과 | **success** |
| API 배포 | **없음** (백엔드 변경 0) |

---

## 9. 금지사항 준수

| 금지 항목 | 준수 |
|---|:--:|
| 백엔드 route 복구 | ✅ 0 |
| legacy controller 복구 | ✅ 0 |
| Post/Page/Category 모델 복구 | ✅ 0 |
| DB write · migration | ✅ 0 (SQL 미실행) |
| 메뉴 IA 대규모 변경 | ✅ 0 (메뉴 파일 미수정) |
| 공통 router 구조 대규모 변경 | ✅ 0 (`content.routes.tsx` 1파일, `Navigate` import 추가만) |
| dead component 삭제 | ✅ 0 |
| `EditorSidebar` / `QuickEditRow` 수정 | ✅ 0 |
| `UserForm` 수정 | ✅ 0 |
| `pharmacy/qr/source/products` 수정 | ✅ 0 |
| 무관한 dirty 파일 · lockfile 스테이징 | ✅ path-specific commit |

---

## 10. commit SHA

| commit | 내용 |
|---|---|
| `27fc9a98b59343febaf523df0dfd260d2a3cc894` | fix(admin): WordPress 계열 legacy 화면을 CMS 콘텐츠 화면으로 redirect |
| (본 문서) | docs(check): 결과 기록 |

---

## 11. push

- `c5e8bbf98..27fc9a98b  main -> main` **완료**
- 본 CHECK 문서 commit 후 동일 브랜치에 push

---

## 12. 관찰 (이번 범위 밖 · 수정하지 않음)

redirect 대상 6개에 **포함되지 않은** legacy 링크가 화면에 남아 있다. 어느 것도 route 가 없어
`/home` 계열로 떨어지며, WO §5.1 목록 밖이라 손대지 않았다.

| 링크 | 위치 |
|---|---|
| `/posts/new` | `components/layout/AdminBar.tsx:47` · `pages/AdminDashboard.tsx:54` |
| `/posts/1` · `/posts/2` | `pages/AdminDashboard.tsx:165,171,183` |
| `/posts?post_status=draft` | `components/dashboard/QuickDraftWidget.tsx:152` |
| `/categories/tags/new` · `/categories/new` | `pages/categories/TagList.tsx:172` · `CategoryList.tsx:185` |

`AdminDashboard.tsx` 는 "15 게시글 / 456 사용자" 등 **하드코딩 mock 수치**를 표시한다.
별개 성격의 부채로 보이며 후속 판단 대상이다.

---

## 13. 후속 (이번 작업에서 구현하지 않음)

WO §11 그대로 유지한다.

1. `WO-O4O-ADMIN-DEAD-CONTENT-CATEGORY-CALLSITE-CLEANUP-V1`
2. `WO-O4O-ADMIN-API-CLIENT-PREFIX-CONVENTION-AUDIT-V1`
3. `IR-O4O-ORPHAN-ENTITY-CATEGORIES-TABLE-DISPOSITION-V1`
4. `IR-O4O-ADMIN-QR-SOURCE-PRODUCTS-LEGACY-ROUTE-AUDIT-V1`

추가 후보(§12 관찰): legacy `/posts/*` 링크 정리 및 `AdminDashboard` mock 수치 처분.
