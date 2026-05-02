# O4O HUB Template Standard V1

> **상위 문서**: `CLAUDE.md` § 13 (O4O 공통 구조 원칙), § 13-A (APP 표준화)
> **패키지**: `@o4o/shared-space-ui` (`packages/shared-space-ui/src/`)
> **적용 범위**: KPA Society, GlycoPharm, K-Cosmetics, 향후 모든 O4O 서비스
> **상태**: Active Standard (2026-04-23)

---

## 1. Overview

O4O 플랫폼은 6개의 공통 HUB 템플릿을 `@o4o/shared-space-ui` 패키지에서 관리한다.
각 서비스는 **템플릿을 import → Config 객체로 설정 주입 → Adapter 함수로 데이터 연결**하는
동일한 패턴을 따른다.

### 대상 독자

- 새로운 서비스에 HUB 페이지를 추가하는 개발자
- 기존 HUB 페이지를 수정하는 개발자
- AI 코드 생성기 (Claude Code 등)

### 이 문서의 지위

HUB 템플릿 관련 구현에서 이 문서가 최우선이다. 기존 HUB 관련 문서(`HUB-UX-GUIDELINES-V1.md` 등)는
운영 허브(Operator Dashboard)에 대한 규칙이며, 이 문서는 **서비스 사용자 화면(Space UI)**의 HUB 템플릿을 다룬다.

---

## 2. Template Inventory

| # | Template | 파일 | Config Type | 상태 |
|---|----------|------|-------------|------|
| 1 | `ContentHubTemplate` | `ContentHubTemplate.tsx` | `ContentHubConfig` | Active |
| 2 | `LmsHubTemplate` | `LmsHubTemplate.tsx` | `LmsHubConfig` | Active |
| 3 | `ForumHubTemplate` | `ForumHubTemplate.tsx` | `ForumHubConfig` | Active |
| 4 | `StoreHubTemplate` | `StoreHubTemplate.tsx` | `StoreHubConfig` | Active |
| 5 | `ResourcesHubTemplate` | `ResourcesHubTemplate.tsx` | `ResourcesHubConfig` | Active |
| 6 | `SignageHubTemplate` | `SignageHubTemplate.tsx` | `SignageHubConfig` | Active |
| 7 | `SignageManagerTemplate` | `SignageManagerTemplate.tsx` | `SignageManagerConfig` | Active |

> Hub Template과 Manager Template 구분:
> - **Hub** 계열(1–6) — 콘텐츠 목록형 허브.
> - **Manager** 계열(7) — 매장 Signage 관리(영상/플레이리스트). KPA / K-Cosmetics에서 채택.

### 보조 컴포넌트

| 컴포넌트 | 파일 | 사용처 |
|----------|------|--------|
| `HubPagination` | `HubPagination.tsx` | Content, LMS, Resources, Signage |

### Export 목록 (`index.ts`)

```typescript
// Templates
export { ContentHubTemplate } from './ContentHubTemplate';
export { LmsHubTemplate } from './LmsHubTemplate';
export { ForumHubTemplate } from './ForumHubTemplate';
export { StoreHubTemplate } from './StoreHubTemplate';
export { ResourcesHubTemplate } from './ResourcesHubTemplate';
export { SignageHubTemplate } from './SignageHubTemplate';
export { SignageManagerTemplate } from './SignageManagerTemplate';

// Pagination
export { HubPagination } from './HubPagination';
export type { HubPaginationProps } from './HubPagination';

// Config types (각 템플릿의 type export 포함)
```

---

## 3. Naming Rules

### 3.1 파일 이름

```
{Domain}HubTemplate.tsx     ← 패키지 내 템플릿 파일
```

| 규칙 | 예시 |
|------|------|
| PascalCase | `ContentHubTemplate.tsx` |
| 접미사: `HubTemplate` | `Lms` + `HubTemplate` = `LmsHubTemplate` |

### 3.2 Config 타입 이름

```
{Domain}HubConfig
```

예: `ContentHubConfig`, `LmsHubConfig`, `ForumHubConfig`, `StoreHubConfig`, `ResourcesHubConfig`, `SignageHubConfig`

### 3.3 컴포넌트 Export 이름

```
{Domain}HubTemplate
```

Named export (not default). 사용 시:

```typescript
import { LmsHubTemplate, type LmsHubConfig } from '@o4o/shared-space-ui';
```

### 3.4 서비스 페이지 파일 이름

| 라우트 경로 | 서비스 파일 이름 (권장) |
|-------------|----------------------|
| `/content` | `HubContentListPage.tsx` 또는 `ContentHubPage.tsx` |
| `/lms` | `EducationPage.tsx` |
| `/forum` | `ForumHomePage.tsx` 또는 `ForumHubPage.tsx` |
| `/store-hub` | `StoreHubPage.tsx` |
| `/resources` | `ResourcesHubPage.tsx` 또는 `ResourcesPage.tsx` |
| `/signage` | `ContentHubPage.tsx` 또는 `ContentLibraryPage.tsx` |

> 서비스 파일 이름은 강제하지 않으나, 라우트 경로와의 연관성을 유지한다.

### 3.5 라우트 경로

| 도메인 | 라우트 | 비고 |
|--------|--------|------|
| Content | `/content` | HUB 콘텐츠 라이브러리 |
| LMS | `/lms` 또는 `/education` | 교육/강좌 목록 |
| Forum | `/forum` | 게시판 허브 |
| Store | `/store-hub` | 약국/매장 허브 |
| Resources | `/resources` | 자료실 |
| Signage | `/signage` | 디지털 사이니지 관리 |

---

## 4. Hero Block Standard

모든 6개 템플릿은 공통 Hero 영역을 가진다.

### 4.1 필수 Props

```typescript
// 모든 Config에 공통으로 존재하는 필드
interface HeroCommon {
  serviceKey: string;      // 서비스 식별자 (e.g., 'kpa-society', 'glycopharm')
  heroTitle: string;       // Hero 영역 제목
  heroDesc: string;        // Hero 영역 부제 설명
}
```

### 4.2 Optional: `headerAction`

5개 템플릿(Content, LMS, Store, Resources, Signage)은 `headerAction?: React.ReactNode`를 지원한다.
이는 Hero 영역 우측 상단에 CTA 버튼을 배치하는 데 사용된다.

```typescript
// 사용 예
const config: ContentHubConfig = {
  serviceKey: 'kpa-society',
  heroTitle: '콘텐츠 라이브러리',
  heroDesc: '약국 운영에 필요한 콘텐츠를 관리합니다.',
  headerAction: <button onClick={openModal}>+ 콘텐츠 등록</button>,
  // ...
};
```

ForumHubTemplate은 `headerAction` 대신 `writePrompt` 패턴을 사용한다:

```typescript
interface ForumHubConfig {
  // ...
  writePrompt?: string;  // "글을 작성해 보세요" 등의 안내 텍스트
}
```

### 4.3 Hero 영역 렌더링 구조

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  heroTitle                     [headerAction]    │
│  heroDesc                                        │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 5. Search + Pagination + Toast

### 5.1 검색 (Search)

4개 데이터 목록형 템플릿이 검색을 지원한다:

| 템플릿 | 검색 필드 | Config Prop |
|--------|----------|-------------|
| Content | `showSearch?: boolean`, `searchPlaceholder?: string` | 키워드 검색 |
| Resources | `searchPlaceholder?: string` | 키워드 검색 |
| Signage | `searchPlaceholder?: string` | 키워드 검색 |
| LMS | 내장 (템플릿 내부 구현) | 키워드 검색 |

Forum, Store는 검색 UI를 템플릿 내부에서 제공하지 않는다.

### 5.2 페이지네이션 (`HubPagination`)

공통 페이지네이션 컴포넌트. 4개 데이터 목록형 템플릿에서 사용.

```typescript
export interface HubPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageInfo?: boolean;   // 기본 true — "N / M 페이지" 텍스트
  disabled?: boolean;
}
```

**사용 템플릿**: Content, LMS, Resources, Signage
**미사용**: Forum (자체 페이지네이션), Store (정적, 페이지네이션 없음)

**동작 규칙**:
- `totalPages <= 1`이면 자동 숨김 (`return null`)
- 최대 5개 페이지 번호 표시 (sliding window)
- `← N / M 페이지 [1][2][3][4][5] →` 레이아웃

### 5.3 페이지 크기 (`pageLimit`)

| 템플릿 | Config Prop | 기본값 |
|--------|------------|--------|
| Content | `pageLimit?: number` | 템플릿 내부 기본값 |
| Resources | `pageLimit?: number` | 템플릿 내부 기본값 |
| Signage | `pageLimit?: number` | 템플릿 내부 기본값 |
| LMS | 없음 (고정) | 템플릿 내부 결정 |

### 5.4 Toast

- 각 템플릿은 성공/실패 메시지를 자체 Toast UI로 표시
- Toast 구현은 템플릿 내부 인라인 (`position: fixed; bottom`)
- 외부 Toast 라이브러리 의존 없음

---

## 6. Adapter Pattern

각 템플릿은 **Config 객체 내 Adapter 함수**를 통해 데이터를 주입받는다.
템플릿은 Adapter를 호출할 뿐, 데이터의 출처(API URL, 인증 방식 등)를 알지 못한다.

### 6.1 데이터 목록형 (Content, Resources, Signage)

```typescript
// Content
fetchItems: (params: ContentHubFetchParams) => Promise<ContentHubFetchResult>;

// Resources
fetchItems: (params: ResourcesHubFetchParams) => Promise<ResourcesHubFetchResult>;

// Signage
fetchItems: (params: SignageHubFetchParams) => Promise<SignageHubFetchResult>;
```

공통 패턴: `{ page, limit, search?, filters? }` → `{ items, total, page, limit }`

### 6.2 강좌형 (LMS)

```typescript
fetchCourses: (params: LmsHubFetchParams) => Promise<{ courses: LmsHubCourse[]; total: number }>;
```

### 6.3 커뮤니티형 (Forum)

```typescript
fetchCategories: () => Promise<ForumHubCategory[]>;
fetchRecentPosts: () => Promise<ForumHubPost[]>;
```

Forum은 페이지네이션 Adapter가 아닌 **전체 목록** 콜백 패턴을 사용한다.

### 6.4 정적형 (Store)

Store는 fetch Adapter가 없다. 모든 데이터는 Config 객체에 정적으로 선언된다:

```typescript
interface StoreHubConfig {
  serviceKey: string;
  heroTitle: string;
  heroDesc: string;
  headerAction?: React.ReactNode;
  storeCta?: { title: string; description: string; buttonLabel: string; href: string };
  resourceCards?: StoreHubResourceCard[];
  operationSteps?: StoreHubFlowStep[];
  // ...
}
```

### 6.5 Adapter 구현 위치

Adapter 함수는 **서비스 페이지 파일**에서 정의한다:

```typescript
// services/web-kpa-society/src/pages/lms/EducationPage.tsx
const config: LmsHubConfig = {
  serviceKey: 'kpa-society',
  heroTitle: '온라인 교육',
  heroDesc: '대한약사회 온라인 교육 과정입니다.',
  fetchCourses: async (params) => {
    const res = await publicContentApi.listCourses({
      serviceKey: 'kpa-society',
      page: params.page,
      limit: params.limit,
    });
    return { courses: res.data.items.map(mapToLmsHubCourse), total: res.data.total };
  },
};
return <LmsHubTemplate config={config} />;
```

---

## 7. Service Page Adoption Matrix

### 7.1 현재 적용 현황

| Template | KPA Society | GlycoPharm | K-Cosmetics |
|----------|:-----------:|:----------:|:-----------:|
| **ContentHub** | `pharmacy/HubContentLibraryPage.tsx` | `hub/HubContentListPage.tsx` | `library/ContentLibraryPage.tsx` |
| **LmsHub** | `lms/EducationPage.tsx` | `education/EducationPage.tsx` | `lms/EducationPage.tsx` |
| **ForumHub** | `forum/ForumHomePage.tsx` | `forum/ForumHubPage.tsx` | `forum/ForumHubPage.tsx` |
| **StoreHub** | `pharmacy/StoreHubPage.tsx` | `hub/StoreHubPage.tsx` | `hub/KCosmeticsHubPage.tsx` |
| **ResourcesHub** | `resources/ResourcesHubPage.tsx` | `resources/ResourcesPage.tsx` | `resources/ResourcesPage.tsx` |
| **SignageHub** | `signage/ContentHubPage.tsx` ※ | `store-management/signage/ContentLibraryPage.tsx` | `signage/ContentHubPage.tsx` ※ |

> ※ KPA / K-Cosmetics는 `SignageManagerTemplate`(@o4o/shared-space-ui)을 사용한다 — 동영상/플레이리스트 탭 기반.
> GlycoPharm은 `SignageHubTemplate`(콘텐츠 목록형)을 사용한다.
> 두 변형 모두 `@o4o/shared-space-ui` 공통 Template이며, Override가 아니다.

### 7.2 서비스 페이지 작성 패턴

```typescript
// 1. import
import { {Domain}HubTemplate, type {Domain}HubConfig } from '@o4o/shared-space-ui';

// 2. config 정의
const config: {Domain}HubConfig = {
  serviceKey: '{service-key}',
  heroTitle: '...',
  heroDesc: '...',
  // adapter functions...
};

// 3. render
return <{Domain}HubTemplate config={config} />;
```

### 7.3 새 서비스 추가 시

1. 위 패턴을 그대로 따른다
2. `serviceKey`만 변경하고 Adapter 함수에서 해당 서비스의 API를 호출한다
3. 템플릿 코드 수정 없이 Config만으로 서비스를 분기한다

---

## 8. Override Policy

### 8.1 원칙

**모든 HUB 페이지는 `@o4o/shared-space-ui` 템플릿을 사용해야 한다.**
템플릿을 사용하지 않는 직접 구현(Override)은 명시적 WO 승인이 필요하다.

### 8.2 Override가 허용되는 조건

| 조건 | 설명 |
|------|------|
| 템플릿 Config로 표현 불가능한 UX | 탭 분리, 복합 모달, 다중 데이터 소스 등 |
| 명시적 WO 문서 존재 | WO에 Override 사유가 기술되어 있어야 함 |
| KPA 기준 조사 완료 | Override 전에 KPA 구현을 먼저 분석할 것 |

### 8.3 Override 시 금지 사항

| 금지 | 이유 |
|------|------|
| Hero 영역 제거 | 모든 HUB 페이지는 Hero 영역 유지 필수 |
| 서비스별 독자 페이지네이션 | `HubPagination` 사용 또는 동일 UX 유지 |
| Config 타입을 bypass하는 Props 전달 | 타입 안전성 파괴 |

### 8.4 현재 Override 목록

현재 Override 사례 없음.

> 과거 KPA Signage가 Override로 표기되었으나 (`WO-KPA-SIGNAGE-VIDEO-PLAYLIST-STRUCTURE-REFORM-V2`),
> 현재는 `SignageManagerTemplate`(@o4o/shared-space-ui) 채택으로 정렬되어 Override가 아니다.

---

## 9. KPA Canonical Principle

> **KPA-Society는 모든 HUB 템플릿의 Reference Implementation이다.**

### 9.1 규칙

1. **새 HUB 개발 시 KPA 구현을 먼저 조사**한다
2. KPA에서 검증된 패턴을 다른 서비스에 적용한다
3. KPA 구조 변경 시 공통 구조 문서와 함께 검토한다

### 9.2 KPA 참조 파일 목록

| 도메인 | KPA 파일 | 라우트 |
|--------|---------|--------|
| Content | `pages/pharmacy/HubContentLibraryPage.tsx` | `/content` |
| LMS | `pages/lms/EducationPage.tsx` | `/lms` |
| Forum | `pages/forum/ForumHomePage.tsx` | `/forum` |
| Store | `pages/pharmacy/StoreHubPage.tsx` | `/store-hub` |
| Resources | `pages/resources/ResourcesHubPage.tsx` | `/resources` |
| Signage | `pages/signage/ContentHubPage.tsx` | `/signage` |

### 9.3 GlycoPharm은 KPA 패턴을 따른다

GlycoPharm의 HUB 페이지는 KPA와 동일한 템플릿 + Config 패턴을 사용한다.
차이점은 `serviceKey` (`'glycopharm'`)와 API 호출 대상뿐이다.

---

## 10. `/content` vs `/resources` Boundary

### 10.1 정의

| 경로 | 도메인 | 템플릿 | 목적 |
|------|--------|--------|------|
| `/content` | CMS 콘텐츠 | `ContentHubTemplate` | CMS에서 생성/관리하는 콘텐츠 자산 (영상, 이미지, POP 등) |
| `/resources` | 자료실 | `ResourcesHubTemplate` | 사용자/관리자가 업로드한 파일/문서 자료 |

### 10.2 구분 기준

| 기준 | `/content` | `/resources` |
|------|-----------|-------------|
| **데이터 출처** | CMS Core (Asset 기반) | 독립 자료 테이블 |
| **생성 주체** | Operator (CMS 관리자) | Operator + 일반 사용자 |
| **복사 기능** | `loadCopiedIds`, `onCopy` — Store로 Asset 복사 | `source_url` 링크 복사 |
| **AI 연동** | `showUsageBlock` — 사용처 표시 | 없음 |
| **파일 다운로드** | 없음 (콘텐츠 뷰어) | `fetchDetail` → 파일 URL |
| **Bulk Action** | 복사, 삭제 | 복사, 삭제 |

### 10.3 절대 규칙

- `/content`에 파일 업로드 기능을 넣지 않는다 (CMS Core의 역할)
- `/resources`에 CMS Asset 연동을 넣지 않는다
- 두 경로를 합치지 않는다 — 데이터 출처가 다르다

---

## 11. `/store-hub` Definition

### 11.1 역할

`/store-hub`는 약국/매장의 **운영 안내 허브**이다.
데이터 목록이 아닌 **정적 안내 카드 + CTA 블록**으로 구성된다.

### 11.2 StoreHubConfig 구조

```typescript
interface StoreHubConfig {
  serviceKey: string;
  heroTitle: string;
  heroDesc: string;
  headerAction?: React.ReactNode;

  // 정적 블록들
  storeCta?: { title: string; description: string; buttonLabel: string; href: string };
  resourceCards?: StoreHubResourceCard[];
  operationSteps?: StoreHubFlowStep[];

  // AI / CTA 블록 표시 토글
  aiBlock?: { title: string; description: string };
  storeCtaBlock?: { title: string; description: string; buttonLabel: string; href: string };
  showAiBlock?: boolean;
  showStoreCtaBlock?: boolean;
  showFlowBlock?: boolean;

  // Custom render
  renderAiSection?: () => React.ReactNode;
}
```

### 11.3 다른 HUB와의 차이

| 항목 | Store | 기타 5개 |
|------|-------|---------|
| 데이터 fetch | 없음 (정적) | Adapter 콜백 |
| 페이지네이션 | 없음 | `HubPagination` |
| 검색 | 없음 | 키워드 검색 |
| 테이블/리스트 | 없음 | 항목 목록 |

---

## 12. K-Cosmetics Adoption Status

K-Cosmetics는 현재 `@o4o/shared-space-ui` 기반 Hub Template을 사용한다.
`serviceKey: 'k-cosmetics'`로 데이터가 격리되며, 6개 Hub 모두 KPA 패턴과 동일한 Config 어댑터 패턴을 따른다.

채택 파일 위치는 § 7.1 매트릭스 K-Cosmetics 열을 참조한다.

---

## 13. Config Interface Reference

### 13.1 ContentHubConfig

```typescript
export interface ContentHubConfig {
  serviceKey: string;
  heroTitle: string;
  heroDesc: string;
  headerAction?: React.ReactNode;
  showSearch?: boolean;
  searchPlaceholder?: string;
  filters?: ContentHubFilter[];
  pageLimit?: number;
  fetchItems: (params: ContentHubFetchParams) => Promise<ContentHubFetchResult>;
  loadCopiedIds?: (itemIds: string[]) => Promise<Set<string>>;
  onCopy?: (item: ContentHubItem, ctx: ContentHubItemContext) => Promise<void>;
  showUsageBlock?: boolean;
}
```

### 13.2 LmsHubConfig

```typescript
export interface LmsHubConfig {
  serviceKey: string;
  heroTitle: string;
  heroDesc: string;
  headerAction?: React.ReactNode;
  courseDetailPath?: (courseId: string) => string;
  fetchCourses: (params: LmsHubFetchParams) => Promise<{ courses: LmsHubCourse[]; total: number }>;
  renderRowActions?: (course: LmsHubCourse) => React.ReactNode;
}
```

### 13.3 ForumHubConfig

```typescript
export interface ForumHubConfig {
  serviceKey: string;
  heroTitle: string;
  heroDesc: string;
  categoryPath?: (catSlug: string) => string;
  listPath?: string;
  fetchCategories: () => Promise<ForumHubCategory[]>;
  fetchRecentPosts: () => Promise<ForumHubPost[]>;
  writePrompt?: string;
  renderCategorySection?: (cats: ForumHubCategory[]) => React.ReactNode;
  renderActivitySection?: (posts: ForumHubPost[]) => React.ReactNode;
}
```

### 13.4 StoreHubConfig

```typescript
export interface StoreHubConfig {
  serviceKey: string;
  heroTitle: string;
  heroDesc: string;
  headerAction?: React.ReactNode;
  storeCta?: { title: string; description: string; buttonLabel: string; href: string };
  resourceCards?: StoreHubResourceCard[];
  aiBlock?: { title: string; description: string };
  storeCtaBlock?: { title: string; description: string; buttonLabel: string; href: string };
  operationSteps?: StoreHubFlowStep[];
  showAiBlock?: boolean;
  showStoreCtaBlock?: boolean;
  showFlowBlock?: boolean;
  renderAiSection?: () => React.ReactNode;
}
```

### 13.5 ResourcesHubConfig

```typescript
export interface ResourcesHubConfig {
  serviceKey: string;
  tableId?: string;
  heroTitle?: string;
  heroDesc?: string;
  headerAction?: React.ReactNode;
  searchPlaceholder?: string;
  pageLimit?: number;
  fetchItems: (params: ResourcesHubFetchParams) => Promise<ResourcesHubFetchResult>;
  fetchDetail?: (id: string) => Promise<any>;
  trackView?: (id: string) => Promise<void>;
  createAction?: { label: string; onClick: () => void };
  getEditHref?: (item: ResourcesHubItem) => string;
  onDelete?: (item: ResourcesHubItem) => Promise<void>;
  onBulkDelete?: (items: ResourcesHubItem[]) => Promise<void>;
}
```

### 13.6 SignageHubConfig

```typescript
export interface SignageHubConfig {
  serviceKey: string;
  heroTitle: string;
  heroDesc: string;
  headerAction?: React.ReactNode;
  searchPlaceholder?: string;
  filters?: SignageHubFilter[];
  showTagFilter?: boolean;
  pageLimit?: number;
  fetchItems: (params: SignageHubFetchParams) => Promise<SignageHubFetchResult>;
  onCopy?: (item: SignageHubItem) => Promise<void>;
  onDelete?: (item: SignageHubItem) => Promise<void>;
  sourceLabels?: Record<string, string>;
  mediaTypeLabels?: Record<string, string>;
}
```

---

## 14. Related Documents

| 문서 | 내용 | 관계 |
|------|------|------|
| `docs/platform/hub/HUB-UX-GUIDELINES-V1.md` | Operator Hub 화면 구조/카드/Signal 규칙 | 운영 허브 (이 문서와 별개) |
| `docs/platform/hub/HUB-EXPLORATION-FREEZE-V1.md` | HubExplorationLayout 구조 동결 | 탐색(Market) 허브 동결 |
| `docs/platform/hub/HUB-TABLE-STANDARD-ROLLOUT-COMPLETION-V1.md` | BaseTable + Selection 표준화 완료 보고 | HUB 테이블 구조 |
| `docs/o4o-common-structure.md` | Forum/LMS/Signage 공통 구조 원칙 | 상위 원칙 |
| `CLAUDE.md` § 13 | O4O 공통 구조 원칙 | 상위 규칙 |
| `CLAUDE.md` § 13-A | APP 표준화 (Baseline Lock) | APP Freeze 상태 |

---

## 15. Changelog

| 날짜 | 버전 | 변경 |
|------|------|------|
| 2026-04-23 | v1.0 | 초안 작성 — 6개 템플릿 구조 분석, 서비스 적용 현황, Override 정책 |
| 2026-05-02 | v1.0.1 | Signage 표기 정합성 수정 (WO-O4O-SIGNAGE-DOC-CONSISTENCY-FIX-V1) — KPA Signage를 Override가 아닌 `SignageManagerTemplate` 채택으로 정정. § 7.1 매트릭스, § 8.4 Override 목록 갱신. K-Cosmetics Signage 채택 반영. |
| 2026-05-02 | v1.0.2 | K-Cosmetics 매트릭스 + Inventory 정합성 수정 (WO-O4O-HUB-TEMPLATE-DOC-K-COSMETICS-AND-MANAGER-INVENTORY-FIX-V1) — § 7.1 K-Cosmetics 5개 셀 "—" → 실제 파일 경로 교체 (Forum/Content/LMS/Store-Hub/Resources). § 12 K-Cosmetics Placeholder → Adoption Status로 갱신. § 2 Inventory에 `SignageManagerTemplate` (#7) 추가 + Hub/Manager 구분 안내. |

---

*이 문서는 `CLAUDE.md` § 13 (O4O 공통 구조 원칙)의 하위 문서이다.*
*WO: WO-O4O-HUB-TEMPLATE-DOCUMENTATION-V1*
