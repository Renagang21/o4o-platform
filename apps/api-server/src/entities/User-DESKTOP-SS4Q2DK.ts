import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  CUSTOMER = 'customer',      // B2C 고객
  BUSINESS = 'business',      // B2B 고객  
  AFFILIATE = 'affiliate',    // 제휴 파트너
  ADMIN = 'admin',           // 관리자
  MANAGER = 'manager'        // 매니저
}

export enum UserStatus {
  PENDING = 'pending',       // 승인 대기 중
  APPROVED = 'approved',     // 승인됨
  REJECTED = 'rejected',     // 거부됨
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

  // 기본 사용자 정보
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email?: string; // 이메일 로그인용

  @Column({ type: 'varchar', length: 255, nullable: true })
  password?: string; // 해싱된 패스워드

  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string; // 사용자 이름

  // Common-Core 인증 필드들 (소셜 로그인용)
  @Column({ type: 'varchar', length: 20, nullable: true })
  provider?: string; // 'google', 'naver', 'kakao'

  @Column({ type: 'varchar', length: 100, nullable: true })
  provider_id?: string; // 소셜 제공자의 사용자 ID

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

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'varchar', nullable: true })
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
