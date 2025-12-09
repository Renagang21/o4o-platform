# 📄 **Step 25 — Phase B-2 Step 4: User & Profile Module Migration**

## O4O Platform — NextGen Backend Architecture: User/Profile Module Consolidation

**Version**: 2025-12-03
**Author**: ChatGPT PM + Claude (Rena AI Assistant)
**Status**: 🟡 READY TO START
**Priority**: 🔴 CRITICAL (P1)
**Estimated Duration**: 6-8 hours
**Dependencies**:
- Phase B-2 Step 3 (AUTH Controllers Migration) ✅ COMPLETED

---

## 0. 목적 (Purpose)

### ✅ 완료된 작업 (Phase B-2 Step 3)
- AUTH Controllers & Routes가 NextGen 구조로 완전히 마이그레이션 완료
- BaseController 패턴 확립
- DTO Validation 표준화
- Reference Implementation 완성

### ❌ 현재 문제점
**User/Profile 모듈이 Legacy 구조에 남아있음:**

```
❌ Legacy Routes (4개 파일 중복):
   - src/routes/user.ts                 (User profile endpoints)
   - src/routes/users.routes.ts         (User management)
   - src/routes/v1/users.routes.ts      (V1 user endpoints)
   - src/routes/v1/userRole.routes.ts   (Role management)

❌ Controller 계층 불완전:
   - 일부 로직이 라우트 파일에 직접 구현됨
   - BaseController 패턴 미적용
   - DTO validation 불완전
   - 응답 구조 불일치
```

### 🎯 Phase B-2 Step 4의 목표

> **User/Profile 모듈을 NextGen 패턴으로 완전히 마이그레이션하여
> AUTH 모듈과 함께 완전한 Identity & Access Management 시스템을 구축한다.**

### 완료 시 기대 효과

* ✅ User/Profile 모듈 100% NextGen 구조로 전환 완료
* ✅ AUTH ↔ User 모듈 완전 통합
* ✅ 사용자 관리, 프로필, 활동 로그, 세션 관리 통합
* ✅ BaseController 패턴 적용으로 응답 구조 통일
* ✅ DTO Validation 표준화
* ✅ 라우트 중복 제거 및 엔드포인트 통합

---

## 1. 현재 상태 분석 (Current State)

### 1.1 기존 User Routes 구조

```
src/routes/
  ├── user.ts                    (350+ lines) - User profile/settings
  ├── users.routes.ts            (280+ lines) - User management
  ├── v1/users.routes.ts         (420+ lines) - V1 user endpoints
  └── v1/userRole.routes.ts      (180+ lines) - Role management
```

#### 엔드포인트 분석

| Category | Endpoint | Status | Target |
|----------|----------|--------|--------|
| **Profile** |
| | GET /api/user/profile | 🟡 Legacy | /api/v1/users/profile |
| | PUT /api/user/profile | 🟡 Legacy | /api/v1/users/profile |
| | GET /api/user/completeness | 🟡 Legacy | /api/v1/users/profile/completeness |
| **Password** |
| | PUT /api/user/password | 🟡 Legacy | /api/v1/users/password |
| **Sessions** |
| | GET /api/user/sessions | 🟡 Legacy | /api/v1/users/sessions |
| | DELETE /api/user/sessions/:id | 🟡 Legacy | /api/v1/users/sessions/:id |
| **User Management** |
| | GET /api/v1/users | ✅ Keep | /api/v1/users |
| | GET /api/v1/users/:id | ✅ Keep | /api/v1/users/:id |
| | PUT /api/v1/users/:id | ✅ Keep | /api/v1/users/:id |
| | DELETE /api/v1/users/:id | ✅ Keep | /api/v1/users/:id |
| **Roles** |
| | GET /api/v1/users/roles | ✅ Keep | /api/v1/users/roles |
| | POST /api/v1/users/:id/roles | 🟡 Refactor | /api/v1/users/:id/roles |
| | DELETE /api/v1/users/:id/roles/:roleId | 🟡 Refactor | /api/v1/users/:id/roles/:roleId |
| **Activity** |
| | GET /api/v1/users/:id/activities | 🔴 New | /api/v1/users/:id/activities |

**총 문제점:**
- 4개 파일에 엔드포인트 분산
- 비일관적인 응답 구조
- Controller 계층 불완전
- DTO validation 미흡

### 1.2 NextGen 구조 요구사항

```
✅ 목표 구조:

src/modules/user/
  ├── controllers/
  │   ├── user.controller.ts           (Profile, Password, Sessions)
  │   ├── user-management.controller.ts (CRUD operations)
  │   ├── user-role.controller.ts      (Role management)
  │   └── user-activity.controller.ts  (Activity logs)
  ├── routes/
  │   └── user.routes.ts               (통합 라우트)
  ├── dto/
  │   ├── update-profile.dto.ts
  │   ├── change-password.dto.ts
  │   ├── user-query.dto.ts
  │   ├── user-role.dto.ts
  │   └── activity-query.dto.ts
  ├── services/
  │   ├── user.service.ts              ✅ 이미 완료 (modules/auth/services/)
  │   ├── user-activity.service.ts     🔴 새로 생성
  │   └── user-settings.service.ts     🔴 새로 생성
  └── entities/
      └── (Use from modules/auth/entities/)
```

---

## 2. 마이그레이션 전략 (Migration Strategy)

### 2.1 단계별 접근 방식

```
Step 1: DTOs 정의 (Request/Response)           [45분]
Step 2: UserController 구현 (Profile/Password) [1.5시간]
Step 3: UserManagementController 구현 (CRUD)   [1.5시간]
Step 4: UserRoleController 구현                [1시간]
Step 5: UserActivityController 구현            [1시간]
Step 6: Services 정리 (UserActivityService)    [1시간]
Step 7: Routes 통합 (단일 라우트 파일)          [1시간]
Step 8: Legacy Routes Deprecation             [30분]
Step 9: 통합 테스트 및 검증                     [1시간]
```

### 2.2 Backward Compatibility 전략

```typescript
// 기존 엔드포인트 유지 (Deprecated)
// ❌ /api/user/*           (Legacy)
// ❌ /api/users/*          (Legacy)
// ❌ /api/v1/userRole/*    (Legacy)

// ✅ /api/v1/users/*       (NextGen - 신규 통합)

// 호환성 라우터 (90일 유지 후 제거 예정)
router.use('/api/user', (req, res) => {
  res.redirect(307, req.originalUrl.replace('/api/user', '/api/v1/users'));
});
```

---

## 3. 구현 체크리스트 (Implementation Checklist)

### Phase 1: DTOs 정의 ✅

#### 3.1.1 Profile DTOs

```typescript
// src/modules/user/dto/update-profile.dto.ts

import { IsString, IsOptional, IsEmail, IsUrl, MinLength } from 'class-validator';

/**
 * Update Profile Request DTO
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Valid email is required' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Valid URL is required' })
  avatar?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}

/**
 * Profile Response DTO
 */
export interface ProfileResponseDto {
  success: boolean;
  data: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
}
```

#### 3.1.2 Password DTOs

```typescript
// src/modules/user/dto/change-password.dto.ts

import { IsString, MinLength } from 'class-validator';

/**
 * Change Password Request DTO
 */
export class ChangePasswordDto {
  @IsString()
  @MinLength(6, { message: 'Current password is required' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword: string;

  @IsString()
  newPasswordConfirm: string;
}
```

#### 3.1.3 User Management DTOs

```typescript
// src/modules/user/dto/user-query.dto.ts

import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

/**
 * User Query DTO (for pagination and filtering)
 */
export class UserQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

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
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

```typescript
// src/modules/user/dto/update-user.dto.ts

import { IsString, IsOptional, IsEmail, IsIn } from 'class-validator';

/**
 * Update User DTO (Admin only)
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended', 'pending'])
  status?: string;

  @IsOptional()
  @IsString()
  role?: string;
}
```

#### 3.1.4 Role Management DTOs

```typescript
// src/modules/user/dto/user-role.dto.ts

import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

/**
 * Assign Role DTO
 */
export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  role: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

/**
 * Remove Role DTO
 */
export class RemoveRoleDto {
  @IsString()
  @IsNotEmpty()
  role: string;
}
```

#### 3.1.5 Activity DTOs

```typescript
// src/modules/user/dto/activity-query.dto.ts

import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

/**
 * Activity Query DTO
 */
export class ActivityQueryDto {
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
```

**작업 항목:**
- [ ] `UpdateProfileDto` 구현
- [ ] `ChangePasswordDto` 구현
- [ ] `UserQueryDto` 구현
- [ ] `UpdateUserDto` 구현
- [ ] `AssignRoleDto` 구현
- [ ] `RemoveRoleDto` 구현
- [ ] `ActivityQueryDto` 구현
- [ ] `index.ts` barrel export

#### 3.1.6 파일 생성 목록
```bash
src/modules/user/dto/
  ├── update-profile.dto.ts      # Profile update
  ├── change-password.dto.ts     # Password change
  ├── user-query.dto.ts          # User list query
  ├── update-user.dto.ts         # Admin user update
  ├── user-role.dto.ts           # Role assignment
  ├── activity-query.dto.ts      # Activity log query
  └── index.ts                   # Barrel export
```

---

### Phase 2: Controllers 생성 ✅

#### 3.2.1 UserController (Profile & Settings)

```typescript
// src/modules/user/controllers/user.controller.ts

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { BaseController } from '../../../common/base.controller.js';
import { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { userService } from '../../auth/services/user.service.js';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../../auth/entities/User.js';
import { UpdateProfileDto, ChangePasswordDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';
import { env } from '../../../utils/env-validator.js';

/**
 * User Controller - NextGen Pattern
 *
 * Handles user profile and settings operations:
 * - Get profile
 * - Update profile
 * - Change password
 * - Get sessions
 * - Delete session
 */
export class UserController extends BaseController {
  /**
   * GET /api/v1/users/profile
   * Get current user profile
   */
  static async getProfile(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: req.user.id },
        select: ['id', 'email', 'name', 'phone', 'avatar', 'bio', 'status', 'createdAt', 'updatedAt'],
        relations: ['dbRoles'],
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      return BaseController.ok(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone || null,
          avatar: user.avatar || null,
          bio: user.bio || null,
          status: user.status,
          roles: user.dbRoles?.map(r => ({
            id: r.id,
            name: r.name,
            displayName: r.displayName,
          })) || [],
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error('[UserController.getProfile] Error', {
        error: error.message,
        userId: req.user.id,
      });
      return BaseController.error(res, 'Failed to get profile');
    }
  }

  /**
   * PUT /api/v1/users/profile
   * Update current user profile
   */
  static async updateProfile(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    const data = req.body as UpdateProfileDto;

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: req.user.id },
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Update fields
      if (data.name) user.name = data.name;
      if (data.phone) user.phone = data.phone;
      if (data.avatar) user.avatar = data.avatar;
      if (data.bio) user.bio = data.bio;

      // Email change requires verification (not implemented here)
      if (data.email && data.email !== user.email) {
        return BaseController.error(res, 'Email change requires verification', 400);
      }

      user.updatedAt = new Date();
      await userRepository.save(user);

      return BaseController.ok(res, {
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatar: user.avatar,
          bio: user.bio,
        },
      });
    } catch (error: any) {
      logger.error('[UserController.updateProfile] Error', {
        error: error.message,
        userId: req.user.id,
      });
      return BaseController.error(res, 'Failed to update profile');
    }
  }

  /**
   * PUT /api/v1/users/password
   * Change password
   */
  static async changePassword(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    const data = req.body as ChangePasswordDto;

    try {
      // Check password confirmation
      if (data.newPassword !== data.newPasswordConfirm) {
        return BaseController.error(res, 'Passwords do not match', 400);
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: req.user.id },
        select: ['id', 'password'],
      });

      if (!user || !user.password) {
        return BaseController.notFound(res, 'User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(data.currentPassword, user.password);
      if (!isValidPassword) {
        return BaseController.error(res, 'Current password is incorrect', 400);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(data.newPassword, env.getNumber('BCRYPT_ROUNDS', 12));
      user.password = hashedPassword;
      user.updatedAt = new Date();

      await userRepository.save(user);

      return BaseController.ok(res, {
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      logger.error('[UserController.changePassword] Error', {
        error: error.message,
        userId: req.user.id,
      });
      return BaseController.error(res, 'Failed to change password');
    }
  }

  /**
   * GET /api/v1/users/sessions
   * Get user sessions
   */
  static async getSessions(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    try {
      // TODO: Implement session retrieval from RefreshToken table
      const { RefreshToken } = await import('../../auth/entities/RefreshToken.js');
      const sessionRepository = AppDataSource.getRepository(RefreshToken);

      const sessions = await sessionRepository.find({
        where: { userId: req.user.id },
        order: { createdAt: 'DESC' },
      });

      return BaseController.ok(res, {
        sessions: sessions.map(s => ({
          id: s.id,
          deviceInfo: s.deviceInfo || 'Unknown device',
          ipAddress: s.ipAddress,
          lastActiveAt: s.lastUsedAt || s.createdAt,
          createdAt: s.createdAt,
        })),
      });
    } catch (error: any) {
      logger.error('[UserController.getSessions] Error', {
        error: error.message,
        userId: req.user.id,
      });
      return BaseController.error(res, 'Failed to get sessions');
    }
  }

  /**
   * DELETE /api/v1/users/sessions/:sessionId
   * Delete a specific session
   */
  static async deleteSession(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    const { sessionId } = req.params;

    try {
      const { RefreshToken } = await import('../../auth/entities/RefreshToken.js');
      const sessionRepository = AppDataSource.getRepository(RefreshToken);

      const session = await sessionRepository.findOne({
        where: { id: sessionId, userId: req.user.id },
      });

      if (!session) {
        return BaseController.notFound(res, 'Session not found');
      }

      await sessionRepository.remove(session);

      return BaseController.ok(res, {
        message: 'Session deleted successfully',
      });
    } catch (error: any) {
      logger.error('[UserController.deleteSession] Error', {
        error: error.message,
        userId: req.user.id,
        sessionId,
      });
      return BaseController.error(res, 'Failed to delete session');
    }
  }

  /**
   * GET /api/v1/users/profile/completeness
   * Get profile completeness percentage
   */
  static async getProfileCompleteness(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: req.user.id },
        select: ['id', 'email', 'name', 'phone', 'avatar', 'bio'],
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Calculate completeness
      const fields = {
        email: !!user.email,
        name: !!user.name,
        phone: !!user.phone,
        avatar: !!user.avatar,
        bio: !!user.bio,
      };

      const completed = Object.values(fields).filter(Boolean).length;
      const total = Object.keys(fields).length;
      const percentage = Math.round((completed / total) * 100);

      return BaseController.ok(res, {
        completeness: percentage,
        fields: {
          email: fields.email,
          name: fields.name,
          phone: fields.phone,
          avatar: fields.avatar,
          bio: fields.bio,
        },
        missingFields: Object.entries(fields)
          .filter(([_, value]) => !value)
          .map(([key]) => key),
      });
    } catch (error: any) {
      logger.error('[UserController.getProfileCompleteness] Error', {
        error: error.message,
        userId: req.user.id,
      });
      return BaseController.error(res, 'Failed to calculate completeness');
    }
  }
}
```

**작업 항목:**
- [ ] `UserController` 클래스 생성
- [ ] `getProfile()` 메서드 구현
- [ ] `updateProfile()` 메서드 구현
- [ ] `changePassword()` 메서드 구현
- [ ] `getSessions()` 메서드 구현
- [ ] `deleteSession()` 메서드 구현
- [ ] `getProfileCompleteness()` 메서드 구현

#### 3.2.2 UserManagementController (Admin CRUD)

```typescript
// src/modules/user/controllers/user-management.controller.ts

import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../../auth/entities/User.js';
import { UserQueryDto, UpdateUserDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';

/**
 * User Management Controller - NextGen Pattern
 *
 * Handles admin user management operations:
 * - List users (paginated)
 * - Get user by ID
 * - Update user (admin)
 * - Delete user (admin)
 */
export class UserManagementController extends BaseController {
  /**
   * GET /api/v1/users
   * List all users (paginated, filtered)
   */
  static async listUsers(req: Request, res: Response): Promise<any> {
    const query = req.query as unknown as UserQueryDto;

    try {
      const userRepository = AppDataSource.getRepository(User);

      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Build query
      const queryBuilder = userRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.email',
          'user.name',
          'user.role',
          'user.status',
          'user.createdAt',
          'user.updatedAt',
        ])
        .leftJoinAndSelect('user.dbRoles', 'roles');

      // Apply filters
      if (query.search) {
        queryBuilder.andWhere('(user.name LIKE :search OR user.email LIKE :search)', {
          search: `%${query.search}%`,
        });
      }

      if (query.role) {
        queryBuilder.andWhere('user.role = :role', { role: query.role });
      }

      if (query.status) {
        queryBuilder.andWhere('user.status = :status', { status: query.status });
      }

      // Apply sorting
      const sortBy = query.sortBy || 'createdAt';
      const sortOrder = query.sortOrder || 'DESC';
      queryBuilder.orderBy(`user.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

      // Execute query
      const [users, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

      return BaseController.okPaginated(
        res,
        users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
          roles: u.dbRoles?.map(r => r.name) || [],
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        })),
        {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      );
    } catch (error: any) {
      logger.error('[UserManagementController.listUsers] Error', {
        error: error.message,
      });
      return BaseController.error(res, 'Failed to list users');
    }
  }

  /**
   * GET /api/v1/users/:id
   * Get user by ID
   */
  static async getUserById(req: Request, res: Response): Promise<any> {
    const { id } = req.params;

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id },
        relations: ['dbRoles'],
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      return BaseController.ok(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatar: user.avatar,
          bio: user.bio,
          role: user.role,
          status: user.status,
          roles: user.dbRoles?.map(r => ({
            id: r.id,
            name: r.name,
            displayName: r.displayName,
          })) || [],
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error('[UserManagementController.getUserById] Error', {
        error: error.message,
        userId: id,
      });
      return BaseController.error(res, 'Failed to get user');
    }
  }

  /**
   * PUT /api/v1/users/:id
   * Update user (admin only)
   */
  static async updateUser(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    const data = req.body as UpdateUserDto;

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id } });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Update fields
      if (data.name) user.name = data.name;
      if (data.email) user.email = data.email;
      if (data.status) user.status = data.status as any;
      if (data.role) user.role = data.role as any;

      user.updatedAt = new Date();
      await userRepository.save(user);

      return BaseController.ok(res, {
        message: 'User updated successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      });
    } catch (error: any) {
      logger.error('[UserManagementController.updateUser] Error', {
        error: error.message,
        userId: id,
      });
      return BaseController.error(res, 'Failed to update user');
    }
  }

  /**
   * DELETE /api/v1/users/:id
   * Delete user (admin only)
   */
  static async deleteUser(req: Request, res: Response): Promise<any> {
    const { id } = req.params;

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id } });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Soft delete by setting status to 'deleted'
      user.status = 'deleted' as any;
      user.updatedAt = new Date();
      await userRepository.save(user);

      return BaseController.ok(res, {
        message: 'User deleted successfully',
      });
    } catch (error: any) {
      logger.error('[UserManagementController.deleteUser] Error', {
        error: error.message,
        userId: id,
      });
      return BaseController.error(res, 'Failed to delete user');
    }
  }
}
```

**작업 항목:**
- [ ] `UserManagementController` 클래스 생성
- [ ] `listUsers()` 메서드 구현 (pagination, filtering, sorting)
- [ ] `getUserById()` 메서드 구현
- [ ] `updateUser()` 메서드 구현
- [ ] `deleteUser()` 메서드 구현

#### 3.2.3 UserRoleController

```typescript
// src/modules/user/controllers/user-role.controller.ts

import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../../auth/entities/User.js';
import { RoleAssignment } from '../../auth/entities/RoleAssignment.js';
import { Role } from '../../auth/entities/Role.js';
import { AssignRoleDto, RemoveRoleDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';

/**
 * User Role Controller - NextGen Pattern
 *
 * Handles user role management:
 * - Get available roles
 * - Assign role to user
 * - Remove role from user
 * - Get user roles
 */
export class UserRoleController extends BaseController {
  /**
   * GET /api/v1/users/roles
   * Get all available roles
   */
  static async getRoles(req: Request, res: Response): Promise<any> {
    try {
      const roleRepository = AppDataSource.getRepository(Role);
      const roles = await roleRepository.find({
        order: { name: 'ASC' },
      });

      return BaseController.ok(res, {
        roles: roles.map(r => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
          description: r.description,
        })),
      });
    } catch (error: any) {
      logger.error('[UserRoleController.getRoles] Error', {
        error: error.message,
      });
      return BaseController.error(res, 'Failed to get roles');
    }
  }

  /**
   * GET /api/v1/users/:id/roles
   * Get user roles
   */
  static async getUserRoles(req: Request, res: Response): Promise<any> {
    const { id } = req.params;

    try {
      const assignmentRepository = AppDataSource.getRepository(RoleAssignment);
      const assignments = await assignmentRepository.find({
        where: { userId: id },
        relations: ['role'],
        order: { assignedAt: 'DESC' },
      });

      return BaseController.ok(res, {
        roles: assignments.map(a => ({
          id: a.id,
          role: a.role,
          isActive: a.isActive,
          validFrom: a.validFrom,
          validUntil: a.validUntil,
          assignedAt: a.assignedAt,
        })),
      });
    } catch (error: any) {
      logger.error('[UserRoleController.getUserRoles] Error', {
        error: error.message,
        userId: id,
      });
      return BaseController.error(res, 'Failed to get user roles');
    }
  }

  /**
   * POST /api/v1/users/:id/roles
   * Assign role to user
   */
  static async assignRole(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    const data = req.body as AssignRoleDto;

    try {
      // Check if user exists
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id } });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Create role assignment
      const assignmentRepository = AppDataSource.getRepository(RoleAssignment);
      const assignment = new RoleAssignment();
      assignment.userId = id;
      assignment.role = data.role;
      assignment.isActive = true;
      assignment.validFrom = data.validFrom ? new Date(data.validFrom) : new Date();
      assignment.validUntil = data.validUntil ? new Date(data.validUntil) : undefined;
      assignment.assignedAt = new Date();

      await assignmentRepository.save(assignment);

      return BaseController.created(res, {
        message: 'Role assigned successfully',
        assignment: {
          id: assignment.id,
          role: assignment.role,
          validFrom: assignment.validFrom,
          validUntil: assignment.validUntil,
        },
      });
    } catch (error: any) {
      logger.error('[UserRoleController.assignRole] Error', {
        error: error.message,
        userId: id,
        role: data.role,
      });
      return BaseController.error(res, 'Failed to assign role');
    }
  }

  /**
   * DELETE /api/v1/users/:id/roles/:roleId
   * Remove role from user
   */
  static async removeRole(req: Request, res: Response): Promise<any> {
    const { id, roleId } = req.params;

    try {
      const assignmentRepository = AppDataSource.getRepository(RoleAssignment);
      const assignment = await assignmentRepository.findOne({
        where: { id: roleId, userId: id },
      });

      if (!assignment) {
        return BaseController.notFound(res, 'Role assignment not found');
      }

      await assignmentRepository.remove(assignment);

      return BaseController.ok(res, {
        message: 'Role removed successfully',
      });
    } catch (error: any) {
      logger.error('[UserRoleController.removeRole] Error', {
        error: error.message,
        userId: id,
        roleId,
      });
      return BaseController.error(res, 'Failed to remove role');
    }
  }
}
```

**작업 항목:**
- [ ] `UserRoleController` 클래스 생성
- [ ] `getRoles()` 메서드 구현
- [ ] `getUserRoles()` 메서드 구현
- [ ] `assignRole()` 메서드 구현
- [ ] `removeRole()` 메서드 구현

#### 3.2.4 UserActivityController

```typescript
// src/modules/user/controllers/user-activity.controller.ts

import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { AppDataSource } from '../../../database/connection.js';
import { LoginAttempt } from '../../auth/entities/LoginAttempt.js';
import { ActivityQueryDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';

/**
 * User Activity Controller - NextGen Pattern
 *
 * Handles user activity logging and retrieval
 */
export class UserActivityController extends BaseController {
  /**
   * GET /api/v1/users/:id/activities
   * Get user activity logs
   */
  static async getUserActivities(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    const query = req.query as unknown as ActivityQueryDto;

    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Get login attempts (as activity logs)
      const attemptRepository = AppDataSource.getRepository(LoginAttempt);
      const queryBuilder = attemptRepository
        .createQueryBuilder('attempt')
        .where('attempt.userId = :userId', { userId: id })
        .orderBy('attempt.attemptedAt', 'DESC');

      // Apply filters
      if (query.type) {
        queryBuilder.andWhere('attempt.successful = :successful', {
          successful: query.type === 'login_success',
        });
      }

      if (query.startDate) {
        queryBuilder.andWhere('attempt.attemptedAt >= :startDate', {
          startDate: new Date(query.startDate),
        });
      }

      if (query.endDate) {
        queryBuilder.andWhere('attempt.attemptedAt <= :endDate', {
          endDate: new Date(query.endDate),
        });
      }

      const [attempts, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

      return BaseController.okPaginated(
        res,
        attempts.map(a => ({
          id: a.id,
          type: a.successful ? 'login_success' : 'login_failed',
          ipAddress: a.ipAddress,
          userAgent: a.userAgent,
          timestamp: a.attemptedAt,
        })),
        {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      );
    } catch (error: any) {
      logger.error('[UserActivityController.getUserActivities] Error', {
        error: error.message,
        userId: id,
      });
      return BaseController.error(res, 'Failed to get user activities');
    }
  }

  /**
   * GET /api/v1/users/activities/me
   * Get current user activities
   */
  static async getMyActivities(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    // Reuse getUserActivities with current user ID
    req.params.id = req.user.id;
    return UserActivityController.getUserActivities(req, res);
  }
}
```

**작업 항목:**
- [ ] `UserActivityController` 클래스 생성
- [ ] `getUserActivities()` 메서드 구현
- [ ] `getMyActivities()` 메서드 구현

#### 3.2.5 Controller Index

```typescript
// src/modules/user/controllers/index.ts

/**
 * User Module Controllers
 *
 * Barrel export for all user-related controllers
 */

export * from './user.controller.js';
export * from './user-management.controller.js';
export * from './user-role.controller.js';
export * from './user-activity.controller.js';
```

---

### Phase 3: Routes 통합 ✅

#### 3.3.1 NextGen User Routes

```typescript
// src/modules/user/routes/user.routes.ts

import { Router, type IRouter } from 'express';
import {
  UserController,
  UserManagementController,
  UserRoleController,
  UserActivityController,
} from '../controllers/index.js';
import {
  validateDto,
  validateQuery,
} from '../../../common/middleware/validation.middleware.js';
import {
  requireAuth,
  requireAdmin,
  requireRole,
} from '../../../common/middleware/auth.middleware.js';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  UserQueryDto,
  UpdateUserDto,
  AssignRoleDto,
  ActivityQueryDto,
} from '../dto/index.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

const router: IRouter = Router();

/**
 * ========================================
 * User Profile Routes (Self-service)
 * ========================================
 */

// GET /api/v1/users/profile - Get current user profile
router.get(
  '/profile',
  requireAuth,
  asyncHandler(UserController.getProfile)
);

// PUT /api/v1/users/profile - Update current user profile
router.put(
  '/profile',
  requireAuth,
  validateDto(UpdateProfileDto),
  asyncHandler(UserController.updateProfile)
);

// GET /api/v1/users/profile/completeness - Get profile completeness
router.get(
  '/profile/completeness',
  requireAuth,
  asyncHandler(UserController.getProfileCompleteness)
);

// PUT /api/v1/users/password - Change password
router.put(
  '/password',
  requireAuth,
  validateDto(ChangePasswordDto),
  asyncHandler(UserController.changePassword)
);

/**
 * ========================================
 * User Session Routes
 * ========================================
 */

// GET /api/v1/users/sessions - Get user sessions
router.get(
  '/sessions',
  requireAuth,
  asyncHandler(UserController.getSessions)
);

// DELETE /api/v1/users/sessions/:sessionId - Delete session
router.delete(
  '/sessions/:sessionId',
  requireAuth,
  asyncHandler(UserController.deleteSession)
);

/**
 * ========================================
 * User Activity Routes
 * ========================================
 */

// GET /api/v1/users/activities/me - Get current user activities
router.get(
  '/activities/me',
  requireAuth,
  validateQuery(ActivityQueryDto),
  asyncHandler(UserActivityController.getMyActivities)
);

/**
 * ========================================
 * User Management Routes (Admin)
 * ========================================
 */

// GET /api/v1/users - List all users (paginated)
router.get(
  '/',
  requireAdmin,
  validateQuery(UserQueryDto),
  asyncHandler(UserManagementController.listUsers)
);

// GET /api/v1/users/:id - Get user by ID
router.get(
  '/:id',
  requireAdmin,
  asyncHandler(UserManagementController.getUserById)
);

// PUT /api/v1/users/:id - Update user
router.put(
  '/:id',
  requireAdmin,
  validateDto(UpdateUserDto),
  asyncHandler(UserManagementController.updateUser)
);

// DELETE /api/v1/users/:id - Delete user
router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(UserManagementController.deleteUser)
);

// GET /api/v1/users/:id/activities - Get user activities
router.get(
  '/:id/activities',
  requireAdmin,
  validateQuery(ActivityQueryDto),
  asyncHandler(UserActivityController.getUserActivities)
);

/**
 * ========================================
 * User Role Management Routes
 * ========================================
 */

// GET /api/v1/users/roles - Get all available roles
router.get(
  '/roles',
  requireAuth,
  asyncHandler(UserRoleController.getRoles)
);

// GET /api/v1/users/:id/roles - Get user roles
router.get(
  '/:id/roles',
  requireAdmin,
  asyncHandler(UserRoleController.getUserRoles)
);

// POST /api/v1/users/:id/roles - Assign role to user
router.post(
  '/:id/roles',
  requireAdmin,
  validateDto(AssignRoleDto),
  asyncHandler(UserRoleController.assignRole)
);

// DELETE /api/v1/users/:id/roles/:roleId - Remove role from user
router.delete(
  '/:id/roles/:roleId',
  requireAdmin,
  asyncHandler(UserRoleController.removeRole)
);

export default router;
```

**작업 항목:**
- [ ] `user.routes.ts` 파일 생성
- [ ] 모든 Profile 엔드포인트 라우팅
- [ ] 모든 Session 엔드포인트 라우팅
- [ ] 모든 Activity 엔드포인트 라우팅
- [ ] 모든 Management 엔드포인트 라우팅
- [ ] 모든 Role 엔드포인트 라우팅
- [ ] DTO Validation 미들웨어 적용
- [ ] Auth 미들웨어 적용 (requireAuth, requireAdmin)

#### 3.3.2 Routes 등록 (Main Router)

```typescript
// src/config/routes.config.ts

import userNextGenRoutes from '../modules/user/routes/user.routes.js';

// ... existing imports ...

export function setupRoutes(app: Application): void {
  // ... existing routes ...

  // ============================================================================
  // USER ROUTES
  // ============================================================================

  // ✅ NEW: NextGen user routes (recommended)
  app.use('/api/v1/users', userNextGenRoutes);

  // ❌ DEPRECATED: Legacy user routes - Use /api/v1/users instead (Removal: 2025-03-01)
  app.use(
    '/api/user',
    deprecatedRoute('/api/v1/users', '2025-03-01T00:00:00Z'),
    logDeprecatedUsage('/api/user'),
    userRoutes
  );

  // ❌ DEPRECATED: Legacy users routes - Use /api/v1/users instead (Removal: 2025-03-01)
  app.use(
    '/api/users',
    deprecatedRoute('/api/v1/users', '2025-03-01T00:00:00Z'),
    logDeprecatedUsage('/api/users'),
    usersRoutes
  );

  // ❌ DEPRECATED: Legacy userRole routes - Use /api/v1/users/:id/roles instead (Removal: 2025-03-01)
  app.use(
    '/api/v1/userRole',
    deprecatedRoute('/api/v1/users/:id/roles', '2025-03-01T00:00:00Z'),
    logDeprecatedUsage('/api/v1/userRole'),
    userRoleRoutes
  );

  // ... rest of routes ...
}
```

**작업 항목:**
- [ ] NextGen User Routes 등록 (`/api/v1/users`)
- [ ] Legacy Routes Deprecation 처리
- [ ] Redirect 메커니즘 구현
- [ ] API 문서 업데이트

---

### Phase 4: Legacy Routes Deprecation ✅

#### 3.4.1 Deprecation 전략

```typescript
// src/routes/user.ts (Legacy)
// ⚠️ DEPRECATED - Use /api/v1/users instead
// This file will be removed on 2025-03-01

import { Router } from 'express';

const router = Router();

router.all('*', (req, res) => {
  res.status(410).json({
    deprecated: true,
    message: 'This API version is deprecated',
    oldEndpoint: req.originalUrl,
    newEndpoint: req.originalUrl.replace('/api/user', '/api/v1/users'),
    documentation: 'https://docs.o4o-platform.com/api/v1/users',
    removedAt: '2025-03-01',
  });
});

export default router;
```

**작업 항목:**
- [ ] `user.ts` Deprecation 처리
- [ ] `users.routes.ts` Deprecation 처리
- [ ] `v1/userRole.routes.ts` Deprecation 처리
- [ ] 90일 제거 일정 명시
- [ ] API 문서에 Migration Guide 추가

---

### Phase 5: 통합 테스트 및 검증 ✅

#### 3.5.1 엔드포인트 테스트 스크립트

```bash
# scripts/test-user-endpoints.sh

#!/bin/bash

BASE_URL="http://localhost:4000"
API_V1="${BASE_URL}/api/v1"

echo "🧪 Testing USER Endpoints (NextGen)"

# Login first to get token
echo "\n🔐 Login to get access token"
LOGIN_RESPONSE=$(curl -s -X POST "${API_V1}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
echo "Access Token: ${ACCESS_TOKEN:0:20}..."

# Test 1: Get Profile
echo "\n👤 Test 1: Get Profile"
curl -s -X GET "${API_V1}/users/profile" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Test 2: Update Profile
echo "\n✏️ Test 2: Update Profile"
curl -s -X PUT "${API_V1}/users/profile" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "phone": "1234567890",
    "bio": "Test bio"
  }'

# Test 3: Get Profile Completeness
echo "\n📊 Test 3: Get Profile Completeness"
curl -s -X GET "${API_V1}/users/profile/completeness" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Test 4: Get Sessions
echo "\n🔑 Test 4: Get Sessions"
curl -s -X GET "${API_V1}/users/sessions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Test 5: Change Password
echo "\n🔒 Test 5: Change Password"
curl -s -X PUT "${API_V1}/users/password" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "newPassword123",
    "newPasswordConfirm": "newPassword123"
  }'

# Test 6: List Users (Admin)
echo "\n📋 Test 6: List Users (Admin)"
curl -s -X GET "${API_V1}/users?page=1&limit=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

echo "\n✅ All tests completed"
```

**작업 항목:**
- [ ] 엔드포인트 테스트 스크립트 작성
- [ ] 모든 엔드포인트 수동 테스트
- [ ] Response 구조 검증
- [ ] 에러 핸들링 검증
- [ ] Pagination 검증
- [ ] Authorization 검증

#### 3.5.2 검증 체크리스트

```markdown
## 기능 검증

- [ ] ✅ Profile Management
  - [ ] Get profile
  - [ ] Update profile
  - [ ] Profile completeness
  - [ ] Validation errors

- [ ] ✅ Password Management
  - [ ] Change password (success)
  - [ ] Wrong current password
  - [ ] Password mismatch
  - [ ] Validation errors

- [ ] ✅ Session Management
  - [ ] Get sessions
  - [ ] Delete session
  - [ ] Session not found error

- [ ] ✅ User Management (Admin)
  - [ ] List users (pagination)
  - [ ] List users (filtering)
  - [ ] List users (sorting)
  - [ ] Get user by ID
  - [ ] Update user
  - [ ] Delete user

- [ ] ✅ Role Management (Admin)
  - [ ] Get available roles
  - [ ] Get user roles
  - [ ] Assign role
  - [ ] Remove role

- [ ] ✅ Activity Logs
  - [ ] Get user activities
  - [ ] Get my activities
  - [ ] Activity filtering
```

---

## 4. 완료 기준 (Definition of Done)

### ✅ Phase B-2 Step 4 완료 조건

#### 4.1 구조 완성도
- [ ] ✅ `src/modules/user/controllers/` 4개 컨트롤러 생성 완료
  - [ ] `user.controller.ts`
  - [ ] `user-management.controller.ts`
  - [ ] `user-role.controller.ts`
  - [ ] `user-activity.controller.ts`
- [ ] ✅ `src/modules/user/routes/user.routes.ts` 통합 라우트 생성
- [ ] ✅ `src/modules/user/dto/` 모든 DTOs 정의 완료
- [ ] ✅ BaseController 패턴 100% 적용

#### 4.2 코드 품질
- [ ] ✅ TypeScript 타입 에러 0개
- [ ] ✅ ESLint 에러 0개
- [ ] ✅ 모든 컨트롤러 메서드에 JSDoc 주석
- [ ] ✅ 에러 핸들링 표준화 완료

#### 4.3 기능 검증
- [ ] ✅ 모든 엔드포인트 수동 테스트 통과
- [ ] ✅ Pagination 정상 동작
- [ ] ✅ Filtering & Sorting 정상 동작
- [ ] ✅ Authorization 정상 동작

#### 4.4 Legacy 처리
- [ ] ✅ Legacy Routes 4개 Deprecation 처리
- [ ] ✅ Redirect 메커니즘 구현
- [ ] ✅ Deprecation 경고 메시지 추가

#### 4.5 문서화
- [ ] ✅ API 엔드포인트 문서 업데이트
- [ ] ✅ Migration Guide 작성
- [ ] ✅ Completion Report 작성

---

## 5. 다음 단계 (Next Steps)

### Phase B-3: Commerce Module Migration
- Products, Cart, Orders 모듈 NextGen 전환
- AUTH + User 모듈 패턴을 참조하여 구현

### Phase B-4: Dropshipping Module Migration
- Supplier, Partner, Seller 모듈 NextGen 전환

---

## 6. 참고 자료 (References)

### 6.1 관련 문서
- `docs/nextgen-backend/tasks/step25_api_server_v2_workorder.md` - Step 25 전체 계획
- `docs/nextgen-backend/tasks/step25_phase_b2_step3_auth_controllers_routes_workorder.md` - AUTH 참조
- `src/common/docs/controller-pattern.md` - Controller 패턴 가이드
- `src/common/docs/dto-pattern.md` - DTO 패턴 가이드

### 6.2 NextGen 코드 (참조용)
- `src/modules/auth/controllers/` - AUTH Controllers (참조용)
- `src/modules/auth/services/` - AUTH Services (참조용)
- `src/modules/auth/entities/` - Shared Entities
- `src/common/base.controller.ts` - BaseController 구현
- `src/common/middleware/auth.middleware.ts` - Auth 미들웨어

### 6.3 Legacy 코드 (마이그레이션 대상)
- `src/routes/user.ts` - Legacy User Routes
- `src/routes/users.routes.ts` - Legacy Users Routes
- `src/routes/v1/users.routes.ts` - V1 Users Routes
- `src/routes/v1/userRole.routes.ts` - V1 UserRole Routes

---

## 7. 작업 시작 명령어 (Quick Start Commands)

```bash
# 1. 작업 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feature/user-profile-migration

# 2. DTOs 디렉토리 생성
mkdir -p src/modules/user/dto
mkdir -p src/modules/user/controllers
mkdir -p src/modules/user/routes

# 3. 작업 진행
# (DTOs → Controllers → Routes → Tests 순서로 진행)

# 4. 빌드 및 테스트
cd apps/api-server
pnpm run build
pnpm run test

# 5. 엔드포인트 테스트
bash scripts/test-user-endpoints.sh

# 6. 커밋 및 푸시
git add .
git commit -m "feat(user): Migrate User/Profile controllers and routes to NextGen pattern"
git push origin feature/user-profile-migration
```

---

## 8. 위험 요소 및 대응 방안 (Risks & Mitigation)

### 🔴 높은 위험
**R1: Legacy 엔드포인트 의존성**
- **위험**: 프론트엔드가 아직 `/api/user` 경로 사용 중
- **대응**: Redirect 메커니즘 구현 + 90일 유예 기간

**R2: User ↔ AUTH 순환 의존성**
- **위험**: User 모듈과 AUTH 모듈 간 순환 import
- **대응**: Shared entities 사용 + 명확한 의존성 방향

### 🟡 중간 위험
**R3: Session 관리 변경**
- **위험**: Session endpoint 변경으로 인한 기능 손실
- **대응**: 기존 로직 유지 + 충분한 테스트

**R4: Role Assignment 로직**
- **위험**: Role 할당/해제 로직 변경으로 인한 권한 문제
- **대응**: 기존 PermissionService 활용 + 단위 테스트

---

## 9. 개발 채팅방 전달 메시지 (Quick Start)

아래 메시지를 개발 채팅방에 그대로 붙여넣으면
User/Profile 모듈 리팩토링을 바로 시작합니다:

```
📌 Step 25 Phase B-2 — Step 4: User & Profile Module Migration 시작합니다.

참조 문서:
docs/nextgen-backend/tasks/step25_phase_b2_step4_user_profile_migration_workorder.md

🔽 수행 단계:

1) DTO 생성 (modules/user/dto/)
   - update-profile.dto.ts
   - change-password.dto.ts
   - user-query.dto.ts
   - update-user.dto.ts
   - user-role.dto.ts
   - activity-query.dto.ts

2) Controller 구현 (modules/user/controllers/)
   - UserController (Profile, Password, Sessions)
   - UserManagementController (CRUD)
   - UserRoleController (Role management)
   - UserActivityController (Activity logs)
   → BaseController 상속(static pattern)
   → 모든 business logic은 Service 계층 호출

3) User Routes 재작성 (modules/user/routes/user.routes.ts)
   → 기존 user.ts, users.routes.ts, v1/users.routes.ts 통합
   → validation.middleware 적용
   → /api/v1/users/* prefix 통일
   → profile, sessions, activities, roles 등 라우트 정리

4) Legacy routes deprecation 처리
   - src/routes/user.ts
   - src/routes/users.routes.ts
   - src/routes/v1/userRole.routes.ts

5) Build & Test
   - pnpm run build 통과
   - 모든 User 엔드포인트 동작 테스트
   - Profile → Password → Sessions → Activities 정상 확인

AUTH 모듈 패턴 그대로 적용하며 모든 레거시 코드는 deprecate 처리해주세요.

모든 작업 완료 후 보고해주세요.
```

---

**작업 시작일**: 2025-12-03
**목표 완료일**: 2025-12-04
**담당자**: Claude (Rena AI Assistant)
**리뷰어**: Rena

---

*이 Work Order는 Step 25 Phase B-2 Step 4의 공식 작업 지시서입니다.*
*모든 구현은 이 문서의 체크리스트를 기준으로 진행하며, 완료 시 Completion Report를 작성합니다.*
