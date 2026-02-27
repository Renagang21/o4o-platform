import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, BeforeInsert, BeforeUpdate, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { UserRole, UserStatus } from '../../../types/auth.js';
import type { BusinessInfo } from '../../../types/user.js';
import type { Role } from './Role.js';
import bcrypt from 'bcryptjs';

// Re-export types for external use
export { UserRole, UserStatus };

@Entity('users')
@Index(['email'], { unique: true })
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

  @Column({ type: 'varchar', length: 200, default: '운영자' })
  name!: string;

  // P1-T2: Nickname for forum/public display (separate from real name)
  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar?: string;

  // Phase 3-3: Phone number for checkout auto-fill
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  // WO-NETURE-EXTERNAL-CONTACT-V1: External contact settings
  // 사용자가 외부 연락 수단(카카오톡)을 선택적으로 등록
  @Column({ type: 'boolean', default: false, name: 'contact_enabled' })
  contactEnabled!: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'kakao_open_chat_url' })
  kakaoOpenChatUrl?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'kakao_channel_url' })
  kakaoChannelUrl?: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING
  })
  status!: UserStatus;

  @Column({ type: 'json', nullable: true })
  businessInfo?: BusinessInfo;

  /**
   * Phase3-E PR3: DB 컬럼 제거됨. in-memory only.
   * requireAuth에서 JWT payload.roles로 채워진다.
   * 권한 확인은 roleAssignmentService 사용.
   */
  roles?: string[];

  /**
   * @deprecated Phase3-E PR3: user_roles 테이블 제거됨.
   * DB Join 없이 plain 프로퍼티로만 유지.
   */
  dbRoles?: Role[];

  /**
   * @deprecated Phase P0: DO NOT USE for authorization
   *
   * Legacy active role selector.
   * Use role_assignments table to query active roles instead.
   *
   * @see RoleAssignment entity
   * @see RoleAssignment.isActive
   */
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

  // Domain for multi-tenant support
  @Column({ type: 'varchar', length: 255, nullable: true })
  domain?: string;

  // P0-T2: Service key for data isolation
  // Ensures users from different pharmacy societies/services don't mix
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'service_key' })
  serviceKey?: string;

  // WO-ROLE-NORMALIZATION-PHASE3-B-V1: pharmacistFunction, pharmacistRole 제거됨
  // Qualification 데이터는 kpa_pharmacist_profiles 테이블로 이전
  // API 응답에서는 derivePharmacistQualification()으로 compute

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

  // 비밀번호 재설정 토큰
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'reset_password_token' })
  resetPasswordToken?: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'reset_password_expires' })
  resetPasswordExpires?: Date | null;

  // Phase 3-2: Onboarding completion flag
  @Column({ type: 'boolean', default: false, name: 'onboarding_completed' })
  onboardingCompleted!: boolean;

  // 계정 잠금 상태 확인
  get isLocked(): boolean {
    return !!(this.lockedUntil && this.lockedUntil > new Date());
  }

  /**
   * 전체 이름 반환
   * WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1: 한국식 표시 (성+이름)
   */
  get fullName(): string {
    // 한국식: lastName + firstName (성 + 이름)
    const koreanName = `${this.lastName || ''}${this.firstName || ''}`.trim();
    return koreanName || this.email;
  }

  /**
   * UI 표시 전용 이름
   * name 필드는 기본값 '운영자'가 있으므로 항상 값이 존재
   */
  get displayName(): string {
    return this.name;
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
  /**
   * @deprecated Phase P0: Use RoleAssignmentService.hasRole() instead
   * This method relies on deprecated dbRoles, roles, role fields.
   * @see RoleAssignmentService
   */
  hasRole(role: UserRole | string): boolean {
    const hasDbRole = this.dbRoles?.some(r => r.name === role) || false;
    const hasLegacyRoles = this.roles?.includes(role) || false;
    return hasDbRole || hasLegacyRoles;
  }

  /**
   * @deprecated Phase P0: Use RoleAssignmentService.hasAnyRole() instead
   * @see RoleAssignmentService
   */
  hasAnyRole(roles: (UserRole | string)[]): boolean {
    return roles.some((role: any) => this.hasRole(role));
  }

  /**
   * @deprecated Phase P0: Use RoleAssignmentService.isAdmin() instead
   * @see RoleAssignmentService
   */
  isAdmin(): boolean {
    return this.hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  }

  /**
   * Get all permissions from database roles and direct permissions
   * @deprecated Phase P0: Use RoleAssignmentService.getPermissions() instead
   * @see RoleAssignmentService
   */
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

  /**
   * Check if user has a specific permission
   * @deprecated Phase P0: Use RoleAssignmentService.hasPermission() instead
   * @see RoleAssignmentService
   */
  hasPermission(permission: string): boolean {
    return this.getAllPermissions().includes(permission);
  }

  /**
   * Check if user has any of the permissions
   * @deprecated Phase P0: Use RoleAssignmentService.hasAnyPermission() instead
   * @see RoleAssignmentService
   */
  hasAnyPermission(permissions: string[]): boolean {
    const userPermissions = this.getAllPermissions();
    return permissions.some(p => userPermissions.includes(p));
  }

  /**
   * Check if user has all of the permissions
   * @deprecated Phase P0: Use RoleAssignmentService.hasAllPermissions() instead
   * @see RoleAssignmentService
   */
  hasAllPermissions(permissions: string[]): boolean {
    const userPermissions = this.getAllPermissions();
    return permissions.every(p => userPermissions.includes(p));
  }

  /**
   * Get role names as string array (for backward compatibility)
   * @deprecated Phase P0: Use RoleAssignmentService.getRoleNames() instead
   * @see RoleAssignmentService
   */
  getRoleNames(): string[] {
    if (this.dbRoles && this.dbRoles.length > 0) {
      return this.dbRoles.map(r => r.name);
    }
    return this.roles ?? [];
  }

  isPending(): boolean {
    return this.status === UserStatus.PENDING;
  }

  isActiveUser(): boolean {
    return this.status === UserStatus.ACTIVE || this.status === UserStatus.APPROVED;
  }

  /**
   * Check if user is a supplier
   * @deprecated Phase P0: Use RoleAssignmentService.isSupplier() instead
   * @see RoleAssignmentService
   */
  isSupplier(): boolean {
    return this.hasRole('supplier') || !!this.supplier;
  }

  /**
   * Check if user is a seller
   * @deprecated Phase P0: Use RoleAssignmentService.isSeller() instead
   * @see RoleAssignmentService
   */
  isSeller(): boolean {
    return this.hasRole('seller') || !!this.seller;
  }

  /**
   * Check if user is a partner
   * @deprecated Phase P0: Use RoleAssignmentService.isPartner() instead
   * @see RoleAssignmentService
   */
  isPartner(): boolean {
    return this.hasRole('partner') || !!this.partner;
  }

  /**
   * Get active dropshipping roles
   * @deprecated Phase P0: Use RoleAssignmentService.getRoleNames() instead
   * @see RoleAssignmentService
   */
  getDropshippingRoles(): string[] {
    const roles: string[] = [];
    if (this.isSupplier()) roles.push('supplier');
    if (this.isSeller()) roles.push('seller');
    if (this.isPartner()) roles.push('partner');
    return roles;
  }

  /**
   * Get active role (with fallback to first dbRole)
   * @deprecated Phase P0: Use RoleAssignmentService.getActiveRoles() instead
   * @see RoleAssignmentService
   */
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

  /**
   * Check if user can switch to a specific role
   * @deprecated Phase P0: Use RoleAssignmentService.hasRole() instead
   * @see RoleAssignmentService
   */
  canSwitchToRole(roleId: string): boolean {
    if (!this.dbRoles || this.dbRoles.length === 0) {
      return false;
    }
    return this.dbRoles.some(r => r.id === roleId);
  }

  /**
   * Check if user has multiple roles
   * @deprecated Phase P0: Use RoleAssignmentService.getActiveRoles() instead
   * @see RoleAssignmentService
   */
  hasMultipleRoles(): boolean {
    return this.dbRoles ? this.dbRoles.length > 1 : false;
  }

  /**
   * 민감 정보 제거한 공개 데이터
   *
   * Note: role, roles, dbRoles, activeRole fields are deprecated.
   * Use RoleAssignmentService to get accurate role information.
   * @see RoleAssignmentService
   */
  toPublicData() {
    const activeRole = this.getActiveRole();
    return {
      id: this.id,
      email: this.email,
      displayName: this.displayName,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      phone: this.phone, // Phase 3-3: Include phone for checkout auto-fill
      // WO-NETURE-EXTERNAL-CONTACT-V1: External contact settings
      contactEnabled: this.contactEnabled,
      kakaoOpenChatUrl: this.kakaoOpenChatUrl,
      kakaoChannelUrl: this.kakaoChannelUrl,
      // Note: role/roles/dbRoles are deprecated - use RoleAssignment data
      // Phase3-E PR3: role 제거, roles[0] 기반으로 파생
      role: (this.roles?.[0] as UserRole) || UserRole.USER,
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
      // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1: scopes placeholder
      // 실제 scopes는 서비스 레이어에서 deriveUserScopes로 계산하여 덮어씀
      scopes: [] as string[],
      // WO-ROLE-NORMALIZATION-PHASE3-B-V1: DB에서 제거됨, 컨트롤러에서 derive
      pharmacistFunction: null as string | null,
      pharmacistRole: null as string | null,
      isStoreOwner: false,
      isActive: this.isActive,
      isEmailVerified: this.isEmailVerified,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
