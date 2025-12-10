# CMS Integration Guideline

**버전:** 2.0.0
**상태:** Active

---

## 1. Purpose

앱이 CMS 2.0과 자연스럽게 통합되도록 CPT/ACF/View 등록 규칙을 제공한다.

## 2. Overview

- CMS는 모든 앱에 대해 단일 구조(CPT/ACF/View)를 제공한다.
- 앱은 manifest에서 CPT/ACF/View를 간단히 선언한다.
- CMS Registry가 모든 앱의 구조를 통합 관리한다.

## 3. Key Components

### 3.1 CPT (Custom Post Type)

데이터 구조를 정의하는 단위.

```typescript
// manifest.ts
cpt: [
  {
    slug: 'forum-post',
    name: 'Forum Post',
    visibility: 'public',
    supports: ['title', 'editor', 'author']
  }
]
```

### 3.2 ACF (Advanced Custom Fields)

CPT 내부의 필드 구조.

```typescript
// manifest.ts
acf: [
  {
    group: 'post-fields',
    cptSlug: 'forum-post',
    fields: [
      { key: 'viewCount', type: 'number' },
      { key: 'categoryId', type: 'relation' }
    ]
  }
]
```

### 3.3 View Templates

화면 렌더링 구조.

```typescript
// manifest.ts
viewTemplates: [
  'PostListView',
  'PostDetailView',
  'PostFormView'
]
```

## 4. Workflow

```
manifest 정의 → CMS Registry 반영 → View 자동 생성 → Navigation 연결
```

```
┌──────────────────┐
│  manifest.ts     │
│  CPT/ACF/View    │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  CMS Registry    │
│  자동 등록       │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  View 자동 생성  │
│  (Dynamic Route) │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Navigation      │
│  메뉴 연결       │
└──────────────────┘
```

## 5. Rules

1. **CPT/ACF 단순화**: 필드 구조는 단순하게 유지한다.
2. **View Component 기반**: 페이지 직접 생성 대신 View Template을 사용한다.
3. **Registry 자동 등록**: manifest 선언만으로 CMS Registry에 자동 등록된다.
4. **slug 고유성**: CPT slug는 플랫폼 전체에서 고유해야 한다.
5. **relation 타입 활용**: 앱 간 데이터 연결은 relation 타입으로 선언한다.

---

## Related Documents

- [app-overview.md](./app-overview.md)
- [cpt-acf-development.md](./cpt-acf-development.md)
- [view-guideline.md](./view-guideline.md)

---
*최종 업데이트: 2025-12-10*
