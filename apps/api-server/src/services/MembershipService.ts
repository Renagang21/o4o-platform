/**
 * 회원 등급 및 포인트 서비스
 * VIP 등급, 포인트 적립/사용, 혜택 관리
 */

import { AppDataSource } from '../database/connection';
import { User } from '../entities/User';
import { Order } from '../entities/Order';
import logger from '../utils/simpleLogger';
import { EventEmitter } from 'events';

interface MembershipTier {
  id: string;
  name: string;
  level: number;
  requiredAmount: number; // 연간 구매 금액
  requiredOrders: number; // 연간 구매 횟수
  benefits: {
    pointRate: number; // 포인트 적립률 (%)
    discountRate: number; // 할인율 (%)
    freeShipping: boolean;
    birthdayBonus: number; // 생일 포인트
    monthlyBonus: number; // 월간 보너스 포인트
    prioritySupport: boolean;
    earlyAccess: boolean; // 신상품 우선 구매
    exclusiveEvents: boolean;
  };
  color: string;
  icon: string;
}

interface PointTransaction {
  id: string;
  userId: string;
  type: 'earn' | 'use' | 'expire' | 'cancel';
  amount: number;
  balance: number;
  source: 'purchase' | 'review' | 'referral' | 'event' | 'birthday' | 'tier_bonus' | 'manual';
  orderId?: string;
  description: string;
  expiresAt?: Date;
  createdAt: Date;
}

interface UserMembership {
  userId: string;
  currentTier: MembershipTier;
  nextTier?: MembershipTier;
  progressToNext: number; // 0-100%
  totalSpent: number; // 연간 총 구매액
  totalOrders: number; // 연간 총 구매 횟수
  pointBalance: number;
  lifetimePoints: number;
  memberSince: Date;
  benefits: string[];
}

export class MembershipService extends EventEmitter {
  private userRepository = AppDataSource.getRepository(User);
  private orderRepository = AppDataSource.getRepository(Order);
  
  // 회원 등급 정의
  private readonly tiers: MembershipTier[] = [
    {
      id: 'bronze',
      name: 'Bronze',
      level: 1,
      requiredAmount: 0,
      requiredOrders: 0,
      benefits: {
        pointRate: 1,
        discountRate: 0,
        freeShipping: false,
        birthdayBonus: 1000,
        monthlyBonus: 0,
        prioritySupport: false,
        earlyAccess: false,
        exclusiveEvents: false
      },
      color: '#CD7F32',
      icon: '🥉'
    },
    {
      id: 'silver',
      name: 'Silver',
      level: 2,
      requiredAmount: 500000,
      requiredOrders: 5,
      benefits: {
        pointRate: 2,
        discountRate: 3,
        freeShipping: false,
        birthdayBonus: 3000,
        monthlyBonus: 500,
        prioritySupport: false,
        earlyAccess: false,
        exclusiveEvents: false
      },
      color: '#C0C0C0',
      icon: '🥈'
    },
    {
      id: 'gold',
      name: 'Gold',
      level: 3,
      requiredAmount: 1500000,
      requiredOrders: 15,
      benefits: {
        pointRate: 3,
        discountRate: 5,
        freeShipping: true,
        birthdayBonus: 5000,
        monthlyBonus: 1000,
        prioritySupport: true,
        earlyAccess: true,
        exclusiveEvents: false
      },
      color: '#FFD700',
      icon: '🥇'
    },
    {
      id: 'platinum',
      name: 'Platinum',
      level: 4,
      requiredAmount: 3000000,
      requiredOrders: 30,
      benefits: {
        pointRate: 5,
        discountRate: 7,
        freeShipping: true,
        birthdayBonus: 10000,
        monthlyBonus: 2000,
        prioritySupport: true,
        earlyAccess: true,
        exclusiveEvents: true
      },
      color: '#E5E4E2',
      icon: '💎'
    },
    {
      id: 'diamond',
      name: 'Diamond',
      level: 5,
      requiredAmount: 5000000,
      requiredOrders: 50,
      benefits: {
        pointRate: 7,
        discountRate: 10,
        freeShipping: true,
        birthdayBonus: 20000,
        monthlyBonus: 5000,
        prioritySupport: true,
        earlyAccess: true,
        exclusiveEvents: true
      },
      color: '#B9F2FF',
      icon: '💎'
    }
  ];

  // 포인트 거래 내역 (실제로는 DB 테이블)
  private pointTransactions: Map<string, PointTransaction[]> = new Map();

  /**
   * 사용자 멤버십 정보 조회
   */
  async getUserMembership(userId: string): Promise<UserMembership> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 연간 구매 통계
    const yearStats = await this.getYearlyPurchaseStats(userId);
    
    // 현재 등급 결정
    const currentTier = this.calculateTier(yearStats.totalAmount, yearStats.totalOrders);
    
    // 다음 등급
    const nextTier = this.getNextTier(currentTier);
    
    // 진행률 계산
    const progressToNext = nextTier 
      ? this.calculateProgress(yearStats.totalAmount, currentTier, nextTier)
      : 100;

    // 포인트 잔액
    const pointBalance = await this.getPointBalance(userId);
    
    // 평생 적립 포인트
    const lifetimePoints = await this.getLifetimePoints(userId);

    // 혜택 목록
    const benefits = this.getTierBenefitsList(currentTier);

    return {
      userId,
      currentTier,
      nextTier,
      progressToNext,
      totalSpent: yearStats.totalAmount,
      totalOrders: yearStats.totalOrders,
      pointBalance,
      lifetimePoints,
      memberSince: user.createdAt,
      benefits
    };
  }

  /**
   * 포인트 적립
   */
  async earnPoints(
    userId: string,
    amount: number,
    source: PointTransaction['source'],
    orderId?: string,
    description?: string
  ): Promise<PointTransaction> {
    const balance = await this.getPointBalance(userId);
    
    const transaction: PointTransaction = {
      id: this.generateTransactionId(),
      userId,
      type: 'earn',
      amount,
      balance: balance + amount,
      source,
      orderId,
      description: description || this.getDefaultDescription('earn', source, amount),
      expiresAt: this.calculateExpiryDate(),
      createdAt: new Date()
    };

    // 거래 내역 저장
    await this.saveTransaction(transaction);

    // 사용자 포인트 업데이트
    await this.updateUserPoints(userId, balance + amount);

    // 이벤트 발생
    this.emit('pointsEarned', {
      userId,
      amount,
      source,
      newBalance: balance + amount
    });

    logger.info(`Points earned: User ${userId}, Amount ${amount}, Source ${source}`);

    return transaction;
  }

  /**
   * 포인트 사용
   */
  async usePoints(
    userId: string,
    amount: number,
    orderId: string,
    description?: string
  ): Promise<PointTransaction> {
    const balance = await this.getPointBalance(userId);
    
    if (balance < amount) {
      throw new Error(`Insufficient points. Balance: ${balance}, Required: ${amount}`);
    }

    const transaction: PointTransaction = {
      id: this.generateTransactionId(),
      userId,
      type: 'use',
      amount: -amount,
      balance: balance - amount,
      source: 'purchase',
      orderId,
      description: description || `Order #${orderId} payment`,
      createdAt: new Date()
    };

    // 거래 내역 저장
    await this.saveTransaction(transaction);

    // 사용자 포인트 업데이트
    await this.updateUserPoints(userId, balance - amount);

    // 이벤트 발생
    this.emit('pointsUsed', {
      userId,
      amount,
      orderId,
      newBalance: balance - amount
    });

    logger.info(`Points used: User ${userId}, Amount ${amount}, Order ${orderId}`);

    return transaction;
  }

  /**
   * 구매 완료 시 포인트 적립
   */
  async processOrderPoints(orderId: string): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user']
    });

    if (!order || !order.userId) return;

    // 사용자 등급 확인
    const membership = await this.getUserMembership(order.userId);
    
    // 포인트 적립률 계산
    const pointRate = membership.currentTier.benefits.pointRate;
    const pointAmount = Math.floor(order.totalAmount * pointRate / 100);

    if (pointAmount > 0) {
      await this.earnPoints(
        order.userId,
        pointAmount,
        'purchase',
        orderId,
        `${pointRate}% points for order #${order.orderNumber}`
      );
    }

    // 등급 업데이트 체크
    await this.checkTierUpgrade(order.userId);
  }

  /**
   * 리뷰 작성 포인트
   */
  async processReviewPoints(
    userId: string,
    productId: string,
    hasPhoto: boolean
  ): Promise<void> {
    const basePoints = 100;
    const photoBonus = 200;
    const totalPoints = basePoints + (hasPhoto ? photoBonus : 0);

    await this.earnPoints(
      userId,
      totalPoints,
      'review',
      undefined,
      hasPhoto ? 'Photo review bonus' : 'Review reward'
    );
  }

  /**
   * 추천인 포인트
   */
  async processReferralPoints(
    referrerId: string,
    referredId: string
  ): Promise<void> {
    // 추천인 포인트
    await this.earnPoints(
      referrerId,
      5000,
      'referral',
      undefined,
      `Referral bonus for inviting new member`
    );

    // 신규 회원 포인트
    await this.earnPoints(
      referredId,
      3000,
      'referral',
      undefined,
      'Welcome bonus from referral'
    );
  }

  /**
   * 생일 포인트
   */
  async processBirthdayPoints(userId: string): Promise<void> {
    const membership = await this.getUserMembership(userId);
    const birthdayPoints = membership.currentTier.benefits.birthdayBonus;

    if (birthdayPoints > 0) {
      await this.earnPoints(
        userId,
        birthdayPoints,
        'birthday',
        undefined,
        'Happy Birthday! 🎂'
      );
    }
  }

  /**
   * 월간 보너스 포인트
   */
  async processMonthlyBonus(): Promise<void> {
    // 모든 회원에게 등급별 월간 보너스 지급
    const users = await this.userRepository.find();

    for (const user of users) {
      try {
        const membership = await this.getUserMembership(user.id);
        const monthlyBonus = membership.currentTier.benefits.monthlyBonus;

        if (monthlyBonus > 0) {
          await this.earnPoints(
            user.id,
            monthlyBonus,
            'tier_bonus',
            undefined,
            `${membership.currentTier.name} monthly bonus`
          );
        }
      } catch (error) {
        logger.error(`Failed to process monthly bonus for user ${user.id}:`, error);
      }
    }
  }

  /**
   * 포인트 만료 처리
   */
  async expirePoints(): Promise<void> {
    const now = new Date();
    
    // 실제로는 DB에서 만료된 포인트 조회
    for (const [userId, transactions] of this.pointTransactions) {
      const expiredTransactions = transactions.filter(
        t => t.type === 'earn' && t.expiresAt && t.expiresAt < now
      );

      for (const expired of expiredTransactions) {
        const balance = await this.getPointBalance(userId);
        
        const expireTransaction: PointTransaction = {
          id: this.generateTransactionId(),
          userId,
          type: 'expire',
          amount: -expired.amount,
          balance: balance - expired.amount,
          source: 'manual',
          description: `Points expired from ${expired.createdAt.toLocaleDateString()}`,
          createdAt: new Date()
        };

        await this.saveTransaction(expireTransaction);
        await this.updateUserPoints(userId, balance - expired.amount);
      }
    }
  }

  /**
   * 등급 업그레이드 체크
   */
  private async checkTierUpgrade(userId: string): Promise<void> {
    const membership = await this.getUserMembership(userId);
    const yearStats = await this.getYearlyPurchaseStats(userId);
    
    const newTier = this.calculateTier(yearStats.totalAmount, yearStats.totalOrders);
    
    if (newTier.level > membership.currentTier.level) {
      // 등급 업그레이드
      await this.upgradeTier(userId, membership.currentTier, newTier);
    }
  }

  /**
   * 등급 업그레이드
   */
  private async upgradeTier(
    userId: string,
    oldTier: MembershipTier,
    newTier: MembershipTier
  ): Promise<void> {
    // 사용자 등급 업데이트 (실제로는 DB)
    logger.info(`User ${userId} upgraded from ${oldTier.name} to ${newTier.name}`);

    // 축하 포인트 지급
    const bonusPoints = (newTier.level - oldTier.level) * 1000;
    await this.earnPoints(
      userId,
      bonusPoints,
      'tier_bonus',
      undefined,
      `Congratulations! Upgraded to ${newTier.name} ${newTier.icon}`
    );

    // 이벤트 발생
    this.emit('tierUpgraded', {
      userId,
      oldTier,
      newTier,
      bonusPoints
    });
  }

  /**
   * 연간 구매 통계
   */
  private async getYearlyPurchaseStats(
    userId: string
  ): Promise<{ totalAmount: number; totalOrders: number }> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const stats = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.userId = :userId', { userId })
      .andWhere('order.createdAt > :date', { date: oneYearAgo })
      .andWhere('order.status IN (:...statuses)', { 
        statuses: ['delivered', 'completed'] 
      })
      .select('SUM(order.totalAmount)', 'totalAmount')
      .addSelect('COUNT(*)', 'totalOrders')
      .getRawOne();

    return {
      totalAmount: parseFloat(stats?.totalAmount || '0'),
      totalOrders: parseInt(stats?.totalOrders || '0')
    };
  }

  /**
   * 등급 계산
   */
  private calculateTier(totalAmount: number, totalOrders: number): MembershipTier {
    // 역순으로 검사 (높은 등급부터)
    for (let i = this.tiers.length - 1; i >= 0; i--) {
      const tier = this.tiers[i];
      if (totalAmount >= tier.requiredAmount && totalOrders >= tier.requiredOrders) {
        return tier;
      }
    }
    
    return this.tiers[0]; // Bronze
  }

  /**
   * 다음 등급 조회
   */
  private getNextTier(currentTier: MembershipTier): MembershipTier | undefined {
    const currentIndex = this.tiers.findIndex(t => t.id === currentTier.id);
    return this.tiers[currentIndex + 1];
  }

  /**
   * 진행률 계산
   */
  private calculateProgress(
    currentAmount: number,
    currentTier: MembershipTier,
    nextTier: MembershipTier
  ): number {
    const required = nextTier.requiredAmount - currentTier.requiredAmount;
    const progress = currentAmount - currentTier.requiredAmount;
    return Math.min(100, Math.max(0, (progress / required) * 100));
  }

  /**
   * 포인트 잔액 조회
   */
  private async getPointBalance(userId: string): Promise<number> {
    // 실제로는 DB에서 조회
    const transactions = this.pointTransactions.get(userId) || [];
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * 평생 적립 포인트
   */
  private async getLifetimePoints(userId: string): Promise<number> {
    // 실제로는 DB에서 조회
    const transactions = this.pointTransactions.get(userId) || [];
    return transactions
      .filter(t => t.type === 'earn')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * 혜택 목록 생성
   */
  private getTierBenefitsList(tier: MembershipTier): string[] {
    const benefits: string[] = [];
    const b = tier.benefits;

    benefits.push(`${b.pointRate}% 포인트 적립`);
    
    if (b.discountRate > 0) {
      benefits.push(`${b.discountRate}% 할인`);
    }
    
    if (b.freeShipping) {
      benefits.push('무료 배송');
    }
    
    if (b.birthdayBonus > 0) {
      benefits.push(`생일 ${b.birthdayBonus}P 지급`);
    }
    
    if (b.monthlyBonus > 0) {
      benefits.push(`월 ${b.monthlyBonus}P 보너스`);
    }
    
    if (b.prioritySupport) {
      benefits.push('우선 고객 지원');
    }
    
    if (b.earlyAccess) {
      benefits.push('신상품 우선 구매');
    }
    
    if (b.exclusiveEvents) {
      benefits.push('VIP 전용 이벤트');
    }

    return benefits;
  }

  /**
   * 거래 ID 생성
   */
  private generateTransactionId(): string {
    return `PT${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 기본 설명 생성
   */
  private getDefaultDescription(
    type: string,
    source: string,
    amount: number
  ): string {
    const descriptions: Record<string, string> = {
      'earn.purchase': `Purchase reward`,
      'earn.review': 'Review reward',
      'earn.referral': 'Referral bonus',
      'earn.event': 'Event reward',
      'earn.birthday': 'Birthday gift',
      'earn.tier_bonus': 'Membership bonus',
      'use.purchase': 'Point payment'
    };

    return descriptions[`${type}.${source}`] || `Points ${type}`;
  }

  /**
   * 만료일 계산
   */
  private calculateExpiryDate(): Date {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1년 후
    return expiryDate;
  }

  /**
   * 거래 내역 저장
   */
  private async saveTransaction(transaction: PointTransaction): Promise<void> {
    // 실제로는 DB에 저장
    const userTransactions = this.pointTransactions.get(transaction.userId) || [];
    userTransactions.push(transaction);
    this.pointTransactions.set(transaction.userId, userTransactions);
  }

  /**
   * 사용자 포인트 업데이트
   */
  private async updateUserPoints(userId: string, newBalance: number): Promise<void> {
    // 실제로는 DB 업데이트
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.metadata = {
        ...user.metadata,
        pointBalance: newBalance
      };
      await this.userRepository.save(user);
    }
  }

  /**
   * 포인트 거래 내역 조회
   */
  async getPointHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: PointTransaction[]; total: number }> {
    const transactions = this.pointTransactions.get(userId) || [];
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      transactions: transactions.slice(start, end),
      total: transactions.length
    };
  }
}

// 싱글톤 인스턴스
export const membershipService = new MembershipService();