"use strict";
/**
 * 재고 알림 서비스
 * 재고 부족, 재입고, 재고 이상 감지 등 알림 처리
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryAlertService = exports.InventoryAlertService = void 0;
const Product_1 = require("../entities/Product");
const ProductVariation_1 = require("../entities/ProductVariation");
const connection_1 = require("../database/connection");
const email_service_1 = require("./email.service");
const simpleLogger_1 = __importDefault(require("../utils/simpleLogger"));
const events_1 = require("events");
const cron_1 = require("cron");
const main_1 = require("../main");
class InventoryAlertService extends events_1.EventEmitter {
    constructor() {
        super();
        this.productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
        this.variationRepository = connection_1.AppDataSource.getRepository(ProductVariation_1.ProductVariation);
        this.alerts = new Map();
        this.stockMovements = [];
        this.cronJobs = [];
        // 알림 임계값 설정
        this.thresholds = {
            lowStock: 10, // 재고 10개 이하
            criticalStock: 3, // 재고 3개 이하
            oversupply: 500, // 재고 500개 이상
            expiryWarning: 30 // 유통기한 30일 이내
        };
        this.initializeCronJobs();
        this.setupEventListeners();
    }
    /**
     * 크론 작업 초기화
     */
    initializeCronJobs() {
        // 매 30분마다 재고 체크
        const stockCheckJob = new cron_1.CronJob('*/30 * * * *', async () => {
            await this.checkAllInventory();
        });
        // 매일 오전 9시 재고 리포트
        const dailyReportJob = new cron_1.CronJob('0 9 * * *', async () => {
            await this.generateDailyReport();
        });
        // 매주 월요일 재입고 제안
        const restockSuggestionJob = new cron_1.CronJob('0 10 * * 1', async () => {
            await this.generateRestockSuggestions();
        });
        // 매시간 재고 이상 감지
        const anomalyDetectionJob = new cron_1.CronJob('0 * * * *', async () => {
            await this.detectInventoryAnomalies();
        });
        this.cronJobs = [
            stockCheckJob,
            dailyReportJob,
            restockSuggestionJob,
            anomalyDetectionJob
        ];
        this.cronJobs.forEach(job => job.start());
    }
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 주문 완료 시 재고 감소
        this.on('orderCompleted', async (data) => {
            await this.handleOrderCompleted(data);
        });
        // 주문 취소 시 재고 복구
        this.on('orderCancelled', async (data) => {
            await this.handleOrderCancelled(data);
        });
        // 재고 조정
        this.on('stockAdjustment', async (data) => {
            await this.handleStockAdjustment(data);
        });
    }
    /**
     * 전체 재고 체크
     */
    async checkAllInventory() {
        try {
            // 변형이 있는 상품 체크
            const variations = await this.variationRepository.find({
                relations: ['product'],
                where: { isActive: true }
            });
            for (const variation of variations) {
                await this.checkVariationStock(variation);
            }
            // 변형이 없는 상품 체크
            const products = await this.productRepository.find({
                where: {
                    hasVariations: false,
                    status: Product_1.ProductStatus.ACTIVE
                }
            });
            for (const product of products) {
                await this.checkProductStock(product);
            }
            simpleLogger_1.default.info(`Inventory check completed. Active alerts: ${this.alerts.size}`);
        }
        catch (error) {
            simpleLogger_1.default.error('Failed to check inventory:', error);
        }
    }
    /**
     * 상품 변형 재고 체크
     */
    async checkVariationStock(variation) {
        const alertKey = `variation_${variation.id}`;
        const currentStock = variation.stock;
        const lowStockThreshold = typeof variation.lowStockAlert === 'number' ? variation.lowStockAlert : this.thresholds.lowStock;
        // 재고 없음
        if (currentStock === 0) {
            await this.createOrUpdateAlert({
                id: alertKey,
                type: 'out_of_stock',
                severity: 'critical',
                productId: variation.product.id,
                productName: variation.product.name,
                variationId: variation.id,
                sku: variation.sku,
                currentStock: 0,
                threshold: 0,
                recommendedAction: 'Immediate restock required',
                createdAt: new Date(),
                acknowledged: false
            });
        }
        // 재고 부족
        else if (currentStock <= lowStockThreshold) {
            const severity = currentStock <= this.thresholds.criticalStock ? 'high' : 'medium';
            await this.createOrUpdateAlert({
                id: alertKey,
                type: 'low_stock',
                severity,
                productId: variation.product.id,
                productName: variation.product.name,
                variationId: variation.id,
                sku: variation.sku,
                currentStock,
                threshold: lowStockThreshold,
                recommendedAction: `Restock soon. Current: ${currentStock}, Threshold: ${lowStockThreshold}`,
                createdAt: new Date(),
                acknowledged: false
            });
        }
        // 재고 과다
        else if (currentStock >= this.thresholds.oversupply) {
            await this.createOrUpdateAlert({
                id: alertKey,
                type: 'oversupply',
                severity: 'low',
                productId: variation.product.id,
                productName: variation.product.name,
                variationId: variation.id,
                sku: variation.sku,
                currentStock,
                threshold: this.thresholds.oversupply,
                recommendedAction: 'Consider promotional sales or storage optimization',
                createdAt: new Date(),
                acknowledged: false
            });
        }
        // 정상 재고 - 기존 알림 제거
        else {
            this.removeAlert(alertKey);
        }
    }
    /**
     * 단일 상품 재고 체크
     */
    async checkProductStock(product) {
        var _a;
        const alertKey = `product_${product.id}`;
        const currentStock = product.stock || 0;
        const lowStockThreshold = typeof ((_a = product.metadata) === null || _a === void 0 ? void 0 : _a.lowStockAlert) === 'number' ? product.metadata.lowStockAlert : this.thresholds.lowStock;
        if (currentStock === 0) {
            await this.createOrUpdateAlert({
                id: alertKey,
                type: 'out_of_stock',
                severity: 'critical',
                productId: product.id,
                productName: product.name,
                currentStock: 0,
                threshold: 0,
                recommendedAction: 'Immediate restock required',
                createdAt: new Date(),
                acknowledged: false
            });
        }
        else if (currentStock <= lowStockThreshold) {
            const severity = currentStock <= this.thresholds.criticalStock ? 'high' : 'medium';
            await this.createOrUpdateAlert({
                id: alertKey,
                type: 'low_stock',
                severity,
                productId: product.id,
                productName: product.name,
                currentStock,
                threshold: lowStockThreshold,
                recommendedAction: `Restock soon. Current: ${currentStock}, Threshold: ${lowStockThreshold}`,
                createdAt: new Date(),
                acknowledged: false
            });
        }
        else {
            this.removeAlert(alertKey);
        }
    }
    /**
     * 알림 생성 또는 업데이트
     */
    async createOrUpdateAlert(alert) {
        const existingAlert = this.alerts.get(alert.id);
        // 새로운 알림이거나 심각도가 변경된 경우에만 알림 발송
        if (!existingAlert || existingAlert.severity !== alert.severity) {
            this.alerts.set(alert.id, alert);
            // 실시간 알림 전송
            await this.sendRealtimeAlert(alert);
            // 심각도에 따른 추가 알림
            if (alert.severity === 'critical') {
                await this.sendCriticalAlert(alert);
            }
            // 이벤트 발생
            this.emit('alertCreated', alert);
        }
        else {
            // 기존 알림 업데이트
            this.alerts.set(alert.id, {
                ...existingAlert,
                currentStock: alert.currentStock,
                recommendedAction: alert.recommendedAction
            });
        }
    }
    /**
     * 알림 제거
     */
    removeAlert(alertId) {
        if (this.alerts.has(alertId)) {
            const alert = this.alerts.get(alertId);
            this.alerts.delete(alertId);
            // 알림 해제 이벤트
            this.emit('alertResolved', alert);
            // 실시간 알림 업데이트
            main_1.io.to('admin_notifications').emit('inventory_alert_resolved', {
                alertId,
                timestamp: new Date()
            });
        }
    }
    /**
     * 실시간 알림 전송
     */
    async sendRealtimeAlert(alert) {
        // Socket.IO를 통한 실시간 알림
        main_1.io.to('admin_notifications').emit('inventory_alert', {
            alert,
            timestamp: new Date()
        });
        // 대시보드 알림 저장
        simpleLogger_1.default.info(`Inventory alert: ${alert.type} for ${alert.productName} (${alert.sku || 'N/A'})`);
    }
    /**
     * 긴급 알림 전송
     */
    async sendCriticalAlert(alert) {
        var _a;
        // 관리자 이메일 발송
        const adminEmails = ((_a = process.env.ADMIN_EMAILS) === null || _a === void 0 ? void 0 : _a.split(',')) || [];
        for (const email of adminEmails) {
            await email_service_1.emailService.sendEmail({
                to: email.trim(),
                subject: `[긴급] 재고 알림: ${alert.productName}`,
                html: `
          <h2>긴급 재고 알림</h2>
          <p><strong>상품:</strong> ${alert.productName}</p>
          <p><strong>SKU:</strong> ${alert.sku || 'N/A'}</p>
          <p><strong>현재 재고:</strong> ${alert.currentStock}</p>
          <p><strong>알림 유형:</strong> ${alert.type}</p>
          <p><strong>권장 조치:</strong> ${alert.recommendedAction}</p>
          <p>즉시 확인이 필요합니다.</p>
        `
            });
        }
        // SMS 알림 (구현 필요)
        simpleLogger_1.default.warn(`Critical inventory alert for ${alert.productName}: ${alert.currentStock} units remaining`);
    }
    /**
     * 일일 재고 리포트 생성
     */
    async generateDailyReport() {
        var _a;
        try {
            const report = {
                date: new Date(),
                totalAlerts: this.alerts.size,
                criticalAlerts: Array.from(this.alerts.values()).filter(a => a.severity === 'critical'),
                highAlerts: Array.from(this.alerts.values()).filter(a => a.severity === 'high'),
                mediumAlerts: Array.from(this.alerts.values()).filter(a => a.severity === 'medium'),
                lowAlerts: Array.from(this.alerts.values()).filter(a => a.severity === 'low'),
                stockMovements: this.getRecentStockMovements(24), // 24시간 내 재고 변동
                topSellingProducts: await this.getTopSellingProducts(),
                slowMovingProducts: await this.getSlowMovingProducts()
            };
            // 리포트 이메일 발송
            const adminEmails = ((_a = process.env.ADMIN_EMAILS) === null || _a === void 0 ? void 0 : _a.split(',')) || [];
            for (const email of adminEmails) {
                await email_service_1.emailService.sendEmail({
                    to: email.trim(),
                    subject: `일일 재고 리포트 - ${new Date().toLocaleDateString('ko-KR')}`,
                    html: this.generateReportHtml(report)
                });
            }
            simpleLogger_1.default.info('Daily inventory report generated and sent');
        }
        catch (error) {
            simpleLogger_1.default.error('Failed to generate daily report:', error);
        }
    }
    /**
     * 재입고 제안 생성
     */
    async generateRestockSuggestions() {
        const suggestions = [];
        try {
            // 재고 부족 알림이 있는 상품들
            const lowStockAlerts = Array.from(this.alerts.values()).filter(a => a.type === 'low_stock' || a.type === 'out_of_stock');
            for (const alert of lowStockAlerts) {
                const salesData = await this.getProductSalesData(alert.productId, alert.variationId);
                const averageDailySales = salesData.averageDailySales || 1;
                const daysUntilStockout = alert.currentStock / averageDailySales;
                // 안전 재고 = 평균 일일 판매량 * 리드타임 * 안전계수(1.5)
                const leadTime = 7; // 기본 리드타임 7일
                const safetyFactor = 1.5;
                const recommendedQuantity = Math.ceil(averageDailySales * leadTime * safetyFactor * 4); // 4주치
                suggestions.push({
                    productId: alert.productId,
                    productName: alert.productName,
                    variationId: alert.variationId,
                    sku: alert.sku,
                    currentStock: alert.currentStock,
                    averageDailySales,
                    daysUntilStockout,
                    recommendedQuantity,
                    estimatedCost: recommendedQuantity * (salesData.unitCost || 0),
                    supplier: salesData.supplier,
                    leadTime
                });
            }
            // 제안 이메일 발송
            if (suggestions.length > 0) {
                await this.sendRestockSuggestions(suggestions);
            }
            return suggestions;
        }
        catch (error) {
            simpleLogger_1.default.error('Failed to generate restock suggestions:', error);
            return [];
        }
    }
    /**
     * 재고 이상 감지
     */
    async detectInventoryAnomalies() {
        try {
            const recentMovements = this.getRecentStockMovements(1); // 1시간 내 변동
            for (const movement of recentMovements) {
                // 비정상적인 재고 감소 감지
                if (movement.type === 'adjustment' && movement.change < -50) {
                    simpleLogger_1.default.warn(`Unusual stock decrease detected: ${movement.productId} reduced by ${Math.abs(movement.change)} units`);
                    // 알림 생성
                    await this.createOrUpdateAlert({
                        id: `anomaly_${movement.productId}_${Date.now()}`,
                        type: 'restock_needed',
                        severity: 'high',
                        productId: movement.productId,
                        productName: 'Product', // 실제 상품명 조회 필요
                        currentStock: movement.currentStock,
                        threshold: 0,
                        recommendedAction: `Investigate unusual stock decrease of ${Math.abs(movement.change)} units`,
                        createdAt: new Date(),
                        acknowledged: false
                    });
                }
            }
        }
        catch (error) {
            simpleLogger_1.default.error('Failed to detect inventory anomalies:', error);
        }
    }
    /**
     * 주문 완료 처리
     */
    async handleOrderCompleted(data) {
        const { orderId, items } = data;
        for (const item of items) {
            await this.recordStockMovement({
                productId: item.productId,
                variationId: item.variationId,
                previousStock: item.previousStock,
                currentStock: item.currentStock,
                change: -item.quantity,
                type: 'sale',
                reason: `Order ${orderId}`,
                timestamp: new Date()
            });
            // 재고 체크
            if (item.variationId) {
                const variation = await this.variationRepository.findOne({
                    where: { id: item.variationId },
                    relations: ['product']
                });
                if (variation) {
                    await this.checkVariationStock(variation);
                }
            }
        }
    }
    /**
     * 주문 취소 처리
     */
    async handleOrderCancelled(data) {
        const { orderId, items } = data;
        for (const item of items) {
            await this.recordStockMovement({
                productId: item.productId,
                variationId: item.variationId,
                previousStock: item.currentStock,
                currentStock: item.currentStock + item.quantity,
                change: item.quantity,
                type: 'return',
                reason: `Order ${orderId} cancelled`,
                timestamp: new Date()
            });
        }
    }
    /**
     * 재고 조정 처리
     */
    async handleStockAdjustment(data) {
        await this.recordStockMovement({
            ...data,
            type: 'adjustment',
            timestamp: new Date()
        });
    }
    /**
     * 재고 변동 기록
     */
    recordStockMovement(movement) {
        this.stockMovements.push(movement);
        // 최근 1000개만 메모리에 유지
        if (this.stockMovements.length > 1000) {
            this.stockMovements = this.stockMovements.slice(-1000);
        }
    }
    /**
     * 최근 재고 변동 조회
     */
    getRecentStockMovements(hours) {
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - hours);
        return this.stockMovements.filter(m => m.timestamp >= cutoff);
    }
    /**
     * 상품 판매 데이터 조회
     */
    async getProductSalesData(productId, variationId) {
        // 실제 구현 시 Order 테이블에서 판매 데이터 집계
        return {
            averageDailySales: 5,
            unitCost: 10000,
            supplier: 'Default Supplier',
            leadTime: 7
        };
    }
    /**
     * 베스트셀러 상품 조회
     */
    async getTopSellingProducts() {
        // 실제 구현 시 판매 데이터 기반 조회
        return [];
    }
    /**
     * 재고 회전이 느린 상품 조회
     */
    async getSlowMovingProducts() {
        // 실제 구현 시 판매 데이터 기반 조회
        return [];
    }
    /**
     * 리포트 HTML 생성
     */
    generateReportHtml(report) {
        return `
      <h2>일일 재고 리포트</h2>
      <p>날짜: ${report.date.toLocaleDateString('ko-KR')}</p>
      
      <h3>알림 요약</h3>
      <ul>
        <li>전체 알림: ${report.totalAlerts}건</li>
        <li>긴급: ${report.criticalAlerts.length}건</li>
        <li>높음: ${report.highAlerts.length}건</li>
        <li>중간: ${report.mediumAlerts.length}건</li>
        <li>낮음: ${report.lowAlerts.length}건</li>
      </ul>
      
      ${report.criticalAlerts.length > 0 ? `
        <h3>긴급 알림 상세</h3>
        <ul>
          ${report.criticalAlerts.map((a) => `
            <li>${a.productName} (${a.sku || 'N/A'}): ${a.currentStock}개 남음</li>
          `).join('')}
        </ul>
      ` : ''}
      
      <p>자세한 내용은 관리자 대시보드에서 확인하세요.</p>
    `;
    }
    /**
     * 재입고 제안 이메일 발송
     */
    async sendRestockSuggestions(suggestions) {
        var _a;
        const adminEmails = ((_a = process.env.ADMIN_EMAILS) === null || _a === void 0 ? void 0 : _a.split(',')) || [];
        const html = `
      <h2>주간 재입고 제안</h2>
      <table border="1" cellpadding="5" cellspacing="0">
        <thead>
          <tr>
            <th>상품명</th>
            <th>SKU</th>
            <th>현재 재고</th>
            <th>일일 평균 판매</th>
            <th>재고 소진 예상일</th>
            <th>권장 주문량</th>
            <th>예상 비용</th>
          </tr>
        </thead>
        <tbody>
          ${suggestions.map(s => `
            <tr>
              <td>${s.productName}</td>
              <td>${s.sku || 'N/A'}</td>
              <td>${s.currentStock}</td>
              <td>${s.averageDailySales.toFixed(1)}</td>
              <td>${s.daysUntilStockout.toFixed(0)}일</td>
              <td>${s.recommendedQuantity}</td>
              <td>₩${s.estimatedCost.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p>총 예상 비용: ₩${suggestions.reduce((sum, s) => sum + s.estimatedCost, 0).toLocaleString()}</p>
    `;
        for (const email of adminEmails) {
            await email_service_1.emailService.sendEmail({
                to: email.trim(),
                subject: '주간 재입고 제안',
                html
            });
        }
    }
    /**
     * 알림 확인 처리
     */
    async acknowledgeAlert(alertId, userId) {
        const alert = this.alerts.get(alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedBy = userId;
            alert.acknowledgedAt = new Date();
            this.emit('alertAcknowledged', alert);
        }
    }
    /**
     * 현재 활성 알림 조회
     */
    getActiveAlerts() {
        return Array.from(this.alerts.values()).filter(a => !a.acknowledged);
    }
    /**
     * 서비스 시작
     */
    start() {
        simpleLogger_1.default.info('Inventory alert service started');
        this.cronJobs.forEach(job => job.start());
        // 초기 재고 체크
        this.checkAllInventory();
    }
    /**
     * 서비스 중지
     */
    stop() {
        simpleLogger_1.default.info('Inventory alert service stopped');
        this.cronJobs.forEach(job => job.stop());
    }
}
exports.InventoryAlertService = InventoryAlertService;
// 싱글톤 인스턴스
exports.inventoryAlertService = new InventoryAlertService();
//# sourceMappingURL=InventoryAlertService.js.map