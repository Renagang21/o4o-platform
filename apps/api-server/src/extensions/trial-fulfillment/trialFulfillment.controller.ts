/**
 * TrialFulfillmentExtension - Controller
 *
 * H8-3: Trial 참여자 Fulfillment API
 *
 * @package H8-3 - TrialFulfillmentExtension
 */

import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import {
    createFulfillment,
    getFulfillment,
    hasFulfillment,
    updateFulfillmentStatus,
    linkOrder,
    getFulfillmentByOrderId,
    getStoreStats,
    FulfillmentStatus,
} from './trialFulfillment.store.js';

// H8-2 TrialShippingExtension 연동
import { getShippingAddress, hasShippingAddress } from '../trial-shipping/trialShipping.store.js';

// MarketTrial Core 참조 (읽기 전용)
import { participationsStore } from '../../controllers/market-trial/marketTrialController.js';

// Neture Order Service
import { NetureService } from '../../routes/neture/services/neture.service.js';
import { NetureOrderStatus } from '../../routes/neture/entities/neture-order.entity.js';

/**
 * TrialFulfillmentController
 *
 * Core 수정 없이 Extension만으로 Fulfillment 처리
 */
export class TrialFulfillmentController {
    private static dataSource: DataSource | null = null;

    /**
     * DataSource 설정 (main.ts에서 호출)
     */
    static setDataSource(ds: DataSource) {
        this.dataSource = ds;
    }

    /**
     * Participation 조회 헬퍼
     */
    private static findParticipation(participationId: string) {
        for (const [, participations] of participationsStore.entries()) {
            const participation = participations.find((p) => p.id === participationId);
            if (participation) {
                return participation;
            }
        }
        return null;
    }

    /**
     * POST /api/trial-fulfillment/:participationId/init
     * Fulfillment 초기화 (참여 직후 또는 수동 트리거)
     */
    static async initFulfillment(req: Request, res: Response) {
        try {
            const { participationId } = req.params;

            // 이미 Fulfillment가 존재하는지 확인
            if (hasFulfillment(participationId)) {
                const existing = getFulfillment(participationId);
                return res.status(200).json({
                    success: true,
                    data: existing,
                    message: 'Fulfillment already initialized',
                });
            }

            // Participation 존재 확인
            const participation = TrialFulfillmentController.findParticipation(participationId);
            if (!participation) {
                return res.status(404).json({
                    success: false,
                    message: 'Participation not found',
                });
            }

            // rewardType이 'product'인지 확인
            if (participation.rewardType !== 'product') {
                return res.status(400).json({
                    success: false,
                    message: 'Fulfillment is only required for product rewards',
                });
            }

            // Fulfillment 레코드 생성
            const fulfillment = createFulfillment(participationId, participation.trialId);

            // 배송 주소가 이미 수집되었는지 확인 (H8-2)
            if (hasShippingAddress(participationId)) {
                updateFulfillmentStatus(participationId, 'address_collected', 'Shipping address already collected');
            }

            const result = getFulfillment(participationId);

            res.status(201).json({
                success: true,
                data: result,
                message: 'Fulfillment initialized successfully',
            });
        } catch (error) {
            console.error('[TrialFulfillment] Init fulfillment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to initialize fulfillment',
            });
        }
    }

    /**
     * GET /api/trial-fulfillment/:participationId
     * Fulfillment 상태 조회
     */
    static async getFulfillment(req: Request, res: Response) {
        try {
            const { participationId } = req.params;

            const fulfillment = getFulfillment(participationId);

            if (!fulfillment) {
                return res.status(404).json({
                    success: false,
                    message: 'Fulfillment not found',
                });
            }

            // 배송 주소 포함
            const shippingAddress = getShippingAddress(participationId);

            res.status(200).json({
                success: true,
                data: {
                    ...fulfillment,
                    shippingAddress,
                },
            });
        } catch (error) {
            console.error('[TrialFulfillment] Get fulfillment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get fulfillment',
            });
        }
    }

    /**
     * POST /api/trial-fulfillment/:participationId/create-order
     * NetureOrder 생성 (배송 주소 수집 완료 후)
     */
    static async createOrder(req: Request, res: Response) {
        try {
            const { participationId } = req.params;

            // DataSource 확인
            if (!TrialFulfillmentController.dataSource) {
                return res.status(500).json({
                    success: false,
                    message: 'DataSource not initialized',
                });
            }

            // Fulfillment 상태 확인
            const fulfillment = getFulfillment(participationId);
            if (!fulfillment) {
                return res.status(404).json({
                    success: false,
                    message: 'Fulfillment not found. Initialize first.',
                });
            }

            if (fulfillment.status !== 'address_collected') {
                return res.status(400).json({
                    success: false,
                    message: `Cannot create order from status: ${fulfillment.status}. Expected: address_collected`,
                });
            }

            // 배송 주소 확인 (H8-2)
            const shippingAddress = getShippingAddress(participationId);
            if (!shippingAddress) {
                return res.status(400).json({
                    success: false,
                    message: 'Shipping address not found. Collect address first.',
                });
            }

            // Participation 정보 조회
            const participation = TrialFulfillmentController.findParticipation(participationId);
            if (!participation) {
                return res.status(404).json({
                    success: false,
                    message: 'Participation not found',
                });
            }

            // 상품 정보 (요청에서 받거나 Trial에서 추출)
            const { productId, quantity = 1 } = req.body;
            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: 'productId is required',
                });
            }

            // NetureService를 통해 주문 생성
            const netureService = new NetureService(TrialFulfillmentController.dataSource);

            const orderRequest = {
                items: [
                    {
                        product_id: productId,
                        quantity: quantity,
                    },
                ],
                shipping: shippingAddress,
                orderer_name: shippingAddress.recipient_name,
                orderer_phone: shippingAddress.phone,
                note: `Trial Fulfillment: ${participationId}`,
                metadata: {
                    source: 'trial-fulfillment',
                    participationId,
                    trialId: fulfillment.trialId,
                },
            };

            const order = await netureService.createOrder(orderRequest, participation.participantId);

            // Fulfillment에 주문 정보 연결
            linkOrder(participationId, order.id, order.order_number);

            // 상태 업데이트
            updateFulfillmentStatus(participationId, 'order_created', 'Order created successfully');

            const result = getFulfillment(participationId);

            res.status(201).json({
                success: true,
                data: {
                    fulfillment: result,
                    order: {
                        id: order.id,
                        orderNumber: order.order_number,
                        status: order.status,
                    },
                },
                message: 'Order created successfully',
            });
        } catch (error: any) {
            console.error('[TrialFulfillment] Create order error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create order',
            });
        }
    }

    /**
     * POST /api/trial-fulfillment/:participationId/sync-status
     * NetureOrder 상태와 Fulfillment 상태 동기화
     */
    static async syncStatus(req: Request, res: Response) {
        try {
            const { participationId } = req.params;

            // DataSource 확인
            if (!TrialFulfillmentController.dataSource) {
                return res.status(500).json({
                    success: false,
                    message: 'DataSource not initialized',
                });
            }

            // Fulfillment 확인
            const fulfillment = getFulfillment(participationId);
            if (!fulfillment) {
                return res.status(404).json({
                    success: false,
                    message: 'Fulfillment not found',
                });
            }

            if (!fulfillment.orderId) {
                return res.status(400).json({
                    success: false,
                    message: 'No order linked to this fulfillment',
                });
            }

            // NetureOrder 상태 조회
            const netureService = new NetureService(TrialFulfillmentController.dataSource);
            const order = await netureService.getOrder(fulfillment.orderId);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Linked order not found',
                });
            }

            // 주문 상태에 따라 Fulfillment 상태 업데이트
            let updated = false;
            const orderStatus = order.status as NetureOrderStatus;

            if (orderStatus === NetureOrderStatus.SHIPPED && fulfillment.status === 'order_created') {
                updateFulfillmentStatus(participationId, 'shipped', 'Order shipped');
                updated = true;
            } else if (orderStatus === NetureOrderStatus.DELIVERED && fulfillment.status === 'shipped') {
                updateFulfillmentStatus(participationId, 'delivered', 'Order delivered');
                updated = true;

                // 배송 완료 시 자동으로 fulfilled 상태로 전환
                updateFulfillmentStatus(participationId, 'fulfilled', 'Auto-fulfilled on delivery');

                // Trial Core의 rewardStatus 업데이트 (in-memory)
                TrialFulfillmentController.updateParticipationRewardStatus(participationId, 'fulfilled');
            }

            const result = getFulfillment(participationId);

            res.status(200).json({
                success: true,
                data: {
                    fulfillment: result,
                    orderStatus: order.status,
                    updated,
                },
                message: updated ? 'Status synchronized' : 'No status change needed',
            });
        } catch (error) {
            console.error('[TrialFulfillment] Sync status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to sync status',
            });
        }
    }

    /**
     * POST /api/trial-fulfillment/:participationId/complete
     * 수동으로 Fulfillment 완료 처리
     */
    static async completeFulfillment(req: Request, res: Response) {
        try {
            const { participationId } = req.params;

            const fulfillment = getFulfillment(participationId);
            if (!fulfillment) {
                return res.status(404).json({
                    success: false,
                    message: 'Fulfillment not found',
                });
            }

            if (fulfillment.status === 'fulfilled') {
                return res.status(200).json({
                    success: true,
                    data: fulfillment,
                    message: 'Fulfillment already completed',
                });
            }

            // delivered 상태에서만 완료 가능
            if (fulfillment.status !== 'delivered') {
                return res.status(400).json({
                    success: false,
                    message: `Cannot complete from status: ${fulfillment.status}. Expected: delivered`,
                });
            }

            // 상태 업데이트
            updateFulfillmentStatus(participationId, 'fulfilled', 'Manually completed');

            // Trial Core의 rewardStatus 업데이트
            TrialFulfillmentController.updateParticipationRewardStatus(participationId, 'fulfilled');

            const result = getFulfillment(participationId);

            res.status(200).json({
                success: true,
                data: result,
                message: 'Fulfillment completed successfully',
            });
        } catch (error) {
            console.error('[TrialFulfillment] Complete fulfillment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to complete fulfillment',
            });
        }
    }

    /**
     * GET /api/trial-fulfillment/stats
     * Fulfillment 통계 조회
     */
    static async getStats(_req: Request, res: Response) {
        try {
            const stats = getStoreStats();

            res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error) {
            console.error('[TrialFulfillment] Get stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get stats',
            });
        }
    }

    /**
     * Trial Core의 rewardStatus 업데이트 (In-Memory)
     * Core 코드 수정 없이 participationsStore 직접 업데이트
     */
    private static updateParticipationRewardStatus(
        participationId: string,
        status: 'pending' | 'fulfilled'
    ) {
        for (const [trialId, participations] of participationsStore.entries()) {
            const index = participations.findIndex((p) => p.id === participationId);
            if (index !== -1) {
                participations[index].rewardStatus = status;
                participationsStore.set(trialId, participations);
                console.log(`[TrialFulfillment] Updated rewardStatus to '${status}' for participation ${participationId}`);
                return;
            }
        }
        console.warn(`[TrialFulfillment] Participation ${participationId} not found in Core store`);
    }
}
