"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorProductController = void 0;
const connection_1 = require("../../database/connection");
const Product_1 = require("../../entities/Product");
const Category_1 = require("../../entities/Category");
const slugify_1 = __importDefault(require("slugify"));
class VendorProductController {
    // 벤더의 상품 목록 조회
    async getProducts(req, res) {
        var _a;
        try {
            const vendorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const { page = '1', limit = '20', search = '', category = '', status = '' } = req.query;
            if (!vendorId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
            const queryBuilder = productRepository
                .createQueryBuilder('product')
                .leftJoinAndSelect('product.images', 'images')
                .leftJoinAndSelect('product.category', 'category')
                .leftJoinAndSelect('product.inventory', 'inventory')
                .where('product.vendorId = :vendorId', { vendorId });
            // 검색 조건
            if (search) {
                queryBuilder.andWhere('(product.name LIKE :search OR product.sku LIKE :search)', { search: `%${search}%` });
            }
            // 카테고리 필터
            if (category && category !== 'all') {
                queryBuilder.andWhere('category.name = :category', { category });
            }
            // 상태 필터
            if (status) {
                queryBuilder.andWhere('product.status = :status', { status });
            }
            // 페이지네이션
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            queryBuilder
                .orderBy('product.createdAt', 'DESC')
                .skip(skip)
                .take(limitNum);
            const [products, total] = await queryBuilder.getManyAndCount();
            // 판매 통계 추가
            const productIds = products.map((p) => p.id);
            const salesStats = await this.getProductSalesStats(productIds);
            const formattedProducts = products.map((product) => {
                var _a;
                const stats = salesStats.find((s) => s.productId === product.id);
                return {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    category: product.categoryId || 'Uncategorized',
                    price: 0, // TODO: Add pricing to Product entity
                    stock: 0, // TODO: Add inventory to Product entity
                    status: product.status,
                    image: ((_a = product.images) === null || _a === void 0 ? void 0 : _a[0]) || '/api/placeholder/100/100',
                    sales: (stats === null || stats === void 0 ? void 0 : stats.totalSales) || 0
                };
            });
            res.json({
                products: formattedProducts,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum)
                }
            });
        }
        catch (error) {
            console.error('Error fetching vendor products:', error);
            res.status(500).json({ error: 'Failed to fetch products' });
        }
    }
    // 상품 상세 조회
    async getProduct(req, res) {
        var _a;
        try {
            const vendorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const { id } = req.params;
            if (!vendorId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
            const product = await productRepository.findOne({
                where: { id, vendorId },
                relations: ['images', 'category', 'inventory', 'tags', 'seo', 'shipping']
            });
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            res.json(product);
        }
        catch (error) {
            console.error('Error fetching product:', error);
            res.status(500).json({ error: 'Failed to fetch product' });
        }
    }
    // 상품 생성
    async createProduct(req, res) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            const vendorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const productData = req.body;
            if (!vendorId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
            const categoryRepository = connection_1.AppDataSource.getRepository(Category_1.Category);
            // 카테고리 확인
            let category = null;
            if (productData.categoryId) {
                category = await categoryRepository.findOne({
                    where: { id: productData.categoryId }
                });
            }
            // 상품 생성
            const product = productRepository.create({
                vendorId,
                name: productData.name,
                description: productData.description,
                sku: productData.sku,
                slug: (0, slugify_1.default)(productData.name, { lower: true, strict: true }),
                status: productData.status || 'draft',
                categoryId: category === null || category === void 0 ? void 0 : category.id,
                weight: (_b = productData.shipping) === null || _b === void 0 ? void 0 : _b.weight,
                dimensions: (_c = productData.shipping) === null || _c === void 0 ? void 0 : _c.dimensions,
                requiresShipping: ((_d = productData.shipping) === null || _d === void 0 ? void 0 : _d.requiresShipping) || true,
                images: (_e = productData.images) === null || _e === void 0 ? void 0 : _e.map((img) => img.url || img),
                featuredImage: ((_g = (_f = productData.images) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.url) || ((_h = productData.images) === null || _h === void 0 ? void 0 : _h[0])
            });
            const savedProduct = await productRepository.save(product);
            // Images are already saved in the product entity
            // 태그 추가 (구현 필요)
            res.status(201).json({
                message: 'Product created successfully',
                product: savedProduct
            });
        }
        catch (error) {
            console.error('Error creating product:', error);
            res.status(500).json({ error: 'Failed to create product' });
        }
    }
    // 상품 수정
    async updateProduct(req, res) {
        var _a;
        try {
            const vendorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const { id } = req.params;
            const updateData = req.body;
            if (!vendorId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
            const product = await productRepository.findOne({
                where: { id, vendorId },
                relations: ['inventory', 'seo', 'shipping']
            });
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            // 기본 정보 업데이트
            if (updateData.name)
                product.name = updateData.name;
            if (updateData.description)
                product.description = updateData.description;
            if (updateData.sku)
                product.sku = updateData.sku;
            // TODO: Add price fields to Product entity
            // if (updateData.price !== undefined) product.price = updateData.price;
            // if (updateData.compareAtPrice !== undefined) product.compareAtPrice = updateData.compareAtPrice;
            // if (updateData.cost !== undefined) product.cost = updateData.cost;
            if (updateData.status)
                product.status = updateData.status;
            // TODO: Add inventory management to Product entity
            // if (updateData.inventory) { ... }
            // SEO fields
            if (updateData.seo) {
                if (updateData.seo.title)
                    product.metaTitle = updateData.seo.title;
                if (updateData.seo.description)
                    product.metaDescription = updateData.seo.description;
            }
            // Shipping fields
            if (updateData.shipping) {
                if (updateData.shipping.weight !== undefined)
                    product.weight = updateData.shipping.weight;
                if (updateData.shipping.dimensions)
                    product.dimensions = updateData.shipping.dimensions;
                if (updateData.shipping.requiresShipping !== undefined)
                    product.requiresShipping = updateData.shipping.requiresShipping;
            }
            const updatedProduct = await productRepository.save(product);
            res.json({
                message: 'Product updated successfully',
                product: updatedProduct
            });
        }
        catch (error) {
            console.error('Error updating product:', error);
            res.status(500).json({ error: 'Failed to update product' });
        }
    }
    // 상품 삭제
    async deleteProduct(req, res) {
        var _a;
        try {
            const vendorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const { id } = req.params;
            if (!vendorId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
            const product = await productRepository.findOne({
                where: { id, vendorId }
            });
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            await productRepository.softRemove(product);
            res.json({ message: 'Product deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting product:', error);
            res.status(500).json({ error: 'Failed to delete product' });
        }
    }
    // 상품별 판매 통계 조회 (내부 메서드)
    async getProductSalesStats(productIds) {
        if (productIds.length === 0)
            return [];
        try {
            const result = await connection_1.AppDataSource
                .createQueryBuilder()
                .select('item.productId', 'productId')
                .addSelect('SUM(item.quantity)', 'totalSales')
                .from('order_items', 'item')
                .innerJoin('orders', 'order', 'order.id = item.orderId')
                .where('item.productId IN (:...productIds)', { productIds })
                .andWhere('order.status = :status', { status: 'completed' })
                .groupBy('item.productId')
                .getRawMany();
            return result.map((r) => ({
                productId: r.productId,
                totalSales: parseInt(r.totalSales)
            }));
        }
        catch (error) {
            console.error('Error fetching product sales stats:', error);
            return [];
        }
    }
    // 카테고리 목록 조회
    async getCategories(req, res) {
        try {
            const categoryRepository = connection_1.AppDataSource.getRepository(Category_1.Category);
            const categories = await categoryRepository.find({
                order: { name: 'ASC' }
            });
            res.json(categories);
        }
        catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({ error: 'Failed to fetch categories' });
        }
    }
}
exports.VendorProductController = VendorProductController;
//# sourceMappingURL=vendorProductController.js.map