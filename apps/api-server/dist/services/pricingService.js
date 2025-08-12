"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
const connection_1 = require("../database/connection");
const Product_1 = require("../entities/Product");
const PricePolicy_1 = require("../entities/PricePolicy");
const CacheService_1 = require("./CacheService");
class PricingService {
    constructor() {
        this.pricePolicyRepository = connection_1.AppDataSource.getRepository(PricePolicy_1.PricePolicy);
        this.productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
    }
    /**
     * 상품의 최종 가격을 계산합니다.
     * 여러 가격 정책을 적용하여 최적의 가격을 결정합니다.
     */
    async calculatePrice(product, context) {
        // 캐시 키 생성
        const cacheKey = `pricing:${product.id}:${context.userRole || 'customer'}:${context.userId || 'guest'}:${context.quantity}:${context.region || ''}:${context.city || ''}:${context.orderAmount || 0}`;
        // 캐시된 결과 확인
        const cachedResult = await CacheService_1.cacheService.get(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }
        const originalPrice = this.getBasePrice(product, context.userRole);
        const date = context.date || new Date();
        // 적용 가능한 가격 정책 조회
        const applicablePolicies = await this.getApplicablePolicies(product, context, date);
        // 정책 우선순위에 따라 정렬
        applicablePolicies.sort((a, b) => b.priority - a.priority);
        let finalPrice = originalPrice;
        let totalDiscount = 0;
        const appliedPolicies = [];
        const exclusivePolicyApplied = false;
        for (const policy of applicablePolicies) {
            // 독점 정책이 이미 적용된 경우 다른 정책 적용 불가
            if (exclusivePolicyApplied && policy.isExclusive)
                continue;
            if (appliedPolicies.some((p) => p.isExclusive) && !policy.isExclusive)
                continue;
            // 정책 적용 가능성 재검증
            if (!this.canApplyPolicy(policy, product, context, date))
                continue;
            // 할인 계산
            const discountedPrice = policy.calculateDiscountedPrice(finalPrice, context.quantity || 1);
            if (discountedPrice < finalPrice) {
                const policyDiscount = finalPrice - discountedPrice;
                totalDiscount += policyDiscount;
                finalPrice = discountedPrice;
                appliedPolicies.push(policy);
                // 독점 정책인 경우 더 이상 다른 정책 적용하지 않음
                if (policy.isExclusive)
                    break;
            }
        }
        const savings = originalPrice - finalPrice;
        const savingsPercentage = originalPrice > 0 ? (savings / originalPrice) * 100 : 0;
        const result = {
            originalPrice,
            finalPrice: Math.max(0, finalPrice),
            discountAmount: totalDiscount,
            appliedPolicies,
            savings,
            savingsPercentage: Math.round(savingsPercentage * 100) / 100
        };
        // 결과를 캐시에 저장 (5분 TTL)
        await CacheService_1.cacheService.set(cacheKey, result, undefined, { ttl: 300 });
        return result;
    }
    /**
     * 여러 상품의 가격을 일괄 계산합니다.
     */
    async calculateBulkPrices(items, context) {
        const results = [];
        // 전체 주문 금액 계산 (할인 적용 전)
        const totalOrderAmount = items.reduce((sum, item) => {
            const basePrice = this.getBasePrice(item.product, context.userRole);
            return sum + (basePrice * item.quantity);
        }, 0);
        const contextWithOrderAmount = {
            ...context,
            orderAmount: totalOrderAmount
        };
        for (const item of items) {
            const itemContext = {
                ...contextWithOrderAmount,
                quantity: item.quantity,
                productCategories: item.product.categoryId ? [item.product.categoryId] : [],
                productTags: item.product.tags || []
            };
            const pricingResult = await this.calculatePrice(item.product, itemContext);
            results.push({
                ...pricingResult,
                product: item.product,
                quantity: item.quantity
            });
        }
        return results;
    }
    /**
     * 상품의 기본 가격을 사용자 역할에 따라 반환합니다.
     */
    getBasePrice(product, userRole) {
        if (!userRole)
            return product.retailPrice;
        switch (userRole) {
            case PricePolicy_1.UserRole.BUSINESS:
            case PricePolicy_1.UserRole.WHOLESALE:
                return product.wholesalePrice || product.retailPrice;
            case PricePolicy_1.UserRole.AFFILIATE:
            case PricePolicy_1.UserRole.DISTRIBUTOR:
                return product.affiliatePrice || product.retailPrice;
            default:
                return product.retailPrice;
        }
    }
    /**
     * 적용 가능한 가격 정책을 조회합니다.
     */
    async getApplicablePolicies(product, context, date) {
        const queryBuilder = this.pricePolicyRepository
            .createQueryBuilder('policy')
            .where('policy.isActive = :isActive', { isActive: true })
            .andWhere('(policy.startDate IS NULL OR policy.startDate <= :date)', { date })
            .andWhere('(policy.endDate IS NULL OR policy.endDate >= :date)', { date });
        // 상품별 필터링
        queryBuilder.andWhere('(policy.productId IS NULL OR policy.productId = :productId)', { productId: product.id });
        // 역할별 필터링
        if (context.userRole) {
            queryBuilder.andWhere('(policy.targetRole IS NULL OR policy.targetRole = :userRole)', { userRole: context.userRole });
        }
        // 사용자별 필터링
        if (context.userId) {
            queryBuilder.andWhere('(policy.targetUserId IS NULL OR policy.targetUserId = :userId)', { userId: context.userId });
        }
        // 수량별 필터링
        if (context.quantity) {
            queryBuilder.andWhere('(policy.minQuantity IS NULL OR policy.minQuantity <= :quantity)', { quantity: context.quantity });
            queryBuilder.andWhere('(policy.maxQuantity IS NULL OR policy.maxQuantity >= :quantity)', { quantity: context.quantity });
        }
        // 주문 금액별 필터링
        if (context.orderAmount) {
            queryBuilder.andWhere('(policy.minOrderAmount IS NULL OR policy.minOrderAmount <= :orderAmount)', { orderAmount: context.orderAmount });
            queryBuilder.andWhere('(policy.maxOrderAmount IS NULL OR policy.maxOrderAmount >= :orderAmount)', { orderAmount: context.orderAmount });
        }
        // 사용 횟수 제한 확인
        queryBuilder.andWhere('(policy.maxUsageCount IS NULL OR policy.currentUsageCount < policy.maxUsageCount)');
        return await queryBuilder.getMany();
    }
    /**
     * 특정 정책이 적용 가능한지 검증합니다.
     */
    canApplyPolicy(policy, product, context, date) {
        // 기본 유효성 검사
        if (!policy.isValid(date))
            return false;
        // 사용자 적용 가능성 검사
        if (!policy.canApplyToUser(context.userRole || '', context.userId))
            return false;
        // 상품 적용 가능성 검사
        if (!policy.canApplyToProduct(product.id, context.productCategories, context.productTags))
            return false;
        // 수량 적용 가능성 검사
        if (context.quantity && !policy.canApplyToQuantity(context.quantity))
            return false;
        // 주문 금액 적용 가능성 검사
        if (context.orderAmount && !policy.canApplyToOrderAmount(context.orderAmount))
            return false;
        // 지역 확인
        if (policy.targetRegions && policy.targetRegions.length > 0) {
            if (!context.region || !policy.targetRegions.includes(context.region))
                return false;
        }
        if (policy.targetCities && policy.targetCities.length > 0) {
            if (!context.city || !policy.targetCities.includes(context.city))
                return false;
        }
        return true;
    }
    /**
     * 가격 정책을 생성합니다.
     */
    async createPricePolicy(policyData) {
        const policy = this.pricePolicyRepository.create(policyData);
        const savedPolicy = await this.pricePolicyRepository.save(policy);
        // 관련 캐시 무효화
        await this.invalidateRelevantCache(savedPolicy);
        return savedPolicy;
    }
    /**
     * 가격 정책을 업데이트합니다.
     */
    async updatePricePolicy(policyId, updateData) {
        const existingPolicy = await this.pricePolicyRepository.findOne({ where: { id: policyId } });
        await this.pricePolicyRepository.update(policyId, updateData);
        const updatedPolicy = await this.pricePolicyRepository.findOne({ where: { id: policyId } });
        // 관련 캐시 무효화
        if (existingPolicy) {
            await this.invalidateRelevantCache(existingPolicy);
        }
        if (updatedPolicy) {
            await this.invalidateRelevantCache(updatedPolicy);
        }
        return updatedPolicy;
    }
    /**
     * 가격 정책을 삭제합니다.
     */
    async deletePricePolicy(policyId) {
        const result = await this.pricePolicyRepository.update(policyId, { isActive: false });
        return result.affected !== null && result.affected !== undefined && result.affected > 0;
    }
    /**
     * 특정 사용자의 가격 정책 목록을 조회합니다.
     */
    async getUserPricePolicies(userId, userRole) {
        return await this.pricePolicyRepository.find({
            where: [
                { targetUserId: userId, isActive: true },
                { targetRole: userRole, isActive: true }
            ],
            order: { priority: 'DESC', createdAt: 'DESC' }
        });
    }
    /**
     * 가격 정책 사용량을 증가시킵니다.
     */
    async incrementPolicyUsage(policyId, userId) {
        await this.pricePolicyRepository.increment({ id: policyId }, 'currentUsageCount', 1);
        // 사용자별 사용 횟수 추적이 필요한 경우 별도 테이블 구현
        // 여기서는 간단히 전체 사용 횟수만 추적
    }
    /**
     * 상품별 최적 가격 정책을 추천합니다.
     */
    async recommendPricePolicies(productId, userRole) {
        const product = await this.productRepository.findOne({ where: { id: productId } });
        if (!product)
            return [];
        const context = {
            userRole,
            productCategories: product.categoryId ? [product.categoryId] : [],
            productTags: product.tags || []
        };
        return await this.getApplicablePolicies(product, context, new Date());
    }
    /**
     * 할인 시뮬레이션을 실행합니다.
     */
    async simulateDiscount(productId, context, policyIds) {
        const product = await this.productRepository.findOne({ where: { id: productId } });
        if (!product) {
            throw new Error('Product not found');
        }
        const policies = await this.pricePolicyRepository.findByIds(policyIds);
        const originalPrice = this.getBasePrice(product, context.userRole);
        let finalPrice = originalPrice;
        let totalDiscount = 0;
        const appliedPolicies = [];
        for (const policy of policies) {
            if (this.canApplyPolicy(policy, product, context, context.date || new Date())) {
                const discountedPrice = policy.calculateDiscountedPrice(finalPrice, context.quantity || 1);
                if (discountedPrice < finalPrice) {
                    totalDiscount += finalPrice - discountedPrice;
                    finalPrice = discountedPrice;
                    appliedPolicies.push(policy);
                }
            }
        }
        const savings = originalPrice - finalPrice;
        const savingsPercentage = originalPrice > 0 ? (savings / originalPrice) * 100 : 0;
        return {
            originalPrice,
            finalPrice: Math.max(0, finalPrice),
            discountAmount: totalDiscount,
            appliedPolicies,
            savings,
            savingsPercentage: Math.round(savingsPercentage * 100) / 100
        };
    }
    /**
     * 정책 변경 시 관련 캐시를 무효화합니다.
     */
    async invalidateRelevantCache(policy) {
        try {
            // 특정 상품 정책인 경우 해당 상품 캐시 무효화
            if (policy.productId) {
                await CacheService_1.cacheService.clear(`pricing:*`);
            }
            // 특정 사용자 정책인 경우 해당 사용자 캐시 무효화
            if (policy.targetUserId) {
                await CacheService_1.cacheService.clear(`pricing:*`);
            }
            // 역할 기반 정책인 경우 해당 역할의 모든 캐시 무효화는
            // 성능상 부담이 클 수 있으므로 TTL에 의존
        }
        catch (error) {
            console.warn('Failed to invalidate pricing cache:', error);
        }
    }
}
exports.PricingService = PricingService;
//# sourceMappingURL=pricingService.js.map