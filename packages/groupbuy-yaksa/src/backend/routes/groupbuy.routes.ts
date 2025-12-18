/**
 * Groupbuy-Yaksa Routes
 * Phase 3: UI Integration
 *
 * Base path: /api/v1/yaksa/groupbuy
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { GroupbuyCampaignService } from '../services/GroupbuyCampaignService.js';
import { CampaignProductService } from '../services/CampaignProductService.js';
import { GroupbuyOrderService } from '../services/GroupbuyOrderService.js';

/**
 * Create groupbuy routes
 *
 * @param dataSource - TypeORM DataSource
 * @returns Express Router
 */
export function createGroupbuyRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Initialize services
  const campaignService = new GroupbuyCampaignService(dataSource.manager);
  const productService = new CampaignProductService(dataSource.manager);
  const orderService = new GroupbuyOrderService(dataSource.manager);

  // =====================================================
  // Campaign Routes
  // =====================================================

  /**
   * GET /campaigns
   * List campaigns by organization
   */
  router.get('/campaigns', async (req: Request, res: Response) => {
    try {
      const { organizationId, status, includeProducts } = req.query;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'organizationId is required',
        });
        return;
      }

      const campaigns = await campaignService.getCampaignsByOrganization(
        organizationId as string,
        {
          status: status as any,
          includeProducts: includeProducts === 'true',
        }
      );

      res.json({
        success: true,
        data: campaigns,
      });
    } catch (error) {
      console.error('[Groupbuy] List campaigns error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /campaigns/:id
   * Get campaign by ID
   */
  router.get('/campaigns/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const campaign = await campaignService.getCampaignById(id);

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found',
        });
        return;
      }

      res.json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('[Groupbuy] Get campaign error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /campaigns
   * Create a new campaign
   */
  router.post('/campaigns', async (req: Request, res: Response) => {
    try {
      const { organizationId, title, description, startDate, endDate, createdBy, metadata } = req.body;

      if (!organizationId || !title || !startDate || !endDate || !createdBy) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: organizationId, title, startDate, endDate, createdBy',
        });
        return;
      }

      const campaign = await campaignService.createCampaign({
        organizationId,
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdBy,
        metadata,
      });

      res.status(201).json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('[Groupbuy] Create campaign error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /campaigns/:id
   * Update campaign
   */
  router.put('/campaigns/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, startDate, endDate, metadata } = req.body;

      const campaign = await campaignService.updateCampaign(id, {
        title,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        metadata,
      });

      res.json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('[Groupbuy] Update campaign error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /campaigns/:id/activate
   * Activate campaign (draft -> active)
   */
  router.post('/campaigns/:id/activate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const campaign = await campaignService.activateCampaign(id);

      res.json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('[Groupbuy] Activate campaign error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /campaigns/:id/close
   * Close campaign (active -> closed)
   */
  router.post('/campaigns/:id/close', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await campaignService.closeCampaign(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[Groupbuy] Close campaign error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /campaigns/:id/complete
   * Complete campaign (closed -> completed)
   */
  router.post('/campaigns/:id/complete', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const campaign = await campaignService.completeCampaign(id);

      res.json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('[Groupbuy] Complete campaign error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /campaigns/:id/cancel
   * Cancel campaign
   */
  router.post('/campaigns/:id/cancel', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const campaign = await campaignService.cancelCampaign(id);

      res.json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      console.error('[Groupbuy] Cancel campaign error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // =====================================================
  // Campaign Product Routes
  // =====================================================

  /**
   * GET /campaigns/:campaignId/products
   * List products in a campaign
   */
  router.get('/campaigns/:campaignId/products', async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      const { status, supplierId } = req.query;

      const products = await productService.getProductsByCampaign(campaignId, {
        status: status as any,
        supplierId: supplierId as string,
      });

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error('[Groupbuy] List products error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /campaigns/:campaignId/products
   * Add product to campaign
   */
  router.post('/campaigns/:campaignId/products', async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      const { productId, supplierId, groupPrice, minTotalQuantity, maxTotalQuantity, startDate, endDate, metadata } = req.body;

      if (!productId || !supplierId || !groupPrice || !minTotalQuantity || !startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
        return;
      }

      const product = await productService.createProduct({
        campaignId,
        productId,
        supplierId,
        groupPrice: parseFloat(groupPrice),
        minTotalQuantity: parseInt(minTotalQuantity, 10),
        maxTotalQuantity: maxTotalQuantity ? parseInt(maxTotalQuantity, 10) : undefined,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        metadata,
      });

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error) {
      console.error('[Groupbuy] Add product error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /products/:id
   * Get product by ID
   */
  router.get('/products/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);

      if (!product) {
        res.status(404).json({
          success: false,
          error: 'Product not found',
        });
        return;
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      console.error('[Groupbuy] Get product error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /products/available/:campaignId
   * Get available products for ordering
   */
  router.get('/products/available/:campaignId', async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      const products = await productService.getAvailableProducts(campaignId);

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error('[Groupbuy] Get available products error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // =====================================================
  // Order Routes
  // =====================================================

  /**
   * GET /orders/pharmacy/:pharmacyId
   * Get orders by pharmacy
   */
  router.get('/orders/pharmacy/:pharmacyId', async (req: Request, res: Response) => {
    try {
      const { pharmacyId } = req.params;
      const { campaignId, status } = req.query;

      const orders = await orderService.getOrdersByPharmacy(pharmacyId, {
        campaignId: campaignId as string,
        status: status as any,
      });

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error('[Groupbuy] Get pharmacy orders error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /orders/campaign/:campaignId
   * Get orders by campaign
   */
  router.get('/orders/campaign/:campaignId', async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      const { status, supplierId } = req.query;

      const orders = await orderService.getOrdersByCampaign(campaignId, {
        status: status as any,
        supplierId: supplierId as string,
      });

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error('[Groupbuy] Get campaign orders error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /orders
   * Create a new order (participate in groupbuy)
   */
  router.post('/orders', async (req: Request, res: Response) => {
    try {
      const { campaignId, campaignProductId, pharmacyId, quantity, orderedBy, metadata } = req.body;

      if (!campaignId || !campaignProductId || !pharmacyId || !quantity) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
        return;
      }

      const order = await orderService.createOrder({
        campaignId,
        campaignProductId,
        pharmacyId,
        quantity: parseInt(quantity, 10),
        orderedBy,
        metadata,
      });

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('[Groupbuy] Create order error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /orders/:id/confirm
   * Confirm order with dropshipping order ID
   */
  router.post('/orders/:id/confirm', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { dropshippingOrderId } = req.body;

      if (!dropshippingOrderId) {
        res.status(400).json({
          success: false,
          error: 'dropshippingOrderId is required',
        });
        return;
      }

      const order = await orderService.confirmOrder(id, dropshippingOrderId);

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('[Groupbuy] Confirm order error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /orders/:id/cancel
   * Cancel pending order
   */
  router.post('/orders/:id/cancel', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const order = await orderService.cancelOrder(id);

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('[Groupbuy] Cancel order error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /campaigns/:campaignId/summary
   * Get quantity summary for campaign
   */
  router.get('/campaigns/:campaignId/summary', async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      const summary = await orderService.getQuantitySummary(campaignId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('[Groupbuy] Get summary error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /campaigns/:campaignId/participants
   * Get participants (pharmacies) for campaign
   */
  router.get('/campaigns/:campaignId/participants', async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      const participants = await orderService.getQuantityByPharmacy(campaignId);

      res.json({
        success: true,
        data: participants,
      });
    } catch (error) {
      console.error('[Groupbuy] Get participants error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

export default createGroupbuyRoutes;
