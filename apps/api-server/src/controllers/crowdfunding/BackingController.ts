import { Request, Response } from 'express';
import { BackingService } from '../../services/crowdfunding/BackingService';

export class BackingController {
  private backingService: BackingService;

  constructor() {
    this.backingService = new BackingService();
  }

  // Create backing (back a project)
  async createBacking(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const backing = await this.backingService.createBacking(req.body, userId);
      res.status(201).json(backing);
    } catch (error) {
      console.error('Error creating backing:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create backing' });
    }
  }

  // Update payment status (webhook)
  async updatePaymentStatus(req: Request, res: Response) {
    try {
      const { backingId, paymentId, status } = req.body;
      
      if (!['completed', 'failed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid payment status' });
      }

      await this.backingService.updatePaymentStatus(backingId, paymentId, status);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ error: 'Failed to update payment status' });
    }
  }

  // Cancel backing
  async cancelBacking(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await this.backingService.cancelBacking(
        req.params.id,
        userId,
        req.body.reason
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Error cancelling backing:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to cancel backing' });
    }
  }

  // Get user's backings
  async getUserBackings(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const status = req.query.status as any;
      const backings = await this.backingService.getUserBackings(userId, status);
      res.json(backings);
    } catch (error) {
      console.error('Error fetching user backings:', error);
      res.status(500).json({ error: 'Failed to fetch backings' });
    }
  }

  // Get project backers
  async getProjectBackers(req: Request, res: Response) {
    try {
      const options = {
        showAnonymous: req.query.showAnonymous === 'true',
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };

      const result = await this.backingService.getProjectBackings(
        req.params.projectId,
        options
      );
      res.json(result);
    } catch (error) {
      console.error('Error fetching project backers:', error);
      res.status(500).json({ error: 'Failed to fetch backers' });
    }
  }
}