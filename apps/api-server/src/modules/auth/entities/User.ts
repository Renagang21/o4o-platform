import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, BeforeInsert, BeforeUpdate, OneToMany } from 'typeorm';
import { UserRole, UserStatus } from '../../../types/auth.js';
import type { BusinessInfo } from '../../../types/user.js';
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
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string; // bcrypt hashed

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
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
   * Phase3-E: Runtime-only roles array.
   * Set by requireAuth middleware from RoleAssignment table.
   * NOT a database column — TypeORM ignores this property.
   * DB column still exists temporarily (will be dropped in Phase3-E migration).
   */
  roles: string[] = [];

  /**
   * Phase3-E: Computed primary role from roles[0].
   * Backward compatibility getter — replaces the old @Column role field.
   */
  get role(): UserRole {
    return (this.roles?.[0] as UserRole) || UserRole.USER;
  }

  // Direct permissions (in addition to role permissions)
  @Column({ type: 'json', default: () => "'[]'" })
  permissions!: string[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  refreshTokenFamily?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  lastLoginIp?: string;

  @Column({ type: 'integer', default: 0 })
  loginAttempts!: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil?: Date;

  // Domain for multi-tenant support
  @Column({ type: 'varchar', length: 255, nullable: true })
  domain?: string;

  // P0-T2: Service key for data isolation
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'service_key' })
  serviceKey?: string;

  // WO-ROLE-NORMALIZATION-PHASE3-B-V1: pharmacistFunction, pharmacistRole 제거됨
  // Qualification 데이터는 kpa_pharmacist_profiles 테이블로 이전

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 승인 관련 필드
  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  approvedBy?: string;

  // 소셜 로그인 제공자 정보
  @Column({ type: 'varchar', length: 100, nullable: true })
  provider?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_id?: string;

  // 비밀번호 재설정 토큰
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'reset_password_token' })
  resetPasswordToken?: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'reset_password_expires' })
  resetPasswordExpires?: Date | null;

  // Phase 3-2: Onboarding completion flag
  @Column({ type: 'boolean', default: false, name: 'onboarding_completed' })
  onboardingCompleted!: boolean;

  // WO-NETURE-REGISTER-IDENTITY-STABILIZATION-V1: Consent tracking
  @Column({ type: 'timestamp', nullable: true, name: 'tos_accepted_at' })
  tosAcceptedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'privacy_accepted_at' })
  privacyAcceptedAt?: Date;

  @Column({ type: 'boolean', default: false, name: 'marketing_accepted' })
  marketingAccepted!: boolean;

  // 계정 잠금 상태 확인
  get isLocked(): boolean {
    return !!(this.lockedUntil && this.lockedUntil > new Date());
  }

  /**
   * 전체 이름 반환
   * WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1: 한국식 표시 (성+이름)
   */
  get fullName(): string {
    const koreanName = `${this.lastName || ''}${this.firstName || ''}`.trim();
    return koreanName || this.email;
  }

  /**
   * UI 표시 전용 이름
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
  supplier?: any;
  seller?: any;
  partner?: any;


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

  // Role helper methods (use this.roles — set by middleware from RoleAssignment)
  hasRole(role: UserRole | string): boolean {
    return this.roles?.includes(role as string) || false;
  }

  hasAnyRole(roles: (UserRole | string)[]): boolean {
    return roles.some((role: any) => this.hasRole(role));
  }

  isAdmin(): boolean {
    return this.hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  }

  getAllPermissions(): string[] {
    if (this.isAdmin()) {
      return [
        'users.view', 'users.create', 'users.edit', 'users.delete', 'users.suspend', 'users.approve',
        'content.view', 'content.create', 'content.edit', 'content.delete', 'content.publish', 'content.moderate',
        'categories:write', 'categories:read', 'tags:write', 'tags:read',
        'admin.settings', 'admin.analytics', 'admin.logs', 'admin.backup',
        'acf.manage', 'cpt.manage', 'shortcodes.manage',
        'api.access', 'api.admin'
      ];
    }
    return [...new Set([...(this.permissions || [])])];
  }

  hasPermission(permission: string): boolean {
    return this.getAllPermissions().includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    const userPermissions = this.getAllPermissions();
    return permissions.some(p => userPermissions.includes(p));
  }

  hasAllPermissions(permissions: string[]): boolean {
    const userPermissions = this.getAllPermissions();
    return permissions.every(p => userPermissions.includes(p));
  }

  getRoleNames(): string[] {
    return this.roles?.length > 0 ? [...this.roles] : [];
  }

  isPending(): boolean {
    return this.status === UserStatus.PENDING;
  }

  isActiveUser(): boolean {
    return this.status === UserStatus.ACTIVE || this.status === UserStatus.APPROVED;
  }

  isSupplier(): boolean {
    return this.hasRole('supplier') || !!this.supplier;
  }

  isSeller(): boolean {
    return this.hasRole('seller') || !!this.seller;
  }

  isPartner(): boolean {
    return this.hasRole('partner') || !!this.partner;
  }

  getDropshippingRoles(): string[] {
    const dRoles: string[] = [];
    if (this.isSupplier()) dRoles.push('supplier');
    if (this.isSeller()) dRoles.push('seller');
    if (this.isPartner()) dRoles.push('partner');
    return dRoles;
  }

  /**
   * 민감 정보 제거한 공개 데이터
   * Phase3-E: roles는 requireAuth 미들웨어에서 RoleAssignment 데이터로 설정됨.
   */
  toPublicData() {
    return {
      id: this.id,
      email: this.email,
      displayName: this.displayName,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      phone: this.phone,
      contactEnabled: this.contactEnabled,
      kakaoOpenChatUrl: this.kakaoOpenChatUrl,
      kakaoChannelUrl: this.kakaoChannelUrl,
      role: (this.roles?.[0] as UserRole) || UserRole.USER,
      roles: this.roles?.length > 0 ? [...this.roles] : [],
      status: this.status,
      permissions: this.getAllPermissions(),
      scopes: [] as string[],
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
