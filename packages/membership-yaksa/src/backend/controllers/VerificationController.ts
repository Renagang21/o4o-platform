import { Request, Response } from 'express';
import { VerificationService } from '../services/VerificationService.js';

/**
 * VerificationController
 *
 * 자격 검증 API 컨트롤러
 */
export class VerificationController {
  constructor(private verificationService: VerificationService) {}

  /**
   * GET /verifications
   */
  async list(req: Request, res: Response) {
    try {
      const memberId = req.query.memberId as string | undefined;
      const status = req.query.status as 'pending' | 'approved' | 'rejected' | 'expired' | undefined;

      let verifications;
      if (memberId) {
        verifications = await this.verificationService.listByMember(memberId);
      } else if (status) {
        verifications = await this.verificationService.listByStatus(status);
      } else {
        verifications = [];
      }

      res.json(verifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /verifications/:id
   */
  async get(req: Request, res: Response) {
    try {
      const verification = await this.verificationService.findById(req.params.id);
      if (!verification) {
        return res.status(404).json({ error: 'Verification not found' });
      }
      res.json(verification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /verifications
   */
  async create(req: Request, res: Response) {
    try {
      const verification = await this.verificationService.create(req.body);
      res.status(201).json(verification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * PATCH /verifications/:id/approve
   */
  async approve(req: Request, res: Response) {
    try {
      // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Require auth + admin role
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const userRoles: string[] = user.roles || [];
      if (!userRoles.includes('kpa:admin')) {
        res.status(403).json({ error: 'KPA admin role required for verification approval' });
        return;
      }

      const { notes } = req.body;
      const verification = await this.verificationService.approve(
        req.params.id,
        user.id,
        notes
      );
      res.json(verification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * PATCH /verifications/:id/reject
   */
  async reject(req: Request, res: Response) {
    try {
      // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Require auth + admin role
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const userRoles: string[] = user.roles || [];
      if (!userRoles.includes('kpa:admin')) {
        res.status(403).json({ error: 'KPA admin role required for verification rejection' });
        return;
      }

      const { reason } = req.body;
      const verification = await this.verificationService.reject(
        req.params.id,
        user.id,
        reason
      );
      res.json(verification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
