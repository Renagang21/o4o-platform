"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricePolicyController = void 0;
const connection_1 = require("../database/connection");
const PricePolicy_1 = require("../entities/PricePolicy");
const Product_1 = require("../entities/Product");
const pricingService_1 = require("../services/pricingService");
const typeorm_1 = require("typeorm");
class PricePolicyController {
    constructor() {
        this.pricePolicyRepository = connection_1.AppDataSource.getRepository(PricePolicy_1.PricePolicy);
        this.productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
        this.pricingService = new pricingService_1.PricingService();
        // 가격 정책 목록 조회
        this.getPricePolicies = async (req, res) => {
            var _a, _b;
            try {
                // 관리자 권한 확인
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'manager') {
                    return res.status(403).json({
                        success: false,
                        error: 'Insufficient permissions'
                    });
                }
                const { page = 1, limit = 20, type, isActive, targetRole, search } = req.query;
                const skip = (Number(page) - 1) * Number(limit);
                const queryBuilder = this.pricePolicyRepository
                    .createQueryBuilder('policy')
                    .leftJoinAndSelect('policy.creator', 'creator')
                    .leftJoinAndSelect('policy.product', 'product')
                    .leftJoinAndSelect('policy.targetUser', 'targetUser');
                // 필터링 조건
                if (type) {
                    queryBuilder.andWhere('policy.type = :type', { type });
                }
                if (isActive !== undefined) {
                    queryBuilder.andWhere('policy.isActive = :isActive', { isActive: isActive === 'true' });
                }
                if (targetRole) {
                    queryBuilder.andWhere('policy.targetRole = :targetRole', { targetRole });
                }
                if (search) {
                    queryBuilder.andWhere('(policy.name ILIKE :search OR policy.description ILIKE :search)', { search: `%${search}%` });
                }
                queryBuilder
                    .orderBy('policy.priority', 'DESC')
                    .addOrderBy('policy.createdAt', 'DESC')
                    .skip(skip)
                    .take(Number(limit));
                const [policies, totalCount] = await queryBuilder.getManyAndCount();
                res.json({
                    success: true,
                    data: {
                        policies,
                        pagination: {
                            page: Number(page),
                            limit: Number(limit),
                            totalCount,
                            totalPages: Math.ceil(totalCount / Number(limit))
                        }
                    }
                });
            }
            catch (error) {
                console.error('Error fetching price policies:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch price policies'
                });
            }
        };
        // 가격 정책 상세 조회
        this.getPricePolicy = async (req, res) => {
            try {
                const { id } = req.params;
                const policy = await this.pricePolicyRepository.findOne({
                    where: { id },
                    relations: ['creator', 'product', 'targetUser']
                });
                if (!policy) {
                    return res.status(404).json({
                        success: false,
                        error: 'Price policy not found'
                    });
                }
                res.json({
                    success: true,
                    data: policy
                });
            }
            catch (error) {
                console.error('Error fetching price policy:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch price policy'
                });
            }
        };
        // 가격 정책 생성
        this.createPricePolicy = async (req, res) => {
            var _a, _b;
            try {
                // 관리자 권한 확인
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'manager') {
                    return res.status(403).json({
                        success: false,
                        error: 'Insufficient permissions'
                    });
                }
                const policyData = {
                    ...req.body,
                    createdBy: req.user.id
                };
                // 데이터 검증
                const validationError = this.validatePolicyData(policyData);
                if (validationError) {
                    return res.status(400).json({
                        success: false,
                        error: validationError
                    });
                }
                // 상품 존재 확인 (상품별 정책인 경우)
                if (policyData.productId) {
                    const product = await this.productRepository.findOne({
                        where: { id: policyData.productId }
                    });
                    if (!product) {
                        return res.status(404).json({
                            success: false,
                            error: 'Product not found'
                        });
                    }
                }
                const policy = this.pricePolicyRepository.create(policyData);
                const savedPolicy = await this.pricePolicyRepository.save(policy);
                res.status(201).json({
                    success: true,
                    data: savedPolicy
                });
            }
            catch (error) {
                console.error('Error creating price policy:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to create price policy'
                });
            }
        };
        // 가격 정책 수정
        this.updatePricePolicy = async (req, res) => {
            var _a, _b;
            try {
                // 관리자 권한 확인
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'manager') {
                    return res.status(403).json({
                        success: false,
                        error: 'Insufficient permissions'
                    });
                }
                const { id } = req.params;
                const updateData = req.body;
                const policy = await this.pricePolicyRepository.findOne({ where: { id } });
                if (!policy) {
                    return res.status(404).json({
                        success: false,
                        error: 'Price policy not found'
                    });
                }
                // 데이터 검증
                const validationError = this.validatePolicyData({ ...policy, ...updateData });
                if (validationError) {
                    return res.status(400).json({
                        success: false,
                        error: validationError
                    });
                }
                await this.pricePolicyRepository.update(id, updateData);
                const updatedPolicy = await this.pricePolicyRepository.findOne({
                    where: { id },
                    relations: ['creator', 'product', 'targetUser']
                });
                res.json({
                    success: true,
                    data: updatedPolicy
                });
            }
            catch (error) {
                console.error('Error updating price policy:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update price policy'
                });
            }
        };
        // 가격 정책 삭제 (비활성화)
        this.deletePricePolicy = async (req, res) => {
            var _a;
            try {
                // 관리자 권한 확인
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        error: 'Insufficient permissions'
                    });
                }
                const { id } = req.params;
                const policy = await this.pricePolicyRepository.findOne({ where: { id } });
                if (!policy) {
                    return res.status(404).json({
                        success: false,
                        error: 'Price policy not found'
                    });
                }
                // 소프트 삭제 (비활성화)
                await this.pricePolicyRepository.update(id, { isActive: false });
                res.json({
                    success: true,
                    message: 'Price policy deactivated successfully'
                });
            }
            catch (error) {
                console.error('Error deleting price policy:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete price policy'
                });
            }
        };
        // 가격 계산 시뮬레이션
        this.simulatePrice = async (req, res) => {
            try {
                const { productId, quantity = 1, userRole = 'customer', userId, region, city, policyIds = [] } = req.body;
                if (!productId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Product ID is required'
                    });
                }
                const product = await this.productRepository.findOne({
                    where: { id: productId }
                });
                if (!product) {
                    return res.status(404).json({
                        success: false,
                        error: 'Product not found'
                    });
                }
                const context = {
                    userRole,
                    userId,
                    quantity: Number(quantity),
                    region,
                    city,
                    productCategories: product.categoryId ? [product.categoryId] : [],
                    productTags: product.tags || []
                };
                let result;
                if (policyIds.length > 0) {
                    // 특정 정책들로 시뮬레이션
                    result = await this.pricingService.simulateDiscount(productId, context, policyIds);
                }
                else {
                    // 전체 적용 가능한 정책으로 계산
                    result = await this.pricingService.calculatePrice(product, context);
                }
                res.json({
                    success: true,
                    data: {
                        product: {
                            id: product.id,
                            name: product.name,
                            retailPrice: product.retailPrice,
                            wholesalePrice: product.wholesalePrice,
                            affiliatePrice: product.affiliatePrice
                        },
                        pricing: result,
                        context
                    }
                });
            }
            catch (error) {
                console.error('Error simulating price:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to simulate price'
                });
            }
        };
        // 사용자별 적용 가능한 정책 조회
        this.getUserPolicies = async (req, res) => {
            var _a, _b;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const userRole = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) || 'customer';
                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }
                const policies = await this.pricingService.getUserPricePolicies(userId, userRole);
                res.json({
                    success: true,
                    data: policies
                });
            }
            catch (error) {
                console.error('Error fetching user policies:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch user policies'
                });
            }
        };
        // 상품별 적용 가능한 정책 조회
        this.getProductPolicies = async (req, res) => {
            try {
                const { productId } = req.params;
                const { userRole = 'customer' } = req.query;
                const policies = await this.pricingService.recommendPricePolicies(productId, userRole);
                res.json({
                    success: true,
                    data: policies
                });
            }
            catch (error) {
                console.error('Error fetching product policies:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch product policies'
                });
            }
        };
        // 가격 정책 통계
        this.getPolicyStatistics = async (req, res) => {
            var _a, _b;
            try {
                // 관리자 권한 확인
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'manager') {
                    return res.status(403).json({
                        success: false,
                        error: 'Insufficient permissions'
                    });
                }
                const [totalPolicies, activePolicies, expiredPolicies, typeStats, roleStats] = await Promise.all([
                    this.pricePolicyRepository.count(),
                    this.pricePolicyRepository.count({ where: { isActive: true } }),
                    this.pricePolicyRepository.count({
                        where: {
                            isActive: true,
                            endDate: (0, typeorm_1.LessThan)(new Date())
                        }
                    }),
                    this.pricePolicyRepository
                        .createQueryBuilder('policy')
                        .select('policy.type', 'type')
                        .addSelect('COUNT(*)', 'count')
                        .where('policy.isActive = :isActive', { isActive: true })
                        .groupBy('policy.type')
                        .getRawMany(),
                    this.pricePolicyRepository
                        .createQueryBuilder('policy')
                        .select('policy.targetRole', 'role')
                        .addSelect('COUNT(*)', 'count')
                        .where('policy.isActive = :isActive', { isActive: true })
                        .andWhere('policy.targetRole IS NOT NULL')
                        .groupBy('policy.targetRole')
                        .getRawMany()
                ]);
                res.json({
                    success: true,
                    data: {
                        overview: {
                            totalPolicies,
                            activePolicies,
                            expiredPolicies,
                            inactivePolicies: totalPolicies - activePolicies
                        },
                        typeDistribution: typeStats,
                        roleDistribution: roleStats
                    }
                });
            }
            catch (error) {
                console.error('Error fetching policy statistics:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch policy statistics'
                });
            }
        };
    }
    // 가격 정책 데이터 검증
    validatePolicyData(data) {
        // 필수 필드 검증
        if (!data.name || !data.type || !data.discountType || data.discountValue === undefined) {
            return 'Missing required fields: name, type, discountType, discountValue';
        }
        // 할인 값 검증
        if (data.discountValue < 0) {
            return 'Discount value must be positive';
        }
        if (data.discountType === PricePolicy_1.DiscountType.PERCENTAGE && data.discountValue > 100) {
            return 'Percentage discount cannot exceed 100%';
        }
        // 날짜 검증
        if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
            return 'Start date must be before end date';
        }
        // 수량 검증
        if (data.minQuantity && data.maxQuantity && data.minQuantity > data.maxQuantity) {
            return 'Minimum quantity cannot exceed maximum quantity';
        }
        // 금액 검증
        if (data.minOrderAmount && data.maxOrderAmount && data.minOrderAmount > data.maxOrderAmount) {
            return 'Minimum order amount cannot exceed maximum order amount';
        }
        // 우선순위 검증
        if (data.priority && (data.priority < 1 || data.priority > 100)) {
            return 'Priority must be between 1 and 100';
        }
        return null;
    }
}
exports.PricePolicyController = PricePolicyController;
//# sourceMappingURL=pricePolicyController.js.map