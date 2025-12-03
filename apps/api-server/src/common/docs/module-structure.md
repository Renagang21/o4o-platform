# NextGen Module Structure Guide

## Overview

The NextGen V2 architecture organizes code into domain-specific modules with clear separation of concerns.

---

## Module Directory Structure

```
modules/<domain>/
├── controllers/       # HTTP request handlers
│   ├── user.controller.ts
│   └── auth.controller.ts
├── services/          # Business logic
│   ├── user.service.ts
│   └── auth.service.ts
├── dto/              # Data Transfer Objects
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   ├── login.dto.ts
│   └── user-response.dto.ts
├── entities/         # TypeORM database models
│   ├── User.ts
│   └── RefreshToken.ts
├── repositories/     # Custom repository methods (optional)
│   └── user.repository.ts
├── routes/           # Express route definitions
│   ├── user.routes.ts
│   └── auth.routes.ts
├── middleware/       # Domain-specific middleware (optional)
│   └── rate-limit.middleware.ts
├── interfaces/       # TypeScript interfaces
│   └── auth.interface.ts
├── utils/            # Domain-specific utilities
│   └── password.util.ts
├── tests/            # Unit and integration tests
│   ├── user.service.test.ts
│   └── auth.controller.test.ts
└── index.ts          # Barrel exports
```

---

## 10 Domain Modules

The API Server is organized into these domains:

| Domain | Description | Examples |
|--------|-------------|----------|
| **auth** | Authentication & authorization | Login, register, JWT, RBAC |
| **commerce** | E-commerce core | Products, cart, wishlist |
| **dropshipping** | Order fulfillment | Orders, suppliers, inventory |
| **cms** | Content management | Posts, pages, media, forms |
| **sites** | Multi-site builder | Sites, themes, menus |
| **signage** | Digital signage | Playlists, schedules, devices |
| **admin** | Admin operations | Jobs, settlements, analytics |
| **partner** | Partner/seller management | Seller dashboard, reports |
| **deployment** | DevOps utilities | Health checks, monitoring |
| **shared** | Cross-domain utilities | Common helpers, types |

---

## Complete Module Example

### 1. Entity (`modules/auth/entities/User.ts`)

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Methods
  hasRole(role: string): boolean {
    return this.role === role;
  }
}
```

### 2. Request DTO (`modules/auth/dto/register.dto.ts`)

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;
}
```

### 3. Response DTO (`modules/auth/dto/user-response.dto.ts`)

```typescript
import { User } from '../entities/User.js';

export type UserResponseDto = Omit<User, 'password'>;

export interface AuthResponseDto {
  user: UserResponseDto;
  token: string;
  refreshToken: string;
  expiresIn: number;
}
```

### 4. Service (`modules/auth/services/auth.service.ts`)

```typescript
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { User } from '../entities/User.js';
import { RegisterDto } from '../dto/register.dto.js';
import { ConflictError, UnauthorizedError } from '../../../common/middleware/error-handler.middleware.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

class AuthService extends BaseService<User> {
  constructor() {
    super(AppDataSource.getRepository(User));
  }

  async register(data: RegisterDto): Promise<User> {
    const existing = await this.repository.findOne({
      where: { email: data.email }
    });

    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.create({
      ...data,
      password: hashedPassword
    });
  }

  async login(email: string, password: string): Promise<{ user: User, token: string }> {
    const user = await this.repository.findOne({ where: { email } });

    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    return { user, token };
  }
}

export const authService = new AuthService();
```

### 5. Controller (`modules/auth/controllers/auth.controller.ts`)

```typescript
import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { authService } from '../services/auth.service.js';
import { RegisterDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';

export class AuthController extends BaseController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  static async register(req: Request, res: Response): Promise<void> {
    const data = req.body as RegisterDto;

    const user = await authService.register(data);

    // Don't send password in response
    const { password, ...userResponse } = user;

    return BaseController.created(res, userResponse);
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as LoginDto;

    const { user, token } = await authService.login(email, password);

    // Don't send password in response
    const { password: _, ...userResponse } = user;

    return BaseController.ok(res, {
      user: userResponse,
      token,
      expiresIn: 86400 // 24 hours in seconds
    });
  }
}
```

### 6. Routes (`modules/auth/routes/auth.routes.ts`)

```typescript
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateDto } from '../../../common/middleware/validation.middleware.js';
import { RegisterDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';

const router = Router();

router.post('/register', validateDto(RegisterDto), AuthController.register);
router.post('/login', validateDto(LoginDto), AuthController.login);

export default router;
```

### 7. Barrel Export (`modules/auth/index.ts`)

```typescript
// Controllers
export * from './controllers/auth.controller.js';

// Services
export * from './services/auth.service.js';

// DTOs
export * from './dto/register.dto.js';
export * from './dto/login.dto.js';
export * from './dto/user-response.dto.js';

// Entities
export * from './entities/User.js';

// Routes
export { default as authRoutes } from './routes/auth.routes.js';
```

### 8. Route Registration (`src/routes/index.ts`)

```typescript
import { Router } from 'express';
import { authRoutes } from '../modules/auth/index.js';
import { userRoutes } from '../modules/auth/routes/user.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export default router;
```

---

## Request Flow

```
1. HTTP Request
   ↓
2. Express Route (routes/)
   ↓
3. Validation Middleware (validateDto)
   ↓
4. Auth Middleware (requireAuth) - if needed
   ↓
5. Controller (controllers/)
   ├── Extract request data
   ├── Call service method
   └── Return standardized response
   ↓
6. Service (services/)
   ├── Business logic validation
   ├── Database operations (via repository)
   ├── Call other services if needed
   └── Return data or throw error
   ↓
7. Response sent to client
```

---

## Common Patterns

### Pattern 1: CRUD Resource

For a typical CRUD resource (e.g., Products):

**Routes** (`modules/commerce/routes/product.routes.ts`):
```typescript
import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { validateDto, validateQuery } from '../../../common/middleware/validation.middleware.js';
import { requireAuth } from '../../../common/middleware/auth.middleware.js';
import { CreateProductDto, UpdateProductDto, ProductListQueryDto } from '../dto/index.js';

const router = Router();

router.get('/', validateQuery(ProductListQueryDto), ProductController.list);
router.get('/:id', ProductController.getById);
router.post('/', requireAuth, validateDto(CreateProductDto), ProductController.create);
router.put('/:id', requireAuth, validateDto(UpdateProductDto), ProductController.update);
router.delete('/:id', requireAuth, ProductController.delete);

export default router;
```

### Pattern 2: Nested Resources

For nested resources (e.g., User Orders):

```typescript
// GET /api/users/:userId/orders
router.get('/users/:userId/orders', OrderController.getByUserId);

// Controller
static async getByUserId(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const result = await orderService.findByUserId(userId, Number(page), Number(limit));

  return BaseController.okPaginated(res, result.items, result.pagination);
}
```

### Pattern 3: Custom Actions

For custom business operations:

```typescript
// POST /api/orders/:id/cancel
router.post('/orders/:id/cancel', requireAuth, OrderController.cancel);

// Controller
static async cancel(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;

  await orderService.cancelOrder(id, userId);

  return BaseController.noContent(res);
}

// Service
async cancelOrder(orderId: string, userId: string): Promise<void> {
  const order = await this.findById(orderId);

  if (!order) {
    throw new NotFoundError('Order');
  }

  if (order.userId !== userId) {
    throw new ForbiddenError('You can only cancel your own orders');
  }

  if (order.status === 'shipped') {
    throw new BadRequestError('Cannot cancel shipped orders');
  }

  await this.update(orderId, { status: 'cancelled', cancelledAt: new Date() });
}
```

---

## Migration Strategy

When migrating legacy code to NextGen modules:

1. **Create module structure** (controllers/, services/, dto/, etc.)
2. **Move entities** to `modules/<domain>/entities/`
3. **Create DTOs** for all endpoints
4. **Create or refactor service** extending BaseService
5. **Create controller** extending BaseController
6. **Update routes** to use new controller + validation middleware
7. **Add tests** for service and controller
8. **Update barrel exports** in module's index.ts
9. **Verify no circular dependencies**
10. **Delete legacy files** after verification

---

## Anti-Patterns to Avoid

### ❌ Direct Repository Access in Controllers

```typescript
// BAD
export class UserController {
  static async getUser(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: req.params.id } });
    return res.json({ success: true, data: user });
  }
}
```

### ❌ Business Logic in Controllers

```typescript
// BAD
export class OrderController {
  static async create(req: Request, res: Response) {
    const hashedCard = await bcrypt.hash(req.body.creditCard, 10);
    const order = await orderService.create({ ...req.body, creditCard: hashedCard });
    return res.json({ success: true, data: order });
  }
}
```

### ❌ HTTP Concerns in Services

```typescript
// BAD
class UserService {
  async getUser(req: Request, res: Response) {
    const user = await this.findById(req.params.id);
    return res.json({ success: true, data: user });
  }
}
```

### ❌ Missing Validation

```typescript
// BAD
router.post('/users', UserController.create); // No validateDto!
```

### ❌ Unhandled Errors

```typescript
// BAD
static async getUser(req: Request, res: Response) {
  const user = await userService.findById(req.params.id);
  return res.json({ success: true, data: user }); // What if user is null?
}
```

---

## Testing

Each module should include tests:

```typescript
// modules/auth/tests/auth.service.test.ts
import { authService } from '../services/auth.service.js';
import { ConflictError } from '../../../common/middleware/error-handler.middleware.js';

describe('AuthService', () => {
  describe('register', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const user = await authService.register(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });

    it('should throw ConflictError if email exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      await authService.register(userData);

      await expect(
        authService.register(userData)
      ).rejects.toThrow(ConflictError);
    });
  });
});
```

---

## Documentation

For detailed patterns, see:

- [Controller Pattern Guide](./controller-pattern.md)
- [Service Pattern Guide](./service-pattern.md)
- [DTO Pattern Guide](./dto-pattern.md)

---

## Example Modules

Reference implementations:

- **AUTH Module**: `/modules/auth/` - User authentication & authorization
- **COMMERCE Module**: `/modules/commerce/` - Product catalog & cart
- **CMS Module**: `/modules/cms/` - Content management

---

**Last Updated**: 2025-12-03 (Step 25 Phase B-1)
