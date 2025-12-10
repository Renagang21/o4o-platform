/**
 * PartnerOps Links Controller
 */

import { Request, Response } from 'express';
import { LinkService } from '../services/LinkService';

export class LinksController {
  constructor(private linkService: LinkService) {}

  async list(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        res.status(400).json({ success: false, message: 'Partner ID required' });
        return;
      }

      const links = await this.linkService.list(tenantId, partnerId, {
        productId: req.query.productId as string | undefined,
      });

      res.json({ success: true, data: links });
    } catch (error: any) {
      console.error('List links error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        res.status(400).json({ success: false, message: 'Partner ID required' });
        return;
      }

      const link = await this.linkService.create(tenantId, partnerId, req.body);
      res.status(201).json({ success: true, data: link });
    } catch (error: any) {
      console.error('Create link error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const linkId = req.params.id;

      const stats = await this.linkService.getStats(tenantId, linkId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Get link stats error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const linkId = req.params.id;

      await this.linkService.delete(tenantId, linkId);
      res.json({ success: true, message: 'Link deleted' });
    } catch (error: any) {
      console.error('Delete link error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default LinksController;
