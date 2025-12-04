# 📄 **Phase D-2 — CMS Dynamic Data Integration Work Order**

### *O4O Frontend NextGen — CMS Blocks 실데이터 렌더링 구현*

---

# 📌 **1. 작업 목표 (Mission)**

현재 Block Renderer 시스템(Phase D-1)이 100% 구현되었으며 모든 CMS Blocks(9종)은 placeholder UI로만 렌더링됩니다.
**본 단계에서는 CMS Blocks를 실제 CMS V2 API 데이터와 연결하여 실데이터 기반으로 렌더링되도록 구현하는 것이 목표입니다.**

완료 후 달성되는 것:

* Designer에서 만든 페이지가 실제 CMS DB 데이터를 표시
* CPTList / CPTItem / RecentPosts / CategoryList 등 동적 블록 정상 작동
* Search / Pagination / Breadcrumb / RelatedPosts 기능 작동
* Preview 모드에서도 실데이터 표시
* ViewRenderer → CMS Loader → CMS API 전체 체인 완성

---

# 📌 **2. 구현 범위 (Scope)**

CMS Blocks 총 **9개** 실데이터 연동:

| Block        | 역할           |
| ------------ | ------------ |
| CPTList      | 특정 CPT 목록 표시 |
| CPTItem      | 단일 포스트 내용 표시 |
| CategoryList | 카테고리 목록 표시   |
| TagCloud     | 태그 클라우드 표시   |
| RecentPosts  | 최근 글 표시      |
| RelatedPosts | 연관 글 표시      |
| Breadcrumb   | 경로 표시        |
| Pagination   | 페이지네이션       |
| SearchBar    | 검색 기능        |

**주의:**
Block Renderer UI 자체는 Phase D-1에서 완성됨 → 본 단계에서는 **데이터 가져오기(layer) + props 매핑 + 렌더 로직 구현**만 수행.

---

# 📌 **3. 디렉토리 구조 (참조)**

```
apps/main-site/src/
  lib/cms/
    client.ts       ← CMS API 클라이언트 (이미 구현됨)
    loader.ts       ← ViewLoader + PageResolver
    adapter.ts      ← CMS → ViewRenderer 변환기
  components/
    blocks/cms/
      CPTListBlock.tsx
      CPTItemBlock.tsx
      CategoryListBlock.tsx
      ...
```

---

# 📌 **4. 구현 단계 (Plan)**

---

## ✅ **Phase D-2.1 — CMS Client 확장 (API 파라미터 대응)**

📁 수정: `apps/main-site/src/lib/cms/client.ts`

### 해야 하는 작업:

### 1) 아래 메서드들에 props 기반 필터 지원 추가

#### (1) getPosts()

지원 파라미터:

```ts
{
  postType: string;
  limit?: number;
  orderBy?: "date" | "title" | "random";
  order?: "asc" | "desc";
  category?: string;
  tag?: string;
  page?: number;
}
```

#### (2) getPostById()

#### (3) getCategories()

#### (4) getTags()

#### (5) searchPosts()

### 2) Preview 모드(`?preview=1`) 시 draft/scheduled 포스트까지 허용

---

## ✅ **Phase D-2.2 — Loader 확장 (페이지 단위 데이터 로딩)**

📁 수정: `apps/main-site/src/view/loader.ts`

### 추가 기능:

1. `resolveDynamicBindings()`

   * Block 내부 where 조건 / 필터 조건을 resolve한다
   * 예: `"{{page.slug}}" → 실제 값`

2. `fetchCMSDataForBlock(block, context)`

   * CMS Block 렌더링 직전 데이터를 fetch
   * ViewRenderer가 block.props.data에 주입하도록 설계

---

## ✅ **Phase D-2.3 — Block Renderer 실제 구현**

각 CMS Block Renderer에서 아래 로직을 구현:

---

### **(1) CPTListBlock**

📁 `components/blocks/cms/CPTListBlock.tsx`

구현:

```
const posts = await cmsClient.getPosts({
  postType: props.postType,
  limit: props.limit,
  orderBy: props.orderBy,
  order: props.order,
});
```

렌더링 UI:

```
Image? title / excerpt / date
Grid 1-4 columns
```

---

### **(2) CPTItemBlock**

구현:

* props.postId 존재 → 해당 포스트 로딩
* props.useCurrent → 현재 페이지 slug 기반 post 로딩

CMS 요청:

```
cmsClient.getPostById(id)
```

UI:

```
H1 title
image
content (props.richText ? dangerouslySetInnerHTML)
metadata
```

---

### **(3) CategoryListBlock**

CMS 요청:

```
cmsClient.getCategories({ postType })
```

UI:

* list / grid / pills
* count 표시 옵션

---

### **(4) TagCloudBlock**

CMS 요청:

```
cmsClient.getTags()
```

가중치 기반 font-size 매핑:

```
8–24px 사이에서 usageCount 비율로 계산
```

---

### **(5) RecentPostsBlock**

CMS 요청:

```
cmsClient.getPosts({ postType, orderBy: "date", limit })
```

---

### **(6) RelatedPostsBlock**

필터:

* category
* tag
* author

---

### **(7) BreadcrumbBlock**

context.currentSlug 기반:

```
Home > CPT > Post Title
```

📝 필요 시 cmsClient.getPostBySlug() 추가

---

### **(8) PaginationBlock**

렌더링:

* 이전/다음 페이지 링크
* 페이지 번호 목록

---

### **(9) SearchBarBlock**

기능:

* props.redirectTo (검색 결과 페이지)
* 입력값 → URL queryString (?q=keyword)

---

## 📌 **Phase D-2.4 — ViewRenderer 연동 (최종 조립)**

📁 수정: `components/ViewRenderer.tsx`

추가:

1. `if (block.type is CMSBlock) → await fetchCMSDataForBlock()`
2. data 없으면 loading 또는 빈 array 처리
3. 에러 발생 시 fallback UI 표시
4. Preview 모드 처리 우선순위 적용

---

# 📌 **5. 테스트 계획 (QA Plan)**

## Test Set A — 기본 CMS Blocks

* CPTList(스킨 4개) 정상 렌더링
* CPTItem 단일 포스트 표시
* CategoryList 필터링 정상
* TagCloud 크기 편차 동작

## Test Set B — 검색 & 페이지네이션

* SearchBar 입력 → 리디렉션
* Pagination 링크 이동 확인

## Test Set C — Preview

* draft 페이지 preview=1 정상 표시
* published 페이지 preview=1/without preview 비교

## Test Set D — Designer → Save → Public

1. Designer에서 페이지 구성
2. Save
3. Preview
4. Publish
5. Public 페이지에서 확인

---

# 📌 **6. 성공 기준 (Definition of Done)**

* [ ] 모든 CMS Blocks에 실데이터 렌더링 적용
* [ ] CMS API client 확장 완료
* [ ] Preview 모드와 Public 모드 모두 정상
* [ ] Designer-generated JSON 100% 렌더링 가능
* [ ] No TypeScript errors
* [ ] No runtime crash
* [ ] 성능: 첫 페이지 로드 < 1.5초

---

# 📌 **7. 작업 예상 시간**

총 소요: **2.5–3.5시간**

* client 확장: 30분
* loader 확장: 40분
* block renderer 9개 구현: 60–90분
* ViewRenderer 통합: 20분
* 테스트: 20분

---

# 📌 **8. 기타 사항**

이 Work Order가 끝나면 다음이 가능:

* No-Code CMS 페이지 제작
* Designer 구성 → 실데이터 표시 → 프론트 자동 배포
* Webflow 수준의 CMS 디자인 환경 구축
* CPT/ACF 시스템 필요성 감소 또는 완전 대체 가능

---

**Date Created:** 2025-12-04
**Status:** In Progress
**Assigned To:** Claude Code
