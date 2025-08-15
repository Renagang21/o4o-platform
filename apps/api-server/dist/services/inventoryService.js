"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryService = exports.InventoryService = void 0;
const connection_1 = require("../database/connection");
const Product_1 = require("../entities/Product");
const Order_1 = require("../entities/Order");
const OrderItem_1 = require("../entities/OrderItem");
const CacheService_1 = require("./CacheService");
class InventoryService {
    constructor() {
        this.productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
        this.orderRepository = connection_1.AppDataSource.getRepository(Order_1.Order);
        this.orderItemRepository = connection_1.AppDataSource.getRepository(OrderItem_1.OrderItem);
    }
    /**
     * 재고 상태를 확인합니다.
     */
    async checkInventory(productId) {
        const product = await this.productRepository.findOne({ where: { id: productId } });
        if (!product) {
            throw new Error('Product not found');
        }
        const reserved = 0; // TODO: Implement reservation tracking
        const available = Math.max(0, (product.stockQuantity || 0) - reserved);
        return {
            productId,
            available,
            reserved,
            total: product.stockQuantity || 0,
            inStock: available > 0 && product.isInStock()
        };
    }
    /**
     * 여러 상품의 재고를 일괄 확인합니다.
     */
    async checkMultipleInventory(items) {
        const results = [];
        for (const item of items) {
            const inventory = await this.checkInventory(item.productId);
            results.push({
                ...inventory,
                requestedQuantity: item.quantity,
                canFulfill: inventory.available >= item.quantity
            });
        }
        return results;
    }
    /**
     * 재고를 예약합니다.
     */
    async reserveInventory(items, orderId, userId, reservationMinutes = 10) {
        const reservationId = this.generateReservationId();
        const errors = [];
        // 재고 확인
        const inventoryChecks = await this.checkMultipleInventory(items);
        for (const check of inventoryChecks) {
            if (!check.canFulfill) {
                errors.push(`Insufficient inventory for product ${check.productId}. ` +
                    `Requested: ${check.requestedQuantity}, Available: ${check.available}`);
            }
        }
        if (errors.length > 0) {
            return { success: false, errors };
        }
        // 예약 처리
        const ttlSeconds = reservationMinutes * 60;
        try {
            for (const item of items) {
                // TODO: Implement actual reservation logic
                const success = true;
                if (!success) {
                    // 롤백
                    await this.releaseReservation(reservationId);
                    return {
                        success: false,
                        errors: ['Failed to reserve inventory. Please try again.']
                    };
                }
            }
            return { success: true, reservationId };
        }
        catch (error) {
            console.error('Error reserving inventory:', error);
            await this.releaseReservation(reservationId);
            return {
                success: false,
                errors: ['Inventory reservation failed. Please try again.']
            };
        }
    }
    /**
     * 예약을 해제합니다.
     */
    async releaseReservation(reservationId) {
        // Redis에서 예약 ID로 시작하는 모든 예약을 찾아서 해제
        try {
            // 이 방법은 Redis SCAN을 사용하여 구현할 수 있지만,
            // 현재는 간단히 개별 상품별로 해제하는 방식을 사용
            // 실제 구현에서는 예약 정보를 별도로 저장하여 관리하는 것이 좋습니다.
        }
        catch (error) {
            console.error('Error releasing reservation:', error);
        }
    }
    /**
     * 예약을 확정하여 실제 재고를 차감합니다.
     */
    async confirmReservation(reservationId, items) {
        const queryRunner = connection_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const errors = [];
            for (const item of items) {
                const product = await queryRunner.manager.findOne(Product_1.Product, {
                    where: { id: item.productId }
                });
                if (!product) {
                    errors.push(`Product ${item.productId} not found`);
                    continue;
                }
                if (product.manageStock) {
                    const newStock = (product.stockQuantity || 0) - item.quantity;
                    if (newStock < 0) {
                        errors.push(`Insufficient stock for product ${product.name}. ` +
                            `Current: ${product.stockQuantity}, Required: ${item.quantity}`);
                        continue;
                    }
                    await queryRunner.manager.update(Product_1.Product, item.productId, {
                        stockQuantity: newStock
                    });
                }
                // 예약 해제
                // TODO: Implement release inventory reservation
                // await cacheService.releaseInventoryReservation(item.productId, reservationId);
            }
            if (errors.length > 0) {
                await queryRunner.rollbackTransaction();
                return { success: false, errors };
            }
            await queryRunner.commitTransaction();
            return { success: true };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            console.error('Error confirming reservation:', error);
            return {
                success: false,
                errors: ['Failed to confirm inventory reservation']
            };
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * 재고를 복구합니다 (주문 취소, 환불 등).
     */
    async restoreInventory(items) {
        const queryRunner = connection_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const errors = [];
            for (const item of items) {
                const product = await queryRunner.manager.findOne(Product_1.Product, {
                    where: { id: item.productId }
                });
                if (!product) {
                    errors.push(`Product ${item.productId} not found`);
                    continue;
                }
                if (product.manageStock) {
                    const newStock = (product.stockQuantity || 0) + item.quantity;
                    await queryRunner.manager.update(Product_1.Product, item.productId, {
                        stockQuantity: newStock
                    });
                    // 가격 캐시 무효화 (재고 상태 변경으로 인한)
                    await CacheService_1.cacheService.clear(`pricing:*`);
                }
            }
            if (errors.length > 0) {
                await queryRunner.rollbackTransaction();
                return { success: false, errors };
            }
            await queryRunner.commitTransaction();
            return { success: true };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            console.error('Error restoring inventory:', error);
            return {
                success: false,
                errors: ['Failed to restore inventory']
            };
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * 저재고 알림이 필요한 상품들을 조회합니다.
     */
    async getLowStockProducts(threshold = 10) {
        return await this.productRepository
            .createQueryBuilder('product')
            .where('product.manageStock = :manageStock', { manageStock: true })
            .andWhere('product.stockQuantity <= :threshold', { threshold })
            .andWhere('product.stockQuantity > 0')
            .orderBy('product.stockQuantity', 'ASC')
            .getMany();
    }
    /**
     * 품절 상품들을 조회합니다.
     */
    async getOutOfStockProducts() {
        return await this.productRepository
            .createQueryBuilder('product')
            .where('product.manageStock = :manageStock', { manageStock: true })
            .andWhere('(product.stockQuantity IS NULL OR product.stockQuantity <= 0)')
            .orderBy('product.name', 'ASC')
            .getMany();
    }
    /**
     * 재고 이동 내역을 기록합니다.
     */
    async recordInventoryMovement(productId, quantityChange, type, referenceId, notes) {
        // 실제 구현에서는 별도의 InventoryMovement 엔티티를 생성하여 이력을 관리합니다.
        //   productId,
        //   quantityChange,
        //   type,
        //   referenceId,
        //   notes,
        //   timestamp: new Date()
        // });
    }
    /**
     * 자동 재고 조정을 수행합니다.
     */
    async performInventoryAdjustment(adjustments) {
        const queryRunner = connection_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const errors = [];
            for (const adjustment of adjustments) {
                const product = await queryRunner.manager.findOne(Product_1.Product, {
                    where: { id: adjustment.productId }
                });
                if (!product) {
                    errors.push(`Product ${adjustment.productId} not found`);
                    continue;
                }
                const oldQuantity = product.stockQuantity || 0;
                const quantityChange = adjustment.newQuantity - oldQuantity;
                await queryRunner.manager.update(Product_1.Product, adjustment.productId, {
                    stockQuantity: adjustment.newQuantity
                });
                // 이동 내역 기록
                await this.recordInventoryMovement(adjustment.productId, quantityChange, 'adjustment', undefined, adjustment.reason);
                // 가격 캐시 무효화
                await CacheService_1.cacheService.clear(`pricing:*`);
            }
            if (errors.length > 0) {
                await queryRunner.rollbackTransaction();
                return { success: false, errors };
            }
            await queryRunner.commitTransaction();
            return { success: true };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            console.error('Error performing inventory adjustment:', error);
            return {
                success: false,
                errors: ['Failed to perform inventory adjustment']
            };
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * 예약 ID를 생성합니다.
     */
    generateReservationId() {
        return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * 만료된 예약들을 정리합니다.
     */
    async cleanupExpiredReservations() {
        // 이 메서드는 크론 잡으로 주기적으로 실행되어야 합니다.
        // Redis TTL이 자동으로 처리하지만, 수동 정리도 필요할 수 있습니다.
    }
}
exports.InventoryService = InventoryService;
exports.inventoryService = new InventoryService();
//# sourceMappingURL=inventoryService.js.map