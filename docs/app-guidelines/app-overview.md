# App Development Overview

**버전:** 2.0.0
**상태:** Active

---

## 1. Purpose

O4O Platform에서 앱을 개발할 때 따라야 하는 전체 흐름과 구조를 요약한다.
이 문서는 모든 앱 개발의 출발점이다.

## 2. Overview

- 모든 앱은 **manifest.ts**로 구조를 정의한다.
- 앱은 **AppStore**에 등록되고 **Module Loader**가 자동으로 로드한다.
- **CMS 2.0**(CPT/ACF/View)와 자동 통합된다.
- 각 앱은 독립적으로 개발되며 AppStore로 설치된다.

## 3. Key Components

| 구성요소 | 역할 |
|----------|------|
| **manifest.ts** | 앱 정의 (메타정보, 의존성, CPT/ACF/View) |
| **backend/** | Router, Entities, Services |
| **lifecycle/** | install/activate/deactivate/uninstall |
| **views/** | UI 컴포넌트 (View Template) |
| **CMS Registry** | CPT/ACF/View 통합 관리 |

## 4. Workflow

```
앱 생성 → manifest 정의 → backend 구성 → lifecycle 추가 → view 등록 → AppStore 설치
```

```
┌──────────────┐
│   앱 생성     │
└──────┬───────┘
       ▼
┌──────────────┐
│ manifest.ts  │
│    정의      │
└──────┬───────┘
       ▼
┌──────────────┐
│   backend    │
│    구성      │
└──────┬───────┘
       ▼
┌──────────────┐
│  lifecycle   │
│    추가      │
└──────┬───────┘
       ▼
┌──────────────┐
│    view      │
│    등록      │
└──────┬───────┘
       ▼
┌──────────────┐
│  AppStore    │
│    설치      │
└──────────────┘
```

## 5. Rules

1. **manifest 필수**: 앱 기능은 모두 manifest에 선언한다.
2. **backend export 규칙**: backend/index.ts는 정해진 export 구조를 따라야 한다.
3. **View Component 기반**: 페이지 기반이 아닌 Component 기반으로 UI를 구성한다.
4. **의존성 계층 준수**: Core ← Extension ← Service 방향으로만 의존 가능.
5. **Lifecycle 구현**: install/activate/deactivate/uninstall 훅을 적절히 구현.

---

## Related Documents

- [manifest-guideline.md](./manifest-guideline.md)
- [backend-structure.md](./backend-structure.md)
- [cms-integration.md](./cms-integration.md)
- [view-guideline.md](./view-guideline.md)

---
*최종 업데이트: 2025-12-10*
