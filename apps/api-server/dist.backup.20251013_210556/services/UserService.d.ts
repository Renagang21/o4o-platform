import { User, UserRole, UserStatus } from '../entities/User';
import { BusinessInfo } from '../types/user';
export declare class UserService {
    private static userRepository;
    /**
     * Get user by ID
     */
    static getUserById(id: string): Promise<User | null>;
    /**
     * Get user by email
     */
    static getUserByEmail(email: string): Promise<User | null>;
    /**
     * Create new user
     */
    static createUser(userData: {
        email: string;
        password: string;
        name?: string;
        firstName?: string;
        lastName?: string;
        role?: UserRole;
        businessInfo?: BusinessInfo;
    }): Promise<User>;
    /**
     * Update user role
     */
    static updateUserRole(userId: string, role: UserRole): Promise<User>;
    /**
     * Update user business info
     */
    static updateUserBusinessInfo(userId: string, businessInfo: BusinessInfo): Promise<User>;
    /**
     * Update user status
     */
    static updateUserStatus(userId: string, status: UserStatus): Promise<User>;
    /**
     * Get users by role
     */
    static getUsersByRole(role: UserRole): Promise<User[]>;
    /**
     * Get users by status
     */
    static getUsersByStatus(status: UserStatus): Promise<User[]>;
    /**
     * Handle failed login attempt
     */
    static handleFailedLogin(user: User): Promise<void>;
    /**
     * Handle successful login
     */
    static handleSuccessfulLogin(user: User): Promise<void>;
    /**
     * Verify email
     */
    static verifyEmail(userId: string): Promise<void>;
    /**
     * Check if account is locked
     */
    static isAccountLocked(user: User): boolean;
    /**
     * Hash password
     */
    static hashPassword(password: string): Promise<string>;
    /**
     * Compare password
     */
    static comparePassword(password: string, hashedPassword: string): Promise<boolean>;
    /**
     * Get locked accounts
     */
    static getLockedAccounts(): Promise<User[]>;
    /**
     * Get default permissions for role
     */
    private static getDefaultPermissions;
}
//# sourceMappingURL=UserService.d.ts.map