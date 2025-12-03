# NextGen Resource Templates

This directory contains boilerplate templates for quickly creating new resources following the NextGen V2 architecture.

---

## Quick Start

### Step 1: Identify Your Resource

Determine:
- **Resource Name** (PascalCase): `Product`, `Order`, `Article`
- **Resource Lower** (camelCase/lowercase): `product`, `order`, `article`
- **Domain**: `commerce`, `cms`, `dropshipping`, etc.

### Step 2: Copy Templates

Copy all template files to your module directory and rename them:

```bash
# Example: Creating a Product resource in commerce module

# 1. Controller
cp src/common/templates/resource.controller.template.ts \
   modules/commerce/controllers/product.controller.ts

# 2. Service
cp src/common/templates/resource.service.template.ts \
   modules/commerce/services/product.service.ts

# 3. DTOs
cp src/common/templates/resource.dto.template.ts \
   modules/commerce/dto/product.dto.ts

# 4. Routes
cp src/common/templates/resource.routes.template.ts \
   modules/commerce/routes/product.routes.ts
```

### Step 3: Find and Replace

In each copied file, replace the placeholders:

| Placeholder | Replace With | Example |
|-------------|--------------|---------|
| `RESOURCE_NAME` | PascalCase resource name | `Product` |
| `RESOURCE_LOWER` | camelCase/lowercase | `product` |
| `DOMAIN` | Domain name | `commerce` |

**VS Code Find & Replace:**
1. Press `Cmd+Shift+H` (Mac) or `Ctrl+Shift+H` (Windows/Linux)
2. Enable "Match Case" option
3. Replace in all files:
   - `RESOURCE_NAME` → `Product`
   - `RESOURCE_LOWER` → `product`
   - `DOMAIN` → `commerce`

### Step 4: Create Entity

Create your TypeORM entity:

```typescript
// modules/commerce/entities/Product.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Step 5: Customize Templates

Remove placeholder comments and customize business logic:

- **Controller**: Usually no changes needed
- **Service**: Add custom business logic methods
- **DTOs**: Add/remove fields based on your entity
- **Routes**: Adjust authentication/authorization rules

### Step 6: Register Routes

Add your routes to the main router:

```typescript
// src/routes/index.ts
import productRoutes from '../modules/commerce/routes/product.routes.js';

router.use('/products', productRoutes);
```

### Step 7: Test

Create tests for your new resource:

```bash
# Create test file
cp modules/commerce/tests/product.service.test.ts
```

---

## Template Files Explained

### 1. `resource.controller.template.ts`

**Contains:**
- Standard CRUD endpoints (list, getById, create, update, delete)
- BaseController integration
- Proper response methods
- AuthRequest for authenticated endpoints

**Customize:**
- Add custom action methods (e.g., `publish`, `archive`)
- Add business logic validation
- Change response structures if needed

### 2. `resource.service.template.ts`

**Contains:**
- BaseService extension
- CRUD methods inherited from BaseService
- Example custom methods:
  - `findByCustomField` - Find by non-ID field
  - `createWithValidation` - Create with business rules
  - `updateWithValidation` - Update with validation
  - `softDelete` - Soft delete pattern
  - `search` - Advanced search with filters

**Customize:**
- Replace `findByCustomField` with actual field (e.g., `findByEmail`)
- Add business validation logic
- Add custom queries
- Implement transaction handling if needed

### 3. `resource.dto.template.ts`

**Contains:**
- `CreateRESOURCE_NAMEDto` - For POST requests
- `UpdateRESOURCE_NAMEDto` - For PUT requests
- `RESOURCE_NAMEListQueryDto` - For GET list query params
- `RESOURCE_NAMEResponseDto` - Response interface
- `RESOURCE_NAMEListResponseDto` - Paginated response interface

**Customize:**
- Add/remove fields based on your entity
- Add custom validation rules
- Add nested object validation if needed

### 4. `resource.routes.template.ts`

**Contains:**
- Standard CRUD routes
- Public vs protected route examples
- Admin-only route examples
- Custom action route examples
- Validation middleware integration
- Auth middleware integration

**Customize:**
- Adjust authentication requirements
- Add custom action routes
- Add role-based access control
- Add rate limiting if needed

---

## Complete Example

Let's create a **Blog Post** resource in the **CMS** module:

### 1. Copy Templates

```bash
cp src/common/templates/resource.controller.template.ts modules/cms/controllers/post.controller.ts
cp src/common/templates/resource.service.template.ts modules/cms/services/post.service.ts
cp src/common/templates/resource.dto.template.ts modules/cms/dto/post.dto.ts
cp src/common/templates/resource.routes.template.ts modules/cms/routes/post.routes.ts
```

### 2. Find & Replace

Replace in all 4 files:
- `RESOURCE_NAME` → `Post`
- `RESOURCE_LOWER` → `post`
- `DOMAIN` → `cms`

### 3. Create Entity

```typescript
// modules/cms/entities/Post.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities/User.js';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  slug: string;

  @Column('text')
  content: string;

  @Column({ default: 'draft' })
  status: 'draft' | 'published' | 'archived';

  @ManyToOne(() => User)
  author: User;

  @Column()
  authorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 4. Customize Service

```typescript
// modules/cms/services/post.service.ts
async findBySlug(slug: string): Promise<Post | null> {
  return this.repository.findOne({
    where: { slug },
    relations: ['author']
  });
}

async publish(id: string, userId: string): Promise<Post> {
  const post = await this.findById(id);

  if (!post) {
    throw new NotFoundError('Post');
  }

  if (post.authorId !== userId) {
    throw new ForbiddenError('You can only publish your own posts');
  }

  return this.update(id, { status: 'published' });
}
```

### 5. Customize DTOs

```typescript
// modules/cms/dto/post.dto.ts
export class CreatePostDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens'
  })
  slug: string;

  @IsString()
  @MinLength(10)
  content: string;

  @IsOptional()
  @IsEnum(['draft', 'published'])
  status?: 'draft' | 'published';
}
```

### 6. Add Custom Routes

```typescript
// modules/cms/routes/post.routes.ts
router.post('/:id/publish', requireAuth, PostController.publish);
router.post('/:id/archive', requireAuth, PostController.archive);
```

### 7. Register Routes

```typescript
// src/routes/index.ts
import postRoutes from '../modules/cms/routes/post.routes.js';
router.use('/posts', postRoutes);
```

---

## Best Practices

### ✅ DO

1. **Always extend BaseController and BaseService**
2. **Use DTOs with validation for all inputs**
3. **Follow naming conventions**: `resource.controller.ts`, `resource.service.ts`
4. **Export service as singleton**: `export const postService = new PostService();`
5. **Document all methods with JSDoc**
6. **Add tests for all custom business logic**

### ❌ DON'T

1. **Don't skip validation middleware** on routes
2. **Don't put business logic in controllers**
3. **Don't access repositories in controllers**
4. **Don't forget to check permissions** in services
5. **Don't return passwords or sensitive data** in response DTOs

---

## Additional Resources

- [Controller Pattern Guide](../docs/controller-pattern.md)
- [Service Pattern Guide](../docs/service-pattern.md)
- [DTO Pattern Guide](../docs/dto-pattern.md)
- [Module Structure Guide](../docs/module-structure.md)

---

## Troubleshooting

### Build Errors

If you get TypeScript errors after copying templates:

1. Check all placeholders are replaced
2. Ensure entity exists and is imported correctly
3. Verify service is exported as singleton
4. Check DTO imports in routes

### Validation Not Working

1. Ensure `validateDto` middleware is used
2. Check DTO class uses decorators (not interface)
3. Verify `class-validator` and `class-transformer` are installed
4. Check `@Type()` decorator for number/date conversions

### Routes Not Found

1. Verify routes are registered in `src/routes/index.ts`
2. Check route path matches your request
3. Ensure route file exports `default router`
4. Restart dev server after adding routes

---

**Happy Coding!** 🚀
