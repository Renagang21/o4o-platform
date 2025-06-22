import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert } from 'typeorm';
import bcrypt from 'bcryptjs';

export enum UserRole {
  CUSTOMER = 'customer',      // B2C 고객
  BUSINESS = 'business',      // B2B 고객  
  AFFILIATE = 'affiliate',    // 제휴 파트너
  ADMIN = 'admin',           // 관리자
  MANAGER = 'manager'        // 매니저
}

export enum UserStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended'
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

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column()
  name!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER
  })
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING
  })
  status!: UserStatus;

  // Business Info (JSON column)
  @Column({ type: 'json', nullable: true })
  businessInfo!: {
    businessName: string;
    businessType: BusinessType;
    businessNumber?: string;
    address: string;
    phone: string;
  };

  @Column({ nullable: true })
  lastLoginAt!: Date;

  @Column({ nullable: true })
  approvedAt!: Date;

  @Column({ nullable: true })
  approvedBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}
