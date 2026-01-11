/**
 * TrialShippingExtension - Controller
 *
 * H8-2: Trial 참여자 배송 주소 수집 API
 *
 * @package H8-2 - TrialShippingExtension
 */

import { Request, Response } from 'express';
import { NetureShippingAddress } from '../../routes/neture/entities/neture-order.entity.js';
import {
    getShippingAddress,
    setShippingAddress,
    hasShippingAddress,
} from './trialShipping.store.js';

/**
 * Import participationsStore from Market Trial Controller
 * This allows us to validate participationId without modifying Core
 */
import { participationsStore } from '../../controllers/market-trial/marketTrialController.js';

export class TrialShippingController {
    /**
     * POST /api/trial-shipping/:participationId
     * 배송 주소 등록
     */
    static async setAddress(req: Request, res: Response) {
        try {
            const { participationId } = req.params;
            const addressData = req.body as NetureShippingAddress;

            // Validate required fields
            if (!addressData.recipient_name || !addressData.phone || !addressData.postal_code || !addressData.address) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: recipient_name, phone, postal_code, address',
                });
            }

            // Check if participation exists
            let participationExists = false;
            for (const [, participations] of participationsStore.entries()) {
                const participation = participations.find((p) => p.id === participationId);
                if (participation) {
                    participationExists = true;

                    // Validate rewardType === 'product'
                    if (participation.rewardType !== 'product') {
                        return res.status(400).json({
                            success: false,
                            message: 'Shipping address is only required for product rewards',
                        });
                    }

                    break;
                }
            }

            if (!participationExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Participation not found',
                });
            }

            // Save shipping address
            setShippingAddress(participationId, addressData);

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

            const address = getShippingAddress(participationId);

            if (!address) {
                return res.status(404).json({
                    success: false,
                    message: 'Shipping address not found',
                });
            }

            res.status(200).json({
                success: true,
                data: address,
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
