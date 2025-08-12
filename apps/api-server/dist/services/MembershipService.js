"use strict";
/**
 * 회원 등급 및 포인트 서비스
 * VIP 등급, 포인트 적립/사용, 혜택 관리
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.membershipService = exports.MembershipService = void 0;
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const Order_1 = require("../entities/Order");
const simpleLogger_1 = __importDefault(require("../utils/simpleLogger"));
const events_1 = require("events");
class MembershipService extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        this.orderRepository = connection_1.AppDataSource.getRepository(Order_1.Order);
        // 회원 등급 정의
        this.tiers = [
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
        this.pointTransactions = new Map();
    }
    /**
     * 사용자 멤버십 정보 조회
     */
    async getUserMembership(userId) {
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
    async earnPoints(userId, amount, source, orderId, description) {
        const balance = await this.getPointBalance(userId);
        const transaction = {
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
        simpleLogger_1.default.info(`Points earned: User ${userId}, Amount ${amount}, Source ${source}`);
        return transaction;
    }
    /**
     * 포인트 사용
     */
    async usePoints(userId, amount, orderId, description) {
        const balance = await this.getPointBalance(userId);
        if (balance < amount) {
            throw new Error(`Insufficient points. Balance: ${balance}, Required: ${amount}`);
        }
        const transaction = {
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
        simpleLogger_1.default.info(`Points used: User ${userId}, Amount ${amount}, Order ${orderId}`);
        return transaction;
    }
    /**
     * 구매 완료 시 포인트 적립
     */
    async processOrderPoints(orderId) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['user']
        });
        if (!order || !order.userId)
            return;
        // 사용자 등급 확인
        const membership = await this.getUserMembership(order.userId);
        // 포인트 적립률 계산
        const pointRate = membership.currentTier.benefits.pointRate;
        const pointAmount = Math.floor(order.totalAmount * pointRate / 100);
        if (pointAmount > 0) {
            await this.earnPoints(order.userId, pointAmount, 'purchase', orderId, `${pointRate}% points for order #${order.orderNumber}`);
        }
        // 등급 업데이트 체크
        await this.checkTierUpgrade(order.userId);
    }
    /**
     * 리뷰 작성 포인트
     */
    async processReviewPoints(userId, productId, hasPhoto) {
        const basePoints = 100;
        const photoBonus = 200;
        const totalPoints = basePoints + (hasPhoto ? photoBonus : 0);
        await this.earnPoints(userId, totalPoints, 'review', undefined, hasPhoto ? 'Photo review bonus' : 'Review reward');
    }
    /**
     * 추천인 포인트
     */
    async processReferralPoints(referrerId, referredId) {
        // 추천인 포인트
        await this.earnPoints(referrerId, 5000, 'referral', undefined, `Referral bonus for inviting new member`);
        // 신규 회원 포인트
        await this.earnPoints(referredId, 3000, 'referral', undefined, 'Welcome bonus from referral');
    }
    /**
     * 생일 포인트
     */
    async processBirthdayPoints(userId) {
        const membership = await this.getUserMembership(userId);
        const birthdayPoints = membership.currentTier.benefits.birthdayBonus;
        if (birthdayPoints > 0) {
            await this.earnPoints(userId, birthdayPoints, 'birthday', undefined, 'Happy Birthday! 🎂');
        }
    }
    /**
     * 월간 보너스 포인트
     */
    async processMonthlyBonus() {
        // 모든 회원에게 등급별 월간 보너스 지급
        const users = await this.userRepository.find();
        for (const user of users) {
            try {
                const membership = await this.getUserMembership(user.id);
                const monthlyBonus = membership.currentTier.benefits.monthlyBonus;
                if (monthlyBonus > 0) {
                    await this.earnPoints(user.id, monthlyBonus, 'tier_bonus', undefined, `${membership.currentTier.name} monthly bonus`);
                }
            }
            catch (error) {
                simpleLogger_1.default.error(`Failed to process monthly bonus for user ${user.id}:`, error);
            }
        }
    }
    /**
     * 포인트 만료 처리
     */
    async expirePoints() {
        const now = new Date();
        // 실제로는 DB에서 만료된 포인트 조회
        for (const [userId, transactions] of this.pointTransactions) {
            const expiredTransactions = transactions.filter(t => t.type === 'earn' && t.expiresAt && t.expiresAt < now);
            for (const expired of expiredTransactions) {
                const balance = await this.getPointBalance(userId);
                const expireTransaction = {
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
    async checkTierUpgrade(userId) {
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
    async upgradeTier(userId, oldTier, newTier) {
        // 사용자 등급 업데이트 (실제로는 DB)
        simpleLogger_1.default.info(`User ${userId} upgraded from ${oldTier.name} to ${newTier.name}`);
        // 축하 포인트 지급
        const bonusPoints = (newTier.level - oldTier.level) * 1000;
        await this.earnPoints(userId, bonusPoints, 'tier_bonus', undefined, `Congratulations! Upgraded to ${newTier.name} ${newTier.icon}`);
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
    async getYearlyPurchaseStats(userId) {
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
            totalAmount: parseFloat((stats === null || stats === void 0 ? void 0 : stats.totalAmount) || '0'),
            totalOrders: parseInt((stats === null || stats === void 0 ? void 0 : stats.totalOrders) || '0')
        };
    }
    /**
     * 등급 계산
     */
    calculateTier(totalAmount, totalOrders) {
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
    getNextTier(currentTier) {
        const currentIndex = this.tiers.findIndex(t => t.id === currentTier.id);
        return this.tiers[currentIndex + 1];
    }
    /**
     * 진행률 계산
     */
    calculateProgress(currentAmount, currentTier, nextTier) {
        const required = nextTier.requiredAmount - currentTier.requiredAmount;
        const progress = currentAmount - currentTier.requiredAmount;
        return Math.min(100, Math.max(0, (progress / required) * 100));
    }
    /**
     * 포인트 잔액 조회
     */
    async getPointBalance(userId) {
        // 실제로는 DB에서 조회
        const transactions = this.pointTransactions.get(userId) || [];
        return transactions.reduce((sum, t) => sum + t.amount, 0);
    }
    /**
     * 평생 적립 포인트
     */
    async getLifetimePoints(userId) {
        // 실제로는 DB에서 조회
        const transactions = this.pointTransactions.get(userId) || [];
        return transactions
            .filter(t => t.type === 'earn')
            .reduce((sum, t) => sum + t.amount, 0);
    }
    /**
     * 혜택 목록 생성
     */
    getTierBenefitsList(tier) {
        const benefits = [];
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
    generateTransactionId() {
        return `PT${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * 기본 설명 생성
     */
    getDefaultDescription(type, source, amount) {
        const descriptions = {
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
    calculateExpiryDate() {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1년 후
        return expiryDate;
    }
    /**
     * 거래 내역 저장
     */
    async saveTransaction(transaction) {
        // 실제로는 DB에 저장
        const userTransactions = this.pointTransactions.get(transaction.userId) || [];
        userTransactions.push(transaction);
        this.pointTransactions.set(transaction.userId, userTransactions);
    }
    /**
     * 사용자 포인트 업데이트
     */
    async updateUserPoints(userId, newBalance) {
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
    async getPointHistory(userId, page = 1, limit = 20) {
        const transactions = this.pointTransactions.get(userId) || [];
        const start = (page - 1) * limit;
        const end = start + limit;
        return {
            transactions: transactions.slice(start, end),
            total: transactions.length
        };
    }
}
exports.MembershipService = MembershipService;
// 싱글톤 인스턴스
exports.membershipService = new MembershipService();
//# sourceMappingURL=MembershipService.js.map