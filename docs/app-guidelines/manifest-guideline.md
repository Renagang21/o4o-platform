# Manifest Guideline

> ⚠ 본 문서는 CLAUDE.md v2.0을 기준으로 하며,
> 충돌 시 CLAUDE.md를 우선한다.
> 상세 규격은 `manifest-specification.md`를 참조한다.

**버전:** 2.1.0
**상태:** Active

---

## 1. Purpose

앱의 구조와 기능을 명확하게 선언하기 위한 manifest.ts 작성 규칙을 정의한다.

## 2. Overview

manifest는 AppStore와 Module Loader가 해석하는 앱의 "설계도"이다.
모든 앱은 manifest.ts를 통해 자신의 구조를 선언해야 한다.

## 3. Key Fields

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `appId` | string | Y | 앱 고유 식별자 |
| `name` | string | Y | 앱 표시 이름 |
| `type` | enum | Y | CLAUDE.md §2.2 참조 (core/feature/extension/standalone 등) |
| `version` | string | Y | 버전 (semver) |
| `dependencies` | string[] | N | 의존 앱 목록 |
| `cpt` | CPTDef[] | N | Custom Post Types |
| `acf` | ACFDef[] | N | Advanced Custom Fields |
| `viewTemplates` | string[] | N | View 템플릿 목록 |
| `routes` | RouteDef | N | API 라우트 설정 |
| `navigation` | NavDef | N | 메뉴/네비게이션 |
| `lifecycle` | LifecycleDef | N | Lifecycle 훅 경로 |

## 4. Example

```typescript
// packages/forum-core/src/manifest.ts
import { AppManifest } from '@o4o/types';

export const manifest: AppManifest = {
  appId: 'forum-core',
  name: 'Forum',
  type: 'core',
  version: '1.0.0',

  dependencies: ['organization-core'],

  cpt: [
    { slug: 'forum-post', name: 'Forum Post' },
    { slug: 'forum-category', name: 'Forum Category' }
  ],

  acf: [
    { group: 'post-fields', cptSlug: 'forum-post' }
  ],

  viewTemplates: [
    'PostListView',
    'PostDetailView',
    'PostFormView'
  ],

  routes: {
    prefix: '/api/v1/forum',
    controller: ForumController
  },

  navigation: {
    admin: [
      { path: '/forum', label: 'Forum', icon: 'message' }
    ]
  },

  lifecycle: {
    install: './lifecycle/install',
    activate: './lifecycle/activate',
    deactivate: './lifecycle/deactivate',
    uninstall: './lifecycle/uninstall'
  }
};
```

## 5. Rules

1. **appId 고유성**: appId는 플랫폼 전체에서 고유해야 한다.
2. **type 정확성**: CLAUDE.md §2.2의 App 유형 체계에서 정확한 타입을 선택한다.
3. **dependencies 정확성**: 의존 앱은 정확하게 명시해야 순서 충돌이 없다.
4. **route prefix 규칙**: `/api/v1/{app-name}` 형식을 따른다.
5. **lifecycle 경로**: lifecycle 훅은 상대 경로로 지정한다.

---

## Related Documents

- [app-overview.md](./app-overview.md)
- [backend-structure.md](./backend-structure.md)
- [manifest-specification.md](./manifest-specification.md)

---
*최종 업데이트: 2025-12-10*
