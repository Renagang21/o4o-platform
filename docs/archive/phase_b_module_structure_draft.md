> ⚠️ **ARCHIVED DOCUMENT** - Phase B 분석 문서
>
> 본 문서는 CLAUDE.md v2.0 Constitution으로 대체되었습니다.
> Phase C Baseline 이후 개발 규칙은 CLAUDE.md를 우선 참조하세요.
>
> **아카이브 일자**: 2025-12-15

---

# Step 25 Phase B: Module Structure Analysis & Refactoring Plan

**Date**: 2025-12-03
**Status**: ARCHIVED (superseded by CLAUDE.md v2.0)
**Phase**: Analysis Complete, Implementation Planning

---

## Executive Summary

### Current State (Post-Phase A)
- **79 Controllers** analyzed
- **130 Services** analyzed
- **123 Entities** analyzed
- **6,853 lines** of legacy code removed in Phase A
- **20 circular dependencies** identified (2 critical)

### Phase B Goal
Restructure API Server into clean, modular NextGen architecture with:
- Clear domain boundaries
- Service Layer pattern
- No circular dependencies
- Consistent routing structure
- DTOs for data transfer

---

## 1. Architecture Pattern Analysis

### 1.1 Current Controller → Service → Entity Pattern

#### ✅ Good Examples (NextGen Pattern)

**SellerController** (`/home/dev/o4o-platform/apps/api-server/src/controllers/SellerController.ts`):
```typescript
export class SellerController {
  // Static methods (no constructor instantiation needed)
  static async getCatalog(req: Request, res: Response): Promise<void> {
    const sellerId = (req as any).user?.id;
    const result = await sellerService.getCatalog(sellerId, filters);
    res.json({ success: true, ...result });
  }
}
```

**SellerService** (`/home/dev/o4o-platform/apps/api-server/src/services/SellerService.ts`):
```typescript
export class SellerService {
  private sellerProductRepository: Repository<SellerProduct>;
  private productRepository: Repository<Product>;
  private userRepository: Repository<User>;

  constructor() {
    // Inject repositories in constructor
    this.sellerProductRepository = AppDataSource.getRepository(SellerProduct);
    this.productRepository = AppDataSource.getRepository(Product);
    this.userRepository = AppDataSource.getRepository(User);
  }

  async getCatalog(sellerId: string, filters: CatalogFilters) {
    // Business logic here
    const query = this.productRepository.createQueryBuilder('product')...
    return { items, total, page, limit };
  }
}
```

**Pattern Strengths**:
- ✅ Controller only handles HTTP (req/res)
- ✅ Service contains business logic
- ✅ Service owns repository access
- ✅ Clear separation of concerns
- ✅ TypeScript interfaces for request/response types

---

#### ⚠️ Mixed Pattern Examples

**OrderController** (`/home/dev/o4o-platform/apps/api-server/src/controllers/OrderController.ts`):
```typescript
export class OrderController {
  private orderService: OrderService;

  constructor() {
    // Instance-based (requires 'new OrderController()')
    this.orderService = new OrderService();
  }

  getOrders = async (req: Request, res: Response, next: NextFunction) => {
    // Arrow function methods
    const userId = req.user?.id;
    const result = await this.orderService.getOrders(filters);
    res.json({ success: true, data: result.orders });
  }
}
```

**Pattern Issues**:
- ⚠️ Requires instantiation (`new OrderController()`)
- ⚠️ Arrow functions vs static methods (inconsistent)
- ✅ Still properly uses service layer

---

#### ❌ Anti-Pattern Examples

**39 Controllers directly access Repository** (from Grep results):
```typescript
export class CMSController {
  private viewRepository = AppDataSource.getRepository(View);
  private userRepository = AppDataSource.getRepository(User);

  async listViews(req: Request, res: Response) {
    // ❌ Direct repository access in controller
    const queryBuilder = this.viewRepository.createQueryBuilder('view')
      .leftJoinAndSelect('view.author', 'author')
      .leftJoinAndSelect('view.lastModifier', 'lastModifier');
    // ... business logic in controller
  }
}
```

**Problems**:
- ❌ Business logic in Controller
- ❌ No Service layer
- ❌ Direct Entity/Repository coupling
- ❌ Hard to test
- ❌ Violates Single Responsibility Principle

---

### 1.2 Route → Controller Mapping Pattern

**Good Example** (`/home/dev/o4o-platform/apps/api-server/src/routes/v2/seller.routes.ts`):
```typescript
import { Router } from 'express';
import { SellerController } from '../../controllers/SellerController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.middleware.js';

const router: Router = Router();

// Apply auth middleware
router.use(authenticateToken);
router.use(requireRole(UserRole.SELLER));

// Clean RESTful routes
router.get('/catalog', SellerController.getCatalog);
router.post('/catalog/import', SellerController.importProduct);
router.get('/products', SellerController.getSellerProducts);
router.get('/products/:id', SellerController.getSellerProduct);
router.patch('/products/:id', SellerController.updateSellerProduct);
router.delete('/products/:id', SellerController.deleteSellerProduct);

export default router;
```

**Pattern Strengths**:
- ✅ One route file per domain/controller
- ✅ Middleware composition
- ✅ RESTful naming
- ✅ Type-safe imports

---

### 1.3 DTO Usage

**Current State**: Minimal DTO usage (found 3 DTO directories):
```bash
/home/dev/o4o-platform/apps/api-server/src/dto/
├── auth/
├── customer-orders.dto.ts
├── dashboard.dto.ts
├── meta.dto.ts
└── post.dto.ts

/home/dev/o4o-platform/apps/api-server/src/modules/deployment/dto/
/home/dev/o4o-platform/apps/api-server/src/modules/sites/dto/
```

**Good Example** (where DTOs exist):
```typescript
// Services export interfaces for requests/filters
export interface CatalogFilters {
  search?: string;
  category?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
  onlyAvailable?: boolean;
}

export interface ImportProductRequest {
  productId: string;
  salePrice?: number;
  marginRate?: number;
  syncPolicy?: SyncPolicy;
}
```

**Gap**: Most controllers/services lack formal DTOs
- Services define interfaces inline (good start)
- No validation layer
- No request/response type separation

---

## 2. Module Classification by Domain

### 2.1 Domain Breakdown

Based on file analysis and naming conventions:

#### **AUTH Domain** (Authentication & Authorization)
**Controllers** (9):
- `/controllers/userController.ts`
- `/controllers/v1/userRole.controller.ts`
- `/controllers/v1/userRoleSwitch.controller.ts`
- `/controllers/v1/userActivity.controller.ts`
- `/controllers/v1/userStatistics.controller.ts`
- `/controllers/v1/businessInfo.controller.ts`
- `/controllers/UserManagementController.ts`
- `/controllers/approvalController.ts`
- `/controllers/admin/adminApprovalController.ts`

**Services** (10+):
- `/services/AuthService.ts`
- `/services/RefreshTokenService.ts`
- `/services/authentication.service.ts`
- `/services/LoginSecurityService.ts`
- `/services/PermissionService.ts`
- `/services/AuthorizationGateService.ts`
- `/services/account-linking.service.ts`
- `/services/socialAuthService.ts`
- `/services/sessionSyncService.ts`
- `/services/approval-workflow.service.ts`

**Entities** (12):
- `/entities/User.ts`
- `/entities/UserSession.ts`
- `/entities/UserActivityLog.ts`
- `/entities/UserAction.ts`
- `/entities/RefreshToken.ts`
- `/entities/LinkedAccount.ts`
- `/entities/LinkingSession.ts`
- `/entities/AccountActivity.ts`
- `/entities/LoginAttempt.ts`
- `/entities/PasswordResetToken.ts`
- `/entities/EmailVerificationToken.ts`
- `/entities/RoleApplication.ts`

---

#### **COMMERCE Domain** (Orders, Payments, Cart)
**Controllers** (8):
- `/controllers/OrderController.ts`
- `/controllers/CustomerOrderController.ts`
- `/controllers/AdminOrderController.ts`
- `/controllers/PaymentController.ts`
- `/controllers/WishlistController.ts`
- `/controllers/ProductController.ts`
- `/controllers/CategoryController.ts`
- `/controllers/StorefrontController.ts`

**Services** (8):
- `/services/OrderService.ts`
- `/services/PaymentService.ts`
- `/services/ProductService.ts`
- `/services/CommissionCalculator.ts`
- `/services/CommissionEngine.ts`
- `/services/WebhookService.ts`
- `/services/TrackingService.ts`
- `/services/SettlementScheduler.ts`

**Entities** (14):
- `/entities/Order.ts`
- `/entities/OrderItem.ts`
- `/entities/OrderEvent.ts`
- `/entities/Product.ts`
- `/entities/Category.ts`
- `/entities/Cart.ts`
- `/entities/CartItem.ts`
- `/entities/Payment.ts`
- `/entities/PaymentWebhook.ts`
- `/entities/PaymentSettlement.ts`
- `/entities/Shipment.ts`
- `/entities/ShipmentTrackingHistory.ts`
- `/entities/ShippingCarrier.ts`
- `/entities/Wishlist.ts`

---

#### **DROPSHIPPING Domain** (Sellers, Suppliers, Settlements)
**Controllers** (13):
- `/controllers/SellerController.ts`
- `/controllers/SupplierController.ts`
- `/controllers/SellerProductController.ts`
- `/controllers/SellerSettlementController.ts`
- `/controllers/SupplierSettlementController.ts`
- `/controllers/entity/SupplierDashboardController.ts`
- `/controllers/entity/SupplierEntityController.ts`
- `/controllers/entity/SettlementEntityController.ts`
- `/controllers/admin/AdminSupplierController.ts`
- `/controllers/admin/AdminSettlementController.ts`
- `/controllers/cpt/DropshippingCPTController.ts`
- `/controllers/SellerDashboardController.ts` (if exists)
- `/controllers/CustomerDashboardController.ts`

**Services** (10):
- `/services/SellerService.ts`
- `/services/SellerAuthorizationService.ts`
- `/services/SellerDashboardService.ts`
- `/services/SupplierDashboardService.ts` (if exists)
- `/services/CustomerDashboardService.ts`
- `/services/CommissionCalculator.ts` (shared with commerce)
- `/services/CommissionEngine.ts` (shared with commerce)
- `/services/SettlementScheduler.ts` (shared with commerce)
- `/services/AttributionService.ts`
- `/services/settlement-engine/index.ts`

**Entities** (15):
- `/entities/Seller.ts`
- `/entities/Supplier.ts`
- `/entities/SellerProduct.ts`
- `/entities/SellerProfile.ts`
- `/entities/SupplierProfile.ts`
- `/entities/SellerAuthorization.ts`
- `/entities/SellerAuthorizationAuditLog.ts`
- `/entities/SellerChannelAccount.ts`
- `/entities/Settlement.ts`
- `/entities/Commission.ts`
- `/entities/CommissionPolicy.ts`
- `/entities/Partner.ts`
- `/entities/PartnerProfile.ts`
- `/entities/PartnerCommission.ts`
- `/entities/BusinessInfo.ts`

---

#### **CMS Domain** (Content Management)
**Controllers** (18):
- `/controllers/CMSController.ts`
- `/controllers/pagesController.ts`
- `/controllers/postsController.ts`
- `/controllers/templatesController.ts`
- `/controllers/MediaController.ts`
- `/controllers/GalleryController.ts`
- `/controllers/content/PostController.ts`
- `/controllers/content/MediaController.ts`
- `/controllers/content/TagController.ts`
- `/controllers/content/ImageEditingController.ts`
- `/controllers/customFieldsController.ts`
- `/controllers/acfController.ts`
- `/controllers/formController.ts`
- `/controllers/menu/MenuController.ts`
- `/controllers/v1/content.controller.ts`
- `/controllers/cpt/FormsController.ts`
- `/controllers/cpt/FieldGroupsController.ts`
- `/controllers/cpt/TaxonomiesController.ts`

**Services** (20+):
- `/services/MetaDataService.ts`
- `/services/menu.service.ts`
- `/services/permalink.service.ts`
- `/services/revision.service.ts`
- `/services/block-registry.service.ts`
- `/services/ACFRegistry.ts`
- `/services/image-processing.service.ts`
- `/services/file-optimization.service.ts`
- `/services/CDNOptimizationService.ts`
- `/services/ai-block-writer.service.ts`
- `/services/ai-proxy.service.ts`
- `/services/shortcode-registry.service.ts`
- (Plus many more in `/services/`)

**Entities** (30+):
- `/entities/View.ts`
- `/entities/Page.ts`
- `/entities/Post.ts`
- `/entities/PostMeta.ts`
- `/entities/PostRevision.ts`
- `/entities/PostAutosave.ts`
- `/entities/PageRevision.ts`
- `/entities/Media.ts`
- `/entities/MediaFile.ts`
- `/entities/MediaFolder.ts`
- `/entities/Category.ts`
- `/entities/Tag.ts`
- `/entities/Taxonomy.ts`
- `/entities/Template.ts`
- `/entities/TemplatePart.ts`
- `/entities/Menu.ts`
- `/entities/MenuItem.ts`
- `/entities/MenuLocation.ts`
- `/entities/BlockPattern.ts`
- `/entities/ReusableBlock.ts`
- `/entities/Form.ts`
- `/entities/FormSubmission.ts`
- `/entities/FormPreset.ts`
- `/entities/ViewPreset.ts`
- `/entities/TemplatePreset.ts`
- `/entities/ACFField.ts`
- `/entities/ACFFieldGroup.ts`
- `/entities/CustomPost.ts`
- `/entities/CustomPostType.ts`
- `/entities/CustomField.ts`

---

#### **SITES Domain** (Multi-site Management)
**Controllers** (7):
- `/controllers/ThemeController.ts`
- `/controllers/v1/platform.controller.ts`
- `/controllers/apps.controller.ts`
- `/controllers/settingsController.ts`
- `/controllers/v1/ai-settings.controller.ts`
- `/controllers/v1/channels.controller.ts`
- `/controllers/SmtpController.ts`

**Services** (10):
- `/services/ThemeService.ts`
- `/services/settingsService.ts`
- `/services/AppManager.ts`
- `/services/AppDependencyResolver.ts`
- `/services/app-registry.service.ts`
- `/services/AppDataCleaner.ts`
- `/services/shadow-mode.service.ts`
- (Plus deployment-related services)

**Entities** (15):
- `/entities/Settings.ts`
- `/entities/Theme.ts`
- `/entities/App.ts`
- `/entities/AppInstance.ts`
- `/entities/AppUsageLog.ts`
- `/entities/Store.ts`
- `/entities/WidgetArea.ts`
- `/entities/SmtpSettings.ts`
- `/entities/AiSettings.ts`
- `/entities/AISetting.ts`
- `/entities/ExternalChannel.ts`
- `/entities/ChannelProductLink.ts`
- `/entities/ChannelOrderLink.ts`
- `/entities/UrlRedirect.ts`
- (Plus deployment entities)

---

#### **SIGNAGE Domain** (Digital Signage)
**Controllers** (1):
- `/controllers/SignageController.ts`

**Services** (1):
- `/services/SignageService.ts`

**Entities** (6):
- `/entities/SignageDevice.ts`
- `/entities/SignageSlide.ts`
- `/entities/SignagePlaylist.ts`
- `/entities/SignageSchedule.ts`
- `/entities/SignageContent.ts`
- `/entities/StorePlaylist.ts`
- `/entities/PlaylistItem.ts`
- `/entities/ScreenTemplate.ts`

---

#### **ADMIN Domain** (Admin Dashboard & Operations)
**Controllers** (10):
- `/controllers/adminController.ts`
- `/controllers/dashboardController.ts`
- `/controllers/admin/AdminUserController.ts`
- `/controllers/admin/AdminSupplierController.ts`
- `/controllers/admin/AdminSettlementController.ts`
- `/controllers/admin/AdminJobController.ts`
- `/controllers/admin/adminApprovalController.ts`
- `/controllers/admin/adminStatsController.ts`
- `/controllers/operationsController.ts`
- `/controllers/monitoringController.ts`

**Services** (8):
- `/services/OperationsService.ts`
- `/services/BackupService.ts`
- `/services/AutoRecoveryService.ts`
- `/services/ErrorAlertService.ts`
- `/services/prometheus-metrics.service.ts`
- `/services/PerformanceMonitoringInitializer.ts`
- `/services/ai-job-queue.service.ts`
- `/services/ai-usage-report.service.ts`

**Entities** (10):
- `/entities/ApprovalLog.ts`
- `/entities/AuditLog.ts`
- `/entities/SystemMetrics.ts`
- `/entities/OperationsDashboard.ts`
- `/entities/StatusPage.ts`
- `/entities/Alert.ts`
- `/entities/AnalyticsReport.ts`
- `/entities/WorkflowState.ts`
- `/entities/WorkflowTransition.ts`
- `/entities/AIUsageLog.ts`

---

#### **SHARED Domain** (Utilities, Common Services)
**Services** (15):
- `/services/NotificationService.ts`
- `/services/CacheService.ts`
- `/services/TrackingService.ts`
- `/services/profileCompletenessService.ts`
- `/services/EmailService.ts` (if exists)
- (Cache services)
- (Logger utils)
- (Validation utils)

**Entities** (8):
- `/entities/Notification.ts`
- `/entities/NotificationTemplate.ts`
- `/entities/EmailLog.ts`
- `/entities/ContentUsageLog.ts`
- `/entities/AutomationLog.ts`
- `/entities/AutomationRule.ts`
- `/entities/AIReference.ts`
- `/entities/KycDocument.ts`

---

### 2.2 Module Statistics Summary

| Domain | Controllers | Services | Entities | Total Files |
|--------|-------------|----------|----------|-------------|
| **AUTH** | 9 | 10 | 12 | 31 |
| **COMMERCE** | 8 | 8 | 14 | 30 |
| **DROPSHIPPING** | 13 | 10 | 15 | 38 |
| **CMS** | 18 | 20+ | 30+ | 68+ |
| **SITES** | 7 | 10 | 15 | 32 |
| **SIGNAGE** | 1 | 1 | 8 | 10 |
| **ADMIN** | 10 | 8 | 10 | 28 |
| **SHARED** | 0 | 15 | 8 | 23 |
| **PARTNER** | 4 | 2 | 5 | 11 |
| **DEPLOYMENT** | 2 | 5 | 3 | 10 |
| **TOTAL** | **79** | **130** | **123** | **332** |

**Notes**:
- CMS domain is largest (68+ files)
- Dropshipping domain is complex (38 files, cross-cutting)
- Auth domain is well-defined (31 files)
- Some files serve multiple domains (counted once in primary domain)

---

## 3. Anti-Patterns Detected

### 3.1 Critical Anti-Patterns

#### **AP-1: Controller Direct Repository Access**
**Severity**: 🔴 Critical
**Count**: 39 controllers

**Example**:
```typescript
// ❌ Bad: CMSController.ts
export class CMSController {
  private viewRepository = AppDataSource.getRepository(View);

  async listViews(req: Request, res: Response) {
    const queryBuilder = this.viewRepository.createQueryBuilder('view')
      .leftJoinAndSelect('view.author', 'author');
    // ... 50 lines of business logic ...
  }
}
```

**Impact**:
- ❌ Business logic in HTTP layer
- ❌ Cannot reuse logic elsewhere
- ❌ Hard to test (requires HTTP mocking)
- ❌ Violates Single Responsibility Principle

**Solution**:
```typescript
// ✅ Good: Extract to CMSService
export class CMSService {
  private viewRepository: Repository<View>;

  constructor() {
    this.viewRepository = AppDataSource.getRepository(View);
  }

  async listViews(filters: ViewFilters): Promise<ViewListResult> {
    const queryBuilder = this.viewRepository.createQueryBuilder('view')
      .leftJoinAndSelect('view.author', 'author');
    // ... business logic ...
    return { views, total, pagination };
  }
}

export class CMSController {
  static async listViews(req: Request, res: Response) {
    const filters = extractFilters(req.query);
    const result = await cmsService.listViews(filters);
    res.json({ success: true, ...result });
  }
}
```

**Affected Controllers**: (39 files need refactoring)
- CMSController.ts
- StorefrontController.ts
- GalleryController.ts
- MediaController.ts
- analyticsController.ts
- (34 more...)

---

#### **AP-2: Inconsistent Controller Patterns**
**Severity**: 🟡 Medium
**Count**: Mixed across codebase

**Pattern A: Static Methods** (Preferred)
```typescript
export class SellerController {
  static async getCatalog(req: Request, res: Response): Promise<void> {
    // Used directly in routes
  }
}
```

**Pattern B: Instance Methods**
```typescript
export class OrderController {
  private orderService: OrderService;
  constructor() { this.orderService = new OrderService(); }

  getOrders = async (req: Request, res: Response) => {
    // Requires instantiation in routes
  }
}
```

**Pattern C: Hybrid** (Found in some controllers)
```typescript
export class MixedController {
  static async staticMethod(req, res) {}
  instanceMethod = async (req, res) => {}
}
```

**Problem**: Inconsistency makes codebase harder to learn and maintain.

**Solution**: Standardize on **Pattern A (Static Methods)**:
- Simpler (no instantiation)
- Stateless (functional approach)
- Easier to test
- Aligns with modern controller patterns

---

#### **AP-3: Circular Dependencies**
**Severity**: 🔴 Critical (2 cases), 🟡 Medium (18 cases)
**Count**: 20 total

**Critical Cases**:
1. **Service ↔ Service**:
   - `OrderService` → `SettlementEngine` → `OrderService`
   - `CommissionCalculator` ↔ `SellerService`

2. **Middleware ↔ Queue**:
   - Auth middleware → Job queue → Auth service → Middleware

**Impact**:
- ❌ Module initialization failures
- ❌ Runtime errors (undefined imports)
- ❌ Hard to test in isolation
- ❌ Memory leaks (circular references)

**Solution**:
- Extract shared interfaces
- Use event-driven architecture (publish/subscribe)
- Introduce dependency injection container
- Apply Dependency Inversion Principle

---

#### **AP-4: Missing Service Layer**
**Severity**: 🟡 Medium
**Count**: 39 controllers (overlap with AP-1)

**Pattern**: Controller does both HTTP handling AND business logic.

**Solution**: Always introduce Service layer:
```typescript
// Before (❌)
export class SomeController {
  async action(req, res) {
    const data = await repository.find(...);
    const processed = complexBusinessLogic(data);
    res.json(processed);
  }
}

// After (✅)
export class SomeService {
  async performAction(filters): Promise<Result> {
    const data = await this.repository.find(...);
    return complexBusinessLogic(data);
  }
}

export class SomeController {
  static async action(req, res) {
    const result = await someService.performAction(filters);
    res.json({ success: true, data: result });
  }
}
```

---

#### **AP-5: Missing DTOs**
**Severity**: 🟡 Medium
**Count**: Most controllers lack formal DTOs

**Current State**: Inline interfaces in services (good start, but incomplete)
```typescript
export interface CatalogFilters {
  search?: string;
  page?: number;
}
```

**Gap**:
- No validation layer
- No request/response type separation
- No transformation layer

**Solution**: Introduce DTO layer with validation:
```typescript
// dto/seller.dto.ts
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class GetCatalogRequestDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CatalogItemDto {
  id: string;
  name: string;
  basePrice: number;
  // ... mapped from entity
}

export class GetCatalogResponseDto {
  items: CatalogItemDto[];
  total: number;
  page: number;
  totalPages: number;
}
```

---

### 3.2 Anti-Pattern Summary Table

| ID | Anti-Pattern | Severity | Count | Effort to Fix |
|----|--------------|----------|-------|---------------|
| AP-1 | Controller Direct Repo Access | 🔴 Critical | 39 | High (2-4 weeks) |
| AP-2 | Inconsistent Controller Pattern | 🟡 Medium | Mixed | Medium (1-2 weeks) |
| AP-3 | Circular Dependencies | 🔴 Critical | 2 (critical)<br>18 (medium) | High (2-3 weeks) |
| AP-4 | Missing Service Layer | 🟡 Medium | 39 | High (overlaps AP-1) |
| AP-5 | Missing DTOs | 🟡 Medium | ~70 | Medium (2-3 weeks) |

**Total Estimated Effort**: 8-12 weeks (for all anti-patterns)

---

## 4. NextGen Module Structure Template

### 4.1 Standard Module Layout

```
apps/api-server/src/modules/<domain>/
├── controllers/
│   ├── <Domain>Controller.ts           # HTTP handlers (static methods)
│   └── <SubDomain>Controller.ts
├── services/
│   ├── <Domain>Service.ts              # Business logic
│   └── <SubDomain>Service.ts
├── dto/
│   ├── <domain>-request.dto.ts         # Request DTOs with validation
│   ├── <domain>-response.dto.ts        # Response DTOs
│   └── <domain>-filters.dto.ts         # Filter/query DTOs
├── entities/
│   ├── <Domain>.entity.ts              # TypeORM entities
│   └── <SubDomain>.entity.ts
├── repositories/
│   └── <Domain>Repository.ts           # Custom repo methods (optional)
├── interfaces/
│   └── <domain>.interface.ts           # Shared interfaces
├── routes/
│   └── <domain>.routes.ts              # Express routes
├── middleware/
│   └── <domain>.middleware.ts          # Domain-specific middleware
├── utils/
│   └── <domain>.utils.ts               # Domain utilities
├── tests/
│   ├── <Domain>Controller.test.ts
│   ├── <Domain>Service.test.ts
│   └── <Domain>Integration.test.ts
└── index.ts                            # Module exports
```

---

### 4.2 Example: AUTH Module Structure

```
apps/api-server/src/modules/auth/
├── controllers/
│   ├── AuthController.ts               # Login, logout, token refresh
│   ├── UserController.ts               # User CRUD
│   └── RoleController.ts               # Role management
├── services/
│   ├── AuthService.ts                  # Authentication logic
│   ├── AuthorizationService.ts         # Permission checks
│   ├── UserService.ts                  # User management
│   └── SessionService.ts               # Session handling
├── dto/
│   ├── login-request.dto.ts
│   ├── login-response.dto.ts
│   ├── user-create.dto.ts
│   ├── user-update.dto.ts
│   └── role-filters.dto.ts
├── entities/
│   ├── User.entity.ts
│   ├── UserSession.entity.ts
│   ├── RefreshToken.entity.ts
│   ├── LoginAttempt.entity.ts
│   └── RoleApplication.entity.ts
├── repositories/
│   └── UserRepository.ts               # Custom queries
├── interfaces/
│   ├── auth-tokens.interface.ts
│   └── user-role.interface.ts
├── routes/
│   ├── auth.routes.ts                  # POST /auth/login, etc.
│   ├── user.routes.ts                  # GET /users/:id, etc.
│   └── role.routes.ts                  # GET /roles, etc.
├── middleware/
│   ├── auth.middleware.ts              # authenticateToken
│   └── role.middleware.ts              # requireRole
├── utils/
│   ├── token.utils.ts                  # JWT helpers
│   └── password.utils.ts               # bcrypt helpers
├── tests/
│   ├── AuthController.test.ts
│   ├── AuthService.test.ts
│   └── AuthIntegration.test.ts
└── index.ts
```

**index.ts** (Module barrel export):
```typescript
// controllers
export * from './controllers/AuthController.js';
export * from './controllers/UserController.js';
export * from './controllers/RoleController.js';

// services
export * from './services/AuthService.js';
export * from './services/UserService.js';

// dto
export * from './dto/login-request.dto.js';
export * from './dto/user-create.dto.js';

// entities
export * from './entities/User.entity.js';
export * from './entities/UserSession.entity.js';

// routes
export { default as authRoutes } from './routes/auth.routes.js';
export { default as userRoutes } from './routes/user.routes.js';
```

---

### 4.3 Example: COMMERCE Module Structure

```
apps/api-server/src/modules/commerce/
├── controllers/
│   ├── OrderController.ts
│   ├── ProductController.ts
│   ├── PaymentController.ts
│   ├── CartController.ts
│   └── CategoryController.ts
├── services/
│   ├── OrderService.ts
│   ├── ProductService.ts
│   ├── PaymentService.ts
│   ├── CartService.ts
│   ├── InventoryService.ts
│   └── CommissionService.ts
├── dto/
│   ├── order/
│   │   ├── create-order.dto.ts
│   │   ├── order-filters.dto.ts
│   │   └── order-response.dto.ts
│   ├── product/
│   │   ├── create-product.dto.ts
│   │   ├── product-filters.dto.ts
│   │   └── product-response.dto.ts
│   └── payment/
│       ├── create-payment.dto.ts
│       └── payment-webhook.dto.ts
├── entities/
│   ├── Order.entity.ts
│   ├── OrderItem.entity.ts
│   ├── OrderEvent.entity.ts
│   ├── Product.entity.ts
│   ├── Category.entity.ts
│   ├── Cart.entity.ts
│   ├── CartItem.entity.ts
│   ├── Payment.entity.ts
│   └── Shipment.entity.ts
├── repositories/
│   ├── OrderRepository.ts
│   └── ProductRepository.ts
├── interfaces/
│   ├── order.interface.ts
│   └── payment.interface.ts
├── routes/
│   ├── order.routes.ts
│   ├── product.routes.ts
│   ├── payment.routes.ts
│   └── cart.routes.ts
├── middleware/
│   └── order-validation.middleware.ts
├── utils/
│   ├── order-number-generator.ts
│   └── commission-calculator.ts
└── index.ts
```

---

### 4.4 Example: DROPSHIPPING Module Structure

```
apps/api-server/src/modules/dropshipping/
├── controllers/
│   ├── SellerController.ts
│   ├── SupplierController.ts
│   ├── SellerProductController.ts
│   └── SettlementController.ts
├── services/
│   ├── SellerService.ts
│   ├── SupplierService.ts
│   ├── SellerAuthorizationService.ts
│   ├── SettlementService.ts
│   └── CommissionEngine.ts
├── dto/
│   ├── seller/
│   │   ├── import-product.dto.ts
│   │   ├── catalog-filters.dto.ts
│   │   └── seller-stats.dto.ts
│   ├── supplier/
│   │   ├── supplier-filters.dto.ts
│   │   └── supplier-dashboard.dto.ts
│   └── settlement/
│       ├── settlement-filters.dto.ts
│       └── settlement-report.dto.ts
├── entities/
│   ├── Seller.entity.ts
│   ├── Supplier.entity.ts
│   ├── SellerProduct.entity.ts
│   ├── SellerAuthorization.entity.ts
│   ├── Settlement.entity.ts
│   ├── Partner.entity.ts
│   └── Commission.entity.ts
├── repositories/
│   ├── SellerRepository.ts
│   └── SettlementRepository.ts
├── interfaces/
│   ├── seller.interface.ts
│   └── settlement.interface.ts
├── routes/
│   ├── seller.routes.ts
│   ├── supplier.routes.ts
│   └── settlement.routes.ts
├── middleware/
│   └── seller-authorization.middleware.ts
├── utils/
│   ├── margin-calculator.ts
│   └── commission-policy.ts
└── index.ts
```

---

## 5. Migration Strategy (Phase B Implementation)

### 5.1 Phased Approach

#### **Phase B-1: Foundation** (Week 1-2)
**Goal**: Set up module structure and patterns

**Tasks**:
1. Create module directories for all 10 domains
2. Set up DTO validation infrastructure (class-validator)
3. Create standard templates for:
   - Controller (static method pattern)
   - Service (constructor injection pattern)
   - DTO (with validation decorators)
4. Document NextGen patterns in `/docs/dev/patterns/`

**Deliverables**:
- Module directory structure
- Template files
- Pattern documentation
- Code style guide

---

#### **Phase B-2: Pilot Module (AUTH)** (Week 3-4)
**Goal**: Fully migrate AUTH module as reference implementation

**Why AUTH?**:
- Well-defined boundaries
- Medium complexity (31 files)
- Critical for all other modules
- Already has some DTO usage

**Tasks**:
1. **Week 3**:
   - Create `/modules/auth/` structure
   - Migrate 9 controllers (standardize to static methods)
   - Extract business logic to services (if missing)
   - Create all DTOs with validation

2. **Week 4**:
   - Migrate 10 services
   - Migrate 12 entities
   - Update routes to use new structure
   - Write tests (unit + integration)
   - Update imports across codebase

**Acceptance Criteria**:
- ✅ All AUTH controllers use static methods
- ✅ All AUTH logic in services
- ✅ All requests/responses use DTOs
- ✅ 80%+ test coverage
- ✅ No circular dependencies
- ✅ All tests passing

---

#### **Phase B-3: Critical Modules (COMMERCE, DROPSHIPPING)** (Week 5-8)
**Goal**: Migrate business-critical modules

**Week 5-6: COMMERCE Module** (30 files)
- Migrate order/payment/product controllers
- Extract complex logic from controllers
- Create DTOs for all API endpoints
- Resolve OrderService circular dependencies

**Week 7-8: DROPSHIPPING Module** (38 files)
- Migrate seller/supplier/settlement controllers
- Extract commission/margin logic
- Create DTOs for dropshipping workflows
- Resolve SettlementEngine circular dependencies

---

#### **Phase B-4: Content Modules (CMS, SITES)** (Week 9-11)
**Goal**: Migrate large content management modules

**Week 9-10: CMS Module** (68+ files - largest)
- Migrate 18 controllers (high AP-1 count)
- Extract complex query logic to services
- Create DTOs for media, posts, pages
- Standardize ACF/CPT patterns

**Week 11: SITES Module** (32 files)
- Migrate theme/settings controllers
- Extract app management logic
- Create DTOs for configuration

---

#### **Phase B-5: Remaining Modules** (Week 12)
**Goal**: Complete migration for all remaining modules

**Modules**:
- SIGNAGE (10 files - simple)
- ADMIN (28 files)
- PARTNER (11 files)
- DEPLOYMENT (10 files)
- SHARED (23 files)

**Strategy**: Apply learned patterns from previous modules

---

#### **Phase B-6: Validation & Optimization** (Week 13-14)
**Goal**: Ensure quality and performance

**Tasks**:
1. **Validation**:
   - Run full test suite (all modules)
   - Integration tests between modules
   - Load testing
   - Security audit

2. **Optimization**:
   - Remove dead code
   - Optimize circular dependency resolutions
   - Cache optimization
   - Query optimization

3. **Documentation**:
   - API documentation (Swagger/OpenAPI)
   - Module dependency map
   - Migration guide for future modules
   - Onboarding guide for new developers

**Deliverables**:
- ✅ All 332 files migrated
- ✅ 0 circular dependencies
- ✅ 0 anti-patterns (AP-1 to AP-5 resolved)
- ✅ 80%+ test coverage
- ✅ Complete documentation

---

### 5.2 Risk Mitigation

#### **Risk 1: Breaking Existing APIs**
**Mitigation**:
- Keep old routes active during migration
- Use feature flags for gradual rollout
- Extensive integration testing
- Rollback plan for each phase

#### **Risk 2: Circular Dependency Resolution**
**Mitigation**:
- Tackle critical circular deps first (B-3)
- Use dependency injection container (TypeDI or TSyringe)
- Apply event-driven patterns where appropriate
- Refactor shared logic into separate modules

#### **Risk 3: Timeline Overrun**
**Mitigation**:
- Pilot module (AUTH) validates timeline estimates
- Adjust scope if needed after pilot
- Parallel work on independent modules
- Defer non-critical optimizations to Phase C

#### **Risk 4: Test Coverage Gaps**
**Mitigation**:
- Write tests as part of migration (not after)
- Enforce 80% coverage as acceptance criteria
- Use TDD for new DTOs and services
- Integration tests for module boundaries

---

## 6. Module Boundaries & Dependencies

### 6.1 Dependency Map (Current State)

```
┌─────────┐
│  AUTH   │─────┐
└─────────┘     │
                ▼
            ┌───────────┐
            │   ADMIN   │
            └───────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
┌──────────────┐   ┌─────────┐
│  COMMERCE    │◄──│   CMS   │
└──────────────┘   └─────────┘
        │               │
        ▼               ▼
┌──────────────┐   ┌─────────┐
│DROPSHIPPING  │   │  SITES  │
└──────────────┘   └─────────┘
        │
        ▼
┌──────────────┐
│   SIGNAGE    │
└──────────────┘
        │
        ▼
┌──────────────┐
│   SHARED     │ ◄── (Used by all modules)
└──────────────┘
```

**Key Dependencies**:
- **AUTH** → Used by all modules (authentication)
- **SHARED** → Used by all modules (utils, notifications, caching)
- **COMMERCE** ↔ **DROPSHIPPING** → Heavy coupling (needs refactoring)
- **CMS** ↔ **SITES** → Content management coupling
- **ADMIN** → Depends on all modules (monitoring/management)

---

### 6.2 Circular Dependency Resolution Plan

#### **Critical Case 1: OrderService ↔ SettlementEngine**

**Current Problem**:
```typescript
// OrderService.ts
import { SettlementEngine } from './settlement-engine/index.js';

class OrderService {
  async updateOrderStatus(orderId, status) {
    // ...
    if (status === 'DELIVERED') {
      await this.settlementEngine.runOnOrderCompleted(orderId);
    }
  }
}

// SettlementEngine.ts
import { OrderService } from '../OrderService.js';

class SettlementEngine {
  async runOnOrderCompleted(orderId) {
    const order = await this.orderService.getOrderById(orderId);
    // ...
  }
}
```

**Solution: Event-Driven Pattern**
```typescript
// OrderService.ts
import { EventEmitter } from 'events';

class OrderService {
  private eventEmitter: EventEmitter;

  async updateOrderStatus(orderId, status) {
    // ...
    if (status === 'DELIVERED') {
      this.eventEmitter.emit('order.delivered', { orderId });
    }
  }
}

// SettlementEngine.ts
import { EventEmitter } from 'events';
import { OrderRepository } from '../repositories/OrderRepository.js';

class SettlementEngine {
  private orderRepository: OrderRepository;

  constructor(eventEmitter: EventEmitter) {
    // Subscribe to events
    eventEmitter.on('order.delivered', this.handleOrderDelivered.bind(this));
  }

  private async handleOrderDelivered({ orderId }) {
    const order = await this.orderRepository.findById(orderId);
    // ... generate settlement
  }
}
```

**Benefits**:
- ✅ No circular import
- ✅ Loose coupling
- ✅ Easy to test
- ✅ Can add more listeners without changing OrderService

---

#### **Critical Case 2: CommissionCalculator ↔ SellerService**

**Solution: Extract to Interface**
```typescript
// interfaces/product-info.interface.ts
export interface IProductInfoProvider {
  getProductInfo(productId: string): Promise<ProductInfo>;
}

// CommissionCalculator.ts
import { IProductInfoProvider } from '../interfaces/product-info.interface.js';

class CommissionCalculator {
  constructor(private productProvider: IProductInfoProvider) {}

  async calculateForItem(productId: string, ...) {
    const product = await this.productProvider.getProductInfo(productId);
    // ...
  }
}

// SellerService.ts (implements interface)
class SellerService implements IProductInfoProvider {
  async getProductInfo(productId: string): Promise<ProductInfo> {
    return this.productRepository.findOne({ where: { id: productId } });
  }
}

// Dependency injection
const sellerService = new SellerService();
const commissionCalculator = new CommissionCalculator(sellerService);
```

**Benefits**:
- ✅ No circular import
- ✅ Dependency Inversion Principle
- ✅ Can mock in tests
- ✅ Can swap implementations

---

### 6.3 Module Communication Patterns

#### **Pattern 1: Direct Service Call** (Same Module)
```typescript
// Within same module, direct calls are OK
class OrderController {
  static async createOrder(req, res) {
    const order = await orderService.createOrder(req.body);
    res.json({ success: true, data: order });
  }
}
```

#### **Pattern 2: Shared Interface** (Cross-Module, Sync)
```typescript
// Use interfaces for cross-module dependencies
import { IProductService } from '../commerce/interfaces/product-service.interface.js';

class DropshippingService {
  constructor(private productService: IProductService) {}

  async importProduct(productId: string) {
    const product = await this.productService.getProductById(productId);
    // ...
  }
}
```

#### **Pattern 3: Event Bus** (Cross-Module, Async)
```typescript
// Use events for async cross-module communication
eventBus.emit('order.created', {
  orderId: order.id,
  buyerId: order.buyerId,
  total: order.summary.total
});

// In another module
eventBus.on('order.created', async ({ orderId }) => {
  await notificationService.sendOrderConfirmation(orderId);
});
```

#### **Pattern 4: Message Queue** (Cross-Module, Async, Reliable)
```typescript
// Use queue for critical async operations
await queue.add('settlement.calculate', {
  orderId: order.id,
  settlementDate: new Date()
});

// Worker processes queue
queue.process('settlement.calculate', async (job) => {
  await settlementEngine.generateSettlement(job.data);
});
```

---

## 7. Action Items for Phase B Implementation

### 7.1 Immediate Actions (Week 1)

#### **Infrastructure Setup**
- [ ] Create module directory structure (`/modules/auth/`, `/modules/commerce/`, etc.)
- [ ] Install dependencies:
  - [ ] `class-validator` (DTO validation)
  - [ ] `class-transformer` (DTO transformation)
  - [ ] `reflect-metadata` (decorator support)
  - [ ] `typedi` or `tsyringe` (dependency injection)
  - [ ] `eventemitter3` (event bus)
- [ ] Set up template files:
  - [ ] `templates/controller.template.ts`
  - [ ] `templates/service.template.ts`
  - [ ] `templates/dto.template.ts`
  - [ ] `templates/test.template.ts`

#### **Documentation**
- [ ] Write NextGen architecture guide (`/docs/dev/patterns/nextgen-architecture.md`)
- [ ] Write DTO usage guide (`/docs/dev/patterns/dto-guide.md`)
- [ ] Write testing guide (`/docs/dev/patterns/testing-guide.md`)
- [ ] Write migration checklist (`/docs/dev/patterns/migration-checklist.md`)

#### **Code Quality**
- [ ] Set up ESLint rules for module structure
- [ ] Set up pre-commit hooks for validation
- [ ] Configure test coverage reporting (aim for 80%)

---

### 7.2 Pilot Module Checklist (AUTH - Week 3-4)

#### **Week 3: Structure & Controllers**
- [ ] Create `/modules/auth/` directory structure
- [ ] Migrate controllers (9 files):
  - [ ] Refactor to static methods
  - [ ] Extract business logic to services
  - [ ] Add error handling
- [ ] Create DTOs (15+ files):
  - [ ] Login request/response
  - [ ] User CRUD DTOs
  - [ ] Role management DTOs
  - [ ] Add validation decorators

#### **Week 4: Services & Testing**
- [ ] Migrate services (10 files):
  - [ ] Standardize constructor injection
  - [ ] Remove circular dependencies
  - [ ] Add service tests
- [ ] Migrate entities (12 files):
  - [ ] Rename to `.entity.ts`
  - [ ] Update imports
- [ ] Update routes (3 files):
  - [ ] Use new controller structure
  - [ ] Add DTO validation middleware
- [ ] Write tests:
  - [ ] Unit tests for services
  - [ ] Integration tests for routes
  - [ ] Achieve 80%+ coverage
- [ ] Update dependencies:
  - [ ] Fix all imports across codebase
  - [ ] Run full test suite
  - [ ] Verify no regressions

#### **Acceptance Criteria**
- [ ] All AUTH controllers use static methods
- [ ] All AUTH business logic in services
- [ ] All requests/responses use validated DTOs
- [ ] 80%+ test coverage
- [ ] No circular dependencies
- [ ] All tests passing
- [ ] API documentation updated

---

### 7.3 Success Metrics

**Quantitative**:
- ✅ 0 circular dependencies (down from 20)
- ✅ 0 controllers with direct repository access (down from 39)
- ✅ 100% controllers use standard pattern (static methods)
- ✅ 80%+ test coverage (up from ~30%)
- ✅ 332 files migrated to module structure

**Qualitative**:
- ✅ Consistent code patterns across all modules
- ✅ Clear module boundaries
- ✅ Easy onboarding for new developers
- ✅ Faster development cycles
- ✅ Fewer bugs due to better testing

---

## 8. Appendix

### 8.1 Complete Controller List (79 files)

**AUTH Controllers (9)**:
1. `/controllers/userController.ts`
2. `/controllers/v1/userRole.controller.ts`
3. `/controllers/v1/userRoleSwitch.controller.ts`
4. `/controllers/v1/userActivity.controller.ts`
5. `/controllers/v1/userStatistics.controller.ts`
6. `/controllers/v1/businessInfo.controller.ts`
7. `/controllers/UserManagementController.ts`
8. `/controllers/approvalController.ts`
9. `/controllers/admin/adminApprovalController.ts`

**COMMERCE Controllers (8)**:
10. `/controllers/OrderController.ts`
11. `/controllers/CustomerOrderController.ts`
12. `/controllers/AdminOrderController.ts`
13. `/controllers/PaymentController.ts`
14. `/controllers/WishlistController.ts`
15. `/controllers/ProductController.ts`
16. `/controllers/CategoryController.ts`
17. `/controllers/StorefrontController.ts`

**DROPSHIPPING Controllers (13)**:
18. `/controllers/SellerController.ts`
19. `/controllers/SupplierController.ts`
20. `/controllers/SellerProductController.ts`
21. `/controllers/SellerSettlementController.ts`
22. `/controllers/SupplierSettlementController.ts`
23. `/controllers/entity/SupplierDashboardController.ts`
24. `/controllers/entity/SupplierEntityController.ts`
25. `/controllers/entity/SettlementEntityController.ts`
26. `/controllers/admin/AdminSupplierController.ts`
27. `/controllers/admin/AdminSettlementController.ts`
28. `/controllers/cpt/DropshippingCPTController.ts`
29. `/controllers/CustomerDashboardController.ts`
30. (SellerDashboardController - inferred)

**CMS Controllers (18)**:
31. `/controllers/CMSController.ts`
32. `/controllers/pagesController.ts`
33. `/controllers/postsController.ts`
34. `/controllers/templatesController.ts`
35. `/controllers/MediaController.ts`
36. `/controllers/GalleryController.ts`
37. `/controllers/content/PostController.ts`
38. `/controllers/content/MediaController.ts`
39. `/controllers/content/TagController.ts`
40. `/controllers/content/ImageEditingController.ts`
41. `/controllers/customFieldsController.ts`
42. `/controllers/acfController.ts`
43. `/controllers/formController.ts`
44. `/controllers/menu/MenuController.ts`
45. `/controllers/v1/content.controller.ts`
46. `/controllers/cpt/FormsController.ts`
47. `/controllers/cpt/FieldGroupsController.ts`
48. `/controllers/cpt/TaxonomiesController.ts`

**SITES Controllers (7)**:
49. `/controllers/ThemeController.ts`
50. `/controllers/v1/platform.controller.ts`
51. `/controllers/apps.controller.ts`
52. `/controllers/settingsController.ts`
53. `/controllers/v1/ai-settings.controller.ts`
54. `/controllers/v1/channels.controller.ts`
55. `/controllers/SmtpController.ts`

**SIGNAGE Controllers (1)**:
56. `/controllers/SignageController.ts`

**ADMIN Controllers (10)**:
57. `/controllers/adminController.ts`
58. `/controllers/dashboardController.ts`
59. `/controllers/admin/AdminUserController.ts`
60. `/controllers/admin/AdminSupplierController.ts` (duplicate - see #29)
61. `/controllers/admin/AdminSettlementController.ts` (duplicate - see #30)
62. `/controllers/admin/AdminJobController.ts`
63. `/controllers/admin/adminApprovalController.ts` (duplicate - see #9)
64. `/controllers/admin/adminStatsController.ts`
65. `/controllers/operationsController.ts`
66. `/controllers/monitoringController.ts`

**PARTNER Controllers (4)**:
67. `/controllers/PartnerController.ts`
68. `/controllers/partner/partnerController.ts`
69. `/controllers/partner/PartnerLinksController.ts`
70. `/controllers/entity/PartnerDashboardController.ts`
71. `/controllers/analytics/PartnerAnalyticsController.ts`
72. `/controllers/entity/PartnerEntityController.ts`

**DEPLOYMENT Controllers (2)**:
73. `/controllers/MigrationController.ts`
74. `/controllers/autoRecoveryController.ts`

**OTHER Controllers (7)**:
75. `/controllers/ApplicationController.ts`
76. `/controllers/NotificationController.ts`
77. `/controllers/analyticsController.ts`
78. `/controllers/TrackingController.ts`
79. `/controllers/post-creation.ts`
80. `/controllers/dev/productSeederController.ts` (dev only)
81. `/controllers/neture/NetureForumController.ts` (special case)
82. `/controllers/media/mediaUploadController.ts`

**Note**: Some controllers appear in multiple lists due to cross-cutting concerns.

---

### 8.2 Controllers with Direct Repository Access (39 files)

These controllers need Service layer extraction (AP-1, AP-4):

1. `/controllers/CMSController.ts`
2. `/controllers/neture/NetureForumController.ts`
3. `/controllers/analyticsController.ts`
4. `/controllers/v1/userRole.controller.ts`
5. `/controllers/v1/userStatistics.controller.ts`
6. `/controllers/content/MediaController.ts`
7. `/controllers/GalleryController.ts`
8. `/controllers/StorefrontController.ts`
9. `/controllers/userController.ts`
10. `/controllers/admin/AdminUserController.ts`
11. `/controllers/entity/SupplierDashboardController.ts`
12. `/controllers/entity/PartnerDashboardController.ts`
13. `/controllers/analytics/PartnerAnalyticsController.ts`
14. `/controllers/ApplicationController.ts`
15. `/controllers/entity/SettlementEntityController.ts`
16. `/controllers/MediaController.ts`
17. `/controllers/postsController.ts`
18. `/controllers/dashboardController.ts`
19. `/controllers/v1/businessInfo.controller.ts`
20. `/controllers/v1/userActivity.controller.ts`
21. `/controllers/entity/PartnerEntityController.ts`
22. `/controllers/cpt/DropshippingCPTController.ts`
23. `/controllers/entity/SupplierEntityController.ts`
24. `/controllers/formController.ts`
25. `/controllers/templatesController.ts`
26. `/controllers/v1/ai-settings.controller.ts`
27. `/controllers/v1/content.controller.ts`
28. `/controllers/v1/userRoleSwitch.controller.ts`
29. `/controllers/cpt/FieldGroupsController.ts`
30. `/controllers/cpt/FormsController.ts`
31. `/controllers/cpt/TaxonomiesController.ts`
32. `/controllers/content/PostController.ts`
33. `/controllers/SmtpController.ts`
34. `/controllers/acfController.ts`
35. `/controllers/adminController.ts`
36. `/controllers/MigrationController.ts`
37. `/controllers/pagesController.ts`
38. `/controllers/post-creation.ts`
39. `/controllers/customFieldsController.ts`

---

### 8.3 References

**Documentation**:
- Step 25 Pre-Phase B Investigation: `/docs/api-server/tasks/step25_pre_phase_b_investigation_workorder.md`
- Phase A Completion Report: (Removed 6,853 lines)
- Circular Dependency Report: (20 dependencies identified)

**Code Examples**:
- Good Controller: `/apps/api-server/src/controllers/SellerController.ts`
- Good Service: `/apps/api-server/src/services/SellerService.ts`
- Good Route: `/apps/api-server/src/routes/v2/seller.routes.ts`

**Tools**:
- class-validator: https://github.com/typestack/class-validator
- class-transformer: https://github.com/typestack/class-transformer
- TypeDI: https://github.com/typestack/typedi
- TSyringe: https://github.com/microsoft/tsyringe

---

## End of Document

**Next Steps**:
1. Review this document with team
2. Get approval for Phase B timeline (14 weeks)
3. Set up infrastructure (Week 1)
4. Begin AUTH pilot migration (Week 3-4)
5. Iterate based on pilot results

**Questions/Feedback**: TBD (team review session)
