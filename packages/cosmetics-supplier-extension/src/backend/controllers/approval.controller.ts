/**
 * Supplier Approval Controller
 *
 * Seller/Partner 승인 관리 API
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { SupplierApprovalService } from '../services/supplier-approval.service';

export function createApprovalController(dataSource: DataSource): Router {
  const router = Router();
  const service = new SupplierApprovalService(dataSource);

  /**
   * POST /approval/request
   * 승인 요청
   */
  router.post('/request', async (req: Request, res: Response) => {
    try {
      const approval = await service.requestApproval(req.body);
      res.status(201).json(approval);
    } catch (error: any) {
      console.error('Error requesting approval:', error);
      if (error.message === 'Approval request already exists') {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to request approval' });
    }
  });

  /**
   * GET /approval/:id
   * 승인 기록 조회
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const approval = await service.findById(req.params.id);
      if (!approval) {
        return res.status(404).json({ error: 'Approval record not found' });
      }

      res.json(approval);
    } catch (error) {
      console.error('Error getting approval:', error);
      res.status(500).json({ error: 'Failed to get approval' });
    }
  });

  /**
   * GET /approval
   * 승인 목록 조회
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { supplierId, type, status, sellerId, partnerId } = req.query;

      if (!supplierId) {
        return res.status(400).json({ error: 'supplierId is required' });
      }

      const approvals = await service.findAll({
        supplierId: supplierId as string,
        type: type as any,
        status: status as any,
        sellerId: sellerId as string,
        partnerId: partnerId as string,
      });

      res.json(approvals);
    } catch (error) {
      console.error('Error listing approvals:', error);
      res.status(500).json({ error: 'Failed to list approvals' });
    }
  });

  /**
   * GET /approval/pending
   * 대기 중인 승인 요청 목록
   */
  router.get('/pending/list', async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.query;

      if (!supplierId) {
        return res.status(400).json({ error: 'supplierId is required' });
      }

      const approvals = await service.getPendingApprovals(supplierId as string);
      res.json(approvals);
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      res.status(500).json({ error: 'Failed to get pending approvals' });
    }
  });

  /**
   * POST /approval/seller/approve
   * Seller 승인
   */
  router.post('/seller/approve', async (req: Request, res: Response) => {
    try {
      const { supplierId, sellerId, ...approveDto } = req.body;

      if (!supplierId || !sellerId) {
        return res.status(400).json({ error: 'supplierId and sellerId are required' });
      }

      const approval = await service.approveSeller(supplierId, sellerId, approveDto);
      if (!approval) {
        return res.status(404).json({ error: 'Pending approval not found' });
      }

      res.json(approval);
    } catch (error) {
      console.error('Error approving seller:', error);
      res.status(500).json({ error: 'Failed to approve seller' });
    }
  });

  /**
   * POST /approval/partner/approve
   * Partner 승인
   */
  router.post('/partner/approve', async (req: Request, res: Response) => {
    try {
      const { supplierId, partnerId, ...approveDto } = req.body;

      if (!supplierId || !partnerId) {
        return res.status(400).json({ error: 'supplierId and partnerId are required' });
      }

      const approval = await service.approvePartner(supplierId, partnerId, approveDto);
      if (!approval) {
        return res.status(404).json({ error: 'Pending approval not found' });
      }

      res.json(approval);
    } catch (error) {
      console.error('Error approving partner:', error);
      res.status(500).json({ error: 'Failed to approve partner' });
    }
  });

  /**
   * POST /approval/seller/reject
   * Seller 거절
   */
  router.post('/seller/reject', async (req: Request, res: Response) => {
    try {
      const { supplierId, sellerId, rejectedBy, rejectionReason } = req.body;

      if (!supplierId || !sellerId || !rejectedBy || !rejectionReason) {
        return res.status(400).json({
          error: 'supplierId, sellerId, rejectedBy, and rejectionReason are required',
        });
      }

      const approval = await service.rejectSeller(supplierId, sellerId, {
        rejectedBy,
        rejectionReason,
      });

      if (!approval) {
        return res.status(404).json({ error: 'Pending approval not found' });
      }

      res.json(approval);
    } catch (error) {
      console.error('Error rejecting seller:', error);
      res.status(500).json({ error: 'Failed to reject seller' });
    }
  });

  /**
   * POST /approval/partner/reject
   * Partner 거절
   */
  router.post('/partner/reject', async (req: Request, res: Response) => {
    try {
      const { supplierId, partnerId, rejectedBy, rejectionReason } = req.body;

      if (!supplierId || !partnerId || !rejectedBy || !rejectionReason) {
        return res.status(400).json({
          error: 'supplierId, partnerId, rejectedBy, and rejectionReason are required',
        });
      }

      const approval = await service.rejectPartner(supplierId, partnerId, {
        rejectedBy,
        rejectionReason,
      });

      if (!approval) {
        return res.status(404).json({ error: 'Pending approval not found' });
      }

      res.json(approval);
    } catch (error) {
      console.error('Error rejecting partner:', error);
      res.status(500).json({ error: 'Failed to reject partner' });
    }
  });

  /**
   * POST /approval/:id/suspend
   * 승인 일시 중지
   */
  router.post('/:id/suspend', async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'reason is required' });
      }

      const approval = await service.suspend(req.params.id, reason);
      if (!approval) {
        return res.status(404).json({ error: 'Approval not found or not in approved status' });
      }

      res.json(approval);
    } catch (error) {
      console.error('Error suspending approval:', error);
      res.status(500).json({ error: 'Failed to suspend approval' });
    }
  });

  /**
   * POST /approval/:id/revoke
   * 승인 취소
   */
  router.post('/:id/revoke', async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'reason is required' });
      }

      const approval = await service.revoke(req.params.id, reason);
      if (!approval) {
        return res.status(404).json({ error: 'Approval not found' });
      }

      res.json(approval);
    } catch (error) {
      console.error('Error revoking approval:', error);
      res.status(500).json({ error: 'Failed to revoke approval' });
    }
  });

  /**
   * GET /approval/check/seller
   * Seller 승인 여부 확인
   */
  router.get('/check/seller', async (req: Request, res: Response) => {
    try {
      const { supplierId, sellerId } = req.query;

      if (!supplierId || !sellerId) {
        return res.status(400).json({ error: 'supplierId and sellerId are required' });
      }

      const isApproved = await service.isSellerApproved(
        supplierId as string,
        sellerId as string
      );

      res.json({ isApproved });
    } catch (error) {
      console.error('Error checking seller approval:', error);
      res.status(500).json({ error: 'Failed to check seller approval' });
    }
  });

  /**
   * GET /approval/check/partner
   * Partner 승인 여부 확인
   */
  router.get('/check/partner', async (req: Request, res: Response) => {
    try {
      const { supplierId, partnerId } = req.query;

      if (!supplierId || !partnerId) {
        return res.status(400).json({ error: 'supplierId and partnerId are required' });
      }

      const isApproved = await service.isPartnerApproved(
        supplierId as string,
        partnerId as string
      );

      res.json({ isApproved });
    } catch (error) {
      console.error('Error checking partner approval:', error);
      res.status(500).json({ error: 'Failed to check partner approval' });
    }
  });

  /**
   * GET /approval/stats
   * 승인 통계
   */
  router.get('/stats/summary', async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.query;

      if (!supplierId) {
        return res.status(400).json({ error: 'supplierId is required' });
      }

      const stats = await service.getStats(supplierId as string);
      res.json(stats);
    } catch (error) {
      console.error('Error getting approval stats:', error);
      res.status(500).json({ error: 'Failed to get approval stats' });
    }
  });

  /**
   * DELETE /approval/:id
   * 승인 기록 삭제
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await service.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Approval record not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting approval:', error);
      res.status(500).json({ error: 'Failed to delete approval' });
    }
  });

  return router;
}
