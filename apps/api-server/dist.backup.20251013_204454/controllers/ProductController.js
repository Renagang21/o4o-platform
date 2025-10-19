"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const ProductService_1 = __importDefault(require("../services/ProductService"));
const logger_1 = __importDefault(require("../utils/logger"));
class ProductController {
    constructor() {
        // POST /api/products - 제품 생성 (공급자용)
        this.createProduct = async (req, res) => {
            var _a, _b;
            try {
                const productData = req.body;
                // 요청자가 공급자인지 확인
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('supplier'))) {
                    res.status(403).json({ error: 'Only suppliers can create products' });
                    return;
                }
                // 공급자 ID 설정
                productData.supplierId = (_b = req.user.supplier) === null || _b === void 0 ? void 0 : _b.id;
                if (!productData.supplierId) {
                    res.status(400).json({ error: 'Supplier ID not found' });
                    return;
                }
                const product = await this.productService.createProduct(productData);
                res.status(201).json({
                    success: true,
                    data: product
                });
            }
            catch (error) {
                logger_1.default.error('Error in createProduct:', error);
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to create product'
                });
            }
        };
        // GET /api/products/:id - 제품 조회
        this.getProduct = async (req, res) => {
            try {
                const { id } = req.params;
                const product = await this.productService.getProduct(id);
                if (!product) {
                    res.status(404).json({ error: 'Product not found' });
                    return;
                }
                res.json({
                    success: true,
                    data: product
                });
            }
            catch (error) {
                logger_1.default.error('Error in getProduct:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch product'
                });
            }
        };
        // GET /api/products - 제품 목록 조회
        this.getProducts = async (req, res) => {
            try {
                const filters = {
                    supplierId: req.query.supplierId,
                    categoryId: req.query.categoryId,
                    status: req.query.status,
                    isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
                    inStock: req.query.inStock ? req.query.inStock === 'true' : undefined,
                    priceMin: req.query.priceMin ? Number(req.query.priceMin) : undefined,
                    priceMax: req.query.priceMax ? Number(req.query.priceMax) : undefined,
                    search: req.query.search,
                    tags: req.query.tags ? req.query.tags.split(',') : undefined,
                    sortBy: req.query.sortBy,
                    sortOrder: req.query.sortOrder,
                    page: req.query.page ? Number(req.query.page) : undefined,
                    limit: req.query.limit ? Number(req.query.limit) : undefined
                };
                const result = await this.productService.getProducts(filters);
                res.json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                logger_1.default.error('Error in getProducts:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch products'
                });
            }
        };
        // PUT /api/products/:id - 제품 수정
        this.updateProduct = async (req, res) => {
            var _a, _b;
            try {
                const { id } = req.params;
                const updateData = req.body;
                // 요청자가 해당 제품의 공급자인지 확인
                const existingProduct = await this.productService.getProduct(id);
                if (!existingProduct) {
                    res.status(404).json({ error: 'Product not found' });
                    return;
                }
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('supplier')) || existingProduct.supplierId !== ((_b = req.user.supplier) === null || _b === void 0 ? void 0 : _b.id)) {
                    res.status(403).json({ error: 'Not authorized to update this product' });
                    return;
                }
                const product = await this.productService.updateProduct(id, updateData);
                res.json({
                    success: true,
                    data: product
                });
            }
            catch (error) {
                logger_1.default.error('Error in updateProduct:', error);
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to update product'
                });
            }
        };
        // DELETE /api/products/:id - 제품 삭제 (소프트 삭제)
        this.deleteProduct = async (req, res) => {
            var _a, _b;
            try {
                const { id } = req.params;
                // 요청자가 해당 제품의 공급자인지 확인
                const existingProduct = await this.productService.getProduct(id);
                if (!existingProduct) {
                    res.status(404).json({ error: 'Product not found' });
                    return;
                }
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('supplier')) || existingProduct.supplierId !== ((_b = req.user.supplier) === null || _b === void 0 ? void 0 : _b.id)) {
                    res.status(403).json({ error: 'Not authorized to delete this product' });
                    return;
                }
                await this.productService.deleteProduct(id);
                res.json({
                    success: true,
                    message: 'Product deleted successfully'
                });
            }
            catch (error) {
                logger_1.default.error('Error in deleteProduct:', error);
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to delete product'
                });
            }
        };
        // PATCH /api/products/:id/status - 제품 활성화/비활성화
        this.toggleProductStatus = async (req, res) => {
            var _a, _b;
            try {
                const { id } = req.params;
                const { isActive } = req.body;
                if (typeof isActive !== 'boolean') {
                    res.status(400).json({ error: 'isActive must be a boolean' });
                    return;
                }
                // 요청자가 해당 제품의 공급자인지 확인
                const existingProduct = await this.productService.getProduct(id);
                if (!existingProduct) {
                    res.status(404).json({ error: 'Product not found' });
                    return;
                }
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('supplier')) || existingProduct.supplierId !== ((_b = req.user.supplier) === null || _b === void 0 ? void 0 : _b.id)) {
                    res.status(403).json({ error: 'Not authorized to modify this product' });
                    return;
                }
                const product = await this.productService.toggleProductStatus(id, isActive);
                res.json({
                    success: true,
                    data: product
                });
            }
            catch (error) {
                logger_1.default.error('Error in toggleProductStatus:', error);
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to toggle product status'
                });
            }
        };
        // PATCH /api/products/:id/inventory - 재고 업데이트
        this.updateInventory = async (req, res) => {
            var _a, _b;
            try {
                const { id } = req.params;
                const { quantity, operation = 'set' } = req.body;
                if (typeof quantity !== 'number' || quantity < 0) {
                    res.status(400).json({ error: 'Invalid quantity' });
                    return;
                }
                if (!['add', 'subtract', 'set'].includes(operation)) {
                    res.status(400).json({ error: 'Invalid operation. Must be add, subtract, or set' });
                    return;
                }
                // 요청자가 해당 제품의 공급자인지 확인
                const existingProduct = await this.productService.getProduct(id);
                if (!existingProduct) {
                    res.status(404).json({ error: 'Product not found' });
                    return;
                }
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('supplier')) || existingProduct.supplierId !== ((_b = req.user.supplier) === null || _b === void 0 ? void 0 : _b.id)) {
                    res.status(403).json({ error: 'Not authorized to modify this product' });
                    return;
                }
                const product = await this.productService.updateInventory(id, quantity, operation);
                res.json({
                    success: true,
                    data: product
                });
            }
            catch (error) {
                logger_1.default.error('Error in updateInventory:', error);
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to update inventory'
                });
            }
        };
        // GET /api/products/available-for-sellers - 판매자가 선택 가능한 제품 목록
        this.getAvailableProductsForSellers = async (req, res) => {
            try {
                const filters = {
                    supplierId: req.query.supplierId,
                    categoryId: req.query.categoryId,
                    search: req.query.search,
                    tags: req.query.tags ? req.query.tags.split(',') : undefined,
                    sortBy: req.query.sortBy,
                    sortOrder: req.query.sortOrder,
                    page: req.query.page ? Number(req.query.page) : undefined,
                    limit: req.query.limit ? Number(req.query.limit) : undefined
                };
                const result = await this.productService.getAvailableProductsForSellers(filters);
                res.json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                logger_1.default.error('Error in getAvailableProductsForSellers:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch available products'
                });
            }
        };
        // GET /api/products/supplier/:supplierId/stats - 공급자별 제품 통계
        this.getSupplierProductStats = async (req, res) => {
            var _a, _b, _c;
            try {
                const { supplierId } = req.params;
                // 요청자가 해당 공급자이거나 관리자인지 확인
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('admin')) &&
                    (!((_b = req.user) === null || _b === void 0 ? void 0 : _b.hasRole('supplier')) || ((_c = req.user.supplier) === null || _c === void 0 ? void 0 : _c.id) !== supplierId)) {
                    res.status(403).json({ error: 'Not authorized to view these stats' });
                    return;
                }
                const stats = await this.productService.getSupplierProductStats(supplierId);
                res.json({
                    success: true,
                    data: stats
                });
            }
            catch (error) {
                logger_1.default.error('Error in getSupplierProductStats:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch supplier product stats'
                });
            }
        };
        this.productService = new ProductService_1.default();
    }
}
exports.ProductController = ProductController;
exports.default = ProductController;
//# sourceMappingURL=ProductController.js.map