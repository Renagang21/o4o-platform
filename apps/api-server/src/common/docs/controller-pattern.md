# Controller Pattern Guide

## Overview

Controllers in the NextGen architecture are responsible for:
- Handling HTTP requests and responses
- Validating request data (via middleware)
- Delegating business logic to services
- Returning standardized responses

**Controllers should NOT:**
- Contain business logic
- Access databases directly (use services)
- Handle errors with try-catch (use BaseController methods)

---

## Pattern Structure

### 1. Basic Controller Template

```typescript
import { Request, Response } from 'express';
import { BaseController } from '../../common/base.controller.js';
import { AuthRequest } from '../../common/middleware/auth.middleware.js';
import { exampleService } from '../services/example.service.js';

export class ExampleController extends BaseController {
  /**
   * Get all items (paginated)
   * GET /api/examples?page=1&limit=20
   */
  static async list(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20 } = req.query;

    const result = await exampleService.paginate(
      Number(page),
      Number(limit)
    );

    return BaseController.okPaginated(res, result.items, result.pagination);
  }

  /**
   * Get single item by ID
   * GET /api/examples/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const item = await exampleService.findById(id);

    if (!item) {
      return BaseController.notFound(res, 'Example not found');
    }

    return BaseController.ok(res, item);
  }

  /**
   * Create new item
   * POST /api/examples
   */
  static async create(req: AuthRequest, res: Response): Promise<void> {
    const data = req.body; // Already validated by validateDto middleware

    const item = await exampleService.create(data);

    return BaseController.created(res, item);
  }

  /**
   * Update existing item
   * PUT /api/examples/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body; // Already validated by validateDto middleware

    const item = await exampleService.update(id, data);

    if (!item) {
      return BaseController.notFound(res, 'Example not found');
    }

    return BaseController.ok(res, item);
  }

  /**
   * Delete item
   * DELETE /api/examples/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const deleted = await exampleService.delete(id);

    if (!deleted) {
      return BaseController.notFound(res, 'Example not found');
    }

    return BaseController.noContent(res);
  }
}
```

---

## BaseController Methods

All controllers should extend `BaseController` and use these standard response methods:

### Success Responses

```typescript
// Standard success response
BaseController.ok(res, data);
// Returns: { success: true, data: {...} }

// Paginated response
BaseController.okPaginated(res, items, pagination);
// Returns: { success: true, data: [...], pagination: {...} }

// Created response (201 status)
BaseController.created(res, data);
// Returns: { success: true, data: {...} }

// No content response (204 status)
BaseController.noContent(res);
// Returns: empty response with 204 status
```

### Error Responses

```typescript
// Generic error (500 by default)
BaseController.error(res, error, statusCode);
// Returns: { success: false, error: "message" }

// Not found (404)
BaseController.notFound(res, 'User not found');
// Returns: { success: false, error: "User not found" }

// Validation error (400)
BaseController.validationError(res, errors);
// Returns: { success: false, error: "Validation failed", details: [...] }

// Unauthorized (401)
BaseController.unauthorized(res, 'Invalid credentials');
// Returns: { success: false, error: "Invalid credentials" }

// Forbidden (403)
BaseController.forbidden(res, 'Insufficient permissions');
// Returns: { success: false, error: "Insufficient permissions" }
```

---

## Best Practices

### ✅ DO

1. **Use static methods** for all controller actions
```typescript
export class UserController extends BaseController {
  static async getUser(req: Request, res: Response): Promise<void> {
    // ...
  }
}
```

2. **Delegate to services** for all business logic
```typescript
static async create(req: Request, res: Response): Promise<void> {
  const user = await userService.create(req.body);
  return BaseController.created(res, user);
}
```

3. **Use BaseController response methods** for consistency
```typescript
return BaseController.ok(res, data);
// NOT: return res.json({ data });
```

4. **Return early** on validation failures
```typescript
if (!item) {
  return BaseController.notFound(res, 'Item not found');
}
// Continue with normal flow
```

5. **Use AuthRequest type** when authentication is required
```typescript
static async getProfile(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id; // user is guaranteed to exist
  // ...
}
```

### ❌ DON'T

1. **Don't use try-catch** (services handle errors)
```typescript
// ❌ BAD
static async getUser(req: Request, res: Response) {
  try {
    const user = await userService.findById(req.params.id);
    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ✅ GOOD
static async getUser(req: Request, res: Response): Promise<void> {
  const user = await userService.findById(req.params.id);
  if (!user) return BaseController.notFound(res, 'User not found');
  return BaseController.ok(res, user);
}
```

2. **Don't access repositories directly**
```typescript
// ❌ BAD
const userRepo = AppDataSource.getRepository(User);
const user = await userRepo.findOne({ where: { id } });

// ✅ GOOD
const user = await userService.findById(id);
```

3. **Don't put business logic in controllers**
```typescript
// ❌ BAD
static async create(req: Request, res: Response) {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const user = await userService.create({ ...req.body, password: hashedPassword });
  // ...
}

// ✅ GOOD (hashing logic in service)
static async create(req: Request, res: Response): Promise<void> {
  const user = await userService.create(req.body);
  return BaseController.created(res, user);
}
```

4. **Don't use class instances** (use static methods)
```typescript
// ❌ BAD
export class UserController {
  async getUser(req: Request, res: Response) { ... }
}
const userController = new UserController();
router.get('/users/:id', userController.getUser);

// ✅ GOOD
export class UserController extends BaseController {
  static async getUser(req: Request, res: Response): Promise<void> { ... }
}
router.get('/users/:id', UserController.getUser);
```

---

## Error Handling

Controllers should let services throw errors, which will be caught by the global error handler:

```typescript
// In service:
if (!user) {
  throw new NotFoundError('User');
}

// In controller (no try-catch needed):
static async getUser(req: Request, res: Response): Promise<void> {
  const user = await userService.findById(req.params.id);
  return BaseController.ok(res, user);
}
```

For validation at controller level:

```typescript
static async getUser(req: Request, res: Response): Promise<void> {
  const user = await userService.findById(req.params.id);

  // Check if resource exists
  if (!user) {
    return BaseController.notFound(res, 'User not found');
  }

  return BaseController.ok(res, user);
}
```

---

## File Naming Convention

- **Filename**: `example.controller.ts`
- **Class name**: `ExampleController`
- **Location**: `modules/<domain>/controllers/example.controller.ts`

---

## Complete Example

See `/modules/auth/controllers/auth.controller.ts` for a complete working example.
