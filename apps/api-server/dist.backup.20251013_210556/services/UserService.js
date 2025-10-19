"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const typeorm_1 = require("typeorm");
class UserService {
    /**
     * Get user by ID
     */
    static async getUserById(id) {
        try {
            return await this.userRepository.findOne({ where: { id } });
        }
        catch (error) {
            // Error log removed
            return null;
        }
    }
    /**
     * Get user by email
     */
    static async getUserByEmail(email) {
        try {
            return await this.userRepository.findOne({ where: { email } });
        }
        catch (error) {
            // Error log removed
            return null;
        }
    }
    /**
     * Create new user
     */
    static async createUser(userData) {
        const hashedPassword = await this.hashPassword(userData.password);
        const user = this.userRepository.create({
            ...userData,
            password: hashedPassword,
            role: userData.role || User_1.UserRole.CUSTOMER,
            status: User_1.UserStatus.PENDING,
            permissions: this.getDefaultPermissions(userData.role || User_1.UserRole.CUSTOMER),
            isActive: true,
            isEmailVerified: false,
            loginAttempts: 0
        });
        return await this.userRepository.save(user);
    }
    /**
     * Update user role
     */
    static async updateUserRole(userId, role) {
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
    static async updateUserBusinessInfo(userId, businessInfo) {
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
    static async updateUserStatus(userId, status) {
        const user = await this.getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        user.status = status;
        if (status === User_1.UserStatus.ACTIVE) {
            user.isActive = true;
        }
        return await this.userRepository.save(user);
    }
    /**
     * Get users by role
     */
    static async getUsersByRole(role) {
        try {
            return await this.userRepository.find({
                where: { role, isActive: true },
                select: ['id', 'email', 'firstName', 'lastName', 'name', 'role', 'status', 'createdAt']
            });
        }
        catch (error) {
            // Error log removed
            return [];
        }
    }
    /**
     * Get users by status
     */
    static async getUsersByStatus(status) {
        try {
            return await this.userRepository.find({
                where: { status },
                select: ['id', 'email', 'firstName', 'lastName', 'name', 'role', 'status', 'createdAt']
            });
        }
        catch (error) {
            // Error log removed
            return [];
        }
    }
    /**
     * Handle failed login attempt
     */
    static async handleFailedLogin(user) {
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
    static async handleSuccessfulLogin(user) {
        user.loginAttempts = 0;
        user.lockedUntil = null;
        user.lastLoginAt = new Date();
        await this.userRepository.save(user);
    }
    /**
     * Verify email
     */
    static async verifyEmail(userId) {
        await this.userRepository.update(userId, {
            isEmailVerified: true,
            status: User_1.UserStatus.ACTIVE,
            isActive: true
        });
    }
    /**
     * Check if account is locked
     */
    static isAccountLocked(user) {
        if (!user.lockedUntil)
            return false;
        return new Date() < user.lockedUntil;
    }
    /**
     * Hash password
     */
    static async hashPassword(password) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        return await bcryptjs_1.default.hash(password, saltRounds);
    }
    /**
     * Compare password
     */
    static async comparePassword(password, hashedPassword) {
        return await bcryptjs_1.default.compare(password, hashedPassword);
    }
    /**
     * Get locked accounts
     */
    static async getLockedAccounts() {
        try {
            return await this.userRepository.find({
                where: { lockedUntil: (0, typeorm_1.MoreThan)(new Date()) },
                select: ['id', 'email', 'firstName', 'lastName', 'name', 'lockedUntil', 'loginAttempts', 'lastLoginAt'],
                order: { lockedUntil: 'DESC' }
            });
        }
        catch (error) {
            // Error log removed
            return [];
        }
    }
    /**
     * Get default permissions for role
     */
    static getDefaultPermissions(role) {
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
exports.UserService = UserService;
UserService.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
//# sourceMappingURL=UserService.js.map