# Service Pattern Guide

## Overview

Services in the NextGen architecture are responsible for:
- Business logic implementation
- Database access via repositories
- Data transformation and validation
- Orchestrating operations across multiple entities
- Throwing errors for invalid operations

**Services should NOT:**
- Handle HTTP requests/responses (that's the controller's job)
- Return HTTP status codes
- Know about Express req/res objects

---

## Pattern Structure

### 1. Basic Service Template

```typescript
import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { BaseService } from '../../common/base.service.js';
import { Example } from '../entities/Example.js';
import { NotFoundError, BadRequestError } from '../../common/middleware/error-handler.middleware.js';

class ExampleService extends BaseService<Example> {
  constructor() {
    super(AppDataSource.getRepository(Example));
  }

  /**
   * Custom business logic method
   */
  async findByEmail(email: string): Promise<Example | null> {
    return this.repository.findOne({
      where: { email }
    });
  }

  /**
   * Complex business operation
   */
  async createWithValidation(data: Partial<Example>): Promise<Example> {
    // Validation logic
    const existing = await this.findByEmail(data.email!);
    if (existing) {
      throw new BadRequestError('Email already exists');
    }

    // Business logic
    const processed = {
      ...data,
      status: 'active',
      createdAt: new Date()
    };

    // Create entity
    return this.create(processed);
  }

  /**
   * Soft delete with validation
   */
  async softDelete(id: string): Promise<boolean> {
    const item = await this.findById(id);

    if (!item) {
      throw new NotFoundError('Example');
    }

    // Business rule: Can't delete if status is 'processing'
    if (item.status === 'processing') {
      throw new BadRequestError('Cannot delete item while processing');
    }

    // Update instead of hard delete
    await this.update(id, { isDeleted: true, deletedAt: new Date() });
    return true;
  }
}

// Export singleton instance
export const exampleService = new ExampleService();
```

---

## BaseService Methods

All services should extend `BaseService<T>` and inherit these CRUD methods:

```typescript
// Find by ID
await service.findById(id: string): Promise<T | null>

// Find all with optional filters
await service.findAll(options?: FindManyOptions<T>): Promise<T[]>

// Create new entity
await service.create(data: Partial<T>): Promise<T>

// Update existing entity
await service.update(id: string, data: Partial<T>): Promise<T | null>

// Delete entity
await service.delete(id: string): Promise<boolean>

// Paginate results
await service.paginate(page: number, limit: number, options?: FindManyOptions<T>)

// Count entities
await service.count(options?: FindManyOptions<T>): Promise<number>

// Check if exists
await service.exists(id: string): Promise<boolean>
```

---

## Best Practices

### ✅ DO

1. **Extend BaseService** for standard CRUD operations
```typescript
class UserService extends BaseService<User> {
  constructor() {
    super(AppDataSource.getRepository(User));
  }
}
```

2. **Throw errors** for invalid operations
```typescript
async deleteUser(id: string): Promise<void> {
  const user = await this.findById(id);

  if (!user) {
    throw new NotFoundError('User');
  }

  if (user.role === 'admin' && user.isLastAdmin) {
    throw new BadRequestError('Cannot delete the last admin user');
  }

  await this.delete(id);
}
```

3. **Use repository methods** for database access
```typescript
async findActiveUsers(): Promise<User[]> {
  return this.repository.find({
    where: { isActive: true },
    order: { createdAt: 'DESC' }
  });
}
```

4. **Encapsulate business logic** in service methods
```typescript
async registerUser(data: RegisterDto): Promise<User> {
  // Validation
  const existing = await this.findByEmail(data.email);
  if (existing) {
    throw new BadRequestError('Email already registered');
  }

  // Business logic
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const verificationToken = generateToken();

  // Create user
  const user = await this.create({
    ...data,
    password: hashedPassword,
    verificationToken,
    isVerified: false
  });

  // Side effects
  await emailService.sendVerificationEmail(user.email, verificationToken);

  return user;
}
```

5. **Export singleton instances** for stateless services
```typescript
export const userService = new UserService();
```

### ❌ DON'T

1. **Don't handle HTTP concerns**
```typescript
// ❌ BAD
async getUser(req: Request, res: Response) {
  const user = await this.findById(req.params.id);
  return res.json({ success: true, data: user });
}

// ✅ GOOD
async getUserById(id: string): Promise<User | null> {
  return this.findById(id);
}
```

2. **Don't return HTTP status codes**
```typescript
// ❌ BAD
async createUser(data: any): Promise<{ status: number, user: User }> {
  const user = await this.create(data);
  return { status: 201, user };
}

// ✅ GOOD
async createUser(data: Partial<User>): Promise<User> {
  return this.create(data);
}
```

3. **Don't catch errors silently**
```typescript
// ❌ BAD
async deleteUser(id: string): Promise<boolean> {
  try {
    await this.delete(id);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

// ✅ GOOD
async deleteUser(id: string): Promise<void> {
  const user = await this.findById(id);
  if (!user) {
    throw new NotFoundError('User');
  }
  await this.delete(id);
}
```

4. **Don't access other services' repositories directly**
```typescript
// ❌ BAD
const orderRepo = AppDataSource.getRepository(Order);
const orders = await orderRepo.find({ where: { userId } });

// ✅ GOOD
const orders = await orderService.findByUserId(userId);
```

---

## Advanced Patterns

### 1. Transaction Handling

```typescript
async transferOwnership(itemId: string, fromUserId: string, toUserId: string): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Update item ownership
    await queryRunner.manager.update(Item, itemId, { ownerId: toUserId });

    // Create audit log
    await queryRunner.manager.save(AuditLog, {
      action: 'OWNERSHIP_TRANSFER',
      itemId,
      fromUserId,
      toUserId,
      timestamp: new Date()
    });

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

### 2. Service Composition

```typescript
class OrderService extends BaseService<Order> {
  constructor(
    private readonly productService: ProductService,
    private readonly paymentService: PaymentService,
    private readonly emailService: EmailService
  ) {
    super(AppDataSource.getRepository(Order));
  }

  async createOrder(userId: string, items: OrderItemDto[]): Promise<Order> {
    // Validate products exist
    for (const item of items) {
      const product = await this.productService.findById(item.productId);
      if (!product) {
        throw new NotFoundError(`Product ${item.productId}`);
      }

      // Check stock
      if (product.stock < item.quantity) {
        throw new BadRequestError(`Insufficient stock for ${product.name}`);
      }
    }

    // Create order
    const order = await this.create({
      userId,
      items,
      status: 'pending',
      totalAmount: this.calculateTotal(items)
    });

    // Process payment
    await this.paymentService.processPayment(order.id, order.totalAmount);

    // Update stock
    for (const item of items) {
      await this.productService.decrementStock(item.productId, item.quantity);
    }

    // Send confirmation email
    await this.emailService.sendOrderConfirmation(order);

    return order;
  }
}
```

### 3. Custom Repository Methods

```typescript
class UserService extends BaseService<User> {
  async findTopSellers(limit: number = 10): Promise<User[]> {
    return this.repository
      .createQueryBuilder('user')
      .leftJoin('user.orders', 'order')
      .select(['user.id', 'user.name', 'COUNT(order.id) as orderCount'])
      .where('user.role = :role', { role: 'seller' })
      .groupBy('user.id')
      .orderBy('orderCount', 'DESC')
      .limit(limit)
      .getMany();
  }

  async searchUsers(query: string, page: number, limit: number) {
    const [users, total] = await this.repository
      .createQueryBuilder('user')
      .where('user.email LIKE :query OR user.name LIKE :query', {
        query: `%${query}%`
      })
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
```

---

## Error Handling

Use custom error classes from error-handler.middleware.ts:

```typescript
import {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError
} from '../../common/middleware/error-handler.middleware.js';

// Example usage:
async updateUser(id: string, data: Partial<User>): Promise<User> {
  const user = await this.findById(id);

  if (!user) {
    throw new NotFoundError('User');
  }

  if (data.email && data.email !== user.email) {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictError('Email already in use');
    }
  }

  return this.update(id, data);
}
```

---

## File Naming Convention

- **Filename**: `example.service.ts`
- **Class name**: `ExampleService`
- **Export name**: `exampleService` (singleton instance)
- **Location**: `modules/<domain>/services/example.service.ts`

---

## Testing Services

```typescript
describe('UserService', () => {
  it('should create a new user', async () => {
    const userData = { email: 'test@example.com', password: 'password123' };
    const user = await userService.create(userData);

    expect(user).toBeDefined();
    expect(user.email).toBe(userData.email);
  });

  it('should throw error if email already exists', async () => {
    const userData = { email: 'test@example.com', password: 'password123' };
    await userService.create(userData);

    await expect(
      userService.create(userData)
    ).rejects.toThrow(ConflictError);
  });
});
```

---

## Complete Example

See `/modules/auth/services/auth.service.ts` for a complete working example.
