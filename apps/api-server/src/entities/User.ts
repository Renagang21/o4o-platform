import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany, BeforeInsert, BeforeUpdate } from 'typeorm';
import { UserRole, UserStatus } from '../types/auth';
import { BusinessInfo } from '../types/user';
import { RefreshToken } from './RefreshToken';
import { ApprovalLog } from './ApprovalLog';
import { LinkedAccount } from './LinkedAccount';
import { AccountActivity } from './AccountActivity';
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

  // Multiple roles support
  @Column({
    type: 'simple-array',
    default: () => `'${UserRole.CUSTOMER}'`
  })
  roles!: string[];

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

  // Refresh tokens relationship
  @OneToMany(() => RefreshToken, refreshToken => refreshToken.user)
  refreshTokens: RefreshToken[];

  // Approval logs relationship
  @OneToMany(() => ApprovalLog, log => log.user)
  approvalLogs: ApprovalLog[];

  // Linked accounts relationship
  @OneToMany(() => LinkedAccount, linkedAccount => linkedAccount.user)
  linkedAccounts: LinkedAccount[];

  // Account activities relationship
  @OneToMany(() => AccountActivity, activity => activity.user)
  accountActivities: AccountActivity[];

  // Admin actions relationship
  @OneToMany(() => ApprovalLog, log => log.admin)
  adminActions: ApprovalLog[];

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
    return this.roles.includes(role) || this.role === role;
  }

  hasAnyRole(roles: (UserRole | string)[]): boolean {
    return roles.some((role: any) => this.hasRole(role));
  }

  isAdmin(): boolean {
    return this.hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  }

  isPending(): boolean {
    return this.status === UserStatus.PENDING;
  }

  isActiveUser(): boolean {
    return this.status === UserStatus.ACTIVE || this.status === UserStatus.APPROVED;
  }

  // 민감 정보 제거한 공개 데이터
  toPublicData() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      role: this.role,
      roles: this.roles,
      status: this.status,
      permissions: this.permissions,
      isActive: this.isActive,
      isEmailVerified: this.isEmailVerified,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}