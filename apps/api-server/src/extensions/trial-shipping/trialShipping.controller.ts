/**
 * TrialShippingExtension - Controller
 *
 * WO-MARKET-TRIAL-DB-PERSISTENCE-INTEGRATION-V1:
 * participationsStore 의존 제거, TypeORM repo 기반으로 전환.
 */

import { Request, Response, NextFunction } from 'express';
import { DataSource, Repository } from 'typeorm';
import { MarketTrialParticipant } from '@o4o/market-trial';
import { requireNetureScope } from '../../middleware/neture-scope.middleware.js';
import {
  getShippingAddress,
  setShippingAddress,
} from './trialShipping.store.js';

// WO-O4O-NETURE-DISTRIBUTION-FUNDING-OFFLINE-OPERATION-SAFETY-V1:
// 무인증 노출 차단용 fallback — 소유자가 아니면 Neture 운영자 스코프로 위임.
const netureOperatorScope = requireNetureScope('neture:operator') as any;

export class TrialShippingController {
  private static participantRepo: Repository<MarketTrialParticipant>;

  static setDataSource(ds: DataSource) {
    this.participantRepo = ds.getRepository(MarketTrialParticipant);
  }

  /**
   * 권한 미들웨어: 참여 당사자(participantId === user.id) 또는 Neture 운영자만 허용.
   * participationId 단독 접근 차단 (Boundary Policy §7).
   * WO-O4O-NETURE-DISTRIBUTION-FUNDING-OFFLINE-OPERATION-SAFETY-V1.
   */
  static async requireOwnerOrOperator(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const { participationId } = req.params;
      const participation = await TrialShippingController.participantRepo.findOne({
        where: { id: participationId },
      });
      if (!participation) {
        return res.status(404).json({ success: false, message: 'Participation not found' });
      }
      if (participation.participantId === userId) {
        return next();
      }
      // 소유자가 아니면 Neture 운영자에 한해 허용
      return netureOperatorScope(req, res, next);
    } catch (error) {
      console.error('[TrialShipping] Authorization error:', error);
      return res.status(500).json({ success: false, message: 'Authorization failed' });
    }
  }

  /**
   * POST /api/trial-shipping/:participationId
   * 배송 주소 등록
   */
  static async setAddress(req: Request, res: Response) {
    try {
      const { participationId } = req.params;
      const addressData = req.body;

      // Validate required fields
      if (!addressData.recipient_name || !addressData.phone || !addressData.postal_code || !addressData.address) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: recipient_name, phone, postal_code, address',
        });
      }

      // Check if participation exists
      const participation = await TrialShippingController.participantRepo.findOne({
        where: { id: participationId },
      });

      if (!participation) {
        return res.status(404).json({
          success: false,
          message: 'Participation not found',
        });
      }

      // Validate rewardType === 'product'
      if (participation.rewardType !== 'product') {
        return res.status(400).json({
          success: false,
          message: 'Shipping address is only required for product rewards',
        });
      }

      // Save shipping address
      await setShippingAddress(participationId, addressData);

      res.status(200).json({
        success: true,
        data: addressData,
        message: 'Shipping address saved successfully',
      });
    } catch (error) {
      console.error('Set shipping address error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save shipping address',
      });
    }
  }

  /**
   * GET /api/trial-shipping/:participationId
   * 배송 주소 조회
   */
  static async getAddress(req: Request, res: Response) {
    try {
      const { participationId } = req.params;

      const address = await getShippingAddress(participationId);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Shipping address not found',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          recipient_name: address.recipientName,
          phone: address.phone,
          postal_code: address.postalCode,
          address: address.address,
          address_detail: address.addressDetail,
          delivery_note: address.deliveryNote,
        },
      });
    } catch (error) {
      console.error('Get shipping address error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get shipping address',
      });
    }
  }
}
