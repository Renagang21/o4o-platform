import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
// import { IsEmail, IsEnum, IsArray, IsOptional } from 'class-validator';
// import { UserRole } from '../types/auth';

// Temporary type definition
export type UserRole = 'customer' | 'admin' | 'seller' | 'supplier' | 'manager';
export type UserStatus = 'active' | 'inactive' | 'pending';

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

  @Column({ 
    type: 'enum', 
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  })
  status!: UserStatus;

  @Column({ type: 'json', nullable: true })
  businessInfo?: any;

  @Column({ 
    type: 'enum', 
    enum: ['customer', 'admin', 'seller', 'supplier', 'manager'],
    default: 'customer'
  })
  // @IsEnum(['customer', 'admin', 'seller', 'supplier', 'manager'])
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

  // 계정 잠금 상태 확인
  get isLocked(): boolean {
    return !!(this.lockedUntil && this.lockedUntil > new Date());
  }

  // 전체 이름 반환
  get fullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.email;
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
      permissions: this.permissions,
      isActive: this.isActive,
      isEmailVerified: this.isEmailVerified,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}