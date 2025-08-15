import { Product } from '../entities/Product';
import { PricePolicy } from '../entities/PricePolicy';
import { User } from '../entities/User';
export interface PricingContext {
    user?: User;
    userRole?: string;
    userId?: string;
    quantity?: number;
    orderAmount?: number;
    region?: string;
    city?: string;
    productCategories?: string[];
    productTags?: string[];
    date?: Date;
}
export interface PricingResult {
    originalPrice: number;
    finalPrice: number;
    discountAmount: number;
    appliedPolicies: PricePolicy[];
    savings: number;
    savingsPercentage: number;
}
export declare class PricingService {
    private pricePolicyRepository;
    private productRepository;
    /**
     * 상품의 최종 가격을 계산합니다.
     * 여러 가격 정책을 적용하여 최적의 가격을 결정합니다.
     */
    calculatePrice(product: Product, context: PricingContext): Promise<PricingResult>;
    /**
     * 여러 상품의 가격을 일괄 계산합니다.
     */
    calculateBulkPrices(items: Array<{
        product: Product;
        quantity: number;
    }>, context: PricingContext): Promise<Array<PricingResult & {
        product: Product;
        quantity: number;
    }>>;
    /**
     * 상품의 기본 가격을 사용자 역할에 따라 반환합니다.
     */
    private getBasePrice;
    /**
     * 적용 가능한 가격 정책을 조회합니다.
     */
    private getApplicablePolicies;
    /**
     * 특정 정책이 적용 가능한지 검증합니다.
     */
    private canApplyPolicy;
    /**
     * 가격 정책을 생성합니다.
     */
    createPricePolicy(policyData: Partial<PricePolicy>): Promise<PricePolicy>;
    /**
     * 가격 정책을 업데이트합니다.
     */
    updatePricePolicy(policyId: string, updateData: Partial<PricePolicy>): Promise<PricePolicy | null>;
    /**
     * 가격 정책을 삭제합니다.
     */
    deletePricePolicy(policyId: string): Promise<boolean>;
    /**
     * 특정 사용자의 가격 정책 목록을 조회합니다.
     */
    getUserPricePolicies(userId: string, userRole: string): Promise<PricePolicy[]>;
    /**
     * 가격 정책 사용량을 증가시킵니다.
     */
    incrementPolicyUsage(policyId: string, userId?: string): Promise<void>;
    /**
     * 상품별 최적 가격 정책을 추천합니다.
     */
    recommendPricePolicies(productId: string, userRole: string): Promise<PricePolicy[]>;
    /**
     * 할인 시뮬레이션을 실행합니다.
     */
    simulateDiscount(productId: string, context: PricingContext, policyIds: string[]): Promise<PricingResult>;
    /**
     * 정책 변경 시 관련 캐시를 무효화합니다.
     */
    private invalidateRelevantCache;
}
//# sourceMappingURL=pricingService.d.ts.map