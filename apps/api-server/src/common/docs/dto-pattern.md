# DTO Pattern Guide

## Overview

DTOs (Data Transfer Objects) define the structure and validation rules for data entering and leaving the API.

**Request DTOs** (using classes):
- Define expected request body/query/param structure
- Include validation decorators
- Used with `validateDto`, `validateQuery`, `validateParams` middleware

**Response DTOs** (using interfaces):
- Define response data structure
- Document API responses
- Type safety for controllers

---

## Request DTO Pattern

### Basic Request DTO

```typescript
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateUserRequestDto {
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

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
```

### Usage in Routes

```typescript
import { validateDto } from '../../common/middleware/validation.middleware.js';
import { CreateUserRequestDto } from '../dto/create-user-request.dto.js';

router.post('/users', validateDto(CreateUserRequestDto), UserController.create);
```

### Controller Access

```typescript
static async create(req: Request, res: Response): Promise<void> {
  const data = req.body; // Already validated and transformed to CreateUserRequestDto
  const user = await userService.create(data);
  return BaseController.created(res, user);
}
```

---

## Common Validation Decorators

### String Validation

```typescript
import { IsString, MinLength, MaxLength, Matches, IsEmail, IsUrl, IsUUID } from 'class-validator';

export class ExampleDto {
  @IsString()
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @IsEmail()
  email: string;

  @IsUrl()
  website: string;

  @IsUUID()
  id: string;

  @Matches(/^[a-zA-Z0-9]+$/)
  alphanumeric: string;

  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number'
  })
  password: string;
}
```

### Number Validation

```typescript
import { IsInt, IsNumber, Min, Max, IsPositive, IsNegative } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  rating: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  stock: number;
}
```

### Boolean Validation

```typescript
import { IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class SettingsDto {
  @Type(() => Boolean)
  @IsBoolean()
  isActive: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  emailNotifications: boolean;
}
```

### Date Validation

```typescript
import { IsDate, MinDate, MaxDate } from 'class-validator';
import { Type } from 'class-transformer';

export class EventDto {
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  @MinDate(new Date())
  endDate: Date;
}
```

### Array Validation

```typescript
import { IsArray, ArrayMinSize, ArrayMaxSize, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  tags: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

class OrderItemDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}
```

### Enum Validation

```typescript
import { IsEnum } from 'class-validator';

enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  SELLER = 'seller'
}

export class AssignRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
```

### Optional Fields

```typescript
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  price?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
```

### Nested Objects

```typescript
import { ValidateNested, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  zipCode: string;
}

export class CreateUserDto {
  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}
```

---

## Query Parameter DTOs

```typescript
import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductListQueryDto {
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

  @IsOptional()
  @IsEnum(['name', 'price', 'createdAt'])
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
```

Usage:

```typescript
import { validateQuery } from '../../common/middleware/validation.middleware.js';

router.get('/products', validateQuery(ProductListQueryDto), ProductController.list);
```

---

## Route Parameter DTOs

```typescript
import { IsUUID } from 'class-validator';

export class IdParamDto {
  @IsUUID()
  id: string;
}
```

Usage:

```typescript
import { validateParams } from '../../common/middleware/validation.middleware.js';

router.get('/users/:id', validateParams(IdParamDto), UserController.getById);
```

---

## Response DTO Pattern

Response DTOs use **interfaces** (not classes) since they don't need validation:

### Basic Response DTO

```typescript
export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Never include passwords or sensitive tokens
}
```

### Using Utility Types

```typescript
import { User } from '../entities/User.js';

// Omit sensitive fields
export type UserResponseDto = Omit<User, 'password' | 'resetToken' | 'verificationToken'>;

// Pick specific fields
export type UserSummaryDto = Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;

// Partial for updates
export type UpdateUserDto = Partial<Pick<User, 'firstName' | 'lastName' | 'phoneNumber'>>;
```

### Nested Response DTOs

```typescript
export interface OrderResponseDto {
  id: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  customer: {
    id: string;
    name: string;
    email: string;
  };
  items: OrderItemResponseDto[];
  totalAmount: number;
  createdAt: Date;
}

export interface OrderItemResponseDto {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
  subtotal: number;
}
```

### Paginated Response DTO

```typescript
export interface PaginatedResponseDto<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Usage
export type ProductsListResponseDto = PaginatedResponseDto<ProductResponseDto>;
```

---

## Custom Validators

You can create custom validation decorators:

```typescript
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;

          // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
          const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
          return strongPasswordRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
        }
      }
    });
  };
}

// Usage
export class RegisterDto {
  @IsStrongPassword()
  password: string;
}
```

---

## Best Practices

### ✅ DO

1. **Use classes for request DTOs**
```typescript
export class CreateUserDto { ... }
```

2. **Use interfaces for response DTOs**
```typescript
export interface UserResponseDto { ... }
```

3. **Group related validations**
```typescript
@IsEmail()
@MaxLength(255)
email: string;
```

4. **Provide custom error messages**
```typescript
@MinLength(8, { message: 'Password must be at least 8 characters' })
password: string;
```

5. **Use @Type() for transformations**
```typescript
@Type(() => Number)
@IsInt()
age: number;
```

6. **Make optional fields explicit**
```typescript
@IsOptional()
@IsString()
middleName?: string;
```

### ❌ DON'T

1. **Don't use classes for response DTOs**
```typescript
// ❌ BAD
export class UserResponseDto { ... }

// ✅ GOOD
export interface UserResponseDto { ... }
```

2. **Don't include sensitive data in response DTOs**
```typescript
// ❌ BAD
export interface UserResponseDto {
  password: string;
  resetToken: string;
}
```

3. **Don't forget @Type() for numbers/dates from query strings**
```typescript
// ❌ BAD (won't convert string to number)
@IsInt()
page: number;

// ✅ GOOD
@Type(() => Number)
@IsInt()
page: number;
```

---

## File Naming Convention

- **Request DTO**: `create-user-request.dto.ts` or `create-user.dto.ts`
- **Response DTO**: `user-response.dto.ts` or `user.dto.ts`
- **Query DTO**: `user-list-query.dto.ts`
- **Param DTO**: `id-param.dto.ts`
- **Location**: `modules/<domain>/dto/`

---

## Complete Examples

See `/src/common/dto/example-request.dto.ts` and `/src/common/dto/example-response.dto.ts` for comprehensive examples.
