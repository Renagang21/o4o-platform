import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { UserRole, UserStatus } from '../types/auth';
import { BusinessInfo } from '../types/user';
import { RefreshToken } from './RefreshToken';
// import { IsEmail, IsEnum, IsArray, IsOptional } from 'class-validator';

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

  @Column({ 
    type: 'enum', 
    enum: UserRole,
    default: UserRole.CUSTOMER
  })
  // @IsEnum(UserRole)
  role!: UserRole;

  @Column({ type: 'json', default: () => "'[]'" })
  // @IsArray()
  permissions!: string[];

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

  // 민감 정보 제거한 공개 데이터
  toPublicData() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      role: this.role,
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