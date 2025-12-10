/**
 * PartnerOps Routines Controller
 */

import { Request, Response } from 'express';
import { RoutineService } from '../services/RoutineService';

export class RoutinesController {
  constructor(private routineService: RoutineService) {}

  async list(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        res.status(400).json({ success: false, message: 'Partner ID required' });
        return;
      }

      const routines = await this.routineService.list(tenantId, partnerId, {
        status: req.query.status as string | undefined,
      });

      res.json({ success: true, data: routines });
    } catch (error: any) {
      console.error('List routines error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const routineId = req.params.id;

      const routine = await this.routineService.getById(tenantId, routineId);

      if (!routine) {
        res.status(404).json({ success: false, message: 'Routine not found' });
        return;
      }

      res.json({ success: true, data: routine });
    } catch (error: any) {
      console.error('Get routine error:', error);
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

      const routine = await this.routineService.create(tenantId, partnerId, req.body);
      res.status(201).json({ success: true, data: routine });
    } catch (error: any) {
      console.error('Create routine error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const routineId = req.params.id;

      const routine = await this.routineService.update(tenantId, routineId, req.body);
      res.json({ success: true, data: routine });
    } catch (error: any) {
      console.error('Update routine error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const routineId = req.params.id;

      await this.routineService.delete(tenantId, routineId);
      res.json({ success: true, message: 'Routine deleted' });
    } catch (error: any) {
      console.error('Delete routine error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default RoutinesController;
