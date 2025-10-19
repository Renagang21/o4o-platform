"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const connection_1 = require("../database/connection");
const Product_1 = require("../entities/Product");
const Supplier_1 = require("../entities/Supplier");
const Category_1 = require("../entities/Category");
const logger_1 = __importDefault(require("../utils/logger"));
class ProductService {
    constructor() {
        this.productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
        this.supplierRepository = connection_1.AppDataSource.getRepository(Supplier_1.Supplier);
        this.categoryRepository = connection_1.AppDataSource.getRepository(Category_1.Category);
    }
    // 제품 생성 (공급자용)
    async createProduct(data) {
        try {
            // 공급자 검증
            const supplier = await this.supplierRepository.findOne({
                where: { id: data.supplierId, isActive: true }
            });
            if (!supplier) {
                throw new Error('Supplier not found or inactive');
            }
            // SKU 중복 검사
            const existingProduct = await this.productRepository.findOne({
                where: { sku: data.sku }
            });
            if (existingProduct) {
                throw new Error('SKU already exists');
            }
            // Slug 생성 (없으면)
            const slug = data.slug || this.generateSlug(data.name);
            // Slug 중복 검사
            const existingSlug = await this.productRepository.findOne({
                where: { slug }
            });
            if (existingSlug) {
                throw new Error('Slug already exists');
            }
            // 카테고리 검증 (있다면)
            if (data.categoryId) {
                const category = await this.categoryRepository.findOne({
                    where: { id: data.categoryId }
                });
                if (!category) {
                    throw new Error('Category not found');
                }
            }
            // 제품 생성
            const product = this.productRepository.create({
                ...data,
                slug,
                status: Product_1.ProductStatus.DRAFT,
                currency: data.currency || 'KRW',
                partnerCommissionRate: data.partnerCommissionRate || 5,
                trackInventory: data.trackInventory !== false,
                allowBackorder: data.allowBackorder || false,
                lowStockThreshold: data.lowStockThreshold || 10
            });
            const savedProduct = await this.productRepository.save(product);
            logger_1.default.info(`Product created: ${savedProduct.id} by supplier ${data.supplierId}`);
            return savedProduct;
        }
        catch (error) {
            logger_1.default.error('Error creating product:', error);
            throw error;
        }
    }
    // 제품 조회 (단일)
    async getProduct(id) {
        try {
            const product = await this.productRepository.findOne({
                where: { id },
                relations: ['supplier', 'category']
            });
            return product;
        }
        catch (error) {
            logger_1.default.error('Error fetching product:', error);
            throw error;
        }
    }
    // 제품 목록 조회 (필터링)
    async getProducts(filters = {}) {
        try {
            const { supplierId, categoryId, status, isActive, inStock, priceMin, priceMax, search, tags, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = filters;
            const queryBuilder = this.productRepository
                .createQueryBuilder('product')
                .leftJoinAndSelect('product.supplier', 'supplier')
                .leftJoinAndSelect('product.category', 'category');
            // 필터 적용
            if (supplierId) {
                queryBuilder.andWhere('product.supplierId = :supplierId', { supplierId });
            }
            if (categoryId) {
                queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
            }
            if (status) {
                queryBuilder.andWhere('product.status = :status', { status });
            }
            if (isActive !== undefined) {
                queryBuilder.andWhere('product.isActive = :isActive', { isActive });
            }
            if (inStock) {
                queryBuilder.andWhere('product.inventory > 0');
            }
            if (priceMin !== undefined) {
                queryBuilder.andWhere('product.supplierPrice >= :priceMin', { priceMin });
            }
            if (priceMax !== undefined) {
                queryBuilder.andWhere('product.supplierPrice <= :priceMax', { priceMax });
            }
            if (search) {
                queryBuilder.andWhere('(product.name ILIKE :search OR product.description ILIKE :search OR product.sku ILIKE :search)', { search: `%${search}%` });
            }
            if (tags && tags.length > 0) {
                queryBuilder.andWhere('product.tags && :tags', { tags });
            }
            // 정렬
            const sortField = sortBy === 'price' ? 'supplierPrice' : sortBy;
            queryBuilder.orderBy(`product.${sortField}`, sortOrder.toUpperCase());
            // 페이징
            const offset = (page - 1) * limit;
            queryBuilder.skip(offset).take(limit);
            const [products, total] = await queryBuilder.getManyAndCount();
            return {
                products,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        }
        catch (error) {
            logger_1.default.error('Error fetching products:', error);
            throw error;
        }
    }
    // 제품 수정
    async updateProduct(id, data) {
        try {
            const product = await this.productRepository.findOne({
                where: { id }
            });
            if (!product) {
                throw new Error('Product not found');
            }
            // SKU 중복 검사 (변경된 경우)
            if (data.sku && data.sku !== product.sku) {
                const existingProduct = await this.productRepository.findOne({
                    where: { sku: data.sku }
                });
                if (existingProduct) {
                    throw new Error('SKU already exists');
                }
            }
            // Slug 중복 검사 (변경된 경우)
            if (data.slug && data.slug !== product.slug) {
                const existingSlug = await this.productRepository.findOne({
                    where: { slug: data.slug }
                });
                if (existingSlug) {
                    throw new Error('Slug already exists');
                }
            }
            // 카테고리 검증 (변경된 경우)
            if (data.categoryId && data.categoryId !== product.categoryId) {
                const category = await this.categoryRepository.findOne({
                    where: { id: data.categoryId }
                });
                if (!category) {
                    throw new Error('Category not found');
                }
            }
            // 제품 업데이트
            const updatedProduct = await this.productRepository.save({
                ...product,
                ...data,
                updatedAt: new Date()
            });
            logger_1.default.info(`Product updated: ${id}`);
            return updatedProduct;
        }
        catch (error) {
            logger_1.default.error('Error updating product:', error);
            throw error;
        }
    }
    // 제품 삭제 (소프트 삭제)
    async deleteProduct(id) {
        try {
            const result = await this.productRepository.update(id, {
                isActive: false,
                status: Product_1.ProductStatus.DISCONTINUED
            });
            if (result.affected === 0) {
                throw new Error('Product not found');
            }
            logger_1.default.info(`Product deleted: ${id}`);
            return true;
        }
        catch (error) {
            logger_1.default.error('Error deleting product:', error);
            throw error;
        }
    }
    // 제품 활성화/비활성화
    async toggleProductStatus(id, isActive) {
        try {
            const product = await this.productRepository.findOne({
                where: { id }
            });
            if (!product) {
                throw new Error('Product not found');
            }
            product.isActive = isActive;
            product.status = isActive ? Product_1.ProductStatus.ACTIVE : Product_1.ProductStatus.INACTIVE;
            const updatedProduct = await this.productRepository.save(product);
            logger_1.default.info(`Product status changed: ${id} -> ${isActive ? 'active' : 'inactive'}`);
            return updatedProduct;
        }
        catch (error) {
            logger_1.default.error('Error toggling product status:', error);
            throw error;
        }
    }
    // 재고 업데이트
    async updateInventory(id, quantity, operation = 'set') {
        try {
            const product = await this.productRepository.findOne({
                where: { id }
            });
            if (!product) {
                throw new Error('Product not found');
            }
            let newInventory = product.inventory;
            switch (operation) {
                case 'add':
                    newInventory += quantity;
                    break;
                case 'subtract':
                    newInventory = Math.max(0, newInventory - quantity);
                    break;
                case 'set':
                    newInventory = Math.max(0, quantity);
                    break;
            }
            product.inventory = newInventory;
            // 재고 부족 상태 업데이트
            if (product.trackInventory && newInventory <= (product.lowStockThreshold || 0)) {
                if (newInventory === 0) {
                    product.status = Product_1.ProductStatus.OUT_OF_STOCK;
                }
            }
            const updatedProduct = await this.productRepository.save(product);
            logger_1.default.info(`Product inventory updated: ${id} -> ${newInventory}`);
            return updatedProduct;
        }
        catch (error) {
            logger_1.default.error('Error updating inventory:', error);
            throw error;
        }
    }
    // 판매자가 선택 가능한 제품 목록 (활성화된 제품만)
    async getAvailableProductsForSellers(filters = {}) {
        return this.getProducts({
            ...filters,
            status: Product_1.ProductStatus.ACTIVE,
            isActive: true,
            inStock: true
        });
    }
    // 공급자별 제품 통계
    async getSupplierProductStats(supplierId) {
        try {
            const stats = await this.productRepository
                .createQueryBuilder('product')
                .select([
                'COUNT(*) as total',
                'COUNT(CASE WHEN product.status = :active THEN 1 END) as active',
                'COUNT(CASE WHEN product.status = :inactive THEN 1 END) as inactive',
                'COUNT(CASE WHEN product.status = :outOfStock THEN 1 END) as outOfStock',
                'COUNT(CASE WHEN product.inventory <= product.lowStockThreshold THEN 1 END) as lowStock',
                'AVG(product.supplierPrice) as averagePrice',
                'SUM(product.inventory) as totalInventory',
                'SUM(product.salesCount) as totalSales'
            ])
                .where('product.supplierId = :supplierId', { supplierId })
                .setParameters({
                active: Product_1.ProductStatus.ACTIVE,
                inactive: Product_1.ProductStatus.INACTIVE,
                outOfStock: Product_1.ProductStatus.OUT_OF_STOCK
            })
                .getRawOne();
            return {
                total: parseInt(stats.total) || 0,
                active: parseInt(stats.active) || 0,
                inactive: parseInt(stats.inactive) || 0,
                outOfStock: parseInt(stats.outOfStock) || 0,
                lowStock: parseInt(stats.lowStock) || 0,
                averagePrice: parseFloat(stats.averagePrice) || 0,
                totalInventory: parseInt(stats.totalInventory) || 0,
                totalSales: parseInt(stats.totalSales) || 0
            };
        }
        catch (error) {
            logger_1.default.error('Error fetching supplier product stats:', error);
            throw error;
        }
    }
    // 유틸리티: Slug 생성
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // 특수문자 제거
            .replace(/\s+/g, '-') // 공백을 하이픈으로
            .replace(/-+/g, '-') // 연속 하이픈 제거
            .trim();
    }
}
exports.ProductService = ProductService;
exports.default = ProductService;
//# sourceMappingURL=ProductService.js.map