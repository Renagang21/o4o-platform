import { FindManyOptions, MoreThan } from 'typeorm';
import { BaseService } from '../../../common/base.service.js';
import { AppDataSource } from '../../../database/connection.js';
import { User, UserRole, UserStatus } from '../entities/User.js';
import type { BusinessInfo } from '../../../types/user.js';
import { hashPassword, getDefaultPermissions } from '../utils/auth.utils.js';
import { roleAssignmentService } from './role-assignment.service.js';

/**
 * UserService - Manages User entity CRUD and business logic
 *
 * Extends BaseService to inherit standard CRUD operations:
 * - findById(id): Find user by ID
 * - findAll(options): Find all users with filtering
 * - create(data): Create new user
 * - update(id, data): Update existing user
 * - delete(id): Delete user
 * - paginate(page, limit, options): Get paginated users
 * - count(options): Count users
 * - exists(id): Check if user exists
 */
export class UserService extends BaseService<User> {
  constructor() {
    super(AppDataSource.getRepository(User));
  }

  /**
   * Find user by email
   * @param email - User email
   * @returns User or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.repository.findOne({ where: { email } });
    } catch (error) {
      // Error log removed
      return null;
    }
  }

  /**
   * Create new user with password hashing and defaults
   * @param userData - User registration data
   * @returns Created user
   */
  async createUser(userData: {
    email: string;
    password: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    businessInfo?: BusinessInfo;
  }): Promise<User> {
    const hashedPassword = await hashPassword(userData.password);

    const role = userData.role || UserRole.USER;

    const user = this.repository.create({
      ...userData,
      password: hashedPassword,
      status: UserStatus.PENDING,
      permissions: getDefaultPermissions(role),
      isActive: true,
      isEmailVerified: false,
      loginAttempts: 0,
    });

    const saved = await this.repository.save(user);

    // Write to role_assignments (SSOT)
    await roleAssignmentService.assignRole({ userId: saved.id, role });

    return saved;
  }

  /**
   * Update user role and permissions
   * @param userId - User ID
   * @param role - New role
   * @returns Updated user
   * @throws Error if user not found
   */
  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.permissions = getDefaultPermissions(role);
    await this.repository.save(user);

    // Phase3-E: update role via role_assignments table
    await roleAssignmentService.removeAllRoles(userId);
    await roleAssignmentService.assignRole({ userId, role });

    return user;
  }

  /**
   * Update user business information
   * @param userId - User ID
   * @param businessInfo - Business information
   * @returns Updated user
   * @throws Error if user not found
   */
  async updateUserBusinessInfo(
    userId: string,
    businessInfo: BusinessInfo
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.businessInfo = businessInfo;
    return await this.repository.save(user);
  }

  /**
   * Update user status
   * @param userId - User ID
   * @param status - New status
   * @returns Updated user
   * @throws Error if user not found
   */
  async updateUserStatus(userId: string, status: UserStatus): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.status = status;
    if (status === UserStatus.ACTIVE) {
      user.isActive = true;
    }

    return await this.repository.save(user);
  }

  /**
   * Find users by role
   * @param role - User role to filter
   * @returns Array of users with specified role
   */
  async findByRole(role: UserRole): Promise<User[]> {
    try {
      // role column removed - Phase3-E: filter by isActive only
      return await this.repository.find({
        where: { isActive: true },
        select: [
          'id',
          'email',
          'firstName',
          'lastName',
          'name',
          'status',
          'createdAt',
        ],
      });
    } catch (error) {
      // Error log removed
      return [];
    }
  }

  /**
   * Find users by status
   * @param status - User status to filter
   * @returns Array of users with specified status
   */
  async findByStatus(status: UserStatus): Promise<User[]> {
    try {
      return await this.repository.find({
        where: { status },
        select: [
          'id',
          'email',
          'firstName',
          'lastName',
          'name',
          'status',
          'createdAt',
        ],
      });
    } catch (error) {
      // Error log removed
      return [];
    }
  }

  /**
   * Handle failed login attempt
   * Increments login attempts and locks account after 5 failures
   * @param user - User entity
   */
  async handleFailedLogin(user: User): Promise<void> {
    user.loginAttempts += 1;

    // Lock account after 5 failed attempts for 30 minutes
    if (user.loginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }

    await this.repository.save(user);
  }

  /**
   * Handle successful login
   * Resets login attempts and updates last login timestamp
   * @param user - User entity
   */
  async handleSuccessfulLogin(user: User): Promise<void> {
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();

    await this.repository.save(user);
  }

  /**
   * Verify user email address
   * Updates email verification status and activates account
   * @param userId - User ID
   */
  async verifyEmail(userId: string): Promise<void> {
    await this.repository.update(userId, {
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
      isActive: true,
    });
  }

  /**
   * Check if user account is currently locked
   * @param user - User entity
   * @returns True if account is locked
   */
  isAccountLocked(user: User): boolean {
    if (!user.lockedUntil) return false;
    return new Date() < user.lockedUntil;
  }

  /**
   * Get all locked user accounts
   * @returns Array of locked users with relevant fields
   */
  async getLockedAccounts(): Promise<User[]> {
    try {
      return await this.repository.find({
        where: { lockedUntil: MoreThan(new Date()) },
        select: [
          'id',
          'email',
          'firstName',
          'lastName',
          'name',
          'lockedUntil',
          'loginAttempts',
          'lastLoginAt',
        ],
        order: { lockedUntil: 'DESC' },
      });
    } catch (error) {
      // Error log removed
      return [];
    }
  }
}

// Export singleton instance
export const userService = new UserService();
