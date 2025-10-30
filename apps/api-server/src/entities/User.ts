import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, BeforeInsert, BeforeUpdate, OneToMany, ManyToMany, ManyToOne, JoinTable, JoinColumn } from 'typeorm';
import { UserRole, UserStatus } from '../types/auth.js';
import { BusinessInfo } from '../types/user.js';
import type { Role } from './Role.js';
import * as bcrypt from 'bcryptjs';

// Re-export types for external use
export { UserRole, UserStatus };

@Entity('users')
@Index(['email'], { unique: true })
@Index(['role'])
@Index(['isActive'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  // @IsEmail()
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string; // bcrypt hashed

  @Column({ type: 'varchar', length: 100, nullable: true })
  // @IsOptional()
  firstName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  // @IsOptional()
  lastName?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar?: string;

  @Column({ 
    type: 'enum', 
    enum: UserStatus,
    default: UserStatus.PENDING
  })
  status!: UserStatus;

  @Column({ type: 'json', nullable: true })
  businessInfo?: BusinessInfo;

  // Single role for backward compatibility
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER
  })
  // @IsEnum(UserRole)
  role!: UserRole;

  // Multiple roles support (legacy string array - kept for backward compatibility)
  @Column({
    type: 'simple-array',
    default: () => `'${UserRole.CUSTOMER}'`
  })
  roles!: string[];

  // Database roles (new ManyToMany relation)
  @ManyToMany('Role', 'users', { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' }
  })
  dbRoles?: Role[];

  // Active role (for users with multiple roles)
  @ManyToOne('Role', { nullable: true, eager: true })
  @JoinColumn({ name: 'active_role_id' })
  activeRole?: Role | null;

  // Direct permissions (in addition to role permissions)
  @Column({ type: 'json', default: () => "'[]'" })
  // @IsArray()
  permissions!: string[];

  // @Column({ type: 'json', nullable: true })
  // metadata?: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  // @IsOptional()
  refreshTokenFamily?: string; // 토큰 계열 관리

  @Column({ type: 'timestamp', nullable: true })
  // @IsOptional()
  lastLoginAt?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  // @IsOptional()
  lastLoginIp?: string;

  @Column({ type: 'integer', default: 0 })
  loginAttempts!: number;

  @Column({ type: 'timestamp', nullable: true })
  // @IsOptional()
  lockedUntil?: Date;

  // Beta user ID for beta features
  @Column({ type: 'varchar', length: 255, nullable: true })
  betaUserId?: string;

  // Domain for multi-tenant support
  @Column({ type: 'varchar', length: 255, nullable: true })
  domain?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 승인 관련 필드
  @Column({ type: 'timestamp', nullable: true })
  // @IsOptional()
  approvedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  // @IsOptional()
  approvedBy?: string; // 승인한 관리자 ID

  // 소셜 로그인 제공자 정보
  @Column({ type: 'varchar', length: 100, nullable: true })
  // @IsOptional()
  provider?: string; // 'local', 'google', 'kakao' 등

  @Column({ type: 'varchar', length: 255, nullable: true })
  // @IsOptional()
  provider_id?: string; // 외부 제공자 사용자 ID

  // 계정 잠금 상태 확인
  get isLocked(): boolean {
    return !!(this.lockedUntil && this.lockedUntil > new Date());
  }

  // 전체 이름 반환
  get fullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.email;
  }

  // Relations - lazy loaded to prevent circular dependencies
  @OneToMany('RefreshToken', 'user')
  refreshTokens?: any[];

  @OneToMany('ApprovalLog', 'user')
  approvalLogs?: any[];

  @OneToMany('ApprovalLog', 'admin')
  adminActions?: any[];

  @OneToMany('LinkedAccount', 'user')
  linkedAccounts?: any[];

  @OneToMany('AccountActivity', 'user')
  accountActivities?: any[];

  // Dropshipping relationships
  supplier?: any; // Will be set via OneToOne in Supplier entity
  seller?: any;   // Will be set via OneToOne in Seller entity
  partner?: any;  // Will be set via OneToOne in Partner entity


  // Password hashing
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  // Password validation
  async validatePassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
  }

  // Role helper methods
  hasRole(role: UserRole | string): boolean {
    // Check database roles first
    const hasDbRole = this.dbRoles?.some(r => r.name === role) || false;
    // Check legacy roles array
    const hasLegacyRoles = this.roles?.includes(role) || false;
    // Check legacy role field
    const hasLegacyRole = this.role === role;
    return hasDbRole || hasLegacyRoles || hasLegacyRole;
  }

  hasAnyRole(roles: (UserRole | string)[]): boolean {
    return roles.some((role: any) => this.hasRole(role));
  }

  isAdmin(): boolean {
    return this.hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  }

  // Get all permissions from database roles and direct permissions
  getAllPermissions(): string[] {
    // Legacy admin users (role = 'admin' or 'super_admin') get all permissions
    if (this.isAdmin()) {
      // Return all available permissions for admins
      const allPermissions = [
        // Users
        'users.view', 'users.create', 'users.edit', 'users.delete', 'users.suspend', 'users.approve',
        // Content
        'content.view', 'content.create', 'content.edit', 'content.delete', 'content.publish', 'content.moderate',
        // Categories & Tags
        'categories:write', 'categories:read', 'tags:write', 'tags:read',
        // Admin
        'admin.settings', 'admin.analytics', 'admin.logs', 'admin.backup',
        // ACF
        'acf.manage',
        // CPT
        'cpt.manage',
        // Shortcodes
        'shortcodes.manage',
        // API
        'api.access', 'api.admin'
      ];
      return allPermissions;
    }

    const rolePermissions = this.dbRoles?.flatMap(role => role.getPermissionKeys()) || [];
    const directPermissions = this.permissions || [];
    // Remove duplicates
    return [...new Set([...rolePermissions, ...directPermissions])];
  }

  // Check if user has a specific permission
  hasPermission(permission: string): boolean {
    return this.getAllPermissions().includes(permission);
  }

  // Check if user has any of the permissions
  hasAnyPermission(permissions: string[]): boolean {
    const userPermissions = this.getAllPermissions();
    return permissions.some(p => userPermissions.includes(p));
  }

  // Check if user has all of the permissions
  hasAllPermissions(permissions: string[]): boolean {
    const userPermissions = this.getAllPermissions();
    return permissions.every(p => userPermissions.includes(p));
  }

  // Get role names as string array (for backward compatibility)
  getRoleNames(): string[] {
    if (this.dbRoles && this.dbRoles.length > 0) {
      return this.dbRoles.map(r => r.name);
    }
    return this.roles || [this.role];
  }

  isPending(): boolean {
    return this.status === UserStatus.PENDING;
  }

  isActiveUser(): boolean {
    return this.status === UserStatus.ACTIVE || this.status === UserStatus.APPROVED;
  }

  // Dropshipping role helper methods
  isSupplier(): boolean {
    return this.hasRole('supplier') || !!this.supplier;
  }

  isSeller(): boolean {
    return this.hasRole('seller') || !!this.seller;
  }

  isPartner(): boolean {
    return this.hasRole('partner') || !!this.partner;
  }

  // Get active dropshipping roles
  getDropshippingRoles(): string[] {
    const roles: string[] = [];
    if (this.isSupplier()) roles.push('supplier');
    if (this.isSeller()) roles.push('seller');
    if (this.isPartner()) roles.push('partner');
    return roles;
  }

  // Get active role (with fallback to first dbRole)
  getActiveRole(): Role | null {
    // If activeRole is explicitly set, use it
    if (this.activeRole) {
      return this.activeRole;
    }

    // Fallback: return first dbRole if available
    if (this.dbRoles && this.dbRoles.length > 0) {
      return this.dbRoles[0];
    }

    return null;
  }

  // Check if user can switch to a specific role
  canSwitchToRole(roleId: string): boolean {
    if (!this.dbRoles || this.dbRoles.length === 0) {
      return false;
    }
    return this.dbRoles.some(r => r.id === roleId);
  }

  // Check if user has multiple roles
  hasMultipleRoles(): boolean {
    return this.dbRoles ? this.dbRoles.length > 1 : false;
  }

  // 민감 정보 제거한 공개 데이터
  toPublicData() {
    const activeRole = this.getActiveRole();
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      role: this.role,
      roles: this.getRoleNames(), // Return role names as string array
      activeRole: activeRole ? {
        id: activeRole.id,
        name: activeRole.name,
        displayName: activeRole.displayName
      } : null,
      dbRoles: this.dbRoles?.map(r => ({
        id: r.id,
        name: r.name,
        displayName: r.displayName
      })) || [],
      canSwitchRoles: this.hasMultipleRoles(),
      status: this.status,
      permissions: this.getAllPermissions(), // Include all permissions from roles and direct
      isActive: this.isActive,
      isEmailVerified: this.isEmailVerified,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}