"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SellerProductController = void 0;
const SellerProductService_1 = __importDefault(require("../services/SellerProductService"));
const logger_1 = __importDefault(require("../utils/logger"));
class SellerProductController {
    constructor() {
        // POST /api/seller-products - 판매자가 제품을 자신의 상점에 추가
        this.addProductToSeller = async (req, res) => {
            var _a, _b;
            try {
                const productData = req.body;
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('seller'))) {
                    res.status(403).json({ error: 'Only sellers can add products to their store' });
                    return;
                }
                // 판매자 ID 설정
                productData.sellerId = (_b = req.user.seller) === null || _b === void 0 ? void 0 : _b.id;
                if (!productData.sellerId) {
                    res.status(400).json({ error: 'Seller ID not found' });
                    return;
                }
                const sellerProduct = await this.sellerProductService.addProductToSeller(productData);
                res.status(201).json({
                    success: true,
                    data: sellerProduct
                });
            }
            catch (error) {
                logger_1.default.error('Error in addProductToSeller:', error);
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to add product to seller store'
                });
            }
        };
        // POST /api/seller-products/bulk - 대량 제품 추가
        this.bulkAddProducts = async (req, res) => {
            var _a, _b;
            try {
                const bulkData = req.body;
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('seller'))) {
                    res.status(403).json({ error: 'Only sellers can add products to their store' });
                    return;
                }
                const sellerId = (_b = req.user.seller) === null || _b === void 0 ? void 0 : _b.id;
                if (!sellerId) {
                    res.status(400).json({ error: 'Seller ID not found' });
                    return;
                }
                const sellerProducts = await this.sellerProductService.bulkAddProducts({
                    ...bulkData,
                    sellerId
                });
                res.status(201).json({
                    success: true,
                    data: sellerProducts,
                    message: `${sellerProducts.length} products added successfully`
                });
            }
            catch (error) {
                logger_1.default.error('Error in bulkAddProducts:', error);
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to bulk add products'
                });
            }
        };
        // PUT /api/seller-products/:id - 판매자 제품 정보 수정
        this.updateSellerProduct = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const updateData = req.body;
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('seller'))) {
                    res.status(403).json({ error: 'Seller access required' });
                    return;
                }
                // TODO: 해당 seller product가 요청자의 것인지 확인하는 로직 추가
                // const sellerProduct = await this.sellerProductService.getSellerProduct(id);
                // if (sellerProduct.sellerId !== req.user.seller?.id) {
                //   res.status(403).json({ error: 'Not authorized to update this product' });
                //   return;
                // }
                const sellerProduct = await this.sellerProductService.updateSellerProduct(id, updateData);
                res.json({
                    success: true,
                    data: sellerProduct
                });
            }
            catch (error) {
                logger_1.default.error('Error in updateSellerProduct:', error);
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to update seller product'
                });
            }
        };
        // DELETE /api/seller-products/:id - 판매자 제품 제거
        this.removeProductFromSeller = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('seller'))) {
                    res.status(403).json({ error: 'Seller access required' });
                    return;
                }
                // TODO: 권한 검증 로직 추가
                await this.sellerProductService.removeProductFromSeller(id);
                res.json({
                    success: true,
                    message: 'Product removed from seller store successfully'
                });
            }
            catch (error) {
                logger_1.default.error('Error in removeProductFromSeller:', error);
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to remove product from seller store'
                });
            }
        };
        // GET /api/seller-products - 판매자 제품 목록 조회
        this.getSellerProducts = async (req, res) => {
            var _a, _b, _c;
            try {
                const filters = {
                    sellerId: req.query.sellerId,
                    productId: req.query.productId,
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
                // 판매자가 자신의 제품만 조회하는 경우
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('seller')) && !((_b = req.user) === null || _b === void 0 ? void 0 : _b.hasRole('admin'))) {
                    filters.sellerId = (_c = req.user.seller) === null || _c === void 0 ? void 0 : _c.id;
                }
                const result = await this.sellerProductService.getSellerProducts(filters);
                res.json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                logger_1.default.error('Error in getSellerProducts:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch seller products'
                });
            }
        };
        // GET /api/seller-products/available - 판매자가 추가 가능한 제품 목록
        this.getAvailableProducts = async (req, res) => {
            var _a, _b;
            try {
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('seller'))) {
                    res.status(403).json({ error: 'Seller access required' });
                    return;
                }
                const sellerId = (_b = req.user.seller) === null || _b === void 0 ? void 0 : _b.id;
                if (!sellerId) {
                    res.status(400).json({ error: 'Seller ID not found' });
                    return;
                }
                const filters = {
                    supplierId: req.query.supplierId,
                    categoryId: req.query.categoryId,
                    search: req.query.search,
                    page: req.query.page ? Number(req.query.page) : undefined,
                    limit: req.query.limit ? Number(req.query.limit) : undefined
                };
                const result = await this.sellerProductService.getAvailableProducts(sellerId, filters);
                res.json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                logger_1.default.error('Error in getAvailableProducts:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch available products'
                });
            }
        };
        // GET /api/seller-products/:id/profitability - 수익성 분석
        this.analyzeProfitability = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('seller'))) {
                    res.status(403).json({ error: 'Seller access required' });
                    return;
                }
                // TODO: 권한 검증 로직 추가
                const analysis = await this.sellerProductService.analyzeProfitability(id);
                res.json({
                    success: true,
                    data: analysis
                });
            }
            catch (error) {
                logger_1.default.error('Error in analyzeProfitability:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to analyze profitability'
                });
            }
        };
        // POST /api/seller-products/sync-inventory - 재고 동기화
        this.syncInventory = async (req, res) => {
            var _a, _b;
            try {
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('seller'))) {
                    res.status(403).json({ error: 'Seller access required' });
                    return;
                }
                const sellerId = (_b = req.user.seller) === null || _b === void 0 ? void 0 : _b.id;
                if (!sellerId) {
                    res.status(400).json({ error: 'Seller ID not found' });
                    return;
                }
                const result = await this.sellerProductService.syncInventory(sellerId);
                res.json({
                    success: true,
                    data: result,
                    message: `Inventory sync completed: ${result.updated} products updated, ${result.outOfStock} out of stock`
                });
            }
            catch (error) {
                logger_1.default.error('Error in syncInventory:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to sync inventory'
                });
            }
        };
        // GET /api/seller-products/stats - 판매자 제품 통계
        this.getSellerProductStats = async (req, res) => {
            var _a, _b, _c;
            try {
                let sellerId = req.query.sellerId;
                // 관리자가 아닌 경우 자신의 통계만 조회
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('admin'))) {
                    if (!((_b = req.user) === null || _b === void 0 ? void 0 : _b.hasRole('seller'))) {
                        res.status(403).json({ error: 'Seller access required' });
                        return;
                    }
                    sellerId = (_c = req.user.seller) === null || _c === void 0 ? void 0 : _c.id;
                }
                if (!sellerId) {
                    res.status(400).json({ error: 'Seller ID not found' });
                    return;
                }
                const stats = await this.sellerProductService.getSellerProductStats(sellerId);
                res.json({
                    success: true,
                    data: stats
                });
            }
            catch (error) {
                logger_1.default.error('Error in getSellerProductStats:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch seller product stats'
                });
            }
        };
        // GET /api/seller-products/performance - 판매자 제품 성과 분석
        this.getSellerProductPerformance = async (req, res) => {
            var _a, _b, _c;
            try {
                let sellerId = req.query.sellerId;
                const limit = req.query.limit ? Number(req.query.limit) : 10;
                // 관리자가 아닌 경우 자신의 성과만 조회
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('admin'))) {
                    if (!((_b = req.user) === null || _b === void 0 ? void 0 : _b.hasRole('seller'))) {
                        res.status(403).json({ error: 'Seller access required' });
                        return;
                    }
                    sellerId = (_c = req.user.seller) === null || _c === void 0 ? void 0 : _c.id;
                }
                if (!sellerId) {
                    res.status(400).json({ error: 'Seller ID not found' });
                    return;
                }
                const performance = await this.sellerProductService.getSellerProductPerformance(sellerId, limit);
                res.json({
                    success: true,
                    data: performance
                });
            }
            catch (error) {
                logger_1.default.error('Error in getSellerProductPerformance:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch seller product performance'
                });
            }
        };
        // GET /api/seller-products/me - 현재 로그인한 판매자의 제품 목록
        this.getMyProducts = async (req, res) => {
            var _a, _b;
            try {
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('seller'))) {
                    res.status(403).json({ error: 'Seller access required' });
                    return;
                }
                const sellerId = (_b = req.user.seller) === null || _b === void 0 ? void 0 : _b.id;
                if (!sellerId) {
                    res.status(400).json({ error: 'Seller ID not found' });
                    return;
                }
                const filters = {
                    sellerId,
                    status: req.query.status,
                    isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
                    inStock: req.query.inStock ? req.query.inStock === 'true' : undefined,
                    search: req.query.search,
                    tags: req.query.tags ? req.query.tags.split(',') : undefined,
                    sortBy: req.query.sortBy,
                    sortOrder: req.query.sortOrder,
                    page: req.query.page ? Number(req.query.page) : undefined,
                    limit: req.query.limit ? Number(req.query.limit) : undefined
                };
                const result = await this.sellerProductService.getSellerProducts(filters);
                res.json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                logger_1.default.error('Error in getMyProducts:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch seller products'
                });
            }
        };
        // GET /api/seller-products/me/dashboard - 판매자 제품 대시보드
        this.getSellerProductDashboard = async (req, res) => {
            var _a, _b;
            try {
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.hasRole('seller'))) {
                    res.status(403).json({ error: 'Seller access required' });
                    return;
                }
                const sellerId = (_b = req.user.seller) === null || _b === void 0 ? void 0 : _b.id;
                if (!sellerId) {
                    res.status(400).json({ error: 'Seller ID not found' });
                    return;
                }
                const [stats, performance] = await Promise.all([
                    this.sellerProductService.getSellerProductStats(sellerId),
                    this.sellerProductService.getSellerProductPerformance(sellerId, 5)
                ]);
                res.json({
                    success: true,
                    data: {
                        stats,
                        performance
                    }
                });
            }
            catch (error) {
                logger_1.default.error('Error in getSellerProductDashboard:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch seller product dashboard'
                });
            }
        };
        this.sellerProductService = new SellerProductService_1.default();
    }
}
exports.SellerProductController = SellerProductController;
exports.default = SellerProductController;
//# sourceMappingURL=SellerProductController.js.map