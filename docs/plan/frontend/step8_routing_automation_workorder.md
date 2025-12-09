# Step 8 — Routing 자동화 Work Order

## 📋 작업 개요

**목표**: View JSON 파일 기반 자동 라우팅 시스템 구축

**문제점**:
- 현재 `loader.ts`의 `URL_VIEW_MAP`이 하드코딩되어 있음
- 새로운 View JSON 추가 시마다 수동으로 URL 매핑 필요
- Priority 2, 3, 4에서 생성한 24개 뷰 중 대부분이 라우트 미설정 상태
- 유지보수 부담 증가 및 휴먼 에러 가능성

**해결 방안**:
- View JSON 파일의 `meta.route` 또는 `viewId` 기반 자동 라우팅
- 파일 시스템 스캔으로 동적 라우트 생성
- 개발 환경에서 핫 리로드 지원

---

## 🎯 작업 항목

### 1. Route 메타데이터 정의

각 View JSON에 라우팅 정보 추가:

```json
{
  "viewId": "product-list",
  "meta": {
    "title": "상품 목록",
    "description": "전체 상품 목록",
    "route": "/products"  // ← 라우트 경로 명시
  },
  "layout": { "type": "ShopLayout" },
  "components": [...]
}
```

**기본 라우팅 규칙** (route가 없을 경우):
- `viewId: "product-list"` → route: `/product-list`
- `viewId: "admin-seller-detail"` → route: `/admin/seller/:id`
- `:id`, `:slug` 등 동적 파라미터는 viewId에 명시

---

### 2. 자동 라우트 생성 유틸리티

**파일**: `apps/main-site-nextgen/src/view/route-generator.ts`

```typescript
import { ViewSchema } from './types';

export interface RouteConfig {
  path: string;
  viewId: string;
  meta?: {
    title?: string;
    authRequired?: boolean;
    roles?: string[];
  };
}

// 모든 view JSON 파일을 스캔하여 RouteConfig 배열 생성
export function generateRoutes(): RouteConfig[] {
  const routes: RouteConfig[] = [];

  // Vite의 import.meta.glob으로 모든 view JSON 파일 로드
  const viewModules = import.meta.glob<{ default: ViewSchema }>(
    '../views/*.json',
    { eager: true }
  );

  for (const [path, module] of Object.entries(viewModules)) {
    const view = module.default;
    const routePath = view.meta?.route || convertViewIdToRoute(view.viewId);

    routes.push({
      path: routePath,
      viewId: view.viewId,
      meta: view.meta,
    });
  }

  return routes.sort((a, b) => {
    // Dynamic routes (with :param) should come after static routes
    const aHasParam = a.path.includes(':');
    const bHasParam = b.path.includes(':');
    if (aHasParam && !bHasParam) return 1;
    if (!aHasParam && bHasParam) return -1;
    return 0;
  });
}

// viewId를 route path로 변환 (기본 규칙)
function convertViewIdToRoute(viewId: string): string {
  if (viewId === 'home') return '/';
  if (viewId === 'not-found') return '/404';

  // "admin-seller-detail" → "/admin/seller/:id"
  // "product-detail" → "/product/:id"
  if (viewId.endsWith('-detail')) {
    const base = viewId.replace('-detail', '').replace(/-/g, '/');
    return `/${base}/:id`;
  }

  // "admin-seller-list" → "/admin/seller"
  if (viewId.endsWith('-list')) {
    const base = viewId.replace('-list', '').replace(/-/g, '/');
    return `/${base}`;
  }

  // "seller-dashboard" → "/dashboard/seller"
  if (viewId.endsWith('-dashboard')) {
    const role = viewId.replace('-dashboard', '');
    return `/dashboard/${role}`;
  }

  // Default: "product-list" → "/product-list"
  return `/${viewId}`;
}
```

---

### 3. Loader 업데이트

**파일**: `apps/main-site-nextgen/src/view/loader.ts`

```typescript
import { ViewSchema } from './types';
import { generateRoutes, type RouteConfig } from './route-generator';

// 자동 생성된 라우트 캐싱
let routeCache: RouteConfig[] | null = null;

function getRoutes(): RouteConfig[] {
  if (!routeCache) {
    routeCache = generateRoutes();
  }
  return routeCache;
}

export async function loadView(url: string): Promise<ViewSchema> {
  const routes = getRoutes();

  // 정확한 경로 매칭
  let matchedRoute = routes.find(r => r.path === url);

  // 동적 파라미터 경로 매칭 (/admin/seller/:id)
  if (!matchedRoute) {
    matchedRoute = routes.find(r => {
      const regex = new RegExp('^' + r.path.replace(/:\w+/g, '[^/]+') + '$');
      return regex.test(url);
    });
  }

  const viewId = matchedRoute?.viewId || 'not-found';

  try {
    const json = await import(`../views/${viewId}.json`);
    return json.default as ViewSchema;
  } catch (error) {
    console.error(`Failed to load view: ${viewId}`, error);
    return {
      viewId: 'error',
      layout: { type: 'MinimalLayout' },
      components: [
        {
          type: 'ErrorMessage',
          props: {
            message: `View not found: ${viewId}`,
          },
        },
      ],
    };
  }
}

// 개발 환경에서 라우트 캐시 초기화 (HMR 지원)
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    routeCache = null;
  });
}
```

---

### 4. View JSON 업데이트

Priority 2, 3, 4 뷰들에 `meta.route` 추가:

| viewId | route |
|--------|-------|
| `product-list` | `/products` |
| `product-detail` | `/product/:id` |
| `cart` | `/cart` |
| `checkout` | `/checkout` |
| `order-list` | `/orders` |
| `order-detail` | `/order/:id` |
| `login` | `/login` |
| `signup` | `/signup` |
| `reset-password` | `/reset-password` |
| `my-account` | `/my-account` |
| `wishlist` | `/wishlist` |
| `profile` | `/profile` |
| `admin-stats` | `/admin/stats` |
| `admin-dashboard` | `/admin` |
| `admin-seller-list` | `/admin/sellers` |
| `admin-seller-detail` | `/admin/seller/:id` |
| `admin-supplier-list` | `/admin/suppliers` |
| `admin-supplier-detail` | `/admin/supplier/:id` |

---

## ✅ 완료 조건

1. [ ] `route-generator.ts` 구현 완료
2. [ ] `loader.ts` 자동 라우팅 적용
3. [ ] 모든 View JSON에 `meta.route` 추가
4. [ ] TypeScript 컴파일 에러 없음
5. [ ] 기존 라우트 (`/`, `/dashboard/seller` 등) 정상 작동
6. [ ] 새로운 라우트 (Priority 2, 3, 4) 접근 가능
7. [ ] 404 페이지 처리 정상 작동

---

## 📝 테스트 시나리오

### 기본 라우팅
- [ ] `/` → home.json
- [ ] `/404` → not-found.json

### Dropshipping
- [ ] `/dashboard/seller` → seller-dashboard.json
- [ ] `/dashboard/supplier` → supplier-dashboard.json
- [ ] `/dashboard/partner` → partner-dashboard.json

### Commerce
- [ ] `/products` → product-list.json
- [ ] `/product/123` → product-detail.json (동적 파라미터)
- [ ] `/cart` → cart.json
- [ ] `/checkout` → checkout.json
- [ ] `/orders` → order-list.json
- [ ] `/order/456` → order-detail.json (동적 파라미터)

### Customer/Auth
- [ ] `/login` → login.json
- [ ] `/signup` → signup.json
- [ ] `/reset-password` → reset-password.json
- [ ] `/my-account` → my-account.json
- [ ] `/wishlist` → wishlist.json
- [ ] `/profile` → profile.json

### Admin
- [ ] `/admin` → admin-dashboard.json
- [ ] `/admin/stats` → admin-stats.json
- [ ] `/admin/sellers` → admin-seller-list.json
- [ ] `/admin/seller/789` → admin-seller-detail.json (동적 파라미터)
- [ ] `/admin/suppliers` → admin-supplier-list.json
- [ ] `/admin/supplier/012` → admin-supplier-detail.json (동적 파라미터)

---

## 🚀 기대 효과

- ✅ 새로운 뷰 추가 시 라우트 자동 생성
- ✅ URL 매핑 관리 포인트 단일화 (각 View JSON의 meta.route)
- ✅ 동적 파라미터 라우팅 지원
- ✅ 개발 생산성 향상
- ✅ 휴먼 에러 방지

---

*작성일: 2025-12-02*
*작성자: Claude (Rena)*
