import { AppDataSource } from '../database/connection';
import { User, UserRole, UserStatus } from '../entities/User';
import bcrypt from 'bcryptjs';
import { BusinessInfo } from '../types/user';
import { MoreThan } from 'typeorm';

export class UserService {
  private static userRepository = AppDataSource.getRepository(User);

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({ where: { id } });
    } catch (error) {
      // Error log removed
      return null;
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({ where: { email } });
    } catch (error) {
      // Error log removed
      return null;
    }
  }

  /**
   * Create new user
   */
  static async createUser(userData: {
    email: string;
    password: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    businessInfo?: BusinessInfo;
  }): Promise<User> {
    const hashedPassword = await this.hashPassword(userData.password);
    
    const user = this.userRepository.create({
      ...userData,
      password: hashedPassword,
      role: userData.role || UserRole.CUSTOMER,
      status: UserStatus.PENDING,
      permissions: this.getDefaultPermissions(userData.role || UserRole.CUSTOMER),
      isActive: true,
      isEmailVerified: false,
      loginAttempts: 0
    });

    return await this.userRepository.save(user);
  }

  /**
   * Update user role
   */
  static async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.role = role;
    user.permissions = this.getDefaultPermissions(role);
    
    return await this.userRepository.save(user);
  }

  /**
   * Update user business info
   */
  static async updateUserBusinessInfo(userId: string, businessInfo: BusinessInfo): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.businessInfo = businessInfo;
    return await this.userRepository.save(user);
  }

  /**
   * Update user status
   */
  static async updateUserStatus(userId: string, status: UserStatus): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.status = status;
    if (status === UserStatus.ACTIVE) {
      user.isActive = true;
    }

    return await this.userRepository.save(user);
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      return await this.userRepository.find({ 
        where: { role, isActive: true },
        select: ['id', 'email', 'firstName', 'lastName', 'name', 'role', 'status', 'createdAt']
      });
    } catch (error) {
      // Error log removed
      return [];
    }
  }

  /**
   * Get users by status
   */
  static async getUsersByStatus(status: UserStatus): Promise<User[]> {
    try {
      return await this.userRepository.find({ 
        where: { status },
        select: ['id', 'email', 'firstName', 'lastName', 'name', 'role', 'status', 'createdAt']
      });
    } catch (error) {
      // Error log removed
      return [];
    }
  }

  /**
   * Handle failed login attempt
   */
  static async handleFailedLogin(user: User): Promise<void> {
    user.loginAttempts += 1;
    
    // Lock account after 5 failed attempts for 30 minutes
    if (user.loginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
    
    await this.userRepository.save(user);
  }

  /**
   * Handle successful login
   */
  static async handleSuccessfulLogin(user: User): Promise<void> {
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    
    await this.userRepository.save(user);
  }

  /**
   * Verify email
   */
  static async verifyEmail(userId: string): Promise<void> {
    await this.userRepository.update(userId, { 
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
      isActive: true
    });
  }

  /**
   * Check if account is locked
   */
  static isAccountLocked(user: User): boolean {
    if (!user.lockedUntil) return false;
    return new Date() < user.lockedUntil;
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password
   */
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Get locked accounts
   */
  static async getLockedAccounts(): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: { lockedUntil: MoreThan(new Date()) },
        select: ['id', 'email', 'firstName', 'lastName', 'name', 'lockedUntil', 'loginAttempts', 'lastLoginAt'],
        order: { lockedUntil: 'DESC' }
      });
    } catch (error) {
      // Error log removed
      return [];
    }
  }

  /**
   * Get default permissions for role
   */
  private static getDefaultPermissions(role: UserRole): string[] {
    const permissions = {
      customer: ['read:products', 'create:orders', 'read:own_orders'],
      seller: ['read:products', 'create:products', 'update:own_products', 'read:own_orders', 'read:analytics'],
      supplier: ['create:products', 'update:own_products', 'read:inventory', 'manage:inventory'],
      manager: ['read:all', 'manage:store', 'read:analytics'],
      admin: ['*'] // All permissions
    };

    return permissions[role] || permissions.customer;
  }
}