/**
 * TrialFulfillmentExtension - Controller
 *
 * WO-MARKET-TRIAL-DB-PERSISTENCE-INTEGRATION-V1:
 * participationsStore 의존 제거, TypeORM repo 기반으로 전환.
 */

import { Request, Response } from 'express';
import { DataSource, Repository } from 'typeorm';
import { MarketTrialParticipant } from '@o4o/market-trial';
import logger from '../../utils/logger.js';
import {
  createFulfillment,
  getFulfillment,
  hasFulfillment,
  updateFulfillmentStatus,
  linkOrder,
  getFulfillmentByOrderId,
  getStoreStats,
} from './trialFulfillment.store.js';

// H8-2 TrialShippingExtension 연동
import { getShippingAddress, hasShippingAddress, toNetureFormat } from '../trial-shipping/trialShipping.store.js';

// Neture Order Service
import { NetureService } from '../../routes/neture/services/neture.service.js';
import { NetureOrderStatus } from '../../routes/neture/entities/neture-order.entity.js';

export class TrialFulfillmentController {
  private static dataSource: DataSource | null = null;
  private static participantRepo: Repository<MarketTrialParticipant>;

  static setDataSource(ds: DataSource) {
    this.dataSource = ds;
    this.participantRepo = ds.getRepository(MarketTrialParticipant);
  }

  /**
   * Participation 조회 헬퍼
   */
  private static async findParticipation(participationId: string) {
    return await TrialFulfillmentController.participantRepo.findOne({
      where: { id: participationId },
    });
  }

  /**
   * POST /api/trial-fulfillment/:participationId/init
   */
  static async initFulfillment(req: Request, res: Response) {
    try {
      const { participationId } = req.params;

      if (await hasFulfillment(participationId)) {
        const existing = await getFulfillment(participationId);
        return res.status(200).json({
          success: true,
          data: existing,
          message: 'Fulfillment already initialized',
        });
      }

      const participation = await TrialFulfillmentController.findParticipation(participationId);
      if (!participation) {
        return res.status(404).json({
          success: false,
          message: 'Participation not found',
        });
      }

      if (participation.rewardType !== 'product') {
        return res.status(400).json({
          success: false,
          message: 'Fulfillment is only required for product rewards',
        });
      }

      const fulfillment = await createFulfillment(participationId, participation.marketTrialId);

      // 배송 주소가 이미 수집되었는지 확인 (H8-2)
      if (await hasShippingAddress(participationId)) {
        await updateFulfillmentStatus(participationId, 'address_collected', 'Shipping address already collected');
      }

      const result = await getFulfillment(participationId);

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
   */
  static async getFulfillment(req: Request, res: Response) {
    try {
      const { participationId } = req.params;

      const fulfillment = await getFulfillment(participationId);

      if (!fulfillment) {
        return res.status(404).json({
          success: false,
          message: 'Fulfillment not found',
        });
      }

      const shippingAddress = await getShippingAddress(participationId);

      res.status(200).json({
        success: true,
        data: {
          ...fulfillment,
          shippingAddress: shippingAddress ? toNetureFormat(shippingAddress) : undefined,
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
   */
  static async createOrder(req: Request, res: Response) {
    try {
      const { participationId } = req.params;

      if (!TrialFulfillmentController.dataSource) {
        return res.status(500).json({
          success: false,
          message: 'DataSource not initialized',
        });
      }

      const fulfillment = await getFulfillment(participationId);
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

      const shippingAddr = await getShippingAddress(participationId);
      if (!shippingAddr) {
        return res.status(400).json({
          success: false,
          message: 'Shipping address not found. Collect address first.',
        });
      }

      const participation = await TrialFulfillmentController.findParticipation(participationId);
      if (!participation) {
        return res.status(404).json({
          success: false,
          message: 'Participation not found',
        });
      }

      const { productId, quantity = 1 } = req.body;
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'productId is required',
        });
      }

      const netureService = new NetureService(TrialFulfillmentController.dataSource);
      const shippingData = toNetureFormat(shippingAddr);

      const orderRequest = {
        items: [{ product_id: productId, quantity }],
        shipping: shippingData,
        orderer_name: shippingData.recipient_name,
        orderer_phone: shippingData.phone,
        note: `Trial Fulfillment: ${participationId}`,
        metadata: {
          source: 'trial-fulfillment',
          participationId,
          trialId: fulfillment.trialId,
        },
      };

      const order = await netureService.createOrder(orderRequest, participation.participantId);

      await linkOrder(participationId, order.id, order.order_number);
      await updateFulfillmentStatus(participationId, 'order_created', 'Order created successfully');

      const result = await getFulfillment(participationId);

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
   */
  static async syncStatus(req: Request, res: Response) {
    try {
      const { participationId } = req.params;

      if (!TrialFulfillmentController.dataSource) {
        return res.status(500).json({
          success: false,
          message: 'DataSource not initialized',
        });
      }

      const fulfillment = await getFulfillment(participationId);
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

      const netureService = new NetureService(TrialFulfillmentController.dataSource);
      const order = await netureService.getOrder(fulfillment.orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Linked order not found',
        });
      }

      let updated = false;
      const orderStatus = order.status as NetureOrderStatus;

      if (orderStatus === NetureOrderStatus.SHIPPED && fulfillment.status === 'order_created') {
        await updateFulfillmentStatus(participationId, 'shipped', 'Order shipped');
        updated = true;
      } else if (orderStatus === NetureOrderStatus.DELIVERED && fulfillment.status === 'shipped') {
        await updateFulfillmentStatus(participationId, 'delivered', 'Order delivered');
        await updateFulfillmentStatus(participationId, 'fulfilled', 'Auto-fulfilled on delivery');

        // Update rewardStatus via DB
        await TrialFulfillmentController.participantRepo.update(
          { id: participationId },
          { rewardStatus: 'fulfilled' }
        );
        logger.info(`[TrialFulfillment] Updated rewardStatus to 'fulfilled' for participation ${participationId}`);
        updated = true;
      }

      const result = await getFulfillment(participationId);

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
   */
  static async completeFulfillment(req: Request, res: Response) {
    try {
      const { participationId } = req.params;

      const fulfillment = await getFulfillment(participationId);
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

      if (fulfillment.status !== 'delivered') {
        return res.status(400).json({
          success: false,
          message: `Cannot complete from status: ${fulfillment.status}. Expected: delivered`,
        });
      }

      await updateFulfillmentStatus(participationId, 'fulfilled', 'Manually completed');

      // Update rewardStatus via DB
      await TrialFulfillmentController.participantRepo.update(
        { id: participationId },
        { rewardStatus: 'fulfilled' }
      );
      logger.info(`[TrialFulfillment] Updated rewardStatus to 'fulfilled' for participation ${participationId}`);

      const result = await getFulfillment(participationId);

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
   */
  static async getStats(_req: Request, res: Response) {
    try {
      const stats = await getStoreStats();

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
}
