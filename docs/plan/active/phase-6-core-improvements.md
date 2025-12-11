# Phase 6: CMS-Core / ViewSystem 개선 계획

> Work Order 기반 Core 레벨 개선 Technical Breakdown
> 작성일: 2025-12-11

---

## 현재 상태 분석

### 발견된 핵심 문제점

| 영역 | 현재 상태 | 문제점 |
|------|----------|--------|
| ViewSystem | 기본 registry 패턴 | priority/conditions 없음, 충돌 시 fallback 미흡 |
| Navigation | 단순 permission 필터 | role 해석 없음, tenant 필터 없음, 캐싱 없음 |
| AppStore | dependency 기반만 | serviceGroup 개념 없음, 필터링 모호 |
| Multi-Tenancy | Entity 레벨만 | Router 레벨 tenant context 없음 |
| Theme Token | Phase 2 진행 중 | ViewSystem 연동 미완성 |

---

## Task 1: ViewSystem Template Resolution 개선

### 1.1 viewTemplate 구조 확장

**파일**: `packages/cms-core/src/view-system/types.ts`

```typescript
// 기존
interface ViewTemplate {
  viewId: string;
  pattern: string;
  cpt?: string;
  type?: ViewType;
}

// 개선
interface ViewTemplate {
  viewId: string;
  pattern: string;
  cpt?: string;
  type?: ViewType;
  priority?: number;          // NEW: 0-100, 높을수록 우선
  conditions?: ViewCondition[]; // NEW: 다중 조건
  fallback?: string;          // NEW: fallback viewId
}

interface ViewCondition {
  field: string;      // 'role' | 'tenant' | 'param' | 'query'
  operator: '=' | '!=' | 'in' | 'contains';
  value: string | string[];
}
```

### 1.2 resolveView() 개선

**파일**: `packages/cms-core/src/view-system/dynamic-router.ts`

```typescript
// 개선된 resolveView
resolveView(path: string, context?: ResolveContext): ViewResolution | null {
  const matches = this.findAllMatches(path);

  if (matches.length === 0) return null;

  // 1. 조건 필터링
  const validMatches = matches.filter(m =>
    this.evaluateConditions(m.conditions, context)
  );

  // 2. Priority 정렬
  validMatches.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // 3. 최우선 반환 또는 fallback
  const best = validMatches[0];
  if (!best && matches[0]?.fallback) {
    return this.getViewById(matches[0].fallback);
  }

  return best ? this.buildResolution(best, path) : null;
}
```

### 1.3 충돌 감지 로깅

```typescript
// Debug mode에서 충돌 로깅
registerFromManifest(appId: string, templates: ViewTemplate[]): void {
  for (const template of templates) {
    const existing = this.findExactPattern(template.pattern);
    if (existing && process.env.NODE_ENV === 'development') {
      console.warn(
        `[ViewSystem] Route conflict: ${template.pattern}\n` +
        `  Existing: ${existing.appId}/${existing.viewId}\n` +
        `  New: ${appId}/${template.viewId}`
      );
    }
    this.registerRoute(template.pattern, template.viewId, { appId, ...template });
  }
}
```

---

## Task 2: Navigation 시스템 보완

### 2.1 Role-Capability 기반 필터 강화

**파일**: `packages/cms-core/src/view-system/navigation-registry.ts`

```typescript
interface NavFilterContext {
  userPermissions: string[];
  userRoles: string[];        // NEW
  tenantId?: string;          // NEW
  capabilities?: string[];    // NEW: role에서 파생된 능력
}

getNavTreeFiltered(context: NavFilterContext): NavItem[] {
  const { userPermissions, userRoles, tenantId, capabilities } = context;

  return this.getNavTree().filter(item => {
    // 1. Tenant 필터
    if (tenantId && item.tenantId && item.tenantId !== tenantId) {
      return false;
    }

    // 2. Role 필터 (새로 추가)
    if (item.roles?.length && !item.roles.some(r => userRoles.includes(r))) {
      return false;
    }

    // 3. Capability 필터 (새로 추가)
    if (item.capabilities?.length && !item.capabilities.some(c => capabilities?.includes(c))) {
      return false;
    }

    // 4. Permission 필터 (기존)
    if (item.permissions?.length && !item.permissions.some(p => userPermissions.includes(p))) {
      return false;
    }

    return true;
  });
}
```

### 2.2 Extension App Navigation 병합 규칙

```typescript
interface NavMergeStrategy {
  mode: 'append' | 'prepend' | 'replace' | 'merge';
  targetId?: string;  // 병합할 대상 nav item
  priority?: number;
}

// manifest.navigation.admin에 병합 전략 추가
registerNav(item: NavItem, strategy?: NavMergeStrategy): void {
  if (strategy?.mode === 'replace' && strategy.targetId) {
    this.replaceNavItem(strategy.targetId, item);
  } else if (strategy?.mode === 'merge' && strategy.targetId) {
    this.mergeNavItem(strategy.targetId, item);
  } else {
    // 기본: append
    this.items.push(item);
  }
}
```

### 2.3 Navigation 캐싱

```typescript
private treeCache: Map<string, { tree: NavItem[]; timestamp: number }> = new Map();
private CACHE_TTL = 60000; // 1분

getNavTree(): NavItem[] {
  const cacheKey = 'default';
  const cached = this.treeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
    return cached.tree;
  }

  const tree = this.buildNavTree();
  this.treeCache.set(cacheKey, { tree, timestamp: Date.now() });
  return tree;
}

invalidateCache(): void {
  this.treeCache.clear();
}
```

---

## Task 3: AppStore Service Group Filtering 개선

### 3.1 ServiceGroup 타입 정의

**파일**: `packages/cms-core/src/types/app-manifest.ts`

```typescript
type ServiceGroup =
  | 'cosmetics'    // 화장품 서비스
  | 'yaksa'        // 약사회 서비스
  | 'tourist'      // 관광객 서비스
  | 'sellerops'    // 판매자 운영
  | 'supplierops'  // 공급자 운영
  | 'global';      // 모든 서비스 공통

interface AppManifest {
  // 기존 필드...
  serviceGroups?: ServiceGroup[];  // NEW
  compatibility?: {
    services: ServiceGroup[];      // 호환 서비스
    exclusive?: boolean;           // true면 해당 서비스에서만 사용
  };
}
```

### 3.2 AppStore 필터링 로직

**파일**: `apps/api-server/src/services/AppStoreService.ts`

```typescript
interface AppListOptions {
  serviceGroup?: ServiceGroup;
  includeGlobal?: boolean;
  status?: 'all' | 'installed' | 'available';
}

getAppsByServiceGroup(options: AppListOptions): AppInfo[] {
  const { serviceGroup, includeGlobal = true, status = 'all' } = options;

  let apps = Array.from(this.registry.values());

  // 1. 서비스 그룹 필터
  if (serviceGroup) {
    apps = apps.filter(app => {
      const groups = app.manifest.serviceGroups || ['global'];
      return groups.includes(serviceGroup) ||
             (includeGlobal && groups.includes('global'));
    });
  }

  // 2. 상태 필터
  if (status === 'installed') {
    apps = apps.filter(a => a.status === 'active' || a.status === 'inactive');
  } else if (status === 'available') {
    apps = apps.filter(a => a.status === 'not_installed');
  }

  // 3. 카테고리별 그룹화
  return this.categorizeApps(apps, serviceGroup);
}

private categorizeApps(apps: AppInfo[], currentService?: ServiceGroup): CategorizedApps {
  return {
    serviceSpecific: apps.filter(a =>
      a.manifest.compatibility?.exclusive &&
      a.manifest.serviceGroups?.includes(currentService)
    ),
    globalExtensions: apps.filter(a =>
      a.manifest.serviceGroups?.includes('global')
    ),
    incompatible: apps.filter(a =>
      a.manifest.compatibility?.services &&
      !a.manifest.compatibility.services.includes(currentService)
    )
  };
}
```

### 3.3 AppStore API 엔드포인트 확장

**파일**: `apps/api-server/src/routes/appstore.routes.ts`

```typescript
// GET /api/v1/appstore?serviceGroup=cosmetics&includeGlobal=true
router.get('/', async (req, res) => {
  const { serviceGroup, includeGlobal, category } = req.query;

  const apps = appStoreService.getAppsByServiceGroup({
    serviceGroup: serviceGroup as ServiceGroup,
    includeGlobal: includeGlobal !== 'false',
    status: 'all'
  });

  res.json({
    success: true,
    data: apps,
    categories: {
      serviceSpecific: apps.serviceSpecific.length,
      global: apps.globalExtensions.length,
      incompatible: apps.incompatible.length
    }
  });
});
```

---

## Task 4: Multi-Tenancy Router Protection Layer

### 4.1 Tenant Context Middleware

**파일**: `apps/api-server/src/middleware/tenant.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantConfig?: Record<string, any>;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

export function tenantMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. Tenant ID 추출 (헤더, 서브도메인, 또는 경로)
    const tenantId = extractTenantId(req);

    if (!tenantId) {
      return next(); // Public route
    }

    // 2. Tenant 정보 로드
    const tenant = await loadTenantInfo(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // 3. Request에 tenant context 주입
    req.tenant = tenant;
    next();
  };
}

function extractTenantId(req: Request): string | null {
  // 방법 1: 헤더
  if (req.headers['x-tenant-id']) {
    return req.headers['x-tenant-id'] as string;
  }

  // 방법 2: 서브도메인 (cosmetics.neture.co.kr)
  const host = req.hostname;
  const subdomain = host.split('.')[0];
  if (subdomain !== 'api' && subdomain !== 'www') {
    return subdomain;
  }

  // 방법 3: 경로 (/t/cosmetics/...)
  const pathMatch = req.path.match(/^\/t\/([^/]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  return null;
}
```

### 4.2 Route Registration with Tenant Validation

**파일**: `apps/api-server/src/modules/module-loader.ts`

```typescript
registerModuleRoutes(
  app: Express,
  moduleId: string,
  router: Router,
  tenantScope?: string[]
): void {
  const basePath = `/api/v1/${moduleId}`;

  // Tenant 제한이 있는 경우 검증 미들웨어 추가
  if (tenantScope?.length) {
    app.use(basePath, (req, res, next) => {
      if (!req.tenant) {
        return res.status(403).json({ error: 'Tenant context required' });
      }
      if (!tenantScope.includes(req.tenant.tenantSlug)) {
        return res.status(404).json({ error: 'Route not found for this tenant' });
      }
      next();
    });
  }

  app.use(basePath, router);
}
```

### 4.3 ViewSystem Tenant-Safe View 필터링

**파일**: `packages/cms-core/src/view-system/view-registry.ts`

```typescript
getViewsForTenant(tenantId: string): ViewEntry[] {
  return Array.from(this.views.values()).filter(view => {
    // 1. Global view (tenant 제한 없음)
    if (!view.tenantScope) return true;

    // 2. Tenant-specific view
    return view.tenantScope.includes(tenantId);
  });
}

resolveViewForTenant(viewId: string, tenantId: string): ViewEntry | null {
  const view = this.views.get(viewId);

  if (!view) return null;

  // Tenant mismatch 검증
  if (view.tenantScope && !view.tenantScope.includes(tenantId)) {
    return null;
  }

  return view;
}
```

---

## Task 5: Theme Token & ViewSystem 통합

### 5.1 Theme Token Registry 연결

**파일**: `packages/appearance-system/src/theme-registry.ts`

```typescript
import { DesignTokens, defaultTokens } from './tokens';

class ThemeRegistry {
  private themes: Map<string, DesignTokens> = new Map();
  private activeTheme: string = 'default';
  private listeners: Set<(tokens: DesignTokens) => void> = new Set();

  constructor() {
    this.themes.set('default', defaultTokens);
  }

  registerTheme(themeId: string, tokens: Partial<DesignTokens>): void {
    const merged = this.mergeTokens(defaultTokens, tokens);
    this.themes.set(themeId, merged);
  }

  setActiveTheme(themeId: string): void {
    if (!this.themes.has(themeId)) {
      throw new Error(`Theme ${themeId} not found`);
    }
    this.activeTheme = themeId;
    this.notifyListeners();
  }

  getActiveTokens(): DesignTokens {
    return this.themes.get(this.activeTheme) || defaultTokens;
  }

  subscribe(listener: (tokens: DesignTokens) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const tokens = this.getActiveTokens();
    this.listeners.forEach(l => l(tokens));
  }
}

export const themeRegistry = new ThemeRegistry();
```

### 5.2 ViewSystem Theme Integration

**파일**: `packages/cms-core/src/view-system/theme-integration.ts`

```typescript
import { themeRegistry } from '@o4o/appearance-system';
import { injectCSS, removeCSS, generateAllCSS } from '@o4o/appearance-system';

export function initializeThemeIntegration(): void {
  // 초기 CSS 주입
  const tokens = themeRegistry.getActiveTokens();
  injectCSS(generateAllCSS(tokens), 'o4o-theme-tokens');

  // 테마 변경 구독
  themeRegistry.subscribe((newTokens) => {
    removeCSS('o4o-theme-tokens');
    injectCSS(generateAllCSS(newTokens), 'o4o-theme-tokens');
  });
}

export function getThemedViewStyles(viewId: string): string {
  const tokens = themeRegistry.getActiveTokens();
  const viewSpecificOverrides = getViewTokenOverrides(viewId);

  if (viewSpecificOverrides) {
    const merged = { ...tokens, ...viewSpecificOverrides };
    return generateAllCSS(merged);
  }

  return '';
}
```

### 5.3 Dark Mode 지원

**파일**: `packages/appearance-system/src/tokens.ts`

```typescript
export const darkModeTokens: Partial<DesignTokens> = {
  colors: {
    primary: '#60A5FA',
    primaryHover: '#93C5FD',
    background: '#111827',
    surface: '#1F2937',
    surfaceMuted: '#374151',
    textPrimary: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    border: '#374151',
    borderMuted: '#4B5563',
  }
};

// 사용법
themeRegistry.registerTheme('dark', darkModeTokens);
themeRegistry.setActiveTheme('dark');
```

---

## 구현 우선순위

| 순서 | Task | 예상 시간 | 의존성 |
|------|------|----------|--------|
| 1 | Task 4: Multi-Tenancy Router | 4h | 없음 |
| 2 | Task 2: Navigation 보완 | 3h | Task 4 |
| 3 | Task 1: ViewSystem 개선 | 4h | Task 4 |
| 4 | Task 3: AppStore 필터링 | 3h | 없음 |
| 5 | Task 5: Theme 통합 | 3h | Task 1 |

**총 예상 시간**: 17시간 (2-3일)

---

## Definition of Done

- [ ] ViewSystem priority/conditions 필드 동작
- [ ] Navigation role/tenant 필터링 정상
- [ ] AppStore serviceGroup 필터링 API 동작
- [ ] Tenant middleware 및 route protection 적용
- [ ] Theme token 변경 시 View 반영
- [ ] 기존 서비스 회귀 테스트 통과
- [ ] 문서 업데이트 완료

---

*Phase 6 계획 작성 완료 - 2025-12-11*
