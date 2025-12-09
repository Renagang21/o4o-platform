# Step 25 — Phase B Implementation Work Order

## API Server V2 – Full Module Restructure Execution Guide

**Version:** 2025-12-03
**Status:** Ready for Implementation
**Author:** O4O Platform Team
**Estimated Duration:** 14 weeks

---

## 🎯 Phase B Implementation 목적

이 단계의 목적:

**API Server 전체를 NextGen Backend 구조로 재편성하고,
모든 Controller / Service / Route / Entity / DTO를
표준화된 모듈 구조(Module-Based Architecture)로 재구축하는 것.**

Phase A(레거시 제거), Pre-B 조사, Phase B 설계가 모두 완료되었으므로
이제 **실제 코드 변경**을 시작한다.

---

## 🟦 전체 작업 범위 (Modules: 10 Domains, 332 Files)

아래 10개 도메인 전체를 리팩토링한다:

- **AUTH** (31 files)
- **COMMERCE** (30 files)
- **DROPSHIPPING** (38 files)
- **CMS** (68+ files)
- **SITES** (32 files)
- **SIGNAGE** (10 files)
- **ADMIN** (28 files)
- **PARTNER** (11 files)
- **DEPLOYMENT** (10 files)
- **SHARED** (23 files)

**총 332개 파일** 이동 / 정리 / 재배치 / 패턴 통일이 목표이다.

---

## 🔧 Phase B Implementation Plan (6단계)

```
Phase B-1 — Foundation Setup (필수 기반)
Phase B-2 — AUTH Module Pilot Migration
Phase B-3 — Commerce & Dropshipping Modules
Phase B-4 — CMS Module (최대 규모)
Phase B-5 — Sites / Signage / Admin / Partner / Deployment
Phase B-6 — Final Integration & Strict Mode Build
```

---

## 🟩 Phase B-1 — Foundation Setup (Week 1–2)

### 목표
- 모듈 구조 기반 설정
- 공통 패턴 정의
- DTO validation 인프라 구축
- 표준 템플릿 생성

### 1. New Module Directory Structure 생성

프로젝트 경로:
```
apps/api-server/src/modules/<domain>/
```

도메인별 하위 폴더 생성:
```
controllers/
services/
dto/
entities/
repositories/
routes/
middleware/
interfaces/
utils/
tests/
index.ts
```

**Task Checklist**:
- [ ] Create `/modules/auth/` directory structure
- [ ] Create `/modules/commerce/` directory structure
- [ ] Create `/modules/dropshipping/` directory structure
- [ ] Create `/modules/cms/` directory structure
- [ ] Create `/modules/sites/` directory structure
- [ ] Create `/modules/signage/` directory structure
- [ ] Create `/modules/admin/` directory structure
- [ ] Create `/modules/partner/` directory structure
- [ ] Create `/modules/deployment/` directory structure
- [ ] Create `/modules/shared/` directory structure

---

### 2. 공통 Controller/Service Base Class 도입

아래 파일 생성:
```
src/common/base.controller.ts
src/common/base.service.ts
```

**Base Controller Template**:
```typescript
// src/common/base.controller.ts
import { Request, Response, NextFunction } from 'express';

export abstract class BaseController {
  /**
   * Send success response
   */
  protected static ok<T>(res: Response, data: T): Response {
    return res.json({
      success: true,
      data
    });
  }

  /**
   * Send success response with pagination
   */
  protected static okPaginated<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  ): Response {
    return res.json({
      success: true,
      data,
      pagination
    });
  }

  /**
   * Send error response
   */
  protected static error(
    res: Response,
    error: Error | string,
    statusCode: number = 500
  ): Response {
    const message = error instanceof Error ? error.message : error;
    return res.status(statusCode).json({
      success: false,
      error: message
    });
  }

  /**
   * Send not found response
   */
  protected static notFound(res: Response, resource: string): Response {
    return res.status(404).json({
      success: false,
      error: `${resource} not found`
    });
  }

  /**
   * Send validation error response
   */
  protected static validationError(res: Response, errors: any): Response {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }
}
```

**Base Service Template**:
```typescript
// src/common/base.service.ts
import { Repository } from 'typeorm';

export abstract class BaseService<T> {
  constructor(protected readonly repository: Repository<T>) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({ where: { id } as any });
  }

  /**
   * Find all entities with pagination
   */
  async findAll(options: {
    page?: number;
    limit?: number;
  }): Promise<{ items: T[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.repository.findAndCount({
      skip,
      take: limit
    });

    return { items, total };
  }

  /**
   * Create new entity
   */
  async create(data: Partial<T>): Promise<T> {
    const entity = this.repository.create(data as any);
    return this.repository.save(entity);
  }

  /**
   * Update entity
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    await this.repository.update(id, data as any);
    return this.findById(id);
  }

  /**
   * Delete entity
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }
}
```

**Task Checklist**:
- [ ] Create `src/common/base.controller.ts`
- [ ] Create `src/common/base.service.ts`
- [ ] Create `src/common/index.ts` (barrel export)
- [ ] Test base classes with sample controller/service

---

### 3. DTO Validation Infrastructure 구축

**Install Dependencies**:
```bash
pnpm add class-validator class-transformer reflect-metadata
```

**Create Validation Middleware**:
```typescript
// src/common/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

export function validateDto(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Transform plain object to DTO instance
      const dtoInstance = plainToInstance(dtoClass, req.body);

      // Validate
      const errors: ValidationError[] = await validate(dtoInstance, {
        whitelist: true,
        forbidNonWhitelisted: true
      });

      if (errors.length > 0) {
        const formattedErrors = errors.map(error => ({
          property: error.property,
          constraints: error.constraints
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: formattedErrors
        });
      }

      // Replace req.body with validated DTO
      req.body = dtoInstance;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Validation error'
      });
    }
  };
}

export function validateQuery(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dtoInstance = plainToInstance(dtoClass, req.query);
      const errors: ValidationError[] = await validate(dtoInstance);

      if (errors.length > 0) {
        const formattedErrors = errors.map(error => ({
          property: error.property,
          constraints: error.constraints
        }));

        return res.status(400).json({
          success: false,
          error: 'Query validation failed',
          details: formattedErrors
        });
      }

      req.query = dtoInstance as any;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Query validation error'
      });
    }
  };
}
```

**DTO Template Example**:
```typescript
// Example: modules/auth/dto/login-request.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

**Task Checklist**:
- [ ] Install validation dependencies
- [ ] Create `src/common/validation.middleware.ts`
- [ ] Create DTO template files
- [ ] Document DTO patterns in `/docs/dev/patterns/dto-guide.md`

---

### 4. Global Middlewares/Guards 통일

**Create Common Middleware Directory**:
```
src/common/middleware/
├── auth.middleware.ts          # JWT authentication
├── role.middleware.ts          # Role-based access control
├── error-handler.middleware.ts # Global error handler
├── logger.middleware.ts        # Request logging
└── rate-limit.middleware.ts    # Rate limiting
```

**Standardize Auth Middleware**:
```typescript
// src/common/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || '');
    (req as AuthRequest).user = decoded as any;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}
```

**Task Checklist**:
- [ ] Move auth middleware to `/common/middleware/`
- [ ] Standardize role guard
- [ ] Create global error handler
- [ ] Create request logger middleware
- [ ] Update imports across codebase

---

### 5. Documentation & Templates

**Create Pattern Documentation**:
```
docs/dev/patterns/
├── nextgen-architecture.md      # Overall architecture
├── controller-patterns.md       # Controller best practices
├── service-patterns.md          # Service layer patterns
├── dto-guide.md                 # DTO usage guide
├── testing-guide.md             # Testing patterns
└── migration-checklist.md       # Module migration steps
```

**Create Code Templates**:
```
docs/dev/templates/
├── controller.template.ts
├── service.template.ts
├── dto.template.ts
├── entity.template.ts
└── test.template.ts
```

**Task Checklist**:
- [ ] Write NextGen architecture documentation
- [ ] Write controller pattern guide
- [ ] Write service pattern guide
- [ ] Write DTO usage guide
- [ ] Create code templates
- [ ] Create migration checklist

---

## 🟧 Phase B-2 — AUTH Module Pilot Migration (Week 3–4)

### 목표
AUTH 모듈을 **참조 구현(Reference Implementation)**으로 완전 마이그레이션

### Why AUTH First?
- ✅ Well-defined boundaries
- ✅ Medium complexity (31 files)
- ✅ Critical for all other modules
- ✅ Already has some DTO usage
- ✅ Validates entire migration strategy

---

### Week 3: Structure & Controllers

#### 1. Create Module Structure
```bash
mkdir -p src/modules/auth/{controllers,services,dto,entities,routes,middleware,interfaces,utils,tests}
touch src/modules/auth/index.ts
```

#### 2. Migrate Controllers (9 files)

**Controllers to Migrate**:
1. `UserController` → `modules/auth/controllers/UserController.ts`
2. `AuthController` (if exists) → `modules/auth/controllers/AuthController.ts`
3. `v1/userRole.controller.ts` → `modules/auth/controllers/RoleController.ts`
4. `v1/userActivity.controller.ts` → `modules/auth/controllers/UserActivityController.ts`
5. `v1/userStatistics.controller.ts` → `modules/auth/controllers/UserStatisticsController.ts`
6. `v1/userRoleSwitch.controller.ts` → `modules/auth/controllers/RoleSwitchController.ts`
7. `v1/businessInfo.controller.ts` → `modules/auth/controllers/BusinessInfoController.ts`
8. `approvalController.ts` → `modules/auth/controllers/ApprovalController.ts`
9. `admin/adminApprovalController.ts` → `modules/auth/controllers/AdminApprovalController.ts`

**Migration Steps per Controller**:
1. Copy controller to new location
2. Refactor to static methods (if instance-based)
3. Extract business logic to service
4. Replace repository access with service calls
5. Add DTO validation
6. Extend BaseController
7. Update imports
8. Test endpoints

**Example Migration**:
```typescript
// Before: src/controllers/userController.ts
export class UserController {
  private userRepository = AppDataSource.getRepository(User);

  async getUsers(req, res) {
    const users = await this.userRepository.find();
    res.json({ success: true, data: users });
  }
}

// After: src/modules/auth/controllers/UserController.ts
import { BaseController } from '../../../common/base.controller.js';
import { userService } from '../services/UserService.js';
import { GetUsersQueryDto } from '../dto/get-users-query.dto.js';

export class UserController extends BaseController {
  static async getUsers(req: Request, res: Response): Promise<Response> {
    try {
      const query = req.query as GetUsersQueryDto;
      const result = await userService.getUsers(query);
      return UserController.okPaginated(res, result.users, result.pagination);
    } catch (error) {
      return UserController.error(res, error);
    }
  }
}
```

**Task Checklist**:
- [ ] Migrate UserController
- [ ] Migrate RoleController
- [ ] Migrate UserActivityController
- [ ] Migrate UserStatisticsController
- [ ] Migrate RoleSwitchController
- [ ] Migrate BusinessInfoController
- [ ] Migrate ApprovalController
- [ ] Migrate AdminApprovalController
- [ ] Remove all direct repository access
- [ ] Verify all controllers extend BaseController

---

#### 3. Create DTOs (15+ files)

**DTO Structure**:
```
modules/auth/dto/
├── auth/
│   ├── login-request.dto.ts
│   ├── login-response.dto.ts
│   ├── register-request.dto.ts
│   ├── refresh-token-request.dto.ts
│   └── token-response.dto.ts
├── user/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   ├── user-response.dto.ts
│   ├── get-users-query.dto.ts
│   └── user-filters.dto.ts
├── role/
│   ├── create-role.dto.ts
│   ├── update-role.dto.ts
│   ├── assign-role.dto.ts
│   └── role-response.dto.ts
└── index.ts
```

**Example DTOs**:
```typescript
// login-request.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

// get-users-query.dto.ts
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

**Task Checklist**:
- [ ] Create auth DTOs (login, register, token)
- [ ] Create user DTOs (CRUD + filters)
- [ ] Create role DTOs (assign, update)
- [ ] Add validation decorators
- [ ] Create barrel export (index.ts)
- [ ] Document DTO patterns

---

### Week 4: Services, Entities & Testing

#### 4. Migrate Services (10 files)

**Services to Migrate**:
1. `AuthService.ts` → `modules/auth/services/AuthService.ts`
2. `AuthServiceV2.ts` → Merge into AuthService
3. `authentication.service.ts` → Merge or separate
4. `LoginSecurityService.ts` → `modules/auth/services/LoginSecurityService.ts`
5. `RefreshTokenService.ts` → `modules/auth/services/TokenService.ts`
6. `PermissionService.ts` → `modules/auth/services/PermissionService.ts`
7. `approval-workflow.service.ts` → `modules/auth/services/ApprovalService.ts`
8. `sessionSyncService.ts` → `modules/auth/services/SessionService.ts`
9. `socialAuthService.ts` → `modules/auth/services/SocialAuthService.ts`
10. `account-linking.service.ts` → `modules/auth/services/AccountLinkingService.ts`

**Migration Pattern**:
```typescript
// Before
export class AuthService {
  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }
}

// After
import { BaseService } from '../../../common/base.service.js';
import { User } from '../entities/User.entity.js';

export class AuthService extends BaseService<User> {
  constructor() {
    super(AppDataSource.getRepository(User));
  }

  async login(email: string, password: string): Promise<TokenResponse> {
    // Business logic here
  }
}

// Create singleton instance
export const authService = new AuthService();
```

**Task Checklist**:
- [ ] Migrate AuthService
- [ ] Merge AuthServiceV2 into AuthService
- [ ] Migrate LoginSecurityService
- [ ] Migrate TokenService
- [ ] Migrate PermissionService
- [ ] Migrate ApprovalService
- [ ] Migrate SessionService
- [ ] Migrate SocialAuthService
- [ ] Migrate AccountLinkingService
- [ ] Extend BaseService where applicable
- [ ] Create singleton instances

---

#### 5. Migrate Entities (12 files)

**Entities to Migrate**:
1. `User.ts` → `modules/auth/entities/User.entity.ts`
2. `UserSession.ts` → `modules/auth/entities/UserSession.entity.ts`
3. `UserActivityLog.ts` → `modules/auth/entities/UserActivityLog.entity.ts`
4. `UserAction.ts` → `modules/auth/entities/UserAction.entity.ts`
5. `RefreshToken.ts` → `modules/auth/entities/RefreshToken.entity.ts`
6. `LinkedAccount.ts` → `modules/auth/entities/LinkedAccount.entity.ts`
7. `LinkingSession.ts` → `modules/auth/entities/LinkingSession.entity.ts`
8. `AccountActivity.ts` → `modules/auth/entities/AccountActivity.entity.ts`
9. `LoginAttempt.ts` → `modules/auth/entities/LoginAttempt.entity.ts`
10. `PasswordResetToken.ts` → `modules/auth/entities/PasswordResetToken.entity.ts`
11. `EmailVerificationToken.ts` → `modules/auth/entities/EmailVerificationToken.entity.ts`
12. `RoleApplication.ts` → `modules/auth/entities/RoleApplication.entity.ts`

**Migration Steps**:
1. Copy entity to new location
2. Rename file to `.entity.ts`
3. Update imports (use forward refs for circular)
4. Update TypeORM decorators if needed
5. Export from index.ts

**Task Checklist**:
- [ ] Migrate all 12 entities
- [ ] Rename to `.entity.ts` convention
- [ ] Update all entity imports across codebase
- [ ] Handle circular dependencies (forward refs)
- [ ] Update TypeORM data source configuration

---

#### 6. Update Routes (3 files)

**Create New Route Files**:
```
modules/auth/routes/
├── auth.routes.ts        # POST /auth/login, /auth/register, etc.
├── user.routes.ts        # GET/POST/PUT/DELETE /users
└── role.routes.ts        # GET/POST /roles
```

**Example Route File**:
```typescript
// modules/auth/routes/auth.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { validateDto, validateQuery } from '../../../common/validation.middleware.js';
import { authenticate, requireRole } from '../../../common/middleware/auth.middleware.js';
import { LoginRequestDto } from '../dto/auth/login-request.dto.js';
import { GetUsersQueryDto } from '../dto/user/get-users-query.dto.js';

const router = Router();

// Public routes
router.post('/login', validateDto(LoginRequestDto), UserController.login);
router.post('/register', validateDto(RegisterRequestDto), UserController.register);

// Protected routes
router.use(authenticate);
router.get('/me', UserController.getCurrentUser);
router.patch('/me', validateDto(UpdateUserDto), UserController.updateCurrentUser);

// Admin routes
router.get('/users', requireRole('admin'), validateQuery(GetUsersQueryDto), UserController.getUsers);
router.post('/users', requireRole('admin'), validateDto(CreateUserDto), UserController.createUser);

export default router;
```

**Update Main Routes Config**:
```typescript
// src/config/routes.config.ts
import authRoutes from '../modules/auth/routes/auth.routes.js';
import userRoutes from '../modules/auth/routes/user.routes.js';
import roleRoutes from '../modules/auth/routes/role.routes.js';

export function registerRoutes(app: Express) {
  // AUTH module
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/roles', roleRoutes);

  // ... other modules
}
```

**Task Checklist**:
- [ ] Create auth.routes.ts
- [ ] Create user.routes.ts
- [ ] Create role.routes.ts
- [ ] Add DTO validation to all routes
- [ ] Add authentication/authorization middleware
- [ ] Update routes.config.ts
- [ ] Test all routes with Postman/curl

---

#### 7. Write Tests (Achieve 80%+ Coverage)

**Test Structure**:
```
modules/auth/tests/
├── unit/
│   ├── AuthService.test.ts
│   ├── UserService.test.ts
│   ├── TokenService.test.ts
│   └── PermissionService.test.ts
├── integration/
│   ├── auth-flow.test.ts
│   ├── user-crud.test.ts
│   └── role-management.test.ts
└── fixtures/
    ├── user.fixtures.ts
    └── role.fixtures.ts
```

**Example Test**:
```typescript
// modules/auth/tests/unit/AuthService.test.ts
import { AuthService } from '../../services/AuthService';
import { User } from '../../entities/User.entity';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('login', () => {
    it('should return token for valid credentials', async () => {
      const result = await authService.login('test@example.com', 'password123');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error for invalid credentials', async () => {
      await expect(
        authService.login('test@example.com', 'wrong')
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

**Task Checklist**:
- [ ] Write unit tests for all services
- [ ] Write integration tests for auth flow
- [ ] Write integration tests for user CRUD
- [ ] Create test fixtures
- [ ] Achieve 80%+ test coverage
- [ ] Set up CI to enforce coverage

---

#### 8. Update Dependencies & Verify

**Update Imports Across Codebase**:
```bash
# Find all files importing old auth files
grep -r "from.*controllers/userController" src --include="*.ts"
grep -r "from.*services/AuthService" src --include="*.ts"

# Update to new paths
# from '../controllers/userController' → from '../modules/auth/controllers/UserController'
```

**Run Tests**:
```bash
npm run test
npm run test:coverage
```

**Verify Build**:
```bash
npm run build
```

**Task Checklist**:
- [ ] Update all imports to new module structure
- [ ] Run full test suite (all passing)
- [ ] Verify build succeeds (0 errors)
- [ ] Manual testing of auth endpoints
- [ ] Document any breaking changes

---

### Phase B-2 Acceptance Criteria

✅ **Must have ALL of the following**:
- [ ] All 9 AUTH controllers migrated to modules/auth/controllers/
- [ ] All controllers use static methods (no instance methods)
- [ ] All controllers extend BaseController
- [ ] All business logic extracted to services
- [ ] 0 controllers with direct repository access
- [ ] All 10 services migrated to modules/auth/services/
- [ ] All services extend BaseService (where applicable)
- [ ] All 12 entities migrated to modules/auth/entities/
- [ ] 15+ DTOs created with validation decorators
- [ ] All routes use DTO validation middleware
- [ ] 80%+ test coverage (unit + integration)
- [ ] 0 circular dependencies in AUTH module
- [ ] Build passes (0 TypeScript errors)
- [ ] All tests passing
- [ ] API documentation updated

**Success Metric**: AUTH module becomes **reference implementation** for all other modules.

---

## 🟦 Phase B-3 — Commerce & Dropshipping Migration (Week 5–8)

### 목표
비즈니스 핵심 모듈(Commerce, Dropshipping) 마이그레이션

### Week 5-6: COMMERCE Module (30 files)

**Controllers (8)**:
- OrderController
- CustomerOrderController
- AdminOrderController
- PaymentController
- WishlistController
- ProductController
- CategoryController
- StorefrontController

**Services (8)**:
- OrderService
- PaymentService
- ProductService
- CommissionCalculator
- CommissionEngine
- WebhookService
- TrackingService
- SettlementScheduler

**Entities (14)**:
- Order, OrderItem, OrderEvent
- Product, Category
- Cart, CartItem
- Payment, PaymentWebhook, PaymentSettlement
- Shipment, ShipmentTrackingHistory, ShippingCarrier
- Wishlist

**Key Tasks**:
- [ ] Create modules/commerce/ structure
- [ ] Migrate all controllers (extract business logic)
- [ ] Create 30+ DTOs (order, payment, product)
- [ ] Resolve OrderService circular dependencies
- [ ] Extract webhook handling to queue pattern
- [ ] Standardize error handling

---

### Week 7-8: DROPSHIPPING Module (38 files)

**Controllers (13)**:
- SellerController
- SupplierController
- SellerProductController
- SellerDashboardController
- SupplierDashboardController
- CustomerDashboardController
- SettlementController
- AdminSupplierController
- Various entity controllers

**Services (10)**:
- SellerService
- SupplierService
- SellerAuthorizationService
- SellerDashboardService
- SupplierDashboardService
- CustomerDashboardService
- SettlementService
- CommissionEngine (shared)
- AttributionService
- SettlementEngineV2

**Entities (15)**:
- Seller, Supplier, SellerProduct
- SellerProfile, SupplierProfile
- SellerAuthorization, SellerAuthorizationAuditLog
- SellerChannelAccount
- Settlement, Commission, CommissionPolicy
- Partner, PartnerProfile, PartnerCommission
- BusinessInfo

**Key Tasks**:
- [ ] Create modules/dropshipping/ structure
- [ ] Migrate all controllers
- [ ] Create 40+ DTOs (seller, supplier, settlement)
- [ ] Resolve SettlementEngine circular dependencies
- [ ] Standardize commission calculation
- [ ] Extract dashboard logic to services
- [ ] Consolidate settlement workflows

---

## 🟨 Phase B-4 — CMS Module Refactor (Week 9–11)

### 목표
최대 규모 모듈(68+ files) 마이그레이션

**Controllers (18)**:
- CMSController
- pagesController, postsController
- templatesController
- MediaController, GalleryController
- Content controllers (Post, Media, Tag, ImageEditing)
- customFieldsController, acfController
- formController
- MenuController
- ContentController (v1)
- CPT controllers (Forms, FieldGroups, Taxonomies)

**Services (20+)**:
- MetaDataService
- menu.service, permalink.service, revision.service
- block-registry.service
- ACFRegistry
- image-processing.service, file-optimization.service
- CDNOptimizationService
- ai-block-writer.service, ai-proxy.service
- shortcode-registry.service
- (Many more...)

**Entities (30+)**:
- View, Page, Post, PostMeta, PostRevision
- Media, MediaFile, MediaFolder
- Category, Tag, Taxonomy
- Template, TemplatePart
- Menu, MenuItem, MenuLocation
- BlockPattern, ReusableBlock
- Form, FormSubmission
- ACFField, ACFFieldGroup
- CustomPost, CustomPostType, CustomField
- (And more...)

**Key Tasks**:
- [ ] Create modules/cms/ structure
- [ ] Migrate 18 controllers (high AP-1 count)
- [ ] Extract complex query logic to services
- [ ] Create 50+ DTOs (media, posts, pages, forms)
- [ ] Standardize ACF/CPT patterns
- [ ] Consolidate post routes (remove posts-base, posts-complete duplicates)
- [ ] Handle entity circular dependencies (Category↔Post, Post↔Tag)

---

## 🟪 Phase B-5 — Remaining Modules (Week 12)

### SITES Module (32 files)
**Controllers**: ThemeController, platform.controller, apps.controller, settingsController, ai-settings.controller, channels.controller, SmtpController

**Key Tasks**:
- [ ] Theme/settings management
- [ ] App installation/management
- [ ] Multi-channel integration

---

### SIGNAGE Module (10 files)
**Controllers**: SignageController
**Entities**: SignageDevice, SignageSlide, SignagePlaylist, etc.

**Key Tasks**:
- [ ] Simple domain, follow AUTH pattern
- [ ] Migrate quickly

---

### ADMIN Module (28 files)
**Controllers**: adminController, dashboardController, operations, monitoring

**Key Tasks**:
- [ ] Admin dashboard
- [ ] System operations
- [ ] Monitoring/metrics

---

### PARTNER Module (11 files)
**Controllers**: PartnerController, PartnerLinksController, PartnerAnalyticsController

**Key Tasks**:
- [ ] Partner management
- [ ] Analytics
- [ ] Commissions

---

### DEPLOYMENT Module (10 files)
**Controllers**: MigrationController, autoRecoveryController

**Key Tasks**:
- [ ] Deployment automation
- [ ] Auto-recovery
- [ ] System migrations

---

### SHARED Module (23 files)
**Services**: NotificationService, CacheService, TrackingService, etc.

**Key Tasks**:
- [ ] Extract common utilities
- [ ] Shared services
- [ ] Cross-cutting concerns

---

## 🟫 Phase B-6 — Final Integration (Week 13–14)

### 1. TypeScript Strict Mode
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

**Task**: Fix all TypeScript errors with strict mode enabled.

---

### 2. Circular Dependency Resolution

**Critical Case 1: middleware ↔ queue**
```typescript
// Before (circular)
// middleware/metrics.middleware.ts imports queues/webhook.queue.ts
// queues/webhook.queue.ts imports middleware/metrics.middleware.ts

// After (event-driven)
// Use EventEmitter pattern
eventBus.emit('metrics.recorded', { metric: 'webhook', value: 1 });
```

**Critical Case 2: app-registry ↔ google-ai**
```typescript
// Before (circular)
// services/app-registry.service.ts imports services/google-ai.service.ts
// services/google-ai.service.ts imports services/app-registry.service.ts

// After (interface extraction)
interface IAIProvider {
  generateText(prompt: string): Promise<string>;
}

class AppRegistryService {
  constructor(private aiProvider: IAIProvider) {}
}
```

**Task Checklist**:
- [ ] Resolve middleware ↔ queue circular dependency
- [ ] Resolve app-registry ↔ google-ai circular dependency
- [ ] Run madge to verify 0 circular dependencies
- [ ] Document resolution patterns

---

### 3. Import Barrel Standardization

**All modules must export through index.ts**:
```typescript
// modules/auth/index.ts
export * from './controllers/UserController.js';
export * from './services/AuthService.js';
export * from './entities/User.entity.js';
export * from './dto/index.js';
export { default as authRoutes } from './routes/auth.routes.js';
```

**Usage**:
```typescript
// Before
import { UserController } from '../../../modules/auth/controllers/UserController.js';
import { AuthService } from '../../../modules/auth/services/AuthService.js';

// After
import { UserController, AuthService } from '../../../modules/auth/index.js';
```

**Task Checklist**:
- [ ] Create index.ts for all 10 modules
- [ ] Update imports to use barrel exports
- [ ] Verify no direct deep imports

---

### 4. Module Registry

**Create Module Registry**:
```typescript
// src/modules/index.ts
import { Express } from 'express';
import authRoutes from './auth/routes/auth.routes.js';
import commerceRoutes from './commerce/routes/commerce.routes.js';
// ... import all module routes

export function registerModules(app: Express) {
  // Register all module routes
  app.use('/api/auth', authRoutes);
  app.use('/api/commerce', commerceRoutes);
  app.use('/api/dropshipping', dropshippingRoutes);
  app.use('/api/cms', cmsRoutes);
  app.use('/api/sites', sitesRoutes);
  app.use('/api/signage', signageRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/partner', partnerRoutes);
  app.use('/api/deployment', deploymentRoutes);
}
```

**Task Checklist**:
- [ ] Create modules/index.ts registry
- [ ] Update main app.ts to use registry
- [ ] Verify all routes registered
- [ ] Test API endpoints

---

### 5. Integration Testing

**Critical User Flows**:
```typescript
// tests/integration/user-flows.test.ts
describe('Critical User Flows', () => {
  it('should complete auth flow', async () => {
    // Register → Login → Get profile → Update profile
  });

  it('should complete order flow', async () => {
    // Add to cart → Checkout → Payment → Order confirmation
  });

  it('should complete CMS flow', async () => {
    // Create site → Create page → Publish → View
  });

  it('should complete dropshipping flow', async () => {
    // Import product → Set margin → Order → Settlement
  });
});
```

**Task Checklist**:
- [ ] Write integration tests for auth flow
- [ ] Write integration tests for commerce flow
- [ ] Write integration tests for CMS flow
- [ ] Write integration tests for dropshipping flow
- [ ] All integration tests passing

---

## 🟩 Definition of Done (Phase B Complete)

### Structural Requirements
- [ ] All 332 files migrated to module structure
- [ ] 10 domains with standard module layout
- [ ] All controllers extend BaseController
- [ ] All services extend BaseService (where applicable)
- [ ] All entities use `.entity.ts` naming
- [ ] All DTOs created with validation
- [ ] All routes use DTO validation middleware

### Code Quality Requirements
- [ ] 0 controllers with direct repository access (down from 39)
- [ ] 0 circular dependencies (down from 20)
- [ ] 100% controllers use static method pattern
- [ ] 80%+ test coverage (up from ~30%)
- [ ] TypeScript strict mode enabled
- [ ] Build passes with 0 errors

### Functional Requirements
- [ ] All API endpoints working
- [ ] Authentication/authorization working
- [ ] All integrations working (payments, webhooks, etc.)
- [ ] No breaking changes to public APIs
- [ ] Performance metrics unchanged or improved

### Documentation Requirements
- [ ] All modules documented
- [ ] API documentation updated (Swagger/OpenAPI)
- [ ] Migration guide created
- [ ] Pattern documentation complete
- [ ] Onboarding guide for new developers

---

## 📊 Progress Tracking

### Module Migration Progress

| Module | Files | Status | Week | Coverage |
|--------|-------|--------|------|----------|
| AUTH | 31 | ⏳ Not Started | 3-4 | 0% |
| COMMERCE | 30 | ⏳ Not Started | 5-6 | 0% |
| DROPSHIPPING | 38 | ⏳ Not Started | 7-8 | 0% |
| CMS | 68+ | ⏳ Not Started | 9-11 | 0% |
| SITES | 32 | ⏳ Not Started | 12 | 0% |
| SIGNAGE | 10 | ⏳ Not Started | 12 | 0% |
| ADMIN | 28 | ⏳ Not Started | 12 | 0% |
| PARTNER | 11 | ⏳ Not Started | 12 | 0% |
| DEPLOYMENT | 10 | ⏳ Not Started | 12 | 0% |
| SHARED | 23 | ⏳ Not Started | 12 | 0% |
| **TOTAL** | **332** | **0%** | **14 weeks** | **0%** |

---

## 🚀 Getting Started

### Prerequisites
1. Phase A completed (6,853 lines removed)
2. Pre-Phase B investigation completed
3. Phase B design document reviewed
4. Team approval obtained

### First Steps
1. Review this work order with team
2. Set up development environment
3. Create feature branch: `feature/step25-phase-b-implementation`
4. Begin Phase B-1 (Foundation Setup)
5. Follow checklist for each phase

### Daily Workflow
1. Start with task from current phase checklist
2. Make changes
3. Write/update tests
4. Run tests locally
5. Commit with descriptive message
6. Push to feature branch
7. Update progress tracking

---

## 📝 Notes

- **Do NOT skip the pilot module (AUTH)**. It validates the entire approach.
- **Test coverage is not optional**. 80% minimum for each module.
- **Circular dependencies must be resolved**. Do not proceed with known cycles.
- **DTO validation is mandatory**. All endpoints must validate input.
- **Document as you go**. Don't leave documentation for the end.

---

## 🔗 References

- Phase A Completion Report: `/docs/api-server/reports/phase_a_completion_summary.md`
- Phase B Design: `/docs/api-server/specs/phase_b_module_structure_draft.md`
- Pre-Phase B Investigation: `/docs/api-server/tasks/step25_pre_phase_b_investigation_workorder.md`
- Dependency Graph: `/docs/api-server/inventory/dependency_graph.md`

---

## ✅ End of Work Order

**Status**: Ready for implementation
**Next Action**: Begin Phase B-1 (Foundation Setup)
**Estimated Completion**: 14 weeks from start date

**Questions/Issues**: Document in `/docs/api-server/issues/phase-b-blockers.md`
