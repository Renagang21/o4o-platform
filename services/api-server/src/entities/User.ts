import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  CUSTOMER = 'customer',      // B2C 고객
  BUSINESS = 'business',      // B2B 고객  
  AFFILIATE = 'affiliate',    // 제휴 파트너
  ADMIN = 'admin',           // 관리자
  MANAGER = 'manager'        // 매니저
}

export enum UserStatus {
  APPROVED = 'approved',     // 기본값: 소셜 로그인은 자동 승인
  SUSPENDED = 'suspended'    // 정지된 사용자
}

export enum BusinessType {
  PHARMACY = 'pharmacy',
  HEALTH_STORE = 'health_store',
  LOCAL_FOOD = 'local_food',
  RETAIL_SHOP = 'retail_shop',
  OTHER = 'other'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Common-Core 인증 필드들
  @Column({ type: 'varchar', length: 20 })
  provider!: string; // 'google', 'naver', 'kakao'

  @Column({ type: 'varchar', length: 100 })
  provider_id!: string; // 소셜 제공자의 사용자 ID

  // O4O Platform 비즈니스 필드들
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER
  })
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.APPROVED
  })
  status!: UserStatus;

  // Business Info (JSON column) - 비즈니스 사용자만 사용
  @Column({ type: 'json', nullable: true })
  businessInfo?: {
    businessName: string;
    businessType: BusinessType;
    businessNumber?: string;
    address: string;
    phone: string;
  };

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  approvedAt?: Date;

  @Column({ nullable: true })
  approvedBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 가격 계산 메서드 (기존 O4O Platform 로직 유지)
  getPriceForUser(retailPrice: number, wholesalePrice?: number, affiliatePrice?: number): number {
    switch (this.role) {
      case UserRole.BUSINESS:
        return wholesalePrice || retailPrice;
      case UserRole.AFFILIATE:
        return affiliatePrice || retailPrice;
      default:
        return retailPrice;
    }
  }
}
