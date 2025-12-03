# 📄 **Step 25 — API Server V2 (Full Module Integration) Work Order**

## O4O Platform — NextGen Backend Architecture Consolidation

**Version**: 2025-12
**Author**: ChatGPT PM
**Status**: 🟡 PENDING
**Priority**: 🔴 CRITICAL
**Estimated Duration**: 20-25 hours

---

## 0. 목적 (Purpose)

지금까지 다음 Backend 기능이 성공적으로 구현되었다:

* ✅ Digital Signage Module
* ✅ CMS Builder Module
* ✅ Sites Module
* ✅ Deployment Manager Module

그러나 기존 API Server는:

* ❌ V1 스타일 구조(레거시 + 신규 혼합)
* ❌ 일부 모듈(node-style, express style 혼재)
* ❌ route 구조 불일치
* ❌ modules import 불균형
* ❌ entity/service/controller 분리 규칙 불일치
* ❌ DTO 패턴 불일치
* ❌ logging/error-handling 제각각

### Step 25의 목적:

> **API Server 전체를 NextGen 규약에 맞춰
> 완전한 모듈 구조로 재정렬하고,
> 모든 API 기능을 하나의 통일된 구조와 규칙으로 통합하는 것.**

### 완료 시 기대 효과:

* ✅ NextGen Frontend ↔ Backend 100% 일관성
* ✅ Multi-Instance 환경 안정화
* ✅ AppStore / CMS / Sites / Deployment / Signage 완전 정합
* ✅ 향후 AI 엔진 및 자동화 서비스에 대비된 구조 확립
* ✅ TypeScript Strict Mode 적용 가능
* ✅ Unit Test 및 Integration Test 기반 구축

---

## 1. 전체 목표 (Top-Level Goals)

### ✔ 1) 모든 API Module의 구조를 동일한 규칙으로 통합

모든 모듈이 동일한 디렉토리 구조와 네이밍 컨벤션을 따르도록 표준화

### ✔ 2) Module / Controller / Service / Entity / DTO 표준화

NestJS-like 구조로 통일 (Express 기반이지만 NestJS 패턴 적용)

### ✔ 3) 라우팅 규약 통일 (`/api/<module>/<action>`)

모든 API 엔드포인트가 일관된 URL 패턴 사용

### ✔ 4) 모든 모듈에 TypeScript 타입 완전 적용

`any` 타입 제거, 인터페이스 및 타입 정의 강화

### ✔ 5) CMS, Sites, Signage 모듈을 API Server에 완전 통합

현재 구현된 NextGen 모듈들을 기존 모듈과 완전히 통합

### ✔ 6) Legacy 코드/중복/죽은 코드 완전 제거

사용되지 않는 파일, 함수, import 제거

### ✔ 7) 에러 처리/로그처리/인증/권한 통일

GlobalErrorHandler, LoggingInterceptor, AuthGuard 공통 적용

### ✔ 8) 테스트 환경 정리 (Step 25 후 Unit Test 기반 제공)

Jest 기반 Unit Test 및 Integration Test 환경 구축

---

## 2. 대상 모듈 (전체 API 정리 스코프)

아래 모든 모듈이 Step 25의 대상입니다.

### 🟩 Core Modules

| Module | Status | Priority |
|--------|--------|----------|
| auth | 🟡 Partial | HIGH |
| user | 🟡 Partial | HIGH |
| organization | 🟡 Partial | MEDIUM |
| role/permission | 🟡 Partial | HIGH |
| notifications | 🟡 Partial | MEDIUM |

### 🟨 Commerce Modules

| Module | Status | Priority |
|--------|--------|----------|
| product | 🟡 Partial | HIGH |
| category | 🟡 Partial | MEDIUM |
| cart | 🟡 Partial | HIGH |
| order | 🟡 Partial | HIGH |
| shipping | 🟡 Partial | MEDIUM |
| payment | 🟡 Partial | HIGH |

### 🟦 Customer Modules

| Module | Status | Priority |
|--------|--------|----------|
| profile | 🟡 Partial | MEDIUM |
| wishlist | 🟡 Partial | LOW |
| address | 🟡 Partial | MEDIUM |

### 🟧 Forum Modules (NextGen으로 새로 구성 예정)

| Module | Status | Priority |
|--------|--------|----------|
| forum-core | 🔴 Legacy | HIGH |
| forum-yaksa | ❌ Deprecated | N/A |

### 🟪 Admin Modules

| Module | Status | Priority |
|--------|--------|----------|
| admin-dashboard | 🟡 Partial | MEDIUM |
| platform-stats | 🟡 Partial | LOW |

### 🟫 NextGen Modules (이미 구축됨)

| Module | Status | Priority |
|--------|--------|----------|
| cms | ✅ NextGen | REFERENCE |
| sites | ✅ NextGen | REFERENCE |
| signage | ✅ NextGen | REFERENCE |
| deployment | ✅ NextGen | REFERENCE |

**총 대상 모듈**: 20개 (4개는 참조용, 16개 정리 대상)

---

## 3. Phase 구조 (A~I)

```
Phase A – Legacy Code Sweep (Dead Code Removal)           [2 hours]
Phase B – Unified Module Structure Definition            [2 hours]
Phase C – Entity Registry Consolidation                  [2 hours]
Phase D – Module/Controller/Service 정리                  [7 hours]
Phase E – Route 정합성 확보                               [2 hours]
Phase F – Error/Logging/Auth 공통화                       [2 hours]
Phase G – CMS/Sites/Signage 완전 연결                     [2 hours]
Phase H – TypeScript Strict Mode Pass                    [2 hours]
Phase I – Integration Test (최종 검증)                    [2 hours]

Total: 23 hours
```

---

## 4. Phase A — Legacy Code Sweep (Dead Code Removal)

**Duration**: 1~2 hours
**Priority**: HIGH

### 작업 내용:

#### 1. `/modules/` 전체 스캔
- 모든 모듈 디렉토리 확인
- import 관계 분석
- 사용되지 않는 파일 식별

#### 2. 사용되지 않는 service/controller 제거
- 참조되지 않는 Service 클래스
- 라우트에 등록되지 않은 Controller
- orphan 파일 제거

#### 3. Dead DTO 제거
- 사용되지 않는 DTO 클래스
- 중복 DTO 정리
- DTO 네이밍 통일

#### 4. forum-yaksa 완전 분리
```bash
# 제거 대상
apps/api-server/src/controllers/yaksa/
apps/api-server/src/routes/yaksa/
packages/forum-yaksa/ (레거시 패키지)
```

#### 5. dropshipping-core 잔재 제거
- 사용되지 않는 dropshipping 관련 코드 제거
- import 정리
- deprecated 주석 제거

#### 6. unused import, unused entity 정리
```bash
# ESLint로 자동 검사
npm run lint -- --fix
```

### 산출물:

**`docs/api-server/reports/legacy_cleanup_report.md`**
```markdown
# Legacy Cleanup Report

## Removed Files
- [x] /controllers/yaksa/YaksaCommunityController.ts
- [x] /routes/yaksa/community.routes.ts
- ...

## Removed Imports
- 152 unused imports removed
- 23 deprecated packages removed

## Code Reduction
- Before: 45,230 lines
- After: 38,450 lines
- Reduction: 15%
```

### 검증 기준:
- [ ] npm run build 성공
- [ ] 모든 테스트 통과
- [ ] import 에러 없음
- [ ] 레거시 코드 0%

---

## 5. Phase B — Unified Module Structure Definition

**Duration**: 2 hours
**Priority**: HIGH

### 작업 내용:

#### 1. 표준 모듈 구조 정의

**모든 모듈을 다음 구조로 강제 통일:**

```
module-name/
  ├── module-name.module.ts       # Module definition (optional for Express)
  ├── module-name.controller.ts   # Controller (route handlers)
  ├── module-name.service.ts      # Service (business logic)
  ├── module-name.entity.ts       # TypeORM Entity
  ├── dtos/
  │   ├── create-module-name.dto.ts
  │   ├── update-module-name.dto.ts
  │   └── query-module-name.dto.ts
  └── index.ts                    # Module exports
```

#### 2. 네이밍 컨벤션 통일

| Type | Pattern | Example |
|------|---------|---------|
| Entity | PascalCase | `Site`, `Product`, `Order` |
| Service | PascalCase + Service | `SitesService`, `ProductsService` |
| Controller | PascalCase + Controller | `SitesController` |
| DTO | PascalCase + Dto | `CreateSiteDto`, `UpdateSiteDto` |
| Route File | kebab-case.routes.ts | `sites.routes.ts`, `products.routes.ts` |

#### 3. Import 패턴 통일

```typescript
// Good
import { SitesService } from './sites.service';
import { Site } from './site.entity';
import { CreateSiteDto } from './dtos/create-site.dto';

// Bad
import { SitesService } from './sites.service.js'; // .js 확장자 제거
import { Site } from '../entities/Site'; // 경로 표준화
```

#### 4. Export 패턴 통일

```typescript
// index.ts
export * from './sites.service';
export * from './sites.controller';
export * from './site.entity';
export * from './dtos';
```

### 산출물:

**`docs/api-server/specs/module_structure_spec.md`**
```markdown
# Module Structure Specification

## Standard Directory Structure
...

## Naming Conventions
...

## Import/Export Guidelines
...
```

### 검증 기준:
- [ ] 모든 모듈이 표준 구조 준수
- [ ] 네이밍 컨벤션 100% 준수
- [ ] import/export 패턴 통일

---

## 6. Phase C — Entity Registry Consolidation

**Duration**: 2 hours
**Priority**: HIGH

### 문제점:

* 일부 entity가 import되지 않아 migration 실패
* order, payment, shipping 등 V1 entity가 등록 누락
* CMS/Signage/Sites entity는 신규 등록됨 → 정리 필요

### 작업:

#### 1. 전체 Entity 목록 작성

```typescript
// src/config/database/entities.ts

export const entities = [
  // Core Entities
  User,
  Role,
  Permission,
  UserRoleAssignment,

  // Commerce Entities
  Product,
  Category,
  Order,
  OrderItem,
  Payment,
  Shipping,

  // Customer Entities
  CustomerProfile,
  CustomerAddress,
  Wishlist,

  // NextGen Entities
  Site,
  CMSView,
  CMSBlock,
  SignageDevice,
  DeploymentInstance,

  // ... (전체 Entity 등록)
];
```

#### 2. Entity Auto-Discovery 규칙 도입

```typescript
// TypeORM DataSource 설정
entities: [
  'src/**/*.entity.ts',  // Development
  'dist/**/*.entity.js'   // Production
],
```

#### 3. Entity 경로 정규화

```bash
# Before (불일치)
src/entities/User.ts
src/modules/user/user.entity.ts
src/database/entities/user.entity.ts

# After (통일)
src/modules/user/user.entity.ts
```

### 산출물:

**Entity Registry 파일**
- `src/config/database/entities.ts`

**Migration 정합성 보고서**
- `docs/api-server/reports/entity_migration_check.md`

### 검증 기준:
- [ ] 모든 Entity가 DataSource에 등록됨
- [ ] Migration 실행 성공
- [ ] Entity 중복 없음
- [ ] Entity 경로 일관성 100%

---

## 7. Phase D — Module/Controller/Service 정리

**Duration**: 5~7 hours
**Priority**: CRITICAL

### 목표:

모든 모듈의 service/controller 파일 구조를 NextGen 스타일로 통일.

### 작업 항목:

#### 1. CRUD 엔드포인트 정의

**모든 모듈에 표준 CRUD 적용:**

```typescript
// sites.controller.ts (참조용)
class SitesController {
  async create(req, res) { }      // POST   /api/sites
  async findAll(req, res) { }     // GET    /api/sites
  async findOne(req, res) { }     // GET    /api/sites/:id
  async update(req, res) { }      // PUT    /api/sites/:id
  async remove(req, res) { }      // DELETE /api/sites/:id
}
```

#### 2. DTO 생성 (Create / Update / Query)

```typescript
// dtos/create-site.dto.ts
export interface CreateSiteDto {
  domain: string;
  name?: string;
  description?: string;
  template: string;
  apps?: string[];
  config?: any;
}

// dtos/update-site.dto.ts
export interface UpdateSiteDto {
  name?: string;
  description?: string;
  config?: any;
}

// dtos/query-site.dto.ts
export interface QuerySiteDto {
  status?: string;
  template?: string;
  limit?: number;
  offset?: number;
}
```

#### 3. Input Validation 도입

```typescript
import { validate } from 'class-validator';

async create(req, res) {
  const errors = await validate(CreateSiteDto, req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  // ...
}
```

#### 4. Service 책임 분리

```typescript
// sites.service.ts
class SitesService {
  async create(dto: CreateSiteDto): Promise<Site> { }
  async findAll(query: QuerySiteDto): Promise<Site[]> { }
  async findOne(id: string): Promise<Site> { }
  async update(id: string, dto: UpdateSiteDto): Promise<Site> { }
  async remove(id: string): Promise<void> { }
}
```

#### 5. Controller 단일 책임 적용

```typescript
// sites.controller.ts
class SitesController {
  constructor(private sitesService: SitesService) {}

  async create(req, res) {
    try {
      const site = await this.sitesService.create(req.body);
      res.json({ success: true, data: site });
    } catch (error) {
      // Error handler로 전달
      throw error;
    }
  }
}
```

### 대상 모듈 (우선순위):

| Priority | Module | Estimated Time |
|----------|--------|----------------|
| 1 | auth | 1 hour |
| 2 | user | 1 hour |
| 3 | product | 1 hour |
| 4 | order | 1 hour |
| 5 | cart | 0.5 hour |
| 6 | payment | 1 hour |
| 7 | category | 0.5 hour |
| 8 | forum-core | 1 hour |

### 산출물:

**리팩토링된 모듈 파일들**

### 검증 기준:
- [ ] 모든 모듈이 표준 패턴 준수
- [ ] DTO 100% 적용
- [ ] Service/Controller 분리 명확
- [ ] 단위 테스트 작성 가능한 구조

---

## 8. Phase E — Route 정합성 확보

**Duration**: 1~2 hours
**Priority**: HIGH

### 현재 문제점:

route 호출 규칙이 혼재:

```
❌ /api/commerce/products
❌ /api/product/create
❌ /api/v1/<module>/<action>
❌ /api/admin/...
❌ /api/user/...
```

### 통일 규칙:

```
✅ /api/<module>/<action>
```

### 예시:

| Before | After |
|--------|-------|
| `/api/commerce/products` | `/api/products` |
| `/api/v1/sites/create` | `/api/sites` (POST) |
| `/api/admin/users` | `/api/users?role=admin` |

### 특수 케이스:

```
/api/cms/views              # CMS 모듈
/api/sites/:id/scaffold     # Sites 모듈
/api/signage/devices        # Signage 모듈
/api/auth/login             # Auth 모듈
/api/products/:id/reviews   # Product 하위 리소스
```

### 작업:

#### 1. routes.config.ts 전체 정리

```typescript
// Before
app.use('/api/v1/sites', sitesRoutes);
app.use('/api/commerce/products', productsRoutes);

// After
app.use('/api/sites', sitesRoutes);
app.use('/api/products', productsRoutes);
```

#### 2. Deprecated Route 표시

```typescript
// Legacy route (deprecated)
app.use('/api/v1/sites', deprecatedRoute('/api/sites'), sitesRoutes);
```

#### 3. Route 문서 생성

**`docs/api-server/specs/api_routes.md`**

### 검증 기준:
- [ ] 모든 route가 `/api/<module>` 패턴
- [ ] Legacy route에 deprecated 경고
- [ ] Route 문서 100% 작성

---

## 9. Phase F — Error/Logging/Auth 공통화

**Duration**: 2 hours
**Priority**: HIGH

### 목표:

API 서버의 모든 응답/에러 구조 통합.

### 1. 응답 포맷 통일

```typescript
// Success Response
{
  "success": true,
  "data": {...}
}

// Error Response
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

### 2. GlobalErrorFilter 공통 적용

```typescript
// middleware/global-error-handler.ts
export const globalErrorHandler = (err, req, res, next) => {
  logger.error('Global error:', err);

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
```

### 3. LoggingInterceptor 적용

```typescript
// middleware/logging-interceptor.ts
export const loggingInterceptor = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
};
```

### 4. RoleGuard / PermissionGuard 적용

```typescript
// middleware/role.guard.ts
export const requireRole = (...roles: string[]) => {
  return (req, res, next) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRoles = user.roles || [];
    const hasRole = userRoles.some(r => roles.includes(r.name));

    if (!hasRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};
```

### 산출물:

**공통 미들웨어 파일들:**
- `src/middleware/global-error-handler.ts`
- `src/middleware/logging-interceptor.ts`
- `src/middleware/role.guard.ts`

### 검증 기준:
- [ ] 모든 API가 통일된 응답 포맷 사용
- [ ] 에러 처리 100% 일관성
- [ ] 모든 요청에 로깅 적용
- [ ] Role/Permission 체크 통일

---

## 10. Phase G — CMS/Sites/Signage 완전 연결

**Duration**: 2 hours
**Priority**: MEDIUM

### 작업:

#### 1. Sites API → CMS Builder 연결 보완

```typescript
// Sites scaffolding 시 CMS 초기 페이지 생성
async function scaffoldSite(siteId: string) {
  // 1. Site 정보 조회
  const site = await sitesService.findOne(siteId);

  // 2. CMS 초기 페이지 생성
  await cmsService.createDefaultPages(siteId, site.template);

  // 3. Theme 적용
  await cmsService.applyTheme(siteId, site.config?.theme);

  // 4. Apps 설치
  for (const app of site.apps) {
    await appService.install(siteId, app);
  }
}
```

#### 2. CMS → ViewRenderer & Layout config 연동 확인

```typescript
// CMS View 렌더링 시 Site 설정 반영
async function renderView(viewId: string) {
  const view = await cmsService.findView(viewId);
  const site = await sitesService.findOne(view.siteId);

  // Site theme 적용
  const theme = site.config?.theme || 'default';
  const layout = await layoutService.getLayout(theme);

  return renderWithLayout(view, layout);
}
```

#### 3. Signage → Sites 연결 (optional)

```typescript
// Signage device를 특정 site에 연결
await signageService.assignDevice(deviceId, siteId);
```

#### 4. Deployment Manager → Sites/Scaffold 완전 연결

```typescript
// Site 배포 시 Deployment Instance 생성
async function deploySite(siteId: string) {
  const site = await sitesService.findOne(siteId);

  // Deployment instance 생성
  const instance = await deploymentService.create({
    domain: site.domain,
    apps: site.apps,
    region: 'ap-northeast-2',
  });

  // Site에 deploymentId 저장
  await sitesService.update(siteId, {
    deploymentId: instance.id,
    status: 'deploying',
  });
}
```

### 산출물:

**통합 서비스 로직**

### 검증 기준:
- [ ] Site 생성 시 CMS 페이지 자동 생성
- [ ] CMS View가 Site theme 반영
- [ ] Deployment가 Site 정보 사용

---

## 11. Phase H — TypeScript Strict Mode Pass

**Duration**: 1~2 hours
**Priority**: MEDIUM

### 작업:

#### 1. tsconfig.json strict 옵션 활성화

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

#### 2. 타입 에러 수정

```typescript
// Before
function getUser(id) {  // ❌ Parameter 'id' implicitly has an 'any' type
  return users.find(u => u.id === id);
}

// After
function getUser(id: string): User | undefined {
  return users.find(u => u.id === id);
}
```

#### 3. any 타입 제거

```bash
# any 타입 사용 위치 검색
grep -r "any" src/
```

### 산출물:

**타입 안정성 보고서**
- `docs/api-server/reports/typescript_strict_mode_report.md`

### 검증 기준:
- [ ] npm run build 성공 (0 errors)
- [ ] any 타입 사용률 < 5%
- [ ] Strict mode 활성화

---

## 12. Phase I — Integration Test (최종 검증)

**Duration**: 2 hours
**Priority**: HIGH

### 테스트 시나리오:

#### 1. 신규 사이트 생성
```bash
curl -X POST https://api.neture.co.kr/api/sites \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "domain": "test.example.com",
    "template": "ecommerce"
  }'
```

#### 2. 스캐폴딩
```bash
curl -X POST https://api.neture.co.kr/api/sites/:id/scaffold \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "autoDeploy": true }'
```

#### 3. 테마 적용
```bash
curl -X PUT https://api.neture.co.kr/api/sites/:id \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "config": { "theme": "modern" } }'
```

#### 4. CMS 페이지 자동 생성 확인
```bash
curl https://api.neture.co.kr/api/cms/views?siteId=:id
```

#### 5. Commerce + Customer + Auth 기능 전부 연동

**통합 시나리오:**
1. 사용자 회원가입
2. 로그인
3. 상품 조회
4. 장바구니 추가
5. 주문 생성
6. 결제 처리

### 산출물:

**통합 테스트 리포트**
- `docs/api-server/reports/integration_test_report.md`

### 검증 기준:
- [ ] 모든 시나리오 통과
- [ ] API 응답 시간 < 200ms
- [ ] 에러율 0%

---

## 13. 성공 기준 (Definition of Done)

### Phase별 DoD:

#### Phase A: Legacy Code Sweep
- [ ] 모든 모듈에서 import/path 문제 없음
- [ ] npm run build 성공
- [ ] 레거시 코드 제거 완료

#### Phase B: Unified Module Structure
- [ ] 모든 모듈이 표준 구조 준수
- [ ] 네이밍 컨벤션 100% 준수

#### Phase C: Entity Registry
- [ ] 모든 Entity 등록 완료
- [ ] Migration 실행 성공

#### Phase D: Module/Controller/Service
- [ ] 모든 모듈 리팩토링 완료
- [ ] DTO 100% 적용

#### Phase E: Route 정합성
- [ ] routes.config.ts 완전 통일
- [ ] Route 문서 작성 완료

#### Phase F: Error/Logging/Auth
- [ ] 공통 미들웨어 적용 완료
- [ ] 응답 포맷 통일

#### Phase G: CMS/Sites/Signage 연결
- [ ] CMS/Sites/Signage 100% 연동
- [ ] Site Builder로 생성된 사이트 완전 동작

#### Phase H: TypeScript Strict
- [ ] build 성공 (TS error 0)
- [ ] Strict mode 활성화

#### Phase I: Integration Test
- [ ] 모든 테스트 통과
- [ ] 통합 시나리오 검증 완료

### 전체 DoD:

- [ ] ✅ 모든 Phase 완료
- [ ] ✅ npm run build 성공 (0 errors, 0 warnings)
- [ ] ✅ 모든 API 엔드포인트 작동
- [ ] ✅ CMS/Sites/Signage/Commerce/Customer 연동
- [ ] ✅ Admin Dashboard 기능 오류 없음
- [ ] ✅ Step 25 전체 문서 작성 완료

---

## 14. 예상 리스크 및 대응 방안

| 리스크 | 확률 | 영향도 | 대응 방안 |
|--------|------|--------|-----------|
| Entity 등록 누락 | 중 | 높음 | Entity auto-discovery 적용 |
| Route 중복 충돌 | 중 | 중간 | Route 문서 작성 및 검증 |
| TypeScript 빌드 실패 | 높음 | 높음 | 단계별 빌드 검증 |
| 기존 기능 손상 | 중 | 매우높음 | Integration Test 강화 |
| 작업 시간 초과 | 중 | 중간 | Phase 우선순위 조정 |

---

## 15. 산출물 목록

### 문서
- [ ] `docs/api-server/specs/module_structure_spec.md`
- [ ] `docs/api-server/specs/api_routes.md`
- [ ] `docs/api-server/reports/legacy_cleanup_report.md`
- [ ] `docs/api-server/reports/entity_migration_check.md`
- [ ] `docs/api-server/reports/typescript_strict_mode_report.md`
- [ ] `docs/api-server/reports/integration_test_report.md`
- [ ] `docs/api-server/completion/step25_completion_report.md`

### 코드
- [ ] 리팩토링된 모든 모듈 파일
- [ ] 공통 미들웨어 파일
- [ ] 통합 DTO 파일
- [ ] Entity Registry 파일
- [ ] Route 설정 파일

---

## 16. 다음 단계 (Post Step 25)

Step 25 완료 후:

1. **Step 26**: Scaffolding Service 완전 구현
2. **Step 27**: Template Engine 구축
3. **Step 28**: 자동 배포 파이프라인
4. **Step 29**: Multi-Instance Monitoring
5. **Step 30**: AI-Powered Site Generation

---

## 부록 A: 참조 문서

### NextGen 모듈 구조 참조
- `apps/api-server/src/modules/sites/` (✅ 표준)
- `apps/api-server/src/modules/cms/` (✅ 표준)
- `apps/api-server/src/modules/signage/` (✅ 표준)

### Legacy 모듈 구조 (개선 대상)
- `apps/api-server/src/controllers/` (🔴 구조 불일치)
- `apps/api-server/src/routes/` (🔴 구조 불일치)

---

## 부록 B: Phase 진행 체크리스트

### Phase A Checklist
- [ ] Legacy 파일 스캔 완료
- [ ] Dead code 제거 완료
- [ ] forum-yaksa 완전 분리
- [ ] import 정리 완료
- [ ] Build 검증 완료

### Phase B Checklist
- [ ] 모듈 구조 정의 문서 작성
- [ ] 네이밍 컨벤션 문서 작성
- [ ] Import/Export 가이드라인 작성

### Phase C Checklist
- [ ] Entity 목록 작성
- [ ] Entity auto-discovery 설정
- [ ] Migration 검증

### Phase D Checklist
- [ ] auth 모듈 리팩토링
- [ ] user 모듈 리팩토링
- [ ] product 모듈 리팩토링
- [ ] order 모듈 리팩토링
- [ ] (나머지 모듈들...)

### Phase E Checklist
- [ ] Route 정합성 검증
- [ ] Route 문서 작성
- [ ] Deprecated route 표시

### Phase F Checklist
- [ ] GlobalErrorHandler 작성
- [ ] LoggingInterceptor 작성
- [ ] RoleGuard 작성
- [ ] 공통 미들웨어 적용

### Phase G Checklist
- [ ] Sites → CMS 연결
- [ ] CMS → ViewRenderer 연결
- [ ] Deployment → Sites 연결

### Phase H Checklist
- [ ] Strict mode 활성화
- [ ] 타입 에러 수정
- [ ] any 타입 제거

### Phase I Checklist
- [ ] 통합 테스트 시나리오 작성
- [ ] 모든 시나리오 실행
- [ ] 테스트 리포트 작성

---

**Work Order Generated:** 2025-12-03
**Work Order Version:** 1.0
**Status:** 🟡 PENDING
**Next Action:** Phase A 시작

---

© 2025 O4O Platform Development Team. All rights reserved.
