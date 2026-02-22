/**
 * TrialShippingExtension - Controller
 *
 * WO-MARKET-TRIAL-DB-PERSISTENCE-INTEGRATION-V1:
 * participationsStore 의존 제거, TypeORM repo 기반으로 전환.
 */

import { Request, Response } from 'express';
import { DataSource, Repository } from 'typeorm';
import { MarketTrialParticipant } from '@o4o/market-trial';
import {
  getShippingAddress,
  setShippingAddress,
} from './trialShipping.store.js';

export class TrialShippingController {
  private static participantRepo: Repository<MarketTrialParticipant>;

  static setDataSource(ds: DataSource) {
    this.participantRepo = ds.getRepository(MarketTrialParticipant);
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
