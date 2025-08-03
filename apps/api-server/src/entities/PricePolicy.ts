import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './Product';
import { User } from './User';

export enum PricePolicyType {
  ROLE_BASED = 'role_based',          // 역할별 가격
  VOLUME_DISCOUNT = 'volume_discount', // 수량 할인
  SEASONAL = 'seasonal',               // 시즌 할인
  PROMOTION = 'promotion',             // 프로모션 할인
  CUSTOMER_SPECIFIC = 'customer_specific', // 고객별 특가
  REGION_BASED = 'region_based'        // 지역별 가격
}

export enum DiscountType {
  PERCENTAGE = 'percentage',  // 퍼센트 할인
  FIXED_AMOUNT = 'fixed_amount', // 고정 금액 할인
  FIXED_PRICE = 'fixed_price'    // 고정 가격
}

export enum UserRole {
  CUSTOMER = 'customer',
  BUSINESS = 'business',
  AFFILIATE = 'affiliate',
  VIP = 'vip',
  WHOLESALE = 'wholesale',
  DISTRIBUTOR = 'distributor'
}

@Entity('price_policies')
export class PricePolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: PricePolicyType
  })
  type!: PricePolicyType;

  // 적용 대상
  @Column({ nullable: true })
  productId?: string; // 특정 상품에만 적용

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  @Column({ type: 'json', nullable: true })
  productCategories?: string[]; // 카테고리별 적용

  @Column({ type: 'json', nullable: true })
  productTags?: string[]; // 태그별 적용

  // 역할 기반 가격 정책
  @Column({
    type: 'enum',
    enum: UserRole,
    nullable: true
  })
  targetRole?: UserRole;

  @Column({ nullable: true })
  targetUserId?: string; // 특정 사용자

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'targetUserId' })
  targetUser?: User;

  // 수량 기반 할인
  @Column({ nullable: true })
  minQuantity?: number;

  @Column({ nullable: true })
  maxQuantity?: number;

  // 금액 기반 할인
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minOrderAmount?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxOrderAmount?: number;

  // 할인 정보
  @Column({
    type: 'enum',
    enum: DiscountType
  })
  discountType!: DiscountType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discountValue!: number; // 퍼센트 또는 금액

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountAmount?: number; // 최대 할인 금액 (퍼센트 할인 시)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minFinalPrice?: number; // 최소 판매 가격

  // 시간 기반 조건
  @Column({ nullable: true })
  startDate?: Date;

  @Column({ nullable: true })
  endDate?: Date;

  @Column({ type: 'json', nullable: true })
  activeDays?: number[]; // 0=일요일, 1=월요일, ... 6=토요일

  @Column({ nullable: true })
  startTime?: string; // HH:MM 형식

  @Column({ nullable: true })
  endTime?: string; // HH:MM 형식

  // 지역 기반 조건
  @Column({ type: 'json', nullable: true })
  targetRegions?: string[]; // ['KR', 'US', 'JP'] 등

  @Column({ type: 'json', nullable: true })
  targetCities?: string[]; // ['서울', '부산'] 등

  // 우선순위 및 상태
  @Column({ default: 1 })
  priority!: number; // 높을수록 우선 적용

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isExclusive!: boolean; // 다른 할인과 중복 적용 불가

  // 사용 제한
  @Column({ nullable: true })
  maxUsageCount?: number; // 전체 사용 횟수 제한

  @Column({ nullable: true })
  maxUsagePerUser?: number; // 사용자당 사용 횟수 제한

  @Column({ default: 0 })
  currentUsageCount!: number; // 현재 사용 횟수

  // 메타데이터
  @Column()
  createdBy!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator!: User;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    campaignId?: string;
    source?: string;
    adminNotes?: string;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 비즈니스 로직 메서드
  isValid(date: Date = new Date()): boolean {
    if (!this.isActive) return false;

    // 기간 확인
    if (this.startDate && date < this.startDate) return false;
    if (this.endDate && date > this.endDate) return false;

    // 요일 확인
    if (this.activeDays && this.activeDays.length > 0) {
      if (!this.activeDays.includes(date.getDay())) return false;
    }

    // 시간 확인
    if (this.startTime && this.endTime) {
      const currentTime = date.toTimeString().slice(0, 5);
      if (currentTime < this.startTime || currentTime > this.endTime) return false;
    }

    // 사용 횟수 확인
    if (this.maxUsageCount && this.currentUsageCount >= this.maxUsageCount) {
      return false;
    }

    return true;
  }

  canApplyToUser(userRole: string, userId?: string): boolean {
    if (this.targetRole && this.targetRole !== userRole) return false;
    if (this.targetUserId && this.targetUserId !== userId) return false;
    return true;
  }

  canApplyToProduct(productId: string, categories?: string[], tags?: string[]): boolean {
    // 특정 상품 지정된 경우
    if (this.productId && this.productId !== productId) return false;

    // 카테고리 확인
    if (this.productCategories && this.productCategories.length > 0) {
      if (!categories || !categories.some((cat: any) => this.productCategories!.includes(cat))) {
        return false;
      }
    }

    // 태그 확인
    if (this.productTags && this.productTags.length > 0) {
      if (!tags || !tags.some((tag: any) => this.productTags!.includes(tag))) {
        return false;
      }
    }

    return true;
  }

  canApplyToQuantity(quantity: number): boolean {
    if (this.minQuantity && quantity < this.minQuantity) return false;
    if (this.maxQuantity && quantity > this.maxQuantity) return false;
    return true;
  }

  canApplyToOrderAmount(orderAmount: number): boolean {
    if (this.minOrderAmount && orderAmount < this.minOrderAmount) return false;
    if (this.maxOrderAmount && orderAmount > this.maxOrderAmount) return false;
    return true;
  }

  calculateDiscountedPrice(originalPrice: number, quantity: number = 1): number {
    let finalPrice = originalPrice;

    switch (this.discountType) {
      case DiscountType.PERCENTAGE:
        const discountAmount = originalPrice * (this.discountValue / 100);
        const cappedDiscount = this.maxDiscountAmount 
          ? Math.min(discountAmount, this.maxDiscountAmount)
          : discountAmount;
        finalPrice = originalPrice - cappedDiscount;
        break;

      case DiscountType.FIXED_AMOUNT:
        finalPrice = originalPrice - this.discountValue;
        break;

      case DiscountType.FIXED_PRICE:
        finalPrice = this.discountValue;
        break;
    }

    // 최소 가격 확인
    if (this.minFinalPrice && finalPrice < this.minFinalPrice) {
      finalPrice = this.minFinalPrice;
    }

    return Math.max(0, finalPrice); // 음수 방지
  }

  getDiscountAmount(originalPrice: number, quantity: number = 1): number {
    const discountedPrice = this.calculateDiscountedPrice(originalPrice, quantity);
    return originalPrice - discountedPrice;
  }

  incrementUsage(): void {
    this.currentUsageCount += 1;
  }
}