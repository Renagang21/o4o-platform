"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsController = void 0;
const connection_1 = require("../database/connection");
const Product_1 = require("../entities/Product");
const Category_1 = require("../entities/Category");
class ProductsController {
    constructor() {
        this.productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
        this.categoryRepository = connection_1.AppDataSource.getRepository(Category_1.Category);
        // 상품 목록 조회 (필터링, 페이징, 정렬)
        this.getProducts = async (req, res) => {
            var _a;
            try {
                // 개발 환경에서 DB 연결 없이 테스트 데이터 반환
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        data: [
                            {
                                id: '1',
                                name: '테스트 상품 1',
                                description: '개발 환경 테스트 상품입니다',
                                price: 10000,
                                stock: 100,
                                status: 'active',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            },
                            {
                                id: '2',
                                name: '테스트 상품 2',
                                description: '개발 환경 테스트 상품입니다',
                                price: 20000,
                                stock: 50,
                                status: 'active',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            }
                        ],
                        total: 2,
                        page: 1,
                        limit: 20
                    });
                }
                const { page = 1, limit = 20, category, search, status = 'active', sortBy = 'createdAt', sortOrder = 'DESC', featured, minPrice, maxPrice } = req.query;
                const skip = (Number(page) - 1) * Number(limit);
                // 쿼리 빌더를 사용한 복잡한 필터링
                const queryBuilder = this.productRepository
                    .createQueryBuilder('product')
                    .leftJoinAndSelect('product.creator', 'creator')
                    .where('product.status = :status', { status });
                // 검색 조건
                if (search) {
                    queryBuilder.andWhere('(product.name ILIKE :search OR product.description ILIKE :search)', { search: `%${search}%` });
                }
                // 카테고리 필터
                if (category) {
                    queryBuilder.andWhere('product.categoryId = :category', { category });
                }
                // 가격 범위 필터
                if (minPrice) {
                    queryBuilder.andWhere('product.retailPrice >= :minPrice', { minPrice: Number(minPrice) });
                }
                if (maxPrice) {
                    queryBuilder.andWhere('product.retailPrice <= :maxPrice', { maxPrice: Number(maxPrice) });
                }
                // 추천 상품 필터
                if (featured !== undefined) {
                    queryBuilder.andWhere('product.featured = :featured', { featured: featured === 'true' });
                }
                // 정렬
                queryBuilder.orderBy(`product.${sortBy}`, sortOrder);
                // 페이징
                queryBuilder.skip(skip).take(Number(limit));
                const [products, totalCount] = await queryBuilder.getManyAndCount();
                // 사용자 역할에 따른 가격 조정
                const userRole = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) || 'customer';
                const roleString = String(userRole);
                const productsWithUserPrice = products.map((product) => ({
                    ...product,
                    price: product.getPriceForUser(userRole),
                    // 민감한 정보 제거
                    cost: undefined,
                    wholesalePrice: roleString === 'business' ? product.wholesalePrice : undefined,
                    affiliatePrice: roleString === 'affiliate' ? product.affiliatePrice : undefined,
                }));
                res.json({
                    success: true,
                    data: {
                        products: productsWithUserPrice,
                        pagination: {
                            page: Number(page),
                            limit: Number(limit),
                            totalCount,
                            totalPages: Math.ceil(totalCount / Number(limit)),
                            hasNext: skip + Number(limit) < totalCount,
                            hasPrev: Number(page) > 1
                        }
                    }
                });
            }
            catch (error) {
                console.error('Error fetching products:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch products'
                });
            }
        };
        // 상품 상세 조회
        this.getProduct = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const product = await this.productRepository
                    .createQueryBuilder('product')
                    .leftJoinAndSelect('product.creator', 'creator')
                    .where('product.id = :id', { id })
                    .andWhere('product.status IN (:...statuses)', {
                    statuses: [Product_1.ProductStatus.ACTIVE, Product_1.ProductStatus.OUT_OF_STOCK]
                })
                    .getOne();
                if (!product) {
                    return res.status(404).json({
                        success: false,
                        error: 'Product not found'
                    });
                }
                // 사용자 역할에 따른 가격 조정
                const userRole = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) || 'customer';
                const roleString = String(userRole);
                const productWithUserPrice = {
                    ...product,
                    price: product.getPriceForUser(userRole),
                    // 민감한 정보 제거
                    cost: undefined,
                    wholesalePrice: roleString === 'business' ? product.wholesalePrice : undefined,
                    affiliatePrice: roleString === 'affiliate' ? product.affiliatePrice : undefined,
                };
                res.json({
                    success: true,
                    data: productWithUserPrice
                });
            }
            catch (error) {
                console.error('Error fetching product:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch product'
                });
            }
        };
        // 상품 생성 (관리자만)
        this.createProduct = async (req, res) => {
            var _a, _b, _c;
            try {
                // 관리자 권한 확인
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'manager') {
                    return res.status(403).json({
                        success: false,
                        error: 'Insufficient permissions'
                    });
                }
                const productData = req.body;
                // SKU 중복 확인
                const existingProduct = await this.productRepository.findOne({
                    where: { sku: productData.sku }
                });
                if (existingProduct) {
                    return res.status(400).json({
                        success: false,
                        error: 'SKU already exists'
                    });
                }
                const product = this.productRepository.create({
                    ...productData,
                    createdBy: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.id) || 'system',
                    slug: productData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                });
                const savedProduct = await this.productRepository.save(product);
                res.status(201).json({
                    success: true,
                    data: savedProduct
                });
            }
            catch (error) {
                console.error('Error creating product:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to create product'
                });
            }
        };
        // 상품 수정 (관리자만)
        this.updateProduct = async (req, res) => {
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
                const product = await this.productRepository.findOne({ where: { id } });
                if (!product) {
                    return res.status(404).json({
                        success: false,
                        error: 'Product not found'
                    });
                }
                // SKU 중복 확인 (자기 자신 제외)
                if (updateData.sku && updateData.sku !== product.sku) {
                    const existingProduct = await this.productRepository.findOne({
                        where: { sku: updateData.sku }
                    });
                    if (existingProduct) {
                        return res.status(400).json({
                            success: false,
                            error: 'SKU already exists'
                        });
                    }
                }
                await this.productRepository.update(id, updateData);
                const updatedProduct = await this.productRepository.findOne({ where: { id } });
                res.json({
                    success: true,
                    data: updatedProduct
                });
            }
            catch (error) {
                console.error('Error updating product:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update product'
                });
            }
        };
        // 상품 삭제 (관리자만)
        this.deleteProduct = async (req, res) => {
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
                const product = await this.productRepository.findOne({ where: { id } });
                if (!product) {
                    return res.status(404).json({
                        success: false,
                        error: 'Product not found'
                    });
                }
                // 소프트 삭제 (상태를 inactive로 변경)
                await this.productRepository.update(id, { status: Product_1.ProductStatus.INACTIVE });
                res.json({
                    success: true,
                    message: 'Product deleted successfully'
                });
            }
            catch (error) {
                console.error('Error deleting product:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete product'
                });
            }
        };
        // 추천 상품 조회
        this.getFeaturedProducts = async (req, res) => {
            var _a;
            try {
                const { limit = 10 } = req.query;
                const products = await this.productRepository.find({
                    where: {
                        featured: true,
                        status: Product_1.ProductStatus.ACTIVE
                    },
                    take: Number(limit),
                    order: { createdAt: 'DESC' }
                });
                // 사용자 역할에 따른 가격 조정
                const userRole = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) || 'customer';
                const roleString = String(userRole);
                const productsWithUserPrice = products.map((product) => ({
                    ...product,
                    price: product.getPriceForUser(userRole),
                    cost: undefined,
                    wholesalePrice: undefined,
                    affiliatePrice: undefined,
                }));
                res.json({
                    success: true,
                    data: productsWithUserPrice
                });
            }
            catch (error) {
                console.error('Error fetching featured products:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch featured products'
                });
            }
        };
    }
}
exports.ProductsController = ProductsController;
//# sourceMappingURL=productsController.js.map