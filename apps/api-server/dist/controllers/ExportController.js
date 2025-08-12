"use strict";
/**
 * Export Controller
 * 정산 및 분석용 데이터 추출 기능
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportController = void 0;
const connection_1 = require("../database/connection");
const Order_1 = require("../entities/Order");
const OrderItem_1 = require("../entities/OrderItem");
const Product_1 = require("../entities/Product");
const User_1 = require("../entities/User");
const VendorOrderItem_1 = require("../entities/VendorOrderItem");
const ExcelJS = __importStar(require("exceljs"));
const json2csv_1 = require("json2csv");
const typeorm_1 = require("typeorm");
class ExportController {
    constructor() {
        this.orderRepository = connection_1.AppDataSource.getRepository(Order_1.Order);
        this.orderItemRepository = connection_1.AppDataSource.getRepository(OrderItem_1.OrderItem);
        this.productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        this.vendorOrderItemRepository = connection_1.AppDataSource.getRepository(VendorOrderItem_1.VendorOrderItem);
    }
    /**
     * Export transactions to CSV
     * GET /api/export/transactions?startDate=2024-01-01&endDate=2024-12-31&format=csv
     */
    async exportTransactions(req, res) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        try {
            const { startDate, endDate, format = 'csv' } = req.query;
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'startDate and endDate are required'
                });
            }
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // End of day
            // Fetch orders with items
            const orders = await this.orderRepository.find({
                where: {
                    createdAt: (0, typeorm_1.Between)(start, end)
                },
                relations: ['items', 'items.product', 'customer'],
                order: {
                    createdAt: 'DESC'
                }
            });
            // Transform data for export
            const exportData = [];
            for (const order of orders) {
                for (const item of order.items) {
                    exportData.push({
                        '주문번호': order.id,
                        '주문일시': order.createdAt.toISOString(),
                        '고객명': ((_a = order.user) === null || _a === void 0 ? void 0 : _a.name) || order.customerName || '',
                        '고객이메일': ((_b = order.user) === null || _b === void 0 ? void 0 : _b.email) || order.customerEmail || '',
                        '상품SKU': ((_c = item.product) === null || _c === void 0 ? void 0 : _c.sku) || '',
                        '상품명': ((_d = item.product) === null || _d === void 0 ? void 0 : _d.name) || '',
                        '판매자ID': ((_e = item.product) === null || _e === void 0 ? void 0 : _e.vendorId) || '',
                        '수량': item.quantity,
                        '단가': item.price,
                        '소계': item.price * item.quantity,
                        '원가': ((_f = item.product) === null || _f === void 0 ? void 0 : _f.cost) || 0,
                        '수수료율': '8%', // 플랫폼 3% + 제휴 5%
                        '예상수수료': (item.price * item.quantity * 0.08),
                        '주문상태': order.status,
                        '결제방법': order.paymentMethod,
                        '배송주소': `${(_g = order.shippingAddress) === null || _g === void 0 ? void 0 : _g.address} ${((_h = order.shippingAddress) === null || _h === void 0 ? void 0 : _h.addressDetail) || ''}`,
                        '배송우편번호': (_j = order.shippingAddress) === null || _j === void 0 ? void 0 : _j.zipCode
                    });
                }
            }
            if (format === 'excel') {
                return this.exportToExcel(exportData, res, 'transactions');
            }
            else {
                return this.exportToCSV(exportData, res, 'transactions');
            }
        }
        catch (error) {
            console.error('Export error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to export transactions'
            });
        }
    }
    /**
     * Export sales summary
     * GET /api/export/sales-summary?startDate=2024-01-01&endDate=2024-12-31
     */
    async exportSalesSummary(req, res) {
        try {
            const { startDate, endDate, groupBy = 'day' } = req.query;
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'startDate and endDate are required'
                });
            }
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            // Get aggregated sales data
            const salesData = await this.orderRepository
                .createQueryBuilder('order')
                .select('DATE(order.createdAt)', 'date')
                .addSelect('COUNT(DISTINCT order.id)', 'orderCount')
                .addSelect('COUNT(DISTINCT order.customerId)', 'customerCount')
                .addSelect('SUM(order.totalAmount)', 'totalSales')
                .addSelect('AVG(order.totalAmount)', 'avgOrderValue')
                .where('order.createdAt BETWEEN :start AND :end', { start, end })
                .andWhere('order.status != :status', { status: 'cancelled' })
                .groupBy('DATE(order.createdAt)')
                .orderBy('date', 'ASC')
                .getRawMany();
            const exportData = salesData.map(row => ({
                '날짜': row.date,
                '주문수': row.orderCount,
                '고객수': row.customerCount,
                '총매출': row.totalSales,
                '평균주문금액': row.avgOrderValue,
                '예상수수료': row.totalSales * 0.08
            }));
            return this.exportToCSV(exportData, res, 'sales-summary');
        }
        catch (error) {
            console.error('Export error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to export sales summary'
            });
        }
    }
    /**
     * Export vendor settlements
     * GET /api/export/vendor-settlements?month=2024-01
     */
    async exportVendorSettlements(req, res) {
        try {
            const { month, vendorId } = req.query;
            if (!month) {
                return res.status(400).json({
                    success: false,
                    message: 'month is required (format: YYYY-MM)'
                });
            }
            const [year, monthNum] = month.split('-').map(Number);
            const startDate = new Date(year, monthNum - 1, 1);
            const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
            // Build query
            let query = this.vendorOrderItemRepository
                .createQueryBuilder('voi')
                .leftJoinAndSelect('voi.vendor', 'vendor')
                .leftJoinAndSelect('voi.product', 'product')
                .leftJoinAndSelect('voi.order', 'order')
                .where('order.createdAt BETWEEN :start AND :end', {
                start: startDate,
                end: endDate
            })
                .andWhere('order.status = :status', { status: 'delivered' });
            if (vendorId) {
                query = query.andWhere('voi.vendorId = :vendorId', { vendorId });
            }
            const vendorItems = await query.getMany();
            // Group by vendor
            const vendorSettlements = new Map();
            for (const item of vendorItems) {
                const vendorKey = item.vendorId;
                if (!vendorSettlements.has(vendorKey)) {
                    vendorSettlements.set(vendorKey, {
                        vendorId: item.vendorId,
                        vendorName: '',
                        vendorEmail: '',
                        businessNumber: '',
                        totalSales: 0,
                        totalCost: 0,
                        totalProfit: 0,
                        platformCommission: 0,
                        affiliateCommission: 0,
                        netAmount: 0,
                        itemCount: 0,
                        orderCount: new Set()
                    });
                }
                const settlement = vendorSettlements.get(vendorKey);
                const itemTotal = item.price * item.quantity;
                settlement.totalSales += itemTotal;
                settlement.totalCost += item.cost * item.quantity;
                settlement.totalProfit += item.vendorProfit;
                settlement.platformCommission += item.platformCommission;
                settlement.affiliateCommission += item.affiliateCommission;
                settlement.netAmount += item.vendorProfit - item.platformCommission - item.affiliateCommission;
                settlement.itemCount++;
                settlement.orderCount.add(item.orderId);
            }
            // Convert to export format
            const exportData = Array.from(vendorSettlements.values()).map(s => ({
                '벤더ID': s.vendorId,
                '벤더명': s.vendorName,
                '이메일': s.vendorEmail,
                '사업자번호': s.businessNumber,
                '총매출': s.totalSales,
                '총원가': s.totalCost,
                '총이익': s.totalProfit,
                '플랫폼수수료': s.platformCommission,
                '제휴수수료': s.affiliateCommission,
                '정산금액': s.netAmount,
                '판매상품수': s.itemCount,
                '주문건수': s.orderCount.size,
                '정산월': month
            }));
            return this.exportToExcel(exportData, res, 'vendor-settlements');
        }
        catch (error) {
            console.error('Export error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to export vendor settlements'
            });
        }
    }
    /**
     * Export product inventory
     * GET /api/export/inventory
     */
    async exportInventory(req, res) {
        try {
            const { vendorId, lowStockOnly } = req.query;
            let query = this.productRepository
                .createQueryBuilder('product')
                .leftJoinAndSelect('product.vendor', 'vendor')
                .leftJoinAndSelect('product.category', 'category');
            if (vendorId) {
                query = query.where('product.vendorId = :vendorId', { vendorId });
            }
            if (lowStockOnly === 'true') {
                query = query.andWhere('product.stock <= product.lowStockThreshold');
            }
            const products = await query.getMany();
            const exportData = products.map(p => ({
                'SKU': p.sku,
                '상품명': p.name,
                '카테고리': '',
                '벤더': p.vendor || '',
                '현재재고': p.stock,
                '재고임계값': p.lowStockThreshold || 10,
                '재고상태': p.stock <= (p.lowStockThreshold || 10) ? '부족' : '정상',
                '판매가': p.price,
                '원가': p.cost,
                '마진': p.price - p.cost,
                '마진율': ((p.price - p.cost) / p.price * 100).toFixed(2) + '%',
                '활성상태': p.isActive ? '활성' : '비활성',
                '등록일': p.createdAt.toISOString().split('T')[0]
            }));
            return this.exportToCSV(exportData, res, 'inventory');
        }
        catch (error) {
            console.error('Export error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to export inventory'
            });
        }
    }
    /**
     * Export affiliate commissions
     * GET /api/export/affiliate-commissions?month=2024-01
     */
    async exportAffiliateCommissions(req, res) {
        try {
            const { month, affiliateId } = req.query;
            if (!month) {
                return res.status(400).json({
                    success: false,
                    message: 'month is required (format: YYYY-MM)'
                });
            }
            const [year, monthNum] = month.split('-').map(Number);
            const startDate = new Date(year, monthNum - 1, 1);
            const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
            // Get orders with affiliate tracking
            const orders = await this.orderRepository.find({
                where: {
                    createdAt: (0, typeorm_1.Between)(startDate, endDate),
                    affiliateId: affiliateId ? affiliateId : undefined
                },
                relations: ['items', 'affiliate']
            });
            const exportData = [];
            for (const order of orders) {
                if (!order.affiliateId)
                    continue;
                const totalAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                exportData.push({
                    '제휴사ID': order.affiliateId,
                    '제휴사명': '',
                    '주문번호': order.id,
                    '주문일': order.createdAt.toISOString().split('T')[0],
                    '주문금액': totalAmount,
                    '수수료율': '5%',
                    '수수료': totalAmount * 0.05,
                    '상태': order.status === 'delivered' ? '정산가능' : '대기',
                    '정산월': month
                });
            }
            return this.exportToCSV(exportData, res, 'affiliate-commissions');
        }
        catch (error) {
            console.error('Export error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to export affiliate commissions'
            });
        }
    }
    /**
     * Helper: Export to CSV
     */
    exportToCSV(data, res, filename) {
        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No data to export'
            });
        }
        try {
            const fields = Object.keys(data[0]);
            const json2csvParser = new json2csv_1.Parser({ fields, withBOM: true });
            const csv = json2csvParser.parse(data);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`);
            return res.send(csv);
        }
        catch (error) {
            console.error('CSV export error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate CSV'
            });
        }
    }
    /**
     * Helper: Export to Excel
     */
    async exportToExcel(data, res, filename) {
        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No data to export'
            });
        }
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Data');
            // Add headers
            const headers = Object.keys(data[0]);
            worksheet.addRow(headers);
            // Style headers
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
            // Add data
            data.forEach(row => {
                worksheet.addRow(Object.values(row));
            });
            // Auto-fit columns
            worksheet.columns.forEach(column => {
                var _a;
                let maxLength = 0;
                (_a = column.eachCell) === null || _a === void 0 ? void 0 : _a.call(column, { includeEmpty: true }, (cell) => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) {
                        maxLength = columnLength;
                    }
                });
                column.width = maxLength < 10 ? 10 : maxLength + 2;
            });
            // Set response headers
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.xlsx"`);
            // Write to response
            await workbook.xlsx.write(res);
            return res.end();
        }
        catch (error) {
            console.error('Excel export error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate Excel file'
            });
        }
    }
}
exports.ExportController = ExportController;
//# sourceMappingURL=ExportController.js.map